import { 
  PirateShipConfig, 
  ShippingAddress, 
  ShipmentRequest, 
  ShippingRate, 
  Shipment, 
  TrackingInfo,
  AddressValidationResult,
  Package
} from '../types/shipping';

export class PirateShipService {
  private apiKey: string;
  private baseUrl: string;
  private sandbox: boolean;

  constructor(config: PirateShipConfig) {
    this.apiKey = config.apiKey;
    this.sandbox = config.sandbox;
    this.baseUrl = config.sandbox 
      ? 'https://api.pirateship.com/v1'
      : 'https://api.pirateship.com/v1';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`PirateShip API Error: ${response.status} - ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Address validation and autocomplete
  async validateAddress(address: Partial<ShippingAddress>): Promise<AddressValidationResult> {
    try {
      const result = await this.makeRequest<AddressValidationResult>('/addresses/validate', {
        method: 'POST',
        body: JSON.stringify(address),
      });
      return result;
    } catch (error) {
      console.error('Address validation failed:', error);
      return {
        isValid: false,
        errors: ['Address validation service unavailable'],
      };
    }
  }

  // Get shipping rates for a shipment request
  async getRates(shipmentRequest: ShipmentRequest): Promise<ShippingRate[]> {
    try {
      const rates = await this.makeRequest<ShippingRate[]>('/rates', {
        method: 'POST',
        body: JSON.stringify(shipmentRequest),
      });
      return rates;
    } catch (error) {
      console.error('Rate calculation failed:', error);
      throw error;
    }
  }

  // Create shipment and generate label
  async createShipment(shipmentRequest: ShipmentRequest, rateId: string): Promise<Shipment> {
    try {
      const shipment = await this.makeRequest<Shipment>('/shipments', {
        method: 'POST',
        body: JSON.stringify({
          ...shipmentRequest,
          rateId,
        }),
      });
      return shipment;
    } catch (error) {
      console.error('Shipment creation failed:', error);
      throw error;
    }
  }

  // Track package
  async trackPackage(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const tracking = await this.makeRequest<TrackingInfo>(`/tracking/${trackingNumber}`);
      return tracking;
    } catch (error) {
      console.error('Package tracking failed:', error);
      throw error;
    }
  }

  // Get shipment by ID
  async getShipment(shipmentId: string): Promise<Shipment> {
    try {
      const shipment = await this.makeRequest<Shipment>(`/shipments/${shipmentId}`);
      return shipment;
    } catch (error) {
      console.error('Get shipment failed:', error);
      throw error;
    }
  }

  // Cancel shipment
  async cancelShipment(shipmentId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/shipments/${shipmentId}/cancel`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error('Cancel shipment failed:', error);
      throw error;
    }
  }

  // Get available carriers
  async getCarriers(): Promise<string[]> {
    try {
      const carriers = await this.makeRequest<string[]>('/carriers');
      return carriers;
    } catch (error) {
      console.error('Get carriers failed:', error);
      return ['USPS', 'UPS', 'FedEx']; // fallback
    }
  }

  // Get service levels for a carrier
  async getServiceLevels(carrier: string): Promise<string[]> {
    try {
      const services = await this.makeRequest<string[]>(`/carriers/${carrier}/services`);
      return services;
    } catch (error) {
      console.error('Get service levels failed:', error);
      return []; // fallback
    }
  }

  // Calculate dimensional weight
  calculateDimensionalWeight(pkg: Package): number {
    const { length, width, height } = pkg;
    const dimensionalWeight = (length * width * height) / 139; // USPS formula
    return Math.max(pkg.weight, dimensionalWeight);
  }

  // Optimize package dimensions
  optimizePackage(pkg: Package): Package {
    const { length, width, height } = pkg;
    const dimensions = [length, width, height].sort((a, b) => b - a);
    return {
      ...pkg,
      length: dimensions[0],
      width: dimensions[1],
      height: dimensions[2],
    };
  }

  // Get best rate based on criteria
  getBestRate(rates: ShippingRate[], criteria: {
    maxCost?: number;
    maxDays?: number;
    preferredCarriers?: string[];
  } = {}): ShippingRate | null {
    let filteredRates = rates;

    // Filter by cost
    if (criteria.maxCost) {
      filteredRates = filteredRates.filter(rate => rate.rate <= criteria.maxCost!);
    }

    // Filter by delivery time
    if (criteria.maxDays) {
      filteredRates = filteredRates.filter(rate => rate.estimatedDays <= criteria.maxDays!);
    }

    // Filter by preferred carriers
    if (criteria.preferredCarriers && criteria.preferredCarriers.length > 0) {
      filteredRates = filteredRates.filter(rate => 
        criteria.preferredCarriers!.includes(rate.carrier)
      );
    }

    if (filteredRates.length === 0) {
      return null;
    }

    // Sort by cost (ascending)
    filteredRates.sort((a, b) => a.rate - b.rate);

    return filteredRates[0];
  }

  // Handle webhooks for status updates
  async handleWebhook(webhookData: any): Promise<void> {
    try {
      const { event, data } = webhookData;
      
      switch (event) {
        case 'shipment.created':
          await this.handleShipmentCreated(data);
          break;
        case 'shipment.shipped':
          await this.handleShipmentShipped(data);
          break;
        case 'shipment.delivered':
          await this.handleShipmentDelivered(data);
          break;
        case 'shipment.exception':
          await this.handleShipmentException(data);
          break;
        default:
          console.log('Unknown webhook event:', event);
      }
    } catch (error) {
      console.error('Webhook handling failed:', error);
      throw error;
    }
  }

  private async handleShipmentCreated(data: any): Promise<void> {
    // Update shipment status in database
    console.log('Shipment created:', data.shipmentId);
  }

  private async handleShipmentShipped(data: any): Promise<void> {
    // Update shipment status and sync tracking to marketplaces
    console.log('Shipment shipped:', data.trackingNumber);
  }

  private async handleShipmentDelivered(data: any): Promise<void> {
    // Update delivery status and sync to marketplaces
    console.log('Shipment delivered:', data.trackingNumber);
  }

  private async handleShipmentException(data: any): Promise<void> {
    // Handle delivery exceptions
    console.log('Shipment exception:', data);
  }
}

