/**
 * useCardSelection — chainSelections insertionIndex preservation
 *
 * Verifies that insertionIndex (the player's chosen slot position in a lane) is
 * preserved when the effect chain auto-commit maps selections to chainSelections.
 * Regression test for: movement cards ignoring chosen position (specifically slot 0).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useCardSelection from '../useCardSelection.js';

vi.mock('../useEffectChain.js', () => ({ default: vi.fn() }));
vi.mock('../../utils/debugLogger.js', () => ({ debugLog: vi.fn() }));
vi.mock('../../logic/targeting/uiTargetingHelpers.js', () => ({
  calculateAllValidTargets: vi.fn().mockReturnValue({ validAbilityTargets: [], validCardTargets: [] }),
}));

import useEffectChain from '../useEffectChain.js';

function makeProps() {
  return {
    submitAction: vi.fn(),
    getLocalPlayerId: vi.fn().mockReturnValue('player1'),
    gameState: {
      player1: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, hand: [] },
      player2: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] }, hand: [] },
    },
    gameDataService: { getEffectiveStats: vi.fn().mockReturnValue({}) },
    abilityMode: null,
    setAbilityMode: vi.fn(),
    shipAbilityMode: null,
    setShipAbilityMode: vi.fn(),
    setSelectedDrone: vi.fn(),
  };
}

function makeChainReturn(selections) {
  return {
    effectChainState: {
      complete: true,
      card: { name: 'Reposition', effects: [{ type: 'SINGLE_MOVE' }] },
      selections,
      validTargets: [],
    },
    startEffectChain: vi.fn(),
    selectChainTarget: vi.fn(),
    selectChainDestination: vi.fn(),
    selectChainMultiTarget: vi.fn(),
    confirmChainMultiSelect: vi.fn(),
    setPendingChainTarget: vi.fn(),
    confirmChainTarget: vi.fn(),
    skipRemainingOptionalEffects: vi.fn(),
    cancelEffectChain: vi.fn(),
  };
}

describe('useCardSelection — chainSelections building', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves insertionIndex=0 (leftmost slot) when building chainSelections', () => {
    useEffectChain.mockReturnValue(makeChainReturn([
      { target: { id: 'd1', owner: 'player1' }, lane: 'lane1', destination: 'lane2', insertionIndex: 0 },
    ]));

    const { result } = renderHook(() => useCardSelection(makeProps()));

    expect(result.current.cardConfirmation).not.toBeNull();
    expect(result.current.cardConfirmation.chainSelections[0].insertionIndex).toBe(0);
  });

  it('preserves non-zero insertionIndex when building chainSelections', () => {
    useEffectChain.mockReturnValue(makeChainReturn([
      { target: { id: 'd1', owner: 'player1' }, lane: 'lane1', destination: 'lane2', insertionIndex: 2 },
    ]));

    const { result } = renderHook(() => useCardSelection(makeProps()));

    expect(result.current.cardConfirmation.chainSelections[0].insertionIndex).toBe(2);
  });

  it('preserves insertionIndex=null (append-to-end) when building chainSelections', () => {
    useEffectChain.mockReturnValue(makeChainReturn([
      { target: { id: 'd1', owner: 'player1' }, lane: 'lane1', destination: 'lane2', insertionIndex: null },
    ]));

    const { result } = renderHook(() => useCardSelection(makeProps()));

    expect(result.current.cardConfirmation.chainSelections[0].insertionIndex).toBeNull();
  });
});
