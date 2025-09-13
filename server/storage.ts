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
  type QueueDistribution, type InsertQueueDistribution
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
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

  async getUser(id: string): Promise<User | undefined> {
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
      lastSyncAt: null,
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
    
    return listings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
      .sort((a, b) => a.priority - b.priority);
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
    
    return conflicts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
      .sort((a, b) => b.delistedAt.getTime() - a.delistedAt.getTime());
    
    return limit ? history.slice(0, limit) : history;
  }

  async createAutoDelistHistory(userId: string, insertHistory: InsertAutoDelistHistory): Promise<AutoDelistHistory> {
    const id = randomUUID();
    const history: AutoDelistHistory = {
      ...insertHistory,
      id,
      userId,
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
      timestamp: new Date(),
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
      events = events.filter(event => new Date(event.timestamp) >= filters.startDate!);
    }
    if (filters?.endDate) {
      events = events.filter(event => new Date(event.timestamp) <= filters.endDate!);
    }
    
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Sales Metrics methods
  async createSalesMetrics(userId: string, metrics: InsertSalesMetrics): Promise<SalesMetrics> {
    const id = randomUUID();
    const salesMetrics: SalesMetrics = {
      ...metrics,
      id,
      userId,
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
      metrics = metrics.filter(metric => new Date(metric.soldAt) >= filters.startDate!);
    }
    if (filters?.endDate) {
      metrics = metrics.filter(metric => new Date(metric.soldAt) <= filters.endDate!);
    }
    
    return metrics.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  }

  // Inventory Metrics methods
  async createInventoryMetrics(userId: string, metrics: InsertInventoryMetrics): Promise<InventoryMetrics> {
    const id = randomUUID();
    const inventoryMetrics: InventoryMetrics = {
      ...metrics,
      id,
      userId,
      listDate: metrics.listDate || new Date(),
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
    
    return metrics.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
    
    return metrics.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
    
    // Check and reset billing cycle if needed
    await this.checkAndResetBillingCycle(userId);
    
    // Unlimited plan has no limits
    if (user.plan === 'unlimited' || user.listingCredits === null) {
      return true;
    }
    
    // Check if user has credits remaining
    return (user.listingsUsedThisMonth || 0) < (user.listingCredits || 10);
  }

  async incrementListingUsage(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    
    await this.updateUser(userId, {
      listingsUsedThisMonth: (user.listingsUsedThisMonth || 0) + 1
    });
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    await this.updateUser(userId, {
      listingsUsedThisMonth: 0,
      billingCycleStart: new Date()
    });
  }

  async checkAndResetBillingCycle(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    
    const cycleStart = user.billingCycleStart || new Date();
    const now = new Date();
    const monthsSince = (now.getFullYear() - cycleStart.getFullYear()) * 12 + 
                       (now.getMonth() - cycleStart.getMonth());
    
    // Reset if a month has passed
    if (monthsSince >= 1) {
      await this.resetMonthlyUsage(userId);
    }
  }

  // Smart Scheduling method implementations
  
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

  async getPostingSuccessAnalytics(userId: string, filters?: { marketplace?: string; startDate?: Date; endDate?: Date; category?: string }): Promise<PostingSuccessAnalytics[]> {
    let analytics = Array.from(this.postingSuccessAnalytics.values()).filter(record => record.userId === userId);
    
    if (filters?.marketplace) {
      analytics = analytics.filter(record => record.marketplace === filters.marketplace);
    }
    if (filters?.category) {
      analytics = analytics.filter(record => record.category === filters.category);
    }
    if (filters?.startDate) {
      analytics = analytics.filter(record => new Date(record.postedAt) >= filters.startDate!);
    }
    if (filters?.endDate) {
      analytics = analytics.filter(record => new Date(record.postedAt) <= filters.endDate!);
    }
    
    return analytics.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
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

  // Rate Limit Tracker methods
  async getRateLimitTracker(marketplace: string, windowType: string): Promise<RateLimitTracker | undefined> {
    return Array.from(this.rateLimitTrackers.values()).find(tracker => 
      tracker.marketplace === marketplace && tracker.windowType === windowType
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

  async updateRateLimitTracker(id: string, updates: Partial<RateLimitTracker>): Promise<RateLimitTracker> {
    const tracker = this.rateLimitTrackers.get(id);
    if (!tracker) {
      throw new Error('Rate limit tracker not found');
    }
    const updated = { ...tracker, ...updates };
    this.rateLimitTrackers.set(id, updated);
    return updated;
  }

  async getCurrentRateLimits(marketplaces: string[]): Promise<Record<string, RateLimitTracker | null>> {
    const rateLimits: Record<string, RateLimitTracker | null> = {};
    const now = new Date();
    
    for (const marketplace of marketplaces) {
      // Get most recent hourly rate limit for this marketplace
      const hourlyTracker = Array.from(this.rateLimitTrackers.values())
        .filter(tracker => 
          tracker.marketplace === marketplace && 
          tracker.windowType === 'hourly' &&
          tracker.timeWindow.getTime() <= now.getTime()
        )
        .sort((a, b) => new Date(b.timeWindow).getTime() - new Date(a.timeWindow).getTime())[0];
      
      rateLimits[marketplace] = hourlyTracker || null;
    }
    
    return rateLimits;
  }

  // Queue Distribution methods
  async getQueueDistribution(timeSlot: Date, marketplace?: string): Promise<QueueDistribution[]> {
    let distributions = Array.from(this.queueDistributions.values())
      .filter(dist => dist.timeSlot.getTime() === timeSlot.getTime());
    
    if (marketplace) {
      distributions = distributions.filter(dist => dist.marketplace === marketplace);
    }
    
    return distributions.filter(dist => dist.isAvailable);
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
    return Array.from(this.queueDistributions.values())
      .filter(dist => 
        dist.marketplace === marketplace &&
        dist.isAvailable &&
        dist.timeSlot >= startTime &&
        dist.timeSlot <= endTime &&
        dist.scheduledJobs < dist.maxCapacity
      )
      .sort((a, b) => a.timeSlot.getTime() - b.timeSlot.getTime());
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
}

// Use DatabaseStorage for persistent data instead of MemStorage
import { DatabaseStorage } from "./storage-db";
export const storage = new DatabaseStorage();
