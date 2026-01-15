// ========================================
// EXHAUST DRONE EFFECT PROCESSOR TESTS
// ========================================
// TDD: Tests for EXHAUST_DRONE effect type
// Sets target drone's isExhausted flag to true

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExhaustDroneEffectProcessor from './ExhaustDroneEffectProcessor.js';

describe('ExhaustDroneEffectProcessor', () => {
  let processor;
  let mockPlayerStates;
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ExhaustDroneEffectProcessor();

    // Standard mock player states with drones in various lanes
    mockPlayerStates = {
      player1: {
        energy: 10,
        dronesOnBoard: {
          lane1: [
            { id: 'drone_1', name: 'TestDrone1', hull: 3, isExhausted: false, attack: 2 }
          ],
          lane2: [
            { id: 'drone_2', name: 'TestDrone2', hull: 3, isExhausted: false, attack: 2 }
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
            { id: 'drone_3', name: 'EnemyDrone', hull: 3, isExhausted: false, attack: 2 }
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

  describe('Normal exhaust operations', () => {
    it('should exhaust a ready drone in lane1', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Verify drone is now exhausted
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted).toBe(true);
      // Verify drone remains in lane
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1).toHaveLength(1);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].id).toBe('drone_1');
    });

    it('should exhaust a drone in lane2', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = { id: 'drone_2', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Verify drone is now exhausted
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2[0].isExhausted).toBe(true);
      // Verify drone remains in lane
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2).toHaveLength(1);
    });

    it('should exhaust a drone in lane3', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = { id: 'drone_3', owner: 'player2' };

      const result = processor.process(effect, mockContext);

      // Verify drone is now exhausted
      expect(result.newPlayerStates.player2.dronesOnBoard.lane3[0].isExhausted).toBe(true);
      // Verify drone remains in lane
      expect(result.newPlayerStates.player2.dronesOnBoard.lane3).toHaveLength(1);
    });

    it('should exhaust enemy drone (opponent targeting)', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = { id: 'drone_3', owner: 'player2' };

      const result = processor.process(effect, mockContext);

      // Verify enemy drone is exhausted
      expect(result.newPlayerStates.player2.dronesOnBoard.lane3[0].isExhausted).toBe(true);
    });

    it('should default to opponent when owner not specified', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      // Target without explicit owner - should default to opponent
      mockContext.target = { id: 'drone_3' };

      const result = processor.process(effect, mockContext);

      // Should find drone_3 in opponent's (player2) lanes
      expect(result.newPlayerStates.player2.dronesOnBoard.lane3[0].isExhausted).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should be idempotent - exhausting already exhausted drone', () => {
      // Pre-exhaust the drone
      mockPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted = true;

      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Verify drone remains exhausted (no error)
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted).toBe(true);
    });

    it('should handle drone not found gracefully', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = { id: 'nonexistent_drone', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Should not throw error, return state unchanged
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted).toBe(false);
      expect(result.newPlayerStates).toBeDefined();
    });

    it('should handle no target provided gracefully', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = null;

      // Should not throw error
      expect(() => {
        processor.process(effect, mockContext);
      }).not.toThrow();
    });

    it('should handle empty target object gracefully', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = {};

      // Should not throw error
      expect(() => {
        processor.process(effect, mockContext);
      }).not.toThrow();
    });
  });

  describe('State immutability', () => {
    it('should not mutate original playerStates', () => {
      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = { id: 'drone_1', owner: 'player1' };

      const originalIsExhausted = mockPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted;

      processor.process(effect, mockContext);

      // Original state should be unchanged
      expect(mockPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted).toBe(originalIsExhausted);
    });
  });

  describe('Search across multiple lanes', () => {
    it('should search all lanes to find target drone', () => {
      // Add multiple drones across lanes
      mockPlayerStates.player1.dronesOnBoard.lane1 = [
        { id: 'drone_a', name: 'DroneA', hull: 3, isExhausted: false, attack: 2 }
      ];
      mockPlayerStates.player1.dronesOnBoard.lane2 = [
        { id: 'drone_b', name: 'DroneB', hull: 3, isExhausted: false, attack: 2 }
      ];
      mockPlayerStates.player1.dronesOnBoard.lane3 = [
        { id: 'drone_c', name: 'DroneC', hull: 3, isExhausted: false, attack: 2 }
      ];

      const effect = { type: 'EXHAUST_DRONE' };
      mockContext.target = { id: 'drone_c', owner: 'player1' };

      const result = processor.process(effect, mockContext);

      // Should find and exhaust drone_c in lane3
      expect(result.newPlayerStates.player1.dronesOnBoard.lane3[0].isExhausted).toBe(true);
      // Other drones should remain ready
      expect(result.newPlayerStates.player1.dronesOnBoard.lane1[0].isExhausted).toBe(false);
      expect(result.newPlayerStates.player1.dronesOnBoard.lane2[0].isExhausted).toBe(false);
    });
  });

  describe('Return value structure', () => {
    it('should return correct result structure', () => {
      const effect = { type: 'EXHAUST_DRONE' };
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
});
