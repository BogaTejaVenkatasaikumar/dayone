import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboards/institution - Fetch institution-wide metrics
router.get('/institution', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    // Overall stats for the mock dashboards
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const avgProgress = db.prepare('SELECT AVG(overall_completion_pct) as avg FROM user_progress').get() as any;
    const avgStreak = db.prepare('SELECT AVG(streak_count) as avg FROM user_progress').get() as any;

    const leaderboards = db.prepare(`
      SELECT u.name, u.email, up.total_xp, up.streak_count, up.overall_completion_pct
      FROM users u
      JOIN user_progress up ON u.id = up.user_id
      ORDER BY up.total_xp DESC
      LIMIT 10
    `).all();

    res.json({
      metrics: {
        totalStudents: totalUsers?.count || 0,
        averageCompletion: Math.round(avgProgress?.avg || 0),
        averageStreak: Math.round(avgStreak?.avg || 0),
        activeCohortsCount: 3,
        systemHealth: '100% online'
      },
      cohorts: [
        { id: 'c1', name: 'Software Engineering Cohort A', size: 14, focus: 'Full Stack Development', activeRoadmaps: 12 },
        { id: 'c2', name: 'Data Science Bootcamp 2026', size: 8, focus: 'Python & ML', activeRoadmaps: 8 },
        { id: 'c3', name: 'UI/UX Design Intensive', size: 6, focus: 'Figma & Systems', activeRoadmaps: 5 }
      ],
      leaderboards
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dashboards/teacher/students - Fetch student rosters with metrics
router.get('/teacher/students', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const list = db.prepare(`
      SELECT u.id, u.name, u.email, u.goal, u.avatar_url,
             up.streak_count, up.total_xp, up.current_level, up.overall_completion_pct
      FROM users u
      JOIN user_progress up ON u.id = up.user_id
      ORDER BY up.overall_completion_pct DESC
    `).all() as any[];

    // Include student projects to grade if any
    const projectSubmissions = db.prepare(`
      SELECT up.*, u.name as student_name, d.title as day_title
      FROM user_projects up
      JOIN users u ON up.user_id = u.id
      JOIN days d ON up.day_id = d.id
      WHERE up.status = 'submitted'
      ORDER BY up.updated_at DESC
    `).all();

    res.json({
      students: list,
      pendingGrading: projectSubmissions
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dashboards/teacher/grade-project - Grade a project manually
router.post('/teacher/grade-project', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { submission_id, score, feedback } = req.body;

    if (!submission_id || score === undefined || !feedback) {
      res.status(400).json({ error: 'Missing submission_id, score, or feedback' });
      return;
    }

    db.transaction(() => {
      // Get student's project details
      const project = db.prepare('SELECT user_id, title FROM user_projects WHERE id = ?').get(submission_id) as any;
      if (!project) return;

      db.prepare(`
        UPDATE user_projects 
        SET status = 'reviewed', score = ?, evaluation = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(score, feedback, submission_id);

      // Notify the user
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, content, type)
        VALUES (?, ?, ?, ?, 'success')
      `).run(
        uuidv4(),
        project.user_id,
        'Project Graded by Teacher',
        `Your project "${project.title}" was reviewed. Score: ${score}/100. Feedback: ${feedback.slice(0, 80)}...`
      );
    })();

    res.json({ message: 'Project graded successfully!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dashboards/parent/student - Look up a student by email
router.get('/parent/student', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.query;

    if (!email) {
      res.status(400).json({ error: 'Student email is required' });
      return;
    }

    const student = db.prepare(`
      SELECT u.id, u.name, u.email, u.goal, u.avatar_url,
             up.streak_count, up.total_xp, up.current_level, up.overall_completion_pct
      FROM users u
      JOIN user_progress up ON u.id = up.user_id
      WHERE u.email = ?
    `).get(email) as any;

    if (!student) {
      res.status(404).json({ error: 'No student found with that email address' });
      return;
    }

    // Get active day task
    const activeDay = db.prepare(`
      SELECT d.title, d.task_name, d.expected_outcome
      FROM days d
      JOIN user_day_progress udp ON d.id = udp.day_id
      WHERE udp.user_id = ? AND udp.status = 'active'
      LIMIT 1
    `).get(student.id);

    res.json({
      student,
      activeDay: activeDay || null
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/dashboards/parent/motivate - Send parent encouragement message
router.post('/parent/motivate', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { student_id, parent_name, message } = req.body;

    if (!student_id || !parent_name || !message) {
      res.status(400).json({ error: 'Missing student_id, parent_name, or message' });
      return;
    }

    db.transaction(() => {
      // 1. Insert parent message
      db.prepare(`
        INSERT INTO parent_messages (id, student_id, parent_name, message)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), student_id, parent_name, message);

      // 2. Insert alert notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, content, type)
        VALUES (?, ?, ?, ?, 'info')
      `).run(
        uuidv4(),
        student_id,
        'New Message from Parent',
        `Your parent (${parent_name}) sent you a motivational note!`
      );
      
      // Update motivation quote in users
      db.prepare("UPDATE users SET motivation_quote = ? WHERE id = ?").run(
        `"${message}" — Encouragement from ${parent_name}`,
        student_id
      );
    })();

    res.json({ message: 'Encouragement message sent to student dashboard!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
