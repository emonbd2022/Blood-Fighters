import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No auth token, access denied" });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { id: string, role: string };
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token verification failed, authorization denied" });
  }
};

export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  auth(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Access denied, admin only" });
    }
    next();
  });
};
