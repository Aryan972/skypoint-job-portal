import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { request } from '../lib/api';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/format';
import type { Application, ApplicationStatus, Job, Page } from '../types/api';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'HIRED', label: 'Hired' },
];

export function HrApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number.parseInt(id ?? '', 10);
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const status = (params.get('status') as ApplicationStatus | null) ?? undefined;
  const qc = useQueryClient();

  const jobQuery = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => request<{ job: Job }>(`/jobs/${jobId}`),
    enabled: Number.isFinite(jobId) && jobId > 0,
  });

  const applicantsQuery = useQuery({
    queryKey: ['applicants', jobId, { page, status }],
    queryFn: () =>
      request<Page<Application>>(`/jobs/${jobId}/applications`, {
        query: { page, pageSize: PAGE_SIZE, status },
      }),
    enabled: Number.isFinite(jobId) && jobId > 0,
  });

  const statusMutation = useMutation({
    mutationFn: (args: { applicationId: number; status: ApplicationStatus }) =>
      request<{ application: Application }>(`/applications/${args.applicationId}`, {
        method: 'PATCH',
        body: { status: args.status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicants', jobId] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const setStatusFilter = (value: string) => {
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

  if (!Number.isFinite(jobId) || jobId <= 0) {
    return <ErrorBanner error={new Error('Invalid job id')} />;
  }
  if (jobQuery.isLoading) {
    return (
      <div className="py-12">
        <Spinner label="Loading job…" />
      </div>
    );
  }
  if (jobQuery.isError) {
    return <ErrorBanner error={jobQuery.error} title="Could not load job" />;
  }

  const job = jobQuery.data!.job;

  return (
    <div>
      <Link to="/hr" className="text-sm text-brand-700 hover:underline">
        ← Back to dashboard
      </Link>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Applicants for {job.title}</h1>
          <p className="text-sm text-slate-500">
            {job.location} • {job.isOpen ? 'Open' : 'Closed'}
          </p>
        </div>
        <div>
          <label htmlFor="status-filter" className="label">Filter by status</label>
          <select
            id="status-filter"
            className="input mt-1"
            value={status ?? ''}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {applicantsQuery.isLoading ? (
          <div className="py-12">
            <Spinner label="Loading applicants…" />
          </div>
        ) : applicantsQuery.isError ? (
          <ErrorBanner
            error={applicantsQuery.error}
            title="Could not load applicants"
          />
        ) : applicantsQuery.data && applicantsQuery.data.items.length === 0 ? (
          <EmptyState
            title="No applicants yet"
            description="When candidates apply, they'll show up here."
          />
        ) : (
          <>
            <ul className="space-y-3">
              {applicantsQuery.data!.items.map((a) => (
                <li key={a.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {a.candidate?.fullName ?? 'Candidate'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {a.candidate?.email} • Applied {formatDate(a.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={a.status} />
                      <select
                        className="input"
                        value={a.status}
                        disabled={statusMutation.isPending}
                        onChange={(e) =>
                          statusMutation.mutate({
                            applicationId: a.id,
                            status: e.target.value as ApplicationStatus,
                          })
                        }
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                    {a.coverLetter}
                  </p>
                </li>
              ))}
            </ul>
            {statusMutation.error ? (
              <div className="mt-3">
                <ErrorBanner
                  error={statusMutation.error}
                  title="Could not update status"
                />
              </div>
            ) : null}
            <Pagination
              page={applicantsQuery.data!.page}
              totalPages={applicantsQuery.data!.totalPages}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
