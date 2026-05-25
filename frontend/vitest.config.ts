/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest config for the frontend.
 *
 * jsdom gives us a DOM in Node so Testing Library renders work; the setup
 * file extends `expect` with jest-dom matchers. `import.meta.env` is
 * populated from `define` so the api client picks a relative base URL
 * during tests (no real fetch goes out — every test stubs fetch directly).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1'),
  },
});
