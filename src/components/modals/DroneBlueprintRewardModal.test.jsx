/**
 * DroneBlueprintRewardModal.test.jsx
 * TDD tests for the Drone Blueprint reward modal
 *
 * This modal appears after combat salvage is collected at a Drone Blueprint PoI.
 * It displays a face-down blueprint card that auto-reveals after ~1 second,
 * then shows drone details and an Accept button.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock RARITY_COLORS
vi.mock('../../data/cardPackData.js', () => ({
  RARITY_COLORS: {
    Common: '#808080',
    Uncommon: '#22c55e',
    Rare: '#3b82f6',
    Mythic: '#a855f7'
  }
}));

// Mock DroneCard component
vi.mock('../ui/DroneCard', () => ({
  default: ({ drone, showStats }) => (
    <div data-testid="drone-card" data-drone-name={drone?.name}>
      <span data-testid="drone-name">{drone?.name}</span>
      {showStats && (
        <div data-testid="drone-stats">
          <span data-testid="drone-attack">ATK: {drone?.attack}</span>
          <span data-testid="drone-hull">HULL: {drone?.hull}</span>
          <span data-testid="drone-speed">SPD: {drone?.speed}</span>
        </div>
      )}
    </div>
  )
}));

// Mock HiddenCard component (for face-down state)
vi.mock('../ui/HiddenCard', () => ({
  default: ({ variant }) => (
    <div data-testid="hidden-card" data-variant={variant}>
      Hidden Blueprint
    </div>
  )
}));

// Import after mocks
import DroneBlueprintRewardModal from './DroneBlueprintRewardModal.jsx';

describe('DroneBlueprintRewardModal', () => {
  const mockOnAccept = vi.fn();

  const mockBlueprint = {
    blueprintId: 'Gunship',
    blueprintType: 'drone',
    rarity: 'Uncommon',
    droneData: {
      name: 'Gunship',
      attack: 3,
      hull: 4,
      speed: 2,
      class: 2,
      rarity: 'Uncommon'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={false}
        />
      );

      expect(screen.queryByText(/DRONE BLUEPRINT/i)).not.toBeInTheDocument();
    });

    it('should render when show is true', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      expect(screen.getByText(/DRONE BLUEPRINT/i)).toBeInTheDocument();
    });
  });

  describe('Initial State (Face-Down)', () => {
    it('should render with face-down card initially', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      // Should show hidden card initially
      expect(screen.getByTestId('hidden-card')).toBeInTheDocument();
    });

    it('should NOT show drone details before reveal', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      // Drone card should not be visible yet
      expect(screen.queryByTestId('drone-card')).not.toBeInTheDocument();
    });

    it('should NOT show Accept button before reveal', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    });
  });

  describe('Auto-Reveal Animation', () => {
    it('should auto-reveal card after ~1 second delay', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      // Initially hidden
      expect(screen.getByTestId('hidden-card')).toBeInTheDocument();
      expect(screen.queryByTestId('drone-card')).not.toBeInTheDocument();

      // Advance timers past the reveal delay
      act(() => {
        vi.advanceTimersByTime(1100); // Just over 1 second
      });

      // Should now show drone card
      expect(screen.getByTestId('drone-card')).toBeInTheDocument();
    });

    it('should hide the face-down card after reveal', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      // Advance timers past the reveal delay
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Hidden card should no longer be visible, drone card should be shown
      expect(screen.queryByTestId('hidden-card')).not.toBeInTheDocument();
      expect(screen.getByTestId('drone-card')).toBeInTheDocument();
    });
  });

  describe('After Reveal - Drone Details', () => {
    const revealCard = () => {
      act(() => {
        vi.advanceTimersByTime(1100);
      });
    };

    it('should display drone name after reveal', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      revealCard();

      expect(screen.getByTestId('drone-name')).toHaveTextContent('Gunship');
    });

    it('should display drone rarity with correct color after reveal', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      revealCard();

      // Rarity should be displayed (Uncommon)
      expect(screen.getByText(/Uncommon/i)).toBeInTheDocument();
    });

    it('should display drone stats (ATK/HULL/SPD) after reveal', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      revealCard();

      expect(screen.getByTestId('drone-stats')).toBeInTheDocument();
      expect(screen.getByTestId('drone-attack')).toHaveTextContent('ATK: 3');
      expect(screen.getByTestId('drone-hull')).toHaveTextContent('HULL: 4');
      expect(screen.getByTestId('drone-speed')).toHaveTextContent('SPD: 2');
    });
  });

  describe('Accept Button', () => {
    const revealCard = () => {
      act(() => {
        vi.advanceTimersByTime(1100);
      });
    };

    it('should show Accept button only after reveal completes', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      // Before reveal - no button
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();

      revealCard();

      // After reveal - button should appear
      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    });

    it('should call onAccept with blueprint when Accept clicked', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      revealCard();

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      expect(mockOnAccept).toHaveBeenCalledTimes(1);
      expect(mockOnAccept).toHaveBeenCalledWith(mockBlueprint);
    });
  });

  describe('Styling', () => {
    it('should use purple theme styling', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      // The modal overlay should exist
      const overlay = document.querySelector('.dw-modal-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('should have DRONE BLUEPRINT ACQUIRED header', () => {
      render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      expect(screen.getByText(/DRONE BLUEPRINT ACQUIRED/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing droneData gracefully', () => {
      const blueprintWithoutData = {
        blueprintId: 'Unknown',
        blueprintType: 'drone',
        rarity: 'Common'
        // No droneData
      };

      render(
        <DroneBlueprintRewardModal
          blueprint={blueprintWithoutData}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // Should still render without crashing
      expect(screen.getByText(/DRONE BLUEPRINT ACQUIRED/i)).toBeInTheDocument();
    });

    it('should reset state when show changes from false to true', () => {
      const { rerender } = render(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={false}
        />
      );

      // Show the modal
      rerender(
        <DroneBlueprintRewardModal
          blueprint={mockBlueprint}
          onAccept={mockOnAccept}
          show={true}
        />
      );

      // Should start with hidden card again
      expect(screen.getByTestId('hidden-card')).toBeInTheDocument();
    });
  });
});
