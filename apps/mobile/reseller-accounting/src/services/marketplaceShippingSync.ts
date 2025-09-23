import { MarketplaceOrder, MarketplaceOrderItem } from '@/src/types/shipping';

export interface MarketplaceShippingSync {
  // eBay integration
  syncEbayOrders(): Promise<MarketplaceOrder[]>;
  uploadTrackingToEbay(orderId: string, trackingNumber: string, carrier: string): Promise<boolean>;
  
  // Poshmark integration
  syncPoshmarkOrders(): Promise<MarketplaceOrder[]>;
  uploadTrackingToPoshmark(orderId: string, trackingNumber: string, carrier: string): Promise<boolean>;
  
  // Mercari integration
  syncMercariOrders(): Promise<MarketplaceOrder[]>;
  uploadTrackingToMercari(orderId: string, trackingNumber: string, carrier: string): Promise<boolean>;
  
  // Depop integration
  syncDepopOrders(): Promise<MarketplaceOrder[]>;
  uploadTrackingToDepop(orderId: string, trackingNumber: string, carrier: string): Promise<boolean>;
  
  // Grailed integration
  syncGrailedOrders(): Promise<MarketplaceOrder[]>;
  uploadTrackingToGrailed(orderId: string, trackingNumber: string, carrier: string): Promise<boolean>;
  
  // Vinted integration
  syncVintedOrders(): Promise<MarketplaceOrder[]>;
  uploadTrackingToVinted(orderId: string, trackingNumber: string, carrier: string): Promise<boolean>;
}

export class MarketplaceShippingService implements MarketplaceShippingSync {
  private orgId: string;
  private baseUrl: string;

