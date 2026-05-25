/**
 * Applications routers.
 *
 * Two routers because the resource has two natural URL parents:
 *   - `/applications/...` for actions on an application by id (candidate
 *     dashboard, HR status update, single-record fetch)
 *   - `/jobs/:jobId/applications/...` for actions scoped to a job
 *     (candidate apply, HR list applicants)
 *
 * Both are mounted in `app.ts`. The nested router uses `mergeParams: true`
 * so `req.params.jobId` from the parent path is visible to its handlers.
 *
 * Routes (top-level, mounted at `/applications`):
 *   GET    /me        - candidate's own applications (CANDIDATE)
 *   GET    /:id       - single application (candidate-owner OR HR-owner of job)
 *   PATCH  /:id       - update status (HR + owns the job)
 *
 * Routes (nested, mounted at `/jobs/:jobId/applications`):
 *   POST   /          - candidate applies (CANDIDATE)
 *   GET    /          - HR lists applicants for the job (HR + owns the job)
 */

import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../shared/wrap.js';
import {
  applicationIdParamSchema,
  createApplicationSchema,
  jobIdParamSchema,
  listApplicationsForJobQuerySchema,
  listMyApplicationsQuerySchema,
  updateApplicationStatusSchema,
} from './applications.schema.js';
import * as controller from './applications.controller.js';

// ----- Top-level: /applications -----
const applicationsRouter = Router();

applicationsRouter.get(
  '/me',
  authenticate,
  requireRole(UserRole.CANDIDATE),
  validate(listMyApplicationsQuerySchema, 'query'),
  wrap(controller.listMine),
);

applicationsRouter.get(
  '/:id',
  authenticate,
  validate(applicationIdParamSchema, 'params'),
  wrap(controller.detail),
);

applicationsRouter.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.HR),
  validate(applicationIdParamSchema, 'params'),
  validate(updateApplicationStatusSchema),
  wrap(controller.updateStatus),
);

// ----- Nested: /jobs/:jobId/applications -----
const jobApplicationsRouter = Router({ mergeParams: true });

jobApplicationsRouter.post(
  '/',
  authenticate,
  requireRole(UserRole.CANDIDATE),
  validate(jobIdParamSchema, 'params'),
  validate(createApplicationSchema),
  wrap(controller.apply),
);

jobApplicationsRouter.get(
  '/',
  authenticate,
  requireRole(UserRole.HR),
  validate(jobIdParamSchema, 'params'),
  validate(listApplicationsForJobQuerySchema, 'query'),
  wrap(controller.listForJob),
);

export { applicationsRouter, jobApplicationsRouter };
