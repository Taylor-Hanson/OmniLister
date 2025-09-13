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
  type OnboardingProgress, type InsertOnboardingProgress
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
  getJobs(userId: string, filters?: { status?: string; type?: string }): Promise<Job[]>;
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

  async getJobs(userId: string, filters?: { status?: string; type?: string }): Promise<Job[]> {
    let jobs = Array.from(this.jobs.values()).filter(job => job.userId === userId);
    
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
}

export const storage = new MemStorage();
