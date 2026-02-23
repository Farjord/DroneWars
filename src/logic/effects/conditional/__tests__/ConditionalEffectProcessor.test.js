// ========================================
// CONDITIONAL EFFECT PROCESSOR TESTS
// ========================================
// TDD: Tests written first for ConditionalEffectProcessor
// Tests PRE and POST timing conditional effect processing

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionalEffectProcessor from '../ConditionalEffectProcessor.js';

describe('ConditionalEffectProcessor', () => {
  let processor;
  let mockTarget;
  let mockContext;
  let mockPlayerStates;

  beforeEach(() => {
    processor = new ConditionalEffectProcessor();

    // Standard mock target drone
    mockTarget = {
      id: 'drone_123',
      name: 'TestDrone',
      hull: 3,
      currentShields: 2,
      isExhausted: false,
      isMarked: false,
      attack: 2,
      speed: 4,
      owner: 'player2',
      lane: 'lane1'
    };

    // Standard mock player states
    mockPlayerStates = {
      player1: {
        energy: 10,
        hand: [{ id: 'card1' }, { id: 'card2' }],
        deck: [{ id: 'card3' }, { id: 'card4' }],
        discard: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      },
      player2: {
        energy: 10,
        hand: [],
        deck: [],
        discard: [],
        dronesOnBoard: { lane1: [mockTarget], lane2: [], lane3: [] },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      }
    };

    // Standard mock context
    mockContext = {
      target: mockTarget,
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      placedSections: {
        player1: ['bridge'],
        player2: ['bridge']
      },
      callbacks: { logCallback: vi.fn() },
      card: { id: 'CARD_TEST', name: 'Test Card' }
    };
  });

  // ========================================
  // PROCESS PRE CONDITIONALS
  // ========================================
  describe('processPreConditionals', () => {
    it('returns unmodified effect when no conditionalEffects provided', () => {
      const primaryEffect = { type: 'DAMAGE', value: 2 };

      const result = processor.processPreConditionals([], primaryEffect, mockContext);

      expect(result.modifiedEffect).toEqual(primaryEffect);
      expect(result.newPlayerStates).toEqual(mockPlayerStates);
      expect(result.animationEvents).toEqual([]);
      expect(result.additionalEffects).toEqual([]);
    });

    it('returns unmodified effect when only POST conditionals exist', () => {
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'post-only',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'DRAW', value: 1 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect).toEqual(primaryEffect);
    });

    it('returns unmodified effect when PRE condition is not met', () => {
      mockTarget.isMarked = false;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'marked-bonus',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect).toEqual({ type: 'DAMAGE', value: 2 });
    });

    it('applies BONUS_DAMAGE when PRE condition is met', () => {
      mockTarget.isMarked = true;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'marked-bonus',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect.value).toBe(4); // 2 + 2
    });

    it('accumulates multiple BONUS_DAMAGE from different conditions', () => {
      mockTarget.isMarked = true;
      mockTarget.isExhausted = true;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [
        {
          id: 'marked-bonus',
          timing: 'PRE',
          condition: { type: 'TARGET_IS_MARKED' },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
        },
        {
          id: 'exhausted-bonus',
          timing: 'PRE',
          condition: { type: 'TARGET_IS_EXHAUSTED' },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 1 }
        }
      ];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect.value).toBe(5); // 2 + 2 + 1
    });

    it('processes multiple PRE conditionals in order', () => {
      mockTarget.isMarked = true;
      mockTarget.hull = 1;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [
        {
          id: 'first-bonus',
          timing: 'PRE',
          condition: { type: 'TARGET_IS_MARKED' },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 1 }
        },
        {
          id: 'second-bonus',
          timing: 'PRE',
          condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
          grantedEffect: { type: 'BONUS_DAMAGE', value: 3 }
        }
      ];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      // Both conditions met, both bonuses applied
      expect(result.modifiedEffect.value).toBe(6); // 2 + 1 + 3
    });

    it('does NOT apply BONUS_DAMAGE when condition not met', () => {
      mockTarget.isMarked = false; // Condition not met
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'marked-bonus',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 5 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect.value).toBe(2); // Unchanged
    });

    it('does NOT generate animation for unmet PRE conditions', () => {
      mockTarget.isMarked = false;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'conditional-destroy',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.animationEvents).toEqual([]);
    });

    it('handles null primaryEffect gracefully', () => {
      const primaryEffect = null;
      const conditionalEffects = [{
        id: 'bonus',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect).toBeNull();
    });

    it('handles PRE conditional with stat threshold check', () => {
      mockTarget.hull = 2;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'execute-low-hull',
        timing: 'PRE',
        condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 3 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect.value).toBe(5); // 2 + 3
    });

    it('skips PRE conditional when stat threshold not met', () => {
      mockTarget.hull = 5;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'execute-low-hull',
        timing: 'PRE',
        condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 3 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect.value).toBe(2); // Unchanged
    });
  });

  // ========================================
  // PROCESS PRE CONDITIONALS - DESTROY EFFECT
  // ========================================
  describe('processPreConditionals - DESTROY effect', () => {
    it('executes DESTROY when PRE condition met', () => {
      mockTarget.hull = 1;
      const primaryEffect = null; // Card with no primary effect
      const conditionalEffects = [{
        id: 'execute-weak',
        timing: 'PRE',
        condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
        grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      // The DESTROY effect should be queued as additional effect
      expect(result.additionalEffects).toContainEqual(
        expect.objectContaining({ type: 'DESTROY' })
      );
    });

    it('does NOT execute DESTROY when PRE condition not met', () => {
      mockTarget.hull = 5;
      const primaryEffect = null;
      const conditionalEffects = [{
        id: 'execute-weak',
        timing: 'PRE',
        condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
        grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.additionalEffects).toEqual([]);
    });
  });

  // ========================================
  // PROCESS PRE CONDITIONALS - OTHER GRANTED EFFECTS
  // ========================================
  describe('processPreConditionals - other granted effects', () => {
    it('queues DRAW effect when PRE condition met', () => {
      mockTarget.isMarked = true;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'draw-on-marked',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'DRAW', value: 1 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.additionalEffects).toContainEqual(
        expect.objectContaining({ type: 'DRAW', value: 1 })
      );
    });

    it('queues GAIN_ENERGY effect when PRE condition met', () => {
      mockTarget.isExhausted = true;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'energy-on-exhausted',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_EXHAUSTED' },
        grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.additionalEffects).toContainEqual(
        expect.objectContaining({ type: 'GAIN_ENERGY', value: 2 })
      );
    });
  });

  // ========================================
  // PROCESS POST CONDITIONALS
  // ========================================
  describe('processPostConditionals', () => {
    let mockEffectResult;

    beforeEach(() => {
      // Standard mock effect result for POST timing
      mockEffectResult = {
        wasDestroyed: false,
        damageDealt: { shield: 0, hull: 0 },
        targetId: 'drone_123'
      };
    });

    it('returns empty result when no conditionalEffects provided', () => {
      const result = processor.processPostConditionals([], mockContext, mockEffectResult);

      expect(result.newPlayerStates).toEqual(mockPlayerStates);
      expect(result.animationEvents).toEqual([]);
      expect(result.additionalEffects).toEqual([]);
      expect(result.grantsGoAgain).toBe(false);
    });

    it('returns empty result when only PRE conditionals exist', () => {
      const conditionalEffects = [{
        id: 'pre-only',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      expect(result.additionalEffects).toEqual([]);
      expect(result.grantsGoAgain).toBe(false);
    });

    it('returns empty result when POST condition NOT met', () => {
      mockEffectResult.wasDestroyed = false;
      const conditionalEffects = [{
        id: 'draw-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'DRAW', value: 1 }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      expect(result.additionalEffects).toEqual([]);
    });

    it('queues DRAW effect when ON_DESTROY condition met', () => {
      mockEffectResult.wasDestroyed = true;
      const conditionalEffects = [{
        id: 'draw-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'DRAW', value: 1 }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      expect(result.additionalEffects).toContainEqual(
        expect.objectContaining({ type: 'DRAW', value: 1 })
      );
    });

    it('queues GAIN_ENERGY effect when ON_HULL_DAMAGE condition met', () => {
      // Hull damage dealt, so ON_HULL_DAMAGE triggers
      mockEffectResult.damageDealt = { shield: 2, hull: 1 };
      const conditionalEffects = [{
        id: 'energy-on-hull-damage',
        timing: 'POST',
        condition: { type: 'ON_HULL_DAMAGE' },
        grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      expect(result.additionalEffects).toContainEqual(
        expect.objectContaining({ type: 'GAIN_ENERGY', value: 2 })
      );
    });

    it('sets grantsGoAgain = true when GO_AGAIN granted and condition met', () => {
      mockEffectResult.wasDestroyed = true;
      const conditionalEffects = [{
        id: 'goagain-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'GO_AGAIN' }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      expect(result.grantsGoAgain).toBe(true);
    });

    it('does NOT set grantsGoAgain when GO_AGAIN condition not met', () => {
      mockEffectResult.wasDestroyed = false;
      const conditionalEffects = [{
        id: 'goagain-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'GO_AGAIN' }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      expect(result.grantsGoAgain).toBe(false);
    });

    it('processes multiple POST conditionals', () => {
      mockEffectResult.wasDestroyed = true;
      mockEffectResult.damageDealt = { shield: 2, hull: 3 };
      const conditionalEffects = [
        {
          id: 'draw-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        },
        {
          id: 'energy-on-hull-damage',
          timing: 'POST',
          condition: { type: 'ON_HULL_DAMAGE' },
          grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
        },
        {
          id: 'goagain-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'GO_AGAIN' }
        }
      ];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      // All conditions met (hull: 3 > 0, wasDestroyed: true), all effects granted
      expect(result.additionalEffects).toContainEqual(
        expect.objectContaining({ type: 'DRAW', value: 1 })
      );
      expect(result.additionalEffects).toContainEqual(
        expect.objectContaining({ type: 'GAIN_ENERGY', value: 2 })
      );
      expect(result.grantsGoAgain).toBe(true);
    });

    it('does NOT trigger ON_HULL_DAMAGE when only shield damage dealt', () => {
      // Key test: shield-only damage should NOT trigger ON_HULL_DAMAGE
      mockEffectResult.wasDestroyed = false;
      mockEffectResult.damageDealt = { shield: 1, hull: 0 };
      const conditionalEffects = [
        {
          id: 'draw-on-destroy',
          timing: 'POST',
          condition: { type: 'ON_DESTROY' },
          grantedEffect: { type: 'DRAW', value: 1 }
        },
        {
          id: 'energy-on-hull-damage',
          timing: 'POST',
          condition: { type: 'ON_HULL_DAMAGE' },
          grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
        }
      ];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      // Neither condition met: not destroyed, and no hull damage (only shield damage)
      expect(result.additionalEffects).not.toContainEqual(
        expect.objectContaining({ type: 'DRAW' })
      );
      expect(result.additionalEffects).not.toContainEqual(
        expect.objectContaining({ type: 'GAIN_ENERGY' })
      );
    });

    it('handles undefined conditionalEffects', () => {
      const result = processor.processPostConditionals(undefined, mockContext, mockEffectResult);

      expect(result.newPlayerStates).toEqual(mockPlayerStates);
      expect(result.additionalEffects).toEqual([]);
      expect(result.grantsGoAgain).toBe(false);
    });

    it('handles null conditionalEffects', () => {
      const result = processor.processPostConditionals(null, mockContext, mockEffectResult);

      expect(result.newPlayerStates).toEqual(mockPlayerStates);
      expect(result.additionalEffects).toEqual([]);
      expect(result.grantsGoAgain).toBe(false);
    });

    it('handles null effectResult gracefully', () => {
      const conditionalEffects = [{
        id: 'draw-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'DRAW', value: 1 }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, null);

      // Condition not met due to null effectResult
      expect(result.additionalEffects).toEqual([]);
    });

    it('clones playerStates to avoid mutation', () => {
      const originalEnergy = mockPlayerStates.player1.energy;
      mockEffectResult.wasDestroyed = true;
      const conditionalEffects = [{
        id: 'draw-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'DRAW', value: 1 }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      // Original should be unchanged
      expect(mockPlayerStates.player1.energy).toBe(originalEnergy);
      // Result should have its own copy
      expect(result.newPlayerStates).not.toBe(mockPlayerStates);
    });

    it('tracks conditional source in additionalEffects for debugging', () => {
      mockEffectResult.wasDestroyed = true;
      const conditionalEffects = [{
        id: 'tracked-draw',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'DRAW', value: 1 }
      }];

      const result = processor.processPostConditionals(conditionalEffects, mockContext, mockEffectResult);

      expect(result.additionalEffects[0]._conditionalId).toBe('tracked-draw');
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('edge cases', () => {
    it('handles empty conditionalEffects array', () => {
      const primaryEffect = { type: 'DAMAGE', value: 2 };

      const result = processor.processPreConditionals([], primaryEffect, mockContext);

      expect(result.modifiedEffect).toEqual(primaryEffect);
      expect(result.additionalEffects).toEqual([]);
    });

    it('handles undefined conditionalEffects', () => {
      const primaryEffect = { type: 'DAMAGE', value: 2 };

      const result = processor.processPreConditionals(undefined, primaryEffect, mockContext);

      expect(result.modifiedEffect).toEqual(primaryEffect);
    });

    it('handles null conditionalEffects', () => {
      const primaryEffect = { type: 'DAMAGE', value: 2 };

      const result = processor.processPreConditionals(null, primaryEffect, mockContext);

      expect(result.modifiedEffect).toEqual(primaryEffect);
    });

    it('handles missing target in context', () => {
      mockContext.target = null;
      const primaryEffect = { type: 'DAMAGE', value: 2 };
      const conditionalEffects = [{
        id: 'marked-bonus',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      // Should not crash, condition evaluates to false
      expect(result.modifiedEffect.value).toBe(2);
    });

    it('preserves other effect properties when applying BONUS_DAMAGE', () => {
      mockTarget.isMarked = true;
      const primaryEffect = {
        type: 'DAMAGE',
        value: 2,
        damageType: 'PIERCING',
        visualEffect: { type: 'LASER_BLAST' }
      };
      const conditionalEffects = [{
        id: 'marked-bonus',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 1 }
      }];

      const result = processor.processPreConditionals(conditionalEffects, primaryEffect, mockContext);

      expect(result.modifiedEffect.value).toBe(3);
      expect(result.modifiedEffect.damageType).toBe('PIERCING');
      expect(result.modifiedEffect.visualEffect).toEqual({ type: 'LASER_BLAST' });
    });

    it('clones playerStates to avoid mutation', () => {
      const originalEnergy = mockPlayerStates.player1.energy;
      const primaryEffect = { type: 'DAMAGE', value: 2 };

      const result = processor.processPreConditionals([], primaryEffect, mockContext);

      // Original should be unchanged
      expect(mockPlayerStates.player1.energy).toBe(originalEnergy);
      // Result should have its own copy
      expect(result.newPlayerStates).not.toBe(mockPlayerStates);
    });
  });
});
