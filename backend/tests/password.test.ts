/**
 * Unit tests for the password module — pure functions, no DB.
 *
 * These complement the integration tests in `auth.test.ts`. Keeping them
 * separate means a change to the policy can be verified without spinning
 * up Postgres.
 */

import { describe, expect, it } from 'vitest';
import {
  assertPasswordPolicy,
  hashPassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PasswordPolicyError,
  verifyPassword,
} from '../src/lib/password.js';

describe('assertPasswordPolicy', () => {
  it('accepts a password that meets every rule', () => {
    expect(() => assertPasswordPolicy('Strong@123')).not.toThrow();
  });

  it('rejects a password shorter than the minimum', () => {
    const tooShort = 'A1@a';
    expect(tooShort.length).toBeLessThan(MIN_PASSWORD_LENGTH);
    expect(() => assertPasswordPolicy(tooShort)).toThrow(PasswordPolicyError);
  });

  it('rejects a password longer than the maximum', () => {
    const tooLong = 'A1@a'.repeat(MAX_PASSWORD_LENGTH);
    expect(tooLong.length).toBeGreaterThan(MAX_PASSWORD_LENGTH);
    expect(() => assertPasswordPolicy(tooLong)).toThrow(PasswordPolicyError);
  });

  it('rejects when missing an uppercase letter', () => {
    expect(() => assertPasswordPolicy('weakpass@123')).toThrow(/uppercase/i);
  });

  it('rejects when missing a lowercase letter', () => {
    expect(() => assertPasswordPolicy('STRONG@123')).toThrow(/lowercase/i);
  });

  it('rejects when missing a digit', () => {
    expect(() => assertPasswordPolicy('Strong@Pass')).toThrow(/digit/i);
  });

  it('rejects when missing a special character', () => {
    expect(() => assertPasswordPolicy('Strong123')).toThrow(/special character/i);
  });

  it('reports every missing class in one error message', () => {
    try {
      assertPasswordPolicy('weakpass'); // missing upper, digit, special
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PasswordPolicyError);
      const msg = (err as Error).message;
      expect(msg).toMatch(/uppercase/i);
      expect(msg).toMatch(/digit/i);
      expect(msg).toMatch(/special character/i);
    }
  });

  it('rejects a non-string input', () => {
    // The runtime guard exists for callers that bypass the schema.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => assertPasswordPolicy(123 as any)).toThrow(PasswordPolicyError);
  });
});

describe('hashPassword + verifyPassword', () => {
  it('round-trips a valid password (verify returns true)', async () => {
    const hash = await hashPassword('Strong@123');
    expect(hash).not.toBe('Strong@123');
    expect(await verifyPassword('Strong@123', hash)).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const hash = await hashPassword('Strong@123');
    expect(await verifyPassword('wrong-Pass@1', hash)).toBe(false);
  });

  it('returns false for a malformed hash without throwing', async () => {
    expect(await verifyPassword('Strong@123', 'not-a-bcrypt-hash')).toBe(false);
  });

  it('refuses to hash a password that violates the policy', async () => {
    await expect(hashPassword('weak')).rejects.toBeInstanceOf(PasswordPolicyError);
  });
});
