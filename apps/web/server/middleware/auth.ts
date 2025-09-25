import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { type User } from "../shared/schema.ts";
import { verifyToken } from "../auth";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Verify JWT token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Get user from database to ensure they still exist
  storage.getUser(decoded.userId).then(user => {
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  }).catch(() => {
    res.status(401).json({ error: "Authentication failed" });
  });
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (token) {
    // Verify JWT token
    const decoded = verifyToken(token);
    if (decoded) {
      storage.getUser(decoded.userId).then(user => {
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
