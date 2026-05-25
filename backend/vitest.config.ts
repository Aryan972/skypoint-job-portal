/**
 * Vitest configuration for backend integration tests.
 *
 * Tests share a single Postgres database, so we run them in a single fork to
 * avoid races on the shared schema. Per-test isolation is enforced by the
 * `beforeEach` truncate in `tests/setup.ts`.
 *
 * Requires a running Postgres reachable via TEST_DATABASE_URL — see
 * `tests/global-setup.ts` for the error message and how to satisfy it.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
