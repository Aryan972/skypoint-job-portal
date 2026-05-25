import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiClientError, request } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatDate, formatSalary } from '../lib/format';
import type { Application, Job } from '../types/api';

const coverSchema = z.object({
  coverLetter: z
    .string()
    .trim()
    .min(20, 'At least 20 characters')
    .max(5000, 'At most 5000 characters'),
});
type CoverValues = z.infer<typeof coverSchema>;

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number.parseInt(id ?? '', 10);
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);

  const jobQuery = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => request<{ job: Job }>(`/jobs/${jobId}`),
    enabled: Number.isFinite(jobId) && jobId > 0,
  });

  const applyMutation = useMutation({
    mutationFn: (values: CoverValues) =>
      request<{ application: Application }>(`/jobs/${jobId}/applications`, {
        method: 'POST',
        body: values,
      }),
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ['applications', 'me'] });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CoverValues>({ resolver: zodResolver(coverSchema) });

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
          {salary ? (
            <span className="text-sm text-slate-700">{salary}</span>
          ) : null}
        </div>

        <div className="card mt-6 whitespace-pre-line p-6 text-sm text-slate-700">
          {job.description}
        </div>
      </div>

      <aside className="lg:col-span-1">
        <div className="card sticky top-6 p-5">
          {user?.role === 'HR' && user.id === job.postedById ? (
            <>
              <h2 className="text-sm font-semibold text-slate-900">Your job</h2>
              <p className="mt-1 text-sm text-slate-500">
                You posted this. View applicants from the HR dashboard.
              </p>
              <button
                type="button"
                className="btn-primary mt-3 w-full"
                onClick={() => navigate(`/hr/jobs/${job.id}/applicants`)}
              >
                View applicants
              </button>
              <button
                type="button"
                className="btn-secondary mt-2 w-full"
                onClick={() => navigate(`/hr/jobs/${job.id}/edit`)}
              >
                Edit job
              </button>
            </>
          ) : user?.role === 'CANDIDATE' ? (
            submitted ? (
              <div>
                <h2 className="text-sm font-semibold text-emerald-800">
                  Application submitted
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  We've sent your application to the hiring team. Track its status from{' '}
                  <Link to="/my-applications" className="font-medium text-brand-700 hover:underline">
                    My applications
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit((v) => applyMutation.mutate(v))} noValidate>
                <h2 className="text-sm font-semibold text-slate-900">Apply for this role</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Tell the team why you're a good fit. {20}–{5000} characters.
                </p>
                <textarea
                  rows={6}
                  className="input mt-3"
                  placeholder="Your cover letter…"
                  disabled={!job.isOpen || applyMutation.isPending}
                  {...register('coverLetter')}
                />
                {errors.coverLetter ? (
                  <p className="mt-1 text-xs text-red-600">{errors.coverLetter.message}</p>
                ) : null}
                {applyMutation.error ? (
                  <div className="mt-2">
                    <ErrorBanner
                      error={applyMutation.error}
                      title={
                        applyMutation.error instanceof ApiClientError &&
                        applyMutation.error.status === 409
                          ? "You've already applied"
                          : 'Could not submit application'
                      }
                    />
                  </div>
                ) : null}
                <button
                  type="submit"
                  className="btn-primary mt-3 w-full"
                  disabled={!job.isOpen || isSubmitting || applyMutation.isPending}
                >
                  {!job.isOpen
                    ? 'Job is closed'
                    : applyMutation.isPending
                      ? 'Submitting…'
                      : 'Submit application'}
                </button>
              </form>
            )
          ) : user?.role === 'HR' ? (
            <p className="text-sm text-slate-500">
              HR users can&apos;t apply to jobs. Switch to a candidate account to apply.
            </p>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-slate-900">Interested?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Log in or create an account to apply.
              </p>
              <Link to="/login" className="btn-primary mt-3 inline-flex w-full justify-center">
                Log in to apply
              </Link>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
