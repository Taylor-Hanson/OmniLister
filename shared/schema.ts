import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// eBay Condition Enums and Constants
export const EBAY_CONDITIONS = {
  NEW: { value: "NEW", id: 1000, label: "New", description: "Brand-new, unopened item in original packaging" },
  LIKE_NEW: { value: "LIKE_NEW", id: 2750, label: "Like New", description: "Opened but very lightly used or unused" },
  NEW_OTHER: { value: "NEW_OTHER", id: 1500, label: "New Other", description: "New unused item, missing original packaging" },
  NEW_WITH_DEFECTS: { value: "NEW_WITH_DEFECTS", id: 1750, label: "New with Defects", description: "New unused item with defects" },
  CERTIFIED_REFURBISHED: { value: "CERTIFIED_REFURBISHED", id: 2000, label: "Certified Refurbished", description: "Inspected and refurbished by manufacturer" },
  EXCELLENT_REFURBISHED: { value: "EXCELLENT_REFURBISHED", id: 2010, label: "Excellent Refurbished", description: "Like new condition, refurbished by manufacturer" },
  VERY_GOOD_REFURBISHED: { value: "VERY_GOOD_REFURBISHED", id: 2020, label: "Very Good Refurbished", description: "Minimal wear, refurbished by manufacturer" },
  GOOD_REFURBISHED: { value: "GOOD_REFURBISHED", id: 2030, label: "Good Refurbished", description: "Moderate wear, refurbished by manufacturer" },
  SELLER_REFURBISHED: { value: "SELLER_REFURBISHED", id: 2500, label: "Seller Refurbished", description: "Restored to working order by seller" },
  USED_EXCELLENT: { value: "USED_EXCELLENT", id: 3000, label: "Used - Excellent", description: "Used but in excellent condition" },
  USED_VERY_GOOD: { value: "USED_VERY_GOOD", id: 4000, label: "Used - Very Good", description: "Used but in very good condition" },
  USED_GOOD: { value: "USED_GOOD", id: 5000, label: "Used - Good", description: "Used but in good condition" },
  USED_ACCEPTABLE: { value: "USED_ACCEPTABLE", id: 6000, label: "Used - Acceptable", description: "Used, in acceptable condition" },
  FOR_PARTS_OR_NOT_WORKING: { value: "FOR_PARTS_OR_NOT_WORKING", id: 7000, label: "For Parts or Not Working", description: "Not fully functioning, for parts or repair" },
  PRE_OWNED_EXCELLENT: { value: "PRE_OWNED_EXCELLENT", id: 2990, label: "Pre-owned - Excellent", description: "Previously owned, excellent condition (apparel)" },
  PRE_OWNED_FAIR: { value: "PRE_OWNED_FAIR", id: 3010, label: "Pre-owned - Fair", description: "Previously owned, fair condition (apparel)" }
} as const;

export const LISTING_FORMATS = {
  FIXED_PRICE: "FIXED_PRICE",
  AUCTION: "AUCTION"
} as const;

