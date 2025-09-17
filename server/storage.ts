import { 
  type User, type InsertUser, 
  type MarketplaceConnection, type InsertMarketplaceConnection, 
  type Listing, type InsertListing, 
  type ListingPost, type InsertListingPost, 
  type Job, type InsertJob, 
  type AuditLog,
  type SyncSettings, type InsertSyncSettings,
  type SyncRule, type InsertSyncRule,
  type SyncHistory, type InsertSyncHistory,
  type SyncConflict, type InsertSyncConflict,
  type AutoDelistRule, type InsertAutoDelistRule,
  type AutoDelistHistory, type InsertAutoDelistHistory,
  type OnboardingProgress, type InsertOnboardingProgress,
  type AnalyticsEvent, type InsertAnalyticsEvent,
  type SalesMetrics, type InsertSalesMetrics,
  type InventoryMetrics, type InsertInventoryMetrics,
  type MarketplaceMetrics, type InsertMarketplaceMetrics,
  type MarketplacePostingRules, type InsertMarketplacePostingRules,
  type PostingSuccessAnalytics, type InsertPostingSuccessAnalytics,
  type RateLimitTracker, type InsertRateLimitTracker,
  type QueueDistribution, type InsertQueueDistribution,
  type JobRetryHistory, type InsertJobRetryHistory,
  type CircuitBreakerStatus, type InsertCircuitBreakerStatus,
  type DeadLetterQueue, type InsertDeadLetterQueue,
  type RetryMetrics, type InsertRetryMetrics,
  type FailureCategory, type InsertFailureCategory,
  type MarketplaceRetryConfig, type InsertMarketplaceRetryConfig,
  type Batch, type InsertBatch,
  type BatchItem, type InsertBatchItem,
  type BulkUpload, type InsertBulkUpload,
  type BatchTemplate, type InsertBatchTemplate,
  type BatchAnalytics, type InsertBatchAnalytics,
  type BatchQueue, type InsertBatchQueue,
  type CrossPlatformSyncJob, type InsertCrossPlatformSyncJob,
  type CrossPlatformSyncHistory, type InsertCrossPlatformSyncHistory,
  type WebhookConfiguration, type InsertWebhookConfiguration,
  type WebhookEvent, type InsertWebhookEvent,
  type WebhookDelivery, type InsertWebhookDelivery,
  type PollingSchedule, type InsertPollingSchedule,
  type WebhookHealthMetrics, type InsertWebhookHealthMetrics,
  type AutomationRule, type InsertAutomationRule,
  type AutomationSchedule, type InsertAutomationSchedule,
  type AutomationLog, type InsertAutomationLog,
  type PoshmarkShareSettings, type InsertPoshmarkShareSettings,
  type OfferTemplate, type InsertOfferTemplate
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;

  // Marketplace Connection methods
  getMarketplaceConnections(userId: string): Promise<MarketplaceConnection[]>;
  getMarketplaceConnection(userId: string, marketplace: string): Promise<MarketplaceConnection | undefined>;
  createMarketplaceConnection(userId: string, connection: InsertMarketplaceConnection): Promise<MarketplaceConnection>;
  updateMarketplaceConnection(id: string, updates: Partial<MarketplaceConnection>): Promise<MarketplaceConnection>;
  deleteMarketplaceConnection(id: string): Promise<void>;

  // Listing methods
  getListings(userId: string, filters?: { status?: string; marketplace?: string }): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  createListing(userId: string, listing: InsertListing): Promise<Listing>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing>;
  deleteListing(id: string): Promise<void>;

  // Listing Post methods
  getListingPosts(listingId: string): Promise<ListingPost[]>;
  getListingPost(listingId: string, marketplace: string): Promise<ListingPost | undefined>;
  createListingPost(post: InsertListingPost): Promise<ListingPost>;
  updateListingPost(id: string, updates: Partial<ListingPost>): Promise<ListingPost>;

  // Job methods
  getJobs(userId?: string, filters?: { status?: string; type?: string }): Promise<Job[]>;
  getUserJobs(userId: string, filters?: { status?: string; type?: string }): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(userId: string, job: InsertJob): Promise<Job>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job>;

  // Audit Log methods
  createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  getAuditLogs(userId: string, limit?: number): Promise<AuditLog[]>;

  // Stats methods
  getUserStats(userId: string): Promise<{
    activeListings: number;
    totalSales: number;
    monthlyRevenue: number;
    conversionRate: number;
  }>;

  // Usage tracking methods
  canCreateListing(userId: string): Promise<boolean>;
  incrementListingUsage(userId: string): Promise<void>;
  resetMonthlyUsage(userId: string): Promise<void>;
  checkAndResetBillingCycle(userId: string): Promise<void>;

  // Sync Settings methods
  getSyncSettings(userId: string): Promise<SyncSettings | undefined>;
  createSyncSettings(userId: string, settings: InsertSyncSettings): Promise<SyncSettings>;
  updateSyncSettings(userId: string, updates: Partial<SyncSettings>): Promise<SyncSettings>;

  // Sync Rule methods
  getSyncRules(userId: string): Promise<SyncRule[]>;
  getSyncRule(id: string): Promise<SyncRule | undefined>;
  createSyncRule(userId: string, rule: InsertSyncRule): Promise<SyncRule>;
  updateSyncRule(id: string, updates: Partial<SyncRule>): Promise<SyncRule>;
  deleteSyncRule(id: string): Promise<void>;

  // Sync History methods
  getSyncHistory(userId: string, limit?: number): Promise<SyncHistory[]>;
  createSyncHistory(userId: string, history: InsertSyncHistory): Promise<SyncHistory>;

  // Sync Conflict methods
  getSyncConflicts(userId: string, resolved?: boolean): Promise<SyncConflict[]>;
  getSyncConflict(id: string): Promise<SyncConflict | undefined>;
  createSyncConflict(userId: string, conflict: InsertSyncConflict): Promise<SyncConflict>;
  resolveSyncConflict(id: string, resolution: string, resolvedValue: any): Promise<SyncConflict>;

  // Auto-Delist Rule methods
  getAutoDelistRules(userId: string): Promise<AutoDelistRule[]>;
  getAutoDelistRule(id: string): Promise<AutoDelistRule | undefined>;
  createAutoDelistRule(userId: string, rule: InsertAutoDelistRule): Promise<AutoDelistRule>;
  updateAutoDelistRule(id: string, updates: Partial<AutoDelistRule>): Promise<AutoDelistRule>;
  deleteAutoDelistRule(id: string): Promise<void>;

  // Auto-Delist History methods
  getAutoDelistHistory(userId: string, limit?: number): Promise<AutoDelistHistory[]>;
  createAutoDelistHistory(userId: string, history: InsertAutoDelistHistory): Promise<AutoDelistHistory>;

  // Onboarding methods
  getOnboardingProgress(userId: string): Promise<OnboardingProgress | undefined>;
  createOnboardingProgress(userId: string, progress: InsertOnboardingProgress): Promise<OnboardingProgress>;
  updateOnboardingProgress(userId: string, updates: Partial<OnboardingProgress>): Promise<OnboardingProgress>;
  completeOnboarding(userId: string): Promise<OnboardingProgress>;
  skipOnboarding(userId: string): Promise<OnboardingProgress>;
  resetOnboarding(userId: string): Promise<OnboardingProgress>;

  // Analytics Event methods
  createAnalyticsEvent(userId: string, event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsEvents(userId: string, filters?: { eventType?: string; marketplace?: string; startDate?: Date; endDate?: Date }): Promise<AnalyticsEvent[]>;
  
  // Sales Metrics methods
  createSalesMetrics(userId: string, metrics: InsertSalesMetrics): Promise<SalesMetrics>;
  getSalesMetrics(userId: string, filters?: { marketplace?: string; category?: string; startDate?: Date; endDate?: Date }): Promise<SalesMetrics[]>;
  
  // Inventory Metrics methods
  createInventoryMetrics(userId: string, metrics: InsertInventoryMetrics): Promise<InventoryMetrics>;
  getInventoryMetrics(userId: string, filters?: { status?: string; category?: string }): Promise<InventoryMetrics[]>;
  updateInventoryMetrics(id: string, updates: Partial<InventoryMetrics>): Promise<InventoryMetrics>;
  
  // Marketplace Metrics methods
  createMarketplaceMetrics(userId: string, metrics: InsertMarketplaceMetrics): Promise<MarketplaceMetrics>;
  getMarketplaceMetrics(userId: string, filters?: { marketplace?: string; period?: string }): Promise<MarketplaceMetrics[]>;
  updateMarketplaceMetrics(id: string, updates: Partial<MarketplaceMetrics>): Promise<MarketplaceMetrics>;

  // Smart Scheduling methods
  
  // Marketplace Posting Rules methods
  getMarketplacePostingRules(marketplace?: string): Promise<MarketplacePostingRules[]>;
  getMarketplacePostingRule(marketplace: string): Promise<MarketplacePostingRules | undefined>;
  createMarketplacePostingRules(rules: InsertMarketplacePostingRules): Promise<MarketplacePostingRules>;
  updateMarketplacePostingRules(marketplace: string, updates: Partial<MarketplacePostingRules>): Promise<MarketplacePostingRules>;
  
  // Posting Success Analytics methods
  createPostingSuccessAnalytics(userId: string, analytics: InsertPostingSuccessAnalytics): Promise<PostingSuccessAnalytics>;
  getPostingSuccessAnalytics(userId: string, filters?: { marketplace?: string; startDate?: Date; endDate?: Date; category?: string }): Promise<PostingSuccessAnalytics[]>;
  updatePostingSuccessAnalytics(id: string, updates: Partial<PostingSuccessAnalytics>): Promise<PostingSuccessAnalytics>;
  
  // Rate Limit Tracker methods
  getRateLimitTracker(marketplace: string, windowType?: string): Promise<RateLimitTracker | undefined>;
  createRateLimitTracker(tracker: InsertRateLimitTracker): Promise<RateLimitTracker>;
  updateRateLimitTracker(marketplace: string, updates: Partial<RateLimitTracker>): Promise<RateLimitTracker>;
  updateRateLimitTrackerById(id: string, updates: Partial<RateLimitTracker>): Promise<RateLimitTracker>;
  getCurrentRateLimits(marketplaces: string[]): Promise<Record<string, RateLimitTracker | null>>;
  getRateLimitUsageInWindow(marketplace: string, startTime: Date, endTime: Date): Promise<number>;
  getAllRateLimitTrackers(marketplace?: string): Promise<RateLimitTracker[]>;
  cleanupOldRateLimitTrackers(olderThan: Date): Promise<number>;
  
  // Queue Distribution methods
  getQueueDistribution(timeSlot: Date, marketplace?: string): Promise<QueueDistribution[]>;
  createQueueDistribution(distribution: InsertQueueDistribution): Promise<QueueDistribution>;
  updateQueueDistribution(id: string, updates: Partial<QueueDistribution>): Promise<QueueDistribution>;
  getAvailableTimeSlots(marketplace: string, startTime: Date, endTime: Date): Promise<QueueDistribution[]>;

  // Job Retry History methods
  createJobRetryHistory(history: InsertJobRetryHistory): Promise<JobRetryHistory>;
  getJobRetryHistory(jobId: string): Promise<JobRetryHistory[]>;

  // Circuit Breaker methods
  getCircuitBreakerStatus(marketplace: string): Promise<CircuitBreakerStatus | undefined>;
  updateCircuitBreaker(marketplace: string, updates: Partial<CircuitBreakerStatus>): Promise<CircuitBreakerStatus>;
  getAllCircuitBreakerStatuses(): Promise<CircuitBreakerStatus[]>;
  createCircuitBreakerStatus(status: InsertCircuitBreakerStatus): Promise<CircuitBreakerStatus>;

  // Dead Letter Queue methods
  getDeadLetterQueueEntries(userId?: string, filters?: { resolutionStatus?: string; requiresManualReview?: boolean }): Promise<DeadLetterQueue[]>;
  createDeadLetterQueue(entry: InsertDeadLetterQueue): Promise<DeadLetterQueue>;
  updateDeadLetterQueueEntry(id: string, updates: Partial<DeadLetterQueue>): Promise<DeadLetterQueue>;
  getDeadLetterQueueStats(userId?: string): Promise<{ total: number; pending: number; resolved: number; requiresReview: number }>;
  cleanupOldEntries(olderThan: Date): Promise<number>;

  // Retry Metrics methods
  createRetryMetrics(metrics: InsertRetryMetrics): Promise<RetryMetrics>;
  getRetryMetrics(filters?: { marketplace?: string; jobType?: string; timeWindow?: Date }): Promise<RetryMetrics[]>;

  // Failure Category methods
  getFailureCategories(): Promise<FailureCategory[]>;
  getFailureCategory(category: string): Promise<FailureCategory | undefined>;
  createFailureCategory(category: InsertFailureCategory): Promise<FailureCategory>;
  updateFailureCategory(id: string, updates: Partial<FailureCategory>): Promise<FailureCategory>;

  // Marketplace Retry Config methods
  getMarketplaceRetryConfig(marketplace: string): Promise<MarketplaceRetryConfig | undefined>;
  createMarketplaceRetryConfig(config: InsertMarketplaceRetryConfig): Promise<MarketplaceRetryConfig>;
  updateMarketplaceRetryConfig(marketplace: string, updates: Partial<MarketplaceRetryConfig>): Promise<MarketplaceRetryConfig>;

  // Optimization Engine methods
  getPostingSuccessAnalytics(userId: string, filters?: { 
    marketplace?: string; 
    marketplaces?: string[];
    categories?: string[];
    startDate?: Date; 
    endDate?: Date; 
    category?: string;
    listingId?: string;
    dayOfWeek?: number;
    hourOfDay?: number;
    priceRange?: string;
    minEngagement?: number;
    sold?: boolean;
    limit?: number;
  }): Promise<PostingSuccessAnalytics[]>;
  
  getPerformanceByTimeSlot(userId: string, marketplace?: string, category?: string): Promise<Array<{
    dayOfWeek: number;
    hourOfDay: number;
    avgSuccessScore: number;
    avgEngagement: number;
    conversionRate: number;
    sampleSize: number;
  }>>;
  
  getPerformanceByPriceRange(userId: string, marketplace?: string, category?: string): Promise<Array<{
    priceRange: string;
    avgSuccessScore: number;
    conversionRate: number;
    avgDaysToSell: number;
    sampleSize: number;
  }>>;
  
  getCategoryPerformance(userId: string, marketplace?: string): Promise<Array<{
    category: string;
    avgSuccessScore: number;
    conversionRate: number;
    avgEngagement: number;
    totalPosts: number;
    salesCount: number;
  }>>;
  
  getMarketplacePerformanceSummary(userId: string): Promise<Array<{
    marketplace: string;
    avgSuccessScore: number;
    conversionRate: number;
    avgEngagement: number;
    totalPosts: number;
    salesCount: number;
    lastPostDate: Date | null;
  }>>;
  
  getEngagementCorrelations(userId: string, marketplace?: string): Promise<Array<{
    variable1: string;
    variable2: string;
    correlation: number;
    sampleSize: number;
  }>>;
  
  getTimeSeriesData(userId: string, metric: string, groupBy: 'day' | 'week' | 'month', marketplace?: string, category?: string): Promise<Array<{
    date: string;
    value: number;
    count: number;
  }>>;
  
  getSeasonalPatterns(userId: string, marketplace?: string): Promise<Array<{
    month: number;
    dayOfWeek: number;
    avgPerformance: number;
    sampleSize: number;
  }>>;
  
  getListingsWithLowPerformance(userId: string, threshold?: number): Promise<Array<{
    listingId: string;
    title: string;
    category: string;
    avgSuccessScore: number;
    daysSinceListed: number;
    lastEngagement: Date | null;
    suggestedActions: string[];
  }>>;
  
  getOptimizationOpportunities(userId: string): Promise<Array<{
    type: 'timing' | 'pricing' | 'marketplace' | 'content';
    priority: 'high' | 'medium' | 'low';
    description: string;
    potentialImprovement: number;
    confidence: number;
    targetListings: number;
  }>>;
  
  getPerformanceTrends(userId: string, days: number, marketplace?: string): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    changePercent: number;
    confidence: number;
  }>;
  
  getJobsForOptimization(userId: string, filters?: {
    status?: string;
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    marketplace?: string;
    canReschedule?: boolean;
  }): Promise<Job[]>;

  // Batch methods
  getBatches(userId: string, filters?: { status?: string; type?: string }): Promise<Batch[]>;
  getBatch(id: string): Promise<Batch | undefined>;
  createBatch(userId: string, batch: InsertBatch): Promise<Batch>;
  updateBatch(id: string, updates: Partial<Batch>): Promise<Batch>;
  deleteBatch(id: string): Promise<void>;
  getBatchesByStatus(status: string, userId?: string): Promise<Batch[]>;
  getBatchProgress(id: string): Promise<{ 
    totalItems: number; 
    processedItems: number; 
    successfulItems: number; 
    failedItems: number; 
    progress: number 
  }>;

  // Batch Item methods
  getBatchItems(batchId: string, filters?: { status?: string }): Promise<BatchItem[]>;
  getBatchItem(id: string): Promise<BatchItem | undefined>;
  createBatchItem(batchItem: InsertBatchItem): Promise<BatchItem>;
  updateBatchItem(id: string, updates: Partial<BatchItem>): Promise<BatchItem>;
  deleteBatchItem(id: string): Promise<void>;
  createBatchItems(batchItems: InsertBatchItem[]): Promise<BatchItem[]>;
  updateBatchItemsStatus(batchId: string, status: string, filters?: { currentStatus?: string }): Promise<void>;

  // Bulk Upload methods
  getBulkUploads(userId: string, filters?: { status?: string; uploadType?: string }): Promise<BulkUpload[]>;
  getBulkUpload(id: string): Promise<BulkUpload | undefined>;
  createBulkUpload(userId: string, upload: InsertBulkUpload): Promise<BulkUpload>;
  updateBulkUpload(id: string, updates: Partial<BulkUpload>): Promise<BulkUpload>;
  deleteBulkUpload(id: string): Promise<void>;

  // Batch Template methods
  getBatchTemplates(userId: string, filters?: { type?: string; isPublic?: boolean }): Promise<BatchTemplate[]>;
  getBatchTemplate(id: string): Promise<BatchTemplate | undefined>;
  createBatchTemplate(userId: string, template: InsertBatchTemplate): Promise<BatchTemplate>;
  updateBatchTemplate(id: string, updates: Partial<BatchTemplate>): Promise<BatchTemplate>;
  deleteBatchTemplate(id: string): Promise<void>;
  getDefaultBatchTemplates(type: string): Promise<BatchTemplate[]>;
  incrementTemplateUsage(id: string): Promise<void>;

  // Batch Analytics methods
  getBatchAnalytics(batchId: string, marketplace?: string): Promise<BatchAnalytics[]>;
  createBatchAnalytics(userId: string, analytics: InsertBatchAnalytics): Promise<BatchAnalytics>;
  updateBatchAnalytics(id: string, updates: Partial<BatchAnalytics>): Promise<BatchAnalytics>;
  getBatchPerformanceStats(userId: string, filters?: { 
    dateStart?: Date; 
    dateEnd?: Date; 
    marketplace?: string; 
    type?: string 
  }): Promise<Array<{
    batchId: string;
    batchName: string;
    type: string;
    successRate: number;
    avgProcessingTime: number;
    totalItems: number;
    costEfficiency: number;
  }>>;

  // Batch Queue methods
  getBatchQueue(filters?: { priority?: number; status?: string }): Promise<BatchQueue[]>;
  getBatchQueueEntry(batchId: string): Promise<BatchQueue | undefined>;
  createBatchQueueEntry(entry: InsertBatchQueue): Promise<BatchQueue>;
  updateBatchQueueEntry(batchId: string, updates: Partial<BatchQueue>): Promise<BatchQueue>;
  deleteBatchQueueEntry(batchId: string): Promise<void>;
  getNextBatchForProcessing(): Promise<BatchQueue | undefined>;
  updateQueuePositions(): Promise<void>;

  // Cross-Platform Sync Job methods
  getCrossPlatformSyncJobs(userId: string, filters?: { status?: string; syncType?: string; soldMarketplace?: string }): Promise<CrossPlatformSyncJob[]>;
  getCrossPlatformSyncJob(id: string): Promise<CrossPlatformSyncJob | undefined>;
  createCrossPlatformSyncJob(userId: string, job: InsertCrossPlatformSyncJob): Promise<CrossPlatformSyncJob>;
  updateCrossPlatformSyncJob(id: string, updates: Partial<CrossPlatformSyncJob>): Promise<CrossPlatformSyncJob>;
  deleteCrossPlatformSyncJob(id: string): Promise<void>;

  // Cross-Platform Sync History methods
  getCrossPlatformSyncHistory(syncJobId?: string, userId?: string, filters?: { status?: string; targetMarketplace?: string; startDate?: Date; endDate?: Date }): Promise<CrossPlatformSyncHistory[]>;
  createCrossPlatformSyncHistory(userId: string, history: InsertCrossPlatformSyncHistory): Promise<CrossPlatformSyncHistory>;
  
  // Cross-Platform Sync Analytics methods
  getCrossPlatformSyncStats(userId: string, days?: number): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    partialSyncs: number;
    avgSyncTime: number;
    topMarketplaces: Array<{ marketplace: string; count: number }>;
    recentSyncs: CrossPlatformSyncJob[];
  }>;

  // Webhook Configuration methods
  getWebhookConfigurations(userId: string, marketplace?: string): Promise<WebhookConfiguration[]>;
  getWebhookConfiguration(userId: string, marketplace: string): Promise<WebhookConfiguration | undefined>;
  createWebhookConfiguration(userId: string, config: InsertWebhookConfiguration): Promise<WebhookConfiguration>;
  updateWebhookConfiguration(id: string, updates: Partial<WebhookConfiguration>): Promise<WebhookConfiguration>;
  deleteWebhookConfiguration(id: string): Promise<void>;

  // Webhook Event methods
  getWebhookEvents(userId?: string, filters?: { 
    marketplace?: string; 
    eventType?: string; 
    processingStatus?: string; 
    startDate?: Date; 
    endDate?: Date;
    listingId?: string;
    limit?: number;
  }): Promise<WebhookEvent[]>;
  getWebhookEvent(id: string): Promise<WebhookEvent | undefined>;
  getWebhookEventByExternalId(marketplace: string, eventId: string): Promise<WebhookEvent | undefined>;
  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  updateWebhookEvent(id: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent>;
  deleteWebhookEvent(id: string): Promise<void>;

  // Webhook Delivery methods
  getWebhookDeliveries(webhookConfigId?: string, filters?: { 
    marketplace?: string; 
    successful?: boolean; 
    startDate?: Date; 
    endDate?: Date;
    limit?: number;
  }): Promise<WebhookDelivery[]>;
  getWebhookDelivery(id: string): Promise<WebhookDelivery | undefined>;
  createWebhookDelivery(delivery: InsertWebhookDelivery): Promise<WebhookDelivery>;
  updateWebhookDelivery(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery>;

  // Polling Schedule methods
  getPollingSchedules(userId: string, marketplace?: string): Promise<PollingSchedule[]>;
  getPollingSchedule(userId: string, marketplace: string): Promise<PollingSchedule | undefined>;
  createPollingSchedule(userId: string, schedule: InsertPollingSchedule): Promise<PollingSchedule>;
  updatePollingSchedule(id: string, updates: Partial<PollingSchedule>): Promise<PollingSchedule>;
  deletePollingSchedule(id: string): Promise<void>;
  getPollingSchedulesDueForPoll(): Promise<PollingSchedule[]>;

  // Webhook Health Metrics methods
  getWebhookHealthMetrics(marketplace?: string, timeWindow?: Date): Promise<WebhookHealthMetrics[]>;
  createWebhookHealthMetrics(metrics: InsertWebhookHealthMetrics): Promise<WebhookHealthMetrics>;
  updateWebhookHealthMetrics(id: string, updates: Partial<WebhookHealthMetrics>): Promise<WebhookHealthMetrics>;
  getWebhookHealthSummary(marketplace?: string, hours?: number): Promise<{
    totalEvents: number;
    successRate: number;
    averageProcessingTime: number;
    healthScore: number;
    uptime: number;
  }>;

  // Automation Rule methods
  getAutomationRules(userId: string, marketplace?: string): Promise<AutomationRule[]>;
  getAutomationRule(id: string): Promise<AutomationRule | undefined>;
  createAutomationRule(userId: string, rule: InsertAutomationRule): Promise<AutomationRule>;
  updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule>;
  deleteAutomationRule(id: string): Promise<void>;

  // Automation Schedule methods
  getAutomationSchedules(ruleId?: string): Promise<AutomationSchedule[]>;
  getAutomationSchedule(id: string): Promise<AutomationSchedule | undefined>;
  getActiveAutomationSchedules(): Promise<AutomationSchedule[]>;
  createAutomationSchedule(schedule: InsertAutomationSchedule): Promise<AutomationSchedule>;
  updateAutomationSchedule(id: string, updates: Partial<AutomationSchedule>): Promise<AutomationSchedule>;
  deleteAutomationSchedule(id: string): Promise<void>;

  // Automation Log methods
  getAutomationLogs(userId: string, filters?: {
    ruleId?: string;
    marketplace?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AutomationLog[]>;
  getAutomationLog(id: string): Promise<AutomationLog | undefined>;
  createAutomationLog(log: InsertAutomationLog): Promise<AutomationLog>;
  getAutomationLogStats(userId: string, days?: number): Promise<{
    totalActions: number;
    successRate: number;
    mostActiveMarketplace: string;
    topActionTypes: Array<{ action: string; count: number }>;
  }>;

  // Poshmark Share Settings methods
  getPoshmarkShareSettings(userId: string): Promise<PoshmarkShareSettings | undefined>;
  createPoshmarkShareSettings(userId: string, settings: InsertPoshmarkShareSettings): Promise<PoshmarkShareSettings>;
  updatePoshmarkShareSettings(userId: string, updates: Partial<PoshmarkShareSettings>): Promise<PoshmarkShareSettings>;
  deletePoshmarkShareSettings(userId: string): Promise<void>;

  // Offer Template methods
  getOfferTemplates(userId: string, marketplace?: string): Promise<OfferTemplate[]>;
  getOfferTemplate(id: string): Promise<OfferTemplate | undefined>;
  getDefaultOfferTemplate(userId: string, marketplace: string, templateType: string): Promise<OfferTemplate | undefined>;
  createOfferTemplate(userId: string, template: InsertOfferTemplate): Promise<OfferTemplate>;
  updateOfferTemplate(id: string, updates: Partial<OfferTemplate>): Promise<OfferTemplate>;
  deleteOfferTemplate(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private marketplaceConnections: Map<string, MarketplaceConnection> = new Map();
  private listings: Map<string, Listing> = new Map();
  private listingPosts: Map<string, ListingPost> = new Map();
  private jobs: Map<string, Job> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private syncSettings: Map<string, SyncSettings> = new Map();
  private syncRules: Map<string, SyncRule> = new Map();
  private syncHistory: Map<string, SyncHistory> = new Map();
  private syncConflicts: Map<string, SyncConflict> = new Map();
  private autoDelistRules: Map<string, AutoDelistRule> = new Map();
  private autoDelistHistory: Map<string, AutoDelistHistory> = new Map();
  private onboardingProgress: Map<string, OnboardingProgress> = new Map();
  private analyticsEvents: Map<string, AnalyticsEvent> = new Map();
  private salesMetrics: Map<string, SalesMetrics> = new Map();
  private inventoryMetrics: Map<string, InventoryMetrics> = new Map();
  private marketplaceMetrics: Map<string, MarketplaceMetrics> = new Map();
  
  // Smart Scheduling storage
  private marketplacePostingRules: Map<string, MarketplacePostingRules> = new Map();
  private postingSuccessAnalytics: Map<string, PostingSuccessAnalytics> = new Map();
  private rateLimitTrackers: Map<string, RateLimitTracker> = new Map();
  private queueDistributions: Map<string, QueueDistribution> = new Map();
  
  // Retry System storage
  private jobRetryHistory: Map<string, JobRetryHistory> = new Map();
  private circuitBreakerStatus: Map<string, CircuitBreakerStatus> = new Map();
  private deadLetterQueue: Map<string, DeadLetterQueue> = new Map();
  private retryMetrics: Map<string, RetryMetrics> = new Map();
  private failureCategories: Map<string, FailureCategory> = new Map();
  private marketplaceRetryConfig: Map<string, MarketplaceRetryConfig> = new Map();

  // Batch storage
  private batches: Map<string, Batch> = new Map();
  private batchItems: Map<string, BatchItem> = new Map();
  private bulkUploads: Map<string, BulkUpload> = new Map();
  private batchTemplates: Map<string, BatchTemplate> = new Map();
  private batchAnalytics: Map<string, BatchAnalytics> = new Map();
  private batchQueue: Map<string, BatchQueue> = new Map();

  // Cross-Platform Sync storage
  private crossPlatformSyncJobs: Map<string, CrossPlatformSyncJob> = new Map();
  private crossPlatformSyncHistory: Map<string, CrossPlatformSyncHistory> = new Map();

  // Webhook storage
  private webhookConfigurations: Map<string, WebhookConfiguration> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();
  private webhookDeliveries: Map<string, WebhookDelivery> = new Map();
  private pollingSchedules: Map<string, PollingSchedule> = new Map();
  private webhookHealthMetrics: Map<string, WebhookHealthMetrics> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      plan: "free",
      listingCredits: 10,
      listingsUsedThisMonth: 0,
      billingCycleStart: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "inactive",
      onboardingCompleted: false,
      optimizationSettings: {
        autoOptimization: false,
        autoScheduling: true,
        autoPricing: false,
        optimizationThreshold: 70,
        learningMode: true,
        notifyOptimizations: true
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    return this.updateUser(id, { stripeCustomerId, stripeSubscriptionId });
  }

  async getMarketplaceConnections(userId: string): Promise<MarketplaceConnection[]> {
    return Array.from(this.marketplaceConnections.values()).filter(conn => conn.userId === userId);
  }

  async getMarketplaceConnection(userId: string, marketplace: string): Promise<MarketplaceConnection | undefined> {
    return Array.from(this.marketplaceConnections.values()).find(
      conn => conn.userId === userId && conn.marketplace === marketplace
    );
  }

  async createMarketplaceConnection(userId: string, connection: InsertMarketplaceConnection): Promise<MarketplaceConnection> {
    const id = randomUUID();
    const conn: MarketplaceConnection = {
      ...connection,
      id,
      userId,
      isConnected: true,
      accessToken: connection.accessToken || null,
      refreshToken: connection.refreshToken || null,
      tokenExpiresAt: connection.tokenExpiresAt || null,
      lastSyncAt: null,
      settings: connection.settings || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.marketplaceConnections.set(id, conn);
    return conn;
  }

  async updateMarketplaceConnection(id: string, updates: Partial<MarketplaceConnection>): Promise<MarketplaceConnection> {
    const conn = this.marketplaceConnections.get(id);
    if (!conn) throw new Error("Connection not found");
    
    const updatedConn = { ...conn, ...updates, updatedAt: new Date() };
    this.marketplaceConnections.set(id, updatedConn);
    return updatedConn;
  }

  async deleteMarketplaceConnection(id: string): Promise<void> {
    this.marketplaceConnections.delete(id);
  }

  async getListings(userId: string, filters?: { status?: string; marketplace?: string }): Promise<Listing[]> {
    let listings = Array.from(this.listings.values()).filter(listing => listing.userId === userId);
    
    if (filters?.status) {
      listings = listings.filter(listing => listing.status === filters.status);
    }
    
    return listings.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getListing(id: string): Promise<Listing | undefined> {
    return this.listings.get(id);
  }

  async createListing(userId: string, listing: InsertListing): Promise<Listing> {
    const id = randomUUID();
    const newListing: Listing = {
      ...listing,
      id,
      userId,
      status: "draft",
      brand: listing.brand || null,
      description: listing.description || null,
      subtitle: listing.subtitle || null,
      category: listing.category || null,
      condition: listing.condition || null,
      packageWeight: listing.packageWeight || null,
      packageDimensions: listing.packageDimensions || null,
      images: listing.images || null,
      aiGenerated: false,
      originalImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.listings.set(id, newListing);
    return newListing;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const listing = this.listings.get(id);
    if (!listing) throw new Error("Listing not found");
    
    const updatedListing = { ...listing, ...updates, updatedAt: new Date() };
    this.listings.set(id, updatedListing);
    return updatedListing;
  }

  async deleteListing(id: string): Promise<void> {
    this.listings.delete(id);
  }

  async getListingPosts(listingId: string): Promise<ListingPost[]> {
    return Array.from(this.listingPosts.values()).filter(post => post.listingId === listingId);
  }

  async getListingPost(listingId: string, marketplace: string): Promise<ListingPost | undefined> {
    return Array.from(this.listingPosts.values()).find(
      post => post.listingId === listingId && post.marketplace === marketplace
    );
  }

  async createListingPost(post: InsertListingPost): Promise<ListingPost> {
    const id = randomUUID();
    const newPost: ListingPost = {
      ...post,
      id,
      externalId: null,
      externalUrl: null,
      status: "pending",
      errorMessage: null,
      postingData: post.postingData || {},
      postedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.listingPosts.set(id, newPost);
    return newPost;
  }

  async updateListingPost(id: string, updates: Partial<ListingPost>): Promise<ListingPost> {
    const post = this.listingPosts.get(id);
    if (!post) throw new Error("Listing post not found");
    
    const updatedPost = { ...post, ...updates, updatedAt: new Date() };
    this.listingPosts.set(id, updatedPost);
    return updatedPost;
  }

  async getJobs(userId?: string, filters?: { status?: string; type?: string }): Promise<Job[]> {
    let jobs = Array.from(this.jobs.values());
    
    // Only filter by userId if provided
    if (userId) {
      jobs = jobs.filter(job => job.userId === userId);
    }
    
    if (filters?.status) {
      jobs = jobs.filter(job => job.status === filters.status);
    }
    
    if (filters?.type) {
      jobs = jobs.filter(job => job.type === filters.type);
    }
    
    return jobs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getUserJobs(userId: string, filters?: { status?: string; type?: string }): Promise<Job[]> {
    let jobs = Array.from(this.jobs.values()).filter(job => job.userId === userId);
    
    if (filters?.status) {
      jobs = jobs.filter(job => job.status === filters.status);
    }
    
    if (filters?.type) {
      jobs = jobs.filter(job => job.type === filters.type);
    }
    
    return jobs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async createJob(userId: string, job: InsertJob): Promise<Job> {
    const id = randomUUID();
    const newJob: Job = {
      ...job,
      id,
      userId,
      status: "pending",
      progress: 0,
      result: null,
      errorMessage: null,
      attempts: 0,
      maxAttempts: 3,
      startedAt: null,
      completedAt: null,
      data: job.data || null,
      scheduledFor: job.scheduledFor || new Date(),
      smartScheduled: job.smartScheduled || false,
      originalScheduledFor: job.originalScheduledFor || null,
      marketplaceGroup: job.marketplaceGroup || null,
      priority: job.priority || 0,
      schedulingMetadata: job.schedulingMetadata || null,
      createdAt: new Date(),
    };
    this.jobs.set(id, newJob);
    return newJob;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Job not found");
    
    const updatedJob = { ...job, ...updates };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      ...log,
      id,
      createdAt: new Date(),
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async getAuditLogs(userId: string, limit = 50): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getUserStats(userId: string): Promise<{
    activeListings: number;
    totalSales: number;
    monthlyRevenue: number;
    conversionRate: number;
  }> {
    const listings = await this.getListings(userId);
    const activeListings = listings.filter(listing => listing.status === 'active').length;
    const soldListings = listings.filter(listing => listing.status === 'sold');
    
    // Calculate monthly revenue (mock calculation)
    const monthlyRevenue = soldListings.reduce((sum, listing) => {
      const price = parseFloat(listing.price);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
    
    const totalSales = soldListings.length;
    const conversionRate = listings.length > 0 ? (totalSales / listings.length) * 100 : 0;
    
    return {
      activeListings,
      totalSales,
      monthlyRevenue,
      conversionRate: Math.round(conversionRate * 10) / 10,
    };
  }

  // Sync Settings methods
  async getSyncSettings(userId: string): Promise<SyncSettings | undefined> {
    return Array.from(this.syncSettings.values()).find(settings => settings.userId === userId);
  }

  async createSyncSettings(userId: string, settings: InsertSyncSettings): Promise<SyncSettings> {
    const id = randomUUID();
    const newSettings: SyncSettings = {
      ...settings,
      id,
      userId,
      autoSync: settings.autoSync || false,
      syncFrequency: settings.syncFrequency || "manual",
      syncFields: settings.syncFields || null,
      defaultBehavior: settings.defaultBehavior || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.syncSettings.set(id, newSettings);
    return newSettings;
  }

  async updateSyncSettings(userId: string, updates: Partial<SyncSettings>): Promise<SyncSettings> {
    const settings = await this.getSyncSettings(userId);
    if (!settings) throw new Error("Sync settings not found");
    
    const updatedSettings = { ...settings, ...updates, updatedAt: new Date() };
    this.syncSettings.set(settings.id, updatedSettings);
    return updatedSettings;
  }

  // Sync Rule methods
  async getSyncRules(userId: string): Promise<SyncRule[]> {
    return Array.from(this.syncRules.values())
      .filter(rule => rule.userId === userId)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  async getSyncRule(id: string): Promise<SyncRule | undefined> {
    return this.syncRules.get(id);
  }

  async createSyncRule(userId: string, rule: InsertSyncRule): Promise<SyncRule> {
    const id = randomUUID();
    const newRule: SyncRule = {
      ...rule,
      id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.syncRules.set(id, newRule);
    return newRule;
  }

  async updateSyncRule(id: string, updates: Partial<SyncRule>): Promise<SyncRule> {
    const rule = this.syncRules.get(id);
    if (!rule) throw new Error("Sync rule not found");
    
    const updatedRule = { ...rule, ...updates, updatedAt: new Date() };
    this.syncRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteSyncRule(id: string): Promise<void> {
    this.syncRules.delete(id);
  }

  // Sync History methods
  async getSyncHistory(userId: string, limit = 50): Promise<SyncHistory[]> {
    return Array.from(this.syncHistory.values())
      .filter(history => history.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async createSyncHistory(userId: string, history: InsertSyncHistory): Promise<SyncHistory> {
    const id = randomUUID();
    const newHistory: SyncHistory = {
      ...history,
      id,
      userId,
      createdAt: new Date(),
    };
    this.syncHistory.set(id, newHistory);
    return newHistory;
  }

  // Sync Conflict methods
  async getSyncConflicts(userId: string, resolved?: boolean): Promise<SyncConflict[]> {
    let conflicts = Array.from(this.syncConflicts.values()).filter(conflict => conflict.userId === userId);
    
    if (resolved !== undefined) {
      conflicts = conflicts.filter(conflict => resolved ? conflict.resolvedAt !== null : conflict.resolvedAt === null);
    }
    
    return conflicts.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getSyncConflict(id: string): Promise<SyncConflict | undefined> {
    return this.syncConflicts.get(id);
  }

  async createSyncConflict(userId: string, conflict: InsertSyncConflict): Promise<SyncConflict> {
    const id = randomUUID();
    const newConflict: SyncConflict = {
      ...conflict,
      id,
      userId,
      resolution: null,
      resolvedValue: null,
      resolvedAt: null,
      resolvedBy: null,
      autoResolved: false,
      createdAt: new Date(),
    };
    this.syncConflicts.set(id, newConflict);
    return newConflict;
  }

  async resolveSyncConflict(id: string, resolution: string, resolvedValue: any): Promise<SyncConflict> {
    const conflict = this.syncConflicts.get(id);
    if (!conflict) throw new Error("Sync conflict not found");
    
    const resolvedConflict = { 
      ...conflict, 
      resolution, 
      resolvedValue, 
      resolvedAt: new Date(),
      autoResolved: false 
    };
    this.syncConflicts.set(id, resolvedConflict);
    return resolvedConflict;
  }

  // Auto-Delist Rule methods
  async getAutoDelistRules(userId: string): Promise<AutoDelistRule[]> {
    return Array.from(this.autoDelistRules.values()).filter(rule => rule.userId === userId);
  }

  async getAutoDelistRule(id: string): Promise<AutoDelistRule | undefined> {
    return this.autoDelistRules.get(id);
  }

  async createAutoDelistRule(userId: string, insertRule: InsertAutoDelistRule): Promise<AutoDelistRule> {
    const id = randomUUID();
    const rule: AutoDelistRule = {
      ...insertRule,
      id,
      userId,
      enabled: insertRule.enabled ?? true,
      marketplaces: insertRule.marketplaces || null,
      listingIds: insertRule.listingIds || null,
      lastExecutedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.autoDelistRules.set(id, rule);
    return rule;
  }

  async updateAutoDelistRule(id: string, updates: Partial<AutoDelistRule>): Promise<AutoDelistRule> {
    const rule = this.autoDelistRules.get(id);
    if (!rule) throw new Error("Auto-delist rule not found");
    
    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };
    this.autoDelistRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteAutoDelistRule(id: string): Promise<void> {
    this.autoDelistRules.delete(id);
  }

  // Auto-Delist History methods
  async getAutoDelistHistory(userId: string, limit: number = 100): Promise<AutoDelistHistory[]> {
    const history = Array.from(this.autoDelistHistory.values())
      .filter(h => h.userId === userId)
      .sort((a, b) => (b.delistedAt?.getTime() || 0) - (a.delistedAt?.getTime() || 0));
    
    return limit ? history.slice(0, limit) : history;
  }

  async createAutoDelistHistory(userId: string, insertHistory: InsertAutoDelistHistory): Promise<AutoDelistHistory> {
    const id = randomUUID();
    const history: AutoDelistHistory = {
      ...insertHistory,
      id,
      userId,
      listingId: insertHistory.listingId || null,
      ruleId: insertHistory.ruleId || null,
      delistedAt: new Date(),
    };
    this.autoDelistHistory.set(id, history);
    return history;
  }

  // Onboarding methods
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress | undefined> {
    return Array.from(this.onboardingProgress.values()).find(progress => progress.userId === userId);
  }

  async createOnboardingProgress(userId: string, progress: InsertOnboardingProgress): Promise<OnboardingProgress> {
    const id = randomUUID();
    const newProgress: OnboardingProgress = {
      ...progress,
      id,
      userId,
      currentStep: progress.currentStep || 0,
      completedSteps: progress.completedSteps || [],
      skipped: progress.skipped || null,
      completedAt: null,
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    this.onboardingProgress.set(id, newProgress);
    return newProgress;
  }

  async updateOnboardingProgress(userId: string, updates: Partial<OnboardingProgress>): Promise<OnboardingProgress> {
    const progress = await this.getOnboardingProgress(userId);
    if (!progress) {
      // Create new progress if doesn't exist
      return this.createOnboardingProgress(userId, {
        currentStep: updates.currentStep || 0,
        completedSteps: updates.completedSteps || [],
        skipped: updates.skipped || false,
      });
    }
    
    const updatedProgress = { ...progress, ...updates, updatedAt: new Date() };
    this.onboardingProgress.set(progress.id, updatedProgress);
    return updatedProgress;
  }

  async completeOnboarding(userId: string): Promise<OnboardingProgress> {
    const progress = await this.updateOnboardingProgress(userId, {
      completedAt: new Date(),
    });
    
    // Also update user's onboardingCompleted flag
    const user = await this.getUser(userId);
    if (user) {
      await this.updateUser(userId, { onboardingCompleted: true });
    }
    
    return progress;
  }

  async skipOnboarding(userId: string): Promise<OnboardingProgress> {
    const progress = await this.updateOnboardingProgress(userId, {
      skipped: true,
      completedAt: new Date(),
    });
    
    // Also update user's onboardingCompleted flag
    const user = await this.getUser(userId);
    if (user) {
      await this.updateUser(userId, { onboardingCompleted: true });
    }
    
    return progress;
  }

  async resetOnboarding(userId: string): Promise<OnboardingProgress> {
    const progress = await this.updateOnboardingProgress(userId, {
      currentStep: 0,
      completedSteps: [],
      skipped: false,
      completedAt: null,
      startedAt: new Date(),
    });
    
    // Also reset user's onboardingCompleted flag
    const user = await this.getUser(userId);
    if (user) {
      await this.updateUser(userId, { onboardingCompleted: false });
    }
    
    return progress;
  }

  // Analytics Event methods
  async createAnalyticsEvent(userId: string, event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const id = randomUUID();
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      id,
      userId,
      marketplace: event.marketplace || null,
      listingId: event.listingId || null,
      metadata: event.metadata || {},
      profit: event.profit || null,
      eventData: event.eventData || {},
      revenue: event.revenue || null,
      timestamp: new Date(),
      createdAt: new Date(),
    };
    this.analyticsEvents.set(id, analyticsEvent);
    return analyticsEvent;
  }

  async getAnalyticsEvents(userId: string, filters?: { eventType?: string; marketplace?: string; startDate?: Date; endDate?: Date }): Promise<AnalyticsEvent[]> {
    let events = Array.from(this.analyticsEvents.values()).filter(event => event.userId === userId);
    
    if (filters?.eventType) {
      events = events.filter(event => event.eventType === filters.eventType);
    }
    if (filters?.marketplace) {
      events = events.filter(event => event.marketplace === filters.marketplace);
    }
    if (filters?.startDate) {
      events = events.filter(event => {
        const eventTime = event.timestamp ? new Date(event.timestamp) : new Date(event.createdAt);
        return eventTime >= filters.startDate!;
      });
    }
    if (filters?.endDate) {
      events = events.filter(event => {
        const eventTime = event.timestamp ? new Date(event.timestamp) : new Date(event.createdAt);
        return eventTime <= filters.endDate!;
      });
    }
    
    return events.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }

  // Sales Metrics methods
  async createSalesMetrics(userId: string, metrics: InsertSalesMetrics): Promise<SalesMetrics> {
    const id = randomUUID();
    const salesMetrics: SalesMetrics = {
      ...metrics,
      id,
      userId,
      listingId: metrics.listingId || null,
      margin: metrics.margin || null,
      daysToSell: metrics.daysToSell || null,
      category: metrics.category || null,
      brand: metrics.brand || null,
      soldAt: new Date(),
    };
    this.salesMetrics.set(id, salesMetrics);
    return salesMetrics;
  }

  async getSalesMetrics(userId: string, filters?: { marketplace?: string; category?: string; startDate?: Date; endDate?: Date }): Promise<SalesMetrics[]> {
    let metrics = Array.from(this.salesMetrics.values()).filter(metric => metric.userId === userId);
    
    if (filters?.marketplace) {
      metrics = metrics.filter(metric => metric.marketplace === filters.marketplace);
    }
    if (filters?.category) {
      metrics = metrics.filter(metric => metric.category === filters.category);
    }
    if (filters?.startDate) {
      metrics = metrics.filter(metric => {
        const soldTime = metric.soldAt ? new Date(metric.soldAt) : new Date();
        return soldTime >= filters.startDate!;
      });
    }
    if (filters?.endDate) {
      metrics = metrics.filter(metric => {
        const soldTime = metric.soldAt ? new Date(metric.soldAt) : new Date();
        return soldTime <= filters.endDate!;
      });
    }
    
    return metrics.sort((a, b) => {
      const aTime = a.soldAt ? new Date(a.soldAt).getTime() : 0;
      const bTime = b.soldAt ? new Date(b.soldAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  // Inventory Metrics methods
  async createInventoryMetrics(userId: string, metrics: InsertInventoryMetrics): Promise<InventoryMetrics> {
    const id = randomUUID();
    const inventoryMetrics: InventoryMetrics = {
      ...metrics,
      id,
      userId,
      listingId: metrics.listingId || null,
      costOfGoods: metrics.costOfGoods || null,
      listDate: metrics.listDate || new Date(),
      ageInDays: metrics.ageInDays || 0,
      turnoverRate: metrics.turnoverRate || null,
      category: metrics.category || null,
      status: metrics.status || null,
      updatedAt: new Date(),
    };
    this.inventoryMetrics.set(id, inventoryMetrics);
    return inventoryMetrics;
  }

  async getInventoryMetrics(userId: string, filters?: { status?: string; category?: string }): Promise<InventoryMetrics[]> {
    let metrics = Array.from(this.inventoryMetrics.values()).filter(metric => metric.userId === userId);
    
    if (filters?.status) {
      metrics = metrics.filter(metric => metric.status === filters.status);
    }
    if (filters?.category) {
      metrics = metrics.filter(metric => metric.category === filters.category);
    }
    
    return metrics.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async updateInventoryMetrics(id: string, updates: Partial<InventoryMetrics>): Promise<InventoryMetrics> {
    const metrics = this.inventoryMetrics.get(id);
    if (!metrics) {
      throw new Error('Inventory metrics not found');
    }
    const updated = { ...metrics, ...updates, updatedAt: new Date() };
    this.inventoryMetrics.set(id, updated);
    return updated;
  }

  // Marketplace Metrics methods
  async createMarketplaceMetrics(userId: string, metrics: InsertMarketplaceMetrics): Promise<MarketplaceMetrics> {
    const id = randomUUID();
    const marketplaceMetrics: MarketplaceMetrics = {
      ...metrics,
      id,
      userId,
      updatedAt: new Date(),
    };
    this.marketplaceMetrics.set(id, marketplaceMetrics);
    return marketplaceMetrics;
  }

  async getMarketplaceMetrics(userId: string, filters?: { marketplace?: string; period?: string }): Promise<MarketplaceMetrics[]> {
    let metrics = Array.from(this.marketplaceMetrics.values()).filter(metric => metric.userId === userId);
    
    if (filters?.marketplace) {
      metrics = metrics.filter(metric => metric.marketplace === filters.marketplace);
    }
    if (filters?.period) {
      metrics = metrics.filter(metric => metric.period === filters.period);
    }
    
    return metrics.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  async updateMarketplaceMetrics(id: string, updates: Partial<MarketplaceMetrics>): Promise<MarketplaceMetrics> {
    const metrics = this.marketplaceMetrics.get(id);
    if (!metrics) {
      throw new Error('Marketplace metrics not found');
    }
    const updated = { ...metrics, ...updates, updatedAt: new Date() };
    this.marketplaceMetrics.set(id, updated);
    return updated;
  }

  // Usage tracking methods
  async canCreateListing(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    if (user.plan === 'unlimited' || user.listingCredits === null) return true;
    return (user.listingsUsedThisMonth || 0) < (user.listingCredits || 0);
  }

  async incrementListingUsage(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      await this.updateUser(userId, { 
        listingsUsedThisMonth: (user.listingsUsedThisMonth || 0) + 1 
      });
    }
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    await this.updateUser(userId, { 
      listingsUsedThisMonth: 0, 
      billingCycleStart: new Date() 
    });
  }

  async checkAndResetBillingCycle(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (user && user.billingCycleStart) {
      const now = new Date();
      const cycleStart = new Date(user.billingCycleStart);
      const daysSince = Math.floor((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince >= 30) {
        await this.resetMonthlyUsage(userId);
      }
    }
  }

  // Rate Limit Tracker methods
  async getRateLimitTracker(marketplace: string, windowType: string = 'hourly'): Promise<RateLimitTracker | undefined> {
    return Array.from(this.rateLimitTrackers.values()).find(
      tracker => tracker.marketplace === marketplace && tracker.windowType === windowType
    );
  }

  async createRateLimitTracker(tracker: InsertRateLimitTracker): Promise<RateLimitTracker> {
    const id = randomUUID();
    const rateLimitTracker: RateLimitTracker = {
      ...tracker,
      id,
      createdAt: new Date(),
    };
    this.rateLimitTrackers.set(id, rateLimitTracker);
    return rateLimitTracker;
  }

  async updateRateLimitTracker(marketplace: string, updates: Partial<RateLimitTracker>): Promise<RateLimitTracker> {
    const tracker = await this.getRateLimitTracker(marketplace);
    if (!tracker) {
      throw new Error('Rate limit tracker not found');
    }
    const updated = { ...tracker, ...updates };
    this.rateLimitTrackers.set(tracker.id, updated);
    return updated;
  }

  async updateRateLimitTrackerById(id: string, updates: Partial<RateLimitTracker>): Promise<RateLimitTracker> {
    const tracker = this.rateLimitTrackers.get(id);
    if (!tracker) {
      throw new Error('Rate limit tracker not found');
    }
    const updated = { ...tracker, ...updates };
    this.rateLimitTrackers.set(id, updated);
    return updated;
  }

  async getCurrentRateLimits(marketplaces: string[]): Promise<Record<string, RateLimitTracker | null>> {
    const result: Record<string, RateLimitTracker | null> = {};
    for (const marketplace of marketplaces) {
      result[marketplace] = await this.getRateLimitTracker(marketplace) || null;
    }
    return result;
  }

  async getRateLimitUsageInWindow(marketplace: string, startTime: Date, endTime: Date): Promise<number> {
    const trackers = Array.from(this.rateLimitTrackers.values()).filter(
      tracker => tracker.marketplace === marketplace &&
      new Date(tracker.timeWindow) >= startTime &&
      new Date(tracker.timeWindow) <= endTime
    );
    return trackers.reduce((sum, tracker) => sum + (tracker.requestCount || 0), 0);
  }

  async getAllRateLimitTrackers(marketplace?: string): Promise<RateLimitTracker[]> {
    let trackers = Array.from(this.rateLimitTrackers.values());
    if (marketplace) {
      trackers = trackers.filter(tracker => tracker.marketplace === marketplace);
    }
    return trackers.sort((a, b) => new Date(b.timeWindow).getTime() - new Date(a.timeWindow).getTime());
  }

  async cleanupOldRateLimitTrackers(olderThan: Date): Promise<number> {
    let deletedCount = 0;
    for (const [id, tracker] of this.rateLimitTrackers.entries()) {
      if (new Date(tracker.timeWindow) < olderThan) {
        this.rateLimitTrackers.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  // Queue Distribution methods  
  async getQueueDistribution(timeSlot: Date, marketplace?: string): Promise<QueueDistribution[]> {
    let distributions = Array.from(this.queueDistributions.values()).filter(
      dist => new Date(dist.timeSlot).getTime() === timeSlot.getTime()
    );
    if (marketplace) {
      distributions = distributions.filter(dist => dist.marketplace === marketplace);
    }
    return distributions;
  }

  async createQueueDistribution(distribution: InsertQueueDistribution): Promise<QueueDistribution> {
    const id = randomUUID();
    const queueDistribution: QueueDistribution = {
      ...distribution,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.queueDistributions.set(id, queueDistribution);
    return queueDistribution;
  }

  async updateQueueDistribution(id: string, updates: Partial<QueueDistribution>): Promise<QueueDistribution> {
    const distribution = this.queueDistributions.get(id);
    if (!distribution) {
      throw new Error('Queue distribution not found');
    }
    const updated = { ...distribution, ...updates, updatedAt: new Date() };
    this.queueDistributions.set(id, updated);
    return updated;
  }

  async getAvailableTimeSlots(marketplace: string, startTime: Date, endTime: Date): Promise<QueueDistribution[]> {
    return Array.from(this.queueDistributions.values()).filter(
      dist => dist.marketplace === marketplace &&
      new Date(dist.timeSlot) >= startTime &&
      new Date(dist.timeSlot) <= endTime &&
      dist.isAvailable &&
      (dist.scheduledJobs || 0) < (dist.maxCapacity || 10)
    );
  }

  // Smart Scheduling methods - Marketplace Posting Rules
  async getMarketplacePostingRules(marketplace?: string): Promise<MarketplacePostingRules[]> {
    let rules = Array.from(this.marketplacePostingRules.values());
    if (marketplace) {
      rules = rules.filter(rule => rule.marketplace === marketplace);
    }
    return rules.filter(rule => rule.isActive);
  }

  async getMarketplacePostingRule(marketplace: string): Promise<MarketplacePostingRules | undefined> {
    return Array.from(this.marketplacePostingRules.values()).find(
      rule => rule.marketplace === marketplace && rule.isActive
    );
  }

  async createMarketplacePostingRules(rules: InsertMarketplacePostingRules): Promise<MarketplacePostingRules> {
    const id = randomUUID();
    const marketplaceRules: MarketplacePostingRules = {
      ...rules,
      id,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    this.marketplacePostingRules.set(id, marketplaceRules);
    return marketplaceRules;
  }

  async updateMarketplacePostingRules(marketplace: string, updates: Partial<MarketplacePostingRules>): Promise<MarketplacePostingRules> {
    const rules = await this.getMarketplacePostingRule(marketplace);
    if (!rules) {
      throw new Error('Marketplace posting rules not found');
    }
    const updated = { ...rules, ...updates, lastUpdated: new Date() };
    this.marketplacePostingRules.set(rules.id, updated);
    return updated;
  }

  // Posting Success Analytics methods
  async createPostingSuccessAnalytics(userId: string, analytics: InsertPostingSuccessAnalytics): Promise<PostingSuccessAnalytics> {
    const id = randomUUID();
    const successAnalytics: PostingSuccessAnalytics = {
      ...analytics,
      id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.postingSuccessAnalytics.set(id, successAnalytics);
    return successAnalytics;
  }

  async getPostingSuccessAnalytics(userId: string, filters?: { 
    marketplace?: string; 
    marketplaces?: string[];
    categories?: string[];
    startDate?: Date; 
    endDate?: Date; 
    category?: string;
    listingId?: string;
    dayOfWeek?: number;
    hourOfDay?: number;
    priceRange?: string;
    minEngagement?: number;
    sold?: boolean;
    limit?: number;
  }): Promise<PostingSuccessAnalytics[]> {
    let analytics = Array.from(this.postingSuccessAnalytics.values()).filter(a => a.userId === userId);
    
    if (filters?.marketplace) {
      analytics = analytics.filter(a => a.marketplace === filters.marketplace);
    }
    if (filters?.marketplaces) {
      analytics = analytics.filter(a => filters.marketplaces!.includes(a.marketplace));
    }
    if (filters?.category) {
      analytics = analytics.filter(a => a.category === filters.category);
    }
    if (filters?.categories) {
      analytics = analytics.filter(a => filters.categories!.includes(a.category || ''));
    }
    if (filters?.startDate) {
      analytics = analytics.filter(a => new Date(a.postedAt) >= filters.startDate!);
    }
    if (filters?.endDate) {
      analytics = analytics.filter(a => new Date(a.postedAt) <= filters.endDate!);
    }
    if (filters?.listingId) {
      analytics = analytics.filter(a => a.listingId === filters.listingId);
    }
    if (filters?.dayOfWeek !== undefined) {
      analytics = analytics.filter(a => a.dayOfWeek === filters.dayOfWeek);
    }
    if (filters?.hourOfDay !== undefined) {
      analytics = analytics.filter(a => a.hourOfDay === filters.hourOfDay);
    }
    if (filters?.priceRange) {
      analytics = analytics.filter(a => a.priceRange === filters.priceRange);
    }
    if (filters?.minEngagement) {
      analytics = analytics.filter(a => parseFloat(String(a.engagement_score)) >= filters.minEngagement!);
    }
    if (filters?.sold !== undefined) {
      analytics = analytics.filter(a => a.sold === filters.sold);
    }
    
    const sorted = analytics.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
  }

  async updatePostingSuccessAnalytics(id: string, updates: Partial<PostingSuccessAnalytics>): Promise<PostingSuccessAnalytics> {
    const analytics = this.postingSuccessAnalytics.get(id);
    if (!analytics) {
      throw new Error('Posting success analytics not found');
    }
    const updated = { ...analytics, ...updates, updatedAt: new Date() };
    this.postingSuccessAnalytics.set(id, updated);
    return updated;
  }

  // Job Retry History methods
  async createJobRetryHistory(history: InsertJobRetryHistory): Promise<JobRetryHistory> {
    const id = randomUUID();
    const retryHistory: JobRetryHistory = {
      ...history,
      id,
      timestamp: new Date(),
    };
    this.jobRetryHistory.set(id, retryHistory);
    return retryHistory;
  }

  async getJobRetryHistory(jobId: string): Promise<JobRetryHistory[]> {
    return Array.from(this.jobRetryHistory.values())
      .filter(history => history.jobId === jobId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Circuit Breaker methods
  async getCircuitBreakerStatus(marketplace: string): Promise<CircuitBreakerStatus | undefined> {
    return Array.from(this.circuitBreakerStatus.values())
      .find(status => status.marketplace === marketplace);
  }

  async updateCircuitBreaker(marketplace: string, updates: Partial<CircuitBreakerStatus>): Promise<CircuitBreakerStatus> {
    const status = await this.getCircuitBreakerStatus(marketplace);
    if (!status) {
      throw new Error('Circuit breaker status not found');
    }
    const updated = { ...status, ...updates, updatedAt: new Date() };
    this.circuitBreakerStatus.set(status.id, updated);
    return updated;
  }

  async getAllCircuitBreakerStatuses(): Promise<CircuitBreakerStatus[]> {
    return Array.from(this.circuitBreakerStatus.values());
  }

  async createCircuitBreakerStatus(status: InsertCircuitBreakerStatus): Promise<CircuitBreakerStatus> {
    const id = randomUUID();
    const circuitBreaker: CircuitBreakerStatus = {
      ...status,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.circuitBreakerStatus.set(id, circuitBreaker);
    return circuitBreaker;
  }

  // Dead Letter Queue methods
  async getDeadLetterQueueEntries(userId?: string, filters?: { resolutionStatus?: string; requiresManualReview?: boolean }): Promise<DeadLetterQueue[]> {
    let entries = Array.from(this.deadLetterQueue.values());
    
    if (userId) {
      entries = entries.filter(entry => entry.userId === userId);
    }
    if (filters?.resolutionStatus) {
      entries = entries.filter(entry => entry.resolutionStatus === filters.resolutionStatus);
    }
    if (filters?.requiresManualReview !== undefined) {
      entries = entries.filter(entry => entry.requiresManualReview === filters.requiresManualReview);
    }
    
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createDeadLetterQueue(entry: InsertDeadLetterQueue): Promise<DeadLetterQueue> {
    const id = randomUUID();
    const deadLetter: DeadLetterQueue = {
      ...entry,
      id,
      createdAt: new Date(),
    };
    this.deadLetterQueue.set(id, deadLetter);
    return deadLetter;
  }

  async updateDeadLetterQueueEntry(id: string, updates: Partial<DeadLetterQueue>): Promise<DeadLetterQueue> {
    const entry = this.deadLetterQueue.get(id);
    if (!entry) {
      throw new Error('Dead letter queue entry not found');
    }
    const updated = { ...entry, ...updates };
    this.deadLetterQueue.set(id, updated);
    return updated;
  }

  async getDeadLetterQueueStats(userId?: string): Promise<{ total: number; pending: number; resolved: number; requiresReview: number }> {
    let entries = Array.from(this.deadLetterQueue.values());
    if (userId) {
      entries = entries.filter(entry => entry.userId === userId);
    }
    
    return {
      total: entries.length,
      pending: entries.filter(e => e.resolutionStatus === 'pending').length,
      resolved: entries.filter(e => e.resolutionStatus === 'resolved').length,
      requiresReview: entries.filter(e => e.requiresManualReview).length,
    };
  }

  async cleanupOldEntries(olderThan: Date): Promise<number> {
    let deletedCount = 0;
    for (const [id, entry] of this.deadLetterQueue.entries()) {
      if (new Date(entry.createdAt) < olderThan && entry.resolutionStatus === 'resolved') {
        this.deadLetterQueue.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  // Retry Metrics methods
  async createRetryMetrics(metrics: InsertRetryMetrics): Promise<RetryMetrics> {
    const id = randomUUID();
    const retryMetrics: RetryMetrics = {
      ...metrics,
      id,
      createdAt: new Date(),
    };
    this.retryMetrics.set(id, retryMetrics);
    return retryMetrics;
  }

  async getRetryMetrics(filters?: { marketplace?: string; jobType?: string; timeWindow?: Date }): Promise<RetryMetrics[]> {
    let metrics = Array.from(this.retryMetrics.values());
    
    if (filters?.marketplace) {
      metrics = metrics.filter(m => m.marketplace === filters.marketplace);
    }
    if (filters?.jobType) {
      metrics = metrics.filter(m => m.jobType === filters.jobType);
    }
    if (filters?.timeWindow) {
      metrics = metrics.filter(m => new Date(m.timeWindow).getTime() === filters.timeWindow!.getTime());
    }
    
    return metrics.sort((a, b) => new Date(b.timeWindow).getTime() - new Date(a.timeWindow).getTime());
  }

  // Failure Category methods
  async getFailureCategories(): Promise<FailureCategory[]> {
    return Array.from(this.failureCategories.values()).filter(cat => cat.isActive);
  }

  async getFailureCategory(category: string): Promise<FailureCategory | undefined> {
    return Array.from(this.failureCategories.values()).find(c => c.category === category && c.isActive);
  }

  async createFailureCategory(category: InsertFailureCategory): Promise<FailureCategory> {
    const id = randomUUID();
    const failureCategory: FailureCategory = {
      ...category,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.failureCategories.set(id, failureCategory);
    return failureCategory;
  }

  async updateFailureCategory(id: string, updates: Partial<FailureCategory>): Promise<FailureCategory> {
    const category = this.failureCategories.get(id);
    if (!category) {
      throw new Error('Failure category not found');
    }
    const updated = { ...category, ...updates, updatedAt: new Date() };
    this.failureCategories.set(id, updated);
    return updated;
  }

  // Marketplace Retry Config methods
  async getMarketplaceRetryConfig(marketplace: string): Promise<MarketplaceRetryConfig | undefined> {
    return Array.from(this.marketplaceRetryConfig.values())
      .find(config => config.marketplace === marketplace && config.isActive);
  }

  async createMarketplaceRetryConfig(config: InsertMarketplaceRetryConfig): Promise<MarketplaceRetryConfig> {
    const id = randomUUID();
    const retryConfig: MarketplaceRetryConfig = {
      ...config,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.marketplaceRetryConfig.set(id, retryConfig);
    return retryConfig;
  }

  async updateMarketplaceRetryConfig(marketplace: string, updates: Partial<MarketplaceRetryConfig>): Promise<MarketplaceRetryConfig> {
    const config = await this.getMarketplaceRetryConfig(marketplace);
    if (!config) {
      throw new Error('Marketplace retry config not found');
    }
    const updated = { ...config, ...updates, updatedAt: new Date() };
    this.marketplaceRetryConfig.set(config.id, updated);
    return updated;
  }

  // Marketplace Posting Rules methods
  async getMarketplacePostingRules(marketplace?: string): Promise<MarketplacePostingRules[]> {
    let rules = Array.from(this.marketplacePostingRules.values());
    if (marketplace) {
      rules = rules.filter(rule => rule.marketplace === marketplace);
    }
    return rules.filter(rule => rule.isActive);
  }

  async getMarketplacePostingRule(marketplace: string): Promise<MarketplacePostingRules | undefined> {
    return Array.from(this.marketplacePostingRules.values()).find(rule => 
      rule.marketplace === marketplace && rule.isActive
    );
  }

  async createMarketplacePostingRules(rules: InsertMarketplacePostingRules): Promise<MarketplacePostingRules> {
    const id = randomUUID();
    const postingRules: MarketplacePostingRules = {
      ...rules,
      id,
      lastUpdated: new Date(),
      createdAt: new Date(),
    };
    this.marketplacePostingRules.set(id, postingRules);
    return postingRules;
  }

  async updateMarketplacePostingRules(marketplace: string, updates: Partial<MarketplacePostingRules>): Promise<MarketplacePostingRules> {
    const existing = Array.from(this.marketplacePostingRules.values()).find(rule => rule.marketplace === marketplace);
    if (!existing) {
      throw new Error('Marketplace posting rules not found');
    }
    const updated = { ...existing, ...updates, lastUpdated: new Date() };
    this.marketplacePostingRules.set(existing.id, updated);
    return updated;
  }

  // Posting Success Analytics methods
  async createPostingSuccessAnalytics(userId: string, analytics: InsertPostingSuccessAnalytics): Promise<PostingSuccessAnalytics> {
    const id = randomUUID();
    const successAnalytics: PostingSuccessAnalytics = {
      ...analytics,
      id,
      userId,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    this.postingSuccessAnalytics.set(id, successAnalytics);
    return successAnalytics;
  }

  async getPostingSuccessAnalytics(userId: string, filters?: { 
    marketplace?: string; 
    marketplaces?: string[];
    categories?: string[];
    startDate?: Date; 
    endDate?: Date; 
    category?: string;
    listingId?: string;
    dayOfWeek?: number;
    hourOfDay?: number;
    priceRange?: string;
    minEngagement?: number;
    sold?: boolean;
    limit?: number;
  }): Promise<PostingSuccessAnalytics[]> {
    let analytics = Array.from(this.postingSuccessAnalytics.values()).filter(record => record.userId === userId);
    
    if (filters?.marketplace) {
      analytics = analytics.filter(record => record.marketplace === filters.marketplace);
    }
    if (filters?.marketplaces && filters.marketplaces.length > 0) {
      analytics = analytics.filter(record => filters.marketplaces!.includes(record.marketplace));
    }
    if (filters?.category) {
      analytics = analytics.filter(record => record.category === filters.category);
    }
    if (filters?.categories && filters.categories.length > 0) {
      analytics = analytics.filter(record => record.category && filters.categories!.includes(record.category));
    }
    if (filters?.listingId) {
      analytics = analytics.filter(record => record.listingId === filters.listingId);
    }
    if (filters?.dayOfWeek !== undefined) {
      analytics = analytics.filter(record => record.dayOfWeek === filters.dayOfWeek);
    }
    if (filters?.hourOfDay !== undefined) {
      analytics = analytics.filter(record => record.hourOfDay === filters.hourOfDay);
    }
    if (filters?.priceRange) {
      analytics = analytics.filter(record => record.priceRange === filters.priceRange);
    }
    if (filters?.minEngagement !== undefined) {
      analytics = analytics.filter(record => parseFloat(record.engagement_score || '0') >= filters.minEngagement!);
    }
    if (filters?.sold !== undefined) {
      analytics = analytics.filter(record => record.sold === filters.sold);
    }
    if (filters?.startDate) {
      analytics = analytics.filter(record => new Date(record.postedAt) >= filters.startDate!);
    }
    if (filters?.endDate) {
      analytics = analytics.filter(record => new Date(record.postedAt) <= filters.endDate!);
    }
    
    const sorted = analytics.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    
    if (filters?.limit && filters.limit > 0) {
      return sorted.slice(0, filters.limit);
    }
    
    return sorted;
  }

  async updatePostingSuccessAnalytics(id: string, updates: Partial<PostingSuccessAnalytics>): Promise<PostingSuccessAnalytics> {
    const analytics = this.postingSuccessAnalytics.get(id);
    if (!analytics) {
      throw new Error('Posting success analytics not found');
    }
    const updated = { ...analytics, ...updates, updatedAt: new Date() };
    this.postingSuccessAnalytics.set(id, updated);
    return updated;
  }

  // Optimization Engine methods implementations
  async getPerformanceByTimeSlot(userId: string, marketplace?: string, category?: string): Promise<Array<{
    dayOfWeek: number;
    hourOfDay: number;
    avgSuccessScore: number;
    avgEngagement: number;
    conversionRate: number;
    sampleSize: number;
  }>> {
    const analytics = await this.getPostingSuccessAnalytics(userId, { marketplace, category });
    
    // Group by time slot (dayOfWeek + hourOfDay)
    const timeSlots = new Map<string, { 
      successScores: number[]; 
      engagementScores: number[]; 
      sales: number; 
      total: number; 
    }>();

    analytics.forEach(record => {
      const key = `${record.dayOfWeek}_${record.hourOfDay}`;
      const existing = timeSlots.get(key) || { successScores: [], engagementScores: [], sales: 0, total: 0 };
      
      existing.successScores.push(parseFloat(record.success_score || '0'));
      existing.engagementScores.push(parseFloat(record.engagement_score || '0'));
      existing.sales += record.sold ? 1 : 0;
      existing.total += 1;
      
      timeSlots.set(key, existing);
    });

    return Array.from(timeSlots.entries())
      .map(([key, data]) => {
        const [dayOfWeek, hourOfDay] = key.split('_').map(Number);
        return {
          dayOfWeek,
          hourOfDay,
          avgSuccessScore: data.successScores.reduce((sum, score) => sum + score, 0) / data.successScores.length,
          avgEngagement: data.engagementScores.reduce((sum, score) => sum + score, 0) / data.engagementScores.length,
          conversionRate: (data.sales / data.total) * 100,
          sampleSize: data.total
        };
      })
      .filter(slot => slot.sampleSize >= 2); // Minimum sample size for reliability
  }

  async getPerformanceByPriceRange(userId: string, marketplace?: string, category?: string): Promise<Array<{
    priceRange: string;
    avgSuccessScore: number;
    conversionRate: number;
    avgDaysToSell: number;
    sampleSize: number;
  }>> {
    const analytics = await this.getPostingSuccessAnalytics(userId, { marketplace, category });
    
    // Group by price range
    const priceRanges = new Map<string, { 
      successScores: number[]; 
      sales: number; 
      total: number; 
      daysToSell: number[]; 
    }>();

    analytics.forEach(record => {
      const priceRange = record.priceRange || 'unknown';
      const existing = priceRanges.get(priceRange) || { successScores: [], sales: 0, total: 0, daysToSell: [] };
      
      existing.successScores.push(parseFloat(record.success_score || '0'));
      existing.sales += record.sold ? 1 : 0;
      existing.total += 1;
      if (record.daysToSell) {
        existing.daysToSell.push(record.daysToSell);
      }
      
      priceRanges.set(priceRange, existing);
    });

    return Array.from(priceRanges.entries())
      .map(([priceRange, data]) => ({
        priceRange,
        avgSuccessScore: data.successScores.reduce((sum, score) => sum + score, 0) / data.successScores.length,
        conversionRate: (data.sales / data.total) * 100,
        avgDaysToSell: data.daysToSell.length > 0 
          ? data.daysToSell.reduce((sum, days) => sum + days, 0) / data.daysToSell.length 
          : 0,
        sampleSize: data.total
      }))
      .filter(range => range.sampleSize >= 3);
  }

  async getCategoryPerformance(userId: string, marketplace?: string): Promise<Array<{
    category: string;
    avgSuccessScore: number;
    conversionRate: number;
    avgEngagement: number;
    totalPosts: number;
    salesCount: number;
  }>> {
    const analytics = await this.getPostingSuccessAnalytics(userId, { marketplace });
    
    // Group by category
    const categories = new Map<string, { 
      successScores: number[]; 
      engagementScores: number[]; 
      sales: number; 
      total: number; 
    }>();

    analytics.forEach(record => {
      const category = record.category || 'Other';
      const existing = categories.get(category) || { successScores: [], engagementScores: [], sales: 0, total: 0 };
      
      existing.successScores.push(parseFloat(record.success_score || '0'));
      existing.engagementScores.push(parseFloat(record.engagement_score || '0'));
      existing.sales += record.sold ? 1 : 0;
      existing.total += 1;
      
      categories.set(category, existing);
    });

    return Array.from(categories.entries())
      .map(([category, data]) => ({
        category,
        avgSuccessScore: data.successScores.reduce((sum, score) => sum + score, 0) / data.successScores.length,
        conversionRate: (data.sales / data.total) * 100,
        avgEngagement: data.engagementScores.reduce((sum, score) => sum + score, 0) / data.engagementScores.length,
        totalPosts: data.total,
        salesCount: data.sales
      }))
      .sort((a, b) => b.avgSuccessScore - a.avgSuccessScore);
  }

  async getMarketplacePerformanceSummary(userId: string): Promise<Array<{
    marketplace: string;
    avgSuccessScore: number;
    conversionRate: number;
    avgEngagement: number;
    totalPosts: number;
    salesCount: number;
    lastPostDate: Date | null;
  }>> {
    const analytics = await this.getPostingSuccessAnalytics(userId);
    
    // Group by marketplace
    const marketplaces = new Map<string, { 
      successScores: number[]; 
      engagementScores: number[]; 
      sales: number; 
      total: number;
      lastPostDate: Date | null;
    }>();

    analytics.forEach(record => {
      const existing = marketplaces.get(record.marketplace) || { 
        successScores: [], 
        engagementScores: [], 
        sales: 0, 
        total: 0,
        lastPostDate: null
      };
      
      existing.successScores.push(parseFloat(record.success_score || '0'));
      existing.engagementScores.push(parseFloat(record.engagement_score || '0'));
      existing.sales += record.sold ? 1 : 0;
      existing.total += 1;
      
      const postDate = new Date(record.postedAt);
      if (!existing.lastPostDate || postDate > existing.lastPostDate) {
        existing.lastPostDate = postDate;
      }
      
      marketplaces.set(record.marketplace, existing);
    });

    return Array.from(marketplaces.entries())
      .map(([marketplace, data]) => ({
        marketplace,
        avgSuccessScore: data.successScores.reduce((sum, score) => sum + score, 0) / data.successScores.length,
        conversionRate: (data.sales / data.total) * 100,
        avgEngagement: data.engagementScores.reduce((sum, score) => sum + score, 0) / data.engagementScores.length,
        totalPosts: data.total,
        salesCount: data.sales,
        lastPostDate: data.lastPostDate
      }))
      .sort((a, b) => b.avgSuccessScore - a.avgSuccessScore);
  }

  async getEngagementCorrelations(userId: string, marketplace?: string): Promise<Array<{
    variable1: string;
    variable2: string;
    correlation: number;
    sampleSize: number;
  }>> {
    const analytics = await this.getPostingSuccessAnalytics(userId, { marketplace });
    
    if (analytics.length < 10) {
      return []; // Not enough data for reliable correlations
    }

    // Calculate correlations between key variables
    const variables = {
      hourOfDay: analytics.map(a => a.hourOfDay),
      dayOfWeek: analytics.map(a => a.dayOfWeek),
      views: analytics.map(a => a.views || 0),
      likes: analytics.map(a => a.likes || 0),
      messages: analytics.map(a => a.messages || 0),
      successScore: analytics.map(a => parseFloat(a.success_score || '0')),
      engagementScore: analytics.map(a => parseFloat(a.engagement_score || '0'))
    };

    const correlations: Array<{
      variable1: string;
      variable2: string;
      correlation: number;
      sampleSize: number;
    }> = [];

    // Calculate Pearson correlation for each pair
    const varNames = Object.keys(variables);
    for (let i = 0; i < varNames.length; i++) {
      for (let j = i + 1; j < varNames.length; j++) {
        const var1 = variables[varNames[i] as keyof typeof variables];
        const var2 = variables[varNames[j] as keyof typeof variables];
        
        const correlation = this.calculateCorrelation(var1, var2);
        if (Math.abs(correlation) > 0.1) { // Only include meaningful correlations
          correlations.push({
            variable1: varNames[i],
            variable2: varNames[j],
            correlation,
            sampleSize: analytics.length
          });
        }
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;
    
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;
    
    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      
      numerator += diffX * diffY;
      sumSqX += diffX * diffX;
      sumSqY += diffY * diffY;
    }
    
    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  async getTimeSeriesData(userId: string, metric: string, groupBy: 'day' | 'week' | 'month', marketplace?: string, category?: string): Promise<Array<{
    date: string;
    value: number;
    count: number;
  }>> {
    const analytics = await this.getPostingSuccessAnalytics(userId, { marketplace, category });
    
    // Group data by time period
    const timeSeries = new Map<string, { values: number[]; count: number }>();

    analytics.forEach(record => {
      const date = new Date(record.postedAt);
      let key: string;
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          key = startOfWeek.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      const existing = timeSeries.get(key) || { values: [], count: 0 };
      
      let value: number;
      switch (metric) {
        case 'success_score':
          value = parseFloat(record.success_score || '0');
          break;
        case 'engagement_score':
          value = parseFloat(record.engagement_score || '0');
          break;
        case 'views':
          value = record.views || 0;
          break;
        case 'likes':
          value = record.likes || 0;
          break;
        case 'conversion_rate':
          value = record.sold ? 1 : 0;
          break;
        default:
          value = 0;
      }
      
      existing.values.push(value);
      existing.count += 1;
      timeSeries.set(key, existing);
    });

    return Array.from(timeSeries.entries())
      .map(([date, data]) => ({
        date,
        value: metric === 'conversion_rate' 
          ? (data.values.reduce((sum, val) => sum + val, 0) / data.count) * 100
          : data.values.reduce((sum, val) => sum + val, 0) / data.count,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSeasonalPatterns(userId: string, marketplace?: string): Promise<Array<{
    month: number;
    dayOfWeek: number;
    avgPerformance: number;
    sampleSize: number;
  }>> {
    const analytics = await this.getPostingSuccessAnalytics(userId, { marketplace });
    
    // Group by month and day of week
    const patterns = new Map<string, { scores: number[]; count: number }>();

    analytics.forEach(record => {
      const date = new Date(record.postedAt);
      const month = date.getMonth();
      const dayOfWeek = record.dayOfWeek;
      const key = `${month}_${dayOfWeek}`;
      
      const existing = patterns.get(key) || { scores: [], count: 0 };
      existing.scores.push(parseFloat(record.success_score || '0'));
      existing.count += 1;
      patterns.set(key, existing);
    });

    return Array.from(patterns.entries())
      .map(([key, data]) => {
        const [month, dayOfWeek] = key.split('_').map(Number);
        return {
          month,
          dayOfWeek,
          avgPerformance: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
          sampleSize: data.count
        };
      })
      .filter(pattern => pattern.sampleSize >= 3); // Minimum sample for reliability
  }

  async getListingsWithLowPerformance(userId: string, threshold: number = 30): Promise<Array<{
    listingId: string;
    title: string;
    category: string;
    avgSuccessScore: number;
    daysSinceListed: number;
    lastEngagement: Date | null;
    suggestedActions: string[];
  }>> {
    const listings = await this.getListings(userId, { status: 'active' });
    const analytics = await this.getPostingSuccessAnalytics(userId);
    
    const lowPerformingListings: Array<{
      listingId: string;
      title: string;
      category: string;
      avgSuccessScore: number;
      daysSinceListed: number;
      lastEngagement: Date | null;
      suggestedActions: string[];
    }> = [];

    for (const listing of listings) {
      const listingAnalytics = analytics.filter(a => a.listingId === listing.id);
      
      if (listingAnalytics.length === 0) continue;
      
      const avgSuccessScore = listingAnalytics.reduce((sum, a) => 
        sum + parseFloat(a.success_score || '0'), 0
      ) / listingAnalytics.length;
      
      if (avgSuccessScore < threshold) {
        const daysSinceListed = Math.floor(
          (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const lastEngagement = listingAnalytics
          .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())[0]
          ?.postedAt ? new Date(listingAnalytics[0].postedAt) : null;

        const suggestedActions = this.generateSuggestedActions(listing, avgSuccessScore, daysSinceListed);

        lowPerformingListings.push({
          listingId: listing.id,
          title: listing.title,
          category: listing.category || 'Other',
          avgSuccessScore,
          daysSinceListed,
          lastEngagement,
          suggestedActions
        });
      }
    }

    return lowPerformingListings.sort((a, b) => a.avgSuccessScore - b.avgSuccessScore);
  }

  private generateSuggestedActions(listing: Listing, avgSuccessScore: number, daysSinceListed: number): string[] {
    const actions: string[] = [];
    
    if (avgSuccessScore < 20) {
      actions.push('Consider significant price reduction (15-25%)');
      actions.push('Update images with better quality photos');
      actions.push('Revise listing title and description');
    } else if (avgSuccessScore < 35) {
      actions.push('Adjust price by 10-15%');
      actions.push('Try posting at different times');
      actions.push('Add more detailed description');
    }
    
    if (daysSinceListed > 30) {
      actions.push('Consider refreshing the listing');
      actions.push('Try cross-posting to additional marketplaces');
    }
    
    if (!listing.images || (Array.isArray(listing.images) && (listing.images as any[]).length < 3)) {
      actions.push('Add more product images');
    }
    
    return actions;
  }

  async getOptimizationOpportunities(userId: string): Promise<Array<{
    type: 'timing' | 'pricing' | 'marketplace' | 'content';
    priority: 'high' | 'medium' | 'low';
    description: string;
    potentialImprovement: number;
    confidence: number;
    targetListings: number;
  }>> {
    const opportunities: Array<{
      type: 'timing' | 'pricing' | 'marketplace' | 'content';
      priority: 'high' | 'medium' | 'low';
      description: string;
      potentialImprovement: number;
      confidence: number;
      targetListings: number;
    }> = [];

    // Analyze timing opportunities
    const timeSlotPerformance = await this.getPerformanceByTimeSlot(userId);
    const bestTimeSlots = timeSlotPerformance
      .filter(slot => slot.sampleSize >= 5)
      .sort((a, b) => b.avgSuccessScore - a.avgSuccessScore)
      .slice(0, 3);
    
    const avgTimeSlotPerformance = timeSlotPerformance.reduce((sum, slot) => 
      sum + slot.avgSuccessScore, 0) / timeSlotPerformance.length;

    if (bestTimeSlots.length > 0 && bestTimeSlots[0].avgSuccessScore > avgTimeSlotPerformance * 1.2) {
      opportunities.push({
        type: 'timing',
        priority: 'high',
        description: `Optimize posting times - best slots show ${(bestTimeSlots[0].avgSuccessScore - avgTimeSlotPerformance).toFixed(1)} points higher success`,
        potentialImprovement: ((bestTimeSlots[0].avgSuccessScore - avgTimeSlotPerformance) / avgTimeSlotPerformance) * 100,
        confidence: Math.min(90, bestTimeSlots[0].sampleSize * 5),
        targetListings: await this.countPendingJobs(userId)
      });
    }

    // Analyze pricing opportunities
    const priceRangePerformance = await this.getPerformanceByPriceRange(userId);
    const bestPriceRange = priceRangePerformance
      .sort((a, b) => b.conversionRate - a.conversionRate)[0];
    
    if (bestPriceRange && priceRangePerformance.length > 1) {
      const avgConversionRate = priceRangePerformance.reduce((sum, range) => 
        sum + range.conversionRate, 0) / priceRangePerformance.length;
      
      if (bestPriceRange.conversionRate > avgConversionRate * 1.3) {
        opportunities.push({
          type: 'pricing',
          priority: 'medium',
          description: `Focus on ${bestPriceRange.priceRange} price range - shows ${(bestPriceRange.conversionRate - avgConversionRate).toFixed(1)}% higher conversion`,
          potentialImprovement: ((bestPriceRange.conversionRate - avgConversionRate) / avgConversionRate) * 100,
          confidence: Math.min(85, bestPriceRange.sampleSize * 3),
          targetListings: await this.countActiveListings(userId)
        });
      }
    }

    // Analyze marketplace opportunities
    const marketplacePerformance = await this.getMarketplacePerformanceSummary(userId);
    if (marketplacePerformance.length > 1) {
      const bestMarketplace = marketplacePerformance[0];
      const avgPerformance = marketplacePerformance.reduce((sum, mp) => 
        sum + mp.avgSuccessScore, 0) / marketplacePerformance.length;
      
      if (bestMarketplace.avgSuccessScore > avgPerformance * 1.25) {
        opportunities.push({
          type: 'marketplace',
          priority: 'medium',
          description: `Prioritize ${bestMarketplace.marketplace} - shows ${(bestMarketplace.avgSuccessScore - avgPerformance).toFixed(1)} points higher success`,
          potentialImprovement: ((bestMarketplace.avgSuccessScore - avgPerformance) / avgPerformance) * 100,
          confidence: Math.min(80, bestMarketplace.totalPosts),
          targetListings: await this.countActiveListings(userId)
        });
      }
    }

    // Analyze content opportunities
    const lowPerformingListings = await this.getListingsWithLowPerformance(userId, 35);
    if (lowPerformingListings.length > 0) {
      opportunities.push({
        type: 'content',
        priority: lowPerformingListings.length > 10 ? 'high' : 'medium',
        description: `${lowPerformingListings.length} listings need content optimization (images, titles, descriptions)`,
        potentialImprovement: 40, // Estimated improvement from content optimization
        confidence: 75,
        targetListings: lowPerformingListings.length
      });
    }

    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.potentialImprovement - a.potentialImprovement;
    });
  }

  private async countPendingJobs(userId: string): Promise<number> {
    const jobs = await this.getJobs(userId, { status: 'pending' });
    return jobs.length;
  }

  private async countActiveListings(userId: string): Promise<number> {
    const listings = await this.getListings(userId, { status: 'active' });
    return listings.length;
  }

  async getPerformanceTrends(userId: string, days: number, marketplace?: string): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    changePercent: number;
    confidence: number;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const analytics = await this.getPostingSuccessAnalytics(userId, { 
      startDate, 
      endDate, 
      marketplace 
    });

    if (analytics.length < 10) {
      return { trend: 'stable', strength: 0, changePercent: 0, confidence: 0 };
    }

    // Calculate trend using linear regression on success scores over time
    const dataPoints = analytics.map((record, index) => ({
      x: index,
      y: parseFloat(record.success_score || '0'),
      date: new Date(record.postedAt)
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
    const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumX2 = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for trend strength
    const avgY = sumY / n;
    const totalSumSquares = dataPoints.reduce((sum, point) => sum + Math.pow(point.y - avgY, 2), 0);
    const residualSumSquares = dataPoints.reduce((sum, point) => {
      const predicted = slope * point.x + intercept;
      return sum + Math.pow(point.y - predicted, 2);
    }, 0);

    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    const strength = Math.max(0, Math.min(100, rSquared * 100));

    // Determine trend direction
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.1) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Calculate percentage change from start to end
    const firstHalf = dataPoints.slice(0, Math.floor(n / 2));
    const secondHalf = dataPoints.slice(Math.floor(n / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, point) => sum + point.y, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, point) => sum + point.y, 0) / secondHalf.length;
    
    const changePercent = firstHalfAvg !== 0 
      ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
      : 0;

    const confidence = Math.min(95, 30 + (n * 2) + strength);

    return {
      trend,
      strength: Math.round(strength),
      changePercent: Math.round(changePercent * 100) / 100,
      confidence: Math.round(confidence)
    };
  }

  async getJobsForOptimization(userId: string, filters?: {
    status?: string;
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    marketplace?: string;
    canReschedule?: boolean;
  }): Promise<Job[]> {
    let jobs = await this.getJobs(userId, { status: filters?.status });
    
    if (filters?.scheduledAfter) {
      jobs = jobs.filter(job => 
        job.scheduledFor && new Date(job.scheduledFor) > filters.scheduledAfter!
      );
    }
    
    if (filters?.scheduledBefore) {
      jobs = jobs.filter(job => 
        job.scheduledFor && new Date(job.scheduledFor) < filters.scheduledBefore!
      );
    }
    
    if (filters?.marketplace) {
      jobs = jobs.filter(job => {
        const marketplaces = job.data?.marketplaces || [];
        return Array.isArray(marketplaces) && marketplaces.includes(filters.marketplace);
      });
    }
    
    if (filters?.canReschedule !== undefined) {
      jobs = jobs.filter(job => {
        // Jobs can be rescheduled if they're pending and scheduled for the future
        const canReschedule = job.status === 'pending' && 
          job.scheduledFor && 
          new Date(job.scheduledFor) > new Date();
        return canReschedule === filters.canReschedule;
      });
    }
    
    return jobs.sort((a, b) => {
      // Sort by scheduled time, earliest first
      if (a.scheduledFor && b.scheduledFor) {
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      }
      return 0;
    });
  }

  // Job Retry History methods
  async createJobRetryHistory(history: InsertJobRetryHistory): Promise<JobRetryHistory> {
    const id = randomUUID();
    const retryHistory: JobRetryHistory = {
      ...history,
      id,
      timestamp: new Date(),
    };
    this.jobRetryHistory.set(id, retryHistory);
    return retryHistory;
  }

  async getJobRetryHistory(jobId: string): Promise<JobRetryHistory[]> {
    return Array.from(this.jobRetryHistory.values())
      .filter(history => history.jobId === jobId)
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }

  // Circuit Breaker methods
  async getCircuitBreakerStatus(marketplace: string): Promise<CircuitBreakerStatus | undefined> {
    const existing = Array.from(this.circuitBreakerStatus.values()).find(status => status.marketplace === marketplace);
    if (existing) {
      return existing;
    }
    
    // Create default circuit breaker status if none exists
    const defaultStatus: CircuitBreakerStatus = {
      id: randomUUID(),
      marketplace,
      status: "closed",
      failureCount: 0,
      successCount: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      openedAt: null,
      nextRetryAt: null,
      failureThreshold: 5,
      recoveryThreshold: 3,
      timeoutMs: 60000,
      halfOpenMaxRequests: 3,
      currentHalfOpenRequests: 0,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.circuitBreakerStatus.set(defaultStatus.id, defaultStatus);
    return defaultStatus;
  }

  async updateCircuitBreaker(marketplace: string, updates: Partial<CircuitBreakerStatus>): Promise<CircuitBreakerStatus> {
    const existing = Array.from(this.circuitBreakerStatus.values()).find(status => status.marketplace === marketplace);
    if (!existing) {
      throw new Error('Circuit breaker status not found');
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.circuitBreakerStatus.set(existing.id, updated);
    return updated;
  }

  async getAllCircuitBreakerStatuses(): Promise<CircuitBreakerStatus[]> {
    return Array.from(this.circuitBreakerStatus.values());
  }

  async createCircuitBreakerStatus(status: InsertCircuitBreakerStatus): Promise<CircuitBreakerStatus> {
    const id = randomUUID();
    const circuitBreaker: CircuitBreakerStatus = {
      ...status,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.circuitBreakerStatus.set(id, circuitBreaker);
    return circuitBreaker;
  }

  // Dead Letter Queue methods
  async getDeadLetterQueueEntries(userId?: string, filters?: { resolutionStatus?: string; requiresManualReview?: boolean }): Promise<DeadLetterQueue[]> {
    let entries = Array.from(this.deadLetterQueue.values());
    
    if (userId) {
      entries = entries.filter(entry => entry.userId === userId);
    }
    if (filters?.resolutionStatus) {
      entries = entries.filter(entry => entry.resolutionStatus === filters.resolutionStatus);
    }
    if (filters?.requiresManualReview !== undefined) {
      entries = entries.filter(entry => entry.requiresManualReview === filters.requiresManualReview);
    }
    
    return entries.sort((a, b) => new Date(b.lastFailureAt).getTime() - new Date(a.lastFailureAt).getTime());
  }

  async createDeadLetterQueue(entry: InsertDeadLetterQueue): Promise<DeadLetterQueue> {
    const id = randomUUID();
    const dlqEntry: DeadLetterQueue = {
      ...entry,
      id,
      createdAt: new Date(),
    };
    this.deadLetterQueue.set(id, dlqEntry);
    return dlqEntry;
  }

  async updateDeadLetterQueueEntry(id: string, updates: Partial<DeadLetterQueue>): Promise<DeadLetterQueue> {
    const entry = this.deadLetterQueue.get(id);
    if (!entry) {
      throw new Error('Dead letter queue entry not found');
    }
    const updated = { ...entry, ...updates };
    this.deadLetterQueue.set(id, updated);
    return updated;
  }

  async getDeadLetterQueueStats(userId?: string): Promise<{ total: number; pending: number; resolved: number; requiresReview: number }> {
    let entries = Array.from(this.deadLetterQueue.values());
    
    if (userId) {
      entries = entries.filter(entry => entry.userId === userId);
    }
    
    return {
      total: entries.length,
      pending: entries.filter(entry => entry.resolutionStatus === 'pending').length,
      resolved: entries.filter(entry => entry.resolutionStatus === 'resolved').length,
      requiresReview: entries.filter(entry => entry.requiresManualReview).length,
    };
  }

  async cleanupOldEntries(olderThan: Date): Promise<number> {
    const entries = Array.from(this.deadLetterQueue.entries());
    let deletedCount = 0;
    
    for (const [id, entry] of entries) {
      if (entry.createdAt < olderThan && entry.resolutionStatus === 'resolved') {
        this.deadLetterQueue.delete(id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Retry Metrics methods
  async createRetryMetrics(metrics: InsertRetryMetrics): Promise<RetryMetrics> {
    const id = randomUUID();
    const retryMetrics: RetryMetrics = {
      ...metrics,
      id,
      jobId: metrics.jobId || randomUUID(),
      attemptNumber: metrics.attemptNumber || 1,
      outcome: metrics.outcome || "failure",
      retryDelay: metrics.retryDelay || null,
      processingTimeMs: metrics.processingTimeMs || null,
      timestamp: metrics.timestamp || new Date(),
      metadata: metrics.metadata || {},
    };
    this.retryMetrics.set(id, retryMetrics);
    return retryMetrics;
  }

  async getRetryMetrics(filters?: { marketplace?: string; jobType?: string; timeWindow?: Date }): Promise<RetryMetrics[]> {
    let metrics = Array.from(this.retryMetrics.values());
    
    if (filters?.marketplace) {
      metrics = metrics.filter(metric => metric.marketplace === filters.marketplace);
    }
    if (filters?.jobType) {
      metrics = metrics.filter(metric => metric.jobType === filters.jobType);
    }
    if (filters?.timeWindow) {
      const windowStart = new Date(filters.timeWindow);
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000); // 1 hour window
      metrics = metrics.filter(metric => 
        metric.timestamp >= windowStart && metric.timestamp < windowEnd
      );
    }
    
    return metrics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Failure Category methods
  async getFailureCategories(): Promise<FailureCategory[]> {
    return Array.from(this.failureCategories.values()).filter(category => category.isActive);
  }

  async getFailureCategory(category: string): Promise<FailureCategory | undefined> {
    return Array.from(this.failureCategories.values()).find(cat => cat.category === category);
  }

  async createFailureCategory(category: InsertFailureCategory): Promise<FailureCategory> {
    const id = randomUUID();
    const failureCategory: FailureCategory = {
      ...category,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.failureCategories.set(id, failureCategory);
    return failureCategory;
  }

  async updateFailureCategory(id: string, updates: Partial<FailureCategory>): Promise<FailureCategory> {
    const category = this.failureCategories.get(id);
    if (!category) {
      throw new Error('Failure category not found');
    }
    const updated = { ...category, ...updates, updatedAt: new Date() };
    this.failureCategories.set(id, updated);
    return updated;
  }

  // Marketplace Retry Config methods
  async getMarketplaceRetryConfig(marketplace: string): Promise<MarketplaceRetryConfig | undefined> {
    return Array.from(this.marketplaceRetryConfig.values()).find(config => config.marketplace === marketplace);
  }

  async createMarketplaceRetryConfig(config: InsertMarketplaceRetryConfig): Promise<MarketplaceRetryConfig> {
    const id = randomUUID();
    const retryConfig: MarketplaceRetryConfig = {
      ...config,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.marketplaceRetryConfig.set(id, retryConfig);
    return retryConfig;
  }

  async updateMarketplaceRetryConfig(marketplace: string, updates: Partial<MarketplaceRetryConfig>): Promise<MarketplaceRetryConfig> {
    const existing = Array.from(this.marketplaceRetryConfig.values()).find(config => config.marketplace === marketplace);
    if (!existing) {
      throw new Error('Marketplace retry config not found');
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.marketplaceRetryConfig.set(existing.id, updated);
    return updated;
  }

  // Cross-Platform Sync Job methods
  async getCrossPlatformSyncJobs(userId: string, filters?: { status?: string; syncType?: string; soldMarketplace?: string }): Promise<CrossPlatformSyncJob[]> {
    let jobs = Array.from(this.crossPlatformSyncJobs.values()).filter(job => job.userId === userId);
    
    if (filters?.status) {
      jobs = jobs.filter(job => job.status === filters.status);
    }
    if (filters?.syncType) {
      jobs = jobs.filter(job => job.syncType === filters.syncType);
    }
    if (filters?.soldMarketplace) {
      jobs = jobs.filter(job => job.soldMarketplace === filters.soldMarketplace);
    }
    
    return jobs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getCrossPlatformSyncJob(id: string): Promise<CrossPlatformSyncJob | undefined> {
    return this.crossPlatformSyncJobs.get(id);
  }

  async createCrossPlatformSyncJob(userId: string, job: InsertCrossPlatformSyncJob): Promise<CrossPlatformSyncJob> {
    const id = randomUUID();
    const syncJob: CrossPlatformSyncJob = {
      ...job,
      id,
      status: job.status || 'pending',
      totalMarketplaces: job.totalMarketplaces || 0,
      completedMarketplaces: job.completedMarketplaces || 0,
      failedMarketplaces: job.failedMarketplaces || 0,
      priority: job.priority || 5,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.crossPlatformSyncJobs.set(id, syncJob);
    return syncJob;
  }

  async updateCrossPlatformSyncJob(id: string, updates: Partial<CrossPlatformSyncJob>): Promise<CrossPlatformSyncJob> {
    const job = this.crossPlatformSyncJobs.get(id);
    if (!job) {
      throw new Error('Cross-platform sync job not found');
    }
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.crossPlatformSyncJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteCrossPlatformSyncJob(id: string): Promise<void> {
    this.crossPlatformSyncJobs.delete(id);
  }

  // Cross-Platform Sync History methods
  async getCrossPlatformSyncHistory(syncJobId?: string, userId?: string, filters?: { status?: string; targetMarketplace?: string; startDate?: Date; endDate?: Date }): Promise<CrossPlatformSyncHistory[]> {
    let history = Array.from(this.crossPlatformSyncHistory.values());
    
    if (syncJobId) {
      history = history.filter(entry => entry.syncJobId === syncJobId);
    }
    if (userId) {
      history = history.filter(entry => entry.userId === userId);
    }
    if (filters?.status) {
      history = history.filter(entry => entry.status === filters.status);
    }
    if (filters?.targetMarketplace) {
      history = history.filter(entry => entry.targetMarketplace === filters.targetMarketplace);
    }
    if (filters?.startDate) {
      history = history.filter(entry => entry.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      history = history.filter(entry => entry.createdAt <= filters.endDate!);
    }
    
    return history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createCrossPlatformSyncHistory(userId: string, history: InsertCrossPlatformSyncHistory): Promise<CrossPlatformSyncHistory> {
    const id = randomUUID();
    const syncHistory: CrossPlatformSyncHistory = {
      ...history,
      id,
      retryAttempt: history.retryAttempt || 0,
      maxRetries: history.maxRetries || 3,
      createdAt: new Date(),
    };
    this.crossPlatformSyncHistory.set(id, syncHistory);
    return syncHistory;
  }

  // Cross-Platform Sync Analytics methods
  async getCrossPlatformSyncStats(userId: string, days: number = 30): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    partialSyncs: number;
    avgSyncTime: number;
    topMarketplaces: Array<{ marketplace: string; count: number }>;
    recentSyncs: CrossPlatformSyncJob[];
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const syncJobs = Array.from(this.crossPlatformSyncJobs.values())
      .filter(job => job.userId === userId && job.createdAt >= startDate);

    const totalSyncs = syncJobs.length;
    const successfulSyncs = syncJobs.filter(job => job.status === 'completed').length;
    const failedSyncs = syncJobs.filter(job => job.status === 'failed').length;
    const partialSyncs = syncJobs.filter(job => job.status === 'partial').length;

    // Calculate average sync time for completed jobs
    const completedJobs = syncJobs.filter(job => job.actualDuration);
    const avgSyncTime = completedJobs.length > 0 
      ? completedJobs.reduce((sum, job) => sum + (job.actualDuration || 0), 0) / completedJobs.length 
      : 0;

    // Get top marketplaces from sync history
    const syncHistory = Array.from(this.crossPlatformSyncHistory.values())
      .filter(entry => entry.userId === userId && entry.createdAt >= startDate);
    
    const marketplaceCounts = new Map<string, number>();
    syncHistory.forEach(entry => {
      const current = marketplaceCounts.get(entry.targetMarketplace) || 0;
      marketplaceCounts.set(entry.targetMarketplace, current + 1);
    });

    const topMarketplaces = Array.from(marketplaceCounts.entries())
      .map(([marketplace, count]) => ({ marketplace, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent syncs
    const recentSyncs = syncJobs
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 10);

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      partialSyncs,
      avgSyncTime,
      topMarketplaces,
      recentSyncs
    };
  }

  // Webhook Configuration methods
  async getWebhookConfigurations(userId: string, marketplace?: string): Promise<WebhookConfiguration[]> {
    let configs = Array.from(this.webhookConfigurations.values()).filter(config => config.userId === userId);
    if (marketplace) {
      configs = configs.filter(config => config.marketplace === marketplace);
    }
    return configs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getWebhookConfiguration(userId: string, marketplace: string): Promise<WebhookConfiguration | undefined> {
    return Array.from(this.webhookConfigurations.values())
      .find(config => config.userId === userId && config.marketplace === marketplace);
  }

  async createWebhookConfiguration(userId: string, config: InsertWebhookConfiguration): Promise<WebhookConfiguration> {
    const id = randomUUID();
    const newConfig: WebhookConfiguration = {
      ...config,
      id,
      userId,
      isEnabled: true,
      verificationStatus: "pending",
      autoRegistered: false,
      errorCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.webhookConfigurations.set(id, newConfig);
    return newConfig;
  }

  async updateWebhookConfiguration(id: string, updates: Partial<WebhookConfiguration>): Promise<WebhookConfiguration> {
    const config = this.webhookConfigurations.get(id);
    if (!config) throw new Error("Webhook configuration not found");
    
    const updatedConfig = { ...config, ...updates, updatedAt: new Date() };
    this.webhookConfigurations.set(id, updatedConfig);
    return updatedConfig;
  }

  async deleteWebhookConfiguration(id: string): Promise<void> {
    this.webhookConfigurations.delete(id);
  }

  // Webhook Event methods
  async getWebhookEvents(userId?: string, filters?: { 
    marketplace?: string; 
    eventType?: string; 
    processingStatus?: string; 
    startDate?: Date; 
    endDate?: Date;
    listingId?: string;
    limit?: number;
  }): Promise<WebhookEvent[]> {
    let events = Array.from(this.webhookEvents.values());
    
    if (userId) {
      events = events.filter(event => event.userId === userId);
    }
    if (filters?.marketplace) {
      events = events.filter(event => event.marketplace === filters.marketplace);
    }
    if (filters?.eventType) {
      events = events.filter(event => event.eventType === filters.eventType);
    }
    if (filters?.processingStatus) {
      events = events.filter(event => event.processingStatus === filters.processingStatus);
    }
    if (filters?.listingId) {
      events = events.filter(event => event.listingId === filters.listingId);
    }
    if (filters?.startDate) {
      events = events.filter(event => event.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      events = events.filter(event => event.createdAt <= filters.endDate!);
    }

    // Sort by creation date (newest first)
    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (filters?.limit) {
      events = events.slice(0, filters.limit);
    }
    
    return events;
  }

  async getWebhookEvent(id: string): Promise<WebhookEvent | undefined> {
    return this.webhookEvents.get(id);
  }

  async getWebhookEventByExternalId(marketplace: string, eventId: string): Promise<WebhookEvent | undefined> {
    return Array.from(this.webhookEvents.values())
      .find(event => event.marketplace === marketplace && event.eventId === eventId);
  }

  async createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent> {
    const id = randomUUID();
    const newEvent: WebhookEvent = {
      ...event,
      id,
      signatureValid: false,
      processingStatus: "pending",
      processingAttempts: 0,
      maxRetries: 3,
      priority: 5,
      createdAt: new Date(),
    };
    this.webhookEvents.set(id, newEvent);
    return newEvent;
  }

  async updateWebhookEvent(id: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent> {
    const event = this.webhookEvents.get(id);
    if (!event) throw new Error("Webhook event not found");
    
    const updatedEvent = { ...event, ...updates };
    this.webhookEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteWebhookEvent(id: string): Promise<void> {
    this.webhookEvents.delete(id);
  }

  // Webhook Delivery methods
  async getWebhookDeliveries(webhookConfigId?: string, filters?: { 
    marketplace?: string; 
    successful?: boolean; 
    startDate?: Date; 
    endDate?: Date;
    limit?: number;
  }): Promise<WebhookDelivery[]> {
    let deliveries = Array.from(this.webhookDeliveries.values());
    
    if (webhookConfigId) {
      deliveries = deliveries.filter(delivery => delivery.webhookConfigId === webhookConfigId);
    }
    if (filters?.marketplace) {
      deliveries = deliveries.filter(delivery => delivery.marketplace === filters.marketplace);
    }
    if (filters?.successful !== undefined) {
      deliveries = deliveries.filter(delivery => delivery.successful === filters.successful);
    }
    if (filters?.startDate) {
      deliveries = deliveries.filter(delivery => delivery.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      deliveries = deliveries.filter(delivery => delivery.createdAt <= filters.endDate!);
    }

    // Sort by creation date (newest first)
    deliveries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (filters?.limit) {
      deliveries = deliveries.slice(0, filters.limit);
    }
    
    return deliveries;
  }

  async getWebhookDelivery(id: string): Promise<WebhookDelivery | undefined> {
    return this.webhookDeliveries.get(id);
  }

  async createWebhookDelivery(delivery: InsertWebhookDelivery): Promise<WebhookDelivery> {
    const id = randomUUID();
    const newDelivery: WebhookDelivery = {
      ...delivery,
      id,
      deliveryAttempt: 1,
      successful: false,
      retryCount: 0,
      maxRetries: 5,
      finalFailure: false,
      createdAt: new Date(),
    };
    this.webhookDeliveries.set(id, newDelivery);
    return newDelivery;
  }

  async updateWebhookDelivery(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    const delivery = this.webhookDeliveries.get(id);
    if (!delivery) throw new Error("Webhook delivery not found");
    
    const updatedDelivery = { ...delivery, ...updates };
    this.webhookDeliveries.set(id, updatedDelivery);
    return updatedDelivery;
  }

  // Polling Schedule methods
  async getPollingSchedules(userId: string, marketplace?: string): Promise<PollingSchedule[]> {
    let schedules = Array.from(this.pollingSchedules.values()).filter(schedule => schedule.userId === userId);
    if (marketplace) {
      schedules = schedules.filter(schedule => schedule.marketplace === marketplace);
    }
    return schedules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPollingSchedule(userId: string, marketplace: string): Promise<PollingSchedule | undefined> {
    return Array.from(this.pollingSchedules.values())
      .find(schedule => schedule.userId === userId && schedule.marketplace === marketplace);
  }

  async createPollingSchedule(userId: string, schedule: InsertPollingSchedule): Promise<PollingSchedule> {
    const id = randomUUID();
    const now = new Date();
    const newSchedule: PollingSchedule = {
      ...schedule,
      id,
      userId,
      isEnabled: true,
      pollingInterval: 300,
      nextPollAt: new Date(now.getTime() + 300000), // 5 minutes from now
      consecutiveFailures: 0,
      maxFailures: 10,
      adaptivePolling: true,
      minInterval: 60,
      maxInterval: 3600,
      currentInterval: 300,
      salesDetectedSinceLastPoll: 0,
      errorCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.pollingSchedules.set(id, newSchedule);
    return newSchedule;
  }

  async updatePollingSchedule(id: string, updates: Partial<PollingSchedule>): Promise<PollingSchedule> {
    const schedule = this.pollingSchedules.get(id);
    if (!schedule) throw new Error("Polling schedule not found");
    
    const updatedSchedule = { ...schedule, ...updates, updatedAt: new Date() };
    this.pollingSchedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deletePollingSchedule(id: string): Promise<void> {
    this.pollingSchedules.delete(id);
  }

  async getPollingSchedulesDueForPoll(): Promise<PollingSchedule[]> {
    const now = new Date();
    return Array.from(this.pollingSchedules.values())
      .filter(schedule => 
        schedule.isEnabled && 
        schedule.nextPollAt && 
        schedule.nextPollAt <= now &&
        schedule.consecutiveFailures < schedule.maxFailures
      )
      .sort((a, b) => a.nextPollAt!.getTime() - b.nextPollAt!.getTime());
  }

  // Webhook Health Metrics methods
  async getWebhookHealthMetrics(marketplace?: string, timeWindow?: Date): Promise<WebhookHealthMetrics[]> {
    let metrics = Array.from(this.webhookHealthMetrics.values());
    
    if (marketplace) {
      metrics = metrics.filter(metric => metric.marketplace === marketplace);
    }
    if (timeWindow) {
      metrics = metrics.filter(metric => metric.timeWindow.getTime() === timeWindow.getTime());
    }
    
    return metrics.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createWebhookHealthMetrics(metrics: InsertWebhookHealthMetrics): Promise<WebhookHealthMetrics> {
    const id = randomUUID();
    const newMetrics: WebhookHealthMetrics = {
      ...metrics,
      id,
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      duplicateEvents: 0,
      averageProcessingTime: "0",
      maxProcessingTime: 0,
      minProcessingTime: 0,
      signatureFailures: 0,
      rateLimitHits: 0,
      retryCount: 0,
      syncJobsTriggered: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      healthScore: "100",
      uptime: "100",
      createdAt: new Date(),
    };
    this.webhookHealthMetrics.set(id, newMetrics);
    return newMetrics;
  }

  async updateWebhookHealthMetrics(id: string, updates: Partial<WebhookHealthMetrics>): Promise<WebhookHealthMetrics> {
    const metrics = this.webhookHealthMetrics.get(id);
    if (!metrics) throw new Error("Webhook health metrics not found");
    
    const updatedMetrics = { ...metrics, ...updates };
    this.webhookHealthMetrics.set(id, updatedMetrics);
    return updatedMetrics;
  }

  async getWebhookHealthSummary(marketplace?: string, hours: number = 24): Promise<{
    totalEvents: number;
    successRate: number;
    averageProcessingTime: number;
    healthScore: number;
    uptime: number;
  }> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    let metrics = Array.from(this.webhookHealthMetrics.values())
      .filter(metric => metric.createdAt >= startTime);
    
    if (marketplace) {
      metrics = metrics.filter(metric => metric.marketplace === marketplace);
    }

    const totalEvents = metrics.reduce((sum, metric) => sum + metric.totalEvents, 0);
    const successfulEvents = metrics.reduce((sum, metric) => sum + metric.successfulEvents, 0);
    const failedEvents = metrics.reduce((sum, metric) => sum + metric.failedEvents, 0);
    
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 100;
    
    const avgProcessingTimes = metrics
      .map(metric => parseFloat(metric.averageProcessingTime.toString()))
      .filter(time => time > 0);
    const averageProcessingTime = avgProcessingTimes.length > 0 
      ? avgProcessingTimes.reduce((sum, time) => sum + time, 0) / avgProcessingTimes.length 
      : 0;
    
    const healthScores = metrics
      .map(metric => parseFloat(metric.healthScore.toString()))
      .filter(score => score > 0);
    const healthScore = healthScores.length > 0 
      ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length 
      : 100;
    
    const uptimes = metrics
      .map(metric => parseFloat(metric.uptime.toString()));
    const uptime = uptimes.length > 0 
      ? uptimes.reduce((sum, uptime) => sum + uptime, 0) / uptimes.length 
      : 100;

    return {
      totalEvents,
      successRate,
      averageProcessingTime,
      healthScore,
      uptime
    };
  }

  // Batch methods
  async getBatches(userId: string, filters?: { status?: string; type?: string }): Promise<Batch[]> {
    let batches = Array.from(this.batches.values()).filter(batch => batch.userId === userId);
    
    if (filters?.status) {
      batches = batches.filter(batch => batch.status === filters.status);
    }
    if (filters?.type) {
      batches = batches.filter(batch => batch.type === filters.type);
    }
    
    return batches.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getBatch(id: string): Promise<Batch | undefined> {
    return this.batches.get(id);
  }

  async createBatch(userId: string, batch: InsertBatch): Promise<Batch> {
    const id = randomUUID();
    const newBatch: Batch = {
      ...batch,
      id,
      userId,
      status: batch.status || 'pending',
      totalItems: batch.totalItems || 0,
      processedItems: batch.processedItems || 0,
      successfulItems: batch.successfulItems || 0,
      failedItems: batch.failedItems || 0,
      progress: batch.progress || 0,
      startedAt: null,
      completedAt: null,
      errorSummary: batch.errorSummary || null,
      metadata: batch.metadata || {},
      retryPolicy: batch.retryPolicy || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.batches.set(id, newBatch);
    return newBatch;
  }

  async updateBatch(id: string, updates: Partial<Batch>): Promise<Batch> {
    const batch = this.batches.get(id);
    if (!batch) throw new Error('Batch not found');
    
    const updatedBatch = { ...batch, ...updates, updatedAt: new Date() };
    this.batches.set(id, updatedBatch);
    return updatedBatch;
  }

  async deleteBatch(id: string): Promise<void> {
    this.batches.delete(id);
  }

  async getBatchesByStatus(status: string, userId?: string): Promise<Batch[]> {
    let batches = Array.from(this.batches.values()).filter(batch => batch.status === status);
    if (userId) {
      batches = batches.filter(batch => batch.userId === userId);
    }
    return batches.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getBatchProgress(id: string): Promise<{ 
    totalItems: number; 
    processedItems: number; 
    successfulItems: number; 
    failedItems: number; 
    progress: number 
  }> {
    const batch = this.batches.get(id);
    if (!batch) throw new Error('Batch not found');
    
    return {
      totalItems: batch.totalItems || 0,
      processedItems: batch.processedItems || 0,
      successfulItems: batch.successfulItems || 0,
      failedItems: batch.failedItems || 0,
      progress: batch.progress || 0
    };
  }

  // Batch Item methods
  async getBatchItems(batchId: string, filters?: { status?: string }): Promise<BatchItem[]> {
    let items = Array.from(this.batchItems.values()).filter(item => item.batchId === batchId);
    
    if (filters?.status) {
      items = items.filter(item => item.status === filters.status);
    }
    
    return items.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getBatchItem(id: string): Promise<BatchItem | undefined> {
    return this.batchItems.get(id);
  }

  async createBatchItem(batchItem: InsertBatchItem): Promise<BatchItem> {
    const id = randomUUID();
    const newItem: BatchItem = {
      ...batchItem,
      id,
      status: batchItem.status || 'pending',
      attempts: batchItem.attempts || 0,
      maxAttempts: batchItem.maxAttempts || 3,
      errorMessage: batchItem.errorMessage || null,
      processedAt: null,
      retryAt: batchItem.retryAt || null,
      metadata: batchItem.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.batchItems.set(id, newItem);
    return newItem;
  }

  async updateBatchItem(id: string, updates: Partial<BatchItem>): Promise<BatchItem> {
    const item = this.batchItems.get(id);
    if (!item) throw new Error('Batch item not found');
    
    const updatedItem = { ...item, ...updates, updatedAt: new Date() };
    this.batchItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteBatchItem(id: string): Promise<void> {
    this.batchItems.delete(id);
  }

  async createBatchItems(batchItems: InsertBatchItem[]): Promise<BatchItem[]> {
    const createdItems: BatchItem[] = [];
    for (const item of batchItems) {
      const created = await this.createBatchItem(item);
      createdItems.push(created);
    }
    return createdItems;
  }

  async updateBatchItemsStatus(batchId: string, status: string, filters?: { currentStatus?: string }): Promise<void> {
    const items = await this.getBatchItems(batchId, filters);
    for (const item of items) {
      await this.updateBatchItem(item.id, { status });
    }
  }

  // Bulk Upload methods
  async getBulkUploads(userId: string, filters?: { status?: string; uploadType?: string }): Promise<BulkUpload[]> {
    let uploads = Array.from(this.bulkUploads.values()).filter(upload => upload.userId === userId);
    
    if (filters?.status) {
      uploads = uploads.filter(upload => upload.status === filters.status);
    }
    if (filters?.uploadType) {
      uploads = uploads.filter(upload => upload.uploadType === filters.uploadType);
    }
    
    return uploads.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getBulkUpload(id: string): Promise<BulkUpload | undefined> {
    return this.bulkUploads.get(id);
  }

  async createBulkUpload(userId: string, upload: InsertBulkUpload): Promise<BulkUpload> {
    const id = randomUUID();
    const newUpload: BulkUpload = {
      ...upload,
      id,
      userId,
      status: upload.status || 'pending',
      totalRows: upload.totalRows || 0,
      processedRows: upload.processedRows || 0,
      successfulRows: upload.successfulRows || 0,
      failedRows: upload.failedRows || 0,
      progress: upload.progress || 0,
      startedAt: null,
      completedAt: null,
      errorReport: upload.errorReport || null,
      validationResults: upload.validationResults || {},
      mappingConfig: upload.mappingConfig || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bulkUploads.set(id, newUpload);
    return newUpload;
  }

  async updateBulkUpload(id: string, updates: Partial<BulkUpload>): Promise<BulkUpload> {
    const upload = this.bulkUploads.get(id);
    if (!upload) throw new Error('Bulk upload not found');
    
    const updatedUpload = { ...upload, ...updates, updatedAt: new Date() };
    this.bulkUploads.set(id, updatedUpload);
    return updatedUpload;
  }

  async deleteBulkUpload(id: string): Promise<void> {
    this.bulkUploads.delete(id);
  }

  // Batch Template methods
  async getBatchTemplates(userId: string, filters?: { type?: string; isPublic?: boolean }): Promise<BatchTemplate[]> {
    let templates = Array.from(this.batchTemplates.values()).filter(
      template => template.userId === userId || template.isPublic
    );
    
    if (filters?.type) {
      templates = templates.filter(template => template.type === filters.type);
    }
    if (filters?.isPublic !== undefined) {
      templates = templates.filter(template => template.isPublic === filters.isPublic);
    }
    
    return templates.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getBatchTemplate(id: string): Promise<BatchTemplate | undefined> {
    return this.batchTemplates.get(id);
  }

  async createBatchTemplate(userId: string, template: InsertBatchTemplate): Promise<BatchTemplate> {
    const id = randomUUID();
    const newTemplate: BatchTemplate = {
      ...template,
      id,
      userId,
      isPublic: template.isPublic || false,
      usageCount: 0,
      templateData: template.templateData || {},
      validationRules: template.validationRules || {},
      defaultSettings: template.defaultSettings || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.batchTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateBatchTemplate(id: string, updates: Partial<BatchTemplate>): Promise<BatchTemplate> {
    const template = this.batchTemplates.get(id);
    if (!template) throw new Error('Batch template not found');
    
    const updatedTemplate = { ...template, ...updates, updatedAt: new Date() };
    this.batchTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteBatchTemplate(id: string): Promise<void> {
    this.batchTemplates.delete(id);
  }

  async getDefaultBatchTemplates(type: string): Promise<BatchTemplate[]> {
    return Array.from(this.batchTemplates.values())
      .filter(template => template.type === type && template.isPublic)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    const template = this.batchTemplates.get(id);
    if (template) {
      await this.updateBatchTemplate(id, { 
        usageCount: (template.usageCount || 0) + 1 
      });
    }
  }

  // Batch Analytics methods
  async getBatchAnalytics(batchId: string, marketplace?: string): Promise<BatchAnalytics[]> {
    let analytics = Array.from(this.batchAnalytics.values()).filter(
      analytics => analytics.batchId === batchId
    );
    
    if (marketplace) {
      analytics = analytics.filter(analytics => analytics.marketplace === marketplace);
    }
    
    return analytics.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createBatchAnalytics(userId: string, analytics: InsertBatchAnalytics): Promise<BatchAnalytics> {
    const id = randomUUID();
    const newAnalytics: BatchAnalytics = {
      ...analytics,
      id,
      userId,
      metrics: analytics.metrics || {},
      performanceData: analytics.performanceData || {},
      errorAnalysis: analytics.errorAnalysis || {},
      costAnalysis: analytics.costAnalysis || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.batchAnalytics.set(id, newAnalytics);
    return newAnalytics;
  }

  async updateBatchAnalytics(id: string, updates: Partial<BatchAnalytics>): Promise<BatchAnalytics> {
    const analytics = this.batchAnalytics.get(id);
    if (!analytics) throw new Error('Batch analytics not found');
    
    const updatedAnalytics = { ...analytics, ...updates, updatedAt: new Date() };
    this.batchAnalytics.set(id, updatedAnalytics);
    return updatedAnalytics;
  }

  async getBatchPerformanceStats(userId: string, filters?: { 
    dateStart?: Date; 
    dateEnd?: Date; 
    marketplace?: string; 
    type?: string 
  }): Promise<Array<{
    batchId: string;
    batchName: string;
    type: string;
    successRate: number;
    avgProcessingTime: number;
    totalItems: number;
    costEfficiency: number;
  }>> {
    let batches = Array.from(this.batches.values()).filter(batch => batch.userId === userId);
    
    if (filters?.dateStart) {
      batches = batches.filter(batch => 
        batch.createdAt && batch.createdAt >= filters.dateStart!
      );
    }
    if (filters?.dateEnd) {
      batches = batches.filter(batch => 
        batch.createdAt && batch.createdAt <= filters.dateEnd!
      );
    }
    if (filters?.type) {
      batches = batches.filter(batch => batch.type === filters.type);
    }
    
    return batches.map(batch => ({
      batchId: batch.id,
      batchName: batch.name,
      type: batch.type,
      successRate: batch.totalItems ? 
        ((batch.successfulItems || 0) / batch.totalItems) * 100 : 0,
      avgProcessingTime: batch.startedAt && batch.completedAt ? 
        batch.completedAt.getTime() - batch.startedAt.getTime() : 0,
      totalItems: batch.totalItems || 0,
      costEfficiency: 100 // Mock value
    }));
  }

  // Batch Queue methods
  async getBatchQueue(filters?: { priority?: number; status?: string }): Promise<BatchQueue[]> {
    let queue = Array.from(this.batchQueue.values());
    
    if (filters?.priority) {
      queue = queue.filter(entry => entry.priority === filters.priority);
    }
    if (filters?.status) {
      queue = queue.filter(entry => entry.status === filters.status);
    }
    
    return queue.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }

  async getBatchQueueEntry(batchId: string): Promise<BatchQueue | undefined> {
    return Array.from(this.batchQueue.values()).find(entry => entry.batchId === batchId);
  }

  async createBatchQueueEntry(entry: InsertBatchQueue): Promise<BatchQueue> {
    const id = randomUUID();
    const newEntry: BatchQueue = {
      ...entry,
      id,
      status: entry.status || 'queued',
      priority: entry.priority || 5,
      estimatedStartTime: entry.estimatedStartTime || null,
      actualStartTime: null,
      dependencies: entry.dependencies || [],
      resourceRequirements: entry.resourceRequirements || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.batchQueue.set(id, newEntry);
    return newEntry;
  }

  async updateBatchQueueEntry(batchId: string, updates: Partial<BatchQueue>): Promise<BatchQueue> {
    const entry = await this.getBatchQueueEntry(batchId);
    if (!entry) throw new Error('Batch queue entry not found');
    
    const updatedEntry = { ...entry, ...updates, updatedAt: new Date() };
    this.batchQueue.set(entry.id, updatedEntry);
    return updatedEntry;
  }

  async deleteBatchQueueEntry(batchId: string): Promise<void> {
    const entry = await this.getBatchQueueEntry(batchId);
    if (entry) {
      this.batchQueue.delete(entry.id);
    }
  }

  async getNextBatchForProcessing(): Promise<BatchQueue | undefined> {
    const queue = await this.getBatchQueue({ status: 'queued' });
    return queue.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))[0];
  }

  async updateQueuePositions(): Promise<void> {
    // Mock implementation - in real implementation this would update queue positions
    // based on priority and dependencies
  }

  // Failure Category methods
  async getFailureCategories(): Promise<FailureCategory[]> {
    return Array.from(this.failureCategories.values())
      .sort((a, b) => (a.severity || 0) - (b.severity || 0));
  }

  async getFailureCategory(category: string): Promise<FailureCategory | undefined> {
    return Array.from(this.failureCategories.values())
      .find(fc => fc.category === category);
  }

  async createFailureCategory(category: InsertFailureCategory): Promise<FailureCategory> {
    const id = randomUUID();
    const newCategory: FailureCategory = {
      ...category,
      id,
      isRetryable: category.isRetryable || false,
      severity: category.severity || 5,
      retrySettings: category.retrySettings || {},
      escalationRules: category.escalationRules || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.failureCategories.set(id, newCategory);
    return newCategory;
  }

  async updateFailureCategory(id: string, updates: Partial<FailureCategory>): Promise<FailureCategory> {
    const category = this.failureCategories.get(id);
    if (!category) throw new Error('Failure category not found');
    
    const updatedCategory = { ...category, ...updates, updatedAt: new Date() };
    this.failureCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  // Marketplace Retry Config methods
  async getMarketplaceRetryConfig(marketplace: string): Promise<MarketplaceRetryConfig | undefined> {
    return Array.from(this.marketplaceRetryConfig.values())
      .find(config => config.marketplace === marketplace);
  }

  async createMarketplaceRetryConfig(config: InsertMarketplaceRetryConfig): Promise<MarketplaceRetryConfig> {
    const id = randomUUID();
    const newConfig: MarketplaceRetryConfig = {
      ...config,
      id,
      isActive: config.isActive || true,
      maxRetries: config.maxRetries || 3,
      backoffStrategy: config.backoffStrategy || 'exponential',
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      jitterEnabled: config.jitterEnabled || true,
      retryConditions: config.retryConditions || {},
      circuitBreakerSettings: config.circuitBreakerSettings || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.marketplaceRetryConfig.set(id, newConfig);
    return newConfig;
  }

  async updateMarketplaceRetryConfig(marketplace: string, updates: Partial<MarketplaceRetryConfig>): Promise<MarketplaceRetryConfig> {
    const config = await this.getMarketplaceRetryConfig(marketplace);
    if (!config) throw new Error('Marketplace retry config not found');
    
    const updatedConfig = { ...config, ...updates, updatedAt: new Date() };
    this.marketplaceRetryConfig.set(config.id, updatedConfig);
    return updatedConfig;
  }

  // Retry Metrics methods
  async getRetryMetrics(filters?: { marketplace?: string; jobType?: string; timeWindow?: Date }): Promise<RetryMetrics[]> {
    let metrics = Array.from(this.retryMetrics.values());
    
    if (filters?.marketplace) {
      metrics = metrics.filter(metric => metric.marketplace === filters.marketplace);
    }
    if (filters?.jobType) {
      metrics = metrics.filter(metric => metric.jobType === filters.jobType);
    }
    if (filters?.timeWindow) {
      metrics = metrics.filter(metric => 
        metric.timeWindow && metric.timeWindow.getTime() === filters.timeWindow!.getTime()
      );
    }
    
    return metrics.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }
}

// Use DatabaseStorage for persistent data instead of MemStorage
import { DatabaseStorage } from "./storage-db";
export const storage = new DatabaseStorage();
