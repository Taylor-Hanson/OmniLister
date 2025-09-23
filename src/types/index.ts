// Core Types for OmniLister Mobile App

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription?: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  category: string;
  subcategory?: string;
  images: string[];
  tags: string[];
  status: 'draft' | 'active' | 'sold' | 'paused';
  marketplace: string;
  externalId?: string;
  externalUrl?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  aiGenerated?: boolean;
  aiModel?: 'gpt-5' | 'claude' | 'dual';
}

export interface Marketplace {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  authType: 'oauth' | 'api_key' | 'username_password';
  features: string[];
  requiredCredentials?: Credential[];
  apiAvailable: boolean;
  popular: boolean;
  priority?: boolean;
  enterpriseOnly?: boolean;
}

export interface Credential {
  label: string;
  key: string;
  type: 'text' | 'password' | 'email';
  placeholder: string;
}

export interface MarketplaceConnection {
  marketplace: string;
  isConnected: boolean;
  lastSyncAt?: string;
  accessToken?: string;
  credentials?: Record<string, string>;
  userId: string;
}

export interface CrossPostingJob {
  id: string;
  userId: string;
  type: 'cross-posting';
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  progress: number;
  data: {
    listingId: string;
    marketplaces: string[];
    settings: Record<string, any>;
    totalMarketplaces: number;
    completedMarketplaces: number;
    failedMarketplaces: number;
    results: CrossPostingResult[];
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  result?: any;
}

export interface CrossPostingResult {
  marketplace: string;
  status: 'pending' | 'success' | 'failed';
  externalId: string | null;
  externalUrl: string | null;
  error: string | null;
}

export interface AIAnalysis {
  id: string;
  type: 'product_recognition' | 'description_generation' | 'price_optimization' | 'title_optimization';
  input: string | string[];
  output: any;
  model: 'gpt-5' | 'claude' | 'dual';
  confidence: number;
  processingTime: number;
  createdAt: string;
}

export interface BarcodeResult {
  type: 'upc' | 'ean' | 'isbn' | 'qr' | 'code128';
  data: string;
  product?: {
    name: string;
    brand: string;
    category: string;
    description: string;
    images: string[];
    averagePrice?: number;
    marketplace?: string;
  };
}

export interface PhotoEditResult {
  originalUri: string;
  editedUri: string;
  edits: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    crop?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    filters?: string[];
  };
}

export interface NotificationData {
  id: string;
  type: 'sale' | 'offer' | 'message' | 'system' | 'cross_posting';
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface OfflineData {
  listings: Listing[];
  connections: MarketplaceConnection[];
  lastSync: string;
  pendingActions: PendingAction[];
}

export interface PendingAction {
  id: string;
  type: 'create_listing' | 'update_listing' | 'delete_listing' | 'cross_post';
  data: any;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Camera: { mode: 'photo' | 'barcode' | 'ai_scan' };
  PhotoEditor: { imageUri: string; listingId?: string };
  CreateListing: { imageUri?: string; barcodeData?: BarcodeResult };
  ListingDetails: { listingId: string };
  MarketplaceConnection: { marketplaceId: string };
  CrossPosting: { listingId: string };
  Settings: undefined;
  Notifications: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Listings: undefined;
  Camera: undefined;
  CrossPosting: undefined;
  Profile: undefined;
};
