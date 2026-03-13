// ========================================
// HAND VIEW EFFECT CHAIN CARD_IN_HAND TARGETING TESTS
// ========================================
// Tests that effect chain CARD_IN_HAND targeting reuses the
// mandatory discard mechanism to highlight and select hand cards.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HandView from '../HandView.jsx';

// Mock dependencies
vi.mock('../../ActionCard.jsx', () => ({
  default: ({ card, isPlayable, isDimmed, mandatoryAction, onClick }) => (
    <div
      data-testid={`action-card-${card.id}`}
      data-playable={isPlayable}
      data-dimmed={isDimmed}
      data-mandatory-type={mandatoryAction?.type || 'none'}
      data-mandatory-from-ability={mandatoryAction?.fromAbility || false}
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
      return [{ id: 'target1' }];
    }
  }
}));

describe('HandView effect chain CARD_IN_HAND targeting', () => {
  const playedCard = {
    id: 'SACRIFICE_FOR_POWER',
    instanceId: 'SACRIFICE_FOR_POWER-inst-1',
    name: 'Sacrifice for Power',
    cost: 1,
    type: 'Support',
    effect: { type: 'DAMAGE', amount: 3 }
  };

  const targetCard1 = {
    id: 'LASER_BLAST',
    instanceId: 'LASER_BLAST-inst-1',
    name: 'Laser Blast',
    cost: 2,
    type: 'Ordnance',
    effect: { type: 'DAMAGE', amount: 2 }
  };

  const targetCard2 = {
    id: 'SYSTEM_REBOOT',
    instanceId: 'SYSTEM_REBOOT-inst-2',
    name: 'System Reboot',
    cost: 1,
    type: 'Support',
    effect: { type: 'DRAW', amount: 2 }
  };

  const nonTargetCard = {
    id: 'SHIELD_WALL',
    instanceId: 'SHIELD_WALL-inst-1',
    name: 'Shield Wall',
    cost: 3,
    type: 'Support',
    effect: { type: 'SHIELD', amount: 2 }
  };

  const effectChainStateActive = {
    complete: false,
    currentIndex: 0,
    effects: [
      { targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' } }
    ],
    validTargets: [
      { ...targetCard1, owner: 'player1' },
      { ...targetCard2, owner: 'player1' }
    ]
  };

  const defaultProps = {
    localPlayerState: {
      energy: 5,
      hand: [playedCard, targetCard1, targetCard2, nonTargetCard],
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
    selectedCard: playedCard,
    turnPhase: 'action',
    mandatoryAction: null,
    excessCards: 0,
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
    validCardTargets: effectChainStateActive.validTargets,
    effectChainState: effectChainStateActive,
    setPendingChainTarget: vi.fn(),
    gameEngine: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valid target cards render as mandatory discard targets (not dimmed)', () => {
    render(<HandView {...defaultProps} />);

    const target1 = screen.getByTestId('action-card-LASER_BLAST');
    const target2 = screen.getByTestId('action-card-SYSTEM_REBOOT');

    // Valid targets should have mandatory discard action with fromAbility=true
    expect(target1.getAttribute('data-mandatory-type')).toBe('discard');
    expect(target1.getAttribute('data-mandatory-from-ability')).toBe('true');
    expect(target1.getAttribute('data-dimmed')).toBe('false');

    expect(target2.getAttribute('data-mandatory-type')).toBe('discard');
    expect(target2.getAttribute('data-mandatory-from-ability')).toBe('true');
    expect(target2.getAttribute('data-dimmed')).toBe('false');
  });

  it('played card (selectedCard) is excluded from effect chain targets', () => {
    render(<HandView {...defaultProps} />);

    const playedCardEl = screen.getByTestId('action-card-SACRIFICE_FOR_POWER');

    // The played card should NOT be a discard target — it stays selected
    expect(playedCardEl.getAttribute('data-mandatory-type')).toBe('none');
  });

  it('cards NOT in validCardTargets remain without mandatory action during effect chain', () => {
    render(<HandView {...defaultProps} />);

    const nonTarget = screen.getByTestId('action-card-SHIELD_WALL');

    // Non-target card should not have mandatory action
    expect(nonTarget.getAttribute('data-mandatory-type')).toBe('none');
    // Should be dimmed (selectedCard is set and this isn't a target)
    expect(nonTarget.getAttribute('data-dimmed')).toBe('true');
  });

  it('clicking a valid target sets pending chain target (no modal)', () => {
    const mockSetConfirmationModal = vi.fn();
    const mockSetPendingChainTarget = vi.fn();

    render(
      <HandView
        {...defaultProps}
        setConfirmationModal={mockSetConfirmationModal}
        setPendingChainTarget={mockSetPendingChainTarget}
      />
    );

    // Click a valid target card
    fireEvent.click(screen.getByTestId('action-card-LASER_BLAST'));

    // Should NOT open confirmation modal
    expect(mockSetConfirmationModal).not.toHaveBeenCalled();

    // Should set pending chain target directly
    expect(mockSetPendingChainTarget).toHaveBeenCalledWith(targetCard1, null);
  });

  it('non-effect-chain rendering is unaffected (regression)', () => {
    // Render without effect chain state
    render(
      <HandView
        {...defaultProps}
        effectChainState={null}
        setPendingChainTarget={undefined}
        selectedCard={null}
        validCardTargets={[]}
      />
    );

    const card1 = screen.getByTestId('action-card-LASER_BLAST');

    // Without effect chain, no mandatory action should be set
    expect(card1.getAttribute('data-mandatory-type')).toBe('none');
    // With no selectedCard, isDimmed is null/false (not dimmed)
    expect(card1.getAttribute('data-dimmed')).not.toBe('true');
  });
});
