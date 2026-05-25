/**
 * Tiny structured logger.
 *
 * Outputs JSON-per-line in production (easy for log aggregators) and a
 * human-friendly format in development. Not a full logger like pino/winston —
 * intentionally small for this project. If we needed structured fields,
 * request correlation IDs, or sampling, we'd swap to pino.
 */

import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[env.LOG_LEVEL];
}

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const payload = { level, time: new Date().toISOString(), msg: message, ...meta };
  const line = env.isProduction
    ? JSON.stringify(payload)
    : `[${payload.time}] ${level.toUpperCase()} ${message}` +
      (meta ? ` ${JSON.stringify(meta)}` : '');
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : console.log)(line);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
};