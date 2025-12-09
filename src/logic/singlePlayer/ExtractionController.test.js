import { describe, it, expect, vi, beforeEach } from 'vitest'

// ========================================
// EXTRACTION CONTROLLER TESTS
// ========================================
// Tests for run abandonment and state cleanup
// Specifically tests that game state is properly cleared when abandoning mid-combat

// Mock all dependencies
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    get: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
    endRun: vi.fn(),
    resetGameState: vi.fn()
  }
}))

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

vi.mock('./DroneDamageProcessor.js', () => ({
  default: {
    process: vi.fn(() => [])
  }
}))

vi.mock('../detection/DetectionManager.js', () => ({
  default: {}
}))

vi.mock('../../data/mapData.js', () => ({
  mapTiers: []
}))

vi.mock('../../data/economyData.js', () => ({
  ECONOMY: {
    STARTER_DECK_EXTRACTION_LIMIT: 3,
    CUSTOM_DECK_EXTRACTION_LIMIT: 6
  }
}))

vi.mock('../reputation/ReputationService.js', () => ({
  default: {
    getExtractionBonus: vi.fn(() => 0) // Default to 0 bonus for tests
  }
}))

// Import after mocks are set up
import ExtractionController from './ExtractionController.js'
import gameStateManager from '../../managers/GameStateManager.js'
import ReputationService from '../reputation/ReputationService.js'

