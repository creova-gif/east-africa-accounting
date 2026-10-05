/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/app-error';

interface JWTPayload {
  userId: string;
  tenantId: string;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET?.trim();

    // Fail closed: never verify (or accept) a token when the signing secret is unset.
    if (!secret) {
      throw new AppError('Unauthorized', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, secret) as Partial<JWTPayload>;

    if (!decoded.userId || !decoded.tenantId) {
      throw new AppError('Invalid token', 401);
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
    };

    // Set tenant context for PostgreSQL RLS (Row-Level Security)
    // This would be used if you implement RLS
    // await query('SET app.current_tenant_id = $1', [decoded.tenantId]);

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    next(error);
  }
};
