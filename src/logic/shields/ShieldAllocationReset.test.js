import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// SHIELD ALLOCATION RESET TESTS
// ========================================
// Tests for reset button behavior during shield allocation and reallocation
// TDD: These tests define expected behavior - they should FAIL initially
// until the implementation is fixed.

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Import the actual utility module being tested
import {
  calculateRoundStartReset,
  calculateReallocationRemovalReset,
  calculateReallocationAddingReset,
  calculateReallocationDisplayShields
} from './ShieldResetUtils.js';

describe('Shield Allocation Reset Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Round Start Allocation Reset', () => {
    /**
     * When reset is pressed during allocateShields phase,
     * shields should restore to what they were at the START of the phase,
     * NOT to empty (0 on all sections).
     */
    it('should restore shields to initial snapshot on reset, not empty', () => {
      // ARRANGE: Player enters allocateShields phase with existing shields
      const initialSnapshot = { bridge: 2, powerCell: 1, droneControlHub: 0 };
      const shieldsToAllocate = 5;

      // ACT: Player presses reset
      const result = calculateRoundStartReset(initialSnapshot, shieldsToAllocate);

      // ASSERT: Should restore to initial snapshot, NOT empty
      expect(result.newPending).toEqual(initialSnapshot);
      expect(result.newPending).not.toEqual({});
    });

    it('should reset remaining shields to full allocation amount', () => {
      // shieldsToAllocate = NEW shields this round (not a total budget)
      // initialSnapshot = existing shields from game state (irrelevant to new allocation)
      const shieldsToAllocate = 5;
      const initialSnapshot = { bridge: 2, powerCell: 1 }; // Existing shields from previous rounds

      // ACT: Player resets
      const result = calculateRoundStartReset(initialSnapshot, shieldsToAllocate);

      // Reset should restore full new allocation, not subtract existing shields
      expect(result.newRemaining).toBe(5);
    });

    it('should handle reset when initial snapshot has no shields', () => {
      // ARRANGE: New round with no initial shields
      const initialSnapshot = {};
      const shieldsToAllocate = 5;

      // ACT
      const result = calculateRoundStartReset(initialSnapshot, shieldsToAllocate);

      // ASSERT: Should reset to empty (which is correct for new allocation)
      expect(result.newPending).toEqual({});
      expect(result.newRemaining).toBe(5);
    });

    // BUG FIX TEST: This test captures the exact bug where reset goes negative
    it('should not go negative when existing shields exceed shieldsToAllocate', () => {
      // BUG SCENARIO: Player has 5 shields from previous rounds, gets 2 new this round
      const initialSnapshot = { bridge: 3, powerCell: 2 }; // 5 existing shields
      const shieldsToAllocate = 2; // Only 2 NEW shields this round

      const result = calculateRoundStartReset(initialSnapshot, shieldsToAllocate);

      // Should return 2 (full new allocation), NOT -3 (2 - 5)
      expect(result.newRemaining).toBe(2);
      expect(result.newRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reallocation Reset - Removal Phase', () => {
    /**
     * During removal phase, reset should clear pending changes.
     * Since game state was never modified, this shows original shields.
     */
    it('should clear pending changes on reset during removal phase', () => {
      // ARRANGE: Player has made some removal changes
      const maxShieldsToRemove = 2;

      // ACT: Player presses reset
      const result = calculateReallocationRemovalReset(maxShieldsToRemove);

      // ASSERT: Pending changes should be cleared
      expect(result.newPendingChanges).toEqual({});
    });

    it('should restore shields-to-remove counter after reset', () => {
      // ARRANGE
      const maxShieldsToRemove = 2;

      // ACT
      const result = calculateReallocationRemovalReset(maxShieldsToRemove);

      // ASSERT: Counter should be restored to max
      expect(result.shieldsToRemove).toBe(2);
      expect(result.shieldsToAdd).toBe(0);
    });
  });

  describe('Reallocation Reset - Adding Phase', () => {
    /**
     * During adding phase, reset should restore to post-removal state,
     * NOT to original game state or empty.
     */
    it('should restore to post-removal state after reset during adding phase', () => {
      // ARRANGE: Player removed 1 shield from bridge (captured in postRemovalChanges)
      const postRemovalChanges = { bridge: -1 };

      // ACT: Player resets during adding phase
      const result = calculateReallocationAddingReset(postRemovalChanges);

      // ASSERT: Should restore to postRemovalChanges, not empty or original
      expect(result.newPendingChanges).toEqual(postRemovalChanges);
      expect(result.newPendingChanges).not.toEqual({});
    });

    it('should restore shields-to-add counter correctly after reset', () => {
      // ARRANGE: Player removed 2 shields
      const postRemovalChanges = { bridge: -2 };

      // ACT
      const result = calculateReallocationAddingReset(postRemovalChanges);

      // ASSERT: shieldsToAdd should be 2 (the amount removed)
      expect(result.shieldsToAdd).toBe(2);
    });
  });

  describe('Shield Display During Reallocation', () => {
    /**
     * Display should apply pending deltas to game state value.
     */
    it('should apply pending shield changes (deltas) to display during reallocation', () => {
      // ARRANGE: Game state has 2 shields on bridge
      const gameStateShields = 2;
      const pendingChanges = { bridge: -1 }; // Removed 1

      // ACT: Calculate display value
      const displayValue = calculateReallocationDisplayShields(gameStateShields, pendingChanges, 'bridge');

      // ASSERT: Display should show 1 shield (2 - 1)
      expect(displayValue).toBe(1);
    });

    it('should show original shields when pendingShieldChanges is empty', () => {
      // ARRANGE: Game state has 2 shields on bridge
      const gameStateShields = 2;
      const pendingChanges = {}; // No changes yet

      // ACT
      const displayValue = calculateReallocationDisplayShields(gameStateShields, pendingChanges, 'bridge');

      // ASSERT: Display should show original 2 shields
      expect(displayValue).toBe(2);
    });

    it('should correctly handle additions during adding phase', () => {
      // ARRANGE: Game state has 2 shields, pending has -1 removal + 1 addition to different section
      const bridgeGameState = 2;
      const powerCellGameState = 0;
      const pendingChanges = { bridge: -1, powerCell: 1 };

      // ACT
      const bridgeDisplay = calculateReallocationDisplayShields(bridgeGameState, pendingChanges, 'bridge');
      const powerCellDisplay = calculateReallocationDisplayShields(powerCellGameState, pendingChanges, 'powerCell');

      // ASSERT
      expect(bridgeDisplay).toBe(1); // 2 - 1
      expect(powerCellDisplay).toBe(1); // 0 + 1
    });
  });
});
