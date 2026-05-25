import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBanner } from './ErrorBanner';
import { ApiClientError } from '../lib/api';

describe('ErrorBanner', () => {
  it('uses the default title when none is given', () => {
    render(<ErrorBanner error={new Error('boom')} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('renders the custom title and an ApiClientError message', () => {
    const err = new ApiClientError(409, 'CONFLICT', 'You have already applied');
    render(<ErrorBanner error={err} title="Could not apply" />);
    expect(screen.getByText('Could not apply')).toBeInTheDocument();
    expect(screen.getByText('You have already applied')).toBeInTheDocument();
  });

  it('falls back to "Unknown error" for non-Error inputs', () => {
    render(<ErrorBanner error={'just a string'} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown error');
  });
});
