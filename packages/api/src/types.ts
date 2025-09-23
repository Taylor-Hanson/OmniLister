import { z } from 'zod';

// Re-export core types
export * from '@omnilister/core';

// API-specific types
export type ApiResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
};

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  details?: any;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  filters?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
    value: any;
  }>;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Authentication types
export type LoginRequest = z.infer<typeof import('./schemas').LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof import('./schemas').RegisterRequestSchema>;
export type AuthResponse = z.infer<typeof import('./schemas').AuthResponseSchema>;

// User types
export type UserProfile = z.infer<typeof import('./schemas').UserProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof import('./schemas').UpdateProfileRequestSchema>;

// Listing types
export type CreateListingRequest = z.infer<typeof import('./schemas').CreateListingRequestSchema>;
export type UpdateListingRequest = z.infer<typeof import('./schemas').UpdateListingRequestSchema>;
export type ListingResponse = z.infer<typeof import('./schemas').ListingResponseSchema>;
export type BulkListingRequest = z.infer<typeof import('./schemas').BulkListingRequestSchema>;

// Marketplace types
export type MarketplaceConnection = z.infer<typeof import('./schemas').MarketplaceConnectionSchema>;
export type ConnectMarketplaceRequest = z.infer<typeof import('./schemas').ConnectMarketplaceRequestSchema>;

// Job types
export type JobResponse = z.infer<typeof import('./schemas').JobResponseSchema>;

// Automation types
export type CreateAutomationRuleRequest = z.infer<typeof import('./schemas').CreateAutomationRuleRequestSchema>;
export type AutomationRuleResponse = z.infer<typeof import('./schemas').AutomationRuleResponseSchema>;

// Analytics types
export type AnalyticsDashboard = z.infer<typeof import('./schemas').AnalyticsDashboardSchema>;

// Inventory types
export type InventoryItem = z.infer<typeof import('./schemas').InventoryItemSchema>;
export type CreateInventoryItemRequest = z.infer<typeof import('./schemas').CreateInventoryItemRequestSchema>;

// Sync types
export type SyncSettings = z.infer<typeof import('./schemas').SyncSettingsSchema>;
export type SyncRule = z.infer<typeof import('./schemas').SyncRuleSchema>;

// Webhook types
export type WebhookConfiguration = z.infer<typeof import('./schemas').WebhookConfigurationSchema>;

// File types
export type FileUploadResponse = z.infer<typeof import('./schemas').FileUploadResponseSchema>;

// Notification types
export type Notification = z.infer<typeof import('./schemas').NotificationSchema>;

// Error types
export type ErrorResponse = z.infer<typeof import('./schemas').ErrorResponseSchema>;

// Success response type
export type SuccessResponse<T = any> = {
  success: boolean;
  data: T;
  message?: string;
};
