// Advanced Organization System - Tag-based categorization and custom folders

export interface OrganizationTag {
  id: string;
  name: string;
  color: string;
  category: string;
  description: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFolder {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  color: string;
  icon: string;
  itemCount: number;
  subfolders: string[];
  tags: string[];
  filters: {
    category?: string;
    priceRange?: {
      min: number;
      max: number;
    };
    condition?: string;
    brand?: string;
    status?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  createdAt: Date;
  updatedAt: Date;
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
  folderId?: string;
  status: 'active' | 'sold' | 'draft' | 'paused';
  platforms: {
    platform: string;
    listingId: string;
    url: string;
    status: 'active' | 'sold' | 'removed' | 'error';
    lastSync: Date;
  }[];
  metadata: {
    source: string;
    cost: number;
    profit: number;
    views: number;
    likes: number;
    shares: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchFilter {
  query?: string;
  category?: string;
  tags?: string[];
  folderId?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  condition?: string;
  brand?: string;
  status?: string;
  platforms?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy: 'title' | 'price' | 'createdAt' | 'updatedAt' | 'views' | 'profit';
  sortOrder: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  items: InventoryItem[];
  totalCount: number;
  facets: {
    categories: { name: string; count: number }[];
    tags: { name: string; count: number }[];
    brands: { name: string; count: number }[];
    conditions: { name: string; count: number }[];
    platforms: { name: string; count: number }[];
    priceRanges: { range: string; count: number }[];
  };
  suggestions: string[];
}

export interface OrganizationAnalytics {
  totalItems: number;
  totalFolders: number;
  totalTags: number;
  categoryDistribution: { category: string; count: number }[];
  tagUsage: { tag: string; count: number }[];
  folderUsage: { folder: string; count: number }[];
  searchQueries: { query: string; count: number }[];
  popularFilters: { filter: string; count: number }[];
}

class AdvancedOrganizationSystem {
  private tags: Map<string, OrganizationTag> = new Map();
  private folders: Map<string, CustomFolder> = new Map();
  private inventoryItems: Map<string, InventoryItem> = new Map();
  private searchHistory: string[] = [];

  // Initialize organization system
  async initialize() {
    try {
      await this.loadDefaultTags();
      await this.loadDefaultFolders();
      await this.loadInventoryItems();
      
      console.log('Advanced organization system initialized');
    } catch (error) {
      console.error('Failed to initialize organization system:', error);
    }
  }

  // Load default tags
  private async loadDefaultTags(): Promise<void> {
    const defaultTags: OrganizationTag[] = [
      {
        id: 'tag_electronics',
        name: 'Electronics',
        color: '#007AFF',
        category: 'Category',
        description: 'Electronic devices and gadgets',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tag_fashion',
        name: 'Fashion',
        color: '#FF3B30',
        category: 'Category',
        description: 'Clothing and accessories',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tag_home',
        name: 'Home & Garden',
        color: '#34C759',
        category: 'Category',
        description: 'Home and garden items',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tag_vintage',
        name: 'Vintage',
        color: '#FF9500',
        category: 'Style',
        description: 'Vintage and retro items',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tag_luxury',
        name: 'Luxury',
        color: '#AF52DE',
        category: 'Style',
        description: 'High-end luxury items',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tag_quick_sale',
        name: 'Quick Sale',
        color: '#FF2D92',
        category: 'Priority',
        description: 'Items to sell quickly',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tag_high_profit',
        name: 'High Profit',
        color: '#30D158',
        category: 'Priority',
        description: 'High profit margin items',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultTags.forEach(tag => {
      this.tags.set(tag.id, tag);
    });
  }

  // Load default folders
  private async loadDefaultFolders(): Promise<void> {
    const defaultFolders: CustomFolder[] = [
      {
        id: 'folder_active_listings',
        name: 'Active Listings',
        description: 'Currently active listings across all platforms',
        color: '#34C759',
        icon: 'checkmark-circle',
        itemCount: 0,
        subfolders: [],
        tags: [],
        filters: {
          status: 'active',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'folder_draft_listings',
        name: 'Draft Listings',
        description: 'Listings in draft status',
        color: '#FF9500',
        icon: 'document-text',
        itemCount: 0,
        subfolders: [],
        tags: [],
        filters: {
          status: 'draft',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'folder_sold_items',
        name: 'Sold Items',
        description: 'Items that have been sold',
        color: '#007AFF',
        icon: 'trophy',
        itemCount: 0,
        subfolders: [],
        tags: [],
        filters: {
          status: 'sold',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'folder_electronics',
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        color: '#007AFF',
        icon: 'phone-portrait',
        itemCount: 0,
        subfolders: [],
        tags: ['tag_electronics'],
        filters: {
          category: 'Electronics',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'folder_fashion',
        name: 'Fashion',
        description: 'Clothing and accessories',
        color: '#FF3B30',
        icon: 'shirt',
        itemCount: 0,
        subfolders: [],
        tags: ['tag_fashion'],
        filters: {
          category: 'Fashion',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'folder_high_value',
        name: 'High Value Items',
        description: 'Items worth $100 or more',
        color: '#AF52DE',
        icon: 'diamond',
        itemCount: 0,
        subfolders: [],
        tags: ['tag_luxury', 'tag_high_profit'],
        filters: {
          priceRange: {
            min: 100,
            max: 10000,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultFolders.forEach(folder => {
      this.folders.set(folder.id, folder);
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
        description: 'Excellent condition iPhone 13 with 128GB storage.',
        price: 650,
        images: ['https://example.com/iphone1.jpg'],
        category: 'Electronics',
        condition: 'Excellent',
        brand: 'Apple',
        tags: ['tag_electronics', 'tag_high_profit'],
        folderId: 'folder_electronics',
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
        metadata: {
          source: 'thrift_store',
          cost: 200,
          profit: 450,
          views: 150,
          likes: 25,
          shares: 5,
        },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(),
      },
      {
        id: 'item_002',
        userId: 'user_001',
        title: 'Vintage Chanel Handbag',
        description: 'Authentic vintage Chanel handbag in excellent condition.',
        price: 1200,
        images: ['https://example.com/chanel1.jpg'],
        category: 'Fashion',
        condition: 'Excellent',
        brand: 'Chanel',
        tags: ['tag_fashion', 'tag_vintage', 'tag_luxury'],
        folderId: 'folder_fashion',
        status: 'active',
        platforms: [
          {
            platform: 'Poshmark',
            listingId: 'posh_456',
            url: 'https://poshmark.com/listing/456',
            status: 'active',
            lastSync: new Date(),
          },
        ],
        metadata: {
          source: 'estate_sale',
          cost: 300,
          profit: 900,
          views: 300,
          likes: 50,
          shares: 15,
        },
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date(),
      },
    ];

    mockItems.forEach(item => {
      this.inventoryItems.set(item.id, item);
    });

    // Update folder item counts
    this.updateFolderItemCounts();
  }

  // Create custom tag
  async createTag(
    name: string,
    color: string,
    category: string,
    description: string
  ): Promise<string> {
    try {
      const tagId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const tag: OrganizationTag = {
        id: tagId,
        name,
        color,
        category,
        description,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.tags.set(tagId, tag);
      return tagId;
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  }

  // Create custom folder
  async createFolder(
    name: string,
    description: string,
    parentId: string | undefined,
    color: string,
    icon: string,
    tags: string[],
    filters: CustomFolder['filters']
  ): Promise<string> {
    try {
      const folderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const folder: CustomFolder = {
        id: folderId,
        name,
        description,
        parentId,
        color,
        icon,
        itemCount: 0,
        subfolders: [],
        tags,
        filters,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.folders.set(folderId, folder);

      // Add to parent folder if specified
      if (parentId) {
        const parentFolder = this.folders.get(parentId);
        if (parentFolder) {
          parentFolder.subfolders.push(folderId);
          this.folders.set(parentId, parentFolder);
        }
      }

      return folderId;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  // Add item to folder
  async addItemToFolder(itemId: string, folderId: string): Promise<boolean> {
    try {
      const item = this.inventoryItems.get(itemId);
      const folder = this.folders.get(folderId);
      
      if (!item || !folder) return false;

      item.folderId = folderId;
      item.updatedAt = new Date();
      this.inventoryItems.set(itemId, item);

      // Update folder item count
      this.updateFolderItemCounts();

      return true;
    } catch (error) {
      console.error('Failed to add item to folder:', error);
      return false;
    }
  }

  // Add tags to item
  async addTagsToItem(itemId: string, tagIds: string[]): Promise<boolean> {
    try {
      const item = this.inventoryItems.get(itemId);
      if (!item) return false;

      // Add new tags
      tagIds.forEach(tagId => {
        if (!item.tags.includes(tagId)) {
          item.tags.push(tagId);
          
          // Update tag usage count
          const tag = this.tags.get(tagId);
          if (tag) {
            tag.usageCount++;
            tag.updatedAt = new Date();
            this.tags.set(tagId, tag);
          }
        }
      });

      item.updatedAt = new Date();
      this.inventoryItems.set(itemId, item);

      return true;
    } catch (error) {
      console.error('Failed to add tags to item:', error);
      return false;
    }
  }

  // Remove tags from item
  async removeTagsFromItem(itemId: string, tagIds: string[]): Promise<boolean> {
    try {
      const item = this.inventoryItems.get(itemId);
      if (!item) return false;

      // Remove tags
      tagIds.forEach(tagId => {
        const index = item.tags.indexOf(tagId);
        if (index > -1) {
          item.tags.splice(index, 1);
          
          // Update tag usage count
          const tag = this.tags.get(tagId);
          if (tag) {
            tag.usageCount = Math.max(0, tag.usageCount - 1);
            tag.updatedAt = new Date();
            this.tags.set(tagId, tag);
          }
        }
      });

      item.updatedAt = new Date();
      this.inventoryItems.set(itemId, item);

      return true;
    } catch (error) {
      console.error('Failed to remove tags from item:', error);
      return false;
    }
  }

  // Search inventory
  async searchInventory(userId: string, filter: SearchFilter): Promise<SearchResult> {
    try {
      let items = Array.from(this.inventoryItems.values())
        .filter(item => item.userId === userId);

      // Apply filters
      if (filter.query) {
        const query = filter.query.toLowerCase();
        items = items.filter(item => 
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.brand.toLowerCase().includes(query)
        );
        
        // Add to search history
        if (!this.searchHistory.includes(filter.query)) {
          this.searchHistory.unshift(filter.query);
          this.searchHistory = this.searchHistory.slice(0, 10); // Keep last 10 searches
        }
      }

      if (filter.category) {
        items = items.filter(item => item.category === filter.category);
      }

      if (filter.tags && filter.tags.length > 0) {
        items = items.filter(item => 
          filter.tags!.some(tag => item.tags.includes(tag))
        );
      }

      if (filter.folderId) {
        items = items.filter(item => item.folderId === filter.folderId);
      }

      if (filter.priceRange) {
        items = items.filter(item => 
          item.price >= filter.priceRange!.min && 
          item.price <= filter.priceRange!.max
        );
      }

      if (filter.condition) {
        items = items.filter(item => item.condition === filter.condition);
      }

      if (filter.brand) {
        items = items.filter(item => item.brand === filter.brand);
      }

      if (filter.status) {
        items = items.filter(item => item.status === filter.status);
      }

      if (filter.platforms && filter.platforms.length > 0) {
        items = items.filter(item => 
          item.platforms.some(platform => filter.platforms!.includes(platform.platform))
        );
      }

      if (filter.dateRange) {
        items = items.filter(item => 
          item.createdAt >= filter.dateRange!.start && 
          item.createdAt <= filter.dateRange!.end
        );
      }

      // Sort items
      items.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filter.sortBy) {
          case 'title':
            aValue = a.title;
            bValue = b.title;
            break;
          case 'price':
            aValue = a.price;
            bValue = b.price;
            break;
          case 'createdAt':
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
          case 'updatedAt':
            aValue = a.updatedAt;
            bValue = b.updatedAt;
            break;
          case 'views':
            aValue = a.metadata.views;
            bValue = b.metadata.views;
            break;
          case 'profit':
            aValue = a.metadata.profit;
            bValue = b.metadata.profit;
            break;
          default:
            aValue = a.title;
            bValue = b.title;
        }

        if (filter.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination
      const totalCount = items.length;
      if (filter.offset) {
        items = items.slice(filter.offset);
      }
      if (filter.limit) {
        items = items.slice(0, filter.limit);
      }

      // Generate facets
      const facets = this.generateFacets(Array.from(this.inventoryItems.values()).filter(item => item.userId === userId));

      // Generate suggestions
      const suggestions = this.generateSearchSuggestions(filter.query || '');

      return {
        items,
        totalCount,
        facets,
        suggestions,
      };
    } catch (error) {
      console.error('Failed to search inventory:', error);
      throw error;
    }
  }

  // Generate search facets
  private generateFacets(items: InventoryItem[]): SearchResult['facets'] {
    const categories = new Map<string, number>();
    const tags = new Map<string, number>();
    const brands = new Map<string, number>();
    const conditions = new Map<string, number>();
    const platforms = new Map<string, number>();
    const priceRanges = new Map<string, number>();

    items.forEach(item => {
      // Categories
      categories.set(item.category, (categories.get(item.category) || 0) + 1);
      
      // Tags
      item.tags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });
      
      // Brands
      brands.set(item.brand, (brands.get(item.brand) || 0) + 1);
      
      // Conditions
      conditions.set(item.condition, (conditions.get(item.condition) || 0) + 1);
      
      // Platforms
      item.platforms.forEach(platform => {
        platforms.set(platform.platform, (platforms.get(platform.platform) || 0) + 1);
      });
      
      // Price ranges
      const priceRange = this.getPriceRange(item.price);
      priceRanges.set(priceRange, (priceRanges.get(priceRange) || 0) + 1);
    });

    return {
      categories: Array.from(categories.entries()).map(([name, count]) => ({ name, count })),
      tags: Array.from(tags.entries()).map(([name, count]) => ({ name, count })),
      brands: Array.from(brands.entries()).map(([name, count]) => ({ name, count })),
      conditions: Array.from(conditions.entries()).map(([name, count]) => ({ name, count })),
      platforms: Array.from(platforms.entries()).map(([name, count]) => ({ name, count })),
      priceRanges: Array.from(priceRanges.entries()).map(([range, count]) => ({ range, count })),
    };
  }

  // Get price range
  private getPriceRange(price: number): string {
    if (price < 25) return '$0-$25';
    if (price < 50) return '$25-$50';
    if (price < 100) return '$50-$100';
    if (price < 250) return '$100-$250';
    if (price < 500) return '$250-$500';
    if (price < 1000) return '$500-$1000';
    return '$1000+';
  }

  // Generate search suggestions
  private generateSearchSuggestions(query: string): string[] {
    if (!query) return this.searchHistory.slice(0, 5);
    
    const suggestions: string[] = [];
    
    // Add matching search history
    this.searchHistory.forEach(history => {
      if (history.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(history);
      }
    });
    
    // Add matching brands
    const brands = Array.from(new Set(Array.from(this.inventoryItems.values()).map(item => item.brand)));
    brands.forEach(brand => {
      if (brand.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(brand);
      }
    });
    
    // Add matching categories
    const categories = Array.from(new Set(Array.from(this.inventoryItems.values()).map(item => item.category)));
    categories.forEach(category => {
      if (category.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(category);
      }
    });
    
    return suggestions.slice(0, 5);
  }

  // Update folder item counts
  private updateFolderItemCounts(): void {
    this.folders.forEach(folder => {
      const count = Array.from(this.inventoryItems.values())
        .filter(item => item.folderId === folder.id).length;
      folder.itemCount = count;
      this.folders.set(folder.id, folder);
    });
  }

  // Get tags
  getTags(category?: string): OrganizationTag[] {
    const tags = Array.from(this.tags.values());
    return category ? tags.filter(tag => tag.category === category) : tags;
  }

  // Get folders
  getFolders(parentId?: string): CustomFolder[] {
    const folders = Array.from(this.folders.values());
    return parentId ? folders.filter(folder => folder.parentId === parentId) : folders;
  }

  // Get folder
  getFolder(folderId: string): CustomFolder | null {
    return this.folders.get(folderId) || null;
  }

  // Get tag
  getTag(tagId: string): OrganizationTag | null {
    return this.tags.get(tagId) || null;
  }

  // Get inventory item
  getInventoryItem(itemId: string): InventoryItem | null {
    return this.inventoryItems.get(itemId) || null;
  }

  // Get user's inventory items
  getUserInventoryItems(userId: string): InventoryItem[] {
    return Array.from(this.inventoryItems.values())
      .filter(item => item.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Get organization analytics
  async getOrganizationAnalytics(userId: string): Promise<OrganizationAnalytics> {
    const userItems = this.getUserInventoryItems(userId);
    
    const categoryDistribution = new Map<string, number>();
    const tagUsage = new Map<string, number>();
    const folderUsage = new Map<string, number>();
    
    userItems.forEach(item => {
      // Category distribution
      categoryDistribution.set(item.category, (categoryDistribution.get(item.category) || 0) + 1);
      
      // Tag usage
      item.tags.forEach(tag => {
        tagUsage.set(tag, (tagUsage.get(tag) || 0) + 1);
      });
      
      // Folder usage
      if (item.folderId) {
        folderUsage.set(item.folderId, (folderUsage.get(item.folderId) || 0) + 1);
      }
    });

    return {
      totalItems: userItems.length,
      totalFolders: this.getFolders().length,
      totalTags: this.getTags().length,
      categoryDistribution: Array.from(categoryDistribution.entries()).map(([category, count]) => ({ category, count })),
      tagUsage: Array.from(tagUsage.entries()).map(([tag, count]) => ({ tag, count })),
      folderUsage: Array.from(folderUsage.entries()).map(([folder, count]) => ({ folder, count })),
      searchQueries: this.searchHistory.map(query => ({ query, count: 1 })),
      popularFilters: [], // Would be populated from actual usage data
    };
  }

  // Get search history
  getSearchHistory(): string[] {
    return this.searchHistory;
  }

  // Clear search history
  clearSearchHistory(): void {
    this.searchHistory = [];
  }
}

export const advancedOrganizationSystem = new AdvancedOrganizationSystem();
