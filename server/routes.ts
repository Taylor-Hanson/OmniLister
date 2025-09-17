import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { aiService } from "./services/aiService";
import { marketplaceService } from "./services/marketplaceService";
import { queueService } from "./services/queueService";
import { syncService } from "./services/syncService";
import { autoDelistService } from "./services/autoDelistService";
import { onboardingService, ONBOARDING_STEPS } from "./services/onboardingService";
import { analyticsService } from "./services/analyticsService";
import { optimizationEngine } from "./services/optimizationEngine";
import { patternAnalysisService } from "./services/patternAnalysisService";
import { recommendationService } from "./services/recommendationService";
import { webhookService } from "./services/webhookService";
import { requireAuth, optionalAuth, requirePlan } from "./middleware/auth";
import { 
  insertUserSchema, insertListingSchema, insertMarketplaceConnectionSchema, 
  insertSyncSettingsSchema, insertSyncRuleSchema, insertAutoDelistRuleSchema,
  insertAutomationRuleSchema, insertAutomationScheduleSchema, insertAutomationLogSchema,
  insertPoshmarkShareSettingsSchema, insertOfferTemplateSchema
} from "@shared/schema";
import { hashPassword, verifyPassword, generateToken, validatePassword, verifyToken } from "./auth";
import { ObjectStorageService } from "./objectStorage";
import { automationService } from "./services/automationService";
import { automationSchedulerService } from "./services/automationSchedulerService";
import { automationSafetyService } from "./services/automationSafetyService";
import { poshmarkAutomationEngine } from "./services/poshmarkAutomationEngine";

// Stripe client - only initialized if API key is available
let stripe: Stripe | null = null;

