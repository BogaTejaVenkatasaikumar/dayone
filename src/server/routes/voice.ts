import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/voice/tts
 * Server-side proxy for ElevenLabs Text-to-Speech.
 * Keeps the API key off the client entirely.
 *
 * Body: { text: string, voice_id?: string }
 * Returns: audio/mpeg stream
 */
router.post('/tts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { text, voice_id } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'ElevenLabs API key not configured on server' });
      return;
    }

    // Default to "Rachel" — a professional female voice great for interviews
    // Other good voices: 21m00Tcm4TlvDq8ikWAM (Rachel), EXAVITQu4vr4xnSDxMaL (Bella),
    // pNInz6obpgDQGcFmaJgB (Adam - male), ErXwobaYiN019PkySvjV (Antoni - male)
    const selectedVoice = voice_id || '21m00Tcm4TlvDq8ikWAM';

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.substring(0, 2000), // Limit to prevent abuse
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      const errorText = await elevenRes.text();
      console.error('[ElevenLabs] TTS error:', elevenRes.status, errorText);
      res.status(elevenRes.status).json({ error: `ElevenLabs API error: ${elevenRes.status}` });
      return;
    }

    // Stream the audio back to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    const arrayBuffer = await elevenRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (e: any) {
    console.error('[ElevenLabs] TTS proxy error:', e.message);
    res.status(500).json({ error: 'Voice synthesis failed' });
  }
});

/**
 * GET /api/voice/voices
 * List available ElevenLabs voices so the user can pick one.
 */
router.get('/voices', requireAuth, async (_req: Request, res: Response) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'ElevenLabs API key not configured' });
      return;
    }

    const elevenRes = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!elevenRes.ok) {
      res.status(elevenRes.status).json({ error: 'Failed to fetch voices' });
      return;
    }

    const data = await elevenRes.json();

    // Return a trimmed list
    const voices = (data.voices || []).slice(0, 20).map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels,
      preview_url: v.preview_url,
    }));

    res.json({ voices });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
