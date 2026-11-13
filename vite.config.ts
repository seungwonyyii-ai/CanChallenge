import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps the build portable for static hosting under any sub-path
// (GitHub Pages, Netlify, S3 …).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
