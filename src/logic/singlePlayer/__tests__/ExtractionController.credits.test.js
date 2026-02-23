import { describe, it, expect, beforeEach, vi } from 'vitest';

// ========================================
// EXTRACTION CONTROLLER CREDIT CALCULATION TESTS
// ========================================
// Tests for credit calculation from extracted salvage items
// Credits should be summed from selected salvage items only, not from creditsEarned field

describe('ExtractionController Credit Calculation', () => {
  // ========================================
  // calculateExtractedCredits() TESTS
  // ========================================

  describe('calculateExtractedCredits()', () => {
    // Import the function directly for unit testing
    // This function will be added to ExtractionController
    let calculateExtractedCredits;

    beforeEach(async () => {
      // Dynamic import to get fresh module
      const module = await import('../ExtractionController.js');
      calculateExtractedCredits = module.calculateExtractedCredits;
    });

    it('returns 0 for empty loot array', () => {
      // EXPLANATION: When no loot is extracted, credits should be 0
      const loot = [];

      const result = calculateExtractedCredits(loot);

      expect(result).toBe(0);
    });

    it('returns 0 for null/undefined loot', () => {
      // EXPLANATION: Handle edge cases gracefully
      expect(calculateExtractedCredits(null)).toBe(0);
      expect(calculateExtractedCredits(undefined)).toBe(0);
    });

    it('sums creditValue from all salvageItem entries', () => {
      // EXPLANATION: Each salvageItem has a creditValue that should be summed
      const loot = [
        { type: 'salvageItem', creditValue: 50, itemId: 'SALVAGE_1', name: 'Item 1' },
        { type: 'salvageItem', creditValue: 75, itemId: 'SALVAGE_2', name: 'Item 2' },
        { type: 'salvageItem', creditValue: 100, itemId: 'SALVAGE_3', name: 'Item 3' }
      ];

      const result = calculateExtractedCredits(loot);

      expect(result).toBe(225); // 50 + 75 + 100
    });

    it('ignores card items when summing credits', () => {
      // EXPLANATION: Cards don't have credit values - only salvage items do
      const loot = [
        { type: 'card', cardId: 'CARD_001', rarity: 'Common' },
        { type: 'salvageItem', creditValue: 50, itemId: 'SALVAGE_1' },
        { type: 'card', cardId: 'CARD_002', rarity: 'Rare' }
      ];

      const result = calculateExtractedCredits(loot);

      expect(result).toBe(50); // Only the salvage item
    });

    it('ignores blueprint items when summing credits', () => {
      // EXPLANATION: Blueprints are unlocks, not credit sources
      const loot = [
        { type: 'blueprint', blueprintId: 'BP_001' },
        { type: 'salvageItem', creditValue: 80, itemId: 'SALVAGE_1' },
        { type: 'blueprint', blueprintId: 'BP_002' }
      ];

      const result = calculateExtractedCredits(loot);

      expect(result).toBe(80); // Only the salvage item
    });

    it('handles mixed loot correctly', () => {
      // EXPLANATION: Real loot arrays contain cards, blueprints, and salvage items
      const loot = [
        { type: 'card', cardId: 'CARD_001', rarity: 'Common' },
        { type: 'salvageItem', creditValue: 45, itemId: 'SALVAGE_1', name: 'Gyroscope' },
        { type: 'card', cardId: 'CARD_002', rarity: 'Rare' },
        { type: 'blueprint', blueprintId: 'BP_001' },
        { type: 'salvageItem', creditValue: 120, itemId: 'SALVAGE_2', name: 'Nav Module' },
        { type: 'card', cardId: 'CARD_003', rarity: 'Uncommon' }
      ];

      const result = calculateExtractedCredits(loot);

      expect(result).toBe(165); // 45 + 120
    });

    it('handles salvageItem with missing creditValue', () => {
      // EXPLANATION: Defensive coding - treat missing creditValue as 0
      const loot = [
        { type: 'salvageItem', creditValue: 50, itemId: 'SALVAGE_1' },
        { type: 'salvageItem', itemId: 'SALVAGE_2' }, // Missing creditValue
        { type: 'salvageItem', creditValue: 30, itemId: 'SALVAGE_3' }
      ];

      const result = calculateExtractedCredits(loot);

      expect(result).toBe(80); // 50 + 0 + 30
    });

    it('handles salvageItem with zero creditValue', () => {
      // EXPLANATION: Zero is a valid value
      const loot = [
        { type: 'salvageItem', creditValue: 50, itemId: 'SALVAGE_1' },
        { type: 'salvageItem', creditValue: 0, itemId: 'SALVAGE_2' },
        { type: 'salvageItem', creditValue: 30, itemId: 'SALVAGE_3' }
      ];

      const result = calculateExtractedCredits(loot);

      expect(result).toBe(80); // 50 + 0 + 30
    });
  });

  // ========================================
  // completeExtraction() CREDIT FLOW TESTS
  // ========================================

  describe('completeExtraction() credit handling', () => {
    let ExtractionController;
    let mockGameStateManager;
    let mockTacticalMapStateManager;

    beforeEach(async () => {
      // Reset mocks
      vi.resetModules();

      // Mock gameStateManager
      mockGameStateManager = {
        getState: vi.fn().mockReturnValue({
          singlePlayerShipSlots: [{ id: 0 }],
          singlePlayerProfile: { credits: 1000 }
        }),
        setState: vi.fn(),
        endRun: vi.fn(),
        get: vi.fn()
      };

      // Mock tacticalMapStateManager
      mockTacticalMapStateManager = {
        getState: vi.fn().mockReturnValue({}),
        setState: vi.fn(),
        isRunActive: vi.fn().mockReturnValue(true),
        startRun: vi.fn(),
        endRun: vi.fn()
      };

      vi.doMock('../../../managers/GameStateManager.js', () => ({
        default: mockGameStateManager
      }));

      vi.doMock('../../../managers/TacticalMapStateManager.js', () => ({
        default: mockTacticalMapStateManager
      }));

      // Mock other dependencies
      vi.doMock('../DroneDamageProcessor.js', () => ({
        default: { process: vi.fn().mockReturnValue([]) }
      }));

      vi.doMock('../../detection/DetectionManager.js', () => ({
        default: { getCurrentDetection: vi.fn().mockReturnValue(0) }
      }));

      vi.doMock('../../reputation/ReputationService.js', () => ({
        default: { getExtractionBonus: vi.fn().mockReturnValue(0) }
      }));

      // Import controller after mocks are set up
      const module = await import('../ExtractionController.js');
      ExtractionController = module.default;
    });

    it('calculates credits from selectedLoot salvage items, not creditsEarned', () => {
      // EXPLANATION: When player selects specific loot, credits should be
      // calculated from that selection, not the original creditsEarned total

      // Mock the run state in tacticalMapStateManager
      mockTacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0,
        collectedLoot: [
          { type: 'salvageItem', creditValue: 50, itemId: 'S1' },
          { type: 'salvageItem', creditValue: 75, itemId: 'S2' },
          { type: 'salvageItem', creditValue: 100, itemId: 'S3' }
        ],
        creditsEarned: 225, // Legacy field - ALL collected
        currentHull: 100,
        maxHull: 100,
        shipSections: {}
      });

      const runState = mockTacticalMapStateManager.getState();

      // Player can only extract 2 items, selects the first two
      const selectedLoot = [
        { type: 'salvageItem', creditValue: 50, itemId: 'S1' },
        { type: 'salvageItem', creditValue: 75, itemId: 'S2' }
      ];

      const result = ExtractionController.completeExtraction(runState, selectedLoot);

      // Summary should show 125 (selected), not 225 (all collected)
      expect(result.creditsEarned).toBe(125);
    });

    it('includes only card and blueprint items in summary counts', () => {
      // EXPLANATION: The summary should count cards and blueprints separately,
      // while credits come from salvage items

      // Mock the run state in tacticalMapStateManager
      mockTacticalMapStateManager.getState.mockReturnValue({
        shipSlotId: 0,
        collectedLoot: [],
        creditsEarned: 0,
        currentHull: 100,
        maxHull: 100,
        shipSections: {}
      });

      const runState = mockTacticalMapStateManager.getState();

      const selectedLoot = [
        { type: 'card', cardId: 'CARD_001' },
        { type: 'card', cardId: 'CARD_002' },
        { type: 'blueprint', blueprintId: 'BP_001' },
        { type: 'salvageItem', creditValue: 80, itemId: 'S1' }
      ];

      const result = ExtractionController.completeExtraction(runState, selectedLoot);

      expect(result.cardsAcquired).toBe(2);
      expect(result.blueprintsAcquired).toBe(1);
      expect(result.creditsEarned).toBe(80);
    });
  });
});
