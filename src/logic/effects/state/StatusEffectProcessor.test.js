// ========================================
// STATUS EFFECT PROCESSOR TESTS
// ========================================
// TDD: Tests for status effect types
// APPLY_CANNOT_MOVE, APPLY_CANNOT_ATTACK, APPLY_CANNOT_INTERCEPT,
// APPLY_DOES_NOT_READY, CLEAR_ALL_STATUS

import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatusEffectProcessor from './StatusEffectProcessor.js';

describe('StatusEffectProcessor', () => {
  let processor;
  let mockPlayerStates;
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new StatusEffectProcessor();

    // Standard mock player states with drones in various lanes
    mockPlayerStates = {
      player1: {
        energy: 10,
        dronesOnBoard: {
          lane1: [
            {
              id: 'drone_1',
              name: 'TestDrone1',
              hull: 3,
              isExhausted: false,
              attack: 2,
              cannotMove: false,
              cannotAttack: false,
              cannotIntercept: false,
              doesNotReady: false,
              isMarked: false
            }
          ],
          lane2: [
            {
              id: 'drone_2',
              name: 'TestDrone2',
              hull: 3,
              isExhausted: false,
              attack: 2,
              cannotMove: false,
              cannotAttack: false,
              cannotIntercept: false,
              doesNotReady: false,
              isMarked: false
            }
          ],
          lane3: []
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      },
      player2: {
        energy: 10,
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: [
            {
              id: 'drone_3',
              name: 'EnemyDrone',
              hull: 3,
              isExhausted: false,
              attack: 2,
              cannotMove: false,
              cannotAttack: false,
              cannotIntercept: false,
              doesNotReady: false,
              isMarked: false
            }
          ]
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } }
      }
    };

    // Standard mock context
    mockContext = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      target: {
        id: 'drone_1',
        owner: 'player1'
      }
    };
  });

  // ===========================================
  // PHASE 1.1: APPLY_CANNOT_MOVE Effect
  // ===========================================
  describe('APPLY_CANNOT_MOVE', () => {
    it('should set cannotMove to true on target drone', () => {
      const effect = { type: 'APPLY_CANNOT_MOVE' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Verify cannotMove is set
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove).toBe(true);
      // Verify drone remains in lane
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(1);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].id).toBe('drone_1');
    });

    it('should apply cannotMove to enemy drone', () => {
      const effect = { type: 'APPLY_CANNOT_MOVE' };
      mockContext.target = { id: 'drone_3', owner: 'player2' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player2.dronesOnBoard.lane3[0].cannotMove).toBe(true);
    });

    it('should be idempotent - applying to already restricted drone', () => {
      mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove = true;

      const effect = { type: 'APPLY_CANNOT_MOVE' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove).toBe(true);
    });

    it('should not mutate original playerStates', () => {
      const effect = { type: 'APPLY_CANNOT_MOVE' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const originalCannotMove = mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove;

      processor.process(effect, mockContext);

      expect(mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove).toBe(originalCannotMove);
    });
  });

  // ===========================================
  // PHASE 1.2: APPLY_CANNOT_ATTACK Effect
  // ===========================================
  describe('APPLY_CANNOT_ATTACK', () => {
    it('should set cannotAttack to true on target drone', () => {
      const effect = { type: 'APPLY_CANNOT_ATTACK' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].cannotAttack).toBe(true);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(1);
    });

    it('should apply cannotAttack to enemy drone', () => {
      const effect = { type: 'APPLY_CANNOT_ATTACK' };
      mockContext.target = { id: 'drone_3', owner: 'player2' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player2.dronesOnBoard.lane3[0].cannotAttack).toBe(true);
    });
  });

  // ===========================================
  // PHASE 1.3: APPLY_CANNOT_INTERCEPT Effect
  // ===========================================
  describe('APPLY_CANNOT_INTERCEPT', () => {
    it('should set cannotIntercept to true on target drone', () => {
      const effect = { type: 'APPLY_CANNOT_INTERCEPT' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].cannotIntercept).toBe(true);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(1);
    });

    it('should apply cannotIntercept to enemy drone', () => {
      const effect = { type: 'APPLY_CANNOT_INTERCEPT' };
      mockContext.target = { id: 'drone_3', owner: 'player2' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player2.dronesOnBoard.lane3[0].cannotIntercept).toBe(true);
    });
  });

  // ===========================================
  // PHASE 1.4: APPLY_DOES_NOT_READY Effect
  // ===========================================
  describe('APPLY_DOES_NOT_READY', () => {
    it('should set doesNotReady to true on target drone', () => {
      const effect = { type: 'APPLY_DOES_NOT_READY' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].doesNotReady).toBe(true);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(1);
    });

    it('should apply doesNotReady to enemy drone', () => {
      const effect = { type: 'APPLY_DOES_NOT_READY' };
      mockContext.target = { id: 'drone_3', owner: 'player2' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player2.dronesOnBoard.lane3[0].doesNotReady).toBe(true);
    });
  });

  // ===========================================
  // PHASE 1.5: CLEAR_ALL_STATUS Effect
  // ===========================================
  describe('CLEAR_ALL_STATUS', () => {
    it('should clear all status flags including isMarked', () => {
      // Setup drone with all statuses set to true
      mockPlayerStates.player1.dronesOnBoard.lane1[0] = {
        id: 'drone_1',
        name: 'TestDrone1',
        hull: 3,
        isExhausted: false,
        attack: 2,
        cannotMove: true,
        cannotAttack: true,
        cannotIntercept: true,
        doesNotReady: true,
        isMarked: true
      };

      const effect = { type: 'CLEAR_ALL_STATUS' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Verify all status flags are cleared
      const clearedDrone = result.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(clearedDrone.cannotMove).toBe(false);
      expect(clearedDrone.cannotAttack).toBe(false);
      expect(clearedDrone.cannotIntercept).toBe(false);
      expect(clearedDrone.doesNotReady).toBe(false);
      expect(clearedDrone.isMarked).toBe(false);
    });

    it('should clear statuses from enemy drone', () => {
      mockPlayerStates.player2.dronesOnBoard.lane3[0] = {
        id: 'drone_3',
        name: 'EnemyDrone',
        hull: 3,
        isExhausted: false,
        attack: 2,
        cannotMove: true,
        cannotAttack: true,
        cannotIntercept: true,
        doesNotReady: true,
        isMarked: true
      };

      const effect = { type: 'CLEAR_ALL_STATUS' };
      mockContext.target = { id: 'drone_3', owner: 'player2' };

      const result = processor.process(effect, mockContext);

      const clearedDrone = result.newPlayerStates.player2.dronesOnBoard.lane3[0];
      expect(clearedDrone.cannotMove).toBe(false);
      expect(clearedDrone.cannotAttack).toBe(false);
      expect(clearedDrone.cannotIntercept).toBe(false);
      expect(clearedDrone.doesNotReady).toBe(false);
      expect(clearedDrone.isMarked).toBe(false);
    });

    it('should work on drone with partial statuses', () => {
      // Only some statuses are set
      mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove = true;
      mockPlayerStates.player1.dronesOnBoard.lane1[0].isMarked = true;

      const effect = { type: 'CLEAR_ALL_STATUS' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      const clearedDrone = result.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(clearedDrone.cannotMove).toBe(false);
      expect(clearedDrone.cannotAttack).toBe(false);
      expect(clearedDrone.cannotIntercept).toBe(false);
      expect(clearedDrone.doesNotReady).toBe(false);
      expect(clearedDrone.isMarked).toBe(false);
    });
  });

  // ===========================================
  // Common Edge Cases
  // ===========================================
  describe('Edge cases', () => {
    it('should handle drone not found gracefully', () => {
      const effect = { type: 'APPLY_CANNOT_MOVE' };
      mockContext.target = { id: 'nonexistent_drone', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Should not throw error, return state unchanged
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove).toBe(false);
      expect(result.newPlayerStates).toBeDefined();
    });

    it('should handle no target provided gracefully', () => {
      const effect = { type: 'APPLY_CANNOT_MOVE' };
      mockContext.target = null;

      // Should not throw error
      expect(() => {
        processor.process(effect, mockContext);
      }).not.toThrow();
    });

    it('should handle empty target object gracefully', () => {
      const effect = { type: 'APPLY_CANNOT_MOVE' };
      mockContext.target = {};

      // Should not throw error
      expect(() => {
        processor.process(effect, mockContext);
      }).not.toThrow();
    });
  });

  // ===========================================
  // Return Value Structure
  // ===========================================
  describe('Return value structure', () => {
    it('should return correct result structure', () => {
      const effect = { type: 'APPLY_CANNOT_MOVE' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Verify standard result structure
      expect(result).toHaveProperty('newPlayerStates');
      expect(result).toHaveProperty('additionalEffects');
      expect(result).toHaveProperty('animationEvents');
      expect(Array.isArray(result.additionalEffects)).toBe(true);
      expect(Array.isArray(result.animationEvents)).toBe(true);
    });
  });

  // ===========================================
  // Multiple Status Effects
  // ===========================================
  describe('Multiple status effects on same drone', () => {
    it('should allow applying multiple different statuses to same drone', () => {
      const effect1 = { type: 'APPLY_CANNOT_MOVE' };
      const effect2 = { type: 'APPLY_CANNOT_ATTACK' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result1 = processor.process(effect1, mockContext);
      mockContext.playerStates = result1.newPlayerStates;
      const result2 = processor.process(effect2, mockContext);

      const drone = result2.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(drone.cannotMove).toBe(true);
      expect(drone.cannotAttack).toBe(true);
    });

    it('should clear all statuses when multiple are present', () => {
      // Apply multiple statuses
      mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotMove = true;
      mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotAttack = true;
      mockPlayerStates.player1.dronesOnBoard.lane1[0].cannotIntercept = true;
      mockPlayerStates.player1.dronesOnBoard.lane1[0].doesNotReady = true;
      mockPlayerStates.player1.dronesOnBoard.lane1[0].isMarked = true;

      const effect = { type: 'CLEAR_ALL_STATUS' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      const drone = result.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(drone.cannotMove).toBe(false);
      expect(drone.cannotAttack).toBe(false);
      expect(drone.cannotIntercept).toBe(false);
      expect(drone.doesNotReady).toBe(false);
      expect(drone.isMarked).toBe(false);
    });
  });
});
