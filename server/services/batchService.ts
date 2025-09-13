import { 
  type Batch, type InsertBatch, 
  type BatchItem, type InsertBatchItem,
  type BulkUpload, type InsertBulkUpload,
  type BatchTemplate, type InsertBatchTemplate,
  type BatchQueue, type InsertBatchQueue,
  type Listing, type InsertListing,
  type Job, type User
} from "@shared/schema";
import { storage } from "../storage";
import { smartScheduler } from "./smartScheduler";
import { optimizationEngine } from "./optimizationEngine";
import { rateLimitService } from "./rateLimitService";
import { queueService } from "./queueService";
import { randomUUID } from "crypto";

export interface BatchCreationConfig {
  name: string;
  type: 'bulk_post' | 'bulk_delist' | 'bulk_update' | 'bulk_import';
  targetMarketplaces: string[];
  priority?: number;
  schedulingSettings?: {
    useSmartScheduling?: boolean;
    preferredTimeSlot?: Date;
    distributeOptimally?: boolean;
    respectRateLimits?: boolean;
    maxConcurrency?: number;
  };
  batchSettings?: {
    maxBatchSize?: number;
    delayBetweenItems?: number;
    retryFailedItems?: boolean;
    pauseOnErrors?: boolean;
    notifyOnCompletion?: boolean;
  };
}

export interface BulkImportConfig {
  fileType: 'csv' | 'excel' | 'json';
  fieldMappings: Record<string, string>;
  validationRules?: Record<string, any>;
  defaultValues?: Record<string, any>;
  skipInvalidRecords?: boolean;
  createMissingCategories?: boolean;
}

export interface BatchDistributionStrategy {
  strategy: 'optimal_timing' | 'load_balancing' | 'marketplace_grouping' | 'priority_based';
  maxItemsPerBatch: number;
  preferredTimeSlots: Date[];
  marketplaceGroups: string[][];
  rateLimitAware: boolean;
}

export interface BatchProcessingResult {
  batchId: string;
  status: 'completed' | 'partially_completed' | 'failed';
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  processingTime: number;
  errors: Array<{
    itemId: string;
    error: string;
    category: string;
  }>;
  analytics: {
    successRate: number;
    avgProcessingTime: number;
    costEfficiency: number;
    optimizationScore: number;
  };
}

export class BatchService {
  private readonly MAX_BATCH_SIZE = 1000;
  private readonly DEFAULT_CONCURRENCY = 5;
  private readonly BATCH_TIMEOUT_HOURS = 24;

