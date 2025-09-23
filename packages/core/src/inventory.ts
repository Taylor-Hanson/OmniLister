import { z } from 'zod';

export interface InventoryItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  price: number;
  cost?: number;
  quantity: number;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  condition?: string;
  images?: string[];
  sku?: string;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'inches' | 'cm';
  };
  tags?: string[];
  notes?: string;
  status: 'active' | 'sold' | 'reserved' | 'inactive';
  createdAt: number;
  updatedAt: number;
}

export interface InventoryMetrics {
  id: string;
  userId: string;
  listingId?: string;
  costOfGoods?: number;
  listDate: number;
  ageInDays: number;
  turnoverRate?: number;
  category?: string;
  status: 'active' | 'sold' | 'stale' | 'dead';
  updatedAt: number;
}

export interface InventoryStats {
  totalItems: number;
  activeItems: number;
  soldItems: number;
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  turnoverRate: number;
  staleItems: number; // Items older than 90 days
  deadItems: number; // Items older than 180 days
}

export interface InventoryFilter {
  status?: string[];
  category?: string[];
  brand?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  ageRange?: {
    min: number; // days
    max: number; // days
  };
  tags?: string[];
  search?: string;
}

export class InventoryManager {
  private items: Map<string, InventoryItem> = new Map();
  private metrics: Map<string, InventoryMetrics> = new Map();

  constructor() {}

  /**
   * Add inventory item
   */
  addItem(item: InventoryItem): void {
    this.items.set(item.id, item);
    this.updateMetrics(item);
  }

