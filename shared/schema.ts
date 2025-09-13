import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  plan: text("plan").notNull().default("free"), // free, pro, enterprise
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("inactive"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketplaceConnections = pgTable("marketplace_connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(), // ebay, poshmark, mercari, etc.
  isConnected: boolean("is_connected").default(false),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  lastSyncAt: timestamp("last_sync_at"),
  settings: jsonb("settings"), // marketplace-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  condition: text("condition"), // new, used, refurbished, etc.
  category: text("category"),
  brand: text("brand"),
  size: text("size"),
  color: text("color"),
  material: text("material"),
  quantity: integer("quantity").default(1),
  images: jsonb("images"), // array of image URLs
  status: text("status").default("draft"), // draft, active, sold, deleted
  aiGenerated: boolean("ai_generated").default(false),
  originalImageUrl: text("original_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const listingPosts = pgTable("listing_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  externalId: text("external_id"), // ID from the marketplace
  externalUrl: text("external_url"), // URL on the marketplace
  status: text("status").default("pending"), // pending, posted, failed, delisted
  errorMessage: text("error_message"),
  postingData: jsonb("posting_data"), // marketplace-specific data
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // post-listing, delist-listing, sync-inventory, etc.
  status: text("status").default("pending"), // pending, processing, completed, failed
  progress: integer("progress").default(0), // 0-100
  data: jsonb("data"), // job-specific data
  result: jsonb("result"), // job result
  errorMessage: text("error_message"),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  scheduledFor: timestamp("scheduled_for").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  entityType: text("entity_type"), // listing, marketplace, job, etc.
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sync Settings - global configuration per user
export const syncSettings = pgTable("sync_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  autoSync: boolean("auto_sync").default(false),
  syncFrequency: text("sync_frequency").default("manual"), // manual, immediate, hourly, daily
  syncFields: jsonb("sync_fields"), // { price: true, inventory: true, description: true, images: true }
  defaultBehavior: jsonb("default_behavior"), // default sync behaviors
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sync Rules - platform-specific rules
export const syncRules = pgTable("sync_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  priceAdjustment: decimal("price_adjustment", { precision: 5, scale: 2 }).default("0"), // percentage adjustment
  priceFormula: text("price_formula"), // custom price formula
  fieldsToSync: jsonb("fields_to_sync"), // which fields to sync for this platform
  templateOverrides: jsonb("template_overrides"), // platform-specific templates
  priority: integer("priority").default(0), // sync priority order
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sync History - track all sync operations
export const syncHistory = pgTable("sync_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  sourceMarketplace: text("source_marketplace"),
  targetMarketplace: text("target_marketplace").notNull(),
  syncType: text("sync_type").notNull(), // create, update, delete, inventory
  status: text("status").notNull(), // success, failed, pending
  fieldsUpdated: jsonb("fields_updated"), // which fields were synced
  previousValues: jsonb("previous_values"), // values before sync
  newValues: jsonb("new_values"), // values after sync
  errorMessage: text("error_message"),
  syncDuration: integer("sync_duration"), // milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Sync Conflicts - track and resolve conflicts
export const syncConflicts = pgTable("sync_conflicts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  conflictType: text("conflict_type").notNull(), // price_mismatch, inventory_mismatch, description_conflict, etc.
  sourceMarketplace: text("source_marketplace").notNull(),
  targetMarketplace: text("target_marketplace").notNull(),
  sourceValue: jsonb("source_value"), // value from source marketplace
  targetValue: jsonb("target_value"), // value from target marketplace
  resolution: text("resolution"), // keep_source, keep_target, merge, custom
  resolvedValue: jsonb("resolved_value"), // final resolved value
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  autoResolved: boolean("auto_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Auto-Delist Rules
export const autoDelistRules = pgTable("auto_delist_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true),
  trigger: text("trigger").notNull(), // time_based, inventory_based, date_based
  triggerValue: jsonb("trigger_value").notNull(), // { days: 30 } for time_based, { quantity: 0 } for inventory_based, { date: "2024-12-31" } for date_based
  marketplaces: text("marketplaces").array(), // null for all marketplaces
  listingIds: uuid("listing_ids").array(), // null for all listings
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auto-Delist History
export const autoDelistHistory = pgTable("auto_delist_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ruleId: uuid("rule_id").references(() => autoDelistRules.id, { onDelete: "set null" }),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  reason: text("reason").notNull(),
  delistedAt: timestamp("delisted_at").defaultNow(),
});

// Onboarding Progress table
export const onboardingProgress = pgTable("onboarding_progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  currentStep: integer("current_step").notNull().default(0),
  completedSteps: jsonb("completed_steps").notNull().default([]), // Array of completed step indices
  skipped: boolean("skipped").default(false),
  completedAt: timestamp("completed_at"),
  startedAt: timestamp("started_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analytics Events - Track all user actions and system events
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // listing_created, listing_sold, marketplace_connected, etc.
  eventData: jsonb("event_data"), // Flexible JSON for event-specific data
  marketplace: text("marketplace"),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  profit: decimal("profit", { precision: 10, scale: 2 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Sales Metrics - Detailed metrics for each sale
export const salesMetrics = pgTable("sales_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  fees: decimal("fees", { precision: 10, scale: 2 }).notNull(),
  profit: decimal("profit", { precision: 10, scale: 2 }).notNull(),
  margin: decimal("margin", { precision: 5, scale: 2 }), // Profit margin percentage
  daysToSell: integer("days_to_sell"),
  marketplace: text("marketplace").notNull(),
  category: text("category"),
  brand: text("brand"),
  soldAt: timestamp("sold_at").defaultNow(),
});

// Inventory Metrics - Track inventory performance
export const inventoryMetrics = pgTable("inventory_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  costOfGoods: decimal("cost_of_goods", { precision: 10, scale: 2 }),
  listDate: timestamp("list_date").defaultNow(),
  ageInDays: integer("age_in_days").default(0),
  turnoverRate: decimal("turnover_rate", { precision: 5, scale: 2 }), // Items sold / average inventory
  category: text("category"),
  status: text("status"), // active, sold, stale, dead
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketplace Metrics - Aggregate metrics per marketplace
export const marketplaceMetrics = pgTable("marketplace_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  totalSales: integer("total_sales").default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  avgConversionRate: decimal("avg_conversion_rate", { precision: 5, scale: 2 }),
  avgDaysToSell: decimal("avg_days_to_sell", { precision: 6, scale: 2 }),
  period: text("period"), // daily, weekly, monthly, yearly
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
});

export const insertMarketplaceConnectionSchema = createInsertSchema(marketplaceConnections).pick({
  marketplace: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiresAt: true,
  settings: true,
});

export const insertListingSchema = createInsertSchema(listings).pick({
  title: true,
  description: true,
  price: true,
  condition: true,
  category: true,
  brand: true,
  size: true,
  color: true,
  material: true,
  quantity: true,
  images: true,
});

export const insertListingPostSchema = createInsertSchema(listingPosts).pick({
  listingId: true,
  marketplace: true,
  postingData: true,
});

export const insertJobSchema = createInsertSchema(jobs).pick({
  type: true,
  data: true,
  scheduledFor: true,
});

export const insertSyncSettingsSchema = createInsertSchema(syncSettings).pick({
  autoSync: true,
  syncFrequency: true,
  syncFields: true,
  defaultBehavior: true,
});

export const insertSyncRuleSchema = createInsertSchema(syncRules).pick({
  marketplace: true,
  isEnabled: true,
  priceAdjustment: true,
  priceFormula: true,
  fieldsToSync: true,
  templateOverrides: true,
  priority: true,
});

export const insertSyncHistorySchema = createInsertSchema(syncHistory).pick({
  listingId: true,
  sourceMarketplace: true,
  targetMarketplace: true,
  syncType: true,
  status: true,
  fieldsUpdated: true,
  previousValues: true,
  newValues: true,
  errorMessage: true,
  syncDuration: true,
});

export const insertSyncConflictSchema = createInsertSchema(syncConflicts).pick({
  listingId: true,
  conflictType: true,
  sourceMarketplace: true,
  targetMarketplace: true,
  sourceValue: true,
  targetValue: true,
});

export const insertAutoDelistRuleSchema = createInsertSchema(autoDelistRules).pick({
  name: true,
  enabled: true,
  trigger: true,
  triggerValue: true,
  marketplaces: true,
  listingIds: true,
});

export const insertAutoDelistHistorySchema = createInsertSchema(autoDelistHistory).pick({
  ruleId: true,
  listingId: true,
  marketplace: true,
  reason: true,
});

export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).pick({
  currentStep: true,
  completedSteps: true,
  skipped: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).pick({
  eventType: true,
  eventData: true,
  marketplace: true,
  listingId: true,
  revenue: true,
  profit: true,
});

export const insertSalesMetricsSchema = createInsertSchema(salesMetrics).pick({
  listingId: true,
  salePrice: true,
  fees: true,
  profit: true,
  margin: true,
  daysToSell: true,
  marketplace: true,
  category: true,
  brand: true,
});

export const insertInventoryMetricsSchema = createInsertSchema(inventoryMetrics).pick({
  listingId: true,
  costOfGoods: true,
  listDate: true,
  ageInDays: true,
  turnoverRate: true,
  category: true,
  status: true,
});

export const insertMarketplaceMetricsSchema = createInsertSchema(marketplaceMetrics).pick({
  marketplace: true,
  totalSales: true,
  totalRevenue: true,
  avgConversionRate: true,
  avgDaysToSell: true,
  period: true,
  periodStart: true,
  periodEnd: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MarketplaceConnection = typeof marketplaceConnections.$inferSelect;
export type InsertMarketplaceConnection = z.infer<typeof insertMarketplaceConnectionSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type ListingPost = typeof listingPosts.$inferSelect;
export type InsertListingPost = z.infer<typeof insertListingPostSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SyncSettings = typeof syncSettings.$inferSelect;
export type InsertSyncSettings = z.infer<typeof insertSyncSettingsSchema>;
export type SyncRule = typeof syncRules.$inferSelect;
export type InsertSyncRule = z.infer<typeof insertSyncRuleSchema>;
export type SyncHistory = typeof syncHistory.$inferSelect;
export type InsertSyncHistory = z.infer<typeof insertSyncHistorySchema>;
export type SyncConflict = typeof syncConflicts.$inferSelect;
export type InsertSyncConflict = z.infer<typeof insertSyncConflictSchema>;
export type AutoDelistRule = typeof autoDelistRules.$inferSelect;
export type InsertAutoDelistRule = z.infer<typeof insertAutoDelistRuleSchema>;
export type AutoDelistHistory = typeof autoDelistHistory.$inferSelect;
export type InsertAutoDelistHistory = z.infer<typeof insertAutoDelistHistorySchema>;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type SalesMetrics = typeof salesMetrics.$inferSelect;
export type InsertSalesMetrics = z.infer<typeof insertSalesMetricsSchema>;
export type InventoryMetrics = typeof inventoryMetrics.$inferSelect;
export type InsertInventoryMetrics = z.infer<typeof insertInventoryMetricsSchema>;
export type MarketplaceMetrics = typeof marketplaceMetrics.$inferSelect;
export type InsertMarketplaceMetrics = z.infer<typeof insertMarketplaceMetricsSchema>;
