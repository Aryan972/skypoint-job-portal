/**
 * Applications service — business logic for the candidate apply flow and
 * the HR review flow.
 *
 * Authorization model:
 * - Apply (`applyToJob`) requires the caller to be a CANDIDATE. We do NOT
 *   allow HR to apply, even to other HRs' jobs, to keep the model clean.
 * - List own (`listMyApplications`) is candidate-only and always scoped
 *   to `req.user.id`. Service never trusts a candidateId from the caller.
 * - List for job (`listApplicationsForJob`) is HR-only AND requires the
 *   HR to own that job. Same ownership pattern as job mutations.
 * - Update status (`updateApplicationStatus`) is HR-only and requires the
 *   HR to own the job the application is attached to.
 * - Get by id (`getApplicationById`) returns 404 unless the caller is the
 *   candidate who owns it OR the HR who owns the underlying job.
 *
 * The "404 over 403" pattern from jobs.service applies here too — we never
 * leak the existence of an application to an unauthorized caller.
 *
 * Duplicate applications are blocked at two layers:
 * - A pre-check inside `applyToJob` for a friendly 409 message.
 * - The DB-level unique constraint on (jobId, candidateId) as a backstop in
 *   case two requests race past the check.
 */

import type { Application, Job, User } from '@prisma/client';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../middleware/error.js';
import {
  pageToSkip,
  toPage,
  type Page,
  type PaginationQuery,
} from '../../shared/pagination.js';
import type {
  CreateApplicationInput,
  ListApplicationsForJobQuery,
  ListMyApplicationsQuery,
} from './applications.schema.js';

export interface ApplicationOut {
  id: number;
  jobId: number;
  candidateId: number;
  coverLetter: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: number;
    title: string;
    location: string;
    isOpen: boolean;
  };
  candidate?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface ApplicationWithRelations extends Application {
  job?: Pick<Job, 'id' | 'title' | 'location' | 'isOpen'> | null;
  candidate?: Pick<User, 'id' | 'fullName' | 'email'> | null;
}

function toOut(a: ApplicationWithRelations): ApplicationOut {
  return {
    id: a.id,
    jobId: a.jobId,
    candidateId: a.candidateId,
    coverLetter: a.coverLetter,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    job: a.job
      ? {
          id: a.job.id,
          title: a.job.title,
          location: a.job.location,
          isOpen: a.job.isOpen,
        }
      : undefined,
    candidate: a.candidate
      ? {
          id: a.candidate.id,
          fullName: a.candidate.fullName,
          email: a.candidate.email,
        }
      : undefined,
  };
}

// ----------------------------------------------------------------------------
// Candidate flows
// ----------------------------------------------------------------------------

export async function applyToJob(
  jobId: number,
  candidateId: number,
  input: CreateApplicationInput,
): Promise<ApplicationOut> {
  // Confirm the job exists and is currently open. We resolve the job first
  // so we can return 404 / 400 with specific messages rather than relying on
  // a generic constraint failure later.
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, isOpen: true },
  });
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  if (!job.isOpen) {
    throw new BadRequestError('This job is no longer accepting applications');
  }

  // Friendly pre-check for duplicate application. The unique index is the
  // authoritative guard — see the P2002 catch below.
  const existing = await prisma.application.findUnique({
    where: {
      uniq_application_per_candidate_per_job: { jobId, candidateId },
    },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError('You have already applied to this job');
  }

  try {
    const created = await prisma.application.create({
      data: {
        jobId,
        candidateId,
        coverLetter: input.coverLetter,
      },
      include: {
        job: { select: { id: true, title: true, location: true, isOpen: true } },
      },
    });
    return toOut(created);
  } catch (err) {
    // Race condition: another request inserted the same (jobId, candidateId)
    // between our pre-check and this create. Surface as 409 too.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('You have already applied to this job');
    }
    throw err;
  }
}

export async function listMyApplications(
  candidateId: number,
  query: ListMyApplicationsQuery,
): Promise<Page<ApplicationOut>> {
  const where: Prisma.ApplicationWhereInput = { candidateId };
  if (query.status) {
    where.status = query.status;
  }
  const pq: PaginationQuery = { page: query.page, pageSize: query.pageSize };

  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      skip: pageToSkip(pq),
      take: pq.pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        job: { select: { id: true, title: true, location: true, isOpen: true } },
      },
    }),
  ]);

  return toPage(rows.map(toOut), total, pq);
}

// ----------------------------------------------------------------------------
// HR flows
// ----------------------------------------------------------------------------

/**
 * Ownership guard for jobs. Mirrors `assertOwnership` in jobs.service.
 * Returns 404 when the job exists but is owned by someone else.
 */
async function assertJobOwnedByHr(jobId: number, hrUserId: number): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, postedById: true },
  });
  if (!job || job.postedById !== hrUserId) {
    throw new NotFoundError('Job not found');
  }
}

export async function listApplicationsForJob(
  jobId: number,
  hrUserId: number,
  query: ListApplicationsForJobQuery,
): Promise<Page<ApplicationOut>> {
  await assertJobOwnedByHr(jobId, hrUserId);

  const where: Prisma.ApplicationWhereInput = { jobId };
  if (query.status) {
    where.status = query.status;
  }
  const pq: PaginationQuery = { page: query.page, pageSize: query.pageSize };

  const [total, rows] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      skip: pageToSkip(pq),
      take: pq.pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
      },
    }),
  ]);

  return toPage(rows.map(toOut), total, pq);
}

export async function updateApplicationStatus(
  applicationId: number,
  hrUserId: number,
  status: ApplicationStatus,
): Promise<ApplicationOut> {
  // Fetch the application together with its parent job so we can run the
  // ownership check in a single round-trip.
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: { select: { postedById: true } } },
  });
  if (!application || application.job.postedById !== hrUserId) {
    throw new NotFoundError('Application not found');
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status },
    include: {
      job: { select: { id: true, title: true, location: true, isOpen: true } },
      candidate: { select: { id: true, fullName: true, email: true } },
    },
  });
  return toOut(updated);
}

// ----------------------------------------------------------------------------
// Shared
// ----------------------------------------------------------------------------

interface AccessContext {
  userId: number;
  role: User['role'];
}

/**
 * Single-application view. Available to:
 *   - the candidate who owns the application
 *   - the HR who owns the parent job
 *
 * Anyone else gets 404 (not 403) so existence cannot be probed.
 */
export async function getApplicationById(
  applicationId: number,
  ctx: AccessContext,
): Promise<ApplicationOut> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { select: { id: true, title: true, location: true, isOpen: true, postedById: true } },
      candidate: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (!application) {
    throw new NotFoundError('Application not found');
  }

  const isOwningCandidate =
    ctx.role === 'CANDIDATE' && application.candidateId === ctx.userId;
  const isOwningHr =
    ctx.role === 'HR' && application.job.postedById === ctx.userId;

  if (!isOwningCandidate && !isOwningHr) {
    throw new NotFoundError('Application not found');
  }

  // Strip postedById from the embedded job — it was only needed for the auth
  // check and isn't part of the public ApplicationOut.job shape.
  const { postedById: _postedById, ...jobPublic } = application.job;
  return toOut({ ...application, job: jobPublic });
}
