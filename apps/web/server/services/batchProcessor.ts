import { 
  type Batch, type BatchItem, type Job, type User, type Listing,
  type BatchAnalytics, type InsertBatchAnalytics
} from "../shared/schema.ts";
import { storage } from "../storage";
import { batchService } from "./batchService";
import { optimizationEngine } from "./optimizationEngine";
import { smartScheduler } from "./smartScheduler";
import { rateLimitService } from "./rateLimitService";
import { queueService } from "./queueService";
import { patternAnalysisService } from "./patternAnalysisService";
import { recommendationService } from "./recommendationService";
import { randomUUID } from "crypto";

export interface ProcessingContext {
  userId: string;
  batch: Batch;
  user: User;
  optimizationInsights: any;
  rateLimitStatuses: Record<string, any>;
  marketplacePerformance: Record<string, any>;
}

export interface ProcessingStrategy {
  name: string;
  description: string;
  priority: number;
  processingOrder: 'sequential' | 'parallel' | 'adaptive';
  maxConcurrency: number;
  errorHandling: 'continue' | 'pause' | 'abort';
  retryStrategy: 'immediate' | 'delayed' | 'optimized';
  optimizationLevel: 'basic' | 'advanced' | 'maximum';
}

export interface ProcessingMetrics {
  batchId: string;
  startTime: Date;
  endTime?: Date;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  averageProcessingTime: number;
  throughputPerMinute: number;
  errorRate: number;
  optimizationScore: number;
  costEfficiency: number;
  marketplaceBreakdown: Record<string, {
    items: number;
    success: number;
    failed: number;
    avgTime: number;
  }>;
}

export interface OptimizationRecommendation {
  type: 'timing' | 'ordering' | 'concurrency' | 'marketplace' | 'content';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImprovement: number;
  confidence: number;
  applicableItems: string[];
  implementation: string;
  autoApplicable: boolean;
}

export class BatchProcessor {
  private processingQueue: Map<string, ProcessingContext> = new Map();
  private metrics: Map<string, ProcessingMetrics> = new Map();
  private activeProcessors: Set<string> = new Set();
  
  // Processing configuration
  private readonly MAX_CONCURRENT_BATCHES = 3;
  private readonly OPTIMIZATION_INTERVAL_MS = 30000; // 30 seconds
  private readonly METRICS_UPDATE_INTERVAL_MS = 5000; // 5 seconds

  constructor() {
    // Start background optimization monitor
    this.startOptimizationMonitor();
    this.startMetricsUpdater();
  }

