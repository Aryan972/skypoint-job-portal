/**
 * Auth controller — translates HTTP requests into service calls and back.
 *
 * Intentionally thin. No business logic here; that lives in the service.
 */

import type { Request, RequestHandler, Response } from 'express';
import * as authService from './auth.service.js';
import { UnauthorizedError } from '../../middleware/error.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

export const register: RequestHandler = async (req, res) => {
  const result = await authService.registerUser(req.body as RegisterInput);
  res.status(201).json(result);
};

export const login: RequestHandler = async (req, res) => {
  const result = await authService.loginUser(req.body as LoginInput);
  res.status(200).json(result);
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new UnauthorizedError();
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ user });
};