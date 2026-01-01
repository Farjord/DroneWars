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

vi.mock('../../managers/TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn(),
    startRun: vi.fn()
  }
}))

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('../../managers/RewardManager.js', () => ({
  default: {
    generateCombatRewards: vi.fn(() => ({
      cards: [],
      salvageItem: null,
      aiCores: 0,
      blueprint: null,
      reputation: 0
    })),
    generateBlueprintReward: vi.fn()
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
import tacticalMapStateManager from '../../managers/TacticalMapStateManager.js'
import ExtractionController from './ExtractionController.js'
import rewardManager from '../../managers/RewardManager.js'

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

      const mockRunState = {
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

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)
      gameStateManager.getState.mockReturnValue({ singlePlayerEncounter: {} })

      // Combat salvage loot (not PoI loot)
      const combatLoot = {
        cards: [{ cardId: 'CARD001', cardName: 'Talon', rarity: 'Common' }],
        salvageItem: { itemId: 'SALVAGE_001', name: 'Salvage Item', creditValue: 50, image: '/Credits/test.png', description: 'Test' },
        aiCores: 0
      }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert: pendingPOICombat should still be present in the updated state
      expect(tacticalMapStateManager.setState).toHaveBeenCalled()
      const setStateCall = tacticalMapStateManager.setState.mock.calls[0][0]

      expect(setStateCall.pendingPOICombat).toBeDefined()
      expect(setStateCall.pendingPOICombat.q).toBe(2)
      expect(setStateCall.pendingPOICombat.r).toBe(-1)
      expect(setStateCall.pendingPOICombat.packType).toBe('MIXED_PACK')
      expect(setStateCall.pendingPOICombat.poiName).toBe('Abandoned Outpost')
    })

    it('should preserve remainingWaypoints in pendingPOICombat', () => {
      // EXPLANATION: Remaining waypoints need to persist so the journey can resume
      // after both combat salvage AND PoI loot have been collected.

      const remainingWaypoints = [
        { hex: { q: 3, r: -2, type: 'empty' }, pathFromPrev: [] },
        { hex: { q: 4, r: -3, type: 'gate' }, pathFromPrev: [] }
      ]

      const mockRunState = {
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

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)
      gameStateManager.getState.mockReturnValue({ singlePlayerEncounter: {} })

      const combatLoot = { cards: [], salvageItem: { itemId: 'SALVAGE_TEST', name: 'Test', creditValue: 100, image: '/Credits/test.png' }, aiCores: 0 }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert
      const setStateCall = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(setStateCall.pendingPOICombat.remainingWaypoints).toEqual(remainingWaypoints)
      expect(setStateCall.pendingPOICombat.remainingWaypoints.length).toBe(2)
    })

    it('should NOT have pendingPOICombat when combat was not at a PoI', () => {
      // EXPLANATION: Random ambushes (not at PoIs) should not set pendingPOICombat.
      // After such combat, there's no PoI to loot.

      const mockRunState = {
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
        // No pendingPOICombat - this was a random ambush
      }

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)
      gameStateManager.getState.mockReturnValue({ singlePlayerEncounter: {} })

      const combatLoot = { cards: [], salvageItem: { itemId: 'SALVAGE_TEST', name: 'Test', creditValue: 50, image: '/Credits/test.png' }, aiCores: 0 }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert: pendingPOICombat should remain undefined (not present)
      const setStateCall = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(setStateCall.pendingPOICombat).toBeUndefined()
    })

    it('should still collect combat salvage correctly while preserving pendingPOICombat', () => {
      // EXPLANATION: The main functionality of finalizeLootCollection should
      // continue to work - adding cards, credits, and aiCores to the run state.

      const mockRunState = {
        collectedLoot: [
          { type: 'card', cardId: 'EXISTING_CARD', cardName: 'Old Card', rarity: 'Common' }
        ],
        creditsEarned: 100,
        aiCoresEarned: 1,
        pendingPOICombat: { q: 0, r: 0, packType: 'CREDITS', poiName: 'Test' }
      }

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)
      gameStateManager.getState.mockReturnValue({ singlePlayerEncounter: {} })

      const combatLoot = {
        cards: [{ cardId: 'NEW_CARD', cardName: 'New Card', rarity: 'Rare' }],
        salvageItem: { itemId: 'SALVAGE_TEST', name: 'Test Salvage', creditValue: 75, image: '/Credits/test.png' },
        aiCores: 2
      }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert: Both loot collection AND pendingPOICombat preservation work
      const setStateCall = tacticalMapStateManager.setState.mock.calls[0][0]

      // Loot was collected: 1 existing + 1 new card + 1 salvageItem + 1 aiCores = 4 items
      expect(setStateCall.collectedLoot.length).toBe(4)
      expect(setStateCall.creditsEarned).toBe(175) // 100 + 75
      expect(setStateCall.aiCoresEarned).toBe(3) // 1 + 2

      // pendingPOICombat preserved
      expect(setStateCall.pendingPOICombat).toBeDefined()
    })

    it('should map card properties correctly (id -> cardId, name -> cardName) when finalizing loot', () => {
      // TDD TEST (RED): Cards from cardData.js have 'id' and 'name' properties,
      // but collectedLoot format needs 'cardId' and 'cardName'.
      // Current bug: Code uses card.cardId and card.cardName which are undefined.

      const mockRunState = {
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      }

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)
      gameStateManager.getState.mockReturnValue({ singlePlayerEncounter: {} })

      // Mock loot with cards in RewardManager's output format (cardId, cardName)
      // RewardManager now transforms cards at the source
      const combatLoot = {
        cards: [
          { cardId: 'CARD001', cardName: 'Laser Blast', rarity: 'Common', type: 'Ordnance' },
          { cardId: 'CARD042', cardName: 'Shield Boost', rarity: 'Uncommon', type: 'Support' }
        ],
        salvageItem: null,
        aiCores: 0
      }

      // Act
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // Assert: Cards should be mapped with correct property names
      const setStateCall = tacticalMapStateManager.setState.mock.calls[0][0]

      // Verify cards are mapped with correct property names (id -> cardId, name -> cardName)
      expect(setStateCall.collectedLoot[0]).toMatchObject({
        type: 'card',
        cardId: 'CARD001',      // Should use card.id, not card.cardId
        cardName: 'Laser Blast', // Should use card.name, not card.cardName
        rarity: 'Common',
        source: 'combat_salvage'
      })

      expect(setStateCall.collectedLoot[1]).toMatchObject({
        type: 'card',
        cardId: 'CARD042',
        cardName: 'Shield Boost',
        rarity: 'Uncommon',
        source: 'combat_salvage'
      })
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
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0,
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({ singlePlayerEncounter: {} })

      const loot = {
        cards: [{ cardId: 'card1', cardName: 'Test Card', rarity: 'common' }],
        salvageItem: { itemId: 'SALVAGE_TEST', name: 'Test Salvage', creditValue: 100, image: '/Credits/test.png' },
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
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0,
        combatsLost: 0
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
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0
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

  describe('processVictory - Salvage Loot Combination', () => {
    /**
     * NEW FEATURE: When combat is triggered during PoI salvage, the salvage loot
     * (cards/credits the player revealed) should be combined with combat rewards
     * into a single pendingLoot object for the LootRevealModal.
     *
     * This prevents:
     * 1. Salvage loot being added silently without flip animation
     * 2. Double/triple loot bugs
     * 3. Multiple confusing LootRevealModals
     */

    it('should combine pendingSalvageLoot with combat salvage when present', async () => {
      // SETUP: Player was salvaging a PoI and revealed 2 cards + credits
      // before encounter triggered
      const mockRunState = {
        shipSections: {},
        combatsWon: 0,
        pendingSalvageLoot: {
          cards: [
            { cardId: 'SALVAGE_CARD_1', cardName: 'Salvaged Drone', rarity: 'Common' },
            { cardId: 'SALVAGE_CARD_2', cardName: 'Salvaged Turret', rarity: 'Rare' }
          ],
          salvageItem: { itemId: 'SALVAGE_POI', name: 'POI Salvage', creditValue: 75, image: '/Credits/test.png' }
        }
      }

      // Update the mock to return specific combat salvage for this test
      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [{ cardId: 'COMBAT_CARD_1', cardName: 'Enemy Fighter', rarity: 'Common' }],
        salvageItem: { itemId: 'SALVAGE_COMBAT', name: 'Combat Salvage', creditValue: 50, image: '/Credits/test.png' },
        aiCores: 1
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1, aiDifficulty: 'normal' }
      }

      // ACT
      const result = CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: Combined loot should have salvage cards first, then combat cards
      expect(result.loot.cards.length).toBe(3) // 2 salvage + 1 combat
      expect(result.loot.cards[0].cardId).toBe('SALVAGE_CARD_1') // Salvage first
      expect(result.loot.cards[1].cardId).toBe('SALVAGE_CARD_2')
      expect(result.loot.cards[2].cardId).toBe('COMBAT_CARD_1') // Combat last

      // ASSERT: Credits should be combined in salvage item
      expect(result.loot.salvageItem.creditValue).toBe(125) // 75 salvage + 50 combat

      // ASSERT: AI cores from combat should be preserved
      expect(result.loot.aiCores).toBe(1)
    })

    it('should clear pendingSalvageLoot from runState after combining', async () => {
      const mockRunState = {
        shipSections: {},
        combatsWon: 0,
        pendingSalvageLoot: {
          cards: [{ cardId: 'SALVAGE_CARD', cardName: 'Test Card', rarity: 'Common' }],
          salvageItem: { itemId: 'SALVAGE_TEST', name: 'Test', creditValue: 50, image: '/Credits/test.png' }
        }
      }

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [],
        salvageItem: { itemId: 'SALVAGE_COMBAT', name: 'Combat', creditValue: 50, image: '/Credits/test.png' },
        aiCores: 0
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: pendingSalvageLoot should be cleared in setState call
      const setStateCall = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(setStateCall.pendingSalvageLoot).toBeNull()
    })

    it('should work normally when no pendingSalvageLoot exists', async () => {
      // SETUP: Regular combat (not from salvage) - no pendingSalvageLoot
      const mockRunState = {
        shipSections: {},
        combatsWon: 0
        // No pendingSalvageLoot
      }

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [{ cardId: 'COMBAT_CARD', cardName: 'Enemy Card', rarity: 'Common' }],
        salvageItem: { itemId: 'SALVAGE_COMBAT', name: 'Combat', creditValue: 100, image: '/Credits/test.png' },
        aiCores: 2
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      const result = CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: Should just have combat loot
      expect(result.loot.cards.length).toBe(1)
      expect(result.loot.cards[0].cardId).toBe('COMBAT_CARD')
      expect(result.loot.salvageItem.creditValue).toBe(100)
      expect(result.loot.aiCores).toBe(2)
    })

    it('should handle empty salvage loot arrays gracefully', async () => {
      // SETUP: pendingSalvageLoot exists but has no cards (only salvageItem)
      const mockRunState = {
        shipSections: {},
        combatsWon: 0,
        pendingSalvageLoot: {
          cards: [],  // Empty cards array
          salvageItem: { itemId: 'SALVAGE_POI', name: 'POI Salvage', creditValue: 100, image: '/Credits/test.png', description: 'Test' }
        }
      }

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [{ cardId: 'COMBAT_CARD', cardName: 'Combat Card', rarity: 'Common' }],
        salvageItem: { itemId: 'SALVAGE_COMBAT', name: 'Combat Salvage', creditValue: 50, image: '/Credits/test.png', description: 'Test' },
        aiCores: 0
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      const result = CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: Should have just combat card, combined salvageItem credit values
      expect(result.loot.cards.length).toBe(1)
      expect(result.loot.salvageItem.creditValue).toBe(150) // 100 salvage + 50 combat
    })
  })

  describe('processCombatEnd - routing', () => {
    it('should route to processVictory when player1 wins', () => {
      // SETUP
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0
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
      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0
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

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { isBlockade: true }
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Should go to tactical map with pendingBlockadeExtraction flag
      const tacticalSetStateCalls = tacticalMapStateManager.setState.mock.calls
      const tacticalFinalCall = tacticalSetStateCalls[tacticalSetStateCalls.length - 1][0]
      expect(tacticalFinalCall.pendingBlockadeExtraction).toBe(true)

      const gameSetStateCalls = gameStateManager.setState.mock.calls
      const gameFinalCall = gameSetStateCalls[gameSetStateCalls.length - 1][0]
      expect(gameFinalCall.appState).toBe('tacticalMap')
    })

    it('should NOT call completePostBlockadeExtraction directly (TacticalMapScreen handles it)', () => {
      // EXPLANATION: Extraction is now handled by TacticalMapScreen via the
      // pendingBlockadeExtraction flag, not directly in finalizeLootCollection.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { isBlockade: true }
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Should NOT call extraction directly
      expect(ExtractionController.completePostBlockadeExtraction).not.toHaveBeenCalled()
    })

    it('should return to tacticalMap for regular POI combat (not blockade)', () => {
      // EXPLANATION: Regular combat (at POIs, random ambushes) should still
      // return to tactical map so player can continue their journey.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { isBlockade: false }
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Extraction should NOT be triggered
      expect(ExtractionController.completePostBlockadeExtraction).not.toHaveBeenCalled()

      // ASSERT: Should return to tacticalMap without pendingBlockadeExtraction
      const gameSetStateCalls = gameStateManager.setState.mock.calls
      const gameFinalCall = gameSetStateCalls[gameSetStateCalls.length - 1][0]
      expect(gameFinalCall.appState).toBe('tacticalMap')

      const tacticalSetStateCalls = tacticalMapStateManager.setState.mock.calls
      const tacticalFinalCall = tacticalSetStateCalls[tacticalSetStateCalls.length - 1][0]
      expect(tacticalFinalCall.pendingBlockadeExtraction).toBeUndefined()
    })

    it('should include combat salvage loot in currentRunState for blockade extraction', () => {
      // EXPLANATION: The combat salvage loot must be included in currentRunState
      // so that when TacticalMapScreen calls handleExtract, the loot is available.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [
          { type: 'card', cardId: 'EXISTING', cardName: 'Old Card', rarity: 'Common' }
        ],
        creditsEarned: 50,
        aiCoresEarned: 1
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { isBlockade: true }
      })

      const combatLoot = {
        cards: [{ cardId: 'NEW_CARD', cardName: 'Combat Salvage', rarity: 'Rare' }],
        salvageItem: { itemId: 'SALVAGE_TEST', name: 'Test Salvage', creditValue: 100, image: '/Credits/test.png' },
        aiCores: 2
      }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: currentRunState should include both existing and new loot
      const setStateCalls = tacticalMapStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]

      // Should have 1 existing + 1 new card + 1 salvageItem + 1 aiCores = 4 items total
      expect(finalCall.collectedLoot.length).toBe(4)
      expect(finalCall.creditsEarned).toBe(150) // 50 + 100
      expect(finalCall.aiCoresEarned).toBe(3) // 1 + 2
    })

    it('should set blockadeCleared flag for blockade victory (prevents double blockade roll)', () => {
      // BUG FIX: If auto-extraction fails to trigger (e.g., useEffect timing issue),
      // player might click Extract again. Without blockadeCleared flag, the modal
      // would roll for blockade AGAIN, potentially triggering a second combat.
      // blockadeCleared persists in run state to prevent this.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { isBlockade: true }
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Should set blockadeCleared flag in addition to pendingBlockadeExtraction
      const setStateCalls = tacticalMapStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.blockadeCleared).toBe(true)
    })

    it('should NOT set blockadeCleared for regular POI combat', () => {
      // Only blockade victories should set blockadeCleared

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { isBlockade: false }
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: blockadeCleared should NOT be set
      const setStateCalls = tacticalMapStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.blockadeCleared).toBeUndefined()
    })

    /**
     * TDD Tests: Fallback blockade detection from currentRunState.isBlockadeCombat
     * BUG FIX: singlePlayerEncounter may be cleared/null before finalizeLootCollection
     * reads it. CombatOutcomeProcessor should fall back to currentRunState.isBlockadeCombat
     * to ensure blockade victories are properly detected.
     */
    it('should use currentRunState.isBlockadeCombat as fallback when singlePlayerEncounter.isBlockade is missing', () => {
      // EXPLANATION: If singlePlayerEncounter is null/undefined (race condition),
      // fall back to currentRunState.isBlockadeCombat for blockade detection.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0,
        isBlockadeCombat: true  // Fallback flag
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: null  // Simulating race condition - encounter cleared
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Should still detect as blockade via fallback
      const setStateCalls = tacticalMapStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.pendingBlockadeExtraction).toBe(true)
      expect(finalCall.blockadeCleared).toBe(true)
    })

    it('should use currentRunState.isBlockadeCombat as fallback when singlePlayerEncounter.isBlockade is undefined', () => {
      // EXPLANATION: Even if encounter exists but isBlockade is undefined,
      // fall back to currentRunState.isBlockadeCombat.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0,
        isBlockadeCombat: true  // Fallback flag
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { aiId: 'TestAI' }  // isBlockade not set
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Should detect as blockade via fallback
      const setStateCalls = tacticalMapStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.pendingBlockadeExtraction).toBe(true)
      expect(finalCall.blockadeCleared).toBe(true)
    })

    it('should NOT trigger blockade extraction when neither flag is set', () => {
      // EXPLANATION: If both singlePlayerEncounter.isBlockade and
      // currentRunState.isBlockadeCombat are false/missing, it's regular combat.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0,
        isBlockadeCombat: false  // Explicitly false
      })

      gameStateManager.getState.mockReturnValue({
        singlePlayerEncounter: { aiId: 'TestAI', isBlockade: false }
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: Should NOT be treated as blockade
      const setStateCalls = tacticalMapStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.pendingBlockadeExtraction).toBeUndefined()
      expect(finalCall.blockadeCleared).toBeUndefined()
    })
  })

  /**
   * TDD Tests: Drone Blueprint POI Reward Flow
   *
   * When winning combat at a Drone Blueprint PoI, the blueprint should be
   * stored separately (pendingDroneBlueprint) so WinnerModal can show it
   * in a special modal AFTER the regular salvage is collected.
   */
  describe('Drone Blueprint POI Reward Flow', () => {
    it('should store drone blueprint separately as pendingDroneBlueprint', () => {
      // EXPLANATION: When the reward is a drone blueprint, it should NOT be
      // included in salvageLoot.blueprint. Instead, it should be stored as
      // pendingDroneBlueprint for the special modal to display.

      const mockDroneBlueprint = {
        type: 'blueprint',
        blueprintId: 'Gunship',
        blueprintType: 'drone',
        rarity: 'Uncommon',
        droneData: { name: 'Gunship', attack: 3, hull: 4, speed: 2 }
      }

      // Configure lootGenerator mock
      rewardManager.generateBlueprintReward.mockReturnValue(mockDroneBlueprint)

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        shipSections: {},
        pendingPOICombat: {
          packType: 'DRONE_BLUEPRINT_FIGHTER'
        }
      })

      gameStateManager.getState.mockReturnValue({
        winner: 'player1',
        player1: { shipSections: {} },
        player2: { deck: [] },
        singlePlayerEncounter: {}
      })

      // ACT
      const result = CombatOutcomeProcessor.processCombatEnd({
        winner: 'player1',
        player1: { shipSections: {} },
        player2: { deck: [] },
        singlePlayerEncounter: {}
      })

      // ASSERT: Blueprint should NOT be in loot.blueprint
      expect(result.loot.blueprint).toBeUndefined()

      // ASSERT: pendingDroneBlueprint should be set in state
      const setStateCalls = gameStateManager.setState.mock.calls
      const stateWithBlueprint = setStateCalls.find(call =>
        call[0].pendingDroneBlueprint !== undefined
      )
      expect(stateWithBlueprint).toBeDefined()
      expect(stateWithBlueprint[0].pendingDroneBlueprint).toEqual(mockDroneBlueprint)
    })

    it('should NOT include blueprint in salvageLoot.blueprint for drone POIs', () => {
      // EXPLANATION: The regular salvageLoot should not have the blueprint
      // so LootRevealModal doesn't show it. The special modal shows it later.

      const mockDroneBlueprint = {
        type: 'blueprint',
        blueprintId: 'Harrier',
        blueprintType: 'drone',
        rarity: 'Common',
        droneData: { name: 'Harrier', attack: 2, hull: 2, speed: 3 }
      }

      // Configure lootGenerator mock
      rewardManager.generateBlueprintReward.mockReturnValue(mockDroneBlueprint)

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        shipSections: {},
        pendingPOICombat: {
          packType: 'DRONE_BLUEPRINT_LIGHT'
        }
      })

      gameStateManager.getState.mockReturnValue({
        winner: 'player1',
        player1: { shipSections: {} },
        player2: { deck: [] },
        singlePlayerEncounter: {}
      })

      // ACT
      const result = CombatOutcomeProcessor.processCombatEnd({
        winner: 'player1',
        player1: { shipSections: {} },
        player2: { deck: [] },
        singlePlayerEncounter: {}
      })

      // ASSERT: loot.blueprint should be undefined for drone blueprint POIs
      expect(result.loot.blueprint).toBeUndefined()
    })

    it('should set hasPendingDroneBlueprint flag after finalizeLootCollection when blueprint exists', () => {
      // EXPLANATION: After salvage is collected, WinnerModal needs to know
      // there's a pending drone blueprint to show the special modal.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        pendingDroneBlueprint: {
          blueprintId: 'Mammoth',
          blueprintType: 'drone',
          rarity: 'Rare',
          droneData: { name: 'Mammoth', attack: 4, hull: 6, speed: 1 }
        },
        singlePlayerEncounter: {}
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: hasPendingDroneBlueprint should be set
      const setStateCalls = gameStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.hasPendingDroneBlueprint).toBe(true)
    })

    it('should NOT set hasPendingDroneBlueprint when no blueprint exists', () => {
      // EXPLANATION: Regular combat (not at drone blueprint POI) should not
      // trigger the special modal flow.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        pendingDroneBlueprint: null,  // No blueprint pending
        singlePlayerEncounter: {}
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: hasPendingDroneBlueprint should NOT be set
      const setStateCalls = gameStateManager.setState.mock.calls
      const finalCall = setStateCalls[setStateCalls.length - 1][0]
      expect(finalCall.hasPendingDroneBlueprint).toBeUndefined()
    })

    it('should NOT call resetGameState when pending drone blueprint exists', () => {
      // EXPLANATION: When there's a pending drone blueprint, we must NOT call
      // resetGameState() because it clears player1/player2 states, which causes
      // App.jsx to show "Initializing game board..." instead of WinnerModal.

      const mockBlueprint = {
        blueprintId: 'Seraph',
        blueprintType: 'drone',
        rarity: 'Rare',
        droneData: { name: 'Seraph', attack: 2, hull: 3, speed: 2 }
      }

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        pendingDroneBlueprint: mockBlueprint,
        singlePlayerEncounter: {}
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: resetGameState should NOT be called when blueprint is pending
      expect(gameStateManager.resetGameState).not.toHaveBeenCalled()
    })

    it('should call resetGameState when NO pending drone blueprint', () => {
      // EXPLANATION: When there's no pending blueprint, resetGameState should be
      // called to clear combat state before returning to tactical map.

      tacticalMapStateManager.getState.mockReturnValue({
        collectedLoot: [],
        creditsEarned: 0,
        aiCoresEarned: 0
      })

      gameStateManager.getState.mockReturnValue({
        pendingDroneBlueprint: null,  // No blueprint
        singlePlayerEncounter: {}
      })

      const combatLoot = { cards: [], salvageItem: null, aiCores: 0 }

      // ACT
      CombatOutcomeProcessor.finalizeLootCollection(combatLoot)

      // ASSERT: resetGameState SHOULD be called when no blueprint
      expect(gameStateManager.resetGameState).toHaveBeenCalled()
    })
  })

  /**
   * TDD Tests: Salvage State Preservation for Post-Combat Return
   *
   * When combat is triggered during salvage, we need to:
   * 1. Keep pendingSalvageState and pendingSalvageLoot separate from combat loot
   * 2. NOT combine POI loot with combat salvage (they should be shown separately)
   * 3. Allow TacticalMapScreen to restore the salvage modal after combat
   */
  describe('processVictory - Salvage State Preservation', () => {
    it('should NOT combine pendingSalvageLoot with combat salvage when fromSalvage is true', async () => {
      // EXPLANATION: When combat was triggered during salvage (fromSalvage: true),
      // POI loot should stay separate so player sees it on salvage screen, not in WinnerModal.
      // Only combat rewards (enemy salvage) should be in the returned loot.

      const mockRunState = {
        shipSections: {},
        combatsWon: 0,
        pendingSalvageLoot: {
          cards: [
            { cardId: 'SALVAGE_CARD_1', cardName: 'POI Card 1', rarity: 'Common' },
            { cardId: 'SALVAGE_CARD_2', cardName: 'POI Card 2', rarity: 'Rare' }
          ],
          salvageItem: { itemId: 'SALVAGE_POI', name: 'POI Salvage', creditValue: 75, image: '/test.png' }
        },
        pendingSalvageState: {
          poi: { q: 2, r: -1 },
          slots: [{ revealed: true }, { revealed: true }, { revealed: false }],
          currentSlotIndex: 2
        },
        pendingPOICombat: {
          fromSalvage: true,
          salvageFullyLooted: false,
          q: 2,
          r: -1
        }
      }

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [{ cardId: 'COMBAT_CARD_1', cardName: 'Enemy Card', rarity: 'Common' }],
        salvageItem: { itemId: 'SALVAGE_COMBAT', name: 'Combat Salvage', creditValue: 50, image: '/test.png' },
        aiCores: 1
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      const result = CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: Loot should only contain combat cards, NOT salvage cards
      expect(result.loot.cards.length).toBe(1)
      expect(result.loot.cards[0].cardId).toBe('COMBAT_CARD_1')

      // ASSERT: Salvage item credit value should NOT be combined
      expect(result.loot.salvageItem.creditValue).toBe(50)  // Only combat, not 50+75
    })

    it('should keep pendingSalvageLoot in runState for later collection when fromSalvage is true', async () => {
      // EXPLANATION: pendingSalvageLoot must remain in runState so TacticalMapScreen
      // can restore the salvage modal and the player can collect POI loot there.

      const mockRunState = {
        shipSections: {},
        combatsWon: 0,
        pendingSalvageLoot: {
          cards: [{ cardId: 'POI_CARD', cardName: 'POI Card', rarity: 'Common' }],
          salvageItem: { itemId: 'POI_SALVAGE', name: 'POI Salvage', creditValue: 100, image: '/test.png' }
        },
        pendingSalvageState: {
          poi: { q: 1, r: 0 },
          slots: [{ revealed: true }],
          currentSlotIndex: 1
        },
        pendingPOICombat: {
          fromSalvage: true,
          q: 1,
          r: 0
        }
      }

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [],
        salvageItem: { itemId: 'COMBAT', name: 'Combat', creditValue: 50, image: '/test.png' },
        aiCores: 0
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: pendingSalvageLoot should NOT be cleared
      const setStateCall = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(setStateCall.pendingSalvageLoot).not.toBeNull()
      expect(setStateCall.pendingSalvageLoot.cards[0].cardId).toBe('POI_CARD')
    })

    it('should preserve pendingSalvageState through processVictory when fromSalvage is true', async () => {
      // EXPLANATION: Full salvage state must be preserved so TacticalMapScreen
      // can restore the salvage modal with revealed slots visible.

      const mockSalvageState = {
        poi: { q: 3, r: -2, poiData: { name: 'Test POI' } },
        zone: 'core',
        totalSlots: 4,
        slots: [
          { type: 'card', content: { cardId: 'c1' }, revealed: true },
          { type: 'salvageItem', content: { creditValue: 50 }, revealed: true },
          { type: 'card', content: { cardId: 'c2' }, revealed: false },
          { type: 'card', content: { cardId: 'c3' }, revealed: false }
        ],
        currentSlotIndex: 2,
        currentEncounterChance: 45,
        encounterTriggered: true
      }

      const mockRunState = {
        shipSections: {},
        combatsWon: 0,
        pendingSalvageLoot: { cards: [], salvageItem: null },
        pendingSalvageState: mockSalvageState,
        pendingPOICombat: {
          fromSalvage: true,
          q: 3,
          r: -2
        }
      }

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [],
        salvageItem: null,
        aiCores: 0
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)
      gameStateManager.getState.mockReturnValue({ singlePlayerEncounter: {} })

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: pendingSalvageState should be preserved
      const setStateCall = tacticalMapStateManager.setState.mock.calls[0][0]
      expect(setStateCall.pendingSalvageState).toBeDefined()
      expect(setStateCall.pendingSalvageState.poi.q).toBe(3)
      expect(setStateCall.pendingSalvageState.currentSlotIndex).toBe(2)
      expect(setStateCall.pendingSalvageState.slots[0].revealed).toBe(true)
    })

    it('should still combine loot when fromSalvage is false (regular POI combat)', async () => {
      // EXPLANATION: When combat is not from salvage (e.g., direct POI encounter),
      // the existing combining behavior should remain for backwards compatibility.

      const mockRunState = {
        shipSections: {},
        combatsWon: 0,
        pendingSalvageLoot: {
          cards: [{ cardId: 'OLD_CARD', cardName: 'Old Card', rarity: 'Common' }],
          salvageItem: { itemId: 'OLD_SALVAGE', name: 'Old', creditValue: 100, image: '/test.png' }
        },
        pendingPOICombat: {
          fromSalvage: false,  // NOT from salvage
          q: 0,
          r: 0
        }
      }

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [{ cardId: 'NEW_CARD', cardName: 'New Card', rarity: 'Common' }],
        salvageItem: { itemId: 'NEW_SALVAGE', name: 'New', creditValue: 50, image: '/test.png' },
        aiCores: 0
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      const result = CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: Loot SHOULD be combined when not from salvage
      expect(result.loot.cards.length).toBe(2)
      expect(result.loot.salvageItem.creditValue).toBe(150)  // 100 + 50
    })

    it('should still combine loot when pendingPOICombat does not exist', async () => {
      // EXPLANATION: Random ambush combat (no POI) should still combine any pending loot.

      const mockRunState = {
        shipSections: {},
        combatsWon: 0,
        pendingSalvageLoot: {
          cards: [{ cardId: 'PENDING_CARD', cardName: 'Pending', rarity: 'Common' }],
          salvageItem: { itemId: 'PENDING', name: 'Pending', creditValue: 75, image: '/test.png' }
        }
        // No pendingPOICombat - this is a random ambush
      }

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [],
        salvageItem: { itemId: 'COMBAT', name: 'Combat', creditValue: 25, image: '/test.png' },
        aiCores: 0
      })

      tacticalMapStateManager.getState.mockReturnValue(mockRunState)

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      const result = CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: Loot should be combined
      expect(result.loot.cards.length).toBe(1)
      expect(result.loot.salvageItem.creditValue).toBe(100)  // 75 + 25
    })
  })

  // ========================================
  // SIGNAL LOCK SYSTEM TESTS
  // ========================================
  // TDD tests for encounter detection reset on combat victory
  // The Signal Lock (encounterDetectionChance) should reset to 0 after victory

  describe('Signal Lock reset on victory', () => {
    it('calls EncounterController.resetEncounterDetection on victory', async () => {
      // EXPLANATION: When player wins combat, the Signal Lock should reset
      // to give them a fresh start (enemy loses their tracking data)

      tacticalMapStateManager.getState.mockReturnValue({
        shipSections: {},
        combatsWon: 0,
        encounterDetectionChance: 75 // High signal lock before victory
      })

      const rewardManager = await import('../../managers/RewardManager.js')
      rewardManager.default.generateCombatRewards.mockReturnValue({
        cards: [],
        salvageItem: null,
        aiCores: 0
      })

      const gameState = {
        winner: 'player1',
        player1: { shipSections: { bridge: { hull: 10 }, powerCell: { hull: 10 }, droneControlHub: { hull: 10 } } },
        player2: { deck: [] },
        singlePlayerEncounter: { tier: 1 }
      }

      // ACT
      CombatOutcomeProcessor.processVictory(gameState, gameState.singlePlayerEncounter)

      // ASSERT: The tacticalMapStateManager.setState should include encounterDetectionChance: 0
      const setStateCalls = tacticalMapStateManager.setState.mock.calls
      const hasResetCall = setStateCalls.some(call =>
        call[0].encounterDetectionChance === 0
      )
      expect(hasResetCall).toBe(true)
    })

    it('does NOT reset detection on escape (escape handled elsewhere)', () => {
      // EXPLANATION: Escape does NOT reset Signal Lock - enemy retains tracking data.
      // This is handled by escape flow NOT calling resetEncounterDetection.
      // CombatOutcomeProcessor.processDefeat should NOT reset detection.

      tacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0,
        combatsLost: 0,
        encounterDetectionChance: 80 // High signal lock before escape/defeat
      })

      const gameState = {
        winner: 'player2',
        player1: { shipSections: {} },
        player2: { shipSections: {} },
        singlePlayerEncounter: {}
      }

      // ACT: Process defeat (simulating escape leading to ship destruction)
      CombatOutcomeProcessor.processDefeat(gameState, {})

      // ASSERT: encounterDetectionChance should NOT be reset to 0 in defeat
      const setStateCalls = tacticalMapStateManager.setState.mock.calls
      const hasResetCall = setStateCalls.some(call =>
        call[0].encounterDetectionChance === 0
      )
      expect(hasResetCall).toBe(false)
    })
  })
})
