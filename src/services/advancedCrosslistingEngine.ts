// Advanced Crosslisting Engine - Automated multichannel listing system

import { aiService } from './aiService';

export interface CrosslistingJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  createdAt: Date;
  updatedAt: Date;
  sourceListing: {
    id: string;
    title: string;
    description: string;
    price: number;
    images: string[];
    category: string;
    condition: string;
    brand: string;
    tags: string[];
  };
  targetPlatforms: {
    platform: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    listingId?: string;
    url?: string;
    error?: string;
    optimizedContent?: {
      title: string;
      description: string;
      category: string;
      tags: string[];
    };
  }[];
  settings: {
    autoDelist: boolean;
    platformSpecificOptimization: boolean;
    scheduledPosting?: Date;
    retryAttempts: number;
  };
}

export interface PlatformOptimization {
  platform: string;
  titleRules: {
    maxLength: number;
    keywords: string[];
    format: 'title_case' | 'sentence_case' | 'all_caps';
    requiredElements: string[];
  };
  descriptionRules: {
    maxLength: number;
    requiredSections: string[];
    prohibitedWords: string[];
    imageCount: number;
  };
  categoryMapping: {
    [key: string]: string;
  };
  pricingRules: {
    minPrice: number;
    maxPrice: number;
    feePercentage: number;
    shippingIncluded: boolean;
  };
}

