import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ========================================
// COMBAT OUTCOME PROCESSOR TESTS
// ========================================
// Tests for PoI combat integration - ensuring pendingPOICombat is preserved
// when collecting combat salvage so TacticalMapScreen can show PoI loot after.

// Mock dependencies
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}))

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('../loot/LootGenerator.js', () => ({
  default: {
    generateCombatSalvage: vi.fn()
  }
}))

// Import after mocks are set up
import CombatOutcomeProcessor from './CombatOutcomeProcessor.js'
import gameStateManager from '../../managers/GameStateManager.js'

describe('CombatOutcomeProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('finalizeLootCollection - PoI Combat Integration', () => {
    /**
     * BUG FIX TEST: When player wins combat at a PoI, the pendingPOICombat
     * field should be preserved so TacticalMapScreen can offer PoI loot.
     *
     * Current behavior: finalizeLootCollection clears all state including pendingPOICombat
     * Expected behavior: pendingPOICombat should be preserved in updatedRunState
     */
    it('should preserve pendingPOICombat when collecting combat salvage', () => {
      // EXPLANATION: After winning combat at a PoI, the player should be able
      // to loot the PoI contents. This requires pendingPOICombat to persist
      // through the combat salvage collection phase.

      const mockState = {
        currentRunState: {
          collectedLoot: [],
          creditsEarned: 0,
          aiCoresEarned: 0,
          pendingPOICombat: {
            q: 2,
            r: -1,
            packType: 'MIXED_PACK',
            poiName: 'Abandoned Outpost',
            remainingWaypoints: []
          }
        }
      }

      gameStateManager.getState.mockReturnValue(mockState)

      // Combat salvage loot (not PoI loot)
      const combatLoot = {
        cards: [{ cardId: 'CARD001', cardName: 'Standard Fighter', rarity: 'Common' }],
        credits: 50,
        aiCores: 0
      }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert: pendingPOICombat should still be present in the updated state
      expect(gameStateManager.setState).toHaveBeenCalled()
      const setStateCall = gameStateManager.setState.mock.calls[0][0]

      expect(setStateCall.currentRunState.pendingPOICombat).toBeDefined()
      expect(setStateCall.currentRunState.pendingPOICombat.q).toBe(2)
      expect(setStateCall.currentRunState.pendingPOICombat.r).toBe(-1)
      expect(setStateCall.currentRunState.pendingPOICombat.packType).toBe('MIXED_PACK')
      expect(setStateCall.currentRunState.pendingPOICombat.poiName).toBe('Abandoned Outpost')
    })

    it('should preserve remainingWaypoints in pendingPOICombat', () => {
      // EXPLANATION: Remaining waypoints need to persist so the journey can resume
      // after both combat salvage AND PoI loot have been collected.

      const remainingWaypoints = [
        { hex: { q: 3, r: -2, type: 'empty' }, pathFromPrev: [] },
        { hex: { q: 4, r: -3, type: 'gate' }, pathFromPrev: [] }
      ]

      const mockState = {
        currentRunState: {
          collectedLoot: [],
          creditsEarned: 0,
          aiCoresEarned: 0,
          pendingPOICombat: {
            q: 2,
            r: -1,
            packType: 'MIXED_PACK',
            poiName: 'Salvage Cache',
            remainingWaypoints: remainingWaypoints
          }
        }
      }

      gameStateManager.getState.mockReturnValue(mockState)

      const combatLoot = { cards: [], credits: 100, aiCores: 0 }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert
      const setStateCall = gameStateManager.setState.mock.calls[0][0]
      expect(setStateCall.currentRunState.pendingPOICombat.remainingWaypoints).toEqual(remainingWaypoints)
      expect(setStateCall.currentRunState.pendingPOICombat.remainingWaypoints.length).toBe(2)
    })

    it('should NOT have pendingPOICombat when combat was not at a PoI', () => {
      // EXPLANATION: Random ambushes (not at PoIs) should not set pendingPOICombat.
      // After such combat, there's no PoI to loot.

      const mockState = {
        currentRunState: {
          collectedLoot: [],
          creditsEarned: 0,
          aiCoresEarned: 0
          // No pendingPOICombat - this was a random ambush
        }
      }

      gameStateManager.getState.mockReturnValue(mockState)

      const combatLoot = { cards: [], credits: 50, aiCores: 0 }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert: pendingPOICombat should remain undefined (not present)
      const setStateCall = gameStateManager.setState.mock.calls[0][0]
      expect(setStateCall.currentRunState.pendingPOICombat).toBeUndefined()
    })

    it('should still collect combat salvage correctly while preserving pendingPOICombat', () => {
      // EXPLANATION: The main functionality of finalizeLootCollection should
      // continue to work - adding cards, credits, and aiCores to the run state.

      const mockState = {
        currentRunState: {
          collectedLoot: [
            { type: 'card', cardId: 'EXISTING_CARD', cardName: 'Old Card', rarity: 'Common' }
          ],
          creditsEarned: 100,
          aiCoresEarned: 1,
          pendingPOICombat: { q: 0, r: 0, packType: 'CREDITS', poiName: 'Test' }
        }
      }

      gameStateManager.getState.mockReturnValue(mockState)

      const combatLoot = {
        cards: [{ cardId: 'NEW_CARD', cardName: 'New Card', rarity: 'Rare' }],
        credits: 75,
        aiCores: 2
      }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert: Both loot collection AND pendingPOICombat preservation work
      const setStateCall = gameStateManager.setState.mock.calls[0][0]

      // Loot was collected: 1 existing + 1 new card + 1 credits + 1 aiCores = 4 items
      expect(setStateCall.currentRunState.collectedLoot.length).toBe(4)
      expect(setStateCall.currentRunState.creditsEarned).toBe(175) // 100 + 75
      expect(setStateCall.currentRunState.aiCoresEarned).toBe(3) // 1 + 2

      // pendingPOICombat preserved
      expect(setStateCall.currentRunState.pendingPOICombat).toBeDefined()
    })
  })
})
