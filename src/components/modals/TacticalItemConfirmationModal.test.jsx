/**
 * TacticalItemConfirmationModal.test.jsx
 * TDD tests for tactical item usage confirmation modal
 *
 * Requirements:
 * - Show confirmation before using tactical items (Signal Dampener)
 * - Display item name and effect
 * - Show current detection and predicted detection after use
 * - Cancel/Confirm buttons work correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ShieldMinus: (props) => <svg data-testid="shield-minus-icon" {...props} />
}));

import TacticalItemConfirmationModal from './TacticalItemConfirmationModal.jsx';

describe('TacticalItemConfirmationModal', () => {
  const mockItem = {
    id: 'ITEM_THREAT_REDUCE',
    name: 'Signal Dampener',
    image: '/DroneWars/Items/threat.png',
    effectValueMin: 5,
    effectValueMax: 15,
    effectDescription: 'Reduce detection by configured amount.'
  };

  const defaultProps = {
    show: true,
    item: mockItem,
    currentDetection: 45,
    onCancel: vi.fn(),
    onConfirm: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should render nothing when show is false', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} show={false} />);
      expect(screen.queryByText('Signal Dampener')).not.toBeInTheDocument();
    });

    it('should render modal when show is true', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);
      expect(screen.getByText('Signal Dampener')).toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('should display item name', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);
      expect(screen.getByText('Signal Dampener')).toBeInTheDocument();
    });

    it('should display current detection value', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should display predicted detection range after use', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);
      // 45 - 15 = 30 (best case), 45 - 5 = 40 (worst case)
      expect(screen.getByText('30-40%')).toBeInTheDocument();
    });

    it('should clamp predicted detection to 0 when max reduction exceeds current', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} currentDetection={10} />);
      // Best case: 10 - 15 = -5, clamped to 0
      // Worst case: 10 - 5 = 5
      expect(screen.getByText('0-5%')).toBeInTheDocument();
    });

    it('should display effect range in description', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);
      expect(screen.getByText(/reduce detection by 5-15%/i)).toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('should call onCancel when Cancel button is clicked', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Confirm button is clicked', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: /confirm|use/i });
      fireEvent.click(confirmButton);

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when overlay is clicked', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);

      const overlay = screen.getByTestId('modal-overlay');
      fireEvent.click(overlay);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Structure', () => {
    it('should have modal overlay', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);
      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument();
    });

    it('should have Cancel and Confirm buttons', () => {
      render(<TacticalItemConfirmationModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm|use/i })).toBeInTheDocument();
    });
  });
});
