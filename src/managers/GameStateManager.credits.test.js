import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock tacticalMapStateManager
vi.mock('./TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn(),
    startRun: vi.fn(),
    endRun: vi.fn(),
    subscribe: vi.fn(() => () => {})
  }
}));

// ========================================
// GAMESTATE MANAGER CREDIT HANDLING TESTS
// ========================================
// Tests for endRun() credit calculation from salvage items
// Credits should be calculated from collectedLoot salvageItems, not creditsEarned field

describe('GameStateManager Credit Handling', () => {
  let gameStateManager;
  let tacticalMapStateManager;

  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules();

    // Import fresh instances
    const module = await import('./GameStateManager.js');
    gameStateManager = module.default;

    const tacticalModule = await import('./TacticalMapStateManager.js');
    tacticalMapStateManager = tacticalModule.default;

    // Reset to clean state with a profile
    gameStateManager.setState({
      singlePlayerProfile: {
        credits: 500, // Starting credits
        aiCores: 0,
        unlockedBlueprints: [],
        stats: {
          runsCompleted: 0,
          totalCreditsEarned: 0,
          totalCombatsWon: 0,
          highestTierCompleted: 0
        }
      },
      singlePlayerInventory: {},
      singlePlayerShipSlots: [
        { id: 0, status: 'active' } // Starter deck
      ]
    });

    // Reset tacticalMapStateManager mock
    vi.clearAllMocks();
    tacticalMapStateManager.isRunActive.mockReturnValue(false);
    tacticalMapStateManager.getState.mockReturnValue(null);
  });

  describe('endRun() credit calculation', () => {
    it('adds credits calculated from salvageItems in collectedLoot, not creditsEarned', () => {
      // EXPLANATION: When run ends, credits should be summed from salvageItem.creditValue
      // in collectedLoot, NOT from the legacy creditsEarned field

      // Set up run state with salvage items
      const runState = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Test Sector', hexes: [] },
        collectedLoot: [
          { type: 'salvageItem', creditValue: 50, itemId: 'S1', name: 'Item 1' },
          { type: 'salvageItem', creditValue: 75, itemId: 'S2', name: 'Item 2' },
          { type: 'card', cardId: 'CARD_001' } // Cards don't contribute credits
        ],
        creditsEarned: 999, // Legacy field - should be IGNORED
        currentHull: 100,
        maxHull: 100,
        hexesMoved: 5,
        hexesExplored: [],
        combatsWon: 0,
        combatsLost: 0
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

      const initialCredits = gameStateManager.getState().singlePlayerProfile.credits;

      // End run successfully
      gameStateManager.endRun(true);

      const finalCredits = gameStateManager.getState().singlePlayerProfile.credits;

      // Should add 125 (50 + 75), NOT 999 from creditsEarned
      expect(finalCredits).toBe(initialCredits + 125);
    });

    it('adds zero credits when no salvageItems in collectedLoot', () => {
      // EXPLANATION: If player only collected cards/blueprints (no salvage), credits should be 0

      const runState = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Test Sector', hexes: [] },
        collectedLoot: [
          { type: 'card', cardId: 'CARD_001' },
          { type: 'blueprint', blueprintId: 'BP_001' }
        ],
        creditsEarned: 500, // Legacy field - should be IGNORED
        currentHull: 100,
        maxHull: 100,
        hexesMoved: 5,
        hexesExplored: [],
        combatsWon: 0,
        combatsLost: 0
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

      const initialCredits = gameStateManager.getState().singlePlayerProfile.credits;

      gameStateManager.endRun(true);

      const finalCredits = gameStateManager.getState().singlePlayerProfile.credits;

      // No salvage items = no credits added
      expect(finalCredits).toBe(initialCredits);
    });

    it('updates totalCreditsEarned stat with calculated credits', () => {
      // EXPLANATION: Stats tracking should use calculated credits, not legacy field

      const runState = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Test Sector', hexes: [] },
        collectedLoot: [
          { type: 'salvageItem', creditValue: 100, itemId: 'S1' }
        ],
        creditsEarned: 9999, // Should be ignored
        currentHull: 100,
        maxHull: 100,
        hexesMoved: 5,
        hexesExplored: [],
        combatsWon: 0,
        combatsLost: 0
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

      const initialTotal = gameStateManager.getState().singlePlayerProfile.stats.totalCreditsEarned;

      gameStateManager.endRun(true);

      const finalTotal = gameStateManager.getState().singlePlayerProfile.stats.totalCreditsEarned;

      expect(finalTotal).toBe(initialTotal + 100);
    });

    it('includes calculated credits in lastRunSummary', () => {
      // EXPLANATION: The run summary shown to player should reflect actual extracted credits

      const runState = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Test Sector', hexes: [] },
        collectedLoot: [
          { type: 'salvageItem', creditValue: 80, itemId: 'S1' },
          { type: 'salvageItem', creditValue: 45, itemId: 'S2' }
        ],
        creditsEarned: 5000, // Should be ignored
        currentHull: 100,
        maxHull: 100,
        hexesMoved: 5,
        hexesExplored: [],
        combatsWon: 0,
        combatsLost: 0
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

      gameStateManager.endRun(true);

      const summary = gameStateManager.getState().lastRunSummary;

      expect(summary.creditsEarned).toBe(125); // 80 + 45
    });

    it('does not add credits on failed run (MIA)', () => {
      // EXPLANATION: When player goes MIA, they lose all loot including credits

      const runState = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Test Sector', hexes: [] },
        collectedLoot: [
          { type: 'salvageItem', creditValue: 500, itemId: 'S1' }
        ],
        creditsEarned: 500,
        currentHull: 0,
        maxHull: 100,
        hexesMoved: 5,
        hexesExplored: [],
        combatsWon: 0,
        combatsLost: 0
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

      const initialCredits = gameStateManager.getState().singlePlayerProfile.credits;

      // End run as failure (MIA)
      gameStateManager.endRun(false);

      const finalCredits = gameStateManager.getState().singlePlayerProfile.credits;

      // Credits should not change on MIA
      expect(finalCredits).toBe(initialCredits);
    });

    it('handles empty collectedLoot array', () => {
      // EXPLANATION: Edge case - player extracted without collecting anything

      const runState = {
        shipSlotId: 0,
        mapTier: 1,
        mapData: { name: 'Test Sector', hexes: [] },
        collectedLoot: [],
        creditsEarned: 0,
        currentHull: 100,
        maxHull: 100,
        hexesMoved: 1,
        hexesExplored: [],
        combatsWon: 0,
        combatsLost: 0
      };

      tacticalMapStateManager.isRunActive.mockReturnValue(true);
      tacticalMapStateManager.getState.mockReturnValue(runState);

      const initialCredits = gameStateManager.getState().singlePlayerProfile.credits;

      gameStateManager.endRun(true);

      const finalCredits = gameStateManager.getState().singlePlayerProfile.credits;

      expect(finalCredits).toBe(initialCredits);
    });
  });
});
