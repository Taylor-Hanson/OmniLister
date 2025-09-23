import { z } from 'zod';

// Common validation schemas
export const UuidSchema = z.string().uuid();
export const EmailSchema = z.string().email();
export const UrlSchema = z.string().url();
export const PhoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/);
export const PasswordSchema = z.string().min(8).max(128);
export const UsernameSchema = z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/);
export const CurrencySchema = z.number().positive().max(1000000);
export const PercentageSchema = z.number().min(0).max(100);

// Date and time schemas
export const TimestampSchema = z.number().positive();
export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const TimeStringSchema = z.string().regex(/^\d{2}:\d{2}$/);
export const TimezoneSchema = z.string().regex(/^[A-Za-z_]+\/[A-Za-z_]+$/);

// Marketplace schemas
export const MarketplaceIdSchema = z.string().min(1).max(50);
export const MarketplaceCategorySchema = z.enum([
  'general', 'fashion', 'luxury', 'sneakers', 'collectibles',
  'electronics', 'furniture', 'music', 'local'
]);
export const AuthTypeSchema = z.enum(['oauth', 'api_key', 'username_password', 'manual', 'none']);

// Listing schemas
export const ListingStatusSchema = z.enum(['draft', 'active', 'sold', 'deleted']);
export const ListingFormatSchema = z.enum(['FIXED_PRICE', 'AUCTION']);
export const ListingDurationSchema = z.enum(['GTC', 'DAYS_1', 'DAYS_3', 'DAYS_5', 'DAYS_7', 'DAYS_10', 'DAYS_30']);

// eBay condition schema
export const EbayConditionSchema = z.enum([
  'NEW', 'LIKE_NEW', 'NEW_OTHER', 'NEW_WITH_DEFECTS',
  'CERTIFIED_REFURBISHED', 'EXCELLENT_REFURBISHED', 'VERY_GOOD_REFURBISHED',
  'GOOD_REFURBISHED', 'SELLER_REFURBISHED',
  'USED_EXCELLENT', 'USED_VERY_GOOD', 'USED_GOOD', 'USED_ACCEPTABLE',
  'FOR_PARTS_OR_NOT_WORKING', 'PRE_OWNED_EXCELLENT', 'PRE_OWNED_FAIR'
]);

// Job schemas
export const JobTypeSchema = z.enum(['post-listing', 'delist-listing', 'sync-inventory', 'bulk-operation']);
export const JobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

// Automation schemas
export const AutomationRuleTypeSchema = z.enum([
  'auto_share', 'auto_follow', 'auto_offer', 'auto_bump',
  'auto_relist', 'bundle_offer', 'price_optimization'
]);
export const TriggerTypeSchema = z.enum(['scheduled', 'event_based', 'continuous']);

// Rate limiting schemas
export const RateLimitWindowSchema = z.enum(['hourly', 'daily']);
export const FailureCategorySchema = z.enum([
  'permanent', 'temporary', 'rate_limit', 'auth',
  'network', 'validation', 'marketplace_error'
]);

// Sync schemas
export const SyncTypeSchema = z.enum(['create', 'update', 'delete', 'inventory']);
export const SyncStatusSchema = z.enum(['success', 'failed', 'pending']);

// Pricing schemas
export const PriceAdjustmentTypeSchema = z.enum(['percentage', 'fixed_amount']);
export const PriceRangeSchema = z.enum(['low', 'medium', 'high']);

// Time window schema
export const TimeWindowSchema = z.object({
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  timezone: TimezoneSchema
});

// Day of week schema
export const DayOfWeekSchema = z.number().min(0).max(6);

