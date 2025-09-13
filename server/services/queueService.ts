import { type Job, type Listing, type ListingPost } from "@shared/schema";
import { storage } from "../storage";
import { marketplaceService } from "./marketplaceService";

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

  async createPostListingJob(userId: string, listingId: string, marketplaces: string[]): Promise<Job> {
    return storage.createJob(userId, {
      type: "post-listing",
      data: { listingId, marketplaces },
    });
  }

  async createDelistListingJob(userId: string, listingId: string, marketplaces?: string[]): Promise<Job> {
    return storage.createJob(userId, {
      type: "delist-listing",
      data: { listingId, marketplaces },
    });
  }

  async createSyncInventoryJob(userId: string, listingId: string, soldMarketplace: string): Promise<Job> {
    return storage.createJob(userId, {
      type: "sync-inventory",
      data: { listingId, soldMarketplace },
    });
  }
}

export const queueService = new QueueService();

// Process jobs every 30 seconds
setInterval(() => {
  queueService.processPendingJobs().catch(console.error);
}, 30000);
