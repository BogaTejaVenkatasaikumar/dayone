import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { conductMockInterview } from '../services/ai.js';

const router = Router();

// GET /api/interviews/active - Get active mock interview
router.get('/active', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const interview = db.prepare(`
      SELECT * FROM mock_interviews WHERE user_id = ? AND status = 'active'
    `).get(userId) as any;

    if (!interview) {
      res.json(null);
      return;
    }

    res.json({
      id: interview.id,
      role_name: interview.role_name,
      current_question_index: interview.current_question_index,
      questions: JSON.parse(interview.questions || '[]'),
      answers: JSON.parse(interview.answers || '[]'),
      feedback: interview.feedback,
      score: interview.score,
      status: interview.status
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/interviews/start - Start mock interview
router.post('/start', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { role_name } = req.body;

    if (!role_name) {
      res.status(400).json({ error: 'role_name is required' });
      return;
    }

    // Dismiss existing active interviews
    db.prepare(`
      UPDATE mock_interviews SET status = 'completed' WHERE user_id = ? AND status = 'active'
    `).run(userId);

    // Call AI to get the first question
    const response = await conductMockInterview(role_name, []);

    const interviewId = uuidv4();
    const questions = [response.question];

    db.prepare(`
      INSERT INTO mock_interviews (id, user_id, role_name, current_question_index, questions, answers, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      interviewId,
      userId,
      role_name,
      0,
      JSON.stringify(questions),
      JSON.stringify([]),
      'active'
    );

    res.json({
      id: interviewId,
      role_name,
      current_question_index: 0,
      question: response.question,
      status: 'active'
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/interviews/answer - Submit answer and receive next question or scorecard
router.post('/answer', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { interview_id, answer } = req.body;

    if (!interview_id || !answer) {
      res.status(400).json({ error: 'Missing interview_id or answer' });
      return;
    }

    const interview = db.prepare(`
      SELECT * FROM mock_interviews WHERE id = ? AND user_id = ? AND status = 'active'
    `).get(interview_id, userId) as any;

    if (!interview) {
      res.status(404).json({ error: 'Active interview not found' });
      return;
    }

    const questions = JSON.parse(interview.questions || '[]');
    const answers = JSON.parse(interview.answers || '[]');

    // Construct history for AI call
    const chatHistory: { role: string; content: string }[] = [];
    questions.forEach((q: string, idx: number) => {
      chatHistory.push({ role: 'assistant', content: q });
      if (answers[idx] !== undefined) {
        chatHistory.push({ role: 'user', content: answers[idx] });
      }
    });

    // Save candidate response locally
    answers.push(answer);

    // Call AI to evaluate and decide next step
    const nextStep = await conductMockInterview(interview.role_name, chatHistory, answer);

    if (nextStep.is_completed) {
      // Interview complete! Save scorecard, award XP (+500 XP) and update level
      const finalScore = nextStep.score || 80;
      const feedback = nextStep.question; // Contains the final summary analysis

      db.transaction(() => {
        db.prepare(`
          UPDATE mock_interviews 
          SET answers = ?, feedback = ?, score = ?, status = 'completed', current_question_index = current_question_index + 1
          WHERE id = ? AND user_id = ?
        `).run(JSON.stringify(answers), feedback, finalScore, interview_id, userId);

        db.prepare(`
          UPDATE user_progress 
          SET total_xp = total_xp + 500,
              current_level = 1 + CAST((total_xp + 500) / 1000 AS INTEGER)
          WHERE user_id = ?
        `).run(userId);

        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT INTO streak_log (user_id, date, xp_earned) 
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, date) DO UPDATE SET xp_earned = xp_earned + ?
        `).run(userId, today, 500, 500);

        // Award badge: "Communicator" (first completed interview)
        const communicatorBadge = db.prepare("SELECT id FROM badges WHERE label = 'Communicator'").get() as any;
        if (communicatorBadge) {
          db.prepare("INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)").run(userId, communicatorBadge.id);
        }
      })();

      res.json({
        is_completed: true,
        feedback,
        score: finalScore,
        xpEarned: 500
      });
    } else {
      // Save next question and continue
      questions.push(nextStep.question);
      const newIndex = interview.current_question_index + 1;

      db.prepare(`
        UPDATE mock_interviews 
        SET questions = ?, answers = ?, current_question_index = ?
        WHERE id = ? AND user_id = ?
      `).run(JSON.stringify(questions), JSON.stringify(answers), newIndex, interview_id, userId);

      res.json({
        is_completed: false,
        question: nextStep.question,
        feedback: nextStep.feedback, // feedback on the latest answer
        current_question_index: newIndex
      });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