// Use testing keys if production keys aren't available
// Note: The testing keys are mislabeled - TESTING_VITE_STRIPE_PUBLIC_KEY is actually the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.TESTING_VITE_STRIPE_PUBLIC_KEY;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-08-27.basil" as const,
  });
  console.log('Stripe initialized successfully with key starting with:', stripeSecretKey.substring(0, 7));
} else {
  console.warn('STRIPE_SECRET_KEY not set - Subscription features will be disabled');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, password } = insertUserSchema.parse(req.body);
      
      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.message });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash the password before storing
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ email, username, password: hashedPassword });
      
      // Generate JWT token
      const token = generateToken(user.id, user.email);
      
      res.json({ 
        user: { ...user, password: undefined },
        token
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify the password against the hash
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate JWT token
      const token = generateToken(user.id, user.email);

      res.json({ 
        user: { ...user, password: undefined }, 
        token 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User routes
  app.get("/api/user", requireAuth, async (req, res) => {
    res.json({ user: { ...req.user!, password: undefined } });
  });

  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.user!.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Optimization settings routes
  app.put("/api/user/optimization-settings", requireAuth, async (req, res) => {
    try {
      const { optimizationSettingsSchema } = await import("@shared/schema");
      const settings = optimizationSettingsSchema.parse(req.body);
      
      await storage.updateUser(req.user!.id, { 
        optimizationSettings: settings 
      });
      
      res.json({ 
        success: true, 
        settings,
        message: "Optimization settings updated successfully" 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/user/optimization-settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      const settings = user?.optimizationSettings || {
        autoOptimization: false,
        autoScheduling: true,
        autoPricing: false,
        optimizationThreshold: 70,
        learningMode: true,
        notifyOptimizations: true,
      };
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pricing routes
  app.get("/api/pricing", async (req, res) => {
    const pricingPlans = [
      {
        id: "free",
        name: "Free",
        price: 0,
        listingCredits: 10,
        features: [
          "10 new listings per month",
          "Access to all 12 marketplaces",
          "Basic analytics",
          "Forever free"
        ]
      },
      {
        id: "starter",
        name: "Starter",
        price: 9.99,
        listingCredits: 50,
        features: [
          "50 new listings per month",
          "Unlimited crossposting",
          "AI listing assistance",
          "Email support"
        ]
      },
      {
        id: "growth",
        name: "Growth",
        price: 29.99,
        listingCredits: 300,
        features: [
          "300 new listings per month",
          "Full automation suite",
          "Advanced analytics",
          "Priority support"
        ]
      },
      {
        id: "professional",
        name: "Professional",
        price: 39.99,
        listingCredits: 1000,
        features: [
          "1,000 new listings per month",
          "Poshmark automation",
          "API access",
          "24/7 priority support"
        ]
      },
      {
        id: "unlimited",
        name: "Unlimited",
        price: 44.99,
        listingCredits: null,
        features: [
          "Unlimited new listings",
          "AI-powered listing creation",
          "Automatic price sync",
          "24/7 VIP support"
        ]
      }
    ];
    res.json(pricingPlans);
  });

  app.get("/api/subscription/usage", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const usage = {
        plan: user.plan,
        listingCredits: user.listingCredits,
        listingsUsedThisMonth: user.listingsUsedThisMonth || 0,
        billingCycleStart: user.billingCycleStart,
        canCreateListing: await storage.canCreateListing(user.id),
        percentageUsed: user.listingCredits ? 
          Math.round(((user.listingsUsedThisMonth || 0) / user.listingCredits) * 100) : 0
      };
      res.json(usage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Onboarding routes
  app.get("/api/onboarding/progress", requireAuth, async (req, res) => {
    try {
      const progress = await onboardingService.getProgress(req.user!.id);
      const progressPercentage = progress ? 
        onboardingService.calculateProgress(progress.completedSteps as number[] || []) : 0;
      
      res.json({
        progress,
        steps: ONBOARDING_STEPS,
        progressPercentage,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/onboarding/progress", requireAuth, async (req, res) => {
    try {
      const { currentStep, completedStep } = req.body;
      const progress = await onboardingService.updateProgress(
        req.user!.id,
        currentStep,
        completedStep
      );
      
      const progressPercentage = progress ? 
        onboardingService.calculateProgress(progress.completedSteps as number[] || []) : 0;
      
      res.json({ progress, progressPercentage });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      const progress = await onboardingService.completeOnboarding(req.user!.id);
      res.json({ progress, completed: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/onboarding/skip", requireAuth, async (req, res) => {
    try {
      const progress = await onboardingService.skipOnboarding(req.user!.id);
      res.json({ progress, skipped: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/onboarding/reset", requireAuth, async (req, res) => {
    try {
      const progress = await onboardingService.resetOnboarding(req.user!.id);
      res.json({ progress, reset: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Marketplace connection routes
  app.get("/api/marketplaces", requireAuth, async (req, res) => {
    try {
      const connections = await storage.getMarketplaceConnections(req.user!.id);
      const supportedMarketplaces = marketplaceService.getSupportedMarketplaces();
      
      const marketplaces = supportedMarketplaces.map(marketplace => {
        const connection = connections.find(c => c.marketplace === marketplace);
        return {
          marketplace,
          isConnected: connection?.isConnected || false,
          lastSyncAt: connection?.lastSyncAt,
          connection: connection ? { ...connection, accessToken: undefined, refreshToken: undefined } : null,
        };
      });

      res.json(marketplaces);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/marketplaces/:marketplace/auth", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.params;
      const authUrl = marketplaceService.getAuthUrl(marketplace);
      res.json({ authUrl });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/marketplaces/:marketplace/callback", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.params;
      const { code } = req.body;

      const tokenData = await marketplaceService.exchangeToken(marketplace, code);
      
      // Check if connection already exists
      const existingConnection = await storage.getMarketplaceConnection(req.user!.id, marketplace);
      
      if (existingConnection) {
        await storage.updateMarketplaceConnection(existingConnection.id, {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          isConnected: true,
          lastSyncAt: new Date(),
        });
      } else {
        await storage.createMarketplaceConnection(req.user!.id, {
          marketplace,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          settings: {},
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // New endpoint for direct credential connections (non-OAuth)
  app.post("/api/marketplaces/:marketplace/connect", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.params;
      const { credentials, authType } = req.body;

      // Validate credentials based on marketplace configuration
      const isValid = await marketplaceService.validateCredentials(marketplace, credentials, authType);
      
      if (!isValid) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // Check if connection already exists
      const existingConnection = await storage.getMarketplaceConnection(req.user!.id, marketplace);
      
      // Store encrypted credentials
      const connectionData: any = {
        marketplace,
        isConnected: true,
        lastSyncAt: new Date(),
        settings: {
          authType,
          credentials: JSON.stringify(credentials), // In production, encrypt this
        },
      };

      if (authType === "api_key") {
        connectionData.accessToken = credentials.apiKey || credentials.token;
        connectionData.refreshToken = credentials.apiSecret || credentials.refreshToken;
      } else if (authType === "username_password") {
        connectionData.accessToken = Buffer.from(`${credentials.username || credentials.email}:${credentials.password}`).toString('base64');
      }
      
      if (existingConnection) {
        await storage.updateMarketplaceConnection(existingConnection.id, connectionData);
      } else {
        await storage.createMarketplaceConnection(req.user!.id, connectionData);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/marketplaces/:marketplace/test", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.params;
      const connection = await storage.getMarketplaceConnection(req.user!.id, marketplace);
      
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      const isValid = await marketplaceService.testConnection(marketplace, connection);
      res.json({ isValid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/marketplaces/:marketplace", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.params;
      const connection = await storage.getMarketplaceConnection(req.user!.id, marketplace);
      
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      await storage.deleteMarketplaceConnection(connection.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Shopify OAuth routes
  app.post("/api/marketplaces/shopify/install", requireAuth, async (req, res) => {
    try {
      const { shopUrl } = req.body;
      
      if (!shopUrl) {
        return res.status(400).json({ error: "Shop URL is required" });
      }

      const { shopifyApiService } = await import("./services/shopifyApiService");
      
      // Generate state parameter for security (store in session/db for verification)
      const state = `${req.user!.id}_${Date.now()}`;
      
      // Store state temporarily for verification (in production, use session or database)
      // For now, we'll include userId in state and verify on callback
      
      const installUrl = shopifyApiService.getInstallUrl(shopUrl, state);
      
      res.json({ 
        installUrl,
        message: "Redirect user to this URL to install the app" 
      });
    } catch (error: any) {
      console.error("Shopify install error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/marketplaces/shopify/callback", async (req, res) => {
    try {
      const { code, shop, state, hmac, timestamp } = req.query as Record<string, string>;
      
      if (!code || !shop || !hmac) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const { shopifyApiService } = await import("./services/shopifyApiService");
      
      // Verify HMAC to ensure request is from Shopify
      const queryParams = { ...req.query } as Record<string, string>;
      delete queryParams.hmac;
      
      if (!shopifyApiService.verifyHmac({ ...queryParams, hmac })) {
        return res.status(401).json({ error: "Invalid HMAC signature" });
      }

      // Extract userId from state (in production, verify against stored state)
      const userId = state?.split("_")[0];
      if (!userId) {
        return res.status(400).json({ error: "Invalid state parameter" });
      }

      // Exchange code for access token
      const tokenData = await shopifyApiService.exchangeCodeForToken(shop, code);
      
      // Store the connection
      const connection = await storage.upsertMarketplaceConnection({
        userId,
        marketplace: "shopify",
        isConnected: true,
        accessToken: tokenData.access_token,
        shopUrl: shop,
        settings: {
          scope: tokenData.scope,
          associatedUser: tokenData.associated_user,
        },
      });

      // Get shop info and default location
      const shopInfo = await shopifyApiService.getShopInfo(connection);
      const locations = await shopifyApiService.getLocations(connection);
      
      // Update connection with additional info
      await storage.updateMarketplaceConnection(connection.id, {
        shopifyLocationId: locations[0]?.id?.toString(),
        settings: {
          ...connection.settings,
          shopInfo,
          locations,
        },
      });

      // Register webhooks for real-time updates
      const baseUrl = process.env.VITE_BASE_URL || `http://localhost:5000`;
      const webhookTopics = [
        "products/create",
        "products/update",
        "products/delete",
        "inventory_levels/update",
      ];

      for (const topic of webhookTopics) {
        try {
          const webhook = await shopifyApiService.registerWebhook(
            connection,
            topic,
            `${baseUrl}/api/marketplaces/shopify/webhook`
          );
          console.log(`Registered Shopify webhook for ${topic}`);
        } catch (error) {
          console.warn(`Failed to register webhook for ${topic}:`, error);
        }
      }

      // Redirect to success page
      res.redirect("/marketplaces?connected=shopify");
    } catch (error: any) {
      console.error("Shopify callback error:", error);
      res.redirect(`/marketplaces?error=${encodeURIComponent(error.message)}`);
    }
  });

  app.post("/api/marketplaces/shopify/webhook", async (req, res) => {
    try {
      const { shopifyApiService } = await import("./services/shopifyApiService");
      
      // Verify webhook signature
      const signature = req.headers["x-shopify-hmac-sha256"] as string;
      const rawBody = JSON.stringify(req.body);
      
      if (!shopifyApiService.verifyWebhookSignature(rawBody, signature)) {
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      const topic = req.headers["x-shopify-topic"] as string;
      const shopDomain = req.headers["x-shopify-shop-domain"] as string;
      
      console.log(`Received Shopify webhook: ${topic} from ${shopDomain}`);
      
      // Handle different webhook topics
      switch (topic) {
        case "products/create":
        case "products/update":
          // Sync product changes to local listings
          // Implementation would sync changes back to our database
          break;
        case "products/delete":
          // Remove product from local listings
          break;
        case "inventory_levels/update":
          // Update local inventory levels
          break;
      }

      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Shopify webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/marketplaces/shopify/products", requireAuth, async (req, res) => {
    try {
      const { limit = "50", status = "active" } = req.query;
      
      const connection = await storage.getMarketplaceConnection(req.user!.id, "shopify");
      if (!connection || !connection.isConnected) {
        return res.status(404).json({ error: "Shopify connection not found" });
      }

      const { shopifyApiService } = await import("./services/shopifyApiService");
      const products = await shopifyApiService.getProducts(connection, {
        limit: parseInt(limit as string),
        status: status as "active" | "archived" | "draft",
      });

      // Return in the format expected by frontend
      res.json({ 
        products,
        count: products.length,
        connection: {
          shopName: connection.shopName,
          shopUrl: connection.shopUrl
        }
      });
    } catch (error: any) {
      console.error("Error fetching Shopify products:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketplaces/shopify/products", requireAuth, async (req, res) => {
    try {
      const connection = await storage.getMarketplaceConnection(req.user!.id, "shopify");
      if (!connection || !connection.isConnected) {
        return res.status(404).json({ error: "Shopify connection not found" });
      }

      const { shopifyApiService } = await import("./services/shopifyApiService");
      const listing = req.body;
      
      const product = await shopifyApiService.createProduct(connection, listing);
      
      res.json({
        success: true,
        product,
        message: "Product created successfully in Shopify",
      });
    } catch (error: any) {
      console.error("Error creating Shopify product:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketplaces/shopify/import", requireAuth, async (req, res) => {
    try {
      const { productIds, limit = 50, status = "active" } = req.body;
      
      const connection = await storage.getMarketplaceConnection(req.user!.id, "shopify");
      if (!connection || !connection.isConnected) {
        return res.status(404).json({ error: "Shopify connection not found" });
      }

      const { shopifyApiService } = await import("./services/shopifyApiService");
      
      // If specific productIds are provided, import only those products
      let listings;
      if (productIds && productIds.length > 0) {
        listings = await shopifyApiService.importSpecificProducts(
          req.user!.id, 
          connection, 
          productIds
        );
      } else {
        // Otherwise import all products with the given filters
        listings = await shopifyApiService.importProducts(req.user!.id, connection, {
          limit,
          status,
        });
      }

      // Save imported listings to database
      const savedListings = [];
      const failedImports = [];
      
      for (const listing of listings) {
        try {
          const saved = await storage.createListing(listing);
          savedListings.push(saved);
        } catch (error: any) {
          failedImports.push({
            title: listing.title,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        imported: savedListings.length,
        failed: failedImports.length,
        listings: savedListings,
        failedImports,
        message: failedImports.length > 0 
          ? `Imported ${savedListings.length} products from Shopify (${failedImports.length} failed)`
          : `Successfully imported ${savedListings.length} products from Shopify`,
      });
    } catch (error: any) {
      console.error("Error importing Shopify products:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/marketplaces/shopify/products/:productId", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      
      const connection = await storage.getMarketplaceConnection(req.user!.id, "shopify");
      if (!connection || !connection.isConnected) {
        return res.status(404).json({ error: "Shopify connection not found" });
      }

      const { shopifyApiService } = await import("./services/shopifyApiService");
      const updates = req.body;
      
      const product = await shopifyApiService.updateProduct(connection, productId, updates);
      
      res.json({
        success: true,
        product,
        message: "Product updated successfully in Shopify",
      });
    } catch (error: any) {
      console.error("Error updating Shopify product:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/marketplaces/shopify/products/:productId", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      
      const connection = await storage.getMarketplaceConnection(req.user!.id, "shopify");
      if (!connection || !connection.isConnected) {
        return res.status(404).json({ error: "Shopify connection not found" });
      }

      const { shopifyApiService } = await import("./services/shopifyApiService");
      await shopifyApiService.deleteProduct(connection, productId);
      
      res.json({
        success: true,
        message: "Product deleted successfully from Shopify",
      });
    } catch (error: any) {
      console.error("Error deleting Shopify product:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/marketplaces/shopify/inventory", requireAuth, async (req, res) => {
    try {
      const { inventoryItemId, locationId, quantity } = req.body;
      
      if (!inventoryItemId || !locationId || quantity === undefined) {
        return res.status(400).json({ 
          error: "inventoryItemId, locationId, and quantity are required" 
        });
      }

      const connection = await storage.getMarketplaceConnection(req.user!.id, "shopify");
      if (!connection || !connection.isConnected) {
        return res.status(404).json({ error: "Shopify connection not found" });
      }

      const { shopifyApiService } = await import("./services/shopifyApiService");
      await shopifyApiService.updateInventory(
        connection,
        inventoryItemId,
        locationId || connection.shopifyLocationId,
        quantity
      );
      
      res.json({
        success: true,
        message: "Inventory updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating Shopify inventory:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // eBay Constants endpoint for frontend
  app.get("/api/ebay/constants", async (req, res) => {
    try {
      const { EBAY_CONDITIONS, LISTING_FORMATS, LISTING_DURATIONS } = await import("@shared/schema");
      res.json({
        conditions: EBAY_CONDITIONS,
        listingFormats: LISTING_FORMATS,
        listingDurations: LISTING_DURATIONS
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // eBay Account Policies endpoints
  app.get("/api/ebay/policies", requireAuth, async (req, res) => {
    try {
      const connection = await storage.getMarketplaceConnection(req.user!.id, "ebay");
      
      if (!connection || !connection.isConnected) {
        return res.status(404).json({ error: "eBay connection not found" });
      }

      const { ebayApiService } = await import("./services/ebayApiService");
      const policies = await ebayApiService.fetchAccountPolicies(connection);
      
      res.json(policies);
    } catch (error: any) {
      console.error('Error fetching eBay policies:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ebay/default-policies", requireAuth, async (req, res) => {
    try {
      const connection = await storage.getMarketplaceConnection(req.user!.id, "ebay");
      
      if (!connection || !connection.isConnected) {
        return res.status(404).json({ error: "eBay connection not found" });
      }

      const { ebayApiService } = await import("./services/ebayApiService");
      const policies = await ebayApiService.fetchAccountPolicies(connection);
      const defaultPolicies = ebayApiService.getDefaultPolicies(policies);
      
      res.json(defaultPolicies);
    } catch (error: any) {
      console.error('Error fetching eBay default policies:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ebay/policies/cache", requireAuth, async (req, res) => {
    try {
      const { ebayApiService } = await import("./services/ebayApiService");
      ebayApiService.clearPoliciesCache(req.user!.id);
      
      res.json({ success: true, message: "eBay policies cache cleared" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Listing routes
  app.get("/api/listings", requireAuth, async (req, res) => {
    try {
      const { status, marketplace } = req.query;
      const listings = await storage.getListings(req.user!.id, {
        status: status as string,
        marketplace: marketplace as string,
      });
      res.json(listings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(listing);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/listings", requireAuth, async (req, res) => {
    try {
      // Check if user can create more listings
      const canCreate = await storage.canCreateListing(req.user!.id);
      if (!canCreate) {
        return res.status(403).json({ 
          error: "Monthly listing limit reached. Please upgrade your plan for more listings.",
          upgrade_url: "/pricing"
        });
      }

      // Parse and validate the request body with enhanced eBay field processing
      const rawData = req.body;
      
      // Process condition mapping - if condition is provided without conditionId, auto-map it
      if (rawData.condition && !rawData.conditionId) {
        const { EBAY_CONDITIONS } = await import("@shared/schema");
        const conditionInfo = Object.values(EBAY_CONDITIONS).find(c => c.value === rawData.condition);
        if (conditionInfo) {
          rawData.conditionId = conditionInfo.id;
        }
      }

      // Process price field - keep as string for database
      if (rawData.price) {
        if (typeof rawData.price === 'number') {
          rawData.price = rawData.price.toFixed(2);
        } else if (typeof rawData.price === 'string') {
          // Clean up the price string (remove $ signs, etc.) and ensure 2 decimal places
          const cleanPrice = rawData.price.replace(/[^0-9.-]/g, '');
          rawData.price = parseFloat(cleanPrice).toFixed(2);
        }
      }
      if (rawData.packageWeight && typeof rawData.packageWeight === 'string') {
        rawData.packageWeight = parseFloat(rawData.packageWeight);
      }
      // Keep auction prices as strings too
      if (rawData.startPrice) {
        if (typeof rawData.startPrice === 'number') {
          rawData.startPrice = rawData.startPrice.toFixed(2);
        } else if (typeof rawData.startPrice === 'string') {
          const cleanPrice = rawData.startPrice.replace(/[^0-9.-]/g, '');
          rawData.startPrice = parseFloat(cleanPrice).toFixed(2);
        }
      }
      if (rawData.reservePrice) {
        if (typeof rawData.reservePrice === 'number') {
          rawData.reservePrice = rawData.reservePrice.toFixed(2);
        } else if (typeof rawData.reservePrice === 'string') {
          const cleanPrice = rawData.reservePrice.replace(/[^0-9.-]/g, '');
          rawData.reservePrice = parseFloat(cleanPrice).toFixed(2);
        }
      }
      if (rawData.buyItNowPrice) {
        if (typeof rawData.buyItNowPrice === 'number') {
          rawData.buyItNowPrice = rawData.buyItNowPrice.toFixed(2);
        } else if (typeof rawData.buyItNowPrice === 'string') {
          const cleanPrice = rawData.buyItNowPrice.replace(/[^0-9.-]/g, '');
          rawData.buyItNowPrice = parseFloat(cleanPrice).toFixed(2);
        }
      }

      // Normalize itemSpecifics to ensure consistent structure
      if (rawData.itemSpecifics && Array.isArray(rawData.itemSpecifics)) {
        rawData.itemSpecifics = rawData.itemSpecifics.filter((spec: any) => spec.name && spec.value);
      }

      const listingData = insertListingSchema.parse(rawData);
      const listing = await storage.createListing(req.user!.id, listingData);
      
      // Increment usage counter
      await storage.incrementListingUsage(req.user!.id);
      
      res.json(listing);
    } catch (error: any) {
      console.error('Error creating listing:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Process the request body with the same eBay field enhancements
      const rawData = req.body;
      
      // Process condition mapping - if condition is provided without conditionId, auto-map it
      if (rawData.condition && !rawData.conditionId) {
        const { EBAY_CONDITIONS } = await import("@shared/schema");
        const conditionInfo = Object.values(EBAY_CONDITIONS).find(c => c.value === rawData.condition);
        if (conditionInfo) {
          rawData.conditionId = conditionInfo.id;
        }
      }

      // Process price field - keep as string for database
      if (rawData.price) {
        if (typeof rawData.price === 'number') {
          rawData.price = rawData.price.toFixed(2);
        } else if (typeof rawData.price === 'string') {
          // Clean up the price string (remove $ signs, etc.) and ensure 2 decimal places
          const cleanPrice = rawData.price.replace(/[^0-9.-]/g, '');
          rawData.price = parseFloat(cleanPrice).toFixed(2);
        }
      }
      if (rawData.packageWeight && typeof rawData.packageWeight === 'string') {
        rawData.packageWeight = parseFloat(rawData.packageWeight);
      }
      // Keep auction prices as strings too
      if (rawData.startPrice) {
        if (typeof rawData.startPrice === 'number') {
          rawData.startPrice = rawData.startPrice.toFixed(2);
        } else if (typeof rawData.startPrice === 'string') {
          const cleanPrice = rawData.startPrice.replace(/[^0-9.-]/g, '');
          rawData.startPrice = parseFloat(cleanPrice).toFixed(2);
        }
      }
      if (rawData.reservePrice) {
        if (typeof rawData.reservePrice === 'number') {
          rawData.reservePrice = rawData.reservePrice.toFixed(2);
        } else if (typeof rawData.reservePrice === 'string') {
          const cleanPrice = rawData.reservePrice.replace(/[^0-9.-]/g, '');
          rawData.reservePrice = parseFloat(cleanPrice).toFixed(2);
        }
      }
      if (rawData.buyItNowPrice) {
        if (typeof rawData.buyItNowPrice === 'number') {
          rawData.buyItNowPrice = rawData.buyItNowPrice.toFixed(2);
        } else if (typeof rawData.buyItNowPrice === 'string') {
          const cleanPrice = rawData.buyItNowPrice.replace(/[^0-9.-]/g, '');
          rawData.buyItNowPrice = parseFloat(cleanPrice).toFixed(2);
        }
      }

      // Normalize itemSpecifics to ensure consistent structure
      if (rawData.itemSpecifics && Array.isArray(rawData.itemSpecifics)) {
        rawData.itemSpecifics = rawData.itemSpecifics.filter((spec: any) => spec.name && spec.value);
      }

      const updates = insertListingSchema.partial().parse(rawData);
      const updatedListing = await storage.updateListing(req.params.id, updates);
      res.json(updatedListing);
    } catch (error: any) {
      console.error('Error updating listing:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Validation error", 
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }

      await storage.deleteListing(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/listings/:id/posts", requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const posts = await storage.getListingPosts(req.params.id);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI routes
  app.post("/api/ai/analyze-image", requireAuth, async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image is required" });
      }

      const analysis = await aiService.analyzeProductFromImage(image);
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/optimize-listing", requireAuth, async (req, res) => {
    try {
      const { title, description, marketplace, category } = req.body;
      
      if (!title || !description || !marketplace) {
        return res.status(400).json({ error: "Title, description, and marketplace are required" });
      }

      const optimization = await aiService.optimizeListingForMarketplace(title, description, marketplace, category);
      res.json(optimization);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/voice-to-listing", requireAuth, async (req, res) => {
    try {
      const { transcript } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const listingData = await aiService.generateListingFromVoice(transcript);
      res.json(listingData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/remove-background", requireAuth, async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image is required" });
      }

      const processedImage = await aiService.removeBackground(image);
      res.json({ image: processedImage });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Job routes
  app.get("/api/jobs", requireAuth, async (req, res) => {
    try {
      const { status, type } = req.query;
      const jobs = await storage.getJobs(req.user!.id, {
        status: status as string,
        type: type as string,
      });
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/jobs/post-listing", requireAuth, async (req, res) => {
    try {
      const { listingId, marketplaces } = req.body;
      
      if (!listingId || !Array.isArray(marketplaces) || marketplaces.length === 0) {
        return res.status(400).json({ error: "Listing ID and marketplaces array are required" });
      }

      const listing = await storage.getListing(listingId);
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const jobs = await queueService.createPostListingJob(req.user!.id, listingId, marketplaces);
      res.json({ jobs, scheduled: jobs.length, smartScheduled: jobs.some(j => j.smartScheduled) });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/jobs/delist-listing", requireAuth, async (req, res) => {
    try {
      const { listingId, marketplaces } = req.body;
      
      if (!listingId) {
        return res.status(400).json({ error: "Listing ID is required" });
      }

      const listing = await storage.getListing(listingId);
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const job = await queueService.createDelistListingJob(req.user!.id, listingId, marketplaces);
      res.json(job);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/jobs/sync-inventory", requireAuth, async (req, res) => {
    try {
      const { listingId, soldMarketplace } = req.body;
      
      if (!listingId || !soldMarketplace) {
        return res.status(400).json({ error: "Listing ID and sold marketplace are required" });
      }

      const listing = await storage.getListing(listingId);
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const job = await queueService.createSyncInventoryJob(req.user!.id, listingId, soldMarketplace);
      res.json(job);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Sync settings routes
  app.get("/api/sync/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSyncSettings(req.user!.id);
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          autoSync: false,
          syncFrequency: "manual",
          syncFields: {
            price: true,
            inventory: true,
            description: true,
            images: true,
          },
          defaultBehavior: {
            priceConflictResolution: "highest",
            inventoryConflictResolution: "lowest",
            descriptionConflictResolution: "longest",
          },
        });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sync/settings", requireAuth, async (req, res) => {
    try {
      const settings = insertSyncSettingsSchema.parse(req.body);
      const existingSettings = await storage.getSyncSettings(req.user!.id);
      
      let result;
      if (existingSettings) {
        result = await storage.updateSyncSettings(req.user!.id, settings);
      } else {
        result = await storage.createSyncSettings(req.user!.id, settings);
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Sync rules routes
  app.get("/api/sync/rules", requireAuth, async (req, res) => {
    try {
      const rules = await storage.getSyncRules(req.user!.id);
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sync/rules", requireAuth, async (req, res) => {
    try {
      const rule = insertSyncRuleSchema.parse(req.body);
      const result = await storage.createSyncRule(req.user!.id, rule);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/sync/rules/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const rule = await storage.getSyncRule(id);
      
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(404).json({ error: "Sync rule not found" });
      }
      
      const result = await storage.updateSyncRule(id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sync/rules/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const rule = await storage.getSyncRule(id);
      
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(404).json({ error: "Rule not found" });
      }
      
      await storage.deleteSyncRule(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Sync execution routes
  app.post("/api/sync/execute", requireAuth, async (req, res) => {
    try {
      const { listingId, targetMarketplace, sourceMarketplace } = req.body;
      
      if (listingId) {
        // Sync single listing
        const result = await syncService.syncListing(
          req.user!.id,
          listingId,
          targetMarketplace,
          sourceMarketplace
        );
        res.json(result);
      } else {
        // Sync all listings
        const results = await syncService.syncAllListings(req.user!.id);
        res.json(results);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/sync/status", requireAuth, async (req, res) => {
    try {
      const status = await syncService.getSyncStatus(req.user!.id);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync history routes
  app.get("/api/sync/history", requireAuth, async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const history = await storage.getSyncHistory(req.user!.id, Number(limit));
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Sync conflicts routes
  app.get("/api/sync/conflicts", requireAuth, async (req, res) => {
    try {
      const { resolved } = req.query;
      const conflicts = await storage.getSyncConflicts(
        req.user!.id, 
        resolved === "true" ? true : resolved === "false" ? false : undefined
      );
      res.json(conflicts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sync/resolve-conflict", requireAuth, async (req, res) => {
    try {
      const { conflictId, resolution, resolvedValue } = req.body;
      
      if (!conflictId || !resolution) {
        return res.status(400).json({ error: "Conflict ID and resolution are required" });
      }
      
      const conflict = await storage.getSyncConflict(conflictId);
      if (!conflict || conflict.userId !== req.user!.id) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      
      const result = await storage.resolveSyncConflict(conflictId, resolution, resolvedValue);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sync/auto-resolve", requireAuth, async (req, res) => {
    try {
      await syncService.autoResolveConflicts(req.user!.id);
      res.json({ success: true, message: "Conflicts auto-resolved based on settings" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Object storage routes
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { url, objectPath } = await objectStorageService.getUploadUrl();
      res.json({ uploadURL: url, objectPath });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/objects/listing-images", requireAuth, async (req, res) => {
    try {
      const { imageURLs, listingId } = req.body;
      if (!imageURLs || !Array.isArray(imageURLs)) {
        return res.status(400).json({ error: "imageURLs array is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPaths = [];

      for (const imageURL of imageURLs) {
        // Normalize the URL to an object path
        const objectPath = objectStorageService.normalizeObjectEntityPath(imageURL);
        objectPaths.push(objectPath);
      }

      if (listingId) {
        // Update listing with image paths
        await storage.updateListing(listingId, { images: objectPaths });
      }

      res.json({ objectPaths });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Plan selection route (without payment for MVP)
  app.post("/api/subscription/select-plan", requireAuth, async (req: any, res) => {
    try {
      const { plan } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Define plan limits
      const planLimits: { [key: string]: number | null } = {
        free: 10,
        starter: 50,
        growth: 300,
        professional: 1000,
        unlimited: null, // null means unlimited
      };

      // For MVP, only allow free plan selection
      if (plan === 'free') {
        const updatedUser = await storage.updateUser(userId, {
          plan: 'free',
          listingCredits: planLimits.free,
          subscriptionStatus: 'active',
        });

        // Create audit log
        await storage.createAuditLog({
          userId,
          action: 'plan_selected',
          entityType: 'subscription',
          entityId: null,
          metadata: { plan: 'free' },
          ipAddress: req.ip || null,
          userAgent: req.get("user-agent") || null,
        });

        return res.json({ 
          success: true, 
          user: { ...updatedUser, password: undefined },
          message: 'Free plan activated successfully!'
        });
      } else if (['starter', 'growth', 'professional', 'unlimited'].includes(plan)) {
        // For paid plans, return contact sales message
        return res.json({
          success: false,
          requiresPayment: true,
          message: 'Paid plans are coming soon! Please contact sales@crosslist.com for early access.',
          contactEmail: 'sales@crosslist.com'
        });
      } else {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get user subscription info
  app.get("/api/subscription/info", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Calculate usage percentage
      const usagePercentage = user.listingCredits 
        ? Math.round(((user.listingsUsedThisMonth || 0) / user.listingCredits) * 100)
        : 0;

      return res.json({
        plan: user.plan,
        listingCredits: user.listingCredits,
        listingsUsedThisMonth: user.listingsUsedThisMonth,
        usagePercentage,
        billingCycleStart: user.billingCycleStart,
        subscriptionStatus: user.subscriptionStatus,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stripe subscription routes
  app.post('/api/get-or-create-subscription', requireAuth, async (req, res) => {
    if (!stripe) {
      return res.status(501).json({ error: "Stripe is not configured - subscription features are disabled" });
    }
    
    const { planId, priceId } = req.body;
    let user = req.user!;

    // Map plan IDs to Stripe price IDs (you'll need to create these in Stripe)
    const stripePriceIds: { [key: string]: string } = {
      starter: process.env.STRIPE_PRICE_ID_STARTER || 'price_starter_test',
      growth: process.env.STRIPE_PRICE_ID_GROWTH || 'price_growth_test',
      professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_professional_test',
      unlimited: process.env.STRIPE_PRICE_ID_UNLIMITED || 'price_unlimited_test',
    };

    const selectedPriceId = stripePriceIds[planId] || priceId;
    if (!selectedPriceId || planId === 'free') {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string, {
          expand: ['payment_intent']
        });

        const paymentIntent = invoice.payment_intent as any;
        res.send({
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret,
        });
        return;
      } catch (error) {
        console.error("Error retrieving existing subscription:", error);
      }
    }
    
    try {
      let customer;
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
        });
        user = await storage.updateUser(user.id, { stripeCustomerId: customer.id });
      }

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: selectedPriceId,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          planId: planId,
        },
      });

      await storage.updateUser(user.id, { 
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        plan: planId
      });
  
      const invoice = subscription.latest_invoice as any;
      res.send({
        subscriptionId: subscription.id,
        clientSecret: invoice.payment_intent?.client_secret,
      });
    } catch (error: any) {
      return res.status(400).send({ error: { message: error.message } });
    }
  });

  // Stripe webhook handler
  app.post('/api/webhooks/stripe', async (req, res) => {
    if (!stripe) {
      return res.status(501).json({ error: "Stripe is not configured" });
    }
    
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        const subscription = event.data.object;
        const customer = await stripe!.customers.retrieve(subscription.customer as string);
        
        if ('email' in customer) {
          const user = await storage.getUserByEmail(customer.email!);
          if (user) {
            let plan = "free";
            if (subscription.status === "active") {
              // Use metadata to determine the plan
              plan = (subscription.metadata as any)?.planId || "starter";
            }
            
            // Define plan limits
            const planLimits: { [key: string]: number | null } = {
              free: 10,
              starter: 50,
              growth: 300,
              professional: 1000,
              unlimited: null,
            };
            
            await storage.updateUser(user.id, {
              subscriptionStatus: subscription.status,
              plan,
              listingCredits: planLimits[plan],
            });
          }
        }
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Audit log routes
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const { limit } = req.query;
      const logs = await storage.getAuditLogs(req.user!.id, limit ? parseInt(limit as string) : undefined);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notifications routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications: any[] = [];
      
      // Get recent failed jobs as notifications
      const failedJobs = await storage.getJobs(req.user!.id, { status: 'failed' });
      const recentFailedJobs = failedJobs.filter(job => {
        const createdAt = new Date(job.createdAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 24; // Last 24 hours
      }).slice(0, 5);
      
      recentFailedJobs.forEach(job => {
        notifications.push({
          id: `job-${job.id}`,
          type: 'error',
          title: 'Job Failed',
          message: `Failed to process ${job.type}: ${job.errorMessage || 'Unknown error'}`,
          timestamp: job.createdAt,
          read: false,
          priority: 'high'
        });
      });
      
      // Get pending sync conflicts as notifications
      const syncConflicts = await storage.getSyncConflicts(req.user!.id, false);
      const recentConflicts = syncConflicts.filter(conflict => {
        const createdAt = new Date(conflict.createdAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 72; // Last 3 days
      }).slice(0, 3);
      
      recentConflicts.forEach(conflict => {
        notifications.push({
          id: `conflict-${conflict.id}`,
          type: 'warning',
          title: 'Sync Conflict',
          message: `Sync conflict detected for listing: ${conflict.conflictType}`,
          timestamp: conflict.createdAt,
          read: false,
          priority: 'medium'
        });
      });
      
      // Get recent successful sales as positive notifications
      const recentAuditLogs = await storage.getAuditLogs(req.user!.id);
      const salesLogs = recentAuditLogs.filter(log => 
        log.action === 'sale_recorded' && 
        new Date(log.createdAt).getTime() > (Date.now() - 24 * 60 * 60 * 1000)
      ).slice(0, 2);
      
      salesLogs.forEach(log => {
        const saleData = (log.metadata || {}) as any;
        notifications.push({
          id: `sale-${log.id}`,
          type: 'success',
          title: 'Sale Recorded',
          message: `Item sold for $${saleData.price || 'N/A'} on ${saleData.marketplace || 'marketplace'}`,
          timestamp: log.createdAt,
          read: false,
          priority: 'medium'
        });
      });
      
      // Sort by timestamp (newest first) and limit to 10
      notifications.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const limitedNotifications = notifications.slice(0, 10);
      
      res.json({
        notifications: limitedNotifications,
        unreadCount: limitedNotifications.filter(n => !n.read).length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/:id/mark-read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      // In a real implementation, you'd update the notification's read status in storage
      // For now, we'll just return success since notifications are generated dynamically
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      // In a real implementation, you'd mark all notifications as read for the user
      // For now, we'll just return success since notifications are generated dynamically  
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auto-Delist endpoints
  app.get("/api/auto-delist/rules", requireAuth, async (req, res) => {
    try {
      const rules = await storage.getAutoDelistRules(req.user!.id);
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auto-delist/rules", requireAuth, async (req, res) => {
    try {
      const ruleData = insertAutoDelistRuleSchema.parse(req.body);
      const rule = await storage.createAutoDelistRule(req.user!.id, ruleData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "create_auto_delist_rule",
        entityType: "auto_delist_rule",
        entityId: rule.id,
        metadata: { name: rule.name },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
      });
      
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/auto-delist/rules/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const rule = await storage.getAutoDelistRule(id);
      
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(404).json({ error: "Rule not found" });
      }
      
      const updatedRule = await storage.updateAutoDelistRule(id, req.body);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "update_auto_delist_rule",
        entityType: "auto_delist_rule",
        entityId: id,
        metadata: { changes: req.body },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
      });
      
      res.json(updatedRule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/auto-delist/rules/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const rule = await storage.getAutoDelistRule(id);
      
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(404).json({ error: "Rule not found" });
      }
      
      await storage.deleteAutoDelistRule(id);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "delete_auto_delist_rule",
        entityType: "auto_delist_rule",
        entityId: id,
        metadata: { name: rule.name },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auto-delist/history", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const history = await storage.getAutoDelistHistory(req.user!.id, limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auto-delist/trigger/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await autoDelistService.triggerRule(req.user!.id, id);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "manual_trigger_auto_delist",
        entityType: "auto_delist_rule",
        entityId: id,
        metadata: {},
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
      });
      
      res.json({ success: true, message: "Rule triggered successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auto-delist/stats", requireAuth, async (req, res) => {
    try {
      const stats = await autoDelistService.getStats(req.user!.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics routes
  app.get("/api/analytics/overview", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const metrics = await analyticsService.getOverviewMetrics(req.user!.id, days);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/revenue", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const revenue = await analyticsService.getRevenueAnalytics(req.user!.id, days);
      res.json(revenue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/inventory", requireAuth, async (req, res) => {
    try {
      const inventory = await analyticsService.getInventoryAnalytics(req.user!.id);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/marketplace", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const marketplace = await analyticsService.getMarketplaceAnalytics(req.user!.id, days);
      res.json(marketplace);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/forecast", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const forecast = await analyticsService.generateForecasts(req.user!.id, days);
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/competition", requireAuth, async (req, res) => {
    try {
      const competition = await analyticsService.analyzeCompetition(req.user!.id);
      res.json(competition);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/pricing", requireAuth, async (req, res) => {
    try {
      const pricing = await analyticsService.optimizePricing(req.user!.id);
      res.json(pricing);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analytics/track", requireAuth, async (req, res) => {
    try {
      const { eventType, eventData, marketplace, listingId, revenue, profit } = req.body;
      const event = await analyticsService.trackEvent(
        req.user!.id,
        eventType,
        eventData,
        marketplace,
        listingId,
        revenue,
        profit
      );
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/analytics/track-sale", requireAuth, async (req, res) => {
    try {
      const { listingId, marketplace, salePrice, fees } = req.body;
      const listing = await storage.getListing(listingId);
      
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }

      await analyticsService.trackSale(req.user!.id, listing, marketplace, salePrice, fees);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/analytics/export", requireAuth, async (req, res) => {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const report = await analyticsService.generateReport(req.user!.id, format);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="analytics-report.csv"');
        res.send(report);
      } else {
        res.json(report);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics events endpoints
  app.get("/api/analytics/events", requireAuth, async (req, res) => {
    try {
      const filters = {
        eventType: req.query.eventType as string,
        marketplace: req.query.marketplace as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const events = await storage.getAnalyticsEvents(req.user!.id, filters);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/sales-metrics", requireAuth, async (req, res) => {
    try {
      const filters = {
        marketplace: req.query.marketplace as string,
        category: req.query.category as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      const metrics = await storage.getSalesMetrics(req.user!.id, filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/inventory-metrics", requireAuth, async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        category: req.query.category as string,
      };
      const metrics = await storage.getInventoryMetrics(req.user!.id, filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/marketplace-metrics", requireAuth, async (req, res) => {
    try {
      const filters = {
        marketplace: req.query.marketplace as string,
        period: req.query.period as string,
      };
      const metrics = await storage.getMarketplaceMetrics(req.user!.id, filters);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Optimization Engine API routes
  app.get("/api/optimization/insights", requireAuth, async (req, res) => {
    try {
      const insights = await optimizationEngine.getOptimizationInsights(req.user!.id);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/recommendations", requireAuth, async (req, res) => {
    try {
      const category = req.query.category as string;
      const marketplace = req.query.marketplace as string;
      const includeScheduling = req.query.includeScheduling === 'true';
      
      // Using getUserOptimizationProfile as a fallback
      const profile = await optimizationEngine.getUserOptimizationProfile(req.user!.id);
      const recommendations = profile ? {
        category,
        marketplace,
        includeScheduling,
        profile
      } : [];
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/patterns", requireAuth, async (req, res) => {
    try {
      const marketplace = req.query.marketplace as string;
      const category = req.query.category as string;
      const days = parseInt(req.query.days as string) || 30;
      
      const patterns = await patternAnalysisService.analyzeUserPatterns(req.user!.id);
      res.json(patterns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/time-analysis", requireAuth, async (req, res) => {
    try {
      const marketplace = req.query.marketplace as string;
      const category = req.query.category as string;
      
      const analysis = await patternAnalysisService.analyzeUserPatterns(req.user!.id);
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/price-analysis", requireAuth, async (req, res) => {
    try {
      const marketplace = req.query.marketplace as string;
      const category = req.query.category as string;
      
      const analysis = await patternAnalysisService.analyzeUserPatterns(req.user!.id);
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/correlations", requireAuth, async (req, res) => {
    try {
      const marketplace = req.query.marketplace as string;
      
      const correlations = await patternAnalysisService.analyzeCorrelations(req.user!.id);
      res.json(correlations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/trends", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const marketplace = req.query.marketplace as string;
      
      const trends = await patternAnalysisService.analyzeTrends(req.user!.id);
      res.json(trends);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/anomalies", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      
      const anomalies = await patternAnalysisService.detectAnomalies(req.user!.id, {
        timeRange: { days }
      });
      res.json(anomalies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/opportunities", requireAuth, async (req, res) => {
    try {
      // Using generatePersonalizedRecommendations as a fallback
      const opportunities = await recommendationService.generatePersonalizedRecommendations(req.user!.id);
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/schedule-suggestions", requireAuth, async (req, res) => {
    try {
      const category = req.query.category as string;
      const marketplace = req.query.marketplace as string;
      const listingId = req.query.listingId as string;
      
      // Using getUserRecommendations filtered by timing type as a fallback
      const allRecommendations = await recommendationService.getUserRecommendations(req.user!.id);
      const suggestions = allRecommendations.filter(r => r.type === 'timing').map(r => ({
        ...r,
        category,
        marketplace,
        listingId
      }));
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/pricing-suggestions", requireAuth, async (req, res) => {
    try {
      const category = req.query.category as string;
      const marketplace = req.query.marketplace as string;
      const currentPrice = parseFloat(req.query.currentPrice as string);
      const listingId = req.query.listingId as string;
      
      // Using getUserRecommendations filtered by pricing type as a fallback
      const allRecommendations = await recommendationService.getUserRecommendations(req.user!.id);
      const suggestions = allRecommendations.filter(r => r.type === 'pricing').map(r => ({
        ...r,
        category,
        marketplace,
        currentPrice,
        listingId
      }));
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/marketplace-recommendations", requireAuth, async (req, res) => {
    try {
      const category = req.query.category as string;
      const listingId = req.query.listingId as string;
      
      // Using getUserRecommendations filtered by marketplace type as a fallback
      const allRecommendations = await recommendationService.getUserRecommendations(req.user!.id);
      const recommendations = allRecommendations.filter(r => r.type === 'marketplace').map(r => ({
        ...r,
        category,
        listingId
      }));
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/content-suggestions", requireAuth, async (req, res) => {
    try {
      const listingId = req.query.listingId as string;
      const marketplace = req.query.marketplace as string;
      
      // Using getUserRecommendations filtered by content type as a fallback
      const allRecommendations = await recommendationService.getUserRecommendations(req.user!.id);
      const suggestions = allRecommendations.filter(r => r.type === 'content').map(r => ({
        ...r,
        listingId,
        marketplace
      }));
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/performance-forecast", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const marketplace = req.query.marketplace as string;
      const category = req.query.category as string;
      
      // Using getUserOptimizationProfile as a fallback
      const profile = await optimizationEngine.getUserOptimizationProfile(req.user!.id);
      const forecast = profile ? {
        forecastDays: days,
        marketplace,
        category,
        profile
      } : null;
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/optimization/apply-recommendations", requireAuth, async (req, res) => {
    try {
      const { recommendations, applyScheduling, applyPricing } = req.body;
      
      // Using runOptimization as a fallback
      const result = await optimizationEngine.runOptimization(req.user!.id);
      /* Original parameters preserved for future implementation: {
        recommendations,
        applyScheduling: applyScheduling === true,
        applyPricing: applyPricing === true
      } */
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/performance-comparison", requireAuth, async (req, res) => {
    try {
      const beforeDate = req.query.beforeDate ? new Date(req.query.beforeDate as string) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const afterDate = req.query.afterDate ? new Date(req.query.afterDate as string) : new Date();
      
      // Using getUserOptimizationProfile as a fallback
      const profile = await optimizationEngine.getUserOptimizationProfile(req.user!.id);
      const comparison = profile ? {
        beforeDate,
        afterDate,
        profile
      } : null;
      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/low-performing-listings", requireAuth, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 30;
      
      const lowPerformingListings = await storage.getListingsWithLowPerformance(req.user!.id, threshold);
      res.json(lowPerformingListings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimization/success-analytics", requireAuth, async (req, res) => {
    try {
      const filters = {
        marketplace: req.query.marketplace as string,
        marketplaces: req.query.marketplaces ? (req.query.marketplaces as string).split(',') : undefined,
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        category: req.query.category as string,
        listingId: req.query.listingId as string,
        dayOfWeek: req.query.dayOfWeek ? parseInt(req.query.dayOfWeek as string) : undefined,
        hourOfDay: req.query.hourOfDay ? parseInt(req.query.hourOfDay as string) : undefined,
        priceRange: req.query.priceRange as string,
        minEngagement: req.query.minEngagement ? parseFloat(req.query.minEngagement as string) : undefined,
        sold: req.query.sold === 'true' ? true : req.query.sold === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };
      
      const analytics = await storage.getPostingSuccessAnalytics(req.user!.id, filters);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // WEBHOOK ROUTES - Real-time marketplace notifications
  // ============================================================================

  // Generic webhook endpoint for all marketplaces
  app.post("/api/webhooks/:marketplace", async (req, res) => {
    try {
      const marketplace = req.params.marketplace.toLowerCase();
      const payload = {
        headers: req.headers as Record<string, string>,
        body: req.body,
        rawBody: req.rawBody || JSON.stringify(req.body),
        query: req.query as Record<string, string>,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      };

      console.log(`🔗 Received webhook from ${marketplace}:`, {
        contentType: req.get('Content-Type'),
        bodySize: payload.rawBody.length,
        ip: req.ip,
        signature: req.get('x-signature') || req.get('signature') || 'none'
      });

      const result = await webhookService.processWebhook(marketplace, payload);

      // Return appropriate status code
      res.status(result.statusCode).json({
        success: result.success,
        message: result.success ? 'Webhook processed successfully' : result.error,
        eventId: result.eventId,
        syncJobId: result.syncJobId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Webhook endpoint error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Webhook verification endpoint for marketplace registration
  app.get("/api/webhooks/:marketplace/verify", async (req, res) => {
    try {
      const marketplace = req.params.marketplace.toLowerCase();
      const challenge = req.query.challenge || req.query['hub.challenge'];
      
      console.log(`🔍 Webhook verification request from ${marketplace}:`, {
        challenge: challenge ? 'present' : 'missing',
        query: Object.keys(req.query)
      });

      // Return challenge for verification (common pattern for webhook setup)
      if (challenge) {
        res.status(200).send(challenge);
      } else {
        res.status(200).json({ 
          verified: true, 
          marketplace,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Webhook verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Test webhook endpoint for development and debugging
  app.post("/api/webhooks/:marketplace/test", requireAuth, async (req, res) => {
    try {
      const marketplace = req.params.marketplace.toLowerCase();
      const testPayload = req.body;

      console.log(`🧪 Testing webhook for ${marketplace}:`, {
        userId: req.user!.id,
        payloadKeys: Object.keys(testPayload)
      });

      const result = await webhookService.testWebhook(marketplace, testPayload);

      res.json({
        success: result.success,
        message: result.success ? 'Test webhook processed successfully' : result.error,
        eventId: result.eventId,
        syncJobId: result.syncJobId,
        processingDetails: result,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Test webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // AUTOMATION MANAGEMENT API ROUTES
  // ============================================================================

  // ----------------- Automation Rules Endpoints -----------------
  
  // Get all automation rules for the user
  app.get("/api/automation/rules", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.query;
      const rules = await storage.getAutomationRules(
        req.user!.id,
        marketplace as string | undefined
      );
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get rules for specific marketplace
  app.get("/api/automation/rules/:marketplace", requireAuth, async (req, res) => {
    try {
      const rules = await storage.getAutomationRules(
        req.user!.id,
        req.params.marketplace
      );
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new automation rule
  app.post("/api/automation/rules", requireAuth, async (req, res) => {
    try {
      const ruleData = insertAutomationRuleSchema.parse(req.body);
      const rule = await automationService.createAutomationRule(
        req.user!.id,
        ruleData
      );
      
      // Send WebSocket notification
      websocketService.broadcast(req.user!.id, {
        type: 'automation_rule_created',
        data: rule
      });
      
      // Log the action
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'automation_rule_created',
        resource: 'automation_rule',
        resourceId: rule.id,
        details: { ruleName: rule.ruleName, marketplace: rule.marketplace }
      });
      
      res.json(rule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update existing automation rule
  app.put("/api/automation/rules/:id", requireAuth, async (req, res) => {
    try {
      // Verify ownership
      const existingRule = await storage.getAutomationRule(req.params.id);
      if (!existingRule || existingRule.userId !== req.user!.id) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      
      const updatedRule = await automationService.updateAutomationRule(
        req.params.id,
        req.body
      );
      
      // Send WebSocket notification
      websocketService.broadcast(req.user!.id, {
        type: 'automation_rule_updated',
        data: updatedRule
      });
      
      res.json(updatedRule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete automation rule
  app.delete("/api/automation/rules/:id", requireAuth, async (req, res) => {
    try {
      // Verify ownership
      const rule = await storage.getAutomationRule(req.params.id);
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      
      await storage.deleteAutomationRule(req.params.id);
      
      // Send WebSocket notification
      websocketService.broadcast(req.user!.id, {
        type: 'automation_rule_deleted',
        data: { id: req.params.id }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manually trigger an automation rule
  app.post("/api/automation/rules/:id/execute", requireAuth, async (req, res) => {
    try {
      // Verify ownership
      const rule = await storage.getAutomationRule(req.params.id);
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      
      const result = await automationService.executeAutomation(
        req.params.id,
        "manual"
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Emergency stop all automations
  app.post("/api/automation/rules/emergency-stop", requireAuth, async (req, res) => {
    try {
      await automationService.emergencyStop(req.user!.id);
      
      // Send WebSocket notification
      websocketService.broadcast(req.user!.id, {
        type: 'emergency_stop_activated',
        data: { timestamp: new Date() }
      });
      
      res.json({ 
        success: true, 
        message: "Emergency stop activated. All automations have been halted." 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------- Automation Schedules Endpoints -----------------
  
  // Get all schedules
  app.get("/api/automation/schedules", requireAuth, async (req, res) => {
    try {
      const { ruleId } = req.query;
      const schedules = await storage.getAutomationSchedules(ruleId as string | undefined);
      
      // Filter to only user's schedules
      const userSchedules = await Promise.all(
        schedules.map(async (schedule) => {
          const rule = await storage.getAutomationRule(schedule.ruleId);
          return rule?.userId === req.user!.id ? schedule : null;
        })
      );
      
      res.json(userSchedules.filter(Boolean));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get active schedules
  app.get("/api/automation/schedules/active", requireAuth, async (req, res) => {
    try {
      const activeSchedules = await storage.getActiveAutomationSchedules();
      
      // Filter to only user's schedules
      const userSchedules = activeSchedules.filter(
        (schedule: any) => schedule.rule?.userId === req.user!.id
      );
      
      res.json(userSchedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new schedule
  app.post("/api/automation/schedules", requireAuth, async (req, res) => {
    try {
      const scheduleData = insertAutomationScheduleSchema.parse(req.body);
      
      // Verify rule ownership
      const rule = await storage.getAutomationRule(scheduleData.ruleId);
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const schedule = await automationSchedulerService.createSchedule(scheduleData);
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update schedule
  app.put("/api/automation/schedules/:id", requireAuth, async (req, res) => {
    try {
      const schedule = await storage.getAutomationSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Verify ownership through rule
      const rule = await storage.getAutomationRule(schedule.ruleId);
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const updated = await storage.updateAutomationSchedule(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete schedule
  app.delete("/api/automation/schedules/:id", requireAuth, async (req, res) => {
    try {
      const schedule = await storage.getAutomationSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Verify ownership through rule
      const rule = await storage.getAutomationRule(schedule.ruleId);
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      await storage.deleteAutomationSchedule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Activate a schedule
  app.post("/api/automation/schedules/:id/activate", requireAuth, async (req, res) => {
    try {
      const schedule = await storage.getAutomationSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Verify ownership through rule
      const rule = await storage.getAutomationRule(schedule.ruleId);
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      await automationSchedulerService.activateSchedule(schedule.ruleId);
      const updated = await storage.updateAutomationSchedule(req.params.id, { isActive: true });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deactivate a schedule
  app.post("/api/automation/schedules/:id/deactivate", requireAuth, async (req, res) => {
    try {
      const schedule = await storage.getAutomationSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Verify ownership through rule
      const rule = await storage.getAutomationRule(schedule.ruleId);
      if (!rule || rule.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      await automationSchedulerService.deactivateSchedule(schedule.ruleId);
      const updated = await storage.updateAutomationSchedule(req.params.id, { isActive: false });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------- Automation Health Check -----------------
  
  // Get automation system health status
  app.get("/api/automation/health", requireAuth, async (req, res) => {
    try {
      // Initialize health status object
      const healthStatus: any = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
      
      // Get scheduler status (with error handling)
      try {
        const activeSchedules = await storage.getActiveAutomationSchedules();
        const allSchedules = await storage.getAutomationSchedules();
        healthStatus.scheduler = {
          isRunning: true,
          activeSchedules: activeSchedules.length,
          totalSchedules: allSchedules.length,
          isPaused: false,
        };
      } catch (error) {
        console.log("[Health] Scheduler status check failed:", error);
        healthStatus.scheduler = {
          isRunning: true, // Scheduler is initialized based on startup
          activeSchedules: 0,
          totalSchedules: 0,
          isPaused: false,
          note: "Unable to fetch schedule details"
        };
      }
      
      // Get rules status (with error handling)
      try {
        const allRules = await storage.getAutomationRules(req.user!.id);
        const activeRules = allRules.filter(r => r.isEnabled);
        healthStatus.rules = {
          activeRules: activeRules.length,
          totalRules: allRules.length,
          byMarketplace: allRules.reduce((acc: Record<string, number>, rule) => {
            acc[rule.marketplace] = (acc[rule.marketplace] || 0) + 1;
            return acc;
          }, {}),
        };
      } catch (error) {
        console.log("[Health] Rules status check failed:", error);
        healthStatus.rules = {
          activeRules: 0,
          totalRules: 0,
          byMarketplace: {},
        };
      }
      
      // Get queue status (with error handling)
      try {
        const queueStats = await queueService.getQueueStats();
        healthStatus.queue = {
          pending: queueStats.pending || 0,
          processing: queueStats.processing || 0,
          completed: queueStats.completed || 0,
          failed: queueStats.failed || 0,
        };
      } catch (error) {
        console.log("[Health] Queue status check failed:", error);
        healthStatus.queue = {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        };
      }
      
      // Get safety service status (with error handling)
      try {
        const safetyStatus = await automationSafetyService.getHealthStatus(req.user!.id);
        healthStatus.safety = {
          status: safetyStatus.status || "operational",
          rateLimitingActive: safetyStatus.rateLimitingActive !== false,
          lastCircuitBreaker: safetyStatus.lastCircuitBreaker || null,
        };
      } catch (error) {
        console.log("[Health] Safety status check failed:", error);
        healthStatus.safety = {
          status: "operational",
          rateLimitingActive: true,
        };
      }
      
      res.json(healthStatus);
    } catch (error: any) {
      // If there's an unexpected error, return an unhealthy status
      console.error("[Health] Unexpected error in health check:", error);
      res.status(500).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
        scheduler: { isRunning: false },
        rules: { activeRules: 0, totalRules: 0 },
        queue: { pending: 0, processing: 0, completed: 0, failed: 0 },
        safety: { status: "unknown" },
        uptime: process.uptime(),
      });
    }
  });

  // ----------------- Automation Logs Endpoints -----------------
  
  // Get automation logs with pagination and filters
  app.get("/api/automation/logs", requireAuth, async (req, res) => {
    try {
      const { ruleId, marketplace, status, startDate, endDate, limit = "50", page = "1" } = req.query;
      
      const logs = await storage.getAutomationLogs(req.user!.id, {
        ruleId: ruleId as string,
        marketplace: marketplace as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string)
      });
      
      // Implement pagination
      const pageNum = parseInt(page as string);
      const pageSize = parseInt(limit as string);
      const startIndex = (pageNum - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedLogs = logs.slice(startIndex, endIndex);
      
      res.json({
        logs: paginatedLogs,
        total: logs.length,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(logs.length / pageSize)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get automation statistics
  app.get("/api/automation/logs/stats", requireAuth, async (req, res) => {
    try {
      const { days = "7" } = req.query;
      const stats = await storage.getAutomationLogStats(
        req.user!.id,
        parseInt(days as string)
      );
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export logs as CSV/JSON
  app.get("/api/automation/logs/export", requireAuth, async (req, res) => {
    try {
      const { format = "json", startDate, endDate } = req.query;
      
      const logs = await storage.getAutomationLogs(req.user!.id, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      if (format === "csv") {
        // Convert to CSV
        const csv = [
          "Timestamp,Rule,Marketplace,Action,Status,Items Processed,Error",
          ...logs.map(log => 
            `"${log.executedAt}","${log.ruleId}","${log.marketplace}","${log.actionType}","${log.status}","${log.itemsProcessed || 0}","${log.errorMessage || ''}"`
          )
        ].join("\n");
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="automation-logs.csv"');
        res.send(csv);
      } else {
        res.json(logs);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------- Poshmark-specific Endpoints -----------------
  
  // Get Poshmark share settings
  app.get("/api/automation/poshmark/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getPoshmarkShareSettings(req.user!.id);
      res.json(settings || {
        shareTimesEnabled: [],
        shareToFollowers: true,
        shareToParties: false,
        minMinutesBetweenShares: 30,
        maxSharesPerDay: 5000,
        randomizeOrder: true
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Poshmark share settings
  app.put("/api/automation/poshmark/settings", requireAuth, async (req, res) => {
    try {
      const settings = insertPoshmarkShareSettingsSchema.parse(req.body);
      const updated = await storage.updatePoshmarkShareSettings(
        req.user!.id,
        settings
      );
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Trigger immediate share
  app.post("/api/automation/poshmark/share-now", requireAuth, async (req, res) => {
    try {
      const { listingIds, shareToFollowers = true, shareToParties = false } = req.body;
      
      // Create a temporary automation rule for immediate share
      const tempRule = await automationService.createAutomationRule(req.user!.id, {
        ruleName: "Manual Share",
        marketplace: "poshmark",
        ruleType: "auto_share",
        configuration: {
          shareToFollowers,
          shareToParties,
          listingIds: listingIds || []
        },
        isEnabled: true
      });
      
      // Execute immediately
      const result = await automationService.executeAutomation(tempRule.id, "manual");
      
      // Delete the temporary rule
      await storage.deleteAutomationRule(tempRule.id);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Share to Poshmark party
  app.post("/api/automation/poshmark/party-share", requireAuth, async (req, res) => {
    try {
      const { partyId, listingIds } = req.body;
      
      // Share to specific party
      const result = await poshmarkAutomationEngine.shareToParty(
        req.user!.id,
        partyId,
        listingIds
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get upcoming Poshmark parties
  app.get("/api/automation/poshmark/parties", requireAuth, async (req, res) => {
    try {
      // Get upcoming Poshmark parties
      const parties = await poshmarkAutomationEngine.getUpcomingParties();
      res.json(parties);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------- Offer Templates Endpoints -----------------
  
  // Get all offer templates
  app.get("/api/automation/templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getOfferTemplates(req.user!.id);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new template
  app.post("/api/automation/templates", requireAuth, async (req, res) => {
    try {
      const templateData = insertOfferTemplateSchema.parse(req.body);
      const template = await storage.createOfferTemplate(
        req.user!.id,
        templateData
      );
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update template
  app.put("/api/automation/templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getOfferTemplate(req.params.id);
      if (!template || template.userId !== req.user!.id) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      const updated = await storage.updateOfferTemplate(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete template
  app.delete("/api/automation/templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getOfferTemplate(req.params.id);
      if (!template || template.userId !== req.user!.id) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      await storage.deleteOfferTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------- Automation Status & Monitoring -----------------
  
  // Get overall automation status
  app.get("/api/automation/status", requireAuth, async (req, res) => {
    try {
      const rules = await storage.getAutomationRules(req.user!.id);
      const activeSchedules = await storage.getActiveAutomationSchedules();
      const userSchedules = activeSchedules.filter(
        (s: any) => rules.some(r => r.id === s.ruleId)
      );
      
      const recentLogs = await storage.getAutomationLogs(req.user!.id, {
        limit: 10
      });
      
      const stats = await storage.getAutomationLogStats(req.user!.id, 7);
      
      res.json({
        totalRules: rules.length,
        activeRules: rules.filter(r => r.isEnabled).length,
        activeSchedules: userSchedules.length,
        recentActivity: recentLogs,
        weeklyStats: stats,
        status: userSchedules.length > 0 ? 'active' : 'idle'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get automation performance metrics
  app.get("/api/automation/metrics", requireAuth, async (req, res) => {
    try {
      const { days = "30", marketplace } = req.query;
      
      const logs = await storage.getAutomationLogs(req.user!.id, {
        marketplace: marketplace as string,
        startDate: new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000)
      });
      
      // Calculate metrics
      const successCount = logs.filter(l => l.status === 'success').length;
      const failureCount = logs.filter(l => l.status === 'failed').length;
      const totalItems = logs.reduce((sum, l) => sum + (l.itemsProcessed || 0), 0);
      const avgExecutionTime = logs.reduce((sum, l) => sum + (l.executionTime || 0), 0) / logs.length || 0;
      
      // Helper functions for metrics
      const getTopActions = (logs: any[]) => {
        const actionCounts: Record<string, number> = {};
        logs.forEach(log => {
          actionCounts[log.actionType] = (actionCounts[log.actionType] || 0) + 1;
        });
        
        return Object.entries(actionCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([action, count]) => ({ action, count }));
      };
      
      const getHourlyDistribution = (logs: any[]) => {
        const hourCounts: number[] = new Array(24).fill(0);
        logs.forEach(log => {
          const hour = new Date(log.executedAt).getHours();
          hourCounts[hour]++;
        });
        
        return hourCounts.map((count, hour) => ({ hour, count }));
      };
      
      res.json({
        period: `${days} days`,
        totalExecutions: logs.length,
        successRate: logs.length > 0 ? (successCount / logs.length * 100).toFixed(2) : 0,
        failureRate: logs.length > 0 ? (failureCount / logs.length * 100).toFixed(2) : 0,
        totalItemsProcessed: totalItems,
        averageExecutionTime: Math.round(avgExecutionTime),
        topActions: getTopActions(logs),
        hourlyDistribution: getHourlyDistribution(logs)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get queue status for automation jobs
  app.get("/api/automation/queue/status", requireAuth, async (req, res) => {
    try {
      const queueStatus = await queueService.getQueueStatus();
      res.json(queueStatus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get list of supported marketplaces
  app.get("/api/automation/supported-marketplaces", requireAuth, async (req, res) => {
    try {
      const marketplaces = [
        {
          id: "poshmark",
          name: "Poshmark",
          supported: true,
          actions: ["auto_share", "auto_follow", "auto_offer", "party_share"]
        },
        {
          id: "mercari",
          name: "Mercari",
          supported: true,
          actions: ["auto_share", "auto_follow", "auto_offer"]
        },
        {
          id: "depop",
          name: "Depop",
          supported: true,
          actions: ["auto_share", "auto_follow", "auto_offer"]
        },
        {
          id: "grailed",
          name: "Grailed",
          supported: true,
          actions: ["auto_share", "auto_bump"]
        },
        {
          id: "ebay",
          name: "eBay",
          supported: false,
          actions: []
        },
        {
          id: "facebook",
          name: "Facebook Marketplace",
          supported: false,
          actions: []
        }
      ];
      
      res.json(marketplaces);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------- Safety & Compliance Endpoints -----------------
  
  // Get current rate limit status
  app.get("/api/automation/safety/limits", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.query;
      const limits = await automationSafetyService.getUserRateLimitStatus(
        req.user!.id,
        marketplace as string
      );
      res.json(limits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update safety settings
  app.put("/api/automation/safety/settings", requireAuth, async (req, res) => {
    try {
      const { enableSafetyMode, customLimits } = req.body;
      
      // Update user's safety settings
      await storage.updateUser(req.user!.id, {
        automationSafetySettings: {
          enableSafetyMode,
          customLimits
        }
      });
      
      res.json({ 
        success: true,
        message: "Safety settings updated successfully" 
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Check compliance status
  app.get("/api/automation/safety/compliance", requireAuth, async (req, res) => {
    try {
      const rules = await storage.getAutomationRules(req.user!.id);
      const complianceStatus = await Promise.all(
        rules.map(async (rule) => {
          const isCompliant = await automationSafetyService.checkRuleCompliance(rule);
          return {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            marketplace: rule.marketplace,
            isCompliant,
            issues: isCompliant ? [] : await automationSafetyService.getComplianceIssues(rule)
          };
        })
      );
      
      res.json({
        overallCompliant: complianceStatus.every(s => s.isCompliant),
        rules: complianceStatus
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // WEBHOOK MANAGEMENT API - User configuration and monitoring
  // ============================================================================

  // Get webhook configurations for user
  app.get("/api/webhooks/configurations", requireAuth, async (req, res) => {
    try {
      const configurations = await webhookService.getUserWebhookConfigs(req.user!.id);
      res.json(configurations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register webhook for a marketplace
  app.post("/api/webhooks/configurations", requireAuth, async (req, res) => {
    try {
      const { marketplace, events } = req.body;
      
      if (!marketplace || !events || !Array.isArray(events)) {
        return res.status(400).json({ 
          error: 'Marketplace and events array are required' 
        });
      }

      const configuration = await webhookService.registerWebhook(
        req.user!.id,
        marketplace,
        events
      );

      res.status(201).json(configuration);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update webhook configuration
  app.put("/api/webhooks/configurations/:configId", requireAuth, async (req, res) => {
    try {
      const { configId } = req.params;
      const updates = req.body;

      const configuration = await webhookService.updateWebhookConfig(configId, updates);
      res.json(configuration);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get webhook events (for monitoring and debugging)
  app.get("/api/webhooks/events", requireAuth, async (req, res) => {
    try {
      const filters = {
        marketplace: req.query.marketplace as string,
        eventType: req.query.eventType as string,
        processingStatus: req.query.processingStatus as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        listingId: req.query.listingId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50
      };

      const events = await webhookService.getWebhookEvents(req.user!.id, filters);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get webhook health summary
  app.get("/api/webhooks/health", requireAuth, async (req, res) => {
    try {
      const marketplace = req.query.marketplace as string;
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;

      const healthSummary = await webhookService.getWebhookHealthSummary(marketplace);
      res.json(healthSummary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get webhook deliveries (for debugging delivery issues)
  app.get("/api/webhooks/deliveries", requireAuth, async (req, res) => {
    try {
      const filters = {
        marketplace: req.query.marketplace as string,
        successful: req.query.successful === 'true' ? true : req.query.successful === 'false' ? false : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50
      };

      const deliveries = await storage.getWebhookDeliveries(undefined, filters);
      
      // Filter by user's webhook configurations
      const userConfigs = await webhookService.getUserWebhookConfigs(req.user!.id);
      const userConfigIds = userConfigs.map(config => config.id);
      
      const userDeliveries = deliveries.filter(delivery => 
        userConfigIds.includes(delivery.webhookConfigId)
      );

      res.json(userDeliveries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // POLLING SCHEDULES API - Fallback for marketplaces without webhooks
  // ============================================================================

  // Get polling schedules for user
  app.get("/api/polling/schedules", requireAuth, async (req, res) => {
    try {
      const marketplace = req.query.marketplace as string;
      const schedules = await storage.getPollingSchedules(req.user!.id, marketplace);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create polling schedule for a marketplace
  app.post("/api/polling/schedules", requireAuth, async (req, res) => {
    try {
      const { marketplace, pollingInterval } = req.body;
      
      if (!marketplace) {
        return res.status(400).json({ error: 'Marketplace is required' });
      }

      const schedule = await storage.createPollingSchedule(req.user!.id, {
        marketplace,
        pollingInterval: pollingInterval || 300, // Default 5 minutes
        lastPollAt: null,
        lastSaleCount: 0,
        configurationData: {}
      });

      res.status(201).json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update polling schedule
  app.put("/api/polling/schedules/:scheduleId", requireAuth, async (req, res) => {
    try {
      const { scheduleId } = req.params;
      const updates = req.body;

      const schedule = await storage.updatePollingSchedule(scheduleId, updates);
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete polling schedule
  app.delete("/api/polling/schedules/:scheduleId", requireAuth, async (req, res) => {
    try {
      const { scheduleId } = req.params;
      await storage.deletePollingSchedule(scheduleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Enhanced WebSocket event types
  interface WebSocketEvent {
    type: 'job_status' | 'job_progress' | 'rate_limit' | 'circuit_breaker' | 'smart_schedule' | 'marketplace_health' | 'queue_status' | 'notification';
    userId: string;
    timestamp: string;
    data: any;
  }

  // WebSocket client tracking
  const wsClients = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    let clientUserId: string | null = null;
    
    // Send initial connection acknowledgment
    ws.send(JSON.stringify({
      type: 'connection',
      data: { connected: true, timestamp: new Date().toISOString() }
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different types of WebSocket messages
        switch (data.type) {
          case 'subscribe':
            // Verify JWT token and extract user ID
            const token = data.token;
            if (!token) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                data: { message: 'Authentication token required', timestamp: new Date().toISOString() }
              }));
              ws.close(1008, 'Authentication token required');
              return;
            }

            const payload = verifyToken(token);
            if (!payload) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                data: { message: 'Invalid authentication token', timestamp: new Date().toISOString() }
              }));
              ws.close(1008, 'Invalid authentication token');
              return;
            }

            // Use verified user ID from JWT token, not from client data
            clientUserId = payload.userId;
            (ws as any).userId = payload.userId;
            
            // Track client connection for user
            if (!wsClients.has(payload.userId)) {
              wsClients.set(payload.userId, new Set());
            }
            wsClients.get(payload.userId)!.add(ws);
            
            console.log(`WebSocket client authenticated and subscribed for user: ${payload.userId} (${payload.email})`);
            
            // Send initial status update
            ws.send(JSON.stringify({
              type: 'subscription_confirmed',
              data: {
                userId: payload.userId,
                timestamp: new Date().toISOString(),
                activeConnections: wsClients.get(payload.userId)!.size
              }
            }));
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ 
              type: 'pong', 
              timestamp: new Date().toISOString() 
            }));
            break;

          case 'request_status':
            // Send current status for user's jobs, rate limits, etc.
            if (clientUserId) {
              broadcastUserStatus(clientUserId);
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format', timestamp: new Date().toISOString() }
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Remove client from tracking
      if (clientUserId && wsClients.has(clientUserId)) {
        wsClients.get(clientUserId)!.delete(ws);
        if (wsClients.get(clientUserId)!.size === 0) {
          wsClients.delete(clientUserId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
    });
  });

  // Enhanced broadcasting functions
  const broadcastToUser = (userId: string, event: Omit<WebSocketEvent, 'userId' | 'timestamp'>) => {
    const fullEvent: WebSocketEvent = {
      ...event,
      userId,
      timestamp: new Date().toISOString()
    };

    const userClients = wsClients.get(userId);
    if (userClients) {
      const eventData = JSON.stringify(fullEvent);
      userClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(eventData);
          } catch (error) {
            console.error('Error sending WebSocket message:', error);
            // Remove failed client
            userClients.delete(client);
          }
        }
      });
    }
  };

  const broadcastToAll = (event: Omit<WebSocketEvent, 'userId' | 'timestamp'>) => {
    const fullEvent = {
      ...event,
      userId: 'broadcast',
      timestamp: new Date().toISOString()
    };

    const eventData = JSON.stringify(fullEvent);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(eventData);
        } catch (error) {
          console.error('Error broadcasting WebSocket message:', error);
        }
      }
    });
  };

  // Function to send current status for a user
  const broadcastUserStatus = async (userId: string) => {
    try {
      // Get current jobs status
      const jobs = await storage.getUserJobs(userId);
      const activeJobs = jobs.filter(job => ['pending', 'processing'].includes(job.status));
      
      broadcastToUser(userId, {
        type: 'queue_status',
        data: {
          activeJobs: activeJobs.length,
          totalJobs: jobs.length,
          jobs: activeJobs.map(job => ({
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress || 0,
            createdAt: job.createdAt,
            scheduledFor: job.scheduledFor
          }))
        }
      });

      // Get marketplace health status
      const { rateLimitService } = await import('./services/rateLimitService');
      const marketplaces = ['ebay', 'poshmark', 'mercari', 'facebook', 'depop'];
      const healthStatuses = await Promise.all(
        marketplaces.map(async (marketplace) => {
          try {
            const status = await rateLimitService.getRateLimitStatus(marketplace);
            return {
              marketplace,
              healthy: status.canMakeRequest,
              hourlyRemaining: status.hourlyRemaining,
              dailyRemaining: status.dailyRemaining,
              estimatedDelay: status.estimatedDelay
            };
          } catch (error) {
            return {
              marketplace,
              healthy: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      broadcastToUser(userId, {
        type: 'marketplace_health',
        data: { marketplaces: healthStatuses }
      });

    } catch (error) {
      console.error('Error broadcasting user status:', error);
    }
  };

  // Global functions for other services to use
  global.broadcastToUser = broadcastToUser;
  global.broadcastToAll = broadcastToAll;
  global.broadcastUserStatus = broadcastUserStatus;
  
  // Legacy function for backward compatibility
  (global as any).broadcastToUserLegacy = (userId: string, data: any) => {
    broadcastToUser(userId, { type: 'notification', data });
  };

  return httpServer;
}
