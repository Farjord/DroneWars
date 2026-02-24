// ========================================
// HAND VIEW ACTION CARD DRAG-AND-DROP TESTS
// ========================================
// TDD tests for drag-and-drop of action cards from hand

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HandView from '../HandView.jsx';

// Mock dependencies
vi.mock('../../ActionCard.jsx', () => ({
  default: ({ card, isPlayable, isDimmed, isDragging, onClick }) => (
    <div
      data-testid={`action-card-${card.id}`}
      data-playable={isPlayable}
      data-dimmed={isDimmed}
      data-dragging={isDragging}
      onClick={() => onClick && onClick(card)}
    >
      {card.name}
    </div>
  )
}));

vi.mock('../../CardBackPlaceholder.jsx', () => ({
  default: () => <div data-testid="card-back-placeholder" />
}));

vi.mock('../../../../logic/TargetingRouter.js', () => ({
  default: class MockTargetingRouter {
    routeTargeting() {
      return [{ id: 'target1' }]; // Has valid targets
    }
  }
}));

describe('HandView action card drag-and-drop', () => {
  const mockActionCard1 = {
    id: 'CARD001',
    instanceId: 'CARD001-inst-1',
    name: 'Laser Blast',
    cost: 2,
    type: 'Ordnance',
    targeting: { type: 'DRONE', affinity: 'ANY' },
    effect: { type: 'DAMAGE', amount: 2 }
  };

  const mockActionCard2 = {
    id: 'CARD002',
    instanceId: 'CARD002-inst-1',
    name: 'System Reboot',
    cost: 1,
    type: 'Support',
    targeting: null, // No targeting required
    effect: { type: 'DRAW', amount: 2, goAgain: true }
  };

  const mockUpgradeCard = {
    id: 'CARD020',
    instanceId: 'CARD020-inst-1',
    name: 'Slimline Bodywork',
    cost: 2,
    type: 'Upgrade',
    targeting: { type: 'NONE' },
    effect: { type: 'MODIFY_DRONE_BASE' }
  };

  const defaultProps = {
    gameMode: 'pvp',
    localPlayerState: {
      energy: 5,
      hand: [mockActionCard1, mockActionCard2],
      deck: [],
      discardPile: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {}
    },
    localPlayerEffectiveStats: {
      totals: { discardLimit: 2 }
    },
    opponentPlayerState: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {}
    },
    selectedCard: null,
    turnPhase: 'action',
    mandatoryAction: null,
    excessCards: 0,
    handleCardClick: vi.fn(),
    getLocalPlayerId: () => 'player1',
    isMyTurn: () => true,
    hoveredCardId: null,
    setHoveredCardId: vi.fn(),
    setIsViewDiscardModalOpen: vi.fn(),
    setIsViewDeckModalOpen: vi.fn(),
    optionalDiscardCount: 0,
    handleRoundStartDraw: vi.fn(),
    checkBothPlayersHandLimitComplete: vi.fn(),
    handleConfirmMandatoryDiscard: vi.fn(),
    handleRoundStartDiscard: vi.fn(),
    setConfirmationModal: vi.fn(),
    passInfo: { player1Passed: false, player2Passed: false },
    validCardTargets: [],
    gameEngine: {}
  };

  describe('drag initiation with threshold', () => {
    it('should NOT call handleActionCardDragStart on mouseDown alone (click without movement)', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;

      // Just mouseDown without movement
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });

      // Drag should NOT start immediately on mouseDown
      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();
    });

    it('should call handleActionCardDragStart after mouse moves more than threshold', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;

      // mouseDown to start tracking
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });
      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();

      // Move mouse more than 5px threshold
      fireEvent.mouseMove(document, { clientX: 110, clientY: 200 }); // 10px movement

      expect(mockHandleActionCardDragStart).toHaveBeenCalledWith(
        mockActionCard1,
        expect.objectContaining({ clientX: 100, clientY: 200 }),
        expect.anything() // cardRect
      );
    });

    it('should NOT call handleActionCardDragStart if mouse moves less than threshold', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;

      // mouseDown to start tracking
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });

      // Move mouse less than 5px threshold
      fireEvent.mouseMove(document, { clientX: 102, clientY: 201 }); // ~2.2px movement

      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();
    });

    it('should clean up listeners on mouseUp if drag never started', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;

      // mouseDown then immediate mouseUp (click)
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });
      fireEvent.mouseUp(document);

      // Now move mouse - should NOT trigger drag since listeners were cleaned up
      fireEvent.mouseMove(document, { clientX: 120, clientY: 200 });

      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleActionCardDragStart during deployment phase', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
          turnPhase="deployment"
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleActionCardDragStart when it is not my turn', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
          isMyTurn={() => false}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleActionCardDragStart when player has passed', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
          passInfo={{ player1Passed: true, player2Passed: false }}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleActionCardDragStart when player cannot afford card', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
          localPlayerState={{
            ...defaultProps.localPlayerState,
            energy: 0 // Cannot afford 2-cost card
          }}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT call handleActionCardDragStart when mandatory action is active', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
          mandatoryAction={{ type: 'discard', count: 1 }}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });

      expect(mockHandleActionCardDragStart).not.toHaveBeenCalled();
    });

    it('should NOT throw if handleActionCardDragStart prop is not provided', () => {
      render(<HandView {...defaultProps} />);

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;

      expect(() => {
        fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });
      }).not.toThrow();
    });

    it('should call handleActionCardDragStart with original mouseDown event after threshold', () => {
      const mockHandleActionCardDragStart = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleActionCardDragStart={mockHandleActionCardDragStart}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;

      // mouseDown then move past threshold
      fireEvent.mouseDown(cardWrapper, { clientX: 100, clientY: 200 });
      fireEvent.mouseMove(document, { clientX: 110, clientY: 200 });

      // Should be called with original mouseDown event coordinates and cardRect
      expect(mockHandleActionCardDragStart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ clientX: 100, clientY: 200 }),
        expect.anything() // cardRect
      );
    });
  });

  describe('isDragging prop', () => {
    it('should pass isDragging=true to ActionCard when draggedActionCard matches', () => {
      render(
        <HandView
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard1 }}
        />
      );

      const card = screen.getByTestId('action-card-CARD001');
      expect(card.dataset.dragging).toBe('true');
    });

    it('should pass isDragging=false to ActionCard when draggedActionCard is different card', () => {
      render(
        <HandView
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard2 }}
        />
      );

      const card = screen.getByTestId('action-card-CARD001');
      expect(card.dataset.dragging).toBe('false');
    });

    it('should pass isDragging=false to all cards when draggedActionCard is null', () => {
      render(
        <HandView
          {...defaultProps}
          draggedActionCard={null}
        />
      );

      const card1 = screen.getByTestId('action-card-CARD001');
      const card2 = screen.getByTestId('action-card-CARD002');
      expect(card1.dataset.dragging).toBe('false');
      expect(card2.dataset.dragging).toBe('false');
    });
  });

  describe('click functionality', () => {
    it('should NOT call handleCardClick for action cards during action phase (drag-only)', () => {
      const mockHandleCardClick = vi.fn();
      render(
        <HandView
          {...defaultProps}
          handleCardClick={mockHandleCardClick}
        />
      );

      const card = screen.getByTestId('action-card-CARD001');
      fireEvent.click(card);

      // Action cards use drag-only during action phase, so handleCardClick should NOT be called
      expect(mockHandleCardClick).not.toHaveBeenCalled();
    });
  });

  describe('card elevation during drag', () => {
    it('should elevate card when dragging (higher z-index)', () => {
      render(
        <HandView
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard1 }}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;
      // Elevated cards should have z-index 800 (CARD_FAN_CONFIG.zIndex.hovered)
      expect(cardWrapper.style.zIndex).toBe('800');
    });

    it('should NOT elevate non-dragged cards', () => {
      render(
        <HandView
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard1 }}
        />
      );

      const card2Wrapper = screen.getByTestId('action-card-CARD002').parentElement;
      // Non-elevated cards should have lower z-index (their index in array)
      expect(parseInt(card2Wrapper.style.zIndex)).toBeLessThan(800);
    });

    it('should apply hover transform to dragged card', () => {
      render(
        <HandView
          {...defaultProps}
          draggedActionCard={{ card: mockActionCard1 }}
        />
      );

      const cardWrapper = screen.getByTestId('action-card-CARD001').parentElement;
      // Elevated cards get translateY(-105px) scale(1.2) - the hover transform
      expect(cardWrapper.style.transform).toContain('translateY(-105px)');
      expect(cardWrapper.style.transform).toContain('scale(1.2)');
    });
  });
});
