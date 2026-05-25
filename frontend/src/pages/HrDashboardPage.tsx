import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { request } from '../lib/api';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { formatDate, formatSalary } from '../lib/format';
import type { Job, Page } from '../types/api';

const PAGE_SIZE = 10;

export function HrDashboardPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);

  const query = useQuery({
    queryKey: ['jobs', 'mine', { page }],
    queryFn: () =>
      request<Page<Job>>('/jobs', {
        query: { page, pageSize: PAGE_SIZE, postedByMe: 'true' },
      }),
  });

  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My job postings</h1>
          <p className="text-sm text-slate-500">
            Manage the jobs you&apos;ve posted and review applicants.
          </p>
        </div>
        <Link to="/hr/jobs/new" className="btn-primary">
          + Post a new job
        </Link>
      </div>

      {query.isLoading ? (
        <div className="py-12">
          <Spinner label="Loading…" />
        </div>
      ) : query.isError ? (
        <ErrorBanner error={query.error} title="Could not load your postings" />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState
          title="No postings yet"
          description="Post your first role to start receiving applications."
          action={
            <Link to="/hr/jobs/new" className="btn-primary">
              Post a job
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Applicants</th>
                  <th className="px-4 py-3">Posted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {query.data!.items.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{job.title}</td>
                    <td className="px-4 py-3 text-slate-600">{job.location}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatSalary(job.salaryMin, job.salaryMax) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          job.isOpen
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-slate-200'
                        }`}
                      >
                        {job.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {job.applicationCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/hr/jobs/${job.id}/applicants`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        Applicants
                      </Link>
                      <span className="px-2 text-slate-300">·</span>
                      <Link
                        to={`/hr/jobs/${job.id}/edit`}
                        className="text-sm font-medium text-slate-700 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
