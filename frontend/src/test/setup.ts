/**
 * Vitest setup: extend `expect` with @testing-library/jest-dom matchers
 * (toBeInTheDocument, toHaveAttribute, etc.) and clear localStorage between
 * tests so the AuthProvider doesn't carry tokens across cases.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
