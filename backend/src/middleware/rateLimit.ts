/**
 * Rate limiters for sensitive auth endpoints.
 *
 * Why two:
 * - `loginLimiter` caps password attempts per IP — first line of defence
 *   against credential-stuffing and online brute force.
 * - `registerLimiter` is looser; it exists to prevent a single IP from
 *   flooding the user table, not to gate legitimate signups.
 *
 * Both skip in the test environment so the integration suite, which spins up
 * dozens of users back-to-back from 127.0.0.1, isn't artificially rate-limited.
 *
 * In-memory store is fine here. In a real multi-instance deployment you'd
 * back this with Redis (e.g. rate-limit-redis) so the cap is global.
 *
 * Note: the limiter sees `req.ip`, which depends on `app.set('trust proxy', ...)`.
 * Behind a real reverse proxy / load balancer, configure trust proxy explicitly.
 */

import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function makeLimiter(overrides: Partial<Options>) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest,
    ...overrides,
  });
}

export const loginLimiter = makeLimiter({
  limit: 10,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts; try again in a few minutes.',
    },
  },
});

export const registerLimiter = makeLimiter({
  limit: 20,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many registration attempts; try again in a few minutes.',
    },
  },
});
