import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { MyApplicationsPage } from './pages/MyApplicationsPage';
import { HrDashboardPage } from './pages/HrDashboardPage';
import { HrJobEditPage } from './pages/HrJobEditPage';
import { HrApplicantsPage } from './pages/HrApplicantsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/jobs" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />

        <Route
          path="/my-applications"
          element={
            <ProtectedRoute roles={['CANDIDATE']}>
              <MyApplicationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr"
          element={
            <ProtectedRoute roles={['HR']}>
              <HrDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/jobs/new"
          element={
            <ProtectedRoute roles={['HR']}>
              <HrJobEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/jobs/:id/edit"
          element={
            <ProtectedRoute roles={['HR']}>
              <HrJobEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/jobs/:id/applicants"
          element={
            <ProtectedRoute roles={['HR']}>
              <HrApplicantsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
