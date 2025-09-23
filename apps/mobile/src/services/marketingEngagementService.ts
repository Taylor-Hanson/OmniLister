// Marketing & Customer Engagement Service - Social media sharing, messaging hub, and promotional tools

import { aiService } from './aiService';

export interface SocialMediaPost {
  id: string;
  userId: string;
  listingId: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'pinterest' | 'tiktok';
  content: {
    text: string;
    images: string[];
    hashtags: string[];
    mentions: string[];
  };
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledAt?: Date;
  publishedAt?: Date;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    reach: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MessagingThread {
  id: string;
  userId: string;
  platform: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  listingId: string;
  listingTitle: string;
  status: 'active' | 'closed' | 'archived';
  lastMessage: {
    id: string;
    content: string;
    sender: 'buyer' | 'seller';
    timestamp: Date;
    read: boolean;
  };
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  content: string;
  sender: 'buyer' | 'seller';
  timestamp: Date;
  read: boolean;
  attachments?: {
    type: 'image' | 'video' | 'document';
    url: string;
    name: string;
  }[];
  metadata?: {
    platform: string;
    messageId: string;
  };
}

export interface PromotionalCampaign {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: 'sale' | 'discount' | 'featured' | 'bundle';
  settings: {
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderValue?: number;
    maxDiscount?: number;
    startDate: Date;
    endDate: Date;
    platforms: string[];
    targetListings: string[];
  };
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  performance: {
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
    cost: number;
    roi: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EngagementAnalytics {
  totalPosts: number;
  totalEngagement: number;
  averageEngagementRate: number;
  platformPerformance: {
    platform: string;
    posts: number;
    engagement: number;
    engagementRate: number;
  }[];
  topPerformingPosts: {
    id: string;
    content: string;
    engagement: number;
    platform: string;
  }[];
  messagingStats: {
    totalThreads: number;
    activeThreads: number;
    responseTime: number;
    conversionRate: number;
  };
  campaignPerformance: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalRevenue: number;
    averageROI: number;
  };
}

export interface AutoResponse {
  id: string;
  userId: string;
  name: string;
  trigger: {
    keywords: string[];
    platforms: string[];
    conditions: string[];
  };
  response: {
    message: string;
    attachments?: string[];
    actions?: string[];
  };
  enabled: boolean;
  usageCount: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
}

class MarketingEngagementService {
  private socialMediaPosts: Map<string, SocialMediaPost> = new Map();
  private messagingThreads: Map<string, MessagingThread> = new Map();
  private promotionalCampaigns: Map<string, PromotionalCampaign> = new Map();
  private autoResponses: Map<string, AutoResponse> = new Map();

  // Initialize marketing engagement service
  async initialize() {
    try {
      await this.loadDefaultAutoResponses();
      console.log('Marketing engagement service initialized');
    } catch (error) {
      console.error('Failed to initialize marketing engagement service:', error);
    }
  }

