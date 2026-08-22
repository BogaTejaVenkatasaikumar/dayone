import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { evaluateMentorAlerts } from '../services/ai.js';

const router = Router();

// GET /api/notifications - Fetch user notifications
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const list = db.prepare(`
      SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
    `).all(userId);

    res.json(list.map((n: any) => ({ ...n, is_read: !!n.is_read })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);

    res.json({ message: 'All notifications marked as read' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/notifications/mentor-alerts - Proactively generate AI Mentor alerts
router.get('/mentor-alerts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    // 1. Gather stats
    const progress = db.prepare(`
      SELECT streak_count, total_xp, current_level, updated_at FROM user_progress WHERE user_id = ?
    `).get(userId) as any;

    if (!progress) {
      res.json([]);
      return;
    }

    const memory = db.prepare(`
      SELECT weak_concepts FROM learning_memory WHERE user_id = ?
    `).get(userId) as any;

    const weakConcepts = memory ? JSON.parse(memory.weak_concepts || '[]') : [];

    // Get current active day
    const activeDay = db.prepare(`
      SELECT d.title FROM days d
      JOIN user_day_progress udp ON d.id = udp.day_id
      WHERE udp.user_id = ? AND udp.status = 'active'
      LIMIT 1
    `).get(userId) as { title: string } | undefined;

    // Calculate days since last active
    const lastActiveDate = db.prepare(`
      SELECT date FROM streak_log WHERE user_id = ? ORDER BY date DESC LIMIT 1
    `).get(userId) as { date: string } | undefined;

    let lastActiveDiffDays = 0;
    if (lastActiveDate) {
      const last = new Date(lastActiveDate.date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - last.getTime());
      lastActiveDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
    }

    // Call AI Mentor alerts generator
    const alerts = await evaluateMentorAlerts({
      streak: progress.streak_count,
      totalXp: progress.total_xp,
      level: progress.current_level,
      lastActiveDiffDays,
      currentDayTitle: activeDay?.title || 'None',
      timeSpentCurrentDayHours: 4, // simulated default
      weakConcepts
    });

    // Save alerts to DB and push to notifications
    db.transaction(() => {
      // Clear previous non-dismissed alerts
      db.prepare("DELETE FROM mentor_alerts WHERE user_id = ? AND is_dismissed = 0").run(userId);

      alerts.forEach((alert) => {
        const id = uuidv4();
        db.prepare(`
          INSERT INTO mentor_alerts (id, user_id, message, type, is_dismissed)
          VALUES (?, ?, ?, ?, 0)
        `).run(id, userId, alert.message, alert.type);

        // Also add to standard notifications
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, content, type)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          userId,
          alert.type === 'warning' ? 'AI Mentor Warning' : 'AI Mentor Suggestion',
          alert.message,
          alert.type === 'warning' ? 'warning' : 'info'
        );
      });
    })();

    // Fetch and return active alerts
    const activeAlerts = db.prepare(`
      SELECT * FROM mentor_alerts WHERE user_id = ? AND is_dismissed = 0 ORDER BY created_at DESC
    `).all(userId);

    res.json(activeAlerts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/mentor-alerts/:id/dismiss - Dismiss mentor alert
router.post('/mentor-alerts/:id/dismiss', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { id } = req.params;

    db.prepare('UPDATE mentor_alerts SET is_dismissed = 1 WHERE id = ? AND user_id = ?').run(id, userId);

    res.json({ message: 'Alert dismissed' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
