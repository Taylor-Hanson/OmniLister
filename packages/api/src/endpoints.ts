// API endpoint definitions
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email'
  },

  // Users
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    DELETE_ACCOUNT: '/users/account',
    PREFERENCES: '/users/preferences',
    BILLING: '/users/billing',
    USAGE: '/users/usage'
  },

  // Listings
  LISTINGS: {
    LIST: '/listings',
    CREATE: '/listings',
    GET: (id: string) => `/listings/${id}`,
    UPDATE: (id: string) => `/listings/${id}`,
    DELETE: (id: string) => `/listings/${id}`,
    BULK_CREATE: '/listings/bulk',
    BULK_UPDATE: '/listings/bulk',
    BULK_DELETE: '/listings/bulk',
    SEARCH: '/listings/search',
    ANALYTICS: (id: string) => `/listings/${id}/analytics`
  },

  // Marketplace Connections
  MARKETPLACES: {
    LIST: '/marketplaces',
    CONNECT: (marketplace: string) => `/marketplaces/${marketplace}/connect`,
    DISCONNECT: (marketplace: string) => `/marketplaces/${marketplace}/disconnect`,
    STATUS: (marketplace: string) => `/marketplaces/${marketplace}/status`,
    SYNC: (marketplace: string) => `/marketplaces/${marketplace}/sync`,
    SETTINGS: (marketplace: string) => `/marketplaces/${marketplace}/settings`
  },

  // Jobs
  JOBS: {
    LIST: '/jobs',
    GET: (id: string) => `/jobs/${id}`,
    CANCEL: (id: string) => `/jobs/${id}/cancel`,
    RETRY: (id: string) => `/jobs/${id}/retry`,
    STATUS: '/jobs/status'
  },

  // Automation
  AUTOMATION: {
    RULES: '/automation/rules',
    CREATE_RULE: '/automation/rules',
    GET_RULE: (id: string) => `/automation/rules/${id}`,
    UPDATE_RULE: (id: string) => `/automation/rules/${id}`,
    DELETE_RULE: (id: string) => `/automation/rules/${id}`,
    SCHEDULES: '/automation/schedules',
    CREATE_SCHEDULE: '/automation/schedules',
    GET_SCHEDULE: (id: string) => `/automation/schedules/${id}`,
    UPDATE_SCHEDULE: (id: string) => `/automation/schedules/${id}`,
    DELETE_SCHEDULE: (id: string) => `/automation/schedules/${id}`,
    LOGS: '/automation/logs',
    EXECUTE: (id: string) => `/automation/rules/${id}/execute`
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    SALES: '/analytics/sales',
    PERFORMANCE: '/analytics/performance',
    MARKETPLACE: '/analytics/marketplace',
    INVENTORY: '/analytics/inventory',
    EXPORTS: '/analytics/exports'
  },

  // Inventory
  INVENTORY: {
    LIST: '/inventory',
    CREATE: '/inventory',
    GET: (id: string) => `/inventory/${id}`,
    UPDATE: (id: string) => `/inventory/${id}`,
    DELETE: (id: string) => `/inventory/${id}`,
    BULK_IMPORT: '/inventory/bulk-import',
    BULK_EXPORT: '/inventory/bulk-export',
    SEARCH: '/inventory/search',
    STATS: '/inventory/stats'
  },

  // Sync
  SYNC: {
    SETTINGS: '/sync/settings',
    RULES: '/sync/rules',
    HISTORY: '/sync/history',
    CONFLICTS: '/sync/conflicts',
    TRIGGER: '/sync/trigger',
    STATUS: '/sync/status'
  },

  // Webhooks
  WEBHOOKS: {
    LIST: '/webhooks',
    CREATE: '/webhooks',
    GET: (id: string) => `/webhooks/${id}`,
    UPDATE: (id: string) => `/webhooks/${id}`,
    DELETE: (id: string) => `/webhooks/${id}`,
    TEST: (id: string) => `/webhooks/${id}/test`,
    EVENTS: '/webhooks/events'
  },

  // Files
  FILES: {
    UPLOAD: '/files/upload',
    GET: (id: string) => `/files/${id}`,
    DELETE: (id: string) => `/files/${id}`,
    BULK_UPLOAD: '/files/bulk-upload'
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    SETTINGS: '/notifications/settings'
  },

  // Support
  SUPPORT: {
    TICKETS: '/support/tickets',
    CREATE_TICKET: '/support/tickets',
    GET_TICKET: (id: string) => `/support/tickets/${id}`,
    UPDATE_TICKET: (id: string) => `/support/tickets/${id}`,
    MESSAGES: (id: string) => `/support/tickets/${id}/messages`,
    FAQ: '/support/faq'
  },

  // Entitlements
  ENTITLEMENTS: {
    VERIFY_RECEIPT: '/entitlements/verify',
    GET_USER_ENTITLEMENTS: '/entitlements',
    GRANT_TRIAL: '/entitlements/trial',
    REVOKE_ENTITLEMENT: (entitlement: string) => `/entitlements/${entitlement}`
  }
} as const;

// API endpoint builder utility
export const buildEndpoint = (base: string, ...parts: (string | number)[]): string => {
  return [base, ...parts.map(String)].join('/').replace(/\/+/g, '/');
};

// Query parameter builder
export const buildQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

// URL builder with query parameters
export const buildUrl = (endpoint: string, params?: Record<string, any>): string => {
  const queryString = params ? buildQueryParams(params) : '';
  return `${endpoint}${queryString}`;
};
