// ========================================
// ROUND MANAGER - ON_ROUND_START TRIGGER TESTS
// ========================================
// TDD: Tests written first for processRoundStartTriggers
// Tests the ON_ROUND_START ability trigger processing

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({
    maxShields: drone.shields || 1,
    attack: drone.attack || 1,
    speed: drone.speed || 1,
    keywords: new Set()
  }))
}));

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

import RoundManager from './RoundManager.js';

describe('RoundManager - processRoundStartTriggers', () => {
  let mockEffectRouter;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock effect router
    mockEffectRouter = {
      routeEffect: vi.fn().mockReturnValue({
        newPlayerStates: null,
        animationEvents: []
      })
    };
  });

  // Helper to create a drone with ON_ROUND_START ability
  const createRoundStartDrone = (overrides = {}) => ({
    id: 'war_machine_1',
    name: 'War Machine',
    attack: 2,
    hull: 3,
    shields: 1,
    speed: 2,
    isExhausted: false,
    statMods: [],
    abilities: [{
      name: 'Combat Escalation',
      description: 'Start of Round: Gain +1 attack permanently.',
      type: 'TRIGGERED',
      trigger: 'ON_ROUND_START',
      effects: [{ type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1 } }]
    }],
    ...overrides
  });

  // Helper to create a drone without ON_ROUND_START ability
  const createNormalDrone = (overrides = {}) => ({
    id: 'dart_1',
    name: 'Dart',
    attack: 1,
    hull: 2,
    shields: 0,
    speed: 3,
    isExhausted: false,
    statMods: [],
    abilities: [],
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

  describe('Processing ON_ROUND_START abilities', () => {
    it('should process ON_ROUND_START abilities for drones on board', () => {
      const drone = createRoundStartDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(mockEffectRouter.routeEffect).toHaveBeenCalled();
    });

    it('should skip drones without ON_ROUND_START abilities', () => {
      const drone = createNormalDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(mockEffectRouter.routeEffect).not.toHaveBeenCalled();
    });

    it('should skip PASSIVE abilities even with trigger property', () => {
      const drone = {
        id: 'test_1',
        name: 'Test',
        abilities: [{
          type: 'PASSIVE',
          trigger: 'ON_ROUND_START',  // Shouldn't be processed - PASSIVE takes precedence
          effect: { type: 'GRANT_KEYWORD' }
        }]
      };
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(mockEffectRouter.routeEffect).not.toHaveBeenCalled();
    });

    it('should process drones with single effect', () => {
      const drone = {
        id: 'signal_beacon_1',
        name: 'Signal Beacon',
        abilities: [{
          type: 'TRIGGERED',
          trigger: 'ON_ROUND_START',
          effect: { type: 'INCREASE_THREAT', value: 1 }
        }]
      };
      const player2State = createPlayerState({ lane1: [drone] });
      const player1State = createPlayerState();

      RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(mockEffectRouter.routeEffect).toHaveBeenCalledWith(
        { type: 'INCREASE_THREAT', value: 1 },
        expect.objectContaining({
          actingPlayerId: 'player2',
          sourceDroneName: 'Signal Beacon'
        })
      );
    });

    it('should process drones with multiple effects', () => {
      const drone = {
        id: 'multi_effect_1',
        name: 'Multi Effect',
        abilities: [{
          type: 'TRIGGERED',
          trigger: 'ON_ROUND_START',
          effects: [
            { type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1 } },
            { type: 'PERMANENT_STAT_MOD', mod: { stat: 'speed', value: 1 } }
          ]
        }]
      };
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      // Should call routeEffect twice - once for each effect
      expect(mockEffectRouter.routeEffect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Processing order', () => {
    it('should process AI drones (player2) before player drones (player1)', () => {
      const callOrder = [];
      mockEffectRouter.routeEffect.mockImplementation((effect, ctx) => {
        callOrder.push(ctx.actingPlayerId);
        return { newPlayerStates: null, animationEvents: [] };
      });

      const player1Drone = createRoundStartDrone({ id: 'p1_drone', name: 'P1 Drone' });
      const player2Drone = createRoundStartDrone({ id: 'p2_drone', name: 'P2 Drone' });

      const player1State = createPlayerState({ lane1: [player1Drone] });
      const player2State = createPlayerState({ lane1: [player2Drone] });

      RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      // AI (player2) should process first
      expect(callOrder[0]).toBe('player2');
      expect(callOrder[1]).toBe('player1');
    });

    it('should process lanes in order: lane1, lane2, lane3', () => {
      const callOrder = [];
      mockEffectRouter.routeEffect.mockImplementation((effect, ctx) => {
        callOrder.push(ctx.lane);
        return { newPlayerStates: null, animationEvents: [] };
      });

      const lane1Drone = createRoundStartDrone({ id: 'lane1_drone' });
      const lane2Drone = createRoundStartDrone({ id: 'lane2_drone' });
      const lane3Drone = createRoundStartDrone({ id: 'lane3_drone' });

      const player1State = createPlayerState({
        lane1: [lane1Drone],
        lane2: [lane2Drone],
        lane3: [lane3Drone]
      });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(callOrder).toEqual(['lane1', 'lane2', 'lane3']);
    });
  });

  describe('Return value', () => {
    it('should return updated player states when effect modifies them', () => {
      const modifiedStates = {
        player1: { modified: true, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
        player2: { modified: false, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
      };
      mockEffectRouter.routeEffect.mockReturnValue({
        newPlayerStates: modifiedStates,
        animationEvents: []
      });

      const drone = createRoundStartDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      const result = RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(result.player1.modified).toBe(true);
    });

    it('should return original states when effect returns null', () => {
      mockEffectRouter.routeEffect.mockReturnValue({
        newPlayerStates: null,
        animationEvents: []
      });

      const drone = createRoundStartDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      const result = RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      // Should return cloned original states
      expect(result.player1).toBeDefined();
      expect(result.player2).toBeDefined();
    });

    it('should collect animation events from effects', () => {
      mockEffectRouter.routeEffect.mockReturnValue({
        newPlayerStates: null,
        animationEvents: [{ type: 'STAT_INCREASE', data: { stat: 'attack' } }]
      });

      const drone = createRoundStartDrone();
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      const result = RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(result.animationEvents).toHaveLength(1);
      expect(result.animationEvents[0].type).toBe('STAT_INCREASE');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty drones on board', () => {
      const player1State = createPlayerState();
      const player2State = createPlayerState();

      const result = RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(mockEffectRouter.routeEffect).not.toHaveBeenCalled();
      expect(result.player1).toBeDefined();
      expect(result.player2).toBeDefined();
    });

    it('should handle drones with no abilities array', () => {
      const drone = { id: 'no_abilities', name: 'No Abilities' };
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      // Should not throw
      expect(() => {
        RoundManager.processRoundStartTriggers(
          player1State,
          player2State,
          {},
          mockEffectRouter
        );
      }).not.toThrow();

      expect(mockEffectRouter.routeEffect).not.toHaveBeenCalled();
    });

    it('should handle drones with empty abilities array', () => {
      const drone = { id: 'empty_abilities', name: 'Empty', abilities: [] };
      const player1State = createPlayerState({ lane1: [drone] });
      const player2State = createPlayerState();

      RoundManager.processRoundStartTriggers(
        player1State,
        player2State,
        {},
        mockEffectRouter
      );

      expect(mockEffectRouter.routeEffect).not.toHaveBeenCalled();
    });
  });
});
