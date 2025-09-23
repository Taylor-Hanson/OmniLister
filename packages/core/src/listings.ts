import { z } from 'zod';
import { EbayCondition, ListingFormat, ListingDuration, ListingStatus } from './types';
import { EBAY_CONDITIONS, LISTING_FORMATS, LISTING_DURATIONS } from './constants';

// Listing interfaces
export interface Listing {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subtitle?: string;
  price: number;
  quantity: number;
  images?: string[];
  condition?: EbayCondition;
  conditionDescription?: string;
  conditionId?: number;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  listingFormat: ListingFormat;
  listingDuration: ListingDuration;
  status: ListingStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CreateListingRequest {
  title: string;
  description?: string;
  price: number;
  quantity?: number;
  images?: string[];
  condition?: EbayCondition;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  listingFormat?: ListingFormat;
  listingDuration?: ListingDuration;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  quantity?: number;
  images?: string[];
  condition?: EbayCondition;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  status?: ListingStatus;
}

// Validation schemas
export const CreateListingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().positive(),
  quantity: z.number().int().positive().default(1),
  images: z.array(z.string().url()).max(12).optional(),
  condition: z.enum([
    "NEW", "LIKE_NEW", "NEW_OTHER", "NEW_WITH_DEFECTS",
    "CERTIFIED_REFURBISHED", "EXCELLENT_REFURBISHED", "VERY_GOOD_REFURBISHED", 
    "GOOD_REFURBISHED", "SELLER_REFURBISHED",
    "USED_EXCELLENT", "USED_VERY_GOOD", "USED_GOOD", "USED_ACCEPTABLE",
    "FOR_PARTS_OR_NOT_WORKING", "PRE_OWNED_EXCELLENT", "PRE_OWNED_FAIR"
  ]).optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  material: z.string().max(100).optional(),
  listingFormat: z.enum(["FIXED_PRICE", "AUCTION"]).default("FIXED_PRICE"),
  listingDuration: z.enum(["GTC", "DAYS_1", "DAYS_3", "DAYS_5", "DAYS_7", "DAYS_10", "DAYS_30"]).default("GTC")
});

export const UpdateListingSchema = CreateListingSchema.partial().extend({
  status: z.enum(["draft", "active", "sold", "deleted"]).optional()
});

// Listing utilities
export const listingUtils = {
  /**
   * Get eBay condition ID from condition value
   */
  getEbayConditionId: (condition: EbayCondition): number | undefined => {
    return EBAY_CONDITIONS[condition]?.id;
  },

  /**
   * Get eBay condition label from condition value
   */
  getEbayConditionLabel: (condition: EbayCondition): string | undefined => {
    return EBAY_CONDITIONS[condition]?.label;
  },

  /**
   * Get eBay condition description from condition value
   */
  getEbayConditionDescription: (condition: EbayCondition): string | undefined => {
    return EBAY_CONDITIONS[condition]?.description;
  },

  /**
   * Validate listing format
   */
  isValidListingFormat: (format: string): format is ListingFormat => {
    return Object.values(LISTING_FORMATS).includes(format as ListingFormat);
  },

  /**
   * Validate listing duration
   */
  isValidListingDuration: (duration: string): duration is ListingDuration => {
    return Object.values(LISTING_DURATIONS).includes(duration as ListingDuration);
  },

  /**
   * Calculate listing age in days
   */
  getListingAge: (createdAt: number): number => {
    const now = Date.now();
    const diffMs = now - createdAt;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Check if listing is new (less than 7 days old)
   */
  isNewListing: (createdAt: number): boolean => {
    return listingUtils.getListingAge(createdAt) < 7;
  },

  /**
   * Generate listing slug from title
   */
  generateSlug: (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  },

  /**
   * Validate listing price
   */
  isValidPrice: (price: number): boolean => {
    return price > 0 && price <= 1000000; // Max $1M
  },

  /**
   * Format listing price for display
   */
  formatPrice: (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  },

  /**
   * Calculate listing fees (simplified)
   */
  calculateFees: (price: number, marketplace: string): number => {
    // Simplified fee calculation - in real app, this would be more complex
    const feeRates: Record<string, number> = {
      'ebay': 0.1, // 10%
      'poshmark': 0.2, // 20%
      'mercari': 0.1, // 10%
      'depop': 0.1, // 10%
      'grailed': 0.09, // 9%
      'default': 0.15 // 15% default
    };
    
    const rate = feeRates[marketplace] || feeRates.default;
    return price * rate;
  },

  /**
   * Calculate profit after fees
   */
  calculateProfit: (price: number, cost: number, marketplace: string): number => {
    const fees = listingUtils.calculateFees(price, marketplace);
    return price - cost - fees;
  },

  /**
   * Calculate profit margin percentage
   */
  calculateMargin: (price: number, cost: number, marketplace: string): number => {
    const profit = listingUtils.calculateProfit(price, cost, marketplace);
    if (price === 0) return 0;
    return (profit / price) * 100;
  }
};

// Listing validation functions
export const listingValidation = {
  /**
   * Validate create listing request
   */
  validateCreateRequest: (data: unknown): { success: boolean; data?: CreateListingRequest; errors?: string[] } => {
    try {
      const result = CreateListingSchema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  },

  /**
   * Validate update listing request
   */
  validateUpdateRequest: (data: unknown): { success: boolean; data?: UpdateListingRequest; errors?: string[] } => {
    try {
      const result = UpdateListingSchema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }
};
