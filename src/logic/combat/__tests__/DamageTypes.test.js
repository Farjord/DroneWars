import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAttack } from '../AttackProcessor.js'

// ========================================
// DAMAGE TYPES TESTS
// ========================================
// Tests for SHIELD_BREAKER, ION, and KINETIC damage types
// Following TDD approach - these tests define expected behavior

describe('DamageTypes', () => {
  let mockPlayerStates, mockPlacedSections, mockLogCallback

  beforeEach(() => {
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
          section1: { hull: 10, allocatedShields: 5, thresholds: { damaged: 6, critical: 3 } }
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
          section1: { hull: 10, allocatedShields: 5, thresholds: { damaged: 6, critical: 3 } }
        }
      }
    }

    mockPlacedSections = {
      player1: ['section1', null, null],
      player2: ['section1', null, null]
    }

    mockLogCallback = vi.fn()
  })

  // ========================================
  // SHIELD_BREAKER DAMAGE TESTS
  // ========================================
  // Each point of damage removes 2 shields; remaining damage hits hull at 1:1

  describe('SHIELD_BREAKER damage', () => {
    it('removes 2 shields per 1 damage point', () => {
      // 2 damage with SHIELD_BREAKER against 4 shields = 4 shields removed, 0 hull damage
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_SB',
        attack: 2,
        isExhausted: false,
        statMods: [],
        damageType: 'SHIELD_BREAKER'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 3,
        currentShields: 4,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      // 2 damage * 2 = 4 shields removed
      expect(updatedTarget.currentShields).toBe(0)
      // No hull damage since all damage went to shields
      expect(updatedTarget.hull).toBe(3)
    })

    it('applies remaining damage to hull at 1:1 ratio after shields depleted', () => {
      // 3 damage with SHIELD_BREAKER against 2 shields = 2 shields removed (uses 1 dmg), 2 hull damage
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_SB',
        attack: 3,
        isExhausted: false,
        statMods: [],
        damageType: 'SHIELD_BREAKER'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 4,
        currentShields: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      // 2 shields / 2 = 1 damage used on shields, 2 remaining
      expect(updatedTarget.currentShields).toBe(0)
      expect(updatedTarget.hull).toBe(2) // 4 - 2 = 2
    })

    it('correctly calculates with 3 damage vs 3 shields + 3 hull', () => {
      // Per user spec: 3 dmg vs 3 shields = shields gone + 1 hull damage
      // Math: 3 shields / 2 = 1.5 damage used, ceil(1.5) = 2 damage on shields
      // Remaining: 3 - 2 = 1 damage to hull
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_SB',
        attack: 3,
        isExhausted: false,
        statMods: [],
        damageType: 'SHIELD_BREAKER'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 3,
        currentShields: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.currentShields).toBe(0)
      expect(updatedTarget.hull).toBe(2) // 3 - 1 = 2
    })

    it('works against targets with no shields', () => {
      // SHIELD_BREAKER against 0 shields = normal hull damage
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_SB',
        attack: 2,
        isExhausted: false,
        statMods: [],
        damageType: 'SHIELD_BREAKER'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 3,
        currentShields: 0,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.currentShields).toBe(0)
      expect(updatedTarget.hull).toBe(1) // 3 - 2 = 1
    })
  })

  // ========================================
  // ION DAMAGE TESTS
  // ========================================
  // Only damages shields; excess damage is wasted

  describe('ION damage', () => {
    it('deals full damage to shields', () => {
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_ION',
        attack: 3,
        isExhausted: false,
        statMods: [],
        damageType: 'ION'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 3,
        currentShields: 4,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.currentShields).toBe(1) // 4 - 3 = 1
      expect(updatedTarget.hull).toBe(3) // Unchanged
    })

    it('wastes excess damage when shields are depleted', () => {
      // 3 ION damage vs 1 shield = 1 shield removed, 2 damage wasted
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_ION',
        attack: 3,
        isExhausted: false,
        statMods: [],
        damageType: 'ION'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 2,
        currentShields: 1,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.currentShields).toBe(0)
      expect(updatedTarget.hull).toBe(2) // Hull unchanged - ION never damages hull
    })

    it('deals zero hull damage regardless of damage amount', () => {
      // Even with massive ION damage, hull is never touched
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_ION',
        attack: 10,
        isExhausted: false,
        statMods: [],
        damageType: 'ION'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 1,
        currentShields: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.currentShields).toBe(0)
      expect(updatedTarget.hull).toBe(1) // Hull completely unaffected
    })

    it('deals no damage to targets with zero shields', () => {
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_ION',
        attack: 3,
        isExhausted: false,
        statMods: [],
        damageType: 'ION'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 3,
        currentShields: 0,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.currentShields).toBe(0)
      expect(updatedTarget.hull).toBe(3) // No damage dealt at all
    })
  })

  // ========================================
  // KINETIC DAMAGE TESTS
  // ========================================
  // Only damages hull; blocked entirely if target has any shields

  describe('KINETIC damage', () => {
    it('deals full damage directly to hull when target has no shields', () => {
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_KIN',
        attack: 3,
        isExhausted: false,
        statMods: [],
        damageType: 'KINETIC'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 4,
        currentShields: 0,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.hull).toBe(1) // 4 - 3 = 1
    })

    it('deals zero damage when target has any shields', () => {
      // 3 KINETIC damage vs 1 shield = 0 damage (blocked)
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_KIN',
        attack: 3,
        isExhausted: false,
        statMods: [],
        damageType: 'KINETIC'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 2,
        currentShields: 1,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.currentShields).toBe(1) // Shields unchanged
      expect(updatedTarget.hull).toBe(2) // Hull unchanged - attack blocked
    })

    it('blocks attack entirely even with massive damage', () => {
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_KIN',
        attack: 100,
        isExhausted: false,
        statMods: [],
        damageType: 'KINETIC'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 1,
        currentShields: 1,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget.currentShields).toBe(1)
      expect(updatedTarget.hull).toBe(1) // Target survived - shields blocked the attack
    })

    it('can destroy unshielded targets', () => {
      const attacker = {
        id: 'attacker1',
        name: 'TestAttacker_KIN',
        attack: 3,
        isExhausted: false,
        statMods: [],
        damageType: 'KINETIC'
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 2,
        currentShields: 0,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Target should be destroyed (removed from board)
      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      expect(updatedTarget).toBeUndefined() // Destroyed
      expect(result.attackResult.wasDestroyed).toBe(true)
    })
  })

  // ========================================
  // DAMAGE TYPE WITH NORMAL ATTACKS (control tests)
  // ========================================

  describe('Normal damage (control)', () => {
    it('deals damage to shields first, then hull', () => {
      // Standard damage behavior for comparison
      const attacker = {
        id: 'attacker1',
        name: 'Talon',
        attack: 3,
        isExhausted: false,
        statMods: []
        // No damageType = normal
      }

      const target = {
        id: 'target1',
        name: 'TestDrone',
        hull: 3,
        currentShields: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const result = resolveAttack(
        {
          attacker,
          target,
          targetType: 'drone',
          interceptor: null,
          attackingPlayer: 'player1',
          lane: 'lane1'
        },
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'target1'
      )

      // 3 damage: 2 to shields, 1 to hull
      expect(updatedTarget.currentShields).toBe(0)
      expect(updatedTarget.hull).toBe(2) // 3 - 1 = 2
    })
  })
})
