import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { type User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers.authorization?.replace("Bearer ", "");
  
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // In a real implementation, you would verify a JWT token here
  // For now, we'll just use the user ID directly
  storage.getUser(userId).then(user => {
    if (!user) {
      return res.status(401).json({ error: "Invalid authentication" });
    }
    req.user = user;
    next();
  }).catch(() => {
    res.status(401).json({ error: "Authentication failed" });
  });
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers.authorization?.replace("Bearer ", "");
  
  if (userId) {
    storage.getUser(userId).then(user => {
      if (user) {
        req.user = user;
      }
      next();
    }).catch(() => {
      next();
    });
  } else {
    next();
  }
}

export function requirePlan(plans: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!plans.includes(req.user.plan)) {
      return res.status(403).json({ 
        error: "Upgrade required", 
        requiredPlan: plans,
        currentPlan: req.user.plan 
      });
    }

    next();
  };
}
