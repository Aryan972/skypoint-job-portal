import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('disables "Previous" on the first page', () => {
    render(<Pagination page={1} totalPages={5} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  it('disables "Next" on the last page', () => {
    render(<Pagination page={5} totalPages={5} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
  });

  it('calls onChange with the previous page when "Previous" clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange with the next page when "Next" clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
