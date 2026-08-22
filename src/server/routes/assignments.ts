import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { generateAssignment } from '../services/ai.js';

const router = Router();

// GET /api/assignments - Get user assignments
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const list = db.prepare(`
      SELECT a.*, d.title as day_title, d.task_name
      FROM assignments a
      JOIN days d ON a.day_id = d.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `).all(userId);

    res.json(list.map((a: any) => ({
      ...a,
      questions: JSON.parse(a.questions || '[]'),
      answers: JSON.parse(a.answers || '[]'),
      feedback: a.feedback ? JSON.parse(a.feedback) : null
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/assignments/generate - Generate assignment for a day
router.post('/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { day_id } = req.body;

    if (!day_id) {
      res.status(400).json({ error: 'day_id is required' });
      return;
    }

    // Verify day exists and belongs to user
    const day = db.prepare(`
      SELECT d.id, d.title, d.description, d.task_name
      FROM days d
      JOIN modules m ON d.module_id = m.id
      WHERE d.id = ? AND m.user_id = ?
    `).get(day_id, userId) as any;

    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    // Call AI to generate assignment quiz questions
    const generated = await generateAssignment(day.title, day.description, day.task_name);

    const assignmentId = uuidv4();
    db.prepare(`
      INSERT INTO assignments (id, user_id, day_id, questions, score, max_score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      assignmentId,
      userId,
      day_id,
      JSON.stringify(generated.questions),
      0,
      generated.questions.length,
      'pending'
    );

    res.json({
      id: assignmentId,
      day_id,
      day_title: day.title,
      questions: generated.questions,
      status: 'pending'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/assignments/submit - Grade the quiz and update Learning Memory
router.post('/submit', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { assignment_id, answers } = req.body; // answers: { [questionId]: optionText }

    if (!assignment_id || !answers) {
      res.status(400).json({ error: 'Missing assignment_id or answers' });
      return;
    }

    const assignment = db.prepare(`
      SELECT a.*, d.title as day_title FROM assignments a JOIN days d ON a.day_id = d.id WHERE a.id = ? AND a.user_id = ?
    `).get(assignment_id, userId) as any;

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.status === 'completed') {
      res.status(400).json({ error: 'Assignment has already been completed' });
      return;
    }

    const questions = JSON.parse(assignment.questions || '[]');
    let score = 0;
    const gradingDetails: any[] = [];

    questions.forEach((q: any) => {
      const candidateAnswer = answers[q.id] || '';
      const isCorrect = candidateAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
      if (isCorrect) score++;

      gradingDetails.push({
        questionId: q.id,
        candidateAnswer,
        correctAnswer: q.answer,
        isCorrect,
        explanation: q.explanation
      });
    });

    const maxScore = questions.length;
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const xpAwarded = score * 50; // 50 XP per correct answer!

    db.transaction(() => {
      // 1. Update assignment record
      db.prepare(`
        UPDATE assignments 
        SET score = ?, answers = ?, feedback = ?, status = 'completed'
        WHERE id = ? AND user_id = ?
      `).run(score, JSON.stringify(answers), JSON.stringify(gradingDetails), assignment_id, userId);

      // 2. Award XP
      if (xpAwarded > 0) {
        db.prepare(`
          UPDATE user_progress 
          SET total_xp = total_xp + ?,
              current_level = 1 + CAST((total_xp + ?) / 1000 AS INTEGER)
          WHERE user_id = ?
        `).run(xpAwarded, xpAwarded, userId);

        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT INTO streak_log (user_id, date, xp_earned) 
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, date) DO UPDATE SET xp_earned = xp_earned + ?
        `).run(userId, today, xpAwarded, xpAwarded);
      }

      // 3. Update Learning Memory
      // Get memory record, create if doesn't exist
      const memory = db.prepare('SELECT * FROM learning_memory WHERE user_id = ?').get(userId) as any;
      let mastered = [];
      let weak = [];
      let history = [];

      if (memory) {
        mastered = JSON.parse(memory.concepts_mastered || '[]');
        weak = JSON.parse(memory.weak_concepts || '[]');
        history = JSON.parse(memory.quiz_history || '[]');
      } else {
        db.prepare('INSERT INTO learning_memory (user_id) VALUES (?)').run(userId);
      }

      const topic = assignment.day_title;

      // Add to history
      history.push({
        assignment_id,
        date: new Date().toISOString(),
        score,
        maxScore,
        pct
      });

      // Update weak and mastered lists based on passing grade (>= 70%)
      if (pct >= 70) {
        if (!mastered.includes(topic)) mastered.push(topic);
        // Remove from weak if it was there
        weak = weak.filter((w: string) => w !== topic);
      } else {
        if (!weak.includes(topic)) weak.push(topic);
        // Remove from mastered if it was there
        mastered = mastered.filter((m: string) => m !== topic);
      }

      db.prepare(`
        UPDATE learning_memory 
        SET concepts_mastered = ?, 
            weak_concepts = ?, 
            quiz_history = ?, 
            updated_at = datetime('now')
        WHERE user_id = ?
      `).run(JSON.stringify(mastered), JSON.stringify(weak), JSON.stringify(history), userId);
    })();

    res.json({
      score,
      maxScore,
      gradingDetails,
      xpAwarded
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
