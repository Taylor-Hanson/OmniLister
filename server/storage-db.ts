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
  marketplaceRetryConfig, type MarketplaceRetryConfig, type InsertMarketplaceRetryConfig
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
  async getRateLimitTracker(marketplace: string, windowType: string): Promise<RateLimitTracker | undefined> {
    const [tracker] = await db.select().from(rateLimitTracker)
      .where(and(eq(rateLimitTracker.marketplace, marketplace), eq(rateLimitTracker.windowType, windowType)));
    return tracker || undefined;
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

  async updateRateLimitTracker(id: string, updates: Partial<RateLimitTracker>): Promise<RateLimitTracker> {
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
}