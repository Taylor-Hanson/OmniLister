import { type Job, type Listing, type ListingPost, type User, type JobRetryHistory } from "@shared/schema";
import { storage } from "../storage";
import { marketplaceService } from "./marketplaceService";
import { smartScheduler } from "./smartScheduler";
import { retryStrategyService, type RetryContext } from "./retryStrategyService";
import { circuitBreakerService } from "./circuitBreakerService";
import { deadLetterQueueService } from "./deadLetterQueueService";
import { failureCategorizationService } from "./failureCategorizationService";
import { retryMetricsService } from "./retryMetricsService";

export interface JobProcessor {
  process(job: Job): Promise<void>;
}

class PostListingProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { listingId, marketplaces } = job.data as { listingId: string; marketplaces: string[] };
    
    const listing = await storage.getListing(listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const connections = await storage.getMarketplaceConnections(listing.userId);
    const results: Array<{ marketplace: string; success: boolean; error?: string; externalId?: string; url?: string }> = [];

    for (const marketplace of marketplaces) {
      try {
        // Update job progress
        const progress = Math.round(((results.length) / marketplaces.length) * 100);
        await storage.updateJob(job.id, { progress, status: "processing" });

        const connection = connections.find(c => c.marketplace === marketplace && c.isConnected);
        if (!connection) {
          results.push({ marketplace, success: false, error: "No active connection" });
          continue;
        }

        // Create listing post record
        const listingPost = await storage.createListingPost({
          listingId,
          marketplace,
          postingData: {
            title: listing.title,
            description: listing.description,
            price: listing.price,
            images: listing.images,
          },
        });

        try {
          const result = await marketplaceService.createListing(listing, marketplace, connection);
          
          // Update listing post with success
          await storage.updateListingPost(listingPost.id, {
            status: "posted",
            externalId: result.externalId,
            externalUrl: result.url,
            postedAt: new Date(),
          });

          results.push({ 
            marketplace, 
            success: true, 
            externalId: result.externalId, 
            url: result.url 
          });

        } catch (error) {
          // Update listing post with error
          await storage.updateListingPost(listingPost.id, {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });

          results.push({ 
            marketplace, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      } catch (error) {
        results.push({ 
          marketplace, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    // Update listing status if any posts were successful
    const successfulPosts = results.filter(r => r.success);
    if (successfulPosts.length > 0) {
      await storage.updateListing(listingId, { status: "active" });
    }

    // Complete job
    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { results, successCount: successfulPosts.length, totalCount: marketplaces.length },
      completedAt: new Date(),
    });

    // Create audit log
    await storage.createAuditLog({
      userId: listing.userId,
      action: "listing_posted",
      entityType: "listing",
      entityId: listingId,
      metadata: { results },
      ipAddress: null,
      userAgent: null,
    });
  }
}

class DelistListingProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { listingId, marketplaces } = job.data as { listingId: string; marketplaces?: string[] };
    
    const listing = await storage.getListing(listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const listingPosts = await storage.getListingPosts(listingId);
    const postsToDelete = marketplaces 
      ? listingPosts.filter(p => marketplaces.includes(p.marketplace) && p.status === "posted")
      : listingPosts.filter(p => p.status === "posted");

    const connections = await storage.getMarketplaceConnections(listing.userId);
    const results: Array<{ marketplace: string; success: boolean; error?: string }> = [];

    for (const post of postsToDelete) {
      try {
        const progress = Math.round(((results.length) / postsToDelete.length) * 100);
        await storage.updateJob(job.id, { progress, status: "processing" });

        const connection = connections.find(c => c.marketplace === post.marketplace && c.isConnected);
        if (!connection || !post.externalId) {
          results.push({ marketplace: post.marketplace, success: false, error: "No connection or external ID" });
          continue;
        }

        await marketplaceService.deleteListing(post.externalId, post.marketplace, connection);
        
        await storage.updateListingPost(post.id, {
          status: "delisted",
        });

        results.push({ marketplace: post.marketplace, success: true });

      } catch (error) {
        results.push({ 
          marketplace: post.marketplace, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    // Update listing status if all posts were delisted
    const activePosts = await storage.getListingPosts(listingId);
    const hasActivePosts = activePosts.some(p => p.status === "posted");
    if (!hasActivePosts) {
      await storage.updateListing(listingId, { status: "delisted" });
    }

    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { results, successCount: results.filter(r => r.success).length, totalCount: postsToDelete.length },
      completedAt: new Date(),
    });
  }
}

class SyncInventoryProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { listingId, soldMarketplace } = job.data as { listingId: string; soldMarketplace: string };
    
    const listing = await storage.getListing(listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    // Mark listing as sold
    await storage.updateListing(listingId, { status: "sold" });

    // Get all active posts for this listing on other marketplaces
    const listingPosts = await storage.getListingPosts(listingId);
    const activePosts = listingPosts.filter(p => p.marketplace !== soldMarketplace && p.status === "posted");

    if (activePosts.length > 0) {
      // Create a delist job for remaining active posts
      await storage.createJob(listing.userId, {
        type: "delist-listing",
        data: {
          listingId,
          marketplaces: activePosts.map(p => p.marketplace),
          reason: "sold_on_other_marketplace",
        },
      });
    }

    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { 
        listingMarkedSold: true, 
        delistJobsCreated: activePosts.length > 0 ? 1 : 0,
        affectedMarketplaces: activePosts.map(p => p.marketplace)
      },
      completedAt: new Date(),
    });

    // Create audit log
    await storage.createAuditLog({
      userId: listing.userId,
      action: "inventory_synced",
      entityType: "listing",
      entityId: listingId,
      metadata: { soldMarketplace, affectedMarketplaces: activePosts.map(p => p.marketplace) },
      ipAddress: null,
      userAgent: null,
    });
  }
}

export class QueueService {
  private processors: Map<string, JobProcessor> = new Map([
    ["post-listing", new PostListingProcessor()],
    ["delist-listing", new DelistListingProcessor()],
    ["sync-inventory", new SyncInventoryProcessor()],
  ]);

  async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.type);
    if (!processor) {
      throw new Error(`No processor found for job type: ${job.type}`);
    }

    // Extract marketplace from job data for circuit breaker check
    const marketplace = this.extractMarketplaceFromJob(job);
    
    // Check circuit breaker before processing
    if (marketplace) {
      const circuitBreakerDecision = await circuitBreakerService.shouldAllowRequest(marketplace);
      if (!circuitBreakerDecision.allowed) {
        console.warn(`Job ${job.id} blocked by circuit breaker for ${marketplace}: ${circuitBreakerDecision.reason}`);
        
        // Schedule retry based on circuit breaker recommendation
        const nextRetryAt = circuitBreakerDecision.nextRetryAt || new Date(Date.now() + 60000); // 1 minute fallback
        await storage.updateJob(job.id, {
          status: "pending",
          errorMessage: `Circuit breaker: ${circuitBreakerDecision.reason}`,
          scheduledFor: nextRetryAt,
        });
        return;
      }
    }

    const startTime = Date.now();
    let processingError: Error | null = null;

    try {
      await storage.updateJob(job.id, {
        status: "processing",
        startedAt: new Date(),
        attempts: job.attempts + 1,
      });

      await processor.process(job);
      
      // Record success in circuit breaker
      if (marketplace) {
        await circuitBreakerService.recordSuccess(marketplace);
      }
      
      // Record success metrics
      await retryMetricsService.recordRetryMetrics(
        job,
        job.attempts + 1,
        "success",
        undefined,
        Date.now() - startTime,
        marketplace
      );
      
    } catch (error) {
      processingError = error instanceof Error ? error : new Error("Unknown error");
      
      // Record failure in circuit breaker
      if (marketplace) {
        await circuitBreakerService.recordFailure(marketplace);
      }
      
      // Use advanced retry strategy
      await this.handleJobFailure(job, processingError, Date.now() - startTime, marketplace);
    }
  }

  /**
   * Handle job failure with advanced retry logic
   */
  private async handleJobFailure(
    job: Job,
    error: Error,
    processingDuration: number,
    marketplace?: string
  ): Promise<void> {
    try {
      // Create retry context for analysis
      const retryContext: RetryContext = {
        job,
        error,
        marketplace,
        processingDuration,
      };

      // Add additional context if available (HTTP status, response headers, etc.)
      // This would be populated by the marketplace service in a real implementation
      if (error.message.includes("429") || error.message.toLowerCase().includes("rate limit")) {
        (retryContext as any).statusCode = 429;
      } else if (error.message.includes("401") || error.message.toLowerCase().includes("unauthorized")) {
        (retryContext as any).statusCode = 401;
      } else if (error.message.includes("500") || error.message.toLowerCase().includes("internal server error")) {
        (retryContext as any).statusCode = 500;
      }

      // Determine retry strategy
      const retryDecision = await retryStrategyService.determineRetryStrategy(retryContext);
      
      console.log(`Retry decision for job ${job.id}:`, {
        shouldRetry: retryDecision.shouldRetry,
        reason: retryDecision.reason,
        delayMs: retryDecision.delayMs,
        category: retryDecision.metadata.failureCategory,
      });

      // Record failure metrics
      await retryMetricsService.recordRetryMetrics(
        job,
        job.attempts + 1,
        "failure",
        retryDecision.metadata.failureCategory,
        processingDuration,
        marketplace
      );

      if (retryDecision.shouldRetry) {
        // Schedule retry with calculated delay
        await storage.updateJob(job.id, {
          status: "pending",
          errorMessage: error.message,
          scheduledFor: retryDecision.nextAttemptAt,
        });
        
        console.info(`Job ${job.id} scheduled for retry at ${retryDecision.nextAttemptAt.toISOString()}. Delay: ${retryDecision.delayMs}ms`);
      } else {
        // Check if we should move to dead letter queue
        if (retryDecision.maxRetriesReached) {
          await this.moveJobToDeadLetterQueue(job, retryDecision.metadata.failureCategory, error);
        } else {
          // Permanent failure - mark as failed
          await storage.updateJob(job.id, {
            status: "failed",
            errorMessage: `${error.message} (${retryDecision.reason})`,
            completedAt: new Date(),
          });
          
          // Create audit log for permanent failure
          await storage.createAuditLog({
            userId: job.userId,
            action: "job_permanently_failed",
            entityType: "job",
            entityId: job.id,
            metadata: {
              failureCategory: retryDecision.metadata.failureCategory,
              errorType: retryDecision.metadata.errorType,
              confidence: retryDecision.metadata.confidence,
              requiresUserIntervention: retryDecision.requiresUserIntervention,
            },
            ipAddress: null,
            userAgent: null,
          });
        }
      }
      
    } catch (retryError) {
      console.error(`Failed to handle job failure for ${job.id}:`, retryError);
      
      // Fallback to basic retry logic
      if (job.attempts >= job.maxAttempts) {
        await storage.updateJob(job.id, {
          status: "failed",
          errorMessage: `${error.message} (retry handling failed: ${retryError instanceof Error ? retryError.message : "unknown"})`,
          completedAt: new Date(),
        });
      } else {
        // Simple exponential backoff as fallback
        const retryDelay = Math.pow(2, job.attempts) * 1000;
        await storage.updateJob(job.id, {
          status: "pending",
          errorMessage: error.message,
          scheduledFor: new Date(Date.now() + retryDelay),
        });
      }
    }
  }

  /**
   * Move a failed job to the dead letter queue
   */
  private async moveJobToDeadLetterQueue(
    job: Job,
    finalFailureCategory: string,
    error: Error
  ): Promise<void> {
    try {
      // Get retry history for this job (would be from database in production)
      const retryHistory: JobRetryHistory[] = []; // Placeholder
      
      const dlqEntry = await deadLetterQueueService.moveToDeadLetterQueue(
        job,
        finalFailureCategory,
        retryHistory
      );
      
      console.warn(`Job ${job.id} moved to dead letter queue:`, {
        dlqId: dlqEntry.id,
        finalFailureCategory,
        totalAttempts: job.attempts,
        requiresManualReview: dlqEntry.requiresManualReview,
      });
      
    } catch (dlqError) {
      console.error(`Failed to move job ${job.id} to dead letter queue:`, dlqError);
      
      // Mark as failed if DLQ also fails
      await storage.updateJob(job.id, {
        status: "failed",
        errorMessage: `${error.message} (DLQ failed: ${dlqError instanceof Error ? dlqError.message : "unknown"})`,
        completedAt: new Date(),
      });
    }
  }

  /**
   * Extract marketplace from job data
   */
  private extractMarketplaceFromJob(job: Job): string | undefined {
    try {
      const jobData = job.data as any;
      
      // For single marketplace jobs
      if (jobData.marketplace) {
        return jobData.marketplace;
      }
      
      // For multi-marketplace jobs, use the first marketplace
      if (jobData.marketplaces && Array.isArray(jobData.marketplaces) && jobData.marketplaces.length > 0) {
        return jobData.marketplaces[0];
      }
      
      return undefined;
    } catch (error) {
      console.warn(`Failed to extract marketplace from job ${job.id}:`, error);
      return undefined;
    }
  }

  async processPendingJobs(): Promise<void> {
    const now = new Date();
    const allJobs = await storage.getJobs(undefined, { status: "pending" });
    const pendingJobs = allJobs.filter(job => job.scheduledFor <= now);

    for (const job of pendingJobs) {
      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
      }
    }
  }

  /**
   * Create intelligently scheduled posting job for multiple marketplaces
   */
  async createPostListingJob(userId: string, listingId: string, marketplaces: string[], options?: {
    requestedTime?: Date;
    priority?: number;
    useSmartScheduling?: boolean;
  }): Promise<Job[]> {
    const { requestedTime, priority = 0, useSmartScheduling = true } = options || {};
    
    if (!useSmartScheduling) {
      // Fallback to simple scheduling
      return [await storage.createJob(userId, {
        type: "post-listing",
        data: { listingId, marketplaces },
        priority,
        scheduledFor: requestedTime,
        smartScheduled: false,
      })];
    }

    // Get user and listing data for smart scheduling
    const [user, listing] = await Promise.all([
      storage.getUser(userId),
      storage.getListing(listingId),
    ]);

    if (!user || !listing) {
      throw new Error("User or listing not found");
    }

    // Use smart scheduler to determine optimal posting times
    const schedulingResult = await smartScheduler.scheduleJobs({
      user,
      listing,
      requestedMarketplaces: marketplaces,
      requestedTime,
      priority,
    });

    // Create jobs with intelligent scheduling
    const jobs: Job[] = [];
    const marketplaceGroup = `${listingId}-${Date.now()}`; // Group ID for batch tracking
    
    for (const scheduledJob of schedulingResult.scheduledJobs) {
      const job = await storage.createJob(userId, {
        type: "post-listing",
        data: { 
          listingId, 
          marketplaces: [scheduledJob.marketplace],
          schedulingReason: scheduledJob.reasoning,
        },
        scheduledFor: scheduledJob.scheduledFor,
        smartScheduled: true,
        originalScheduledFor: requestedTime,
        marketplaceGroup,
        priority,
        schedulingMetadata: {
          confidenceScore: scheduledJob.confidenceScore,
          estimatedSuccessRate: scheduledJob.estimatedSuccessRate,
          distributionStrategy: schedulingResult.distributionStrategy,
          totalDelay: schedulingResult.totalDelay,
        },
      });
      jobs.push(job);
    }

    // Log smart scheduling result
    await storage.createAuditLog({
      userId,
      action: "smart_schedule_created",
      entityType: "listing",
      entityId: listingId,
      metadata: {
        marketplaces,
        schedulingResult,
        jobsCreated: jobs.length,
      },
      ipAddress: null,
      userAgent: null,
    });

    return jobs;
  }

  /**
   * Create delist job with intelligent timing (immediate for urgent delisting)
   */
  async createDelistListingJob(userId: string, listingId: string, marketplaces?: string[], urgent = false): Promise<Job> {
    // Delisting is usually urgent, so schedule immediately with minimal delay
    const scheduledFor = urgent ? new Date() : new Date(Date.now() + 30000); // 30 second delay for non-urgent

    return storage.createJob(userId, {
      type: "delist-listing",
      data: { listingId, marketplaces, urgent },
      scheduledFor,
      smartScheduled: false, // Delisting doesn't use smart scheduling
      priority: urgent ? 10 : 5, // High priority for urgent delisting
    });
  }

  /**
   * Create sync inventory job with smart timing to avoid conflicts
   */
  async createSyncInventoryJob(userId: string, listingId: string, soldMarketplace: string): Promise<Job> {
    // Inventory sync should happen quickly but avoid conflicts with posting jobs
    const scheduledFor = new Date(Date.now() + 10000); // 10 second delay to avoid conflicts

    return storage.createJob(userId, {
      type: "sync-inventory",
      data: { listingId, soldMarketplace },
      scheduledFor,
      smartScheduled: true, // Use smart scheduling for inventory sync timing
      priority: 8, // High priority but not urgent
      schedulingMetadata: {
        reason: "inventory_sync_after_sale",
        soldMarketplace,
      },
    });
  }

  /**
   * Create batch posting job for multiple listings with optimal distribution
   */
  async createBatchPostingJob(userId: string, listingData: Array<{
    listingId: string;
    marketplaces: string[];
    priority?: number;
  }>, options?: {
    requestedTime?: Date;
    distributionMinutes?: number; // Spread posts over this many minutes
  }): Promise<Job[]> {
    const { requestedTime, distributionMinutes = 60 } = options || {};
    const allJobs: Job[] = [];

    // Sort by priority (higher first)
    const sortedListings = listingData.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    let currentDelay = 0;
    const delayIncrement = (distributionMinutes * 60 * 1000) / listingData.length; // Distribute evenly
    
    for (const listing of sortedListings) {
      const listingRequestedTime = requestedTime 
        ? new Date(requestedTime.getTime() + currentDelay)
        : new Date(Date.now() + currentDelay);
      
      const jobs = await this.createPostListingJob(
        userId, 
        listing.listingId, 
        listing.marketplaces,
        {
          requestedTime: listingRequestedTime,
          priority: listing.priority,
          useSmartScheduling: true,
        }
      );
      
      allJobs.push(...jobs);
      currentDelay += delayIncrement;
    }

    return allJobs;
  }
}

export const queueService = new QueueService();

// Process jobs every 30 seconds
setInterval(() => {
  queueService.processPendingJobs().catch(console.error);
}, 30000);
