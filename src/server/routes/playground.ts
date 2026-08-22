import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// Helper to call Gemini AI (similar to what's in ai.ts)
async function callAI(prompt: string, systemMsg: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const modelName = 'gemini-2.5-flash';

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt + '\n\nOutput ONLY valid JSON. No markdown, no extra text.',
    config: {
      systemInstruction: systemMsg,
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  });

  const content = response.text;
  if (typeof content === 'string' && content.trim()) {
    return content;
  }
  throw new Error('No content returned from AI');
}

function extractJson(raw: string): string {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned;
}

// POST /api/playground/review - AI code review
router.post('/review', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    const prompt = `Review the following ${language} code:
\`\`\`${language}
${code}
\`\`\`

Provide a comprehensive code review. Include:
1. Correctness (boolean) and a short explanation.
2. Performance score (0-100).
3. Readability score (0-100).
4. Best Practices score (0-100).
5. A list of potential bugs (if any).
6. Optimization suggestions with before and after code snippets.

Output ONLY this JSON format:
{
  "correctness": { "isCorrect": true, "explanation": "..." },
  "performance": 95,
  "readability": 90,
  "bestPractices": 85,
  "bugs": ["bug 1", "bug 2"],
  "suggestions": [
    { "description": "...", "before": "...", "after": "..." }
  ]
}`;

    const systemMsg = "You are a senior code reviewer. You reply with only valid JSON matching the requested structure.";
    
    try {
      const rawResponse = await callAI(prompt, systemMsg);
      const jsonResponse = extractJson(rawResponse);
      res.json(JSON.parse(jsonResponse));
    } catch (aiError) {
      console.warn("AI review failed, falling back to basic review", aiError);
      // Fallback
      res.json({
        correctness: { isCorrect: true, explanation: "Code appears structurally valid but AI review is currently unavailable." },
        performance: 80,
        readability: 85,
        bestPractices: 80,
        bugs: [],
        suggestions: []
      });
    }

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/playground/debug - AI debug assistance
router.post('/debug', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code, error, language } = req.body;

    if (!code || !error) {
      res.status(400).json({ error: 'Code and error are required' });
      return;
    }

    const prompt = `A user encountered an error in their ${language} code.
Code:
\`\`\`${language}
${code}
\`\`\`

Error message:
${error}

Provide a debugging explanation. Include:
1. What happened (brief summary).
2. Why it happened (technical cause).
3. Suggested fix (code snippet or explanation).
4. Learning explanation (simple terms for a beginner).

Output ONLY this JSON format:
{
  "whatHappened": "...",
  "why": "...",
  "fix": "...",
  "learn": "..."
}`;

    const systemMsg = "You are a helpful and empathetic technical mentor debugging code. You reply with only valid JSON matching the requested structure.";

    try {
      const rawResponse = await callAI(prompt, systemMsg);
      const jsonResponse = extractJson(rawResponse);
      res.json(JSON.parse(jsonResponse));
    } catch (aiError) {
      console.warn("AI debug failed, falling back to basic debug", aiError);
      // Fallback
      res.json({
        whatHappened: "An error occurred while running your code.",
        why: `The runtime threw an exception: ${error}`,
        fix: "Check the exact line number mentioned in the error traceback.",
        learn: "Errors are just the computer's way of telling you it doesn't understand. Read the error message carefully to find clues!"
      });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
