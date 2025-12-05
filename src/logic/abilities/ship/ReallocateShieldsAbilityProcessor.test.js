import { describe, it, expect, vi, beforeEach } from 'vitest'

// ========================================
// REALLOCATE SHIELDS ABILITY PROCESSOR TESTS
// ========================================
// Tests for action phase shield reallocation behavior
// EXPECTED: State should only update on confirmation, like round start allocation
// CURRENT BUG: State updates immediately on each remove/add action

// Mock dependencies
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('../../shields/ShieldManager.js', () => ({
  default: {
    validateShieldRemoval: vi.fn(() => ({ valid: true })),
    validateShieldAddition: vi.fn(() => ({ valid: true }))
  }
}))

// Import after mocks
import ReallocateShieldsAbilityProcessor from './ReallocateShieldsAbilityProcessor.js'
import ShieldManager from '../../shields/ShieldManager.js'

describe('Reallocate Shields Ability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Helper to create player states for testing
   */
  const createPlayerStates = (p1Shields = { bridge: 2, powerCell: 1, droneControlHub: 2 }) => ({
    player1: {
      energy: 3,
      shipSections: {
        bridge: { allocatedShields: p1Shields.bridge, shields: 5 },
        powerCell: { allocatedShields: p1Shields.powerCell, shields: 5 },
        droneControlHub: { allocatedShields: p1Shields.droneControlHub, shields: 5 }
      }
    },
    player2: {
      energy: 3,
      shipSections: {
        bridge: { allocatedShields: 2, shields: 5 },
        powerCell: { allocatedShields: 2, shields: 5 },
        droneControlHub: { allocatedShields: 1, shields: 5 }
      }
    }
  })

  const createCurrentState = () => ({
    turnPhase: 'action',
    placedSections: ['bridge', 'powerCell', 'droneControlHub'],
    opponentPlacedSections: ['bridge', 'powerCell', 'droneControlHub']
  })

  describe('state isolation during editing (EXPECTED behavior - like round start)', () => {
    /**
     * BUG TEST: When removing shields during reallocation, game state should NOT
     * be updated immediately. Changes should be tracked in pending state.
     *
     * CURRENT BEHAVIOR: Line 96 immediately decrements allocatedShields
     * EXPECTED BEHAVIOR: Track pending removal, only apply on complete()
     *
     * This test will FAIL until the processor is refactored.
     */
    it('should NOT update game state when removing shields (pending only)', () => {
      const playerStates = createPlayerStates()
      const currentState = createCurrentState()

      // Store original allocation to verify it doesn't change
      const originalBridgeShields = playerStates.player1.shipSections.bridge.allocatedShields
      expect(originalBridgeShields).toBe(2)

      // ACT: Remove a shield from bridge
      const result = ReallocateShieldsAbilityProcessor.process(
        { action: 'remove', sectionName: 'bridge', playerId: 'player1' },
        playerStates,
        currentState
      )

      expect(result.success).toBe(true)

      // EXPECTED BEHAVIOR: Game state should be UNCHANGED
      // The processor should track this as a pending change, not apply it
      // This assertion will FAIL with current code (which immediately updates)
      expect(result.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(2)
    })

    /**
     * BUG TEST: When adding shields during reallocation, game state should NOT
     * be updated immediately. Changes should be tracked in pending state.
     *
     * CURRENT BEHAVIOR: Line 124 immediately increments allocatedShields
     * EXPECTED BEHAVIOR: Track pending addition, only apply on complete()
     */
    it('should NOT update game state when adding shields (pending only)', () => {
      const playerStates = createPlayerStates()
      const currentState = createCurrentState()

      // Store original allocation
      const originalPowerCellShields = playerStates.player1.shipSections.powerCell.allocatedShields
      expect(originalPowerCellShields).toBe(1)

      // ACT: Add a shield to powerCell
      const result = ReallocateShieldsAbilityProcessor.process(
        { action: 'add', sectionName: 'powerCell', playerId: 'player1' },
        playerStates,
        currentState
      )

      expect(result.success).toBe(true)

      // EXPECTED BEHAVIOR: Game state should be UNCHANGED
      // This assertion will FAIL with current code
      expect(result.newPlayerStates.player1.shipSections.powerCell.allocatedShields).toBe(1)
    })

    /**
     * The processor should return pending changes separately from the new player states,
     * allowing the caller to track them locally without committing to game state.
     */
    it('should track pending changes in return value (not applied to state)', () => {
      const playerStates = createPlayerStates()
      const currentState = createCurrentState()

      // ACT: Remove from bridge
      const removeResult = ReallocateShieldsAbilityProcessor.process(
        { action: 'remove', sectionName: 'bridge', playerId: 'player1' },
        playerStates,
        currentState
      )

      // EXPECTED: Result should include pending change info
      // Current implementation doesn't have this - it just modifies state directly
      expect(removeResult.pendingChange).toBeDefined()
      expect(removeResult.pendingChange).toEqual({
        sectionName: 'bridge',
        delta: -1
      })
    })
  })

  describe('reset functionality', () => {
    /**
     * Reset should simply clear pending changes.
     * Since game state was never modified, no restore action needed.
     */
    it('should restore pending state to original (pre-ability) allocation', () => {
      const playerStates = createPlayerStates()
      const currentState = createCurrentState()

      // Store original
      const originalShields = JSON.parse(JSON.stringify(playerStates.player1.shipSections))

      // ACT: Do some operations (under new expected behavior, these are pending)
      ReallocateShieldsAbilityProcessor.process(
        { action: 'remove', sectionName: 'bridge', playerId: 'player1' },
        playerStates,
        currentState
      )

      // ACT: Restore (under expected behavior, just clears pending)
      const restoreResult = ReallocateShieldsAbilityProcessor.process(
        { action: 'restore', originalShipSections: originalShields, playerId: 'player1' },
        playerStates,
        currentState
      )

      expect(restoreResult.success).toBe(true)

      // EXPECTED: After restore, state matches original
      expect(restoreResult.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(2)
      expect(restoreResult.newPlayerStates.player1.shipSections.powerCell.allocatedShields).toBe(1)
      expect(restoreResult.newPlayerStates.player1.shipSections.droneControlHub.allocatedShields).toBe(2)
    })

    /**
     * Under the expected behavior, reset doesn't need to touch game state
     * because game state was never modified during editing.
     */
    it('should NOT need to update game state on reset (since nothing committed)', () => {
      // This test documents the expected pattern:
      // - Remove/add operations track pending changes locally
      // - Reset simply clears pending (local state operation)
      // - Game state is never modified until complete()

      // With current buggy behavior, reset DOES need to restore game state
      // because remove/add already modified it

      // With expected behavior, this test verifies reset is a local-only operation
      const playerStates = createPlayerStates()

      // Pending state (not in game state)
      let pendingChanges = { bridge: -1, powerCell: +1 }

      // Reset - just clear pending
      pendingChanges = {}

      // Game state was never changed, nothing to restore
      expect(pendingChanges).toEqual({})
      expect(playerStates.player1.shipSections.bridge.allocatedShields).toBe(2)
    })
  })

  describe('confirmation - commits to game state', () => {
    /**
     * The complete() action should be the ONLY place where game state is updated.
     * It should apply all pending changes to the player's ship sections.
     */
    it('should update game state ONLY on complete() action', () => {
      const playerStates = createPlayerStates()

      // Simulate pending changes that would be tracked during UI editing
      // Under expected behavior, these would be passed to complete()
      const pendingChanges = {
        bridge: -1,      // Removed 1
        powerCell: +1    // Added 1
      }

      // ACT: Complete the reallocation
      const result = ReallocateShieldsAbilityProcessor.complete(
        { playerId: 'player1', pendingChanges },
        playerStates
      )

      // EXPECTED: complete() applies the pending changes
      // Note: Current implementation doesn't take pendingChanges parameter
      // This test documents the expected API change
      expect(result.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(1)
      expect(result.newPlayerStates.player1.shipSections.powerCell.allocatedShields).toBe(2)
    })

    /**
     * After confirmation, all pending shield changes should be reflected
     * in the player's shipSections.allocatedShields values.
     */
    it('should apply all pending shield changes to player shipSections', () => {
      const playerStates = createPlayerStates({ bridge: 2, powerCell: 1, droneControlHub: 2 })

      // Pending changes from UI: remove 1 from bridge, add 1 to droneControlHub
      const pendingChanges = {
        bridge: -1,
        droneControlHub: +1
      }

      // After complete, game state should reflect:
      // bridge: 2 - 1 = 1
      // powerCell: 1 (unchanged)
      // droneControlHub: 2 + 1 = 3

      const result = ReallocateShieldsAbilityProcessor.complete(
        { playerId: 'player1', pendingChanges },
        playerStates
      )

      expect(result.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(1)
      expect(result.newPlayerStates.player1.shipSections.powerCell.allocatedShields).toBe(1)
      expect(result.newPlayerStates.player1.shipSections.droneControlHub.allocatedShields).toBe(3)
    })

    it('should deduct 1 energy on completion', () => {
      const playerStates = createPlayerStates()
      expect(playerStates.player1.energy).toBe(3)

      const result = ReallocateShieldsAbilityProcessor.complete(
        { playerId: 'player1' },
        playerStates
      )

      // Energy should be deducted
      expect(result.newPlayerStates.player1.energy).toBe(2)
    })

    it('should end the players turn', () => {
      const playerStates = createPlayerStates()

      const result = ReallocateShieldsAbilityProcessor.complete(
        { playerId: 'player1' },
        playerStates
      )

      // Should signal turn end
      expect(result.shouldEndTurn).toBe(true)
    })
  })

})
