// PirateShip API Types
export interface PirateShipConfig {
  apiKey: string;
  sandbox: boolean;
  baseUrl: string;
}

export interface ShippingAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface Package {
  weight: number; // in ounces
  length: number; // in inches
  width: number; // in inches
  height: number; // in inches
  value?: number; // in cents
  description?: string;
}

export interface ShipmentRequest {
  to: ShippingAddress;
  from: ShippingAddress;
  packages: Package[];
  carrierAccounts?: string[];
  serviceLevels?: string[];
  insurance?: boolean;
  signature?: boolean;
}

export interface ShippingRate {
  id: string;
  carrier: string;
  serviceLevel: string;
  rate: number; // in cents
  estimatedDays: number;
  rateData: any;
}

export interface Shipment {
  id: string;
  pirateshipShipmentId: string;
  trackingNumber: string;
  carrier: string;
  serviceLevel: string;
  toAddress: ShippingAddress;
  fromAddress: ShippingAddress;
  packageDetails: Package[];
  cost: number; // in cents
  labelUrl: string;
  status: ShipmentStatus;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ShipmentStatus = 
  | 'created'
  | 'label_generated'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'exception'
  | 'returned';

export interface TrackingInfo {
  trackingNumber: string;
  status: ShipmentStatus;
  carrier: string;
  serviceLevel: string;
  events: TrackingEvent[];
  estimatedDelivery?: Date;
  actualDelivery?: Date;
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  normalizedAddress?: ShippingAddress;
  suggestions?: ShippingAddress[];
  errors?: string[];
}

// Database Types
export interface ShippingAddressRecord {
  id: string;
  orgId: string;
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentRecord {
  id: string;
  orgId: string;
  listingId?: string;
  marketplaceOrderId?: string;
  pirateshipShipmentId?: string;
  trackingNumber?: string;
  carrier?: string;
  serviceLevel?: string;
  toAddress: ShippingAddress;
  fromAddress: ShippingAddress;
  packageDetails: Package[];
  costCents?: number;
  labelUrl?: string;
  status: ShipmentStatus;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingRateRecord {
  id: string;
  shipmentId: string;
  carrier: string;
  serviceLevel: string;
  rateCents: number;
  estimatedDays?: number;
  rateData: any;
  createdAt: Date;
}

export interface PirateShipConfigRecord {
  id: string;
  orgId: string;
  apiKey: string;
  sandbox: boolean;
  webhookUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Marketplace Integration Types
export interface MarketplaceOrder {
  id: string;
  marketplace: 'ebay' | 'poshmark' | 'mercari' | 'depop' | 'grailed' | 'vinted';
  orderNumber: string;
  buyerName: string;
  buyerEmail?: string;
  shippingAddress: ShippingAddress;
  items: MarketplaceOrderItem[];
  totalAmount: number; // in cents
  shippingCost: number; // in cents
  orderDate: Date;
  status: string;
}

export interface MarketplaceOrderItem {
  id: string;
  title: string;
  sku?: string;
  quantity: number;
  price: number; // in cents
  weight?: number; // in ounces
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

// UI Component Types
export interface ShippingDashboardStats {
  totalShipments: number;
  pendingShipments: number;
  shippedToday: number;
  totalShippingCost: number; // in cents
  averageShippingCost: number; // in cents
  onTimeDeliveryRate: number; // percentage
}

export interface BulkShippingAction {
  shipmentIds: string[];
  action: 'generate_labels' | 'print_labels' | 'mark_shipped' | 'upload_tracking';
  options?: {
    serviceLevel?: string;
    carrier?: string;
    printerSettings?: any;
  };
}
