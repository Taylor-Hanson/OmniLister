import {
  type AutomationRule,
  type User,
  type Listing,
  type MarketplaceConnection
} from "../shared/schema.ts";
import { storage } from "../storage";
import { rateLimitService } from "./rateLimitService";
import type { MarketplaceAutomationEngine } from "./automationService";

interface GrailedApiClient {
  bumpItem(itemId: string, accessToken: string): Promise<void>;
  dropPrice(itemId: string, percentage: number, accessToken: string): Promise<void>;
  updateListing(itemId: string, updates: GrailedListingUpdate, accessToken: string): Promise<void>;
  getItemMetrics(itemId: string, accessToken: string): Promise<ItemMetrics>;
  getMarketAnalysis(brand: string, category: string, accessToken: string): Promise<MarketAnalysis>;
  getFeedPosition(itemId: string, accessToken: string): Promise<FeedPosition>;
  sendOfferToWatcher(itemId: string, userId: string, offer: GrailedOffer, accessToken: string): Promise<void>;
  getWatchers(itemId: string, accessToken: string): Promise<Watcher[]>;
  getSimilarListings(itemId: string, accessToken: string): Promise<SimilarListing[]>;
  getBumpHistory(itemId: string, accessToken: string): Promise<BumpRecord[]>;
}

interface GrailedListingUpdate {
  price?: number;
  description?: string;
  measurements?: Record<string, string>;
  condition?: string;
  tags?: string[];
}

interface ItemMetrics {
  views: number;
  watchers: number;
  offers: number;
  impressions: number;
  feedRank: number;
  daysListed: number;
  priceDrops: number;
  lastBumpDate?: Date;
  conversionRate: number;
}

interface MarketAnalysis {
  averagePrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  demandScore: number; // 0-100
  sellThroughRate: number;
  averageDaysToSell: number;
  priceHistory: Array<{ date: Date; price: number }>;
}

interface FeedPosition {
  position: number;
  category: string;
  page: number;
  totalItems: number;
}

interface GrailedOffer {
  price: number;
  message?: string;
  bundleItems?: string[];
}

interface Watcher {
  userId: string;
  username: string;
  watchedDate: Date;
  previousOffers: number;
}

interface SimilarListing {
  id: string;
  brand: string;
  price: number;
  sold: boolean;
  daysToSell?: number;
  finalPrice?: number;
  condition: string;
}

interface BumpRecord {
  date: Date;
  resultingViews: number;
  resultingOffers: number;
}

