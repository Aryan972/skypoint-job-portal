/**
 * Zod-powered request validator.
 *
 * `validate(schema)` returns Express middleware that parses one of
 * { body, query, params } and replaces it with the typed result. On failure,
 * the ZodError propagates to the global error handler which formats it
 * consistently for the client.
 */

import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Mutate the source so handlers downstream get the parsed/coerced shape.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any)[source] = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}