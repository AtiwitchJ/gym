import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import fs from 'fs';

export const BUILD_ID_PLACEHOLDER = '__BUILD_ID__';

/**
 * Give every production build its own service-worker cache name.
 * Replaces __BUILD_ID__ in dist/sw.js, so old caches are dropped on activate
 * and a new deploy can never be served from a stale shell.
 */
export function swBuildIdPlugin({ distDir, buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` } = {}) {
  return {
    name: 'sw-build-id',
    apply: 'build',
    closeBundle() {
      const dir = distDir || path.resolve(import.meta.dirname, 'dist');
      const swPath = path.join(dir, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const source = fs.readFileSync(swPath, 'utf8');
      if (!source.includes(BUILD_ID_PLACEHOLDER)) return;
      fs.writeFileSync(swPath, source.split(BUILD_ID_PLACEHOLDER).join(buildId));
    }
  };
}

export default defineConfig({
  plugins: [vue(), swBuildIdPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});

