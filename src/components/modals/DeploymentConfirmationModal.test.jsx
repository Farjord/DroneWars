/**
 * DeploymentConfirmationModal.test.jsx
 * TDD tests for correct icon usage in deploy drone modal
 *
 * Requirements:
 * - Use Plus icon for Deployment Cost (matches GameHeader)
 * - Use Power icon for Energy Cost (matches GameHeader)
 * - Icons should be white
 * - Icons should be larger (size 28)
 * - Icons should be vertically centered
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock lucide-react icons to capture props
vi.mock('lucide-react', () => ({
  Rocket: (props) => <svg data-testid="rocket-icon" {...props} />,
  Plus: (props) => <svg data-testid="plus-icon" {...props} />,
  Power: (props) => <svg data-testid="power-icon" {...props} />,
  // Include old icons to verify they're NOT used
  Target: (props) => <svg data-testid="target-icon" {...props} />,
  Zap: (props) => <svg data-testid="zap-icon" {...props} />
}));

import DeploymentConfirmationModal from './DeploymentConfirmationModal.jsx';

describe('DeploymentConfirmationModal - Icon Tests', () => {
  const defaultProps = {
    deploymentConfirmation: {
      budgetCost: 3,
      energyCost: 2
    },
    show: true,
    onCancel: vi.fn(),
    onConfirm: vi.fn()
  };

  describe('Correct icon usage (match GameHeader)', () => {
    it('should use Plus icon for Deployment Cost', () => {
      render(<DeploymentConfirmationModal {...defaultProps} />);

      // Plus icon should be present
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
      // Target icon should NOT be used
      expect(screen.queryByTestId('target-icon')).not.toBeInTheDocument();
    });

    it('should use Power icon for Energy Cost', () => {
      render(<DeploymentConfirmationModal {...defaultProps} />);

      // Power icon should be present
      expect(screen.getByTestId('power-icon')).toBeInTheDocument();
      // Zap icon should NOT be used
      expect(screen.queryByTestId('zap-icon')).not.toBeInTheDocument();
    });
  });

  describe('Icon styling', () => {
    it('should render Plus icon with white color', () => {
      render(<DeploymentConfirmationModal {...defaultProps} />);

      const plusIcon = screen.getByTestId('plus-icon');
      // toHaveStyle converts 'white' to 'rgb(255, 255, 255)'
      expect(plusIcon).toHaveStyle({ color: 'rgb(255, 255, 255)' });
    });

    it('should render Power icon with white color', () => {
      render(<DeploymentConfirmationModal {...defaultProps} />);

      const powerIcon = screen.getByTestId('power-icon');
      // toHaveStyle converts 'white' to 'rgb(255, 255, 255)'
      expect(powerIcon).toHaveStyle({ color: 'rgb(255, 255, 255)' });
    });

    it('should render icons at size 28', () => {
      render(<DeploymentConfirmationModal {...defaultProps} />);

      const plusIcon = screen.getByTestId('plus-icon');
      const powerIcon = screen.getByTestId('power-icon');

      expect(plusIcon).toHaveAttribute('size', '28');
      expect(powerIcon).toHaveAttribute('size', '28');
    });
  });

  describe('Modal content', () => {
    it('should display correct deployment cost value', () => {
      render(<DeploymentConfirmationModal {...defaultProps} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display correct energy cost value', () => {
      render(<DeploymentConfirmationModal {...defaultProps} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      render(<DeploymentConfirmationModal {...defaultProps} show={false} />);
      expect(screen.queryByText('Deploy Drone')).not.toBeInTheDocument();
    });
  });
});