// Mock Grailed API client - replace with actual implementation
class MockGrailedApiClient implements GrailedApiClient {
  async bumpItem(itemId: string, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Grailed] Bumped item ${itemId}`);
  }

  async dropPrice(itemId: string, percentage: number, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Grailed] Dropped price by ${percentage}% for item ${itemId}`);
  }

  async updateListing(itemId: string, updates: GrailedListingUpdate, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Grailed] Updated listing ${itemId}:`, updates);
  }

  async getItemMetrics(itemId: string, accessToken: string): Promise<ItemMetrics> {
    await this.simulateApiDelay();
    return {
      views: Math.floor(Math.random() * 1000),
      watchers: Math.floor(Math.random() * 50),
      offers: Math.floor(Math.random() * 10),
      impressions: Math.floor(Math.random() * 2000),
      feedRank: Math.floor(Math.random() * 100),
      daysListed: Math.floor(Math.random() * 60),
      priceDrops: Math.floor(Math.random() * 5),
      lastBumpDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      conversionRate: Math.random() * 10,
    };
  }

  async getMarketAnalysis(brand: string, category: string, accessToken: string): Promise<MarketAnalysis> {
    await this.simulateApiDelay();
    const avgPrice = 150 + Math.random() * 500;
    return {
      averagePrice: avgPrice,
      medianPrice: avgPrice * 0.9,
      priceRange: { min: avgPrice * 0.5, max: avgPrice * 2 },
      demandScore: Math.floor(Math.random() * 100),
      sellThroughRate: Math.random() * 0.4,
      averageDaysToSell: Math.floor(Math.random() * 30) + 10,
      priceHistory: Array.from({ length: 5 }, (_, i) => ({
        date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
        price: avgPrice + Math.random() * 50 - 25,
      })),
    };
  }

  async getFeedPosition(itemId: string, accessToken: string): Promise<FeedPosition> {
    await this.simulateApiDelay();
    return {
      position: Math.floor(Math.random() * 100) + 1,
      category: "designers",
      page: Math.floor(Math.random() * 10) + 1,
      totalItems: Math.floor(Math.random() * 1000) + 500,
    };
  }

  async sendOfferToWatcher(itemId: string, userId: string, offer: GrailedOffer, accessToken: string): Promise<void> {
    await this.simulateApiDelay();
    console.log(`[Grailed] Sent offer to watcher ${userId} for item ${itemId}:`, offer);
  }

  async getWatchers(itemId: string, accessToken: string): Promise<Watcher[]> {
    await this.simulateApiDelay();
    return [
      {
        userId: `watcher_${Date.now()}_1`,
        username: "luxury_collector",
        watchedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        previousOffers: 0,
      },
      {
        userId: `watcher_${Date.now()}_2`,
        username: "designer_enthusiast",
        watchedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        previousOffers: 1,
      },
    ];
  }

  async getSimilarListings(itemId: string, accessToken: string): Promise<SimilarListing[]> {
    await this.simulateApiDelay();
    return [
      {
        id: "similar_1",
        brand: "Rick Owens",
        price: 450,
        sold: true,
        daysToSell: 12,
        finalPrice: 400,
        condition: "Used - Excellent",
      },
      {
        id: "similar_2",
        brand: "Raf Simons",
        price: 380,
        sold: false,
        condition: "Used - Good",
      },
    ];
  }

  async getBumpHistory(itemId: string, accessToken: string): Promise<BumpRecord[]> {
    await this.simulateApiDelay();
    return [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resultingViews: 150,
        resultingOffers: 2,
      },
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        resultingViews: 200,
        resultingOffers: 3,
      },
    ];
  }

  private async simulateApiDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  }
}

export class GrailedAutomationEngine implements MarketplaceAutomationEngine {
  marketplace = "grailed";
  private apiClient: GrailedApiClient;
  private bumpTracker: Map<string, { count: number; lastBump: Date; effectiveness: number }> = new Map();
  private priceDropHistory: Map<string, Array<{ date: Date; percentage: number }>> = new Map();

  constructor() {
    this.apiClient = new MockGrailedApiClient();
  }

  /**
   * Execute automation based on rule type
   */
  async executeAutomation(rule: AutomationRule, user: User): Promise<void> {
    // Get Grailed connection
    const connection = await this.getConnection(user.id);
    if (!connection) {
      throw new Error("No Grailed connection found");
    }

    // Check token validity
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      throw new Error("Grailed token expired");
    }

    // Execute based on rule type
    switch (rule.ruleType) {
      case "auto_bump":
        await this.executeAutoBump(rule, user, connection);
        break;
      case "smart_drop":
        await this.executeSmartDrop(rule, user, connection);
        break;
      case "market_pricing":
        await this.executeMarketPricing(rule, user, connection);
        break;
      case "watcher_offers":
        await this.executeWatcherOffers(rule, user, connection);
        break;
      case "feed_optimization":
        await this.executeFeedOptimization(rule, user, connection);
        break;
      default:
        throw new Error(`Unsupported automation type for Grailed: ${rule.ruleType}`);
    }
  }

  /**
   * Execute auto-bump with intelligent timing
   */
  private async executeAutoBump(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const maxBumpsPerWeek = config.maxBumpsPerWeek || 7;
    const minDaysBetweenBumps = config.minDaysBetweenBumps || 1;

    // Get active listings
    const listings = await storage.getListings(user.id, {
      marketplace: "grailed",
      status: "active",
    });

    // Sort by bump effectiveness and priority
    const prioritizedListings = await this.prioritizeListingsForBump(listings, connection);
    
    let bumpedCount = 0;
    const maxBumpsPerExecution = config.bumpsPerExecution || 3;

    for (const listing of prioritizedListings) {
      if (!(listing as any).externalId) continue;
      if (bumpedCount >= maxBumpsPerExecution) break;

      // Check if eligible for bump
      const bumpStatus = this.checkBumpEligibility(
        listing.id,
        maxBumpsPerWeek,
        minDaysBetweenBumps
      );

      if (!bumpStatus.eligible) {
        console.log(`[Grailed] Skipping bump for ${listing.id}: ${bumpStatus.reason}`);
        continue;
      }

      try {
        // Get current metrics
        const metrics = await this.apiClient.getItemMetrics(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Check if bump is worth it based on metrics
        if (!this.shouldBump(metrics, config)) {
          continue;
        }

        // Apply rate limiting
        const rateLimitCheck = await rateLimitService.checkRateLimit("grailed", user.id);

        if (!rateLimitCheck.allowed) {
          console.log("[Grailed] Rate limit reached for bumps");
          break;
        }

        // Add luxury marketplace delay (more conservative)
        await this.addLuxuryDelay();

        // Execute bump
        await this.apiClient.bumpItem(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Track bump effectiveness
        this.trackBump(listing.id, metrics);
        bumpedCount++;

        // Log action
        await this.logAction(user.id, rule.id, "item_bumped", {
          listingId: listing.id,
          previousViews: metrics.views,
          feedRank: metrics.feedRank,
          watchers: metrics.watchers,
        });
      } catch (error) {
        console.error(`[Grailed] Error bumping listing ${listing.id}:`, error);
      }
    }

    console.log(`[Grailed] Bumped ${bumpedCount} listings`);
  }

  /**
   * Execute smart price drops based on market data
   */
  private async executeSmartDrop(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const minDaysBetweenDrops = config.minDaysBetweenDrops || 7;
    const maxTotalDropPercentage = config.maxTotalDropPercentage || 40;

    const listings = await storage.getListings(user.id, {
      marketplace: "grailed",
      status: "active",
    });

    for (const listing of listings) {
      if (!(listing as any).externalId) continue;

      try {
        // Get item metrics
        const metrics = await this.apiClient.getItemMetrics(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Check if price drop is needed
        if (!this.needsPriceDrop(metrics, listing, config)) {
          continue;
        }

        // Check drop history
        const dropHistory = this.priceDropHistory.get(listing.id) || [];
        const totalDropPercentage = dropHistory.reduce((sum, drop) => sum + drop.percentage, 0);
        
        if (totalDropPercentage >= maxTotalDropPercentage) {
          console.log(`[Grailed] Max total drop reached for ${listing.id}`);
          continue;
        }

        // Check days since last drop
        const lastDrop = dropHistory[dropHistory.length - 1];
        if (lastDrop) {
          const daysSinceLastDrop = Math.floor(
            (Date.now() - lastDrop.date.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastDrop < minDaysBetweenDrops) {
            continue;
          }
        }

        // Calculate optimal drop percentage
        const dropPercentage = this.calculateOptimalDrop(
          metrics,
          listing,
          totalDropPercentage,
          config
        );

        if (dropPercentage > 0) {
          // Apply rate limiting
          const rateLimitCheck = await rateLimitService.checkRateLimit("grailed", user.id);

          if (!rateLimitCheck.allowed) {
            console.log("[Grailed] Rate limit reached for price drops");
            break;
          }

          await this.addLuxuryDelay();

          // Execute price drop
          await this.apiClient.dropPrice(
            (listing as any).externalId,
            dropPercentage,
            connection.accessToken!
          );

          const newPrice = parseFloat(listing.price || "0") * (1 - dropPercentage / 100);
          
          // Update local record
          await storage.updateListing(listing.id, {
            price: newPrice.toString(),
            updatedAt: new Date(),
          });

          // Track drop
          this.trackPriceDrop(listing.id, dropPercentage);

          // Log action
          await this.logAction(user.id, rule.id, "price_dropped", {
            listingId: listing.id,
            oldPrice: listing.price,
            newPrice,
            dropPercentage,
            totalDropPercentage: totalDropPercentage + dropPercentage,
          });
        }
      } catch (error) {
        console.error(`[Grailed] Error dropping price for ${listing.id}:`, error);
      }
    }
  }

  /**
   * Execute market-based pricing strategy
   */
  private async executeMarketPricing(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    
    const listings = await storage.getListings(user.id, {
      marketplace: "grailed",
      status: "active",
    });

    for (const listing of listings) {
      if (!(listing as any).externalId || !listing.brand) continue;

      try {
        // Get market analysis for the brand/category
        const marketAnalysis = await this.apiClient.getMarketAnalysis(
          listing.brand,
          listing.category || "general",
          connection.accessToken!
        );

        // Get similar sold listings
        const similarListings = await this.apiClient.getSimilarListings(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Calculate optimal price
        const optimalPrice = this.calculateMarketPrice(
          listing,
          marketAnalysis,
          similarListings,
          config
        );

        // Only update if price difference is significant (>5%)
        if (Math.abs(optimalPrice - parseFloat(listing.price || "0")) > parseFloat(listing.price || "0") * 0.05) {
          // Ensure price respects minimum
          const finalPrice = Math.max(optimalPrice, config.minPrice || parseFloat(listing.price || "0") * 0.5);

          await this.apiClient.updateListing(
            (listing as any).externalId,
            { price: finalPrice },
            connection.accessToken!
          );

          await storage.updateListing(listing.id, {
            price: finalPrice.toString(),
            updatedAt: new Date(),
          });

          await this.logAction(user.id, rule.id, "market_price_adjusted", {
            listingId: listing.id,
            oldPrice: listing.price,
            newPrice: finalPrice,
            marketAverage: marketAnalysis.averagePrice,
            demandScore: marketAnalysis.demandScore,
          });
        }
      } catch (error) {
        console.error(`[Grailed] Error adjusting market price for ${listing.id}:`, error);
      }
    }
  }

  /**
   * Send strategic offers to watchers
   */
  private async executeWatcherOffers(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    const minWatchDays = config.minWatchDays || 3;
    const offerDiscountPercentage = config.offerDiscountPercentage || 10;

    const listings = await storage.getListings(user.id, {
      marketplace: "grailed",
      status: "active",
    });

    for (const listing of listings) {
      if (!(listing as any).externalId) continue;

      try {
        // Get watchers
        const watchers = await this.apiClient.getWatchers(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Filter eligible watchers
        const eligibleWatchers = watchers.filter(watcher => {
          const daysWatching = Math.floor(
            (Date.now() - watcher.watchedDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysWatching >= minWatchDays && watcher.previousOffers < 2;
        });

        for (const watcher of eligibleWatchers) {
          // Apply rate limiting
          await rateLimitService.recordRequest("grailed", true);

          // Check rate limit status
          const rateLimitCheck = await rateLimitService.checkRateLimit("grailed", user.id);
          if (!rateLimitCheck.allowed) {
            console.log("[Grailed] Rate limit reached for watcher offers");
            break;
          }

          await this.addLuxuryDelay();

          // Calculate offer price
          const offerPrice = parseFloat(listing.price || "0") * (1 - offerDiscountPercentage / 100);
          
          // Send offer
          await this.apiClient.sendOfferToWatcher(
            (listing as any).externalId,
            watcher.userId,
            {
              price: offerPrice,
              message: config.offerMessage || `Special offer for watching ${listing.brand || "this item"}! Limited time.`,
            },
            connection.accessToken!
          );

          await this.logAction(user.id, rule.id, "watcher_offer_sent", {
            listingId: listing.id,
            watcherId: watcher.userId,
            offerPrice,
            discount: offerDiscountPercentage,
          });
        }
      } catch (error) {
        console.error(`[Grailed] Error sending watcher offers for ${listing.id}:`, error);
      }
    }
  }

  /**
   * Optimize feed position through strategic updates
   */
  private async executeFeedOptimization(
    rule: AutomationRule,
    user: User,
    connection: MarketplaceConnection
  ): Promise<void> {
    const config = rule.ruleConfig as any;
    
    const listings = await storage.getListings(user.id, {
      marketplace: "grailed",
      status: "active",
    });

    for (const listing of listings) {
      if (!(listing as any).externalId) continue;

      try {
        // Get current feed position
        const feedPosition = await this.apiClient.getFeedPosition(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Get item metrics
        const metrics = await this.apiClient.getItemMetrics(
          (listing as any).externalId,
          connection.accessToken!
        );

        // Only optimize if position is poor
        if (feedPosition.position > 50) {
          const updates: GrailedListingUpdate = {};

          // Update measurements if missing (important for Grailed)
          if (config.addMeasurements && !(listing as any).measurements) {
            updates.measurements = this.generateStandardMeasurements(listing.category || "");
          }

          // Enhance description with keywords
          if (config.optimizeDescription) {
            updates.description = this.optimizeDescription(
              listing.description || "",
              listing.brand || "",
              listing.category || ""
            );
          }

          // Add relevant tags
          if (config.optimizeTags) {
            updates.tags = this.generateOptimalTags(
              listing.brand || "",
              listing.category || "",
              listing.condition || ""
            );
          }

          if (Object.keys(updates).length > 0) {
            await this.apiClient.updateListing(
              (listing as any).externalId,
              updates,
              connection.accessToken!
            );

            await this.logAction(user.id, rule.id, "feed_optimized", {
              listingId: listing.id,
              previousPosition: feedPosition.position,
              updates: Object.keys(updates),
            });
          }
        }
      } catch (error) {
        console.error(`[Grailed] Error optimizing feed position for ${listing.id}:`, error);
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
        return config.maxBumpsPerWeek > 0 && config.maxBumpsPerWeek <= 14;
      case "smart_drop":
        return config.maxTotalDropPercentage > 0 && config.maxTotalDropPercentage <= 60;
      case "market_pricing":
        return !config.minPrice || config.minPrice > 0;
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
      "smart_drop",
      "market_pricing",
      "watcher_offers",
      "feed_optimization",
    ];
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(actionType: string): any {
    const configs: Record<string, any> = {
      auto_bump: {
        maxBumpsPerWeek: 7,
        minDaysBetweenBumps: 1,
        bumpsPerExecution: 3,
        prioritizeHighValue: true,
        minViewsForBump: 50,
      },
      smart_drop: {
        minDaysBetweenDrops: 7,
        baseDropPercentage: 10,
        maxTotalDropPercentage: 40,
        accelerateAfterDays: 30,
        minPrice: 50,
      },
      market_pricing: {
        checkInterval: "weekly",
        followMarketTrend: true,
        premiumForCondition: true,
        undercutCompetition: false,
        minPrice: 50,
      },
      watcher_offers: {
        minWatchDays: 3,
        offerDiscountPercentage: 10,
        maxOffersPerItem: 5,
        offerMessage: "Exclusive offer for watching this piece",
      },
      feed_optimization: {
        optimizeDescription: true,
        optimizeTags: true,
        addMeasurements: true,
        refreshPhotos: false,
      },
    };

    return configs[actionType] || {};
  }

  /**
   * Helper methods
   */
  private async getConnection(userId: string): Promise<MarketplaceConnection | null> {
    const connections = await storage.getMarketplaceConnections(userId);
    return connections.find(c => c.marketplace === "grailed" && c.isConnected) || null;
  }

  private async addLuxuryDelay(): Promise<void> {
    // Longer delays for luxury marketplace (more conservative)
    const delay = Math.random() * 5000 + 5000; // 5-10 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async prioritizeListingsForBump(
    listings: Listing[],
    connection: MarketplaceConnection
  ): Promise<Listing[]> {
    // Sort by value, age, and bump effectiveness
    return listings.sort((a, b) => {
      const scoreA = this.calculateBumpPriority(a);
      const scoreB = this.calculateBumpPriority(b);
      return scoreB - scoreA;
    });
  }

  private calculateBumpPriority(listing: Listing): number {
    // Higher price items get priority
    const priceScore = Math.log(parseFloat(listing.price || "0") + 1) * 10;
    
    // Newer items get slight priority
    const ageInDays = Math.floor((Date.now() - (listing.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));
    const ageScore = Math.max(0, 30 - ageInDays);
    
    // Check bump effectiveness history
    const bumpData = this.bumpTracker.get(listing.id);
    const effectivenessScore = bumpData ? bumpData.effectiveness * 20 : 10;
    
    return priceScore + ageScore + effectivenessScore;
  }

  private checkBumpEligibility(
    listingId: string,
    maxPerWeek: number,
    minDaysBetween: number
  ): { eligible: boolean; reason?: string } {
    const bumpData = this.bumpTracker.get(listingId);
    
    if (!bumpData) {
      return { eligible: true };
    }
    
    // Check days since last bump
    const daysSinceLastBump = Math.floor(
      (Date.now() - bumpData.lastBump.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastBump < minDaysBetween) {
      return { eligible: false, reason: `Only ${daysSinceLastBump} days since last bump` };
    }
    
    // Check weekly limit
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (bumpData.lastBump > weekAgo && bumpData.count >= maxPerWeek) {
      return { eligible: false, reason: "Weekly bump limit reached" };
    }
    
    return { eligible: true };
  }

  private shouldBump(metrics: ItemMetrics, config: any): boolean {
    // Don't bump if recently bumped
    if (metrics.lastBumpDate) {
      const daysSinceLastBump = Math.floor(
        (Date.now() - metrics.lastBumpDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastBump < 1) {
        return false;
      }
    }
    
    // Don't bump items with very low engagement
    if (metrics.views < (config.minViewsForBump || 50) && metrics.daysListed > 7) {
      return false;
    }
    
    // Prioritize items with watchers
    if (metrics.watchers > 3) {
      return true;
    }
    
    // Bump if feed rank is dropping
    if (metrics.feedRank > 50) {
      return true;
    }
    
    return metrics.daysListed > 3;
  }

  private trackBump(listingId: string, metrics: ItemMetrics): void {
    const existing = this.bumpTracker.get(listingId);
    
    // Calculate effectiveness based on engagement
    const effectiveness = (metrics.watchers * 10 + metrics.offers * 20 + metrics.views / 10) / 100;
    
    this.bumpTracker.set(listingId, {
      count: (existing?.count || 0) + 1,
      lastBump: new Date(),
      effectiveness: existing ? (existing.effectiveness + effectiveness) / 2 : effectiveness,
    });
  }

  private needsPriceDrop(metrics: ItemMetrics, listing: Listing, config: any): boolean {
    const ageInDays = Math.floor((Date.now() - (listing.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));
    
    // Drop if old with low engagement
    if (ageInDays > (config.accelerateAfterDays || 30) && metrics.watchers < 2) {
      return true;
    }
    
    // Drop if conversion rate is very low
    if (metrics.conversionRate < 1 && ageInDays > 14) {
      return true;
    }
    
    // Drop if no offers despite views
    if (metrics.views > 200 && metrics.offers === 0) {
      return true;
    }
    
    return false;
  }

  private calculateOptimalDrop(
    metrics: ItemMetrics,
    listing: Listing,
    totalDropSoFar: number,
    config: any
  ): number {
    let dropPercentage = config.baseDropPercentage || 10;
    
    // Increase drop for older items
    const ageInDays = Math.floor((Date.now() - (listing.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));
    if (ageInDays > 60) {
      dropPercentage *= 1.5;
    } else if (ageInDays > 30) {
      dropPercentage *= 1.25;
    }
    
    // Reduce drop if high watcher count (interested buyers)
    if (metrics.watchers > 5) {
      dropPercentage *= 0.5;
    }
    
    // Ensure we don't exceed max total drop
    const remainingDrop = (config.maxTotalDropPercentage || 40) - totalDropSoFar;
    dropPercentage = Math.min(dropPercentage, remainingDrop);
    
    // Ensure minimum price is respected
    const newPrice = parseFloat(listing.price || "0") * (1 - dropPercentage / 100);
    if (config.minPrice && newPrice < config.minPrice) {
      dropPercentage = ((parseFloat(listing.price || "0") - config.minPrice) / parseFloat(listing.price || "0")) * 100;
    }
    
    return Math.max(0, Math.round(dropPercentage));
  }

  private trackPriceDrop(listingId: string, percentage: number): void {
    const history = this.priceDropHistory.get(listingId) || [];
    history.push({
      date: new Date(),
      percentage,
    });
    
    // Keep only last 10 drops
    if (history.length > 10) {
      history.shift();
    }
    
    this.priceDropHistory.set(listingId, history);
  }

  private calculateMarketPrice(
    listing: Listing,
    analysis: MarketAnalysis,
    similar: SimilarListing[],
    config: any
  ): number {
    // Start with market average
    let suggestedPrice = analysis.averagePrice;
    
    // Adjust based on condition
    if (config.premiumForCondition && listing.condition) {
      if (listing.condition.toLowerCase().includes("new") || listing.condition.toLowerCase().includes("excellent")) {
        suggestedPrice *= 1.15;
      } else if (listing.condition.toLowerCase().includes("good")) {
        suggestedPrice *= 0.95;
      }
    }
    
    // Consider sold similar items
    const soldItems = similar.filter(item => item.sold);
    if (soldItems.length > 0) {
      const avgSoldPrice = soldItems.reduce((sum, item) => sum + (item.finalPrice || item.price), 0) / soldItems.length;
      // Weight sold prices more heavily
      suggestedPrice = (suggestedPrice + avgSoldPrice * 2) / 3;
    }
    
    // Adjust based on demand score
    if (analysis.demandScore > 70) {
      suggestedPrice *= 1.1;
    } else if (analysis.demandScore < 30) {
      suggestedPrice *= 0.9;
    }
    
    // Consider price trend
    if (analysis.priceHistory.length > 2) {
      const trend = analysis.priceHistory[0].price - analysis.priceHistory[analysis.priceHistory.length - 1].price;
      if (trend > 0) {
        // Prices are rising
        suggestedPrice *= 1.05;
      }
    }
    
    return Math.round(suggestedPrice);
  }

  private generateStandardMeasurements(category?: string): Record<string, string> {
    // Generate standard measurements based on category
    const measurements: Record<string, string> = {
      "pit-to-pit": "21 inches",
      "length": "28 inches",
      "shoulders": "18 inches",
      "sleeve": "25 inches",
    };
    
    if (category === "bottoms") {
      return {
        "waist": "32 inches",
        "inseam": "32 inches",
        "rise": "10 inches",
        "leg-opening": "7 inches",
      };
    }
    
    return measurements;
  }

  private optimizeDescription(description: string, brand?: string, category?: string): string {
    // Add keywords for better search visibility
    const keywords: string[] = [];
    
    if (brand) {
      keywords.push(brand.toUpperCase());
    }
    
    if (category) {
      keywords.push(category);
    }
    
    // Add condition and authenticity keywords
    if (!description.toLowerCase().includes("authentic")) {
      keywords.push("100% AUTHENTIC");
    }
    
    // Add seasonal keywords
    const season = this.getCurrentSeason();
    keywords.push(season.toUpperCase());
    
    // Prepend keywords to description
    const keywordString = keywords.join(" • ");
    
    return `${keywordString}\n\n${description}`;
  }

  private generateOptimalTags(brand?: string, category?: string, condition?: string): string[] {
    const tags: string[] = [];
    
    if (brand) {
      tags.push(brand.toLowerCase());
      // Add related brands
      const relatedBrands = this.getRelatedBrands(brand);
      tags.push(...relatedBrands);
    }
    
    if (category) {
      tags.push(category);
    }
    
    if (condition) {
      if (condition.toLowerCase().includes("new")) {
        tags.push("deadstock", "bnwt");
      }
    }
    
    // Add style tags
    tags.push("archive", "vintage", "designer", "luxury");
    
    return Array.from(new Set(tags)).slice(0, 10);
  }

  private getRelatedBrands(brand: string): string[] {
    const brandGroups: Record<string, string[]> = {
      "rick owens": ["drkshdw", "boris bidjan saberi", "julius"],
      "raf simons": ["jil sander", "prada", "calvin klein"],
      "yohji yamamoto": ["comme des garcons", "issey miyake"],
    };
    
    const lowerBrand = brand.toLowerCase();
    return brandGroups[lowerBrand] || [];
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    if (month >= 8 && month <= 10) return "fall";
    return "winter";
  }

  private async logAction(userId: string, ruleId: string, action: string, details: any): Promise<void> {
    await storage.createAutomationLog({
      userId,
      marketplace: "grailed",
      ruleId,
      actionType: action,
      status: "success",
      // details, // Not in schema
      // executedAt: new Date(), // Not in schema
    });
  }
}

// Export singleton instance
export const grailedAutomationEngine = new GrailedAutomationEngine();