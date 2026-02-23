import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAttack } from '../AttackProcessor.js'

/**
 * ASSAULT KEYWORD - ATTACK EXHAUSTION BYPASS TESTS
 *
 * ASSAULT is a passive ability that allows a drone's first attack each round
 * to not exhaust the drone. This enables drones to attack and still move or
 * use abilities in the same turn.
 *
 * Implementation Requirements:
 * - Drones with ASSAULT keyword and assaultUsed=false should NOT be exhausted on attack
 * - After using ASSAULT, assaultUsed flag should be set to true
 * - Drones with ASSAULT and assaultUsed=true should exhaust normally
 * - Drones WITHOUT ASSAULT should exhaust normally (existing behavior)
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
    rapidUsed: false,
    assaultUsed: false,
    statMods: [],
    abilities: [{
      name: 'Assault Protocol',
      description: 'First attack each round does not exhaust this drone.',
      type: 'PASSIVE',
      effect: { type: 'GRANT_KEYWORD', keyword: 'ASSAULT' }
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
    rapidUsed: false,
    assaultUsed: false,
    statMods: [],
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
    it('should NOT exhaust drone on first attack of the round (assaultUsed=false)', () => {
      // EXPLANATION: This is the core ASSAULT behavior. When a drone with the ASSAULT
      // keyword attacks for the first time in a round (assaultUsed is false), it should
      // NOT become exhausted. This allows the drone to attack and still move or use
      // abilities in the same turn.

      // Setup: Striker in lane1 with assaultUsed=false
      const strikerDrone = createStrikerDrone({ assaultUsed: false })
      const targetDrone = createTargetDrone()
      mockPlayerStates.player1.dronesOnBoard.lane1 = [strikerDrone]
      mockPlayerStates.player2.dronesOnBoard.lane1 = [targetDrone]

      const attackDetails = {
        attacker: strikerDrone,
        target: targetDrone,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      // Action: Attack
      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Assert: Drone should NOT be exhausted
      const attackerAfter = result.newPlayerStates.player1.dronesOnBoard.lane1
        .find(d => d.id === 'striker_drone_1')

      expect(attackerAfter.isExhausted).toBe(false)
    })

    it('should set assaultUsed to true after first attack', () => {
      // EXPLANATION: After using the ASSAULT ability, the assaultUsed flag must be
      // set to true to prevent the ability from being used again until the next
      // round when it resets.

      // Setup: Striker in lane1 with assaultUsed=false
      const strikerDrone = createStrikerDrone({ assaultUsed: false })
      const targetDrone = createTargetDrone()
      mockPlayerStates.player1.dronesOnBoard.lane1 = [strikerDrone]
      mockPlayerStates.player2.dronesOnBoard.lane1 = [targetDrone]

      const attackDetails = {
        attacker: strikerDrone,
        target: targetDrone,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      // Action: Attack
      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Assert: assaultUsed should be true
      const attackerAfter = result.newPlayerStates.player1.dronesOnBoard.lane1
        .find(d => d.id === 'striker_drone_1')

      expect(attackerAfter.assaultUsed).toBe(true)
    })

    it('should exhaust drone on second attack of the round (assaultUsed=true)', () => {
      // EXPLANATION: Once ASSAULT has been used (assaultUsed=true), subsequent attacks
      // in the same round should exhaust the drone normally. ASSAULT only provides
      // one free attack per round.

      // Setup: Striker in lane1 with assaultUsed=true (already used this round)
      const strikerDrone = createStrikerDrone({ assaultUsed: true })
      const targetDrone = createTargetDrone()
      mockPlayerStates.player1.dronesOnBoard.lane1 = [strikerDrone]
      mockPlayerStates.player2.dronesOnBoard.lane1 = [targetDrone]

      const attackDetails = {
        attacker: strikerDrone,
        target: targetDrone,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      // Action: Attack
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
      // EXPLANATION: Drones without the ASSAULT keyword should continue to
      // exhaust when attacking, preserving the existing game behavior.

      // Setup: Talon in lane1
      const standardDrone = createStandardDrone()
      const targetDrone = createTargetDrone()
      mockPlayerStates.player1.dronesOnBoard.lane1 = [standardDrone]
      mockPlayerStates.player2.dronesOnBoard.lane1 = [targetDrone]

      const attackDetails = {
        attacker: standardDrone,
        target: targetDrone,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      // Action: Attack
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

    it('should preserve assaultUsed state when drone without ASSAULT attacks', () => {
      // EXPLANATION: Drones without ASSAULT should still have the assaultUsed property
      // preserved (should remain false or whatever value it was) but it won't
      // affect exhaustion since they don't have the ASSAULT keyword.

      // Setup: Talon in lane1
      const standardDrone = createStandardDrone({ assaultUsed: false })
      const targetDrone = createTargetDrone()
      mockPlayerStates.player1.dronesOnBoard.lane1 = [standardDrone]
      mockPlayerStates.player2.dronesOnBoard.lane1 = [targetDrone]

      const attackDetails = {
        attacker: standardDrone,
        target: targetDrone,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      // Action: Attack
      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Assert: assaultUsed should remain false (not changed)
      const attackerAfter = result.newPlayerStates.player1.dronesOnBoard.lane1
        .find(d => d.id === 'standard_fighter_1')

      expect(attackerAfter.assaultUsed).toBe(false)
    })
  })
})
