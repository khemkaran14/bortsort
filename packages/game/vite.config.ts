import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  server: {
    port: 5173,
    // During development, localhost:5173/admin opens the admin panel of the server (npm run server).
    proxy: { '/admin': 'http://localhost:3200', '/r': 'http://localhost:3200', '/uploads': 'http://localhost:3200' },
  },
});
