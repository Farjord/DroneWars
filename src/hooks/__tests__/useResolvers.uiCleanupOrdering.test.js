import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useResolvers from '../useResolvers.js';

// Track call order across all mocked functions
let callOrder;

function createOrderTracker(name) {
  return vi.fn(() => { callOrder.push(name); });
}

function createAsyncOrderTracker(name, returnValue = {}) {
  return vi.fn(async (...args) => {
    // Tag the action type for disambiguation
    const actionType = typeof args[0] === 'string' ? args[0] : '';
    callOrder.push(actionType ? `submitAction:${actionType}` : name);
    return returnValue;
  });
}

function makeDefaultProps(overrides = {}) {
  const submitAction = overrides.submitAction || createAsyncOrderTracker('submitAction');

  return {
    submitAction,
    getLocalPlayerId: () => 'player1',
    getOpponentPlayerId: () => 'player2',
    isResolvingAttackRef: { current: false },
    interceptionRef: { current: { setPlayerInterceptionChoice: vi.fn() } },
    localPlayerState: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
    opponentPlayerState: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
    winner: null,
    turnPhase: 'action',
    currentPlayer: 'player1',
    gameStateManager: {
      getState: () => ({
        player1: { dronesOnBoard: { lane1: [{ id: 'd1', name: 'Scout' }], lane2: [], lane3: [] } },
        player2: { dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
      }),
    },
    setSelectedDrone: createOrderTracker('setSelectedDrone'),
    setAbilityMode: createOrderTracker('setAbilityMode'),
    setValidAbilityTargets: createOrderTracker('setValidAbilityTargets'),
    setMandatoryAction: createOrderTracker('setMandatoryAction'),
    setFooterView: createOrderTracker('setFooterView'),
    setShipAbilityMode: createOrderTracker('setShipAbilityMode'),
    setDraggedDrone: createOrderTracker('setDraggedDrone'),
    setCardSelectionModal: createOrderTracker('setCardSelectionModal'),
    setShipAbilityConfirmation: createOrderTracker('setShipAbilityConfirmation'),
    shipAbilityConfirmation: null,
    cancelCardSelection: createOrderTracker('cancelCardSelection'),
    setSelectedCard: createOrderTracker('setSelectedCard'),
    setValidCardTargets: createOrderTracker('setValidCardTargets'),
    setCardConfirmation: createOrderTracker('setCardConfirmation'),
    setAffectedDroneIds: createOrderTracker('setAffectedDroneIds'),
    cardConfirmation: null,
    pendingShieldChanges: {},
    clearReallocationState: createOrderTracker('clearReallocationState'),
    ...overrides,
  };
}

describe('useResolvers — UI cleanup ordering', () => {
  beforeEach(() => {
    callOrder = [];
  });

  it('resolveAbility — clears ability mode before submitting action', async () => {
    const props = makeDefaultProps();
    const { result } = renderHook(() => useResolvers(props));

    const ability = { name: 'Repair' };
    const userDrone = { id: 'd1', abilities: [{ name: 'Repair' }] };
    const targetDrone = { id: 'd2' };

    await act(async () => {
      await result.current.resolveAbility(ability, userDrone, targetDrone);
    });

    const abilityModeIdx = callOrder.indexOf('setAbilityMode');
    const submitIdx = callOrder.indexOf('submitAction:ability');

    expect(abilityModeIdx).toBeGreaterThanOrEqual(0);
    expect(submitIdx).toBeGreaterThanOrEqual(0);
    expect(abilityModeIdx).toBeLessThan(submitIdx);
  });

  it('resolveCardPlay — clears card selection before submitting action', async () => {
    const props = makeDefaultProps({
      submitAction: createAsyncOrderTracker('submitAction', { success: true }),
    });
    const { result } = renderHook(() => useResolvers(props));

    const card = { id: 'c1', name: 'Test Card' };
    const target = { id: 'd1' };

    await act(async () => {
      await result.current.resolveCardPlay(card, target, 'player1');
    });

    const cancelIdx = callOrder.indexOf('cancelCardSelection');
    const submitIdx = callOrder.indexOf('submitAction:cardPlay');

    expect(cancelIdx).toBeGreaterThanOrEqual(0);
    expect(submitIdx).toBeGreaterThanOrEqual(0);
    expect(cancelIdx).toBeLessThan(submitIdx);
  });

  it('handleConfirmMove (snared) — clears selection before submitting snaredConsumption', async () => {
    const props = makeDefaultProps();
    const { result } = renderHook(() => useResolvers(props));

    // Set up moveConfirmation with snared flag
    act(() => {
      result.current.setMoveConfirmation({
        droneId: 'd1', owner: 'player1', from: 'lane1', to: 'lane2',
        card: null, isSnared: true,
      });
    });

    await act(async () => {
      await result.current.handleConfirmMove();
    });

    const setSelectedDroneIdx = callOrder.indexOf('setSelectedDrone');
    const submitIdx = callOrder.indexOf('submitAction:snaredConsumption');

    expect(setSelectedDroneIdx).toBeGreaterThanOrEqual(0);
    expect(submitIdx).toBeGreaterThanOrEqual(0);
    expect(setSelectedDroneIdx).toBeLessThan(submitIdx);
  });

  it('handleConfirmMove (direct move) — clears selection before submitting move', async () => {
    vi.useFakeTimers();
    const props = makeDefaultProps();
    const { result } = renderHook(() => useResolvers(props));

    // Set up moveConfirmation without card (direct move path), not snared
    act(() => {
      result.current.setMoveConfirmation({
        droneId: 'd1', owner: 'player1', from: 'lane1', to: 'lane2',
        card: null, isSnared: false,
      });
    });

    await act(async () => {
      result.current.handleConfirmMove();
      // Advance past MOVE_RESOLUTION_DELAY (400ms)
      await vi.advanceTimersByTimeAsync(500);
    });

    const setSelectedDroneIdx = callOrder.indexOf('setSelectedDrone');
    const submitIdx = callOrder.indexOf('submitAction:move');

    expect(setSelectedDroneIdx).toBeGreaterThanOrEqual(0);
    expect(submitIdx).toBeGreaterThanOrEqual(0);
    expect(setSelectedDroneIdx).toBeLessThan(submitIdx);

    vi.useRealTimers();
  });
});
