import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { generateProjectForDay, evaluateProjectSubmission } from '../services/ai.js';

const router = Router();

// GET /api/projects - Get all projects for user
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const projects = db.prepare(`
      SELECT up.*, d.title as day_title, d.task_name, d.expected_outcome 
      FROM user_projects up
      JOIN days d ON up.day_id = d.id
      WHERE up.user_id = ?
      ORDER BY up.updated_at DESC
    `).all(userId);

    res.json(projects.map((p: any) => ({
      ...p,
      requirements: JSON.parse(p.requirements || '[]')
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/projects/generate - Generate a project for a day
router.post('/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { day_id, difficulty } = req.body;

    if (!day_id) {
      res.status(400).json({ error: 'day_id is required' });
      return;
    }

    // Verify day exists and belongs to user
    const day = db.prepare(`
      SELECT d.id, d.title, d.task_name, d.description, d.expected_outcome
      FROM days d
      JOIN modules m ON d.module_id = m.id
      WHERE d.id = ? AND m.user_id = ?
    `).get(day_id, userId) as any;

    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    const diff = difficulty || 'intermediate';
    const generated = await generateProjectForDay(day.task_name, day.description, day.expected_outcome, diff);

    const projectId = uuidv4();
    db.prepare(`
      INSERT INTO user_projects (id, user_id, day_id, title, description, difficulty, requirements, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      userId,
      day_id,
      generated.title,
      generated.description,
      generated.difficulty,
      JSON.stringify(generated.requirements || []),
      'pending'
    );

    res.json({
      id: projectId,
      day_id,
      title: generated.title,
      description: generated.description,
      difficulty: generated.difficulty,
      requirements: generated.requirements,
      status: 'pending'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/projects/submit - Submit project URL
router.post('/submit', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { project_id, submission_url } = req.body;

    if (!project_id || !submission_url) {
      res.status(400).json({ error: 'Missing project_id or submission_url' });
      return;
    }

    db.prepare(`
      UPDATE user_projects 
      SET submission_url = ?, status = 'submitted', updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(submission_url, project_id, userId);

    res.json({ message: 'Project submitted successfully for grading' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/projects/evaluate - Grade project and update learning memory
router.post('/evaluate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { project_id } = req.body;

    if (!project_id) {
      res.status(400).json({ error: 'project_id is required' });
      return;
    }

    const project = db.prepare(`
      SELECT * FROM user_projects WHERE id = ? AND user_id = ?
    `).get(project_id, userId) as any;

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.status === 'reviewed') {
      res.status(400).json({ error: 'Project has already been reviewed' });
      return;
    }

    const requirements = JSON.parse(project.requirements || '[]');
    const evaluation = await evaluateProjectSubmission(
      project.title,
      project.description,
      requirements,
      project.submission_url
    );

    // Update Project Status
    db.prepare(`
      UPDATE user_projects 
      SET status = 'reviewed', evaluation = ?, score = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(evaluation.feedback, evaluation.score, project_id, userId);

    // Award project completion XP (+300 XP) and update level
    db.transaction(() => {
      db.prepare(`
        UPDATE user_progress 
        SET total_xp = total_xp + 300,
            current_level = 1 + CAST((total_xp + 300) / 1000 AS INTEGER)
        WHERE user_id = ?
      `).run(userId);

      // Log streak
      const today = new Date().toISOString().split('T')[0];
      db.prepare(
        'INSERT OR IGNORE INTO streak_log (user_id, date, xp_earned) VALUES (?, ?, ?)'
      ).run(userId, today, 300);

      // Add to Concepts Mastered in Learning Memory
      const memory = db.prepare('SELECT concepts_mastered FROM learning_memory WHERE user_id = ?').get(userId) as any;
      let masteredList = [];
      if (memory) {
        masteredList = JSON.parse(memory.concepts_mastered || '[]');
      } else {
        db.prepare('INSERT INTO learning_memory (user_id) VALUES (?)').run(userId);
      }

      if (!masteredList.includes(project.title)) {
        masteredList.push(project.title);
        db.prepare("UPDATE learning_memory SET concepts_mastered = ?, updated_at = datetime('now') WHERE user_id = ?")
          .run(JSON.stringify(masteredList), userId);
      }
    })();

    res.json({
      feedback: evaluation.feedback,
      score: evaluation.score,
      xpEarned: 300
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
