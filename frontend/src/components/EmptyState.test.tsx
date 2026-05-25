import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="Nothing here" description="Try again later" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('renders the action node when provided', () => {
    render(
      <EmptyState
        title="No jobs"
        action={<button type="button">Browse jobs</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Browse jobs' })).toBeInTheDocument();
  });

  it('does not render an action region when none provided', () => {
    render(<EmptyState title="No jobs" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
