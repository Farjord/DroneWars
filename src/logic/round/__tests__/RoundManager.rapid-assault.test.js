import { describe, it, expect, vi, beforeEach } from 'vitest'
import roundManager from '../RoundManager.js'  // Singleton instance

/**
 * ROUND RESET - RAPID/ASSAULT FLAGS TESTS
 *
 * At the start of each round, drones are "readied" which includes:
 * - Unexhausting all drones (isExhausted = false)
 * - Restoring shields
 * - Removing temporary stat modifications
 * - Resetting RAPID/ASSAULT ability usage flags (NEW)
 *
 * The rapidUsed and assaultUsed flags must be reset to false at round start
 * so that drones with these abilities can use them again.
 */

// Mock the statsCalculator to avoid complex dependencies
vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({
    maxShields: drone.shields || 1,
    attack: drone.attack || 1,
    speed: drone.speed || 1,
    keywords: new Set()
  }))
}))

describe('RoundManager - RAPID/ASSAULT flag reset', () => {
  // Helper to create a drone with RAPID ability
  const createRapidDrone = (overrides = {}) => ({
    id: 'blitz_drone_1',
    name: 'Blitz',
    attack: 2,
    hull: 2,
    shields: 1,
    speed: 5,
    isExhausted: true,
    doesNotReady: false,
    rapidUsed: true,  // Used this round
    assaultUsed: false,
    statMods: [],
    abilities: [{
      name: 'Rapid Response',
      type: 'PASSIVE',
      effect: { type: 'GRANT_KEYWORD', keyword: 'RAPID' }
    }],
    ...overrides
  })

  // Helper to create a drone with ASSAULT ability
  const createAssaultDrone = (overrides = {}) => ({
    id: 'striker_drone_1',
    name: 'Striker',
    attack: 3,
    hull: 2,
    shields: 1,
    speed: 3,
    isExhausted: true,
    doesNotReady: false,
    rapidUsed: false,
    assaultUsed: true,  // Used this round
    statMods: [],
    abilities: [{
      name: 'Assault Protocol',
      type: 'PASSIVE',
      effect: { type: 'GRANT_KEYWORD', keyword: 'ASSAULT' }
    }],
    ...overrides
  })

  // Helper to create player state
  const createPlayerState = (drones = {}) => ({
    name: 'Player 1',
    dronesOnBoard: {
      lane1: drones.lane1 || [],
      lane2: drones.lane2 || [],
      lane3: drones.lane3 || []
    },
    appliedUpgrades: {},
    deployedDroneCounts: {}
  })

  // Helper to create opponent state
  const createOpponentState = () => ({
    name: 'Player 2',
    dronesOnBoard: {
      lane1: [],
      lane2: [],
      lane3: []
    },
    appliedUpgrades: {},
    deployedDroneCounts: {}
  })

  // Mock placed sections
  const placedSections = {
    player1: ['core', null, null],
    player2: ['core', null, null]
  }


  it('should reset rapidUsed to false at round start', () => {
    // EXPLANATION: At the start of each round, drones with the RAPID ability
    // should have their rapidUsed flag reset to false so they can use the
    // ability again in the new round.

    // Setup: Blitz Drone with rapidUsed=true (used last round)
    const blitzDrone = createRapidDrone({ rapidUsed: true })
    const playerState = createPlayerState({ lane1: [blitzDrone] })
    const opponentState = createOpponentState()

    // Action: Ready drones for new round
    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    // Assert: rapidUsed should be reset to false
    const readiedDrone = result.dronesOnBoard.lane1[0]
    expect(readiedDrone.rapidUsed).toBe(false)
  })

  it('should reset assaultUsed to false at round start', () => {
    // EXPLANATION: At the start of each round, drones with the ASSAULT ability
    // should have their assaultUsed flag reset to false so they can use the
    // ability again in the new round.

    // Setup: Striker Drone with assaultUsed=true (used last round)
    const strikerDrone = createAssaultDrone({ assaultUsed: true })
    const playerState = createPlayerState({ lane1: [strikerDrone] })
    const opponentState = createOpponentState()

    // Action: Ready drones for new round
    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    // Assert: assaultUsed should be reset to false
    const readiedDrone = result.dronesOnBoard.lane1[0]
    expect(readiedDrone.assaultUsed).toBe(false)
  })

  it('should reset both rapidUsed and assaultUsed for drones with both abilities', () => {
    // EXPLANATION: A drone could potentially have both RAPID and ASSAULT through
    // upgrades. Both flags should be reset independently at round start.

    // Setup: Drone with both abilities used
    const dualAbilityDrone = {
      ...createRapidDrone(),
      rapidUsed: true,
      assaultUsed: true,
      abilities: [
        { name: 'Rapid Response', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'RAPID' } },
        { name: 'Assault Protocol', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'ASSAULT' } }
      ]
    }
    const playerState = createPlayerState({ lane1: [dualAbilityDrone] })
    const opponentState = createOpponentState()

    // Action: Ready drones for new round
    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    // Assert: Both flags should be reset to false
    const readiedDrone = result.dronesOnBoard.lane1[0]
    expect(readiedDrone.rapidUsed).toBe(false)
    expect(readiedDrone.assaultUsed).toBe(false)
  })

  it('should still unexhaust drones as before', () => {
    // EXPLANATION: The existing behavior of unexhausting drones at round start
    // should remain intact alongside the new RAPID/ASSAULT reset.

    // Setup: Exhausted drone
    const exhaustedDrone = createRapidDrone({ isExhausted: true })
    const playerState = createPlayerState({ lane1: [exhaustedDrone] })
    const opponentState = createOpponentState()

    // Action: Ready drones for new round
    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    // Assert: Drone should be unexhausted
    const readiedDrone = result.dronesOnBoard.lane1[0]
    expect(readiedDrone.isExhausted).toBe(false)
  })

  it('should reset flags for all drones in all lanes', () => {
    // EXPLANATION: Multiple drones across all lanes should have their flags reset.

    // Setup: Drones in different lanes with used abilities
    const blitzDrone = createRapidDrone({ rapidUsed: true })
    const strikerDrone = createAssaultDrone({ assaultUsed: true })
    const playerState = createPlayerState({
      lane1: [blitzDrone],
      lane2: [strikerDrone]
    })
    const opponentState = createOpponentState()

    // Action: Ready drones for new round
    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    // Assert: Both drones should have their flags reset
    expect(result.dronesOnBoard.lane1[0].rapidUsed).toBe(false)
    expect(result.dronesOnBoard.lane2[0].assaultUsed).toBe(false)
  })
})
