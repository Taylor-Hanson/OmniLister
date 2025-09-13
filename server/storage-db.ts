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
  marketplaceMetrics, type MarketplaceMetrics, type InsertMarketplaceMetrics
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
  async getJobs(userId: string, filters?: { status?: string; type?: string }): Promise<Job[]> {
    let conditions = [eq(jobs.userId, userId)];
    
    if (filters?.status) {
      conditions.push(eq(jobs.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(jobs.type, filters.type));
    }
    
    return await db.select().from(jobs).where(and(...conditions)).orderBy(desc(jobs.createdAt));
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
}