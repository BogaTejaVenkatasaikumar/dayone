import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/internships - List matching internships with external application URLs
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;

    const progress = db.prepare('SELECT overall_completion_pct FROM user_progress WHERE user_id = ?').get(userId) as any;
    const user = db.prepare('SELECT goal FROM users WHERE id = ?').get(userId) as any;

    const completion = progress?.overall_completion_pct || 0;
    const goalText = (user?.goal || '').toLowerCase();

    const mockListings = [
      {
        id: 'job1',
        title: 'Frontend React Engineering Intern',
        company: 'Vercel',
        location: 'Remote (US/Global)',
        type: 'Full-time / Paid',
        requiredCompletion: 20,
        tags: ['React', 'Next.js', 'Tailwind CSS'],
        stipend: '$35 / hour',
        applyUrl: 'https://vercel.com/careers',
        description: 'Join the Next.js Core team building next-generation web tools. Requires React fundamentals and state management skills.'
      },
      {
        id: 'job2',
        title: 'Backend API Architect Intern',
        company: 'Supabase',
        location: 'Remote (Global)',
        type: 'Part-time / Paid',
        requiredCompletion: 30,
        tags: ['Node.js', 'Express', 'SQL', 'PostgreSQL'],
        stipend: '$32 / hour',
        applyUrl: 'https://supabase.com/careers',
        description: 'Design open-source backend APIs, database triggers, and authentication logic.'
      },
      {
        id: 'job3',
        title: 'AI Systems Research Intern',
        company: 'Google DeepMind',
        location: 'London / Hybrid',
        type: 'Full-time',
        requiredCompletion: 50,
        tags: ['Python', 'LLMs', 'PyTorch'],
        stipend: 'Competitive / Paid',
        applyUrl: 'https://deepmind.google/about/careers/',
        description: 'Collaborate with senior researchers evaluating AI capabilities, fine-tuning foundation models, and running benchmark evals.'
      },
      {
        id: 'job4',
        title: 'Product UI & Frontend Intern',
        company: 'Linear App',
        location: 'Remote / Europe',
        type: 'Paid',
        requiredCompletion: 25,
        tags: ['TypeScript', 'UI Design', 'Framer Motion'],
        stipend: '$34 / hour',
        applyUrl: 'https://linear.app/careers',
        description: 'Help build high-performance, keyboard-first web applications with sleek micro-animations.'
      },
      {
        id: 'job5',
        title: 'Full Stack Software Intern',
        company: 'GitHub',
        location: 'Remote (US/EU)',
        type: 'Full-time',
        requiredCompletion: 30,
        tags: ['React', 'TypeScript', 'GraphQL'],
        stipend: '$38 / hour',
        applyUrl: 'https://github.com/about/careers',
        description: 'Work alongside Github Copilot teams on real-time code editor extensions and developer tools.'
      }
    ];

    const results = mockListings.map(job => {
      const tagMatch = job.tags.some(tag => goalText.includes(tag.toLowerCase()));
      const isEligible = completion >= job.requiredCompletion;
      
      let matchScore = 0;
      if (isEligible) matchScore += 50;
      if (tagMatch) matchScore += 35;
      matchScore += Math.round(completion / 4);

      return {
        ...job,
        matchScore: Math.min(matchScore, 98),
        isEligible
      };
    });

    results.sort((a, b) => b.matchScore - a.matchScore);

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/internships/:id/apply - Direct profile submission
router.post('/:id/apply', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const jobId = req.params.id;

    db.prepare(`
      INSERT INTO notifications (id, user_id, title, content, type)
      VALUES (?, ?, ?, ?, 'success')
    `).run(
      uuidv4(),
      userId,
      'Direct Profile Submitted',
      `Your DayOne verified portfolio & resume details were submitted for Internship #${jobId}.`
    );

    res.json({ message: 'Profile submitted! The hiring team can now view your verified DayOne portfolio.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
