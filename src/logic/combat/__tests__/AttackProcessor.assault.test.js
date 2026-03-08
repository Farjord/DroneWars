import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track fireTrigger calls so we can control doesNotExhaust behavior
let mockFireTrigger;

vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = mockFireTrigger;
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_ATTACK: 'ON_ATTACK', ON_LANE_ATTACK: 'ON_LANE_ATTACK' }
}));

import { resolveAttack } from '../AttackProcessor.js'

/**
 * ASSAULT KEYWORD - ATTACK EXHAUSTION BYPASS TESTS
 *
 * ASSAULT is now a TRIGGERED ability (ON_ATTACK) that returns DOES_NOT_EXHAUST.
 * The TriggerProcessor fires after the attack and returns doesNotExhaust=true
 * when the trigger matches (first use per round via usesPerRound: 1).
 *
 * The AttackProcessor exhausts by default, then un-exhausts if doesNotExhaust is set.
 */

describe('ASSAULT keyword - Attack exhaustion bypass', () => {
  let mockPlayerStates, mockPlacedSections, mockLogCallback

  // Create a mock Striker with ASSAULT ability for testing
  const createStrikerDrone = (overrides = {}) => ({
    id: 'striker_drone_1',
    name: 'Striker',
    attack: 3,
    hull: 2,
    shields: 1,
    speed: 3,
    isExhausted: false,
    statMods: [],
    triggerUsesMap: {},
    abilities: [{
      name: 'Assault Protocol',
      description: 'First attack each round does not exhaust this drone.',
      type: 'TRIGGERED',
      trigger: 'ON_ATTACK',
      usesPerRound: 1,
      keywordIcon: 'ASSAULT',
      effects: [{ type: 'DOES_NOT_EXHAUST' }]
    }],
    ...overrides
  })

  // Create a standard drone WITHOUT ASSAULT for comparison testing
  const createStandardDrone = (overrides = {}) => ({
    id: 'standard_fighter_1',
    name: 'Talon',
    attack: 3,
    hull: 2,
    shields: 1,
    speed: 4,
    isExhausted: false,
    statMods: [],
    triggerUsesMap: {},
    abilities: [],
    ...overrides
  })

  // Create a target drone
  const createTargetDrone = (overrides = {}) => ({
    id: 'target_drone_1',
    name: 'Dart',
    attack: 1,
    hull: 1,
    shields: 1,
    speed: 6,
    isExhausted: false,
    owner: 'player2',
    statMods: [],
    abilities: [],
    ...overrides
  })

  beforeEach(() => {
    // Setup mock game state for combat testing
    mockPlayerStates = {
      player1: {
        name: 'Player 1',
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        appliedUpgrades: {},
        deployedDroneCounts: {},
        shipSections: {
          section1: {
            hull: 10,
            shields: 5,
            allocatedShields: 3,
            thresholds: { damaged: 6, critical: 3 }
          }
        }
      },
      player2: {
        name: 'Player 2',
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        appliedUpgrades: {},
        deployedDroneCounts: {},
        shipSections: {
          section1: {
            hull: 10,
            shields: 5,
            allocatedShields: 3,
            thresholds: { damaged: 6, critical: 3 }
          }
        }
      }
    }

    mockPlacedSections = {
      player1: ['section1', null, null],
      player2: ['section1', null, null]
    }

    mockLogCallback = vi.fn()
  })

  describe('when drone has ASSAULT keyword', () => {
    it('should NOT exhaust drone on first attack when trigger returns doesNotExhaust', () => {
      // Setup: Striker in lane1, trigger returns doesNotExhaust=true
      const strikerDrone = createStrikerDrone()
      const targetDrone = createTargetDrone()
      mockPlayerStates.player1.dronesOnBoard.lane1 = [strikerDrone]
      mockPlayerStates.player2.dronesOnBoard.lane1 = [targetDrone]

      // Mock trigger to return doesNotExhaust for ON_ATTACK
      mockFireTrigger = vi.fn().mockImplementation((triggerType) => {
        if (triggerType === 'ON_ATTACK') {
          return { triggered: true, newPlayerStates: mockPlayerStates, animationEvents: [], doesNotExhaust: true, statModsApplied: false };
        }
        return { triggered: false, newPlayerStates: null, animationEvents: [], statModsApplied: false };
      });

      const attackDetails = {
        attacker: strikerDrone,
        target: targetDrone,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Assert: Drone should NOT be exhausted (trigger un-exhausted it)
      const attackerAfter = result.newPlayerStates.player1.dronesOnBoard.lane1
        .find(d => d.id === 'striker_drone_1')

      expect(attackerAfter.isExhausted).toBe(false)
    })

    it('should exhaust drone on second attack when trigger does NOT return doesNotExhaust', () => {
      // Setup: Striker in lane1 with triggerUsesMap already used
      const strikerDrone = createStrikerDrone({ triggerUsesMap: { 'Assault Protocol': 1 } })
      const targetDrone = createTargetDrone()
      mockPlayerStates.player1.dronesOnBoard.lane1 = [strikerDrone]
      mockPlayerStates.player2.dronesOnBoard.lane1 = [targetDrone]

      // Mock trigger to NOT return doesNotExhaust (uses exhausted)
      mockFireTrigger = vi.fn().mockReturnValue({
        triggered: false, newPlayerStates: null, animationEvents: [], statModsApplied: false
      });

      const attackDetails = {
        attacker: strikerDrone,
        target: targetDrone,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Assert: Drone SHOULD be exhausted
      const attackerAfter = result.newPlayerStates.player1.dronesOnBoard.lane1
        .find(d => d.id === 'striker_drone_1')

      expect(attackerAfter.isExhausted).toBe(true)
    })
  })

  describe('when drone does NOT have ASSAULT keyword', () => {
    it('should exhaust drone normally on attack', () => {
      // Setup: Talon in lane1
      const standardDrone = createStandardDrone()
      const targetDrone = createTargetDrone()
      mockPlayerStates.player1.dronesOnBoard.lane1 = [standardDrone]
      mockPlayerStates.player2.dronesOnBoard.lane1 = [targetDrone]

      // Mock trigger to not fire
      mockFireTrigger = vi.fn().mockReturnValue({
        triggered: false, newPlayerStates: null, animationEvents: [], statModsApplied: false
      });

      const attackDetails = {
        attacker: standardDrone,
        target: targetDrone,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Assert: Drone SHOULD be exhausted (normal behavior)
      const attackerAfter = result.newPlayerStates.player1.dronesOnBoard.lane1
        .find(d => d.id === 'standard_fighter_1')

      expect(attackerAfter.isExhausted).toBe(true)
    })
  })
})
