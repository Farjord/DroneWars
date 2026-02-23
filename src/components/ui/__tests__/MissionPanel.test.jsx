/**
 * MissionPanel.test.jsx
 * TDD tests for MissionPanel component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MissionPanel from '../MissionPanel.jsx';

describe('MissionPanel', () => {
  const defaultProps = {
    activeCount: 0,
    claimableCount: 0,
    onClick: vi.fn(),
  };

  it('should render MISSIONS label', () => {
    render(<MissionPanel {...defaultProps} />);

    expect(screen.getByText('MISSIONS')).toBeInTheDocument();
  });

  it('should display active count', () => {
    render(<MissionPanel {...defaultProps} activeCount={5} />);

    expect(screen.getByText('5 Active')).toBeInTheDocument();
  });

  it('should display claimable count when > 0', () => {
    render(<MissionPanel {...defaultProps} claimableCount={3} />);

    // Count appears in both inline indicator and notification badge
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThanOrEqual(1);
  });

  it('should show notification badge when claimable > 0', () => {
    const { container } = render(<MissionPanel {...defaultProps} claimableCount={2} />);

    const badge = container.querySelector('.dw-notification-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('2');
  });

  it('should not show notification badge when claimable is 0', () => {
    const { container } = render(<MissionPanel {...defaultProps} claimableCount={0} />);

    const badge = container.querySelector('.dw-notification-badge');
    expect(badge).not.toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<MissionPanel {...defaultProps} onClick={handleClick} />);

    const panel = screen.getByText('MISSIONS').closest('div');
    fireEvent.click(panel);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should have cursor pointer style', () => {
    const { container } = render(<MissionPanel {...defaultProps} />);

    const panel = container.querySelector('.dw-stat-box--missions');
    expect(panel).toHaveStyle({ cursor: 'pointer' });
  });

  it('should have has-rewards class when claimable > 0', () => {
    const { container } = render(<MissionPanel {...defaultProps} claimableCount={1} />);

    const panel = container.querySelector('.dw-stat-box--missions');
    expect(panel).toHaveClass('has-rewards');
  });

  it('should not have has-rewards class when claimable is 0', () => {
    const { container } = render(<MissionPanel {...defaultProps} claimableCount={0} />);

    const panel = container.querySelector('.dw-stat-box--missions');
    expect(panel).not.toHaveClass('has-rewards');
  });

  it('should show claim tooltip when claimable > 0', () => {
    render(<MissionPanel {...defaultProps} claimableCount={2} />);

    const panel = screen.getByText('MISSIONS').closest('div');
    expect(panel).toHaveAttribute('title', 'Click to claim 2 reward(s)!');
  });

  it('should show view tooltip when no claimable', () => {
    render(<MissionPanel {...defaultProps} claimableCount={0} />);

    const panel = screen.getByText('MISSIONS').closest('div');
    expect(panel).toHaveAttribute('title', 'Click to view missions');
  });
});
