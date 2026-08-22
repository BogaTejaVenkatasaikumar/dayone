import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/community/posts - Get posts for a specific channel
router.get('/posts', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { channel } = req.query;
    const chan = (channel as string) || 'general';

    let posts = db.prepare(`
      SELECT * FROM community_posts WHERE channel = ? ORDER BY created_at DESC
    `).all(chan) as any[];

    // Seed mock posts if empty to make the community feel alive!
    if (posts.length === 0) {
      db.transaction(() => {
        const mockPosts = [
          {
            id: uuidv4(),
            user_id: 'mock_user_1',
            username: 'Sarah Miller',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            channel: chan,
            title: `Mastering ${chan === 'general' ? 'React and CSS' : chan}!`,
            content: "Hey team! I finally finished the capstone module. Highly recommend sticking with the AI Coach hints if you get stuck on the state configuration.",
            likes: 12,
            replies: JSON.stringify([
              { username: 'Dave K.', content: 'Awesome work Sarah! Inspired to catch up.', created_at: new Date().toISOString() }
            ])
          },
          {
            id: uuidv4(),
            user_id: 'mock_user_2',
            username: 'Alex Chen',
            avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            channel: chan,
            title: 'Stuck on recursion challenges',
            content: 'How did you guys visualize the call stack when doing recursive paths? The AI Mentor warned me to review this before jumping to modules.',
            likes: 4,
            replies: JSON.stringify([
              { username: 'AI Coach', content: 'Alex, try drawing the call stack as a stack of plates. Each plate represents a function call. Plates are removed from top to bottom!', created_at: new Date().toISOString() }
            ])
          }
        ];

        mockPosts.forEach(p => {
          db.prepare(`
            INSERT INTO community_posts (id, user_id, username, avatar_url, channel, title, content, likes, replies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(p.id, p.user_id, p.username, p.avatar_url, p.channel, p.title, p.content, p.likes, p.replies);
        });
      })();

      posts = db.prepare(`
        SELECT * FROM community_posts WHERE channel = ? ORDER BY created_at DESC
      `).all(chan) as any[];
    }

    res.json(posts.map(p => ({
      ...p,
      replies: JSON.parse(p.replies || '[]')
    })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/community/posts - Create new post
router.post('/posts', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const userEmail = req.user!.email;
    const { title, content, channel } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: 'Missing title or content' });
      return;
    }

    const chan = channel || 'general';

    // Retrieve name and avatar from users
    const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(userId) as { name: string; avatar_url: string } | undefined;
    const username = user?.name || userEmail.split('@')[0];
    const avatarUrl = user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

    const id = uuidv4();
    db.prepare(`
      INSERT INTO community_posts (id, user_id, username, avatar_url, channel, title, content, likes, replies)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, '[]')
    `).run(id, userId, username, avatarUrl, chan, title, content);

    // Trigger simulated reply from AI after 2 seconds (optional, we can mock it here)
    const mockReply = {
      username: 'DayOne AI Coach',
      content: `Welcome to the #${chan} channel! Great to have you sharing. Keep up the amazing work on your roadmap!`,
      created_at: new Date().toISOString()
    };
    
    db.prepare(`
      UPDATE community_posts 
      SET replies = json_insert(replies, '$[#]', json(?))
      WHERE id = ?
    `).run(JSON.stringify(mockReply), id);

    res.status(201).json({
      id,
      user_id: userId,
      username,
      avatar_url: avatarUrl,
      channel: chan,
      title,
      content,
      likes: 0,
      replies: [mockReply]
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/community/posts/:id/like - Like post
router.post('/posts/:id/like', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    db.prepare('UPDATE community_posts SET likes = likes + 1 WHERE id = ?').run(id);

    res.json({ message: 'Liked' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/community/posts/:id/reply - Add reply to post
router.post('/posts/:id/reply', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const userEmail = req.user!.email;
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;
    const username = user?.name || userEmail.split('@')[0];

    const reply = {
      username,
      content,
      created_at: new Date().toISOString()
    };

    db.prepare(`
      UPDATE community_posts 
      SET replies = json_insert(replies, '$[#]', json(?))
      WHERE id = ?
    `).run(JSON.stringify(reply), id);

    res.json({ message: 'Reply added successfully', reply });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
