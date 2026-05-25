/**
 * Jobs controller — translates HTTP into service calls. No business logic.
 */

import type { Request, Response } from 'express';
import * as jobsService from './jobs.service.js';
import { UnauthorizedError } from '../../middleware/error.js';
import type {
  CreateJobInput,
  JobIdParam,
  ListJobsQuery,
  UpdateJobInput,
} from './jobs.schema.js';

export const list = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as ListJobsQuery;
  // `postedByMe=true` only makes sense when authenticated; we pass userId
  // through so the service can apply it. Public requests pass undefined.
  const page = await jobsService.listJobs(query, { userId: req.user?.id });
  res.status(200).json(page);
};

export const detail = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as JobIdParam;
  const job = await jobsService.getJobById(id);
  res.status(200).json({ job });
};

export const create = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const input = req.body as CreateJobInput;
  const job = await jobsService.createJob(input, req.user.id);
  res.status(201).json({ job });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const { id } = req.params as unknown as JobIdParam;
  const input = req.body as UpdateJobInput;
  const job = await jobsService.updateJob(id, input, req.user.id);
  res.status(200).json({ job });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const { id } = req.params as unknown as JobIdParam;
  await jobsService.deleteJob(id, req.user.id);
  res.status(204).send();
};