describe('ExtractionController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('abandonRun - mid-combat cleanup', () => {
    /**
     * BUG TEST: When abandoning a run mid-combat, game state (player1, player2,
     * gameActive, turnPhase, etc.) should be cleared so the next combat starts fresh.
     *
     * Current behavior: Only currentRunState is cleared, game state persists
     * Expected behavior: Both run state AND game state should be cleared
     *
     * This test documents the bug and will FAIL until fixed.
     */
    it('should clear game state when abandoning mid-combat', () => {
      // SETUP: Simulate being in mid-combat
      // This is the state when player clicks "Abandon" during a game
      const midCombatState = {
        appState: 'inGame',
        turnPhase: 'deployment',
        gameActive: true,
        gameStage: 'roundLoop',
        roundNumber: 1,
        player1: { name: 'Player', deck: [], hand: [] },
        player2: { name: 'AI', deck: [], hand: [] },
        currentRunState: { shipSlotId: 0 }
      }
      gameStateManager.get.mockImplementation((key) => midCombatState[key])
      gameStateManager.getState.mockReturnValue(midCombatState)

      // ACT: Abandon the run
      ExtractionController.abandonRun()

      // ASSERT: resetGameState should be called when abandoning mid-combat
      expect(gameStateManager.resetGameState).toHaveBeenCalled()

      // ASSERT: endRun should still be called
      expect(gameStateManager.endRun).toHaveBeenCalledWith(false)
    })

    /**
     * Verify that abandoning outside of combat doesn't unnecessarily reset state
     */
    it('should NOT call resetGameState when abandoning from tactical map (not mid-combat)', () => {
      // SETUP: Simulate being on tactical map (not in combat)
      const tacticalMapState = {
        appState: 'tacticalMap',
        turnPhase: null,
        gameActive: false,
        gameStage: 'preGame',
        roundNumber: 0,
        player1: null,
        player2: null,
        currentRunState: { shipSlotId: 0 }
      }
      gameStateManager.get.mockImplementation((key) => tacticalMapState[key])
      gameStateManager.getState.mockReturnValue(tacticalMapState)

      // ACT: Abandon the run
      ExtractionController.abandonRun()

      // ASSERT: resetGameState should NOT be called (not in combat)
      expect(gameStateManager.resetGameState).not.toHaveBeenCalled()

      // ASSERT: endRun should still be called
      expect(gameStateManager.endRun).toHaveBeenCalledWith(false)

      // ASSERT: showFailedRunScreen should be set (loading screen before hangar)
      const failedRunCall = gameStateManager.setState.mock.calls.find(
        call => call[0].showFailedRunScreen === true
      )
      expect(failedRunCall).toBeDefined()
      expect(failedRunCall[0].failedRunType).toBe('abandon')
    })
  })

  // ========================================
  // DYNAMIC EXTRACTION LIMIT TESTS
  // ========================================
  // TDD tests for damage-based extraction limit
  //
  // Requirement: When playing with starter deck (Slot 0), reduce extraction
  // choices by 1 for each damaged ship section

  describe('calculateExtractionLimit - damage-based limit', () => {
    /**
     * NEW REQUIREMENT: Extraction limit should be reduced by damaged sections
     * Base limit: 3 (STARTER_DECK_EXTRACTION_LIMIT)
     * Each damaged section (hull <= threshold.damaged) reduces by 1
     */
    it('should return base limit (3) when no sections are damaged', () => {
      const currentRunState = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      const limit = ExtractionController.calculateExtractionLimit(currentRunState);
      expect(limit).toBe(3);
    });

    it('should reduce limit by 1 for each damaged section', () => {
      // 1 damaged section
      const oneDAMAGED = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 4, maxHull: 10, thresholds: { damaged: 5 } }, // damaged (4 <= 5)
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }, // healthy
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } } // healthy
        }
      };
      expect(ExtractionController.calculateExtractionLimit(oneDAMAGED)).toBe(2);

      // 2 damaged sections
      const twoDAMAGED = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 3, maxHull: 10, thresholds: { damaged: 5 } }, // damaged
          powerCell: { hull: 5, maxHull: 10, thresholds: { damaged: 5 } }, // damaged (5 <= 5)
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } } // healthy
        }
      };
      expect(ExtractionController.calculateExtractionLimit(twoDAMAGED)).toBe(1);

      // 3 damaged sections
      const threeDAMAGED = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 2, maxHull: 10, thresholds: { damaged: 5 } }, // damaged
          powerCell: { hull: 3, maxHull: 10, thresholds: { damaged: 5 } }, // damaged
          droneControlHub: { hull: 1, maxHull: 10, thresholds: { damaged: 5 } } // damaged
        }
      };
      expect(ExtractionController.calculateExtractionLimit(threeDAMAGED)).toBe(0);
    });

    it('should use section threshold.damaged for damage check', () => {
      // Section with hull 6, threshold 5 is healthy (6 > 5)
      const healthy = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 6, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };
      expect(ExtractionController.calculateExtractionLimit(healthy)).toBe(3);

      // Section with hull 5, threshold 5 is damaged (5 <= 5)
      const exactThreshold = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 5, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };
      expect(ExtractionController.calculateExtractionLimit(exactThreshold)).toBe(2);
    });

    it('should return minimum of 0 (not negative)', () => {
      // Even with more than 3 damaged sections, limit should be 0 not negative
      const allDAMAGED = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 0, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 0, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 0, maxHull: 10, thresholds: { damaged: 5 } },
          extra: { hull: 0, maxHull: 10, thresholds: { damaged: 5 } } // hypothetical 4th section
        }
      };
      expect(ExtractionController.calculateExtractionLimit(allDAMAGED)).toBe(0);
    });

    it('should handle missing threshold data with default value', () => {
      // If no threshold, default to 5
      const noThreshold = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 4, maxHull: 10 }, // No thresholds - should use default (5)
          powerCell: { hull: 10, maxHull: 10 }
        }
      };
      expect(ExtractionController.calculateExtractionLimit(noThreshold)).toBe(2);
    });
  });

  describe('completeExtraction - uses dynamic limit', () => {
    beforeEach(() => {
      // Setup mock state
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [
          { id: 0, status: 'active', drones: [] }
        ]
      });
    });

    it('should use calculateExtractionLimit for starter deck extraction limit', () => {
      // Setup run state with 1 damaged section
      const currentRunState = {
        shipSlotId: 0,
        collectedLoot: [
          { type: 'card', cardId: 'CARD001' },
          { type: 'card', cardId: 'CARD002' },
          { type: 'card', cardId: 'CARD003' } // 3 items - should trigger selection with limit of 2
        ],
        creditsEarned: 100,
        currentHull: 20,
        maxHull: 30,
        shipSections: {
          bridge: { hull: 4, maxHull: 10, thresholds: { damaged: 5 } }, // damaged
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      const result = ExtractionController.completeExtraction(currentRunState, null);

      // With 1 damaged section, limit = 2
      // 3 items collected, so selection should be required
      expect(result.action).toBe('selectLoot');
      expect(result.limit).toBe(2); // Not the default 3
    });
  });

  // ========================================
  // CUSTOM DECK EXTRACTION LIMIT TESTS
  // ========================================
  // TDD tests for custom deck (Slots 1-5) extraction limits
  // with reputation bonus support
  //
  // Requirements:
  // - Custom decks have a base limit of 6 (vs 3 for starter)
  // - Damage reduces limit same as starter deck
  // - Reputation milestones add +1 to custom deck limits

  describe('calculateExtractionLimit - custom deck support', () => {
    it('should return base limit of 6 for custom decks (Slot 1-5) with no damage', () => {
      const customDeckState = {
        shipSlotId: 1, // Custom deck slot
        shipSections: {
          bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      const limit = ExtractionController.calculateExtractionLimit(customDeckState);
      expect(limit).toBe(6);
    });

    it('should reduce custom deck limit by damaged sections', () => {
      // 1 damaged section on custom deck
      const customWithDamage = {
        shipSlotId: 2, // Custom deck slot
        shipSections: {
          bridge: { hull: 4, maxHull: 10, thresholds: { damaged: 5 } }, // damaged
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      expect(ExtractionController.calculateExtractionLimit(customWithDamage)).toBe(5);

      // 3 damaged sections
      const allDamaged = {
        shipSlotId: 3,
        shipSections: {
          bridge: { hull: 2, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 3, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 1, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      expect(ExtractionController.calculateExtractionLimit(allDamaged)).toBe(3);
    });

    it('should still return base 3 for starter deck (Slot 0)', () => {
      const starterDeckState = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      expect(ExtractionController.calculateExtractionLimit(starterDeckState)).toBe(3);
    });

    it('should add reputation bonus to custom deck limit', () => {
      // Mock reputation bonus of 2 (e.g., player at level 6+)
      ReputationService.getExtractionBonus.mockReturnValue(2);

      const customDeckState = {
        shipSlotId: 1,
        shipSections: {
          bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      // Base 6 + 2 reputation bonus = 8
      expect(ExtractionController.calculateExtractionLimit(customDeckState)).toBe(8);

      // Reset mock
      ReputationService.getExtractionBonus.mockReturnValue(0);
    });

    it('should NOT add reputation bonus to starter deck', () => {
      // Mock reputation bonus of 3
      ReputationService.getExtractionBonus.mockReturnValue(3);

      const starterDeckState = {
        shipSlotId: 0,
        shipSections: {
          bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      // Starter deck should still be 3, not 6
      expect(ExtractionController.calculateExtractionLimit(starterDeckState)).toBe(3);

      // Reset mock
      ReputationService.getExtractionBonus.mockReturnValue(0);
    });

    it('should combine reputation bonus and damage reduction for custom decks', () => {
      // Mock reputation bonus of 1 (player at level 3-5)
      ReputationService.getExtractionBonus.mockReturnValue(1);

      const customWithDamage = {
        shipSlotId: 2,
        shipSections: {
          bridge: { hull: 4, maxHull: 10, thresholds: { damaged: 5 } }, // damaged
          powerCell: { hull: 3, maxHull: 10, thresholds: { damaged: 5 } }, // damaged
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } } // healthy
        }
      };

      // Base 6 + 1 reputation - 2 damage = 5
      expect(ExtractionController.calculateExtractionLimit(customWithDamage)).toBe(5);

      // Reset mock
      ReputationService.getExtractionBonus.mockReturnValue(0);
    });
  });

  describe('completeExtraction - applies limits to custom decks', () => {
    beforeEach(() => {
      gameStateManager.getState.mockReturnValue({
        singlePlayerShipSlots: [
          { id: 0, status: 'active', drones: [] },
          { id: 1, status: 'active', drones: [] },
          { id: 2, status: 'active', drones: [] }
        ]
      });
    });

    it('should enforce extraction limit on custom decks', () => {
      // Custom deck with 7 items collected - should trigger selection
      const customDeckRunState = {
        shipSlotId: 1,
        collectedLoot: [
          { type: 'card', cardId: 'CARD001' },
          { type: 'card', cardId: 'CARD002' },
          { type: 'card', cardId: 'CARD003' },
          { type: 'card', cardId: 'CARD004' },
          { type: 'card', cardId: 'CARD005' },
          { type: 'card', cardId: 'CARD006' },
          { type: 'card', cardId: 'CARD007' } // 7 items exceeds limit of 6
        ],
        creditsEarned: 100,
        currentHull: 20,
        maxHull: 30,
        shipSections: {
          bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      const result = ExtractionController.completeExtraction(customDeckRunState, null);

      expect(result.action).toBe('selectLoot');
      expect(result.limit).toBe(6);
    });

    it('should allow custom deck extraction under limit without selection', () => {
      // Custom deck with 5 items - under limit of 6
      const underLimitState = {
        shipSlotId: 1,
        collectedLoot: [
          { type: 'card', cardId: 'CARD001' },
          { type: 'card', cardId: 'CARD002' },
          { type: 'card', cardId: 'CARD003' },
          { type: 'card', cardId: 'CARD004' },
          { type: 'card', cardId: 'CARD005' }
        ],
        creditsEarned: 100,
        currentHull: 20,
        maxHull: 30,
        shipSections: {
          bridge: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          powerCell: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } },
          droneControlHub: { hull: 10, maxHull: 10, thresholds: { damaged: 5 } }
        }
      };

      const result = ExtractionController.completeExtraction(underLimitState, null);

      // Should complete extraction, not trigger selection
      expect(result.action).toBeUndefined();
      expect(result.success).toBe(true);
    });
  });
})
