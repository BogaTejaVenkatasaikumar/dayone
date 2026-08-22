import { Router, Response } from 'express';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// Helper to calculate level
const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000, 20000];
const LEVEL_NAMES = ['Explorer', 'Learner', 'Builder', 'Practitioner', 'Specialist', 'Professional', 'Expert'];

function calculateLevel(xp: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

// Build daily missions from active day in user's roadmap
function buildMissionsFromActiveDay(userId: string): { id: string; title: string; description: string; xpReward: number; completed: boolean }[] {
  // Get the active day for this user
  const activeDay = db.prepare(`
    SELECT d.title, d.task_name, d.stack, d.expected_outcome, m.title as module_title
    FROM days d
    JOIN modules m ON d.module_id = m.id
    JOIN user_day_progress udp ON d.id = udp.day_id AND udp.user_id = ?
    WHERE udp.status = 'active' AND m.user_id = ?
    ORDER BY d.day_number ASC
    LIMIT 1
  `).get(userId, userId) as { title: string; task_name: string; stack: string; expected_outcome: string; module_title: string } | undefined;

  if (!activeDay) {
    // Fallback generic missions if no active day found
    return [
      { id: '0', title: 'Study your learning module', description: 'Read through today\'s material carefully', xpReward: 20, completed: false },
      { id: '1', title: 'Complete a practice exercise', description: 'Apply what you have learned', xpReward: 30, completed: false },
      { id: '2', title: 'Review your notes', description: 'Consolidate and reinforce today\'s concepts', xpReward: 15, completed: false },
      { id: '3', title: 'Track your progress', description: 'Mark your task complete in the roadmap', xpReward: 10, completed: false },
    ];
  }

  const taskName = activeDay.task_name || activeDay.title || 'Today\'s task';
  const stack = activeDay.stack ? activeDay.stack.split(',')[0].trim() : null;
  const outcome = activeDay.expected_outcome || '';
  const moduleTitle = activeDay.module_title || 'your module';

  const missions = [
    {
      id: '0',
      title: `Study: ${taskName}`,
      description: `Read through the theory and concepts for today's task in ${moduleTitle}`,
      xpReward: 20,
      completed: false
    },
    {
      id: '1',
      title: stack ? `Practice ${stack}` : 'Code the task',
      description: `Write and run code for: ${taskName}`,
      xpReward: 50,
      completed: false
    },
    {
      id: '2',
      title: `Verify: ${outcome ? outcome.substring(0, 60) + (outcome.length > 60 ? '…' : '') : 'expected outcome'}`,
      description: 'Confirm your output matches the expected result for today',
      xpReward: 30,
      completed: false
    },
    {
      id: '3',
      title: 'Mark today complete',
      description: 'Click Mark Complete on the Core Mission card to log your progress',
      xpReward: 25,
      completed: false
    },
  ];

  return missions;
}

router.get('/missions', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const today = new Date().toISOString().split('T')[0];

    // Ensure user_xp exists
    db.prepare('INSERT OR IGNORE INTO user_xp (user_id) VALUES (?)').run(userId);

    let missionsRecord = db.prepare('SELECT * FROM daily_missions WHERE user_id = ? AND date = ?').get(userId, today) as any;

    if (!missionsRecord) {
      // Build missions from today's active roadmap day
      const selected = buildMissionsFromActiveDay(userId);
      const totalXp = selected.reduce((sum, m) => sum + m.xpReward, 0);

      db.prepare(
        'INSERT INTO daily_missions (user_id, date, missions_json, total_count, xp_reward) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, today, JSON.stringify(selected), selected.length, totalXp);

      missionsRecord = {
        date: today,
        missions_json: JSON.stringify(selected),
        completed_count: 0,
        total_count: selected.length,
        xp_reward: totalXp
      };
    }

    res.json({
      date: missionsRecord.date,
      missions: JSON.parse(missionsRecord.missions_json),
      completedCount: missionsRecord.completed_count,
      totalCount: missionsRecord.total_count,
      totalXpReward: missionsRecord.xp_reward
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/missions/:missionIndex/complete', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const today = new Date().toISOString().split('T')[0];
    const missionIndex = parseInt(req.params.missionIndex);

    const record = db.prepare('SELECT * FROM daily_missions WHERE user_id = ? AND date = ?').get(userId, today) as any;
    if (!record) return res.status(404).json({ error: 'Missions not found for today' });

    const missions = JSON.parse(record.missions_json);
    if (missionIndex < 0 || missionIndex >= missions.length) return res.status(400).json({ error: 'Invalid mission index' });
    if (missions[missionIndex].completed) return res.status(400).json({ error: 'Mission already completed' });

    missions[missionIndex].completed = true;
    const xpReward = missions[missionIndex].xpReward;
    const completedCount = record.completed_count + 1;

    // Update missions
    db.prepare('UPDATE daily_missions SET missions_json = ?, completed_count = ? WHERE id = ?')
      .run(JSON.stringify(missions), completedCount, record.id);

    // Update user XP & streak
    const userXp = db.prepare('SELECT * FROM user_xp WHERE user_id = ?').get(userId) as any;
    let newTotalXp = (userXp?.total_xp || 0) + xpReward;
    let newLevel = calculateLevel(newTotalXp);
    
    // Streak logic
    let currentStreak = userXp?.current_streak || 0;
    let longestStreak = userXp?.longest_streak || 0;
    let lastActiveDate = userXp?.last_active_date;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActiveDate !== today) {
      if (lastActiveDate === yesterdayStr) {
        currentStreak += 1;
      } else {
        currentStreak = 1; // Reset
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    db.prepare(`
      UPDATE user_xp 
      SET total_xp = ?, level = ?, current_streak = ?, longest_streak = ?, last_active_date = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(newTotalXp, newLevel, currentStreak, longestStreak, today, userId);

    // Check achievements (stubbed for now, could be dynamic based on actions)
    let unlocked: any[] = [];
    if (newLevel === 5) {
      try {
        db.prepare('INSERT INTO achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, 'level_5');
        unlocked.push('level_5');
      } catch (e) { /* already unlocked */ }
    }

    res.json({
      success: true,
      xpAwarded: xpReward,
      newTotalXp,
      newLevel,
      streakCount: currentStreak,
      achievementsUnlocked: unlocked
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/xp', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    let userXp = db.prepare('SELECT * FROM user_xp WHERE user_id = ?').get(userId) as any;
    
    if (!userXp) {
      db.prepare('INSERT OR IGNORE INTO user_xp (user_id) VALUES (?)').run(userId);
      userXp = db.prepare('SELECT * FROM user_xp WHERE user_id = ?').get(userId) as any;
    }

    const levelIndex = userXp.level - 1;
    const nextLevelIndex = Math.min(levelIndex + 1, LEVEL_THRESHOLDS.length - 1);

    res.json({
      totalXp: userXp.total_xp,
      level: userXp.level,
      levelName: LEVEL_NAMES[levelIndex] || 'Unknown',
      xpForNextLevel: LEVEL_THRESHOLDS[nextLevelIndex],
      currentStreak: userXp.current_streak,
      longestStreak: userXp.longest_streak,
      lastActiveDate: userXp.last_active_date
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/xp/award', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { xp } = req.body;
    
    if (!xp || typeof xp !== 'number') return res.status(400).json({ error: 'Invalid xp amount' });

    db.prepare('INSERT OR IGNORE INTO user_xp (user_id) VALUES (?)').run(userId);
    const userXp = db.prepare('SELECT total_xp, level FROM user_xp WHERE user_id = ?').get(userId) as any;
    
    const newTotalXp = userXp.total_xp + xp;
    const newLevel = calculateLevel(newTotalXp);
    const leveledUp = newLevel > userXp.level;

    db.prepare("UPDATE user_xp SET total_xp = ?, level = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(newTotalXp, newLevel, userId);

    const levelIndex = newLevel - 1;
    res.json({
      success: true,
      totalXp: newTotalXp,
      level: newLevel,
      levelName: LEVEL_NAMES[levelIndex] || 'Unknown',
      leveledUp
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/achievements', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const ACHIEVEMENT_DEFS = [
      { id: 'first_lesson', name: 'First Lesson', description: 'Complete your first lesson' },
      { id: 'first_project', name: 'First Project', description: 'Complete your first project' },
      { id: 'problems_10', name: '10 Problems', description: 'Solve 10 practice problems' },
      { id: 'problems_100', name: '100 Problems', description: 'Solve 100 practice problems' },
      { id: 'streak_7', name: '7-Day Streak', description: 'Maintain a 7-day learning streak' },
      { id: 'streak_30', name: '30-Day Streak', description: 'Maintain a 30-day streak' },
      { id: 'resume_ready', name: 'Resume Ready', description: 'Create your first resume' },
      { id: 'interview_ready', name: 'Interview Ready', description: 'Complete 5 mock interviews' },
      { id: 'level_5', name: 'Specialist', description: 'Reach Level 5' },
      { id: 'career_ready', name: 'Career Ready', description: 'Complete resume, portfolio, and 3 projects' }
    ];

    const unlocked = db.prepare('SELECT achievement_id FROM achievements WHERE user_id = ?').all(userId) as any[];
    const unlockedIds = new Set(unlocked.map(u => u.achievement_id));

    const result = ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      unlocked: unlockedIds.has(def.id)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
