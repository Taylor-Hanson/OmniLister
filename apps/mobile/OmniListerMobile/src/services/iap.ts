import { Platform } from 'react-native';
import { entitlementsService, Entitlement, AppleReceipt, GoogleReceipt } from '@omnilister/core';
import { apiClient } from '@omnilister/api';

export interface IAPService {
  initialize(): Promise<void>;
  purchase(productId: string): Promise<boolean>;
  restore(): Promise<void>;
  getAvailableProducts(): Promise<IAPProduct[]>;
  isProductPurchased(productId: string): Promise<boolean>;
}

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
}

// Mock implementation for development
class MockIAPService implements IAPService {
  private availableProducts: IAPProduct[] = [
    {
      productId: 'com.juliehanson.omnilister.adv_automation',
      title: 'Advanced Automation',
      description: 'Unlock advanced automation features',
      price: '9.99',
      currency: 'USD',
      localizedPrice: '$9.99',
    },
    {
      productId: 'com.juliehanson.omnilister.bulk_analytics',
      title: 'Bulk Analytics',
      description: 'Access to bulk analytics and reporting',
      price: '4.99',
      currency: 'USD',
      localizedPrice: '$4.99',
    },
    {
      productId: 'com.juliehanson.omnilister.premium_support',
      title: 'Premium Support',
      description: 'Priority customer support',
      price: '2.99',
      currency: 'USD',
      localizedPrice: '$2.99',
    },
    {
      productId: 'com.juliehanson.omnilister.unlimited_listings',
      title: 'Unlimited Listings',
      description: 'Remove listing limits',
      price: '19.99',
      currency: 'USD',
      localizedPrice: '$19.99',
    },
  ];

  async initialize(): Promise<void> {
    console.log('Initializing IAP service...');
    
    // In a real implementation, this would:
    // 1. Initialize the native IAP library
    // 2. Load available products from the app store
    // 3. Set up purchase listeners
    // 4. Restore previous purchases
    
    console.log('IAP service initialized');
  }

  async purchase(productId: string): Promise<boolean> {
    console.log(`Attempting to purchase product: ${productId}`);
    
    try {
      // In a real implementation, this would:
      // 1. Call the native IAP library to initiate purchase
      // 2. Handle the purchase flow
      // 3. Get the receipt from the app store
      // 4. Send receipt to backend for verification
      
      // Mock successful purchase
      const mockReceipt = this.createMockReceipt(productId);
      await this.verifyReceipt(mockReceipt);
      
      console.log(`Successfully purchased product: ${productId}`);
      return true;
    } catch (error) {
      console.error(`Failed to purchase product ${productId}:`, error);
      return false;
    }
  }

  async restore(): Promise<void> {
    console.log('Restoring previous purchases...');
    
    try {
      // In a real implementation, this would:
      // 1. Call the native IAP library to restore purchases
      // 2. Get all previous purchase receipts
      // 3. Send receipts to backend for verification
      
      // Mock restore - in real implementation, this would get actual receipts
      console.log('Previous purchases restored');
    } catch (error) {
      console.error('Failed to restore purchases:', error);
    }
  }

  async getAvailableProducts(): Promise<IAPProduct[]> {
    console.log('Getting available products...');
    
    // In a real implementation, this would:
    // 1. Query the app store for available products
    // 2. Return the actual product information
    
    return this.availableProducts;
  }

  async isProductPurchased(productId: string): Promise<boolean> {
    console.log(`Checking if product is purchased: ${productId}`);
    
    // In a real implementation, this would:
    // 1. Check the native IAP library for purchase status
    // 2. Verify with the app store
    
    // For now, check entitlements
    const entitlement = this.mapProductIdToEntitlement(productId);
    if (!entitlement) {
      return false;
    }
    
    // This would need the actual user ID in a real implementation
    const userId = 'mock-user-id';
    return await entitlementsService.hasEntitlement(userId, entitlement);
  }

  private createMockReceipt(productId: string): AppleReceipt | GoogleReceipt {
    if (Platform.OS === 'ios') {
      return {
        receiptData: `mock-receipt-data-${Date.now()}`,
        productId,
        transactionId: `mock-transaction-${Date.now()}`,
        originalTransactionId: `mock-original-${Date.now()}`,
      } as AppleReceipt;
    } else {
      return {
        purchaseToken: `mock-purchase-token-${Date.now()}`,
        productId,
        orderId: `mock-order-${Date.now()}`,
        packageName: 'com.juliehanson.omnilister.beta',
      } as GoogleReceipt;
    }
  }

  private async verifyReceipt(receipt: AppleReceipt | GoogleReceipt): Promise<void> {
    console.log('Verifying receipt with backend...');
    
    try {
      // Send receipt to backend for verification
      await apiClient.entitlements.verifyReceipt(receipt);
      
      // Sync entitlements locally
      const userId = 'mock-user-id'; // This would be the actual user ID
      await entitlementsService.syncEntitlementsFromReceipt(userId, receipt);
      
      console.log('Receipt verified and entitlements synced');
    } catch (error) {
      console.error('Failed to verify receipt:', error);
      throw error;
    }
  }

  private mapProductIdToEntitlement(productId: string): Entitlement | null {
    const mapping: Record<string, Entitlement> = {
      'com.juliehanson.omnilister.adv_automation': 'ADV_AUTOMATION',
      'com.juliehanson.omnilister.bulk_analytics': 'BULK_ANALYTICS',
      'com.juliehanson.omnilister.premium_support': 'PREMIUM_SUPPORT',
      'com.juliehanson.omnilister.unlimited_listings': 'UNLIMITED_LISTINGS',
    };
    
    return mapping[productId] || null;
  }
}

// Export singleton instance
export const iapService = new MockIAPService();

// Export types for use in other modules
export type { IAPService, IAPProduct };
