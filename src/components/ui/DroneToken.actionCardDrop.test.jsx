// ========================================
// DRONE TOKEN ACTION CARD DROP TESTS
// ========================================
// TDD tests for action card targeting via drag-and-drop

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DroneToken from './DroneToken.jsx';

// Mock dependencies
vi.mock('../../data/droneData.js', () => ({
  default: [{
    name: 'Dart',
    hull: 2,
    abilities: []
  }, {
    name: 'Heavy Drone',
    hull: 4,
    abilities: []
  }]
}));

vi.mock('../../hooks/useGameData.js', () => ({
  useGameData: () => ({
    getEffectiveStats: (drone) => ({
      attack: 2,
      speed: 3,
      baseAttack: 2,
      baseSpeed: 3,
      maxShields: drone.currentShields || 0
    })
  })
}));

vi.mock('../../contexts/EditorStatsContext.jsx', () => ({
  useEditorStats: () => null
}));

describe('DroneToken action card drop', () => {
  const mockDrone = {
    id: 'drone-1',
    name: 'Dart',
    hull: 2,
    currentShields: 0,
    isExhausted: false,
    isMarked: false,
    image: '/test-image.png'
  };

  const mockActionCard = {
    id: 'CARD001',
    instanceId: 'CARD001-inst-1',
    name: 'Laser Blast',
    cost: 2,
    type: 'Ordnance',
    targeting: { type: 'DRONE', affinity: 'ANY' },
    effect: { type: 'DAMAGE', amount: 2 }
  };

  const defaultProps = {
    drone: mockDrone,
    onClick: vi.fn(),
    isPlayer: true,
    isSelected: false,
    isSelectedForMove: false,
    isHit: false,
    isPotentialInterceptor: false,
    isPotentialGuardian: false,
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    lane: 'lane1',
    onAbilityClick: vi.fn(),
    isActionTarget: false,
    droneRefs: { current: {} },
    mandatoryAction: null,
    localPlayerState: { energy: 5 },
    interceptedBadge: null
  };

  describe('drop detection', () => {
    it('should call onActionCardDrop on mouseUp when draggedActionCard is set', () => {
      const mockOnActionCardDrop = vi.fn();
      render(
        <DroneToken
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard }}
          onActionCardDrop={mockOnActionCardDrop}
        />
      );

      // Find the main token div by data-drone-id
      const tokenDiv = document.querySelector('[data-drone-id="drone-1"]');
      fireEvent.mouseUp(tokenDiv);

      expect(mockOnActionCardDrop).toHaveBeenCalledWith(
        mockDrone,
        'drone',
        'player1' // default owner from getLocalPlayerId
      );
    });

    it('should pass correct owner for player drone', () => {
      const mockOnActionCardDrop = vi.fn();
      render(
        <DroneToken
          {...defaultProps}
          isPlayer={true}
          draggedActionCard={{ card: mockActionCard }}
          onActionCardDrop={mockOnActionCardDrop}
          getLocalPlayerId={() => 'player1'}
          getOpponentPlayerId={() => 'player2'}
        />
      );

      const tokenDiv = document.querySelector('[data-drone-id="drone-1"]');
      fireEvent.mouseUp(tokenDiv);

      expect(mockOnActionCardDrop).toHaveBeenCalledWith(
        mockDrone,
        'drone',
        'player1'
      );
    });

    it('should pass correct owner for opponent drone', () => {
      const mockOnActionCardDrop = vi.fn();
      render(
        <DroneToken
          {...defaultProps}
          isPlayer={false}
          draggedActionCard={{ card: mockActionCard }}
          onActionCardDrop={mockOnActionCardDrop}
          getLocalPlayerId={() => 'player1'}
          getOpponentPlayerId={() => 'player2'}
        />
      );

      const tokenDiv = document.querySelector('[data-drone-id="drone-1"]');
      fireEvent.mouseUp(tokenDiv);

      expect(mockOnActionCardDrop).toHaveBeenCalledWith(
        mockDrone,
        'drone',
        'player2'
      );
    });

    it('should NOT call onActionCardDrop when draggedActionCard is null', () => {
      const mockOnActionCardDrop = vi.fn();
      render(
        <DroneToken
          {...defaultProps}
          draggedActionCard={null}
          onActionCardDrop={mockOnActionCardDrop}
        />
      );

      const tokenDiv = document.querySelector('[data-drone-id="drone-1"]');
      fireEvent.mouseUp(tokenDiv);

      expect(mockOnActionCardDrop).not.toHaveBeenCalled();
    });

    it('should NOT throw if onActionCardDrop prop is not provided', () => {
      render(
        <DroneToken
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard }}
        />
      );

      const tokenDiv = document.querySelector('[data-drone-id="drone-1"]');

      expect(() => {
        fireEvent.mouseUp(tokenDiv);
      }).not.toThrow();
    });

    it('should still call existing onDragDrop when no draggedActionCard', () => {
      const mockOnDragDrop = vi.fn();
      render(
        <DroneToken
          {...defaultProps}
          onDragDrop={mockOnDragDrop}
          draggedActionCard={null}
        />
      );

      const tokenDiv = document.querySelector('[data-drone-id="drone-1"]');
      fireEvent.mouseUp(tokenDiv);

      expect(mockOnDragDrop).toHaveBeenCalledWith(mockDrone);
    });
  });

  describe('visual feedback', () => {
    it('should have action target styling when isActionTarget is true', () => {
      render(
        <DroneToken
          {...defaultProps}
          isActionTarget={true}
        />
      );

      const tokenDiv = document.querySelector('[data-drone-id="drone-1"]');
      // The visual effects container should have animate-pulse
      const effectsContainer = tokenDiv.querySelector('.animate-pulse');
      expect(effectsContainer).toBeTruthy();
    });
  });
});
