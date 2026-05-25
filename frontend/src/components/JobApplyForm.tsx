/**
 * Apply-to-job side panel.
 *
 * Extracted from JobDetailPage so that page can stay focused on rendering
 * the job. This component owns: the cover-letter form, submission state,
 * "already applied" / "could not submit" error surfacing, and the post-
 * submit success view.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiClientError, request } from '../lib/api';
import { ErrorBanner } from './ErrorBanner';
import type { Application } from '../types/api';

const coverSchema = z.object({
  coverLetter: z
    .string()
    .trim()
    .min(20, 'At least 20 characters')
    .max(5000, 'At most 5000 characters'),
});
type CoverValues = z.infer<typeof coverSchema>;

interface Props {
  jobId: number;
  isOpen: boolean;
}

export function JobApplyForm({ jobId, isOpen }: Props) {
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);

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

  if (submitted) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-emerald-800">Application submitted</h2>
        <p className="mt-1 text-sm text-slate-600">
          We&apos;ve sent your application to the hiring team. Track its status from{' '}
          <Link to="/my-applications" className="font-medium text-brand-700 hover:underline">
            My applications
          </Link>
          .
        </p>
      </div>
    );
  }

  const disabled = !isOpen || applyMutation.isPending;

  return (
    <form onSubmit={handleSubmit((v) => applyMutation.mutate(v))} noValidate>
      <h2 className="text-sm font-semibold text-slate-900">Apply for this role</h2>
      <p className="mt-1 text-xs text-slate-500">
        Tell the team why you&apos;re a good fit. 20–5000 characters.
      </p>
      <textarea
        rows={6}
        className="input mt-3"
        placeholder="Your cover letter…"
        disabled={disabled}
        aria-label="Cover letter"
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
        disabled={!isOpen || isSubmitting || applyMutation.isPending}
      >
        {!isOpen
          ? 'Job is closed'
          : applyMutation.isPending
            ? 'Submitting…'
            : 'Submit application'}
      </button>
    </form>
  );
}
