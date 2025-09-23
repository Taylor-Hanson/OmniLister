// eBay API Types
export interface EbayConfig {
  appId: string;
  devId?: string;
  certId?: string;
  sandbox: boolean;
  baseUrl: string;
}

export interface EbaySearchRequest {
  query: string;
  itemId?: string;
  upc?: string;
  sku?: string;
  categoryId?: string;
  condition?: 'New' | 'Used' | 'Refurbished' | 'ForPartsOrNotWorking';
  listingType?: 'Auction' | 'FixedPrice' | 'All';
  sortOrder?: 'BestMatch' | 'CurrentPriceHighest' | 'CurrentPriceLowest' | 'EndTimeSoonest' | 'PricePlusShippingHighest' | 'PricePlusShippingLowest' | 'StartTimeNewest';
  maxResults?: number;
  pageNumber?: number;
}

export interface EbaySearchResponse {
  items: EbayItem[];
  totalResults: number;
  pageNumber: number;
  totalPages: number;
  hasMorePages: boolean;
}

export interface EbayItem {
  itemId: string;
  title: string;
  subtitle?: string;
  globalId: string;
  categoryId: string;
  categoryName: string;
  galleryURL?: string;
  viewItemURL: string;
  location: string;
  country: string;
  shippingInfo: EbayShippingInfo;
  sellingStatus: EbaySellingStatus;
  listingInfo: EbayListingInfo;
  condition?: EbayCondition;
  primaryCategory: EbayCategory;
  secondaryCategory?: EbayCategory;
  itemSpecifics?: EbayItemSpecific[];
  productId?: EbayProductId;
}

export interface EbayShippingInfo {
  shippingServiceCost?: EbayAmount;
  shippingType: string;
  shipToLocations: string[];
  expeditedShipping?: boolean;
  oneDayShippingAvailable?: boolean;
  handlingTime?: number;
}

export interface EbaySellingStatus {
  currentPrice: EbayAmount;
  convertedCurrentPrice?: EbayAmount;
  bidCount?: number;
  timeLeft: string;
  listingStatus: 'Active' | 'Completed' | 'Ended';
  sellingState: 'Active' | 'Canceled' | 'Ended' | 'EndedWithSales' | 'EndedWithoutSales';
  watchCount?: number;
  buyItNowAvailable?: boolean;
  minimumToBid?: EbayAmount;
  reserveMet?: boolean;
  secondChanceEligible?: boolean;
  listingType: string;
  gift?: boolean;
}

export interface EbayListingInfo {
  bestOfferEnabled: boolean;
  buyItNowAvailable: boolean;
  startTime: string;
  endTime: string;
  listingType: string;
  gift: boolean;
  watchCount?: number;
}

export interface EbayCondition {
  conditionId: string;
  conditionDisplayName: string;
}

export interface EbayCategory {
  categoryId: string;
  categoryName: string;
}

export interface EbayItemSpecific {
  name: string;
  value: string[];
}

export interface EbayProductId {
  type: 'ISBN' | 'UPC' | 'EAN' | 'ReferenceID';
  value: string;
}

export interface EbayAmount {
  currencyId: string;
  value: number;
}

// Price Analysis Types
export interface PriceAnalysis {
  query: string;
  timestamp: Date;
  activeListings: ListingMetrics;
  soldListings: ListingMetrics;
  priceDistribution: PriceBucket[];
  priceTrends: PriceTrendPoint[];
  outliers: PriceOutlier[];
  recommendations: PriceRecommendation[];
}

export interface ListingMetrics {
  count: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  standardDeviation: number;
  priceRange: {
    low: number;
    high: number;
  };
}

export interface PriceBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface PriceTrendPoint {
  date: string;
  averagePrice: number;
  medianPrice: number;
  count: number;
}

export interface PriceOutlier {
  itemId: string;
  title: string;
  price: number;
  reason: 'high' | 'low';
  deviation: number;
}

export interface PriceRecommendation {
  type: 'competitive' | 'premium' | 'budget';
  price: number;
  reasoning: string;
  confidence: number;
}

// Cache Types
export interface PriceCacheEntry {
  id: string;
  query: string;
  analysis: PriceAnalysis;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

// UI State Types
export interface PriceCheckerState {
  query: string;
  isLoading: boolean;
  error: string | null;
  analysis: PriceAnalysis | null;
  searchHistory: string[];
  savedQueries: SavedQuery[];
  filters: PriceFilters;
}

export interface SavedQuery {
  id: string;
  query: string;
  name: string;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

export interface PriceFilters {
  condition: string[];
  listingType: string[];
  timeRange: '7d' | '30d' | '90d' | '180d' | '1y';
  priceRange: {
    min: number;
    max: number;
  };
  excludeOutliers: boolean;
}

// API Response Types
export interface EbayApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
  };
}

export interface EbayError {
  errorId: string;
  domain: string;
  subdomain: string;
  severity: 'Error' | 'Warning';
  category: string;
  message: string;
  exceptionId?: string;
  parameter?: Array<{
    name: string;
    value: string;
  }>;
}

// Analytics Types
export interface PriceCheckAnalytics {
  queryId: string;
  userId: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
  processingTime: number;
  cacheHit: boolean;
  clickThroughs: ClickThrough[];
}

export interface ClickThrough {
  type: 'ebay_item' | 'ebay_search' | 'save_query';
  target: string;
  timestamp: Date;
}
