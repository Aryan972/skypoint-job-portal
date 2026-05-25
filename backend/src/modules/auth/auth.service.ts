/**
 * Auth service — pure business logic for registration and login.
 *
 * Kept separate from the HTTP controller so it can be unit-tested directly
 * and reused (e.g. by a CLI script to provision a user).
 */

import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signAccessToken } from '../../lib/jwt.js';
import { ConflictError, UnauthorizedError } from '../../middleware/error.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

export interface PublicUser {
  id: number;
  email: string;
  fullName: string;
  role: User['role'];
}

interface AuthResult {
  user: PublicUser;
  token: string;
}

function toPublic(u: User): PublicUser {
  return { id: u.id, email: u.email, fullName: u.fullName, role: u.role };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  // Check for an existing email up-front so we can return a friendly 409
  // before doing the (expensive) bcrypt hash.
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    },
  });

  const token = signAccessToken({
    sub: created.id,
    email: created.email,
    role: created.role,
  });
  return { user: toPublic(created), token };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Unified error for "user not found" and "wrong password" so an attacker
  // cannot enumerate valid email addresses.
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return { user: toPublic(user), token };
}

export async function getCurrentUser(userId: number): Promise<PublicUser> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return toPublic(user);
}