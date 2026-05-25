/**
 * Shared helpers for integration tests.
 *
 * Each helper goes through the real HTTP layer (supertest) rather than seeding
 * Prisma directly — that way the test covers the actual request/response
 * contract end-to-end, including validation and auth middleware.
 */

import request from 'supertest';
import type { Express } from 'express';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app.js';

export function buildApp(): Express {
  return createApp();
}

interface RegisteredUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  token: string;
}

interface RegisterOpts {
  email?: string;
  password?: string;
  fullName?: string;
  role: UserRole;
}

let userCounter = 0;
function nextEmail(role: UserRole): string {
  userCounter += 1;
  return `${role.toLowerCase()}-${userCounter}-${Date.now()}@test.com`;
}

export async function registerUser(
  app: Express,
  opts: RegisterOpts,
): Promise<RegisteredUser> {
  const email = opts.email ?? nextEmail(opts.role);
  const password = opts.password ?? 'Password@123';
  const fullName = opts.fullName ?? `Test ${opts.role}`;

  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password, fullName, role: opts.role });

  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    id: res.body.user.id,
    email: res.body.user.email,
    fullName: res.body.user.fullName,
    role: res.body.user.role,
    token: res.body.token,
  };
}

export async function registerHr(app: Express, opts: Partial<RegisterOpts> = {}) {
  return registerUser(app, { ...opts, role: UserRole.HR });
}

export async function registerCandidate(
  app: Express,
  opts: Partial<RegisterOpts> = {},
) {
  return registerUser(app, { ...opts, role: UserRole.CANDIDATE });
}

interface CreateJobOpts {
  title?: string;
  description?: string;
  location?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  isOpen?: boolean;
}

export async function createJob(
  app: Express,
  hrToken: string,
  opts: CreateJobOpts = {},
): Promise<{ id: number; title: string; isOpen: boolean }> {
  const res = await request(app)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${hrToken}`)
    .send({
      title: opts.title ?? 'Senior Engineer',
      description:
        opts.description ??
        'Build great software with a great team in a great place.',
      location: opts.location ?? 'Remote',
      salaryMin: opts.salaryMin ?? 100000,
      salaryMax: opts.salaryMax ?? 150000,
      isOpen: opts.isOpen ?? true,
    });
  if (res.status !== 201) {
    throw new Error(`createJob failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.job;
}

export const authHeader = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});
