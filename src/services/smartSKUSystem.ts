// Smart SKU + QR Code System - Advanced inventory management

import { aiService } from './aiService';

export interface ProductMetadata {
  category: string;
  brand: string;
  model: string;
  color: string;
  size: string;
  condition: string;
  material: string;
  style: string;
  season: string;
  tags: string[];
}

export interface SKU {
  id: string;
  code: string;
  productName: string;
  metadata: ProductMetadata;
  costBasis: number;
  sourcingDate: Date;
  location: string;
  condition: string;
  photos: string[];
  notes: string;
  qrCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  type: 'warehouse' | 'store' | 'home' | 'storage';
  capacity: number;
  currentStock: number;
  isActive: boolean;
}

export interface Batch {
  id: string;
  name: string;
  description: string;
  skus: string[];
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  notes: string;
}

export interface InventoryMovement {
  id: string;
  skuId: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  reason: 'sale' | 'transfer' | 'return' | 'adjustment';
  timestamp: Date;
  userId: string;
  notes: string;
}

export interface InventoryReport {
  totalSKUs: number;
  activeSKUs: number;
  totalValue: number;
  byLocation: {
    location: string;
    count: number;
    value: number;
  }[];
  byCategory: {
    category: string;
    count: number;
    value: number;
  }[];
  byCondition: {
    condition: string;
    count: number;
    value: number;
  }[];
  lowStock: SKU[];
  overstock: SKU[];
}

class SmartSKUSystem {
  private skus: Map<string, SKU> = new Map();
  private locations: Map<string, Location> = new Map();
  private batches: Map<string, Batch> = new Map();
  private movements: InventoryMovement[] = [];
  private isGenerating: boolean = false;

  // Initialize SKU system
  async initialize() {
    await this.loadDefaultLocations();
    await this.startSKUGeneration();
  }

  // Load default locations
  private async loadDefaultLocations() {
    const defaultLocations: Location[] = [
      {
        id: 'warehouse_main',
        name: 'Main Warehouse',
        address: '123 Storage St, City, State 12345',
        type: 'warehouse',
        capacity: 10000,
        currentStock: 0,
        isActive: true,
      },
      {
        id: 'store_front',
        name: 'Store Front',
        address: '456 Retail Ave, City, State 12345',
        type: 'store',
        capacity: 1000,
        currentStock: 0,
        isActive: true,
      },
      {
        id: 'home_office',
        name: 'Home Office',
        address: '789 Home St, City, State 12345',
        type: 'home',
        capacity: 500,
        currentStock: 0,
        isActive: true,
      },
    ];

    for (const location of defaultLocations) {
      this.locations.set(location.id, location);
    }

    console.log('Default locations loaded:', defaultLocations);
  }

  // Start SKU generation
  private async startSKUGeneration() {
    this.isGenerating = true;
    console.log('SKU generation system started');
  }

