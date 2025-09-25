import {
  type AutomationRule,
  type User,
  type PoshmarkShareSettings,
  type OfferTemplate,
  type Listing,
  type MarketplaceConnection
} from "../shared/schema.ts";
import { storage } from "../storage";
import { rateLimitService } from "./rateLimitService";
import { marketplaceService } from "./marketplaceService";
import type { MarketplaceAutomationEngine } from "./automationService";

interface PoshmarkApiClient {
  shareItem(itemId: string, accessToken: string): Promise<void>;
  shareToParty(itemId: string, partyId: string, accessToken: string): Promise<void>;
  followUser(userId: string, accessToken: string): Promise<void>;
  unfollowUser(userId: string, accessToken: string): Promise<void>;
  sendOffer(itemId: string, offer: any, accessToken: string): Promise<void>;
  getLikers(itemId: string, accessToken: string): Promise<string[]>;
  getClosetItems(userId: string, accessToken: string): Promise<string[]>;
  getActiveParties(accessToken: string): Promise<Array<{ id: string; name: string; startTime: Date }>>;
}

// Mock Poshmark API client - replace with actual implementation
class MockPoshmarkApiClient implements PoshmarkApiClient {
  async shareItem(itemId: string, accessToken: string): Promise<void> {
    // Simulate API call
    await this.simulateApiDelay();
    console.log(`[Poshmark] Shared item ${itemId}`);
  }

  async shareToParty(itemId: string, partyId: string, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Poshmark] Shared item ${itemId} to party ${partyId}`);
  }

  async followUser(userId: string, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Poshmark] Followed user ${userId}`);
  }

  async unfollowUser(userId: string, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Poshmark] Unfollowed user ${userId}`);
  }

  async sendOffer(itemId: string, offer: any, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Poshmark] Sent offer to item ${itemId}:`, offer);
  }

  async getLikers(itemId: string, accessToken: string): Promise<string[]> {
    await this.simulateApiDelay();
    // Return mock likers
    return [`liker_${Date.now()}_1`, `liker_${Date.now()}_2`];
  }

  async getClosetItems(userId: string, accessToken: string): Promise<string[]> {
    await this.simulateApiDelay();
    // Return mock items
    return [`item_${Date.now()}_1`, `item_${Date.now()}_2`, `item_${Date.now()}_3`];
  }

  async getActiveParties(accessToken: string): Promise<Array<{ id: string; name: string; startTime: Date }>> {
    await this.simulateApiDelay();
    // Return mock parties
    return [
      { id: "party_1", name: "Evening Party", startTime: new Date() },
      { id: "party_2", name: "Weekend Sale", startTime: new Date(Date.now() + 3600000) },
    ];
  }

  private async simulateApiDelay(): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  }
}

export class PoshmarkAutomationEngine implements MarketplaceAutomationEngine {
  marketplace = "poshmark";
  private apiClient: PoshmarkApiClient;
  private shareCounters: Map<string, { count: number; resetAt: Date }> = new Map();
  private lastActionTimes: Map<string, Date> = new Map();

  constructor() {
    this.apiClient = new MockPoshmarkApiClient(); // Replace with actual client
  }

  /**
   * Execute automation based on rule type
   */
  async executeAutomation(rule: AutomationRule, user: User): Promise<void> {
    // Get Poshmark connection
    const connection = await this.getConnection(user.id);
    if (!connection) {
      throw new Error("No Poshmark connection found");
    }

    // Check if token is valid
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      throw new Error("Poshmark token expired");
    }

