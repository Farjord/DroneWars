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
    setState: vi.fn(),
    endRun: vi.fn(),
    resetGameState: vi.fn()
  }
}))

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('../loot/LootGenerator.js', () => ({
  default: {
    generateCombatSalvage: vi.fn(() => ({
      cards: [],
      credits: 0,
      aiCores: 0,
      blueprint: null
    })),
    generateDroneBlueprint: vi.fn()
  }
}))

vi.mock('./ExtractionController.js', () => ({
  default: {
    completePostBlockadeExtraction: vi.fn(() => ({
      success: true,
      cardsAcquired: 0,
      creditsEarned: 0
    }))
  }
}))

// Import after mocks are set up
import CombatOutcomeProcessor from './CombatOutcomeProcessor.js'
import gameStateManager from '../../managers/GameStateManager.js'
import ExtractionController from './ExtractionController.js'

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

  describe('finalizeLootCollection - game state cleanup with resetGameState', () => {
    /**
     * REFACTOR TEST: finalizeLootCollection should use resetGameState()
     * instead of inline setState with many individual fields.
     *
     * Current behavior: Uses inline setState with ~20 fields listed
     * Expected behavior: Calls resetGameState() then setState for app-specific fields
     *
     * This test will FAIL until refactored.
     */
    it('should call resetGameState() when finalizing loot collection', () => {
      // SETUP: Simulate victory with pending loot
      gameStateManager.getState.mockReturnValue({
        currentRunState: {
          shipSlotId: 0,
          collectedLoot: [],
          creditsEarned: 0,
          aiCoresEarned: 0
        }
      })

      const loot = {
        cards: [{ cardId: 'card1', cardName: 'Test Card', rarity: 'common' }],
        credits: 100,
        aiCores: 1,
        blueprint: null
      }

      // ACT: Finalize loot collection
      CombatOutcomeProcessor.finalizeLootCollection(loot)

      // ASSERT: resetGameState should be called for centralized cleanup
      expect(gameStateManager.resetGameState).toHaveBeenCalled()
    })
  })

  describe('processDefeat - game state cleanup with resetGameState', () => {
    /**
     * REFACTOR TEST: processDefeat should use resetGameState()
     * instead of inline setState with many individual fields.
     *
     * Current behavior: Uses inline setState with ~20 fields listed
     * Expected behavior: Calls resetGameState() then setState for app-specific fields
     *
     * This test will FAIL until refactored.
     */
    it('should call resetGameState() when processing defeat', () => {
      // SETUP: Simulate defeat state
      gameStateManager.getState.mockReturnValue({
        currentRunState: {
          shipSlotId: 0,
          combatsLost: 0
        }
      })

      const gameState = {
        winner: 'player2',
        player1: { name: 'Player', shipSections: {} },
        player2: { name: 'AI', shipSections: {} }
      }

      const encounterInfo = { enemyId: 'test-enemy', tier: 1 }

      // ACT: Process defeat
      CombatOutcomeProcessor.processDefeat(gameState, encounterInfo)

      // ASSERT: endRun should be called for MIA processing
      expect(gameStateManager.endRun).toHaveBeenCalledWith(false)

      // ASSERT: resetGameState should be called for centralized cleanup
      expect(gameStateManager.resetGameState).toHaveBeenCalled()
    })

    it('should NOT duplicate field clearing that resetGameState handles', () => {
      // SETUP
      gameStateManager.getState.mockReturnValue({
        currentRunState: { shipSlotId: 0 }
      })

      const gameState = {
        winner: 'player2',
        player1: { shipSections: {} },
        player2: { shipSections: {} }
      }

      // ACT
      CombatOutcomeProcessor.processDefeat(gameState, {})

      // ASSERT: The setState call should NOT include fields that resetGameState handles
      // This ensures we're using the centralized cleanup instead of duplicating
      const setStateCalls = gameStateManager.setState.mock.calls

      // Find the call that sets appState (the final cleanup call)
      const cleanupCall = setStateCalls.find(call =>
        call[0].appState === 'hangar'
      )

      if (cleanupCall) {
        // These fields should NOT be in the cleanup setState - resetGameState handles them
        expect(cleanupCall[0].player1).toBeUndefined()
        expect(cleanupCall[0].player2).toBeUndefined()
        expect(cleanupCall[0].turnPhase).toBeUndefined()
        expect(cleanupCall[0].gameStage).toBeUndefined()
        expect(cleanupCall[0].winner).toBeUndefined()
      }
    })
  })

  describe('processCombatEnd - routing', () => {
    it('should route to processVictory when player1 wins', () => {
      // SETUP
      gameStateManager.getState.mockReturnValue({
        currentRunState: { shipSlotId: 0 }
      })

      const gameState = {
        winner: 'player1',
        player1: { shipSections: {} },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      const result = CombatOutcomeProcessor.processCombatEnd(gameState)

      // ASSERT: Should return victory outcome
      expect(result.outcome).toBe('victory')
    })

    it('should route to processDefeat when player2 wins', () => {
      // SETUP
      gameStateManager.getState.mockReturnValue({
        currentRunState: { shipSlotId: 0 }
      })

      const gameState = {
        winner: 'player2',
        player1: { shipSections: {} },
        player2: { shipSections: {} },
        singlePlayerEncounter: {}
      }

      // ACT
      const result = CombatOutcomeProcessor.processCombatEnd(gameState)

      // ASSERT: Should return defeat outcome
      expect(result.outcome).toBe('defeat')
    })
  })

  describe('finalizeLootCollection - Blockade Extraction Victory', () => {
    /**
     * BUG FIX TESTS: When player wins a blockade combat during extraction,
     * they should return to tactical map with pendingBlockadeExtraction flag.
     * TacticalMapScreen will then handle the extraction flow (including
     * loot selection modal and run summary).
     *
     * This approach reuses the existing extraction flow rather than
     * duplicating it in finalizeLootCollection.
     */

    it('should set pendingBlockadeExtraction flag for blockade victory', () => {
      // EXPLANATION: After winning a blockade encounter, we return to tactical
      // map with a flag. TacticalMapScreen detects this flag and triggers
      // extraction automatically, which properly handles loot selection and
      // run summary.

      gameStateManager.getState.mockReturnValue({
        currentRunState: {
          collectedLoot: [],
          creditsEarned: 0,
          aiCoresEarned: 0
        },
        singlePlayerEncounter: { isBlockade: true }
      })

      const combatLoot = { cards: [], credits: 0, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Should go to tactical map with pendingBlockadeExtraction flag
      const setStateCalls = gameStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.appState).toBe('tacticalMap')
      expect(finalCall.currentRunState.pendingBlockadeExtraction).toBe(true)
    })

    it('should NOT call completePostBlockadeExtraction directly (TacticalMapScreen handles it)', () => {
      // EXPLANATION: Extraction is now handled by TacticalMapScreen via the
      // pendingBlockadeExtraction flag, not directly in finalizeLootCollection.

      gameStateManager.getState.mockReturnValue({
        currentRunState: {
          collectedLoot: [],
          creditsEarned: 0,
          aiCoresEarned: 0
        },
        singlePlayerEncounter: { isBlockade: true }
      })

      const combatLoot = { cards: [], credits: 0, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Should NOT call extraction directly
      expect(ExtractionController.completePostBlockadeExtraction).not.toHaveBeenCalled()
    })

    it('should return to tacticalMap for regular POI combat (not blockade)', () => {
      // EXPLANATION: Regular combat (at POIs, random ambushes) should still
      // return to tactical map so player can continue their journey.

      gameStateManager.getState.mockReturnValue({
        currentRunState: {
          collectedLoot: [],
          creditsEarned: 0,
          aiCoresEarned: 0
        },
        singlePlayerEncounter: { isBlockade: false }
      })

      const combatLoot = { cards: [], credits: 0, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Extraction should NOT be triggered
      expect(ExtractionController.completePostBlockadeExtraction).not.toHaveBeenCalled()

      // ASSERT: Should return to tacticalMap without pendingBlockadeExtraction
      const setStateCalls = gameStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.appState).toBe('tacticalMap')
      expect(finalCall.currentRunState.pendingBlockadeExtraction).toBeUndefined()
    })

    it('should include combat salvage loot in currentRunState for blockade extraction', () => {
      // EXPLANATION: The combat salvage loot must be included in currentRunState
      // so that when TacticalMapScreen calls handleExtract, the loot is available.

      gameStateManager.getState.mockReturnValue({
        currentRunState: {
          collectedLoot: [
            { type: 'card', cardId: 'EXISTING', cardName: 'Old Card', rarity: 'Common' }
          ],
          creditsEarned: 50,
          aiCoresEarned: 1
        },
        singlePlayerEncounter: { isBlockade: true }
      })

      const combatLoot = {
        cards: [{ cardId: 'NEW_CARD', cardName: 'Combat Salvage', rarity: 'Rare' }],
        credits: 100,
        aiCores: 2
      }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: currentRunState should include both existing and new loot
      const setStateCalls = gameStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]

      // Should have 2 existing + 1 new card + 1 credits + 1 aiCores = 4 items total
      expect(finalCall.currentRunState.collectedLoot.length).toBe(4)
      expect(finalCall.currentRunState.creditsEarned).toBe(150) // 50 + 100
      expect(finalCall.currentRunState.aiCoresEarned).toBe(3) // 1 + 2
    })
  })
})
