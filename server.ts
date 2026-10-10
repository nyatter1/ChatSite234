import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BAZAARLINK_API_URL = 'https://api.bazaarlink.ai/v1/chat/completions';
const BAZAARLINK_API_KEY =
  process.env.BAZAARLINK_API_KEY ||
  'sk-bl-Lj2VRPx5ynD0-9AoM4uARPUBo4BDRvSAFPXJoaoxA7BOAQc9';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Bot Chat Completion Endpoint
  app.post('/api/bot-chat', async (req, res) => {
    try {
      const { prompt, botName = 'System', senderName = 'User' } = req.body || {};
      const userPrompt = String(prompt || 'Hello!').trim() || 'Hello!';

      const systemPrompt = `You are ${botName}, an official, intelligent automated AI assistant. Answer any question, math problem, or topic accurately, directly, and formally in 1 to 2 concise sentences. Never use roleplay, actions in asterisks (*...*), slang, or emotes. Do not prefix your message with "${senderName}" or "@${senderName}" because the system automatically prepends their username tag.`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];

      const modelsToTry = [
        'deepseek/deepseek-v4-flash-0731free:free',
        'deepseek-v4-flash-0731free',
        'qwen/qwen3.7-flash:free',
        'auto:free'
      ];

      for (const model of modelsToTry) {
        try {
          const response = await fetch(BAZAARLINK_API_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${BAZAARLINK_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              messages
            })
          });

          const data = (await response.json()) as any;
          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (response.ok && reply) {
            return res.json({ success: true, reply, model });
          }
        } catch (err) {
          console.warn(`BazaarLink model ${model} attempt notice:`, err);
        }
      }

      // Fallback to server-side Gemini if BazaarLink free capacity is temporarily full
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build'
              }
            }
          });
          const geminiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt
            }
          });
          const fallbackReply = geminiRes.text?.trim();
          if (fallbackReply) {
            return res.json({ success: true, reply: fallbackReply, model: 'gemini-3.8-flash' });
          }
        } catch (geminiErr) {
          console.warn('Gemini fallback notice:', geminiErr);
        }
      }

      return res.json({
        success: true,
        reply: 'I am currently processing requests. Please repeat your inquiry momentarily.'
      });
    } catch (err: any) {
      console.warn('Bot chat endpoint error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Cloudinary Deletion API Proxy
  // Allows deleting assets directly from Cloudinary using:
  // 1. Delete token from unsigned upload (if enabled in preset)
  // 2. Signed destroy API using CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
  app.post('/api/cloudinary/delete', async (req, res) => {
    try {
      const { public_id, resource_type = 'image', delete_token } = req.body;
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'oc8buhae';
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      // 1. Unsigned delete by token if provided
      if (delete_token) {
        try {
          const form = new URLSearchParams();
          form.append('token', delete_token);
          const delRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`, {
            method: 'POST',
            body: form
          });
          const delData = (await delRes.json()) as any;
          if (delData.result === 'ok') {
            return res.json({ success: true, result: 'ok', method: 'delete_by_token' });
          }
        } catch (tokenErr) {
          console.warn('Cloudinary delete_by_token notice:', tokenErr);
        }
      }

      // 2. Signed destroy API if API Key & Secret are configured
      if (apiKey && apiSecret && public_id) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        // Cloudinary signature: SHA-1 of sorted parameters concatenated with api_secret
        const toSign = `public_id=${public_id}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(toSign).digest('hex');

        const formData = new URLSearchParams();
        formData.append('public_id', public_id);
        formData.append('timestamp', timestamp);
        formData.append('api_key', apiKey);
        formData.append('signature', signature);

        const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resource_type}/destroy`;
        const cRes = await fetch(destroyUrl, {
          method: 'POST',
          body: formData
        });
        const cData = (await cRes.json()) as any;
        return res.json({
          success: cData.result === 'ok',
          result: cData.result || 'not_found',
          method: 'signed_destroy'
        });
      }

      // 3. Acknowledged: Asset reference replaced locally & in Firebase Realtime Database
      return res.json({
        success: true,
        method: 'local_replacement',
        message: 'Asset reference replaced. (Set CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET in .env for direct cloud wipe)'
      });
    } catch (err: any) {
      console.warn('Cloudinary delete endpoint error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use(express.static(path.resolve(__dirname, 'public')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
