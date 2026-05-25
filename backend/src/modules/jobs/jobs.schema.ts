/**
 * Zod schemas for the Jobs module.
 *
 * - `createJobSchema` requires the full set of fields.
 * - `updateJobSchema` makes them all optional (partial update / PATCH semantics).
 * - `listJobsQuerySchema` carries pagination + filter fields. Coerces strings
 *   to numbers where needed since query strings are always strings on the wire.
 * - `jobIdParamSchema` validates `:id` route params so handlers can rely on
 *   the type being `number`, not `string`.
 *
 * The salary-min/max consistency check (`min <= max`) runs in `.refine()` so
 * we get a single error message rather than two scattered ones.
 */

import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/pagination.js';

const baseFields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(20).max(10_000),
  location: z.string().trim().min(2).max(120),
  salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(),
  isOpen: z.boolean().optional(),
};

function refineSalaryRange<T extends z.ZodTypeAny>(schema: T): T {
  return schema.refine(
    (data: { salaryMin?: number | null; salaryMax?: number | null }) => {
      if (data.salaryMin == null || data.salaryMax == null) return true;
      return data.salaryMin <= data.salaryMax;
    },
    { message: 'salaryMin must be less than or equal to salaryMax', path: ['salaryMin'] },
  ) as unknown as T;
}

export const createJobSchema = refineSalaryRange(z.object(baseFields));
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = refineSalaryRange(z.object(baseFields).partial());
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export const listJobsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  location: z.string().trim().min(1).max(120).optional(),
  isOpen: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  postedByMe: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;

export const jobIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type JobIdParam = z.infer<typeof jobIdParamSchema>;