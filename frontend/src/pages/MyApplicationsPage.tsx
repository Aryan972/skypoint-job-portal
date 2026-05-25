import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { request } from '../lib/api';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/format';
import type { Application, ApplicationStatus, Page } from '../types/api';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'HIRED', label: 'Hired' },
];

export function MyApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const status = (params.get('status') as ApplicationStatus | null) ?? undefined;

  const query = useQuery({
    queryKey: ['applications', 'me', { page, status }],
    queryFn: () =>
      request<Page<Application>>('/applications/me', {
        query: { page, pageSize: PAGE_SIZE, status },
      }),
  });

  const setStatus = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('status', value);
    else next.delete('status');
    next.set('page', '1');
    setParams(next);
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My applications</h1>
          <p className="text-sm text-slate-500">Track every job you&apos;ve applied to.</p>
        </div>
        <div>
          <label htmlFor="status" className="label">Filter by status</label>
          <select
            id="status"
            className="input mt-1"
            value={status ?? ''}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="py-12">
          <Spinner label="Loading…" />
        </div>
      ) : query.isError ? (
        <ErrorBanner error={query.error} title="Could not load applications" />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Find a role you like and apply — your applications will appear here."
          action={
            <Link to="/jobs" className="btn-primary">
              Browse jobs
            </Link>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {query.data!.items.map((a) => (
              <li key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {a.job ? (
                      <Link
                        to={`/jobs/${a.job.id}`}
                        className="text-base font-semibold text-slate-900 hover:text-brand-700"
                      >
                        {a.job.title}
                      </Link>
                    ) : (
                      <p className="text-base font-semibold text-slate-900">Job removed</p>
                    )}
                    <p className="text-sm text-slate-500">
                      {a.job?.location} • Applied {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{a.coverLetter}</p>
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
