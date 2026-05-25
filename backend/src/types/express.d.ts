/**
 * Augment Express's Request with a typed `user` property populated by the
 * auth middleware. With this, downstream handlers get full TypeScript safety
 * on `req.user.id` / `req.user.role` and so on.
 */

import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};