export const LISTING_DURATIONS = {
  GTC: "GTC", // Good Till Cancelled
  DAYS_1: "DAYS_1",
  DAYS_3: "DAYS_3", 
  DAYS_5: "DAYS_5",
  DAYS_7: "DAYS_7",
  DAYS_10: "DAYS_10",
  DAYS_30: "DAYS_30"
} as const;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  plan: text("plan").notNull().default("free"), // free, starter, growth, professional, unlimited
  listingCredits: integer("listing_credits").default(10), // Monthly listing allowance (null for unlimited)
  listingsUsedThisMonth: integer("listings_used_this_month").default(0),
  billingCycleStart: timestamp("billing_cycle_start").defaultNow(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("inactive"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  timezone: text("timezone").default("UTC"), // User's timezone for intelligent scheduling
  preferredPostingWindows: jsonb("preferred_posting_windows"), // User's preferred posting times per marketplace
  optimizationSettings: jsonb("optimization_settings"), // Auto-optimization preferences
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketplaceConnections = pgTable("marketplace_connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(), // ebay, poshmark, mercari, shopify, etc.
  isConnected: boolean("is_connected").default(false),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  lastSyncAt: timestamp("last_sync_at"),
  settings: jsonb("settings"), // marketplace-specific settings
  
  // Shopify-specific connection fields
  shopUrl: text("shop_url"), // Shopify shop domain (e.g., myshop.myshopify.com)
  shopifyApiVersion: text("shopify_api_version").default("2024-01"), // API version for compatibility
  shopifyWebhookId: text("shopify_webhook_id"), // Webhook subscription ID for real-time updates
  shopifyLocationId: text("shopify_location_id"), // Default fulfillment location
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Basic Product Information
  title: text("title").notNull(),
  description: text("description"),
  subtitle: text("subtitle"), // eBay subtitle feature (55 chars max)
  listingDescription: text("listing_description"), // Separate from product description
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1),
  images: jsonb("images"), // array of image URLs
  
  // Enhanced Condition System
  condition: text("condition"), // eBay condition enum (NEW, USED_EXCELLENT, etc.)
  conditionDescription: text("condition_description"), // Detailed condition explanation
  conditionId: integer("condition_id"), // eBay condition ID (1000, 3000, etc.)
  
  // Product Identification (eBay Requirements)
  gtin: text("gtin"), // Global Trade Item Number
  upc: text("upc"), // Universal Product Code
  ean: text("ean"), // European Article Number
  isbn: text("isbn"), // For books
  mpn: text("mpn"), // Manufacturer Part Number
  epid: text("epid"), // eBay Product ID (preferred)
  
  // Product Details
  category: text("category"),
  brand: text("brand"),
  size: text("size"),
  color: text("color"),
  material: text("material"),
  itemSpecifics: jsonb("item_specifics"), // Dynamic name-value pairs for eBay
  
  // Shopify-Specific Fields
  shopifyProductId: text("shopify_product_id"), // Shopify product ID
  shopifyVariantId: text("shopify_variant_id"), // Shopify variant ID  
  shopifyHandle: text("shopify_handle"), // URL handle/slug
  vendor: text("vendor"), // Product vendor/manufacturer
  productType: text("product_type"), // Shopify product type
  tags: text("tags").array(), // Product tags for organization and SEO
  
  // SEO Fields (Shopify & general)
  metaTitle: text("meta_title"), // SEO title
  metaDescription: text("meta_description"), // SEO description
  metaKeywords: text("meta_keywords").array(), // SEO keywords
  
  // Product Options & Variants (Shopify)
  options: jsonb("options"), // Product options like [{name: "Size", values: ["S", "M", "L"]}]
  variants: jsonb("variants"), // Product variants with price, SKU, inventory, etc.
  requiresShipping: boolean("requires_shipping").default(true),
  weight: decimal("weight", { precision: 10, scale: 3 }), // Product weight
  weightUnit: text("weight_unit").default("lb"), // lb, oz, kg, g
  
  // Shipping & Package Information
  packageWeight: decimal("package_weight", { precision: 8, scale: 3 }), // Weight in pounds/kg
  packageDimensions: jsonb("package_dimensions"), // {length, width, height, unit}
  
  // eBay Listing Policies
  fulfillmentPolicyId: text("fulfillment_policy_id"),
  paymentPolicyId: text("payment_policy_id"),
  returnPolicyId: text("return_policy_id"),
  merchantLocationKey: text("merchant_location_key"),
  
  // Advanced Listing Options
  listingFormat: text("listing_format").default("FIXED_PRICE"), // FIXED_PRICE, AUCTION
  listingDuration: text("listing_duration").default("GTC"), // Good Till Cancelled
  startPrice: decimal("start_price", { precision: 10, scale: 2 }), // For auctions
  reservePrice: decimal("reserve_price", { precision: 10, scale: 2 }),
  buyItNowPrice: decimal("buy_it_now_price", { precision: 10, scale: 2 }),
  
  // Scheduling
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  
  // Store Categories
  storeCategoryNames: text("store_category_names").array(),
  
  // System Fields
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
  shopifyInventoryItemId: text("shopify_inventory_item_id"), // Shopify inventory tracking ID
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
  smartScheduled: boolean("smart_scheduled").default(false), // Whether this job was intelligently scheduled
  originalScheduledFor: timestamp("original_scheduled_for"), // Original requested time before smart scheduling
  marketplaceGroup: text("marketplace_group"), // Group ID for batch processing multiple marketplaces
  priority: integer("priority").default(0), // Higher priority jobs get scheduled first
  schedulingMetadata: jsonb("scheduling_metadata"), // Smart scheduling analytics and reasoning
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketplace Posting Rules - optimal timing rules per marketplace
export const marketplacePostingRules = pgTable("marketplace_posting_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplace: text("marketplace").notNull().unique(),
  optimalWindows: jsonb("optimal_windows").notNull(), // Array of {dayOfWeek: 0-6, startHour: 0-23, endHour: 0-23, timezone: string}
  peakHours: jsonb("peak_hours"), // Array of hour ranges when marketplace is most active
  avoidHours: jsonb("avoid_hours"), // Array of hour ranges to avoid posting (downtime, maintenance)
  rateLimitPerHour: integer("rate_limit_per_hour").default(100), // Max posts per hour
  rateLimitPerDay: integer("rate_limit_per_day").default(1000), // Max posts per day
  minDelayBetweenPosts: integer("min_delay_between_posts").default(30), // Seconds between posts
  categorySpecificRules: jsonb("category_specific_rules"), // Special rules for specific categories
  seasonalAdjustments: jsonb("seasonal_adjustments"), // Seasonal posting patterns
  success_multiplier: decimal("success_multiplier", { precision: 3, scale: 2 }).default("1.0"), // Success rate multiplier for this marketplace
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Posting Success Analytics - track posting success to improve future scheduling
export const postingSuccessAnalytics = pgTable("posting_success_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "cascade" }),
  postedAt: timestamp("posted_at").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
  hourOfDay: integer("hour_of_day").notNull(), // 0-23
  category: text("category"),
  brand: text("brand"),
  priceRange: text("price_range"), // low, medium, high
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  messages: integer("messages").default(0),
  sold: boolean("sold").default(false),
  daysToSell: integer("days_to_sell"),
  engagement_score: decimal("engagement_score", { precision: 5, scale: 2 }).default("0"), // Calculated engagement metric
  success_score: decimal("success_score", { precision: 5, scale: 2 }).default("0"), // Overall success metric
  timezone: text("timezone").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rate Limiting Tracker - track API usage per marketplace
export const rateLimitTracker = pgTable("rate_limit_tracker", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplace: text("marketplace").notNull(),
  timeWindow: timestamp("time_window").notNull(), // Hour or day window start
  windowStart: timestamp("window_start").notNull(), // Alias for timeWindow for backwards compatibility
  windowType: text("window_type").notNull(), // hourly, daily
  requestCount: integer("request_count").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  remainingLimit: integer("remaining_limit"),
  resetTime: timestamp("reset_time"),
  lastRequestAt: timestamp("last_request_at"),
  isBlocked: boolean("is_blocked").default(false), // Whether marketplace is currently rate limited
  createdAt: timestamp("created_at").defaultNow(),
});

// Queue Distribution - manage posting queue load balancing
export const queueDistribution = pgTable("queue_distribution", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  timeSlot: timestamp("time_slot").notNull(), // 15-minute time slots
  marketplace: text("marketplace").notNull(),
  scheduledJobs: integer("scheduled_jobs").default(0),
  maxCapacity: integer("max_capacity").default(10), // Max jobs per time slot per marketplace
  averageProcessingTime: integer("average_processing_time").default(60), // Seconds
  priority_weight: decimal("priority_weight", { precision: 3, scale: 2 }).default("1.0"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  metadata: jsonb("metadata"), // Additional metadata for events
  marketplace: text("marketplace"),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  profit: decimal("profit", { precision: 10, scale: 2 }),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(), // For compatibility with services expecting createdAt
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

// Job Retry History - Track all retry attempts with detailed failure categorization
export const jobRetryHistory = pgTable("job_retry_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull(),
  failureCategory: text("failure_category").notNull(), // permanent, temporary, rate_limit, auth, network, validation, marketplace_error
  errorType: text("error_type"), // More specific error classification
  errorMessage: text("error_message"),
  errorCode: text("error_code"), // HTTP status or marketplace error code
  marketplace: text("marketplace"),
  retryDelay: integer("retry_delay"), // Actual delay used in milliseconds
  nextRetryAt: timestamp("next_retry_at"),
  stackTrace: text("stack_trace"),
  requestData: jsonb("request_data"), // Request data that caused the failure
  responseData: jsonb("response_data"), // Response data if available
  contextData: jsonb("context_data"), // Additional context like rate limit headers
  processingDuration: integer("processing_duration"), // How long the attempt took in milliseconds
  timestamp: timestamp("timestamp").defaultNow(),
});

// Failure Categories - Define failure types and their retry strategies
export const failureCategories = pgTable("failure_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull().unique(), // permanent, temporary, rate_limit, auth, network, validation, marketplace_error
  description: text("description").notNull(),
  shouldRetry: boolean("should_retry").default(true),
  maxRetries: integer("max_retries").default(3),
  baseDelayMs: integer("base_delay_ms").default(1000), // Base delay in milliseconds
  maxDelayMs: integer("max_delay_ms").default(300000), // Max delay (5 minutes)
  backoffMultiplier: decimal("backoff_multiplier", { precision: 3, scale: 2 }).default("2.0"),
  jitterRange: decimal("jitter_range", { precision: 3, scale: 2 }).default("0.1"), // 10% jitter
  requiresUserIntervention: boolean("requires_user_intervention").default(false),
  circuitBreakerEnabled: boolean("circuit_breaker_enabled").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Circuit Breaker Status - Track circuit breaker state per marketplace
export const circuitBreakerStatus = pgTable("circuit_breaker_status", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplace: text("marketplace").notNull().unique(),
  status: text("status").default("closed"), // closed, open, half_open
  failureCount: integer("failure_count").default(0),
  successCount: integer("success_count").default(0),
  lastFailureAt: timestamp("last_failure_at"),
  lastSuccessAt: timestamp("last_success_at"),
  openedAt: timestamp("opened_at"),
  nextRetryAt: timestamp("next_retry_at"),
  failureThreshold: integer("failure_threshold").default(5), // Failures before opening
  recoveryThreshold: integer("recovery_threshold").default(3), // Successes before closing
  timeoutMs: integer("timeout_ms").default(60000), // 1 minute timeout
  halfOpenMaxRequests: integer("half_open_max_requests").default(3),
  currentHalfOpenRequests: integer("current_half_open_requests").default(0),
  metadata: jsonb("metadata"), // Additional marketplace-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dead Letter Queue - Store repeatedly failing jobs
export const deadLetterQueue = pgTable("dead_letter_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  originalJobId: uuid("original_job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  jobData: jsonb("job_data").notNull(),
  finalFailureCategory: text("final_failure_category").notNull(),
  totalAttempts: integer("total_attempts").notNull(),
  firstFailureAt: timestamp("first_failure_at").notNull(),
  lastFailureAt: timestamp("last_failure_at").notNull(),
  failureHistory: jsonb("failure_history"), // Summary of all retry attempts
  requiresManualReview: boolean("requires_manual_review").default(true),
  resolutionStatus: text("resolution_status").default("pending"), // pending, resolved, discarded
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Retry Metrics - Aggregate metrics for retry patterns and success rates
export const retryMetrics = pgTable("retry_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplace: text("marketplace").notNull(),
  jobType: text("job_type").notNull(),
  failureCategory: text("failure_category").notNull(),
  timeWindow: timestamp("time_window").notNull(), // Hour window start
  totalAttempts: integer("total_attempts").default(0),
  successfulRetries: integer("successful_retries").default(0),
  failedRetries: integer("failed_retries").default(0),
  avgRetryDelay: decimal("avg_retry_delay", { precision: 10, scale: 2 }).default("0"),
  maxRetryDelay: integer("max_retry_delay").default(0),
  minRetryDelay: integer("min_retry_delay").default(0),
  avgProcessingTime: decimal("avg_processing_time", { precision: 10, scale: 2 }).default("0"),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default("0"), // 0-100%
  deadLetterCount: integer("dead_letter_count").default(0),
  circuitBreakerTriggered: integer("circuit_breaker_triggered").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketplace Retry Config - Marketplace-specific retry configurations
export const marketplaceRetryConfig = pgTable("marketplace_retry_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplace: text("marketplace").notNull().unique(),
  isEnabled: boolean("is_enabled").default(true),
  globalMaxRetries: integer("global_max_retries").default(5),
  rateLimitDetection: jsonb("rate_limit_detection"), // Headers and patterns to detect rate limits
  customErrorMappings: jsonb("custom_error_mappings"), // Marketplace-specific error categorization
  retryDelayOverrides: jsonb("retry_delay_overrides"), // Custom delays per failure category
  circuitBreakerConfig: jsonb("circuit_breaker_config"), // Marketplace-specific circuit breaker settings
  maintenanceWindows: jsonb("maintenance_windows"), // Known maintenance schedules to avoid
  adaptiveRetryEnabled: boolean("adaptive_retry_enabled").default(true),
  adaptiveSuccessThreshold: decimal("adaptive_success_threshold", { precision: 3, scale: 2 }).default("0.8"), // 80% success rate
  adaptiveAdjustmentFactor: decimal("adaptive_adjustment_factor", { precision: 3, scale: 2 }).default("1.5"), // Adjustment multiplier
  priority: integer("priority").default(0), // Priority for retry processing
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook Configurations - Store webhook settings per marketplace per user
export const webhookConfigurations = pgTable("webhook_configurations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(), // ebay, mercari, poshmark, etc.
  isEnabled: boolean("is_enabled").default(true),
  webhookUrl: text("webhook_url").notNull(), // Our webhook endpoint URL
  externalWebhookId: text("external_webhook_id"), // ID from marketplace webhook system
  webhookSecret: text("webhook_secret"), // Secret for signature verification
  supportedEvents: text("supported_events").array(), // sale_completed, listing_ended, etc.
  subscribedEvents: text("subscribed_events").array(), // Events we're actually subscribed to
  lastVerificationAt: timestamp("last_verification_at"),
  verificationStatus: text("verification_status").default("pending"), // pending, verified, failed
  autoRegistered: boolean("auto_registered").default(false), // Whether this was auto-configured
  registrationData: jsonb("registration_data"), // Marketplace-specific registration details
  errorCount: integer("error_count").default(0), // Failed webhook attempts
  lastErrorAt: timestamp("last_error_at"),
  lastErrorMessage: text("last_error_message"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"), // Additional marketplace-specific config
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook Events - Store incoming webhook events for processing and auditing
export const webhookEvents: any = pgTable("webhook_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  eventType: text("event_type").notNull(), // sale_completed, listing_ended, inventory_updated, etc.
  eventId: text("event_id"), // Unique event ID from marketplace (for deduplication)
  externalId: text("external_id"), // External listing/item/order ID
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  eventData: jsonb("event_data").notNull(), // Raw webhook payload
  processedData: jsonb("processed_data"), // Normalized event data
  signature: text("signature"), // Webhook signature for verification
  signatureValid: boolean("signature_valid"),
  processingStatus: text("processing_status").default("pending"), // pending, processing, completed, failed, ignored
  processingAttempts: integer("processing_attempts").default(0),
  maxRetries: integer("max_retries").default(3),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  syncJobId: uuid("sync_job_id").references(() => crossPlatformSyncJobs.id, { onDelete: "set null" }),
  duplicateOfEventId: uuid("duplicate_of_event_id").references((): any => webhookEvents.id, { onDelete: "set null" }),
  processingTime: integer("processing_time"), // Time taken to process in milliseconds
  ipAddress: text("ip_address"), // Source IP for security
  userAgent: text("user_agent"),
  headers: jsonb("headers"), // HTTP headers from webhook request
  priority: integer("priority").default(5), // Processing priority (1-10, higher = more urgent)
  scheduledForRetryAt: timestamp("scheduled_for_retry_at"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Webhook Deliveries - Track webhook delivery status and health monitoring
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookConfigId: uuid("webhook_config_id").notNull().references(() => webhookConfigurations.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  eventType: text("event_type").notNull(),
  deliveryAttempt: integer("delivery_attempt").default(1),
  httpStatus: integer("http_status"),
  responseTime: integer("response_time"), // Response time in milliseconds
  successful: boolean("successful").default(false),
  errorMessage: text("error_message"),
  requestHeaders: jsonb("request_headers"),
  requestBody: jsonb("request_body"),
  responseHeaders: jsonb("response_headers"),
  responseBody: text("response_body"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(5),
  nextRetryAt: timestamp("next_retry_at"),
  finalFailure: boolean("final_failure").default(false),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Polling Schedules - For marketplaces without webhook support
export const pollingSchedules = pgTable("polling_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  pollingInterval: integer("polling_interval").default(300), // Seconds between polls (default 5 minutes)
  lastPollAt: timestamp("last_poll_at"),
  nextPollAt: timestamp("next_poll_at"),
  pollEndpoint: text("poll_endpoint"), // API endpoint to poll
  pollMethod: text("poll_method").default("GET"), // HTTP method
  pollHeaders: jsonb("poll_headers"), // Required headers for polling
  pollParams: jsonb("poll_params"), // Query parameters
  lastPollStatus: text("last_poll_status"), // success, failed, rate_limited
  lastPollResponse: jsonb("last_poll_response"), // Last response data
  lastPollError: text("last_poll_error"),
  consecutiveFailures: integer("consecutive_failures").default(0),
  maxFailures: integer("max_failures").default(10), // Disable after this many failures
  adaptivePolling: boolean("adaptive_polling").default(true), // Adjust interval based on activity
  minInterval: integer("min_interval").default(60), // Minimum seconds between polls
  maxInterval: integer("max_interval").default(3600), // Maximum seconds between polls
  currentInterval: integer("current_interval").default(300), // Current adaptive interval
  lastSaleDetectedAt: timestamp("last_sale_detected_at"),
  salesDetectedSinceLastPoll: integer("sales_detected_since_last_poll").default(0),
  errorCount: integer("error_count").default(0),
  metadata: jsonb("metadata"), // Marketplace-specific polling config
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook Health Monitoring - Track webhook system health and performance
export const webhookHealthMetrics = pgTable("webhook_health_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  marketplace: text("marketplace").notNull(),
  timeWindow: timestamp("time_window").notNull(), // Hour window start
  totalEvents: integer("total_events").default(0),
  successfulEvents: integer("successful_events").default(0),
  failedEvents: integer("failed_events").default(0),
  duplicateEvents: integer("duplicate_events").default(0),
  averageProcessingTime: decimal("average_processing_time", { precision: 10, scale: 2 }).default("0"),
  maxProcessingTime: integer("max_processing_time").default(0),
  minProcessingTime: integer("min_processing_time").default(0),
  signatureFailures: integer("signature_failures").default(0),
  rateLimitHits: integer("rate_limit_hits").default(0),
  retryCount: integer("retry_count").default(0),
  syncJobsTriggered: integer("sync_jobs_triggered").default(0),
  successfulSyncs: integer("successful_syncs").default(0),
  failedSyncs: integer("failed_syncs").default(0),
  healthScore: decimal("health_score", { precision: 5, scale: 2 }).default("100"), // 0-100 health percentage
  uptime: decimal("uptime", { precision: 5, scale: 2 }).default("100"), // Percentage uptime
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  timezone: true,
  preferredPostingWindows: true,
});

// Optimization settings schema
export const optimizationSettingsSchema = z.object({
  autoOptimization: z.boolean().default(false),
  autoScheduling: z.boolean().default(true),
  autoPricing: z.boolean().default(false),
  optimizationThreshold: z.number().min(50).max(90).default(70),
  learningMode: z.boolean().default(true),
  notifyOptimizations: z.boolean().default(true),
});

export type OptimizationSettings = z.infer<typeof optimizationSettingsSchema>;

export const insertMarketplaceConnectionSchema = createInsertSchema(marketplaceConnections).pick({
  marketplace: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiresAt: true,
  settings: true,
});

// eBay condition validation schema
export const ebayConditionSchema = z.enum([
  "NEW", "LIKE_NEW", "NEW_OTHER", "NEW_WITH_DEFECTS",
  "CERTIFIED_REFURBISHED", "EXCELLENT_REFURBISHED", "VERY_GOOD_REFURBISHED", 
  "GOOD_REFURBISHED", "SELLER_REFURBISHED",
  "USED_EXCELLENT", "USED_VERY_GOOD", "USED_GOOD", "USED_ACCEPTABLE",
  "FOR_PARTS_OR_NOT_WORKING", "PRE_OWNED_EXCELLENT", "PRE_OWNED_FAIR"
]);

// Package dimensions validation schema
export const packageDimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(), 
  height: z.number().positive(),
  unit: z.enum(["inches", "cm"]).default("inches")
}).optional();

// Item specifics validation schema
export const itemSpecificsSchema = z.array(z.object({
  name: z.string().min(1),
  value: z.string().min(1)
})).optional();

export const insertListingSchema = createInsertSchema(listings, {
  // Enhanced validation for new fields
  condition: ebayConditionSchema.optional(),
  conditionDescription: z.string().max(1000).optional(),
  conditionId: z.number().min(1000).max(7000).optional(),
  subtitle: z.string().max(55).optional(), // eBay subtitle limit
  gtin: z.string().length(14).optional(), // GTIN-14 standard
  upc: z.string().length(12).optional(), // UPC-A standard  
  ean: z.string().length(13).optional(), // EAN-13 standard
  isbn: z.string().regex(/^(?:\d{9}[\dX]|\d{13})$/).optional(), // ISBN-10 or ISBN-13
  mpn: z.string().max(65).optional(),
  epid: z.string().optional(),
  packageWeight: z.number().positive().max(150).optional(), // Max 150 lbs
  packageDimensions: packageDimensionsSchema,
  itemSpecifics: itemSpecificsSchema,
  listingFormat: z.enum(["FIXED_PRICE", "AUCTION"]).default("FIXED_PRICE"),
  listingDuration: z.enum(["GTC", "DAYS_1", "DAYS_3", "DAYS_5", "DAYS_7", "DAYS_10", "DAYS_30"]).default("GTC"),
  startPrice: z.number().positive().optional(),
  reservePrice: z.number().positive().optional(),
  buyItNowPrice: z.number().positive().optional(),
  storeCategoryNames: z.array(z.string()).optional(),
}).pick({
  // Basic Product Information
  title: true,
  description: true,
  subtitle: true,
  listingDescription: true,
  price: true,
  quantity: true,
  images: true,
  
  // Enhanced Condition System
  condition: true,
  conditionDescription: true,
  conditionId: true,
  
  // Product Identification (eBay Requirements)
  gtin: true,
  upc: true,
  ean: true,
  isbn: true,
  mpn: true,
  epid: true,
  
  // Product Details
  category: true,
  brand: true,
  size: true,
  color: true,
  material: true,
  itemSpecifics: true,
  
  // Shipping & Package Information
  packageWeight: true,
  packageDimensions: true,
  
  // eBay Listing Policies
  fulfillmentPolicyId: true,
  paymentPolicyId: true,
  returnPolicyId: true,
  merchantLocationKey: true,
  
  // Advanced Listing Options
  listingFormat: true,
  listingDuration: true,
  startPrice: true,
  reservePrice: true,
  buyItNowPrice: true,
  
  // Scheduling
  scheduledStartTime: true,
  scheduledEndTime: true,
  
  // Store Categories
  storeCategoryNames: true,
}).extend({
  // Custom validation rules
  condition: ebayConditionSchema.optional(),
  packageDimensions: packageDimensionsSchema,
  itemSpecifics: itemSpecificsSchema,
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
  smartScheduled: true,
  originalScheduledFor: true,
  marketplaceGroup: true,
  priority: true,
  schedulingMetadata: true,
});

export const insertMarketplacePostingRulesSchema = createInsertSchema(marketplacePostingRules).pick({
  marketplace: true,
  optimalWindows: true,
  peakHours: true,
  avoidHours: true,
  rateLimitPerHour: true,
  rateLimitPerDay: true,
  minDelayBetweenPosts: true,
  categorySpecificRules: true,
  seasonalAdjustments: true,
  success_multiplier: true,
  isActive: true,
});

export const insertPostingSuccessAnalyticsSchema = createInsertSchema(postingSuccessAnalytics).pick({
  marketplace: true,
  listingId: true,
  postedAt: true,
  dayOfWeek: true,
  hourOfDay: true,
  category: true,
  brand: true,
  priceRange: true,
  views: true,
  likes: true,
  messages: true,
  sold: true,
  daysToSell: true,
  engagement_score: true,
  success_score: true,
  timezone: true,
});

export const insertRateLimitTrackerSchema = createInsertSchema(rateLimitTracker).pick({
  marketplace: true,
  timeWindow: true,
  windowStart: true,
  windowType: true,
  requestCount: true,
  successCount: true,
  failureCount: true,
  remainingLimit: true,
  resetTime: true,
  lastRequestAt: true,
  isBlocked: true,
});

export const insertQueueDistributionSchema = createInsertSchema(queueDistribution).pick({
  timeSlot: true,
  marketplace: true,
  scheduledJobs: true,
  maxCapacity: true,
  averageProcessingTime: true,
  priority_weight: true,
  isAvailable: true,
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
  metadata: true,
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

export const insertJobRetryHistorySchema = createInsertSchema(jobRetryHistory).pick({
  jobId: true,
  attemptNumber: true,
  failureCategory: true,
  errorType: true,
  errorMessage: true,
  errorCode: true,
  marketplace: true,
  retryDelay: true,
  nextRetryAt: true,
  stackTrace: true,
  requestData: true,
  responseData: true,
  contextData: true,
  processingDuration: true,
});

export const insertFailureCategorySchema = createInsertSchema(failureCategories).pick({
  category: true,
  description: true,
  shouldRetry: true,
  maxRetries: true,
  baseDelayMs: true,
  maxDelayMs: true,
  backoffMultiplier: true,
  jitterRange: true,
  requiresUserIntervention: true,
  circuitBreakerEnabled: true,
  isActive: true,
});

export const insertCircuitBreakerStatusSchema = createInsertSchema(circuitBreakerStatus).pick({
  marketplace: true,
  status: true,
  failureCount: true,
  successCount: true,
  lastFailureAt: true,
  lastSuccessAt: true,
  openedAt: true,
  nextRetryAt: true,
  failureThreshold: true,
  recoveryThreshold: true,
  timeoutMs: true,
  halfOpenMaxRequests: true,
  currentHalfOpenRequests: true,
  metadata: true,
});

export const insertDeadLetterQueueSchema = createInsertSchema(deadLetterQueue).pick({
  originalJobId: true,
  jobType: true,
  jobData: true,
  finalFailureCategory: true,
  totalAttempts: true,
  firstFailureAt: true,
  lastFailureAt: true,
  failureHistory: true,
  requiresManualReview: true,
  resolutionStatus: true,
  resolutionNotes: true,
  resolvedAt: true,
  resolvedBy: true,
});

export const insertRetryMetricsSchema = createInsertSchema(retryMetrics).pick({
  marketplace: true,
  jobType: true,
  failureCategory: true,
  timeWindow: true,
  totalAttempts: true,
  successfulRetries: true,
  failedRetries: true,
  avgRetryDelay: true,
  maxRetryDelay: true,
  minRetryDelay: true,
  avgProcessingTime: true,
  successRate: true,
  deadLetterCount: true,
  circuitBreakerTriggered: true,
});

export const insertMarketplaceRetryConfigSchema = createInsertSchema(marketplaceRetryConfig).pick({
  marketplace: true,
  isEnabled: true,
  globalMaxRetries: true,
  rateLimitDetection: true,
  customErrorMappings: true,
  retryDelayOverrides: true,
  circuitBreakerConfig: true,
  maintenanceWindows: true,
  adaptiveRetryEnabled: true,
  adaptiveSuccessThreshold: true,
  adaptiveAdjustmentFactor: true,
  priority: true,
  isActive: true,
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
// Alias types for backwards compatibility
export type Sale = SalesMetrics;
export type InsertSale = InsertSalesMetrics;
export type InventoryMetrics = typeof inventoryMetrics.$inferSelect;
export type InsertInventoryMetrics = z.infer<typeof insertInventoryMetricsSchema>;
export type MarketplaceMetrics = typeof marketplaceMetrics.$inferSelect;
export type InsertMarketplaceMetrics = z.infer<typeof insertMarketplaceMetricsSchema>;
export type JobRetryHistory = typeof jobRetryHistory.$inferSelect;
export type InsertJobRetryHistory = z.infer<typeof insertJobRetryHistorySchema>;
export type FailureCategory = typeof failureCategories.$inferSelect;
export type InsertFailureCategory = z.infer<typeof insertFailureCategorySchema>;
export type CircuitBreakerStatus = typeof circuitBreakerStatus.$inferSelect;
export type InsertCircuitBreakerStatus = z.infer<typeof insertCircuitBreakerStatusSchema>;
export type DeadLetterQueue = typeof deadLetterQueue.$inferSelect;
export type InsertDeadLetterQueue = z.infer<typeof insertDeadLetterQueueSchema>;
export type RetryMetrics = typeof retryMetrics.$inferSelect;
export type InsertRetryMetrics = z.infer<typeof insertRetryMetricsSchema>;
export type MarketplaceRetryConfig = typeof marketplaceRetryConfig.$inferSelect;
export type InsertMarketplaceRetryConfig = z.infer<typeof insertMarketplaceRetryConfigSchema>;
export type MarketplacePostingRules = typeof marketplacePostingRules.$inferSelect;
export type InsertMarketplacePostingRules = z.infer<typeof insertMarketplacePostingRulesSchema>;
export type PostingSuccessAnalytics = typeof postingSuccessAnalytics.$inferSelect;
export type InsertPostingSuccessAnalytics = z.infer<typeof insertPostingSuccessAnalyticsSchema>;
export type RateLimitTracker = typeof rateLimitTracker.$inferSelect;
export type InsertRateLimitTracker = z.infer<typeof insertRateLimitTrackerSchema>;
export type QueueDistribution = typeof queueDistribution.$inferSelect;
export type InsertQueueDistribution = z.infer<typeof insertQueueDistributionSchema>;

// Batches - Main table for batch operations
export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // bulk_post, bulk_delist, bulk_update, bulk_import
  status: text("status").default("pending"), // pending, processing, paused, completed, failed, cancelled
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  successfulItems: integer("successful_items").default(0),
  failedItems: integer("failed_items").default(0),
  progress: integer("progress").default(0), // 0-100
  targetMarketplaces: text("target_marketplaces").array(), // Array of marketplace names
  batchSettings: jsonb("batch_settings"), // Batch-specific configuration
  schedulingSettings: jsonb("scheduling_settings"), // Smart scheduling preferences
  priority: integer("priority").default(0), // Higher priority batches process first
  estimatedCompletionAt: timestamp("estimated_completion_at"),
  startedAt: timestamp("started_at"),
  pausedAt: timestamp("paused_at"),
  resumedAt: timestamp("resumed_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  errorMessage: text("error_message"),
  batchMetadata: jsonb("batch_metadata"), // Additional metadata for analytics
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Batch Items - Individual items within a batch
export const batchItems = pgTable("batch_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: uuid("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  itemIndex: integer("item_index").notNull(), // Order within batch
  status: text("status").default("pending"), // pending, processing, completed, failed, skipped
  itemData: jsonb("item_data"), // Original item data (for imports/creates)
  processedData: jsonb("processed_data"), // Processed/transformed data
  marketplaces: text("marketplaces").array(), // Target marketplaces for this item
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  errorCategory: text("error_category"), // validation, network, marketplace, etc.
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  itemMetadata: jsonb("item_metadata"), // Additional item-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bulk Uploads - Track bulk upload sessions
export const bulkUploads = pgTable("bulk_uploads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").references(() => batches.id, { onDelete: "set null" }),
  uploadType: text("upload_type").notNull(), // csv, excel, images, json
  fileName: text("file_name"),
  fileSize: integer("file_size"), // In bytes
  fileUrl: text("file_url"), // Object storage URL if applicable
  status: text("status").default("processing"), // processing, completed, failed
  totalRecords: integer("total_records").default(0),
  validRecords: integer("valid_records").default(0),
  invalidRecords: integer("invalid_records").default(0),
  processingProgress: integer("processing_progress").default(0), // 0-100
  validationErrors: jsonb("validation_errors"), // Array of validation errors
  parsingErrors: jsonb("parsing_errors"), // File parsing errors
  uploadSettings: jsonb("upload_settings"), // Upload-specific configuration
  previewData: jsonb("preview_data"), // Sample of parsed data for preview
  mappingConfiguration: jsonb("mapping_configuration"), // Field mapping for CSV/Excel
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Batch Templates - Saved batch configurations for reuse
export const batchTemplates = pgTable("batch_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // bulk_post, bulk_delist, bulk_update
  isDefault: boolean("is_default").default(false),
  templateConfig: jsonb("template_config").notNull(), // Complete template configuration
  defaultMarketplaces: text("default_marketplaces").array(),
  defaultScheduling: jsonb("default_scheduling"), // Default scheduling settings
  fieldMappings: jsonb("field_mappings"), // Default field mappings for uploads
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  isPublic: boolean("is_public").default(false), // Whether template can be shared
  tags: text("tags").array(), // Tags for organization
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Batch Analytics - Track batch performance and analytics
export const batchAnalytics = pgTable("batch_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  marketplace: text("marketplace"), // null for overall batch analytics
  totalItems: integer("total_items").default(0),
  successfulItems: integer("successful_items").default(0),
  failedItems: integer("failed_items").default(0),
  avgProcessingTime: integer("avg_processing_time"), // Average time per item in seconds
  totalProcessingTime: integer("total_processing_time"), // Total batch time in seconds
  successRate: decimal("success_rate", { precision: 5, scale: 2 }), // Percentage
  costEfficiency: decimal("cost_efficiency", { precision: 8, scale: 4 }), // Credits per successful item
  optimizationScore: integer("optimization_score"), // 0-100 optimization effectiveness
  rateLimitHits: integer("rate_limit_hits").default(0),
  retryCount: integer("retry_count").default(0),
  errorBreakdown: jsonb("error_breakdown"), // Categorized error counts
  timingAnalytics: jsonb("timing_analytics"), // Detailed timing breakdown
  recommendationApplied: boolean("recommendation_applied").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Batch Queue - Manage batch processing queue with priority
export const batchQueue = pgTable("batch_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: uuid("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  priority: integer("priority").default(0), // Higher numbers = higher priority
  estimatedProcessingTime: integer("estimated_processing_time"), // Estimated seconds
  dependencies: uuid("dependencies").array(), // Other batch IDs this depends on
  maxConcurrency: integer("max_concurrency").default(1), // Max parallel items for this batch
  preferredTimeSlot: timestamp("preferred_time_slot"),
  queuePosition: integer("queue_position"),
  assignedWorker: text("assigned_worker"),
  startedProcessingAt: timestamp("started_processing_at"),
  lastProgressUpdate: timestamp("last_progress_update"),
  queueMetadata: jsonb("queue_metadata"), // Queue-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cross-Platform Sync Jobs - Track automatic sync operations when items are sold
export const crossPlatformSyncJobs = pgTable("cross_platform_sync_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  soldMarketplace: text("sold_marketplace").notNull(), // The marketplace where the item was sold
  syncType: text("sync_type").notNull(), // automatic_delist, manual_sync, inventory_update
  status: text("status").default("pending"), // pending, processing, completed, failed, partial
  totalMarketplaces: integer("total_marketplaces").default(0), // Total marketplaces to sync
  completedMarketplaces: integer("completed_marketplaces").default(0), // Successfully synced marketplaces
  failedMarketplaces: integer("failed_marketplaces").default(0), // Failed marketplace syncs
  syncTrigger: text("sync_trigger").notNull(), // sale_detected, manual_trigger, scheduled_sync
  triggerData: jsonb("trigger_data"), // Additional data about the trigger event
  targetMarketplaces: text("target_marketplaces").array(), // List of marketplaces to delist from
  processingDetails: jsonb("processing_details"), // Real-time processing status per marketplace
  errorSummary: jsonb("error_summary"), // Aggregated error information
  priority: integer("priority").default(5), // Sync job priority (higher = more urgent)
  estimatedDuration: integer("estimated_duration"), // Estimated time to complete in seconds
  actualDuration: integer("actual_duration"), // Actual time taken in seconds
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cross-Platform Sync History - Detailed audit log of all sync operations
export const crossPlatformSyncHistory = pgTable("cross_platform_sync_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  syncJobId: uuid("sync_job_id").references(() => crossPlatformSyncJobs.id, { onDelete: "set null" }),
  listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
  listingPostId: uuid("listing_post_id").references(() => listingPosts.id, { onDelete: "set null" }),
  sourceMarketplace: text("source_marketplace").notNull(), // Where the sale/trigger occurred
  targetMarketplace: text("target_marketplace").notNull(), // Marketplace being synced
  syncAction: text("sync_action").notNull(), // delist, update_quantity, mark_sold, suspend
  status: text("status").notNull(), // success, failed, skipped, rate_limited
  previousStatus: text("previous_status"), // Previous listing status before sync
  newStatus: text("new_status"), // New listing status after sync
  externalId: text("external_id"), // External marketplace listing ID
  externalUrl: text("external_url"), // URL of the delisted/updated item
  responseData: jsonb("response_data"), // API response from marketplace
  errorDetails: jsonb("error_details"), // Detailed error information
  errorCategory: text("error_category"), // rate_limit, auth_error, network_error, marketplace_error, validation_error
  retryAttempt: integer("retry_attempt").default(0), // Which retry attempt this was
  maxRetries: integer("max_retries").default(3), // Maximum retries allowed
  processingTime: integer("processing_time"), // Time taken for this operation in milliseconds
  rateLimitDelay: integer("rate_limit_delay"), // Delay applied due to rate limiting in milliseconds
  metadata: jsonb("metadata"), // Additional sync metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for batch tables
export const insertBatchSchema = createInsertSchema(batches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBatchItemSchema = createInsertSchema(batchItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBulkUploadSchema = createInsertSchema(bulkUploads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBatchTemplateSchema = createInsertSchema(batchTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBatchAnalyticsSchema = createInsertSchema(batchAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertBatchQueueSchema = createInsertSchema(batchQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas for cross-platform sync tables
export const insertCrossPlatformSyncJobSchema = createInsertSchema(crossPlatformSyncJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrossPlatformSyncHistorySchema = createInsertSchema(crossPlatformSyncHistory).omit({
  id: true,
  createdAt: true,
});

// Automation Rules - Central configuration for all marketplace automations
export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(), // poshmark, mercari, depop, grailed, etc.
  ruleType: text("rule_type").notNull(), // auto_share, auto_follow, auto_offer, auto_bump, auto_relist, bundle_offer
  ruleName: text("rule_name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  priority: integer("priority").default(0), // Higher priority rules execute first
  
  // Rule Configuration
  ruleConfig: jsonb("rule_config").notNull(), // Complete rule configuration
  triggerType: text("trigger_type").notNull(), // scheduled, event_based, continuous
  triggerConfig: jsonb("trigger_config"), // Trigger-specific config (cron, event conditions, etc.)
  
  // Action Configuration
  actionConfig: jsonb("action_config"), // Action-specific parameters
  targetCriteria: jsonb("target_criteria"), // Criteria for selecting items/users to act on
  
  // Rate Limiting & Safety
  dailyLimit: integer("daily_limit"), // Max actions per day
  hourlyLimit: integer("hourly_limit"), // Max actions per hour
  minDelaySeconds: integer("min_delay_seconds").default(5), // Minimum delay between actions
  maxDelaySeconds: integer("max_delay_seconds").default(30), // Maximum delay (for randomization)
  humanizeActions: boolean("humanize_actions").default(true), // Add human-like patterns
  
  // Time Windows
  activeHours: jsonb("active_hours"), // Array of {start: "09:00", end: "17:00", timezone: "UTC"}
  activeDays: text("active_days").array(), // ["monday", "tuesday", ...] or null for all days
  blackoutDates: timestamp("blackout_dates").array(), // Dates to skip automation
  
  // Performance Tracking
  totalExecutions: integer("total_executions").default(0),
  successfulExecutions: integer("successful_executions").default(0),
  failedExecutions: integer("failed_executions").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  lastError: text("last_error"),
  
  // Compliance & Safety
  requiresReview: boolean("requires_review").default(false), // Require manual review before execution
  complianceNotes: text("compliance_notes"),
  riskLevel: text("risk_level").default("low"), // low, medium, high
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Automation Schedules - Manage recurring automation execution schedules
export const automationSchedules = pgTable("automation_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: uuid("rule_id").notNull().references(() => automationRules.id, { onDelete: "cascade" }),
  scheduleType: text("schedule_type").notNull(), // cron, interval, time_of_day, continuous
  scheduleExpression: text("schedule_expression"), // Cron expression or interval specification
  
  // Schedule Configuration
  intervalMinutes: integer("interval_minutes"), // For interval-based schedules
  specificTimes: text("specific_times").array(), // Array of times like ["09:00", "14:00", "18:00"]
  timezone: text("timezone").default("UTC"),
  
  // Execution Windows
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxExecutions: integer("max_executions"), // Total execution limit
  executionCount: integer("execution_count").default(0),
  
  // Schedule State
  isActive: boolean("is_active").default(true),
  isPaused: boolean("is_paused").default(false),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  
  // Execution Context
  lastRunStatus: text("last_run_status"), // success, failed, partial, skipped
  lastRunDuration: integer("last_run_duration"), // Duration in milliseconds
  lastRunItemsProcessed: integer("last_run_items_processed"),
  lastRunError: text("last_run_error"),
  
  // Retry Configuration
  retryOnFailure: boolean("retry_on_failure").default(true),
  maxRetries: integer("max_retries").default(3),
  retryDelayMinutes: integer("retry_delay_minutes").default(5),
  currentRetryCount: integer("current_retry_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Automation Logs - Comprehensive audit trail of all automation activities
export const automationLogs = pgTable("automation_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ruleId: uuid("rule_id").references(() => automationRules.id, { onDelete: "set null" }),
  scheduleId: uuid("schedule_id").references(() => automationSchedules.id, { onDelete: "set null" }),
  
  // Action Details
  actionType: text("action_type").notNull(), // share_item, follow_user, send_offer, bump_listing, etc.
  marketplace: text("marketplace").notNull(),
  status: text("status").notNull(), // success, failed, partial, skipped, rate_limited
  
  // Target Information
  targetType: text("target_type"), // listing, user, bundle, closet
  targetId: uuid("target_id"), // ID of affected entity
  targetDetails: jsonb("target_details"), // Additional target information
  
  // Action Context
  actionDetails: jsonb("action_details"), // Specific action parameters used
  triggerSource: text("trigger_source"), // scheduled, manual, event, api
  batchId: uuid("batch_id"), // If part of batch operation
  sessionId: uuid("session_id"), // Group related actions in a session
  
  // Results & Metrics
  itemsProcessed: integer("items_processed").default(0),
  itemsSucceeded: integer("items_succeeded").default(0),
  itemsFailed: integer("items_failed").default(0),
  executionTime: integer("execution_time"), // Time in milliseconds
  
  // Error Handling
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  retryAttempt: integer("retry_attempt").default(0),
  
  // Compliance & Tracking
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  apiVersion: text("api_version"),
  ruleSnapshot: jsonb("rule_snapshot"), // Rule config at time of execution
  
  executedAt: timestamp("executed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Poshmark Share Settings - Specialized configuration for Poshmark closet sharing
export const poshmarkShareSettings = pgTable("poshmark_share_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  // Share Configuration
  shareMode: text("share_mode").default("closet"), // closet, individual, selective, party
  shareOrder: text("share_order").default("newest"), // newest, oldest, random, price_high, price_low
  reverseOrder: boolean("reverse_order").default(false),
  
  // Share Intervals & Limits
  minShareInterval: integer("min_share_interval").default(300), // Minimum seconds between shares
  maxShareInterval: integer("max_share_interval").default(900), // Maximum seconds (for randomization)
  dailyShareLimit: integer("daily_share_limit").default(5000), // Poshmark's current limit
  sharePerSession: integer("share_per_session").default(100), // Items per share session
  sessionBreakMinutes: integer("session_break_minutes").default(30), // Break between sessions
  
  // Peak Hours Configuration
  peakHoursEnabled: boolean("peak_hours_enabled").default(true),
  peakHours: jsonb("peak_hours"), // Array of {start: "18:00", end: "22:00", multiplier: 1.5}
  weekendMultiplier: decimal("weekend_multiplier", { precision: 3, scale: 2 }).default("1.2"),
  
  // Party Share Settings
  autoShareToParties: boolean("auto_share_to_parties").default(false),
  partyShareCategories: text("party_share_categories").array(), // Categories to share to parties
  maxPartyShares: integer("max_party_shares").default(50), // Max items per party
  
  // Smart Sharing
  prioritizeNewListings: boolean("prioritize_new_listings").default(true),
  newListingDays: integer("new_listing_days").default(7), // Days to consider listing as "new"
  prioritizeLikedItems: boolean("prioritize_liked_items").default(true),
  skipSoldItems: boolean("skip_sold_items").default(true),
  skipReservedItems: boolean("skip_reserved_items").default(true),
  
  // Share Rotation
  rotationEnabled: boolean("rotation_enabled").default(false),
  rotationGroups: jsonb("rotation_groups"), // Array of listing ID groups to rotate
  currentRotationIndex: integer("current_rotation_index").default(0),
  
  // Analytics & Tracking
  totalSharesThisMonth: integer("total_shares_this_month").default(0),
  totalSharesAllTime: integer("total_shares_all_time").default(0),
  lastShareAt: timestamp("last_share_at"),
  lastBulkShareAt: timestamp("last_bulk_share_at"),
  averageSharesPerDay: decimal("average_shares_per_day", { precision: 8, scale: 2 }),
  
  // Compliance & Safety
  captchaHandling: text("captcha_handling").default("pause"), // pause, manual, service
  respectRateLimits: boolean("respect_rate_limits").default(true),
  emergencyStop: boolean("emergency_stop").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offer Templates - Configurable templates for automated offers across platforms
export const offerTemplates = pgTable("offer_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  marketplace: text("marketplace").notNull(),
  templateName: text("template_name").notNull(),
  templateType: text("template_type").notNull(), // single_offer, bundle_offer, counter_offer, price_drop
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  
  // Offer Configuration
  discountType: text("discount_type").default("percentage"), // percentage, fixed_amount
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(), // Percentage or dollar amount
  shippingDiscount: decimal("shipping_discount", { precision: 10, scale: 2 }).default("0"), // Shipping discount
  
  // Bundle Configuration (Poshmark specific)
  bundleMinItems: integer("bundle_min_items").default(2),
  bundleDiscountTiers: jsonb("bundle_discount_tiers"), // [{items: 2, discount: 10}, {items: 3, discount: 15}]
  bundleMessageTemplate: text("bundle_message_template"),
  
  // Targeting Rules
  targetLikers: boolean("target_likers").default(true),
  targetWatchers: boolean("target_watchers").default(false),
  minLikesRequired: integer("min_likes_required").default(1),
  daysAfterLike: integer("days_after_like").default(1), // Wait days after like before offering
  
  // Price Rules
  minPriceThreshold: decimal("min_price_threshold", { precision: 10, scale: 2 }), // Don't offer below this price
  maxDiscountPercent: decimal("max_discount_percent", { precision: 5, scale: 2 }).default("30"), // Maximum discount allowed
  priceFloor: decimal("price_floor", { precision: 10, scale: 2 }), // Absolute minimum price
  
  // Message Templates
  offerMessage: text("offer_message"), // Message sent with offer
  declineMessage: text("decline_message"), // Message for declined offers
  counterMessage: text("counter_message"), // Message for counter offers
  usePersonalization: boolean("use_personalization").default(false), // Add buyer's name, etc.
  
  // Timing Configuration
  sendTime: text("send_time"), // Preferred time to send offers (HH:MM)
  sendDays: text("send_days").array(), // Days of week to send
  expirationHours: integer("expiration_hours").default(24), // Offer expiration time
  
  // Limits & Controls
  dailyOfferLimit: integer("daily_offer_limit").default(100),
  offerPerItemLimit: integer("offer_per_item_limit").default(1), // Max offers per item per buyer
  cooldownDays: integer("cooldown_days").default(7), // Days before re-offering to same buyer
  
  // Performance Tracking
  totalOffersSent: integer("total_offers_sent").default(0),
  offersAccepted: integer("offers_accepted").default(0),
  offersDeclined: integer("offers_declined").default(0),
  offersCountered: integer("offers_countered").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }),
  averageDiscountAccepted: decimal("average_discount_accepted", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for automation tables
export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  totalExecutions: true,
  successfulExecutions: true,
  failedExecutions: true,
  lastExecutedAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationScheduleSchema = createInsertSchema(automationSchedules).omit({
  id: true,
  executionCount: true,
  lastRunAt: true,
  nextRunAt: true,
  lastRunStatus: true,
  lastRunDuration: true,
  lastRunItemsProcessed: true,
  lastRunError: true,
  currentRetryCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationLogSchema = createInsertSchema(automationLogs).omit({
  id: true,
  executedAt: true,
  createdAt: true,
});

export const insertPoshmarkShareSettingsSchema = createInsertSchema(poshmarkShareSettings).omit({
  id: true,
  totalSharesThisMonth: true,
  totalSharesAllTime: true,
  lastShareAt: true,
  lastBulkShareAt: true,
  averageSharesPerDay: true,
  currentRotationIndex: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferTemplateSchema = createInsertSchema(offerTemplates).omit({
  id: true,
  totalOffersSent: true,
  offersAccepted: true,
  offersDeclined: true,
  offersCountered: true,
  conversionRate: true,
  averageDiscountAccepted: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas for webhook tables
export const insertWebhookConfigurationSchema = createInsertSchema(webhookConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
});

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({
  id: true,
  createdAt: true,
});

export const insertPollingScheduleSchema = createInsertSchema(pollingSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookHealthMetricsSchema = createInsertSchema(webhookHealthMetrics).omit({
  id: true,
  createdAt: true,
});

// Batch types
export type Batch = typeof batches.$inferSelect;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type BatchItem = typeof batchItems.$inferSelect;
export type InsertBatchItem = z.infer<typeof insertBatchItemSchema>;
export type BulkUpload = typeof bulkUploads.$inferSelect;
export type InsertBulkUpload = z.infer<typeof insertBulkUploadSchema>;
export type BatchTemplate = typeof batchTemplates.$inferSelect;
export type InsertBatchTemplate = z.infer<typeof insertBatchTemplateSchema>;
export type BatchAnalytics = typeof batchAnalytics.$inferSelect;
export type InsertBatchAnalytics = z.infer<typeof insertBatchAnalyticsSchema>;
export type BatchQueue = typeof batchQueue.$inferSelect;
export type InsertBatchQueue = z.infer<typeof insertBatchQueueSchema>;

// Cross-Platform Sync types
export type CrossPlatformSyncJob = typeof crossPlatformSyncJobs.$inferSelect;
export type InsertCrossPlatformSyncJob = z.infer<typeof insertCrossPlatformSyncJobSchema>;
export type CrossPlatformSyncHistory = typeof crossPlatformSyncHistory.$inferSelect;
export type InsertCrossPlatformSyncHistory = z.infer<typeof insertCrossPlatformSyncHistorySchema>;

// Automation types
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationSchedule = typeof automationSchedules.$inferSelect;
export type InsertAutomationSchedule = z.infer<typeof insertAutomationScheduleSchema>;
export type AutomationLog = typeof automationLogs.$inferSelect;
export type InsertAutomationLog = z.infer<typeof insertAutomationLogSchema>;
export type PoshmarkShareSettings = typeof poshmarkShareSettings.$inferSelect;
export type InsertPoshmarkShareSettings = z.infer<typeof insertPoshmarkShareSettingsSchema>;
export type OfferTemplate = typeof offerTemplates.$inferSelect;
export type InsertOfferTemplate = z.infer<typeof insertOfferTemplateSchema>;

// Webhook types
export type WebhookConfiguration = typeof webhookConfigurations.$inferSelect;
export type InsertWebhookConfiguration = z.infer<typeof insertWebhookConfigurationSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type PollingSchedule = typeof pollingSchedules.$inferSelect;
export type InsertPollingSchedule = z.infer<typeof insertPollingScheduleSchema>;
export type WebhookHealthMetrics = typeof webhookHealthMetrics.$inferSelect;
export type InsertWebhookHealthMetrics = z.infer<typeof insertWebhookHealthMetricsSchema>;
