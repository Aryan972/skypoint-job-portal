import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto mt-20 max-w-md text-center">
      <p className="text-6xl font-semibold text-slate-300">404</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link to="/jobs" className="btn-primary mt-6 inline-flex">
        Browse jobs
      </Link>
    </div>
  );
}
