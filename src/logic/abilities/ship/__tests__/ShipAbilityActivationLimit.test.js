import { describe, it, expect, vi, beforeEach } from 'vitest'

// ========================================
// SHIP ABILITY ACTIVATION LIMIT TESTS
// ========================================
// TDD tests for ensuring ship ability processors increment abilityActivationCount
// These tests should FAIL initially, then pass after the fix is applied

// Mock dependencies
vi.mock('../../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('../../../effects/cards/DrawEffectProcessor.js', () => ({
  default: class MockDrawEffectProcessor {
    process(effect, context) {
      // Return player states unchanged for testing
      return {
        newPlayerStates: context.playerStates,
        animationEvents: []
      }
    }
  }
}))

vi.mock('../../../shields/ShieldManager.js', () => ({
  default: {
    validateShieldRemoval: vi.fn(() => ({ valid: true })),
    validateShieldAddition: vi.fn(() => ({ valid: true }))
  }
}))

vi.mock('../../../utils/auraManager.js', () => ({
  updateAuras: vi.fn((playerState) => playerState.dronesOnBoard)
}))

vi.mock('../../../utils/gameEngineUtils.js', () => ({
  getLaneOfDrone: vi.fn(() => 'lane1')
}))

vi.mock('../../../utils/droneStateUtils.js', () => ({
  onDroneRecalled: vi.fn((playerState) => playerState)
}))

// Import processors after mocks
import RecalculateAbilityProcessor from '../RecalculateAbilityProcessor.js'
import TargetLockAbilityProcessor from '../TargetLockAbilityProcessor.js'
import RecallAbilityProcessor from '../RecallAbilityProcessor.js'
import ReallocateShieldsAbilityProcessor from '../ReallocateShieldsAbilityProcessor.js'

describe('Ship Ability Activation Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Helper to create player states for testing
   */
  const createPlayerStates = () => ({
    player1: {
      name: 'Player 1',
      energy: 10,
      hand: [{ id: 'card1', name: 'Test Card', instanceId: 'inst1', cost: { energy: 1 } }],
      deck: [],
      discardPile: [],
      shipSections: {
        bridge: { allocatedShields: 2, shields: 5, abilityActivationCount: 0 },
        tacticalBridge: { allocatedShields: 2, shields: 5, abilityActivationCount: 0 },
        powerCell: { allocatedShields: 1, shields: 5, abilityActivationCount: 0 },
        droneControlHub: { allocatedShields: 2, shields: 5, abilityActivationCount: 0 }
      },
      dronesOnBoard: {
        lane1: [{ id: 'drone1', name: 'Test Drone' }],
        lane2: [],
        lane3: []
      }
    },
    player2: {
      name: 'Player 2',
      energy: 10,
      hand: [],
      deck: [],
      discardPile: [],
      shipSections: {
        bridge: { allocatedShields: 2, shields: 5, abilityActivationCount: 0 },
        powerCell: { allocatedShields: 2, shields: 5, abilityActivationCount: 0 },
        droneControlHub: { allocatedShields: 1, shields: 5, abilityActivationCount: 0 }
      },
      dronesOnBoard: {
        lane1: [{ id: 'enemy1', name: 'Enemy Drone' }],
        lane2: [],
        lane3: []
      }
    }
  })

  describe('RecalculateAbilityProcessor', () => {
    it('should increment abilityActivationCount on bridge section after process()', () => {
      const playerStates = createPlayerStates()

      // Verify initial count is 0
      expect(playerStates.player1.shipSections.bridge.abilityActivationCount).toBe(0)

      // Process the Recalculate ability
      const result = RecalculateAbilityProcessor.process(
        { sectionName: 'bridge', playerId: 'player1' },
        playerStates,
        'player1',
        'local'
      )

      // EXPECTED: abilityActivationCount should be incremented to 1
      // This test will FAIL until RecalculateAbilityProcessor is fixed
      expect(result.newPlayerStates.player1.shipSections.bridge.abilityActivationCount).toBe(1)
    })

    it('should increment count from existing value (not reset to 1)', () => {
      const playerStates = createPlayerStates()
      // Set initial count to 5 (simulating multiple uses already tracked)
      playerStates.player1.shipSections.bridge.abilityActivationCount = 5

      const result = RecalculateAbilityProcessor.process(
        { sectionName: 'bridge', playerId: 'player1' },
        playerStates,
        'player1',
        'local'
      )

      // Should increment to 6, not reset to 1
      expect(result.newPlayerStates.player1.shipSections.bridge.abilityActivationCount).toBe(6)
    })
  })

  describe('TargetLockAbilityProcessor', () => {
    it('should increment abilityActivationCount on tacticalBridge section after process()', () => {
      const playerStates = createPlayerStates()

      // Verify initial count is 0
      expect(playerStates.player1.shipSections.tacticalBridge.abilityActivationCount).toBe(0)

      // Process the Target Lock ability
      const result = TargetLockAbilityProcessor.process(
        { targetId: 'enemy1', sectionName: 'tacticalBridge', playerId: 'player1' },
        playerStates
      )

      // EXPECTED: abilityActivationCount should be incremented to 1
      expect(result.newPlayerStates.player1.shipSections.tacticalBridge.abilityActivationCount).toBe(1)
    })
  })

  describe('RecallAbilityProcessor', () => {
    it('should increment abilityActivationCount on droneControlHub section after process()', () => {
      const playerStates = createPlayerStates()
      const placedSections = { lane1: 'bridge', lane2: 'powerCell', lane3: 'droneControlHub' }

      // Verify initial count is 0
      expect(playerStates.player1.shipSections.droneControlHub.abilityActivationCount).toBe(0)

      // Process the Recall ability
      const result = RecallAbilityProcessor.process(
        { targetId: 'drone1', sectionName: 'droneControlHub', playerId: 'player1' },
        playerStates,
        placedSections
      )

      // EXPECTED: abilityActivationCount should be incremented to 1
      expect(result.newPlayerStates.player1.shipSections.droneControlHub.abilityActivationCount).toBe(1)
    })
  })

  describe('ReallocateShieldsAbilityProcessor', () => {
    it('should increment abilityActivationCount on powerCell section after complete()', () => {
      const playerStates = createPlayerStates()

      // Verify initial count is 0
      expect(playerStates.player1.shipSections.powerCell.abilityActivationCount).toBe(0)

      // Complete the Reallocate Shields ability (this is where state is finalized)
      const result = ReallocateShieldsAbilityProcessor.complete(
        { playerId: 'player1', sectionName: 'powerCell', pendingChanges: {} },
        playerStates
      )

      // EXPECTED: abilityActivationCount should be incremented to 1
      expect(result.newPlayerStates.player1.shipSections.powerCell.abilityActivationCount).toBe(1)
    })

    it('should NOT increment count during process() remove/add actions', () => {
      const playerStates = createPlayerStates()
      const currentState = {
        turnPhase: 'action',
        placedSections: ['bridge', 'powerCell', 'droneControlHub']
      }

      // Process a remove action
      const result = ReallocateShieldsAbilityProcessor.process(
        { action: 'remove', sectionName: 'bridge', playerId: 'player1' },
        playerStates,
        currentState
      )

      // process() should NOT increment - only complete() should
      expect(result.newPlayerStates.player1.shipSections.powerCell.abilityActivationCount).toBe(0)
    })
  })
})
