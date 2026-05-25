/**
 * Zod schemas for the Applications module.
 *
 * - `createApplicationSchema` validates a candidate's apply payload. Cover
 *   letter is required and length-bounded so the DB never sees absurd inputs.
 * - `updateApplicationStatusSchema` accepts a single field (the new status).
 *   We validate against the enum so an HR can only set one of the known states.
 * - The list-query schemas reuse the shared pagination helper and optionally
 *   accept a status filter so the candidate dashboard / HR review board can
 *   narrow the list.
 */

import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/pagination.js';

export const createApplicationSchema = z.object({
  coverLetter: z.string().trim().min(20).max(5_000),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationStatusSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
});
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;

const statusFilter = z.nativeEnum(ApplicationStatus).optional();

export const listMyApplicationsQuerySchema = paginationQuerySchema.extend({
  status: statusFilter,
});
export type ListMyApplicationsQuery = z.infer<typeof listMyApplicationsQuerySchema>;

export const listApplicationsForJobQuerySchema = paginationQuerySchema.extend({
  status: statusFilter,
});
export type ListApplicationsForJobQuery = z.infer<typeof listApplicationsForJobQuerySchema>;

export const applicationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type ApplicationIdParam = z.infer<typeof applicationIdParamSchema>;

export const jobIdParamSchema = z.object({
  jobId: z.coerce.number().int().positive(),
});
export type JobIdParam = z.infer<typeof jobIdParamSchema>;
