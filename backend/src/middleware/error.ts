/**
 * Central error handling.
 *
 * Custom error classes carry an HTTP status. The global error middleware
 * inspects the error type, logs server-side, and sends a safe response —
 * never leaking stack traces or internal details to clients in production.
 *
 * Prisma errors are translated to friendly 4xx responses where appropriate
 * (e.g. unique-constraint -> 409 Conflict).
 */

import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { logger } from '../lib/logger.js';
import { PasswordPolicyError } from '../lib/password.js';

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do that') {
    super(403, 'FORBIDDEN', message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

/** 404 handler — registered AFTER all routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

/** Global error handler — must be registered LAST. */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // Zod validation errors → 400 with field-by-field details.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    });
    return;
  }

  if (err instanceof PasswordPolicyError) {
    res.status(400).json({
      error: { code: 'WEAK_PASSWORD', message: err.message },
    });
    return;
  }

  if (err instanceof TokenExpiredError) {
    res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Session expired' } });
    return;
  }
  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    return;
  }

  // Prisma known errors.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation.
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'A record with that value already exists' },
      });
      return;
    }
    if (err.code === 'P2025') {
      // Record not found for update/delete.
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
      return;
    }
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Anything else is unexpected — log and return a generic 500.
  const message = err instanceof Error ? err.message : 'Unknown error';
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error('unhandled error', {
    method: req.method,
    path: req.path,
    message,
    stack,
  });
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
};