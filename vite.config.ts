import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

// Plugin to automatically sync and serve all root-level image assets (character.png, start_menue.png, dog_*.png, etc.)
function rootAssetSyncPlugin(): Plugin {
  const syncRootAssets = () => {
    try {
      const rootDir = path.resolve(__dirname);
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // Copy all root images to public folder if they exist
      const rootFiles = fs.readdirSync(rootDir);
      for (const name of rootFiles) {
        if (/\.(png|jpe?g|webp|svg|ico|gif)$/i.test(name)) {
          const rootPath = path.resolve(rootDir, name);
          const publicPath = path.resolve(publicDir, name);
          const stat = fs.statSync(rootPath);
          if (stat.isFile()) {
            const rootData = fs.readFileSync(rootPath);
            fs.writeFileSync(publicPath, rootData);
          }
        }
      }

      // Ensure start_menu.png alias exists if start_menue.png exists
      const startMenuePath = path.resolve(publicDir, 'start_menue.png');
      const startMenuPath = path.resolve(publicDir, 'start_menu.png');
      if (fs.existsSync(startMenuePath) && !fs.existsSync(startMenuPath)) {
        fs.writeFileSync(startMenuPath, fs.readFileSync(startMenuePath));
      } else if (fs.existsSync(startMenuPath) && !fs.existsSync(startMenuePath)) {
        fs.writeFileSync(startMenuePath, fs.readFileSync(startMenuPath));
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

      // Intercept image asset requests in dev server so root/public files are always served with no stale cache
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const rawUrl = req.url.split('?')[0].replace(/^\/+/, '');
        if (/\.(png|jpe?g|webp|svg|ico|gif)$/i.test(rawUrl)) {
          const filename = path.basename(rawUrl);
          const rootPath = path.resolve(__dirname, filename);
          const publicPath = path.resolve(__dirname, 'public', filename);

          let filePath: string | null = null;
          if (fs.existsSync(publicPath)) {
            filePath = publicPath;
          } else if (fs.existsSync(rootPath)) {
            filePath = rootPath;
          } else if (filename === 'start_menu.png' || filename === 'start_menue.png') {
            const alt1 = path.resolve(__dirname, 'public', 'start_menue.png');
            const alt2 = path.resolve(__dirname, 'public', 'start_menu.png');
            const alt3 = path.resolve(__dirname, 'start_menue.png');
            const alt4 = path.resolve(__dirname, 'start_menu.png');
            filePath = fs.existsSync(alt1) ? alt1 : fs.existsSync(alt2) ? alt2 : fs.existsSync(alt3) ? alt3 : fs.existsSync(alt4) ? alt4 : null;
          }

          if (filePath) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            res.setHeader('Content-Type', mimeType);
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
