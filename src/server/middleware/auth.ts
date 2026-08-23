import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import logger from '../logger.js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export interface AuthUser {
  id: string;      // Clerk user ID
  dbId: string;    // Internal database UUID
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Verify Clerk session token from Authorization: Bearer <token>
 * and attach user info to req.user
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify the Clerk session token (standalone function from @clerk/backend)
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!payload || !payload.sub) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const clerkId = payload.sub;

    // Get user from our database — find by clerk_id
    let dbUser = db.prepare('SELECT id, email FROM users WHERE clerk_id = ?').get(clerkId) as { id: string; email: string } | undefined;
    
    // If not found, it might be a new user (webhook pending or local dev)
    // We'll fetch user details from Clerk's API and provision them on the fly
    if (!dbUser) {
      try {
        const clerkUser = await clerk.users.getUser(clerkId);
        const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
        const avatarUrl = clerkUser.imageUrl || '';
        const emailVerified = clerkUser.emailAddresses?.[0]?.verification?.status === 'verified' ? 1 : 0;

        if (email) {
          // Check if user exists by email (to merge/link)
          const found = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email) as { id: string; email: string } | undefined;
          if (found) {
            dbUser = found;
            db.prepare('UPDATE users SET clerk_id = ?, name = ?, avatar_url = ?, email_verified = ? WHERE id = ?').run(
              clerkId, name, avatarUrl, emailVerified, dbUser.id
            );
            logger.info('JIT linked existing user to Clerk ID', { email, clerkId });
          } else {
            // JIT create new user record
            const newUserId = uuidv4();
            db.prepare(
              'INSERT INTO users (id, clerk_id, email, name, avatar_url, email_verified) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(newUserId, clerkId, email, name, avatarUrl, emailVerified);

            db.prepare('INSERT INTO user_progress (user_id) VALUES (?)').run(newUserId);
            dbUser = { id: newUserId, email };
            logger.info('JIT provisioned new user record', { email, clerkId });
          }
        }
      } catch (error) {
        logger.error('JIT provisioning failed', { clerkId, error: (error as Error).message });
      }
    }

    // Set user payload
    req.user = { 
      id: clerkId, 
      dbId: dbUser?.id || '', 
      email: dbUser?.email || '' 
    };
    next();
  } catch (error) {
    logger.warn('Clerk token verification failed', {
      event: 'AUTH_INVALID_TOKEN',
      ip: req.ip,
      error: (error as Error).message,
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require Admin Role (must be used after requireAuth)
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user?.dbId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.dbId) as { role: string } | undefined;
  if (user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

/**
 * Optional auth — attaches user if valid token present, but doesn't block
 */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      if (payload?.sub) {
        const clerkId = payload.sub;
        const dbUser = db.prepare('SELECT id FROM users WHERE clerk_id = ?').get(clerkId) as { id: string } | undefined;
        req.user = { id: clerkId, dbId: dbUser?.id || '', email: '' };
      }
    } catch {
      // Token invalid/expired — continue as anonymous
    }
  }
  next();
}
