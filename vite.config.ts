import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

// Plugin to automatically sync and serve root-level image assets (character.png, football.png, etc.)
function rootAssetSyncPlugin(): Plugin {
  const assetNames = ['character.png', 'football.png', 'idle.png', 'jump.png', 'kick.png', 'run.png', 'climb.png'];

  const syncRootAssets = () => {
    try {
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // Copy all root images to public folder if they exist
      for (const name of assetNames) {
        const rootPath = path.resolve(__dirname, name);
        const publicPath = path.resolve(publicDir, name);
        if (fs.existsSync(rootPath)) {
          const rootData = fs.readFileSync(rootPath);
          fs.writeFileSync(publicPath, rootData);
        }
      }
    } catch (e) {
      console.warn('Root asset sync notice:', e);
    }
  };

  return {
    name: 'root-asset-sync',
    buildStart() {
      syncRootAssets();
    },
    configureServer(server) {
      syncRootAssets();

      // Intercept asset requests in dev server so root files are always served with no stale cache
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const cleanUrl = req.url.split('?')[0].replace(/^\/+/, '');
        if (assetNames.includes(cleanUrl)) {
          const rootPath = path.resolve(__dirname, cleanUrl);
          const publicPath = path.resolve(__dirname, 'public', cleanUrl);

          const filePath = fs.existsSync(rootPath) ? rootPath : fs.existsSync(publicPath) ? publicPath : null;

          if (filePath) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const stream = fs.createReadStream(filePath);
            return stream.pipe(res);
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), rootAssetSyncPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
