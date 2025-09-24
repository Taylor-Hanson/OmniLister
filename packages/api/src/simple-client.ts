// Simple API client for testing
export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  async get<T = any>(url: string): Promise<T> {
    console.log(`GET ${url}`);
    return {} as T; // Mock implementation
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    console.log(`POST ${url}`, data);
    return {} as T; // Mock implementation
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    console.log(`PUT ${url}`, data);
    return {} as T; // Mock implementation
  }

  async delete<T = any>(url: string): Promise<T> {
    console.log(`DELETE ${url}`);
    return {} as T; // Mock implementation
  }

  // Entitlements API methods
  entitlements = {
    verifyReceipt: async (receipt: any) => {
      console.log('Verifying receipt:', receipt);
      return {}; // Mock implementation
    },
    
    getUserEntitlements: async () => {
      console.log('Getting user entitlements');
      return []; // Mock implementation
    },
    
    grantTrial: async () => {
      console.log('Granting trial');
      return {}; // Mock implementation
    },
    
    revokeEntitlement: async (entitlement: string) => {
      console.log('Revoking entitlement:', entitlement);
      return {}; // Mock implementation
    },
  };
}

export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};
