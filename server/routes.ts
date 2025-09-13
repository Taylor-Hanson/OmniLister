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
import { requireAuth, optionalAuth, requirePlan } from "./middleware/auth";
import { insertUserSchema, insertListingSchema, insertMarketplaceConnectionSchema, insertSyncSettingsSchema, insertSyncRuleSchema, insertAutoDelistRuleSchema } from "@shared/schema";
import { hashPassword, verifyPassword, generateToken, validatePassword, verifyToken } from "./auth";
import { ObjectStorageService } from "./objectStorage";

// Stripe client - only initialized if API key is available
let stripe: Stripe | null = null;

// Use testing keys if production keys aren't available
// Note: The testing keys are mislabeled - TESTING_VITE_STRIPE_PUBLIC_KEY is actually the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.TESTING_VITE_STRIPE_PUBLIC_KEY;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
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

      const listingData = insertListingSchema.parse(req.body);
      const listing = await storage.createListing(req.user!.id, listingData);
      
      // Increment usage counter
      await storage.incrementListingUsage(req.user!.id);
      
      res.json(listing);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/listings/:id", requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing || listing.userId !== req.user!.id) {
        return res.status(404).json({ error: "Listing not found" });
      }

      const updates = insertListingSchema.partial().parse(req.body);
      const updatedListing = await storage.updateListing(req.params.id, updates);
      res.json(updatedListing);
    } catch (error: any) {
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
          metadata: { plan: 'free' },
          ipAddress: req.ip,
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
        ? Math.round((user.listingsUsedThisMonth / user.listingCredits) * 100)
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

        res.send({
          subscriptionId: subscription.id,
          clientSecret: (invoice.payment_intent as any)?.client_secret,
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
        ipAddress: req.ip,
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
        ipAddress: req.ip,
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
        ipAddress: req.ip,
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
        ipAddress: req.ip,
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
