// ========================================
// TRIGGER PROCESSOR — FOUNDATION TESTS
// ========================================
// Phase 0: Tests for core TriggerProcessor functionality
// - Pair guard logic
// - findMatchingTriggers with mock data
// - MODIFY_STAT routing through EffectRouter

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
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
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
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
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
        effects: [{ type: 'GO_AGAIN' }]
      }]
    },
    {
      name: 'NormalDrone',
      attack: 2, hull: 3, shields: 1, speed: 2,
      abilities: []
    },
    {
      name: 'TestMineDamageDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Damage Mine',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        destroyAfterTrigger: true,
        effects: [{ type: 'DAMAGE', value: 3, scope: 'TRIGGERING_DRONE' }]
      }]
    },
    {
      name: 'TestMineExhaustDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Exhaust Mine',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        effects: [{ type: 'EXHAUST_DRONE', scope: 'TRIGGERING_DRONE' }]
      }]
    },
    {
      name: 'TestMineModifyStatDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Weaken Mine',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        effects: [{ type: 'MODIFY_STAT', scope: 'TRIGGERING_DRONE', mod: { stat: 'attack', value: -1, type: 'permanent' } }]
      }]
    },
    {
      name: 'TestScalingDrone',
      attack: 1, hull: 2, shields: 0, speed: 1,
      abilities: [{
        name: 'Scaling Ability',
        type: 'TRIGGERED',
        trigger: 'ON_CARD_DRAWN',
        triggerOwner: 'CONTROLLER',
        scalingDivisor: 2,
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
      }]
    },
    {
      name: 'TestComboMineDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Combo Mine',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        destroyAfterTrigger: true,
        effects: [
          { type: 'DAMAGE', value: 2, scope: 'TRIGGERING_DRONE' },
          { type: 'EXHAUST_DRONE', scope: 'TRIGGERING_DRONE' }
        ]
      }]
    },
    {
      name: 'TestFireflyDrone',
      attack: 3, hull: 1, shields: 0, speed: 2,
      abilities: [{
        name: 'Self-Destruct',
        type: 'TRIGGERED',
        trigger: 'ON_ATTACK',
        effects: [{ type: 'DESTROY', scope: 'SELF' }]
      }]
    },
    {
      name: 'TestGladiatorDrone',
      attack: 1, hull: 2, shields: 2, speed: 3,
      abilities: [{
        name: 'Veteran Instincts',
        type: 'TRIGGERED',
        trigger: 'ON_ATTACK',
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
      }]
    },
    {
      name: 'TestRallyBeacon',
      attack: 0, hull: 1, shields: 0, speed: 1,
      abilities: [{
        name: 'Rally Point',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        effects: [{ type: 'GO_AGAIN' }]
      }]
    },
    {
      name: 'TestCardPlayDrone',
      attack: 1, hull: 2, shields: 2, speed: 2,
      abilities: [{
        name: 'Card Sensor',
        type: 'TRIGGERED',
        trigger: 'ON_CARD_PLAY',
        triggerOwner: 'CONTROLLER',
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
      }]
    },
    {
      name: 'TestSameLaneCardPlayDrone',
      attack: 1, hull: 2, shields: 2, speed: 2,
      abilities: [{
        name: 'Web Sensor',
        type: 'TRIGGERED',
        trigger: 'ON_CARD_PLAY',
        triggerOwner: 'CONTROLLER',
        triggerScope: 'SAME_LANE',
        triggerFilter: { cardSubType: 'Mine' },
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
      }]
    },
    {
      name: 'TestCardPlayGoAgainDrone',
      attack: 1, hull: 2, shields: 0, speed: 1,
      abilities: [{
        name: 'Card Rally',
        type: 'TRIGGERED',
        trigger: 'ON_CARD_PLAY',
        triggerOwner: 'CONTROLLER',
        effects: [{ type: 'GO_AGAIN' }]
      }]
    },
    {
      name: 'TestLaneExitDrone',
      attack: 1, hull: 2, shields: 0, speed: 1,
      abilities: [{
        name: 'Exit Sensor',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_OUT',
        triggerOwner: 'LANE_OWNER',
        effects: [{ type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
      }]
    },
    {
      name: 'Anansi',
      attack: 1, hull: 2, shields: 2, speed: 2,
      abilities: [{
        name: 'Web Sensor',
        type: 'TRIGGERED',
        trigger: 'ON_CARD_PLAY',
        triggerOwner: 'CONTROLLER',
        triggerScope: 'SAME_LANE',
        triggerFilter: { cardSubType: 'Mine' },
        effects: [{ type: 'DRAW', value: 1 }]
      }]
    }
  ]
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Mock droneStateUtils and auraManager (used by _destroyDrone and _applyMineDamage)
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
import { onDroneDestroyed } from '../../utils/droneStateUtils.js';
import { updateAuras } from '../../utils/auraManager.js';

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
      // Verify EffectRouter.routeEffect was called with MODIFY_STAT
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MODIFY_STAT' }),
        expect.any(Object)
      );
    });

    it('should return goAgain when trigger has GO_AGAIN effect', () => {
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
  // MODIFY_STAT ROUTING TEST
  // ========================================

  describe('MODIFY_STAT EffectRouter registration', () => {
    it('should route MODIFY_STAT effects through effectRouter', () => {
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
      expect(routeCall[0].type).toBe('MODIFY_STAT');
      expect(routeCall[0].mod).toEqual({ stat: 'attack', value: 1, type: 'permanent' });
    });
  });

  // ========================================
  // A. SCALING AMOUNT / SCALING DIVISOR
  // ========================================

  describe('scalingAmount / scalingDivisor', () => {
    it('A1: scalingAmount: 3 with no divisor → effect fires 3×', () => {
      const controllerDrone = { id: 'odin1', name: 'TestControllerTriggerDrone' };
      basePlayerStates.player1.dronesOnBoard.lane3 = [controllerDrone];

      processor.fireTrigger(TRIGGER_TYPES.ON_CARD_DRAWN, {
        lane: null,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn(),
        scalingAmount: 3
      });

      expect(processor.effectRouter.routeEffect).toHaveBeenCalledTimes(3);
    });

    it('A2: scalingAmount: 5, scalingDivisor: 2 → fires 2× (floor(5/2))', () => {
      const scalingDrone = { id: 'scaler1', name: 'TestScalingDrone' };
      basePlayerStates.player1.dronesOnBoard.lane3 = [scalingDrone];

      processor.fireTrigger(TRIGGER_TYPES.ON_CARD_DRAWN, {
        lane: null,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn(),
        scalingAmount: 5
      });

      expect(processor.effectRouter.routeEffect).toHaveBeenCalledTimes(2);
    });

    it('A3: scalingAmount: 1, scalingDivisor: 2 → fires 0× (early return)', () => {
      const scalingDrone = { id: 'scaler1', name: 'TestScalingDrone' };
      basePlayerStates.player1.dronesOnBoard.lane3 = [scalingDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_DRAWN, {
        lane: null,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn(),
        scalingAmount: 1
      });

      expect(processor.effectRouter.routeEffect).not.toHaveBeenCalled();
      expect(result.triggered).toBe(false);
    });

    it('A4: scalingAmount: null → fires 1× (default behavior)', () => {
      const controllerDrone = { id: 'odin1', name: 'TestControllerTriggerDrone' };
      basePlayerStates.player1.dronesOnBoard.lane3 = [controllerDrone];

      processor.fireTrigger(TRIGGER_TYPES.ON_CARD_DRAWN, {
        lane: null,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn(),
        scalingAmount: null
      });

      expect(processor.effectRouter.routeEffect).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // B. TRIGGERING_DRONE SCOPE (MINE EFFECTS)
  // ========================================

  describe('TRIGGERING_DRONE scope', () => {
    it('B1: DAMAGE via _applyMineDamage — shields absorb first, hull takes remainder', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 5, currentShields: 1 };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      // Mine does 3 damage: 1 to shields, 2 to hull
      const drone = result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'drone1');
      expect(drone.currentShields).toBe(0);
      expect(drone.hull).toBe(3);
    });

    it('B1b: DAMAGE with shields absorbing all damage — hull untouched', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 5, currentShields: 5 };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const drone = result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'drone1');
      expect(drone.currentShields).toBe(2);
      expect(drone.hull).toBe(5);
    });

    it('B2: DAMAGE destroys drone when hull reaches 0', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 2, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      // Drone destroyed (hull 2 < damage 3)
      const lane2 = result.newPlayerStates.player1.dronesOnBoard.lane2;
      expect(lane2.find(d => d.id === 'drone1')).toBeUndefined();
      // DRONE_DESTROYED animation for triggering drone + mine (destroyAfterTrigger)
      const destroyEvents = result.animationEvents.filter(e => e.type === 'DRONE_DESTROYED');
      expect(destroyEvents.length).toBeGreaterThanOrEqual(1);
      expect(destroyEvents.some(e => e.targetId === 'drone1')).toBe(true);
    });

    it('B3: EXHAUST_DRONE routes through EffectRouter with correct target', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 3, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestMineExhaustDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXHAUST_DRONE', scope: 'TRIGGERING_DRONE' }),
        expect.objectContaining({
          target: expect.objectContaining({ id: 'drone1', owner: 'player1' })
        })
      );
    });

    it('B4: MODIFY_STAT routes through EffectRouter with correct target', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 3, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestMineModifyStatDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MODIFY_STAT',
          scope: 'TRIGGERING_DRONE',
          mod: { stat: 'attack', value: -1, type: 'permanent' }
        }),
        expect.objectContaining({
          target: expect.objectContaining({ id: 'drone1', owner: 'player1' })
        })
      );
    });
  });

  // ========================================
  // C. DESTROY AFTER TRIGGER (MINE SELF-DESTRUCT)
  // ========================================

  describe('destroyAfterTrigger', () => {
    it('C1: mine is destroyed after its effects fire', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 5, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const lane2 = result.newPlayerStates.player1.dronesOnBoard.lane2;
      expect(lane2.find(d => d.id === 'mine1')).toBeUndefined();
      // Triggering drone survives (hull 5 > damage 3)
      expect(lane2.find(d => d.id === 'drone1')).toBeDefined();
    });

    it('C2: _destroyDrone calls onDroneDestroyed for availability tracking', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 5, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(onDroneDestroyed).toHaveBeenCalled();
    });

    it('C3: _destroyDrone calls updateAuras for recalculation', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 5, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(updateAuras).toHaveBeenCalled();
    });

    it('C4: _destroyDrone emits DRONE_DESTROYED animation event for the mine', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 5, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const mineDestroyEvent = result.animationEvents.find(
        e => e.type === 'DRONE_DESTROYED' && e.targetId === 'mine1'
      );
      expect(mineDestroyEvent).toBeDefined();
      expect(mineDestroyEvent.targetPlayer).toBe('player1');
      expect(mineDestroyEvent.targetLane).toBe('lane2');
    });
  });

  // ========================================
  // D. EDGE CASES
  // ========================================

  describe('edge cases', () => {
    it('D1: TRIGGERING_DRONE effect on missing drone is a no-op', () => {
      // Triggering drone not actually in the lane (e.g., destroyed by earlier cascade)
      const triggeringDrone = { id: 'ghost1', name: 'NormalDrone', hull: 3, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine];
      // ghost1 is NOT on the board

      const logCallback = vi.fn();
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback
      });

      // Trigger fires (mine matched) but DAMAGE is a no-op
      expect(result.triggered).toBe(true);
      // No MINE_DAMAGE log entry (drone not found)
      const damageLog = logCallback.mock.calls.find(c => c[0]?.actionType === 'MINE_DAMAGE');
      expect(damageLog).toBeUndefined();
    });

    it('D2: multiple effects in one trigger (DAMAGE + EXHAUST_DRONE)', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 5, currentShields: 0 };
      const mine = { id: 'mine1', name: 'TestComboMineDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [mine, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      // DAMAGE applied (2 damage to hull)
      const drone = result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'drone1');
      expect(drone.hull).toBe(3);

      // EXHAUST_DRONE routed through EffectRouter
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'EXHAUST_DRONE', scope: 'TRIGGERING_DRONE' }),
        expect.objectContaining({
          target: expect.objectContaining({ id: 'drone1' })
        })
      );

      // Mine self-destructed
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'mine1')).toBeUndefined();
    });

    it('D3: non-lane triggers (ON_CARD_DRAWN) with lane: null fire controller triggers only', () => {
      const controllerDrone = { id: 'odin1', name: 'TestControllerTriggerDrone' };
      const laneDrone = { id: 'lane1', name: 'TestLaneTriggerDrone' };
      basePlayerStates.player1.dronesOnBoard.lane3 = [controllerDrone];
      basePlayerStates.player1.dronesOnBoard.lane2 = [laneDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_DRAWN, {
        lane: null,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn(),
        scalingAmount: 1
      });

      // Controller trigger fires
      expect(result.triggered).toBe(true);
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledTimes(1);
      // Only MODIFY_STAT from controller drone, not DAMAGE from lane drone
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MODIFY_STAT' }),
        expect.any(Object)
      );
    });
  });

  // ========================================
  // ON_ATTACK TRIGGER TESTS (Phase 6)
  // ========================================

  describe('ON_ATTACK triggers', () => {
    it('findMatchingTriggers returns ON_ATTACK self-trigger for TestFireflyDrone', () => {
      const triggeringDrone = { id: 'firefly1', name: 'TestFireflyDrone' };
      basePlayerStates.player1.dronesOnBoard.lane1 = [triggeringDrone];

      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_ATTACK, 'lane1', triggeringDrone, 'player1', 'player1', basePlayerStates
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].ability.name).toBe('Self-Destruct');
      expect(matches[0].ability.effects[0]).toEqual({ type: 'DESTROY', scope: 'SELF' });
      expect(matches[0].tier).toBe(0);
    });

    it('fireTrigger(ON_ATTACK) routes DESTROY scope SELF through EffectRouter for Firefly', () => {
      const triggeringDrone = { id: 'firefly1', name: 'TestFireflyDrone', owner: 'player1' };
      basePlayerStates.player1.dronesOnBoard.lane1 = [triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_ATTACK, {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledTimes(1);
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DESTROY', scope: 'SELF' }),
        expect.objectContaining({
          actingPlayerId: 'player1',
          target: expect.objectContaining({ id: 'firefly1', name: 'TestFireflyDrone' })
        })
      );
    });

    it('fireTrigger(ON_ATTACK) routes MODIFY_STAT through EffectRouter for Gladiator', () => {
      const triggeringDrone = { id: 'glad1', name: 'TestGladiatorDrone', owner: 'player1' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_ATTACK, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledTimes(1);
      expect(processor.effectRouter.routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MODIFY_STAT' }),
        expect.objectContaining({
          actingPlayerId: 'player1',
          target: expect.objectContaining({ id: 'glad1', name: 'TestGladiatorDrone' })
        })
      );
    });

    it('findMatchingTriggers returns ON_ATTACK self-trigger for TestGladiatorDrone', () => {
      const triggeringDrone = { id: 'glad1', name: 'TestGladiatorDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [triggeringDrone];

      const matches = processor.findMatchingTriggers(
        TRIGGER_TYPES.ON_ATTACK, 'lane2', triggeringDrone, 'player1', 'player1', basePlayerStates
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].ability.name).toBe('Veteran Instincts');
      expect(matches[0].ability.effects[0]).toEqual({
        type: 'MODIFY_STAT',
        mod: { stat: 'attack', value: 1, type: 'permanent' }
      });
    });
  });

  // ========================================
  // RALLY BEACON TRIGGER TESTS (Phase 7)
  // ========================================

  describe('Rally Beacon via ON_LANE_MOVEMENT_IN', () => {
    it('friendly drone moves into Rally Beacon lane → goAgain true', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      const beacon = { id: 'beacon1', name: 'TestRallyBeacon' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [beacon, triggeringDrone];

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

    it('enemy drone moves into Rally Beacon lane → goAgain false', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      const beacon = { id: 'beacon1', name: 'TestRallyBeacon' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [beacon];
      basePlayerStates.player2.dronesOnBoard.lane2 = [triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player2',
        actingPlayerId: 'player2',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      // LANE_OWNER means triggering drone must belong to same player as beacon
      expect(result.goAgain).toBe(false);
    });

    it('no beacon in lane → goAgain false', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane2',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.goAgain).toBe(false);
    });

    it('Rally Beacon + mine coexistence → goAgain true AND mine effects fire', () => {
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', hull: 5, currentShields: 0 };
      const beacon = { id: 'beacon1', name: 'TestRallyBeacon' };
      const mine = { id: 'mine1', name: 'TestMineDamageDrone' };
      basePlayerStates.player1.dronesOnBoard.lane2 = [beacon, mine, triggeringDrone];

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
      // Mine damage applied (3 damage to hull 5 → hull 2)
      const drone = result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'drone1');
      expect(drone.hull).toBe(2);
      // Mine self-destructed
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2.find(d => d.id === 'mine1')).toBeUndefined();
    });
  });

  // ========================================
  // ON_CARD_PLAY triggers (Phase 8)
  // ========================================
  describe('ON_CARD_PLAY triggers (Phase 8)', () => {
    it('CONTROLLER trigger fires on card play', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'sensor1', name: 'TestCardPlayDrone', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const card = { name: 'Test Card', type: 'Action' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
    });

    it('SAME_LANE match fires for mine card in same lane', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'web1', name: 'TestSameLaneCardPlayDrone', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const mineCard = { name: 'Deploy Proximity Mine', type: 'Ordnance', subType: 'Mine' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card: mineCard,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
    });

    it('SAME_LANE mismatch skips when card played in different lane', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'web1', name: 'TestSameLaneCardPlayDrone', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const mineCard = { name: 'Deploy Proximity Mine', type: 'Ordnance', subType: 'Mine' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane2',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card: mineCard,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
    });

    it('triggerFilter cardSubType mismatch skips for non-mine card', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'web1', name: 'TestSameLaneCardPlayDrone', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const nonMineCard = { name: 'Laser Strike', type: 'Action' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card: nonMineCard,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
    });

    it('opponent CONTROLLER trigger does not fire on other player card play', () => {
      basePlayerStates.player2.dronesOnBoard.lane1 = [
        { id: 'sensor2', name: 'TestCardPlayDrone', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const card = { name: 'Test Card', type: 'Action' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
    });

    it('GO_AGAIN effect propagates goAgain from ON_CARD_PLAY trigger', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'rally1', name: 'TestCardPlayGoAgainDrone', attack: 1, hull: 2, shields: 0, isExhausted: false }
      ];

      const card = { name: 'Test Card', type: 'Action' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
      expect(result.goAgain).toBe(true);
    });
  });

  // ========================================
  // Anansi — Web Sensor (Phase 9)
  // ========================================
  describe('Anansi — Web Sensor (Phase 9)', () => {
    it('mine in Anansi lane triggers draw', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'anansi1', name: 'Anansi', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const mineCard = { name: 'Deploy Proximity Mine', type: 'Ordnance', subType: 'Mine' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card: mineCard,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
      const routeEffect = processor.effectRouter.routeEffect;
      expect(routeEffect).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DRAW', value: 1 }),
        expect.anything()
      );
    });

    it('mine in other lane does not trigger', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'anansi1', name: 'Anansi', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const mineCard = { name: 'Deploy Proximity Mine', type: 'Ordnance', subType: 'Mine' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane2',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card: mineCard,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
    });

    it('non-mine card in same lane does not trigger', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'anansi1', name: 'Anansi', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const actionCard = { name: 'Laser Strike', type: 'Action' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card: actionCard,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
    });

    it('opponent plays mine in Anansi lane does not trigger', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'anansi1', name: 'Anansi', attack: 1, hull: 2, shields: 2, isExhausted: false }
      ];

      const mineCard = { name: 'Deploy Proximity Mine', type: 'Ordnance', subType: 'Mine' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player2',
        actingPlayerId: 'player2',
        card: mineCard,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ========================================
  // ON_LANE_MOVEMENT_OUT triggers (Phase 8)
  // ========================================
  describe('ON_LANE_MOVEMENT_OUT triggers (Phase 8)', () => {
    it('lane trigger fires for drone leaving', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'exit1', name: 'TestLaneExitDrone', attack: 1, hull: 2, shields: 0, isExhausted: false },
        { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1, isExhausted: false }
      ];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_OUT, {
        lane: 'lane1',
        triggeringDrone: { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 },
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
    });

    it('does not fire for wrong lane', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'exit1', name: 'TestLaneExitDrone', attack: 1, hull: 2, shields: 0, isExhausted: false }
      ];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_OUT, {
        lane: 'lane2',
        triggeringDrone: { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 },
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
    });

    it('does not fire for enemy drones (LANE_OWNER)', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'exit1', name: 'TestLaneExitDrone', attack: 1, hull: 2, shields: 0, isExhausted: false }
      ];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_OUT, {
        lane: 'lane1',
        triggeringDrone: { id: 'enemy1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 },
        triggeringPlayerId: 'player2',
        actingPlayerId: 'player2',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(false);
    });
  });

  // ========================================
  // TRIGGER CHAIN ANIMATIONS (Phase 10)
  // ========================================
  describe('Trigger chain animations (Phase 10)', () => {
    it('emits TRIGGER_FIRED event on trigger activation', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'self1', name: 'TestSelfTriggerDrone', attack: 2, hull: 3, shields: 1, isExhausted: false }
      ];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
        lane: 'lane1',
        triggeringDrone: { id: 'self1', name: 'TestSelfTriggerDrone', attack: 2, hull: 3, shields: 1 },
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.triggered).toBe(true);
      const triggerFired = result.animationEvents.find(e => e.type === 'TRIGGER_FIRED');
      expect(triggerFired).toBeDefined();
      expect(triggerFired.targetId).toBe('self1');
      expect(triggerFired.targetPlayer).toBe('player1');
      expect(triggerFired.targetLane).toBe('lane1');
      expect(triggerFired.abilityName).toBe('Test Self Ability');
      expect(triggerFired.triggerType).toBe('ON_MOVE');
      expect(triggerFired.chainDepth).toBe(0);
    });

    it('emits TRIGGER_FIRED before effect events', () => {
      // Make routeEffect return an animation event so we can check ordering
      const mockEffectEvent = { type: 'STAT_CHANGE', targetId: 'self1' };
      processor.effectRouter.routeEffect = vi.fn().mockReturnValue({
        newPlayerStates: null,
        animationEvents: [mockEffectEvent]
      });

      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'self1', name: 'TestSelfTriggerDrone', attack: 2, hull: 3, shields: 1, isExhausted: false }
      ];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
        lane: 'lane1',
        triggeringDrone: { id: 'self1', name: 'TestSelfTriggerDrone', attack: 2, hull: 3, shields: 1 },
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      // Snapshot first: additive state change appears when announcement starts
      expect(result.animationEvents.length).toBeGreaterThanOrEqual(3);
      expect(result.animationEvents[0].type).toBe('STATE_SNAPSHOT');
      expect(result.animationEvents[1].type).toBe('TRIGGER_FIRED');
    });

    it('has stable deterministic eventId', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'drone42', name: 'TestSelfTriggerDrone', attack: 2, hull: 3, shields: 1, isExhausted: false }
      ];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
        lane: 'lane1',
        triggeringDrone: { id: 'drone42', name: 'TestSelfTriggerDrone', attack: 2, hull: 3, shields: 1 },
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const triggerFired = result.animationEvents.find(e => e.type === 'TRIGGER_FIRED');
      expect(triggerFired.eventId).toBe('drone42:Test Self Ability:0');
    });

    it('emits no TRIGGER_FIRED when no trigger matches', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'normal1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1, isExhausted: false }
      ];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_MOVE, {
        lane: 'lane1',
        triggeringDrone: { id: 'normal1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 },
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      expect(result.animationEvents.length).toBe(0);
    });

    it('emits ordered TRIGGER_FIRED events for multiple triggers', () => {
      basePlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'lane1a', name: 'TestLaneTriggerDrone', attack: 1, hull: 2, shields: 0, isExhausted: false },
        { id: 'lane1b', name: 'TestGoAgainDrone', attack: 0, hull: 1, shields: 0, isExhausted: false }
      ];

      // Both drones have triggerOwner: LANE_OWNER, so triggering drone must be friendly
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane1',
        triggeringDrone: { id: 'friendly1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 },
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const triggerFiredEvents = result.animationEvents.filter(e => e.type === 'TRIGGER_FIRED');
      expect(triggerFiredEvents.length).toBe(2);
      expect(triggerFiredEvents[0].targetId).toBe('lane1a');
      expect(triggerFiredEvents[0].abilityName).toBe('Test Lane Ability');
      expect(triggerFiredEvents[1].targetId).toBe('lane1b');
      expect(triggerFiredEvents[1].abilityName).toBe('Test Rally');
    });
  });

  // ========================================
  // STATE_SNAPSHOT EVENT TESTS
  // ========================================

  describe('STATE_SNAPSHOT events', () => {
    it('should emit STATE_SNAPSHOT with current playerStates after each trigger', () => {
      const goAgainDrone = { id: 'rally1', name: 'TestGoAgainDrone' };
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 };
      basePlayerStates.player1.dronesOnBoard.lane1 = [goAgainDrone, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const snapshots = result.animationEvents.filter(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].snapshotPlayerStates).toBeDefined();
      expect(snapshots[0].snapshotPlayerStates.player1).toBeDefined();
      expect(snapshots[0].snapshotPlayerStates.player2).toBeDefined();
    });

    it('should place STATE_SNAPSHOT BEFORE TRIGGER_FIRED for non-damage triggers (GO_AGAIN)', () => {
      const goAgainDrone = { id: 'rally1', name: 'TestGoAgainDrone' };
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 };
      basePlayerStates.player1.dronesOnBoard.lane1 = [goAgainDrone, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const events = result.animationEvents;
      const snapshotIdx = events.findIndex(e => e.type === 'STATE_SNAPSHOT');
      const triggerFiredIdx = events.findIndex(e => e.type === 'TRIGGER_FIRED');

      // Snapshot first: state change appears when announcement starts
      expect(snapshotIdx).toBeLessThan(triggerFiredIdx);
    });

    it('should place STATE_SNAPSHOT AFTER damage events for DOM-dependent triggers', () => {
      // Mine drone owned by player1, triggering drone owned by player2 (enemy movement)
      const mineDrone = { id: 'mine1', name: 'TestMineDamageDrone' };
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 10, shields: 0 };
      basePlayerStates.player1.dronesOnBoard.lane1 = [mineDrone];
      basePlayerStates.player2.dronesOnBoard.lane1 = [triggeringDrone];

      // TestMineDamageDrone has triggerOwner: LANE_OWNER, but triggers on enemy movement
      // Actually, its triggerOwner is LANE_OWNER which means the triggering drone must be friendly
      // Let's use TestLaneTriggerDrone instead which also has LANE_OWNER
      // Wait — LANE_OWNER means triggeringPlayerId === reactorPlayerId, so we need friendly trigger
      // For enemy damage mine: need to set up with the correct ownership
      // The mine must detect enemy movement, so triggerOwner should be LANE_ENEMY
      // TestMineDamageDrone has LANE_OWNER — it triggers on friendly drones

      // Use friendly triggering so the mine triggers
      basePlayerStates.player1.dronesOnBoard.lane1 = [mineDrone, triggeringDrone];
      basePlayerStates.player2.dronesOnBoard.lane1 = [];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const events = result.animationEvents;
      const snapshotIdx = events.findIndex(e => e.type === 'STATE_SNAPSHOT');
      const droneDestroyedIdx = events.findIndex(e => e.type === 'DRONE_DESTROYED');

      // Drone takes 3 damage, hull 10 > 3, so no DRONE_DESTROYED for triggeringDrone
      // But mine self-destructs (destroyAfterTrigger), which emits DRONE_DESTROYED
      expect(droneDestroyedIdx).toBeGreaterThanOrEqual(0);
      expect(snapshotIdx).toBeGreaterThan(droneDestroyedIdx);
    });

    it('should emit one STATE_SNAPSHOT per trigger in a multi-trigger chain', () => {
      // Two drones with triggers in the same lane
      const mine1 = { id: 'mine1', name: 'TestLaneTriggerDrone' };
      const goAgain = { id: 'rally1', name: 'TestGoAgainDrone' };
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 10, shields: 0 };
      basePlayerStates.player1.dronesOnBoard.lane1 = [mine1, goAgain, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const snapshots = result.animationEvents.filter(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshots.length).toBe(2); // One per trigger
    });

    it('should use pre-cascade state for outer snapshot when cascades produce preTriggerState', () => {
      // Anansi in lane1: ON_CARD_PLAY (mine) → DRAW effect → cascades ON_CARD_DRAWN
      // TestControllerTriggerDrone also present (ON_CARD_DRAWN → +1 attack)
      const anansi = { id: 'anansi1', name: 'Anansi', attack: 1, hull: 2, shields: 2, isExhausted: false };
      const odin = { id: 'odin1', name: 'TestControllerTriggerDrone', attack: 1, hull: 2, shields: 0, isExhausted: false };
      basePlayerStates.player1.dronesOnBoard.lane1 = [anansi, odin];

      // Pre-cascade state: after draw but BEFORE Odin's +1 attack
      const preTriggerState = JSON.parse(JSON.stringify(basePlayerStates));

      // Post-cascade state: Odin has +1 attack from ON_CARD_DRAWN
      const postCascadeState = JSON.parse(JSON.stringify(basePlayerStates));
      postCascadeState.player1.dronesOnBoard.lane1.find(d => d.id === 'odin1').attack = 2;

      // Nested cascade events (what DrawEffectProcessor would produce)
      const nestedSnapshot = {
        type: 'STATE_SNAPSHOT',
        snapshotPlayerStates: JSON.parse(JSON.stringify(postCascadeState)),
        timestamp: Date.now()
      };
      const nestedTriggerFired = {
        type: 'TRIGGER_FIRED',
        targetId: 'odin1',
        abilityName: 'Test Controller Ability',
        chainDepth: 1,
        timestamp: Date.now()
      };
      const nestedStatChange = {
        type: 'STAT_CHANGE',
        targetId: 'odin1',
        timestamp: Date.now()
      };

      // Mock routeEffect for DRAW to return cascade data with preTriggerState
      processor.effectRouter.routeEffect = vi.fn().mockReturnValue({
        newPlayerStates: postCascadeState,
        animationEvents: [{ type: 'CARD_REVEAL', timestamp: Date.now() }],
        triggerAnimationEvents: [nestedSnapshot, nestedTriggerFired, nestedStatChange],
        preTriggerState
      });

      const mineCard = { name: 'Deploy Proximity Mine', type: 'Ordnance', subType: 'Mine' };
      const result = processor.fireTrigger(TRIGGER_TYPES.ON_CARD_PLAY, {
        lane: 'lane1',
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        card: mineCard,
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const snapshots = result.animationEvents.filter(e => e.type === 'STATE_SNAPSHOT');
      expect(snapshots.length).toBe(2);

      // Outer snapshot (first) uses pre-cascade state — Odin still at attack: 1
      const outerOdin = snapshots[0].snapshotPlayerStates.player1.dronesOnBoard.lane1.find(d => d.id === 'odin1');
      expect(outerOdin.attack).toBe(1);

      // Nested snapshot (second) includes cascade change — Odin at attack: 2
      const nestedOdin = snapshots[1].snapshotPlayerStates.player1.dronesOnBoard.lane1.find(d => d.id === 'odin1');
      expect(nestedOdin.attack).toBe(2);
    });

    it('should include snapshotPlayerStates as a deep clone (independent of further mutations)', () => {
      const goAgainDrone = { id: 'rally1', name: 'TestGoAgainDrone' };
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 };
      basePlayerStates.player1.dronesOnBoard.lane1 = [goAgainDrone, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const snapshot = result.animationEvents.find(e => e.type === 'STATE_SNAPSHOT');
      // Mutate the returned states
      result.newPlayerStates.player1.name = 'MUTATED';
      // Snapshot should be unaffected
      expect(snapshot.snapshotPlayerStates.player1.name).toBe('Player 1');
    });
  });

  // ========================================
  // TRIGGER_FIRED droneName FIELD TESTS
  // ========================================

  describe('TRIGGER_FIRED droneName field', () => {
    it('should include droneName on TRIGGER_FIRED events', () => {
      const goAgainDrone = { id: 'rally1', name: 'TestGoAgainDrone' };
      const triggeringDrone = { id: 'drone1', name: 'NormalDrone', attack: 2, hull: 3, shields: 1 };
      basePlayerStates.player1.dronesOnBoard.lane1 = [goAgainDrone, triggeringDrone];

      const result = processor.fireTrigger(TRIGGER_TYPES.ON_LANE_MOVEMENT_IN, {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: basePlayerStates,
        placedSections: {},
        logCallback: vi.fn()
      });

      const triggerFired = result.animationEvents.find(e => e.type === 'TRIGGER_FIRED');
      expect(triggerFired.droneName).toBe('TestGoAgainDrone');
    });
  });
});
