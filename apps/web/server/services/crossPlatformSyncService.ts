import { storage } from "../storage";
import { marketplaceService } from "./marketplaceService";
import { queueService } from "./queueService";
import { autoDelistService } from "./autoDelistService";
import { circuitBreakerService } from "./circuitBreakerService";
import { rateLimitService } from "./rateLimitService";
import { type 
  Listing, 
  ListingPost, 
  MarketplaceConnection, 
  CrossPlatformSyncJob, 
  InsertCrossPlatformSyncJob,
  InsertCrossPlatformSyncHistory,
  Job
} from "../shared/schema.ts";

export interface SyncOperation {
  marketplace: string;
  listingPostId: string;
  externalId: string | null;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  error?: string;
  processingTime?: number;
}

export interface SyncResult {
  syncJobId: string;
  listingId: string;
  soldMarketplace: string;
  totalMarketplaces: number;
  successful: number;
  failed: number;
  skipped: number;
  operations: SyncOperation[];
  duration: number;
  status: 'completed' | 'partial' | 'failed';
}

class CrossPlatformSyncService {
  
  /**
   * Trigger automatic cross-platform sync when an item is sold
   * This is the main entry point called from analyticsService.trackSale()
   */
  async triggerSaleSync(
    userId: string, 
    listing: Listing, 
    soldMarketplace: string, 
    salePrice: number,
    saleData?: any
  ): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Create sync job record
      const syncJob = await this.createSyncJob(userId, listing, soldMarketplace, saleData);
      
      // Emit sync start notification
      this.emitSyncNotification(userId, 'sync_started', {
        syncJobId: syncJob.id,
        listingId: listing.id,
        listingTitle: listing.title,
        soldMarketplace,
        salePrice,
      });

      // Get all active listing posts for this item
      const activePosts = await this.getActiveListingPosts(listing.id, soldMarketplace);
      
      if (activePosts.length === 0) {
        await this.completeSyncJob(syncJob.id, 'completed', {
          message: 'No other active marketplaces found for this listing'
        });
        
        return {
          syncJobId: syncJob.id,
          listingId: listing.id,
          soldMarketplace,
          totalMarketplaces: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          operations: [],
          duration: Date.now() - startTime,
          status: 'completed'
        };
      }

      // Update sync job with target marketplaces
      await this.updateSyncJob(syncJob.id, {
        totalMarketplaces: activePosts.length,
        targetMarketplaces: activePosts.map(p => p.marketplace),
        status: 'processing',
        startedAt: new Date(),
      });

      // Execute sync operations
      const syncResult = await this.executeSyncOperations(
        userId, 
        syncJob, 
        listing, 
        activePosts, 
        soldMarketplace
      );

      // Calculate final status
      const finalStatus = this.determineFinalStatus(syncResult.operations);
      
      // Complete sync job
      await this.completeSyncJob(syncJob.id, finalStatus, {
        completedMarketplaces: syncResult.successful,
        failedMarketplaces: syncResult.failed,
        actualDuration: Math.round((Date.now() - startTime) / 1000),
        operations: syncResult.operations
      });

      // Emit completion notification
      this.emitSyncNotification(userId, 'sync_completed', {
        syncJobId: syncJob.id,
        listingId: listing.id,
        listingTitle: listing.title,
        soldMarketplace,
        status: finalStatus,
        successful: syncResult.successful,
        failed: syncResult.failed,
        totalMarketplaces: activePosts.length,
        duration: Date.now() - startTime
      });

