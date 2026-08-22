import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { generateUserRoadmap } from '../services/ai.js';
import logger from '../logger.js';

const router = Router();

// Background worker function
async function processRoadmapJob(jobId: string, userId: string, goal: string) {
  try {
    // 1. Update job to PROCESSING and set started_at
    db.prepare("UPDATE roadmap_jobs SET status = ?, started_at = datetime('now') WHERE id = ?")
      .run('PROCESSING', jobId);

    logger.info(`🚀 Starting async roadmap generation for job ${jobId} (Goal: "${goal}")`);

    // 2. Call AI Service to generate roadmap
    const roadmap = await generateUserRoadmap(goal);

    // 3. Compute estimated time and set roadmap ID
    const totalDays = roadmap.modules.reduce((sum, mod) => sum + mod.days.length, 0);
    const estimatedTime = `${totalDays} Days`;
    const roadmapId = 'roadmap_' + uuidv4();

    // 4. Save generated modules, days, resources, and tips within a transaction
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

          dayNumberCounter++;
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

    // 5. Update job to COMPLETED and set completed_at
    db.prepare("UPDATE roadmap_jobs SET status = ?, roadmap_id = ?, completed_at = datetime('now') WHERE id = ?")
      .run('COMPLETED', roadmapId, jobId);

    logger.info(`✨ Async Roadmap successfully created for job ${jobId} and user ${userId}`);
  } catch (error: any) {
    logger.error(`❌ Async Roadmap generation failed for job ${jobId}`, { error: error.message });
    // Update job to FAILED
    db.prepare("UPDATE roadmap_jobs SET status = ?, error = ?, completed_at = datetime('now') WHERE id = ?")
      .run('FAILED', 'Unable to generate roadmap.', jobId);
  }
}

// POST /api/roadmaps
router.post('/', requireAuth, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { goal } = req.body;

    if (!goal || typeof goal !== 'string' || goal.trim().length < 5 || goal.trim().length > 500) {
      res.status(400).json({ error: 'Please provide a descriptive goal' });
      return;
    }

    const cleanGoal = goal.trim();

    // Duplicate Job Detection: Check if active job already exists for this goal and user
    const existingJob = db.prepare(
      "SELECT id, status FROM roadmap_jobs WHERE user_id = ? AND goal = ? AND status IN ('PENDING', 'PROCESSING') ORDER BY created_at DESC LIMIT 1"
    ).get(userId, cleanGoal) as { id: string; status: string } | undefined;

    if (existingJob) {
      logger.info(`🔄 Active job found for user ${userId} and goal "${cleanGoal}": ${existingJob.id}`);
      res.status(202).json({
        jobId: existingJob.id,
        status: existingJob.status
      });
      return;
    }

    // Create a new job
    const jobId = 'job_' + uuidv4();
    db.prepare(
      'INSERT INTO roadmap_jobs (id, user_id, goal, status) VALUES (?, ?, ?, ?)'
    ).run(jobId, userId, cleanGoal, 'PENDING');

    logger.info(`➕ Created async roadmap job ${jobId} for user ${userId}`);

    // Start background processing immediately and return response
    setImmediate(() => {
      processRoadmapJob(jobId, userId, cleanGoal).catch((err) => {
        logger.error(`Unhandled error in background job ${jobId}`, { error: err.message });
      });
    });

    res.status(202).json({
      jobId,
      status: 'PENDING'
    });
  } catch (error: any) {
    logger.error('Error creating roadmap job', { error: error.message });
    res.status(500).json({ error: 'Unable to start roadmap generation.' });
  }
});

// GET /api/roadmaps/jobs/:jobId
router.get('/jobs/:jobId', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { jobId } = req.params;

    const job = db.prepare(
      'SELECT * FROM roadmap_jobs WHERE id = ?'
    ).get(jobId) as any;

    if (!job) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }

    // Verify ownership
    if (job.user_id !== userId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    res.json({
      jobId: job.id,
      status: job.status,
      roadmapId: job.roadmap_id,
      error: job.error
    });
  } catch (error: any) {
    logger.error(`Error retrieving job status for ${req.params.jobId}`, { error: error.message });
    res.status(500).json({ error: 'Unable to check job status.' });
  }
});

export default router;
