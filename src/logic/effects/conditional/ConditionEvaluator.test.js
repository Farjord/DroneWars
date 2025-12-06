// ========================================
// CONDITION EVALUATOR TESTS
// ========================================
// TDD: Tests written first for ConditionEvaluator
// Tests all condition types for the modular conditional effects system

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionEvaluator from './ConditionEvaluator.js';

describe('ConditionEvaluator', () => {
  let evaluator;
  let mockTarget;
  let mockContext;
  let mockEffectResult;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();

    // Standard mock target drone
    mockTarget = {
      id: 'drone_123',
      name: 'TestDrone',
      hull: 3,
      currentShields: 2,
      isExhausted: false,
      isMarked: false,
      attack: 2,
      speed: 4
    };

    // Standard mock context
    mockContext = {
      target: mockTarget,
      actingPlayerId: 'player1',
      playerStates: {
        player1: {
          dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
          shipSections: {}
        },
        player2: {
          dronesOnBoard: { lane1: [mockTarget], lane2: [], lane3: [] },
          shipSections: {}
        }
      },
      placedSections: {
        player1: ['bridge'],
        player2: ['bridge']
      }
    };

    // Standard mock effect result for POST conditions
    mockEffectResult = {
      wasDestroyed: false,
      damageDealt: { shield: 0, hull: 0 },
      targetId: 'drone_123'
    };
  });

  // ========================================
  // TARGET_IS_MARKED CONDITION
  // ========================================
  describe('TARGET_IS_MARKED', () => {
    it('returns true when target.isMarked is true', () => {
      mockTarget.isMarked = true;
      const condition = { type: 'TARGET_IS_MARKED' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when target.isMarked is false', () => {
      mockTarget.isMarked = false;
      const condition = { type: 'TARGET_IS_MARKED' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns false when target.isMarked is undefined', () => {
      delete mockTarget.isMarked;
      const condition = { type: 'TARGET_IS_MARKED' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });
  });

  // ========================================
  // TARGET_IS_EXHAUSTED CONDITION
  // ========================================
  describe('TARGET_IS_EXHAUSTED', () => {
    it('returns true when target.isExhausted is true', () => {
      mockTarget.isExhausted = true;
      const condition = { type: 'TARGET_IS_EXHAUSTED' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when target.isExhausted is false', () => {
      mockTarget.isExhausted = false;
      const condition = { type: 'TARGET_IS_EXHAUSTED' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });
  });

  // ========================================
  // TARGET_IS_READY CONDITION
  // ========================================
  describe('TARGET_IS_READY', () => {
    it('returns true when target.isExhausted is false', () => {
      mockTarget.isExhausted = false;
      const condition = { type: 'TARGET_IS_READY' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when target.isExhausted is true', () => {
      mockTarget.isExhausted = true;
      const condition = { type: 'TARGET_IS_READY' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns true when target.isExhausted is undefined (defaults to ready)', () => {
      delete mockTarget.isExhausted;
      const condition = { type: 'TARGET_IS_READY' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });
  });

  // ========================================
  // TARGET_STAT_GTE CONDITION (>=)
  // ========================================
  describe('TARGET_STAT_GTE', () => {
    it('returns true when target hull >= threshold', () => {
      mockTarget.hull = 5;
      const condition = { type: 'TARGET_STAT_GTE', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns true when target hull equals threshold exactly', () => {
      mockTarget.hull = 3;
      const condition = { type: 'TARGET_STAT_GTE', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when target hull < threshold', () => {
      mockTarget.hull = 2;
      const condition = { type: 'TARGET_STAT_GTE', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('works with speed stat', () => {
      mockTarget.speed = 6;
      const condition = { type: 'TARGET_STAT_GTE', stat: 'speed', value: 5 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('works with attack stat', () => {
      mockTarget.attack = 4;
      const condition = { type: 'TARGET_STAT_GTE', stat: 'attack', value: 5 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('works with currentShields stat', () => {
      mockTarget.currentShields = 3;
      const condition = { type: 'TARGET_STAT_GTE', stat: 'currentShields', value: 2 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });
  });

  // ========================================
  // TARGET_STAT_LTE CONDITION (<=)
  // ========================================
  describe('TARGET_STAT_LTE', () => {
    it('returns true when target hull <= threshold', () => {
      mockTarget.hull = 2;
      const condition = { type: 'TARGET_STAT_LTE', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns true when target hull equals threshold exactly', () => {
      mockTarget.hull = 3;
      const condition = { type: 'TARGET_STAT_LTE', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when target hull > threshold', () => {
      mockTarget.hull = 5;
      const condition = { type: 'TARGET_STAT_LTE', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('works with speed stat for slow drone check', () => {
      mockTarget.speed = 2;
      const condition = { type: 'TARGET_STAT_LTE', stat: 'speed', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });
  });

  // ========================================
  // TARGET_STAT_GT CONDITION (>)
  // ========================================
  describe('TARGET_STAT_GT', () => {
    it('returns true when target stat > threshold', () => {
      mockTarget.hull = 5;
      const condition = { type: 'TARGET_STAT_GT', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when target stat equals threshold', () => {
      mockTarget.hull = 3;
      const condition = { type: 'TARGET_STAT_GT', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns false when target stat < threshold', () => {
      mockTarget.hull = 2;
      const condition = { type: 'TARGET_STAT_GT', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });
  });

  // ========================================
  // TARGET_STAT_LT CONDITION (<)
  // ========================================
  describe('TARGET_STAT_LT', () => {
    it('returns true when target stat < threshold', () => {
      mockTarget.hull = 1;
      const condition = { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when target stat equals threshold', () => {
      mockTarget.hull = 2;
      const condition = { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns false when target stat > threshold', () => {
      mockTarget.hull = 5;
      const condition = { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('can check for near-death drones (hull < 2)', () => {
      mockTarget.hull = 1;
      const condition = { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });
  });

  // ========================================
  // ON_DESTROY CONDITION (POST timing)
  // ========================================
  describe('ON_DESTROY', () => {
    it('returns true when effectResult.wasDestroyed is true', () => {
      mockEffectResult.wasDestroyed = true;
      mockContext.effectResult = mockEffectResult;
      const condition = { type: 'ON_DESTROY' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when effectResult.wasDestroyed is false', () => {
      mockEffectResult.wasDestroyed = false;
      mockContext.effectResult = mockEffectResult;
      const condition = { type: 'ON_DESTROY' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns false when effectResult is undefined', () => {
      mockContext.effectResult = undefined;
      const condition = { type: 'ON_DESTROY' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns false when effectResult.wasDestroyed is undefined', () => {
      mockContext.effectResult = {};
      const condition = { type: 'ON_DESTROY' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });
  });

  // ========================================
  // ON_DAMAGE CONDITION (POST timing)
  // ========================================
  describe('ON_DAMAGE', () => {
    it('returns true when total damage > 0 (hull only)', () => {
      mockEffectResult.damageDealt = { shield: 0, hull: 3 };
      mockContext.effectResult = mockEffectResult;
      const condition = { type: 'ON_DAMAGE' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns true when total damage > 0 (shield only)', () => {
      mockEffectResult.damageDealt = { shield: 2, hull: 0 };
      mockContext.effectResult = mockEffectResult;
      const condition = { type: 'ON_DAMAGE' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns true when total damage > 0 (both shield and hull)', () => {
      mockEffectResult.damageDealt = { shield: 2, hull: 3 };
      mockContext.effectResult = mockEffectResult;
      const condition = { type: 'ON_DAMAGE' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('returns false when no damage dealt', () => {
      mockEffectResult.damageDealt = { shield: 0, hull: 0 };
      mockContext.effectResult = mockEffectResult;
      const condition = { type: 'ON_DAMAGE' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns false when effectResult is undefined', () => {
      mockContext.effectResult = undefined;
      const condition = { type: 'ON_DAMAGE' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns false when damageDealt is undefined', () => {
      mockContext.effectResult = {};
      const condition = { type: 'ON_DAMAGE' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });
  });

  // ========================================
  // UNKNOWN CONDITION HANDLING
  // ========================================
  describe('unknown condition', () => {
    it('returns false for unknown condition type', () => {
      const condition = { type: 'INVALID_CONDITION' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('returns false for null condition', () => {
      const result = evaluator.evaluate(null, mockContext);

      expect(result).toBe(false);
    });

    it('returns false for undefined condition', () => {
      const result = evaluator.evaluate(undefined, mockContext);

      expect(result).toBe(false);
    });

    it('returns false for condition without type', () => {
      const condition = { stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });
  });

  // ========================================
  // EFFECTIVE STATS (attack/speed with modifiers)
  // ========================================
  describe('TARGET_STAT with effective stats', () => {
    beforeEach(() => {
      // Use a real drone name that exists in fullDroneCollection
      // Standard Fighter: attack: 3, speed: 4, hull: 2, shields: 1
      mockTarget.owner = 'player2';
      mockTarget.lane = 'lane1';
      mockTarget.name = 'Standard Fighter';
      mockTarget.attack = 3;
      mockTarget.speed = 4;

      // Add appliedUpgrades to player states (required by calculateEffectiveStats)
      mockContext.playerStates.player1.appliedUpgrades = {};
      mockContext.playerStates.player2.appliedUpgrades = {};
    });

    it('uses effective attack (with buffs) for TARGET_STAT_GTE', () => {
      // Standard Fighter base attack 3, but +1 stat mod = effective 4
      mockTarget.statMods = [{ stat: 'attack', value: 1 }];

      // Condition: attack >= 4 should be TRUE (effective = 4)
      const condition = { type: 'TARGET_STAT_GTE', stat: 'attack', value: 4 };
      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('uses effective attack (with multiple buffs) for TARGET_STAT_GTE', () => {
      // Standard Fighter base attack 3, but +1 and +2 stat mods = effective 6
      mockTarget.statMods = [
        { stat: 'attack', value: 1 },
        { stat: 'attack', value: 2 }
      ];

      // Condition: attack >= 6 should be TRUE
      const condition = { type: 'TARGET_STAT_GTE', stat: 'attack', value: 6 };
      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('uses effective speed (with debuffs) for TARGET_STAT_LTE', () => {
      // Standard Fighter base speed 4, but -2 stat mod = effective 2
      mockTarget.statMods = [{ stat: 'speed', value: -2 }];

      // Condition: speed <= 2 should be TRUE (effective = 2)
      const condition = { type: 'TARGET_STAT_LTE', stat: 'speed', value: 2 };
      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('fails attack check when buff makes it too high', () => {
      // Standard Fighter base attack 3, but +2 stat mod = effective 5
      mockTarget.statMods = [{ stat: 'attack', value: 2 }];

      // Condition: attack <= 4 should be FALSE (effective = 5)
      const condition = { type: 'TARGET_STAT_LTE', stat: 'attack', value: 4 };
      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('still uses current hull (not effective) for hull checks', () => {
      // Hull should continue using the current value from damage, not base
      mockTarget.hull = 2; // Current hull after taking damage

      const condition = { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 };
      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('falls back to base stat when context lacks required fields', () => {
      // Remove playerStates from context
      const incompleteContext = {
        target: mockTarget
        // Missing playerStates, placedSections
      };
      mockTarget.attack = 2;
      mockTarget.statMods = [{ stat: 'attack', value: 3 }]; // Would be 5 effective

      // Should fall back to base attack of 2
      const condition = { type: 'TARGET_STAT_GTE', stat: 'attack', value: 3 };
      const result = evaluator.evaluate(condition, incompleteContext);

      expect(result).toBe(false); // 2 >= 3 is false
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('edge cases', () => {
    it('handles missing target gracefully', () => {
      mockContext.target = null;
      const condition = { type: 'TARGET_IS_MARKED' };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('handles stat comparison with missing stat on target', () => {
      delete mockTarget.hull;
      const condition = { type: 'TARGET_STAT_GTE', stat: 'hull', value: 3 };

      const result = evaluator.evaluate(condition, mockContext);

      // Missing stat should be treated as 0
      expect(result).toBe(false);
    });

    it('handles stat comparison with zero threshold', () => {
      mockTarget.hull = 0;
      const condition = { type: 'TARGET_STAT_GTE', stat: 'hull', value: 0 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });

    it('handles negative stat values', () => {
      mockTarget.hull = -1; // Shouldn't happen but test defensively
      const condition = { type: 'TARGET_STAT_LT', stat: 'hull', value: 0 };

      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });
  });

  // ========================================
  // EXTENSIBILITY (registerHandler)
  // ========================================
  describe('registerHandler', () => {
    it('allows registering custom condition handlers', () => {
      const customHandler = vi.fn(() => true);
      evaluator.registerHandler('CUSTOM_CONDITION', customHandler);

      const condition = { type: 'CUSTOM_CONDITION', customValue: 42 };
      const result = evaluator.evaluate(condition, mockContext);

      expect(customHandler).toHaveBeenCalledWith(condition, mockContext);
      expect(result).toBe(true);
    });

    it('custom handler can return false', () => {
      const customHandler = vi.fn(() => false);
      evaluator.registerHandler('CUSTOM_CONDITION', customHandler);

      const condition = { type: 'CUSTOM_CONDITION' };
      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(false);
    });

    it('custom handler receives full context', () => {
      const customHandler = vi.fn((condition, context) => {
        return context.target.isMarked && condition.extraParam === 'test';
      });
      evaluator.registerHandler('CUSTOM_WITH_PARAMS', customHandler);

      mockTarget.isMarked = true;
      const condition = { type: 'CUSTOM_WITH_PARAMS', extraParam: 'test' };
      const result = evaluator.evaluate(condition, mockContext);

      expect(result).toBe(true);
    });
  });
});