  // Load default auto responses
  private async loadDefaultAutoResponses(): Promise<void> {
    const defaultResponses: AutoResponse[] = [
      {
        id: 'auto_response_price',
        userId: 'default',
        name: 'Price Inquiry Response',
        trigger: {
          keywords: ['price', 'cost', 'how much', 'expensive'],
          platforms: ['eBay', 'Facebook Marketplace', 'Mercari', 'Poshmark'],
          conditions: ['new_message'],
        },
        response: {
          message: 'Thank you for your interest! The price is as listed, but I\'m open to reasonable offers. Feel free to make an offer if you\'re interested!',
          actions: ['make_offer'],
        },
        enabled: true,
        usageCount: 0,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'auto_response_condition',
        userId: 'default',
        name: 'Condition Inquiry Response',
        trigger: {
          keywords: ['condition', 'damage', 'wear', 'used'],
          platforms: ['eBay', 'Facebook Marketplace', 'Mercari', 'Poshmark'],
          conditions: ['new_message'],
        },
        response: {
          message: 'The item is in excellent condition as described. I\'ve included detailed photos showing all angles. If you have any specific questions about the condition, please let me know!',
        },
        enabled: true,
        usageCount: 0,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'auto_response_shipping',
        userId: 'default',
        name: 'Shipping Inquiry Response',
        trigger: {
          keywords: ['shipping', 'delivery', 'when', 'time'],
          platforms: ['eBay', 'Facebook Marketplace', 'Mercari', 'Poshmark'],
          conditions: ['new_message'],
        },
        response: {
          message: 'I ship within 1-2 business days of payment. Shipping is included in the price. You\'ll receive tracking information once the item ships!',
        },
        enabled: true,
        usageCount: 0,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultResponses.forEach(response => {
      this.autoResponses.set(response.id, response);
    });
  }

  // Create social media post
  async createSocialMediaPost(
    userId: string,
    listingId: string,
    platform: SocialMediaPost['platform'],
    content: SocialMediaPost['content'],
    scheduledAt?: Date
  ): Promise<string> {
    try {
      const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const post: SocialMediaPost = {
        id: postId,
        userId,
        listingId,
        platform,
        content,
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt,
        engagement: {
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          reach: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.socialMediaPosts.set(postId, post);
      return postId;
    } catch (error) {
      console.error('Failed to create social media post:', error);
      throw error;
    }
  }

  // Generate AI-powered social media content
  async generateSocialMediaContent(
    listingInfo: {
      title: string;
      description: string;
      price: number;
      category: string;
      brand: string;
    },
    platform: SocialMediaPost['platform']
  ): Promise<SocialMediaPost['content']> {
    try {
      const prompt = `
      Generate engaging social media content for this product listing:
      
      Title: ${listingInfo.title}
      Description: ${listingInfo.description}
      Price: $${listingInfo.price}
      Category: ${listingInfo.category}
      Brand: ${listingInfo.brand}
      Platform: ${platform}
      
      Requirements:
      - Create compelling copy that drives engagement
      - Include relevant hashtags (5-10)
      - Mention the brand and key features
      - Create urgency or excitement
      - Match the platform's tone and style
      - Keep it under 280 characters for Twitter, longer for others
      
      Generate content that will maximize reach and engagement.
      `;

      const aiResponse = await aiService.generateSocialMediaContent(prompt);
      
      return {
        text: aiResponse.text,
        images: [listingInfo.title], // Would be actual image URLs
        hashtags: aiResponse.hashtags,
        mentions: aiResponse.mentions,
      };
    } catch (error) {
      console.error('Failed to generate social media content:', error);
      // Fallback content
      return {
        text: `Check out this amazing ${listingInfo.brand} ${listingInfo.title} for only $${listingInfo.price}! #${listingInfo.category.toLowerCase()} #${listingInfo.brand.toLowerCase()}`,
        images: [listingInfo.title],
        hashtags: [listingInfo.category.toLowerCase(), listingInfo.brand.toLowerCase(), 'sale'],
        mentions: [],
      };
    }
  }

  // Schedule social media post
  async scheduleSocialMediaPost(postId: string, scheduledAt: Date): Promise<boolean> {
    try {
      const post = this.socialMediaPosts.get(postId);
      if (!post) return false;

      post.status = 'scheduled';
      post.scheduledAt = scheduledAt;
      post.updatedAt = new Date();
      this.socialMediaPosts.set(postId, post);

      // In real app, would schedule with social media APIs
      console.log(`Scheduled post ${postId} for ${scheduledAt}`);
      return true;
    } catch (error) {
      console.error('Failed to schedule social media post:', error);
      return false;
    }
  }

  // Publish social media post
  async publishSocialMediaPost(postId: string): Promise<boolean> {
    try {
      const post = this.socialMediaPosts.get(postId);
      if (!post) return false;

      // Simulate publishing to social media platform
      await new Promise(resolve => setTimeout(resolve, 2000));

      post.status = 'published';
      post.publishedAt = new Date();
      post.updatedAt = new Date();
      this.socialMediaPosts.set(postId, post);

      console.log(`Published post ${postId} to ${post.platform}`);
      return true;
    } catch (error) {
      console.error('Failed to publish social media post:', error);
      const post = this.socialMediaPosts.get(postId);
      if (post) {
        post.status = 'failed';
        this.socialMediaPosts.set(postId, post);
      }
      return false;
    }
  }

  // Create messaging thread
  async createMessagingThread(
    userId: string,
    platform: string,
    buyerId: string,
    buyerName: string,
    listingId: string,
    listingTitle: string,
    initialMessage: string
  ): Promise<string> {
    try {
      const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message: Message = {
        id: `msg_${Date.now()}`,
        threadId,
        content: initialMessage,
        sender: 'buyer',
        timestamp: new Date(),
        read: false,
      };

      const thread: MessagingThread = {
        id: threadId,
        userId,
        platform,
        buyerId,
        buyerName,
        listingId,
        listingTitle,
        status: 'active',
        lastMessage: {
          id: message.id,
          content: message.content,
          sender: message.sender,
          timestamp: message.timestamp,
          read: message.read,
        },
        messages: [message],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.messagingThreads.set(threadId, thread);
      return threadId;
    } catch (error) {
      console.error('Failed to create messaging thread:', error);
      throw error;
    }
  }

  // Send message
  async sendMessage(
    threadId: string,
    content: string,
    sender: 'buyer' | 'seller',
    attachments?: Message['attachments']
  ): Promise<string> {
    try {
      const thread = this.messagingThreads.get(threadId);
      if (!thread) throw new Error('Thread not found');

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message: Message = {
        id: messageId,
        threadId,
        content,
        sender,
        timestamp: new Date(),
        read: false,
        attachments,
      };

      thread.messages.push(message);
      thread.lastMessage = {
        id: message.id,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp,
        read: message.read,
      };
      thread.updatedAt = new Date();

      this.messagingThreads.set(threadId, thread);

      // Check for auto responses
      if (sender === 'buyer') {
        await this.checkAutoResponses(thread, message);
      }

      return messageId;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Check auto responses
  private async checkAutoResponses(thread: MessagingThread, message: Message): Promise<void> {
    try {
      const userResponses = Array.from(this.autoResponses.values())
        .filter(response => response.userId === thread.userId || response.userId === 'default');

      for (const autoResponse of userResponses) {
        if (!autoResponse.enabled) continue;

        // Check if message matches trigger conditions
        const matchesKeywords = autoResponse.trigger.keywords.some(keyword =>
          message.content.toLowerCase().includes(keyword.toLowerCase())
        );

        const matchesPlatform = autoResponse.trigger.platforms.includes(thread.platform);

        if (matchesKeywords && matchesPlatform) {
          // Send auto response
          await this.sendMessage(thread.id, autoResponse.response.message, 'seller');
          
          // Update auto response stats
          autoResponse.usageCount++;
          autoResponse.updatedAt = new Date();
          this.autoResponses.set(autoResponse.id, autoResponse);
          
          console.log(`Sent auto response for thread ${thread.id}`);
          break; // Only send one auto response per message
        }
      }
    } catch (error) {
      console.error('Failed to check auto responses:', error);
    }
  }

  // Create promotional campaign
  async createPromotionalCampaign(
    userId: string,
    name: string,
    description: string,
    type: PromotionalCampaign['type'],
    settings: PromotionalCampaign['settings']
  ): Promise<string> {
    try {
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const campaign: PromotionalCampaign = {
        id: campaignId,
        userId,
        name,
        description,
        type,
        settings,
        status: 'draft',
        performance: {
          views: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          cost: 0,
          roi: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.promotionalCampaigns.set(campaignId, campaign);
      return campaignId;
    } catch (error) {
      console.error('Failed to create promotional campaign:', error);
      throw error;
    }
  }

  // Activate promotional campaign
  async activatePromotionalCampaign(campaignId: string): Promise<boolean> {
    try {
      const campaign = this.promotionalCampaigns.get(campaignId);
      if (!campaign) return false;

      // Check if campaign should be active based on dates
      const now = new Date();
      if (now >= campaign.settings.startDate && now <= campaign.settings.endDate) {
        campaign.status = 'active';
        campaign.updatedAt = new Date();
        this.promotionalCampaigns.set(campaignId, campaign);

        // Apply campaign to target listings
        await this.applyCampaignToListings(campaign);
        
        console.log(`Activated campaign ${campaignId}`);
        return true;
      } else {
        console.log(`Campaign ${campaignId} is not within active date range`);
        return false;
      }
    } catch (error) {
      console.error('Failed to activate promotional campaign:', error);
      return false;
    }
  }

  // Apply campaign to listings
  private async applyCampaignToListings(campaign: PromotionalCampaign): Promise<void> {
    try {
      // In real app, would update listing prices and apply discounts
      console.log(`Applying campaign ${campaign.id} to ${campaign.settings.targetListings.length} listings`);
      
      // Simulate applying discounts
      for (const listingId of campaign.settings.targetListings) {
        console.log(`Applied ${campaign.type} to listing ${listingId}`);
      }
    } catch (error) {
      console.error('Failed to apply campaign to listings:', error);
    }
  }

  // Create auto response
  async createAutoResponse(
    userId: string,
    name: string,
    trigger: AutoResponse['trigger'],
    response: AutoResponse['response']
  ): Promise<string> {
    try {
      const responseId = `auto_response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const autoResponse: AutoResponse = {
        id: responseId,
        userId,
        name,
        trigger,
        response,
        enabled: true,
        usageCount: 0,
        successRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.autoResponses.set(responseId, autoResponse);
      return responseId;
    } catch (error) {
      console.error('Failed to create auto response:', error);
      throw error;
    }
  }

  // Get social media posts
  getSocialMediaPosts(userId: string): SocialMediaPost[] {
    return Array.from(this.socialMediaPosts.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get messaging threads
  getMessagingThreads(userId: string): MessagingThread[] {
    return Array.from(this.messagingThreads.values())
      .filter(thread => thread.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Get messaging thread
  getMessagingThread(threadId: string): MessagingThread | null {
    return this.messagingThreads.get(threadId) || null;
  }

  // Get promotional campaigns
  getPromotionalCampaigns(userId: string): PromotionalCampaign[] {
    return Array.from(this.promotionalCampaigns.values())
      .filter(campaign => campaign.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get auto responses
  getAutoResponses(userId: string): AutoResponse[] {
    return Array.from(this.autoResponses.values())
      .filter(response => response.userId === userId || response.userId === 'default')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get engagement analytics
  async getEngagementAnalytics(userId: string): Promise<EngagementAnalytics> {
    const userPosts = this.getSocialMediaPosts(userId);
    const userThreads = this.getMessagingThreads(userId);
    const userCampaigns = this.getPromotionalCampaigns(userId);

    // Calculate social media analytics
    const totalPosts = userPosts.length;
    const totalEngagement = userPosts.reduce((sum, post) => 
      sum + post.engagement.likes + post.engagement.comments + post.engagement.shares, 0
    );
    const averageEngagementRate = totalPosts > 0 ? totalEngagement / totalPosts : 0;

    // Platform performance
    const platformStats = new Map<string, { posts: number; engagement: number }>();
    userPosts.forEach(post => {
      const stats = platformStats.get(post.platform) || { posts: 0, engagement: 0 };
      stats.posts++;
      stats.engagement += post.engagement.likes + post.engagement.comments + post.engagement.shares;
      platformStats.set(post.platform, stats);
    });

    const platformPerformance = Array.from(platformStats.entries()).map(([platform, stats]) => ({
      platform,
      posts: stats.posts,
      engagement: stats.engagement,
      engagementRate: stats.posts > 0 ? stats.engagement / stats.posts : 0,
    }));

    // Top performing posts
    const topPerformingPosts = userPosts
      .sort((a, b) => (b.engagement.likes + b.engagement.comments + b.engagement.shares) - 
                     (a.engagement.likes + a.engagement.comments + a.engagement.shares))
      .slice(0, 5)
      .map(post => ({
        id: post.id,
        content: post.content.text,
        engagement: post.engagement.likes + post.engagement.comments + post.engagement.shares,
        platform: post.platform,
      }));

    // Messaging stats
    const activeThreads = userThreads.filter(thread => thread.status === 'active').length;
    const responseTime = 2.5; // Average response time in hours
    const conversionRate = 0.15; // 15% conversion rate

    // Campaign performance
    const activeCampaigns = userCampaigns.filter(campaign => campaign.status === 'active').length;
    const totalRevenue = userCampaigns.reduce((sum, campaign) => sum + campaign.performance.revenue, 0);
    const averageROI = userCampaigns.length > 0 ? 
      userCampaigns.reduce((sum, campaign) => sum + campaign.performance.roi, 0) / userCampaigns.length : 0;

    return {
      totalPosts,
      totalEngagement,
      averageEngagementRate,
      platformPerformance,
      topPerformingPosts,
      messagingStats: {
        totalThreads: userThreads.length,
        activeThreads,
        responseTime,
        conversionRate,
      },
      campaignPerformance: {
        totalCampaigns: userCampaigns.length,
        activeCampaigns,
        totalRevenue,
        averageROI,
      },
    };
  }

  // Mark message as read
  async markMessageAsRead(threadId: string, messageId: string): Promise<boolean> {
    try {
      const thread = this.messagingThreads.get(threadId);
      if (!thread) return false;

      const message = thread.messages.find(msg => msg.id === messageId);
      if (message) {
        message.read = true;
        if (thread.lastMessage.id === messageId) {
          thread.lastMessage.read = true;
        }
        thread.updatedAt = new Date();
        this.messagingThreads.set(threadId, thread);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      return false;
    }
  }

  // Archive messaging thread
  async archiveMessagingThread(threadId: string): Promise<boolean> {
    try {
      const thread = this.messagingThreads.get(threadId);
      if (!thread) return false;

      thread.status = 'archived';
      thread.updatedAt = new Date();
      this.messagingThreads.set(threadId, thread);
      return true;
    } catch (error) {
      console.error('Failed to archive messaging thread:', error);
      return false;
    }
  }
}

export const marketingEngagementService = new MarketingEngagementService();
