import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SalvageController } from './SalvageController.js'

// ========================================
// SALVAGE CONTROLLER TESTS
// ========================================

describe('SalvageController', () => {
  let salvageController
  let mockLootGenerator
  let mockTierConfig

  beforeEach(() => {
    // Mock loot generator that returns predictable slots
    mockLootGenerator = {
      generateSalvageSlots: vi.fn().mockReturnValue([
        { type: 'card', content: { cardId: 'test_card_1', cardName: 'Test Card', rarity: 'Common' }, revealed: false },
        { type: 'credits', content: { amount: 50 }, revealed: false },
        { type: 'credits', content: { amount: 30 }, revealed: false }
      ])
    }

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

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid', mockLootGenerator)

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

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid', mockLootGenerator)

      expect(result.currentEncounterChance).toBe(20)
    })

    it('initializes with all slots unrevealed', () => {
      // EXPLANATION: All slots should start in an unrevealed state.
      // The player will reveal them one by one during salvage.

      const poi = { encounterChance: 15, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'core', mockLootGenerator)

      expect(result.slots.every(slot => slot.revealed === false)).toBe(true)
    })

    it('starts with currentSlotIndex at 0', () => {
      // EXPLANATION: Salvage proceeds in order, starting from slot 0.

      const poi = { encounterChance: 15, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid', mockLootGenerator)

      expect(result.currentSlotIndex).toBe(0)
    })

    it('initializes encounterTriggered as false', () => {
      // EXPLANATION: No encounter has happened yet when salvage starts.

      const poi = { encounterChance: 15, rewardType: 'ORDNANCE_PACK' }

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid', mockLootGenerator)

      expect(result.encounterTriggered).toBe(false)
    })

    it('calls lootGenerator.generateSalvageSlots with correct parameters', () => {
      // EXPLANATION: The salvage controller should delegate slot generation
      // to the loot generator with the correct pack type, tier, zone, and config.

      const poi = { encounterChance: 15, rewardType: 'TACTICAL_PACK' }

      salvageController.initializeSalvage(poi, mockTierConfig, 'core', mockLootGenerator)

      expect(mockLootGenerator.generateSalvageSlots).toHaveBeenCalledWith(
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

      const result = salvageController.initializeSalvage(poi, mockTierConfig, 'mid', mockLootGenerator)

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

      salvageController.initializeSalvage(hexWithNestedPoiData, mockTierConfig, 'mid', mockLootGenerator)

      // Should pass the nested rewardType to lootGenerator
      expect(mockLootGenerator.generateSalvageSlots).toHaveBeenCalledWith(
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

      const result = salvageController.initializeSalvage(hexWithNestedPoiData, mockTierConfig, 'core', mockLootGenerator)

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
})
