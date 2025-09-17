import { 
  users, type User, type InsertUser,
  marketplaceConnections, type MarketplaceConnection, type InsertMarketplaceConnection,
  listings, type Listing, type InsertListing,
  listingPosts, type ListingPost, type InsertListingPost,
  jobs, type Job, type InsertJob,
  auditLogs, type AuditLog,
  syncSettings, type SyncSettings, type InsertSyncSettings,
  syncRules, type SyncRule, type InsertSyncRule,
  syncHistory, type SyncHistory, type InsertSyncHistory,
  syncConflicts, type SyncConflict, type InsertSyncConflict,
  autoDelistRules, type AutoDelistRule, type InsertAutoDelistRule,
  autoDelistHistory, type AutoDelistHistory, type InsertAutoDelistHistory,
  onboardingProgress, type OnboardingProgress, type InsertOnboardingProgress,
  analyticsEvents, type AnalyticsEvent, type InsertAnalyticsEvent,
  salesMetrics, type SalesMetrics, type InsertSalesMetrics,
  inventoryMetrics, type InventoryMetrics, type InsertInventoryMetrics,
  marketplaceMetrics, type MarketplaceMetrics, type InsertMarketplaceMetrics,
  marketplacePostingRules, type MarketplacePostingRules, type InsertMarketplacePostingRules,
  postingSuccessAnalytics, type PostingSuccessAnalytics, type InsertPostingSuccessAnalytics,
  rateLimitTracker, type RateLimitTracker, type InsertRateLimitTracker,
  queueDistribution, type QueueDistribution, type InsertQueueDistribution,
  jobRetryHistory, type JobRetryHistory, type InsertJobRetryHistory,
  circuitBreakerStatus, type CircuitBreakerStatus, type InsertCircuitBreakerStatus,
  deadLetterQueue, type DeadLetterQueue, type InsertDeadLetterQueue,
  retryMetrics, type RetryMetrics, type InsertRetryMetrics,
  failureCategories, type FailureCategory, type InsertFailureCategory,
  marketplaceRetryConfig, type MarketplaceRetryConfig, type InsertMarketplaceRetryConfig,
  batches, type Batch, type InsertBatch,
  batchItems, type BatchItem, type InsertBatchItem,
  bulkUploads, type BulkUpload, type InsertBulkUpload,
  batchTemplates, type BatchTemplate, type InsertBatchTemplate,
  batchAnalytics, type BatchAnalytics, type InsertBatchAnalytics,
  batchQueue, type BatchQueue, type InsertBatchQueue,
  crossPlatformSyncJobs, type CrossPlatformSyncJob, type InsertCrossPlatformSyncJob,
  crossPlatformSyncHistory, type CrossPlatformSyncHistory, type InsertCrossPlatformSyncHistory,
  webhookConfigurations, type WebhookConfiguration, type InsertWebhookConfiguration,
  webhookEvents, type WebhookEvent, type InsertWebhookEvent,
  webhookDeliveries, type WebhookDelivery, type InsertWebhookDelivery,
  pollingSchedules, type PollingSchedule, type InsertPollingSchedule,
  webhookHealthMetrics, type WebhookHealthMetrics, type InsertWebhookHealthMetrics
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, isNull, sql } from "drizzle-orm";
import { type IStorage } from "./storage";
import { randomUUID } from "crypto";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        id: randomUUID(),
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
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    return this.updateUser(id, { stripeCustomerId, stripeSubscriptionId });
  }

  // Job methods
  async getUserJobs(userId: string, filters?: { status?: string; type?: string }): Promise<Job[]> {
    let query = db.select().from(jobs).where(eq(jobs.userId, userId));
    
    if (filters?.status) {
      query = query.where(eq(jobs.status, filters.status));
    }
    if (filters?.type) {
      query = query.where(eq(jobs.type, filters.type));
    }
    
    const results = await query.orderBy(desc(jobs.createdAt));
    return results;
  }

  // Performance Analytics methods
  async getPerformanceByTimeSlot(userId: string, marketplace?: string): Promise<Array<{
    timeSlot: string;
    avgSuccessScore: number;
    totalPosts: number;
    sampleSize: number;
  }>> {
    // Mock implementation for now - in real implementation this would query analytics
    return [];
  }

  async getPerformanceByPriceRange(userId: string, marketplace?: string): Promise<Array<{
    priceRange: string;
    avgSuccessScore: number;
    conversionRate: number;
    totalListings: number;
    avgDaysToSell: number;
    sampleSize: number;
  }>> {
    // Mock implementation for now - in real implementation this would query analytics
    return [];
  }

  async getPerformanceByCategory(userId: string, marketplace?: string): Promise<Array<{
    category: string;
    avgSuccessScore: number;
    conversionRate: number;
    avgEngagement: number;
    totalPosts: number;
    salesCount: number;
  }>> {
    // Mock implementation for now - in real implementation this would query analytics
    return [];
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
    // Mock implementation for now - in real implementation this would query analytics
    return [];
  }

  async getEngagementCorrelations(userId: string, marketplace?: string): Promise<Array<{
    variable1: string;
    variable2: string;
    correlation: number;
    sampleSize: number;
  }>> {
    // Mock implementation for now - in real implementation this would query analytics
    return [];
  }

  async getTimeSeriesData(userId: string, metric: string, groupBy: 'day' | 'week' | 'month', marketplace?: string, category?: string): Promise<Array<{
    date: string;
    value: number;
    count: number;
  }>> {
    // Mock implementation for now - in real implementation this would query analytics
    return [];
  }

  async getSeasonalPatterns(userId: string, marketplace?: string): Promise<Array<{
    month: number;
    dayOfWeek: number;
    avgPerformance: number;
    sampleSize: number;
  }>> {
    // Mock implementation for now - in real implementation this would query analytics
    return [];
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
    // Mock implementation for now - in real implementation this would query analytics
    return [];
  }

  async getOptimizationOpportunities(userId: string): Promise<Array<{
    type: 'timing' | 'pricing' | 'marketplace' | 'content';
    priority: 'high' | 'medium' | 'low';
    description: string;
    potentialImprovement: number;
    confidence: number;
    targetListings: number;
  }>> {
    // Mock implementation for now - in real implementation this would query analytics
    return [];
  }

  async getPerformanceTrends(userId: string, days: number, marketplace?: string): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    changePercent: number;
    confidence: number;
  }> {
    // Mock implementation for now - in real implementation this would query analytics
    return { trend: 'stable', strength: 0, changePercent: 0, confidence: 0 };
  }

  async getJobsForOptimization(userId: string, filters?: {
    status?: string;
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    marketplace?: string;
    canReschedule?: boolean;
  }): Promise<Job[]> {
    let query = db.select().from(jobs).where(eq(jobs.userId, userId));
    
    if (filters?.status) {
      query = query.where(eq(jobs.status, filters.status));
    }
    
    const results = await query.orderBy(desc(jobs.createdAt));
    return results;
  }

  // Marketplace Connection methods
  async getMarketplaceConnections(userId: string): Promise<MarketplaceConnection[]> {
    return await db.select().from(marketplaceConnections).where(eq(marketplaceConnections.userId, userId));
  }

  async getMarketplaceConnection(userId: string, marketplace: string): Promise<MarketplaceConnection | undefined> {
    const [conn] = await db
      .select()
      .from(marketplaceConnections)
      .where(and(
        eq(marketplaceConnections.userId, userId),
        eq(marketplaceConnections.marketplace, marketplace)
      ));
    return conn || undefined;
  }

  async createMarketplaceConnection(userId: string, connection: InsertMarketplaceConnection): Promise<MarketplaceConnection> {
    const [conn] = await db
      .insert(marketplaceConnections)
      .values({
        ...connection,
        id: randomUUID(),
        userId,
        isConnected: true,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return conn;
  }

  async updateMarketplaceConnection(id: string, updates: Partial<MarketplaceConnection>): Promise<MarketplaceConnection> {
    const [conn] = await db
      .update(marketplaceConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketplaceConnections.id, id))
      .returning();
    if (!conn) throw new Error("Marketplace connection not found");
    return conn;
  }

  async deleteMarketplaceConnection(id: string): Promise<void> {
    await db.delete(marketplaceConnections).where(eq(marketplaceConnections.id, id));
  }

  // Listing methods
  async getListings(userId: string, filters?: { status?: string; marketplace?: string }): Promise<Listing[]> {
    let query = db.select().from(listings).where(eq(listings.userId, userId));
    
    if (filters?.status) {
      query = query.where(eq(listings.status, filters.status));
    }
    
    return await query;
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing || undefined;
  }

  async createListing(userId: string, listing: InsertListing): Promise<Listing> {
    const [newListing] = await db
      .insert(listings)
      .values({
        ...listing,
        id: randomUUID(),
        userId,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newListing;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    const [listing] = await db
      .update(listings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();
    if (!listing) throw new Error("Listing not found");
    return listing;
  }

  async deleteListing(id: string): Promise<void> {
    await db.delete(listings).where(eq(listings.id, id));
  }

  // Listing Post methods
  async getListingPosts(listingId: string): Promise<ListingPost[]> {
    return await db.select().from(listingPosts).where(eq(listingPosts.listingId, listingId));
  }

  async getListingPost(listingId: string, marketplace: string): Promise<ListingPost | undefined> {
    const [post] = await db
      .select()
      .from(listingPosts)
      .where(and(
        eq(listingPosts.listingId, listingId),
        eq(listingPosts.marketplace, marketplace)
      ));
    return post || undefined;
  }

  async createListingPost(post: InsertListingPost): Promise<ListingPost> {
    const [newPost] = await db
      .insert(listingPosts)
      .values({
        ...post,
        id: randomUUID(),
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newPost;
  }

  async updateListingPost(id: string, updates: Partial<ListingPost>): Promise<ListingPost> {
    const [post] = await db
      .update(listingPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(listingPosts.id, id))
      .returning();
    if (!post) throw new Error("Listing post not found");
    return post;
  }

  // Job methods
  async getJobs(userId?: string, filters?: { status?: string; type?: string }): Promise<Job[]> {
    let conditions: any[] = [];
    
    // Only filter by userId if provided
    if (userId) {
      conditions.push(eq(jobs.userId, userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(jobs.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(jobs.type, filters.type));
    }
    
    const query = conditions.length > 0 
      ? db.select().from(jobs).where(and(...conditions)).orderBy(desc(jobs.createdAt))
      : db.select().from(jobs).orderBy(desc(jobs.createdAt));
    
    return await query;
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(userId: string, job: InsertJob): Promise<Job> {
    const [newJob] = await db
      .insert(jobs)
      .values({
        ...job,
        id: randomUUID(),
        userId,
        status: "pending",
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newJob;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    if (!job) throw new Error("Job not found");
    return job;
  }

  // Audit Log methods
  async createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const [newLog] = await db
      .insert(auditLogs)
      .values({
        ...log,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newLog;
  }

  async getAuditLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // Stats methods
  async getUserStats(userId: string): Promise<{
    activeListings: number;
    totalSales: number;
    monthlyRevenue: number;
    conversionRate: number;
  }> {
    const activeListingsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(and(eq(listings.userId, userId), eq(listings.status, "active")));

    const salesResult = await db
      .select({ 
        count: sql<number>`count(*)`,
        revenue: sql<number>`sum(${listings.price})`
      })
      .from(listings)
      .where(and(eq(listings.userId, userId), eq(listings.status, "sold")));

    const activeListings = Number(activeListingsResult[0]?.count || 0);
    const totalSales = Number(salesResult[0]?.count || 0);
    const monthlyRevenue = Number(salesResult[0]?.revenue || 0);
    const conversionRate = activeListings > 0 ? (totalSales / activeListings) * 100 : 0;

    return {
      activeListings,
      totalSales,
      monthlyRevenue,
      conversionRate,
    };
  }

  // Usage tracking methods
  async canCreateListing(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    if (user.plan === "unlimited") return true;
    
    return user.listingsUsedThisMonth < user.listingCredits;
  }

  async incrementListingUsage(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    await this.updateUser(userId, {
      listingsUsedThisMonth: user.listingsUsedThisMonth + 1,
    });
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    await this.updateUser(userId, {
      listingsUsedThisMonth: 0,
      billingCycleStart: new Date(),
    });
  }

  async checkAndResetBillingCycle(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    
    const cycleStart = new Date(user.billingCycleStart);
    const now = new Date();
    const daysSinceCycleStart = Math.floor((now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCycleStart >= 30) {
      await this.resetMonthlyUsage(userId);
    }
  }

  // Sync Settings methods
  async getSyncSettings(userId: string): Promise<SyncSettings | undefined> {
    const [settings] = await db.select().from(syncSettings).where(eq(syncSettings.userId, userId));
    return settings || undefined;
  }

  async createSyncSettings(userId: string, settings: InsertSyncSettings): Promise<SyncSettings> {
    const [newSettings] = await db
      .insert(syncSettings)
      .values({
        ...settings,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newSettings;
  }

  async updateSyncSettings(userId: string, updates: Partial<SyncSettings>): Promise<SyncSettings> {
    const [settings] = await db
      .update(syncSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(syncSettings.userId, userId))
      .returning();
    if (!settings) throw new Error("Sync settings not found");
    return settings;
  }

  // Sync Rule methods
  async getSyncRules(userId: string): Promise<SyncRule[]> {
    return await db.select().from(syncRules).where(eq(syncRules.userId, userId));
  }

  async getSyncRule(id: string): Promise<SyncRule | undefined> {
    const [rule] = await db.select().from(syncRules).where(eq(syncRules.id, id));
    return rule || undefined;
  }

  async createSyncRule(userId: string, rule: InsertSyncRule): Promise<SyncRule> {
    const [newRule] = await db
      .insert(syncRules)
      .values({
        ...rule,
        id: randomUUID(),
        userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newRule;
  }

  async updateSyncRule(id: string, updates: Partial<SyncRule>): Promise<SyncRule> {
    const [rule] = await db
      .update(syncRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(syncRules.id, id))
      .returning();
    if (!rule) throw new Error("Sync rule not found");
    return rule;
  }

  async deleteSyncRule(id: string): Promise<void> {
    await db.delete(syncRules).where(eq(syncRules.id, id));
  }

  // Sync History methods
  async getSyncHistory(userId: string, limit: number = 100): Promise<SyncHistory[]> {
    return await db
      .select()
      .from(syncHistory)
      .where(eq(syncHistory.userId, userId))
      .orderBy(desc(syncHistory.createdAt))
      .limit(limit);
  }

  async createSyncHistory(userId: string, history: InsertSyncHistory): Promise<SyncHistory> {
    const [newHistory] = await db
      .insert(syncHistory)
      .values({
        ...history,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
      })
      .returning();
    return newHistory;
  }

  // Sync Conflict methods
  async getSyncConflicts(userId: string, resolved?: boolean): Promise<SyncConflict[]> {
    let query = db.select().from(syncConflicts).where(eq(syncConflicts.userId, userId));
    
    if (resolved !== undefined) {
      query = query.where(eq(syncConflicts.resolved, resolved));
    }
    
    return await query.orderBy(desc(syncConflicts.createdAt));
  }

  async getSyncConflict(id: string): Promise<SyncConflict | undefined> {
    const [conflict] = await db.select().from(syncConflicts).where(eq(syncConflicts.id, id));
    return conflict || undefined;
  }

  async createSyncConflict(userId: string, conflict: InsertSyncConflict): Promise<SyncConflict> {
    const [newConflict] = await db
      .insert(syncConflicts)
      .values({
        ...conflict,
        id: randomUUID(),
        userId,
        resolved: false,
        createdAt: new Date(),
      })
      .returning();
    return newConflict;
  }

  async resolveSyncConflict(id: string, resolution: string, resolvedValue: any): Promise<SyncConflict> {
    const [conflict] = await db
      .update(syncConflicts)
      .set({
        resolved: true,
        resolution,
        resolvedValue,
        resolvedAt: new Date(),
      })
      .where(eq(syncConflicts.id, id))
      .returning();
    if (!conflict) throw new Error("Sync conflict not found");
    return conflict;
  }

  // Auto-Delist Rule methods
  async getAutoDelistRules(userId: string): Promise<AutoDelistRule[]> {
    return await db.select().from(autoDelistRules).where(eq(autoDelistRules.userId, userId));
  }

  async getAutoDelistRule(id: string): Promise<AutoDelistRule | undefined> {
    const [rule] = await db.select().from(autoDelistRules).where(eq(autoDelistRules.id, id));
    return rule || undefined;
  }

  async createAutoDelistRule(userId: string, rule: InsertAutoDelistRule): Promise<AutoDelistRule> {
    const [newRule] = await db
      .insert(autoDelistRules)
      .values({
        ...rule,
        id: randomUUID(),
        userId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newRule;
  }

  async updateAutoDelistRule(id: string, updates: Partial<AutoDelistRule>): Promise<AutoDelistRule> {
    const [rule] = await db
      .update(autoDelistRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(autoDelistRules.id, id))
      .returning();
    if (!rule) throw new Error("Auto-delist rule not found");
    return rule;
  }

  async deleteAutoDelistRule(id: string): Promise<void> {
    await db.delete(autoDelistRules).where(eq(autoDelistRules.id, id));
  }

  // Auto-Delist History methods
  async getAutoDelistHistory(userId: string, limit: number = 100): Promise<AutoDelistHistory[]> {
    return await db
      .select()
      .from(autoDelistHistory)
      .where(eq(autoDelistHistory.userId, userId))
      .orderBy(desc(autoDelistHistory.createdAt))
      .limit(limit);
  }

  async createAutoDelistHistory(userId: string, history: InsertAutoDelistHistory): Promise<AutoDelistHistory> {
    const [newHistory] = await db
      .insert(autoDelistHistory)
      .values({
        ...history,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
      })
      .returning();
    return newHistory;
  }

  // Onboarding methods
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress | undefined> {
    const [progress] = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userId, userId));
    return progress || undefined;
  }

  async createOnboardingProgress(userId: string, progress: InsertOnboardingProgress): Promise<OnboardingProgress> {
    const [newProgress] = await db
      .insert(onboardingProgress)
      .values({
        ...progress,
        id: randomUUID(),
        userId,
        completedSteps: [],
        currentStep: 0,
        skipped: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newProgress;
  }

  async updateOnboardingProgress(userId: string, updates: Partial<OnboardingProgress>): Promise<OnboardingProgress> {
    const [progress] = await db
      .update(onboardingProgress)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(onboardingProgress.userId, userId))
      .returning();
    if (!progress) throw new Error("Onboarding progress not found");
    return progress;
  }

  async completeOnboarding(userId: string): Promise<OnboardingProgress> {
    const progress = await this.getOnboardingProgress(userId);
    if (!progress) throw new Error("Onboarding progress not found");
    
    return await this.updateOnboardingProgress(userId, {
      currentStep: progress.totalSteps,
      completedAt: new Date(),
    });
  }

  async skipOnboarding(userId: string): Promise<OnboardingProgress> {
    return await this.updateOnboardingProgress(userId, {
      skipped: true,
      completedAt: new Date(),
    });
  }

  async resetOnboarding(userId: string): Promise<OnboardingProgress> {
    return await this.updateOnboardingProgress(userId, {
      currentStep: 0,
      completedSteps: [],
      skipped: false,
      completedAt: null,
    });
  }

  // Analytics Event methods
  async createAnalyticsEvent(userId: string, event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [newEvent] = await db
      .insert(analyticsEvents)
      .values({
        ...event,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
      })
      .returning();
    return newEvent;
  }

  async getAnalyticsEvents(userId: string, filters?: { eventType?: string; marketplace?: string; startDate?: Date; endDate?: Date }): Promise<AnalyticsEvent[]> {
    let conditions = [eq(analyticsEvents.userId, userId)];
    
    if (filters?.eventType) {
      conditions.push(eq(analyticsEvents.eventType, filters.eventType));
    }
    if (filters?.marketplace) {
      conditions.push(eq(analyticsEvents.marketplace, filters.marketplace));
    }
    if (filters?.startDate) {
      conditions.push(gte(analyticsEvents.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(analyticsEvents.createdAt, filters.endDate));
    }
    
    return await db.select().from(analyticsEvents).where(and(...conditions));
  }

  // Sales Metrics methods
  async createSalesMetrics(userId: string, metrics: InsertSalesMetrics): Promise<SalesMetrics> {
    const [newMetrics] = await db
      .insert(salesMetrics)
      .values({
        ...metrics,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newMetrics;
  }

  async getSalesMetrics(userId: string, filters?: { marketplace?: string; category?: string; startDate?: Date; endDate?: Date }): Promise<SalesMetrics[]> {
    let conditions = [eq(salesMetrics.userId, userId)];
    
    if (filters?.marketplace) {
      conditions.push(eq(salesMetrics.marketplace, filters.marketplace));
    }
    if (filters?.category) {
      conditions.push(eq(salesMetrics.category, filters.category));
    }
    if (filters?.startDate) {
      conditions.push(gte(salesMetrics.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(salesMetrics.createdAt, filters.endDate));
    }
    
    return await db.select().from(salesMetrics).where(and(...conditions));
  }

  // Inventory Metrics methods
  async createInventoryMetrics(userId: string, metrics: InsertInventoryMetrics): Promise<InventoryMetrics> {
    const [newMetrics] = await db
      .insert(inventoryMetrics)
      .values({
        ...metrics,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newMetrics;
  }

  async getInventoryMetrics(userId: string, filters?: { status?: string; category?: string }): Promise<InventoryMetrics[]> {
    let conditions = [eq(inventoryMetrics.userId, userId)];
    
    if (filters?.status) {
      conditions.push(eq(inventoryMetrics.status, filters.status));
    }
    if (filters?.category) {
      conditions.push(eq(inventoryMetrics.category, filters.category));
    }
    
    return await db.select().from(inventoryMetrics).where(and(...conditions));
  }

  async updateInventoryMetrics(id: string, updates: Partial<InventoryMetrics>): Promise<InventoryMetrics> {
    const [metrics] = await db
      .update(inventoryMetrics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(inventoryMetrics.id, id))
      .returning();
    if (!metrics) throw new Error("Inventory metrics not found");
    return metrics;
  }

  // Marketplace Metrics methods
  async createMarketplaceMetrics(userId: string, metrics: InsertMarketplaceMetrics): Promise<MarketplaceMetrics> {
    const [newMetrics] = await db
      .insert(marketplaceMetrics)
      .values({
        ...metrics,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newMetrics;
  }

  async getMarketplaceMetrics(userId: string, filters?: { marketplace?: string; period?: string }): Promise<MarketplaceMetrics[]> {
    let conditions = [eq(marketplaceMetrics.userId, userId)];
    
    if (filters?.marketplace) {
      conditions.push(eq(marketplaceMetrics.marketplace, filters.marketplace));
    }
    if (filters?.period) {
      conditions.push(eq(marketplaceMetrics.period, filters.period));
    }
    
    return await db.select().from(marketplaceMetrics).where(and(...conditions));
  }

  async updateMarketplaceMetrics(id: string, updates: Partial<MarketplaceMetrics>): Promise<MarketplaceMetrics> {
    const [metrics] = await db
      .update(marketplaceMetrics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketplaceMetrics.id, id))
      .returning();
    if (!metrics) throw new Error("Marketplace metrics not found");
    return metrics;
  }

  // Marketplace Posting Rules methods
  async getMarketplacePostingRules(marketplace?: string): Promise<MarketplacePostingRules[]> {
    if (marketplace) {
      return await db.select().from(marketplacePostingRules).where(eq(marketplacePostingRules.marketplace, marketplace));
    }
    return await db.select().from(marketplacePostingRules);
  }

  async getMarketplacePostingRule(marketplace: string): Promise<MarketplacePostingRules | undefined> {
    const [rule] = await db.select().from(marketplacePostingRules).where(eq(marketplacePostingRules.marketplace, marketplace));
    return rule || undefined;
  }

  async createMarketplacePostingRules(rules: InsertMarketplacePostingRules): Promise<MarketplacePostingRules> {
    const [newRules] = await db
      .insert(marketplacePostingRules)
      .values({
        ...rules,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newRules;
  }

  async updateMarketplacePostingRules(marketplace: string, updates: Partial<MarketplacePostingRules>): Promise<MarketplacePostingRules> {
    const [rules] = await db
      .update(marketplacePostingRules)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(marketplacePostingRules.marketplace, marketplace))
      .returning();
    if (!rules) throw new Error("Marketplace posting rules not found");
    return rules;
  }

  // Posting Success Analytics methods
  async createPostingSuccessAnalytics(userId: string, analytics: InsertPostingSuccessAnalytics): Promise<PostingSuccessAnalytics> {
    const [newAnalytics] = await db
      .insert(postingSuccessAnalytics)
      .values({
        ...analytics,
        id: randomUUID(),
        userId,
        updatedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();
    return newAnalytics;
  }

  async getPostingSuccessAnalytics(userId: string, filters?: { marketplace?: string; startDate?: Date; endDate?: Date; category?: string }): Promise<PostingSuccessAnalytics[]> {
    let conditions = [eq(postingSuccessAnalytics.userId, userId)];
    
    if (filters?.marketplace) {
      conditions.push(eq(postingSuccessAnalytics.marketplace, filters.marketplace));
    }
    if (filters?.category) {
      conditions.push(eq(postingSuccessAnalytics.category, filters.category));
    }
    if (filters?.startDate) {
      conditions.push(gte(postingSuccessAnalytics.postedAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(postingSuccessAnalytics.postedAt, filters.endDate));
    }
    
    return await db.select().from(postingSuccessAnalytics).where(and(...conditions)).orderBy(desc(postingSuccessAnalytics.postedAt));
  }

  async updatePostingSuccessAnalytics(id: string, updates: Partial<PostingSuccessAnalytics>): Promise<PostingSuccessAnalytics> {
    const [analytics] = await db
      .update(postingSuccessAnalytics)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(postingSuccessAnalytics.id, id))
      .returning();
    if (!analytics) throw new Error("Posting success analytics not found");
    return analytics;
  }

  // Rate Limit Tracker methods
  async getRateLimitTracker(marketplace: string, windowType?: string): Promise<RateLimitTracker | undefined> {
    if (windowType) {
      const [tracker] = await db.select().from(rateLimitTracker)
        .where(and(eq(rateLimitTracker.marketplace, marketplace), eq(rateLimitTracker.windowType, windowType)))
        .orderBy(desc(rateLimitTracker.timeWindow))
        .limit(1);
      return tracker || undefined;
    } else {
      // Return the most recent tracker for any window type
      const [tracker] = await db.select().from(rateLimitTracker)
        .where(eq(rateLimitTracker.marketplace, marketplace))
        .orderBy(desc(rateLimitTracker.timeWindow))
        .limit(1);
      return tracker || undefined;
    }
  }

  async createRateLimitTracker(tracker: InsertRateLimitTracker): Promise<RateLimitTracker> {
    const [newTracker] = await db
      .insert(rateLimitTracker)
      .values({
        ...tracker,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newTracker;
  }

  async updateRateLimitTracker(marketplace: string, updates: Partial<RateLimitTracker>): Promise<RateLimitTracker> {
    // First try to find existing tracker for this marketplace
    const existing = await this.getRateLimitTracker(marketplace);
    
    if (existing) {
      return this.updateRateLimitTrackerById(existing.id, updates);
    } else {
      // Create new tracker if none exists
      const newTracker = await this.createRateLimitTracker({
        marketplace,
        windowType: "hour",
        requestCount: 0,
        windowStart: new Date(),
        timeWindow: new Date(),
        lastRequestAt: new Date(),
        isBlocked: false,
        ...updates,
      });
      return newTracker;
    }
  }

  async updateRateLimitTrackerById(id: string, updates: Partial<RateLimitTracker>): Promise<RateLimitTracker> {
    const [tracker] = await db
      .update(rateLimitTracker)
      .set(updates)
      .where(eq(rateLimitTracker.id, id))
      .returning();
    if (!tracker) throw new Error("Rate limit tracker not found");
    return tracker;
  }

  async getCurrentRateLimits(marketplaces: string[]): Promise<Record<string, RateLimitTracker | null>> {
    const result: Record<string, RateLimitTracker | null> = {};
    
    for (const marketplace of marketplaces) {
      const [tracker] = await db.select().from(rateLimitTracker)
        .where(and(
          eq(rateLimitTracker.marketplace, marketplace),
          eq(rateLimitTracker.windowType, 'hourly')
        ))
        .orderBy(desc(rateLimitTracker.timeWindow))
        .limit(1);
      result[marketplace] = tracker || null;
    }
    
    return result;
  }

  async getRateLimitUsageInWindow(marketplace: string, startTime: Date, endTime: Date): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${rateLimitTracker.requestCount})` })
      .from(rateLimitTracker)
      .where(and(
        eq(rateLimitTracker.marketplace, marketplace),
        gte(rateLimitTracker.timeWindow, startTime),
        lte(rateLimitTracker.timeWindow, endTime)
      ));

    return Number(result[0]?.total || 0);
  }

  async getAllRateLimitTrackers(marketplace?: string): Promise<RateLimitTracker[]> {
    if (marketplace) {
      return await db.select().from(rateLimitTracker)
        .where(eq(rateLimitTracker.marketplace, marketplace))
        .orderBy(desc(rateLimitTracker.timeWindow));
    }
    return await db.select().from(rateLimitTracker)
      .orderBy(desc(rateLimitTracker.timeWindow));
  }

  async cleanupOldRateLimitTrackers(olderThan: Date): Promise<number> {
    const result = await db.delete(rateLimitTracker)
      .where(lte(rateLimitTracker.createdAt, olderThan));
    return result.rowCount || 0;
  }

  // Queue Distribution methods
  async getQueueDistribution(timeSlot: Date, marketplace?: string): Promise<QueueDistribution[]> {
    let conditions = [eq(queueDistribution.timeSlot, timeSlot)];
    
    if (marketplace) {
      conditions.push(eq(queueDistribution.marketplace, marketplace));
    }
    
    return await db.select().from(queueDistribution).where(and(...conditions));
  }

  async createQueueDistribution(distribution: InsertQueueDistribution): Promise<QueueDistribution> {
    const [newDistribution] = await db
      .insert(queueDistribution)
      .values({
        ...distribution,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newDistribution;
  }

  async updateQueueDistribution(id: string, updates: Partial<QueueDistribution>): Promise<QueueDistribution> {
    const [distribution] = await db
      .update(queueDistribution)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(queueDistribution.id, id))
      .returning();
    if (!distribution) throw new Error("Queue distribution not found");
    return distribution;
  }

  async getAvailableTimeSlots(marketplace: string, startTime: Date, endTime: Date): Promise<QueueDistribution[]> {
    return await db.select().from(queueDistribution)
      .where(and(
        eq(queueDistribution.marketplace, marketplace),
        eq(queueDistribution.isAvailable, true),
        gte(queueDistribution.timeSlot, startTime),
        lte(queueDistribution.timeSlot, endTime),
        sql`${queueDistribution.scheduledJobs} < ${queueDistribution.maxCapacity}`
      ))
      .orderBy(queueDistribution.timeSlot);
  }

  // Job Retry History methods
  async createJobRetryHistory(history: InsertJobRetryHistory): Promise<JobRetryHistory> {
    const [newHistory] = await db
      .insert(jobRetryHistory)
      .values({
        ...history,
        id: randomUUID(),
        timestamp: new Date(),
      })
      .returning();
    return newHistory;
  }

  async getJobRetryHistory(jobId: string): Promise<JobRetryHistory[]> {
    return await db.select().from(jobRetryHistory)
      .where(eq(jobRetryHistory.jobId, jobId))
      .orderBy(jobRetryHistory.attemptNumber);
  }

  // Circuit Breaker methods
  async getCircuitBreakerStatus(marketplace: string): Promise<CircuitBreakerStatus | undefined> {
    const [status] = await db.select().from(circuitBreakerStatus)
      .where(eq(circuitBreakerStatus.marketplace, marketplace));
    
    if (status) {
      return status;
    }
    
    // Create default circuit breaker status if none exists
    const defaultStatus = await db
      .insert(circuitBreakerStatus)
      .values({
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
      })
      .returning();
    return defaultStatus[0];
  }

  async updateCircuitBreaker(marketplace: string, updates: Partial<CircuitBreakerStatus>): Promise<CircuitBreakerStatus> {
    const [status] = await db
      .update(circuitBreakerStatus)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(circuitBreakerStatus.marketplace, marketplace))
      .returning();
    if (!status) throw new Error("Circuit breaker status not found");
    return status;
  }

  async getAllCircuitBreakerStatuses(): Promise<CircuitBreakerStatus[]> {
    return await db.select().from(circuitBreakerStatus);
  }

  async createCircuitBreakerStatus(status: InsertCircuitBreakerStatus): Promise<CircuitBreakerStatus> {
    const [newStatus] = await db
      .insert(circuitBreakerStatus)
      .values({
        ...status,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newStatus;
  }

  // Dead Letter Queue methods
  async getDeadLetterQueueEntries(userId?: string, filters?: { resolutionStatus?: string; requiresManualReview?: boolean }): Promise<DeadLetterQueue[]> {
    let conditions = [];
    
    if (userId) {
      conditions.push(eq(deadLetterQueue.userId, userId));
    }
    if (filters?.resolutionStatus) {
      conditions.push(eq(deadLetterQueue.resolutionStatus, filters.resolutionStatus));
    }
    if (filters?.requiresManualReview !== undefined) {
      conditions.push(eq(deadLetterQueue.requiresManualReview, filters.requiresManualReview));
    }
    
    return await db.select().from(deadLetterQueue)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(deadLetterQueue.lastFailureAt));
  }

  async createDeadLetterQueue(entry: InsertDeadLetterQueue): Promise<DeadLetterQueue> {
    const [newEntry] = await db
      .insert(deadLetterQueue)
      .values({
        ...entry,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newEntry;
  }

  async updateDeadLetterQueueEntry(id: string, updates: Partial<DeadLetterQueue>): Promise<DeadLetterQueue> {
    const [entry] = await db
      .update(deadLetterQueue)
      .set(updates)
      .where(eq(deadLetterQueue.id, id))
      .returning();
    if (!entry) throw new Error("Dead letter queue entry not found");
    return entry;
  }

  async getDeadLetterQueueStats(userId?: string): Promise<{ total: number; pending: number; resolved: number; requiresReview: number }> {
    let conditions = [];
    if (userId) {
      conditions.push(eq(deadLetterQueue.userId, userId));
    }
    
    const entries = await db.select().from(deadLetterQueue)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return {
      total: entries.length,
      pending: entries.filter(e => e.resolutionStatus === 'pending').length,
      resolved: entries.filter(e => e.resolutionStatus === 'resolved').length,
      requiresReview: entries.filter(e => e.requiresManualReview).length,
    };
  }

  async cleanupOldEntries(olderThan: Date): Promise<number> {
    const result = await db.delete(deadLetterQueue)
      .where(and(
        lte(deadLetterQueue.createdAt, olderThan),
        eq(deadLetterQueue.resolutionStatus, 'resolved')
      ));
    return result.rowCount || 0;
  }

  // Retry Metrics methods
  async createRetryMetrics(metrics: InsertRetryMetrics): Promise<RetryMetrics> {
    const [newMetrics] = await db
      .insert(retryMetrics)
      .values({
        ...metrics,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newMetrics;
  }

  async getRetryMetrics(filters?: { marketplace?: string; jobType?: string; timeWindow?: Date }): Promise<RetryMetrics[]> {
    let conditions = [];
    
    if (filters?.marketplace) {
      conditions.push(eq(retryMetrics.marketplace, filters.marketplace));
    }
    if (filters?.jobType) {
      conditions.push(eq(retryMetrics.jobType, filters.jobType));
    }
    if (filters?.timeWindow) {
      conditions.push(eq(retryMetrics.timeWindow, filters.timeWindow));
    }
    
    return await db.select().from(retryMetrics)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(retryMetrics.timeWindow));
  }

  // Failure Category methods
  async getFailureCategories(): Promise<FailureCategory[]> {
    return await db.select().from(failureCategories).where(eq(failureCategories.isActive, true));
  }

  async getFailureCategory(category: string): Promise<FailureCategory | undefined> {
    const [cat] = await db.select().from(failureCategories).where(eq(failureCategories.category, category));
    return cat || undefined;
  }

  async createFailureCategory(category: InsertFailureCategory): Promise<FailureCategory> {
    const [newCategory] = await db
      .insert(failureCategories)
      .values({
        ...category,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newCategory;
  }

  async updateFailureCategory(id: string, updates: Partial<FailureCategory>): Promise<FailureCategory> {
    const [category] = await db
      .update(failureCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(failureCategories.id, id))
      .returning();
    if (!category) throw new Error("Failure category not found");
    return category;
  }

  // Marketplace Retry Config methods
  async getMarketplaceRetryConfig(marketplace: string): Promise<MarketplaceRetryConfig | undefined> {
    const [config] = await db.select().from(marketplaceRetryConfig)
      .where(eq(marketplaceRetryConfig.marketplace, marketplace));
    return config || undefined;
  }

  async createMarketplaceRetryConfig(config: InsertMarketplaceRetryConfig): Promise<MarketplaceRetryConfig> {
    const [newConfig] = await db
      .insert(marketplaceRetryConfig)
      .values({
        ...config,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newConfig;
  }

  async updateMarketplaceRetryConfig(marketplace: string, updates: Partial<MarketplaceRetryConfig>): Promise<MarketplaceRetryConfig> {
    const [config] = await db
      .update(marketplaceRetryConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(marketplaceRetryConfig.marketplace, marketplace))
      .returning();
    if (!config) throw new Error("Marketplace retry config not found");
    return config;
  }

  // Batch methods
  async getBatches(userId: string, filters?: { status?: string; type?: string }): Promise<Batch[]> {
    const conditions: any[] = [eq(batches.userId, userId)];
    
    if (filters?.status) {
      conditions.push(eq(batches.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(batches.type, filters.type));
    }
    
    return await db.select().from(batches)
      .where(and(...conditions))
      .orderBy(desc(batches.createdAt));
  }

  async getBatch(id: string): Promise<Batch | undefined> {
    const [batch] = await db.select().from(batches).where(eq(batches.id, id));
    return batch || undefined;
  }

  async createBatch(userId: string, batch: InsertBatch): Promise<Batch> {
    const [newBatch] = await db
      .insert(batches)
      .values({
        ...batch,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newBatch;
  }

  async updateBatch(id: string, updates: Partial<Batch>): Promise<Batch> {
    const [batch] = await db
      .update(batches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(batches.id, id))
      .returning();
    if (!batch) throw new Error("Batch not found");
    return batch;
  }

  async deleteBatch(id: string): Promise<void> {
    await db.delete(batches).where(eq(batches.id, id));
  }

  async getBatchesByStatus(status: string, userId?: string): Promise<Batch[]> {
    const conditions: any[] = [eq(batches.status, status)];
    
    if (userId) {
      conditions.push(eq(batches.userId, userId));
    }
    
    return await db.select().from(batches)
      .where(and(...conditions))
      .orderBy(desc(batches.createdAt));
  }

  async getBatchProgress(id: string): Promise<{ 
    totalItems: number; 
    processedItems: number; 
    successfulItems: number; 
    failedItems: number; 
    progress: number 
  }> {
    const [batch] = await db.select().from(batches).where(eq(batches.id, id));
    if (!batch) throw new Error("Batch not found");
    
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
    const conditions: any[] = [eq(batchItems.batchId, batchId)];
    
    if (filters?.status) {
      conditions.push(eq(batchItems.status, filters.status));
    }
    
    return await db.select().from(batchItems)
      .where(and(...conditions))
      .orderBy(batchItems.itemIndex);
  }

  async getBatchItem(id: string): Promise<BatchItem | undefined> {
    const [item] = await db.select().from(batchItems).where(eq(batchItems.id, id));
    return item || undefined;
  }

  async createBatchItem(batchItem: InsertBatchItem): Promise<BatchItem> {
    const [newItem] = await db
      .insert(batchItems)
      .values({
        ...batchItem,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newItem;
  }

  async updateBatchItem(id: string, updates: Partial<BatchItem>): Promise<BatchItem> {
    const [item] = await db
      .update(batchItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(batchItems.id, id))
      .returning();
    if (!item) throw new Error("Batch item not found");
    return item;
  }

  async deleteBatchItem(id: string): Promise<void> {
    await db.delete(batchItems).where(eq(batchItems.id, id));
  }

  async createBatchItems(batchItemList: InsertBatchItem[]): Promise<BatchItem[]> {
    if (batchItemList.length === 0) return [];
    
    const itemsToInsert = batchItemList.map(item => ({
      ...item,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    return await db.insert(batchItems).values(itemsToInsert).returning();
  }

  async updateBatchItemsStatus(batchId: string, status: string, filters?: { currentStatus?: string }): Promise<void> {
    const conditions: any[] = [eq(batchItems.batchId, batchId)];
    
    if (filters?.currentStatus) {
      conditions.push(eq(batchItems.status, filters.currentStatus));
    }
    
    await db.update(batchItems)
      .set({ status, updatedAt: new Date() })
      .where(and(...conditions));
  }

  // Bulk Upload methods
  async getBulkUploads(userId: string, filters?: { status?: string; uploadType?: string }): Promise<BulkUpload[]> {
    const conditions: any[] = [eq(bulkUploads.userId, userId)];
    
    if (filters?.status) {
      conditions.push(eq(bulkUploads.status, filters.status));
    }
    if (filters?.uploadType) {
      conditions.push(eq(bulkUploads.uploadType, filters.uploadType));
    }
    
    return await db.select().from(bulkUploads)
      .where(and(...conditions))
      .orderBy(desc(bulkUploads.createdAt));
  }

  async getBulkUpload(id: string): Promise<BulkUpload | undefined> {
    const [upload] = await db.select().from(bulkUploads).where(eq(bulkUploads.id, id));
    return upload || undefined;
  }

  async createBulkUpload(userId: string, upload: InsertBulkUpload): Promise<BulkUpload> {
    const [newUpload] = await db
      .insert(bulkUploads)
      .values({
        ...upload,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newUpload;
  }

  async updateBulkUpload(id: string, updates: Partial<BulkUpload>): Promise<BulkUpload> {
    const [upload] = await db
      .update(bulkUploads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bulkUploads.id, id))
      .returning();
    if (!upload) throw new Error("Bulk upload not found");
    return upload;
  }

  async deleteBulkUpload(id: string): Promise<void> {
    await db.delete(bulkUploads).where(eq(bulkUploads.id, id));
  }

  // Batch Template methods
  async getBatchTemplates(userId: string, filters?: { type?: string; isPublic?: boolean }): Promise<BatchTemplate[]> {
    const conditions: any[] = [
      or(eq(batchTemplates.userId, userId), eq(batchTemplates.isPublic, true))
    ];
    
    if (filters?.type) {
      conditions.push(eq(batchTemplates.type, filters.type));
    }
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(batchTemplates.isPublic, filters.isPublic));
    }
    
    return await db.select().from(batchTemplates)
      .where(and(...conditions))
      .orderBy(desc(batchTemplates.lastUsedAt));
  }

  async getBatchTemplate(id: string): Promise<BatchTemplate | undefined> {
    const [template] = await db.select().from(batchTemplates).where(eq(batchTemplates.id, id));
    return template || undefined;
  }

  async createBatchTemplate(userId: string, template: InsertBatchTemplate): Promise<BatchTemplate> {
    const [newTemplate] = await db
      .insert(batchTemplates)
      .values({
        ...template,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newTemplate;
  }

  async updateBatchTemplate(id: string, updates: Partial<BatchTemplate>): Promise<BatchTemplate> {
    const [template] = await db
      .update(batchTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(batchTemplates.id, id))
      .returning();
    if (!template) throw new Error("Batch template not found");
    return template;
  }

  async deleteBatchTemplate(id: string): Promise<void> {
    await db.delete(batchTemplates).where(eq(batchTemplates.id, id));
  }

  async getDefaultBatchTemplates(type: string): Promise<BatchTemplate[]> {
    return await db.select().from(batchTemplates)
      .where(and(eq(batchTemplates.type, type), eq(batchTemplates.isDefault, true)));
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db.update(batchTemplates)
      .set({ 
        usageCount: sql`${batchTemplates.usageCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(batchTemplates.id, id));
  }

  // Batch Analytics methods
  async getBatchAnalytics(batchId: string, marketplace?: string): Promise<BatchAnalytics[]> {
    const conditions: any[] = [eq(batchAnalytics.batchId, batchId)];
    
    if (marketplace) {
      conditions.push(eq(batchAnalytics.marketplace, marketplace));
    }
    
    return await db.select().from(batchAnalytics)
      .where(and(...conditions))
      .orderBy(desc(batchAnalytics.createdAt));
  }

  async createBatchAnalytics(userId: string, analytics: InsertBatchAnalytics): Promise<BatchAnalytics> {
    const [newAnalytics] = await db
      .insert(batchAnalytics)
      .values({
        ...analytics,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
      })
      .returning();
    return newAnalytics;
  }

  async updateBatchAnalytics(id: string, updates: Partial<BatchAnalytics>): Promise<BatchAnalytics> {
    const [analytics] = await db
      .update(batchAnalytics)
      .set(updates)
      .where(eq(batchAnalytics.id, id))
      .returning();
    if (!analytics) throw new Error("Batch analytics not found");
    return analytics;
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
    const conditions: any[] = [eq(batches.userId, userId)];
    
    if (filters?.dateStart) {
      conditions.push(gte(batches.createdAt, filters.dateStart));
    }
    if (filters?.dateEnd) {
      conditions.push(lte(batches.createdAt, filters.dateEnd));
    }
    if (filters?.type) {
      conditions.push(eq(batches.type, filters.type));
    }
    
    return await db.select({
      batchId: batches.id,
      batchName: batches.name,
      type: batches.type,
      successRate: sql<number>`CASE WHEN ${batches.totalItems} > 0 THEN (${batches.successfulItems}::float / ${batches.totalItems}::float) * 100 ELSE 0 END`,
      avgProcessingTime: sql<number>`EXTRACT(EPOCH FROM (${batches.completedAt} - ${batches.startedAt}))`,
      totalItems: batches.totalItems,
      costEfficiency: sql<number>`CASE WHEN ${batches.successfulItems} > 0 THEN ${batches.totalItems}::float / ${batches.successfulItems}::float ELSE 0 END`
    })
    .from(batches)
    .where(and(...conditions))
    .orderBy(desc(batches.createdAt));
  }

  // Batch Queue methods
  async getBatchQueue(filters?: { priority?: number; status?: string }): Promise<BatchQueue[]> {
    let query = db.select().from(batchQueue);
    const conditions: any[] = [];
    
    if (filters?.priority !== undefined) {
      conditions.push(eq(batchQueue.priority, filters.priority));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(batchQueue.priority), batchQueue.queuePosition);
  }

  async getBatchQueueEntry(batchId: string): Promise<BatchQueue | undefined> {
    const [entry] = await db.select().from(batchQueue).where(eq(batchQueue.batchId, batchId));
    return entry || undefined;
  }

  async createBatchQueueEntry(entry: InsertBatchQueue): Promise<BatchQueue> {
    const [newEntry] = await db
      .insert(batchQueue)
      .values({
        ...entry,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newEntry;
  }

  async updateBatchQueueEntry(batchId: string, updates: Partial<BatchQueue>): Promise<BatchQueue> {
    const [entry] = await db
      .update(batchQueue)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(batchQueue.batchId, batchId))
      .returning();
    if (!entry) throw new Error("Batch queue entry not found");
    return entry;
  }

  async deleteBatchQueueEntry(batchId: string): Promise<void> {
    await db.delete(batchQueue).where(eq(batchQueue.batchId, batchId));
  }

  async getNextBatchForProcessing(): Promise<BatchQueue | undefined> {
    const [entry] = await db.select().from(batchQueue)
      .orderBy(desc(batchQueue.priority), batchQueue.queuePosition)
      .limit(1);
    return entry || undefined;
  }

  // Webhook Configuration methods
  async getWebhookConfigurations(userId: string, marketplace?: string): Promise<WebhookConfiguration[]> {
    let query = db.select().from(webhookConfigurations).where(eq(webhookConfigurations.userId, userId));
    if (marketplace) {
      query = query.where(and(eq(webhookConfigurations.userId, userId), eq(webhookConfigurations.marketplace, marketplace)));
    }
    return await query.orderBy(desc(webhookConfigurations.createdAt));
  }

  async getWebhookConfiguration(userId: string, marketplace: string): Promise<WebhookConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(webhookConfigurations)
      .where(and(
        eq(webhookConfigurations.userId, userId),
        eq(webhookConfigurations.marketplace, marketplace)
      ));
    return config || undefined;
  }

  async createWebhookConfiguration(userId: string, config: InsertWebhookConfiguration): Promise<WebhookConfiguration> {
    const [newConfig] = await db
      .insert(webhookConfigurations)
      .values({
        ...config,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newConfig;
  }

  async updateWebhookConfiguration(id: string, updates: Partial<WebhookConfiguration>): Promise<WebhookConfiguration> {
    const [config] = await db
      .update(webhookConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(webhookConfigurations.id, id))
      .returning();
    if (!config) throw new Error("Webhook configuration not found");
    return config;
  }

  async deleteWebhookConfiguration(id: string): Promise<void> {
    await db.delete(webhookConfigurations).where(eq(webhookConfigurations.id, id));
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
    let query = db.select().from(webhookEvents);
    const conditions: any[] = [];
    
    if (userId) {
      conditions.push(eq(webhookEvents.userId, userId));
    }
    if (filters?.marketplace) {
      conditions.push(eq(webhookEvents.marketplace, filters.marketplace));
    }
    if (filters?.eventType) {
      conditions.push(eq(webhookEvents.eventType, filters.eventType));
    }
    if (filters?.processingStatus) {
      conditions.push(eq(webhookEvents.processingStatus, filters.processingStatus));
    }
    if (filters?.startDate) {
      conditions.push(gte(webhookEvents.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(webhookEvents.createdAt, filters.endDate));
    }
    if (filters?.listingId) {
      conditions.push(eq(webhookEvents.listingId, filters.listingId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(webhookEvents.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getWebhookEvent(id: string): Promise<WebhookEvent | undefined> {
    const [event] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, id));
    return event || undefined;
  }

  async getWebhookEventByExternalId(marketplace: string, eventId: string): Promise<WebhookEvent | undefined> {
    const [event] = await db
      .select()
      .from(webhookEvents)
      .where(and(
        eq(webhookEvents.marketplace, marketplace),
        eq(webhookEvents.eventId, eventId)
      ));
    return event || undefined;
  }

  async createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent> {
    const [newEvent] = await db
      .insert(webhookEvents)
      .values({
        ...event,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newEvent;
  }

  async updateWebhookEvent(id: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent> {
    const [event] = await db
      .update(webhookEvents)
      .set(updates)
      .where(eq(webhookEvents.id, id))
      .returning();
    if (!event) throw new Error("Webhook event not found");
    return event;
  }

  async deleteWebhookEvent(id: string): Promise<void> {
    await db.delete(webhookEvents).where(eq(webhookEvents.id, id));
  }

  // Webhook Delivery methods
  async getWebhookDeliveries(configId?: string, filters?: { 
    marketplace?: string; 
    successful?: boolean; 
    startDate?: Date; 
    endDate?: Date; 
    limit?: number;
  }): Promise<WebhookDelivery[]> {
    let query = db.select().from(webhookDeliveries);
    const conditions: any[] = [];
    
    if (configId) {
      conditions.push(eq(webhookDeliveries.webhookConfigId, configId));
    }
    if (filters?.marketplace) {
      conditions.push(eq(webhookDeliveries.marketplace, filters.marketplace));
    }
    if (filters?.successful !== undefined) {
      conditions.push(eq(webhookDeliveries.successful, filters.successful));
    }
    if (filters?.startDate) {
      conditions.push(gte(webhookDeliveries.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(webhookDeliveries.createdAt, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(webhookDeliveries.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getWebhookDelivery(id: string): Promise<WebhookDelivery | undefined> {
    const [delivery] = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, id));
    return delivery || undefined;
  }

  async createWebhookDelivery(delivery: InsertWebhookDelivery): Promise<WebhookDelivery> {
    const [newDelivery] = await db
      .insert(webhookDeliveries)
      .values({
        ...delivery,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newDelivery;
  }

  async updateWebhookDelivery(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    const [delivery] = await db
      .update(webhookDeliveries)
      .set(updates)
      .where(eq(webhookDeliveries.id, id))
      .returning();
    if (!delivery) throw new Error("Webhook delivery not found");
    return delivery;
  }

  // Polling Schedule methods
  async getPollingSchedules(userId: string, marketplace?: string): Promise<PollingSchedule[]> {
    let query = db.select().from(pollingSchedules).where(eq(pollingSchedules.userId, userId));
    if (marketplace) {
      query = query.where(and(eq(pollingSchedules.userId, userId), eq(pollingSchedules.marketplace, marketplace)));
    }
    return await query.orderBy(desc(pollingSchedules.createdAt));
  }

  async getPollingSchedule(userId: string, marketplace: string): Promise<PollingSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(pollingSchedules)
      .where(and(
        eq(pollingSchedules.userId, userId),
        eq(pollingSchedules.marketplace, marketplace)
      ));
    return schedule || undefined;
  }

  async createPollingSchedule(userId: string, schedule: InsertPollingSchedule): Promise<PollingSchedule> {
    const [newSchedule] = await db
      .insert(pollingSchedules)
      .values({
        ...schedule,
        id: randomUUID(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newSchedule;
  }

  async updatePollingSchedule(id: string, updates: Partial<PollingSchedule>): Promise<PollingSchedule> {
    const [schedule] = await db
      .update(pollingSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pollingSchedules.id, id))
      .returning();
    if (!schedule) throw new Error("Polling schedule not found");
    return schedule;
  }

  async deletePollingSchedule(id: string): Promise<void> {
    await db.delete(pollingSchedules).where(eq(pollingSchedules.id, id));
  }

  async getPollingSchedulesDueForPoll(): Promise<PollingSchedule[]> {
    const now = new Date();
    return await db
      .select()
      .from(pollingSchedules)
      .where(and(
        eq(pollingSchedules.isEnabled, true),
        lte(pollingSchedules.nextPollAt, now)
      ))
      .orderBy(pollingSchedules.nextPollAt);
  }

  // Webhook Health Metrics methods
  async getWebhookHealthMetrics(marketplace?: string, timeWindow?: Date): Promise<WebhookHealthMetrics[]> {
    let query = db.select().from(webhookHealthMetrics);
    const conditions: any[] = [];
    
    if (marketplace) {
      conditions.push(eq(webhookHealthMetrics.marketplace, marketplace));
    }
    if (timeWindow) {
      conditions.push(eq(webhookHealthMetrics.timeWindow, timeWindow));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(webhookHealthMetrics.createdAt));
  }

  async createWebhookHealthMetrics(metrics: InsertWebhookHealthMetrics): Promise<WebhookHealthMetrics> {
    const [newMetrics] = await db
      .insert(webhookHealthMetrics)
      .values({
        ...metrics,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newMetrics;
  }

  async updateWebhookHealthMetrics(id: string, updates: Partial<WebhookHealthMetrics>): Promise<WebhookHealthMetrics> {
    const [metrics] = await db
      .update(webhookHealthMetrics)
      .set(updates)
      .where(eq(webhookHealthMetrics.id, id))
      .returning();
    if (!metrics) throw new Error("Webhook health metrics not found");
    return metrics;
  }

  async getWebhookHealthSummary(marketplace?: string, hours: number = 24): Promise<{
    totalEvents: number;
    successRate: number;
    averageProcessingTime: number;
    healthScore: number;
    uptime: number;
  }> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    let query = db.select().from(webhookHealthMetrics)
      .where(gte(webhookHealthMetrics.createdAt, startTime));
    
    if (marketplace) {
      query = query.where(and(
        gte(webhookHealthMetrics.createdAt, startTime),
        eq(webhookHealthMetrics.marketplace, marketplace)
      ));
    }
    
    const metrics = await query;
    
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
}