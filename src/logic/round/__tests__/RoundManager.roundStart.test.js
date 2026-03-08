// ========================================
// ROUND MANAGER - ON_ROUND_START TRIGGER TESTS
// ========================================
// Tests processRoundStartTriggers delegation to TriggerProcessor
// TriggerProcessor's own behavior is tested in TriggerProcessor.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({
    maxShields: drone.shields || 1,
    attack: drone.attack || 1,
    speed: drone.speed || 1,
    keywords: new Set()
  }))
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

const mockFireTrigger = vi.fn().mockReturnValue({
  triggered: false,
  newPlayerStates: null,
  animationEvents: [],
  statModsApplied: false,
  goAgain: false
});

vi.mock('../../triggers/TriggerProcessor.js', () => {
  return {
    default: class MockTriggerProcessor {
      constructor() {
        this.fireTrigger = mockFireTrigger;
      }
    }
  };
});

vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_ROUND_START: 'ON_ROUND_START' }
}));

import RoundManager from '../RoundManager.js';

describe('RoundManager - processRoundStartTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFireTrigger.mockReturnValue({
      triggered: false,
      newPlayerStates: null,
      animationEvents: [],
      statModsApplied: false,
      goAgain: false
    });
  });

  // Helper to create a drone
  const createDrone = (overrides = {}) => ({
    id: 'drone_1',
    name: 'TestDrone',
    attack: 2,
    hull: 3,
    shields: 1,
    speed: 2,
    isExhausted: false,
    statMods: [],
    ...overrides
  });

  // Helper to create player state
  const createPlayerState = (drones = {}) => ({
    name: 'Player',
    dronesOnBoard: {
      lane1: drones.lane1 || [],
      lane2: drones.lane2 || [],
      lane3: drones.lane3 || []
    },
    energy: 5,
    shipSections: {}
  });

  describe('TriggerProcessor delegation', () => {
    it('should call TriggerProcessor.fireTrigger for each drone on the board', () => {
      const drone1 = createDrone({ id: 'drone_1', name: 'Drone1' });
      const drone2 = createDrone({ id: 'drone_2', name: 'Drone2' });
      const player1State = createPlayerState({ lane1: [drone1], lane2: [drone2] });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(player1State, player2State, {});

      // player2 has 0 drones, player1 has 2 → 2 fireTrigger calls
      expect(mockFireTrigger).toHaveBeenCalledTimes(2);
    });

    it('should pass ON_ROUND_START trigger type', () => {
      const drone = createDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(mockFireTrigger).toHaveBeenCalledWith(
        'ON_ROUND_START',
        expect.objectContaining({
          triggeringPlayerId: 'player1',
          actingPlayerId: 'player1'
        })
      );
    });

    it('should pass correct lane in context', () => {
      const drone = createDrone();
      const player1State = createPlayerState({ lane2: [drone] });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(mockFireTrigger).toHaveBeenCalledWith(
        'ON_ROUND_START',
        expect.objectContaining({ lane: 'lane2' })
      );
    });

    it('should not call fireTrigger when no drones are on board', () => {
      const player1State = createPlayerState();
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(mockFireTrigger).not.toHaveBeenCalled();
    });
  });

  describe('Processing order', () => {
    it('should process AI drones (player2) before player drones (player1)', () => {
      const callOrder = [];
      mockFireTrigger.mockImplementation((type, ctx) => {
        callOrder.push(ctx.actingPlayerId);
        return { triggered: false, newPlayerStates: ctx.playerStates, animationEvents: [] };
      });

      const player1Drone = createDrone({ id: 'p1_drone' });
      const player2Drone = createDrone({ id: 'p2_drone' });
      const player1State = createPlayerState({ lane1: [player1Drone] });
      const player2State = createPlayerState({ lane1: [player2Drone] });

      RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(callOrder[0]).toBe('player2');
      expect(callOrder[1]).toBe('player1');
    });

    it('should process lanes in order: lane1, lane2, lane3', () => {
      const callOrder = [];
      mockFireTrigger.mockImplementation((type, ctx) => {
        callOrder.push(ctx.lane);
        return { triggered: false, newPlayerStates: ctx.playerStates, animationEvents: [] };
      });

      const lane1Drone = createDrone({ id: 'l1' });
      const lane2Drone = createDrone({ id: 'l2' });
      const lane3Drone = createDrone({ id: 'l3' });
      const player1State = createPlayerState({
        lane1: [lane1Drone],
        lane2: [lane2Drone],
        lane3: [lane3Drone]
      });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(callOrder).toEqual(['lane1', 'lane2', 'lane3']);
    });
  });

  describe('Return value', () => {
    it('should return updated player states when trigger fires', () => {
      const modifiedStates = {
        player1: { modified: true, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        player2: { modified: false, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      };
      mockFireTrigger.mockReturnValue({
        triggered: true,
        newPlayerStates: modifiedStates,
        animationEvents: []
      });

      const drone = createDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      const result = RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(result.player1.modified).toBe(true);
    });

    it('should return cloned states when no triggers fire', () => {
      const player1State = createPlayerState({ lane1: [createDrone()] });
      const player2State = createPlayerState();

      const result = RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(result.player1).toBeDefined();
      expect(result.player2).toBeDefined();
      // Should be a clone, not the same reference
      expect(result.player1).not.toBe(player1State);
    });

    it('should collect animation events from triggered abilities', () => {
      mockFireTrigger.mockReturnValue({
        triggered: true,
        newPlayerStates: {
          player1: createPlayerState({ lane1: [createDrone()] }),
          player2: createPlayerState()
        },
        animationEvents: [{ type: 'STAT_INCREASE', data: { stat: 'attack' } }]
      });

      const player1State = createPlayerState({ lane1: [createDrone()] });
      const player2State = createPlayerState();

      const result = RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(result.animationEvents).toHaveLength(1);
      expect(result.animationEvents[0].type).toBe('STAT_INCREASE');
    });

    it('should return empty animationEvents when nothing triggers', () => {
      const player1State = createPlayerState();
      const player2State = createPlayerState();

      const result = RoundManager.processRoundStartTriggers(player1State, player2State, {});

      expect(result.animationEvents).toEqual([]);
    });
  });

  describe('logCallback passthrough', () => {
    it('should pass logCallback to fireTrigger context', () => {
      mockFireTrigger.mockImplementation((type, ctx) => {
        return { triggered: false, newPlayerStates: ctx.playerStates, animationEvents: [] };
      });

      const drone = createDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();
      const logCallback = vi.fn();

      RoundManager.processRoundStartTriggers(player1State, player2State, {}, logCallback);

      expect(mockFireTrigger).toHaveBeenCalledWith(
        'ON_ROUND_START',
        expect.objectContaining({ logCallback })
      );
    });

    it('should work without logCallback (backward compatible)', () => {
      const drone = createDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      // No logCallback passed — should not throw
      const result = RoundManager.processRoundStartTriggers(player1State, player2State, {});
      expect(result.player1).toBeDefined();
    });
  });

  describe('State propagation', () => {
    it('should pass updated states from one trigger call to the next', () => {
      let callCount = 0;
      mockFireTrigger.mockImplementation((type, ctx) => {
        callCount++;
        if (callCount === 1) {
          // First call modifies state
          const updatedStates = JSON.parse(JSON.stringify(ctx.playerStates));
          updatedStates.player2._firstTriggerFired = true;
          return { triggered: true, newPlayerStates: updatedStates, animationEvents: [] };
        }
        // Second call should see the modified state
        return { triggered: false, newPlayerStates: ctx.playerStates, animationEvents: [] };
      });

      const player1State = createPlayerState({ lane1: [createDrone({ id: 'p1' })] });
      const player2State = createPlayerState({ lane1: [createDrone({ id: 'p2' })] });

      RoundManager.processRoundStartTriggers(player1State, player2State, {});

      // Second call (player1's drone) should receive the state modified by first call
      const secondCallStates = mockFireTrigger.mock.calls[1][1].playerStates;
      expect(secondCallStates.player2._firstTriggerFired).toBe(true);
    });
  });

  describe('readyDronesAndRestoreShields - triggerUsesThisRound reset', () => {
    it('should reset triggerUsesThisRound to 0 on tech entities', () => {
      const playerState = {
        ...createPlayerState({ lane1: [createDrone()] }),
        techSlots: {
          lane1: [{ id: 'tech1', name: 'RallyBeacon', triggerUsesThisRound: 1 }],
          lane2: [],
          lane3: []
        }
      };
      const opponentState = createPlayerState();

      const result = RoundManager.readyDronesAndRestoreShields(playerState, opponentState, {});

      expect(result.techSlots.lane1[0].triggerUsesThisRound).toBe(0);
      expect(result.techSlots.lane1[0].triggerUsesMap).toEqual({});
    });

    it('should not crash on tech without triggerUsesThisRound', () => {
      const playerState = {
        ...createPlayerState({ lane1: [createDrone()] }),
        techSlots: {
          lane1: [{ id: 'tech1', name: 'SomeTech' }],
          lane2: [],
          lane3: []
        }
      };
      const opponentState = createPlayerState();

      const result = RoundManager.readyDronesAndRestoreShields(playerState, opponentState, {});

      expect(result.techSlots.lane1[0].triggerUsesThisRound).toBe(0);
      expect(result.techSlots.lane1[0].triggerUsesMap).toEqual({});
    });
  });
});
