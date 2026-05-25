/**
 * Jobs router.
 *
 * Routes:
 *   GET    /jobs            - list (public, supports pagination + filters)
 *   GET    /jobs/:id        - detail (public)
 *   POST   /jobs            - create (HR only)
 *   PATCH  /jobs/:id        - update (HR only + owner only)
 *   DELETE /jobs/:id        - delete (HR only + owner only)
 *
 * The list endpoint uses `optionalAuthenticate` so the `postedByMe` filter
 * works when the user is logged in — but the endpoint still responds for
 * anonymous callers, just ignoring that filter.
 */

import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, optionalAuthenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../shared/wrap.js';
import {
  createJobSchema,
  jobIdParamSchema,
  listJobsQuerySchema,
  updateJobSchema,
} from './jobs.schema.js';
import * as controller from './jobs.controller.js';

const router = Router();

// Public list + detail.
router.get(
  '/',
  optionalAuthenticate,
  validate(listJobsQuerySchema, 'query'),
  wrap(controller.list),
);
router.get('/:id', validate(jobIdParamSchema, 'params'), wrap(controller.detail));

// HR-only mutations.
router.post(
  '/',
  authenticate,
  requireRole(UserRole.HR),
  validate(createJobSchema),
  wrap(controller.create),
);
router.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.HR),
  validate(jobIdParamSchema, 'params'),
  validate(updateJobSchema),
  wrap(controller.update),
);
router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.HR),
  validate(jobIdParamSchema, 'params'),
  wrap(controller.remove),
);

export default router;