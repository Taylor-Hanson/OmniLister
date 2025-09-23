// Backend API Integration Service

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Listing, MarketplaceConnection, CrossPostingJob } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.loadAuthToken();
  }

  private async loadAuthToken(): Promise<void> {
    try {
      this.authToken = await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  private async saveAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_token', token);
      this.authToken = token;
    } catch (error) {
      console.error('Failed to save auth token:', error);
    }
  }

  private async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
      this.authToken = null;
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: 'Network error' };
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.makeRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.token) {
      await this.saveAuthToken(response.data.token);
    }

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.makeRequest<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.data?.token) {
      await this.saveAuthToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    await this.makeRequest('/api/auth/logout', { method: 'POST' });
    await this.clearAuthToken();
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.makeRequest<User>('/api/user');
  }

  // Listings
  async getListings(): Promise<ApiResponse<Listing[]>> {
    return this.makeRequest<Listing[]>('/api/listings');
  }

  async createListing(listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Listing>> {
    return this.makeRequest<Listing>('/api/listings', {
      method: 'POST',
      body: JSON.stringify(listing),
    });
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<ApiResponse<Listing>> {
    return this.makeRequest<Listing>(`/api/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteListing(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/api/listings/${id}`, {
      method: 'DELETE',
    });
  }

  // Marketplace Connections
  async getMarketplaceConnections(): Promise<ApiResponse<MarketplaceConnection[]>> {
    return this.makeRequest<MarketplaceConnection[]>('/api/marketplaces');
  }

  async connectMarketplace(
    marketplaceId: string,
    credentials: Record<string, string>
  ): Promise<ApiResponse<MarketplaceConnection>> {
    return this.makeRequest<MarketplaceConnection>(`/api/marketplaces/${marketplaceId}/connect`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async disconnectMarketplace(marketplaceId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/api/marketplaces/${marketplaceId}/disconnect`, {
      method: 'POST',
    });
  }

  // Cross-Posting
  async createCrossPostingJob(
    listingId: string,
    marketplaces: string[],
    settings: Record<string, any> = {}
  ): Promise<ApiResponse<CrossPostingJob>> {
    return this.makeRequest<CrossPostingJob>('/api/jobs/cross-posting', {
      method: 'POST',
      body: JSON.stringify({ listingId, marketplaces, settings }),
    });
  }

  async getCrossPostingJobs(): Promise<ApiResponse<CrossPostingJob[]>> {
    return this.makeRequest<CrossPostingJob[]>('/api/jobs/cross-posting');
  }

  async getCrossPostingJob(jobId: string): Promise<ApiResponse<CrossPostingJob>> {
    return this.makeRequest<CrossPostingJob>(`/api/jobs/cross-posting/${jobId}`);
  }

  // AI Services
  async analyzeProductImage(imageUri: string): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/api/ai/analyze-image', {
      method: 'POST',
      body: JSON.stringify({ imageUri }),
    });
  }

  async generateProductDescription(
    productData: any,
    marketplace: string
  ): Promise<ApiResponse<string>> {
    return this.makeRequest<string>('/api/ai/generate-description', {
      method: 'POST',
      body: JSON.stringify({ productData, marketplace }),
    });
  }

  async optimizePricing(
    productData: any,
    marketData: any[]
  ): Promise<ApiResponse<{ recommendedPrice: number; reasoning: string }>> {
    return this.makeRequest<{ recommendedPrice: number; reasoning: string }>('/api/ai/optimize-pricing', {
      method: 'POST',
      body: JSON.stringify({ productData, marketData }),
    });
  }

  // File Upload
  async uploadImage(imageUri: string): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);

    try {
      const response = await fetch(`${this.baseUrl}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Upload failed' };
      }

      return { data };
    } catch (error) {
      console.error('Image upload failed:', error);
      return { error: 'Upload failed' };
    }
  }

  // User Stats
  async getUserStats(): Promise<ApiResponse<{
    activeListings: number;
    totalSales: number;
    monthlyRevenue: number;
    connectedMarketplaces: number;
  }>> {
    return this.makeRequest('/api/user/stats');
  }

  // Notifications
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.makeRequest('/api/notifications');
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return this.makeRequest(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.makeRequest('/api/health');
  }

  // WebSocket Connection
  getWebSocketUrl(): string {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    return `${wsUrl}/ws?token=${this.authToken}`;
  }

  // Utility Methods
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }
}

export const apiService = new ApiService();
