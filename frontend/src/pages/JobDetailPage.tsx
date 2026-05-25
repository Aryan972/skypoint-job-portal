import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { request } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { JobApplyForm } from '../components/JobApplyForm';
import { formatDate, formatSalary } from '../lib/format';
import type { Job } from '../types/api';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number.parseInt(id ?? '', 10);
  const navigate = useNavigate();
  const { user } = useAuth();

  const jobQuery = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => request<{ job: Job }>(`/jobs/${jobId}`),
    enabled: Number.isFinite(jobId) && jobId > 0,
  });

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
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Link to="/jobs" className="text-sm text-brand-700 hover:underline">
          ← Back to jobs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{job.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {job.location}
          {job.postedByName ? ` • Posted by ${job.postedByName}` : ''} • {formatDate(job.createdAt)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
              job.isOpen
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-slate-100 text-slate-600 ring-slate-200'
            }`}
          >
            {job.isOpen ? 'Open' : 'Closed'}
          </span>
          {salary ? <span className="text-sm text-slate-700">{salary}</span> : null}
        </div>

        <div className="card mt-6 whitespace-pre-line p-6 text-sm text-slate-700">
          {job.description}
        </div>
      </div>

      <aside className="lg:col-span-1">
        <div className="card sticky top-6 p-5">
          {user?.role === 'HR' && user.id === job.postedById ? (
            <HrOwnerPanel jobId={job.id} onApplicants={() => navigate(`/hr/jobs/${job.id}/applicants`)} onEdit={() => navigate(`/hr/jobs/${job.id}/edit`)} />
          ) : user?.role === 'CANDIDATE' ? (
            <JobApplyForm jobId={job.id} isOpen={job.isOpen} />
          ) : user?.role === 'HR' ? (
            <p className="text-sm text-slate-500">
              HR users can&apos;t apply to jobs. Switch to a candidate account to apply.
            </p>
          ) : (
            <LoggedOutCta />
          )}
        </div>
      </aside>
    </div>
  );
}

function HrOwnerPanel({ onApplicants, onEdit }: { jobId: number; onApplicants: () => void; onEdit: () => void }) {
  return (
    <>
      <h2 className="text-sm font-semibold text-slate-900">Your job</h2>
      <p className="mt-1 text-sm text-slate-500">
        You posted this. View applicants from the HR dashboard.
      </p>
      <button type="button" className="btn-primary mt-3 w-full" onClick={onApplicants}>
        View applicants
      </button>
      <button type="button" className="btn-secondary mt-2 w-full" onClick={onEdit}>
        Edit job
      </button>
    </>
  );
}

function LoggedOutCta() {
  return (
    <>
      <h2 className="text-sm font-semibold text-slate-900">Interested?</h2>
      <p className="mt-1 text-sm text-slate-500">Log in or create an account to apply.</p>
      <Link to="/login" className="btn-primary mt-3 inline-flex w-full justify-center">
        Log in to apply
      </Link>
    </>
  );
}
