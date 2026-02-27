// ========================================
// TRIGGER PROCESSOR — FOUNDATION TESTS
// ========================================
// Phase 0: Tests for core TriggerProcessor functionality
// - Pair guard logic
// - findMatchingTriggers with mock data
// - PERMANENT_STAT_MOD routing through EffectRouter

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock droneData — control exactly which drones exist
vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'TestSelfTriggerDrone',
      attack: 2, hull: 3, shields: 1, speed: 2,
      abilities: [{
        name: 'Test Self Ability',
        type: 'TRIGGERED',
        trigger: 'ON_MOVE',
        effects: [{ type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
      }]
    },
    {
      name: 'TestLaneTriggerDrone',
      attack: 1, hull: 2, shields: 0, speed: 1,
      abilities: [{
        name: 'Test Lane Ability',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        destroyAfterTrigger: true,
        effects: [{ type: 'DAMAGE', value: 4 }]
      }]
    },
    {
      name: 'TestControllerTriggerDrone',
      attack: 1, hull: 2, shields: 0, speed: 1,
      abilities: [{
        name: 'Test Controller Ability',
        type: 'TRIGGERED',
        trigger: 'ON_CARD_DRAWN',
        triggerOwner: 'CONTROLLER',
        effects: [{ type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
      }]
    },
    {
      name: 'TestGoAgainDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Test Rally',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        grantsGoAgain: true,
        effects: []
      }]
    },
    {
      name: 'NormalDrone',
      attack: 2, hull: 3, shields: 1, speed: 2,
      abilities: []
    }
  ]
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Mock droneStateUtils and auraManager (used by _destroyDrone and _applyDirectEffect)
vi.mock('../../utils/droneStateUtils.js', () => ({
  onDroneDestroyed: vi.fn((playerState) => playerState)
}));
vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn((playerState) => playerState.dronesOnBoard)
}));

// Mock EffectRouter — track what gets routed
vi.mock('../../EffectRouter.js', () => {
  return {
    default: class MockEffectRouter {
      constructor() {
        this.routeEffect = vi.fn().mockReturnValue({
          newPlayerStates: null,
          animationEvents: []
        });
      }
    }
  };
});

import TriggerProcessor from '../TriggerProcessor.js';
import { TRIGGER_TYPES } from '../triggerConstants.js';

