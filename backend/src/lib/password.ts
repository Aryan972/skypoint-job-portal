/**
 * Password policy + hashing.
 *
 * The policy is enforced HERE rather than only in the Zod schema, so any code
 * path that creates or changes a password (register, future password reset,
 * future password change) has to go through it. Single source of truth.
 *
 * Policy (intentionally pragmatic, not OWASP-maximalist):
 *   - 8..128 chars
 *   - at least one uppercase, one lowercase, one digit, one special character
 *
 * bcrypt with 12 rounds is the current sensible baseline. Tunable via env.
 */

import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

const RULES: ReadonlyArray<{ test: RegExp; message: string }> = [
  { test: /[A-Z]/, message: 'an uppercase letter' },
  { test: /[a-z]/, message: 'a lowercase letter' },
  { test: /\d/, message: 'a digit' },
  { test: /[^A-Za-z0-9]/, message: 'a special character' },
];

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordPolicyError';
  }
}

/**
 * Throws PasswordPolicyError if the password does not meet the policy.
 * Returns void on success — callers should treat that as "all clear".
 */
export function assertPasswordPolicy(password: string): void {
  if (typeof password !== 'string') {
    throw new PasswordPolicyError('Password must be a string.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new PasswordPolicyError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new PasswordPolicyError(
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters long.`,
    );
  }
  const missing = RULES.filter((r) => !r.test.test(password)).map((r) => r.message);
  if (missing.length > 0) {
    throw new PasswordPolicyError(`Password must contain ${missing.join(', ')}.`);
  }
}

export async function hashPassword(plain: string): Promise<string> {
  assertPasswordPolicy(plain);
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  // bcrypt.compare is constant-time relative to the hash, and won't throw
  // on a malformed hash — just returns false.
  try {
    return await bcrypt.compare(plain, hashed);
  } catch {
    return false;
  }
}