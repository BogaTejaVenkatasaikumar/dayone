import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { validateSearch } from '../middleware/validate.js';
import { securityLogger } from '../logger.js';

const router = Router();

// GET /api/resources — public catalog (auth required for user-specific data)
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const resources = db.prepare(
      'SELECT id, category, title, description, author, url, image_url, tags, progress_pct, rating, explanation FROM resources WHERE user_id = ? ORDER BY category'
    ).all(userId) as {
      id: string; category: string; title: string; description: string;
      author: string; url: string; image_url: string; tags: string;
      progress_pct: number; rating: number; explanation: string;
    }[];

    // Group by category
    const grouped: Record<string, typeof resources> = { tools: [], courses: [], books: [] };
    for (const r of resources) {
      const parsed = { ...r, tags: JSON.parse(r.tags || '[]') };
      if (grouped[r.category]) {
        grouped[r.category].push(parsed);
      }
    }

    res.json(grouped);
  } catch (error) {
    securityLogger.apiError('GET', '/api/resources', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/resources/search?q= — sanitized search
router.get('/search', requireAuth, validateSearch, (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || '';

    if (!query.trim()) {
      res.json([]);
      return;
    }

    const userId = req.user!.dbId;

    // Parameterized LIKE query (SQL injection safe)
    const resources = db.prepare(
      `SELECT id, category, title, description, author, tags, rating, explanation
       FROM resources
       WHERE user_id = ? AND (title LIKE ? OR description LIKE ? OR author LIKE ?)
       LIMIT 20`
    ).all(userId, `%${query}%`, `%${query}%`, `%${query}%`) as {
      id: string; category: string; title: string; description: string;
      author: string; tags: string; rating: number; explanation: string;
    }[];

    res.json(resources.map((r) => ({ ...r, tags: JSON.parse(r.tags || '[]') })));
  } catch (error) {
    securityLogger.apiError('GET', '/api/resources/search', 500, req.user?.id, (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
