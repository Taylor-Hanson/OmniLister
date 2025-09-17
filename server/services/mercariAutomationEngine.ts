import {
  type AutomationRule,
  type User,
  type Listing,
  type MarketplaceConnection,
  type InsertAutomationLog
} from "@shared/schema";
import { storage } from "../storage";
import { rateLimitService } from "./rateLimitService";
import { marketplaceService } from "./marketplaceService";
import type { MarketplaceAutomationEngine } from "./automationService";

interface MercariApiClient {
  sendOffer(itemId: string, offer: MercariOffer, accessToken: string): Promise<void>;
  getLikers(itemId: string, accessToken: string): Promise<string[]>;
  getWatchers(itemId: string, accessToken: string): Promise<string[]>;
  relistItem(itemId: string, updates: any, accessToken: string): Promise<string>;
  getItemActivity(itemId: string, accessToken: string): Promise<ItemActivity>;
  updateListing(itemId: string, updates: any, accessToken: string): Promise<void>;
  getMarketTrends(category: string, accessToken: string): Promise<MarketTrends>;
}

interface MercariOffer {
  targetUserId: string;
  discountPercentage: number;
  message?: string;
  expiresIn?: number; // hours
}

interface ItemActivity {
  views: number;
  likes: number;
  lastActivityDate: Date;
  daysListed: number;
}

interface MarketTrends {
  averagePrice: number;
  priceRange: { min: number; max: number };
  demandLevel: "low" | "medium" | "high";
  suggestedPrice?: number;
}

// Mock Mercari API client - replace with actual implementation
class MockMercariApiClient implements MercariApiClient {
  async sendOffer(itemId: string, offer: MercariOffer, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Mercari] Sent offer for item ${itemId}:`, offer);
  }

  async getLikers(itemId: string, accessToken: string): Promise<string[]> {
    await this.simulateApiDelay();
    return [`liker_merc_${Date.now()}_1`, `liker_merc_${Date.now()}_2`];
  }

  async getWatchers(itemId: string, accessToken: string): Promise<string[]> {
    await this.simulateApiDelay();
    return [`watcher_merc_${Date.now()}_1`, `watcher_merc_${Date.now()}_2`];
  }

  async relistItem(itemId: string, updates: any, accessToken: string): Promise<string> {
    await this.simulateApiDelay();
    const newId = `merc_${Date.now()}`;
    console.log(`[Mercari] Relisted item ${itemId} as ${newId}`);
    return newId;
  }

  async getItemActivity(itemId: string, accessToken: string): Promise<ItemActivity> {
    await this.simulateApiDelay();
    return {
      views: Math.floor(Math.random() * 100),
      likes: Math.floor(Math.random() * 20),
      lastActivityDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      daysListed: Math.floor(Math.random() * 30),
    };
  }

  async updateListing(itemId: string, updates: any, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Mercari] Updated listing ${itemId}:`, updates);
  }

  async getMarketTrends(category: string, accessToken: string): Promise<MarketTrends> {
    await this.simulateApiDelay();
    const avgPrice = Math.random() * 100 + 20;
    return {
      averagePrice: avgPrice,
      priceRange: { min: avgPrice * 0.7, max: avgPrice * 1.3 },
      demandLevel: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as any,
      suggestedPrice: avgPrice * (0.95 + Math.random() * 0.1),
    };
  }

  private async simulateApiDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  }
}

export class MercariAutomationEngine implements MarketplaceAutomationEngine {
  marketplace = "mercari";
  private apiClient: MercariApiClient;
  private offerTracker: Map<string, { count: number; lastOfferDate: Date }> = new Map();

  constructor() {
    this.apiClient = new MockMercariApiClient();
  }

  /**
   * Execute automation based on rule type
   */
  async executeAutomation(rule: AutomationRule, user: User): Promise<void> {
    // Get Mercari connection
    const connection = await this.getConnection(user.id);
    if (!connection) {
      throw new Error("No Mercari connection found");
    }

    // Check token validity
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      throw new Error("Mercari token expired");
    }

