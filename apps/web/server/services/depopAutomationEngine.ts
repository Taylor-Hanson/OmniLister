import {
  type AutomationRule,
  type User,
  type Listing,
  type MarketplaceConnection
} from "@shared/schema";
import { storage } from "../storage";
import { rateLimitService } from "./rateLimitService";
import type { MarketplaceAutomationEngine } from "./automationService";

interface DepopApiClient {
  bumpListing(itemId: string, accessToken: string): Promise<void>;
  updateListing(itemId: string, updates: DepopListingUpdate, accessToken: string): Promise<void>;
  followUser(userId: string, accessToken: string): Promise<void>;
  likeItem(itemId: string, accessToken: string): Promise<void>;
  refreshListing(itemId: string, accessToken: string): Promise<void>;
  getItemInsights(itemId: string, accessToken: string): Promise<ItemInsights>;
  getTrendingHashtags(category: string, accessToken: string): Promise<string[]>;
  getFollowers(userId: string, accessToken: string): Promise<string[]>;
  searchSimilarItems(itemId: string, accessToken: string): Promise<SimilarItem[]>;
  getOptimalPostingTimes(): Promise<PostingWindow[]>;
}

interface DepopListingUpdate {
  description?: string;
  hashtags?: string[];
  price?: number;
  photos?: string[];
  brand?: string;
  size?: string;
}

interface ItemInsights {
  impressions: number;
  likes: number;
  saves: number;
  engagementRate: number;
  peakViewHours: number[];
  daysSinceListed: number;
}

interface SimilarItem {
  id: string;
  price: number;
  likes: number;
  sold: boolean;
  daysToSell?: number;
}

interface PostingWindow {
  dayOfWeek: number;
  hour: number;
  engagementScore: number;
}

// Mock Depop API client - replace with actual implementation
class MockDepopApiClient implements DepopApiClient {
  async bumpListing(itemId: string, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Depop] Bumped listing ${itemId}`);
  }

  async updateListing(itemId: string, updates: DepopListingUpdate, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Depop] Updated listing ${itemId}:`, updates);
  }

  async followUser(userId: string, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Depop] Followed user ${userId}`);
  }

  async likeItem(itemId: string, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Depop] Liked item ${itemId}`);
  }

  async refreshListing(itemId: string, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Depop] Refreshed listing ${itemId}`);
  }

  async getItemInsights(itemId: string, accessToken: string): Promise<ItemInsights> {
    await this.simulateApiDelay();
    return {
      impressions: Math.floor(Math.random() * 500),
      likes: Math.floor(Math.random() * 50),
      saves: Math.floor(Math.random() * 20),
      engagementRate: Math.random() * 10,
      peakViewHours: [14, 15, 20, 21],
      daysSinceListed: Math.floor(Math.random() * 30),
    };
  }

  async getTrendingHashtags(category: string, accessToken: string): Promise<string[]> {
    await this.simulateApiDelay();
    return [
      `#vintage${category}`,
      `#y2k`,
      `#streetwear`,
      `#sustainable`,
      `#thrifted`,
      `#depop`,
    ];
  }

  async getFollowers(userId: string, accessToken: string): Promise<string[]> {
    await this.simulateApiDelay();
    return [`follower_${Date.now()}_1`, `follower_${Date.now()}_2`];
  }

  async searchSimilarItems(itemId: string, accessToken: string): Promise<SimilarItem[]> {
    await this.simulateApiDelay();
    return [
      { id: "sim_1", price: 25, likes: 45, sold: true, daysToSell: 5 },
      { id: "sim_2", price: 30, likes: 32, sold: false },
      { id: "sim_3", price: 22, likes: 58, sold: true, daysToSell: 3 },
    ];
  }

  async getOptimalPostingTimes(): Promise<PostingWindow[]> {
    await this.simulateApiDelay();
    return [
      { dayOfWeek: 0, hour: 20, engagementScore: 95 }, // Sunday 8pm
      { dayOfWeek: 3, hour: 19, engagementScore: 88 }, // Wednesday 7pm
      { dayOfWeek: 5, hour: 21, engagementScore: 92 }, // Friday 9pm
    ];
  }

  private async simulateApiDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  }
}

