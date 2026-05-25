import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';
import type { ApplicationStatus } from '../types/api';

describe('StatusBadge', () => {
  const cases: { status: ApplicationStatus; label: string }[] = [
    { status: 'SUBMITTED', label: 'Submitted' },
    { status: 'REVIEWED', label: 'Reviewed' },
    { status: 'SHORTLISTED', label: 'Shortlisted' },
    { status: 'REJECTED', label: 'Rejected' },
    { status: 'HIRED', label: 'Hired' },
  ];

  for (const { status, label } of cases) {
    it(`renders the ${status} label`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  }
});
