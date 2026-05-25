interface Props {
  page: number;
  totalPages: number;
  onChange(page: number): void;
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  const prev = () => onChange(Math.max(1, page - 1));
  const next = () => onChange(Math.min(totalPages, page + 1));
  return (
    <nav
      className="mt-6 flex items-center justify-between"
      aria-label="Pagination"
    >
      <button
        type="button"
        className="btn-secondary"
        onClick={prev}
        disabled={page <= 1}
      >
        Previous
      </button>
      <p className="text-sm text-slate-600">
        Page <span className="font-medium">{page}</span> of{' '}
        <span className="font-medium">{totalPages}</span>
      </p>
      <button
        type="button"
        className="btn-secondary"
        onClick={next}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </nav>
  );
}
