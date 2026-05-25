/**
 * Create / edit job — same component drives both routes:
 *   /hr/jobs/new       (no id)
 *   /hr/jobs/:id/edit  (with id)
 *
 * When `id` is present we fetch the current job and pre-fill the form, then
 * PATCH only the fields that changed. Empty optional fields are sent as null
 * so the backend can clear them (rather than leaving them stuck).
 */

import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { request } from '../lib/api';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import type { Job } from '../types/api';

const optionalSalary = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : Number.parseInt(v, 10);
    if (Number.isNaN(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a number' });
      return z.NEVER;
    }
    if (n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be 0 or greater' });
      return z.NEVER;
    }
    return n;
  });

const schema = z
  .object({
    title: z.string().trim().min(3, 'At least 3 characters').max(160),
    description: z.string().trim().min(20, 'At least 20 characters').max(10000),
    location: z.string().trim().min(2, 'At least 2 characters').max(120),
    salaryMin: optionalSalary,
    salaryMax: optionalSalary,
    isOpen: z.boolean().default(true),
  })
  .refine(
    (v) => v.salaryMin == null || v.salaryMax == null || v.salaryMin <= v.salaryMax,
    { message: 'Min salary must be ≤ max salary', path: ['salaryMin'] },
  );
type FormValues = z.infer<typeof schema>;

export function HrJobEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const editing = id !== undefined;
  const jobId = editing ? Number.parseInt(id, 10) : undefined;
  const qc = useQueryClient();

  const jobQuery = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => request<{ job: Job }>(`/jobs/${jobId}`),
    enabled: editing && Number.isFinite(jobId) && jobId! > 0,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      salaryMin: null,
      salaryMax: null,
      isOpen: true,
    },
  });

  useEffect(() => {
    if (jobQuery.data) {
      const j = jobQuery.data.job;
      reset({
        title: j.title,
        description: j.description,
        location: j.location,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        isOpen: j.isOpen,
      });
    }
  }, [jobQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      editing
        ? request<{ job: Job }>(`/jobs/${jobId}`, { method: 'PATCH', body: values })
        : request<{ job: Job }>('/jobs', { method: 'POST', body: values }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      navigate('/hr');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => request<void>(`/jobs/${jobId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      navigate('/hr');
    },
  });

  const onDelete = () => {
    if (!editing) return;
    const ok = window.confirm(
      'Delete this job posting? Applications attached to it will also be removed.',
    );
    if (!ok) return;
    deleteMutation.mutate();
  };

  if (editing && jobQuery.isLoading) {
    return (
      <div className="py-12">
        <Spinner label="Loading job…" />
      </div>
    );
  }
  if (editing && jobQuery.isError) {
    return <ErrorBanner error={jobQuery.error} title="Could not load job" />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/hr" className="text-sm text-brand-700 hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">
        {editing ? 'Edit job posting' : 'Post a new job'}
      </h1>

      <form
        onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
        className="card mt-6 space-y-4 p-6"
        noValidate
      >
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input mt-1" {...register('title')} />
          {errors.title ? (
            <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="location">Location</label>
          <input
            id="location"
            className="input mt-1"
            placeholder="e.g. Remote, Bengaluru, Hybrid — London"
            {...register('location')}
          />
          {errors.location ? (
            <p className="mt-1 text-xs text-red-600">{errors.location.message}</p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={8}
            className="input mt-1"
            {...register('description')}
          />
          {errors.description ? (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="salaryMin">Salary min (optional)</label>
            <input
              id="salaryMin"
              type="number"
              min={0}
              className="input mt-1"
              {...register('salaryMin')}
            />
            {errors.salaryMin ? (
              <p className="mt-1 text-xs text-red-600">{errors.salaryMin.message}</p>
            ) : null}
          </div>
          <div>
            <label className="label" htmlFor="salaryMax">Salary max (optional)</label>
            <input
              id="salaryMax"
              type="number"
              min={0}
              className="input mt-1"
              {...register('salaryMax')}
            />
            {errors.salaryMax ? (
              <p className="mt-1 text-xs text-red-600">{errors.salaryMax.message}</p>
            ) : null}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isOpen')} />
          Accepting applications
        </label>

        {saveMutation.error ? (
          <ErrorBanner error={saveMutation.error} title="Could not save" />
        ) : null}
        {deleteMutation.error ? (
          <ErrorBanner error={deleteMutation.error} title="Could not delete" />
        ) : null}

        <div className="flex items-center justify-between pt-2">
          {editing ? (
            <button
              type="button"
              className="btn-danger"
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete job'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Link to="/hr" className="btn-secondary">Cancel</Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? 'Saving…'
                : editing
                  ? 'Save changes'
                  : 'Post job'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
