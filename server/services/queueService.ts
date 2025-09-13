import { type Job, type Listing, type ListingPost, type User } from "@shared/schema";
import { storage } from "../storage";
import { marketplaceService } from "./marketplaceService";
import { smartScheduler } from "./smartScheduler";

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

    try {
      await storage.updateJob(job.id, {
        status: "processing",
        startedAt: new Date(),
        attempts: job.attempts + 1,
      });

      await processor.process(job);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (job.attempts >= job.maxAttempts) {
        await storage.updateJob(job.id, {
          status: "failed",
          errorMessage,
          completedAt: new Date(),
        });
      } else {
        // Schedule retry
        const retryDelay = Math.pow(2, job.attempts) * 1000; // Exponential backoff
        await storage.updateJob(job.id, {
          status: "pending",
          errorMessage,
          scheduledFor: new Date(Date.now() + retryDelay),
        });
      }
      
      throw error;
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
