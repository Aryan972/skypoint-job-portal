/**
 * Auth router.
 *
 * Uses the shared `wrap` helper from `shared/wrap.ts` so any thrown error or
 * rejected promise in async handlers gets forwarded to the error middleware.
 */

import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimit.js';
import { wrap } from '../../shared/wrap.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import * as controller from './auth.controller.js';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), wrap(controller.register));
router.post('/login', loginLimiter, validate(loginSchema), wrap(controller.login));
router.get('/me', authenticate, wrap(controller.me));

export default router;