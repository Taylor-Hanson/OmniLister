import { EbayCondition } from './types';

// eBay Condition Constants
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

// Listing Format Constants
export const LISTING_FORMATS = {
  FIXED_PRICE: "FIXED_PRICE",
  AUCTION: "AUCTION"
} as const;

// Listing Duration Constants
export const LISTING_DURATIONS = {
  GTC: "GTC", // Good Till Cancelled
  DAYS_1: "DAYS_1",
  DAYS_3: "DAYS_3", 
  DAYS_5: "DAYS_5",
  DAYS_7: "DAYS_7",
  DAYS_10: "DAYS_10",
  DAYS_30: "DAYS_30"
} as const;

// Rate Limiting Constants
export const RATE_LIMITS = {
  DEFAULT_HOURLY: 100,
  DEFAULT_DAILY: 1000,
  MIN_DELAY_SECONDS: 30,
  MAX_DELAY_SECONDS: 300
} as const;

// Automation Constants
export const AUTOMATION_LIMITS = {
  DEFAULT_DAILY_LIMIT: 100,
  DEFAULT_HOURLY_LIMIT: 10,
  MIN_DELAY_SECONDS: 5,
  MAX_DELAY_SECONDS: 30,
  HUMANIZE_ACTIONS: true
} as const;

// Pricing Constants
export const PRICING = {
  DEFAULT_MARKUP_PERCENTAGE: 20,
  MAX_DISCOUNT_PERCENTAGE: 30,
  MIN_PRICE_THRESHOLD: 1.00,
  PRICE_FLOOR: 0.50
} as const;

// Time Constants
export const TIME_CONSTANTS = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_DAY: 86400
} as const;

// Marketplace Priority Constants
export const MARKETPLACE_PRIORITY = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  DEFAULT: 2
} as const;

// Error Codes
export const ERROR_CODES = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MARKETPLACE_ERROR: 'MARKETPLACE_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS'
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  DUAL_AI_ENABLED: 'dualAi:enabled',
  OFFLINE_MODE: 'offline:enabled',
  PUSH_NOTIFICATIONS: 'notifications:push',
  ADVANCED_ANALYTICS: 'analytics:advanced',
  SMART_SCHEDULING: 'scheduling:smart',
  AUTO_OPTIMIZATION: 'optimization:auto'
} as const;

// Platform Detection
export const PLATFORM = {
  WEB: 'web',
  MOBILE: 'mobile',
  DESKTOP: 'desktop'
} as const;

// Environment Constants
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const;