export class DepopAutomationEngine implements MarketplaceAutomationEngine {
  marketplace = "depop";
  private apiClient: DepopApiClient;
  private bumpHistory: Map<string, Date[]> = new Map();
  private socialActivityTracker: Map<string, { follows: number; likes: number; date: Date }> = new Map();

  constructor() {
    this.apiClient = new MockDepopApiClient();
  }

  /**
   * Execute automation based on rule type
   */
  async executeAutomation(rule: AutomationRule, user: User): Promise<void> {
    // Get Depop connection
    const connection = await this.getConnection(user.id);
    if (!connection) {
      throw new Error("No Depop connection found");
    }

    // Check token validity
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      throw new Error("Depop token expired");
    }

    // Execute based on rule type
    switch (rule.ruleType) {
      case "auto_bump":
        await this.executeAutoBump(rule, user, connection);
        break;
      case "auto_refresh":
        await this.executeAutoRefresh(rule, user, connection);
        break;
      case "social_engagement":
        await this.executeSocialEngagement(rule, user, connection);
        break;
      case "smart_hashtags":
        await this.executeSmartHashtags(rule, user, connection);
        break;
      case "competitive_pricing":
        await this.executeCompetitivePricing(rule, user, connection);
        break;
      default:
        throw new Error(`Unsupported automation type for Depop: ${rule.ruleType}`);
    }
  }

  /**
   * Auto-bump listings for better visibility
   */
  private async executeAutoBump(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const maxBumpsPerDay = config.maxBumpsPerDay || 4;
    const bumpInterval = config.bumpIntervalHours || 6;

    // Get optimal posting times
    const optimalTimes = await this.apiClient.getOptimalPostingTimes();
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    // Check if current time is near an optimal window
    const isOptimalTime = optimalTimes.some(
      window => window.dayOfWeek === currentDay && 
      Math.abs(window.hour - currentHour) <= 1
    );

    if (!isOptimalTime && config.onlyOptimalTimes) {
      console.log("[Depop] Skipping bump - not an optimal time");
      return;
    }

    // Get active listings
    const listings = await storage.getListings(user.id, {
      marketplace: "depop",
      status: "active",
    });

    // Sort by performance to bump best items first
    const sortedListings = await this.sortListingsByPerformance(listings, connection);
    
    let bumpedCount = 0;

    for (const listing of sortedListings) {
      if (!(listing as any).externalId) continue;

      // Check bump history
      if (!this.canBump(listing.id, maxBumpsPerDay, bumpInterval)) {
        continue;
      }

      try {
        // Apply rate limiting
        const rateLimitCheck = await rateLimitService.checkRateLimit("depop", user.id);

        if (!rateLimitCheck.allowed) {
          console.log("[Depop] Rate limit reached for bumps");
          break;
        }

        // Add human-like delay
        await this.addHumanDelay();

        // Execute bump
        await this.apiClient.bumpListing(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Track bump
        this.trackBump(listing.id);
        bumpedCount++;

        // Log action
        await this.logAction(user.id, rule.id, "listing_bumped", {
          listingId: listing.id,
          isOptimalTime,
          hour: currentHour,
        });

        // Limit bumps per execution
        if (bumpedCount >= config.bumpsPerExecution || 3) {
          break;
        }
      } catch (error) {
        console.error(`[Depop] Error bumping listing ${listing.id}:`, error);
      }
    }

    console.log(`[Depop] Bumped ${bumpedCount} listings`);
  }

  /**
   * Refresh listings with new content
   */
  private async executeAutoRefresh(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const refreshIntervalDays = config.refreshIntervalDays || 7;

    const listings = await storage.getListings(user.id, {
      marketplace: "depop",
      status: "active",
    });

    let refreshedCount = 0;

    for (const listing of listings) {
      if (!(listing as any).externalId) continue;

      // Check if listing needs refresh
      const daysSinceUpdate = Math.floor(
        (Date.now() - (listing.updatedAt || new Date()).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate < refreshIntervalDays) {
        continue;
      }

      try {
        // Get current insights
        const insights = await this.apiClient.getItemInsights(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Get trending hashtags for the category
        const trendingHashtags = await this.apiClient.getTrendingHashtags(
          listing.category || "general",
          connection.accessToken!
        );

        // Prepare refresh updates
        const updates: DepopListingUpdate = {};

        // Update hashtags if enabled
        if (config.updateHashtags) {
          updates.hashtags = this.selectBestHashtags(
            listing.description || "",
            trendingHashtags,
            config.maxHashtags || 5
          );
        }

        // Refresh description if enabled
        if (config.refreshDescription) {
          updates.description = this.refreshDescription(
            listing.description || "",
            insights,
            updates.hashtags
          );
        }

        // Rotate photos if available and enabled
        if (config.rotatePhotos && Array.isArray(listing.images) && listing.images.length > 1) {
          updates.photos = this.rotatePhotos(listing.images);
        }

        // Apply rate limiting
        const rateLimitCheck = await rateLimitService.checkRateLimit("depop", user.id);

        if (!rateLimitCheck.allowed) {
          console.log("[Depop] Rate limit reached for refresh");
          break;
        }

        // Add human-like delay
        await this.addHumanDelay();

        // Update the listing
        await this.apiClient.updateListing(
          (listing as any).externalId,
          updates,
          connection.accessToken!
        );

        // Update local record
        await storage.updateListing(listing.id, {
          description: updates.description || listing.description,
          updatedAt: new Date(),
        });

        refreshedCount++;

        // Log action
        await this.logAction(user.id, rule.id, "listing_refreshed", {
          listingId: listing.id,
          updates: Object.keys(updates),
          daysSinceLastUpdate: daysSinceUpdate,
        });
      } catch (error) {
        console.error(`[Depop] Error refreshing listing ${listing.id}:`, error);
      }
    }

    console.log(`[Depop] Refreshed ${refreshedCount} listings`);
  }

  /**
   * Execute social engagement automation
   */
  private async executeSocialEngagement(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const maxFollowsPerDay = config.maxFollowsPerDay || 30;
    const maxLikesPerDay = config.maxLikesPerDay || 50;

    // Get daily activity count
    const dailyActivity = this.getDailyActivity(user.id);
    
    if (dailyActivity.follows >= maxFollowsPerDay && dailyActivity.likes >= maxLikesPerDay) {
      console.log("[Depop] Daily social engagement limits reached");
      return;
    }

    // Find potential users to engage with based on similar items
    const targetUsers = await this.findTargetUsers(user.id, connection);

    for (const targetUser of targetUsers) {
      // Follow user if under limit
      if (dailyActivity.follows < maxFollowsPerDay && config.enableFollows) {
        const rateLimitCheck = await rateLimitService.checkRateLimit("depop", user.id);

        if (rateLimitCheck.allowed) {
          await this.addHumanDelay();
          await this.apiClient.followUser(targetUser.userId, connection.accessToken!);
          this.trackSocialActivity(user.id, "follow");
          dailyActivity.follows++;
        }
      }

      // Like their items if under limit
      if (dailyActivity.likes < maxLikesPerDay && config.enableLikes) {
        for (const itemId of targetUser.itemIds.slice(0, 3)) {
          const rateLimitCheck = await rateLimitService.checkRateLimit("depop", user.id);

          if (rateLimitCheck.allowed && dailyActivity.likes < maxLikesPerDay) {
            await this.addHumanDelay();
            await this.apiClient.likeItem(itemId, connection.accessToken!);
            this.trackSocialActivity(user.id, "like");
            dailyActivity.likes++;
          }
        }
      }
    }

    await this.logAction(user.id, rule.id, "social_engagement", {
      follows: dailyActivity.follows,
      likes: dailyActivity.likes,
    });
  }

  /**
   * Update listings with smart hashtags
   */
  private async executeSmartHashtags(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    
    const listings = await storage.getListings(user.id, {
      marketplace: "depop",
      status: "active",
    });

    for (const listing of listings) {
      if (!(listing as any).externalId) continue;

      try {
        const trendingHashtags = await this.apiClient.getTrendingHashtags(
          listing.category || "general",
          connection.accessToken!
        );

        const insights = await this.apiClient.getItemInsights(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Only update if engagement is low
        if (insights.engagementRate < (config.minEngagementRate || 5)) {
          const newHashtags = this.optimizeHashtags(
            listing.description || "",
            trendingHashtags,
            insights,
            config
          );

          await this.apiClient.updateListing(
            (listing as any).externalId,
            { hashtags: newHashtags },
            connection.accessToken!
          );

          await this.logAction(user.id, rule.id, "hashtags_updated", {
            listingId: listing.id,
            oldEngagement: insights.engagementRate,
            newHashtags,
          });
        }
      } catch (error) {
        console.error(`[Depop] Error updating hashtags for ${listing.id}:`, error);
      }
    }
  }

  /**
   * Execute competitive pricing strategy
   */
  private async executeCompetitivePricing(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    
    const listings = await storage.getListings(user.id, {
      marketplace: "depop",
      status: "active",
    });

    for (const listing of listings) {
      if (!(listing as any).externalId) continue;

      try {
        // Get similar items to analyze pricing
        const similarItems = await this.apiClient.searchSimilarItems(
          (listing as any).externalId,
          connection.accessToken!
        );

        const priceAnalysis = this.analyzePricing(similarItems, parseFloat(listing.price || "0"));
        
        if (priceAnalysis.suggestedPrice && 
            Math.abs(priceAnalysis.suggestedPrice - parseFloat(listing.price || "0")) > parseFloat(listing.price || "0") * 0.05) {
          
          // Ensure price is within bounds
          let newPrice = priceAnalysis.suggestedPrice;
          if (config.minPrice) {
            newPrice = Math.max(newPrice, config.minPrice);
          }
          if (config.maxDiscount) {
            const minAllowedPrice = parseFloat(listing.price || "0") * (1 - config.maxDiscount / 100);
            newPrice = Math.max(newPrice, minAllowedPrice);
          }

          await this.apiClient.updateListing(
            (listing as any).externalId,
            { price: newPrice },
            connection.accessToken!
          );

          await storage.updateListing(listing.id, {
            price: newPrice.toString(),
            updatedAt: new Date(),
          });

          await this.logAction(user.id, rule.id, "price_adjusted", {
            listingId: listing.id,
            oldPrice: listing.price,
            newPrice,
            reason: priceAnalysis.reason,
          });
        }
      } catch (error) {
        console.error(`[Depop] Error adjusting price for ${listing.id}:`, error);
      }
    }
  }

  /**
   * Validate rule configuration
   */
  async validateRule(rule: AutomationRule): Promise<boolean> {
    const config = rule.ruleConfig as any;
    
    switch (rule.ruleType) {
      case "auto_bump":
        return config.maxBumpsPerDay > 0 && config.maxBumpsPerDay <= 10;
      case "auto_refresh":
        return config.refreshIntervalDays >= 3;
      case "social_engagement":
        return config.maxFollowsPerDay <= 50 && config.maxLikesPerDay <= 100;
      default:
        return true;
    }
  }

  /**
   * Get available automation actions
   */
  getAvailableActions(): string[] {
    return [
      "auto_bump",
      "auto_refresh",
      "social_engagement",
      "smart_hashtags",
      "competitive_pricing",
    ];
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(actionType: string): any {
    const configs: Record<string, any> = {
      auto_bump: {
        maxBumpsPerDay: 4,
        bumpIntervalHours: 6,
        onlyOptimalTimes: true,
        bumpsPerExecution: 2,
      },
      auto_refresh: {
        refreshIntervalDays: 7,
        updateHashtags: true,
        refreshDescription: true,
        rotatePhotos: true,
        maxHashtags: 5,
      },
      social_engagement: {
        maxFollowsPerDay: 30,
        maxLikesPerDay: 50,
        enableFollows: true,
        enableLikes: true,
        targetSimilarSellers: true,
      },
      smart_hashtags: {
        minEngagementRate: 5,
        maxHashtags: 5,
        includeSeasonalTags: true,
        includeBrandTags: true,
      },
      competitive_pricing: {
        checkInterval: "daily",
        maxDiscount: 20,
        minPrice: 10,
        undercut: true,
        undercutPercentage: 5,
      },
    };

    return configs[actionType] || {};
  }

  /**
   * Helper methods
   */
  private async getConnection(userId: string): Promise<MarketplaceConnection | null> {
    const connections = await storage.getMarketplaceConnections(userId);
    return connections.find(c => c.marketplace === "depop" && c.isConnected) || null;
  }

  private async addHumanDelay(): Promise<void> {
    const delay = Math.random() * 4000 + 3000; // 3-7 seconds for Depop
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private canBump(listingId: string, maxPerDay: number, intervalHours: number): boolean {
    const history = this.bumpHistory.get(listingId) || [];
    const now = new Date();
    
    // Filter to today's bumps
    const todayBumps = history.filter(
      date => date.getDate() === now.getDate() && 
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );

    if (todayBumps.length >= maxPerDay) {
      return false;
    }

    // Check interval since last bump
    if (history.length > 0) {
      const lastBump = history[history.length - 1];
      const hoursSinceLastBump = (now.getTime() - lastBump.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastBump < intervalHours) {
        return false;
      }
    }

    return true;
  }

  private trackBump(listingId: string): void {
    const history = this.bumpHistory.get(listingId) || [];
    history.push(new Date());
    
    // Keep only last 7 days of history
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(date => date > weekAgo);
    
    this.bumpHistory.set(listingId, filteredHistory);
  }

  private async sortListingsByPerformance(
    listings: Listing[], 
    connection: MarketplaceConnection
  ): Promise<Listing[]> {
    // In production, fetch actual performance metrics
    // For now, sort by price and age
    return listings.sort((a, b) => {
      const scoreA = parseFloat(a.price || "0") * (1 / (Math.log(this.getDaysOld(a) + 1) + 1));
      const scoreB = parseFloat(b.price || "0") * (1 / (Math.log(this.getDaysOld(b) + 1) + 1));
      return scoreB - scoreA;
    });
  }

  private getDaysOld(listing: Listing): number {
    return Math.floor((Date.now() - (listing.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));
  }

  private selectBestHashtags(
    description: string,
    trending: string[],
    maxCount: number
  ): string[] {
    // Extract existing hashtags
    const existing = description.match(/#\w+/g) || [];
    
    // Combine with trending, prioritize trending
    const combined = Array.from(new Set([...trending.slice(0, 3), ...existing]));
    
    return combined.slice(0, maxCount);
  }

  private refreshDescription(
    originalDescription: string,
    insights: ItemInsights,
    hashtags?: string[]
  ): string {
    // Remove old hashtags
    let description = originalDescription.replace(/#\w+/g, "").trim();
    
    // Add engagement-based prefix
    if (insights.likes > 20) {
      description = `🔥 HOT ITEM - ${insights.likes} likes! 🔥\n${description}`;
    }
    
    // Add hashtags at the end
    if (hashtags && hashtags.length > 0) {
      description += "\n\n" + hashtags.join(" ");
    }
    
    return description;
  }

  private rotatePhotos(images: string[]): string[] {
    // Rotate first image to last position
    if (images.length > 1) {
      return [...images.slice(1), images[0]];
    }
    return images;
  }

  private getDailyActivity(userId: string): { follows: number; likes: number } {
    const key = `${userId}_${new Date().toDateString()}`;
    const activity = this.socialActivityTracker.get(key);
    
    if (!activity || activity.date.toDateString() !== new Date().toDateString()) {
      return { follows: 0, likes: 0 };
    }
    
    return { follows: activity.follows, likes: activity.likes };
  }

  private trackSocialActivity(userId: string, type: "follow" | "like"): void {
    const key = `${userId}_${new Date().toDateString()}`;
    const activity = this.socialActivityTracker.get(key) || {
      follows: 0,
      likes: 0,
      date: new Date(),
    };
    
    if (type === "follow") {
      activity.follows++;
    } else {
      activity.likes++;
    }
    
    this.socialActivityTracker.set(key, activity);
  }

  private async findTargetUsers(userId: string, connection: MarketplaceConnection): Promise<any[]> {
    // Simplified - in production, would find users with similar style/items
    return [
      { userId: "target_user_1", itemIds: ["item_1", "item_2"] },
      { userId: "target_user_2", itemIds: ["item_3", "item_4"] },
    ];
  }

  private optimizeHashtags(
    description: string,
    trending: string[],
    insights: ItemInsights,
    config: any
  ): string[] {
    const hashtags: string[] = [];
    
    // Add trending hashtags
    hashtags.push(...trending.slice(0, 3));
    
    // Add seasonal tags if enabled
    if (config.includeSeasonalTags) {
      const season = this.getCurrentSeason();
      hashtags.push(`#${season}fashion`);
    }
    
    // Add performance-based tags
    if (insights.likes > 30) {
      hashtags.push("#trending");
    }
    
    return Array.from(new Set(hashtags)).slice(0, config.maxHashtags || 5);
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    if (month >= 8 && month <= 10) return "fall";
    return "winter";
  }

  private analyzePricing(similarItems: SimilarItem[], currentPrice: number): {
    suggestedPrice?: number;
    reason: string;
  } {
    const soldItems = similarItems.filter(item => item.sold);
    
    if (soldItems.length === 0) {
      return { reason: "No sold comparables found" };
    }
    
    // Calculate average sold price
    const avgSoldPrice = soldItems.reduce((sum, item) => sum + item.price, 0) / soldItems.length;
    
    // Calculate average days to sell
    const itemsWithDays = soldItems.filter(item => item.daysToSell !== undefined);
    const avgDaysToSell = itemsWithDays.length > 0
      ? itemsWithDays.reduce((sum, item) => sum + item.daysToSell!, 0) / itemsWithDays.length
      : 0;
    
    // Suggest price based on market data
    let suggestedPrice = avgSoldPrice;
    
    // If items sell quickly, can price slightly higher
    if (avgDaysToSell < 5 && avgDaysToSell > 0) {
      suggestedPrice *= 1.05;
    }
    
    // If current price is much higher than market, suggest reduction
    if (currentPrice > avgSoldPrice * 1.2) {
      suggestedPrice = avgSoldPrice * 1.1;
      return {
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        reason: "Price above market average",
      };
    }
    
    return { reason: "Price is competitive" };
  }

  private async logAction(userId: string, ruleId: string, action: string, details: any): Promise<void> {
    await storage.createAutomationLog({
      userId,
      marketplace: "depop",
      ruleId,
      actionType: action,
      status: "success",
      // details, // Not in schema
      // executedAt: new Date(), // Not in schema
    });
  }
}

// Export singleton instance
export const depopAutomationEngine = new DepopAutomationEngine();