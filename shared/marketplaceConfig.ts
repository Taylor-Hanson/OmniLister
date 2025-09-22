export type MarketplaceCategory = 
  | "general"
  | "fashion"
  | "luxury"
  | "sneakers"
  | "collectibles"
  | "electronics"
  | "furniture"
  | "music"
  | "local";

export type AuthType = 
  | "oauth"
  | "api_key"
  | "username_password"
  | "manual"
  | "none";

export interface MarketplaceConfig {
  id: string;
  name: string;
  description: string;
  category: MarketplaceCategory;
  icon: string; // Font Awesome or React Icons class
  color: string; // Tailwind color class
  authType: AuthType;
  features: string[];
  requiredCredentials?: {
    label: string;
    key: string;
    type: "text" | "password" | "textarea";
    placeholder?: string;
    help?: string;
  }[];
  apiAvailable: boolean;
  popular: boolean;
  comingSoon?: boolean;
}

export const marketplaces: Record<string, MarketplaceConfig> = {
  // Major General Marketplaces
  ebay: {
    id: "ebay",
    name: "eBay",
    description: "World's largest online marketplace",
    category: "general",
    icon: "fab fa-ebay",
    color: "bg-blue-600",
    authType: "oauth",
    features: ["Auction & Buy Now", "Global Reach", "Seller Protection"],
    apiAvailable: true,
    popular: true,
  },
  mercari: {
    id: "mercari",
    name: "Mercari",
    description: "Mobile-first marketplace for everything",
    category: "general",
    icon: "fas fa-shopping-bag",
    color: "bg-red-500",
    authType: "username_password",
    features: ["Mobile First", "Easy Selling", "Smart Pricing"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Mercari password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  facebook: {
    id: "facebook",
    name: "Facebook Marketplace",
    description: "Local and shipping marketplace on Facebook",
    category: "general",
    icon: "fab fa-facebook",
    color: "bg-blue-600",
    authType: "username_password",
    features: ["Local Sales", "Social Integration", "No Selling Fees"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Facebook password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  offerup: {
    id: "offerup",
    name: "OfferUp",
    description: "Local marketplace for buying and selling",
    category: "local",
    icon: "fas fa-handshake",
    color: "bg-green-600",
    authType: "username_password",
    features: ["Local Focus", "In-App Messaging", "TruYou Verification"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your OfferUp password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  craigslist: {
    id: "craigslist",
    name: "Craigslist",
    description: "Local classifieds and forums",
    category: "local",
    icon: "fas fa-list",
    color: "bg-purple-600",
    authType: "username_password",
    features: ["Local Only", "No Fees", "Anonymous Posting"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Craigslist password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  bonanza: {
    id: "bonanza",
    name: "Bonanza",
    description: "Marketplace for unique and handmade items",
    category: "general",
    icon: "fas fa-gem",
    color: "bg-orange-500",
    authType: "api_key",
    features: ["Google Shopping", "Low Fees", "Import from eBay"],
    requiredCredentials: [
      { label: "API Key", key: "apiKey", type: "password", placeholder: "Enter your Bonanza API key" },
      { label: "API Name", key: "apiName", type: "text", placeholder: "Enter your API cert name" },
    ],
    apiAvailable: true,
    popular: false,
  },
  etsy: {
    id: "etsy",
    name: "Etsy",
    description: "Marketplace for handmade and vintage items",
    category: "general",
    icon: "fab fa-etsy",
    color: "bg-orange-600",
    authType: "username_password",
    features: ["Handmade Focus", "Creative Community", "Custom Orders"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Etsy password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  amazon: {
    id: "amazon",
    name: "Amazon",
    description: "World's largest e-commerce platform",
    category: "general",
    icon: "fab fa-amazon",
    color: "bg-yellow-500",
    authType: "api_key",
    features: ["FBA Available", "Prime Eligible", "Global Reach"],
    requiredCredentials: [
      { label: "Seller ID", key: "sellerId", type: "text", placeholder: "Your Amazon Seller ID" },
      { label: "MWS Auth Token", key: "mwsToken", type: "password", placeholder: "Your MWS Auth Token" },
      { label: "Access Key", key: "accessKey", type: "password", placeholder: "Your Access Key" },
      { label: "Secret Key", key: "secretKey", type: "password", placeholder: "Your Secret Key" },
    ],
    apiAvailable: true,
    popular: true,
  },
  shopify: {
    id: "shopify",
    name: "Shopify",
    description: "E-commerce platform for online stores",
    category: "general",
    icon: "fas fa-shopping-cart",
    color: "bg-green-600",
    authType: "oauth",
    features: ["Multi-channel Sales", "Product Variants", "SEO Optimization", "Inventory Sync"],
    requiredCredentials: [
      { label: "Shop URL", key: "shopUrl", type: "text", placeholder: "yourshop.myshopify.com" },
      { label: "Access Token", key: "accessToken", type: "password", placeholder: "Your Shopify access token" },
    ],
    apiAvailable: true,
    popular: true,
  },

  // Fashion Marketplaces
  poshmark: {
    id: "poshmark",
    name: "Poshmark",
    description: "Social marketplace for fashion",
    category: "fashion",
    icon: "fas fa-tshirt",
    color: "bg-pink-500",
    authType: "username_password",
    features: ["Fashion Focus", "Social Features", "Authentication Service"],
    requiredCredentials: [
      { label: "Username", key: "username", type: "text", placeholder: "Your Poshmark username" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Poshmark password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  depop: {
    id: "depop",
    name: "Depop",
    description: "Fashion marketplace for Gen Z",
    category: "fashion",
    icon: "fas fa-mobile-alt",
    color: "bg-red-400",
    authType: "username_password",
    features: ["Fashion Focus", "Young Audience", "Social Discovery"],
    requiredCredentials: [
      { label: "Username", key: "username", type: "text", placeholder: "Your Depop username" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Depop password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  vinted: {
    id: "vinted",
    name: "Vinted",
    description: "Platform for secondhand clothes",
    category: "fashion",
    icon: "fas fa-recycle",
    color: "bg-green-600",
    authType: "username_password",
    features: ["No Selling Fees", "Buyer Protection", "European Focus"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Vinted password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  grailed: {
    id: "grailed",
    name: "Grailed",
    description: "Men's designer fashion marketplace",
    category: "fashion",
    icon: "fas fa-user-tie",
    color: "bg-gray-800",
    authType: "api_key",
    features: ["Designer Focus", "Authentication", "Curated Selection"],
    requiredCredentials: [
      { label: "API Key", key: "apiKey", type: "password", placeholder: "Enter your Grailed API key" },
    ],
    apiAvailable: true,
    popular: true,
  },
  kidizen: {
    id: "kidizen",
    name: "Kidizen",
    description: "Kids' clothing marketplace",
    category: "fashion",
    icon: "fas fa-baby",
    color: "bg-purple-500",
    authType: "username_password",
    features: ["Kids Focus", "Bundle Deals", "Community"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Kidizen password" },
    ],
    apiAvailable: false,
    popular: false,
  },
  curtsy: {
    id: "curtsy",
    name: "Curtsy",
    description: "Women's fashion resale app",
    category: "fashion",
    icon: "fas fa-dress",
    color: "bg-pink-400",
    authType: "username_password",
    features: ["Women's Fashion", "Size Filters", "Style Matching"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Curtsy password" },
    ],
    apiAvailable: false,
    popular: false,
  },
  thredup: {
    id: "thredup",
    name: "ThredUp",
    description: "Online consignment and thrift store",
    category: "fashion",
    icon: "fas fa-shirt",
    color: "bg-teal-500",
    authType: "api_key",
    features: ["Consignment", "Clean Out Kits", "Quality Standards"],
    requiredCredentials: [
      { label: "Seller Token", key: "sellerToken", type: "password", placeholder: "Your ThredUp seller token" },
    ],
    apiAvailable: true,
    popular: true,
  },

  // Luxury Marketplaces
  vestiaire: {
    id: "vestiaire",
    name: "Vestiaire Collective",
    description: "Global luxury fashion marketplace",
    category: "luxury",
    icon: "fas fa-crown",
    color: "bg-yellow-600",
    authType: "username_password",
    features: ["Authentication", "Global Shipping", "Concierge Service"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Vestiaire password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  therealreal: {
    id: "therealreal",
    name: "TheRealReal",
    description: "Authenticated luxury consignment",
    category: "luxury",
    icon: "fas fa-diamond",
    color: "bg-black",
    authType: "manual",
    features: ["Authentication", "White Glove Service", "Consignment"],
    requiredCredentials: [
      { label: "Consignor ID", key: "consignorId", type: "text", placeholder: "Your consignor ID" },
    ],
    apiAvailable: false,
    popular: true,
  },
  tradesy: {
    id: "tradesy",
    name: "Tradesy",
    description: "Luxury fashion resale",
    category: "luxury",
    icon: "fas fa-shopping-bag",
    color: "bg-pink-600",
    authType: "username_password",
    features: ["Return Policy", "Authentication", "Data-Driven Pricing"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Tradesy password" },
    ],
    apiAvailable: false,
    popular: false,
  },
  rebag: {
    id: "rebag",
    name: "Rebag",
    description: "Luxury handbag marketplace",
    category: "luxury",
    icon: "fas fa-briefcase",
    color: "bg-purple-600",
    authType: "manual",
    features: ["Instant Quotes", "Authentication", "Infinity Program"],
    apiAvailable: false,
    popular: false,
    comingSoon: true,
  },
  firstdibs: {
    id: "firstdibs",
    name: "1stDibs",
    description: "Luxury furniture and art marketplace",
    category: "furniture",
    icon: "fas fa-couch",
    color: "bg-amber-600",
    authType: "manual",
    features: ["High-End Items", "Interior Design", "Auction House"],
    apiAvailable: false,
    popular: false,
    comingSoon: true,
  },

  // Sneaker Marketplaces
  stockx: {
    id: "stockx",
    name: "StockX",
    description: "Stock market for sneakers and streetwear",
    category: "sneakers",
    icon: "fas fa-chart-line",
    color: "bg-green-500",
    authType: "api_key",
    features: ["Authentication", "Bid/Ask System", "Market Data"],
    requiredCredentials: [
      { label: "API Key", key: "apiKey", type: "password", placeholder: "Your StockX API key" },
    ],
    apiAvailable: true,
    popular: true,
  },
  goat: {
    id: "goat",
    name: "GOAT",
    description: "Global platform for sneakers",
    category: "sneakers",
    icon: "fas fa-shoe-prints",
    color: "bg-black",
    authType: "api_key",
    features: ["Authentication", "Global Shipping", "Instant Ship"],
    requiredCredentials: [
      { label: "API Key", key: "apiKey", type: "password", placeholder: "Your GOAT API key" },
      { label: "API Secret", key: "apiSecret", type: "password", placeholder: "Your GOAT API secret" },
    ],
    apiAvailable: true,
    popular: true,
  },

  // Collectibles Marketplaces
  whatnot: {
    id: "whatnot",
    name: "Whatnot",
    description: "Live shopping for collectibles",
    category: "collectibles",
    icon: "fas fa-video",
    color: "bg-indigo-500",
    authType: "username_password",
    features: ["Live Auctions", "Community", "Authentication"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Whatnot password" },
    ],
    apiAvailable: false,
    popular: true,
  },
  tcgplayer: {
    id: "tcgplayer",
    name: "TCGPlayer",
    description: "Trading card marketplace",
    category: "collectibles",
    icon: "fas fa-dice",
    color: "bg-blue-700",
    authType: "api_key",
    features: ["Price Guide", "Direct & Marketplace", "Buylist"],
    requiredCredentials: [
      { label: "Store Key", key: "storeKey", type: "password", placeholder: "Your TCGPlayer store key" },
      { label: "App ID", key: "appId", type: "text", placeholder: "Your TCGPlayer app ID" },
    ],
    apiAvailable: true,
    popular: true,
  },
  comc: {
    id: "comc",
    name: "COMC",
    description: "Sports card marketplace",
    category: "collectibles",
    icon: "fas fa-baseball-ball",
    color: "bg-red-600",
    authType: "username_password",
    features: ["Card Storage", "Processing Service", "Bulk Sales"],
    requiredCredentials: [
      { label: "Username", key: "username", type: "text", placeholder: "Your COMC username" },
      { label: "Password", key: "password", type: "password", placeholder: "Your COMC password" },
    ],
    apiAvailable: false,
    popular: false,
  },

  // Furniture & Home
  chairish: {
    id: "chairish",
    name: "Chairish",
    description: "Curated vintage furniture and decor",
    category: "furniture",
    icon: "fas fa-chair",
    color: "bg-pink-500",
    authType: "username_password",
    features: ["Curated Selection", "Trade Program", "White Glove Delivery"],
    requiredCredentials: [
      { label: "Email", key: "email", type: "text", placeholder: "your@email.com" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Chairish password" },
    ],
    apiAvailable: false,
    popular: false,
  },
  rubylane: {
    id: "rubylane",
    name: "Ruby Lane",
    description: "Antiques and collectibles marketplace",
    category: "collectibles",
    icon: "fas fa-gem",
    color: "bg-red-700",
    authType: "username_password",
    features: ["Antiques Focus", "Shop Integration", "No Listing Fees"],
    requiredCredentials: [
      { label: "Shop ID", key: "shopId", type: "text", placeholder: "Your Ruby Lane shop ID" },
      { label: "Password", key: "password", type: "password", placeholder: "Your Ruby Lane password" },
    ],
    apiAvailable: false,
    popular: false,
  },

  // Music & Electronics
  reverb: {
    id: "reverb",
    name: "Reverb",
    description: "Musical instrument marketplace",
    category: "music",
    icon: "fas fa-guitar",
    color: "bg-orange-600",
    authType: "oauth",
    features: ["Music Focus", "Price Guide", "Shop Integration"],
    apiAvailable: true,
    popular: true,
  },
  discogs: {
    id: "discogs",
    name: "Discogs",
    description: "Vinyl and music marketplace",
    category: "music",
    icon: "fas fa-record-vinyl",
    color: "bg-black",
    authType: "oauth",
    features: ["Music Database", "Collection Tracking", "Marketplace"],
    apiAvailable: true,
    popular: false,
  },
};

export const marketplaceCategories = {
  general: {
    name: "General Marketplaces",
    icon: "fas fa-store",
    description: "Multi-category platforms for all types of items",
  },
  fashion: {
    name: "Fashion & Apparel",
    icon: "fas fa-tshirt",
    description: "Clothing, shoes, and accessories",
  },
  luxury: {
    name: "Luxury & Designer",
    icon: "fas fa-crown",
    description: "High-end and authenticated luxury goods",
  },
  sneakers: {
    name: "Sneakers & Streetwear",
    icon: "fas fa-shoe-prints",
    description: "Sneakers, streetwear, and hype items",
  },
  collectibles: {
    name: "Collectibles & Trading Cards",
    icon: "fas fa-dice",
    description: "Cards, memorabilia, and collectibles",
  },
  electronics: {
    name: "Electronics & Tech",
    icon: "fas fa-laptop",
    description: "Gadgets, devices, and tech accessories",
  },
  furniture: {
    name: "Furniture & Home",
    icon: "fas fa-couch",
    description: "Furniture, decor, and home goods",
  },
  music: {
    name: "Music & Instruments",
    icon: "fas fa-music",
    description: "Instruments, vinyl, and music gear",
  },
  local: {
    name: "Local Marketplaces",
    icon: "fas fa-map-marker-alt",
    description: "Local buying and selling platforms",
  },
};

// Helper function to get marketplaces by category
export function getMarketplacesByCategory(category: MarketplaceCategory): MarketplaceConfig[] {
  return Object.values(marketplaces).filter(m => m.category === category);
}

// Helper function to get popular marketplaces
export function getPopularMarketplaces(): MarketplaceConfig[] {
  return Object.values(marketplaces).filter(m => m.popular);
}

// Helper function to get marketplace by id
export function getMarketplace(id: string): MarketplaceConfig | undefined {
  return marketplaces[id];
}