  /**
   * Process a batch with advanced optimization
   */
  async processBatch(batchId: string): Promise<ProcessingMetrics> {
    console.log(`🎯 Starting advanced batch processing: ${batchId}`);

    // Get batch and validate
    const batch = await storage.getBatch(batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    if (this.activeProcessors.has(batchId)) {
      throw new Error(`Batch is already being processed: ${batchId}`);
    }

    // Check concurrency limits
    if (this.activeProcessors.size >= this.MAX_CONCURRENT_BATCHES) {
      throw new Error(`Maximum concurrent batches reached (${this.MAX_CONCURRENT_BATCHES})`);
    }

    this.activeProcessors.add(batchId);

    try {
      // Initialize processing context
      const context = await this.initializeProcessingContext(batch);
      this.processingQueue.set(batchId, context);

      // Initialize metrics
      const metrics: ProcessingMetrics = {
        batchId,
        startTime: new Date(),
        totalItems: batch.totalItems || 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        skippedItems: 0,
        averageProcessingTime: 0,
        throughputPerMinute: 0,
        errorRate: 0,
        optimizationScore: 0,
        costEfficiency: 0,
        marketplaceBreakdown: {}
      };
      this.metrics.set(batchId, metrics);

      // Emit processing start
      if (global.broadcastToUser) {
        global.broadcastToUser(batch.userId, {
          type: 'batch_processor',
          data: {
            stage: 'processing_started',
            batchId,
            strategy: 'advanced_optimization',
            totalItems: batch.totalItems,
            message: 'Advanced batch processing started'
          }
        });
      }

      // Update batch status
      await storage.updateBatch(batchId, {
        status: 'processing',
        startedAt: new Date(),
        batchMetadata: {
          ...(batch.batchMetadata || {}),
          processingEngine: 'advanced',
          processingStarted: new Date().toISOString()
        }
      });

      // Determine optimal processing strategy
      const strategy = await this.determineProcessingStrategy(context);
      
      // Emit strategy determined
      if (global.broadcastToUser) {
        global.broadcastToUser(batch.userId, {
          type: 'batch_processor',
          data: {
            stage: 'strategy_determined',
            batchId,
            strategy: strategy.name,
            processingOrder: strategy.processingOrder,
            maxConcurrency: strategy.maxConcurrency,
            optimizationLevel: strategy.optimizationLevel,
            message: `Using ${strategy.name} processing strategy`
          }
        });
      }

      // Get and optimize item processing order
      const optimizedOrder = await this.optimizeProcessingOrder(context, strategy);

      // Process items according to strategy
      await this.executeProcessingStrategy(context, strategy, optimizedOrder);

      // Finalize processing
      metrics.endTime = new Date();
      await this.finalizeProcessing(context, metrics);

      console.log(`✅ Batch processing completed: ${batchId}`);
      return metrics;

    } finally {
      this.activeProcessors.delete(batchId);
      this.processingQueue.delete(batchId);
    }
  }

  /**
   * Initialize processing context with optimization data
   */
  private async initializeProcessingContext(batch: Batch): Promise<ProcessingContext> {
    console.log(`🔍 Initializing processing context for batch: ${batch.id}`);

    // Get user
    const user = await storage.getUser(batch.userId);
    if (!user) {
      throw new Error(`User not found: ${batch.userId}`);
    }

    // Emit context initialization
    if (global.broadcastToUser) {
      global.broadcastToUser(batch.userId, {
        type: 'batch_processor',
        data: {
          stage: 'context_initialization',
          batchId: batch.id,
          message: 'Gathering optimization data...'
        }
      });
    }

    // Get optimization insights
    const optimizationInsights = await optimizationEngine.getOptimizationInsights(batch.userId);

    // Get rate limit statuses for all target marketplaces
    const rateLimitStatuses: Record<string, any> = {};
    for (const marketplace of batch.targetMarketplaces || []) {
      const status = await rateLimitService.checkRateLimit(marketplace, batch.userId);
      rateLimitStatuses[marketplace] = status;
    }

    // Get marketplace performance data
    const marketplacePerformance: Record<string, any> = {};
    for (const marketplace of batch.targetMarketplaces || []) {
      const performance = await this.getMarketplacePerformance(batch.userId, marketplace);
      marketplacePerformance[marketplace] = performance;
    }

    // Emit context ready
    if (global.broadcastToUser) {
      global.broadcastToUser(batch.userId, {
        type: 'batch_processor',
        data: {
          stage: 'context_ready',
          batchId: batch.id,
          optimizationInsights: optimizationInsights.length,
          rateLimitStatuses: Object.keys(rateLimitStatuses).map(marketplace => ({
            marketplace,
            status: rateLimitStatuses[marketplace].allowed ? 'healthy' : 'limited'
          })),
          message: 'Context initialization complete'
        }
      });
    }

    return {
      userId: batch.userId,
      batch,
      user,
      optimizationInsights,
      rateLimitStatuses,
      marketplacePerformance
    };
  }

  /**
   * Determine optimal processing strategy based on context
   */
  private async determineProcessingStrategy(context: ProcessingContext): Promise<ProcessingStrategy> {
    const { batch, optimizationInsights, rateLimitStatuses, marketplacePerformance } = context;

    console.log(`📊 Determining processing strategy for batch: ${batch.id}`);

    // Analyze batch characteristics
    const totalItems = batch.totalItems;
    const marketplaceCount = batch.targetMarketplaces?.length || 0;
    const hasRateLimitIssues = Object.values(rateLimitStatuses).some((status: any) => !status.allowed);
    const avgMarketplacePerformance = Object.values(marketplacePerformance).reduce((sum: number, perf: any) => sum + (perf.successRate || 0), 0) / marketplaceCount;

    // Determine strategy based on analysis
    if ((totalItems || 0) <= 50 && !hasRateLimitIssues && avgMarketplacePerformance > 80) {
      // Small batch, healthy conditions - use maximum optimization
      return {
        name: 'maximum_optimization',
        description: 'Maximum optimization for small batches with healthy conditions',
        priority: 100,
        processingOrder: 'parallel',
        maxConcurrency: Math.min(10, totalItems || 1),
        errorHandling: 'continue',
        retryStrategy: 'immediate',
        optimizationLevel: 'maximum'
      };
    }

    if (hasRateLimitIssues || avgMarketplacePerformance < 60) {
      // Rate limit issues or poor performance - use conservative approach
      return {
        name: 'conservative_processing',
        description: 'Conservative processing for rate-limited or underperforming conditions',
        priority: 50,
        processingOrder: 'sequential',
        maxConcurrency: 2,
        errorHandling: 'pause',
        retryStrategy: 'optimized',
        optimizationLevel: 'advanced'
      };
    }

    if ((totalItems || 0) > 500) {
      // Large batch - use load balancing
      return {
        name: 'load_balanced_processing',
        description: 'Load balanced processing for large batches',
        priority: 75,
        processingOrder: 'adaptive',
        maxConcurrency: 5,
        errorHandling: 'continue',
        retryStrategy: 'delayed',
        optimizationLevel: 'advanced'
      };
    }

    // Default balanced strategy
    return {
      name: 'balanced_processing',
      description: 'Balanced processing for standard conditions',
      priority: 70,
      processingOrder: 'parallel',
      maxConcurrency: 5,
      errorHandling: 'continue',
      retryStrategy: 'optimized',
      optimizationLevel: 'advanced'
    };
  }

  /**
   * Optimize the processing order of batch items
   */
  private async optimizeProcessingOrder(context: ProcessingContext, strategy: ProcessingStrategy): Promise<BatchItem[]> {
    const { batch, optimizationInsights } = context;
    
    console.log(`🎯 Optimizing processing order for batch: ${batch.id}`);

    // Get batch items
    const items = await storage.getBatchItems(batch.id);

    // Emit optimization start
    if (global.broadcastToUser) {
      global.broadcastToUser(batch.userId, {
        type: 'batch_processor',
        data: {
          stage: 'order_optimization',
          batchId: batch.id,
          totalItems: items.length,
          optimizationLevel: strategy.optimizationLevel,
          message: 'Optimizing item processing order...'
        }
      });
    }

    if (strategy.optimizationLevel === 'basic') {
      // Simple ordering by index
      return items.sort((a, b) => a.itemIndex - b.itemIndex);
    }

    if (strategy.optimizationLevel === 'advanced') {
      // Order by success probability and marketplace health
      return items.sort((a, b) => {
        const aScore = this.calculateItemSuccessScore(a, context);
        const bScore = this.calculateItemSuccessScore(b, context);
        return bScore - aScore; // Higher score first
      });
    }

    if (strategy.optimizationLevel === 'maximum') {
      // Advanced ordering with machine learning insights
      const optimizedOrder = await this.applyMachineLearningOptimization(items, context);
      
      // Emit optimization complete
      if (global.broadcastToUser) {
        global.broadcastToUser(batch.userId, {
          type: 'batch_processor',
          data: {
            stage: 'order_optimized',
            batchId: batch.id,
            optimizationStrategy: 'machine_learning',
            message: 'Processing order optimized using ML insights'
          }
        });
      }

      return optimizedOrder;
    }

    return items;
  }

  /**
   * Calculate success score for an item
   */
  private calculateItemSuccessScore(item: BatchItem, context: ProcessingContext): number {
    let score = 0;

    // Base score from marketplace health
    const marketplaces = item.marketplaces || context.batch.targetMarketplaces || [];
    for (const marketplace of marketplaces) {
      const rateLimitStatus = context.rateLimitStatuses[marketplace];
      const performance = context.marketplacePerformance[marketplace];
      
      if (rateLimitStatus?.allowed) score += 30;
      if (performance?.successRate > 80) score += 20;
      if (performance?.avgProcessingTime < 60000) score += 10; // Less than 1 minute
    }

    // Bonus for scheduled items at optimal times
    if (item.scheduledFor) {
      const now = new Date();
      const timeDiff = Math.abs(item.scheduledFor.getTime() - now.getTime());
      if (timeDiff < 300000) { // Within 5 minutes
        score += 25;
      }
    }

    // Penalty for items with previous failures
    if ((item.retryCount || 0) > 0) {
      score -= (item.retryCount || 0) * 10;
    }

    return score;
  }

  /**
   * Apply machine learning optimization to item order
   */
  private async applyMachineLearningOptimization(items: BatchItem[], context: ProcessingContext): Promise<BatchItem[]> {
    // Get pattern analysis for similar batches
    const patterns = await patternAnalysisService.analyzeBatchPatterns(context.userId, context.batch.type);
    
    // Get recommendations for optimal ordering
    const recommendations = await recommendationService.getBatchOrderingRecommendations(
      context.userId, 
      items
    );

    // Apply patterns and recommendations to optimize order
    const optimizedItems = [...items];

    // Sort by success probability based on patterns
    optimizedItems.sort((a, b) => {
      const aPattern = this.findMatchingPattern(a, (patterns as any) || []);
      const bPattern = this.findMatchingPattern(b, (patterns as any) || []);
      
      const aSuccessRate = aPattern?.successRate || 0;
      const bSuccessRate = bPattern?.successRate || 0;
      
      return bSuccessRate - aSuccessRate;
    });

    // Apply recommendation adjustments
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      for (const rec of recommendations) {
        if (rec.confidence > 80 && rec.autoApplicable) {
          this.applyOrderingRecommendation(optimizedItems, rec);
        }
      }
    }

    return optimizedItems;
  }

