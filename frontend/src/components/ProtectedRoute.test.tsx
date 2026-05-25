/**
 * ProtectedRoute tests.
 *
 * The component depends on useAuth(), so we wrap with AuthProvider and stub
 * the network calls AuthProvider makes on mount (it reads /auth/me when a
 * token is in storage).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { ProtectedRoute } from './ProtectedRoute';
import { tokenStorage } from '../lib/auth';

function renderWithRoute(initialPath = '/secret') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <div>Secret Area</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr-only"
            element={
              <ProtectedRoute roles={['HR']}>
                <div>HR Area</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    tokenStorage.clear();
  });

  it('redirects an unauthenticated visitor to /login', async () => {
    renderWithRoute('/secret');
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('shows the protected content when the user is authenticated', async () => {
    tokenStorage.write('test-token');
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: 1, email: 'x@y.z', fullName: 'X', role: 'CANDIDATE' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    renderWithRoute('/secret');
    expect(await screen.findByText('Secret Area')).toBeInTheDocument();
  });

  it('shows a friendly 403 message when the role does not match', async () => {
    tokenStorage.write('test-token');
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: 1, email: 'x@y.z', fullName: 'X', role: 'CANDIDATE' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    renderWithRoute('/hr-only');
    expect(await screen.findByText(/don.t have access/i)).toBeInTheDocument();
  });
});
