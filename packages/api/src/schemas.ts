import { z } from 'zod';

// Common schemas
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  total: z.number().int().nonnegative().optional(),
  totalPages: z.number().int().nonnegative().optional()
});

export const SortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('desc')
});

export const FilterSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'startsWith', 'endsWith']),
  value: z.any()
});

// Authentication schemas
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  confirmPassword: z.string().min(8)
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const AuthResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    username: z.string(),
    plan: z.string(),
    createdAt: z.string().datetime()
  }),
  token: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number()
});

// User schemas
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  plan: z.string(),
  listingCredits: z.number().int().nonnegative().optional(),
  listingsUsedThisMonth: z.number().int().nonnegative().optional(),
  onboardingCompleted: z.boolean(),
  timezone: z.string().default('UTC'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const UpdateProfileRequestSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  timezone: z.string().optional(),
  preferences: z.record(z.any()).optional()
});

// Listing schemas
export const CreateListingRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().positive(),
  quantity: z.number().int().positive().default(1),
  images: z.array(z.string().url()).max(12).optional(),
  condition: z.string().optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  material: z.string().max(100).optional(),
  listingFormat: z.enum(['FIXED_PRICE', 'AUCTION']).default('FIXED_PRICE'),
  listingDuration: z.enum(['GTC', 'DAYS_1', 'DAYS_3', 'DAYS_5', 'DAYS_7', 'DAYS_10', 'DAYS_30']).default('GTC'),
  marketplaces: z.array(z.string()).min(1)
});

export const UpdateListingRequestSchema = CreateListingRequestSchema.partial().extend({
  status: z.enum(['draft', 'active', 'sold', 'deleted']).optional()
});

export const ListingResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  price: z.number(),
  quantity: z.number().int(),
  images: z.array(z.string().url()).optional(),
  condition: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  status: z.enum(['draft', 'active', 'sold', 'deleted']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const BulkListingRequestSchema = z.object({
  listings: z.array(CreateListingRequestSchema).min(1).max(100),
  marketplaces: z.array(z.string()).min(1)
});

// Marketplace schemas
export const MarketplaceConnectionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  marketplace: z.string(),
  isConnected: z.boolean(),
  lastSyncAt: z.string().datetime().optional(),
  settings: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ConnectMarketplaceRequestSchema = z.object({
  marketplace: z.string(),
  credentials: z.record(z.string()),
  settings: z.record(z.any()).optional()
});

// Job schemas
export const JobResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().int().min(0).max(100),
  data: z.record(z.any()).optional(),
  result: z.record(z.any()).optional(),
  errorMessage: z.string().optional(),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  scheduledFor: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime()
});

// Automation schemas
export const CreateAutomationRuleRequestSchema = z.object({
  marketplace: z.string(),
  ruleType: z.string(),
  ruleName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  ruleConfig: z.record(z.any()),
  triggerType: z.string(),
  triggerConfig: z.record(z.any()),
  actionConfig: z.record(z.any()).optional(),
  targetCriteria: z.record(z.any()).optional(),
  dailyLimit: z.number().int().positive().optional(),
  hourlyLimit: z.number().int().positive().optional(),
  minDelaySeconds: z.number().int().positive().default(5),
  maxDelaySeconds: z.number().int().positive().default(30),
  humanizeActions: z.boolean().default(true),
  activeHours: z.array(z.object({
    start: z.string(),
    end: z.string(),
    timezone: z.string()
  })).optional(),
  activeDays: z.array(z.number().int().min(0).max(6)).optional()
});

export const AutomationRuleResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  marketplace: z.string(),
  ruleType: z.string(),
  ruleName: z.string(),
  description: z.string().optional(),
  isEnabled: z.boolean(),
  priority: z.number().int(),
  ruleConfig: z.record(z.any()),
  triggerType: z.string(),
  triggerConfig: z.record(z.any()),
  actionConfig: z.record(z.any()).optional(),
  targetCriteria: z.record(z.any()).optional(),
  dailyLimit: z.number().int().positive().optional(),
  hourlyLimit: z.number().int().positive().optional(),
  minDelaySeconds: z.number().int().positive(),
  maxDelaySeconds: z.number().int().positive(),
  humanizeActions: z.boolean(),
  activeHours: z.array(z.object({
    start: z.string(),
    end: z.string(),
    timezone: z.string()
  })).optional(),
  activeDays: z.array(z.number().int().min(0).max(6)).optional(),
  totalExecutions: z.number().int().nonnegative(),
  successfulExecutions: z.number().int().nonnegative(),
  failedExecutions: z.number().int().nonnegative(),
  lastExecutedAt: z.string().datetime().optional(),
  lastError: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Analytics schemas
export const AnalyticsDashboardSchema = z.object({
  totalListings: z.number().int().nonnegative(),
  activeListings: z.number().int().nonnegative(),
  soldListings: z.number().int().nonnegative(),
  totalRevenue: z.number().nonnegative(),
  totalProfit: z.number(),
  averageMargin: z.number(),
  topMarketplaces: z.array(z.object({
    marketplace: z.string(),
    listings: z.number().int().nonnegative(),
    revenue: z.number().nonnegative(),
    profit: z.number()
  })),
  recentActivity: z.array(z.object({
    id: z.string().uuid(),
    type: z.string(),
    description: z.string(),
    timestamp: z.string().datetime()
  }))
});

// Inventory schemas
export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  price: z.number().positive(),
  cost: z.number().positive().optional(),
  quantity: z.number().int().positive(),
  category: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  condition: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(['inches', 'cm'])
  }).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'sold', 'reserved', 'inactive']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const CreateInventoryItemRequestSchema = InventoryItemSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
});

// Sync schemas
export const SyncSettingsSchema = z.object({
  autoSync: z.boolean().default(false),
  syncFrequency: z.enum(['manual', 'immediate', 'hourly', 'daily']).default('manual'),
  syncFields: z.record(z.boolean()).optional(),
  defaultBehavior: z.record(z.any()).optional()
});

export const SyncRuleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  marketplace: z.string(),
  isEnabled: z.boolean(),
  priceAdjustment: z.number().default(0),
  priceFormula: z.string().optional(),
  fieldsToSync: z.record(z.boolean()).optional(),
  templateOverrides: z.record(z.any()).optional(),
  priority: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Webhook schemas
export const WebhookConfigurationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  marketplace: z.string(),
  isEnabled: z.boolean(),
  webhookUrl: z.string().url(),
  externalWebhookId: z.string().optional(),
  supportedEvents: z.array(z.string()),
  subscribedEvents: z.array(z.string()),
  lastVerificationAt: z.string().datetime().optional(),
  verificationStatus: z.enum(['pending', 'verified', 'failed']),
  errorCount: z.number().int().nonnegative(),
  lastErrorAt: z.string().datetime().optional(),
  lastErrorMessage: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// File upload schemas
export const FileUploadResponseSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),
  url: z.string().url(),
  uploadedAt: z.string().datetime()
});

// Notification schemas
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  read: z.boolean(),
  createdAt: z.string().datetime()
});

// Error schemas
export const ErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    status: z.number().int().optional(),
    details: z.record(z.any()).optional()
  }),
  timestamp: z.string().datetime(),
  path: z.string().optional()
});

// Response schemas
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  message: z.string().optional()
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: PaginationSchema
  });
