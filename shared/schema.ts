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
