import { type Job, type Listing, type ListingPost, type User, type JobRetryHistory, type AutomationRule, type AutomationLog } from "@shared/schema";
import { storage } from "../storage";
import { marketplaceService } from "./marketplaceService";
import { smartScheduler } from "./smartScheduler";
import { retryStrategyService, type RetryContext } from "./retryStrategyService";
import { circuitBreakerService } from "./circuitBreakerService";
import { deadLetterQueueService } from "./deadLetterQueueService";
import { failureCategorizationService } from "./failureCategorizationService";
import { retryMetricsService } from "./retryMetricsService";
import { rateLimitService } from "./rateLimitService";
import { rateLimitMiddleware, RateLimitError } from "./rateLimitMiddleware";
import { automationService } from "./automationService";
import { poshmarkAutomationEngine } from "./poshmarkAutomationEngine";
import { mercariAutomationEngine } from "./mercariAutomationEngine";
import { depopAutomationEngine } from "./depopAutomationEngine";
import { grailedAutomationEngine } from "./grailedAutomationEngine";
import { automationSafetyService } from "./automationSafetyService";
import { automationSchedulerService } from "./automationSchedulerService";

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

    // Emit job start notification
    if (global.broadcastToUser) {
      global.broadcastToUser(listing.userId, {
        type: 'job_status',
        data: {
          jobId: job.id,
          type: job.type,
          status: 'started',
          listingId,
          listingTitle: listing.title,
          marketplaces,
          totalMarketplaces: marketplaces.length,
          progress: 0
        }
      });
    }

    const connections = await storage.getMarketplaceConnections(listing.userId);
    const results: Array<{ marketplace: string; success: boolean; error?: string; externalId?: string; url?: string }> = [];

    for (const marketplace of marketplaces) {
      try {
        // Update job progress
        const progress = Math.round(((results.length) / marketplaces.length) * 100);
        await storage.updateJob(job.id, { progress, status: "processing" });
        
        // Emit progress update
        if (global.broadcastToUser) {
          global.broadcastToUser(listing.userId, {
            type: 'job_progress',
            data: {
              jobId: job.id,
              step: `Checking ${marketplace} connection`,
              marketplace,
              progress,
              status: 'processing'
            }
          });
        }

        const connection = connections.find(c => c.marketplace === marketplace && c.isConnected);
        if (!connection) {
          results.push({ marketplace, success: false, error: "No active connection" });
          
          // Emit connection error
          if (global.broadcastToUser) {
            global.broadcastToUser(listing.userId, {
              type: 'job_progress',
              data: {
                jobId: job.id,
                step: `No connection to ${marketplace}`,
                marketplace,
                progress,
                status: 'error',
                error: 'No active connection'
              }
            });
          }
          continue;
        }

        // Check rate limits before proceeding
        const rateLimitCheck = await rateLimitService.checkRateLimit(marketplace, listing.userId);
        if (!rateLimitCheck.allowed) {
          // Reschedule job for later if rate limited
          const rescheduleTime = new Date(Date.now() + (rateLimitCheck.waitTime || 60000));
          await storage.updateJob(job.id, {
            scheduledFor: rescheduleTime,
            status: "pending",
            progress: 0,
            errorMessage: `Rate limited: ${rateLimitCheck.reasoning}. Rescheduled for ${rescheduleTime.toISOString()}`,
          });
          
          // Emit rate limit notification
          if (global.broadcastToUser) {
            global.broadcastToUser(listing.userId, {
              type: 'rate_limit',
              data: {
                jobId: job.id,
                marketplace,
                reason: rateLimitCheck.reasoning,
                waitTime: rateLimitCheck.waitTime,
                rescheduledFor: rescheduleTime.toISOString(),
                status: 'rate_limited'
              }
            });
          }
          
          results.push({ 
            marketplace, 
            success: false, 
            error: `Rate limited: ${rateLimitCheck.reasoning}` 
          });
          continue;
        }

        // Apply optimal delay for rate limiting
        const optimalDelay = await rateLimitService.getOptimalDelay(marketplace, job.priority || 0);
        if (optimalDelay > 1000) { // Only delay if more than 1 second
          console.log(`Applying rate limit delay of ${optimalDelay}ms for ${marketplace}`);
          
          // Emit delay notification
          if (global.broadcastToUser) {
            global.broadcastToUser(listing.userId, {
              type: 'job_progress',
              data: {
                jobId: job.id,
                step: `Applying optimal delay for ${marketplace}`,
                marketplace,
                progress,
                delayMs: optimalDelay,
                status: 'delaying'
              }
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, optimalDelay));
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
          // Emit posting attempt
          if (global.broadcastToUser) {
            global.broadcastToUser(listing.userId, {
              type: 'job_progress',
              data: {
                jobId: job.id,
                step: `Posting to ${marketplace}`,
                marketplace,
                progress,
                status: 'posting'
              }
            });
          }

          const result = await marketplaceService.createListing(marketplace, listing, connection);
          
          // Record successful API request
          await rateLimitService.recordRequest(marketplace, true);
          
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

          // Emit success notification
          if (global.broadcastToUser) {
            global.broadcastToUser(listing.userId, {
              type: 'job_progress',
              data: {
                jobId: job.id,
                step: `Successfully posted to ${marketplace}`,
                marketplace,
                externalId: result.externalId,
                url: result.url,
                progress: Math.round(((results.length) / marketplaces.length) * 100),
                status: 'success'
              }
            });
          }

        } catch (error) {
          // Record failed API request
          await rateLimitService.recordRequest(marketplace, false);
          
          // Handle rate limit errors specifically
          if (error instanceof RateLimitError) {
            // Reschedule job for after rate limit resets
            const rescheduleTime = new Date(Date.now() + error.waitTime);
            await storage.updateJob(job.id, {
              scheduledFor: rescheduleTime,
              status: "pending",
              progress: 0,
              errorMessage: `Rate limited: ${error.message}. Rescheduled for ${rescheduleTime.toISOString()}`,
            });
            
            // Emit rate limit error
            if (global.broadcastToUser) {
              global.broadcastToUser(listing.userId, {
                type: 'rate_limit',
                data: {
                  jobId: job.id,
                  marketplace,
                  reason: error.message,
                  waitTime: error.waitTime,
                  rescheduledFor: rescheduleTime.toISOString(),
                  status: 'rate_limited_error'
                }
              });
            }
          }
          
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
          
          // Emit posting error
          if (global.broadcastToUser) {
            global.broadcastToUser(listing.userId, {
              type: 'job_progress',
              data: {
                jobId: job.id,
                step: `Failed to post to ${marketplace}`,
                marketplace,
                progress: Math.round(((results.length) / marketplaces.length) * 100),
                status: 'error',
                error: error instanceof Error ? error.message : "Unknown error"
              }
            });
          }
        }
      } catch (error) {
        results.push({ 
          marketplace, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
        
        // Emit general error
        if (global.broadcastToUser) {
          global.broadcastToUser(listing.userId, {
            type: 'job_progress',
            data: {
              jobId: job.id,
              step: `Error processing ${marketplace}`,
              marketplace,
              progress: Math.round(((results.length) / marketplaces.length) * 100),
              status: 'error',
              error: error instanceof Error ? error.message : "Unknown error"
            }
          });
        }
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

    // Emit job completion
    if (global.broadcastToUser) {
      global.broadcastToUser(listing.userId, {
        type: 'job_status',
        data: {
          jobId: job.id,
          type: job.type,
          status: 'completed',
          listingId,
          listingTitle: listing.title,
          results,
          successCount: successfulPosts.length,
          totalCount: marketplaces.length,
          progress: 100,
          completedAt: new Date().toISOString()
        }
      });
    }

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

    // Emit delist job start notification
    if (global.broadcastToUser) {
      global.broadcastToUser(listing.userId, {
        type: 'job_status',
        data: {
          jobId: job.id,
          type: job.type,
          status: 'started',
          listingId,
          listingTitle: listing.title,
          marketplaces: marketplaces || ['all'],
          progress: 0
        }
      });
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
        
        // Emit delisting progress
        if (global.broadcastToUser) {
          global.broadcastToUser(listing.userId, {
            type: 'job_progress',
            data: {
              jobId: job.id,
              step: `Delisting from ${post.marketplace}`,
              marketplace: post.marketplace,
              progress,
              status: 'processing'
            }
          });
        }

        const connection = connections.find(c => c.marketplace === post.marketplace && c.isConnected);
        if (!connection || !post.externalId) {
          results.push({ marketplace: post.marketplace, success: false, error: "No connection or external ID" });
          continue;
        }

        // Check rate limits before delisting
        const rateLimitCheck = await rateLimitService.checkRateLimit(post.marketplace, listing.userId);
        if (!rateLimitCheck.allowed) {
          // Reschedule job for later if rate limited
          const rescheduleTime = new Date(Date.now() + (rateLimitCheck.waitTime || 60000));
          await storage.updateJob(job.id, {
            scheduledFor: rescheduleTime,
            status: "pending",
            progress: 0,
            errorMessage: `Rate limited: ${rateLimitCheck.reasoning}. Rescheduled for ${rescheduleTime.toISOString()}`,
          });
          
          results.push({ 
            marketplace: post.marketplace, 
            success: false, 
            error: `Rate limited: ${rateLimitCheck.reasoning}` 
          });
          continue;
        }

        // Apply optimal delay for rate limiting
        const optimalDelay = await rateLimitService.getOptimalDelay(post.marketplace, job.priority || 0);
        if (optimalDelay > 1000) {
          await new Promise(resolve => setTimeout(resolve, optimalDelay));
        }

        try {
          await marketplaceService.deleteListing(post.externalId, post.marketplace, connection);
          
          // Record successful API request
          await rateLimitService.recordRequest(post.marketplace, true);
          
          await storage.updateListingPost(post.id, {
            status: "delisted",
          });

          results.push({ marketplace: post.marketplace, success: true });
          
          // Emit delisting success
          if (global.broadcastToUser) {
            global.broadcastToUser(listing.userId, {
              type: 'job_progress',
              data: {
                jobId: job.id,
                step: `Successfully delisted from ${post.marketplace}`,
                marketplace: post.marketplace,
                progress: Math.round(((results.length) / postsToDelete.length) * 100),
                status: 'success'
              }
            });
          }
        } catch (deleteError) {
          // Record failed API request
          await rateLimitService.recordRequest(post.marketplace, false);
          
          // Handle rate limit errors specifically
          if (deleteError instanceof RateLimitError) {
            const rescheduleTime = new Date(Date.now() + deleteError.waitTime);
            await storage.updateJob(job.id, {
              scheduledFor: rescheduleTime,
              status: "pending",
              progress: 0,
              errorMessage: `Rate limited: ${deleteError.message}. Rescheduled for ${rescheduleTime.toISOString()}`,
            });
            
            // Emit rate limit error for delist
            if (global.broadcastToUser) {
              global.broadcastToUser(listing.userId, {
                type: 'rate_limit',
                data: {
                  jobId: job.id,
                  marketplace: post.marketplace,
                  reason: deleteError.message,
                  waitTime: deleteError.waitTime,
                  rescheduledFor: rescheduleTime.toISOString(),
                  status: 'rate_limited_delist'
                }
              });
            }
          }
          
          // Emit delisting error
          if (global.broadcastToUser) {
            global.broadcastToUser(listing.userId, {
              type: 'job_progress',
              data: {
                jobId: job.id,
                step: `Failed to delist from ${post.marketplace}`,
                marketplace: post.marketplace,
                progress: Math.round(((results.length) / postsToDelete.length) * 100),
                status: 'error',
                error: deleteError instanceof Error ? deleteError.message : "Unknown error"
              }
            });
          }
          
          throw deleteError; // Re-throw to be caught by outer catch
        }

      } catch (error) {
        results.push({ 
          marketplace: post.marketplace, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
        
        // Emit general delisting error
        if (global.broadcastToUser) {
          global.broadcastToUser(listing.userId, {
            type: 'job_progress',
            data: {
              jobId: job.id,
              step: `Error delisting from ${post.marketplace}`,
              marketplace: post.marketplace,
              progress: Math.round(((results.length) / postsToDelete.length) * 100),
              status: 'error',
              error: error instanceof Error ? error.message : "Unknown error"
            }
          });
        }
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

// Base Automation Job Processor
class AutomationJobProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { ruleId, triggeredBy = "scheduled" } = job.data as { ruleId: string; triggeredBy?: "manual" | "scheduled" | "event" };
    
    // Get automation rule
    const rule = await storage.getAutomationRule(ruleId);
    if (!rule) {
      throw new Error(`Automation rule ${ruleId} not found`);
    }

    const user = await storage.getUser(rule.userId);
    if (!user) {
      throw new Error(`User ${rule.userId} not found`);
    }

    // Emit job start notification
    if (global.broadcastToUser) {
      global.broadcastToUser(rule.userId, {
        type: 'automation_status',
        data: {
          jobId: job.id,
          ruleId: rule.id,
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          marketplace: rule.marketplace,
          status: 'started',
          progress: 0,
          triggeredBy
        }
      });
    }

    try {
      // Check automation safety
      const safetyCheck = await automationSafetyService.checkExecutionSafety(rule, user);
      if (!safetyCheck.allowed) {
        throw new Error(`Automation blocked: ${safetyCheck.reason}`);
      }

      // Apply human-like delay
      const delay = await automationSafetyService.getHumanLikeDelay(rule.ruleType);
      if (delay > 0) {
        // Emit delay notification
        if (global.broadcastToUser) {
          global.broadcastToUser(rule.userId, {
            type: 'automation_progress',
            data: {
              jobId: job.id,
              step: 'Applying human-like delay',
              delayMs: delay,
              progress: 10,
              status: 'delaying'
            }
          });
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Update progress
      await storage.updateJob(job.id, { progress: 20, status: "processing" });
      
      // Execute automation
      const result = await automationService.executeAutomation(ruleId, triggeredBy);
      
      // Update job with result
      await storage.updateJob(job.id, {
        status: "completed",
        progress: 100,
        result,
        completedAt: new Date(),
      });

      // Emit completion notification
      if (global.broadcastToUser) {
        global.broadcastToUser(rule.userId, {
          type: 'automation_status',
          data: {
            jobId: job.id,
            ruleId: rule.id,
            ruleName: rule.ruleName,
            status: 'completed',
            progress: 100,
            result,
            completedAt: new Date().toISOString()
          }
        });
      }

      // Create audit log
      await storage.createAuditLog({
        userId: rule.userId,
        action: "automation_executed",
        entityType: "automation",
        entityId: ruleId,
        metadata: { result, triggeredBy },
        ipAddress: null,
        userAgent: null,
      });
      
    } catch (error) {
      // Emit error notification
      if (global.broadcastToUser) {
        global.broadcastToUser(rule.userId, {
          type: 'automation_status',
          data: {
            jobId: job.id,
            ruleId: rule.id,
            ruleName: rule.ruleName,
            status: 'error',
            error: error instanceof Error ? error.message : "Unknown error",
            progress: 0
          }
        });
      }
      throw error;
    }
  }
}

// Batch Automation Job Processor
class BatchAutomationJobProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { ruleIds, userId } = job.data as { ruleIds: string[]; userId: string };
    
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const results: Array<{ ruleId: string; success: boolean; error?: string }> = [];
    
    // Emit batch job start
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'batch_automation_status',
        data: {
          jobId: job.id,
          totalRules: ruleIds.length,
          status: 'started',
          progress: 0
        }
      });
    }

    for (const ruleId of ruleIds) {
      try {
        const progress = Math.round((results.length / ruleIds.length) * 100);
        await storage.updateJob(job.id, { progress, status: "processing" });
        
        // Emit progress
        if (global.broadcastToUser) {
          global.broadcastToUser(userId, {
            type: 'batch_automation_progress',
            data: {
              jobId: job.id,
              currentRuleId: ruleId,
              progress,
              processedCount: results.length,
              totalCount: ruleIds.length,
              status: 'processing'
            }
          });
        }

        const rule = await storage.getAutomationRule(ruleId);
        if (!rule || !rule.isEnabled) {
          results.push({ ruleId, success: false, error: "Rule not found or disabled" });
          continue;
        }

        // Check safety limits
        const safetyCheck = await automationSafetyService.checkExecutionSafety(rule, user);
        if (!safetyCheck.allowed) {
          results.push({ ruleId, success: false, error: safetyCheck.reason });
          continue;
        }

        // Apply delay between batch items
        const delay = await automationSafetyService.getHumanLikeDelay(rule.ruleType);
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Execute automation
        await automationService.executeAutomation(ruleId, "scheduled");
        results.push({ ruleId, success: true });
        
      } catch (error) {
        results.push({ 
          ruleId, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    // Update job completion
    const successCount = results.filter(r => r.success).length;
    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { results, successCount, totalCount: ruleIds.length },
      completedAt: new Date(),
    });

    // Emit completion
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'batch_automation_status',
        data: {
          jobId: job.id,
          status: 'completed',
          results,
          successCount,
          totalCount: ruleIds.length,
          progress: 100,
          completedAt: new Date().toISOString()
        }
      });
    }
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

// Poshmark Share Processor
class PoshmarkShareProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, listingIds, settings } = job.data as { 
      userId: string; 
      listingIds?: string[]; 
      settings?: any;
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Get Poshmark connection
    const connections = await storage.getMarketplaceConnections(userId);
    const poshmarkConnection = connections.find(c => c.marketplace === "poshmark" && c.isConnected);
    
    if (!poshmarkConnection) {
      throw new Error("No active Poshmark connection");
    }

    // Get listings to share
    let listings: any[] = [];
    if (listingIds) {
      listings = await Promise.all(listingIds.map(id => storage.getListing(id)));
    } else {
      listings = await storage.getListings(userId, { marketplace: "poshmark", status: "active" });
    }

    const totalListings = listings.length;
    let shared = 0;
    let failed = 0;

    // Emit start notification
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'poshmark_share_status',
        data: {
          jobId: job.id,
          status: 'started',
          totalListings,
          progress: 0
        }
      });
    }

    for (const listing of listings) {
      try {
        // Check rate limits
        const rateLimitCheck = await rateLimitService.checkRateLimit("poshmark", userId);
        if (!rateLimitCheck.allowed) {
          // Reschedule remaining items
          const remainingListingIds = listings.slice(shared).map(l => l.id);
          if (remainingListingIds.length > 0) {
            await storage.createJob(userId, {
              type: "poshmark_share",
              data: { userId, listingIds: remainingListingIds, settings },
              scheduledFor: new Date(Date.now() + (rateLimitCheck.waitTime || 60000))
            });
          }
          break;
        }

        // Apply human-like delay
        const delay = Math.random() * 5000 + 3000; // 3-8 seconds
        await new Promise(resolve => setTimeout(resolve, delay));

        // Share the listing (using the actual API client through the engine)
        // Note: The engine's executeAutomation method handles the actual sharing
        // We'll use a simplified version here for direct job processing
        if (listing.externalId) {
          const engine = poshmarkAutomationEngine as any;
          await engine.apiClient.shareItem(listing.externalId, poshmarkConnection.accessToken);
          shared++;
        }

        // Update progress
        const progress = Math.round((shared / totalListings) * 100);
        await storage.updateJob(job.id, { progress });

        // Emit progress
        if (global.broadcastToUser) {
          global.broadcastToUser(userId, {
            type: 'poshmark_share_progress',
            data: {
              jobId: job.id,
              listingTitle: listing.title,
              shared,
              totalListings,
              progress,
              status: 'sharing'
            }
          });
        }

      } catch (error) {
        failed++;
        console.error(`Failed to share listing ${listing.id}:`, error);
      }
    }

    // Complete job
    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { shared, failed, total: totalListings },
      completedAt: new Date(),
    });

    // Emit completion
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'poshmark_share_status',
        data: {
          jobId: job.id,
          status: 'completed',
          shared,
          failed,
          totalListings,
          progress: 100
        }
      });
    }
  }
}

