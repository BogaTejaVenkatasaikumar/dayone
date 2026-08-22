import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import logger, { securityLogger } from '../logger.js';

const router = Router();

// ─────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns the current user's profile (including goal from our DB)
// ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const clerkUserId = req.user!.id;

    // Look up our local record by clerk_id
    const user = db.prepare(
      'SELECT id, email, name, avatar_url, email_verified, goal, created_at FROM users WHERE clerk_id = ?'
    ).get(clerkUserId) as {
      id: string; email: string; name: string;
      avatar_url: string; email_verified: number;
      goal: string; created_at: string;
    } | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: clerkUserId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      emailVerified: !!user.email_verified,
      goal: user.goal || null,
      createdAt: user.created_at,
    });
  } catch (error) {
    securityLogger.apiError('GET', '/api/auth/me', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/logout  (kept for backward compat — Clerk handles actual sign-out)
// ─────────────────────────────────────────────────────────
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out' });
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/webhook
// Clerk sends events here (user.created, user.updated, user.deleted)
// Set the Webhook Secret in Clerk Dashboard → Webhooks → Signing Secret
// ─────────────────────────────────────────────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.warn('⚠️  CLERK_WEBHOOK_SECRET not set — skipping webhook verification');
    res.status(200).json({ received: true });
    return;
  }

  // Verify the webhook signature using svix
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    res.status(400).json({ error: 'Missing svix headers' });
    return;
  }

  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    const body = JSON.stringify(req.body);
    const evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as { type: string; data: any };

    const { type, data } = evt;

    if (type === 'user.created') {
      const clerkId = data.id;
      const email = data.email_addresses?.[0]?.email_address || '';
      const name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      const avatarUrl = data.image_url || '';
      const emailVerified = data.email_addresses?.[0]?.verification?.status === 'verified' ? 1 : 0;

      // Check if user already exists by clerk_id
      const existingByClerk = db.prepare('SELECT id FROM users WHERE clerk_id = ?').get(clerkId);
      if (!existingByClerk) {
        // Check if user already exists by email (to merge local account)
        const existingByEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
        
        if (existingByEmail) {
          db.prepare(
            'UPDATE users SET clerk_id = ?, name = ?, avatar_url = ?, email_verified = ? WHERE id = ?'
          ).run(clerkId, name, avatarUrl, emailVerified, existingByEmail.id);
          logger.info('Linked existing user to Clerk ID', {
            email: email.substring(0, 3) + '***',
            clerkId: clerkId.slice(-6),
          });
        } else {
          // Insert new record
          const userId = uuidv4();
          db.prepare(
            'INSERT INTO users (id, clerk_id, email, name, avatar_url, email_verified) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(userId, clerkId, email, name, avatarUrl, emailVerified);

          db.prepare('INSERT INTO user_progress (user_id) VALUES (?)').run(userId);
          logger.info('Synced new Clerk user', {
            email: email.substring(0, 3) + '***',
            clerkId: clerkId.slice(-6),
          });
        }
      }
    }

    if (type === 'user.updated') {
      const clerkId = data.id;
      const email = data.email_addresses?.[0]?.email_address || '';
      const name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      const avatarUrl = data.image_url || '';

      db.prepare(
        'UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE clerk_id = ?'
      ).run(email, name, avatarUrl, clerkId);
    }

    if (type === 'user.deleted') {
      const clerkId = data.id;
      const user = db.prepare('SELECT id FROM users WHERE clerk_id = ?').get(clerkId) as { id: string } | undefined;
      if (user) {
        db.prepare('DELETE FROM user_progress WHERE user_id = ?').run(user.id);
        db.prepare('DELETE FROM users WHERE clerk_id = ?').run(clerkId);
        logger.info('Deleted user account', { clerkId: clerkId.slice(-6) });
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook verification failed', { 
      error: (err as Error).message,
      event: 'WEBHOOK_VERIFY_FAIL'
    });
    res.status(400).json({ error: 'Webhook verification failed' });
  }
});

export default router;
