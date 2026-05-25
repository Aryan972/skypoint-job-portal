/**
 * Integration tests for the auth module.
 *
 * Covers register, login, /me, and the error paths that matter:
 * duplicate email, weak password, wrong password, missing token, invalid token.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { UserRole } from '@prisma/client';
import { buildApp, registerCandidate } from './helpers.js';

describe('auth', () => {
  let app: Express;

  beforeAll(() => {
    app = buildApp();
  });

  describe('POST /auth/register', () => {
    it('creates a new user and returns a token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'Password@123',
          fullName: 'New User',
          role: UserRole.CANDIDATE,
        });
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('newuser@test.com');
      expect(res.body.user.role).toBe('CANDIDATE');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(typeof res.body.token).toBe('string');
    });

    it('rejects a weak password with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'weakpw@test.com',
          password: 'password', // no uppercase, digit, or special
          fullName: 'Weak Password',
          role: UserRole.CANDIDATE,
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('rejects malformed email with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password@123',
          fullName: 'Bad Email',
          role: UserRole.CANDIDATE,
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate email with 409', async () => {
      await registerCandidate(app, { email: 'dupe@test.com' });
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'dupe@test.com',
          password: 'Password@123',
          fullName: 'Dupe',
          role: UserRole.CANDIDATE,
        });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('returns a token on valid credentials', async () => {
      await registerCandidate(app, {
        email: 'loginok@test.com',
        password: 'Password@123',
      });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'loginok@test.com', password: 'Password@123' });
      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user.email).toBe('loginok@test.com');
    });

    it('returns a generic 401 on wrong password (no email enumeration)', async () => {
      await registerCandidate(app, {
        email: 'wrongpw@test.com',
        password: 'Password@123',
      });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'wrongpw@test.com', password: 'wrong-Password@1' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });

    it('returns the same generic 401 for unknown email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'Password@123' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/invalid email or password/i);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user when a valid token is sent', async () => {
      const user = await registerCandidate(app, { email: 'me@test.com' });
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${user.token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('me@test.com');
    });

    it('returns 401 when the Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with INVALID_TOKEN code on a garbage token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
