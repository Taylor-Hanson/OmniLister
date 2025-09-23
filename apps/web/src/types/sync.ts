export interface MarketplaceConnection {
  id: string;
  userId: string;
  marketplace: string;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  lastSyncAt?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStatus {
  listingId: string;
  title: string;
  platforms: Record<string, {
    synced: boolean;
    lastSync?: string;
    status?: string;
    error?: string;
  }>;
}

export interface SyncJob {
  id: string;
  userId: string;
  listingId?: string;
  listingTitle?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  soldMarketplace?: string;
  totalMarketplaces?: number;
  successful?: number;
  failed?: number;
  skipped?: number;
  errorMessage?: string;
  duration?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SyncHistoryEntry {
  id: string;
  userId: string;
  listingId?: string;
  sourceMarketplace?: string;
  targetMarketplace: string;
  syncType: 'create' | 'update' | 'delete' | 'inventory';
  status: 'success' | 'failed' | 'pending';
  fieldsUpdated?: Record<string, any>;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  errorMessage?: string;
  syncDuration?: number;
  createdAt: string;
}

export interface SyncConflict {
  id: string;
  userId: string;
  listingId: string;
  sourceMarketplace: string;
  targetMarketplace: string;
  conflictType: string;
  sourceValue: any;
  targetValue: any;
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface WebhookConfig {
  id: string;
  userId: string;
  marketplace: string;
  isEnabled: boolean;
  isActive: boolean;
  subscribedEvents?: string[];
  errorCount?: number;
  verificationStatus?: 'verified' | 'unverified' | 'failed';
  lastEventAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookHealthSummary {
  healthScore: number;
  totalWebhooks: number;
  activeWebhooks: number;
  errorCount: number;
  successRate: number;
  lastUpdated: string;
}

export interface RateLimit {
  marketplace: string;
  remainingRequests: number;
  maxRequests: number;
  resetTime: string;
  isBlocked: boolean;
  windowType: 'hourly' | 'daily';
}

export interface SyncSettings {
  id: string;
  userId: string;
  autoSync: boolean;
  syncFrequency: 'manual' | 'immediate' | 'hourly' | 'daily';
  syncFields?: {
    price?: boolean;
    inventory?: boolean;
    description?: boolean;
    images?: boolean;
  };
  defaultBehavior?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}