/**
 * Singleton Prisma client.
 *
 * In dev with `tsx watch`, the file is re-evaluated on every change. Without
 * a singleton guard, each reload would create a new client and exhaust the
 * Postgres connection pool within a few hot-reloads. The `globalThis` trick
 * is the standard pattern.
 */

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma__ ??
  new PrismaClient({
    log: env.LOG_LEVEL === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (!env.isProduction) {
  globalThis.__prisma__ = prisma;
}