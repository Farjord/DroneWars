// ========================================
// DESTROY EFFECT PROCESSOR - ALL SCOPE TESTS
// ========================================
// TDD: Tests for Purge Protocol card (DESTROY effect with ALL scope)
// Destroys all marked enemy drones

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before importing
vi.mock('../../../gameLogic.js', () => ({
  gameEngine: {
    onDroneDestroyed: vi.fn().mockReturnValue({ deployedDroneCounts: {} })
  }
}));

vi.mock('../animations/DefaultDestroyAnimation.js', () => ({
  buildDefaultDestroyAnimation: vi.fn().mockReturnValue([])
}));

vi.mock('../animations/NukeAnimation.js', () => ({
  buildNukeAnimation: vi.fn().mockReturnValue([])
}));

// Now import the processor
import DestroyEffectProcessor from '../../DestroyEffectProcessor.js';
import { gameEngine } from '../../../gameLogic.js';

describe('DestroyEffectProcessor - ALL scope (Purge Protocol)', () => {
  let processor;
  let mockPlayerStates;
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DestroyEffectProcessor();

    // Standard mock player states with marked and unmarked drones
    mockPlayerStates = {
      player1: {
        energy: 10,
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } },
        deployedDroneCounts: {}
      },
      player2: {
        energy: 10,
        dronesOnBoard: {
          lane1: [
            { id: 'drone_1', name: 'MarkedDrone1', hull: 3, isMarked: true, attack: 2 },
            { id: 'drone_2', name: 'UnmarkedDrone', hull: 3, isMarked: false, attack: 2 }
          ],
          lane2: [
            { id: 'drone_3', name: 'MarkedDrone2', hull: 3, isMarked: true, attack: 2 }
          ],
          lane3: []
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } },
        deployedDroneCounts: {}
      }
    };

    // Standard mock context - simulating Purge Protocol card
    mockContext = {
      target: null, // ALL_MARKED targeting provides no single target
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates,
      placedSections: {
        player1: ['bridge'],
        player2: ['bridge']
      },
      callbacks: { logCallback: vi.fn() },
      card: {
        id: 'CARD036',
        name: 'Purge Protocol',
        instanceId: 'inst_purge',
        targeting: {
          type: 'ALL_MARKED',
          affinity: 'ENEMY'
        },
        effect: {
          type: 'DESTROY',
          scope: 'ALL'
        },
        visualEffect: {
          type: 'NUKE_BLAST'
        }
      }
    };
  });

  describe('when there are marked enemy drones', () => {
    it('should destroy all marked enemy drones', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      const result = processor.process(effect, mockContext);

      // Verify marked drones are removed
      const lane1Drones = result.newPlayerStates.player2.dronesOnBoard.lane1;
      const lane2Drones = result.newPlayerStates.player2.dronesOnBoard.lane2;

      // drone_1 (marked) should be gone
      expect(lane1Drones.find(d => d.id === 'drone_1')).toBeUndefined();
      // drone_2 (unmarked) should still be there
      expect(lane1Drones.find(d => d.id === 'drone_2')).toBeDefined();
      // drone_3 (marked) should be gone
      expect(lane2Drones.find(d => d.id === 'drone_3')).toBeUndefined();
    });

    it('should generate DRONE_DESTROYED animation for each destroyed drone', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      const result = processor.process(effect, mockContext);

      // Should have 2 DRONE_DESTROYED events (for drone_1 and drone_3)
      const destroyedEvents = result.animationEvents.filter(e => e.type === 'DRONE_DESTROYED');
      expect(destroyedEvents.length).toBe(2);

      // Verify event details
      const droneIds = destroyedEvents.map(e => e.targetId);
      expect(droneIds).toContain('drone_1');
      expect(droneIds).toContain('drone_3');
    });

    it('should call gameEngine.onDroneDestroyed for each destroyed drone', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      processor.process(effect, mockContext);

      // Should be called twice (for drone_1 and drone_3)
      expect(gameEngine.onDroneDestroyed).toHaveBeenCalledTimes(2);
    });
  });

  describe('when there are no marked enemy drones', () => {
    beforeEach(() => {
      // Remove all marked drones
      mockPlayerStates.player2.dronesOnBoard = {
        lane1: [
          { id: 'drone_2', name: 'UnmarkedDrone', hull: 3, isMarked: false, attack: 2 }
        ],
        lane2: [],
        lane3: []
      };
    });

    it('should not destroy any drones', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      const result = processor.process(effect, mockContext);

      // Unmarked drone should still be there
      const lane1Drones = result.newPlayerStates.player2.dronesOnBoard.lane1;
      expect(lane1Drones.find(d => d.id === 'drone_2')).toBeDefined();
    });

    it('should not generate any DRONE_DESTROYED animations', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      const result = processor.process(effect, mockContext);

      const destroyedEvents = result.animationEvents.filter(e => e.type === 'DRONE_DESTROYED');
      expect(destroyedEvents.length).toBe(0);
    });
  });

  describe('when drones exist in multiple lanes', () => {
    beforeEach(() => {
      // Add marked drones to all three lanes
      mockPlayerStates.player2.dronesOnBoard = {
        lane1: [{ id: 'drone_1', name: 'MarkedDrone1', hull: 3, isMarked: true, attack: 2 }],
        lane2: [{ id: 'drone_2', name: 'MarkedDrone2', hull: 3, isMarked: true, attack: 2 }],
        lane3: [{ id: 'drone_3', name: 'MarkedDrone3', hull: 3, isMarked: true, attack: 2 }]
      };
    });

    it('should destroy marked drones in all lanes', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      const result = processor.process(effect, mockContext);

      // All lanes should be empty
      expect(result.newPlayerStates.player2.dronesOnBoard.lane1.length).toBe(0);
      expect(result.newPlayerStates.player2.dronesOnBoard.lane2.length).toBe(0);
      expect(result.newPlayerStates.player2.dronesOnBoard.lane3.length).toBe(0);
    });

    it('should generate animations for drones in all lanes', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      const result = processor.process(effect, mockContext);

      const destroyedEvents = result.animationEvents.filter(e => e.type === 'DRONE_DESTROYED');
      expect(destroyedEvents.length).toBe(3);

      // Verify all lanes are represented
      const lanes = destroyedEvents.map(e => e.targetLane);
      expect(lanes).toContain('lane1');
      expect(lanes).toContain('lane2');
      expect(lanes).toContain('lane3');
    });
  });

  describe('effect result', () => {
    it('should return newPlayerStates', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates).toBeDefined();
      expect(result.newPlayerStates.player1).toBeDefined();
      expect(result.newPlayerStates.player2).toBeDefined();
    });

    it('should return empty additionalEffects', () => {
      const effect = { type: 'DESTROY', scope: 'ALL' };

      const result = processor.process(effect, mockContext);

      expect(result.additionalEffects).toEqual([]);
    });
  });
});
