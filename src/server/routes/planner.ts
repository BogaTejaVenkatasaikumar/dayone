import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/planner - Get today's planner items
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { date } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];

    const items = db.prepare(
      'SELECT id, title, scheduled_time, is_completed, date FROM planner_items WHERE user_id = ? AND date = ? ORDER BY scheduled_time'
    ).all(userId, targetDate);

    res.json(items.map((i: any) => ({ ...i, is_completed: !!i.is_completed })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/planner - Create a new planner item
router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { title, scheduled_time, date } = req.body;

    if (!title || !scheduled_time) {
      res.status(400).json({ error: 'Missing title or scheduled_time' });
      return;
    }

    const id = uuidv4();
    const targetDate = date || new Date().toISOString().split('T')[0];

    db.prepare(
      'INSERT INTO planner_items (id, user_id, title, scheduled_time, is_completed, date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, userId, title, scheduled_time, 0, targetDate);

    res.status(201).json({ id, title, scheduled_time, is_completed: false, date: targetDate });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/planner/:id - Toggle is_completed status
router.put('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { id } = req.params;
    const { is_completed } = req.body;

    const val = is_completed ? 1 : 0;
    db.prepare('UPDATE planner_items SET is_completed = ? WHERE id = ? AND user_id = ?').run(val, id, userId);

    res.json({ message: 'Planner item updated successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/planner/:id - Delete planner item
router.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { id } = req.params;

    db.prepare('DELETE FROM planner_items WHERE id = ? AND user_id = ?').run(id, userId);

    res.json({ message: 'Planner item deleted' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
