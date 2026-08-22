import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { securityLogger } from '../logger.js';
import { explainStuckTask } from '../services/ai.js';

const router = Router();

// GET /api/roadmap — modules + days with user-specific progress
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const modules = db.prepare(
      'SELECT id, title, description, duration, order_index, icon, status, tools FROM modules WHERE user_id = ? ORDER BY order_index'
    ).all(userId) as { id: string; title: string; description: string; duration: string; order_index: number; icon: string; status: string; tools: string }[];

    const result = modules.map((mod) => {
      const days = db.prepare(`
        SELECT d.id, d.day_number, d.title, d.description, d.task_name, d.stack, d.expected_outcome, d.video_url,
               COALESCE(udp.status, 'locked') as status,
               COALESCE(udp.progress_pct, 0) as progress_pct
        FROM days d
        LEFT JOIN user_day_progress udp ON d.id = udp.day_id AND udp.user_id = ?
        WHERE d.module_id = ?
        ORDER BY d.day_number
      `).all(userId, mod.id) as {
        id: string; day_number: number; title: string; description: string;
        task_name: string; stack: string; expected_outcome: string; video_url: string;
        status: string; progress_pct: number;
      }[];

      return {
        ...mod,
        days,
      };
    });

    const metadata = db.prepare(
      'SELECT goal, estimated_time, revision_topics FROM users WHERE id = ?'
    ).get(userId) as { goal: string; estimated_time: string; revision_topics: string };

    res.json({
      modules: result,
      goal: metadata?.goal,
      estimated_time: metadata?.estimated_time,
      revision_topics: metadata?.revision_topics ? JSON.parse(metadata.revision_topics) : []
    });
  } catch (error) {
    securityLogger.apiError('GET', '/api/roadmap', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/roadmap/:dayId/stuck - Get AI help for a specific day
router.post('/:dayId/stuck', requireAuth, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { dayId } = req.params;

    // Verify it belongs to the user and gets its details
    const day = db.prepare(`
      SELECT d.task_name, d.description, d.expected_outcome 
      FROM days d
      JOIN modules m ON d.module_id = m.id
      WHERE d.id = ? AND m.user_id = ?
    `).get(dayId, userId) as { task_name: string; description: string; expected_outcome: string } | undefined;

    if (!day) {
      res.status(404).json({ error: 'Day not found or access denied' });
      return;
    }

    const stuckHelp = await explainStuckTask(day.task_name, day.description, day.expected_outcome);
    res.json(stuckHelp);
  } catch (error) {
    securityLogger.apiError('POST', `/api/roadmap/${req.params.dayId}/stuck`, 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Failed to generate help' });
  }
});

export default router;