export interface InventoryItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: string;
  brand: string;
  tags: string[];
  status: 'active' | 'sold' | 'draft' | 'paused';
  platforms: {
    platform: string;
    listingId: string;
    url: string;
    status: 'active' | 'sold' | 'removed' | 'error';
    lastSync: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CrosslistingAnalytics {
  totalListings: number;
  successfulListings: number;
  failedListings: number;
  platformPerformance: {
    platform: string;
    successRate: number;
    averageTime: number;
    totalListings: number;
  }[];
  timeSaved: number; // in minutes
  revenueGenerated: number;
}

class AdvancedCrosslistingEngine {
  private crosslistingJobs: Map<string, CrosslistingJob> = new Map();
  private inventoryItems: Map<string, InventoryItem> = new Map();
  private platformOptimizations: Map<string, PlatformOptimization> = new Map();
  private isProcessing: boolean = false;

  // Initialize crosslisting engine
  async initialize() {
    try {
      await this.loadPlatformOptimizations();
      await this.loadInventoryItems();
      await this.startProcessingQueue();
      
      console.log('Advanced crosslisting engine initialized');
    } catch (error) {
      console.error('Failed to initialize crosslisting engine:', error);
    }
  }

  // Load platform optimizations
  private async loadPlatformOptimizations(): Promise<void> {
    const optimizations: PlatformOptimization[] = [
      {
        platform: 'eBay',
        titleRules: {
          maxLength: 80,
          keywords: ['brand', 'model', 'condition'],
          format: 'title_case',
          requiredElements: ['brand', 'condition'],
        },
        descriptionRules: {
          maxLength: 2000,
          requiredSections: ['condition', 'shipping', 'returns'],
          prohibitedWords: ['free', 'cheap', 'best'],
          imageCount: 12,
        },
        categoryMapping: {
          'Electronics': 'Consumer Electronics',
          'Fashion': 'Clothing, Shoes & Accessories',
          'Home': 'Home & Garden',
        },
        pricingRules: {
          minPrice: 0.99,
          maxPrice: 10000,
          feePercentage: 10,
          shippingIncluded: false,
        },
      },
      {
        platform: 'Facebook Marketplace',
        titleRules: {
          maxLength: 100,
          keywords: ['location', 'condition', 'price'],
          format: 'sentence_case',
          requiredElements: ['condition'],
        },
        descriptionRules: {
          maxLength: 1000,
          requiredSections: ['condition', 'pickup'],
          prohibitedWords: ['spam', 'scam'],
          imageCount: 20,
        },
        categoryMapping: {
          'Electronics': 'Electronics',
          'Fashion': 'Clothing & Accessories',
          'Home': 'Home & Garden',
        },
        pricingRules: {
          minPrice: 1,
          maxPrice: 50000,
          feePercentage: 0,
          shippingIncluded: false,
        },
      },
      {
        platform: 'Mercari',
        titleRules: {
          maxLength: 60,
          keywords: ['brand', 'size', 'condition'],
          format: 'title_case',
          requiredElements: ['brand', 'condition'],
        },
        descriptionRules: {
          maxLength: 1000,
          requiredSections: ['condition', 'shipping'],
          prohibitedWords: ['authentic', 'genuine'],
          imageCount: 8,
        },
        categoryMapping: {
          'Electronics': 'Electronics',
          'Fashion': 'Women\'s Fashion',
          'Home': 'Home & Living',
        },
        pricingRules: {
          minPrice: 1,
          maxPrice: 2000,
          feePercentage: 10,
          shippingIncluded: true,
        },
      },
      {
        platform: 'Poshmark',
        titleRules: {
          maxLength: 50,
          keywords: ['brand', 'size', 'style'],
          format: 'title_case',
          requiredElements: ['brand', 'size'],
        },
        descriptionRules: {
          maxLength: 500,
          requiredSections: ['condition', 'size'],
          prohibitedWords: ['authentic', 'genuine'],
          imageCount: 8,
        },
        categoryMapping: {
          'Fashion': 'Women',
          'Electronics': 'Electronics',
          'Home': 'Home',
        },
        pricingRules: {
          minPrice: 3,
          maxPrice: 50000,
          feePercentage: 20,
          shippingIncluded: true,
        },
      },
      {
        platform: 'Depop',
        titleRules: {
          maxLength: 40,
          keywords: ['brand', 'style', 'vintage'],
          format: 'title_case',
          requiredElements: ['brand'],
        },
        descriptionRules: {
          maxLength: 500,
          requiredSections: ['condition', 'style'],
          prohibitedWords: ['authentic', 'genuine'],
          imageCount: 4,
        },
        categoryMapping: {
          'Fashion': 'Women',
          'Electronics': 'Electronics',
          'Home': 'Home',
        },
        pricingRules: {
          minPrice: 1,
          maxPrice: 10000,
          feePercentage: 10,
          shippingIncluded: false,
        },
      },
      {
        platform: 'Craigslist',
        titleRules: {
          maxLength: 70,
          keywords: ['location', 'condition', 'price'],
          format: 'title_case',
          requiredElements: ['location'],
        },
        descriptionRules: {
          maxLength: 4000,
          requiredSections: ['condition', 'contact'],
          prohibitedWords: ['spam', 'scam'],
          imageCount: 24,
        },
        categoryMapping: {
          'Electronics': 'Electronics',
          'Fashion': 'Clothing & Accessories',
          'Home': 'Household',
        },
        pricingRules: {
          minPrice: 1,
          maxPrice: 100000,
          feePercentage: 0,
          shippingIncluded: false,
        },
      },
    ];

    optimizations.forEach(optimization => {
      this.platformOptimizations.set(optimization.platform, optimization);
    });
  }

  // Load inventory items
  private async loadInventoryItems(): Promise<void> {
    // Mock implementation - in real app, load from database
    const mockItems: InventoryItem[] = [
      {
        id: 'item_001',
        userId: 'user_001',
        title: 'iPhone 13 128GB Blue',
        description: 'Excellent condition iPhone 13 with 128GB storage. No scratches or damage.',
        price: 650,
        images: [
          'https://example.com/iphone1.jpg',
          'https://example.com/iphone2.jpg',
        ],
        category: 'Electronics',
        condition: 'Excellent',
        brand: 'Apple',
        tags: ['smartphone', 'iOS', '128GB', 'blue'],
        status: 'active',
        platforms: [
          {
            platform: 'eBay',
            listingId: 'ebay_123',
            url: 'https://ebay.com/item/123',
            status: 'active',
            lastSync: new Date(),
          },
        ],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(),
      },
    ];

    mockItems.forEach(item => {
      this.inventoryItems.set(item.id, item);
    });
  }

  // Start processing queue
  private async startProcessingQueue(): Promise<void> {
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processCrosslistingQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  // Create crosslisting job
  async createCrosslistingJob(
    userId: string,
    sourceListing: CrosslistingJob['sourceListing'],
    targetPlatforms: string[],
    settings: CrosslistingJob['settings']
  ): Promise<string> {
    try {
      const jobId = `crosslisting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const job: CrosslistingJob = {
        id: jobId,
        userId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceListing,
        targetPlatforms: targetPlatforms.map(platform => ({
          platform,
          status: 'pending',
        })),
        settings,
      };

      this.crosslistingJobs.set(jobId, job);
      
      console.log(`Created crosslisting job ${jobId} for ${targetPlatforms.length} platforms`);
      return jobId;
    } catch (error) {
      console.error('Failed to create crosslisting job:', error);
      throw error;
    }
  }

  // Process crosslisting queue
  private async processCrosslistingQueue(): Promise<void> {
    try {
      this.isProcessing = true;
      
      const pendingJobs = Array.from(this.crosslistingJobs.values())
        .filter(job => job.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (const job of pendingJobs) {
        await this.processCrosslistingJob(job);
      }
    } catch (error) {
      console.error('Failed to process crosslisting queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual crosslisting job
  private async processCrosslistingJob(job: CrosslistingJob): Promise<void> {
    try {
      job.status = 'processing';
      job.updatedAt = new Date();
      this.crosslistingJobs.set(job.id, job);

      const results = await Promise.allSettled(
        job.targetPlatforms.map(platform => this.crosslistToPlatform(job, platform))
      );

      let completedCount = 0;
      let failedCount = 0;

      results.forEach((result, index) => {
        const platform = job.targetPlatforms[index];
        if (result.status === 'fulfilled') {
          platform.status = 'completed';
          platform.listingId = result.value.listingId;
          platform.url = result.value.url;
          completedCount++;
        } else {
          platform.status = 'failed';
          platform.error = result.reason.message;
          failedCount++;
        }
      });

      // Update job status
      if (completedCount === job.targetPlatforms.length) {
        job.status = 'completed';
      } else if (failedCount === job.targetPlatforms.length) {
        job.status = 'failed';
      } else {
        job.status = 'partial';
      }

      job.updatedAt = new Date();
      this.crosslistingJobs.set(job.id, job);

      // Update inventory item
      await this.updateInventoryItem(job);

      console.log(`Completed crosslisting job ${job.id}: ${completedCount} successful, ${failedCount} failed`);
    } catch (error) {
      console.error(`Failed to process crosslisting job ${job.id}:`, error);
      job.status = 'failed';
      job.updatedAt = new Date();
      this.crosslistingJobs.set(job.id, job);
    }
  }

  // Crosslist to specific platform
  private async crosslistToPlatform(
    job: CrosslistingJob,
    platformTarget: CrosslistingJob['targetPlatforms'][0]
  ): Promise<{ listingId: string; url: string }> {
    try {
      platformTarget.status = 'processing';
      
      const optimization = this.platformOptimizations.get(platformTarget.platform);
      if (!optimization) {
        throw new Error(`No optimization rules found for platform: ${platformTarget.platform}`);
      }

      // Optimize content for platform
      const optimizedContent = await this.optimizeContentForPlatform(
        job.sourceListing,
        optimization
      );

      platformTarget.optimizedContent = optimizedContent;

      // Simulate platform API call
      const result = await this.simulatePlatformListing(
        platformTarget.platform,
        optimizedContent,
        job.sourceListing
      );

      return result;
    } catch (error) {
      console.error(`Failed to crosslist to ${platformTarget.platform}:`, error);
      throw error;
    }
  }

  // Optimize content for platform
  private async optimizeContentForPlatform(
    sourceListing: CrosslistingJob['sourceListing'],
    optimization: PlatformOptimization
  ): Promise<CrosslistingJob['targetPlatforms'][0]['optimizedContent']> {
    try {
      // Use AI to optimize title
      const optimizedTitle = await this.optimizeTitle(
        sourceListing.title,
        optimization.titleRules
      );

      // Use AI to optimize description
      const optimizedDescription = await this.optimizeDescription(
        sourceListing.description,
        optimization.descriptionRules
      );

      // Map category
      const optimizedCategory = optimization.categoryMapping[sourceListing.category] || sourceListing.category;

      // Optimize tags
      const optimizedTags = this.optimizeTags(sourceListing.tags, optimization);

      return {
        title: optimizedTitle,
        description: optimizedDescription,
        category: optimizedCategory,
        tags: optimizedTags,
      };
    } catch (error) {
      console.error('Failed to optimize content for platform:', error);
      // Fallback to original content
      return {
        title: sourceListing.title,
        description: sourceListing.description,
        category: sourceListing.category,
        tags: sourceListing.tags,
      };
    }
  }

  // Optimize title using AI
  private async optimizeTitle(
    originalTitle: string,
    rules: PlatformOptimization['titleRules']
  ): Promise<string> {
    try {
      const prompt = `
      Optimize this product title for maximum visibility and search ranking:
      
      Original Title: "${originalTitle}"
      
      Requirements:
      - Maximum length: ${rules.maxLength} characters
      - Format: ${rules.format}
      - Required elements: ${rules.requiredElements.join(', ')}
      - Include keywords: ${rules.keywords.join(', ')}
      
      Create an optimized title that follows all requirements and maximizes search visibility.
      `;

      const aiResponse = await aiService.optimizeTitle(prompt);
      return aiResponse.optimizedTitle;
    } catch (error) {
      console.error('Failed to optimize title with AI:', error);
      // Fallback to truncating original title
      return originalTitle.substring(0, rules.maxLength);
    }
  }

  // Optimize description using AI
  private async optimizeDescription(
    originalDescription: string,
    rules: PlatformOptimization['descriptionRules']
  ): Promise<string> {
    try {
      const prompt = `
      Optimize this product description for better conversion:
      
      Original Description: "${originalDescription}"
      
      Requirements:
      - Maximum length: ${rules.maxLength} characters
      - Required sections: ${rules.requiredSections.join(', ')}
      - Avoid these words: ${rules.prohibitedWords.join(', ')}
      
      Create an optimized description that includes all required sections and follows best practices.
      `;

      const aiResponse = await aiService.optimizeDescription(prompt);
      return aiResponse.optimizedDescription;
    } catch (error) {
      console.error('Failed to optimize description with AI:', error);
      // Fallback to original description
      return originalDescription.substring(0, rules.maxLength);
    }
  }

  // Optimize tags
  private optimizeTags(
    originalTags: string[],
    optimization: PlatformOptimization
  ): string[] {
    // Filter and limit tags based on platform requirements
    const optimizedTags = originalTags
      .filter(tag => tag.length <= 20) // Most platforms have tag length limits
      .slice(0, 10); // Most platforms limit number of tags

    return optimizedTags;
  }

  // Simulate platform listing
  private async simulatePlatformListing(
    platform: string,
    optimizedContent: CrosslistingJob['targetPlatforms'][0]['optimizedContent'],
    sourceListing: CrosslistingJob['sourceListing']
  ): Promise<{ listingId: string; url: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success/failure (90% success rate)
    if (Math.random() < 0.9) {
      const listingId = `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const url = `https://${platform.toLowerCase()}.com/item/${listingId}`;
      
      return { listingId, url };
    } else {
      throw new Error(`Failed to create listing on ${platform}`);
    }
  }

  // Update inventory item
  private async updateInventoryItem(job: CrosslistingJob): Promise<void> {
    try {
      // Find or create inventory item
      let inventoryItem = Array.from(this.inventoryItems.values())
        .find(item => item.userId === job.userId && item.title === job.sourceListing.title);

      if (!inventoryItem) {
        // Create new inventory item
        inventoryItem = {
          id: `item_${Date.now()}`,
          userId: job.userId,
          title: job.sourceListing.title,
          description: job.sourceListing.description,
          price: job.sourceListing.price,
          images: job.sourceListing.images,
          category: job.sourceListing.category,
          condition: job.sourceListing.condition,
          brand: job.sourceListing.brand,
          tags: job.sourceListing.tags,
          status: 'active',
          platforms: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Update platforms
      job.targetPlatforms.forEach(platform => {
        if (platform.status === 'completed' && platform.listingId && platform.url) {
          const existingPlatform = inventoryItem.platforms.find(p => p.platform === platform.platform);
          if (existingPlatform) {
            existingPlatform.listingId = platform.listingId;
            existingPlatform.url = platform.url;
            existingPlatform.status = 'active';
            existingPlatform.lastSync = new Date();
          } else {
            inventoryItem.platforms.push({
              platform: platform.platform,
              listingId: platform.listingId,
              url: platform.url,
              status: 'active',
              lastSync: new Date(),
            });
          }
        }
      });

      inventoryItem.updatedAt = new Date();
      this.inventoryItems.set(inventoryItem.id, inventoryItem);
    } catch (error) {
      console.error('Failed to update inventory item:', error);
    }
  }

  // Auto-delist when item sells
  async autoDelistItem(itemId: string, soldPlatform: string): Promise<void> {
    try {
      const inventoryItem = this.inventoryItems.get(itemId);
      if (!inventoryItem) return;

      // Update sold platform status
      const soldPlatformData = inventoryItem.platforms.find(p => p.platform === soldPlatform);
      if (soldPlatformData) {
        soldPlatformData.status = 'sold';
        soldPlatformData.lastSync = new Date();
      }

      // Delist from other platforms
      const otherPlatforms = inventoryItem.platforms.filter(p => p.platform !== soldPlatform && p.status === 'active');
      
      for (const platform of otherPlatforms) {
        try {
          await this.delistFromPlatform(platform.platform, platform.listingId);
          platform.status = 'removed';
          platform.lastSync = new Date();
        } catch (error) {
          console.error(`Failed to delist from ${platform.platform}:`, error);
          platform.status = 'error';
        }
      }

      // Update inventory item status
      inventoryItem.status = 'sold';
      inventoryItem.updatedAt = new Date();
      this.inventoryItems.set(itemId, inventoryItem);

      console.log(`Auto-delisted item ${itemId} from ${otherPlatforms.length} platforms`);
    } catch (error) {
      console.error('Failed to auto-delist item:', error);
    }
  }

  // Delist from platform
  private async delistFromPlatform(platform: string, listingId: string): Promise<void> {
    // Simulate API call to delist
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Delisted ${listingId} from ${platform}`);
  }

  // Get crosslisting job
  getCrosslistingJob(jobId: string): CrosslistingJob | null {
    return this.crosslistingJobs.get(jobId) || null;
  }

  // Get user's crosslisting jobs
  getUserCrosslistingJobs(userId: string): CrosslistingJob[] {
    return Array.from(this.crosslistingJobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get inventory items
  getInventoryItems(userId: string): InventoryItem[] {
    return Array.from(this.inventoryItems.values())
      .filter(item => item.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Get crosslisting analytics
  async getCrosslistingAnalytics(userId: string): Promise<CrosslistingAnalytics> {
    const userJobs = this.getUserCrosslistingJobs(userId);
    const totalListings = userJobs.reduce((sum, job) => sum + job.targetPlatforms.length, 0);
    const successfulListings = userJobs.reduce((sum, job) => 
      sum + job.targetPlatforms.filter(p => p.status === 'completed').length, 0
    );
    const failedListings = totalListings - successfulListings;

    // Calculate platform performance
    const platformStats = new Map<string, { success: number; total: number; time: number }>();
    
    userJobs.forEach(job => {
      job.targetPlatforms.forEach(platform => {
        const stats = platformStats.get(platform.platform) || { success: 0, total: 0, time: 0 };
        stats.total++;
        if (platform.status === 'completed') {
          stats.success++;
        }
        stats.time += 2; // Simulate 2 seconds per listing
        platformStats.set(platform.platform, stats);
      });
    });

    const platformPerformance = Array.from(platformStats.entries()).map(([platform, stats]) => ({
      platform,
      successRate: (stats.success / stats.total) * 100,
      averageTime: stats.time / stats.total,
      totalListings: stats.total,
    }));

    // Calculate time saved (assuming 5 minutes per manual listing)
    const timeSaved = successfulListings * 5;

    // Calculate revenue generated (assuming 10% of listings result in sales)
    const revenueGenerated = successfulListings * 0.1 * 100; // $100 average sale

    return {
      totalListings,
      successfulListings,
      failedListings,
      platformPerformance,
      timeSaved,
      revenueGenerated,
    };
  }

  // Get platform optimization rules
  getPlatformOptimization(platform: string): PlatformOptimization | null {
    return this.platformOptimizations.get(platform) || null;
  }

  // Get all supported platforms
  getSupportedPlatforms(): string[] {
    return Array.from(this.platformOptimizations.keys());
  }
}

export const advancedCrosslistingEngine = new AdvancedCrosslistingEngine();
