import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { validateCompleteDay } from '../middleware/validate.js';
import { securityLogger } from '../logger.js';

const router = Router();

// GET /api/progress — dashboard stats for current user only
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    // Get user progress
    const progress = db.prepare(
      'SELECT streak_count, total_xp, current_level, daily_completion_pct, overall_completion_pct FROM user_progress WHERE user_id = ?'
    ).get(userId) as { streak_count: number; total_xp: number; current_level: number; daily_completion_pct: number; overall_completion_pct: number } | undefined;

    // Get weekly velocity (last 7 days)
    const weeklyData = db.prepare(`
      SELECT date, xp_earned FROM streak_log
      WHERE user_id = ? AND date >= date('now', '-7 days')
      ORDER BY date
    `).all(userId) as { date: string; xp_earned: number }[];

    // Calculate weekly velocity as array of 7 values
    const today = new Date();
    const weeklyVelocity: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const entry = weeklyData.find((d) => d.date === dateStr);
      weeklyVelocity.push(entry ? entry.xp_earned : 0);
    }

    res.json({
      streakCount: progress?.streak_count || 0,
      totalXp: progress?.total_xp || 0,
      currentLevel: progress?.current_level || 1,
      dailyCompletionPct: progress?.daily_completion_pct || 0,
      overallCompletionPct: progress?.overall_completion_pct || 0,
      weeklyVelocity,
    });
  } catch (error) {
    securityLogger.apiError('GET', '/api/progress', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/progress/complete-day — mark today's work done (ownership enforced)
router.post('/complete-day', requireAuth, validateCompleteDay, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { day_id } = req.body;

    // Verify the day exists
    const day = db.prepare('SELECT id, module_id FROM days WHERE id = ?').get(day_id) as { id: string; module_id: string } | undefined;
    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    // Verify user has this day in progress (IDOR: only user's own progress)
    const dayProgress = db.prepare(
      'SELECT status FROM user_day_progress WHERE user_id = ? AND day_id = ?'
    ).get(userId, day_id) as { status: string } | undefined;

    if (!dayProgress) {
      res.status(404).json({ error: 'Day progress not found' });
      return;
    }

    if (dayProgress.status === 'completed') {
      res.status(400).json({ error: 'Day already completed' });
      return;
    }

    if (dayProgress.status === 'locked') {
      res.status(403).json({ error: 'Day is locked. Complete previous days first.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Transaction: update day, streak, progress
    const completeTransaction = db.transaction(() => {
      // Mark day as completed
      db.prepare(
        "UPDATE user_day_progress SET status = 'completed', progress_pct = 100, completed_at = datetime('now') WHERE user_id = ? AND day_id = ?"
      ).run(userId, day_id);

      // Log streak
      db.prepare(
        'INSERT OR IGNORE INTO streak_log (user_id, date, xp_earned) VALUES (?, ?, ?)'
      ).run(userId, today, 100);

      // Unlock next day (even if it's in the next module)
      const currentDay = db.prepare('SELECT day_number FROM days WHERE id = ?').get(day_id) as { day_number: number };
      const nextDay = db.prepare('SELECT id, module_id FROM days WHERE user_id = ? AND day_number = ?').get(userId, currentDay.day_number + 1) as { id: string; module_id: string } | undefined;

      if (nextDay) {
        db.prepare(
          "UPDATE user_day_progress SET status = 'active' WHERE user_id = ? AND day_id = ? AND status = 'locked'"
        ).run(userId, nextDay.id);

        db.prepare("UPDATE modules SET status = 'active' WHERE id = ? AND status = 'locked'").run(nextDay.module_id);
      }

      // Calculate streak
      let streak = 1;
      let checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const entry = db.prepare(
          'SELECT 1 FROM streak_log WHERE user_id = ? AND date = ?'
        ).get(userId, dateStr);
        if (!entry) break;
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      // Calculate overall completion
      const totalDays = db.prepare('SELECT COUNT(*) as count FROM user_day_progress WHERE user_id = ?').get(userId) as { count: number };
      const completedDays = db.prepare(
        "SELECT COUNT(*) as count FROM user_day_progress WHERE user_id = ? AND status = 'completed'"
      ).get(userId) as { count: number };
      const overallPct = totalDays.count > 0 ? Math.round((completedDays.count / totalDays.count) * 100) : 0;

      // Update progress
      db.prepare(`
        UPDATE user_progress SET
          streak_count = ?,
          total_xp = total_xp + 100,
          daily_completion_pct = 100,
          overall_completion_pct = ?,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(streak, overallPct, userId);

      // --- Badge Unlocking Logic ---
      const awardBadge = (label: string) => {
        const badge = db.prepare('SELECT id FROM badges WHERE label = ?').get(label) as { id: string } | undefined;
        if (badge) {
          db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badge.id);
        }
      };

      // 1. Code Ninja (10 tasks)
      if (completedDays.count >= 10) awardBadge('Code Ninja');

      // 2. Week Warrior (7 day streak)
      if (streak >= 7) awardBadge('Week Warrior');

      // 3. Early Bird (If completed between 4am and 7am)
      const hour = new Date().getHours();
      if (hour >= 4 && hour <= 7) {
         // Logic for 5 early bird tasks would be better, but for now let's just grant it on one
         awardBadge('Early Bird');
      }

      // 4. Architect (Module 2 started or completed)
      const module2 = db.prepare('SELECT status FROM modules WHERE user_id = ? AND order_index = 2').get(userId) as { status: string } | undefined;
      if (module2 && (module2.status === 'active' || module2.status === 'completed')) {
          awardBadge('Architect');
      }

      return { streak, overallPct };
    });

    const result = completeTransaction();

    res.json({
      message: 'Day completed!',
      streak: result.streak,
      overallCompletionPct: result.overallPct,
      xpEarned: 100,
    });
  } catch (error) {
    securityLogger.apiError('POST', '/api/progress/complete-day', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/progress/badges — user's badges with locked/unlocked status
router.get('/badges', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const badges = db.prepare(`
      SELECT b.id, b.label, b.sub_text, b.icon, b.color,
             CASE WHEN ub.badge_id IS NOT NULL THEN 1 ELSE 0 END as unlocked
      FROM badges b
      LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = ?
    `).all(userId) as { id: string; label: string; sub_text: string; icon: string; color: string; unlocked: number }[];

    res.json(badges.map((b) => ({
      ...b,
      unlocked: !!b.unlocked,
    })));
  } catch (error) {
    securityLogger.apiError('GET', '/api/progress/badges', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
