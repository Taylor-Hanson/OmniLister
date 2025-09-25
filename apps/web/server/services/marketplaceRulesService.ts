import { storage } from "../storage";
import { type InsertMarketplacePostingRules } from "../shared/schema.ts";

/**
 * Service for managing marketplace-specific posting rules and constraints
 */
export class MarketplaceRulesService {
  
  /**
   * Initialize default posting rules for all supported marketplaces
   */
  async initializeDefaultRules(): Promise<void> {
    console.log("Initializing default marketplace posting rules...");
    
    const defaultRules: InsertMarketplacePostingRules[] = [
      // eBay - Auction-style marketplace, peak activity Sunday evenings
      {
        marketplace: "ebay",
        optimalWindows: [
          { dayOfWeek: 0, startHour: 17, endHour: 21, timezone: "America/New_York", score: 95 }, // Sunday evening
          { dayOfWeek: 6, startHour: 10, endHour: 15, timezone: "America/New_York", score: 85 }, // Saturday afternoon
          { dayOfWeek: 1, startHour: 19, endHour: 22, timezone: "America/New_York", score: 80 }, // Monday evening
          { dayOfWeek: 2, startHour: 18, endHour: 21, timezone: "America/New_York", score: 75 }, // Tuesday evening
          { dayOfWeek: 4, startHour: 17, endHour: 20, timezone: "America/New_York", score: 70 }, // Friday evening
        ],
        peakHours: [
          { startHour: 19, endHour: 21, description: "Evening prime time" },
          { startHour: 12, endHour: 14, description: "Lunch break browsing" },
        ],
        avoidHours: [
          { startHour: 1, endHour: 6, description: "Early morning low activity" },
          { startHour: 9, endHour: 11, description: "Work hours" },
        ],
        rateLimitPerHour: 100,
        rateLimitPerDay: 2000,
        minDelayBetweenPosts: 30,
        categorySpecificRules: {
          electronics: { multiplier: 1.1, preferredDays: [0, 6] }, // Better on weekends
          fashion: { multiplier: 1.2, preferredDays: [4, 5, 6] }, // Better Thu-Sat
          collectibles: { multiplier: 1.15, preferredDays: [0, 6] }, // Better on weekends
        },
        seasonalAdjustments: {
          holiday_season: { multiplier: 1.3, months: [11, 12] },
          back_to_school: { multiplier: 1.2, months: [8, 9] },
          spring_cleaning: { multiplier: 1.1, months: [3, 4, 5] },
        },
        success_multiplier: "1.0",
        isActive: true,
      },
      
      // Poshmark - Fashion-focused, social selling platform
      {
        marketplace: "poshmark",
        optimalWindows: [
          { dayOfWeek: 6, startHour: 10, endHour: 16, timezone: "America/Los_Angeles", score: 90 }, // Saturday day
          { dayOfWeek: 0, startHour: 12, endHour: 18, timezone: "America/Los_Angeles", score: 88 }, // Sunday afternoon
          { dayOfWeek: 4, startHour: 17, endHour: 20, timezone: "America/Los_Angeles", score: 85 }, // Friday evening
          { dayOfWeek: 5, startHour: 18, endHour: 22, timezone: "America/Los_Angeles", score: 82 }, // Friday evening
          { dayOfWeek: 2, startHour: 19, endHour: 21, timezone: "America/Los_Angeles", score: 75 }, // Tuesday evening
        ],
        peakHours: [
          { startHour: 20, endHour: 22, description: "Evening social browsing" },
          { startHour: 11, endHour: 13, description: "Weekend morning browsing" },
        ],
        avoidHours: [
          { startHour: 1, endHour: 7, description: "Early morning" },
          { startHour: 9, endHour: 17, description: "Work hours weekdays" },
        ],
        rateLimitPerHour: 50,
        rateLimitPerDay: 500,
        minDelayBetweenPosts: 60,
        categorySpecificRules: {
          fashion: { multiplier: 1.0, preferredDays: [4, 5, 6, 0] },
          shoes: { multiplier: 1.1, preferredDays: [6, 0] },
          accessories: { multiplier: 1.05, preferredDays: [5, 6] },
        },
        seasonalAdjustments: {
          fashion_week: { multiplier: 1.4, months: [2, 9] },
          holiday_season: { multiplier: 1.3, months: [11, 12] },
          summer_fashion: { multiplier: 1.2, months: [5, 6, 7] },
        },
        success_multiplier: "1.1",
        isActive: true,
      },
      
      // Mercari - Mobile-first general marketplace
      {
        marketplace: "mercari",
        optimalWindows: [
          { dayOfWeek: 6, startHour: 9, endHour: 17, timezone: "America/Los_Angeles", score: 85 }, // Saturday day
          { dayOfWeek: 0, startHour: 11, endHour: 19, timezone: "America/Los_Angeles", score: 83 }, // Sunday day
          { dayOfWeek: 3, startHour: 18, endHour: 21, timezone: "America/Los_Angeles", score: 78 }, // Wednesday evening
          { dayOfWeek: 5, startHour: 17, endHour: 22, timezone: "America/Los_Angeles", score: 75 }, // Friday evening
        ],
        peakHours: [
          { startHour: 12, endHour: 14, description: "Lunch break mobile browsing" },
          { startHour: 19, endHour: 21, description: "Evening mobile browsing" },
        ],
        avoidHours: [
          { startHour: 2, endHour: 7, description: "Early morning" },
        ],
        rateLimitPerHour: 75,
        rateLimitPerDay: 1000,
        minDelayBetweenPosts: 45,
        categorySpecificRules: {
          electronics: { multiplier: 1.1, preferredDays: [6, 0] },
          fashion: { multiplier: 1.05, preferredDays: [5, 6] },
          collectibles: { multiplier: 1.0, preferredDays: [6, 0] },
        },
        seasonalAdjustments: {
          holiday_season: { multiplier: 1.25, months: [11, 12] },
          spring_cleaning: { multiplier: 1.15, months: [3, 4] },
        },
        success_multiplier: "0.95",
        isActive: true,
      },
      
      // Facebook Marketplace - Local and social marketplace
      {
        marketplace: "facebook",
        optimalWindows: [
          { dayOfWeek: 6, startHour: 9, endHour: 12, timezone: "America/New_York", score: 80 }, // Saturday morning
          { dayOfWeek: 0, startHour: 13, endHour: 17, timezone: "America/New_York", score: 78 }, // Sunday afternoon
          { dayOfWeek: 4, startHour: 18, endHour: 21, timezone: "America/New_York", score: 75 }, // Thursday evening
          { dayOfWeek: 1, startHour: 18, endHour: 21, timezone: "America/New_York", score: 70 }, // Monday evening
        ],
        peakHours: [
          { startHour: 20, endHour: 22, description: "Evening social media time" },
          { startHour: 12, endHour: 13, description: "Lunch break" },
        ],
        avoidHours: [
          { startHour: 1, endHour: 6, description: "Early morning" },
          { startHour: 9, endHour: 11, description: "Work hours" },
        ],
        rateLimitPerHour: 40,
        rateLimitPerDay: 200,
        minDelayBetweenPosts: 120, // 2 minutes to avoid spam detection
        categorySpecificRules: {
          furniture: { multiplier: 1.2, preferredDays: [6, 0] }, // Weekend home projects
          electronics: { multiplier: 1.1, preferredDays: [6, 0] },
          vehicles: { multiplier: 1.15, preferredDays: [6, 0] },
        },
        seasonalAdjustments: {
          moving_season: { multiplier: 1.3, months: [5, 6, 7, 8] },
          holiday_season: { multiplier: 1.2, months: [11, 12] },
        },
        success_multiplier: "0.9",
        isActive: true,
      },
      
      // Depop - Gen Z fashion marketplace
      {
        marketplace: "depop",
        optimalWindows: [
          { dayOfWeek: 5, startHour: 16, endHour: 20, timezone: "Europe/London", score: 85 }, // Friday evening
          { dayOfWeek: 6, startHour: 11, endHour: 16, timezone: "Europe/London", score: 82 }, // Saturday afternoon
          { dayOfWeek: 0, startHour: 14, endHour: 18, timezone: "Europe/London", score: 80 }, // Sunday afternoon
          { dayOfWeek: 3, startHour: 17, endHour: 20, timezone: "Europe/London", score: 75 }, // Wednesday evening
        ],
        peakHours: [
          { startHour: 16, endHour: 19, description: "After school/work browsing" },
          { startHour: 21, endHour: 23, description: "Evening social media time" },
        ],
        avoidHours: [
          { startHour: 1, endHour: 8, description: "Early morning" },
          { startHour: 9, endHour: 15, description: "School/work hours" },
        ],
        rateLimitPerHour: 30,
        rateLimitPerDay: 300,
        minDelayBetweenPosts: 90,
        categorySpecificRules: {
          vintage_fashion: { multiplier: 1.2, preferredDays: [5, 6, 0] },
          streetwear: { multiplier: 1.15, preferredDays: [4, 5, 6] },
          accessories: { multiplier: 1.1, preferredDays: [6, 0] },
        },
        seasonalAdjustments: {
          festival_season: { multiplier: 1.4, months: [6, 7, 8] },
          back_to_school: { multiplier: 1.3, months: [8, 9] },
          holiday_party: { multiplier: 1.25, months: [11, 12] },
        },
        success_multiplier: "1.05",
        isActive: true,
      },
      
      // Vinted - European second-hand fashion
      {
        marketplace: "vinted",
        optimalWindows: [
          { dayOfWeek: 6, startHour: 10, endHour: 16, timezone: "Europe/Berlin", score: 80 }, // Saturday day
          { dayOfWeek: 0, startHour: 12, endHour: 18, timezone: "Europe/Berlin", score: 78 }, // Sunday afternoon
          { dayOfWeek: 4, startHour: 17, endHour: 20, timezone: "Europe/Berlin", score: 75 }, // Thursday evening
          { dayOfWeek: 2, startHour: 18, endHour: 21, timezone: "Europe/Berlin", score: 70 }, // Tuesday evening
        ],
        peakHours: [
          { startHour: 19, endHour: 21, description: "Evening browsing" },
          { startHour: 13, endHour: 15, description: "Weekend afternoon" },
        ],
        avoidHours: [
          { startHour: 1, endHour: 7, description: "Early morning" },
          { startHour: 9, endHour: 17, description: "Work hours" },
        ],
        rateLimitPerHour: 40,
        rateLimitPerDay: 400,
        minDelayBetweenPosts: 75,
        categorySpecificRules: {
          fashion: { multiplier: 1.0, preferredDays: [4, 5, 6, 0] },
          children_clothes: { multiplier: 1.1, preferredDays: [6, 0] },
          designer_fashion: { multiplier: 1.15, preferredDays: [5, 6] },
        },
        seasonalAdjustments: {
          spring_wardrobe: { multiplier: 1.2, months: [3, 4] },
          back_to_school: { multiplier: 1.15, months: [8, 9] },
          holiday_season: { multiplier: 1.1, months: [11, 12] },
        },
        success_multiplier: "0.92",
        isActive: true,
      },
    ];

    // Initialize rules for each marketplace
    for (const rules of defaultRules) {
      try {
        const existing = await storage.getMarketplacePostingRule(rules.marketplace);
        if (!existing) {
          await storage.createMarketplacePostingRules(rules);
          console.log(`✓ Initialized posting rules for ${rules.marketplace}`);
        } else {
          console.log(`- Posting rules for ${rules.marketplace} already exist`);
        }
      } catch (error) {
        console.error(`Failed to initialize rules for ${rules.marketplace}:`, error);
      }
    }

    console.log("Marketplace posting rules initialization complete!");
  }

