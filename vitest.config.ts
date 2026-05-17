import { defineConfig } from 'vitest/config.js';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Map '@' to repository root so imports like '@/src/...' resolve correctly in tests
      '@': resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: false,
  },
  // Prevent Vite from applying build CSS/PostCSS transforms during tests
  css: {
    devSourcemap: false,
  },
});