// Poshmark Follow Processor
class PoshmarkFollowProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, userIds, maxFollows = 50 } = job.data as { 
      userId: string; 
      userIds: string[];
      maxFollows?: number;
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const connections = await storage.getMarketplaceConnections(userId);
    const poshmarkConnection = connections.find(c => c.marketplace === "poshmark" && c.isConnected);
    
    if (!poshmarkConnection) {
      throw new Error("No active Poshmark connection");
    }

    let followed = 0;
    let failed = 0;
    const toFollow = userIds.slice(0, maxFollows);

    for (const targetUserId of toFollow) {
      try {
        // Check rate limits
        const rateLimitCheck = await rateLimitService.checkRateLimit("poshmark", userId);
        if (!rateLimitCheck.allowed) {
          break;
        }

        // Apply human-like delay
        const delay = Math.random() * 10000 + 5000; // 5-15 seconds between follows
        await new Promise(resolve => setTimeout(resolve, delay));

        // Follow user (using the actual API client through the engine)
        const engine = poshmarkAutomationEngine as any;
        await engine.apiClient.followUser(targetUserId, poshmarkConnection.accessToken);
        followed++;

        // Update progress
        const progress = Math.round((followed / toFollow.length) * 100);
        await storage.updateJob(job.id, { progress });

      } catch (error) {
        failed++;
        console.error(`Failed to follow user ${targetUserId}:`, error);
      }
    }

    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { followed, failed, total: toFollow.length },
      completedAt: new Date(),
    });
  }
}

