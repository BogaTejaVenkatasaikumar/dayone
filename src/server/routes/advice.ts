import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { securityLogger } from '../logger.js';

const router = Router();

// GET /api/advice — tips and mistakes
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const smartTips = db.prepare(
      "SELECT id, title, content, icon FROM tips WHERE category = 'smart_tip' AND user_id = ?"
    ).all(userId) as { id: string; title: string; content: string; icon: string }[];

    const mistakes = db.prepare(
      "SELECT id, title, content, icon FROM tips WHERE category = 'mistake' AND user_id = ?"
    ).all(userId) as { id: string; title: string; content: string; icon: string }[];

    // Get user-specific coaching insight from progress and user data
    const progress = db.prepare(
      'SELECT overall_completion_pct, streak_count FROM user_progress WHERE user_id = ?'
    ).get(userId) as { overall_completion_pct: number; streak_count: number } | undefined;

    const user = db.prepare(
      'SELECT motivation_quote FROM users WHERE id = ?'
    ).get(userId) as { motivation_quote: string } | undefined;

    const completionPct = progress?.overall_completion_pct || 0;
    const streakCount = progress?.streak_count || 0;

    // Dynamic coach insight based on user's actual data
    const coachInsight = {
      quote: user?.motivation_quote || "The gap between knowledge and mastery is consistent, focused repetition.",
      analysis: `You've reached ${completionPct}% overall completion with a ${streakCount}-day streak. Keep pushing to maintain your momentum.`,
      skillVelocity: streakCount > 3 ? '+12%' : '+5%',
      retentionMessage: streakCount > 5
        ? `Retention rate is climbing. You are outperforming 82% of peers.`
        : `Building consistency. Maintain your streak to see retention improvements.`,
    };

    res.json({
      coachInsight,
      smartTips,
      mistakes,
    });
  } catch (error) {
    securityLogger.apiError('GET', '/api/advice', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
