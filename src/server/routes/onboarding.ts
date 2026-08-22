import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import logger from '../logger.js';
import { generateUserRoadmap, assessCareerPath, adaptRoadmap, suggestGoalFromDescription } from '../services/ai.js';

const router = Router();

// POST /api/user/goal
router.post('/goal', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const clerkId = req.user!.id;
    const { goal, confirmReset } = req.body;

    let userId = req.user!.dbId;
    // clerkId is already declared above from req.user!.id

    if (userId) {
      const existingUser = db.prepare('SELECT goal FROM users WHERE id = ?').get(userId) as { goal: string } | undefined;
      if (existingUser?.goal && !confirmReset) {
        res.status(409).json({ error: 'This will reset your entire roadmap. Send confirmReset: true to proceed.' });
        return;
      }
    }

    if (!userId) {
      // Lazy-init Local User (happens if webhooks fail on localhost and requireAuth lookup failed)
      userId = uuidv4();
      const userEmail = req.user?.email || `user_${clerkId.slice(-8)}@local.auth`;

      try {
        db.transaction(() => {
          db.prepare('INSERT INTO users (id, clerk_id, email, name, password_hash) VALUES (?, ?, ?, ?, ?)').run(
            userId, clerkId, userEmail, 'New Learner', ''
          );
          db.prepare('INSERT INTO user_progress (user_id) VALUES (?)').run(userId);
        })();
        logger.info(`✨ Lazy-initialized new user: ${userEmail.substring(0, 3)}***`);
      } catch (err: any) {
        if (err.message.includes('UNIQUE constraint failed: users.email')) {
          // Fallback: if email is still colliding, try to find by that email again
          const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(userEmail) as { id: string };
          if (existing) {
            userId = existing.id;
            db.prepare('UPDATE users SET clerk_id = ? WHERE id = ?').run(clerkId, userId);
            logger.info(`🔗 Linked existing user ${userEmail} to clerk_id ${clerkId} (fallback)`);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    if (!goal || typeof goal !== 'string' || goal.trim().length < 5 || goal.trim().length > 500) {
      res.status(400).json({ error: 'Please provide a descriptive goal' });
      return;
    }

    // Call AI Service
    // We do this before updating the DB so if it fails, nothing changes.
    const roadmap = await generateUserRoadmap(goal);

    // Compute estimated time dynamically based on total generated days
    const totalDays = roadmap.modules.reduce((sum, mod) => sum + mod.days.length, 0);
    const estimatedTime = `${totalDays} Days`;

    // Prepare inserts
    const insertModule = db.prepare(
      'INSERT INTO modules (id, user_id, title, description, order_index, icon, status, tools, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertDay = db.prepare(
      'INSERT INTO days (id, user_id, module_id, day_number, title, description, task_name, stack, expected_outcome, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertDayProgress = db.prepare(
      'INSERT INTO user_day_progress (user_id, day_id, status, progress_pct) VALUES (?, ?, ?, ?)'
    );
    const insertResource = db.prepare(
      'INSERT INTO resources (id, user_id, category, title, description, author, url, image_url, tags, progress_pct, rating, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertTip = db.prepare(
      'INSERT INTO tips (id, user_id, category, title, content, icon) VALUES (?, ?, ?, ?, ?, ?)'
    );

    // Save transaction
    db.transaction(() => {
      // Update goal in users table
      db.prepare('UPDATE users SET goal = ?, estimated_time = ?, revision_topics = ?, motivation_quote = ? WHERE id = ?')
        .run(goal, estimatedTime, JSON.stringify(roadmap.revision_topics), roadmap.motivation_quote, userId);

      // Clear any existing generated content for this user
      db.prepare('DELETE FROM modules WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM resources WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM tips WHERE user_id = ?').run(userId);

      // Reset progress
      db.prepare('UPDATE user_progress SET streak_count = 0, total_xp = 0, current_level = 1, daily_completion_pct = 0, overall_completion_pct = 0 WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM streak_log WHERE user_id = ?').run(userId);

      let dayNumberCounter = 1;

      // Insert Modules & Days
      const modulesArray = Array.isArray(roadmap.modules) ? roadmap.modules : [];
      modulesArray.forEach((mod, modIdx) => {
        const moduleId = uuidv4();
        const status = modIdx === 0 ? 'active' : 'locked';
        const icon = modIdx === 0 ? 'flag' : modIdx === 1 ? 'star' : 'rocket';
        insertModule.run(moduleId, userId, mod.title, mod.description, modIdx + 1, icon, status, JSON.stringify(mod.tools || []), mod.duration || '');

        const daysArray = Array.isArray(mod.days) ? mod.days : [];
        daysArray.forEach((day) => {
          const dayId = uuidv4();
          insertDay.run(dayId, userId, moduleId, dayNumberCounter, day.title, day.description, day.task_name, day.stack, day.expected_outcome, day.video_url || '');

          let dayStatus = 'locked';
          if (dayNumberCounter === 1) {
            dayStatus = 'active';
          }
          insertDayProgress.run(userId, dayId, dayStatus, 0);

          dayNumberCounter++; // Continues across modules (1, 2, ... 15)
        });
      });

      // Insert Resources
      const resourcesArray = Array.isArray(roadmap.resources) ? roadmap.resources : [];
      resourcesArray.forEach((res) => {
        const safeCat = ['tools', 'courses', 'books'].includes(res.category) ? res.category : 'tools';
        insertResource.run(uuidv4(), userId, safeCat, res.title, res.description, res.author || '', '', '', JSON.stringify(res.tags || []), 0, 0, res.explanation || '');
      });

      // Insert Tips
      const tipsArray = Array.isArray(roadmap.tips) ? roadmap.tips : [];
      tipsArray.forEach((tip) => {
        const safeTipCat = ['smart_tip', 'mistake'].includes(tip.category) ? tip.category : 'smart_tip';
        insertTip.run(uuidv4(), userId, safeTipCat, tip.title, tip.content, tip.icon || 'lightbulb');
      });
    })();

    res.json({ message: 'Goal set and roadmap generated successfully', goal });
  } catch (error) {
    logger.error('Onboarding route error', {
      error: (error instanceof Error) ? error.message : 'Unknown error',
      stack: (error instanceof Error) ? error.stack : undefined,
    });
    res.status(500).json({
      error: 'Roadmap generation failed. Please try a more specific goal.',
    });
  }
});

// POST /api/onboarding/assess
router.post('/assess', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { answers } = req.body;
    if (!answers) {
      res.status(400).json({ error: 'Missing answers' });
      return;
    }
    const suggestions = await assessCareerPath(answers);
    res.json(suggestions);
  } catch (error: any) {
    logger.error('Career assessment route error', { error: error.message });
    res.status(500).json({ error: 'Failed to assess career options. Try again.' });
  }
});

