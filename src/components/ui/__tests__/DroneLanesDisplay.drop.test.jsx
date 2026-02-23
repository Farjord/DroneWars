// ========================================
// DRONE LANES DISPLAY DROP DETECTION TESTS
// ========================================
// TDD tests for drag-and-drop deployment to lanes

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DroneLanesDisplay from '../DroneLanesDisplay.jsx';

// Mock dependencies
vi.mock('../DroneToken.jsx', () => ({
  default: ({ drone }) => <div data-testid={`drone-token-${drone.id}`}>{drone.name}</div>
}));

vi.mock('../../../hooks/useGameData.js', () => ({
  useGameData: () => ({
    getEffectiveStats: vi.fn()
  })
}));

describe('DroneLanesDisplay drag-and-drop', () => {
  const mockDroneCard = {
    name: 'Dart',
    class: 2,
    attack: 1,
    speed: 3
  };

  const defaultProps = {
    player: {
      dronesOnBoard: {
        lane1: [],
        lane2: [],
        lane3: []
      }
    },
    isPlayer: true,
    onLaneClick: vi.fn(),
    getLocalPlayerId: () => 'player1',
    getOpponentPlayerId: () => 'player2',
    abilityMode: null,
    validAbilityTargets: [],
    selectedCard: null,
    validCardTargets: [],
    multiSelectState: null,
    turnPhase: 'deployment',
    localPlayerState: { energy: 5 },
    opponentPlayerState: { energy: 5 },
    localPlacedSections: [],
    opponentPlacedSections: [],
    gameEngine: {},
    getPlacedSectionsForEngine: vi.fn(),
    handleTokenClick: vi.fn(),
    handleAbilityIconClick: vi.fn(),
    selectedDrone: null,
    recentlyHitDrones: [],
    potentialInterceptors: [],
    potentialGuardians: [],
    droneRefs: { current: {} },
    mandatoryAction: null,
    setHoveredTarget: vi.fn(),
    interceptedBadge: null
  };

  describe('drop detection', () => {
    it('should call handleCardDragEnd with lane ID on mouseUp when draggedCard is set', () => {
      const mockHandleCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedCard={mockDroneCard}
          handleCardDragEnd={mockHandleCardDragEnd}
        />
      );

      // Find center lane (lane2) and trigger mouseUp
      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );
      expect(lanes.length).toBe(3);

      // Trigger mouseUp on center lane (index 1 = lane2)
      fireEvent.mouseUp(lanes[1]);

      expect(mockHandleCardDragEnd).toHaveBeenCalledWith('lane2');
    });

    it('should call handleCardDragEnd with correct lane ID for each lane', () => {
      const mockHandleCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedCard={mockDroneCard}
          handleCardDragEnd={mockHandleCardDragEnd}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      // Test lane1 (left)
      fireEvent.mouseUp(lanes[0]);
      expect(mockHandleCardDragEnd).toHaveBeenLastCalledWith('lane1');

      // Test lane3 (right)
      fireEvent.mouseUp(lanes[2]);
      expect(mockHandleCardDragEnd).toHaveBeenLastCalledWith('lane3');
    });

    it('should NOT call handleCardDragEnd on mouseUp when no draggedCard', () => {
      const mockHandleCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedCard={null}
          handleCardDragEnd={mockHandleCardDragEnd}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      fireEvent.mouseUp(lanes[1]);

      expect(mockHandleCardDragEnd).not.toHaveBeenCalled();
    });

    it('should NOT call handleCardDragEnd on opponent lanes', () => {
      const mockHandleCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          isPlayer={false}
          draggedCard={mockDroneCard}
          handleCardDragEnd={mockHandleCardDragEnd}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      fireEvent.mouseUp(lanes[1]);

      expect(mockHandleCardDragEnd).not.toHaveBeenCalled();
    });

    it('should NOT throw if handleCardDragEnd prop is not provided', () => {
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedCard={mockDroneCard}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      // Should not throw
      expect(() => {
        fireEvent.mouseUp(lanes[1]);
      }).not.toThrow();
    });
  });

  describe('visual feedback during drag', () => {
    it('should highlight player lanes when draggedCard is set', () => {
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedCard={mockDroneCard}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      // All lanes should have targeting highlight when dragging
      lanes.forEach(lane => {
        expect(lane.className).toMatch(/ring|pulse|cyan/i);
      });
    });

    it('should NOT highlight opponent lanes when draggedCard is set', () => {
      render(
        <DroneLanesDisplay
          {...defaultProps}
          isPlayer={false}
          draggedCard={mockDroneCard}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      // Opponent lanes should NOT have the drag targeting highlight
      // (they should have their normal red background, not cyan highlight)
      lanes.forEach(lane => {
        // Should not have the animate-pulse that indicates targetable
        expect(lane.className).not.toMatch(/animate-pulse/);
      });
    });
  });

  describe('click functionality preserved', () => {
    it('should still call onLaneClick when clicking lane', () => {
      const mockOnLaneClick = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          onLaneClick={mockOnLaneClick}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      fireEvent.click(lanes[1]);

      expect(mockOnLaneClick).toHaveBeenCalledWith(
        expect.any(Object),
        'lane2',
        true // isPlayer
      );
    });
  });
});
