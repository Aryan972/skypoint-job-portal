/**
 * Integration tests for the jobs module.
 *
 * The headline check is the cross-tenant ownership guard: HR-B must not be
 * able to update or delete HR-A's job (and we expect 404, not 403, to match
 * the "no existence leak" pattern).
 */

import { describe, expect, it, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  authHeader,
  buildApp,
  createJob,
  registerCandidate,
  registerHr,
} from './helpers.js';

describe('jobs', () => {
  let app: Express;
  beforeAll(() => {
    app = buildApp();
  });

  describe('GET /jobs (public)', () => {
    it('returns an empty page when no jobs exist', async () => {
      const res = await request(app).get('/api/v1/jobs');
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.page).toBe(1);
    });

    it('lists jobs without authentication', async () => {
      const hr = await registerHr(app);
      await createJob(app, hr.token, { title: 'Public Job' });
      const res = await request(app).get('/api/v1/jobs');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('Public Job');
    });

    it('filters by case-insensitive search', async () => {
      const hr = await registerHr(app);
      await createJob(app, hr.token, { title: 'Senior Engineer' });
      await createJob(app, hr.token, { title: 'Junior Designer' });
      const res = await request(app).get('/api/v1/jobs?search=ENGINEER');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('Senior Engineer');
    });

    it('paginates results', async () => {
      const hr = await registerHr(app);
      for (let i = 0; i < 3; i += 1) {
        await createJob(app, hr.token, { title: `Job ${i}` });
      }
      const res = await request(app).get('/api/v1/jobs?page=1&pageSize=2');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.totalPages).toBe(2);
    });

    it('scopes "postedByMe=true" to the authenticated HR', async () => {
      const hrA = await registerHr(app);
      const hrB = await registerHr(app);
      await createJob(app, hrA.token, { title: 'A Job' });
      await createJob(app, hrB.token, { title: 'B Job' });

      const res = await request(app)
        .get('/api/v1/jobs?postedByMe=true')
        .set(authHeader(hrA.token));
      expect(res.status).toBe(200);
      expect(res.body.items.map((j: { title: string }) => j.title)).toEqual([
        'A Job',
      ]);
    });
  });

  describe('POST /jobs', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/api/v1/jobs').send({});
      expect(res.status).toBe(401);
    });

    it('rejects candidates with 403', async () => {
      const candidate = await registerCandidate(app);
      const res = await request(app)
        .post('/api/v1/jobs')
        .set(authHeader(candidate.token))
        .send({
          title: 'New Job',
          description: 'A very nice description that meets the minimum length.',
          location: 'Remote',
        });
      expect(res.status).toBe(403);
    });

    it('creates a job for an HR', async () => {
      const hr = await registerHr(app);
      const res = await request(app)
        .post('/api/v1/jobs')
        .set(authHeader(hr.token))
        .send({
          title: 'New Job',
          description: 'A very nice description that meets the minimum length.',
          location: 'Remote',
          salaryMin: 50000,
          salaryMax: 80000,
        });
      expect(res.status).toBe(201);
      expect(res.body.job.title).toBe('New Job');
      expect(res.body.job.postedById).toBe(hr.id);
    });

    it('rejects salaryMin > salaryMax with 400', async () => {
      const hr = await registerHr(app);
      const res = await request(app)
        .post('/api/v1/jobs')
        .set(authHeader(hr.token))
        .send({
          title: 'Inverted Salary',
          description: 'A very nice description that meets the minimum length.',
          location: 'Remote',
          salaryMin: 200000,
          salaryMax: 50000,
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /jobs/:id (ownership)', () => {
    it('lets the owning HR update their own job', async () => {
      const hr = await registerHr(app);
      const job = await createJob(app, hr.token);
      const res = await request(app)
        .patch(`/api/v1/jobs/${job.id}`)
        .set(authHeader(hr.token))
        .send({ title: 'Updated Title' });
      expect(res.status).toBe(200);
      expect(res.body.job.title).toBe('Updated Title');
    });

    it('returns 404 (not 403) when a different HR tries to update', async () => {
      const hrA = await registerHr(app);
      const hrB = await registerHr(app);
      const job = await createJob(app, hrA.token);
      const res = await request(app)
        .patch(`/api/v1/jobs/${job.id}`)
        .set(authHeader(hrB.token))
        .send({ title: 'Hijack' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /jobs/:id (ownership)', () => {
    it('lets the owning HR delete their own job', async () => {
      const hr = await registerHr(app);
      const job = await createJob(app, hr.token);
      const res = await request(app)
        .delete(`/api/v1/jobs/${job.id}`)
        .set(authHeader(hr.token));
      expect(res.status).toBe(204);

      const after = await request(app).get(`/api/v1/jobs/${job.id}`);
      expect(after.status).toBe(404);
    });

    it('returns 404 when a different HR tries to delete', async () => {
      const hrA = await registerHr(app);
      const hrB = await registerHr(app);
      const job = await createJob(app, hrA.token);
      const res = await request(app)
        .delete(`/api/v1/jobs/${job.id}`)
        .set(authHeader(hrB.token));
      expect(res.status).toBe(404);
    });
  });
});