// Utility functions
export class ShippingUtils {
  // Format address for display
  static formatAddress(address: ShippingAddress): string {
    const parts = [
      address.name,
      address.company,
      address.street1,
      address.street2,
      `${address.city}, ${address.state} ${address.zip}`,
      address.country !== 'US' ? address.country : undefined,
    ].filter(Boolean);
    
    return parts.join('\n');
  }

  // Calculate shipping cost with markup
  static calculateShippingCost(baseRate: number, markupPercent: number = 0): number {
    return Math.round(baseRate * (1 + markupPercent / 100));
  }

  // Get shipping method display name
  static getShippingMethodDisplay(carrier: string, serviceLevel: string): string {
    const carrierNames: Record<string, string> = {
      'USPS': 'USPS',
      'UPS': 'UPS',
      'FedEx': 'FedEx',
      'DHL': 'DHL',
    };

    const serviceNames: Record<string, string> = {
      'ground': 'Ground',
      'express': 'Express',
      'overnight': 'Overnight',
      'priority': 'Priority',
      'first_class': 'First Class',
      'media_mail': 'Media Mail',
    };

    const carrierName = carrierNames[carrier] || carrier;
    const serviceName = serviceNames[serviceLevel] || serviceLevel;
    
    return `${carrierName} ${serviceName}`;
  }

  // Validate package dimensions
  static validatePackage(pkg: Package): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (pkg.weight <= 0) {
      errors.push('Weight must be greater than 0');
    }

    if (pkg.length <= 0 || pkg.width <= 0 || pkg.height <= 0) {
      errors.push('All dimensions must be greater than 0');
    }

    // USPS size limits
    const maxDimension = Math.max(pkg.length, pkg.width, pkg.height);
    if (maxDimension > 108) {
      errors.push('No dimension can exceed 108 inches');
    }

    const girth = 2 * (pkg.width + pkg.height);
    if (pkg.length + girth > 130) {
      errors.push('Length + girth cannot exceed 130 inches');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get estimated delivery date
  static getEstimatedDeliveryDate(shippingDate: Date, estimatedDays: number): Date {
    const deliveryDate = new Date(shippingDate);
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
    return deliveryDate;
  }
}