  /**
   * Update posting rules based on performance analytics
   */
  async updateRulesFromAnalytics(): Promise<void> {
    console.log("Updating marketplace rules based on performance analytics...");
    
    // This would analyze posting success data and adjust rules accordingly
    // For now, we'll implement basic logic to update success multipliers
    
    const marketplaces = ["ebay", "poshmark", "mercari", "facebook", "depop", "vinted"];
    
    for (const marketplace of marketplaces) {
      try {
        // Get recent posting analytics for this marketplace
        const recentAnalytics = await storage.getPostingSuccessAnalytics(
          "", // Empty userId gets all users' data for analysis
          {
            marketplace,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          }
        );

        if (recentAnalytics.length > 10) { // Need sufficient data
          // Calculate average success score
          const avgSuccessScore = recentAnalytics.reduce((sum, record) => 
            sum + Number(record.success_score || 0), 0
          ) / recentAnalytics.length;

          // Adjust success multiplier based on performance
          const newMultiplier = Math.max(0.5, Math.min(1.5, avgSuccessScore / 70)); // Normalize to 0.5-1.5 range

          // Update the marketplace rules
          await storage.updateMarketplacePostingRules(marketplace, {
            success_multiplier: newMultiplier.toFixed(2),
            lastUpdated: new Date(),
          });

          console.log(`✓ Updated success multiplier for ${marketplace}: ${newMultiplier.toFixed(2)}`);
        }
      } catch (error) {
        console.error(`Failed to update rules for ${marketplace}:`, error);
      }
    }
  }