// Poshmark Offer Processor
class PoshmarkOfferProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, listingId, offerTemplate } = job.data as { 
      userId: string; 
      listingId: string;
      offerTemplate: any;
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const listing = await storage.getListing(listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const connections = await storage.getMarketplaceConnections(userId);
    const poshmarkConnection = connections.find(c => c.marketplace === "poshmark" && c.isConnected);
    
    if (!poshmarkConnection) {
      throw new Error("No active Poshmark connection");
    }

    try {
      // Send offer to likers (using the actual API client through the engine)
      const engine = poshmarkAutomationEngine as any;
      const likers = listing.externalId ? await engine.apiClient.getLikers(listing.externalId, poshmarkConnection.accessToken) : [];
      let sent = 0;
      
      for (const liker of likers) {
        // Check rate limits
        const rateLimitCheck = await rateLimitService.checkRateLimit("poshmark", userId);
        if (!rateLimitCheck.allowed) {
          break;
        }

        // Apply delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (listing.externalId) {
          await engine.apiClient.sendOffer(listing.externalId, {
            userId: liker,
            ...offerTemplate
          }, poshmarkConnection.accessToken);
          sent++;
        }

        const progress = Math.round((sent / likers.length) * 100);
        await storage.updateJob(job.id, { progress });
      }

      await storage.updateJob(job.id, {
        status: "completed",
        progress: 100,
        result: { offersSent: sent, totalLikers: likers.length },
        completedAt: new Date(),
      });

    } catch (error) {
      throw error;
    }
  }
}

