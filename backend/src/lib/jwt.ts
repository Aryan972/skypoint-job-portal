/**
 * JWT helpers — sign and verify access tokens.
 *
 * The payload carries the minimum needed to authorize a request: user id,
 * role, and email (handy for audit logs). Anything else (full name etc.) is
 * fetched from the DB by middleware so token size stays small and so a
 * user's profile data can change without invalidating their token.
 */

import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: number; // user id
  email: string;
  role: UserRole;
}

interface DecodedPayload extends AccessTokenPayload {
  iat: number;
  exp: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/** Throws JsonWebTokenError / TokenExpiredError on failure — let the caller catch. */
export function verifyAccessToken(token: string): DecodedPayload {
  return jwt.verify(token, env.JWT_SECRET) as unknown as DecodedPayload;
}