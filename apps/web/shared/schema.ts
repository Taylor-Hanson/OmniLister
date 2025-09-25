// Basic schema types for web app authentication
export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  plan: string;
  subscriptionStatus?: string;
  listingCredits?: number | null;
  listingsUsedThisMonth?: number;
  billingCycleStart?: string | Date;
  onboardingCompleted?: boolean;
  optimizationSettings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InsertUser {
  email: string;
  username: string;
  password: string;
  plan?: string;
  subscriptionStatus?: string;
  listingCredits?: number | null;
  listingsUsedThisMonth?: number;
  billingCycleStart?: string | Date;
  onboardingCompleted?: boolean;
  optimizationSettings?: any;
}

// Basic validation schemas
export const insertUserSchema = {
  parse: (data: any) => data // Simple validation for now
};

export const optimizationSettingsSchema = {
  parse: (data: any) => data // Simple validation for now
};

// Basic constants
export const EBAY_CONDITIONS = {
  NEW: { value: 'NEW', label: 'New' },
  USED: { value: 'USED', label: 'Used' },
  REFURBISHED: { value: 'REFURBISHED', label: 'Refurbished' }
};

export const LISTING_FORMATS = {
  AUCTION: { value: 'AUCTION', label: 'Auction' },
  FIXED_PRICE: { value: 'FIXED_PRICE', label: 'Fixed Price' }
};

export const LISTING_DURATIONS = {
  DAYS_1: { value: 1, label: '1 Day' },
  DAYS_3: { value: 3, label: '3 Days' },
  DAYS_5: { value: 5, label: '5 Days' },
  DAYS_7: { value: 7, label: '7 Days' },
  DAYS_10: { value: 10, label: '10 Days' }
};