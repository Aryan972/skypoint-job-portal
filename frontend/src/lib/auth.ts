/**
 * Token storage helpers.
 *
 * localStorage is the pragmatic choice here:
 *   - we use Bearer tokens, not session cookies, so XSS is the realistic threat
 *   - the helmet-protected backend + CSP on the static host narrow that risk
 *   - the alternative (HttpOnly cookies) would force us to invent a CSRF story
 *
 * If this app ever stores sensitive data client-side, switch to HttpOnly cookies.
 */

const KEY = 'jp.token';

export const tokenStorage = {
  read(): string | null {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  write(token: string): void {
    try {
      window.localStorage.setItem(KEY, token);
    } catch {
      /* Storage disabled or full — degrade silently. */
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
