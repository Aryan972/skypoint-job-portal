/**
 * Applications controller — thin HTTP layer over the service.
 *
 * `req.user` is guaranteed non-undefined on every route here because they all
 * go through `authenticate`, but TypeScript can't know that, so we narrow with
 * an UnauthorizedError guard for safety.
 */

import type { Request, Response } from 'express';
import * as applicationsService from './applications.service.js';
import { UnauthorizedError } from '../../middleware/error.js';
import type {
  ApplicationIdParam,
  CreateApplicationInput,
  JobIdParam,
  ListApplicationsForJobQuery,
  ListMyApplicationsQuery,
  UpdateApplicationStatusInput,
} from './applications.schema.js';

export const apply = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const { jobId } = req.params as unknown as JobIdParam;
  const input = req.body as CreateApplicationInput;
  const application = await applicationsService.applyToJob(jobId, req.user.id, input);
  res.status(201).json({ application });
};

export const listMine = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const query = req.query as unknown as ListMyApplicationsQuery;
  const page = await applicationsService.listMyApplications(req.user.id, query);
  res.status(200).json(page);
};

export const listForJob = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const { jobId } = req.params as unknown as JobIdParam;
  const query = req.query as unknown as ListApplicationsForJobQuery;
  const page = await applicationsService.listApplicationsForJob(
    jobId,
    req.user.id,
    query,
  );
  res.status(200).json(page);
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const { id } = req.params as unknown as ApplicationIdParam;
  const { status } = req.body as UpdateApplicationStatusInput;
  const application = await applicationsService.updateApplicationStatus(
    id,
    req.user.id,
    status,
  );
  res.status(200).json({ application });
};

export const detail = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const { id } = req.params as unknown as ApplicationIdParam;
  const application = await applicationsService.getApplicationById(id, {
    userId: req.user.id,
    role: req.user.role,
  });
  res.status(200).json({ application });
};
