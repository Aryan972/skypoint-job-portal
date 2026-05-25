/**
 * Auth router.
 *
 * `wrap` adapts async handlers so any thrown error (or rejected promise) is
 * forwarded to Express's error middleware. Without it, you have to remember
 * to try/catch in every handler — easy to forget.
 */

import { Router, type RequestHandler } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import * as controller from './auth.controller.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (fn: (req: any, res: any, next: any) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = Router();

router.post('/register', validate(registerSchema), wrap(controller.register));
router.post('/login', validate(loginSchema), wrap(controller.login));
router.get('/me', authenticate, wrap(controller.me));

export default router;