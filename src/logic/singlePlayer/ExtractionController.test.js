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

  // ========================================
  // VARIABLE ESCAPE DAMAGE TESTS (TDD)
  // ========================================
  // Tests for AI-based variable escape damage with random distribution
  //
  // Requirements:
  // - AI defines escape damage range (e.g., { min: 1, max: 3 })
  // - Total damage rolled within range
  // - Each damage point randomly assigned to a ship section

  describe('Variable Escape Damage', () => {
    describe('getEscapeDamageForAI', () => {
      it('should return AI escapeDamage range when defined', () => {
        const ai = { name: 'Scout', escapeDamage: { min: 1, max: 3 } };
        const result = ExtractionController.getEscapeDamageForAI(ai);
        expect(result).toEqual({ min: 1, max: 3 });
      });

      it('should return default {min: 2, max: 2} when AI has no escapeDamage', () => {
        const ai = { name: 'Unknown' };
        const result = ExtractionController.getEscapeDamageForAI(ai);
        expect(result).toEqual({ min: 2, max: 2 });
      });

      it('should return default when AI is null/undefined', () => {
        expect(ExtractionController.getEscapeDamageForAI(null)).toEqual({ min: 2, max: 2 });
        expect(ExtractionController.getEscapeDamageForAI(undefined)).toEqual({ min: 2, max: 2 });
      });
    });

    describe('createRNG (seeded random)', () => {
      it('should create RNG with random() method', () => {
        const rng = ExtractionController.createRNG(12345);
        expect(typeof rng.random).toBe('function');
        const value = rng.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      });

      it('should create RNG with randomIntInclusive() method', () => {
        const rng = ExtractionController.createRNG(12345);
        expect(typeof rng.randomIntInclusive).toBe('function');
        const value = rng.randomIntInclusive(1, 5);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
      });

      it('should produce same sequence with same seed', () => {
        const rng1 = ExtractionController.createRNG(12345);
        const rng2 = ExtractionController.createRNG(12345);

        // Same seed should produce identical sequences
        for (let i = 0; i < 10; i++) {
          expect(rng1.random()).toBe(rng2.random());
        }
      });

      it('should produce different sequences with different seeds', () => {
        const rng1 = ExtractionController.createRNG(12345);
        const rng2 = ExtractionController.createRNG(54321);

        // Different seeds should produce different values
        const values1 = Array.from({ length: 5 }, () => rng1.random());
        const values2 = Array.from({ length: 5 }, () => rng2.random());
        expect(values1).not.toEqual(values2);
      });
    });

    describe('applyEscapeDamage with random distribution', () => {
      it('should distribute total damage randomly across sections', () => {
        const runState = {
          shipSections: {
            Bridge: { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Power Cell': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Drone Control Hub': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 3, max: 3 } }; // Fixed 3 for predictable test

        const result = ExtractionController.applyEscapeDamage(runState, ai);

        // Total damage across all sections should equal 3
        const originalTotal = Object.values(runState.shipSections).reduce((sum, s) => sum + s.hull, 0);
        const newTotal = Object.values(result.updatedSections).reduce((sum, s) => sum + s.hull, 0);
        expect(originalTotal - newTotal).toBe(3);
      });

      it('should return totalDamage in result', () => {
        const runState = {
          shipSections: {
            Bridge: { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 2, max: 2 } };

        const result = ExtractionController.applyEscapeDamage(runState, ai);
        expect(result.totalDamage).toBe(2);
      });

      it('should not reduce hull below 0', () => {
        const runState = {
          shipSections: {
            Bridge: { hull: 1, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 5, max: 5 } };

        const result = ExtractionController.applyEscapeDamage(runState, ai);
        expect(result.updatedSections.Bridge.hull).toBe(0);
      });

      it('should correctly determine wouldDestroy based on thresholds', () => {
        // Ship where all sections will be damaged after escape
        const nearDestroyState = {
          shipSections: {
            Bridge: { hull: 5, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Power Cell': { hull: 5, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Drone Control Hub': { hull: 5, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 3, max: 3 } }; // Will push all to threshold or below

        const result = ExtractionController.applyEscapeDamage(nearDestroyState, ai);
        // wouldDestroy is true only if ALL sections are at or below damaged threshold
        expect(result.wouldDestroy).toBeDefined();
      });

      it('should not mutate original shipSections', () => {
        const runState = {
          shipSections: {
            Bridge: { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 2, max: 2 } };

        ExtractionController.applyEscapeDamage(runState, ai);

        // Original should be unchanged
        expect(runState.shipSections.Bridge.hull).toBe(8);
      });

      it('should produce same results with same seed', () => {
        const runState = {
          shipSections: {
            Bridge: { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Power Cell': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Drone Control Hub': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 1, max: 5 } };
        const seed = 12345;

        const result1 = ExtractionController.applyEscapeDamage(runState, ai, seed);
        const result2 = ExtractionController.applyEscapeDamage(runState, ai, seed);

        // Same seed should produce identical results
        expect(result1.totalDamage).toBe(result2.totalDamage);
        expect(result1.updatedSections).toEqual(result2.updatedSections);
        expect(result1.wouldDestroy).toBe(result2.wouldDestroy);
      });

      it('should produce different results with different seeds', () => {
        const runState = {
          shipSections: {
            Bridge: { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Power Cell': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Drone Control Hub': { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 1, max: 5 } };

        // Collect results with multiple different seeds
        const results = [];
        for (let seed = 1000; seed < 1010; seed++) {
          const result = ExtractionController.applyEscapeDamage(runState, ai, seed);
          results.push({
            totalDamage: result.totalDamage,
            sections: JSON.stringify(result.updatedSections)
          });
        }

        // At least some should be different (extremely unlikely all 10 are identical)
        const uniqueResults = new Set(results.map(r => `${r.totalDamage}-${r.sections}`));
        expect(uniqueResults.size).toBeGreaterThan(1);
      });

      it('should default to Date.now() when no seed provided', () => {
        const runState = {
          shipSections: {
            Bridge: { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 2, max: 2 } };

        // Should not throw when called without seed
        expect(() => ExtractionController.applyEscapeDamage(runState, ai)).not.toThrow();
      });
    });

    describe('checkEscapeCouldDestroy (worst-case analysis)', () => {
      it('should return true if max damage could destroy ship', () => {
        // All sections at 5 hull, threshold 4
        // Max damage 5 could hit same section 5 times, dropping it to 0
        const vulnerableState = {
          shipSections: {
            Bridge: { hull: 5, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Power Cell': { hull: 5, maxHull: 8, thresholds: { damaged: 4, critical: 0 } },
            'Drone Control Hub': { hull: 5, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const hardAI = { escapeDamage: { min: 3, max: 5 } };

        const result = ExtractionController.checkEscapeCouldDestroy(vulnerableState, hardAI);
        expect(result.couldDestroy).toBeDefined();
        expect(result.maxDamage).toBe(5);
      });

      it('should return escapeDamageRange for UI display', () => {
        const state = {
          shipSections: {
            Bridge: { hull: 8, maxHull: 8, thresholds: { damaged: 4, critical: 0 } }
          }
        };
        const ai = { escapeDamage: { min: 1, max: 3 } };

        const result = ExtractionController.checkEscapeCouldDestroy(state, ai);
        expect(result.escapeDamageRange).toEqual({ min: 1, max: 3 });
      });
    });
  });
})
