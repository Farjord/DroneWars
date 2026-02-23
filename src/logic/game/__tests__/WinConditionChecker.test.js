import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ========================================
// WIN CONDITION CHECKER TESTS
// ========================================
// TDD tests for the total damage win condition model.
// Win condition: Deal damage >= DAMAGE_PERCENTAGE of opponent's total max hull.

import WinConditionChecker from '../WinConditionChecker.js';
import { WIN_CONDITION } from '../../../config/gameConfig.js';

// Helper to create a mock player state with ship sections
const createMockPlayerState = (sections) => ({
  name: 'Test Player',
  shipSections: sections
});

// Helper to create a ship section with specified hull values
const createSection = (hull, maxHull) => ({
  hull,
  maxHull,
  thresholds: { damaged: Math.floor(maxHull * 0.5), critical: 0 }
});

describe('WinConditionChecker', () => {
  describe('checkWinCondition - Total Damage Model', () => {
    it('should return false when no damage has been dealt', () => {
      // 3 sections, each with 10 hull (30 total)
      // 0 damage dealt, need 18 (60% of 30) to win
      const playerState = createMockPlayerState({
        bridge: createSection(10, 10),
        powerCell: createSection(10, 10),
        droneControlHub: createSection(10, 10)
      });

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(false);
    });

    it('should return false when damage is below threshold', () => {
      // 30 total max hull, 60% threshold = 18 damage needed
      // Only 10 damage dealt (20 current hull remaining)
      const playerState = createMockPlayerState({
        bridge: createSection(10, 10),      // 0 damage
        powerCell: createSection(5, 10),    // 5 damage
        droneControlHub: createSection(5, 10) // 5 damage
      });
      // Total: 10 damage dealt, need 18

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(false);
    });

    it('should return true when damage meets threshold exactly', () => {
      // 30 total max hull, 60% threshold = 18 damage needed
      // Exactly 18 damage dealt (12 current hull remaining)
      const playerState = createMockPlayerState({
        bridge: createSection(4, 10),       // 6 damage
        powerCell: createSection(4, 10),    // 6 damage
        droneControlHub: createSection(4, 10) // 6 damage
      });
      // Total: 18 damage dealt, need 18

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(true);
    });

    it('should return true when damage exceeds threshold', () => {
      // 30 total max hull, 60% threshold = 18 damage needed
      // 25 damage dealt (5 current hull remaining)
      const playerState = createMockPlayerState({
        bridge: createSection(2, 10),       // 8 damage
        powerCell: createSection(2, 10),    // 8 damage
        droneControlHub: createSection(1, 10) // 9 damage
      });
      // Total: 25 damage dealt, need 18

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(true);
    });

    it('should return true when two sections are destroyed', () => {
      // 30 total max hull, 60% threshold = 18 damage needed
      // Two sections at 0 hull = 20 damage dealt
      const playerState = createMockPlayerState({
        bridge: createSection(0, 10),       // 10 damage (destroyed)
        powerCell: createSection(0, 10),    // 10 damage (destroyed)
        droneControlHub: createSection(10, 10) // 0 damage (healthy)
      });
      // Total: 20 damage dealt, need 18

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(true);
    });

    it('should return false when only one section is destroyed', () => {
      // 30 total max hull, 60% threshold = 18 damage needed
      // One section at 0 hull = 10 damage dealt
      const playerState = createMockPlayerState({
        bridge: createSection(0, 10),       // 10 damage (destroyed)
        powerCell: createSection(10, 10),   // 0 damage
        droneControlHub: createSection(10, 10) // 0 damage
      });
      // Total: 10 damage dealt, need 18

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(false);
    });

    it('should handle different ship configurations (higher hull)', () => {
      // Heavy ship: 3 sections × 15 hull = 45 total
      // 60% threshold = 27 damage needed
      const playerState = createMockPlayerState({
        bridge: createSection(10, 15),      // 5 damage
        powerCell: createSection(5, 15),    // 10 damage
        droneControlHub: createSection(3, 15) // 12 damage
      });
      // Total: 27 damage dealt, need 27

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(true);
    });

    it('should handle different ship configurations (lower hull)', () => {
      // Light ship: 3 sections × 5 hull = 15 total
      // 60% threshold = 9 damage needed
      const playerState = createMockPlayerState({
        bridge: createSection(3, 5),        // 2 damage
        powerCell: createSection(3, 5),     // 2 damage
        droneControlHub: createSection(1, 5) // 4 damage
      });
      // Total: 8 damage dealt, need 9

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(false);
    });

    it('should handle asymmetric section hull values', () => {
      // Different hull per section: 8 + 12 + 10 = 30 total
      // 60% threshold = 18 damage needed
      const playerState = createMockPlayerState({
        bridge: createSection(2, 8),        // 6 damage
        powerCell: createSection(6, 12),    // 6 damage
        droneControlHub: createSection(4, 10) // 6 damage
      });
      // Total: 18 damage dealt, need 18

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(true);
    });

    it('should return false for null player state', () => {
      expect(WinConditionChecker.checkWinCondition(null)).toBe(false);
    });

    it('should return false for missing shipSections', () => {
      expect(WinConditionChecker.checkWinCondition({ name: 'Test' })).toBe(false);
    });

    it('should return false for empty shipSections', () => {
      expect(WinConditionChecker.checkWinCondition({ shipSections: {} })).toBe(false);
    });
  });

  describe('checkWinCondition - Healing Interaction', () => {
    it('should not trigger win when healing restores hull above threshold', () => {
      // Scenario: Player dealt 20 damage, but opponent healed 5
      // Effective damage: 15, threshold: 18
      // 30 total max hull, current hull is 15 (15 damage dealt)
      const playerState = createMockPlayerState({
        bridge: createSection(5, 10),       // 5 damage
        powerCell: createSection(5, 10),    // 5 damage
        droneControlHub: createSection(5, 10) // 5 damage
      });
      // Total: 15 damage dealt, need 18

      expect(WinConditionChecker.checkWinCondition(playerState)).toBe(false);
    });
  });

  describe('calculateHullIntegrity', () => {
    it('should calculate hull integrity values correctly', () => {
      const playerState = createMockPlayerState({
        bridge: createSection(8, 10),
        powerCell: createSection(7, 10),
        droneControlHub: createSection(9, 10)
      });
      // Total max: 30, current: 24, damage: 6
      // Threshold: 18 (60% of 30)
      // Remaining to win: 18 - 6 = 12

      const result = WinConditionChecker.calculateHullIntegrity(playerState);

      expect(result.totalMaxHull).toBe(30);
      expect(result.totalCurrentHull).toBe(24);
      expect(result.totalDamageDealt).toBe(6);
      expect(result.damageThreshold).toBe(18);
      expect(result.remainingToWin).toBe(12);
    });

    it('should return zeros for invalid player state', () => {
      const result = WinConditionChecker.calculateHullIntegrity(null);

      expect(result.totalMaxHull).toBe(0);
      expect(result.totalCurrentHull).toBe(0);
      expect(result.totalDamageDealt).toBe(0);
      expect(result.damageThreshold).toBe(0);
      expect(result.remainingToWin).toBe(0);
    });

    it('should handle when damage exceeds threshold (remainingToWin = 0)', () => {
      const playerState = createMockPlayerState({
        bridge: createSection(2, 10),
        powerCell: createSection(2, 10),
        droneControlHub: createSection(2, 10)
      });
      // Total max: 30, current: 6, damage: 24
      // Threshold: 18, remaining: 0 (can't be negative)

      const result = WinConditionChecker.calculateHullIntegrity(playerState);

      expect(result.totalDamageDealt).toBe(24);
      expect(result.remainingToWin).toBe(0);
    });
  });

  describe('checkGameStateForWinner', () => {
    let mockCallbacks;

    beforeEach(() => {
      mockCallbacks = {
        logCallback: vi.fn(),
        setWinnerCallback: vi.fn(),
        showWinnerModalCallback: vi.fn()
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return player1 as winner when player2 meets loss condition', () => {
      const playerStates = {
        player1: createMockPlayerState({
          bridge: createSection(10, 10),
          powerCell: createSection(10, 10),
          droneControlHub: createSection(10, 10)
        }),
        player2: createMockPlayerState({
          bridge: createSection(4, 10),
          powerCell: createSection(4, 10),
          droneControlHub: createSection(4, 10)
        })
      };

      const result = WinConditionChecker.checkGameStateForWinner(playerStates, mockCallbacks);

      expect(result).toBe('player1');
      expect(mockCallbacks.setWinnerCallback).toHaveBeenCalledWith('player1');
      expect(mockCallbacks.showWinnerModalCallback).toHaveBeenCalledWith(true);
    });

    it('should return player2 as winner when player1 meets loss condition', () => {
      const playerStates = {
        player1: createMockPlayerState({
          bridge: createSection(4, 10),
          powerCell: createSection(4, 10),
          droneControlHub: createSection(4, 10)
        }),
        player2: createMockPlayerState({
          bridge: createSection(10, 10),
          powerCell: createSection(10, 10),
          droneControlHub: createSection(10, 10)
        })
      };

      const result = WinConditionChecker.checkGameStateForWinner(playerStates, mockCallbacks);

      expect(result).toBe('player2');
      expect(mockCallbacks.setWinnerCallback).toHaveBeenCalledWith('player2');
    });

    it('should return null when no winner yet', () => {
      const playerStates = {
        player1: createMockPlayerState({
          bridge: createSection(10, 10),
          powerCell: createSection(10, 10),
          droneControlHub: createSection(10, 10)
        }),
        player2: createMockPlayerState({
          bridge: createSection(10, 10),
          powerCell: createSection(10, 10),
          droneControlHub: createSection(10, 10)
        })
      };

      const result = WinConditionChecker.checkGameStateForWinner(playerStates, mockCallbacks);

      expect(result).toBe(null);
      expect(mockCallbacks.setWinnerCallback).not.toHaveBeenCalled();
    });
  });
});
