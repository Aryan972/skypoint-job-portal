/**
 * Auth middleware.
 *
 * `authenticate` verifies the JWT on `Authorization: Bearer <token>`,
 * loads the user from the DB to confirm they still exist and are active,
 * and attaches a slim user object to `req.user`.
 *
 * `requireRole(role)` is a tiny factory that returns a guard middleware.
 * Used in routes like `requireRole('HR')` for HR-only endpoints.
 *
 * Loading from the DB on every request (rather than trusting the token blindly)
 * means a disabled user is locked out immediately, not when their token expires.
 */

import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { ForbiddenError, UnauthorizedError } from './error.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedError('Missing token');
    }

    const payload = verifyAccessToken(token); // throws on invalid/expired

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User no longer active');
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError(`This action requires role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
}