// Mercari Offer Processor
class MercariOfferProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, listingId, offerPercentage } = job.data as { 
      userId: string; 
      listingId: string;
      offerPercentage: number;
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const listing = await storage.getListing(listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const connections = await storage.getMarketplaceConnections(userId);
    const mercariConnection = connections.find(c => c.marketplace === "mercari" && c.isConnected);
    
    if (!mercariConnection) {
      throw new Error("No active Mercari connection");
    }

    try {
      // Send smart offer (using simplified API call)
      // Note: Mercari automation would typically use their API
      // This is a placeholder for the actual implementation
      console.log(`[Mercari] Would send offer with ${offerPercentage}% discount for listing ${listing.id}`);

      await storage.updateJob(job.id, {
        status: "completed",
        progress: 100,
        result: { offerSent: true },
        completedAt: new Date(),
      });

    } catch (error) {
      throw error;
    }
  }
}

// Mercari Relist Processor
class MercariRelistProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, daysStale = 30 } = job.data as { 
      userId: string;
      daysStale?: number;
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const connections = await storage.getMarketplaceConnections(userId);
    const mercariConnection = connections.find(c => c.marketplace === "mercari" && c.isConnected);
    
    if (!mercariConnection) {
      throw new Error("No active Mercari connection");
    }