// Validation utility functions
export const validationUtils = {
  /**
   * Validate UUID
   */
  isValidUuid: (value: string): boolean => {
    try {
      UuidSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate email
   */
  isValidEmail: (value: string): boolean => {
    try {
      EmailSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate URL
   */
  isValidUrl: (value: string): boolean => {
    try {
      UrlSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate phone number
   */
  isValidPhone: (value: string): boolean => {
    try {
      PhoneSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate password strength
   */
  isValidPassword: (value: string): boolean => {
    try {
      PasswordSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate username
   */
  isValidUsername: (value: string): boolean => {
    try {
      UsernameSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate currency amount
   */
  isValidCurrency: (value: number): boolean => {
    try {
      CurrencySchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate percentage
   */
  isValidPercentage: (value: number): boolean => {
    try {
      PercentageSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate timestamp
   */
  isValidTimestamp: (value: number): boolean => {
    try {
      TimestampSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate date string (YYYY-MM-DD)
   */
  isValidDateString: (value: string): boolean => {
    try {
      DateStringSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate time string (HH:MM)
   */
  isValidTimeString: (value: string): boolean => {
    try {
      TimeStringSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate timezone
   */
  isValidTimezone: (value: string): boolean => {
    try {
      TimezoneSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate marketplace ID
   */
  isValidMarketplaceId: (value: string): boolean => {
    try {
      MarketplaceIdSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate marketplace category
   */
  isValidMarketplaceCategory: (value: string): boolean => {
    try {
      MarketplaceCategorySchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate auth type
   */
  isValidAuthType: (value: string): boolean => {
    try {
      AuthTypeSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate listing status
   */
  isValidListingStatus: (value: string): boolean => {
    try {
      ListingStatusSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate listing format
   */
  isValidListingFormat: (value: string): boolean => {
    try {
      ListingFormatSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate listing duration
   */
  isValidListingDuration: (value: string): boolean => {
    try {
      ListingDurationSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate eBay condition
   */
  isValidEbayCondition: (value: string): boolean => {
    try {
      EbayConditionSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate job type
   */
  isValidJobType: (value: string): boolean => {
    try {
      JobTypeSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate job status
   */
  isValidJobStatus: (value: string): boolean => {
    try {
      JobStatusSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate automation rule type
   */
  isValidAutomationRuleType: (value: string): boolean => {
    try {
      AutomationRuleTypeSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate trigger type
   */
  isValidTriggerType: (value: string): boolean => {
    try {
      TriggerTypeSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate rate limit window
   */
  isValidRateLimitWindow: (value: string): boolean => {
    try {
      RateLimitWindowSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate failure category
   */
  isValidFailureCategory: (value: string): boolean => {
    try {
      FailureCategorySchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate sync type
   */
  isValidSyncType: (value: string): boolean => {
    try {
      SyncTypeSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate sync status
   */
  isValidSyncStatus: (value: string): boolean => {
    try {
      SyncStatusSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate price adjustment type
   */
  isValidPriceAdjustmentType: (value: string): boolean => {
    try {
      PriceAdjustmentTypeSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate price range
   */
  isValidPriceRange: (value: string): boolean => {
    try {
      PriceRangeSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate time window
   */
  isValidTimeWindow: (value: unknown): boolean => {
    try {
      TimeWindowSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate day of week
   */
  isValidDayOfWeek: (value: number): boolean => {
    try {
      DayOfWeekSchema.parse(value);
      return true;
    } catch {
      return false;
    }
  }
};

// Custom validation functions
export const customValidators = {
  /**
   * Validate password strength with custom rules
   */
  validatePasswordStrength: (password: string): { isValid: boolean; score: number; feedback: string[] } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password must be at least 8 characters long');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password must contain at least one lowercase letter');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password must contain at least one uppercase letter');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Password must contain at least one number');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Password must contain at least one special character');

    return {
      isValid: score >= 4,
      score,
      feedback
    };
  },

  /**
   * Validate business hours
   */
  validateBusinessHours: (hours: { start: string; end: string }): { isValid: boolean; error?: string } => {
    try {
      const [startHour, startMin] = hours.start.split(':').map(Number);
      const [endHour, endMin] = hours.end.split(':').map(Number);

      if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59) {
        return { isValid: false, error: 'Invalid start time format' };
      }

      if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
        return { isValid: false, error: 'Invalid end time format' };
      }

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes >= endMinutes) {
        return { isValid: false, error: 'Start time must be before end time' };
      }

      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid time format' };
    }
  },

  /**
   * Validate price range
   */
  validatePriceRange: (min: number, max: number): { isValid: boolean; error?: string } => {
    if (min < 0) {
      return { isValid: false, error: 'Minimum price cannot be negative' };
    }

    if (max < 0) {
      return { isValid: false, error: 'Maximum price cannot be negative' };
    }

    if (min > max) {
      return { isValid: false, error: 'Minimum price cannot be greater than maximum price' };
    }

    if (max > 1000000) {
      return { isValid: false, error: 'Maximum price cannot exceed $1,000,000' };
    }

    return { isValid: true };
  },

  /**
   * Validate age range in days
   */
  validateAgeRange: (minDays: number, maxDays: number): { isValid: boolean; error?: string } => {
    if (minDays < 0) {
      return { isValid: false, error: 'Minimum age cannot be negative' };
    }

    if (maxDays < 0) {
      return { isValid: false, error: 'Maximum age cannot be negative' };
    }

    if (minDays > maxDays) {
      return { isValid: false, error: 'Minimum age cannot be greater than maximum age' };
    }

    if (maxDays > 3650) { // 10 years
      return { isValid: false, error: 'Maximum age cannot exceed 10 years' };
    }

    return { isValid: true };
  }
};
