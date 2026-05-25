import type { ApplicationStatus } from '../types/api';

const STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700 ring-slate-200',
  REVIEWED: 'bg-blue-100 text-blue-800 ring-blue-200',
  SHORTLISTED: 'bg-amber-100 text-amber-800 ring-amber-200',
  REJECTED: 'bg-red-100 text-red-800 ring-red-200',
  HIRED: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
};

const LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  HIRED: 'Hired',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