  /**
   * Get inventory item
   */
  getItem(itemId: string): InventoryItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Update inventory item
   */
  updateItem(itemId: string, updates: Partial<InventoryItem>): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    const updatedItem = { ...item, ...updates, updatedAt: Date.now() };
    this.items.set(itemId, updatedItem);
    this.updateMetrics(updatedItem);
    return true;
  }

  /**
   * Remove inventory item
   */
  removeItem(itemId: string): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    this.items.delete(itemId);
    this.metrics.delete(itemId);
    return true;
  }

  /**
   * Get user's inventory items
   */
  getUserItems(userId: string, filter?: InventoryFilter): InventoryItem[] {
    let items = Array.from(this.items.values()).filter(item => item.userId === userId);

    if (filter) {
      items = this.applyFilter(items, filter);
    }

    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Apply filter to inventory items
   */
  private applyFilter(items: InventoryItem[], filter: InventoryFilter): InventoryItem[] {
    return items.filter(item => {
      // Status filter
      if (filter.status && filter.status.length > 0) {
        if (!filter.status.includes(item.status)) return false;
      }

      // Category filter
      if (filter.category && filter.category.length > 0) {
        if (!item.category || !filter.category.includes(item.category)) return false;
      }

      // Brand filter
      if (filter.brand && filter.brand.length > 0) {
        if (!item.brand || !filter.brand.includes(item.brand)) return false;
      }

      // Price range filter
      if (filter.priceRange) {
        if (item.price < filter.priceRange.min || item.price > filter.priceRange.max) {
          return false;
        }
      }

      // Age range filter
      if (filter.ageRange) {
        const age = this.getItemAge(item);
        if (age < filter.ageRange.min || age > filter.ageRange.max) {
          return false;
        }
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        if (!item.tags || !filter.tags.some(tag => item.tags!.includes(tag))) {
          return false;
        }
      }

      // Search filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const searchableText = [
          item.title,
          item.description,
          item.brand,
          item.category,
          item.tags?.join(' ')
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) return false;
      }

      return true;
    });
  }

  /**
   * Get inventory statistics for user
   */
  getUserStats(userId: string): InventoryStats {
    const items = this.getUserItems(userId);
    const now = Date.now();

    const totalItems = items.length;
    const activeItems = items.filter(item => item.status === 'active').length;
    const soldItems = items.filter(item => item.status === 'sold').length;
    const staleItems = items.filter(item => this.getItemAge(item) > 90).length;
    const deadItems = items.filter(item => this.getItemAge(item) > 180).length;

    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalCost = items.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);
    const totalProfit = totalValue - totalCost;
    const averageMargin = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0;

    // Calculate turnover rate (items sold per month)
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    const recentSoldItems = items.filter(item => 
      item.status === 'sold' && item.updatedAt > oneMonthAgo
    ).length;
    const turnoverRate = totalItems > 0 ? (recentSoldItems / totalItems) * 100 : 0;

    return {
      totalItems,
      activeItems,
      soldItems,
      totalValue,
      totalCost,
      totalProfit,
      averageMargin,
      turnoverRate,
      staleItems,
      deadItems
    };
  }

  /**
   * Get inventory metrics for item
   */
  getItemMetrics(itemId: string): InventoryMetrics | undefined {
    return this.metrics.get(itemId);
  }

  /**
   * Get user's inventory metrics
   */
  getUserMetrics(userId: string): InventoryMetrics[] {
    return Array.from(this.metrics.values()).filter(metric => {
      const item = this.items.get(metric.id);
      return item?.userId === userId;
    });
  }

  /**
   * Update inventory metrics
   */
  private updateMetrics(item: InventoryItem): void {
    const ageInDays = this.getItemAge(item);
    const existingMetrics = this.metrics.get(item.id);

    const metrics: InventoryMetrics = {
      id: item.id,
      userId: item.userId,
      listingId: existingMetrics?.listingId,
      costOfGoods: item.cost,
      listDate: item.createdAt,
      ageInDays,
      turnoverRate: existingMetrics?.turnoverRate,
      category: item.category,
      status: this.getMetricsStatus(item, ageInDays),
      updatedAt: Date.now()
    };

    this.metrics.set(item.id, metrics);
  }

  /**
   * Get item age in days
   */
  private getItemAge(item: InventoryItem): number {
    const now = Date.now();
    const diffMs = now - item.createdAt;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get metrics status based on item and age
   */
  private getMetricsStatus(item: InventoryItem, ageInDays: number): 'active' | 'sold' | 'stale' | 'dead' {
    if (item.status === 'sold') return 'sold';
    if (ageInDays > 180) return 'dead';
    if (ageInDays > 90) return 'stale';
    return 'active';
  }

  /**
   * Search inventory items
   */
  searchItems(userId: string, query: string): InventoryItem[] {
    const items = this.getUserItems(userId);
    const queryLower = query.toLowerCase();

    return items.filter(item => {
      const searchableText = [
        item.title,
        item.description,
        item.brand,
        item.category,
        item.sku,
        item.tags?.join(' ')
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(queryLower);
    });
  }

  /**
   * Get items by category
   */
  getItemsByCategory(userId: string, category: string): InventoryItem[] {
    return this.getUserItems(userId).filter(item => item.category === category);
  }

  /**
   * Get items by brand
   */
  getItemsByBrand(userId: string, brand: string): InventoryItem[] {
    return this.getUserItems(userId).filter(item => item.brand === brand);
  }

  /**
   * Get stale items (older than 90 days)
   */
  getStaleItems(userId: string): InventoryItem[] {
    return this.getUserItems(userId).filter(item => this.getItemAge(item) > 90);
  }

  /**
   * Get dead items (older than 180 days)
   */
  getDeadItems(userId: string): InventoryItem[] {
    return this.getUserItems(userId).filter(item => this.getItemAge(item) > 180);
  }
}

// Inventory validation schemas
export const InventoryItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().positive(),
  cost: z.number().positive().optional(),
  quantity: z.number().int().positive().default(1),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  material: z.string().max(100).optional(),
  condition: z.string().max(100).optional(),
  images: z.array(z.string().url()).max(12).optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(['inches', 'cm'])
  }).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['active', 'sold', 'reserved', 'inactive']).default('active')
});

export const InventoryFilterSchema = z.object({
  status: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  brand: z.array(z.string()).optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).optional(),
  ageRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional()
});

// Inventory utilities
export const inventoryUtils = {
  /**
   * Calculate inventory value
   */
  calculateValue: (items: InventoryItem[]): number => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  /**
   * Calculate inventory cost
   */
  calculateCost: (items: InventoryItem[]): number => {
    return items.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);
  },

  /**
   * Calculate profit margin
   */
  calculateMargin: (value: number, cost: number): number => {
    if (value === 0) return 0;
    return ((value - cost) / value) * 100;
  },

  /**
   * Format inventory value
   */
  formatValue: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  },

  /**
   * Get category display name
   */
  getCategoryDisplayName: (category: string): string => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  },

  /**
   * Generate SKU
   */
  generateSku: (brand?: string, category?: string): string => {
    const brandPrefix = brand ? brand.substring(0, 3).toUpperCase() : 'GEN';
    const categoryPrefix = category ? category.substring(0, 3).toUpperCase() : 'CAT';
    const timestamp = Date.now().toString().slice(-6);
    return `${brandPrefix}-${categoryPrefix}-${timestamp}`;
  },

  /**
   * Validate inventory item
   */
  validateItem: (item: unknown): { isValid: boolean; data?: InventoryItem; errors?: string[] } => {
    try {
      const result = InventoryItemSchema.parse(item);
      return { isValid: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return { isValid: false, errors: ['Unknown validation error'] };
    }
  }
};