  // Generate SKU using AI
  async generateSKU(
    productName: string,
    metadata: Partial<ProductMetadata>,
    costBasis: number,
    location: string
  ): Promise<SKU> {
    try {
      // Use AI to analyze product and generate metadata
      const aiMetadata = await this.analyzeProductWithAI(productName, metadata);
      
      // Generate SKU code
      const skuCode = await this.generateSKUCode(aiMetadata);
      
      // Generate QR code
      const qrCode = await this.generateQRCode(skuCode);
      
      // Create SKU
      const sku: SKU = {
        id: `sku_${Date.now()}`,
        code: skuCode,
        productName,
        metadata: aiMetadata,
        costBasis,
        sourcingDate: new Date(),
        location,
        condition: metadata.condition || 'New',
        photos: [],
        notes: '',
        qrCode,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.skus.set(sku.id, sku);
      
      // Update location stock
      const locationData = this.locations.get(location);
      if (locationData) {
        locationData.currentStock += 1;
      }

      console.log('SKU generated:', sku);
      return sku;
    } catch (error) {
      console.error('Failed to generate SKU:', error);
      throw error;
    }
  }

  // Analyze product with AI
  private async analyzeProductWithAI(
    productName: string,
    metadata: Partial<ProductMetadata>
  ): Promise<ProductMetadata> {
    try {
      const prompt = `
      Analyze this product and extract metadata:
      
      Product Name: ${productName}
      Existing Metadata: ${JSON.stringify(metadata)}
      
      Extract and return:
      - category (Electronics, Clothing, Collectibles, etc.)
      - brand (if identifiable)
      - model (if applicable)
      - color (primary color)
      - size (if applicable)
      - condition (New, Like New, Good, Fair, Poor)
      - material (if applicable)
      - style (if applicable)
      - season (if applicable)
      - tags (relevant keywords)
      
      Return as JSON object.
      `;

      const aiResponse = await aiService.analyzeProductMetadata(prompt);
      return aiResponse.metadata;
    } catch (error) {
      console.error('Failed to analyze product with AI:', error);
      // Fallback to basic metadata
      return {
        category: metadata.category || 'General',
        brand: metadata.brand || 'Unknown',
        model: metadata.model || '',
        color: metadata.color || 'Unknown',
        size: metadata.size || '',
        condition: metadata.condition || 'New',
        material: metadata.material || '',
        style: metadata.style || '',
        season: metadata.season || '',
        tags: metadata.tags || [],
      };
    }
  }

  // Generate SKU code
  private async generateSKUCode(metadata: ProductMetadata): Promise<string> {
    // Generate SKU code based on metadata
    const categoryCode = metadata.category.substring(0, 3).toUpperCase();
    const brandCode = metadata.brand.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const randomCode = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    return `${categoryCode}-${brandCode}-${timestamp}-${randomCode}`;
  }

  // Generate QR code
  private async generateQRCode(skuCode: string): Promise<string> {
    // In real app, use QR code generation library
    // For now, return a mock QR code data URL
    return `data:image/png;base64,QR_CODE_${skuCode}`;
  }

  // Get SKU by ID
  getSKU(skuId: string): SKU | undefined {
    return this.skus.get(skuId);
  }

  // Get SKU by code
  getSKUByCode(skuCode: string): SKU | undefined {
    return Array.from(this.skus.values()).find(sku => sku.code === skuCode);
  }

  // Update SKU
  async updateSKU(skuId: string, updates: Partial<SKU>): Promise<boolean> {
    const sku = this.skus.get(skuId);
    if (!sku) return false;

    const updatedSKU = { ...sku, ...updates, updatedAt: new Date() };
    this.skus.set(skuId, updatedSKU);
    
    console.log(`SKU ${skuId} updated:`, updates);
    return true;
  }

  // Move SKU between locations
  async moveSKU(
    skuId: string,
    fromLocation: string,
    toLocation: string,
    reason: InventoryMovement['reason'],
    userId: string,
    notes?: string
  ): Promise<boolean> {
    const sku = this.skus.get(skuId);
    if (!sku) return false;

    // Update SKU location
    sku.location = toLocation;
    sku.updatedAt = new Date();

    // Update location stock
    const fromLocationData = this.locations.get(fromLocation);
    const toLocationData = this.locations.get(toLocation);
    
    if (fromLocationData) fromLocationData.currentStock -= 1;
    if (toLocationData) toLocationData.currentStock += 1;

    // Record movement
    const movement: InventoryMovement = {
      id: `movement_${Date.now()}`,
      skuId,
      fromLocation,
      toLocation,
      quantity: 1,
      reason,
      timestamp: new Date(),
      userId,
      notes: notes || '',
    };

    this.movements.push(movement);
    
    console.log(`SKU ${skuId} moved from ${fromLocation} to ${toLocation}`);
    return true;
  }

  // Create batch
  async createBatch(
    name: string,
    description: string,
    skuIds: string[]
  ): Promise<Batch> {
    const batch: Batch = {
      id: `batch_${Date.now()}`,
      name,
      description,
      skus: skuIds,
      status: 'pending',
      createdAt: new Date(),
      notes: '',
    };

    this.batches.set(batch.id, batch);
    console.log('Batch created:', batch);
    return batch;
  }

  // Process batch
  async processBatch(batchId: string): Promise<boolean> {
    const batch = this.batches.get(batchId);
    if (!batch) return false;

    batch.status = 'processing';
    
    // Process each SKU in the batch
    for (const skuId of batch.skus) {
      const sku = this.skus.get(skuId);
      if (sku) {
        // Apply batch processing logic
        sku.updatedAt = new Date();
      }
    }

    batch.status = 'completed';
    batch.completedAt = new Date();
    
    console.log(`Batch ${batchId} processed successfully`);
    return true;
  }

  // Generate inventory report
  async generateInventoryReport(): Promise<InventoryReport> {
    const allSKUs = Array.from(this.skus.values());
    const activeSKUs = allSKUs.filter(sku => sku.isActive);
    
    const totalValue = activeSKUs.reduce((sum, sku) => sum + sku.costBasis, 0);
    
    // Group by location
    const byLocation = new Map<string, { count: number; value: number }>();
    for (const sku of activeSKUs) {
      if (!byLocation.has(sku.location)) {
        byLocation.set(sku.location, { count: 0, value: 0 });
      }
      const data = byLocation.get(sku.location)!;
      data.count += 1;
      data.value += sku.costBasis;
    }

    // Group by category
    const byCategory = new Map<string, { count: number; value: number }>();
    for (const sku of activeSKUs) {
      if (!byCategory.has(sku.metadata.category)) {
        byCategory.set(sku.metadata.category, { count: 0, value: 0 });
      }
      const data = byCategory.get(sku.metadata.category)!;
      data.count += 1;
      data.value += sku.costBasis;
    }

    // Group by condition
    const byCondition = new Map<string, { count: number; value: number }>();
    for (const sku of activeSKUs) {
      if (!byCondition.has(sku.condition)) {
        byCondition.set(sku.condition, { count: 0, value: 0 });
      }
      const data = byCondition.get(sku.condition)!;
      data.count += 1;
      data.value += sku.costBasis;
    }

    // Find low stock and overstock
    const lowStock = activeSKUs.filter(sku => sku.costBasis < 50); // Mock threshold
    const overstock = activeSKUs.filter(sku => sku.costBasis > 500); // Mock threshold

    return {
      totalSKUs: allSKUs.length,
      activeSKUs: activeSKUs.length,
      totalValue,
      byLocation: Array.from(byLocation.entries()).map(([location, data]) => ({
        location,
        count: data.count,
        value: data.value,
      })),
      byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value,
      })),
      byCondition: Array.from(byCondition.entries()).map(([condition, data]) => ({
        condition,
        count: data.count,
        value: data.value,
      })),
      lowStock,
      overstock,
    };
  }

  // Search SKUs
  searchSKUs(query: string): SKU[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.skus.values()).filter(sku => 
      sku.productName.toLowerCase().includes(searchTerm) ||
      sku.code.toLowerCase().includes(searchTerm) ||
      sku.metadata.brand.toLowerCase().includes(searchTerm) ||
      sku.metadata.category.toLowerCase().includes(searchTerm) ||
      sku.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Get all locations
  getAllLocations(): Location[] {
    return Array.from(this.locations.values());
  }

  // Get all batches
  getAllBatches(): Batch[] {
    return Array.from(this.batches.values());
  }

  // Get inventory movements
  getInventoryMovements(skuId?: string): InventoryMovement[] {
    if (skuId) {
      return this.movements.filter(movement => movement.skuId === skuId);
    }
    return this.movements;
  }

  // Get SKUs by location
  getSKUsByLocation(locationId: string): SKU[] {
    return Array.from(this.skus.values()).filter(sku => sku.location === locationId);
  }

  // Get SKUs by category
  getSKUsByCategory(category: string): SKU[] {
    return Array.from(this.skus.values()).filter(sku => sku.metadata.category === category);
  }

  // Stop SKU generation
  stopSKUGeneration() {
    this.isGenerating = false;
  }
}

export const smartSKUSystem = new SmartSKUSystem();
