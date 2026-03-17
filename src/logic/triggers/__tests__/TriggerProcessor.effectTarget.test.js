// ========================================
// EFFECT TARGET TESTS
// ========================================
// Tests for effectTarget resolution and GO_AGAIN beneficiary logic.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock droneData with effectTarget-specific test drones
vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'GoAgainOwnerDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Go Again Owner',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        effects: [{ type: 'GO_AGAIN', effectTarget: 'TRIGGER_OWNER' }]
      }]
    },
    {
      name: 'DrawOwnerDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Draw For Owner',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'ANY',
        effects: [{ type: 'DRAW', value: 1, effectTarget: 'TRIGGER_OWNER' }]
      }]
    },
    {
      name: 'DrainOpponentDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Drain From Owner Perspective',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_ENEMY',
        effects: [{ type: 'DRAIN_ENERGY', amount: 1, effectTarget: 'TRIGGER_OWNER' }]
      }]
    },
    {
      name: 'TriggeringDrone',
      attack: 2, hull: 3, shields: 1, speed: 2,
      abilities: []
    }
  ]
}));

vi.mock('../../../data/techData.js', () => ({ default: [] }));

// Capture EffectRouter calls to verify actingPlayerId
let lastEffectRouterContext = null;
vi.mock('../../EffectRouter.js', () => ({
  default: class MockEffectRouter {
    routeEffect(effect, context) {
      lastEffectRouterContext = context;
      return { newPlayerStates: context.playerStates, animationEvents: [] };
    }
  }
}));

vi.mock('../../utils/droneStateUtils.js', () => ({
  onDroneDestroyed: vi.fn((state) => state)
}));

vi.mock('../../targeting/TargetSelector.js', () => ({
  selectTargets: vi.fn(() => []),
  hashString: vi.fn(() => 0)
}));

vi.mock('../../../utils/seededRandom.js', () => ({
  SeededRandom: class { next() { return 0.5; } }
}));

vi.mock('../../utils/gameEngineUtils.js', () => ({
  getLaneOfDrone: vi.fn(() => 'lane1')
}));

vi.mock('../../combat/LaneControlCalculator.js', () => ({
  LaneControlCalculator: class { isLaneControlledBy() { return false; } }
}));

vi.mock('../../combat/counterDamage.js', () => ({
  applyCounterDamage: vi.fn(() => ({ animationEvents: [] }))
}));

vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({
    attack: drone.attack || 0,
    hull: drone.hull || 1,
    maxShields: drone.shields || 0,
    keywords: new Set()
  }))
}));

