/**
 * Jobs service — business logic for posting, listing, and managing jobs.
 *
 * Authorization model:
 * - Listing and detail are PUBLIC (no auth required). Anyone can browse jobs.
 * - Creating a job requires HR role.
 * - Updating / deleting a job requires (a) HR role AND (b) ownership of THAT
 *   specific job: `job.postedById === requestingUserId`.
 *
 * The ownership check is the headline security fix. The previous iteration
 * shipped a cross-tenant bug where any HR could edit any other HR's jobs.
 * Here every mutation goes through `assertOwnership()` first.
 *
 * The check explicitly returns 404 (not 403) when a job exists but belongs to
 * someone else, to avoid leaking the existence of resources to unauthorized
 * users. This is the standard "404 over 403" pattern.
 */

import type { Job } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../../middleware/error.js';
import {
  pageToSkip,
  toPage,
  type Page,
  type PaginationQuery,
} from '../../shared/pagination.js';
import type {
  CreateJobInput,
  ListJobsQuery,
  UpdateJobInput,
} from './jobs.schema.js';

export interface JobOut {
  id: number;
  title: string;
  description: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  isOpen: boolean;
  postedById: number;
  postedByName: string | null;
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
}

interface JobWithRelations extends Job {
  postedBy?: { fullName: string } | null;
  _count?: { applications: number };
}

function toOut(job: JobWithRelations): JobOut {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    isOpen: job.isOpen,
    postedById: job.postedById,
    postedByName: job.postedBy?.fullName ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    applicationCount: job._count?.applications,
  };
}

// ----------------------------------------------------------------------------
// List + detail
// ----------------------------------------------------------------------------

interface ListContext {
  /** If provided, "postedByMe=true" filter scopes to this user's jobs. */
  userId?: number;
}

export async function listJobs(
  query: ListJobsQuery,
  ctx: ListContext = {},
): Promise<Page<JobOut>> {
  const where: Prisma.JobWhereInput = {};

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.location) {
    where.location = { contains: query.location, mode: 'insensitive' };
  }
  if (query.isOpen !== undefined) {
    where.isOpen = query.isOpen;
  }
  if (query.postedByMe && ctx.userId !== undefined) {
    where.postedById = ctx.userId;
  }

  const pq: PaginationQuery = { page: query.page, pageSize: query.pageSize };

  // Run count + page query in parallel — saves a round-trip.
  const [total, rows] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      skip: pageToSkip(pq),
      take: pq.pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        postedBy: { select: { fullName: true } },
        _count: { select: { applications: true } },
      },
    }),
  ]);

  return toPage(rows.map(toOut), total, pq);
}

export async function getJobById(id: number): Promise<JobOut> {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      postedBy: { select: { fullName: true } },
      _count: { select: { applications: true } },
    },
  });
  if (!job) throw new NotFoundError('Job not found');
  return toOut(job);
}

// ----------------------------------------------------------------------------
// Create / update / delete (HR-only, ownership-checked)
// ----------------------------------------------------------------------------

export async function createJob(input: CreateJobInput, hrUserId: number): Promise<JobOut> {
  const created = await prisma.job.create({
    data: {
      title: input.title,
      description: input.description,
      location: input.location,
      salaryMin: input.salaryMin ?? null,
      salaryMax: input.salaryMax ?? null,
      isOpen: input.isOpen ?? true,
      postedById: hrUserId,
    },
    include: {
      postedBy: { select: { fullName: true } },
      _count: { select: { applications: true } },
    },
  });
  return toOut(created);
}

/**
 * Ownership guard.
 *
 * Returns 404 when the job exists but is owned by someone else, instead of
 * 403, so an unauthorized user cannot probe for resource existence.
 */
async function assertOwnership(jobId: number, hrUserId: number): Promise<Job> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  if (job.postedById !== hrUserId) {
    throw new NotFoundError('Job not found');
  }
  return job;
}

export async function updateJob(
  id: number,
  input: UpdateJobInput,
  hrUserId: number,
): Promise<JobOut> {
  await assertOwnership(id, hrUserId);

  // Build the data object explicitly so we don't allow callers to set fields
  // they shouldn't (e.g. postedById).
  const data: Prisma.JobUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.location !== undefined) data.location = input.location;
  if (input.salaryMin !== undefined) data.salaryMin = input.salaryMin;
  if (input.salaryMax !== undefined) data.salaryMax = input.salaryMax;
  if (input.isOpen !== undefined) data.isOpen = input.isOpen;

  const updated = await prisma.job.update({
    where: { id },
    data,
    include: {
      postedBy: { select: { fullName: true } },
      _count: { select: { applications: true } },
    },
  });
  return toOut(updated);
}

export async function deleteJob(id: number, hrUserId: number): Promise<void> {
  await assertOwnership(id, hrUserId);
  await prisma.job.delete({ where: { id } });
}

// Re-export ForbiddenError so consumers don't import it from a deep path.
// (Currently unused externally, but provided for parity with future modules.)
export { ForbiddenError };