/**
 * Express app factory.
 *
 * Returning the app as a function (rather than a top-level export) makes
 * integration tests cleaner — they can build a fresh instance per suite
 * without process-global side effects.
 */

import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './modules/auth/auth.routes.js';

export function createApp(): Express {
  const app = express();

  // Security headers — sensible defaults from Helmet.
  app.use(helmet());

  // CORS with explicit allow-list from env. No credentials needed because we
  // use Bearer tokens, not cookies, but allowing them costs nothing here.
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );

  // JSON body parser with a hard cap to prevent large-payload DoS.
  app.use(express.json({ limit: '100kb' }));

  // Access logging. Skip noisy /health requests in production.
  if (!env.isTest) {
    app.use(
      morgan(env.isProduction ? 'combined' : 'dev', {
        skip: (req) => env.isProduction && req.url === '/api/v1/health',
      }),
    );
  }

  // ----- Routes -----
  const api = express.Router();

  api.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  api.use('/auth', authRoutes);

  app.use('/api/v1', api);

  // 404 + error handler MUST be registered last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}