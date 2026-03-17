// ========================================
// TRIGGER TIMING TESTS
// ========================================
// Tests for triggerTiming validation and integration with findMatchingTriggers.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock droneData with timing-specific test drones
vi.mock('../../../data/droneData.js', () => ({
  default: [
    {
      name: 'OwnTurnOnlyDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Own Turn Ability',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        triggerTiming: 'OWN_TURN_ONLY',
        effects: [{ type: 'GO_AGAIN', effectTarget: 'TRIGGER_OWNER' }]
      }]
    },
    {
      name: 'AnyTurnDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'Any Turn Ability',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        triggerTiming: 'ANY_TURN',
        effects: [{ type: 'DAMAGE', value: 2, scope: 'TRIGGERING_DRONE' }]
      }]
    },
    {
      name: 'NoTimingDrone',
      attack: 0, hull: 1, shields: 0, speed: 0,
      abilities: [{
        name: 'No Timing Ability',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        effects: [{ type: 'DAMAGE', value: 1, scope: 'TRIGGERING_DRONE' }]
      }]
    },
    {
      name: 'TriggeringDrone',
      attack: 2, hull: 3, shields: 1, speed: 2,
      abilities: []
    }
  ]
}));

vi.mock('../../../data/techData.js', () => ({
  default: [
    {
      name: 'OwnTurnTech',
      hull: 1, isTech: true,
      abilities: [{
        name: 'Own Turn Tech Ability',
        type: 'TRIGGERED',
        trigger: 'ON_LANE_MOVEMENT_IN',
        triggerOwner: 'LANE_OWNER',
        triggerTiming: 'OWN_TURN_ONLY',
        effects: [{ type: 'GO_AGAIN', effectTarget: 'TRIGGER_OWNER' }]
      }]
    }
  ]
}));

