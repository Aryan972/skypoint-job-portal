import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          Job Portal
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              `rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`
            }
          >
            Jobs
          </NavLink>
          {user?.role === 'CANDIDATE' ? (
            <NavLink
              to="/my-applications"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              My applications
            </NavLink>
          ) : null}
          {user?.role === 'HR' ? (
            <NavLink
              to="/hr"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              HR dashboard
            </NavLink>
          ) : null}

          <div className="mx-2 h-5 w-px bg-slate-200" aria-hidden="true" />

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.fullName}{' '}
                <span className="text-xs text-slate-400">({user.role})</span>
              </span>
              <button type="button" className="btn-secondary" onClick={onLogout}>
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