    // Execute based on rule type
    switch (rule.ruleType) {
      case "auto_offer":
        await this.executeAutoOffer(rule, user, connection);
        break;
      case "auto_relist":
        await this.executeAutoRelist(rule, user, connection);
        break;
      case "smart_pricing":
        await this.executeSmartPricing(rule, user, connection);
        break;
      case "bundle_offer":
        await this.executeBundleOffer(rule, user, connection);
        break;
      case "offer_to_watchers":
        await this.executeOfferToWatchers(rule, user, connection);
        break;
      default:
        throw new Error(`Unsupported automation type for Mercari: ${rule.ruleType}`);
    }
  }

  /**
   * Send automatic offers to likers
   */
  private async executeAutoOffer(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.configuration as any;
    
    // Get active listings
    const listings = await storage.getListings(user.id, {
      marketplace: "mercari",
      status: "active",
    });

    let successCount = 0;
    let failedCount = 0;

    for (const listing of listings) {
      if (!listing.externalListingId) continue;

      try {
        // Get likers for this item
        const likers = await this.apiClient.getLikers(
          listing.externalListingId,
          connection.accessToken!
        );

        // Filter likers who haven't received offers recently
        const eligibleLikers = await this.filterEligibleLikers(listing.id, likers);

        for (const likerId of eligibleLikers) {
          // Apply rate limiting
          const canProceed = await rateLimitService.consumeToken(
            user.id,
            "mercari",
            "auto_offer"
          );

          if (!canProceed) {
            console.log("[Mercari] Rate limit reached for offers");
            break;
          }

          // Calculate offer based on configuration
          const offer = this.calculateOffer(listing, config);
          
          // Add human-like delay
          await this.addHumanDelay();

          // Send the offer
          await this.apiClient.sendOffer(
            listing.externalListingId,
            {
              targetUserId: likerId,
              discountPercentage: offer.discountPercentage,
              message: offer.message || config.defaultMessage,
              expiresIn: config.offerExpirationHours || 24,
            },
            connection.accessToken!
          );

          // Track the offer
          await this.trackOffer(listing.id, likerId);
          successCount++;

          // Log the action
          await this.logAction(user.id, rule.id, "offer_sent", {
            listingId: listing.id,
            likerId,
            discount: offer.discountPercentage,
          });
        }
      } catch (error) {
        console.error(`[Mercari] Error sending offers for listing ${listing.id}:`, error);
        failedCount++;
      }
    }

    console.log(`[Mercari] Offers sent: ${successCount} successful, ${failedCount} failed`);
  }

  /**
   * Auto-relist stale listings
   */
  private async executeAutoRelist(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.configuration as any;
    const staleThresholdDays = config.staleThresholdDays || 30;
    const priceDropPercentage = config.priceDropPercentage || 0;

    // Get listings that might be stale
    const listings = await storage.getListings(user.id, {
      marketplace: "mercari",
      status: "active",
    });

    let relistedCount = 0;

    for (const listing of listings) {
      if (!listing.externalListingId) continue;

      try {
        // Get activity metrics
        const activity = await this.apiClient.getItemActivity(
          listing.externalListingId,
          connection.accessToken!
        );

        // Check if listing is stale
        if (this.isListingStale(activity, staleThresholdDays)) {
          // Apply rate limiting
          const canProceed = await rateLimitService.consumeToken(
            user.id,
            "mercari",
            "auto_relist"
          );

          if (!canProceed) {
            console.log("[Mercari] Rate limit reached for relisting");
            break;
          }

          // Prepare updates for relisting
          const updates = this.prepareRelistUpdates(listing, config, priceDropPercentage);

          // Add human-like delay
          await this.addHumanDelay();

          // Relist the item
          const newExternalId = await this.apiClient.relistItem(
            listing.externalListingId,
            updates,
            connection.accessToken!
          );

          // Update the listing in our database
          await storage.updateListing(listing.id, {
            externalListingId: newExternalId,
            price: updates.price || listing.price,
            updatedAt: new Date(),
          });

          relistedCount++;

          // Log the action
          await this.logAction(user.id, rule.id, "item_relisted", {
            listingId: listing.id,
            oldExternalId: listing.externalListingId,
            newExternalId,
            priceChange: updates.price ? listing.price - updates.price : 0,
          });
        }
      } catch (error) {
        console.error(`[Mercari] Error relisting ${listing.id}:`, error);
      }
    }

    console.log(`[Mercari] Relisted ${relistedCount} stale listings`);
  }

  /**
   * Smart pricing based on market conditions
   */
  private async executeSmartPricing(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.configuration as any;
    
    const listings = await storage.getListings(user.id, {
      marketplace: "mercari",
      status: "active",
    });

    for (const listing of listings) {
      if (!listing.externalListingId || !listing.categoryId) continue;

      try {
        // Get market trends
        const trends = await this.apiClient.getMarketTrends(
          listing.categoryId,
          connection.accessToken!
        );

        // Determine if price adjustment is needed
        const suggestedPrice = this.calculateSmartPrice(listing, trends, config);
        
        if (Math.abs(suggestedPrice - listing.price) > listing.price * 0.05) {
          // Price difference is more than 5%, update it
          await this.apiClient.updateListing(
            listing.externalListingId,
            { price: suggestedPrice },
            connection.accessToken!
          );

          await storage.updateListing(listing.id, {
            price: suggestedPrice,
            updatedAt: new Date(),
          });

          await this.logAction(user.id, rule.id, "price_adjusted", {
            listingId: listing.id,
            oldPrice: listing.price,
            newPrice: suggestedPrice,
            reason: trends.demandLevel,
          });
        }
      } catch (error) {
        console.error(`[Mercari] Error adjusting price for ${listing.id}:`, error);
      }
    }
  }

  /**
   * Send bundle offers
   */
  private async executeBundleOffer(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.configuration as any;
    
    // Get users who have liked multiple items
    const bundleCandidates = await this.findBundleCandidates(user.id, connection);
    
    for (const candidate of bundleCandidates) {
      const bundleOffer = this.createBundleOffer(candidate.items, config);
      
      // Send bundle offer logic here
      await this.logAction(user.id, rule.id, "bundle_offer_sent", {
        userId: candidate.userId,
        itemCount: candidate.items.length,
        totalDiscount: bundleOffer.discount,
      });
    }
  }

  /**
   * Send offers to watchers
   */
  private async executeOfferToWatchers(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.configuration as any;
    
    const listings = await storage.getListings(user.id, {
      marketplace: "mercari",
      status: "active",
    });

    for (const listing of listings) {
      if (!listing.externalListingId) continue;

      try {
        const watchers = await this.apiClient.getWatchers(
          listing.externalListingId,
          connection.accessToken!
        );

        for (const watcherId of watchers) {
          const canProceed = await rateLimitService.consumeToken(
            user.id,
            "mercari",
            "auto_offer"
          );

          if (!canProceed) break;

          await this.addHumanDelay();

          await this.apiClient.sendOffer(
            listing.externalListingId,
            {
              targetUserId: watcherId,
              discountPercentage: config.watcherDiscountPercentage || 5,
              message: config.watcherMessage || "Special offer for watching this item!",
              expiresIn: 48,
            },
            connection.accessToken!
          );

          await this.logAction(user.id, rule.id, "watcher_offer_sent", {
            listingId: listing.id,
            watcherId,
          });
        }
      } catch (error) {
        console.error(`[Mercari] Error sending watcher offers:`, error);
      }
    }
  }

  /**
   * Validate rule configuration
   */
  async validateRule(rule: AutomationRule): Promise<boolean> {
    const config = rule.configuration as any;
    
    switch (rule.ruleType) {
      case "auto_offer":
        return config.discountPercentage > 0 && config.discountPercentage <= 50;
      case "auto_relist":
        return config.staleThresholdDays >= 7;
      case "smart_pricing":
        return config.minPrice > 0 && (!config.maxPrice || config.maxPrice > config.minPrice);
      default:
        return true;
    }
  }

  /**
   * Get available automation actions for Mercari
   */
  getAvailableActions(): string[] {
    return [
      "auto_offer",
      "auto_relist", 
      "smart_pricing",
      "bundle_offer",
      "offer_to_watchers",
    ];
  }

  /**
   * Get default configuration for an action type
   */
  getDefaultConfig(actionType: string): any {
    const configs: Record<string, any> = {
      auto_offer: {
        discountPercentage: 10,
        defaultMessage: "Thanks for your interest! I'm offering you a special discount.",
        offerExpirationHours: 24,
        maxOffersPerDay: 20,
        excludeRecentLikers: true,
      },
      auto_relist: {
        staleThresholdDays: 30,
        priceDropPercentage: 5,
        updatePhotos: false,
        refreshDescription: true,
        relistTime: "evening",
      },
      smart_pricing: {
        enableDynamicPricing: true,
        minPrice: 5,
        maxPriceIncrease: 20,
        priceDropIncrement: 5,
        considerMarketTrends: true,
      },
      bundle_offer: {
        minItemsForBundle: 2,
        bundleDiscountPercentage: 15,
        bundleMessage: "Bundle these items for a special discount!",
      },
      offer_to_watchers: {
        watcherDiscountPercentage: 5,
        watcherMessage: "You've been watching this item - here's a special offer!",
        minWatchDays: 2,
      },
    };

    return configs[actionType] || {};
  }

  /**
   * Helper methods
   */
  private async getConnection(userId: string): Promise<MarketplaceConnection | null> {
    const connections = await storage.getMarketplaceConnections(userId);
    return connections.find(c => c.marketplace === "mercari" && c.isConnected) || null;
  }

  private async addHumanDelay(): Promise<void> {
    const delay = Math.random() * 3000 + 2000; // 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private calculateOffer(listing: Listing, config: any): { discountPercentage: number; message?: string } {
    let discount = config.discountPercentage || 10;
    
    // Adjust discount based on item age
    const daysListed = Math.floor((Date.now() - listing.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysListed > 30) {
      discount = Math.min(discount * 1.5, 30); // Increase discount for older items, max 30%
    }

    return {
      discountPercentage: Math.round(discount),
      message: config.defaultMessage,
    };
  }

  private isListingStale(activity: ItemActivity, threshold: number): boolean {
    return activity.daysListed > threshold && activity.views < 10 && activity.likes < 2;
  }

  private prepareRelistUpdates(listing: Listing, config: any, priceDropPercentage: number): any {
    const updates: any = {
      title: listing.title,
      description: listing.description,
      updatedAt: new Date(),
    };

    if (priceDropPercentage > 0) {
      updates.price = listing.price * (1 - priceDropPercentage / 100);
    }

    if (config.refreshDescription) {
      updates.description = this.refreshDescription(listing.description);
    }

    return updates;
  }

  private refreshDescription(description: string): string {
    // Add timestamp or seasonal keywords to refresh description
    const seasons = ["Spring", "Summer", "Fall", "Winter"];
    const currentSeason = seasons[Math.floor(new Date().getMonth() / 3)];
    
    if (!description.includes(currentSeason)) {
      return `[${currentSeason} Sale!] ${description}`;
    }
    
    return description;
  }

  private calculateSmartPrice(listing: Listing, trends: MarketTrends, config: any): number {
    let suggestedPrice = listing.price;

    if (trends.suggestedPrice) {
      // Use market suggested price as baseline
      suggestedPrice = trends.suggestedPrice;
    }

    // Adjust based on demand level
    if (trends.demandLevel === "high") {
      suggestedPrice = Math.min(suggestedPrice * 1.1, config.maxPrice || suggestedPrice * 1.2);
    } else if (trends.demandLevel === "low") {
      suggestedPrice = Math.max(suggestedPrice * 0.9, config.minPrice || 5);
    }

    // Ensure price is within configured bounds
    if (config.minPrice) {
      suggestedPrice = Math.max(suggestedPrice, config.minPrice);
    }
    if (config.maxPrice) {
      suggestedPrice = Math.min(suggestedPrice, config.maxPrice);
    }

    return Math.round(suggestedPrice * 100) / 100; // Round to 2 decimal places
  }

  private async filterEligibleLikers(listingId: string, likers: string[]): Promise<string[]> {
    // Filter out likers who have received offers recently
    // This is a simplified implementation - in production, you'd check the database
    return likers.slice(0, 5); // Limit to 5 likers per batch
  }

  private async trackOffer(listingId: string, userId: string): Promise<void> {
    const key = `${listingId}_${userId}`;
    this.offerTracker.set(key, {
      count: (this.offerTracker.get(key)?.count || 0) + 1,
      lastOfferDate: new Date(),
    });
  }

  private async findBundleCandidates(userId: string, connection: MarketplaceConnection): Promise<any[]> {
    // Simplified implementation - find users who liked multiple items
    return [];
  }

  private createBundleOffer(items: any[], config: any): any {
    return {
      discount: config.bundleDiscountPercentage || 15,
      message: config.bundleMessage,
    };
  }

  private async logAction(userId: string, ruleId: string, action: string, details: any): Promise<void> {
    await storage.createAutomationLog({
      userId,
      ruleId,
      action,
      status: "success",
      details,
      executedAt: new Date(),
    });
  }
}

// Export singleton instance
export const mercariAutomationEngine = new MercariAutomationEngine();