// POST /api/roadmap/adapt
router.post('/roadmap/adapt', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { feedback } = req.body;

    if (!feedback) {
      res.status(400).json({ error: 'Feedback message is required' });
      return;
    }

    const userObj = db.prepare('SELECT goal FROM users WHERE id = ?').get(userId) as { goal: string } | undefined;
    if (!userObj?.goal) {
      res.status(400).json({ error: 'No active goal to adapt. Complete onboarding first.' });
      return;
    }

    // Get all existing modules and days to pass to the AI
    const currentModules = db.prepare('SELECT * FROM modules WHERE user_id = ? ORDER BY order_index').all(userId) as any[];
    for (const mod of currentModules) {
      mod.days = db.prepare(`
        SELECT d.*, COALESCE(udp.status, 'locked') as status 
        FROM days d
        LEFT JOIN user_day_progress udp ON d.id = udp.day_id AND udp.user_id = ?
        WHERE d.module_id = ?
        ORDER BY d.day_number
      `).all(userId, mod.id) as any[];
    }

    // Call AI to adapt roadmap
    const adapted = await adaptRoadmap(userObj.goal, currentModules, feedback);

    // Get count of completed days
    const completedDays = db.prepare(`
      SELECT d.day_number, d.title 
      FROM days d
      JOIN user_day_progress udp ON d.id = udp.day_id AND udp.user_id = ?
      WHERE udp.status = 'completed'
    `).all(userId) as { day_number: number; title: string }[];

    const totalDaysCompleted = completedDays.length;

    db.transaction(() => {
      // Clear old modules/days/tips/resources
      db.prepare('DELETE FROM modules WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM resources WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM tips WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_day_progress WHERE user_id = ?').run(userId);

      // Re-initialize progress tracking
      const insertModule = db.prepare(
        'INSERT INTO modules (id, user_id, title, description, order_index, icon, status, tools, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const insertDay = db.prepare(
        'INSERT INTO days (id, user_id, module_id, day_number, title, description, task_name, stack, expected_outcome, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const insertDayProgress = db.prepare(
        'INSERT INTO user_day_progress (user_id, day_id, status, progress_pct) VALUES (?, ?, ?, ?)'
      );

      let dayNumberCounter = 1;

      adapted.modules.forEach((mod, modIdx) => {
        const moduleId = uuidv4();
        let modStatus = 'locked';
        const icon = modIdx === 0 ? 'flag' : modIdx === 1 ? 'star' : 'rocket';

        const daysArray = Array.isArray(mod.days) ? mod.days : [];
        let hasCompletedDays = false;
        let hasLockedDays = false;

        daysArray.forEach((day) => {
          const dayId = uuidv4();
          insertDay.run(dayId, userId, moduleId, dayNumberCounter, day.title, day.description, day.task_name, day.stack, day.expected_outcome, day.video_url || '');

          let dayStatus = 'locked';
          let progressPct = 0;

          if (dayNumberCounter <= totalDaysCompleted) {
            dayStatus = 'completed';
            progressPct = 100;
            hasCompletedDays = true;
          } else if (dayNumberCounter === totalDaysCompleted + 1) {
            dayStatus = 'active';
            progressPct = 0;
            hasLockedDays = true;
          } else {
            hasLockedDays = true;
          }

          insertDayProgress.run(userId, dayId, dayStatus, progressPct);
          dayNumberCounter++;
        });

        if (hasCompletedDays && !hasLockedDays) {
          modStatus = 'completed';
        } else if (hasCompletedDays || modIdx === 0 || dayNumberCounter - daysArray.length <= totalDaysCompleted + 1) {
          modStatus = 'active';
        }

        insertModule.run(moduleId, userId, mod.title, mod.description, modIdx + 1, icon, modStatus, JSON.stringify(mod.tools || []), mod.duration || '');
      });

      // Insert new resources
      const insertResource = db.prepare(
        'INSERT INTO resources (id, user_id, category, title, description, author, url, image_url, tags, progress_pct, rating, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      adapted.resources.forEach((res) => {
        const safeCat = ['tools', 'courses', 'books'].includes(res.category) ? res.category : 'tools';
        insertResource.run(uuidv4(), userId, safeCat, res.title, res.description, res.author || '', '', '', JSON.stringify(res.tags || []), 0, 0, res.explanation || '');
      });

      // Insert new tips
      const insertTip = db.prepare(
        'INSERT INTO tips (id, user_id, category, title, content, icon) VALUES (?, ?, ?, ?, ?, ?)'
      );
      adapted.tips.forEach((tip) => {
        const safeTipCat = ['smart_tip', 'mistake'].includes(tip.category) ? tip.category : 'smart_tip';
        insertTip.run(uuidv4(), userId, safeTipCat, tip.title, tip.content, tip.icon || 'lightbulb');
      });
    })();

    res.json({ message: 'Roadmap adapted successfully' });
  } catch (error: any) {
    logger.error('Roadmap adaptation route error', { error: error.message });
    res.status(500).json({ error: 'Roadmap adaptation failed. Try again.' });
  }
});

// POST /api/user/suggest-goal
router.post('/suggest-goal', requireAuth, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { description } = req.body;

    if (
      description === undefined || 
      description === null || 
      typeof description !== 'string' || 
      description.trim() === ''
    ) {
      res.status(400).json({ error: 'Please describe your aspirations.' });
      return;
    }

    const cleanDescription = description.trim();
    if (cleanDescription.length < 10 || cleanDescription.length > 1000) {
      res.status(400).json({ error: 'Please describe your aspirations.' });
      return;
    }

    const result = await suggestGoalFromDescription(cleanDescription);
    res.json(result);
  } catch (error: any) {
    logger.error('Suggest goal route error', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Unable to generate a goal suggestion.' });
  }
});

export default router;
