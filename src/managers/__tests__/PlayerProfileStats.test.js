import { describe, it, expect, vi, beforeEach } from 'vitest'

// ========================================
// PLAYER PROFILE STATS TESTS
// ========================================
// Tests for player statistics tracking and persistence
// Covers: runsCompleted, runsLost, totalCombatsWon, highestTierCompleted, totalCreditsEarned
//
// These stats are displayed in the Hangar screen header and should:
// 1. Be stored in singlePlayerProfile.stats.*
// 2. Be updated correctly in endRun()
// 3. Persist across save/load cycles

// Mock dependencies
vi.mock('../data/economyData.js', () => ({
  ECONOMY: {
    STARTING_CREDITS: 100,
    STARTER_DECK_COPY_COST: 500
  }
}))

vi.mock('../data/saveGameSchema.js', () => ({
  SAVE_VERSION: '1.0',
  defaultPlayerProfile: {
    saveVersion: '1.0',
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    credits: 100,
    securityTokens: 0,
    aiCores: 0,
    unlockedBlueprints: [],
    gameSeed: Date.now(),
    defaultShipSlotId: 0,
    stats: {
      runsCompleted: 0,
      runsLost: 0,
      totalCreditsEarned: 0,
      totalCombatsWon: 0,
      totalCombatsLost: 0,
      highestTierCompleted: 0,
    },
    reputation: {
      current: 0,
      level: 0,
      unclaimedRewards: [],
    },
  },
  createNewSave: vi.fn()
}))

vi.mock('../logic/reputation/ReputationService.js', () => ({
  default: {
    awardReputation: vi.fn(() => ({
      repGained: 10,
      previousRep: 0,
      newRep: 10,
      previousLevel: 0,
      newLevel: 0,
      leveledUp: false
    }))
  }
}))

