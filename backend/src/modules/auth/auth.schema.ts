/**
 * Zod schemas for auth endpoints.
 *
 * The password length minimum (8) is enforced here for fast rejection;
 * the full password policy (complexity rules) lives in lib/password.ts and
 * is checked inside the service. We don't duplicate the policy here because
 * Zod's API for "must contain one uppercase, one digit, etc." is verbose
 * and error-prone; one source of truth is better.
 */

import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120),
  role: z.nativeEnum(UserRole),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128), // no policy on login — only on register
});
export type LoginInput = z.infer<typeof loginSchema>;