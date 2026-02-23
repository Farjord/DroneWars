import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAttack } from '../AttackProcessor.js'

// ========================================
// DOGFIGHT & RETALIATE ABILITY TESTS
// ========================================
// Tests for two new combat abilities:
// - DOGFIGHT: Intercepting drone deals damage to attacker
// - RETALIATE: Target drone deals damage back to attacker if it survives

describe('Dogfight Ability', () => {
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
          section1: {
            hull: 10,
            shields: 5,
            allocatedShields: 5,
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
        deployedDroneCounts: { Viper: 1 },
        shipSections: {
          section1: {
            hull: 10,
            shields: 5,
            allocatedShields: 5,
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

  describe('Basic Functionality', () => {
    it('deals damage to attacker when intercepting', () => {
      // EXPLANATION: When a drone with DOGFIGHT intercepts an attack,
      // it should deal its attack damage back to the attacker.

      const attacker = {
        id: 'drone1',
        name: 'Talon', // 3 attack, 2 hull, 1 shields
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        statMods: []
      }

      const originalTarget = {
        id: 'drone2',
        name: 'Dart',
        currentShields: 1,
        hull: 1,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      const interceptor = {
        id: 'drone3',
        name: 'Viper', // 2 attack, 2 hull, 1 shields - has DOGFIGHT
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(originalTarget, interceptor)

      const attackDetails = {
        attacker: attacker,
        target: originalTarget,
        targetType: 'drone',
        interceptor: interceptor,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Viper (2 attack) should deal 2 damage to Talon (1 shields, 2 hull)
      // Talon should have 0 shields and 1 hull remaining
      const updatedAttacker = result.newPlayerStates.player1.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )

      expect(updatedAttacker).toBeDefined()
      expect(updatedAttacker.currentShields).toBe(0)
      expect(updatedAttacker.hull).toBe(1)
    })

    it('triggers regardless of whether interceptor is destroyed', () => {
      // EXPLANATION: Dogfight damage should be dealt even if the interceptor
      // is destroyed by the attack it's intercepting.

      const attacker = {
        id: 'drone1',
        name: 'Mammoth', // 4 attack, 4 hull, 1 shields
        currentShields: 1,
        hull: 4,
        isExhausted: false,
        statMods: []
      }

      const originalTarget = {
        id: 'drone2',
        name: 'Dart',
        currentShields: 1,
        hull: 1,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      const interceptor = {
        id: 'drone3',
        name: 'Viper', // 2 attack, 2 hull, 1 shields - will be destroyed
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(originalTarget, interceptor)

      const attackDetails = {
        attacker: attacker,
        target: originalTarget,
        targetType: 'drone',
        interceptor: interceptor,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Viper is destroyed by Mammoth's 4 attack
      const interceptorExists = result.newPlayerStates.player2.dronesOnBoard.lane1.some(
        d => d.id === 'drone3'
      )
      expect(interceptorExists).toBe(false)

      // But Viper should still have dealt 2 damage to Mammoth
      // Mammoth (1 shields, 4 hull) - 2 damage = (0 shields, 3 hull)
      const updatedAttacker = result.newPlayerStates.player1.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )

      expect(updatedAttacker).toBeDefined()
      expect(updatedAttacker.currentShields).toBe(0)
      expect(updatedAttacker.hull).toBe(3)
    })

    it('can destroy the attacker with dogfight damage', () => {
      // EXPLANATION: If the dogfight damage is enough to kill the attacker,
      // the attacker should be destroyed.

      const attacker = {
        id: 'drone1',
        name: 'Dart', // 1 attack, 1 hull, 1 shields
        currentShields: 1,
        hull: 1,
        isExhausted: false,
        statMods: []
      }

      const originalTarget = {
        id: 'drone2',
        name: 'Bastion',
        currentShields: 0,
        hull: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      const interceptor = {
        id: 'drone3',
        name: 'Viper', // 2 attack, 2 hull, 1 shields
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player1.deployedDroneCounts = { Dart: 1 }
      mockPlayerStates.player2.dronesOnBoard.lane1.push(originalTarget, interceptor)

      const attackDetails = {
        attacker: attacker,
        target: originalTarget,
        targetType: 'drone',
        interceptor: interceptor,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Viper (2 attack) should destroy Dart (1 shields + 1 hull = 2 HP)
      const attackerExists = result.newPlayerStates.player1.dronesOnBoard.lane1.some(
        d => d.id === 'drone1'
      )
      expect(attackerExists).toBe(false)
    })

    it('does NOT trigger when drone is direct target (not intercepting)', () => {
      // EXPLANATION: Dogfight only triggers when the drone intercepts.
      // If the Viper is the direct target of an attack, it should NOT deal damage back.

      const attacker = {
        id: 'drone1',
        name: 'Talon', // 3 attack
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        statMods: []
      }

      const target = {
        id: 'drone2',
        name: 'Viper', // Has DOGFIGHT but is the direct target
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const attackDetails = {
        attacker: attacker,
        target: target,
        targetType: 'drone',
        interceptor: null, // No interception - Viper is the direct target
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Attacker should NOT take any dogfight damage
      // Talon remains at full health: 1 shields, 2 hull
      const updatedAttacker = result.newPlayerStates.player1.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )

      expect(updatedAttacker).toBeDefined()
      expect(updatedAttacker.currentShields).toBe(1)
      expect(updatedAttacker.hull).toBe(2)
    })

    it('uses effective attack value including buffs', () => {
      // EXPLANATION: Dogfight should use the interceptor's effective attack,
      // which includes any buffs or stat mods.

      const attacker = {
        id: 'drone1',
        name: 'Talon',
        currentShields: 1,
        hull: 4, // Higher hull to survive
        isExhausted: false,
        statMods: []
      }

      const originalTarget = {
        id: 'drone2',
        name: 'Dart',
        currentShields: 1,
        hull: 1,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      // Viper has 2 base attack, add a +1 attack stat mod
      const interceptor = {
        id: 'drone3',
        name: 'Viper',
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: [{ stat: 'attack', value: 1 }]
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(originalTarget, interceptor)

      const attackDetails = {
        attacker: attacker,
        target: originalTarget,
        targetType: 'drone',
        interceptor: interceptor,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Viper (2 + 1 = 3 attack) should deal 3 damage to Talon (1 shields, 4 hull)
      // Talon should have 0 shields and 2 hull remaining
      const updatedAttacker = result.newPlayerStates.player1.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )

      expect(updatedAttacker).toBeDefined()
      expect(updatedAttacker.currentShields).toBe(0)
      expect(updatedAttacker.hull).toBe(2)
    })
  })

  describe('Animation Events', () => {
    it('generates DOGFIGHT_DAMAGE animation event', () => {
      const attacker = {
        id: 'drone1',
        name: 'Talon',
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        statMods: []
      }

      const originalTarget = {
        id: 'drone2',
        name: 'Dart',
        currentShields: 1,
        hull: 1,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      const interceptor = {
        id: 'drone3',
        name: 'Viper',
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(originalTarget, interceptor)

      const attackDetails = {
        attacker: attacker,
        target: originalTarget,
        targetType: 'drone',
        interceptor: interceptor,
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      const hasDogfightEvent = result.animationEvents.some(
        event => event.type === 'DOGFIGHT_DAMAGE'
      )
      expect(hasDogfightEvent).toBe(true)
    })
  })
})

describe('Retaliate Ability', () => {
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
          section1: {
            hull: 10,
            shields: 5,
            allocatedShields: 5,
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
        deployedDroneCounts: { Thornback: 1 },
        shipSections: {
          section1: {
            hull: 10,
            shields: 5,
            allocatedShields: 5,
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

  describe('Basic Functionality', () => {
    it('deals damage back to attacker when targeted and survives', () => {
      // EXPLANATION: When a drone with RETALIATE is attacked and survives,
      // it should deal its attack damage back to the attacker.

      const attacker = {
        id: 'drone1',
        name: 'Talon', // 3 attack, 2 hull, 1 shields
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        statMods: []
      }

      const target = {
        id: 'drone2',
        name: 'Thornback', // 2 attack, 3 hull, 1 shields - has RETALIATE
        currentShields: 1,
        hull: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const attackDetails = {
        attacker: attacker,
        target: target,
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

      // Talon (3 attack) deals 3 damage to Thornback (1 shields + 3 hull = 4 HP)
      // Thornback survives with 0 shields, 1 hull
      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'drone2'
      )
      expect(updatedTarget).toBeDefined()
      expect(updatedTarget.hull).toBe(1)

      // Thornback (2 attack) retaliates against Talon (1 shields + 2 hull = 3 HP)
      // Talon should have 0 shields, 1 hull remaining
      const updatedAttacker = result.newPlayerStates.player1.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )
      expect(updatedAttacker).toBeDefined()
      expect(updatedAttacker.currentShields).toBe(0)
      expect(updatedAttacker.hull).toBe(1)
    })

    it('does NOT trigger if drone is destroyed by attack', () => {
      // EXPLANATION: Retaliate only triggers if the drone survives.
      // If the drone is destroyed, it cannot retaliate.

      const attacker = {
        id: 'drone1',
        name: 'Mammoth', // 4 attack, 4 hull, 1 shields
        currentShields: 1,
        hull: 4,
        isExhausted: false,
        statMods: []
      }

      const target = {
        id: 'drone2',
        name: 'Thornback', // 2 attack, 3 hull, 1 shields - will be destroyed
        currentShields: 1,
        hull: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const attackDetails = {
        attacker: attacker,
        target: target,
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

      // Thornback is destroyed by Mammoth's 4 attack
      const targetExists = result.newPlayerStates.player2.dronesOnBoard.lane1.some(
        d => d.id === 'drone2'
      )
      expect(targetExists).toBe(false)

      // Attacker should NOT have taken any retaliate damage
      // Mammoth remains at full health: 1 shields, 4 hull
      const updatedAttacker = result.newPlayerStates.player1.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )
      expect(updatedAttacker).toBeDefined()
      expect(updatedAttacker.currentShields).toBe(1)
      expect(updatedAttacker.hull).toBe(4)
    })

    it('does NOT trigger on ability/card damage (no attacker drone)', () => {
      // EXPLANATION: Retaliate only triggers when attacked by a drone.
      // Card/ability damage has no attacker to retaliate against.

      const target = {
        id: 'drone1',
        name: 'Thornback', // 2 attack, 3 hull, 1 shields
        currentShields: 1,
        hull: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const attackDetails = {
        attacker: null, // No attacker - this is a card/ability
        target: target,
        targetType: 'drone',
        interceptor: null,
        attackingPlayer: 'player1',
        abilityDamage: 2, // Card deals 2 damage
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Thornback survives with 0 shields, 2 hull
      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )
      expect(updatedTarget).toBeDefined()
      expect(updatedTarget.hull).toBe(2)

      // No retaliate animation should be generated (no target to retaliate against)
      const hasRetaliateEvent = result.animationEvents.some(
        event => event.type === 'RETALIATE_DAMAGE'
      )
      expect(hasRetaliateEvent).toBe(false)
    })

    it('does NOT trigger if drone is interceptor (not direct target)', () => {
      // EXPLANATION: Retaliate only triggers when the drone is the direct target.
      // Interceptors are not "targeted" - they choose to intercept.

      const attacker = {
        id: 'drone1',
        name: 'Talon', // 3 attack
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        statMods: []
      }

      const originalTarget = {
        id: 'drone2',
        name: 'Dart',
        currentShields: 1,
        hull: 1,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      const interceptor = {
        id: 'drone3',
        name: 'Thornback', // Has RETALIATE, but is intercepting
        currentShields: 1,
        hull: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(originalTarget, interceptor)

      const attackDetails = {
        attacker: attacker,
        target: originalTarget,
        targetType: 'drone',
        interceptor: interceptor, // Thornback intercepts
        attackingPlayer: 'player1',
        lane: 'lane1'
      }

      const result = resolveAttack(
        attackDetails,
        mockPlayerStates,
        mockPlacedSections,
        mockLogCallback
      )

      // Thornback survives the interception (3 attack vs 1 shields + 3 hull = 4 HP)
      // But should NOT retaliate because it was an interceptor, not the target
      const updatedAttacker = result.newPlayerStates.player1.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )

      expect(updatedAttacker).toBeDefined()
      // Attacker should still have full health (no retaliate damage)
      expect(updatedAttacker.currentShields).toBe(1)
      expect(updatedAttacker.hull).toBe(2)
    })

    it('can destroy the attacker with retaliate damage', () => {
      // EXPLANATION: If the retaliate damage is enough to kill the attacker,
      // the attacker should be destroyed.

      const attacker = {
        id: 'drone1',
        name: 'Dart', // 1 attack, 1 hull, 1 shields
        currentShields: 1,
        hull: 1,
        isExhausted: false,
        statMods: []
      }

      const target = {
        id: 'drone2',
        name: 'Thornback', // 2 attack, 3 hull, 1 shields
        currentShields: 1,
        hull: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player1.deployedDroneCounts = { Dart: 1 }
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const attackDetails = {
        attacker: attacker,
        target: target,
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

      // Dart (1 attack) deals 1 damage to Thornback (1 shields + 3 hull = 4 HP)
      // Thornback survives with 0 shields, 3 hull
      const updatedTarget = result.newPlayerStates.player2.dronesOnBoard.lane1.find(
        d => d.id === 'drone2'
      )
      expect(updatedTarget).toBeDefined()

      // Thornback (2 attack) retaliates and destroys Dart (1 shields + 1 hull = 2 HP)
      const attackerExists = result.newPlayerStates.player1.dronesOnBoard.lane1.some(
        d => d.id === 'drone1'
      )
      expect(attackerExists).toBe(false)
    })

    it('uses effective attack value including buffs', () => {
      // EXPLANATION: Retaliate should use the target's effective attack,
      // which includes any buffs or stat mods.

      const attacker = {
        id: 'drone1',
        name: 'Talon',
        currentShields: 1,
        hull: 4, // Higher hull to survive
        isExhausted: false,
        statMods: []
      }

      // Thornback has 2 base attack, add a +1 attack stat mod
      const target = {
        id: 'drone2',
        name: 'Thornback',
        currentShields: 1,
        hull: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: [{ stat: 'attack', value: 1 }]
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const attackDetails = {
        attacker: attacker,
        target: target,
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

      // Thornback (2 + 1 = 3 attack) should retaliate with 3 damage to Talon (1 shields, 4 hull)
      // Talon should have 0 shields and 2 hull remaining
      const updatedAttacker = result.newPlayerStates.player1.dronesOnBoard.lane1.find(
        d => d.id === 'drone1'
      )

      expect(updatedAttacker).toBeDefined()
      expect(updatedAttacker.currentShields).toBe(0)
      expect(updatedAttacker.hull).toBe(2)
    })
  })

  describe('Animation Events', () => {
    it('generates RETALIATE_DAMAGE animation event', () => {
      const attacker = {
        id: 'drone1',
        name: 'Talon',
        currentShields: 1,
        hull: 2,
        isExhausted: false,
        statMods: []
      }

      const target = {
        id: 'drone2',
        name: 'Thornback',
        currentShields: 1,
        hull: 3,
        isExhausted: false,
        owner: 'player2',
        statMods: []
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(target)

      const attackDetails = {
        attacker: attacker,
        target: target,
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

      const hasRetaliateEvent = result.animationEvents.some(
        event => event.type === 'RETALIATE_DAMAGE'
      )
      expect(hasRetaliateEvent).toBe(true)
    })
  })
})

describe('Dogfight and Retaliate Combined', () => {
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
          section1: {
            hull: 10,
            shields: 5,
            allocatedShields: 5,
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
            allocatedShields: 5,
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

  it('both trigger when drone with both abilities intercepts and survives', () => {
    // EXPLANATION: If a drone has both DOGFIGHT and RETALIATE,
    // and it intercepts an attack and survives, both should trigger.
    // Dogfight triggers during interception, Retaliate triggers because it took damage and survived.

    const attacker = {
      id: 'drone1',
      name: 'Talon', // 3 attack, 2 hull, 1 shields
      currentShields: 1,
      hull: 2,
      isExhausted: false,
      statMods: []
    }

    const originalTarget = {
      id: 'drone2',
      name: 'Dart',
      currentShields: 1,
      hull: 1,
      isExhausted: false,
      owner: 'player2',
      statMods: []
    }

    // Scorpion has both DOGFIGHT and RETALIATE
    const interceptor = {
      id: 'drone3',
      name: 'Scorpion', // 2 attack, 3 hull, 1 shields - has both DOGFIGHT and RETALIATE
      currentShields: 1,
      hull: 3,
      isExhausted: false,
      owner: 'player2',
      statMods: []
    }

    mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
    mockPlayerStates.player2.dronesOnBoard.lane1.push(originalTarget, interceptor)
    mockPlayerStates.player2.deployedDroneCounts = { Scorpion: 1 }

    const attackDetails = {
      attacker: attacker,
      target: originalTarget,
      targetType: 'drone',
      interceptor: interceptor,
      attackingPlayer: 'player1',
      lane: 'lane1'
    }

    const result = resolveAttack(
      attackDetails,
      mockPlayerStates,
      mockPlacedSections,
      mockLogCallback
    )

    // Both Dogfight and Retaliate should trigger
    // Scorpion (2 attack) deals damage twice: once for dogfight, once for retaliate
    // Total: 4 damage to Talon (1 shields + 2 hull = 3 HP) - should be destroyed
    const attackerExists = result.newPlayerStates.player1.dronesOnBoard.lane1.some(
      d => d.id === 'drone1'
    )
    expect(attackerExists).toBe(false)

    // Both animation events should be present
    const hasDogfightEvent = result.animationEvents.some(
      event => event.type === 'DOGFIGHT_DAMAGE'
    )
    const hasRetaliateEvent = result.animationEvents.some(
      event => event.type === 'RETALIATE_DAMAGE'
    )
    expect(hasDogfightEvent).toBe(true)
    expect(hasRetaliateEvent).toBe(true)
  })

  it('Retaliate does NOT trigger if Dogfight damage kills the attacker first', () => {
    // EXPLANATION: If dogfight damage destroys the attacker,
    // there's no attacker left to retaliate against.

    const attacker = {
      id: 'drone1',
      name: 'Dart', // 1 attack, 1 hull, 1 shields - weak
      currentShields: 1,
      hull: 1,
      isExhausted: false,
      statMods: []
    }

    const originalTarget = {
      id: 'drone2',
      name: 'Bastion',
      currentShields: 0,
      hull: 3,
      isExhausted: false,
      owner: 'player2',
      statMods: []
    }

    // Scorpion has both DOGFIGHT and RETALIATE (2 attack - enough to kill Dart)
    const interceptor = {
      id: 'drone3',
      name: 'Scorpion',
      currentShields: 1,
      hull: 3,
      isExhausted: false,
      owner: 'player2',
      statMods: []
    }

    mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
    mockPlayerStates.player1.deployedDroneCounts = { Dart: 1 }
    mockPlayerStates.player2.dronesOnBoard.lane1.push(originalTarget, interceptor)
    mockPlayerStates.player2.deployedDroneCounts = { Scorpion: 1 }

    const attackDetails = {
      attacker: attacker,
      target: originalTarget,
      targetType: 'drone',
      interceptor: interceptor,
      attackingPlayer: 'player1',
      lane: 'lane1'
    }

    const result = resolveAttack(
      attackDetails,
      mockPlayerStates,
      mockPlacedSections,
      mockLogCallback
    )

    // Attacker should be destroyed by dogfight
    // Scorpion (2 attack) vs Dart (1 shields + 1 hull = 2 HP) - exactly kills Dart
    const attackerExists = result.newPlayerStates.player1.dronesOnBoard.lane1.some(
      d => d.id === 'drone1'
    )
    expect(attackerExists).toBe(false)

    // Dogfight event should exist
    const hasDogfightEvent = result.animationEvents.some(
      event => event.type === 'DOGFIGHT_DAMAGE'
    )
    expect(hasDogfightEvent).toBe(true)

    // Retaliate event should NOT exist (attacker already dead)
    const hasRetaliateEvent = result.animationEvents.some(
      event => event.type === 'RETALIATE_DAMAGE'
    )
    expect(hasRetaliateEvent).toBe(false)
  })
})