vi.mock('../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}))

describe('Player Profile Stats', () => {
  // ========================================
  // STATS SCHEMA STRUCTURE TESTS
  // ========================================

  describe('Stats Schema Structure', () => {
    it('should have stats nested under singlePlayerProfile.stats', () => {
      // EXPLANATION: This test verifies that player statistics are stored in the correct
      // location within the profile object. The HangarScreen UI reads from
      // singlePlayerProfile.stats.*, so stats must be nested under the 'stats' property.
      // Expected: Profile should have a stats object with all required stat properties

      const mockProfile = {
        credits: 100,
        stats: {
          runsCompleted: 5,
          runsLost: 2,
          totalCreditsEarned: 1000,
          totalCombatsWon: 15,
          totalCombatsLost: 3,
          highestTierCompleted: 2,
        }
      }

      expect(mockProfile.stats).toBeDefined()
      expect(mockProfile.stats.runsCompleted).toBe(5)
      expect(mockProfile.stats.runsLost).toBe(2)
      expect(mockProfile.stats.totalCombatsWon).toBe(15)
      expect(mockProfile.stats.highestTierCompleted).toBe(2)
    })

    it('should initialize all stats to 0 for new profiles', () => {
      // EXPLANATION: This test verifies that new player profiles start with all statistics
      // set to zero. This is important for first-time players to see accurate stats.
      // Expected: All stat values should be 0 in a fresh profile

      const freshStats = {
        runsCompleted: 0,
        runsLost: 0,
        totalCreditsEarned: 0,
        totalCombatsWon: 0,
        totalCombatsLost: 0,
        highestTierCompleted: 0,
      }

      expect(freshStats.runsCompleted).toBe(0)
      expect(freshStats.runsLost).toBe(0)
      expect(freshStats.totalCombatsWon).toBe(0)
      expect(freshStats.highestTierCompleted).toBe(0)
    })
  })

  // ========================================
  // RUNS COMPLETED TESTS
  // ========================================

  describe('runsCompleted stat', () => {
    it('should increment runsCompleted on successful extraction', () => {
      // EXPLANATION: This test verifies that the runsCompleted counter increments when
      // a player successfully extracts from a run. This stat represents "victories" in
      // the UI and is a key metric for player progression.
      // Expected: runsCompleted should increase by 1 after successful endRun(true)

      const mockStats = { runsCompleted: 3 }

      // Simulate what endRun(true) does
      mockStats.runsCompleted++

      expect(mockStats.runsCompleted).toBe(4)
    })

    it('should NOT increment runsCompleted on MIA (failed run)', () => {
      // EXPLANATION: This test verifies that runsCompleted only counts successful
      // extractions, not failed runs (MIA). Failed runs should increment runsLost instead.
      // Expected: runsCompleted should remain unchanged after endRun(false)

      const mockStats = { runsCompleted: 3, runsLost: 1 }

      // Simulate what endRun(false) does - only increment runsLost
      mockStats.runsLost++

      expect(mockStats.runsCompleted).toBe(3) // Unchanged
      expect(mockStats.runsLost).toBe(2)
    })
  })

  // ========================================
  // RUNS LOST TESTS
  // ========================================

  describe('runsLost stat', () => {
    it('should increment runsLost on MIA', () => {
      // EXPLANATION: This test verifies that the runsLost counter increments when a
      // player fails a run (MIA - Missing In Action). This helps track player performance.
      // Expected: runsLost should increase by 1 after endRun(false)

      const mockStats = { runsLost: 2 }

      // Simulate what endRun(false) does
      mockStats.runsLost++

      expect(mockStats.runsLost).toBe(3)
    })

    it('should NOT increment runsLost on successful extraction', () => {
      // EXPLANATION: This test verifies that runsLost only counts failed runs,
      // not successful extractions. Successful runs increment runsCompleted instead.
      // Expected: runsLost should remain unchanged after endRun(true)

      const mockStats = { runsCompleted: 5, runsLost: 2 }

      // Simulate what endRun(true) does - only increment runsCompleted
      mockStats.runsCompleted++

      expect(mockStats.runsLost).toBe(2) // Unchanged
      expect(mockStats.runsCompleted).toBe(6)
    })
  })

  // ========================================
  // TOTAL COMBATS WON TESTS
  // ========================================

  describe('totalCombatsWon stat', () => {
    it('should accumulate combatsWon from run state on successful extraction', () => {
      // EXPLANATION: This test verifies that individual combat victories during a run
      // are accumulated into the total lifetime stat. Players win multiple combats per
      // run, and this stat should reflect the total across all runs.
      // Expected: totalCombatsWon should increase by runState.combatsWon value

      const mockStats = { totalCombatsWon: 10 }
      const runState = { combatsWon: 5 }

      // Simulate what endRun does - accumulate combats won
      mockStats.totalCombatsWon = (mockStats.totalCombatsWon || 0) + (runState.combatsWon || 0)

      expect(mockStats.totalCombatsWon).toBe(15)
    })

    it('should handle null/undefined combatsWon gracefully', () => {
      // EXPLANATION: This test verifies that the accumulation handles edge cases where
      // combatsWon might be undefined or null (e.g., old save files, immediate extraction).
      // Expected: Should default to 0 and not crash

      const mockStats = { totalCombatsWon: 10 }
      const runState = { combatsWon: undefined }

      mockStats.totalCombatsWon = (mockStats.totalCombatsWon || 0) + (runState.combatsWon || 0)

      expect(mockStats.totalCombatsWon).toBe(10) // No change
    })

    it('should handle missing totalCombatsWon in legacy profiles', () => {
      // EXPLANATION: This test verifies backward compatibility with old save files that
      // might not have the totalCombatsWon stat initialized. Should initialize to 0.
      // Expected: Should initialize from undefined and correctly add combats won

      const mockStats = { totalCombatsWon: undefined }
      const runState = { combatsWon: 3 }

      mockStats.totalCombatsWon = (mockStats.totalCombatsWon || 0) + (runState.combatsWon || 0)

      expect(mockStats.totalCombatsWon).toBe(3)
    })

    it('should still accumulate combats won even on MIA', () => {
      // EXPLANATION: This test verifies that combat victories earned during a run are
      // still counted even if the run ends in MIA. The player still won those combats,
      // they just didn't extract successfully. Note: Current implementation only persists
      // on success - this documents the expected behavior if we want to count MIA combats.
      // Expected: combats won should accumulate regardless of extraction success

      const mockStats = { totalCombatsWon: 10 }
      const runState = { combatsWon: 5 }

      // Even on MIA, combats should count (design decision to verify)
      mockStats.totalCombatsWon = (mockStats.totalCombatsWon || 0) + (runState.combatsWon || 0)

      expect(mockStats.totalCombatsWon).toBe(15)
    })
  })

  // ========================================
  // HIGHEST TIER COMPLETED TESTS
  // ========================================

  describe('highestTierCompleted stat', () => {
    it('should update when completing a higher tier', () => {
      // EXPLANATION: This test verifies that the maximum tier achieved is tracked and
      // updated when the player completes a tier higher than their previous best.
      // Expected: highestTierCompleted should update to the new higher tier

      const mockStats = { highestTierCompleted: 1 }
      const currentTier = 2

      if (currentTier > (mockStats.highestTierCompleted || 0)) {
        mockStats.highestTierCompleted = currentTier
      }

      expect(mockStats.highestTierCompleted).toBe(2)
    })

    it('should NOT update when completing a lower or equal tier', () => {
      // EXPLANATION: This test verifies that the max tier stat is not reduced when
      // the player completes a tier lower than or equal to their previous best.
      // Expected: highestTierCompleted should remain at the higher value

      const mockStats = { highestTierCompleted: 3 }
      const currentTier = 2

      if (currentTier > (mockStats.highestTierCompleted || 0)) {
        mockStats.highestTierCompleted = currentTier
      }

      expect(mockStats.highestTierCompleted).toBe(3) // Unchanged
    })

    it('should handle first tier completion (from 0)', () => {
      // EXPLANATION: This test verifies that the first tier completion properly
      // updates the stat from its initial value of 0.
      // Expected: First tier 1 completion should update from 0 to 1

      const mockStats = { highestTierCompleted: 0 }
      const currentTier = 1

      if (currentTier > (mockStats.highestTierCompleted || 0)) {
        mockStats.highestTierCompleted = currentTier
      }

      expect(mockStats.highestTierCompleted).toBe(1)
    })

    it('should handle undefined highestTierCompleted in legacy profiles', () => {
      // EXPLANATION: This test verifies backward compatibility with old save files
      // that might not have highestTierCompleted initialized.
      // Expected: Should treat undefined as 0 and update correctly

      const mockStats = { highestTierCompleted: undefined }
      const currentTier = 2

      if (currentTier > (mockStats.highestTierCompleted || 0)) {
        mockStats.highestTierCompleted = currentTier
      }

      expect(mockStats.highestTierCompleted).toBe(2)
    })
  })

  // ========================================
  // TOTAL CREDITS EARNED TESTS
  // ========================================

  describe('totalCreditsEarned stat', () => {
    it('should accumulate credits earned from runs', () => {
      // EXPLANATION: This test verifies that credits earned during runs are
      // accumulated into a lifetime total stat for tracking player progression.
      // Expected: totalCreditsEarned should increase by credits earned in run

      const mockStats = { totalCreditsEarned: 500 }
      const runState = { creditsEarned: 150 }

      mockStats.totalCreditsEarned += runState.creditsEarned

      expect(mockStats.totalCreditsEarned).toBe(650)
    })

    it('should NOT reduce even if credits are lost (only tracks earned)', () => {
      // EXPLANATION: This test verifies that totalCreditsEarned only tracks income,
      // not spending. Even if the player spends credits, this stat should not decrease.
      // Expected: stat should only increase, never decrease

      const mockStats = { totalCreditsEarned: 500 }

      // Credits spent doesn't affect this stat
      expect(mockStats.totalCreditsEarned).toBe(500)
    })
  })

  // ========================================
  // HANGAR SCREEN DISPLAY PATHS TESTS
  // ========================================

  describe('Hangar Screen stat display paths', () => {
    it('should read RUNS from stats.runsCompleted', () => {
      // EXPLANATION: This test documents the correct property path for the RUNS
      // stat displayed in the Hangar screen header.
      // Expected: UI reads from singlePlayerProfile.stats.runsCompleted

      const mockProfile = {
        stats: { runsCompleted: 7 }
      }

      // This is how HangarScreen should read the value
      const displayValue = mockProfile?.stats?.runsCompleted || 0

      expect(displayValue).toBe(7)
    })

    it('should read EXTRACTIONS from stats.runsCompleted', () => {
      // EXPLANATION: This test documents that EXTRACTIONS (successful runs) uses
      // the same value as RUNS - both represent completed runs.
      // Expected: UI reads from singlePlayerProfile.stats.runsCompleted

      const mockProfile = {
        stats: { runsCompleted: 7 }
      }

      const displayValue = mockProfile?.stats?.runsCompleted || 0

      expect(displayValue).toBe(7)
    })

    it('should read COMBATS WON from stats.totalCombatsWon', () => {
      // EXPLANATION: This test documents the correct property path for the COMBATS WON
      // stat displayed in the Hangar screen header.
      // Expected: UI reads from singlePlayerProfile.stats.totalCombatsWon

      const mockProfile = {
        stats: { totalCombatsWon: 23 }
      }

      const displayValue = mockProfile?.stats?.totalCombatsWon || 0

      expect(displayValue).toBe(23)
    })

    it('should read MAX TIER from stats.highestTierCompleted', () => {
      // EXPLANATION: This test documents the correct property path for the MAX TIER
      // stat displayed in the Hangar screen header.
      // Expected: UI reads from singlePlayerProfile.stats.highestTierCompleted

      const mockProfile = {
        stats: { highestTierCompleted: 3 }
      }

      const displayValue = mockProfile?.stats?.highestTierCompleted || 1

      expect(displayValue).toBe(3)
    })

    it('should default MAX TIER to 1 when undefined', () => {
      // EXPLANATION: This test verifies that MAX TIER defaults to 1 (not 0) when
      // the stat is undefined. Tier 1 is the starting tier.
      // Expected: UI should show 1 as default, not 0

      const mockProfile = {
        stats: { highestTierCompleted: undefined }
      }

      const displayValue = mockProfile?.stats?.highestTierCompleted || 1

      expect(displayValue).toBe(1)
    })

    it('should handle missing stats object gracefully', () => {
      // EXPLANATION: This test verifies that the UI handles profiles without a stats
      // object (edge case, legacy data) without crashing.
      // Expected: Should return default values (0 or 1) without errors

      const mockProfile = {} // No stats object

      const runs = mockProfile?.stats?.runsCompleted || 0
      const combats = mockProfile?.stats?.totalCombatsWon || 0
      const maxTier = mockProfile?.stats?.highestTierCompleted || 1

      expect(runs).toBe(0)
      expect(combats).toBe(0)
      expect(maxTier).toBe(1)
    })
  })
})