  /**
   * Find matching pattern for an item
   */
  private findMatchingPattern(item: BatchItem, patterns: any[]): any {
    // Simple pattern matching based on marketplaces and item characteristics
    return patterns.find(pattern => 
      pattern.marketplaces?.some((m: string) => item.marketplaces?.includes(m)) ||
      pattern.category === (item.itemData as any)?.category
    );
  }

  /**
   * Apply ordering recommendation to items
   */
  private applyOrderingRecommendation(items: BatchItem[], recommendation: any): void {
    // Implementation depends on recommendation type
    switch (recommendation.type) {
      case 'prioritize_marketplace':
        items.sort((a, b) => {
          const aHasMarketplace = a.marketplaces?.includes(recommendation.marketplace) ? 1 : 0;
          const bHasMarketplace = b.marketplaces?.includes(recommendation.marketplace) ? 1 : 0;
          return bHasMarketplace - aHasMarketplace;
        });
        break;
      case 'delay_problematic_items':
        // Move items with known issues to the end
        items.sort((a, b) => {
          const aProblematic = recommendation.problematicIds?.includes(a.id) ? 1 : 0;
          const bProblematic = recommendation.problematicIds?.includes(b.id) ? 1 : 0;
          return aProblematic - bProblematic;
        });
        break;
    }
  }

  /**
   * Execute the processing strategy
   */
  private async executeProcessingStrategy(
    context: ProcessingContext, 
    strategy: ProcessingStrategy, 
    optimizedOrder: BatchItem[]
  ): Promise<void> {
    console.log(`🚀 Executing ${strategy.name} for batch: ${context.batch.id}`);

    switch (strategy.processingOrder) {
      case 'sequential':
        await this.processSequentially(context, strategy, optimizedOrder);
        break;
      case 'parallel':
        await this.processInParallel(context, strategy, optimizedOrder);
        break;
      case 'adaptive':
        await this.processAdaptively(context, strategy, optimizedOrder);
        break;
    }
  }