// Minimal mocks for dependencies
vi.mock('../../EffectRouter.js', () => ({
  default: class MockEffectRouter {
    routeEffect() { return { newPlayerStates: null, animationEvents: [] }; }
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

describe('TriggerProcessor — triggerTiming', () => {
  let processor;
  let basePlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new TriggerProcessor();

    basePlayerStates = {
      player1: {
        name: 'Player 1',
        energy: 10,
        dronesOnBoard: {
          lane1: [
            { id: 'p1_own_turn', name: 'OwnTurnOnlyDrone', owner: 'player1', hull: 1, attack: 0, shields: 0, triggerUsesMap: {} },
            { id: 'p1_any_turn', name: 'AnyTurnDrone', owner: 'player1', hull: 1, attack: 0, shields: 0, triggerUsesMap: {} },
            { id: 'p1_no_timing', name: 'NoTimingDrone', owner: 'player1', hull: 1, attack: 0, shields: 0, triggerUsesMap: {} }
          ],
          lane2: [],
          lane3: []
        },
        techSlots: {
          lane1: [{ id: 'p1_own_turn_tech', name: 'OwnTurnTech', owner: 'player1', hull: 1, triggerUsesMap: {} }],
          lane2: [],
          lane3: []
        },
        shipSections: {}
      },
      player2: {
        name: 'Player 2',
        energy: 10,
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        techSlots: { lane1: [], lane2: [], lane3: [] },
        shipSections: {}
      }
    };
  });

  describe('_validateTriggerTiming', () => {
    it('OWN_TURN_ONLY returns true when currentTurnPlayerId === reactorPlayerId', () => {
      expect(processor._validateTriggerTiming('OWN_TURN_ONLY', 'player1', 'player1')).toBe(true);
    });

    it('OWN_TURN_ONLY returns false when currentTurnPlayerId !== reactorPlayerId', () => {
      expect(processor._validateTriggerTiming('OWN_TURN_ONLY', 'player1', 'player2')).toBe(false);
    });

    it('ANY_TURN returns true regardless of turn', () => {
      expect(processor._validateTriggerTiming('ANY_TURN', 'player1', 'player2')).toBe(true);
      expect(processor._validateTriggerTiming('ANY_TURN', 'player1', 'player1')).toBe(true);
    });

    it('No triggerTiming returns true (default)', () => {
      expect(processor._validateTriggerTiming(undefined, 'player1', 'player2')).toBe(true);
      expect(processor._validateTriggerTiming(null, 'player1', 'player2')).toBe(true);
    });

    it('No currentTurnPlayerId returns true (backwards-compat)', () => {
      expect(processor._validateTriggerTiming('OWN_TURN_ONLY', 'player1', null)).toBe(true);
      expect(processor._validateTriggerTiming('OWN_TURN_ONLY', 'player1', undefined)).toBe(true);
    });
  });

  describe('findMatchingTriggers with triggerTiming', () => {
    const triggeringDrone = { id: 'p1_trigger', name: 'TriggeringDrone', owner: 'player1' };

    it('OWN_TURN_ONLY trigger excluded when not owner turn', () => {
      const matches = processor.findMatchingTriggers(
        'ON_LANE_MOVEMENT_IN', 'lane1', triggeringDrone, 'player1', 'player1',
        basePlayerStates, null, null, 'player2' // player2's turn
      );

      const ownTurnMatch = matches.find(m => m.drone.name === 'OwnTurnOnlyDrone');
      expect(ownTurnMatch).toBeUndefined();
    });

    it('OWN_TURN_ONLY trigger included when owner turn', () => {
      const matches = processor.findMatchingTriggers(
        'ON_LANE_MOVEMENT_IN', 'lane1', triggeringDrone, 'player1', 'player1',
        basePlayerStates, null, null, 'player1' // player1's turn
      );

      const ownTurnMatch = matches.find(m => m.drone.name === 'OwnTurnOnlyDrone');
      expect(ownTurnMatch).toBeDefined();
    });

    it('ANY_TURN trigger always included regardless of turn', () => {
      const matchesOnOpponentTurn = processor.findMatchingTriggers(
        'ON_LANE_MOVEMENT_IN', 'lane1', triggeringDrone, 'player1', 'player1',
        basePlayerStates, null, null, 'player2'
      );
      expect(matchesOnOpponentTurn.find(m => m.drone.name === 'AnyTurnDrone')).toBeDefined();

      const matchesOnOwnTurn = processor.findMatchingTriggers(
        'ON_LANE_MOVEMENT_IN', 'lane1', triggeringDrone, 'player1', 'player1',
        basePlayerStates, null, null, 'player1'
      );
      expect(matchesOnOwnTurn.find(m => m.drone.name === 'AnyTurnDrone')).toBeDefined();
    });

    it('No triggerTiming trigger always included (backwards-compat)', () => {
      const matches = processor.findMatchingTriggers(
        'ON_LANE_MOVEMENT_IN', 'lane1', triggeringDrone, 'player1', 'player1',
        basePlayerStates, null, null, 'player2'
      );
      expect(matches.find(m => m.drone.name === 'NoTimingDrone')).toBeDefined();
    });

    it('OWN_TURN_ONLY tech trigger excluded when not owner turn', () => {
      const matches = processor.findMatchingTriggers(
        'ON_LANE_MOVEMENT_IN', 'lane1', triggeringDrone, 'player1', 'player1',
        basePlayerStates, null, null, 'player2'
      );
      expect(matches.find(m => m.drone.name === 'OwnTurnTech')).toBeUndefined();
    });

    it('OWN_TURN_ONLY tech trigger included when owner turn', () => {
      const matches = processor.findMatchingTriggers(
        'ON_LANE_MOVEMENT_IN', 'lane1', triggeringDrone, 'player1', 'player1',
        basePlayerStates, null, null, 'player1'
      );
      expect(matches.find(m => m.drone.name === 'OwnTurnTech')).toBeDefined();
    });
  });
});
