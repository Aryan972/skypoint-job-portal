/**
 * Server entry point.
 *
 * Boots the Express app, listens on PORT, and wires up graceful shutdown so
 * SIGTERM/SIGINT from Docker drains in-flight requests instead of being
 * cut off mid-response.
 */

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

async function main(): Promise<void> {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`server listening on port ${env.PORT}`, { env: env.NODE_ENV });
  });

  const shutdown = (signal: string) => async (): Promise<void> => {
    logger.info(`received ${signal}, shutting down...`);
    server.close(async (err) => {
      if (err) {
        logger.error('error closing HTTP server', { message: err.message });
        process.exit(1);
      }
      try {
        await prisma.$disconnect();
        logger.info('shutdown complete');
        process.exit(0);
      } catch (e) {
        logger.error('error disconnecting prisma', {
          message: e instanceof Error ? e.message : String(e),
        });
        process.exit(1);
      }
    });

    // Hard timeout so a stuck connection doesn't block forever.
    setTimeout(() => {
      logger.warn('shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  logger.error('fatal startup error', {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});