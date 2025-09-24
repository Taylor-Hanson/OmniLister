// Mock API Service for Development/Testing
// This provides a working authentication system without requiring a backend server

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class MockApiService {
  private authToken: string | null = null;

  constructor() {
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

  // Mock delay to simulate network requests
  private delay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock user data
  private getMockUser(email: string, name: string): User {
    return {
      id: 'mock-user-id',
      email,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        notifications: true,
        defaultMarketplaces: ['ebay', 'poshmark']
      }
    };
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    await this.delay(1500); // Simulate network delay

    // Mock validation - accept any email/password for demo
    if (!email || !password) {
      return { error: 'Email and password are required' };
    }

    // Mock successful login
    const user = this.getMockUser(email, email.split('@')[0]);
    const token = `mock-token-${Date.now()}`;
    
    await this.saveAuthToken(token);

    return {
      data: { user, token }
    };
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    await this.delay(1500); // Simulate network delay

    // Mock validation
    if (!userData.email || !userData.password || !userData.name) {
      return { error: 'All fields are required' };
    }

    // Mock successful registration
    const user = this.getMockUser(userData.email, userData.name);
    const token = `mock-token-${Date.now()}`;
    
    await this.saveAuthToken(token);

    return {
      data: { user, token }
    };
  }

  async logout(): Promise<void> {
    await this.delay(500);
    await this.clearAuthToken();
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    await this.delay(500);

    if (!this.authToken) {
      return { error: 'Not authenticated' };
    }

    // Return mock user data
    const user = this.getMockUser('demo@omnilister.com', 'Demo User');
    return { data: user };
  }

  // Mock other API methods
  async getListings(): Promise<ApiResponse<any[]>> {
    await this.delay(1000);
    return { data: [] };
  }

  async createListing(listing: any): Promise<ApiResponse<any>> {
    await this.delay(1000);
    return { data: { ...listing, id: 'mock-listing-id' } };
  }

  async getMarketplaceConnections(): Promise<ApiResponse<any[]>> {
    await this.delay(1000);
    return { data: [] };
  }

  async analyzeProductImage(imageUri: string): Promise<ApiResponse<any>> {
    await this.delay(2000);
    return {
      data: {
        brand: 'Mock Brand',
        category: 'Electronics',
        condition: 'Good',
        estimatedPrice: 99.99,
        confidence: 0.85
      }
    };
  }

  async generateProductDescription(productData: any, marketplace: string): Promise<ApiResponse<string>> {
    await this.delay(1500);
    return {
      data: `Mock product description for ${marketplace}. This is a high-quality item in excellent condition.`
    };
  }

  async optimizePricing(productData: any, marketData: any[]): Promise<ApiResponse<{ recommendedPrice: number; reasoning: string }>> {
    await this.delay(1000);
    return {
      data: {
        recommendedPrice: 89.99,
        reasoning: 'Based on similar items in the market, this price should provide good visibility and competitive advantage.'
      }
    };
  }

  async uploadImage(imageUri: string): Promise<ApiResponse<{ url: string }>> {
    await this.delay(2000);
    return {
      data: { url: 'https://mock-image-url.com/image.jpg' }
    };
  }

  async getUserStats(): Promise<ApiResponse<{
    activeListings: number;
    totalSales: number;
    monthlyRevenue: number;
    connectedMarketplaces: number;
  }>> {
    await this.delay(1000);
    return {
      data: {
        activeListings: 12,
        totalSales: 45,
        monthlyRevenue: 1250.50,
        connectedMarketplaces: 3
      }
    };
  }

  async getNotifications(): Promise<ApiResponse<any[]>> {
    await this.delay(1000);
    return { data: [] };
  }

  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    await this.delay(500);
    return {
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString()
      }
    };
  }

  // Utility Methods
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }
}

export const mockApiService = new MockApiService();
