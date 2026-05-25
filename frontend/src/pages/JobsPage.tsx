/**
 * Public job listing.
 *
 * Anyone can browse — no auth required. Authenticated HRs see a "My postings"
 * toggle that maps to the backend's `postedByMe=true` filter.
 *
 * Filters (search, location, isOpen) live in the URL so deep links and the
 * back button work. Pagination is server-driven through `Page<T>`.
 */

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { JobCard } from '../components/JobCard';
import type { Job, Page } from '../types/api';

const PAGE_SIZE = 10;

export function JobsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const search = params.get('search') ?? '';
  const location = params.get('location') ?? '';
  const isOpen = params.get('isOpen');
  const postedByMe = params.get('postedByMe') === 'true';

  // Local form state for the filter inputs — flushed to the URL on submit
  // so we don't refetch on every keystroke.
  const [searchInput, setSearchInput] = useState(search);
  const [locationInput, setLocationInput] = useState(location);
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => setLocationInput(location), [location]);

  const query = useQuery({
    queryKey: ['jobs', { page, search, location, isOpen, postedByMe }],
    queryFn: () =>
      request<Page<Job>>('/jobs', {
        query: {
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          location: location || undefined,
          isOpen: isOpen === null ? undefined : isOpen,
          postedByMe: postedByMe ? 'true' : undefined,
        },
      }),
  });

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    next.set('page', '1');
    setParams(next);
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  };

  const onApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (searchInput) next.set('search', searchInput);
    else next.delete('search');
    if (locationInput) next.set('location', locationInput);
    else next.delete('location');
    next.set('page', '1');
    setParams(next);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500">
            Browse open roles. {user?.role === 'CANDIDATE' ? 'Apply with a click.' : null}
          </p>
        </div>
      </div>

      <form onSubmit={onApplyFilters} className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input
          className="input"
          placeholder="Search title or description…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <input
          className="input"
          placeholder="Location"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
        />
        <select
          className="input"
          value={isOpen ?? ''}
          onChange={(e) => setParam('isOpen', e.target.value || null)}
        >
          <option value="">Any status</option>
          <option value="true">Open only</option>
          <option value="false">Closed only</option>
        </select>
        <button type="submit" className="btn-primary">Search</button>
        {user?.role === 'HR' ? (
          <label className="col-span-full flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={postedByMe}
              onChange={(e) => setParam('postedByMe', e.target.checked ? 'true' : null)}
            />
            Show only jobs I posted
          </label>
        ) : null}
      </form>

      {query.isLoading ? (
        <div className="py-12">
          <Spinner label="Loading jobs…" />
        </div>
      ) : query.isError ? (
        <ErrorBanner error={query.error} title="Could not load jobs" />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState
          title="No jobs match those filters"
          description="Try clearing search or location to see more results."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {query.data!.items.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
          <Pagination
            page={query.data!.page}
            totalPages={query.data!.totalPages}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
