import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobCard } from './JobCard';
import type { Job } from '../types/api';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    title: 'Senior Engineer',
    description: 'Build amazing things with a great team.',
    location: 'Remote',
    salaryMin: 100000,
    salaryMax: 150000,
    isOpen: true,
    postedById: 42,
    postedByName: 'Alice',
    createdAt: '2026-05-25T10:00:00.000Z',
    updatedAt: '2026-05-25T10:00:00.000Z',
    applicationCount: 3,
    ...overrides,
  };
}

function renderJobCard(job: Job, showApplicants = false) {
  return render(
    <MemoryRouter>
      <JobCard job={job} showApplicants={showApplicants} />
    </MemoryRouter>,
  );
}

describe('JobCard', () => {
  it('links the title to the job detail page', () => {
    renderJobCard(makeJob());
    const link = screen.getByRole('link', { name: 'Senior Engineer' });
    expect(link).toHaveAttribute('href', '/jobs/1');
  });

  it('renders the open badge when the job is open', () => {
    renderJobCard(makeJob({ isOpen: true }));
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders the closed badge when the job is closed', () => {
    renderJobCard(makeJob({ isOpen: false }));
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('renders a salary range when both min and max are set', () => {
    renderJobCard(makeJob({ salaryMin: 50000, salaryMax: 80000 }));
    expect(screen.getByText(/50,000\s*–\s*80,000/)).toBeInTheDocument();
  });

  it('omits the salary line when both min and max are null', () => {
    renderJobCard(makeJob({ salaryMin: null, salaryMax: null }));
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });

  it('shows applicant count only when showApplicants is true', () => {
    const { rerender } = renderJobCard(makeJob({ applicationCount: 3 }), false);
    expect(screen.queryByText(/3 applicants/)).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <JobCard job={makeJob({ applicationCount: 3 })} showApplicants />
      </MemoryRouter>,
    );
    expect(screen.getByText('3 applicants')).toBeInTheDocument();
  });
});
