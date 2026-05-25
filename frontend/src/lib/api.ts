/**
 * Tiny HTTP client around `fetch`.
 *
 * - Base URL comes from `VITE_API_BASE_URL`, baked in at build time.
 * - Attaches the JWT from `tokenStorage` when present.
 * - Throws `ApiClientError` on non-2xx so React Query treats the call as
 *   failed. The error carries the parsed `{ error: { code, message } }`
 *   payload so callers can branch on `error.code`.
 * - 401 from the server clears the stored token — keeps the UI from
 *   getting stuck on a stale session after the token expires.
 */

import { tokenStorage } from './auth';
import type { ApiError } from '../types/api';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
// Strip trailing slash so callers can write `request('/jobs')` consistently.
const BASE_URL = RAW_BASE.replace(/\/+$/, '');

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === '' || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  // Re-render absolute URLs verbatim, otherwise keep the host the caller has.
  return RAW_BASE.startsWith('http')
    ? `${BASE_URL}${path}${url.search}`
    : `${url.pathname}${url.search}`;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const token = tokenStorage.read();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  // Anything that didn't 2xx — try to parse the API error envelope.
  if (!res.ok) {
    let parsed: ApiError | undefined;
    try {
      parsed = (await res.json()) as ApiError;
    } catch {
      // Not JSON — fall through to a generic error.
    }
    if (res.status === 401) {
      tokenStorage.clear();
    }
    throw new ApiClientError(
      res.status,
      parsed?.error?.code ?? 'UNKNOWN',
      parsed?.error?.message ?? res.statusText,
      parsed?.error?.details,
    );
  }

  return (await res.json()) as T;
}
