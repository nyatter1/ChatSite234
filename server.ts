import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
