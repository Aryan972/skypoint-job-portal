/**
 * `wrap` adapts an async handler so any rejection or thrown error is forwarded
 * to Express's error middleware automatically. Extracted from auth.routes.ts
 * so every module uses the same helper.
 */

import type { RequestHandler } from 'express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wrap = (fn: (req: any, res: any, next: any) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };