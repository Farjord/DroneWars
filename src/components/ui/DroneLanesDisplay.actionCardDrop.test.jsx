// ========================================
// DRONE LANES DISPLAY ACTION CARD DROP TESTS
// ========================================
// TDD tests for action card lane targeting via drag-and-drop

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DroneLanesDisplay from './DroneLanesDisplay.jsx';

// Mock dependencies
vi.mock('./DroneToken.jsx', () => ({
  default: ({ drone }) => <div data-testid={`drone-token-${drone.id}`}>{drone.name}</div>
}));

vi.mock('../../hooks/useGameData.js', () => ({
  useGameData: () => ({
    getEffectiveStats: vi.fn()
  })
}));

describe('DroneLanesDisplay action card drop', () => {
  const mockLaneTargetCard = {
    id: 'CARD011',
    instanceId: 'CARD011-inst-1',
    name: 'Nuke',
    cost: 6,
    type: 'Ordnance',
    targeting: { type: 'LANE', affinity: 'ANY' },
    effect: { type: 'DESTROY' }
  };

  const mockDroneTargetCard = {
    id: 'CARD001',
    instanceId: 'CARD001-inst-1',
    name: 'Laser Blast',
    cost: 2,
    type: 'Ordnance',
    targeting: { type: 'DRONE', affinity: 'ANY' },
    effect: { type: 'DAMAGE', amount: 2 }
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
    validCardTargets: [
      { id: 'lane1', owner: 'player1' },
      { id: 'lane2', owner: 'player1' },
      { id: 'lane3', owner: 'player1' },
      { id: 'lane1', owner: 'player2' },
      { id: 'lane2', owner: 'player2' },
      { id: 'lane3', owner: 'player2' }
    ],
    multiSelectState: null,
    turnPhase: 'action',
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

  describe('lane drop detection for LANE targeting cards', () => {
    it('should call handleActionCardDragEnd with lane ID for LANE targeting card', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockLaneTargetCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      // Trigger mouseUp on center lane (lane2)
      fireEvent.mouseUp(lanes[1]);

      expect(mockHandleActionCardDragEnd).toHaveBeenCalledWith(
        { id: 'lane2', name: 'lane2' },
        'lane',
        'player1'
      );
    });

    it('should call handleActionCardDragEnd with correct owner for opponent lane', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          isPlayer={false}
          draggedActionCard={{ card: mockLaneTargetCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      fireEvent.mouseUp(lanes[0]);

      expect(mockHandleActionCardDragEnd).toHaveBeenCalledWith(
        { id: 'lane1', name: 'lane1' },
        'lane',
        'player2'
      );
    });

    it('should call handleActionCardDragEnd with correct lane IDs for all lanes', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockLaneTargetCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      // Test lane1 (left)
      fireEvent.mouseUp(lanes[0]);
      expect(mockHandleActionCardDragEnd).toHaveBeenLastCalledWith(
        { id: 'lane1', name: 'lane1' },
        'lane',
        'player1'
      );

      // Test lane3 (right)
      fireEvent.mouseUp(lanes[2]);
      expect(mockHandleActionCardDragEnd).toHaveBeenLastCalledWith(
        { id: 'lane3', name: 'lane3' },
        'lane',
        'player1'
      );
    });
  });

  describe('non-LANE targeting cards', () => {
    it('should NOT call handleActionCardDragEnd for DRONE targeting card on lane', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockDroneTargetCard }}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      fireEvent.mouseUp(lanes[1]);

      expect(mockHandleActionCardDragEnd).not.toHaveBeenCalled();
    });
  });

  describe('no drag active', () => {
    it('should NOT call handleActionCardDragEnd when draggedActionCard is null', () => {
      const mockHandleActionCardDragEnd = vi.fn();
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedActionCard={null}
          handleActionCardDragEnd={mockHandleActionCardDragEnd}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      fireEvent.mouseUp(lanes[1]);

      expect(mockHandleActionCardDragEnd).not.toHaveBeenCalled();
    });

    it('should NOT throw if handleActionCardDragEnd prop is not provided', () => {
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockLaneTargetCard }}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      expect(() => {
        fireEvent.mouseUp(lanes[1]);
      }).not.toThrow();
    });
  });

  describe('visual feedback for lane targeting', () => {
    it('should highlight lanes when dragging LANE targeting card and lane is valid target', () => {
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedActionCard={{ card: mockLaneTargetCard }}
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      // Lanes should have targeting highlight when dragging LANE card
      lanes.forEach(lane => {
        expect(lane.className).toMatch(/ring|pulse|cyan/i);
      });
    });

    it('should NOT highlight lanes when validCardTargets is empty (drag cancelled)', () => {
      render(
        <DroneLanesDisplay
          {...defaultProps}
          draggedActionCard={null}
          validCardTargets={[]}  // Empty - simulates cancelled drag
        />
      );

      const lanes = screen.getAllByRole('generic').filter(el =>
        el.className.includes('flex-1') && el.className.includes('rounded-lg')
      );

      // Lanes should NOT have action card targeting highlight when targets cleared
      lanes.forEach(lane => {
        expect(lane.className).not.toContain('ring-cyan-400');
        expect(lane.className).not.toContain('bg-cyan-800');
      });
    });
  });

  describe('existing functionality preserved', () => {
    it('should still call existing onLaneClick when clicking lane', () => {
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

    it('should still handle deployment card drag end', () => {
      const mockHandleCardDragEnd = vi.fn();
      const mockDroneCard = { name: 'Scout Drone', class: 2 };
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

      fireEvent.mouseUp(lanes[1]);

      expect(mockHandleCardDragEnd).toHaveBeenCalledWith('lane2');
    });
  });
});
