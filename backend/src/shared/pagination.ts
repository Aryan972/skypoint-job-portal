/**
 * Pagination primitives shared across list endpoints.
 *
 * - `paginationQuerySchema` parses `page` and `pageSize` from the query string,
 *   coerces them to integers, enforces sane bounds, and provides defaults.
 * - `Page<T>` is the response wrapper used by every paginated endpoint so the
 *   client only has to learn one shape.
 *
 * Cap at 100 items per page to prevent unbounded queries — important for
 * DoS resistance on a public endpoint.
 */

import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toPage<T>(items: T[], total: number, query: PaginationQuery): Page<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Translate a 1-indexed `page` to a Prisma `skip` value. */
export function pageToSkip(query: PaginationQuery): number {
  return (query.page - 1) * query.pageSize;
}