import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock that can be reconfigured per test
const mockFireTrigger = vi.fn();

vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = mockFireTrigger;
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: {
    ON_MOVE: 'ON_MOVE',
    ON_LANE_MOVEMENT_IN: 'ON_LANE_MOVEMENT_IN',
  },
}));
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));
vi.mock('../../gameLogic.js', () => ({
  gameEngine: {
    updateAuras: (playerState) => playerState.dronesOnBoard,
  },
}));
vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: () => ({ keywords: new Set() }),
}));
vi.mock('../../../utils/gameUtils.js', () => ({
  hasMovementInhibitorInLane: () => false,
}));

import { processMove } from '../CombatActionStrategy.js';

function makeDrone(overrides = {}) {
  return { id: 'd1', name: 'Spectre', isExhausted: false, statMods: [], ...overrides };
}

function makeCtx() {
  const drone = makeDrone();
  const state = {
    player1: {
      name: 'P1',
      dronesOnBoard: { lane1: [drone], lane2: [], lane3: [] },
    },
    player2: {
      name: 'P2',
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    },
    placedSections: [],
    opponentPlacedSections: [],
  };

  return {
    getState: vi.fn().mockReturnValue(state),
    getPlacedSections: vi.fn().mockReturnValue({ player1: [], player2: [] }),
    updatePlayerState: vi.fn(),
    setPlayerStates: vi.fn(),
    addLogEntry: vi.fn(),
    getAnimationManager: vi.fn().mockReturnValue(null),
    executeAndCaptureAnimations: vi.fn(),
    executeGoAgainAnimation: vi.fn(),
    mapAnimationEvents: vi.fn().mockImplementation((events) =>
      events.map(e => ({
        animationName: e.type,
        timing: 'pre-state',
        payload: e,
      }))
    ),
  };
}

describe('processMove animation ordering', () => {
  beforeEach(() => {
    mockFireTrigger.mockReset();
  });

  it('produces DRONE_MOVEMENT animation before trigger animations', async () => {
    const ctx = makeCtx();

    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_MOVE') {
        return {
          triggered: true,
          newPlayerStates: context.playerStates,
          animationEvents: [{ type: 'HEAL_EFFECT', targetDrone: 'd1' }],
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    await processMove(
      { droneId: 'd1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' },
      ctx
    );

    expect(ctx.mapAnimationEvents).toHaveBeenCalledTimes(1);
    const rawEvents = ctx.mapAnimationEvents.mock.calls[0][0];
    const types = rawEvents.map(e => e.type);

    expect(types[0]).toBe('DRONE_MOVEMENT');
    const movementIdx = types.indexOf('DRONE_MOVEMENT');
    const healIdx = types.indexOf('HEAL_EFFECT');
    expect(healIdx).toBeGreaterThan(movementIdx);
  });

  it('includes STATE_SNAPSHOT when triggers exist', async () => {
    const ctx = makeCtx();

    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_MOVE') {
        return {
          triggered: true,
          newPlayerStates: context.playerStates,
          animationEvents: [{ type: 'HEAL_EFFECT' }],
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    await processMove(
      { droneId: 'd1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' },
      ctx
    );

    const rawEvents = ctx.mapAnimationEvents.mock.calls[0][0];
    const types = rawEvents.map(e => e.type);
    expect(types).toContain('STATE_SNAPSHOT');
    expect(types).toContain('TRIGGER_CHAIN_PAUSE');
  });

  it('omits STATE_SNAPSHOT when no triggers fire', async () => {
    const ctx = makeCtx();

    mockFireTrigger.mockReturnValue({
      triggered: false, newPlayerStates: null, animationEvents: [],
    });

    await processMove(
      { droneId: 'd1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' },
      ctx
    );

    const rawEvents = ctx.mapAnimationEvents.mock.calls[0][0];
    const types = rawEvents.map(e => e.type);
    expect(types).not.toContain('STATE_SNAPSHOT');
    expect(types).not.toContain('TRIGGER_CHAIN_PAUSE');
    expect(types).toEqual(['DRONE_MOVEMENT']);
  });

  it('preserves goAgain from mine trigger result', async () => {
    const ctx = makeCtx();

    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_LANE_MOVEMENT_IN') {
        return {
          triggered: true,
          newPlayerStates: context.playerStates,
          animationEvents: [],
          goAgain: true,
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    const result = await processMove(
      { droneId: 'd1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' },
      ctx
    );

    expect(result.shouldEndTurn).toBe(false);
    expect(ctx.executeGoAgainAnimation).toHaveBeenCalledWith('player1');
  });

  it('bridge STATE_SNAPSHOT contains pre-trigger state (no stat buffs from trigger)', async () => {
    const ctx = makeCtx();

    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_MOVE') {
        // Simulate trigger adding a stat mod to the moved drone
        const modifiedStates = JSON.parse(JSON.stringify(context.playerStates));
        const droneInLane = modifiedStates.player1.dronesOnBoard.lane2.find(d => d.id === 'd1');
        droneInLane.statMods = [{ stat: 'attack', value: 1, source: 'Phase Shift' }];
        return {
          triggered: true,
          newPlayerStates: modifiedStates,
          animationEvents: [{ type: 'STAT_BUFF', targetDrone: 'd1' }],
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    await processMove(
      { droneId: 'd1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' },
      ctx
    );

    const rawEvents = ctx.mapAnimationEvents.mock.calls[0][0];
    const snapshot = rawEvents.find(e => e.type === 'STATE_SNAPSHOT');
    expect(snapshot).toBeDefined();

    // Bridge snapshot should have the drone in lane2 (moved) but with NO stat mods
    const snapshotDrone = snapshot.snapshotPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'd1');
    expect(snapshotDrone).toBeDefined();
    expect(snapshotDrone.statMods).toEqual([]);
  });

  it('commits state once via setPlayerStates', async () => {
    const ctx = makeCtx();

    mockFireTrigger.mockReturnValue({
      triggered: false, newPlayerStates: null, animationEvents: [],
    });

    await processMove(
      { droneId: 'd1', fromLane: 'lane1', toLane: 'lane2', playerId: 'player1' },
      ctx
    );

    expect(ctx.setPlayerStates).toHaveBeenCalledTimes(1);
  });
});
