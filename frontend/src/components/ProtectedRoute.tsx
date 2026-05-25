import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './Spinner';
import type { UserRole } from '../types/api';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

/**
 * Gate a route by login state and (optionally) role.
 *
 * - Unauthenticated visitors are bounced to /login with the original
 *   path in `state.from` so we can send them back after login.
 * - Logged-in users with the wrong role get a 403-ish friendly screen
 *   rather than a redirect — silently bouncing would be confusing.
 */
export function ProtectedRoute({ children, roles }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
        <h2 className="text-base font-semibold text-amber-900">
          You don&apos;t have access to this page
        </h2>
        <p className="mt-1 text-sm text-amber-800">
          This area is reserved for {roles.join(' / ').toLowerCase()} users.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
