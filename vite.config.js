import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

// Vite config — single-page PWA with React + vanilla schedule
// Outputs to dist/, deploys to Netlify
export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin()
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Stable filename for SW so cache busting via version bump works predictably
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
