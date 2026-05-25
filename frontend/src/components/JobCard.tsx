import { Link } from 'react-router-dom';
import type { Job } from '../types/api';
import { formatDate, formatSalary } from '../lib/format';

export function JobCard({ job, showApplicants = false }: { job: Job; showApplicants?: boolean }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  return (
    <article className="card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={`/jobs/${job.id}`}
            className="text-base font-semibold text-slate-900 hover:text-brand-700"
          >
            {job.title}
          </Link>
          <p className="mt-0.5 text-sm text-slate-500">
            {job.location}
            {job.postedByName ? ` • ${job.postedByName}` : ''}
            {' • '}Posted {formatDate(job.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
              job.isOpen
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-slate-100 text-slate-600 ring-slate-200'
            }`}
          >
            {job.isOpen ? 'Open' : 'Closed'}
          </span>
          {showApplicants && job.applicationCount !== undefined ? (
            <span className="text-xs text-slate-500">
              {job.applicationCount} applicant{job.applicationCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-slate-600">{job.description}</p>
      {salary ? (
        <p className="mt-3 text-sm font-medium text-slate-700">{salary}</p>
      ) : null}
    </article>
  );
}
