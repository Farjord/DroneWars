// ========================================
// DRAIN ENERGY EFFECT PROCESSOR TESTS
// ========================================
// TDD: Tests for DRAIN_ENERGY effect type
// Reduces target player's energy (minimum 0)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import DrainEnergyEffectProcessor from '../DrainEnergyEffectProcessor.js';

describe('DrainEnergyEffectProcessor', () => {
  let processor;
  let mockPlayerStates;
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DrainEnergyEffectProcessor();

    // Standard mock player states
    mockPlayerStates = {
      player1: {
        energy: 10,
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      },
      player2: {
        energy: 5,
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      }
    };

    // Standard mock context
    mockContext = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates
    };
  });

  describe('Normal drain operations', () => {
    it('should drain 3 energy from opponent with 5 energy', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 3, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify opponent energy reduced from 5 to 2
      expect(result.newPlayerStates.player2.energy).toBe(2);
      // Verify acting player's energy unchanged
      expect(result.newPlayerStates.player1.energy).toBe(10);
    });

    it('should drain 2 energy from opponent', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 2, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify opponent energy reduced from 5 to 3
      expect(result.newPlayerStates.player2.energy).toBe(3);
    });

    it('should drain 1 energy from opponent', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 1, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify opponent energy reduced from 5 to 4
      expect(result.newPlayerStates.player2.energy).toBe(4);
    });

    it('should drain all opponent energy when amount equals current energy', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 5, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify opponent energy reduced from 5 to 0
      expect(result.newPlayerStates.player2.energy).toBe(0);
    });

    it('should default to opponent when targetPlayer not specified', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 3 };

      const result = processor.process(effect, mockContext);

      // Should drain from opponent (player2)
      expect(result.newPlayerStates.player2.energy).toBe(2);
      expect(result.newPlayerStates.player1.energy).toBe(10);
    });

    it('should work correctly when player2 is acting player', () => {
      mockContext.actingPlayerId = 'player2';
      const effect = { type: 'DRAIN_ENERGY', amount: 4, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Should drain from opponent (player1)
      expect(result.newPlayerStates.player1.energy).toBe(6);
      // Acting player (player2) energy unchanged
      expect(result.newPlayerStates.player2.energy).toBe(5);
    });
  });

  describe('Edge cases - clamping', () => {
    it('should clamp to 0 when drain exceeds current energy', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 10, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify energy clamped to 0 (not negative)
      expect(result.newPlayerStates.player2.energy).toBe(0);
    });

    it('should clamp to 0 when drain amount is much larger than current energy', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 100, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify energy clamped to 0
      expect(result.newPlayerStates.player2.energy).toBe(0);
    });

    it('should handle draining from player already at 0 energy', () => {
      mockPlayerStates.player2.energy = 0;
      const effect = { type: 'DRAIN_ENERGY', amount: 3, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify energy remains at 0 (no error)
      expect(result.newPlayerStates.player2.energy).toBe(0);
    });
  });

  describe('Self-targeting (optional feature)', () => {
    it('should drain from self when targetPlayer is "self"', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 3, targetPlayer: 'self' };

      const result = processor.process(effect, mockContext);

      // Should drain from acting player (player1)
      expect(result.newPlayerStates.player1.energy).toBe(7);
      // Opponent energy unchanged
      expect(result.newPlayerStates.player2.energy).toBe(5);
    });

    it('should clamp to 0 when self-draining exceeds own energy', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 15, targetPlayer: 'self' };

      const result = processor.process(effect, mockContext);

      // Should drain acting player to 0
      expect(result.newPlayerStates.player1.energy).toBe(0);
    });
  });

  describe('Edge cases - zero and negative amounts', () => {
    it('should handle zero drain amount gracefully', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 0, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // No energy should be drained
      expect(result.newPlayerStates.player2.energy).toBe(5);
    });

    it('should treat negative drain amount as 0 (defensive programming)', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: -3, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Energy should not change (or increase if we treat negative as 0)
      // Defensive: clamp negative to 0
      expect(result.newPlayerStates.player2.energy).toBe(5);
    });
  });

  describe('State immutability', () => {
    it('should not mutate original playerStates', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 3, targetPlayer: 'opponent' };

      const originalEnergy = mockPlayerStates.player2.energy;

      processor.process(effect, mockContext);

      // Original state should be unchanged
      expect(mockPlayerStates.player2.energy).toBe(originalEnergy);
    });

    it('should not mutate acting player when draining opponent', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 3, targetPlayer: 'opponent' };

      const originalEnergy = mockPlayerStates.player1.energy;

      processor.process(effect, mockContext);

      // Acting player's original state should be unchanged
      expect(mockPlayerStates.player1.energy).toBe(originalEnergy);
    });
  });

  describe('Return value structure', () => {
    it('should return correct result structure', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 3, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify standard result structure
      expect(result).toHaveProperty('newPlayerStates');
      expect(result).toHaveProperty('additionalEffects');
      expect(result).toHaveProperty('animationEvents');
      expect(Array.isArray(result.additionalEffects)).toBe(true);
      expect(Array.isArray(result.animationEvents)).toBe(true);
    });

    it('should have valid player states in result', () => {
      const effect = { type: 'DRAIN_ENERGY', amount: 3, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player1).toBeDefined();
      expect(result.newPlayerStates.player2).toBeDefined();
      expect(typeof result.newPlayerStates.player1.energy).toBe('number');
      expect(typeof result.newPlayerStates.player2.energy).toBe('number');
    });
  });

  describe('Various drain amounts', () => {
    it('should correctly drain various amounts', () => {
      const testCases = [
        { amount: 1, expected: 4 },
        { amount: 2, expected: 3 },
        { amount: 3, expected: 2 },
        { amount: 4, expected: 1 },
        { amount: 5, expected: 0 }
      ];

      testCases.forEach(({ amount, expected }) => {
        const freshMockPlayerStates = {
          player1: { energy: 10, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } },
          player2: { energy: 5, dronesOnBoard: { lane1: [], lane2: [], lane3: [] } }
        };

        const freshContext = {
          actingPlayerId: 'player1',
          playerStates: freshMockPlayerStates
        };

        const effect = { type: 'DRAIN_ENERGY', amount, targetPlayer: 'opponent' };
        const result = processor.process(effect, freshContext);

        expect(result.newPlayerStates.player2.energy).toBe(expected);
      });
    });
  });
});
