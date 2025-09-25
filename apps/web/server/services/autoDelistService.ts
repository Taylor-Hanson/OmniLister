import { storage } from "../storage";
import { marketplaceService } from "./marketplaceService";
import { queueService } from "./queueService";
import { type AutoDelistRule, type InsertAutoDelistHistory, type Listing, type ListingPost } from "../shared/schema.ts";

class AutoDelistService {
  /**
   * Process all active auto-delist rules for a user
   */
  async processRulesForUser(userId: string): Promise<void> {
    const rules = await storage.getAutoDelistRules(userId);
    const activeRules = rules.filter(rule => rule.enabled);

    for (const rule of activeRules) {
      await this.processRule(rule);
    }
  }

  /**
   * Process a single auto-delist rule
   */
  async processRule(rule: AutoDelistRule): Promise<void> {
    try {
      const listings = await this.getListingsForRule(rule);
      const listingsToDelete = await this.filterListingsByTrigger(listings, rule);

      for (const listing of listingsToDelete) {
        await this.delistListing(listing, rule);
      }

      // Update last executed time
      await storage.updateAutoDelistRule(rule.id, {
        lastExecutedAt: new Date(),
      });
    } catch (error) {
      console.error(`Error processing auto-delist rule ${rule.id}:`, error);
    }
  }

  /**
   * Get listings that match the rule criteria
   */
  private async getListingsForRule(rule: AutoDelistRule): Promise<Listing[]> {
    const allListings = await storage.getListings(rule.userId, { status: 'active' });
    
    // Filter by specific listing IDs if provided
    if (rule.listingIds && rule.listingIds.length > 0) {
      return allListings.filter(listing => rule.listingIds?.includes(listing.id));
    }

    return allListings;
  }

  /**
   * Filter listings based on the trigger condition
   */
  private async filterListingsByTrigger(listings: Listing[], rule: AutoDelistRule): Promise<Listing[]> {
    const filtered: Listing[] = [];
    const triggerValue = rule.triggerValue as any;

    for (const listing of listings) {
      let shouldDelist = false;

      switch (rule.trigger) {
        case 'time_based':
          // Delist if listing is older than specified days
          if (listing.createdAt) {
            const daysOld = Math.floor((Date.now() - listing.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            shouldDelist = daysOld >= (triggerValue.days || 30);
          }
          break;

        case 'inventory_based':
          // Delist if quantity is at or below threshold
          const threshold = triggerValue.quantity || 0;
          shouldDelist = (listing.quantity || 0) <= threshold;
          break;

        case 'date_based':
          // Delist if current date is past the specified date
          const targetDate = new Date(triggerValue.date);
          shouldDelist = Date.now() >= targetDate.getTime();
          break;
      }

      if (shouldDelist) {
        // Check if this listing needs to be delisted from the specified marketplaces
        const listingPosts = await storage.getListingPosts(listing.id);
        const activePostsInTargetMarketplaces = listingPosts.filter(post => {
          if (post.status !== 'posted') return false;
          if (!rule.marketplaces || rule.marketplaces.length === 0) return true; // All marketplaces
          return rule.marketplaces.includes(post.marketplace);
        });

        if (activePostsInTargetMarketplaces.length > 0) {
          filtered.push(listing);
        }
      }
    }

    return filtered;
  }

  /**
   * Delist a listing from marketplaces based on the rule
   */
  private async delistListing(listing: Listing, rule: AutoDelistRule): Promise<void> {
    const listingPosts = await storage.getListingPosts(listing.id);
    const targetMarketplaces = rule.marketplaces || marketplaceService.getSupportedMarketplaces();

    for (const marketplace of targetMarketplaces) {
      const post = listingPosts.find(p => p.marketplace === marketplace && p.status === 'posted');
      if (post) {
        try {
          // Create a job to delist the item
          // await queueService.createJob(rule.userId, {
          //   type: 'delist-listing',
          //   data: {
          //     listingId: listing.id,
          //     marketplace: marketplace,
          //     listingPostId: post.id,
          //     reason: `Auto-delisted by rule: ${rule.name}`,
          //   },
          // });
          console.log(`Would delist listing ${listing.id} from ${marketplace} due to rule: ${rule.name}`);

          // Update listing post status
          await storage.updateListingPost(post.id, {
            status: 'delisted',
          });

          // Create history record
          const history: InsertAutoDelistHistory = {
            ruleId: rule.id,
            listingId: listing.id,
            marketplace: marketplace,
            reason: this.getDelistReason(rule),
          };
          await storage.createAutoDelistHistory(rule.userId, history);

        } catch (error) {
          console.error(`Failed to delist listing ${listing.id} from ${marketplace}:`, error);
        }
      }
    }

    // Update listing status if delisted from all marketplaces
    const remainingActive = listingPosts.filter(p => p.status === 'posted').length;
    if (remainingActive === 0) {
      await storage.updateListing(listing.id, { status: 'deleted' });
    }
  }

  /**
   * Get human-readable reason for delisting
   */
  private getDelistReason(rule: AutoDelistRule): string {
    const triggerValue = rule.triggerValue as any;

    switch (rule.trigger) {
      case 'time_based':
        return `Listing age exceeded ${triggerValue.days} days`;
      case 'inventory_based':
        return `Inventory reached threshold of ${triggerValue.quantity}`;
      case 'date_based':
        return `Scheduled delist date ${triggerValue.date} reached`;
      default:
        return `Auto-delisted by rule: ${rule.name}`;
    }
  }

  /**
   * Manually trigger a specific rule
   */
  async triggerRule(userId: string, ruleId: string): Promise<void> {
    const rule = await storage.getAutoDelistRule(ruleId);
    if (!rule || rule.userId !== userId) {
      throw new Error('Rule not found or unauthorized');
    }

    await this.processRule(rule);
  }

  /**
   * Get statistics for auto-delist activity
   */
  async getStats(userId: string): Promise<{
    totalRules: number;
    activeRules: number;
    recentDelists: number;
    scheduledDelists: number;
  }> {
    const rules = await storage.getAutoDelistRules(userId);
    const history = await storage.getAutoDelistHistory(userId, 30);
    
    // Count scheduled delists (date-based rules in the future)
    const scheduledDelists = rules.filter(rule => {
      if (!rule.enabled || rule.trigger !== 'date_based') return false;
      const triggerValue = rule.triggerValue as any;
      return new Date(triggerValue.date).getTime() > Date.now();
    }).length;

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.enabled).length,
      recentDelists: history.length,
      scheduledDelists,
    };
  }
}

export const autoDelistService = new AutoDelistService();