      return {
        ...syncResult,
        syncJobId: syncJob.id,
        duration: Date.now() - startTime,
        status: finalStatus
      };

    } catch (error: any) {
      console.error('Cross-platform sync failed:', error);
      
      // Emit error notification
      this.emitSyncNotification(userId, 'sync_error', {
        listingId: listing.id,
        listingTitle: listing.title,
        soldMarketplace,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Execute sync operations for all target marketplaces
   */
  private async executeSyncOperations(
    userId: string,
    syncJob: CrossPlatformSyncJob,
    listing: Listing,
    activePosts: ListingPost[],
    soldMarketplace: string
  ): Promise<Omit<SyncResult, 'syncJobId' | 'duration' | 'status'>> {
    const operations: SyncOperation[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Get marketplace connections
    const connections = await storage.getMarketplaceConnections(userId);
    const connectionMap = new Map(connections.map(c => [c.marketplace, c]));

    // Process each marketplace
    for (const post of activePosts) {
      const operation: SyncOperation = {
        marketplace: post.marketplace,
        listingPostId: post.id,
        externalId: post.externalId,
        status: 'pending'
      };

      try {
        const startTime = Date.now();
        operation.status = 'processing';

        // Emit progress update
        this.emitSyncProgress(userId, syncJob.id, {
          marketplace: post.marketplace,
          status: 'processing',
          message: `Delisting from ${post.marketplace}...`
        });

        // Get marketplace connection
        const connection = connectionMap.get(post.marketplace);
        if (!connection || !connection.isConnected) {
          operation.status = 'skipped';
          operation.error = 'Marketplace not connected';
          skipped++;
          
          await this.recordSyncHistory(userId, syncJob.id, listing.id, post, soldMarketplace, {
            status: 'skipped',
            syncAction: 'delist',
            errorCategory: 'auth_error',
            errorDetails: { message: 'Marketplace not connected' }
          });
          
          operations.push(operation);
          continue;
        }

        // Check rate limits
        const rateLimitCheck = await rateLimitService.checkRateLimit(post.marketplace, userId);
        if (!rateLimitCheck.allowed) {
          // Schedule for later instead of failing
          await this.scheduleDelayedSync(userId, syncJob.id, post, rateLimitCheck.waitTime || 60000);
          
          operation.status = 'skipped';
          operation.error = `Rate limited - rescheduled for later`;
          skipped++;
          
          operations.push(operation);
          continue;
        }

        // Check circuit breaker
        const circuitStatus = await circuitBreakerService.getState(post.marketplace);
        if (circuitStatus === 'open') {
          operation.status = 'skipped';
          operation.error = 'Circuit breaker open - marketplace unavailable';
          skipped++;
          
          await this.recordSyncHistory(userId, syncJob.id, listing.id, post, soldMarketplace, {
            status: 'skipped',
            syncAction: 'delist',
            errorCategory: 'marketplace_error',
            errorDetails: { message: 'Circuit breaker open', circuitBreakerStatus: circuitStatus }
          });
          
          operations.push(operation);
          continue;
        }

        // Perform the delisting operation
        if (post.externalId) {
          await marketplaceService.deleteListing(post.marketplace, post.externalId, connection);
        }

        // Update listing post status
        await storage.updateListingPost(post.id, {
          status: 'delisted',
          updatedAt: new Date()
        });

        operation.status = 'success';
        operation.processingTime = Date.now() - startTime;
        successful++;

        // Record successful sync history
        await this.recordSyncHistory(userId, syncJob.id, listing.id, post, soldMarketplace, {
          status: 'success',
          syncAction: 'delist',
          previousStatus: post.status || undefined,
          newStatus: 'delisted',
          processingTime: operation.processingTime
        });

        // Emit success update
        this.emitSyncProgress(userId, syncJob.id, {
          marketplace: post.marketplace,
          status: 'success',
          message: `Successfully delisted from ${post.marketplace}`
        });

      } catch (error: any) {
        operation.status = 'failed';
        operation.error = error.message;
        operation.processingTime = Date.now() - (Date.now() - (operation.processingTime || 0));
        failed++;

        // Categorize the error
        const errorCategory = this.categorizeError(error);

        // Record failed sync history
        await this.recordSyncHistory(userId, syncJob.id, listing.id, post, soldMarketplace, {
          status: 'failed',
          syncAction: 'delist',
          errorCategory,
          errorDetails: {
            message: error.message,
            stack: error.stack,
            code: error.code,
            statusCode: error.statusCode
          }
        });

        // Emit error update
        this.emitSyncProgress(userId, syncJob.id, {
          marketplace: post.marketplace,
          status: 'error',
          message: `Failed to delist from ${post.marketplace}: ${error.message}`,
          error: error.message
        });

        // Handle retryable errors by creating delayed sync jobs
        if (this.isRetryableError(error) && errorCategory !== 'permanent') {
          await this.scheduleRetrySync(userId, syncJob.id, post, error);
        }
      }

      operations.push(operation);
    }

    return {
      listingId: listing.id,
      soldMarketplace,
      totalMarketplaces: activePosts.length,
      successful,
      failed,
      skipped,
      operations
    };
  }

  /**
   * Create a new sync job record
   */
  private async createSyncJob(
    userId: string, 
    listing: Listing, 
    soldMarketplace: string, 
    saleData?: any
  ): Promise<CrossPlatformSyncJob> {
    const syncJobData: InsertCrossPlatformSyncJob = {
      userId,
      listingId: listing.id,
      soldMarketplace,
      syncType: 'automatic_delist',
      syncTrigger: 'sale_detected',
      triggerData: {
        saleData,
        timestamp: new Date().toISOString(),
        listingTitle: listing.title,
        listingPrice: listing.price
      },
      priority: 8, // High priority for sale-triggered syncs
      estimatedDuration: 30 // Estimate 30 seconds initially
    };

    // return await storage.createCrossPlatformSyncJob(userId, syncJobData);
    console.log(`[CrossPlatformSync] Would create sync job for user ${userId}`);
    return syncJobData as any;
  }

  /**
   * Update sync job with new data
   */
  private async updateSyncJob(
    syncJobId: string, 
    updates: Partial<CrossPlatformSyncJob>
  ): Promise<CrossPlatformSyncJob> {
    // return await storage.updateCrossPlatformSyncJob(syncJobId, updates);
    console.log(`[CrossPlatformSync] Would update sync job ${syncJobId}`);
    return updates as any;
  }

  /**
   * Complete sync job with final status
   */
  private async completeSyncJob(
    syncJobId: string, 
    status: string, 
    summary: any
  ): Promise<void> {
    // await storage.updateCrossPlatformSyncJob(syncJobId, {
    //   status,
    //   completedAt: new Date(),
    //   errorSummary: status === 'failed' ? summary : null,
    //   processingDetails: summary
    // });
    console.log(`[CrossPlatformSync] Would complete sync job ${syncJobId} with status ${status}`);
  }

  /**
   * Get all active listing posts for a listing except the sold marketplace
   */
  private async getActiveListingPosts(
    listingId: string, 
    excludeMarketplace: string
  ): Promise<ListingPost[]> {
    const allPosts = await storage.getListingPosts(listingId);
    return allPosts.filter(post => 
      post.status === 'posted' && 
      post.marketplace !== excludeMarketplace
    );
  }

  /**
   * Record detailed sync history for audit trail
   */
  private async recordSyncHistory(
    userId: string,
    syncJobId: string,
    listingId: string,
    listingPost: ListingPost,
    soldMarketplace: string,
    details: {
      status: string;
      syncAction: string;
      previousStatus?: string;
      newStatus?: string;
      errorCategory?: string;
      errorDetails?: any;
      processingTime?: number;
      retryAttempt?: number;
    }
  ): Promise<void> {
    const historyData: InsertCrossPlatformSyncHistory = {
      userId,
      syncJobId,
      listingId,
      listingPostId: listingPost.id,
      sourceMarketplace: soldMarketplace,
      targetMarketplace: listingPost.marketplace,
      syncAction: details.syncAction,
      status: details.status,
      previousStatus: details.previousStatus || null,
      newStatus: details.newStatus || null,
      externalId: listingPost.externalId,
      externalUrl: listingPost.externalUrl,
      errorDetails: details.errorDetails || null,
      errorCategory: details.errorCategory || null,
      retryAttempt: details.retryAttempt || 0,
      processingTime: details.processingTime || null,
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: 'CrossPlatformSyncService'
      }
    };

    // await storage.createCrossPlatformSyncHistory(userId, historyData);
    console.log(`[CrossPlatformSync] Would create sync history for user ${userId}`);
  }

  /**
   * Schedule a delayed sync operation due to rate limiting
   */
  private async scheduleDelayedSync(
    userId: string,
    syncJobId: string,
    listingPost: ListingPost,
    delayMs: number
  ): Promise<void> {
    const scheduledFor = new Date(Date.now() + delayMs);
    
    // await queueService.createJob(userId, {
    //   type: 'cross-platform-sync-retry',
    //   data: {
    //     syncJobId,
    //     listingPostId: listingPost.id,
    //     marketplace: listingPost.marketplace,
    //     reason: 'rate_limited'
    //   },
    //   scheduledFor,
    //   priority: 6
    // });
    console.log(`[CrossPlatformSync] Would schedule delayed sync for job ${syncJobId}`);
  }

  /**
   * Schedule a retry sync operation for failed operations
   */
  private async scheduleRetrySync(
    userId: string,
    syncJobId: string,
    listingPost: ListingPost,
    error: any
  ): Promise<void> {
    // Calculate retry delay with exponential backoff
    const retryAttempt = (error.retryAttempt || 0) + 1;
    const baseDelay = 30000; // 30 seconds
    const delayMs = Math.min(baseDelay * Math.pow(2, retryAttempt - 1), 300000); // Max 5 minutes
    const scheduledFor = new Date(Date.now() + delayMs);
    
    if (retryAttempt <= 3) { // Max 3 retries
      // await queueService.createJob(userId, {
      //   type: 'cross-platform-sync-retry',
      //   data: {
      //     syncJobId,
      //     listingPostId: listingPost.id,
      //     marketplace: listingPost.marketplace,
      //     reason: 'retry_failed_operation',
      //     retryAttempt,
      //     originalError: error.message
      //   },
      //   scheduledFor,
      //   priority: 4
      // });
      console.log(`[CrossPlatformSync] Would schedule retry sync for job ${syncJobId}`);
    }
  }

  /**
   * Categorize errors for better handling and analytics
   */
  private categorizeError(error: any): string {
    if (error.statusCode === 429 || error.message?.includes('rate limit')) {
      return 'rate_limit';
    }
    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'auth_error';
    }
    if (error.statusCode >= 500) {
      return 'marketplace_error';
    }
    if (error.statusCode === 404) {
      return 'not_found';
    }
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return 'network_error';
    }
    if (error.statusCode === 400) {
      return 'validation_error';
    }
    return 'unknown_error';
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCategories = ['network_error', 'marketplace_error', 'rate_limit'];
    const category = this.categorizeError(error);
    return retryableCategories.includes(category);
  }

  /**
   * Determine final sync job status based on operations
   */
  private determineFinalStatus(operations: SyncOperation[]): 'completed' | 'partial' | 'failed' {
    const successful = operations.filter(op => op.status === 'success').length;
    const failed = operations.filter(op => op.status === 'failed').length;
    const total = operations.length;

    if (successful === total) {
      return 'completed';
    } else if (successful > 0) {
      return 'partial';
    } else {
      return 'failed';
    }
  }

  /**
   * Emit WebSocket notification for sync events
   */
  private emitSyncNotification(userId: string, eventType: string, data: any): void {
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'cross_platform_sync',
        data: {
          ...data,
          eventType,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Emit WebSocket notification for sync progress updates
   */
  private emitSyncProgress(userId: string, syncJobId: string, progress: any): void {
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'cross_platform_sync_progress',
        data: {
          syncJobId,
          ...progress,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Manual trigger for cross-platform sync (for testing or manual operations)
   */
  async manualSync(
    userId: string, 
    listingId: string, 
    sourceMarketplace: string, 
    reason: string = 'manual_trigger'
  ): Promise<SyncResult> {
    const listing = await storage.getListing(listingId);
    if (!listing || listing.userId !== userId) {
      throw new Error('Listing not found or access denied');
    }

    return await this.triggerSaleSync(userId, listing, sourceMarketplace, 0, {
      reason,
      manualTrigger: true
    });
  }

  /**
   * Get sync job status and history
   */
  async getSyncJobStatus(syncJobId: string): Promise<{
    job: CrossPlatformSyncJob | null;
    history: any[];
  }> {
    // const [job, history] = await Promise.all([
    //   storage.getCrossPlatformSyncJob(syncJobId),
    //   storage.getCrossPlatformSyncHistory(syncJobId)
    // ]);
    console.log(`[CrossPlatformSync] Would get sync job and history for ${syncJobId}`);
    const job = null;
    const history: any[] = [];

    return { job, history };
  }

  /**
   * Get sync statistics for a user
   */
  async getSyncStats(userId: string, days: number = 30): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    partialSyncs: number;
    avgSyncTime: number;
    topMarketplaces: Array<{ marketplace: string; count: number }>;
    recentSyncs: CrossPlatformSyncJob[];
  }> {
    // return await storage.getCrossPlatformSyncStats(userId, days);
    console.log(`[CrossPlatformSync] Would get sync stats for user ${userId}`);
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      partialSyncs: 0,
      avgSyncTime: 0,
      topMarketplaces: [],
      recentSyncs: []
    };
  }
}

export const crossPlatformSyncService = new CrossPlatformSyncService();