vi.mock('../../utils/auraManager.js', () => ({
  updateAuras: vi.fn((state) => state.dronesOnBoard)
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

vi.mock('../../../utils/flowVerification.js', () => ({
  flowCheckpoint: vi.fn()
}));

import TriggerProcessor from '../TriggerProcessor.js';

describe('TriggerProcessor — effectTarget', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    lastEffectRouterContext = null;
    processor = new TriggerProcessor();
  });

  describe('_resolveEffectTarget', () => {
    it('TRIGGER_OWNER returns reactorPlayerId', () => {
      expect(processor._resolveEffectTarget('TRIGGER_OWNER', 'player1')).toBe('player1');
      expect(processor._resolveEffectTarget('TRIGGER_OWNER', 'player2')).toBe('player2');
    });

    it('TRIGGER_OPPONENT returns opponent of reactorPlayerId', () => {
      expect(processor._resolveEffectTarget('TRIGGER_OPPONENT', 'player1')).toBe('player2');
      expect(processor._resolveEffectTarget('TRIGGER_OPPONENT', 'player2')).toBe('player1');
    });

    it('No effectTarget returns reactorPlayerId (default)', () => {
      expect(processor._resolveEffectTarget(undefined, 'player1')).toBe('player1');
      expect(processor._resolveEffectTarget(null, 'player2')).toBe('player2');
    });
  });

  describe('GO_AGAIN with effectTarget', () => {
    const makePlayerStates = () => ({
      player1: {
        name: 'Player 1', energy: 10,
        dronesOnBoard: {
          lane1: [{ id: 'p1_goagain', name: 'GoAgainOwnerDrone', owner: 'player1', hull: 1, attack: 0, shields: 0, triggerUsesMap: {} }],
          lane2: [], lane3: []
        },
        techSlots: { lane1: [], lane2: [], lane3: [] },
        shipSections: {}
      },
      player2: {
        name: 'Player 2', energy: 10,
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        techSlots: { lane1: [], lane2: [], lane3: [] },
        shipSections: {}
      }
    });

    it('returns goAgain: true when beneficiary === currentTurnPlayerId', () => {
      const states = makePlayerStates();
      const triggeringDrone = { id: 'friendly', name: 'TriggeringDrone', owner: 'player1' };

      const result = processor.fireTrigger('ON_LANE_MOVEMENT_IN', {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: states,
        placedSections: {},
        logCallback: vi.fn(),
        currentTurnPlayerId: 'player1' // Owner's turn
      });

      expect(result.goAgain).toBe(true);
    });

    it('returns goAgain: false when beneficiary !== currentTurnPlayerId', () => {
      const states = makePlayerStates();
      const triggeringDrone = { id: 'friendly', name: 'TriggeringDrone', owner: 'player1' };

      const result = processor.fireTrigger('ON_LANE_MOVEMENT_IN', {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: states,
        placedSections: {},
        logCallback: vi.fn(),
        currentTurnPlayerId: 'player2' // Opponent's turn
      });

      expect(result.goAgain).toBe(false);
    });

    it('returns goAgain: true when currentTurnPlayerId not provided (backwards-compat)', () => {
      const states = makePlayerStates();
      const triggeringDrone = { id: 'friendly', name: 'TriggeringDrone', owner: 'player1' };

      const result = processor.fireTrigger('ON_LANE_MOVEMENT_IN', {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: states,
        placedSections: {},
        logCallback: vi.fn()
        // No currentTurnPlayerId
      });

      expect(result.goAgain).toBe(true);
    });
  });

  describe('EffectRouter effects with effectTarget', () => {
    it('TRIGGER_OWNER: effectContext.actingPlayerId = reactorPlayerId', () => {
      const states = {
        player1: {
          name: 'Player 1', energy: 10,
          dronesOnBoard: {
            lane1: [{ id: 'p1_draw', name: 'DrawOwnerDrone', owner: 'player1', hull: 1, attack: 0, shields: 0, triggerUsesMap: {} }],
            lane2: [], lane3: []
          },
          techSlots: { lane1: [], lane2: [], lane3: [] },
          shipSections: {}
        },
        player2: {
          name: 'Player 2', energy: 10,
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          techSlots: { lane1: [], lane2: [], lane3: [] },
          shipSections: {}
        }
      };
      // Enemy drone triggers DrawOwnerDrone (triggerOwner: ANY)
      const triggeringDrone = { id: 'p2_trigger', name: 'TriggeringDrone', owner: 'player2' };

      processor.fireTrigger('ON_LANE_MOVEMENT_IN', {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player2',
        actingPlayerId: 'player2',
        playerStates: states,
        placedSections: {},
        logCallback: vi.fn(),
        currentTurnPlayerId: 'player2'
      });

      // DRAW with effectTarget: TRIGGER_OWNER should set actingPlayerId to player1 (reactor owner)
      expect(lastEffectRouterContext).not.toBeNull();
      expect(lastEffectRouterContext.actingPlayerId).toBe('player1');
    });

    it('TRIGGER_OPPONENT: effectContext.actingPlayerId = opponent of reactorPlayerId', () => {
      const states = {
        player1: {
          name: 'Player 1', energy: 10,
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          techSlots: { lane1: [], lane2: [], lane3: [] },
          shipSections: {}
        },
        player2: {
          name: 'Player 2', energy: 10,
          dronesOnBoard: {
            lane1: [{ id: 'p2_drain', name: 'DrainOpponentDrone', owner: 'player2', hull: 1, attack: 0, shields: 0, triggerUsesMap: {} }],
            lane2: [], lane3: []
          },
          techSlots: { lane1: [], lane2: [], lane3: [] },
          shipSections: {}
        }
      };
      // Player1's drone enters player2's lane (LANE_ENEMY triggers)
      const triggeringDrone = { id: 'p1_trigger', name: 'TriggeringDrone', owner: 'player1' };

      processor.fireTrigger('ON_LANE_MOVEMENT_IN', {
        lane: 'lane1',
        triggeringDrone,
        triggeringPlayerId: 'player1',
        actingPlayerId: 'player1',
        playerStates: states,
        placedSections: {},
        logCallback: vi.fn(),
        currentTurnPlayerId: 'player1'
      });

      // DRAIN_ENERGY with effectTarget: TRIGGER_OWNER should set actingPlayerId to player2 (reactor owner)
      // Then DRAIN_ENERGY targets opponent of actingPlayerId = player1 (the enemy who entered)
      expect(lastEffectRouterContext).not.toBeNull();
      expect(lastEffectRouterContext.actingPlayerId).toBe('player2');
    });
  });
});
