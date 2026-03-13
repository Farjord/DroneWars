import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useGameLifecycle from '../useGameLifecycle.js';

// Track call order across all mocked functions
let callOrder;

function createOrderTracker(name) {
  return vi.fn((...args) => { callOrder.push(name); });
}

function createAsyncOrderTracker(name, returnValue = {}) {
  return vi.fn(async (...args) => {
    const actionType = typeof args[0] === 'string' ? args[0] : '';
    callOrder.push(actionType ? `submitAction:${actionType}` : name);
    return returnValue;
  });
}

function makeDefaultProps(overrides = {}) {
  return {
    gameState: { appState: 'playing' },
    localPlayerState: {
      name: 'Player 1',
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      hand: [{ id: 'c1', name: 'Card1' }, { id: 'c2', name: 'Card2' }],
    },
    opponentPlayerState: {
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      hand: [],
    },
    turnPhase: 'action',
    passInfo: { player1Passed: false, player2Passed: false },
    mandatoryAction: null,
    excessCards: 1,
    excessDrones: 0,
    totalOpponentPlayerDrones: 0,
    opponentPlayerEffectiveStats: { totals: { cpuLimit: 5 } },
    opponentPlacedSections: [],
    getEffectiveShipStats: vi.fn(),
    setSelectedDrone: createOrderTracker('setSelectedDrone'),
    setModalContent: createOrderTracker('setModalContent'),
    setAbilityMode: createOrderTracker('setAbilityMode'),
    setValidAbilityTargets: createOrderTracker('setValidAbilityTargets'),
    setMandatoryAction: createOrderTracker('setMandatoryAction'),
    setShowMandatoryActionModal: createOrderTracker('setShowMandatoryActionModal'),
    setConfirmationModal: createOrderTracker('setConfirmationModal'),
    setSelectedCard: createOrderTracker('setSelectedCard'),
    setValidCardTargets: createOrderTracker('setValidCardTargets'),
    setCardConfirmation: createOrderTracker('setCardConfirmation'),
    setShowWinnerModal: createOrderTracker('setShowWinnerModal'),
    setShowAbandonRunModal: createOrderTracker('setShowAbandonRunModal'),
    setShowAddCardModal: createOrderTracker('setShowAddCardModal'),
    setOptionalDiscardCount: createOrderTracker('setOptionalDiscardCount'),
    setDeck: createOrderTracker('setDeck'),
    setCardToView: createOrderTracker('setCardToView'),
    submitAction: overrides.submitAction || createAsyncOrderTracker('submitAction'),
    getLocalPlayerId: () => 'player1',
    getOpponentPlayerId: () => 'player2',
    cancelAllActions: createOrderTracker('cancelAllActions'),
    resetGame: createOrderTracker('resetGame'),
    endGame: createOrderTracker('endGame'),
    isResolvingAttackRef: { current: false },
    footerView: 'hand',
    setFooterView: createOrderTracker('setFooterView'),
    setSelectedBackground: createOrderTracker('setSelectedBackground'),
    setViewShipSectionModal: createOrderTracker('setViewShipSectionModal'),
    setViewTechDetailModal: createOrderTracker('setViewTechDetailModal'),
    setShowOpponentDronesModal: createOrderTracker('setShowOpponentDronesModal'),
    gameStateManager: {
      isMultiplayer: () => false,
      actionProcessor: { getPhaseCommitmentStatus: () => ({ bothComplete: false }) },
    },
    gameLog: [],
    ...overrides,
  };
}

describe('useGameLifecycle — UI cleanup ordering', () => {
  beforeEach(() => {
    callOrder = [];
  });

  it('handleConfirmMandatoryDiscard — clears confirmation modal before submitting discard', async () => {
    const props = makeDefaultProps();
    const { result } = renderHook(() => useGameLifecycle(props));

    const card = { id: 'c1', name: 'Card1' };

    await act(async () => {
      await result.current.handleConfirmMandatoryDiscard(card);
    });

    const modalIdx = callOrder.indexOf('setConfirmationModal');
    const submitIdx = callOrder.indexOf('submitAction:optionalDiscard');

    expect(modalIdx).toBeGreaterThanOrEqual(0);
    expect(submitIdx).toBeGreaterThanOrEqual(0);
    expect(modalIdx).toBeLessThan(submitIdx);
  });

  it('handleRoundStartDiscard — clears confirmation modal before submitting discard', async () => {
    const props = makeDefaultProps();
    const { result } = renderHook(() => useGameLifecycle(props));

    const card = { id: 'c1', name: 'Card1' };

    await act(async () => {
      await result.current.handleRoundStartDiscard(card);
    });

    const modalIdx = callOrder.indexOf('setConfirmationModal');
    const submitIdx = callOrder.indexOf('submitAction:optionalDiscard');

    expect(modalIdx).toBeGreaterThanOrEqual(0);
    expect(submitIdx).toBeGreaterThanOrEqual(0);
    expect(modalIdx).toBeLessThan(submitIdx);
  });
});
