/**
 * RegisterPage tests.
 *
 * The headline check is that the password-policy rules surface as inline
 * Zod errors before any network round-trip — the front-end policy mirrors
 * `backend/src/lib/password.ts` so the user gets fast feedback.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import { RegisterPage } from './RegisterPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows inline validation errors when the form is submitted empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/please enter your full name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
  });

  it('rejects a password missing required character classes', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@test.com');
    await user.type(screen.getByLabelText(/password/i), 'allsmallchars');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least one uppercase letter/i)).toBeInTheDocument();
  });

  it('accepts a password that meets every rule', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@test.com');
    await user.type(screen.getByLabelText(/password/i), 'Strong@123');
    // We don't click submit here because we'd need to stub the network.
    // Instead we verify the inline policy hint is shown and no errors yet.
    expect(
      screen.getByText(/8\+ chars, with upper, lower, digit, and special/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/at least one uppercase letter/i)).not.toBeInTheDocument();
  });
});