    // Get stale listings
    const staleDate = new Date(Date.now() - daysStale * 24 * 60 * 60 * 1000);
    const listings = await storage.getListings(userId, { 
      marketplace: "mercari", 
      status: "active" 
    });
    
    const staleListings = listings.filter(l => l.createdAt < staleDate);
    let relisted = 0;
    
    for (const listing of staleListings) {
      try {
        // Check rate limits
        const rateLimitCheck = await rateLimitService.checkRateLimit("mercari", userId);
        if (!rateLimitCheck.allowed) {
          break;
        }

        // Apply delay
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Relist item (simplified implementation)
        // Note: This would typically delete and recreate the listing
        console.log(`[Mercari] Would relist item ${listing.id}`);
        relisted++;

        const progress = Math.round((relisted / staleListings.length) * 100);
        await storage.updateJob(job.id, { progress });

      } catch (error) {
        console.error(`Failed to relist ${listing.id}:`, error);
      }
    }

    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { relisted, total: staleListings.length },
      completedAt: new Date(),
    });
  }
}

// Depop Bump Processor
class DepopBumpProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, listingIds } = job.data as { 
      userId: string;
      listingIds?: string[];
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const connections = await storage.getMarketplaceConnections(userId);
    const depopConnection = connections.find(c => c.marketplace === "depop" && c.isConnected);
    
