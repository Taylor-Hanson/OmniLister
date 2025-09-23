import { z } from 'zod';

// Entitlement types
export const EntitlementSchema = z.enum([
  'ADV_AUTOMATION',
  'BULK_ANALYTICS',
  'PREMIUM_SUPPORT',
  'UNLIMITED_LISTINGS',
  'PRIORITY_PROCESSING',
  'ADVANCED_REPORTING',
  'API_ACCESS',
  'WHITE_LABEL'
]);

export type Entitlement = z.infer<typeof EntitlementSchema>;

// Entitlement source types
export const EntitlementSourceSchema = z.enum(['APPLE', 'GOOGLE', 'WEB', 'TRIAL']);

export type EntitlementSource = z.infer<typeof EntitlementSourceSchema>;

// User entitlement record
export const UserEntitlementSchema = z.object({
  id: z.string(),
  userId: z.string(),
  entitlement: EntitlementSchema,
  source: EntitlementSourceSchema,
  productId: z.string().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserEntitlement = z.infer<typeof UserEntitlementSchema>;

// Platform receipt types
export const AppleReceiptSchema = z.object({
  receiptData: z.string(),
  productId: z.string(),
  transactionId: z.string(),
  originalTransactionId: z.string().optional(),
});

export const GoogleReceiptSchema = z.object({
  purchaseToken: z.string(),
  productId: z.string(),
  orderId: z.string(),
  packageName: z.string(),
});

export type AppleReceipt = z.infer<typeof AppleReceiptSchema>;
export type GoogleReceipt = z.infer<typeof GoogleReceiptSchema>;

// Web subscription types
export const StripeWebhookEventSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.object({
      id: z.string(),
      customer: z.string(),
      status: z.string(),
      current_period_end: z.number(),
      items: z.object({
        data: z.array(z.object({
          price: z.object({
            id: z.string(),
            product: z.string(),
          }),
        })),
      }),
    }),
  }),
});

export type StripeWebhookEvent = z.infer<typeof StripeWebhookEventSchema>;

// Product SKU mapping
export const PRODUCT_SKUS = {
  // Apple App Store
  APPLE: {
    ADV_AUTOMATION: 'com.juliehanson.omnilister.adv_automation',
    BULK_ANALYTICS: 'com.juliehanson.omnilister.bulk_analytics',
    PREMIUM_SUPPORT: 'com.juliehanson.omnilister.premium_support',
    UNLIMITED_LISTINGS: 'com.juliehanson.omnilister.unlimited_listings',
  },
  // Google Play Store
  GOOGLE: {
    ADV_AUTOMATION: 'adv_automation',
    BULK_ANALYTICS: 'bulk_analytics',
    PREMIUM_SUPPORT: 'premium_support',
    UNLIMITED_LISTINGS: 'unlimited_listings',
  },
  // Web/Stripe
  WEB: {
    ADV_AUTOMATION: 'price_adv_automation',
    BULK_ANALYTICS: 'price_bulk_analytics',
    PREMIUM_SUPPORT: 'price_premium_support',
    UNLIMITED_LISTINGS: 'price_unlimited_listings',
  },
} as const;

// Entitlements service interface
export interface EntitlementsService {
  hasEntitlement(userId: string, entitlement: Entitlement): Promise<boolean>;
  getUserEntitlements(userId: string): Promise<UserEntitlement[]>;
  syncEntitlementsFromReceipt(userId: string, receipt: AppleReceipt | GoogleReceipt): Promise<void>;
  syncEntitlementsFromWebSubscription(userId: string, webhookEvent: StripeWebhookEvent): Promise<void>;
  grantTrialEntitlements(userId: string): Promise<void>;
  revokeEntitlement(userId: string, entitlement: Entitlement): Promise<void>;
}

// Mock implementation (to be replaced with actual database operations)
export class MockEntitlementsService implements EntitlementsService {
  private entitlements: Map<string, UserEntitlement[]> = new Map();

  async hasEntitlement(userId: string, entitlement: Entitlement): Promise<boolean> {
    const userEntitlements = this.entitlements.get(userId) || [];
    const hasEntitlement = userEntitlements.some(
      e => e.entitlement === entitlement && 
           (!e.expiresAt || e.expiresAt > new Date())
    );
    
    console.log(`Checking entitlement ${entitlement} for user ${userId}: ${hasEntitlement}`);
    return hasEntitlement;
  }

  async getUserEntitlements(userId: string): Promise<UserEntitlement[]> {
    const userEntitlements = this.entitlements.get(userId) || [];
    // Filter out expired entitlements
    return userEntitlements.filter(
      e => !e.expiresAt || e.expiresAt > new Date()
    );
  }