  /**
   * Get marketplace-specific constraints for rate limiting
   */
  async getMarketplaceConstraints(marketplace: string): Promise<{
    rateLimitPerHour: number;
    rateLimitPerDay: number;
    minDelayBetweenPosts: number;
    isActive: boolean;
  } | null> {
    try {
      const rules = await storage.getMarketplacePostingRule(marketplace);
      if (!rules) return null;

      return {
        rateLimitPerHour: rules.rateLimitPerHour || 50,
        rateLimitPerDay: rules.rateLimitPerDay || 500,
        minDelayBetweenPosts: rules.minDelayBetweenPosts || 60,
        isActive: rules.isActive || false,
      };
    } catch (error) {
      console.error(`Failed to get constraints for ${marketplace}:`, error);
      return null;
    }
  }

  /**
   * Check if a marketplace is available for posting at the current time
   */
  async isMarketplaceAvailable(marketplace: string, timezone = "UTC"): Promise<boolean> {
    try {
      const rules = await storage.getMarketplacePostingRule(marketplace);
      if (!rules || !rules.isActive) return false;

      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      // Check if current time is in avoid hours
      const avoidHours = rules.avoidHours as any[] || [];
      const isAvoidTime = avoidHours.some(period =>
        currentHour >= period.startHour && currentHour < period.endHour
      );

      if (isAvoidTime) return false;

      // Check if we're in an optimal window (preferred but not required)
      const optimalWindows = rules.optimalWindows as any[] || [];
      const isOptimalTime = optimalWindows.some(window =>
        window.dayOfWeek === currentDay &&
        currentHour >= window.startHour &&
        currentHour < window.endHour
      );

      // Available if not in avoid hours (optimal time is a bonus, not requirement)
      return true;
    } catch (error) {
      console.error(`Failed to check availability for ${marketplace}:`, error);
      return false;
    }
  }
}

export const marketplaceRulesService = new MarketplaceRulesService();