    if (!depopConnection) {
      throw new Error("No active Depop connection");
    }

    // Get listings to bump
    let listings: any[] = [];
    if (listingIds) {
      listings = await Promise.all(listingIds.map(id => storage.getListing(id)));
    } else {
      listings = await storage.getListings(userId, { marketplace: "depop", status: "active" });
    }

    let bumped = 0;
    
    for (const listing of listings) {
      try {
        // Check rate limits
        const rateLimitCheck = await rateLimitService.checkRateLimit("depop", userId);
        if (!rateLimitCheck.allowed) {
          break;
        }

        // Apply delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Bump listing (simplified implementation)
        // Note: Depop bump is typically done by updating the listing
        console.log(`[Depop] Would bump listing ${listing.id}`);
        bumped++;

        const progress = Math.round((bumped / listings.length) * 100);
        await storage.updateJob(job.id, { progress });

      } catch (error) {
        console.error(`Failed to bump ${listing.id}:`, error);
      }
    }

    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { bumped, total: listings.length },
      completedAt: new Date(),
    });
  }
}

// Grailed Bump Processor
class GrailedBumpProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, listingIds } = job.data as { 
      userId: string;
      listingIds?: string[];
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const connections = await storage.getMarketplaceConnections(userId);
    const grailedConnection = connections.find(c => c.marketplace === "grailed" && c.isConnected);
    
    if (!grailedConnection) {
      throw new Error("No active Grailed connection");
    }

    // Get listings
    let listings: any[] = [];
    if (listingIds) {
      listings = await Promise.all(listingIds.map(id => storage.getListing(id)));
    } else {
      listings = await storage.getListings(userId, { marketplace: "grailed", status: "active" });
    }