  /**
   * Process items sequentially
   */
  private async processSequentially(
    context: ProcessingContext, 
    strategy: ProcessingStrategy, 
    items: BatchItem[]
  ): Promise<void> {
    console.log(`📝 Processing ${items.length} items sequentially`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Emit item processing start
        if (global.broadcastToUser) {
          global.broadcastToUser(context.userId, {
            type: 'batch_item_processing',
            data: {
              batchId: context.batch.id,
              itemId: item.id,
              itemIndex: i + 1,
              totalItems: items.length,
              status: 'processing',
              message: `Processing item ${i + 1} of ${items.length}`
            }
          });
        }

        await this.processItem(context, item, strategy);
        await this.updateMetrics(context.batch.id, 'success');

        // Apply dynamic delay based on rate limits
        if (i < items.length - 1) {
          const delay = await this.calculateOptimalDelay(context, item);
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

      } catch (error: any) {
        console.error(`Failed to process item ${item.id}:`, error);
        await this.handleProcessingError(context, item, error, strategy);
        await this.updateMetrics(context.batch.id, 'failure');
      }
    }
  }

  /**
   * Process items in parallel
   */
  private async processInParallel(
    context: ProcessingContext, 
    strategy: ProcessingStrategy, 
    items: BatchItem[]
  ): Promise<void> {
    console.log(`⚡ Processing ${items.length} items in parallel (concurrency: ${strategy.maxConcurrency})`);

    const semaphore = new Array(strategy.maxConcurrency).fill(null);
    const promises: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Wait for available slot
      const processingPromise = this.waitForSlot(semaphore).then(async (slotIndex) => {
        try {
          // Emit item processing start
          if (global.broadcastToUser) {
            global.broadcastToUser(context.userId, {
              type: 'batch_item_processing',
              data: {
                batchId: context.batch.id,
                itemId: item.id,
                itemIndex: i + 1,
                totalItems: items.length,
                status: 'processing',
                processingSlot: slotIndex
              }
            });
          }

          await this.processItem(context, item, strategy);
          await this.updateMetrics(context.batch.id, 'success');
        } catch (error: any) {
          console.error(`Failed to process item ${item.id}:`, error);
          await this.handleProcessingError(context, item, error, strategy);
          await this.updateMetrics(context.batch.id, 'failure');
        } finally {
          // Release slot
          semaphore[slotIndex] = null;
        }
      });

      promises.push(processingPromise);
    }

