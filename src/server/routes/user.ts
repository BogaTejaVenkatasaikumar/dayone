import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { validateUpdateProfile } from '../middleware/validate.js';
import { securityLogger } from '../logger.js';

const router = Router();

// GET /api/user/profile — always scoped to req.user.id (IDOR safe)
router.get('/profile', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId; // Always from JWT internal ID

    const user = db.prepare(
      'SELECT id, email, name, avatar_url, email_verified, created_at FROM users WHERE id = ?'
    ).get(userId) as { id: string; email: string; name: string; avatar_url: string; email_verified: number; created_at: string } | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const progress = db.prepare(
      'SELECT streak_count, total_xp, current_level, daily_completion_pct, overall_completion_pct FROM user_progress WHERE user_id = ?'
    ).get(userId) as { streak_count: number; total_xp: number; current_level: number; daily_completion_pct: number; overall_completion_pct: number } | undefined;

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      emailVerified: !!user.email_verified,
      createdAt: user.created_at,
      progress: progress || {
        streakCount: 0,
        totalXp: 0,
        currentLevel: 1,
        dailyCompletionPct: 0,
        overallCompletionPct: 0,
      },
    });
  } catch (error) {
    securityLogger.apiError('GET', '/api/user/profile', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/profile — only updates own profile (IDOR safe)
router.put('/profile', requireAuth, validateUpdateProfile, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { name, avatar_url } = req.body;

    const updates: string[] = [];
    const values: (string | undefined)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No update fields provided' });
      return;
    }

    updates.push("updated_at = datetime('now')");
    values.push(userId);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    res.json({ message: 'Profile updated' });
  } catch (error) {
    securityLogger.apiError('PUT', '/api/user/profile', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