  constructor(orgId: string, baseUrl: string) {
    this.orgId = orgId;
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Marketplace API Error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  // eBay Integration
  async syncEbayOrders(): Promise<MarketplaceOrder[]> {
    try {
      const orders = await this.makeRequest<MarketplaceOrder[]>(`/marketplace/ebay/orders?orgId=${this.orgId}`);
      return orders.map(this.transformEbayOrder);
    } catch (error) {
      console.error('eBay order sync failed:', error);
      return [];
    }
  }

  async uploadTrackingToEbay(orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      await this.makeRequest(`/marketplace/ebay/orders/${orderId}/tracking`, {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber,
          carrier,
          orgId: this.orgId,
        }),
      });
      return true;
    } catch (error) {
      console.error('eBay tracking upload failed:', error);
      return false;
    }
  }

  private transformEbayOrder(order: any): MarketplaceOrder {
    return {
      id: order.orderId,
      marketplace: 'ebay',
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      shippingAddress: {
        name: order.shippingAddress.name,
        company: order.shippingAddress.company,
        street1: order.shippingAddress.street1,
        street2: order.shippingAddress.street2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
        country: order.shippingAddress.country || 'US',
        phone: order.shippingAddress.phone,
        email: order.buyerEmail,
      },
      items: order.items.map((item: any) => ({
        id: item.itemId,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: Math.round(item.price * 100), // convert to cents
        weight: item.weight,
        dimensions: item.dimensions,
      })),
      totalAmount: Math.round(order.totalAmount * 100),
      shippingCost: Math.round(order.shippingCost * 100),
      orderDate: new Date(order.orderDate),
      status: order.status,
    };
  }

  // Poshmark Integration
  async syncPoshmarkOrders(): Promise<MarketplaceOrder[]> {
    try {
      const orders = await this.makeRequest<MarketplaceOrder[]>(`/marketplace/poshmark/orders?orgId=${this.orgId}`);
      return orders.map(this.transformPoshmarkOrder);
    } catch (error) {
      console.error('Poshmark order sync failed:', error);
      return [];
    }
  }

  async uploadTrackingToPoshmark(orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      await this.makeRequest(`/marketplace/poshmark/orders/${orderId}/tracking`, {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber,
          carrier,
          orgId: this.orgId,
        }),
      });
      return true;
    } catch (error) {
      console.error('Poshmark tracking upload failed:', error);
      return false;
    }
  }

  private transformPoshmarkOrder(order: any): MarketplaceOrder {
    return {
      id: order.orderId,
      marketplace: 'poshmark',
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      shippingAddress: {
        name: order.shippingAddress.name,
        company: order.shippingAddress.company,
        street1: order.shippingAddress.street1,
        street2: order.shippingAddress.street2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
        country: order.shippingAddress.country || 'US',
        phone: order.shippingAddress.phone,
        email: order.buyerEmail,
      },
      items: order.items.map((item: any) => ({
        id: item.itemId,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: Math.round(item.price * 100),
        weight: item.weight,
        dimensions: item.dimensions,
      })),
      totalAmount: Math.round(order.totalAmount * 100),
      shippingCost: Math.round(order.shippingCost * 100),
      orderDate: new Date(order.orderDate),
      status: order.status,
    };
  }

  // Mercari Integration
  async syncMercariOrders(): Promise<MarketplaceOrder[]> {
    try {
      const orders = await this.makeRequest<MarketplaceOrder[]>(`/marketplace/mercari/orders?orgId=${this.orgId}`);
      return orders.map(this.transformMercariOrder);
    } catch (error) {
      console.error('Mercari order sync failed:', error);
      return [];
    }
  }

  async uploadTrackingToMercari(orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      await this.makeRequest(`/marketplace/mercari/orders/${orderId}/tracking`, {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber,
          carrier,
          orgId: this.orgId,
        }),
      });
      return true;
    } catch (error) {
      console.error('Mercari tracking upload failed:', error);
      return false;
    }
  }

  private transformMercariOrder(order: any): MarketplaceOrder {
    return {
      id: order.orderId,
      marketplace: 'mercari',
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      shippingAddress: {
        name: order.shippingAddress.name,
        company: order.shippingAddress.company,
        street1: order.shippingAddress.street1,
        street2: order.shippingAddress.street2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
        country: order.shippingAddress.country || 'US',
        phone: order.shippingAddress.phone,
        email: order.buyerEmail,
      },
      items: order.items.map((item: any) => ({
        id: item.itemId,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: Math.round(item.price * 100),
        weight: item.weight,
        dimensions: item.dimensions,
      })),
      totalAmount: Math.round(order.totalAmount * 100),
      shippingCost: Math.round(order.shippingCost * 100),
      orderDate: new Date(order.orderDate),
      status: order.status,
    };
  }

  // Depop Integration
  async syncDepopOrders(): Promise<MarketplaceOrder[]> {
    try {
      const orders = await this.makeRequest<MarketplaceOrder[]>(`/marketplace/depop/orders?orgId=${this.orgId}`);
      return orders.map(this.transformDepopOrder);
    } catch (error) {
      console.error('Depop order sync failed:', error);
      return [];
    }
  }

  async uploadTrackingToDepop(orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      await this.makeRequest(`/marketplace/depop/orders/${orderId}/tracking`, {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber,
          carrier,
          orgId: this.orgId,
        }),
      });
      return true;
    } catch (error) {
      console.error('Depop tracking upload failed:', error);
      return false;
    }
  }

  private transformDepopOrder(order: any): MarketplaceOrder {
    return {
      id: order.orderId,
      marketplace: 'depop',
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      shippingAddress: {
        name: order.shippingAddress.name,
        company: order.shippingAddress.company,
        street1: order.shippingAddress.street1,
        street2: order.shippingAddress.street2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
        country: order.shippingAddress.country || 'US',
        phone: order.shippingAddress.phone,
        email: order.buyerEmail,
      },
      items: order.items.map((item: any) => ({
        id: item.itemId,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: Math.round(item.price * 100),
        weight: item.weight,
        dimensions: item.dimensions,
      })),
      totalAmount: Math.round(order.totalAmount * 100),
      shippingCost: Math.round(order.shippingCost * 100),
      orderDate: new Date(order.orderDate),
      status: order.status,
    };
  }

  // Grailed Integration
  async syncGrailedOrders(): Promise<MarketplaceOrder[]> {
    try {
      const orders = await this.makeRequest<MarketplaceOrder[]>(`/marketplace/grailed/orders?orgId=${this.orgId}`);
      return orders.map(this.transformGrailedOrder);
    } catch (error) {
      console.error('Grailed order sync failed:', error);
      return [];
    }
  }

  async uploadTrackingToGrailed(orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      await this.makeRequest(`/marketplace/grailed/orders/${orderId}/tracking`, {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber,
          carrier,
          orgId: this.orgId,
        }),
      });
      return true;
    } catch (error) {
      console.error('Grailed tracking upload failed:', error);
      return false;
    }
  }

  private transformGrailedOrder(order: any): MarketplaceOrder {
    return {
      id: order.orderId,
      marketplace: 'grailed',
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      shippingAddress: {
        name: order.shippingAddress.name,
        company: order.shippingAddress.company,
        street1: order.shippingAddress.street1,
        street2: order.shippingAddress.street2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
        country: order.shippingAddress.country || 'US',
        phone: order.shippingAddress.phone,
        email: order.buyerEmail,
      },
      items: order.items.map((item: any) => ({
        id: item.itemId,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: Math.round(item.price * 100),
        weight: item.weight,
        dimensions: item.dimensions,
      })),
      totalAmount: Math.round(order.totalAmount * 100),
      shippingCost: Math.round(order.shippingCost * 100),
      orderDate: new Date(order.orderDate),
      status: order.status,
    };
  }

  // Vinted Integration
  async syncVintedOrders(): Promise<MarketplaceOrder[]> {
    try {
      const orders = await this.makeRequest<MarketplaceOrder[]>(`/marketplace/vinted/orders?orgId=${this.orgId}`);
      return orders.map(this.transformVintedOrder);
    } catch (error) {
      console.error('Vinted order sync failed:', error);
      return [];
    }
  }

  async uploadTrackingToVinted(orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    try {
      await this.makeRequest(`/marketplace/vinted/orders/${orderId}/tracking`, {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber,
          carrier,
          orgId: this.orgId,
        }),
      });
      return true;
    } catch (error) {
      console.error('Vinted tracking upload failed:', error);
      return false;
    }
  }

  private transformVintedOrder(order: any): MarketplaceOrder {
    return {
      id: order.orderId,
      marketplace: 'vinted',
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      shippingAddress: {
        name: order.shippingAddress.name,
        company: order.shippingAddress.company,
        street1: order.shippingAddress.street1,
        street2: order.shippingAddress.street2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
        country: order.shippingAddress.country || 'US',
        phone: order.shippingAddress.phone,
        email: order.buyerEmail,
      },
      items: order.items.map((item: any) => ({
        id: item.itemId,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        price: Math.round(item.price * 100),
        weight: item.weight,
        dimensions: item.dimensions,
      })),
      totalAmount: Math.round(order.totalAmount * 100),
      shippingCost: Math.round(order.shippingCost * 100),
      orderDate: new Date(order.orderDate),
      status: order.status,
    };
  }

  // Bulk operations
  async syncAllMarketplaceOrders(): Promise<MarketplaceOrder[]> {
    const allOrders: MarketplaceOrder[] = [];
    
    try {
      const [ebayOrders, poshmarkOrders, mercariOrders, depopOrders, grailedOrders, vintedOrders] = await Promise.allSettled([
        this.syncEbayOrders(),
        this.syncPoshmarkOrders(),
        this.syncMercariOrders(),
        this.syncDepopOrders(),
        this.syncGrailedOrders(),
        this.syncVintedOrders(),
      ]);

      if (ebayOrders.status === 'fulfilled') allOrders.push(...ebayOrders.value);
      if (poshmarkOrders.status === 'fulfilled') allOrders.push(...poshmarkOrders.value);
      if (mercariOrders.status === 'fulfilled') allOrders.push(...mercariOrders.value);
      if (depopOrders.status === 'fulfilled') allOrders.push(...depopOrders.value);
      if (grailedOrders.status === 'fulfilled') allOrders.push(...grailedOrders.value);
      if (vintedOrders.status === 'fulfilled') allOrders.push(...vintedOrders.value);

      return allOrders;
    } catch (error) {
      console.error('Bulk order sync failed:', error);
      return allOrders;
    }
  }

  async uploadTrackingToAllMarketplaces(orderId: string, trackingNumber: string, carrier: string): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    try {
      const [ebay, poshmark, mercari, depop, grailed, vinted] = await Promise.allSettled([
        this.uploadTrackingToEbay(orderId, trackingNumber, carrier),
        this.uploadTrackingToPoshmark(orderId, trackingNumber, carrier),
        this.uploadTrackingToMercari(orderId, trackingNumber, carrier),
        this.uploadTrackingToDepop(orderId, trackingNumber, carrier),
        this.uploadTrackingToGrailed(orderId, trackingNumber, carrier),
        this.uploadTrackingToVinted(orderId, trackingNumber, carrier),
      ]);

      results.ebay = ebay.status === 'fulfilled' ? ebay.value : false;
      results.poshmark = poshmark.status === 'fulfilled' ? poshmark.value : false;
      results.mercari = mercari.status === 'fulfilled' ? mercari.value : false;
      results.depop = depop.status === 'fulfilled' ? depop.value : false;
      results.grailed = grailed.status === 'fulfilled' ? grailed.value : false;
      results.vinted = vinted.status === 'fulfilled' ? vinted.value : false;

      return results;
    } catch (error) {
      console.error('Bulk tracking upload failed:', error);
      return results;
    }
  }
}