    await Promise.all(promises);
  }

  /**
   * Process items adaptively (adjust strategy based on performance)
   */
  private async processAdaptively(
    context: ProcessingContext, 
    strategy: ProcessingStrategy, 
    items: BatchItem[]
  ): Promise<void> {
    console.log(`🔄 Processing ${items.length} items adaptively`);

    let currentConcurrency = Math.min(2, strategy.maxConcurrency);
    let consecutiveFailures = 0;
    let processedCount = 0;

    while (processedCount < items.length) {
      const batchSize = Math.min(currentConcurrency, items.length - processedCount);
      const currentBatch = items.slice(processedCount, processedCount + batchSize);

      // Process current batch
      const results = await Promise.allSettled(
        currentBatch.map(item => this.processItem(context, item, strategy))
      );

      // Analyze results and adjust strategy
      const failures = results.filter(r => r.status === 'rejected').length;
      const successes = results.filter(r => r.status === 'fulfilled').length;

      if (failures > successes) {
        consecutiveFailures++;
        currentConcurrency = Math.max(1, currentConcurrency - 1);
        console.log(`⚠️  High failure rate, reducing concurrency to ${currentConcurrency}`);
      } else if (failures === 0 && consecutiveFailures === 0) {
        currentConcurrency = Math.min(strategy.maxConcurrency, currentConcurrency + 1);
        console.log(`✅ Good performance, increasing concurrency to ${currentConcurrency}`);
      } else {
        consecutiveFailures = 0;
      }

      // Update metrics
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled') {
          await this.updateMetrics(context.batch.id, 'success');
        } else {
          await this.updateMetrics(context.batch.id, 'failure');
          await this.handleProcessingError(
            context, 
            currentBatch[i], 
            (results[i] as PromiseRejectedResult).reason, 
            strategy
          );
        }
      }

      processedCount += batchSize;

      // Emit progress update
      if (global.broadcastToUser) {
        global.broadcastToUser(context.userId, {
          type: 'adaptive_processing_update',
          data: {
            batchId: context.batch.id,
            processedItems: processedCount,
            totalItems: items.length,
            currentConcurrency,
            successRate: (successes / (successes + failures)) * 100,
            consecutiveFailures
          }
        });
      }

      // Add adaptive delay if needed
      if (consecutiveFailures > 2) {
        const delay = Math.min(5000, consecutiveFailures * 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Wait for available processing slot
   */
  private async waitForSlot(semaphore: any[]): Promise<number> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        const availableSlot = semaphore.findIndex(slot => slot === null);
        if (availableSlot !== -1) {
          semaphore[availableSlot] = 'occupied';
          resolve(availableSlot);
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  /**
   * Process a single item with optimization
   */
  private async processItem(context: ProcessingContext, item: BatchItem, strategy: ProcessingStrategy): Promise<void> {
    const startTime = Date.now();

    // Update item status
    await storage.updateBatchItem(item.id, {
      status: 'processing',
      startedAt: new Date()
    });

    try {
      // Apply pre-processing optimizations
      await this.applyPreProcessingOptimizations(context, item);

      // Process based on batch type
      switch (context.batch.type) {
        case 'bulk_post':
          await this.processPostItem(context, item);
          break;
        case 'bulk_delist':
          await this.processDelistItem(context, item);
          break;
        case 'bulk_update':
          await this.processUpdateItem(context, item);
          break;
        case 'bulk_import':
          await this.processImportItem(context, item);
          break;
        default:
          throw new Error(`Unknown batch type: ${context.batch.type}`);
      }

      // Apply post-processing optimizations
      await this.applyPostProcessingOptimizations(context, item);

      // Update item as completed
      await storage.updateBatchItem(item.id, {
        status: 'completed',
        completedAt: new Date(),
        itemMetadata: {
          ...(item.itemMetadata || {}),
          processingTime: Date.now() - startTime,
          optimizationsApplied: true
        }
      });

    } catch (error: any) {
      await storage.updateBatchItem(item.id, {
        status: 'failed',
        errorMessage: error.message,
        errorCategory: this.categorizeError(error),
        completedAt: new Date(),
        itemMetadata: {
          ...(item.itemMetadata || {}),
          processingTime: Date.now() - startTime,
          failureReason: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Apply pre-processing optimizations
   */
  private async applyPreProcessingOptimizations(context: ProcessingContext, item: BatchItem): Promise<void> {
    // Apply rate limit optimization
    if (item.marketplaces) {
      for (const marketplace of item.marketplaces) {
        const rateLimitStatus = context.rateLimitStatuses[marketplace];
        if (!rateLimitStatus?.allowed && rateLimitStatus?.waitTime) {
          console.log(`⏱️  Applying rate limit delay for ${marketplace}: ${rateLimitStatus.waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, rateLimitStatus.waitTime));
        }
      }
    }

    // Apply content optimization if available
    if (context.optimizationInsights?.insights) {
      const relevantInsights = context.optimizationInsights.insights.filter((insight: any) => 
        insight.type === 'content' && insight.actionable
      );

      for (const insight of relevantInsights) {
        if (insight.autoApplicable) {
          await this.applyContentOptimization(item, insight);
        }
      }
    }
  }

  /**
   * Apply post-processing optimizations
   */
  private async applyPostProcessingOptimizations(context: ProcessingContext, item: BatchItem): Promise<void> {
    // Record success analytics for future optimization
    if (item.listingId) {
      const listing = await storage.getListing(item.listingId);
      if (listing && item.marketplaces) {
        for (const marketplace of item.marketplaces) {
          await storage.createPostingSuccessAnalytics(context.userId, {
            marketplace,
            listingId: item.listingId,
            postedAt: new Date(),
            dayOfWeek: new Date().getDay(),
            hourOfDay: new Date().getHours(),
            category: listing.category,
            brand: listing.brand,
            priceRange: this.getPriceRange(listing.price),
            success_score: "100", // Successful processing
            engagement_score: "0", // Will be updated later with actual engagement
            timezone: context.user.timezone || 'UTC'
          });
        }
      }
    }
  }

  /**
   * Process posting item
   */
  private async processPostItem(context: ProcessingContext, item: BatchItem): Promise<void> {
    if (!item.listingId) {
      throw new Error("No listing ID provided for post item");
    }

    // Create optimized job
    const job = await storage.createJob(context.userId, {
      type: 'post-listing',
      data: {
        listingId: item.listingId,
        marketplaces: item.marketplaces || context.batch.targetMarketplaces,
        batchId: context.batch.id,
        batchItemId: item.id,
        optimized: true
      },
      scheduledFor: item.scheduledFor || new Date(),
      priority: (context.batch.priority || 0) + 10, // Higher priority for batch items
      smartScheduled: true
    });

    // Update item with job reference
    await storage.updateBatchItem(item.id, {
      jobId: job.id
    });

    // Process through queue service
    await queueService.processJob(job);
  }

  /**
   * Process delisting item
   */
  private async processDelistItem(context: ProcessingContext, item: BatchItem): Promise<void> {
    if (!item.listingId) {
      throw new Error("No listing ID provided for delist item");
    }

    const job = await storage.createJob(context.userId, {
      type: 'delist-listing',
      data: {
        listingId: item.listingId,
        marketplaces: item.marketplaces || context.batch.targetMarketplaces,
        batchId: context.batch.id,
        batchItemId: item.id
      },
      scheduledFor: item.scheduledFor || new Date(),
      priority: (context.batch.priority || 0) + 10
    });

    await storage.updateBatchItem(item.id, {
      jobId: job.id
    });

    await queueService.processJob(job);
  }

  /**
   * Process update item
   */
  private async processUpdateItem(context: ProcessingContext, item: BatchItem): Promise<void> {
    if (!item.listingId || !item.itemData) {
      throw new Error("Missing listing ID or update data");
    }

    // Apply optimized updates
    await storage.updateListing(item.listingId, item.itemData);

    // Sync to marketplaces if specified
    if (item.marketplaces && item.marketplaces.length > 0) {
      const job = await storage.createJob(context.userId, {
        type: 'sync-listing',
        data: {
          listingId: item.listingId,
          marketplaces: item.marketplaces,
          updateData: item.itemData,
          batchId: context.batch.id,
          batchItemId: item.id
        },
        scheduledFor: item.scheduledFor || new Date(),
        priority: (context.batch.priority || 0) + 10
      });

      await storage.updateBatchItem(item.id, {
        jobId: job.id
      });

      await queueService.processJob(job);
    }
  }

  /**
   * Process import item
   */
  private async processImportItem(context: ProcessingContext, item: BatchItem): Promise<void> {
    if (!item.itemData) {
      throw new Error("No item data provided for import");
    }

    // Apply import optimizations
    const optimizedData = await this.optimizeImportData(context, item.itemData);

    // Create listing
    const listing = await storage.createListing(context.userId, optimizedData);

    // Update usage tracking
    await storage.incrementListingUsage(context.userId);

    // Update item with created listing
    await storage.updateBatchItem(item.id, {
      listingId: listing.id,
      processedData: {
        listingCreated: true,
        listingId: listing.id,
        optimizationsApplied: true
      }
    });

    // Auto-post if enabled
    if ((context.batch.batchSettings as any)?.autoPost && item.marketplaces) {
      const job = await storage.createJob(context.userId, {
        type: 'post-listing',
        data: {
          listingId: listing.id,
          marketplaces: item.marketplaces,
          batchId: context.batch.id,
          batchItemId: item.id,
          autoPost: true
        },
        scheduledFor: item.scheduledFor || new Date(),
        priority: (context.batch.priority || 0) + 10
      });

      await storage.updateBatchItem(item.id, {
        jobId: job.id
      });

      await queueService.processJob(job);
    }
  }

  /**
   * Handle processing errors with intelligent retry
   */
  private async handleProcessingError(
    context: ProcessingContext, 
    item: BatchItem, 
    error: any, 
    strategy: ProcessingStrategy
  ): Promise<void> {
    console.error(`❌ Processing error for item ${item.id}:`, error);

    const errorCategory = this.categorizeError(error);
    
    // Increment retry count
    const newRetryCount = (item.retryCount || 0) + 1;
    
    // Determine if retry should be attempted
    const shouldRetry = this.shouldRetryItem(item, error, strategy, newRetryCount);

    if (shouldRetry) {
      // Calculate optimized retry delay
      const retryDelay = await this.calculateRetryDelay(context, item, error, strategy);
      
      // Schedule retry
      await storage.updateBatchItem(item.id, {
        status: 'pending',
        retryCount: newRetryCount,
        errorMessage: error.message,
        errorCategory,
        scheduledFor: new Date(Date.now() + retryDelay),
        itemMetadata: {
          ...(item.itemMetadata || {}),
          retryScheduled: true,
          retryDelay,
          lastError: error.message
        }
      });

      console.log(`🔄 Retry scheduled for item ${item.id} in ${retryDelay}ms`);
    } else {
      // Mark as permanently failed
      await storage.updateBatchItem(item.id, {
        status: 'failed',
        retryCount: newRetryCount,
        errorMessage: error.message,
        errorCategory,
        completedAt: new Date()
      });

      console.log(`💀 Item ${item.id} marked as permanently failed`);
    }
  }

  /**
   * Categorize error for analytics
   */
  private categorizeError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return 'authentication';
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('marketplace') || message.includes('api')) {
      return 'marketplace_error';
    }
    
    return 'unknown';
  }

  /**
   * Determine if item should be retried
   */
  private shouldRetryItem(item: BatchItem, error: any, strategy: ProcessingStrategy, retryCount: number): boolean {
    // Check max retries
    if (retryCount >= (item.maxRetries || 3)) {
      return false;
    }

    // Check error category
    const category = this.categorizeError(error);
    if (category === 'validation' || category === 'authentication') {
      return false; // Don't retry permanent failures
    }

    // Check strategy error handling
    if (strategy.errorHandling === 'abort') {
      return false;
    }

    return true;
  }

  /**
   * Calculate optimized retry delay
   */
  private async calculateRetryDelay(
    context: ProcessingContext, 
    item: BatchItem, 
    error: any, 
    strategy: ProcessingStrategy
  ): Promise<number> {
    const category = this.categorizeError(error);
    const retryCount = (item.retryCount || 0) + 1;

    switch (strategy.retryStrategy) {
      case 'immediate':
        return 1000; // 1 second

      case 'delayed':
        return Math.min(60000, Math.pow(2, retryCount) * 1000); // Exponential backoff, max 1 minute

      case 'optimized':
        // Intelligent delay based on error type and marketplace status
        if (category === 'rate_limit') {
          return 300000; // 5 minutes for rate limits
        }
        if (category === 'network') {
          return 30000; // 30 seconds for network issues
        }
        return Math.min(30000, retryCount * 5000); // Progressive delay
    }
  }

  /**
   * Calculate optimal delay between items
   */
  private async calculateOptimalDelay(context: ProcessingContext, lastItem: BatchItem): Promise<number> {
    if (!lastItem.marketplaces) {
      return 1000; // Default 1 second
    }

    let maxDelay = 0;

    for (const marketplace of lastItem.marketplaces) {
      const delay = await rateLimitService.getOptimalDelay(marketplace, context.batch.priority || 0);
      maxDelay = Math.max(maxDelay, delay);
    }

    return Math.min(maxDelay, 10000); // Cap at 10 seconds
  }

  /**
   * Update processing metrics
   */
  private async updateMetrics(batchId: string, result: 'success' | 'failure'): Promise<void> {
    const metrics = this.metrics.get(batchId);
    if (!metrics) return;

    metrics.processedItems++;
    
    if (result === 'success') {
      metrics.successfulItems++;
    } else {
      metrics.failedItems++;
    }

    // Calculate derived metrics
    const processingTime = Date.now() - metrics.startTime.getTime();
    metrics.averageProcessingTime = processingTime / metrics.processedItems;
    metrics.throughputPerMinute = (metrics.processedItems / (processingTime / 60000));
    metrics.errorRate = (metrics.failedItems / metrics.processedItems) * 100;
    metrics.costEfficiency = metrics.successfulItems / metrics.processedItems;

    // Update batch progress
    const progress = Math.round((metrics.processedItems / metrics.totalItems) * 100);
    await storage.updateBatch(batchId, {
      processedItems: metrics.processedItems,
      successfulItems: metrics.successfulItems,
      failedItems: metrics.failedItems,
      progress
    });
  }

  /**
   * Finalize processing and create analytics
   */
  private async finalizeProcessing(context: ProcessingContext, metrics: ProcessingMetrics): Promise<void> {
    console.log(`📊 Finalizing processing for batch: ${context.batch.id}`);

    // Calculate final optimization score
    metrics.optimizationScore = this.calculateOptimizationScore(metrics);

    // Update final batch status
    const finalStatus = metrics.failedItems === 0 ? 'completed' : 
                       metrics.successfulItems > 0 ? 'partially_completed' : 'failed';

    await storage.updateBatch(context.batch.id, {
      status: finalStatus,
      completedAt: new Date(),
      progress: 100,
      batchMetadata: {
        ...(context.batch.batchMetadata || {}),
        processingCompleted: new Date().toISOString(),
        finalMetrics: {
          optimizationScore: metrics.optimizationScore,
          costEfficiency: metrics.costEfficiency,
          throughputPerMinute: metrics.throughputPerMinute
        }
      }
    });

    // Create comprehensive analytics
    await storage.createBatchAnalytics(context.userId, {
      batchId: context.batch.id,
      totalItems: metrics.totalItems,
      successfulItems: metrics.successfulItems,
      failedItems: metrics.failedItems,
      avgProcessingTime: Math.round(metrics.averageProcessingTime / 1000),
      // totalProcessingTime: Math.round((metrics.endTime!.getTime() - metrics.startTime.getTime()) / 1000), // Not in schema
      successRate: ((metrics.successfulItems / metrics.totalItems) * 100).toString(),
      // costEfficiency: metrics.costEfficiency.toString(), // Not in schema
      // optimizationScore: metrics.optimizationScore, // Not in schema
      // errorBreakdown: this.generateErrorBreakdown(context.batch.id), // Not in schema
      // timingAnalytics: { // Not in schema
      //   throughputPerMinute: metrics.throughputPerMinute,
      //   averageProcessingTime: metrics.averageProcessingTime,
      //   totalDuration: metrics.endTime!.getTime() - metrics.startTime.getTime()
      // },
      recommendationApplied: true
    } as any);

    // Emit completion notification
    if (global.broadcastToUser) {
      global.broadcastToUser(context.userId, {
        type: 'batch_processor_complete',
        data: {
          batchId: context.batch.id,
          status: finalStatus,
          metrics: {
            totalItems: metrics.totalItems,
            successfulItems: metrics.successfulItems,
            failedItems: metrics.failedItems,
            optimizationScore: metrics.optimizationScore,
            processingTime: metrics.endTime!.getTime() - metrics.startTime.getTime()
          },
          message: 'Advanced batch processing completed'
        }
      });
    }

    console.log(`✅ Batch processing finalized: ${context.batch.id} (${finalStatus})`);
  }

  /**
   * Calculate optimization score
   */
  private calculateOptimizationScore(metrics: ProcessingMetrics): number {
    let score = 0;

    // Success rate component (40%)
    const successRate = (metrics.successfulItems / metrics.totalItems) * 100;
    score += (successRate / 100) * 40;

    // Processing efficiency component (30%)
    const expectedTime = metrics.totalItems * 60000; // 1 minute per item baseline
    const actualTime = metrics.averageProcessingTime * metrics.totalItems;
    const efficiency = Math.min(1, expectedTime / actualTime);
    score += efficiency * 30;

    // Cost efficiency component (20%)
    score += metrics.costEfficiency * 20;

    // Throughput component (10%)
    const throughputScore = Math.min(1, metrics.throughputPerMinute / 10); // 10 items per minute as excellent
    score += throughputScore * 10;

    return Math.round(score);
  }

  /**
   * Generate error breakdown for analytics
   */
  private async generateErrorBreakdown(batchId: string): Promise<Record<string, number>> {
    const items = await storage.getBatchItems(batchId, { status: 'failed' });
    const breakdown: Record<string, number> = {};

    items.forEach(item => {
      const category = item.errorCategory || 'unknown';
      breakdown[category] = (breakdown[category] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Get marketplace performance data
   */
  private async getMarketplacePerformance(userId: string, marketplace: string): Promise<any> {
    try {
      const analytics = await storage.getPostingSuccessAnalytics(userId, { 
        marketplace
      });

      if (analytics.length === 0) {
        return { successRate: 70, avgProcessingTime: 60000 }; // Default values
      }

      const successCount = analytics.filter(a => parseFloat((a.success_score || 0).toString()) > 50).length;
      const successRate = (successCount / analytics.length) * 100;
      const avgProcessingTime = 60000; // Placeholder

      return { successRate, avgProcessingTime };
    } catch (error) {
      console.warn(`Failed to get performance data for ${marketplace}:`, error);
      return { successRate: 70, avgProcessingTime: 60000 };
    }
  }

  /**
   * Apply content optimization to item
   */
  private async applyContentOptimization(item: BatchItem, insight: any): Promise<void> {
    // Implementation depends on insight type and item data
    if (item.itemData && insight.type === 'content') {
      // Apply content optimizations based on insights
      // This is a placeholder for actual optimization logic
    }
  }

  /**
   * Optimize import data based on context
   */
  private async optimizeImportData(context: ProcessingContext, itemData: any): Promise<any> {
    const optimized = { ...itemData };

    // Apply optimization insights
    if (context.optimizationInsights?.insights) {
      const contentInsights = context.optimizationInsights.insights.filter((i: any) => i.type === 'content');
      
      for (const insight of contentInsights) {
        if (insight.autoApplicable && insight.confidence > 80) {
          // Apply content optimizations
          if (insight.category === 'title' && optimized.title) {
            // Optimize title based on insights
          }
          if (insight.category === 'description' && optimized.description) {
            // Optimize description based on insights
          }
        }
      }
    }

    return optimized;
  }

  /**
   * Get price range category
   */
  private getPriceRange(price: string): string {
    const numericPrice = parseFloat(price);
    if (numericPrice < 25) return 'low';
    if (numericPrice < 100) return 'medium';
    return 'high';
  }

  /**
   * Start background optimization monitor
   */
  private startOptimizationMonitor(): void {
    setInterval(() => {
      this.monitorAndOptimizeActiveProcessing();
    }, this.OPTIMIZATION_INTERVAL_MS);
  }

  /**
   * Start metrics updater
   */
  private startMetricsUpdater(): void {
    setInterval(() => {
      this.updateAllMetrics();
    }, this.METRICS_UPDATE_INTERVAL_MS);
  }

  /**
   * Monitor and optimize active processing
   */
  private async monitorAndOptimizeActiveProcessing(): Promise<void> {
    for (const [batchId, context] of Array.from(this.processingQueue.entries())) {
      try {
        // Check if optimization adjustments are needed
        const metrics = this.metrics.get(batchId);
        if (metrics && metrics.errorRate > 50) {
          console.log(`⚠️  High error rate detected for batch ${batchId}, considering intervention`);
          // Could implement adaptive strategy changes here
        }
      } catch (error) {
        console.error(`Error monitoring batch ${batchId}:`, error);
      }
    }
  }

  /**
   * Update all active metrics
   */
  private async updateAllMetrics(): Promise<void> {
    for (const [batchId, metrics] of Array.from(this.metrics.entries())) {
      try {
        // Emit real-time metrics update
        const context = this.processingQueue.get(batchId);
        if (context && global.broadcastToUser) {
          global.broadcastToUser(context.userId, {
            type: 'batch_metrics_update',
            data: {
              batchId,
              metrics: {
                processedItems: metrics.processedItems,
                successfulItems: metrics.successfulItems,
                failedItems: metrics.failedItems,
                errorRate: metrics.errorRate,
                throughputPerMinute: metrics.throughputPerMinute,
                optimizationScore: this.calculateOptimizationScore(metrics)
              }
            }
          });
        }
      } catch (error) {
        console.error(`Error updating metrics for batch ${batchId}:`, error);
      }
    }
  }

  /**
   * Get processing status for a batch
   */
  getProcessingStatus(batchId: string): {
    isProcessing: boolean;
    metrics?: ProcessingMetrics;
    context?: ProcessingContext;
  } {
    const isProcessing = this.activeProcessors.has(batchId);
    const metrics = this.metrics.get(batchId);
    const context = this.processingQueue.get(batchId);

    return { isProcessing, metrics, context };
  }

  /**
   * Stop processing a batch
   */
  async stopProcessing(batchId: string): Promise<void> {
    if (this.activeProcessors.has(batchId)) {
      this.activeProcessors.delete(batchId);
      this.processingQueue.delete(batchId);
      this.metrics.delete(batchId);

      await storage.updateBatch(batchId, {
        status: 'paused',
        pausedAt: new Date()
      });

      console.log(`⏹️  Stopped processing batch: ${batchId}`);
    }
  }
}

// Export singleton instance
export const batchProcessor = new BatchProcessor();