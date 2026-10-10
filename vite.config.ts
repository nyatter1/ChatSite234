import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function syncRootAssetsToPublic() {
  const rootDir = path.resolve(__dirname, '.');
  const publicDir = path.resolve(__dirname, 'public');
  const ranksDir = path.resolve(publicDir, 'ranks');
  try {
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(ranksDir, { recursive: true });
    const entries = fs.readdirSync(rootDir);
    for (const file of entries) {
      if (/\.(png|gif|mp3|svg|ico|webp)$/i.test(file)) {
        const srcPath = path.join(rootDir, file);
        const destPublic = path.join(publicDir, file);
        try {
          const stat = fs.statSync(srcPath);
          if (stat.isFile() && stat.size > 0) {
            fs.copyFileSync(srcPath, destPublic);
            if (/\.(gif|svg)$/i.test(file)) {
              fs.copyFileSync(srcPath, path.join(ranksDir, file));
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
}

export default defineConfig(() => {
  syncRootAssetsToPublic();
  return {
    plugins: [
      {
        name: 'sync-root-assets',
        buildStart() {
          syncRootAssetsToPublic();
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
