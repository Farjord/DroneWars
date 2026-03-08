import { describe, it, expect, vi, beforeEach } from 'vitest'
import roundManager from '../RoundManager.js'  // Singleton instance

/**
 * ROUND RESET - TRIGGER USAGE TRACKING TESTS
 *
 * At the start of each round, drones are "readied" which includes:
 * - Unexhausting all drones (isExhausted = false)
 * - Restoring shields
 * - Removing temporary stat modifications
 * - Resetting triggerUsesMap to {} (so RAPID/ASSAULT etc. can fire again)
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

// Mock TriggerProcessor to avoid EffectRouter import chain
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = vi.fn().mockReturnValue({
        triggered: false, newPlayerStates: null, animationEvents: []
      });
    }
  }
}))

vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_ROUND_START: 'ON_ROUND_START' }
}))

describe('RoundManager - triggerUsesMap reset', () => {
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
    statMods: [],
    triggerUsesMap: { 'Rapid Response': 1 },  // Used this round
    abilities: [{
      name: 'Rapid Response',
      type: 'TRIGGERED',
      trigger: 'ON_MOVE',
      usesPerRound: 1,
      keywordIcon: 'RAPID',
      effects: [{ type: 'DOES_NOT_EXHAUST' }]
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
    statMods: [],
    triggerUsesMap: { 'Assault Protocol': 1 },  // Used this round
    abilities: [{
      name: 'Assault Protocol',
      type: 'TRIGGERED',
      trigger: 'ON_ATTACK',
      usesPerRound: 1,
      keywordIcon: 'ASSAULT',
      effects: [{ type: 'DOES_NOT_EXHAUST' }]
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


  it('should reset triggerUsesMap to empty at round start for RAPID drone', () => {
    const blitzDrone = createRapidDrone()
    const playerState = createPlayerState({ lane1: [blitzDrone] })
    const opponentState = createOpponentState()

    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    const readiedDrone = result.dronesOnBoard.lane1[0]
    expect(readiedDrone.triggerUsesMap).toEqual({})
  })

  it('should reset triggerUsesMap to empty at round start for ASSAULT drone', () => {
    const strikerDrone = createAssaultDrone()
    const playerState = createPlayerState({ lane1: [strikerDrone] })
    const opponentState = createOpponentState()

    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    const readiedDrone = result.dronesOnBoard.lane1[0]
    expect(readiedDrone.triggerUsesMap).toEqual({})
  })

  it('should reset triggerUsesMap for drones with both abilities', () => {
    const dualAbilityDrone = {
      ...createRapidDrone(),
      triggerUsesMap: { 'Rapid Response': 1, 'Assault Protocol': 1 },
      abilities: [
        { name: 'Rapid Response', type: 'TRIGGERED', trigger: 'ON_MOVE', usesPerRound: 1, keywordIcon: 'RAPID', effects: [{ type: 'DOES_NOT_EXHAUST' }] },
        { name: 'Assault Protocol', type: 'TRIGGERED', trigger: 'ON_ATTACK', usesPerRound: 1, keywordIcon: 'ASSAULT', effects: [{ type: 'DOES_NOT_EXHAUST' }] }
      ]
    }
    const playerState = createPlayerState({ lane1: [dualAbilityDrone] })
    const opponentState = createOpponentState()

    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    const readiedDrone = result.dronesOnBoard.lane1[0]
    expect(readiedDrone.triggerUsesMap).toEqual({})
  })

  it('should still unexhaust drones as before', () => {
    const exhaustedDrone = createRapidDrone({ isExhausted: true })
    const playerState = createPlayerState({ lane1: [exhaustedDrone] })
    const opponentState = createOpponentState()

    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    const readiedDrone = result.dronesOnBoard.lane1[0]
    expect(readiedDrone.isExhausted).toBe(false)
  })

  it('should reset triggerUsesMap for all drones in all lanes', () => {
    const blitzDrone = createRapidDrone()
    const strikerDrone = createAssaultDrone()
    const playerState = createPlayerState({
      lane1: [blitzDrone],
      lane2: [strikerDrone]
    })
    const opponentState = createOpponentState()

    const result = roundManager.readyDronesAndRestoreShields(
      playerState,
      opponentState,
      placedSections
    )

    expect(result.dronesOnBoard.lane1[0].triggerUsesMap).toEqual({})
    expect(result.dronesOnBoard.lane2[0].triggerUsesMap).toEqual({})
  })
})
