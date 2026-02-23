import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SalvageController } from '../SalvageController.js'

// Mock RewardManager
vi.mock('../../../managers/RewardManager.js', () => ({
  default: {
    generateSalvageSlots: vi.fn(() => [
      { type: 'card', content: { cardId: 'test_card_1', cardName: 'Test Card', rarity: 'Common' }, revealed: false },
      { type: 'salvageItem', content: { itemId: 'salvage_1', creditValue: 50 }, revealed: false },
      { type: 'salvageItem', content: { itemId: 'salvage_2', creditValue: 30 }, revealed: false }
    ])
  }
}))

import rewardManager from '../../../managers/RewardManager.js'

// ========================================
// SALVAGE CONTROLLER TESTS
// ========================================

describe('SalvageController', () => {
  let salvageController
  let mockTierConfig

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock tier config with salvage settings
    mockTierConfig = {
      salvageEncounterIncreaseRange: {
        min: 5,
        max: 15
      },
      salvageSlotCountWeights: {
        perimeter: { 1: 50, 2: 30, 3: 15, 4: 5, 5: 0 },
        mid: { 1: 10, 2: 30, 3: 35, 4: 20, 5: 5 },
        core: { 1: 0, 2: 10, 3: 25, 4: 40, 5: 25 }
      }
    }

    salvageController = new SalvageController()
  })

  // ========================================
  // INITIALIZE SALVAGE TESTS
  // ========================================

  describe('initializeSalvage()', () => {
    it('creates salvage state with correct POI data', () => {
      // EXPLANATION: When initializing salvage, the POI data should be stored
      // in the salvage state for reference during the salvage process.

      const poi = {
        id: 'POI_MUNITIONS',
        name: 'Munitions Storage Depot',
        encounterChance: 20,
        rewardType: 'ORDNANCE_PACK'
      }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid')

      expect(result.poi).toEqual(poi)
      expect(result.zone).toBe('mid')
    })

    it('sets initial encounter chance from POI encounterChance', () => {
      // EXPLANATION: The base encounter chance for salvage should come from
      // the POI's encounterChance field (e.g., 20% for Munitions).

      const poi = {
        id: 'POI_MUNITIONS',
        encounterChance: 20,
        rewardType: 'ORDNANCE_PACK'
      }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid')

      expect(result.currentEncounterChance).toBe(20)
    })

    it('initializes with all slots unrevealed', () => {
      // EXPLANATION: All slots should start in an unrevealed state.
      // The player will reveal them one by one during salvage.

      const poi = { encounterChance: 15, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'core')

      expect(result.slots.every(slot => slot.revealed === false)).toBe(true)
    })

    it('starts with currentSlotIndex at 0', () => {
      // EXPLANATION: Salvage proceeds in order, starting from slot 0.

      const poi = { encounterChance: 15, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid')

      expect(result.currentSlotIndex).toBe(0)
    })

    it('initializes encounterTriggered as false', () => {
      // EXPLANATION: No encounter has happened yet when salvage starts.

      const poi = { encounterChance: 15, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid')

      expect(result.encounterTriggered).toBe(false)
    })

    it('calls lootGenerator.generateSalvageSlots with correct parameters', () => {
      // EXPLANATION: The salvage controller should delegate slot generation
      // to the loot generator with the correct pack type, tier, zone, and config.

      const poi = { encounterChance: 15, rewardType: 'TACTICAL_PACK' }

      salvageController.initializeSalvage(poi, mockTierConfig, 'core')

      expect(rewardManager.generateSalvageSlots).toHaveBeenCalledWith(
        'TACTICAL_PACK',
        expect.any(Number), // tier
        'core',
        mockTierConfig
      )
    })

    it('stores totalSlots based on generated slots length', () => {
      // EXPLANATION: The total number of slots should match what the
      // loot generator produces (1-5 based on zone).

      const poi = { encounterChance: 15, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid')

      expect(result.totalSlots).toBe(3) // mockLootGenerator returns 3 slots
      expect(result.slots.length).toBe(3)
    })

    it('handles hex objects with nested poiData structure', () => {
      // EXPLANATION: TacticalMapScreen passes hex objects where POI data is
      // nested in hex.poiData, not at the top level. The controller must
      // extract data from poiData to correctly pass rewardType to lootGenerator.

      const hexWithNestedPoiData = {
        id: 'hex_123',
        coordinates: { x: 5, y: 3 },
        poiData: {
          id: 'POI_MUNITIONS',
          name: 'Munitions Storage Depot',
          encounterChance: 25,
          rewardType: 'ORDNANCE_PACK'
        }
      }

      salvageController.initializeSalvage(hexWithNestedPoiData, mockTierConfig, 'mid')

      // Should pass the nested rewardType to rewardManager
      expect(rewardManager.generateSalvageSlots).toHaveBeenCalledWith(
        'ORDNANCE_PACK',
        expect.any(Number),
        'mid',
        mockTierConfig
      )
    })

    it('uses nested poiData.encounterChance for initial encounter chance', () => {
      // EXPLANATION: encounterChance should be read from poiData when present.

      const hexWithNestedPoiData = {
        poiData: {
          encounterChance: 30,
          rewardType: 'TACTICAL_PACK'
        }
      }

      const result = salvageController.initializeSalvage(hexWithNestedPoiData, mockTierConfig, 'core')

      expect(result.currentEncounterChance).toBe(30)
    })
  })

  // ========================================
  // ATTEMPT SALVAGE TESTS
  // ========================================

  describe('attemptSalvage()', () => {
    let baseSalvageState

    beforeEach(() => {
      baseSalvageState = {
        poi: { encounterChance: 20 },
        zone: 'mid',
        totalSlots: 3,
        slots: [
          { type: 'card', content: { cardId: 'test_card_1', cardName: 'Test Card', rarity: 'Common' }, revealed: false },
          { type: 'credits', content: { amount: 50 }, revealed: false },
          { type: 'credits', content: { amount: 30 }, revealed: false }
        ],
        currentSlotIndex: 0,
        currentEncounterChance: 20,
        encounterTriggered: false
      }
    })

    it('reveals the current slot when no encounter triggered', () => {
      // EXPLANATION: When the encounter roll succeeds (no encounter),
      // the current slot should be marked as revealed.

      // Force no encounter by setting chance to 0
      baseSalvageState.currentEncounterChance = 0

      const result = salvageController.attemptSalvage(baseSalvageState, mockTierConfig)

      expect(result.salvageState.slots[0].revealed).toBe(true)
    })

    it('increments currentSlotIndex after successful salvage', () => {
      // EXPLANATION: After revealing a slot, the index should advance
      // to the next slot for the next salvage attempt.

      baseSalvageState.currentEncounterChance = 0

      const result = salvageController.attemptSalvage(baseSalvageState, mockTierConfig)

      expect(result.salvageState.currentSlotIndex).toBe(1)
    })

    it('increases encounter chance after successful salvage', () => {
      // EXPLANATION: Each successful salvage increases the encounter chance
      // by a random amount from the tier's range.

      baseSalvageState.currentEncounterChance = 20

      // Mock Math.random to return consistent value
      const originalRandom = Math.random
      Math.random = () => 0.5 // Will give middle of range (5-15 = 10)

      const result = salvageController.attemptSalvage(baseSalvageState, mockTierConfig)

      Math.random = originalRandom

      // Should be 20 + something in range [5, 15]
      expect(result.salvageState.currentEncounterChance).toBeGreaterThan(20)
      expect(result.salvageState.currentEncounterChance).toBeLessThanOrEqual(35)
    })

    it('returns the revealed slot content', () => {
      // EXPLANATION: The result should include the content of the slot
      // that was just revealed so the UI can display it.

      baseSalvageState.currentEncounterChance = 0

      const result = salvageController.attemptSalvage(baseSalvageState, mockTierConfig)

      expect(result.slotContent).toEqual({
        type: 'card',
        content: { cardId: 'test_card_1', cardName: 'Test Card', rarity: 'Common' }
      })
    })

    it('sets encounterTriggered to true when encounter happens', () => {
      // EXPLANATION: When the encounter roll fails (encounter triggered),
      // the state should reflect this so the UI can show combat options.

      baseSalvageState.currentEncounterChance = 100 // Guaranteed encounter

      const result = salvageController.attemptSalvage(baseSalvageState, mockTierConfig)

      expect(result.salvageState.encounterTriggered).toBe(true)
      expect(result.encounterTriggered).toBe(true)
    })

    it('still reveals slot and returns content when encounter triggered', () => {
      // EXPLANATION: Even when an encounter happens, the player should
      // still receive the loot from the slot they were salvaging.

      baseSalvageState.currentEncounterChance = 100

      const result = salvageController.attemptSalvage(baseSalvageState, mockTierConfig)

      expect(result.salvageState.slots[0].revealed).toBe(true)
      expect(result.slotContent).toBeDefined()
    })

    it('does not increase encounter chance when encounter triggered', () => {
      // EXPLANATION: If an encounter happens, there's no point in
      // increasing the chance since salvage is interrupted.

      baseSalvageState.currentEncounterChance = 100

      const result = salvageController.attemptSalvage(baseSalvageState, mockTierConfig)

      expect(result.salvageState.currentEncounterChance).toBe(100)
    })

    it('returns result with salvageState containing all updated values', () => {
      // EXPLANATION: The return structure must contain salvageState with all
      // updated values so consumers (like TacticalMapScreen) can use them directly.
      // This test documents the expected return structure.

      baseSalvageState.currentEncounterChance = 0  // No encounter

      const result = salvageController.attemptSalvage(baseSalvageState, mockTierConfig)

      // Verify return structure
      expect(result).toHaveProperty('salvageState')
      expect(result).toHaveProperty('slotContent')
      expect(result).toHaveProperty('encounterTriggered')

      // Verify salvageState contains all required fields
      expect(result.salvageState).toHaveProperty('slots')
      expect(result.salvageState).toHaveProperty('currentSlotIndex')
      expect(result.salvageState).toHaveProperty('currentEncounterChance')
      expect(result.salvageState).toHaveProperty('encounterTriggered')

      // Verify values are correct types
      expect(Array.isArray(result.salvageState.slots)).toBe(true)
      expect(typeof result.salvageState.currentSlotIndex).toBe('number')
      expect(typeof result.salvageState.currentEncounterChance).toBe('number')
      expect(typeof result.salvageState.encounterTriggered).toBe('boolean')
    })
  })

  // ========================================
  // ROLL ENCOUNTER INCREASE TESTS
  // ========================================

  describe('rollEncounterIncrease()', () => {
    it('returns value within tier range', () => {
      // EXPLANATION: The encounter increase should be a random value
      // between min and max from the tier config.

      for (let i = 0; i < 100; i++) {
        const increase = salvageController.rollEncounterIncrease(mockTierConfig)
        expect(increase).toBeGreaterThanOrEqual(5)
        expect(increase).toBeLessThanOrEqual(15)
      }
    })

    it('uses default range if tier config missing salvageEncounterIncreaseRange', () => {
      // EXPLANATION: If the tier config is missing the range,
      // use a sensible default (e.g., 5-10).

      const configWithoutRange = {}

      const increase = salvageController.rollEncounterIncrease(configWithoutRange)

      expect(increase).toBeGreaterThanOrEqual(5)
      expect(increase).toBeLessThanOrEqual(10)
    })
  })

  // ========================================
  // COLLECT REVEALED LOOT TESTS
  // ========================================

  describe('collectRevealedLoot()', () => {
    it('returns only revealed slots as loot', () => {
      // EXPLANATION: When the player leaves, they should only receive
      // the loot from slots they actually revealed.

      const salvageState = {
        slots: [
          { type: 'card', content: { cardId: 'card_1', cardName: 'Card 1', rarity: 'Common' }, revealed: true },
          { type: 'salvageItem', content: { itemId: 'salvage_1', name: 'Salvage Item', creditValue: 50, image: '/test.png', description: 'Test' }, revealed: true },
          { type: 'salvageItem', content: { itemId: 'salvage_2', name: 'Another Item', creditValue: 30, image: '/test.png', description: 'Test' }, revealed: false }
        ]
      }

      const loot = salvageController.collectRevealedLoot(salvageState)

      expect(loot.cards).toHaveLength(1)
      expect(loot.cards[0].cardId).toBe('card_1')
      expect(loot.salvageItems).toHaveLength(1)
      expect(loot.salvageItems[0].creditValue).toBe(50) // Only the revealed salvage item
    })

    it('collects all revealed salvage items', () => {
      // EXPLANATION: If multiple salvage item slots are revealed,
      // they should all be collected.

      const salvageState = {
        slots: [
          { type: 'salvageItem', content: { itemId: 'salvage_1', name: 'Item 1', creditValue: 50, image: '/test.png' }, revealed: true },
          { type: 'salvageItem', content: { itemId: 'salvage_2', name: 'Item 2', creditValue: 30, image: '/test.png' }, revealed: true },
          { type: 'salvageItem', content: { itemId: 'salvage_3', name: 'Item 3', creditValue: 20, image: '/test.png' }, revealed: false }
        ]
      }

      const loot = salvageController.collectRevealedLoot(salvageState)

      expect(loot.salvageItems).toHaveLength(2)
      expect(loot.salvageItems[0].creditValue).toBe(50)
      expect(loot.salvageItems[1].creditValue).toBe(30)
    })

    it('returns empty loot if no slots revealed', () => {
      // EXPLANATION: Edge case - if player leaves without salvaging,
      // they should get nothing.

      const salvageState = {
        slots: [
          { type: 'card', content: { cardId: 'card_1' }, revealed: false },
          { type: 'salvageItem', content: { itemId: 'salvage_1', creditValue: 50 }, revealed: false }
        ]
      }

      const loot = salvageController.collectRevealedLoot(salvageState)

      expect(loot.cards).toHaveLength(0)
      expect(loot.salvageItems).toHaveLength(0)
    })

    it('collects all revealed cards', () => {
      // EXPLANATION: All revealed card slots should be collected.

      const salvageState = {
        slots: [
          { type: 'card', content: { cardId: 'card_1', cardName: 'Card 1', rarity: 'Common' }, revealed: true },
          { type: 'card', content: { cardId: 'card_2', cardName: 'Card 2', rarity: 'Rare' }, revealed: true },
          { type: 'salvageItem', content: { itemId: 'salvage_1', creditValue: 30 }, revealed: false }
        ]
      }

      const loot = salvageController.collectRevealedLoot(salvageState)

      expect(loot.cards).toHaveLength(2)
      expect(loot.cards[0].cardId).toBe('card_1')
      expect(loot.cards[1].cardId).toBe('card_2')
    })
  })

  // ========================================
  // HELPER METHOD TESTS
  // ========================================

  describe('canContinueSalvage()', () => {
    it('returns true when more slots available and no encounter', () => {
      // EXPLANATION: Player can continue if there are unrevealed slots
      // and no encounter has been triggered.

      const salvageState = {
        totalSlots: 3,
        currentSlotIndex: 1,
        encounterTriggered: false
      }

      expect(salvageController.canContinueSalvage(salvageState)).toBe(true)
    })

    it('returns false when all slots revealed', () => {
      // EXPLANATION: Can't continue if all slots have been salvaged.

      const salvageState = {
        totalSlots: 3,
        currentSlotIndex: 3,
        encounterTriggered: false
      }

      expect(salvageController.canContinueSalvage(salvageState)).toBe(false)
    })

    it('returns false when encounter triggered', () => {
      // EXPLANATION: Can't continue normal salvage after encounter.

      const salvageState = {
        totalSlots: 3,
        currentSlotIndex: 1,
        encounterTriggered: true
      }

      expect(salvageController.canContinueSalvage(salvageState)).toBe(false)
    })
  })

  describe('hasRevealedAnySlots()', () => {
    it('returns true if at least one slot is revealed', () => {
      // EXPLANATION: Used to determine if POI should be marked as looted.

      const salvageState = {
        slots: [
          { revealed: true },
          { revealed: false },
          { revealed: false }
        ]
      }

      expect(salvageController.hasRevealedAnySlots(salvageState)).toBe(true)
    })

    it('returns false if no slots are revealed', () => {
      // EXPLANATION: If player leaves without salvaging, POI is not looted.

      const salvageState = {
        slots: [
          { revealed: false },
          { revealed: false }
        ]
      }

      expect(salvageController.hasRevealedAnySlots(salvageState)).toBe(false)
    })
  })

  describe('isFullyLooted()', () => {
    it('returns true when all slots have been revealed', () => {
      // EXPLANATION: When currentSlotIndex equals totalSlots, all slots
      // have been revealed and the POI is fully looted.

      const salvageState = { totalSlots: 3, currentSlotIndex: 3 }

      expect(salvageController.isFullyLooted(salvageState)).toBe(true)
    })

    it('returns false when slots remain unrevealed', () => {
      // EXPLANATION: When currentSlotIndex is less than totalSlots,
      // there are still slots to reveal.

      const salvageState = { totalSlots: 3, currentSlotIndex: 2 }

      expect(salvageController.isFullyLooted(salvageState)).toBe(false)
    })

    it('returns false when no slots have been revealed', () => {
      // EXPLANATION: When currentSlotIndex is 0, no slots have been revealed.

      const salvageState = { totalSlots: 4, currentSlotIndex: 0 }

      expect(salvageController.isFullyLooted(salvageState)).toBe(false)
    })

    it('returns true for single slot POI when slot is revealed', () => {
      // EXPLANATION: Edge case - a single slot POI is fully looted
      // after revealing just one slot.

      const salvageState = { totalSlots: 1, currentSlotIndex: 1 }

      expect(salvageController.isFullyLooted(salvageState)).toBe(true)
    })
  })

  // ========================================
  // TOKEN SLOT COLLECTION TESTS
  // ========================================

  describe('collectRevealedLoot() with token slots', () => {
    it('collects revealed token slots', () => {
      // EXPLANATION: Token slots should be collected like cards and salvage items

      const salvageState = {
        slots: [
          { type: 'token', content: { tokenType: 'security', amount: 1, source: 'contraband_cache' }, revealed: true },
          { type: 'salvageItem', content: { itemId: 'salvage_1', name: 'Item', creditValue: 50, image: '/test.png' }, revealed: true }
        ]
      }

      const loot = salvageController.collectRevealedLoot(salvageState)

      expect(loot.tokens).toHaveLength(1)
      expect(loot.tokens[0].tokenType).toBe('security')
      expect(loot.tokens[0].amount).toBe(1)
    })

    it('does not collect unrevealed token slots', () => {
      // EXPLANATION: Only revealed tokens should be collected

      const salvageState = {
        slots: [
          { type: 'token', content: { tokenType: 'security', amount: 1 }, revealed: false },
          { type: 'salvageItem', content: { creditValue: 50 }, revealed: true }
        ]
      }

      const loot = salvageController.collectRevealedLoot(salvageState)

      expect(loot.tokens).toHaveLength(0)
    })

    it('returns empty tokens array when no token slots exist', () => {
      // EXPLANATION: Should always return tokens array, even if empty

      const salvageState = {
        slots: [
          { type: 'salvageItem', content: { itemId: 'salvage_1', creditValue: 50 }, revealed: true },
          { type: 'card', content: { cardId: 'card_1', cardName: 'Card' }, revealed: true }
        ]
      }

      const loot = salvageController.collectRevealedLoot(salvageState)

      expect(loot.tokens).toBeDefined()
      expect(loot.tokens).toEqual([])
    })

    it('collects tokens alongside cards and salvage items', () => {
      // EXPLANATION: All three types should be collected together

      const salvageState = {
        slots: [
          { type: 'token', content: { tokenType: 'security', amount: 1 }, revealed: true },
          { type: 'card', content: { cardId: 'card_1', cardName: 'Card 1', rarity: 'Common' }, revealed: true },
          { type: 'salvageItem', content: { itemId: 'salvage_1', name: 'Item', creditValue: 50 }, revealed: true }
        ]
      }

      const loot = salvageController.collectRevealedLoot(salvageState)

      expect(loot.tokens).toHaveLength(1)
      expect(loot.cards).toHaveLength(1)
      expect(loot.salvageItems).toHaveLength(1)
    })
  })

  // ========================================
  // RESET AFTER COMBAT TESTS
  // ========================================

  describe('resetAfterCombat()', () => {
    let postCombatSalvageState

    beforeEach(() => {
      // Simulate salvage state after an encounter was triggered
      postCombatSalvageState = {
        poi: { q: 2, r: -1, poiData: { name: 'Test POI', encounterChance: 20, rewardType: 'ORDNANCE_PACK' } },
        zone: 'mid',
        totalSlots: 3,
        slots: [
          { type: 'card', content: { cardId: 'card_1', cardName: 'Card 1', rarity: 'Common' }, revealed: true },
          { type: 'salvageItem', content: { itemId: 'salvage_1', name: 'Item 1', creditValue: 50 }, revealed: true },
          { type: 'card', content: { cardId: 'card_2', cardName: 'Card 2', rarity: 'Rare' }, revealed: false }
        ],
        currentSlotIndex: 2,
        currentEncounterChance: 35,
        encounterTriggered: true  // Combat was triggered
      }
    })

    it('should reset encounterTriggered to false', () => {
      // EXPLANATION: After winning combat, player should be able to continue
      // salvaging. The encounterTriggered flag must be reset to allow this.

      const result = salvageController.resetAfterCombat(postCombatSalvageState)

      expect(result.encounterTriggered).toBe(false)
    })

    it('should preserve all revealed slots', () => {
      // EXPLANATION: Previously revealed slots should remain visible after
      // returning from combat so player can see their discovered loot.

      const result = salvageController.resetAfterCombat(postCombatSalvageState)

      expect(result.slots[0].revealed).toBe(true)
      expect(result.slots[1].revealed).toBe(true)
      expect(result.slots[2].revealed).toBe(false)
    })

    it('should preserve currentSlotIndex position', () => {
      // EXPLANATION: Don't advance past slots that weren't salvaged.
      // Player should continue from where they left off.

      const result = salvageController.resetAfterCombat(postCombatSalvageState)

      expect(result.currentSlotIndex).toBe(2)
    })

    it('should preserve slot contents', () => {
      // EXPLANATION: The actual loot content in each slot should not be modified.

      const result = salvageController.resetAfterCombat(postCombatSalvageState)

      expect(result.slots[0].content.cardId).toBe('card_1')
      expect(result.slots[1].content.creditValue).toBe(50)
    })

    it('should add high alert bonus to encounter chance', () => {
      // EXPLANATION: If returning to a POI that triggered an encounter,
      // the encounter chance should increase by the high alert bonus.

      const highAlertBonus = 10  // 10% bonus

      const result = salvageController.resetAfterCombat(postCombatSalvageState, highAlertBonus)

      expect(result.currentEncounterChance).toBe(45)  // 35 + 10
    })

    it('should use zero bonus when no high alert bonus provided', () => {
      // EXPLANATION: If no bonus is provided, encounter chance should stay the same.

      const result = salvageController.resetAfterCombat(postCombatSalvageState)

      expect(result.currentEncounterChance).toBe(35)
    })

    it('should preserve POI data', () => {
      // EXPLANATION: The POI reference should remain intact for proper handling.

      const result = salvageController.resetAfterCombat(postCombatSalvageState)

      expect(result.poi.q).toBe(2)
      expect(result.poi.r).toBe(-1)
      expect(result.poi.poiData.name).toBe('Test POI')
    })

    it('should preserve zone information', () => {
      // EXPLANATION: Zone is used for various calculations and should be preserved.

      const result = salvageController.resetAfterCombat(postCombatSalvageState)

      expect(result.zone).toBe('mid')
    })

    it('should preserve totalSlots', () => {
      // EXPLANATION: Total slots determines when salvage is complete.

      const result = salvageController.resetAfterCombat(postCombatSalvageState)

      expect(result.totalSlots).toBe(3)
    })

    it('should handle fully looted POI (all slots revealed)', () => {
      // EXPLANATION: When all slots are revealed, player should still be able
      // to return to salvage screen to collect, just can't salvage more.

      const fullyLootedState = {
        ...postCombatSalvageState,
        currentSlotIndex: 3,
        slots: postCombatSalvageState.slots.map(s => ({ ...s, revealed: true }))
      }

      const result = salvageController.resetAfterCombat(fullyLootedState)

      expect(result.encounterTriggered).toBe(false)
      expect(result.currentSlotIndex).toBe(3)
      expect(result.slots.every(s => s.revealed)).toBe(true)
    })

    it('should advance currentSlotIndex when current slot was already revealed (encounter on last slot bug fix)', () => {
      // EXPLANATION: BUG FIX - When an encounter triggers, attemptSalvage reveals the slot
      // but does NOT increment currentSlotIndex. This causes a bug when the encounter
      // triggers on the LAST slot: the slot is revealed but currentSlotIndex stays at
      // totalSlots - 1, making canContinueSalvage() return true incorrectly.
      //
      // Scenario: 3 slots, player at last slot (index 2), encounter triggers
      // - Slot 2 gets revealed
      // - currentSlotIndex stays at 2 (not incremented because encounter triggered)
      // - After combat, resetAfterCombat is called
      // - canContinueSalvage() returns (2 < 3) && !false = true ← BUG!
      // - isFullyLooted() returns 2 >= 3 = false ← BUG!
      //
      // FIX: resetAfterCombat should detect that the current slot is already revealed
      // and advance the index so the player cannot "continue salvaging" a revealed slot.

      const encounterOnLastSlotState = {
        poi: { q: 2, r: -1, poiData: { name: 'Test POI' } },
        zone: 'mid',
        totalSlots: 3,
        slots: [
          { type: 'card', content: { cardId: 'card_1' }, revealed: true },
          { type: 'salvageItem', content: { creditValue: 50 }, revealed: true },
          { type: 'card', content: { cardId: 'card_2' }, revealed: true }  // Last slot revealed during encounter
        ],
        currentSlotIndex: 2,  // Stuck at 2 because encounter triggered on last slot
        currentEncounterChance: 45,
        encounterTriggered: true
      }

      const result = salvageController.resetAfterCombat(encounterOnLastSlotState)

      // After reset, currentSlotIndex should advance past the already-revealed slot
      expect(result.currentSlotIndex).toBe(3)

      // Now the helper methods should return correct values
      expect(salvageController.isFullyLooted(result)).toBe(true)
      expect(salvageController.canContinueSalvage(result)).toBe(false)
    })

    it('should advance currentSlotIndex when current slot revealed mid-salvage (not just last slot)', () => {
      // EXPLANATION: The fix should work for any slot, not just the last one.
      // If encounter triggers on slot 1 (middle slot), slot 1 is revealed but
      // currentSlotIndex stays at 1. After combat, it should advance to 2.

      const encounterOnMiddleSlotState = {
        poi: { q: 2, r: -1, poiData: { name: 'Test POI' } },
        zone: 'mid',
        totalSlots: 3,
        slots: [
          { type: 'card', content: { cardId: 'card_1' }, revealed: true },
          { type: 'salvageItem', content: { creditValue: 50 }, revealed: true },  // Revealed during encounter
          { type: 'card', content: { cardId: 'card_2' }, revealed: false }
        ],
        currentSlotIndex: 1,  // Stuck at 1 because encounter triggered
        currentEncounterChance: 35,
        encounterTriggered: true
      }

      const result = salvageController.resetAfterCombat(encounterOnMiddleSlotState)

      // After reset, currentSlotIndex should advance past the already-revealed slot
      expect(result.currentSlotIndex).toBe(2)

      // Player can still continue salvaging slot 2
      expect(salvageController.canContinueSalvage(result)).toBe(true)
      expect(salvageController.isFullyLooted(result)).toBe(false)
    })
  })

  // ========================================
  // THREAT-BASED ENCOUNTER BONUS TESTS
  // ========================================

  describe('_calculateThreatBonus()', () => {
    const mockTierConfigWithBonus = {
      threatEncounterBonus: {
        low: { min: 0, max: 0 },
        medium: { min: 5, max: 10 },
        high: { min: 10, max: 20 }
      }
    }

    const mockPoi = { q: 5, r: -3, poiData: { name: 'Test POI' } }

    it('should return 0 when threat level is low', () => {
      // EXPLANATION: At low threat (0-49% detection), players should not
      // face any additional encounter risk when salvaging PoIs.

      const bonus = salvageController._calculateThreatBonus(mockPoi, mockTierConfigWithBonus, 'low')

      expect(bonus).toBe(0)
    })

    it('should return value in range [5, 10] when threat level is medium', () => {
      // EXPLANATION: At medium threat (50-79% detection), PoIs become
      // more dangerous with a 5-10% encounter chance increase.

      const bonus = salvageController._calculateThreatBonus(mockPoi, mockTierConfigWithBonus, 'medium')

      expect(bonus).toBeGreaterThanOrEqual(5)
      expect(bonus).toBeLessThanOrEqual(10)
    })

    it('should return value in range [10, 20] when threat level is high', () => {
      // EXPLANATION: At high threat (80-100% detection), PoIs are very
      // dangerous with a 10-20% encounter chance increase.

      const bonus = salvageController._calculateThreatBonus(mockPoi, mockTierConfigWithBonus, 'high')

      expect(bonus).toBeGreaterThanOrEqual(10)
      expect(bonus).toBeLessThanOrEqual(20)
    })

    it('should use default ranges when tierConfig lacks threatEncounterBonus', () => {
      // EXPLANATION: If the tier config doesn't define threatEncounterBonus,
      // use sensible defaults (0 for low, 5-10 for medium, 10-20 for high).

      const configWithoutBonus = {}

      // Low should still return 0
      const lowBonus = salvageController._calculateThreatBonus(mockPoi, configWithoutBonus, 'low')
      expect(lowBonus).toBe(0)

      // Medium should return value in default range [5, 10]
      const mediumBonus = salvageController._calculateThreatBonus(mockPoi, configWithoutBonus, 'medium')
      expect(mediumBonus).toBeGreaterThanOrEqual(5)
      expect(mediumBonus).toBeLessThanOrEqual(10)

      // High should return value in default range [10, 20]
      const highBonus = salvageController._calculateThreatBonus(mockPoi, configWithoutBonus, 'high')
      expect(highBonus).toBeGreaterThanOrEqual(10)
      expect(highBonus).toBeLessThanOrEqual(20)
    })

    it('should return deterministic value for same POI coordinates (seeded random)', () => {
      // EXPLANATION: The bonus should be deterministic based on POI location
      // so the same PoI always gets the same bonus in the same run.

      const bonus1 = salvageController._calculateThreatBonus(mockPoi, mockTierConfigWithBonus, 'medium')
      const bonus2 = salvageController._calculateThreatBonus(mockPoi, mockTierConfigWithBonus, 'medium')

      expect(bonus1).toBe(bonus2)
    })

    it('should return different values for different POI coordinates', () => {
      // EXPLANATION: Different PoIs should get different bonuses based on
      // their unique coordinates, ensuring variety across the map.

      const poi1 = { q: 1, r: 2 }
      const poi2 = { q: 3, r: -1 }

      const bonus1 = salvageController._calculateThreatBonus(poi1, mockTierConfigWithBonus, 'high')
      const bonus2 = salvageController._calculateThreatBonus(poi2, mockTierConfigWithBonus, 'high')

      // While theoretically possible to be equal, with seeded random they should differ
      // Test multiple pairs to ensure variation
      const bonuses = []
      for (let i = 0; i < 5; i++) {
        const poi = { q: i, r: i * 2 }
        bonuses.push(salvageController._calculateThreatBonus(poi, mockTierConfigWithBonus, 'high'))
      }

      // At least some should be different
      const uniqueBonuses = new Set(bonuses)
      expect(uniqueBonuses.size).toBeGreaterThan(1)
    })
  })

  describe('initializeSalvage() with threat bonus', () => {
    const mockTierConfigWithBonus = {
      threatEncounterBonus: {
        low: { min: 0, max: 0 },
        medium: { min: 5, max: 10 },
        high: { min: 10, max: 20 }
      }
    }

    it('should apply no bonus at low threat level', () => {
      // EXPLANATION: When the player has low threat (0-49% detection),
      // the starting encounter chance should equal the PoI's base value.

      const poi = { q: 2, r: -1, encounterChance: 20, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(
        poi, mockTierConfigWithBonus, 'mid', 1, 'low'
      )

      expect(result.currentEncounterChance).toBe(20)
    })

    it('should apply bonus in range [5, 10] at medium threat level', () => {
      // EXPLANATION: When the player has medium threat (50-79% detection),
      // the starting encounter chance should be base + 5-10%.

      const poi = { q: 2, r: -1, encounterChance: 20, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(
        poi, mockTierConfigWithBonus, 'mid', 1, 'medium'
      )

      expect(result.currentEncounterChance).toBeGreaterThanOrEqual(25) // 20 + 5
      expect(result.currentEncounterChance).toBeLessThanOrEqual(30) // 20 + 10
    })

    it('should apply bonus in range [10, 20] at high threat level', () => {
      // EXPLANATION: When the player has high threat (80-100% detection),
      // the starting encounter chance should be base + 10-20%.

      const poi = { q: 2, r: -1, encounterChance: 20, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(
        poi, mockTierConfigWithBonus, 'mid', 1, 'high'
      )

      expect(result.currentEncounterChance).toBeGreaterThanOrEqual(30) // 20 + 10
      expect(result.currentEncounterChance).toBeLessThanOrEqual(40) // 20 + 20
    })
  })
})
