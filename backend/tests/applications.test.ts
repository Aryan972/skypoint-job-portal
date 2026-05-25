/**
 * Integration tests for the applications module.
 *
 * Covers:
 *  - candidate apply happy path
 *  - duplicate apply blocked (returns 409)
 *  - apply blocked on a closed job (400)
 *  - apply blocked for HR role (403)
 *  - "list mine" scoped to the calling candidate
 *  - "list for job" requires HR ownership of the job (404 for outsiders)
 *  - status update requires HR ownership of the parent job
 *  - single-application detail visible to owning candidate AND owning HR
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

const COVER = 'I am very interested in this role and would love to chat further.';

describe('applications', () => {
  let app: Express;
  beforeAll(() => {
    app = buildApp();
  });

  describe('POST /jobs/:jobId/applications', () => {
    it('lets a candidate apply to an open job', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);

      const res = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER });
      expect(res.status).toBe(201);
      expect(res.body.application.jobId).toBe(job.id);
      expect(res.body.application.candidateId).toBe(candidate.id);
      expect(res.body.application.status).toBe('SUBMITTED');
    });

    it('returns 409 when the candidate applies twice to the same job', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);

      await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const dup = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER });
      expect(dup.status).toBe(409);
    });

    it('returns 400 when the job is closed', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token, { isOpen: false });

      const res = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER });
      expect(res.status).toBe(400);
    });

    it('returns 404 when the job does not exist', async () => {
      const candidate = await registerCandidate(app);
      const res = await request(app)
        .post('/api/v1/jobs/99999/applications')
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER });
      expect(res.status).toBe(404);
    });

    it('forbids HR from applying (role check)', async () => {
      const hrA = await registerHr(app);
      const hrB = await registerHr(app);
      const job = await createJob(app, hrA.token);

      const res = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(hrB.token))
        .send({ coverLetter: COVER });
      expect(res.status).toBe(403);
    });

    it('rejects a too-short cover letter with 400', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);

      const res = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: 'too short' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /applications/me', () => {
    it('returns only the calling candidate\'s applications', async () => {
      const hr = await registerHr(app);
      const candA = await registerCandidate(app);
      const candB = await registerCandidate(app);
      const job = await createJob(app, hr.token);

      await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candA.token))
        .send({ coverLetter: COVER })
        .expect(201);
      await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candB.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .get('/api/v1/applications/me')
        .set(authHeader(candA.token));
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].candidateId).toBe(candA.id);
      expect(res.body.items[0].job.title).toBeDefined();
    });

    it('forbids HR from hitting the candidate dashboard', async () => {
      const hr = await registerHr(app);
      const res = await request(app)
        .get('/api/v1/applications/me')
        .set(authHeader(hr.token));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /jobs/:jobId/applications', () => {
    it('lets the owning HR list applicants for their job', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);
      await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(hr.token));
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].candidate.email).toBe(candidate.email);
    });

    it('returns 404 when a different HR tries to list', async () => {
      const hrA = await registerHr(app);
      const hrB = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hrA.token);
      await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(hrB.token));
      expect(res.status).toBe(404);
    });

    it('forbids candidates from listing applicants', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);
      const res = await request(app)
        .get(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token));
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /applications/:id', () => {
    it('lets the owning HR change the status', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);
      const applied = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);
      const appId = applied.body.application.id;

      const res = await request(app)
        .patch(`/api/v1/applications/${appId}`)
        .set(authHeader(hr.token))
        .send({ status: 'SHORTLISTED' });
      expect(res.status).toBe(200);
      expect(res.body.application.status).toBe('SHORTLISTED');
    });

    it('returns 404 when a different HR tries to update', async () => {
      const hrA = await registerHr(app);
      const hrB = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hrA.token);
      const applied = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .patch(`/api/v1/applications/${applied.body.application.id}`)
        .set(authHeader(hrB.token))
        .send({ status: 'REJECTED' });
      expect(res.status).toBe(404);
    });

    it('rejects an invalid status with 400', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);
      const applied = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .patch(`/api/v1/applications/${applied.body.application.id}`)
        .set(authHeader(hr.token))
        .send({ status: 'NOT_A_REAL_STATUS' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /applications/:id', () => {
    it('is visible to the owning candidate', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);
      const applied = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/applications/${applied.body.application.id}`)
        .set(authHeader(candidate.token));
      expect(res.status).toBe(200);
      expect(res.body.application.candidateId).toBe(candidate.id);
    });

    it('is visible to the HR who owns the parent job', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hr.token);
      const applied = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/applications/${applied.body.application.id}`)
        .set(authHeader(hr.token));
      expect(res.status).toBe(200);
      expect(res.body.application.candidateId).toBe(candidate.id);
    });

    it('returns 404 to an unrelated candidate', async () => {
      const hr = await registerHr(app);
      const candidate = await registerCandidate(app);
      const stranger = await registerCandidate(app);
      const job = await createJob(app, hr.token);
      const applied = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/applications/${applied.body.application.id}`)
        .set(authHeader(stranger.token));
      expect(res.status).toBe(404);
    });

    it('returns 404 to an unrelated HR', async () => {
      const hrA = await registerHr(app);
      const hrB = await registerHr(app);
      const candidate = await registerCandidate(app);
      const job = await createJob(app, hrA.token);
      const applied = await request(app)
        .post(`/api/v1/jobs/${job.id}/applications`)
        .set(authHeader(candidate.token))
        .send({ coverLetter: COVER })
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/applications/${applied.body.application.id}`)
        .set(authHeader(hrB.token));
      expect(res.status).toBe(404);
    });
  });
});
