import { z } from 'zod';

// Base types
export type MarketplaceId = string;
export type UserId = string;
export type ListingId = string;
export type JobId = string;

// Marketplace types
export type MarketplaceCategory = 
  | "general"
  | "fashion"
  | "luxury"
  | "sneakers"
  | "collectibles"
  | "electronics"
  | "furniture"
  | "music"
  | "local";

export type AuthType = 
  | "oauth"
  | "api_key"
  | "username_password"
  | "manual"
  | "none";

// Listing types
export type ListingStatus = "draft" | "active" | "sold" | "deleted";
export type ListingFormat = "FIXED_PRICE" | "AUCTION";
export type ListingDuration = "GTC" | "DAYS_1" | "DAYS_3" | "DAYS_5" | "DAYS_7" | "DAYS_10" | "DAYS_30";

// eBay condition types
export type EbayCondition = 
  | "NEW" | "LIKE_NEW" | "NEW_OTHER" | "NEW_WITH_DEFECTS"
  | "CERTIFIED_REFURBISHED" | "EXCELLENT_REFURBISHED" | "VERY_GOOD_REFURBISHED" 
  | "GOOD_REFURBISHED" | "SELLER_REFURBISHED"
  | "USED_EXCELLENT" | "USED_VERY_GOOD" | "USED_GOOD" | "USED_ACCEPTABLE"
  | "FOR_PARTS_OR_NOT_WORKING" | "PRE_OWNED_EXCELLENT" | "PRE_OWNED_FAIR";

// Job types
export type JobType = "post-listing" | "delist-listing" | "sync-inventory" | "bulk-operation";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

// Automation types
export type AutomationRuleType = 
  | "auto_share" | "auto_follow" | "auto_offer" | "auto_bump" 
  | "auto_relist" | "bundle_offer" | "price_optimization";

export type TriggerType = "scheduled" | "event_based" | "continuous";

// Rate limiting types
export type RateLimitWindow = "hourly" | "daily";
export type FailureCategory = 
  | "permanent" | "temporary" | "rate_limit" | "auth" 
  | "network" | "validation" | "marketplace_error";

// Sync types
export type SyncType = "create" | "update" | "delete" | "inventory";
export type SyncStatus = "success" | "failed" | "pending";

// Pricing types
export type PriceAdjustmentType = "percentage" | "fixed_amount";
export type PriceRange = "low" | "medium" | "high";

// Time types
export type TimeWindow = {
  startHour: number;
  endHour: number;
  timezone: string;
};

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

// Validation schemas
export const MarketplaceIdSchema = z.string().min(1);
export const UserIdSchema = z.string().uuid();
export const ListingIdSchema = z.string().uuid();
export const JobIdSchema = z.string().uuid();

export const EbayConditionSchema = z.enum([
  "NEW", "LIKE_NEW", "NEW_OTHER", "NEW_WITH_DEFECTS",
  "CERTIFIED_REFURBISHED", "EXCELLENT_REFURBISHED", "VERY_GOOD_REFURBISHED", 
  "GOOD_REFURBISHED", "SELLER_REFURBISHED",
  "USED_EXCELLENT", "USED_VERY_GOOD", "USED_GOOD", "USED_ACCEPTABLE",
  "FOR_PARTS_OR_NOT_WORKING", "PRE_OWNED_EXCELLENT", "PRE_OWNED_FAIR"
]);

export const ListingFormatSchema = z.enum(["FIXED_PRICE", "AUCTION"]);
export const ListingDurationSchema = z.enum(["GTC", "DAYS_1", "DAYS_3", "DAYS_5", "DAYS_7", "DAYS_10", "DAYS_30"]);
export const ListingStatusSchema = z.enum(["draft", "active", "sold", "deleted"]);

export const JobTypeSchema = z.enum(["post-listing", "delist-listing", "sync-inventory", "bulk-operation"]);
export const JobStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);

export const AutomationRuleTypeSchema = z.enum([
  "auto_share", "auto_follow", "auto_offer", "auto_bump", 
  "auto_relist", "bundle_offer", "price_optimization"
]);

export const TriggerTypeSchema = z.enum(["scheduled", "event_based", "continuous"]);
export const RateLimitWindowSchema = z.enum(["hourly", "daily"]);
export const FailureCategorySchema = z.enum([
  "permanent", "temporary", "rate_limit", "auth", 
  "network", "validation", "marketplace_error"
]);

export const SyncTypeSchema = z.enum(["create", "update", "delete", "inventory"]);
export const SyncStatusSchema = z.enum(["success", "failed", "pending"]);

export const PriceAdjustmentTypeSchema = z.enum(["percentage", "fixed_amount"]);
export const PriceRangeSchema = z.enum(["low", "medium", "high"]);

export const TimeWindowSchema = z.object({
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  timezone: z.string()
});

export const DayOfWeekSchema = z.number().min(0).max(6);
