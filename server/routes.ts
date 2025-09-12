import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { aiService } from "./services/aiService";
import { marketplaceService } from "./services/marketplaceService";
import { queueService } from "./services/queueService";
import { requireAuth, optionalAuth, requirePlan } from "./middleware/auth";
import { insertUserSchema, insertListingSchema, insertMarketplaceConnectionSchema } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";

// Stripe client - only initialized if API key is available
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
} else {
  console.warn('STRIPE_SECRET_KEY not set - Subscription features will be disabled');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, password } = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser({ email, username, password });
      res.json({ user: { ...user, password: undefined } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({ user: { ...user, password: undefined }, token: user.id });
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
      const listingData = insertListingSchema.parse(req.body);
      const listing = await storage.createListing(req.user!.id, listingData);
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

      const job = await queueService.createPostListingJob(req.user!.id, listingId, marketplaces);
      res.json(job);
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

  // Stripe subscription routes
  app.post('/api/get-or-create-subscription', requireAuth, async (req, res) => {
    if (!stripe) {
      return res.status(501).json({ error: "Stripe is not configured - subscription features are disabled" });
    }
    
    let user = req.user!;

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
          price: process.env.STRIPE_PRICE_ID, // Pro plan price ID
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUser(user.id, { 
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        plan: "pro"
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
              plan = "pro"; // Map based on your price IDs
            }
            
            await storage.updateUser(user.id, {
              subscriptionStatus: subscription.status,
              plan,
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

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different types of WebSocket messages
        switch (data.type) {
          case 'subscribe':
            // Subscribe to user-specific updates
            (ws as any).userId = data.userId;
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Function to broadcast updates to specific users
  global.broadcastToUser = (userId: string, data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client as any).userId === userId) {
        client.send(JSON.stringify(data));
      }
    });
  };

  return httpServer;
}
