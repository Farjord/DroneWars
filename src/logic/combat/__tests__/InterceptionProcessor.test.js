import { describe, it, expect, beforeEach } from 'vitest'
import { calculatePotentialInterceptors, calculateAiInterception } from '../InterceptionProcessor.js'

// ========================================
// CALCULATE POTENTIAL INTERCEPTORS TESTS
// ========================================

describe('InterceptionProcessor', () => {
  describe('calculatePotentialInterceptors()', () => {
    let mockPlayerState1, mockPlayerState2, mockPlacedSections

    beforeEach(() => {
      // Basic setup for testing interception
      mockPlayerState1 = {
        name: 'Player 1',
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        appliedUpgrades: {},
        shipSections: {}
      }

      mockPlayerState2 = {
        name: 'Player 2',
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        appliedUpgrades: {},
        shipSections: {}
      }

      mockPlacedSections = {
        player1: ['section1', 'section2', 'section3'],
        player2: ['section1', 'section2', 'section3']
      }
    })

    it('returns empty array if attacker is null', () => {
      // EXPLANATION: This test verifies that the function handles null/undefined attackers
      // gracefully without crashing. This prevents bugs when the function is called with
      // invalid data during edge cases or errors.
      // Expected: Returns empty array when attacker is null

      const interceptors = calculatePotentialInterceptors(
        null,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toEqual([])
    })

    it('returns empty array if attacker is exhausted', () => {
      // EXPLANATION: This test verifies that exhausted drones cannot initiate attacks,
      // and therefore no interception calculation is needed. This prevents bugs where
      // exhausted drones could somehow trigger attacks or interceptions.
      // Expected: Returns empty array when attacker.isExhausted = true

      const exhaustedAttacker = {
        id: 'drone1',
        name: 'Talon',
        isExhausted: true
      }

      mockPlayerState1.dronesOnBoard.lane1.push(exhaustedAttacker)

      const interceptors = calculatePotentialInterceptors(
        exhaustedAttacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toEqual([])
    })

    it('returns empty array if no opponent drones in same lane', () => {
      // EXPLANATION: This test verifies that when there are no enemy drones in the
      // attacker's lane, no interception is possible. This is fundamental to the
      // lane-based combat system - drones can only intercept in their own lane.
      // Expected: Returns empty array when opponent has no drones in attacker's lane

      const attacker = {
        id: 'drone1',
        name: 'Talon',
        isExhausted: false
      }

      mockPlayerState1.dronesOnBoard.lane1.push(attacker)
      // lane1 for player2 is empty

      const interceptors = calculatePotentialInterceptors(
        attacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toEqual([])
    })

    it('returns empty array if opponent drones have lower speed', () => {
      // EXPLANATION: This test verifies that slower drones cannot intercept faster attackers.
      // Only drones with equal or higher speed can intercept.
      // Expected: Returns empty array when opponent drone speed < attacker speed

      const attacker = {
        id: 'drone1',
        name: 'Talon', // Speed 4
        isExhausted: false
      }

      const slowDefender = {
        id: 'drone2',
        name: 'Bastion', // Speed 2 (slower than attacker)
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerState1.dronesOnBoard.lane1.push(attacker)
      mockPlayerState2.dronesOnBoard.lane1.push(slowDefender)

      const interceptors = calculatePotentialInterceptors(
        attacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toEqual([])
    })

    it('returns interceptor ID when opponent drone has equal speed', () => {
      // EXPLANATION: This test verifies that drones with equal speed CAN intercept.
      // "Defender wins ties" - this creates strategic depth where positioning and
      // defender advantage matter, not just raw speed.
      // Expected: Returns interceptor ID when opponent speed === attacker speed

      const attacker = {
        id: 'drone1',
        name: 'Talon', // Speed 4
        isExhausted: false
      }

      const equalSpeedDefender = {
        id: 'drone2',
        name: 'Talon', // Speed 4 (same as attacker)
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerState1.dronesOnBoard.lane1.push(attacker)
      mockPlayerState2.dronesOnBoard.lane1.push(equalSpeedDefender)

      const interceptors = calculatePotentialInterceptors(
        attacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toContain('drone2')
      expect(interceptors.length).toBe(1)
    })

    it('returns interceptor ID when opponent drone has higher speed', () => {
      // EXPLANATION: This test verifies that a faster drone can successfully intercept
      // a slower drone's attack. This is the primary interception mechanic - speed
      // comparison determines who can intercept whom.
      // Expected: Returns array with interceptor drone ID when opponent speed > attacker speed

      const slowAttacker = {
        id: 'drone1',
        name: 'Bastion', // Speed 2
        isExhausted: false
      }

      const fastDefender = {
        id: 'drone2',
        name: 'Dart', // Speed 6 (much faster)
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerState1.dronesOnBoard.lane1.push(slowAttacker)
      mockPlayerState2.dronesOnBoard.lane1.push(fastDefender)

      const interceptors = calculatePotentialInterceptors(
        slowAttacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toContain('drone2')
      expect(interceptors.length).toBe(1)
    })

    it('excludes exhausted opponent drones from interception', () => {
      // EXPLANATION: This test verifies that exhausted defending drones cannot intercept,
      // even if they have higher speed. Exhaustion represents a drone being unable to act
      // this turn, so it cannot intercept attacks.
      // Expected: Returns empty array when faster opponent drone is exhausted

      const attacker = {
        id: 'drone1',
        name: 'Bastion', // Speed 2
        isExhausted: false
      }

      const exhaustedFastDefender = {
        id: 'drone2',
        name: 'Dart', // Speed 6, but exhausted
        isExhausted: true,
        owner: 'player2'
      }

      mockPlayerState1.dronesOnBoard.lane1.push(attacker)
      mockPlayerState2.dronesOnBoard.lane1.push(exhaustedFastDefender)

      const interceptors = calculatePotentialInterceptors(
        attacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toEqual([])
    })

    it('only returns interceptors from same lane, not other lanes', () => {
      // EXPLANATION: This test verifies that drones in different lanes cannot intercept
      // each other. The lane system creates three separate combat zones, and drones
      // can only interact with enemies in their own lane.
      // Expected: Only returns interceptors from attacker's lane, ignores other lanes

      const attacker = {
        id: 'drone1',
        name: 'Bastion', // Speed 2, in lane1
        isExhausted: false
      }

      const lane1Defender = {
        id: 'drone2',
        name: 'Dart', // Speed 6, in lane1 - CAN intercept
        isExhausted: false,
        owner: 'player2'
      }

      const lane2Defender = {
        id: 'drone3',
        name: 'Dart', // Speed 6, in lane2 - CANNOT intercept
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerState1.dronesOnBoard.lane1.push(attacker)
      mockPlayerState2.dronesOnBoard.lane1.push(lane1Defender)
      mockPlayerState2.dronesOnBoard.lane2.push(lane2Defender) // Different lane

      const interceptors = calculatePotentialInterceptors(
        attacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toContain('drone2')
      expect(interceptors).not.toContain('drone3') // Not in same lane
      expect(interceptors.length).toBe(1)
    })

    it('returns multiple interceptor IDs when multiple drones can intercept', () => {
      // EXPLANATION: This test verifies that when multiple enemy drones in the same lane
      // are faster than the attacker, all of them are returned as potential interceptors.
      // The player then chooses which one actually intercepts.
      // Expected: Returns array with all valid interceptor drone IDs

      const slowAttacker = {
        id: 'drone1',
        name: 'Bastion', // Speed 2
        isExhausted: false
      }

      const fastDefender1 = {
        id: 'drone2',
        name: 'Dart', // Speed 6
        isExhausted: false,
        owner: 'player2'
      }

      const fastDefender2 = {
        id: 'drone3',
        name: 'Talon', // Speed 4
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerState1.dronesOnBoard.lane1.push(slowAttacker)
      mockPlayerState2.dronesOnBoard.lane1.push(fastDefender1, fastDefender2)

      const interceptors = calculatePotentialInterceptors(
        slowAttacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toContain('drone2')
      expect(interceptors).toContain('drone3')
      expect(interceptors.length).toBe(2)
    })

    it('returns empty array when attacker is not in any lane', () => {
      // EXPLANATION: This test verifies that if the attacker somehow isn't in the
      // dronesOnBoard structure (error state), the function handles it gracefully
      // by returning an empty array rather than crashing.
      // Expected: Returns empty array when attacker's lane cannot be determined

      const orphanedAttacker = {
        id: 'drone1',
        name: 'Talon',
        isExhausted: false
      }

      // Attacker not added to any lane

      const interceptors = calculatePotentialInterceptors(
        orphanedAttacker,
        mockPlayerState1,
        mockPlayerState2,
        mockPlacedSections
      )

      expect(interceptors).toEqual([])
    })
  })

  // ========================================
  // CALCULATE AI INTERCEPTION TESTS
  // ========================================

  describe('calculateAiInterception()', () => {
    let mockPlayerStates, mockPlacedSections

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
          shipSections: {}
        },
        player2: {
          name: 'Player 2',
          dronesOnBoard: {
            lane1: [],
            lane2: [],
            lane3: []
          },
          appliedUpgrades: {},
          shipSections: {}
        }
      }

      mockPlacedSections = {
        player1: ['section1', 'section2', 'section3'],
        player2: ['section1', 'section2', 'section3']
      }
    })

    it('returns hasInterceptors: false when no valid interceptors exist', () => {
      // EXPLANATION: This test verifies that the AI correctly identifies when no
      // interception is possible. This is important for AI decision-making - if no
      // interception is possible, the AI should proceed with the attack as planned.
      // Expected: Returns { hasInterceptors: false, interceptors: [] } when no defenders can intercept

      const attacker = {
        id: 'drone1',
        name: 'Talon', // Speed 4
        owner: 'player1'
      }

      const slowDefender = {
        id: 'drone2',
        name: 'Bastion', // Speed 2 (slower, cannot intercept)
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(slowDefender)

      const pendingAttack = {
        attacker: attacker,
        target: { id: 'ship' },
        targetType: 'ship',
        lane: 'lane1',
        attackingPlayer: 'player1'
      }

      const result = calculateAiInterception(pendingAttack, mockPlayerStates, mockPlacedSections)

      expect(result.hasInterceptors).toBe(false)
      expect(result.interceptors).toEqual([])
      expect(result.attackDetails).toEqual(pendingAttack)
    })

    it('returns hasInterceptors: true when valid interceptors exist', () => {
      // EXPLANATION: This test verifies that the AI correctly identifies when interception
      // is possible. This allows the AI to make strategic decisions about whether to
      // intercept or let the attack through.
      // Expected: Returns { hasInterceptors: true, interceptors: [array of drones] } when defenders can intercept

      const slowAttacker = {
        id: 'drone1',
        name: 'Bastion', // Speed 2
        owner: 'player1'
      }

      const fastDefender = {
        id: 'drone2',
        name: 'Dart', // Speed 6 (faster, can intercept)
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(slowAttacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(fastDefender)

      const pendingAttack = {
        attacker: slowAttacker,
        target: { id: 'ship' },
        targetType: 'ship',
        lane: 'lane1',
        attackingPlayer: 'player1'
      }

      const result = calculateAiInterception(pendingAttack, mockPlayerStates, mockPlacedSections)

      expect(result.hasInterceptors).toBe(true)
      expect(result.interceptors.length).toBeGreaterThan(0)
      expect(result.interceptors[0].id).toBe('drone2')
    })

    it('excludes target drone from interceptors when targeting a drone', () => {
      // EXPLANATION: This test verifies that when attacking a specific enemy drone,
      // that target drone cannot intercept its own attacker. This prevents the logical
      // impossibility of a drone intercepting an attack directed at itself.
      // Expected: Target drone is excluded from interceptors list

      const attacker = {
        id: 'drone1',
        name: 'Bastion', // Speed 2
        owner: 'player1'
      }

      const targetDrone = {
        id: 'drone2',
        name: 'Dart', // Speed 6 (faster, but is the target)
        isExhausted: false,
        owner: 'player2'
      }

      const otherDefender = {
        id: 'drone3',
        name: 'Talon', // Speed 4 (faster, can intercept)
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(targetDrone, otherDefender)

      const pendingAttack = {
        attacker: attacker,
        target: targetDrone, // Targeting drone2
        targetType: 'drone',
        lane: 'lane1',
        attackingPlayer: 'player1'
      }

      const result = calculateAiInterception(pendingAttack, mockPlayerStates, mockPlacedSections)

      expect(result.hasInterceptors).toBe(true)
      expect(result.interceptors.some(d => d.id === 'drone2')).toBe(false) // Target excluded
      expect(result.interceptors.some(d => d.id === 'drone3')).toBe(true) // Other can intercept
    })

    it('correctly identifies defending player as opposite of attacking player', () => {
      // EXPLANATION: This test verifies that the function correctly determines which
      // player is defending based on who is attacking. This is essential for finding
      // interceptors from the correct player's drones.
      // Expected: When player1 attacks, checks player2's drones for interceptors

      const attacker = {
        id: 'drone1',
        name: 'Bastion',
        owner: 'player1'
      }

      const defender = {
        id: 'drone2',
        name: 'Dart',
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(defender)

      const pendingAttack = {
        attacker: attacker,
        target: { id: 'ship' },
        targetType: 'ship',
        lane: 'lane1',
        attackingPlayer: 'player1' // Player 1 attacking
      }

      const result = calculateAiInterception(pendingAttack, mockPlayerStates, mockPlacedSections)

      // Should find interceptors from player2 (the defender)
      expect(result.hasInterceptors).toBe(true)
      expect(result.interceptors[0].owner).toBe('player2')
    })

    it('handles player2 as attacker and player1 as defender', () => {
      // EXPLANATION: This test verifies that the function works symmetrically - it
      // correctly handles both player1 attacking player2 AND player2 attacking player1.
      // The interception logic should work the same regardless of which player is attacking.
      // Expected: When player2 attacks, checks player1's drones for interceptors

      const attacker = {
        id: 'drone1',
        name: 'Bastion',
        owner: 'player2'
      }

      const defender = {
        id: 'drone2',
        name: 'Dart',
        isExhausted: false,
        owner: 'player1'
      }

      mockPlayerStates.player2.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player1.dronesOnBoard.lane1.push(defender)

      const pendingAttack = {
        attacker: attacker,
        target: { id: 'ship' },
        targetType: 'ship',
        lane: 'lane1',
        attackingPlayer: 'player2' // Player 2 attacking
      }

      const result = calculateAiInterception(pendingAttack, mockPlayerStates, mockPlacedSections)

      // Should find interceptors from player1 (the defender)
      expect(result.hasInterceptors).toBe(true)
      expect(result.interceptors[0].owner).toBe('player1')
    })

    it('returns full attack details in result', () => {
      // EXPLANATION: This test verifies that the function returns the complete attack
      // details along with the interception information. The AI needs this full context
      // to make decisions about whether to proceed with or modify the attack.
      // Expected: result.attackDetails contains the original pendingAttack object

      const attacker = {
        id: 'drone1',
        name: 'Talon'
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)

      const pendingAttack = {
        attacker: attacker,
        target: { id: 'ship' },
        targetType: 'ship',
        lane: 'lane1',
        attackingPlayer: 'player1'
      }

      const result = calculateAiInterception(pendingAttack, mockPlayerStates, mockPlacedSections)

      expect(result.attackDetails).toEqual(pendingAttack)
      expect(result.attackDetails.attacker.id).toBe('drone1')
      expect(result.attackDetails.targetType).toBe('ship')
    })

    it('excludes exhausted drones from AI interception', () => {
      // EXPLANATION: This test verifies that exhausted defending drones are not included
      // in the AI's interception options, even if they have the speed to intercept.
      // This ensures the AI only considers drones that can actually act.
      // Expected: Exhausted drones not included in interceptors array

      const attacker = {
        id: 'drone1',
        name: 'Bastion', // Speed 2
        owner: 'player1'
      }

      const exhaustedFast = {
        id: 'drone2',
        name: 'Dart', // Speed 6, but exhausted
        isExhausted: true,
        owner: 'player2'
      }

      const readyFast = {
        id: 'drone3',
        name: 'Talon', // Speed 4, ready
        isExhausted: false,
        owner: 'player2'
      }

      mockPlayerStates.player1.dronesOnBoard.lane1.push(attacker)
      mockPlayerStates.player2.dronesOnBoard.lane1.push(exhaustedFast, readyFast)

      const pendingAttack = {
        attacker: attacker,
        target: { id: 'ship' },
        targetType: 'ship',
        lane: 'lane1',
        attackingPlayer: 'player1'
      }

      const result = calculateAiInterception(pendingAttack, mockPlayerStates, mockPlacedSections)

      expect(result.hasInterceptors).toBe(true)
      expect(result.interceptors.some(d => d.id === 'drone2')).toBe(false) // Exhausted excluded
      expect(result.interceptors.some(d => d.id === 'drone3')).toBe(true) // Ready included
    })
  })
})
