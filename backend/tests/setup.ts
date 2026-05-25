/**
 * Per-worker test setup.
 *
 * Runs BEFORE any test file's imports — critical because `src/config/env.ts`
 * validates required env vars at module-load time and would `process.exit(1)`
 * if any were missing.
 *
 * Also installs a `beforeEach` hook that TRUNCATEs all tables so each test
 * starts from a known-empty state. We truncate inside a single statement so
 * the FK cascade doesn't have to be ordered by hand.
 */

import { afterAll, beforeEach } from 'vitest';

// --- 1. Env vars (must be set BEFORE the app or prisma modules are imported)
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret-test-jwt-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
// Lower bcrypt cost for tests — 12 rounds is overkill in CI.
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? '10';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'warn';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000';

// --- 2. Now that env is set, we can import the Prisma client safely.
const { prisma } = await import('../src/lib/prisma.js');

beforeEach(async () => {
  // Truncate every table in one shot. RESTART IDENTITY resets serial
  // sequences so test IDs are deterministic across runs.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "applications", "jobs", "users" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
