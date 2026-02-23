// ========================================
// DAMAGE EFFECT PROCESSOR - effectResult TESTS
// ========================================
// TDD: Tests for effectResult return values
// Required for POST timing conditional effects (ON_DESTROY, ON_DAMAGE)

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before importing
vi.mock('../../../combat/AttackProcessor.js');
vi.mock('../../../gameLogic.js', () => ({
  gameEngine: {}
}));

// Import mocked module to control it
import { resolveAttack } from '../../../combat/AttackProcessor.js';

// Now import the processor
import DamageEffectProcessor from '../DamageEffectProcessor.js';

describe('DamageEffectProcessor effectResult', () => {
  let processor;
  let mockTarget;
  let mockContext;
  let mockPlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DamageEffectProcessor();

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
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      },
      player2: {
        energy: 10,
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
      card: { id: 'CARD_TEST', name: 'Test Card', instanceId: 'inst_123' }
    };
  });

  describe('when target is destroyed', () => {
    beforeEach(() => {
      // Mock resolveAttack to return destroyed target
      vi.mocked(resolveAttack).mockReturnValue({
        newPlayerStates: mockPlayerStates,
        shouldEndTurn: true,
        attackResult: {
          shieldDamage: 2,
          hullDamage: 3,
          wasDestroyed: true,
          remainingShields: 0,
          remainingHull: 0
        },
        animationEvents: []
      });
    });

    it('returns effectResult.wasDestroyed = true', () => {
      const effect = { type: 'DAMAGE', value: 5 };

      const result = processor.process(effect, mockContext);

      expect(result.effectResult).toBeDefined();
      expect(result.effectResult.wasDestroyed).toBe(true);
    });

    it('returns effectResult.damageDealt with shield and hull breakdown', () => {
      const effect = { type: 'DAMAGE', value: 5 };

      const result = processor.process(effect, mockContext);

      expect(result.effectResult.damageDealt).toBeDefined();
      expect(result.effectResult.damageDealt.shield).toBe(2);
      expect(result.effectResult.damageDealt.hull).toBe(3);
    });

    it('returns effectResult.targetId', () => {
      const effect = { type: 'DAMAGE', value: 5 };

      const result = processor.process(effect, mockContext);

      expect(result.effectResult.targetId).toBe('drone_123');
    });
  });

  describe('when target survives', () => {
    beforeEach(() => {
      // Mock resolveAttack to return surviving target
      vi.mocked(resolveAttack).mockReturnValue({
        newPlayerStates: mockPlayerStates,
        shouldEndTurn: true,
        attackResult: {
          shieldDamage: 2,
          hullDamage: 1,
          wasDestroyed: false,
          remainingShields: 0,
          remainingHull: 2
        },
        animationEvents: []
      });
    });

    it('returns effectResult.wasDestroyed = false', () => {
      const effect = { type: 'DAMAGE', value: 3 };

      const result = processor.process(effect, mockContext);

      expect(result.effectResult).toBeDefined();
      expect(result.effectResult.wasDestroyed).toBe(false);
    });

    it('returns effectResult.damageDealt with actual damage values', () => {
      const effect = { type: 'DAMAGE', value: 3 };

      const result = processor.process(effect, mockContext);

      expect(result.effectResult.damageDealt.shield).toBe(2);
      expect(result.effectResult.damageDealt.hull).toBe(1);
    });
  });

  describe('when no damage is dealt', () => {
    beforeEach(() => {
      // Mock resolveAttack to return no damage
      vi.mocked(resolveAttack).mockReturnValue({
        newPlayerStates: mockPlayerStates,
        shouldEndTurn: true,
        attackResult: {
          shieldDamage: 0,
          hullDamage: 0,
          wasDestroyed: false,
          remainingShields: 2,
          remainingHull: 3
        },
        animationEvents: []
      });
    });

    it('returns effectResult.damageDealt with zero values', () => {
      const effect = { type: 'DAMAGE', value: 0 };

      const result = processor.process(effect, mockContext);

      expect(result.effectResult.damageDealt.shield).toBe(0);
      expect(result.effectResult.damageDealt.hull).toBe(0);
    });

    it('returns effectResult.wasDestroyed = false', () => {
      const effect = { type: 'DAMAGE', value: 0 };

      const result = processor.process(effect, mockContext);

      expect(result.effectResult.wasDestroyed).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns effectResult even for DAMAGE_SCALING effect type', () => {
      // DAMAGE_SCALING delegates to processSingleTargetDamage internally
      vi.mocked(resolveAttack).mockReturnValue({
        newPlayerStates: mockPlayerStates,
        shouldEndTurn: true,
        attackResult: {
          shieldDamage: 1,
          hullDamage: 2,
          wasDestroyed: false,
          remainingShields: 1,
          remainingHull: 1
        },
        animationEvents: []
      });

      // Need drones in lane for READY_DRONES_IN_LANE scaling
      mockPlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'drone_a', isExhausted: false },
        { id: 'drone_b', isExhausted: false }
      ];

      const effect = { type: 'DAMAGE_SCALING', source: 'READY_DRONES_IN_LANE' };

      const result = processor.process(effect, mockContext);

      expect(result.effectResult).toBeDefined();
      expect(result.effectResult.damageDealt).toBeDefined();
    });

    it('returns null effectResult when target lane not found', () => {
      // Target is not in any lane
      mockPlayerStates.player2.dronesOnBoard = { lane1: [], lane2: [], lane3: [] };

      const effect = { type: 'DAMAGE', value: 5 };

      const result = processor.process(effect, mockContext);

      // Should return null effectResult when no target found
      expect(result.effectResult).toBeNull();
    });
  });
});
