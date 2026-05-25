/**
 * One-time global setup for the test suite.
 *
 * Validates that TEST_DATABASE_URL points to a reachable Postgres and applies
 * pending migrations against it. Runs once per `vitest` invocation, before any
 * worker boots.
 *
 * If you don't already have a test database, the simplest path is:
 *   createdb jobportal_test
 *   export TEST_DATABASE_URL=postgresql://USER:PASS@localhost:5432/jobportal_test
 *   npm test
 *
 * Or, against the docker-compose Postgres, uncomment the `ports:` block in
 * `docker-compose.yml` so port 5432 is exposed to the host first.
 */

import { execSync } from 'node:child_process';

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. See tests/global-setup.ts for instructions.',
    );
  }

  // Apply migrations against the test DB. `migrate deploy` is the production-
  // grade entry point — same one the Docker entrypoint uses on real boots.
  // We pipe DATABASE_URL through env so we don't have to rewrite .env files.
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