  /**
   * Create a new batch operation with intelligent distribution
   */
  async createBatch(
    userId: string, 
    config: BatchCreationConfig, 
    items: Array<{ listingId?: string; itemData?: any }>
  ): Promise<Batch> {
    console.log(`🎯 Creating batch: ${config.name} with ${items.length} items`);

    // Emit batch creation start notification
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'batch_creation',
        data: {
          stage: 'started',
          batchName: config.name,
          totalItems: items.length,
          targetMarketplaces: config.targetMarketplaces,
          message: 'Creating batch...'
        }
      });
    }

    // Validate batch size
    if (items.length > this.MAX_BATCH_SIZE) {
      throw new Error(`Batch size ${items.length} exceeds maximum of ${this.MAX_BATCH_SIZE}`);
    }

    // Get user and validate permissions
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user can create this many listings
    for (const item of items) {
      if (config.type === 'bulk_post' || config.type === 'bulk_import') {
        const canCreate = await storage.canCreateListing(userId);
        if (!canCreate) {
          throw new Error("Insufficient listing credits for batch operation");
        }
      }
    }

    // Create the batch record
    const batch = await storage.createBatch(userId, {
      name: config.name,
      type: config.type,
      status: 'pending',
      totalItems: items.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      progress: 0,
      targetMarketplaces: config.targetMarketplaces,
      batchSettings: config.batchSettings || {},
      schedulingSettings: config.schedulingSettings || {},
      priority: config.priority || 0,
      batchMetadata: {
        createdBy: userId,
        version: '1.0',
        features: ['smart_scheduling', 'rate_limiting', 'optimization']
      }
    });

    // Emit batch created
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'batch_creation',
        data: {
          stage: 'batch_created',
          batchId: batch.id,
          batchName: config.name,
          message: 'Batch created, processing items...'
        }
      });
    }

    // Create batch items
    const batchItems: InsertBatchItem[] = items.map((item, index) => ({
      batchId: batch.id,
      listingId: item.listingId || null,
      itemIndex: index,
      status: 'pending',
      itemData: item.itemData || null,
      marketplaces: config.targetMarketplaces,
      retryCount: 0,
      maxRetries: 3,
      itemMetadata: {
        originalIndex: index,
        processedAt: new Date().toISOString()
      }
    }));

    await storage.createBatchItems(batchItems);

    // Emit items created
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'batch_creation',
        data: {
          stage: 'items_created',
          batchId: batch.id,
          itemsCreated: batchItems.length,
          message: 'Batch items created, analyzing optimal distribution...'
        }
      });
    }

    // Apply intelligent batch distribution if enabled
    if (config.schedulingSettings?.useSmartScheduling) {
      await this.applyIntelligentDistribution(user, batch, config);
    } else {
      // Add to batch queue for immediate processing
      await storage.createBatchQueueEntry({
        batchId: batch.id,
        priority: config.priority || 0,
        estimatedProcessingTime: items.length * 60, // Rough estimate: 1 minute per item
        maxConcurrency: config.schedulingSettings?.maxConcurrency || this.DEFAULT_CONCURRENCY,
        preferredTimeSlot: config.schedulingSettings?.preferredTimeSlot || new Date(),
        queueMetadata: {
          distributionStrategy: 'immediate',
          createdAt: new Date().toISOString()
        }
      });
    }

    // Emit batch ready for processing
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'batch_creation',
        data: {
          stage: 'ready_for_processing',
          batchId: batch.id,
          batchName: config.name,
          status: batch.status,
          message: 'Batch ready for processing'
        }
      });
    }

    console.log(`✅ Batch created successfully: ${batch.id}`);
    return batch;
  }

  /**
   * Apply intelligent distribution strategy to batch
   */
  private async applyIntelligentDistribution(
    user: User, 
    batch: Batch, 
    config: BatchCreationConfig
  ): Promise<void> {
    console.log(`🧠 Applying intelligent distribution for batch ${batch.id}`);

    // Emit optimization start
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'batch_optimization',
        data: {
          stage: 'analysis_started',
          batchId: batch.id,
          message: 'Analyzing optimal distribution strategy...'
        }
      });
    }

    // Get optimization insights
    const optimizationInsights = await optimizationEngine.getOptimizationInsights(user.id);
    
    // Get rate limit statuses
    const rateLimitStatuses = await Promise.all(
      batch.targetMarketplaces!.map(async (marketplace) => {
        const status = await rateLimitService.checkRateLimit(marketplace, user.id);
        return { marketplace, status };
      })
    );

    // Emit rate limit analysis
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'batch_optimization',
        data: {
          stage: 'rate_limits_analyzed',
          batchId: batch.id,
          rateLimits: rateLimitStatuses.map(({ marketplace, status }) => ({
            marketplace,
            allowed: status.allowed,
            waitTime: status.waitTime
          })),
          message: 'Rate limits analyzed'
        }
      });
    }

    // Determine optimal distribution strategy
    const strategy = await this.determineDistributionStrategy(
      user, 
      batch, 
      optimizationInsights, 
      rateLimitStatuses.map(r => r.status)
    );

    // Emit strategy determined
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'batch_optimization',
        data: {
          stage: 'strategy_determined',
          batchId: batch.id,
          strategy: strategy.strategy,
          marketplaceGroups: strategy.marketplaceGroups.length,
          maxItemsPerBatch: strategy.maxItemsPerBatch,
          message: `Using ${strategy.strategy} distribution strategy`
        }
      });
    }

    // Apply the distribution strategy
    await this.applyDistributionStrategy(batch, strategy, config);

    // Update batch with scheduling metadata
    await storage.updateBatch(batch.id, {
      batchMetadata: {
        ...batch.batchMetadata,
        distributionStrategy: strategy.strategy,
        optimizationApplied: true,
        rateLimitRespected: strategy.rateLimitAware,
        scheduledAt: new Date().toISOString()
      }
    });

    // Emit optimization complete
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'batch_optimization',
        data: {
          stage: 'optimization_complete',
          batchId: batch.id,
          message: 'Intelligent distribution applied successfully'
        }
      });
    }

    console.log(`✅ Intelligent distribution applied for batch ${batch.id}`);
  }

  /**
   * Determine the best distribution strategy for the batch
   */
  private async determineDistributionStrategy(
    user: User,
    batch: Batch,
    optimizationInsights: any,
    rateLimitStatuses: any[]
  ): Promise<BatchDistributionStrategy> {
    // Analyze current system load and rate limits
    const hasRateLimitIssues = rateLimitStatuses.some(status => !status.allowed);
    const totalItems = batch.totalItems;
    const marketplaces = batch.targetMarketplaces!;

    // For small batches, use optimal timing
    if (totalItems <= 50) {
      return {
        strategy: 'optimal_timing',
        maxItemsPerBatch: totalItems,
        preferredTimeSlots: await this.getOptimalTimeSlots(user, marketplaces),
        marketplaceGroups: [marketplaces],
        rateLimitAware: true
      };
    }

    // For rate limit issues, use load balancing
    if (hasRateLimitIssues) {
      return {
        strategy: 'load_balancing',
        maxItemsPerBatch: 25,
        preferredTimeSlots: await this.getDistributedTimeSlots(user, marketplaces, totalItems),
        marketplaceGroups: this.createMarketplaceGroups(marketplaces, rateLimitStatuses),
        rateLimitAware: true
      };
    }

    // For large batches, use marketplace grouping
    if (totalItems > 200) {
      return {
        strategy: 'marketplace_grouping',
        maxItemsPerBatch: 100,
        preferredTimeSlots: await this.getOptimalTimeSlots(user, marketplaces),
        marketplaceGroups: this.groupMarketplacesByPlatform(marketplaces),
        rateLimitAware: true
      };
    }

    // Default to priority-based
    return {
      strategy: 'priority_based',
      maxItemsPerBatch: 75,
      preferredTimeSlots: await this.getOptimalTimeSlots(user, marketplaces),
      marketplaceGroups: [marketplaces],
      rateLimitAware: true
    };
  }

  /**
   * Apply the distribution strategy to the batch
   */
  private async applyDistributionStrategy(
    batch: Batch,
    strategy: BatchDistributionStrategy,
    config: BatchCreationConfig
  ): Promise<void> {
    console.log(`📊 Applying ${strategy.strategy} strategy to batch ${batch.id}`);

    // Get all batch items
    const batchItems = await storage.getBatchItems(batch.id);

    // Group items according to strategy
    const itemGroups = this.groupItemsByStrategy(batchItems, strategy);

    // Create queue entries for each group
    for (let groupIndex = 0; groupIndex < itemGroups.length; groupIndex++) {
      const group = itemGroups[groupIndex];
      const timeSlot = strategy.preferredTimeSlots[groupIndex % strategy.preferredTimeSlots.length] || new Date();
      const marketplaceGroup = strategy.marketplaceGroups[groupIndex % strategy.marketplaceGroups.length] || batch.targetMarketplaces!;

      // Update batch items with scheduling info
      for (const item of group) {
        await storage.updateBatchItem(item.id, {
          scheduledFor: timeSlot,
          marketplaces: marketplaceGroup,
          itemMetadata: {
            ...item.itemMetadata,
            distributionGroup: groupIndex,
            schedulingStrategy: strategy.strategy,
            assignedTimeSlot: timeSlot.toISOString()
          }
        });
      }

      // Create queue entry for this group
      await storage.createBatchQueueEntry({
        batchId: batch.id,
        priority: (config.priority || 0) + groupIndex, // Slightly different priorities for ordering
        estimatedProcessingTime: group.length * 60,
        maxConcurrency: config.schedulingSettings?.maxConcurrency || this.DEFAULT_CONCURRENCY,
        preferredTimeSlot: timeSlot,
        queueMetadata: {
          distributionStrategy: strategy.strategy,
          groupIndex,
          marketplaceGroup,
          itemCount: group.length
        }
      });
    }

    console.log(`✅ Distribution strategy applied: ${itemGroups.length} groups created`);
  }

  /**
   * Group batch items according to the distribution strategy
   */
  private groupItemsByStrategy(items: BatchItem[], strategy: BatchDistributionStrategy): BatchItem[][] {
    const groups: BatchItem[][] = [];
    const maxItemsPerGroup = strategy.maxItemsPerBatch;

    switch (strategy.strategy) {
      case 'optimal_timing':
        // Single group for optimal timing
        groups.push(items);
        break;

      case 'load_balancing':
        // Split evenly across time slots
        const groupCount = Math.ceil(items.length / maxItemsPerGroup);
        for (let i = 0; i < groupCount; i++) {
          const start = i * maxItemsPerGroup;
          const end = Math.min(start + maxItemsPerGroup, items.length);
          groups.push(items.slice(start, end));
        }
        break;

      case 'marketplace_grouping':
        // Group by marketplace compatibility
        const marketplaceGroups: Record<string, BatchItem[]> = {};
        items.forEach(item => {
          const key = item.marketplaces?.sort().join(',') || 'default';
          if (!marketplaceGroups[key]) {
            marketplaceGroups[key] = [];
          }
          marketplaceGroups[key].push(item);
        });
        
        Object.values(marketplaceGroups).forEach(group => {
          // Further split large groups
          while (group.length > 0) {
            groups.push(group.splice(0, maxItemsPerGroup));
          }
        });
        break;

      case 'priority_based':
        // Sort by item index and split
        const sortedItems = items.sort((a, b) => a.itemIndex - b.itemIndex);
        for (let i = 0; i < sortedItems.length; i += maxItemsPerGroup) {
          groups.push(sortedItems.slice(i, i + maxItemsPerGroup));
        }
        break;
    }

    return groups.filter(group => group.length > 0);
  }

  /**
   * Get optimal time slots for marketplaces
   */
  private async getOptimalTimeSlots(user: User, marketplaces: string[]): Promise<Date[]> {
    // Use smart scheduler to find optimal windows
    const now = new Date();
    const timeSlots: Date[] = [];

    for (const marketplace of marketplaces) {
      try {
        // Get optimal posting windows for this marketplace
        const scheduleResult = await smartScheduler.scheduleJobs({
          user,
          listing: { category: 'general' } as any, // Placeholder
          requestedMarketplaces: [marketplace],
          priority: 0
        });

        if (scheduleResult.scheduledJobs.length > 0) {
          timeSlots.push(scheduleResult.scheduledJobs[0].scheduledFor);
        } else {
          // Fallback to current time + slight delay
          timeSlots.push(new Date(now.getTime() + marketplaces.indexOf(marketplace) * 60000));
        }
      } catch (error) {
        console.warn(`Failed to get optimal time slot for ${marketplace}:`, error);
        timeSlots.push(new Date(now.getTime() + marketplaces.indexOf(marketplace) * 60000));
      }
    }

    return timeSlots;
  }

  /**
   * Get distributed time slots for load balancing
   */
  private async getDistributedTimeSlots(user: User, marketplaces: string[], totalItems: number): Promise<Date[]> {
    const now = new Date();
    const timeSlots: Date[] = [];
    const intervalMinutes = 15; // 15-minute intervals

    // Calculate how many time slots we need
    const slotsNeeded = Math.ceil(totalItems / 25); // 25 items per slot

    for (let i = 0; i < slotsNeeded; i++) {
      const slotTime = new Date(now.getTime() + (i * intervalMinutes * 60000));
      timeSlots.push(slotTime);
    }

    return timeSlots;
  }

  /**
   * Create marketplace groups based on rate limit status
   */
  private createMarketplaceGroups(marketplaces: string[], rateLimitStatuses: any[]): string[][] {
    const groups: string[][] = [];
    const healthyMarketplaces: string[] = [];
    const rateLimitedMarketplaces: string[] = [];

    marketplaces.forEach((marketplace, index) => {
      const status = rateLimitStatuses[index];
      if (status?.allowed) {
        healthyMarketplaces.push(marketplace);
      } else {
        rateLimitedMarketplaces.push(marketplace);
      }
    });

    // Create groups
    if (healthyMarketplaces.length > 0) {
      groups.push(healthyMarketplaces);
    }
    if (rateLimitedMarketplaces.length > 0) {
      groups.push(rateLimitedMarketplaces);
    }

    return groups.length > 0 ? groups : [marketplaces];
  }

  /**
   * Group marketplaces by platform type
   */
  private groupMarketplacesByPlatform(marketplaces: string[]): string[][] {
    const groups: Record<string, string[]> = {
      fashion: [],
      general: [],
      electronics: [],
      other: []
    };

    marketplaces.forEach(marketplace => {
      switch (marketplace.toLowerCase()) {
        case 'poshmark':
        case 'depop':
        case 'vinted':
          groups.fashion.push(marketplace);
          break;
        case 'ebay':
        case 'facebook':
          groups.general.push(marketplace);
          break;
        case 'mercari':
          groups.electronics.push(marketplace);
          break;
        default:
          groups.other.push(marketplace);
      }
    });

    return Object.values(groups).filter(group => group.length > 0);
  }

  /**
   * Process the next batch from the queue
   */
  async processNextBatch(): Promise<BatchProcessingResult | null> {
    const queueEntry = await storage.getNextBatchForProcessing();
    if (!queueEntry) {
      return null;
    }

    const batch = await storage.getBatch(queueEntry.batchId);
    if (!batch || batch.status !== 'pending') {
      await storage.deleteBatchQueueEntry(queueEntry.batchId);
      return null;
    }

    console.log(`🚀 Processing batch: ${batch.id} (${batch.name})`);

    // Update batch status to processing
    await storage.updateBatch(batch.id, {
      status: 'processing',
      startedAt: new Date()
    });

    // Emit batch processing start
    if (global.broadcastToUser) {
      global.broadcastToUser(batch.userId, {
        type: 'batch_processing',
        data: {
          stage: 'started',
          batchId: batch.id,
          batchName: batch.name,
          totalItems: batch.totalItems,
          message: 'Batch processing started'
        }
      });
    }

    const startTime = Date.now();
    const result: BatchProcessingResult = {
      batchId: batch.id,
      status: 'completed',
      totalItems: batch.totalItems,
      successfulItems: 0,
      failedItems: 0,
      skippedItems: 0,
      processingTime: 0,
      errors: [],
      analytics: {
        successRate: 0,
        avgProcessingTime: 0,
        costEfficiency: 0,
        optimizationScore: 0
      }
    };

    try {
      // Get batch items
      const batchItems = await storage.getBatchItems(batch.id);

      // Process items
      for (const item of batchItems) {
        try {
          await this.processBatchItem(batch, item);
          result.successfulItems++;
          
          // Update progress
          const progress = Math.round((result.successfulItems + result.failedItems + result.skippedItems) / result.totalItems * 100);
          await storage.updateBatch(batch.id, { 
            processedItems: result.successfulItems + result.failedItems + result.skippedItems,
            successfulItems: result.successfulItems,
            failedItems: result.failedItems,
            progress 
          });

          // Emit progress update
          if (global.broadcastToUser) {
            global.broadcastToUser(batch.userId, {
              type: 'batch_progress',
              data: {
                batchId: batch.id,
                progress,
                processedItems: result.successfulItems + result.failedItems + result.skippedItems,
                successfulItems: result.successfulItems,
                failedItems: result.failedItems,
                currentItem: item.itemIndex + 1
              }
            });
          }

        } catch (error: any) {
          result.failedItems++;
          result.errors.push({
            itemId: item.id,
            error: error.message,
            category: 'processing_error'
          });

          await storage.updateBatchItem(item.id, {
            status: 'failed',
            errorMessage: error.message,
            errorCategory: 'processing_error',
            completedAt: new Date()
          });
        }
      }

      // Calculate final analytics
      result.processingTime = Date.now() - startTime;
      result.analytics.successRate = (result.successfulItems / result.totalItems) * 100;
      result.analytics.avgProcessingTime = result.processingTime / result.totalItems;
      result.analytics.costEfficiency = result.successfulItems / (result.totalItems || 1);

      // Determine final status
      if (result.failedItems === 0) {
        result.status = 'completed';
      } else if (result.successfulItems > 0) {
        result.status = 'partially_completed';
      } else {
        result.status = 'failed';
      }

      // Update batch with final status
      await storage.updateBatch(batch.id, {
        status: result.status,
        completedAt: new Date(),
        progress: 100
      });

      // Create batch analytics
      await storage.createBatchAnalytics(batch.userId, {
        batchId: batch.id,
        totalItems: result.totalItems,
        successfulItems: result.successfulItems,
        failedItems: result.failedItems,
        avgProcessingTime: Math.round(result.analytics.avgProcessingTime / 1000), // Convert to seconds
        totalProcessingTime: Math.round(result.processingTime / 1000),
        successRate: result.analytics.successRate,
        costEfficiency: result.analytics.costEfficiency,
        optimizationScore: 85, // TODO: Calculate based on actual performance
        errorBreakdown: this.categorizeErrors(result.errors)
      });

      // Remove from queue
      await storage.deleteBatchQueueEntry(queueEntry.batchId);

      // Emit batch completion
      if (global.broadcastToUser) {
        global.broadcastToUser(batch.userId, {
          type: 'batch_completed',
          data: {
            batchId: batch.id,
            batchName: batch.name,
            status: result.status,
            successfulItems: result.successfulItems,
            failedItems: result.failedItems,
            totalItems: result.totalItems,
            processingTime: result.processingTime,
            successRate: result.analytics.successRate
          }
        });
      }

      console.log(`✅ Batch processed: ${batch.id} - ${result.status}`);
      return result;

    } catch (error: any) {
      console.error(`❌ Batch processing failed: ${batch.id}`, error);
      
      await storage.updateBatch(batch.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });

      result.status = 'failed';
      return result;
    }
  }

  /**
   * Process a single batch item
   */
  private async processBatchItem(batch: Batch, item: BatchItem): Promise<void> {
    await storage.updateBatchItem(item.id, {
      status: 'processing',
      startedAt: new Date()
    });

    try {
      switch (batch.type) {
        case 'bulk_post':
          await this.processPostItem(batch, item);
          break;
        case 'bulk_delist':
          await this.processDelistItem(batch, item);
          break;
        case 'bulk_update':
          await this.processUpdateItem(batch, item);
          break;
        case 'bulk_import':
          await this.processImportItem(batch, item);
          break;
        default:
          throw new Error(`Unknown batch type: ${batch.type}`);
      }

      await storage.updateBatchItem(item.id, {
        status: 'completed',
        completedAt: new Date()
      });

    } catch (error: any) {
      await storage.updateBatchItem(item.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
      throw error;
    }
  }

  /**
   * Process a posting item
   */
  private async processPostItem(batch: Batch, item: BatchItem): Promise<void> {
    if (!item.listingId) {
      throw new Error("No listing ID provided for post item");
    }

    // Create job for posting
    const job = await storage.createJob(batch.userId, {
      type: 'post-listing',
      data: {
        listingId: item.listingId,
        marketplaces: item.marketplaces || batch.targetMarketplaces,
        batchId: batch.id,
        batchItemId: item.id
      },
      scheduledFor: item.scheduledFor || new Date(),
      priority: batch.priority || 0
    });

    // Update batch item with job ID
    await storage.updateBatchItem(item.id, {
      jobId: job.id,
      processedData: {
        jobCreated: true,
        jobId: job.id,
        marketplaces: item.marketplaces || batch.targetMarketplaces
      }
    });

    // Process the job immediately through queue service
    await queueService.processJob(job.id);
  }

  /**
   * Process a delisting item
   */
  private async processDelistItem(batch: Batch, item: BatchItem): Promise<void> {
    if (!item.listingId) {
      throw new Error("No listing ID provided for delist item");
    }

    // Create job for delisting
    const job = await storage.createJob(batch.userId, {
      type: 'delist-listing',
      data: {
        listingId: item.listingId,
        marketplaces: item.marketplaces || batch.targetMarketplaces,
        batchId: batch.id,
        batchItemId: item.id
      },
      scheduledFor: item.scheduledFor || new Date(),
      priority: batch.priority || 0
    });

    // Update batch item with job ID
    await storage.updateBatchItem(item.id, {
      jobId: job.id,
      processedData: {
        jobCreated: true,
        jobId: job.id,
        marketplaces: item.marketplaces || batch.targetMarketplaces
      }
    });

    // Process the job immediately through queue service
    await queueService.processJob(job.id);
  }

  /**
   * Process an update item
   */
  private async processUpdateItem(batch: Batch, item: BatchItem): Promise<void> {
    if (!item.listingId || !item.itemData) {
      throw new Error("Missing listing ID or update data for update item");
    }

    // Update the listing
    await storage.updateListing(item.listingId, item.itemData);

    // If marketplaces are specified, sync to those marketplaces
    if (item.marketplaces && item.marketplaces.length > 0) {
      const job = await storage.createJob(batch.userId, {
        type: 'sync-listing',
        data: {
          listingId: item.listingId,
          marketplaces: item.marketplaces,
          batchId: batch.id,
          batchItemId: item.id,
          updateData: item.itemData
        },
        scheduledFor: item.scheduledFor || new Date(),
        priority: batch.priority || 0
      });

      await storage.updateBatchItem(item.id, {
        jobId: job.id,
        processedData: {
          listingUpdated: true,
          jobCreated: true,
          jobId: job.id,
          updatedFields: Object.keys(item.itemData)
        }
      });

      // Process the sync job
      await queueService.processJob(job.id);
    } else {
      await storage.updateBatchItem(item.id, {
        processedData: {
          listingUpdated: true,
          updatedFields: Object.keys(item.itemData)
        }
      });
    }
  }

  /**
   * Process an import item
   */
  private async processImportItem(batch: Batch, item: BatchItem): Promise<void> {
    if (!item.itemData) {
      throw new Error("No item data provided for import item");
    }

    // Create new listing from item data
    const listing = await storage.createListing(batch.userId, {
      title: item.itemData.title,
      description: item.itemData.description,
      price: item.itemData.price,
      condition: item.itemData.condition,
      category: item.itemData.category,
      brand: item.itemData.brand,
      size: item.itemData.size,
      color: item.itemData.color,
      material: item.itemData.material,
      quantity: item.itemData.quantity || 1,
      images: item.itemData.images || [],
      status: 'draft'
    });

    // Update usage tracking
    await storage.incrementListingUsage(batch.userId);

    // Update batch item with created listing
    await storage.updateBatchItem(item.id, {
      listingId: listing.id,
      processedData: {
        listingCreated: true,
        listingId: listing.id,
        importedFields: Object.keys(item.itemData)
      }
    });

    // If auto-post is enabled, create posting job
    if (batch.batchSettings?.autoPost && item.marketplaces && item.marketplaces.length > 0) {
      const job = await storage.createJob(batch.userId, {
        type: 'post-listing',
        data: {
          listingId: listing.id,
          marketplaces: item.marketplaces,
          batchId: batch.id,
          batchItemId: item.id
        },
        scheduledFor: item.scheduledFor || new Date(),
        priority: batch.priority || 0
      });

      await storage.updateBatchItem(item.id, {
        jobId: job.id,
        processedData: {
          ...item.processedData,
          jobCreated: true,
          jobId: job.id
        }
      });

      // Process the posting job
      await queueService.processJob(job.id);
    }
  }

  /**
   * Categorize errors for analytics
   */
  private categorizeErrors(errors: Array<{ itemId: string; error: string; category: string }>): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    errors.forEach(error => {
      const category = error.category || 'unknown';
      breakdown[category] = (breakdown[category] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Pause a batch
   */
  async pauseBatch(batchId: string): Promise<Batch> {
    const batch = await storage.updateBatch(batchId, {
      status: 'paused',
      pausedAt: new Date()
    });

    // Emit pause notification
    if (global.broadcastToUser) {
      global.broadcastToUser(batch.userId, {
        type: 'batch_paused',
        data: {
          batchId,
          message: 'Batch paused successfully'
        }
      });
    }

    return batch;
  }

  /**
   * Resume a batch
   */
  async resumeBatch(batchId: string): Promise<Batch> {
    const batch = await storage.updateBatch(batchId, {
      status: 'pending',
      resumedAt: new Date()
    });

    // Re-add to queue if not already there
    const queueEntry = await storage.getBatchQueueEntry(batchId);
    if (!queueEntry) {
      await storage.createBatchQueueEntry({
        batchId,
        priority: batch.priority || 0,
        estimatedProcessingTime: (batch.totalItems - batch.processedItems) * 60,
        maxConcurrency: 5,
        preferredTimeSlot: new Date(),
        queueMetadata: {
          resumed: true,
          resumedAt: new Date().toISOString()
        }
      });
    }

    // Emit resume notification
    if (global.broadcastToUser) {
      global.broadcastToUser(batch.userId, {
        type: 'batch_resumed',
        data: {
          batchId,
          message: 'Batch resumed successfully'
        }
      });
    }

    return batch;
  }

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<Batch> {
    const batch = await storage.updateBatch(batchId, {
      status: 'cancelled',
      cancelledAt: new Date()
    });

    // Update all pending items to cancelled
    await storage.updateBatchItemsStatus(batchId, 'cancelled', { currentStatus: 'pending' });

    // Remove from queue
    await storage.deleteBatchQueueEntry(batchId);

    // Emit cancellation notification
    if (global.broadcastToUser) {
      global.broadcastToUser(batch.userId, {
        type: 'batch_cancelled',
        data: {
          batchId,
          message: 'Batch cancelled successfully'
        }
      });
    }

    return batch;
  }

  /**
   * Get batch progress and analytics
   */
  async getBatchProgress(batchId: string): Promise<{
    batch: Batch;
    progress: any;
    analytics: any;
    recentActivity: any[];
  }> {
    const [batch, progress, analytics] = await Promise.all([
      storage.getBatch(batchId),
      storage.getBatchProgress(batchId),
      storage.getBatchAnalytics(batchId)
    ]);

    if (!batch) {
      throw new Error("Batch not found");
    }

    // Get recent batch items for activity
    const recentItems = await storage.getBatchItems(batchId, { status: 'processing' });

    return {
      batch,
      progress,
      analytics,
      recentActivity: recentItems.slice(0, 10) // Last 10 active items
    };
  }
}

// Export singleton instance
export const batchService = new BatchService();