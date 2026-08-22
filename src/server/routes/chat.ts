import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// GET /api/chat/history - Get user chat history
router.get('/history', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const history = db.prepare(
      'SELECT role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 50'
    ).all(userId);

    res.json(history);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/chat - Send message and get AI response
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.dbId;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      res.status(500).json({ error: 'AI key not configured' });
      return;
    }

    // 1. Save user message to database
    const userMsgId = uuidv4();
    db.prepare(
      'INSERT INTO chat_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)'
    ).run(userMsgId, userId, 'user', message);

    // 2. Load last 10 messages for context
    const history = db.prepare(
      'SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).all(userId) as { role: string; content: string }[];
    
    // Reverse to get chronological order
    history.reverse();

    // 3. Get user goal for context
    const userObj = db.prepare('SELECT goal FROM users WHERE id = ?').get(userId) as { goal: string } | undefined;
    const goalContext = userObj?.goal ? `Student is current studying towards: "${userObj.goal}".` : '';

    // 4. Call Gemini
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const chatContents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: chatContents,
      config: {
        systemInstruction: `You are a supportive, knowledgeable AI Mentor on the DayOne learning app.
${goalContext}
Provide clear, educational explanations, answer questions about code or concepts, and offer study tips.
Keep responses concise, formatted in markdown, and structured.`,
        temperature: 0.7,
      }
    });

    const aiReply = response.text || "I'm sorry, I couldn't process that request.";

    // 5. Save AI response to database
    const aiMsgId = uuidv4();
    db.prepare(
      'INSERT INTO chat_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)'
    ).run(aiMsgId, userId, 'assistant', aiReply);

    res.json({ reply: aiReply });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