    let bumped = 0;
    
    for (const listing of listings) {
      try {
        // Check rate limits
        const rateLimitCheck = await rateLimitService.checkRateLimit("grailed", userId);
        if (!rateLimitCheck.allowed) {
          break;
        }

        // Apply delay
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Bump listing (simplified implementation)
        // Note: Grailed bump is typically done by updating the listing
        console.log(`[Grailed] Would bump listing ${listing.id}`);
        bumped++;

        const progress = Math.round((bumped / listings.length) * 100);
        await storage.updateJob(job.id, { progress });

      } catch (error) {
        console.error(`Failed to bump ${listing.id}:`, error);
      }
    }

    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { bumped, total: listings.length },
      completedAt: new Date(),
    });
  }
}

// Grailed Price Drop Processor
class GrailedPriceDropProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, listingIds, dropPercentage = 10 } = job.data as { 
      userId: string;
      listingIds: string[];
      dropPercentage?: number;
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const connections = await storage.getMarketplaceConnections(userId);
    const grailedConnection = connections.find(c => c.marketplace === "grailed" && c.isConnected);
    
    if (!grailedConnection) {
      throw new Error("No active Grailed connection");
    }

    let dropped = 0;
    const listings = await Promise.all(listingIds.map(id => storage.getListing(id)));
    
    for (const listing of listings) {
      if (!listing) continue;
      
      try {
        // Check rate limits
        const rateLimitCheck = await rateLimitService.checkRateLimit("grailed", userId);
        if (!rateLimitCheck.allowed) {
          break;
        }

        // Apply delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Apply price drop
        const newPrice = listing.price * (1 - dropPercentage / 100);
        // Note: This would typically call Grailed's API to update price
        console.log(`[Grailed] Would update price to ${newPrice} for listing ${listing.id}`);
        
        // Update local listing
        await storage.updateListing(listing.id, { price: newPrice });
        dropped++;

        const progress = Math.round((dropped / listings.length) * 100);
        await storage.updateJob(job.id, { progress });

      } catch (error) {
        console.error(`Failed to drop price for ${listing.id}:`, error);
      }
    }

    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { priceDropped: dropped, total: listings.length, dropPercentage },
      completedAt: new Date(),
    });
  }
}

// Cross-Platform Relist Processor
class CrossPlatformRelistProcessor implements JobProcessor {
  async process(job: Job): Promise<void> {
    const { userId, daysStale = 30, marketplaces } = job.data as { 
      userId: string;
      daysStale?: number;
      marketplaces?: string[];
    };

    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const targetMarketplaces = marketplaces || ["poshmark", "mercari", "depop", "grailed"];
    const staleDate = new Date(Date.now() - daysStale * 24 * 60 * 60 * 1000);
    const results: any[] = [];

    for (const marketplace of targetMarketplaces) {
      const listings = await storage.getListings(userId, { 
        marketplace, 
        status: "active" 
      });
      
      const staleListings = listings.filter(l => l.createdAt < staleDate);
      let relisted = 0;

      for (const listing of staleListings) {
        try {
          // Check rate limits
          const rateLimitCheck = await rateLimitService.checkRateLimit(marketplace, userId);
          if (!rateLimitCheck.allowed) {
            break;
          }

          // Apply delay
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Create relist job for specific marketplace
          await storage.createJob(userId, {
            type: "post-listing",
            data: {
              listingId: listing.id,
              marketplaces: [marketplace],
            },
            priority: 1,
          });
          
          relisted++;

        } catch (error) {
          console.error(`Failed to relist ${listing.id} on ${marketplace}:`, error);
        }
      }

      results.push({ marketplace, relisted, total: staleListings.length });
    }

    await storage.updateJob(job.id, {
      status: "completed",
      progress: 100,
      result: { results },
      completedAt: new Date(),
    });
  }
}