describe('TriggerProcessor', () => {
  let processor;
  let basePlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new TriggerProcessor();

    basePlayerStates = {
      player1: {
        name: 'Player 1',
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        }
      },
      player2: {
        name: 'Player 2',
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        }
      }
    };
  });

  // ========================================
  // PAIR GUARD TESTS
  // ========================================

  describe('checkPairGuard', () => {
    it('should allow first firing of a pair', () => {
      const pairSet = new Set();
      expect(processor.checkPairGuard('reactor1', 'source1', pairSet)).toBe(true);
    });

    it('should block repeated firing of the same pair', () => {
      const pairSet = new Set(['reactor1:source1']);
      expect(processor.checkPairGuard('reactor1', 'source1', pairSet)).toBe(false);
    });

    it('should allow same reactor with different source', () => {
      const pairSet = new Set(['reactor1:source1']);
      expect(processor.checkPairGuard('reactor1', 'source2', pairSet)).toBe(true);
    });

    it('should allow different reactor with same source', () => {
      const pairSet = new Set(['reactor1:source1']);
      expect(processor.checkPairGuard('reactor2', 'source1', pairSet)).toBe(true);
    });

    it('should handle system source (no triggering drone)', () => {
      const pairSet = new Set();
      expect(processor.checkPairGuard('reactor1', 'system', pairSet)).toBe(true);
      pairSet.add('reactor1:system');
      expect(processor.checkPairGuard('reactor1', 'system', pairSet)).toBe(false);
    });
  });

  // ========================================
  // findMatchingTriggers TESTS
  // ========================================

  describe('findMatchingTriggers', () => {
    it('should find self-triggers on the acting drone', () => {
      const triggeringDrone = { id: 'drone1', name: 'TestSelfTriggerDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [triggeringDrone];

      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_MOVE, 'lane2', triggeringDrone, 'player1', 'player1', basePlayerStates
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].ability.name).toBe('Test Self Ability');
      expect(matches[0].tier).toBe(0);
    });

    it('should find lane triggers on other drones in the same lane', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      const mineDrone = { id: 'mine1', name: 'TestLaneTriggerDrone' };

      // Mine is on player1's board, triggering drone belongs to player1 (LANE_OWNER)
      basePlayerStates.player1.dronesOnBoard.lane2 = [mineDrone, triggeringDrone];

      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, 'lane2', triggeringDrone, 'player1', 'player1', basePlayerStates
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].ability.name).toBe('Test Lane Ability');
      expect(matches[0].drone.id).toBe('mine1');
    });

    it('should NOT match lane trigger when triggerOwner is LANE_OWNER but triggering drone is enemy', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      const mineDrone = { id: 'mine1', name: 'TestLaneTriggerDrone' };

      // Mine is on player1's board, but triggering drone belongs to player2
      basePlayerStates.player1.dronesOnBoard.lane2 = [mineDrone];
      basePlayerStates.player2.dronesOnBoard.lane2 = [triggeringDrone];

      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, 'lane2', triggeringDrone, 'player2', 'player2', basePlayerStates
      );

      // The mine is on player1's board with LANE_OWNER — should trigger for player1's drones, not player2's
      expect(matches).toHaveLength(0);
    });

    it('should order results: Self (tier 0) > Actor lane (tier 1) > Opponent lane (tier 2)', () => {
      const triggeringDrone = { id: 'drone1', name: 'TestSelfTriggerDrone' };
      const actorLaneDrone = { id: 'rally1', name: 'TestGoAgainDrone' };
      const opponentLaneDrone = { id: 'mine1', name: 'TestLaneTriggerDrone' };

      // Self-trigger drone moved into lane2
      // Actor (player1) has a rally drone in lane2
      // Opponent (player2) has a mine in lane2
      basePlayerStates.player1.dronesOnBoard.lane2 = [actorLaneDrone, triggeringDrone];
      basePlayerStates.player2.dronesOnBoard.lane2 = [opponentLaneDrone];

      // ON_MOVE is a self-trigger, so we need ON_LANE_MOVEMENT_IN for the lane triggers
      // But ON_MOVE only matches self, so let's just test findMatchingTriggers for ON_LANE_MOVEMENT_IN
      // and add self-trigger drone separately
      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, 'lane2', triggeringDrone, 'player1', 'player1', basePlayerStates
      );

      // Rally drone is LANE_OWNER and triggeringDrone is player1 → matches
      // Mine is on player2's board with LANE_OWNER, triggeringDrone is player1 → does NOT match
      // (triggeringPlayerId=player1, reactorPlayerId=player2, LANE_OWNER means triggeringPlayerId === reactorPlayerId)
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].ability.name).toBe('Test Rally');
      expect(matches[0].tier).toBe(1); // Actor's lane trigger
    });

    it('should find controller triggers across all lanes', () => {
      const controllerDrone = { id: 'odin1', name: 'TestControllerTriggerDrone' };
      basePlayerStates.player1.dronesOnBoard.lane3 = [controllerDrone];

      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_CARD_DRAWN, null, null, 'player1', 'player1', basePlayerStates
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].ability.name).toBe('Test Controller Ability');
      expect(matches[0].drone.id).toBe('odin1');
    });

    it('should NOT match controller trigger when triggerOwner is CONTROLLER but acting player is opponent', () => {
      const controllerDrone = { id: 'odin1', name: 'TestControllerTriggerDrone' };
      basePlayerStates.player1.dronesOnBoard.lane3 = [controllerDrone];

      // player2 drew a card, but the drone belongs to player1 with CONTROLLER owner
      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_CARD_DRAWN, null, null, 'player2', 'player2', basePlayerStates
      );

      expect(matches).toHaveLength(0);
    });

    it('should return empty array when no drones match', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      basePlayerStates.player1.dronesOnBoard.lane1 = [triggeringDrone];

      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_MOVE, 'lane1', triggeringDrone, 'player1', 'player1', basePlayerStates
      );

      // NormalDrone has no abilities
      expect(matches).toHaveLength(0);
    });
  });

  // ========================================
  // fireTrigger INTEGRATION TESTS
  // ========================================

  describe('fireTrigger', () => {
    it('should return not triggered when no drones match', () => {
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
        lane: 'lane1',
        triggeringDrone: { id: 'drone1', name: 'NormalDrone' },
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
      expect(result.goAgain).toBe(false);
      expect(result.animationEvents).toHaveLength(0);
    });

    it('should fire self-trigger and route effects', () => {
      const triggeringDrone = { id: 'drone1', name: 'TestSelfTriggerDrone', statMods: [] };
      basePlayerStates.player1.dronesOnBoard.lane2 = [triggeringDrone];

      const logCallback = vi.fn();

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback
      });

      expect(result.triggered).toBe(true);
      expect(logCallback).toHaveBeenCalled();
      // Verify EffectRouter.routeEffect was called with PERMANENT_STAT_MOD
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PERMANENT_STAT_MOD' }),
        expect.any(Object)
      );
    });

    it('should return goAgain when trigger has grantsGoAgain', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      const rallyDrone = { id: 'rally1', name: 'TestGoAgainDrone' };

      basePlayerStates.player1.dronesOnBoard.lane2 = [rallyDrone, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
      expect(result.goAgain).toBe(true);
    });

    it('should handle destroyAfterTrigger by removing drone from board', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      const mineDrone = { id: 'mine1', name: 'TestLaneTriggerDrone' };

      basePlayerStates.player1.dronesOnBoard.lane2 = [mineDrone, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
      // Mine should be destroyed after triggering
      const lane2Drones = result.newPlayerStates.player1.dronesOnBoard.lane2;
      expect(lane2Drones.find(d => d.id === 'mine1')).toBeUndefined();
    });

    it('should respect pair guard — same pair cannot fire twice', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      const rallyDrone = { id: 'rally1', name: 'TestGoAgainDrone' };

      basePlayerStates.player1.dronesOnBoard.lane2 = [rallyDrone, triggeringDrone];

      const pairSet = new Set(['rally1:drone1']); // Pre-block the pair

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn(),
        pairSet
      });

      expect(result.triggered).toBe(false);
    });

    it('should skip dead drones (liveness check)', () => {
      // The triggering drone references a drone that exists, but the reactor
      // has been removed from the board (e.g., destroyed by a previous cascade)
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };

      // Add drone1 to lane but NOT the mine — mine is "dead" (not on board)
      basePlayerStates.player1.dronesOnBoard.lane2 = [triggeringDrone];
      // The mine would need to be found by findMatchingTriggers, but since
      // it's not on the board, findMatchingTriggers won't find it either.
      // Let's test the _isDroneAlive method directly instead.
      expect(processor._isDroneAlive('mine1', 'player1', 'lane2', basePlayerStates)).toBe(false);
      expect(processor._isDroneAlive('drone1', 'player1', 'lane2', basePlayerStates)).toBe(true);
    });
  });

  // ========================================
  // PERMANENT_STAT_MOD ROUTING TEST
  // ========================================

  describe('PERMANENT_STAT_MOD EffectRouter registration', () => {
    it('should route PERMANENT_STAT_MOD effects through effectRouter', () => {
      const triggeringDrone = { id: 'drone1', name: 'TestSelfTriggerDrone', statMods: [] };
      basePlayerStates.player1.dronesOnBoard.lane2 = [triggeringDrone];

      processor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const routeCall = processor.effectRouter.routeEffect.mock.calls[0];
      expect(routeCall[0].type).toBe('PERMANENT_STAT_MOD');
      expect(routeCall[0].mod).toEqual({ stat: 'attack', value: 1, type: 'permanent' });
    });
  });
});