  async syncEntitlementsFromReceipt(userId: string, receipt: AppleReceipt | GoogleReceipt): Promise<void> {
    console.log(`Syncing entitlements from receipt for user ${userId}`);
    
    // Map product ID to entitlement
    const entitlement = this.mapProductIdToEntitlement(receipt.productId);
    if (!entitlement) {
      console.warn(`Unknown product ID: ${receipt.productId}`);
      return;
    }

    // Create or update entitlement
    const userEntitlements = this.entitlements.get(userId) || [];
    const existingIndex = userEntitlements.findIndex(
      e => e.entitlement === entitlement && e.source === (receipt.productId.includes('com.') ? 'APPLE' : 'GOOGLE')
    );

    const newEntitlement: UserEntitlement = {
      id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      entitlement,
      source: receipt.productId.includes('com.') ? 'APPLE' : 'GOOGLE',
      productId: receipt.productId,
      expiresAt: undefined, // Permanent entitlements
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      userEntitlements[existingIndex] = { ...newEntitlement, id: userEntitlements[existingIndex].id };
    } else {
      userEntitlements.push(newEntitlement);
    }

    this.entitlements.set(userId, userEntitlements);
    console.log(`Synced entitlement ${entitlement} for user ${userId}`);
  }

  async syncEntitlementsFromWebSubscription(userId: string, webhookEvent: StripeWebhookEvent): Promise<void> {
    console.log(`Syncing entitlements from web subscription for user ${userId}`);
    
    if (webhookEvent.type !== 'customer.subscription.updated' && 
        webhookEvent.type !== 'customer.subscription.created') {
      return;
    }

    const subscription = webhookEvent.data.object;
    const expiresAt = new Date(subscription.current_period_end * 1000);

    // Process each product in the subscription
    for (const item of subscription.items.data) {
      const entitlement = this.mapProductIdToEntitlement(item.price.id);
      if (!entitlement) {
        console.warn(`Unknown web product ID: ${item.price.id}`);
        continue;
      }

      const userEntitlements = this.entitlements.get(userId) || [];
      const existingIndex = userEntitlements.findIndex(
        e => e.entitlement === entitlement && e.source === 'WEB'
      );

      const newEntitlement: UserEntitlement = {
        id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        entitlement,
        source: 'WEB',
        productId: item.price.id,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (existingIndex >= 0) {
        userEntitlements[existingIndex] = { ...newEntitlement, id: userEntitlements[existingIndex].id };
      } else {
        userEntitlements.push(newEntitlement);
      }

      this.entitlements.set(userId, userEntitlements);
    }

    console.log(`Synced web subscription entitlements for user ${userId}`);
  }

  async grantTrialEntitlements(userId: string): Promise<void> {
    console.log(`Granting trial entitlements for user ${userId}`);
    
    const trialEntitlements: Entitlement[] = ['ADV_AUTOMATION', 'BULK_ANALYTICS'];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14-day trial

    const userEntitlements = this.entitlements.get(userId) || [];

    for (const entitlement of trialEntitlements) {
      const existingIndex = userEntitlements.findIndex(
        e => e.entitlement === entitlement && e.source === 'TRIAL'
      );

      const newEntitlement: UserEntitlement = {
        id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        entitlement,
        source: 'TRIAL',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (existingIndex >= 0) {
        userEntitlements[existingIndex] = { ...newEntitlement, id: userEntitlements[existingIndex].id };
      } else {
        userEntitlements.push(newEntitlement);
      }
    }

    this.entitlements.set(userId, userEntitlements);
    console.log(`Granted trial entitlements for user ${userId}`);
  }

  async revokeEntitlement(userId: string, entitlement: Entitlement): Promise<void> {
    console.log(`Revoking entitlement ${entitlement} for user ${userId}`);
    
    const userEntitlements = this.entitlements.get(userId) || [];
    const filtered = userEntitlements.filter(e => e.entitlement !== entitlement);
    this.entitlements.set(userId, filtered);
  }

  private mapProductIdToEntitlement(productId: string): Entitlement | null {
    // Check Apple products
    for (const [entitlement, appleProductId] of Object.entries(PRODUCT_SKUS.APPLE)) {
      if (productId === appleProductId) {
        return entitlement as Entitlement;
      }
    }

    // Check Google products
    for (const [entitlement, googleProductId] of Object.entries(PRODUCT_SKUS.GOOGLE)) {
      if (productId === googleProductId) {
        return entitlement as Entitlement;
      }
    }

    // Check Web products
    for (const [entitlement, webProductId] of Object.entries(PRODUCT_SKUS.WEB)) {
      if (productId === webProductId) {
        return entitlement as Entitlement;
      }
    }

    return null;
  }
}

// Export singleton instance
export const entitlementsService = new MockEntitlementsService();

// Export types for use in other modules
export type { EntitlementsService };