export class QueueService {
  private processors: Map<string, JobProcessor> = new Map([
    ["post-listing", new PostListingProcessor()],
    ["delist-listing", new DelistListingProcessor()],
    ["sync-inventory", new SyncInventoryProcessor()],
    ["automation_execute", new AutomationJobProcessor()],
    ["automation_batch", new BatchAutomationJobProcessor()],
    ["poshmark_share", new PoshmarkShareProcessor()],
    ["poshmark_follow", new PoshmarkFollowProcessor()],
    ["poshmark_offer", new PoshmarkOfferProcessor()],
    ["mercari_offer", new MercariOfferProcessor()],
    ["mercari_relist", new MercariRelistProcessor()],
    ["depop_bump", new DepopBumpProcessor()],
    ["grailed_bump", new GrailedBumpProcessor()],
    ["grailed_price_drop", new GrailedPriceDropProcessor()],
    ["cross_platform_relist", new CrossPlatformRelistProcessor()],
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

  /**
   * Create an automation job
   */
  async createAutomationJob(
    userId: string,
    ruleId: string,
    triggeredBy: "manual" | "scheduled" | "event" = "scheduled",
    priority: number = 0
  ): Promise<Job> {
    return await storage.createJob(userId, {
      type: "automation_execute",
      data: {
        ruleId,
        triggeredBy,
      },
      priority,
      scheduledFor: new Date(), // Execute immediately
    });
  }

  /**
   * Create a batch automation job
   */
  async createBatchAutomationJob(
    userId: string,
    ruleIds: string[],
    priority: number = 0
  ): Promise<Job> {
    return await storage.createJob(userId, {
      type: "automation_batch",
      data: {
        ruleIds,
        userId,
      },
      priority,
      scheduledFor: new Date(),
    });
  }

  /**
   * Create marketplace-specific automation jobs
   */
  async createMarketplaceAutomationJob(
    userId: string,
    marketplace: string,
    actionType: string,
    data: any,
    priority: number = 0
  ): Promise<Job> {
    const jobType = `${marketplace}_${actionType}`.toLowerCase();
    
    // Validate job type is supported
    if (!this.processors.has(jobType)) {
      throw new Error(`Unsupported automation job type: ${jobType}`);
    }

    return await storage.createJob(userId, {
      type: jobType,
      data: {
        userId,
        ...data,
      },
      priority,
      scheduledFor: new Date(),
    });
  }

  /**
   * Schedule recurring automation job
   */
  async scheduleRecurringAutomationJob(
    userId: string,
    ruleId: string,
    scheduleExpression: string,
    priority: number = 0
  ): Promise<Job> {
    const nextRunTime = this.calculateNextRunFromExpression(scheduleExpression);
    
    return await storage.createJob(userId, {
      type: "automation_execute",
      data: {
        ruleId,
        triggeredBy: "scheduled",
        recurring: true,
        scheduleExpression,
      },
      priority,
      scheduledFor: nextRunTime,
    });
  }

  /**
   * Calculate next run time from schedule expression
   */
  private calculateNextRunFromExpression(expression: string): Date {
    // Simple implementation - would use cron parser in production
    const now = new Date();
    
    if (expression === "hourly") {
      return new Date(now.getTime() + 60 * 60 * 1000);
    } else if (expression === "daily") {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (expression === "weekly") {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    
    // Default to 1 hour from now
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  /**
   * Cancel automation jobs for a rule
   */
  async cancelAutomationJobs(ruleId: string): Promise<number> {
    const jobs = await storage.getJobsByData({ ruleId });
    let cancelledCount = 0;
    
    for (const job of jobs) {
      if (job.status === "pending" || job.status === "scheduled") {
        await storage.updateJob(job.id, {
          status: "cancelled",
          errorMessage: "Automation rule disabled or deleted",
          completedAt: new Date(),
        });
        cancelledCount++;
      }
    }
    
    return cancelledCount;
  }

  /**
   * Get job metrics for automations
   */
  async getAutomationJobMetrics(userId: string, marketplace?: string): Promise<any> {
    const jobs = await storage.getJobs(userId);
    const automationJobs = jobs.filter(j => 
      j.type.includes("automation") || 
      (marketplace ? j.type.startsWith(marketplace) : false)
    );
    
    const metrics = {
      total: automationJobs.length,
      pending: automationJobs.filter(j => j.status === "pending").length,
      processing: automationJobs.filter(j => j.status === "processing").length,
      completed: automationJobs.filter(j => j.status === "completed").length,
      failed: automationJobs.filter(j => j.status === "failed").length,
      avgProcessingTime: 0,
      successRate: 0,
    };
    
    // Calculate average processing time and success rate
    const completedJobs = automationJobs.filter(j => j.status === "completed" && j.startedAt && j.completedAt);
    if (completedJobs.length > 0) {
      const totalTime = completedJobs.reduce((sum, j) => {
        const duration = j.completedAt!.getTime() - j.startedAt!.getTime();
        return sum + duration;
      }, 0);
      metrics.avgProcessingTime = totalTime / completedJobs.length;
      metrics.successRate = (metrics.completed / (metrics.completed + metrics.failed)) * 100;
    }
    
    return metrics;
  }
}

export const queueService = new QueueService();

// Process jobs every 30 seconds
setInterval(() => {
  queueService.processPendingJobs().catch(console.error);
}, 30000);