    // Execute based on rule type
    switch (rule.ruleType) {
      case "auto_share":
        await this.executeAutoShare(rule, user, connection);
        break;
      case "auto_follow":
        await this.executeAutoFollow(rule, user, connection);
        break;
      case "auto_offer":
        await this.executeAutoOffer(rule, user, connection);
        break;
      case "auto_unfollow":
        await this.executeAutoUnfollow(rule, user, connection);
        break;
      case "party_share":
        await this.executePartyShare(rule, user, connection);
        break;
      case "bundle_offer":
        await this.executeBundleOffer(rule, user, connection);
        break;
      default:
        throw new Error(`Unsupported automation type: ${rule.ruleType}`);
    }
  }

  /**
   * Auto-share closet items
   */
  private async executeAutoShare(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const settings = await this.getShareSettings(user.id);
    
    // Get items to share
    const listings = await storage.getListings(user.id, {
      marketplace: "poshmark",
      status: "active",
    });

    if (listings.length === 0) {
      console.log("[Poshmark] No active listings to share");
      return;
    }

    // Apply share order strategy
    const orderedListings = this.orderListingsForShare(listings, settings?.shareOrder || "newest_first");
    const itemsToShare = orderedListings.slice(0, config.maxItems || 30);

    let successCount = 0;
    let failedCount = 0;

    for (const listing of itemsToShare) {
      try {
        // Check daily share limit
        if (!await this.checkShareLimit(user.id, settings)) {
          console.log("[Poshmark] Daily share limit reached");
          break;
        }

        // Apply human-like delay
        await this.applyHumanDelay("share", config.minDelay || 3, config.maxDelay || 10);

        // Share the item
        if ((listing as any).externalId) {
          await this.apiClient.shareItem((listing as any).externalId, connection.accessToken!);
          await this.incrementShareCount(user.id);
          successCount++;

          // Log share action
          await storage.createAutomationLog({
            userId: user.id,
            ruleId: rule.id,
            actionType: "share_item",
            marketplace: "poshmark",
            status: "success",
            // successCount: 1, // Not in schema
            // failureCount: 0, // Not in schema
            executionTime: 0,
            // metadata: {
            //   listingTitle: listing.title,
            //   externalId: (listing as any).externalId,
            // }, // Not in schema
          });
        }

        // Random break after batch
        if (successCount > 0 && successCount % 10 === 0) {
          await this.takeBreak(30, 60);
        }

      } catch (error) {
        failedCount++;
        console.error(`[Poshmark] Failed to share listing ${listing.id}:`, error);
      }
    }

    console.log(`[Poshmark] Auto-share completed: ${successCount} successful, ${failedCount} failed`);
  }

  /**
   * Auto-follow users
   */
  private async executeAutoFollow(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const maxFollows = config.maxFollows || 50;
    const targetUsers = config.targetUsers || [];

    if (targetUsers.length === 0) {
      // Find users to follow based on strategy
      targetUsers.push(...await this.findUsersToFollow(config.strategy || "active_sellers"));
    }

    let successCount = 0;

    for (const targetUser of targetUsers.slice(0, maxFollows)) {
      try {
        // Apply human-like delay
        await this.applyHumanDelay("follow", 5, 15);

        // Follow user
        await this.apiClient.followUser(targetUser, connection.accessToken!);
        successCount++;

        // Random break after batch
        if (successCount > 0 && successCount % 20 === 0) {
          await this.takeBreak(60, 120);
        }

      } catch (error) {
        console.error(`[Poshmark] Failed to follow user ${targetUser}:`, error);
      }
    }

    console.log(`[Poshmark] Auto-follow completed: ${successCount} users followed`);
  }

  /**
   * Auto-send offers to likers
   */
  private async executeAutoOffer(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    
    // Get offer template
    const template = await this.getOfferTemplate(user.id, config.templateId);
    if (!template) {
      throw new Error("No offer template found");
    }

    // Get listings with likers
    const listings = await storage.getListings(user.id, {
      marketplace: "poshmark",
      status: "active",
    });

    let totalOffersSent = 0;

    for (const listing of listings) {
      if (!(listing as any).externalId) continue;

      try {
        // Get likers for this item
        const likers = await this.apiClient.getLikers((listing as any).externalId, connection.accessToken!);
        
        if (likers.length === 0) continue;

        for (const liker of likers.slice(0, config.maxOffersPerItem || 10)) {
          // Apply human-like delay
          await this.applyHumanDelay("offer", 10, 20);

          // Calculate offer price based on template
          const offerPrice = this.calculateOfferPrice(parseFloat(listing.price || "0"), template);

          // Send offer
          await this.apiClient.sendOffer((listing as any).externalId, {
            userId: liker,
            price: offerPrice,
            shipping: (template as any).includeShipping,
            message: template.offerMessage,
          }, connection.accessToken!);

          totalOffersSent++;

          // Take longer break after batch of offers
          if (totalOffersSent > 0 && totalOffersSent % 5 === 0) {
            await this.takeBreak(120, 180);
          }
        }

      } catch (error) {
        console.error(`[Poshmark] Failed to send offers for listing ${listing.id}:`, error);
      }
    }

    console.log(`[Poshmark] Auto-offer completed: ${totalOffersSent} offers sent`);
  }

  /**
   * Auto-unfollow users
   */
  private async executeAutoUnfollow(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const maxUnfollows = config.maxUnfollows || 50;
    const unfollowAfterDays = config.unfollowAfterDays || 7;

    // Get users to unfollow (would need to track followed users in DB)
    const usersToUnfollow: string[] = []; // This would come from tracking data

    let successCount = 0;

    for (const targetUser of usersToUnfollow.slice(0, maxUnfollows)) {
      try {
        // Apply human-like delay
        await this.applyHumanDelay("unfollow", 3, 8);

        // Unfollow user
        await this.apiClient.unfollowUser(targetUser, connection.accessToken!);
        successCount++;

        // Random break after batch
        if (successCount > 0 && successCount % 25 === 0) {
          await this.takeBreak(45, 90);
        }

      } catch (error) {
        console.error(`[Poshmark] Failed to unfollow user ${targetUser}:`, error);
      }
    }

    console.log(`[Poshmark] Auto-unfollow completed: ${successCount} users unfollowed`);
  }

  /**
   * Share items to Poshmark parties
   */
  private async executePartyShare(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;

    // Get active parties
    const parties = await this.apiClient.getActiveParties(connection.accessToken!);
    
    if (parties.length === 0) {
      console.log("[Poshmark] No active parties found");
      return;
    }

    // Get eligible listings for party
    const listings = await storage.getListings(user.id, {
      marketplace: "poshmark",
      status: "active",
    });

    const party = parties[0]; // Share to first active party
    let successCount = 0;

    for (const listing of listings.slice(0, config.maxItemsPerParty || 20)) {
      if (!(listing as any).externalId) continue;

      try {
        // Apply human-like delay (faster during parties)
        await this.applyHumanDelay("party_share", 2, 5);

        // Share to party
        await this.apiClient.shareToParty((listing as any).externalId, party.id, connection.accessToken!);
        successCount++;

        // Quick break during party
        if (successCount > 0 && successCount % 15 === 0) {
          await this.takeBreak(20, 40);
        }

      } catch (error) {
        console.error(`[Poshmark] Failed to share to party ${party.name}:`, error);
      }
    }

    console.log(`[Poshmark] Party share completed: ${successCount} items shared to ${party.name}`);
  }

  /**
   * Send bundle offers
   */
  private async executeBundleOffer(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    
    // Get bundle offer template
    const template = await this.getOfferTemplate(user.id, config.bundleTemplateId);
    if (!template) {
      throw new Error("No bundle offer template found");
    }

    // This would need to detect when users like multiple items
    // and automatically send bundle offers
    console.log("[Poshmark] Bundle offer automation would process bundles here");
  }

  /**
   * Validate rule configuration
   */
  async validateRule(rule: AutomationRule): Promise<boolean> {
    const validTypes = this.getAvailableActions();
    if (!validTypes.includes(rule.ruleType)) {
      return false;
    }

    // Validate configuration based on type
    const config = rule.ruleConfig as any;
    
    switch (rule.ruleType) {
      case "auto_share":
        return config.maxItems > 0 && config.maxItems <= 100;
      case "auto_follow":
        return config.maxFollows > 0 && config.maxFollows <= 100;
      case "auto_offer":
        return config.maxOffersPerItem > 0 && config.maxOffersPerItem <= 20;
      default:
        return true;
    }
  }

  /**
   * Get available automation actions
   */
  getAvailableActions(): string[] {
    return [
      "auto_share",
      "auto_follow", 
      "auto_unfollow",
      "auto_offer",
      "party_share",
      "bundle_offer",
    ];
  }

  /**
   * Get default configuration for an action
   */
  getDefaultConfig(actionType: string): any {
    switch (actionType) {
      case "auto_share":
        return {
          maxItems: 30,
          minDelay: 3,
          maxDelay: 10,
          shareOrder: "newest_first",
        };
      case "auto_follow":
        return {
          maxFollows: 50,
          minDelay: 5,
          maxDelay: 15,
          strategy: "active_sellers",
        };
      case "auto_offer":
        return {
          maxOffersPerItem: 10,
          minDelay: 10,
          maxDelay: 20,
          discountPercent: 10,
          includeShipping: true,
        };
      case "auto_unfollow":
        return {
          maxUnfollows: 50,
          minDelay: 3,
          maxDelay: 8,
          unfollowAfterDays: 7,
        };
      case "party_share":
        return {
          maxItemsPerParty: 20,
          minDelay: 2,
          maxDelay: 5,
          partyCategories: ["all"],
        };
      case "bundle_offer":
        return {
          minBundleSize: 2,
          bundleDiscountPercent: 15,
          autoSendOnMultipleLikes: true,
        };
      default:
        return {};
    }
  }

  /**
   * Helper: Get Poshmark connection
   */
  private async getConnection(userId: string): Promise<MarketplaceConnection | undefined> {
    const connections = await storage.getMarketplaceConnections(userId);
    return connections.find(c => c.marketplace === "poshmark" && c.isConnected);
  }

  /**
   * Helper: Get share settings
   */
  private async getShareSettings(userId: string): Promise<PoshmarkShareSettings | undefined> {
    return await storage.getPoshmarkShareSettings(userId);
  }

  /**
   * Helper: Get offer template
   */
  private async getOfferTemplate(userId: string, templateId?: string): Promise<OfferTemplate | undefined> {
    const templates = await storage.getOfferTemplates(userId, "poshmark");
    
    if (templateId) {
      return templates.find(t => t.id === templateId);
    }
    
    return templates.find(t => t.isDefault) || templates[0];
  }

  /**
   * Helper: Apply human-like delay
   */
  private async applyHumanDelay(action: string, minSeconds: number, maxSeconds: number): Promise<void> {
    // Add jitter to make it more human-like
    const jitter = Math.random() * 2000 - 1000; // +/- 1 second
    const delay = (Math.random() * (maxSeconds - minSeconds) + minSeconds) * 1000 + jitter;
    
    // Ensure minimum delay
    const finalDelay = Math.max(2000, delay);
    
    console.log(`[Poshmark] Applying ${action} delay: ${Math.round(finalDelay / 1000)}s`);
    await new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  /**
   * Helper: Take a break (human-like behavior)
   */
  private async takeBreak(minSeconds: number, maxSeconds: number): Promise<void> {
    const breakDuration = Math.random() * (maxSeconds - minSeconds) + minSeconds;
    console.log(`[Poshmark] Taking break for ${Math.round(breakDuration)}s`);
    await new Promise(resolve => setTimeout(resolve, breakDuration * 1000));
  }

  /**
   * Helper: Order listings for sharing
   */
  private orderListingsForShare(
    listings: Listing[],
    strategy: string
  ): Listing[] {
    switch (strategy) {
      case "oldest_first":
        return [...listings].sort((a, b) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      case "newest_first":
        return [...listings].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      case "price_high_to_low":
        return [...listings].sort((a, b) => parseFloat(b.price || "0") - parseFloat(a.price || "0"));
      case "price_low_to_high":
        return [...listings].sort((a, b) => parseFloat(a.price || "0") - parseFloat(b.price || "0"));
      case "random":
        return [...listings].sort(() => Math.random() - 0.5);
      default:
        return listings;
    }
  }

  /**
   * Helper: Calculate offer price
   */
  private calculateOfferPrice(originalPrice: number, template: OfferTemplate): number {
    const config = (template as any).configuration || {};
    const discountPercent = config.discountPercent || 10;
    const discountAmount = originalPrice * (discountPercent / 100);
    const offerPrice = originalPrice - discountAmount;
    
    // Round to nearest dollar
    return Math.round(offerPrice);
  }

  /**
   * Helper: Find users to follow
   */
  private async findUsersToFollow(strategy: string): Promise<string[]> {
    // This would implement different strategies for finding users
    // For now, return mock users
    return [
      `user_${Date.now()}_1`,
      `user_${Date.now()}_2`,
      `user_${Date.now()}_3`,
    ];
  }

  /**
   * Helper: Check share limit
   */
  private async checkShareLimit(userId: string, settings?: PoshmarkShareSettings | undefined): Promise<boolean> {
    const key = `shares_${userId}`;
    const counter = this.shareCounters.get(key);
    
    const dailyLimit = settings?.dailyShareLimit || 5000;
    
    if (!counter || counter.resetAt < new Date()) {
      // Reset counter
      this.shareCounters.set(key, {
        count: 0,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      return true;
    }

    return counter.count < dailyLimit;
  }

  /**
   * Helper: Increment share count
   */
  private async incrementShareCount(userId: string): Promise<void> {
    const key = `shares_${userId}`;
    const counter = this.shareCounters.get(key) || { count: 0, resetAt: new Date() };
    counter.count++;
    this.shareCounters.set(key, counter);

    // Also update in database
    const settings = await this.getShareSettings(userId);
    if (settings) {
      await storage.updatePoshmarkShareSettings(settings.id, {
        totalSharesThisMonth: (settings.totalSharesThisMonth || 0) + 1,
      });
    }
  }
}

// Export singleton instance
export const poshmarkAutomationEngine = new PoshmarkAutomationEngine();