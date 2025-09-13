import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { marketplaceRulesService } from "./services/marketplaceRulesService";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize marketplace posting rules on startup
  try {
    await marketplaceRulesService.initializeDefaultRules();
    log("✓ Marketplace posting rules initialized");
  } catch (error) {
    log("⚠ Failed to initialize marketplace rules:", error);
  }

  // Rate limiting system self-test
  try {
    log("🔧 Running rate limiting system self-test...");
    
    const { marketplaceService } = await import('./services/marketplaceService');
    const { rateLimitService } = await import('./services/rateLimitService');
    
    // Test supported marketplaces
    const marketplaces = marketplaceService.getSupportedMarketplaces();
    log(`✅ Found ${marketplaces.length} supported marketplaces: ${marketplaces.slice(0, 5).join(', ')}${marketplaces.length > 5 ? '...' : ''}`);
    
    // Test a few key marketplaces
    const testMarketplaces = ['ebay', 'poshmark', 'mercari', 'facebook', 'depop'];
    for (const marketplace of testMarketplaces) {
      try {
        const status = await rateLimitService.getRateLimitStatus(marketplace);
        log(`✅ ${marketplace}: Rate limit status OK (${status.hourlyRemaining}/${status.dailyRemaining} remaining)`);
      } catch (error) {
        log(`⚠️ ${marketplace}: Rate limit status check failed: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    log("🚀 Rate limiting system self-test completed successfully");
  } catch (error) {
    log(`❌ Rate limiting system self-test failed: ${error instanceof Error ? error.message : error}`);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
