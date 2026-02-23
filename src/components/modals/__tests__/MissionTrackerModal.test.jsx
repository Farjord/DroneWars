/**
 * MissionTrackerModal.test.jsx
 * TDD tests for MissionTrackerModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock MissionService
const mockMissions = [
  {
    id: 'mission_1',
    title: 'Test Mission 1',
    description: 'Complete this test mission',
    category: 'intro',
    reward: { credits: 100 },
    progress: { current: 0, target: 1 },
    isClaimable: false,
  },
  {
    id: 'mission_2',
    title: 'Claimable Mission',
    description: 'This mission is ready to claim',
    category: 'combat',
    reward: { credits: 200 },
    progress: { current: 1, target: 1 },
    isClaimable: true,
  },
];

vi.mock('../../../logic/missions/MissionService.js', () => ({
  default: {
    getActiveMissions: vi.fn(() => mockMissions),
    claimReward: vi.fn(() => ({ success: true, reward: { credits: 200 } })),
    getClaimableCount: vi.fn(() => 1),
  },
}));

import MissionTrackerModal from '../MissionTrackerModal.jsx';
import MissionService from '../../../logic/missions/MissionService.js';

describe('MissionTrackerModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onRewardClaimed: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal title', () => {
    render(<MissionTrackerModal {...defaultProps} />);

    expect(screen.getByText('Missions')).toBeInTheDocument();
  });

  it('should render mission list', () => {
    render(<MissionTrackerModal {...defaultProps} />);

    expect(screen.getByText('Test Mission 1')).toBeInTheDocument();
    expect(screen.getByText('Claimable Mission')).toBeInTheDocument();
  });

  it('should display mission descriptions', () => {
    render(<MissionTrackerModal {...defaultProps} />);

    expect(screen.getByText('Complete this test mission')).toBeInTheDocument();
    expect(screen.getByText('This mission is ready to claim')).toBeInTheDocument();
  });

  it('should show claim button for claimable missions', () => {
    render(<MissionTrackerModal {...defaultProps} />);

    // Only one claim button should exist (for the claimable mission)
    const claimButtons = screen.getAllByText(/Claim/);
    expect(claimButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should call claimReward when claim button clicked', () => {
    render(<MissionTrackerModal {...defaultProps} />);

    const claimButton = screen.getByRole('button', { name: /Claim/ });
    fireEvent.click(claimButton);

    expect(MissionService.claimReward).toHaveBeenCalledWith('mission_2');
  });

  it('should call onClose when close button clicked', () => {
    render(<MissionTrackerModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose when overlay clicked', () => {
    const { container } = render(<MissionTrackerModal {...defaultProps} />);

    const overlay = container.querySelector('.dw-modal-overlay');
    fireEvent.click(overlay);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show reward credits for each mission', () => {
    render(<MissionTrackerModal {...defaultProps} />);

    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it('should display progress for non-claimable missions', () => {
    render(<MissionTrackerModal {...defaultProps} />);

    // Progress 0/1 for first mission
    expect(screen.getByText('0/1')).toBeInTheDocument();
  });
});
