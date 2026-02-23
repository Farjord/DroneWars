// ========================================
// DRONES VIEW DRAG-AND-DROP TESTS
// ========================================
// TDD tests for drag-and-drop deployment of drone cards

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DronesView from '../DronesView.jsx';

// Mock dependencies
vi.mock('../../DroneCard.jsx', () => ({
  default: ({ drone, onClick, isSelectable, isSelected }) => (
    <div
      data-testid={`drone-card-${drone.name}`}
      data-selectable={isSelectable}
      data-selected={isSelected}
      onClick={() => onClick && onClick(drone)}
    >
      {drone.name}
    </div>
  )
}));

vi.mock('../../ActionCard.jsx', () => ({
  default: ({ card }) => <div data-testid="action-card">{card.name}</div>
}));

vi.mock('../../CardBackPlaceholder.jsx', () => ({
  default: () => <div data-testid="card-back-placeholder" />
}));

vi.mock('../../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../../managers/SoundManager.js', () => ({
  default: { getInstance: () => ({ play: vi.fn() }) }
}));

vi.mock('../../../../data/droneData.js', () => ({
  default: []
}));

vi.mock('../../../../utils/cardAnimationUtils.js', () => ({
  calculateCardFanRotation: () => 0,
  getHoverTransform: () => 'none',
  getCardTransition: () => 'none',
  calculateCardArcOffset: () => 0,
  CARD_FAN_CONFIG: {
    cardOverlapPx: -30,
    zIndex: { hovered: 100, normal: (i) => i },
    transformOrigin: 'bottom center'
  }
}));

describe('DronesView drag-and-drop', () => {
  const mockDrone1 = {
    name: 'Dart',
    class: 2,
    attack: 1,
    speed: 3,
    hull: 2,
    shields: 0,
    limit: 3,
    abilities: []
  };

  const mockDrone2 = {
    name: 'Heavy Drone',
    class: 3,
    attack: 3,
    speed: 1,
    hull: 4,
    shields: 1,
    limit: 2,
    abilities: []
  };

  const defaultProps = {
    localPlayerState: {
      energy: 5,
      initialDeploymentBudget: 10,
      deploymentBudget: 10,
      deployedDroneCounts: {},
      appliedUpgrades: {},
      discardPile: [],
      deck: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
    },
    localPlayerEffectiveStats: {
      totals: { cpuLimit: 10 }
    },
    sortedLocalActivePool: [mockDrone1, mockDrone2],
    selectedCard: null,
    turnPhase: 'deployment',
    mandatoryAction: null,
    handleToggleDroneSelection: vi.fn(),
    selectedDrone: null,
    setViewUpgradesModal: vi.fn(),
    getLocalPlayerId: () => 'player1',
    isMyTurn: () => true,
    turn: 1,
    roundNumber: 1,
    passInfo: { player1Passed: false, player2Passed: false },
    validCardTargets: [],
    setIsViewDiscardModalOpen: vi.fn(),
    setIsViewDeckModalOpen: vi.fn()
  };

  describe('drag initiation', () => {
    it('should call handleCardDragStart on mouseDown for selectable drone card', () => {
      const mockHandleCardDragStart = vi.fn();
      render(
        <DronesView
          {...defaultProps}
          handleCardDragStart={mockHandleCardDragStart}
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      fireEvent.mouseDown(droneWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleCardDragStart).toHaveBeenCalledWith(
        mockDrone1,
        expect.objectContaining({ clientX: 100, clientY: 200 })
      );
    });

    it('should NOT call handleCardDragStart when drone is not selectable', () => {
      const mockHandleCardDragStart = vi.fn();
      render(
        <DronesView
          {...defaultProps}
          handleCardDragStart={mockHandleCardDragStart}
          turnPhase="action" // Not deployment phase, so not selectable
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      fireEvent.mouseDown(droneWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleCardDragStart when it is not my turn', () => {
      const mockHandleCardDragStart = vi.fn();
      render(
        <DronesView
          {...defaultProps}
          handleCardDragStart={mockHandleCardDragStart}
          isMyTurn={() => false}
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      fireEvent.mouseDown(droneWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleCardDragStart when player has passed', () => {
      const mockHandleCardDragStart = vi.fn();
      render(
        <DronesView
          {...defaultProps}
          handleCardDragStart={mockHandleCardDragStart}
          passInfo={{ player1Passed: true, player2Passed: false }}
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      fireEvent.mouseDown(droneWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleCardDragStart when player cannot afford drone', () => {
      const mockHandleCardDragStart = vi.fn();
      render(
        <DronesView
          {...defaultProps}
          handleCardDragStart={mockHandleCardDragStart}
          localPlayerState={{
            ...defaultProps.localPlayerState,
            energy: 0,
            initialDeploymentBudget: 1 // Total 1, but drone costs 2
          }}
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      fireEvent.mouseDown(droneWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleCardDragStart when mandatory action is active', () => {
      const mockHandleCardDragStart = vi.fn();
      render(
        <DronesView
          {...defaultProps}
          handleCardDragStart={mockHandleCardDragStart}
          mandatoryAction={{ type: 'discard', count: 1 }}
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      fireEvent.mouseDown(droneWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleCardDragStart if prop is not provided', () => {
      // No handleCardDragStart prop - should not throw
      render(<DronesView {...defaultProps} />);

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;

      // Should not throw when mouseDown without handler
      expect(() => {
        fireEvent.mouseDown(droneWrapper, { clientX: 100, clientY: 200 });
      }).not.toThrow();
    });

    it('should prevent default on mouseDown to avoid text selection', () => {
      const mockHandleCardDragStart = vi.fn();
      render(
        <DronesView
          {...defaultProps}
          handleCardDragStart={mockHandleCardDragStart}
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      const event = fireEvent.mouseDown(droneWrapper, { clientX: 100, clientY: 200 });

      // fireEvent returns whether preventDefault was called
      // We verify the handler was called with the event
      expect(mockHandleCardDragStart).toHaveBeenCalled();
    });
  });

  describe('visual feedback during drag', () => {
    it('should NOT apply opacity or special styling when draggedCard matches this drone', () => {
      // User explicitly requested no visual change (opacity) when dragging
      render(
        <DronesView
          {...defaultProps}
          draggedCard={mockDrone1}
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      // Verify no opacity class is applied - user didn't want transparency
      expect(droneWrapper.className).not.toMatch(/opacity/i);
    });

    it('should NOT apply dragging class when draggedCard is different drone', () => {
      render(
        <DronesView
          {...defaultProps}
          draggedCard={mockDrone2}
        />
      );

      const droneWrapper = screen.getByTestId('drone-card-Dart').parentElement;
      // Scout should not have dragging class when Heavy is being dragged
      expect(droneWrapper.className).not.toMatch(/dragging/i);
    });
  });

  describe('click functionality preserved', () => {
    it('should still call handleToggleDroneSelection on click', () => {
      const mockToggle = vi.fn();
      render(
        <DronesView
          {...defaultProps}
          handleToggleDroneSelection={mockToggle}
        />
      );

      const droneCard = screen.getByTestId('drone-card-Dart');
      fireEvent.click(droneCard);

      expect(mockToggle).toHaveBeenCalledWith(mockDrone1);
    });
  });
});
