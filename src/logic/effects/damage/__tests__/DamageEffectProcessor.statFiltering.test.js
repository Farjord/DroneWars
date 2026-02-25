// ========================================
// DAMAGE EFFECT PROCESSOR - STAT FILTERING TESTS
// ========================================
// TDD: Tests for stat-based filtering in processFilteredDamage
// Bug: Sidewinder Missiles should only damage drones with speed <= 4

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before importing
vi.mock('../../../gameLogic.js', () => ({
  gameEngine: {
    onDroneDestroyed: vi.fn(() => ({ deployedDroneCounts: {} }))
  }
}));

// Import the processor
import DamageEffectProcessor from '../DamageEffectProcessor.js';

describe('DamageEffectProcessor stat-based filtering', () => {
  let processor;
  let mockPlayerStates;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DamageEffectProcessor();

    // Setup player states with drones of varying speeds
    mockPlayerStates = {
      player1: {
        energy: 10,
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } },
        deployedDroneCounts: {},
        appliedUpgrades: {}
      },
      player2: {
        energy: 10,
        dronesOnBoard: {
          lane1: [],
          lane2: [],
          lane3: []
        },
        shipSections: { bridge: { hull: 10, allocatedShields: 5 } },
        deployedDroneCounts: {},
        appliedUpgrades: {}
      }
    };
  });

  describe('processFilteredDamage with speed LTE filter', () => {
    it('should only damage drones with speed <= filter value', () => {
      // Setup: lane with speed-6 Dart and speed-4 Talon
      const fastDrone = {
        id: 'dart_1',
        name: 'Dart',
        hull: 3,
        currentShields: 1,
        speed: 6,
        attack: 1,
        owner: 'player2',
        isExhausted: false
      };
      const slowDrone = {
        id: 'talon_1',
        name: 'Talon',
        hull: 3,
        currentShields: 1,
        speed: 4,
        attack: 2,
        owner: 'player2',
        isExhausted: false
      };
      mockPlayerStates.player2.dronesOnBoard.lane1 = [fastDrone, slowDrone];

      // Effect: Sidewinder Missiles - damage drones with speed <= 4
      const effect = {
        type: 'DAMAGE',
        value: 2
      };

      const context = {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        placedSections: { player1: ['bridge'], player2: ['bridge'] },
        callbacks: { logCallback: vi.fn() },
        card: {
          id: 'CARD013', name: 'Sidewinder Missiles', instanceId: 'inst_1',
          targeting: { type: 'LANE', affinity: 'ENEMY', affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 4 }] }
        }
      };

      const result = processor.process(effect, context);

      // Get drones from result state
      const lane1Drones = result.newPlayerStates.player2.dronesOnBoard.lane1;
      const dart = lane1Drones.find(d => d.id === 'dart_1');
      const talon = lane1Drones.find(d => d.id === 'talon_1');

      // Dart (speed 6) should NOT be damaged - shields and hull intact
      expect(dart.currentShields).toBe(1);
      expect(dart.hull).toBe(3);

      // Talon (speed 4) SHOULD be damaged
      expect(talon.currentShields).toBeLessThan(1); // or hull damaged
    });

    it('should damage no drones when none meet filter criteria', () => {
      // All drones have speed > 4
      const fastDrone1 = {
        id: 'dart_1',
        name: 'Dart',
        hull: 3,
        currentShields: 1,
        speed: 6,
        attack: 1,
        owner: 'player2',
        isExhausted: false
      };
      const fastDrone2 = {
        id: 'harrier_1',
        name: 'Harrier',
        hull: 2,
        currentShields: 1,
        speed: 5,
        attack: 2,
        owner: 'player2',
        isExhausted: false
      };
      mockPlayerStates.player2.dronesOnBoard.lane1 = [fastDrone1, fastDrone2];

      const effect = {
        type: 'DAMAGE',
        value: 2
      };

      const context = {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        placedSections: { player1: ['bridge'], player2: ['bridge'] },
        callbacks: { logCallback: vi.fn() },
        card: {
          id: 'CARD013', name: 'Sidewinder Missiles', instanceId: 'inst_1',
          targeting: { type: 'LANE', affinity: 'ENEMY', affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 4 }] }
        }
      };

      const result = processor.process(effect, context);

      // Both drones should be untouched
      const lane1Drones = result.newPlayerStates.player2.dronesOnBoard.lane1;
      expect(lane1Drones[0].currentShields).toBe(1);
      expect(lane1Drones[0].hull).toBe(3);
      expect(lane1Drones[1].currentShields).toBe(1);
      expect(lane1Drones[1].hull).toBe(2);
    });

    it('should damage all drones when all meet filter criteria', () => {
      // All drones have speed <= 4
      const slowDrone1 = {
        id: 'mammoth_1',
        name: 'Mammoth',
        hull: 5,
        currentShields: 2,
        speed: 2,
        attack: 3,
        owner: 'player2',
        isExhausted: false
      };
      const slowDrone2 = {
        id: 'talon_1',
        name: 'Talon',
        hull: 3,
        currentShields: 1,
        speed: 4,
        attack: 2,
        owner: 'player2',
        isExhausted: false
      };
      mockPlayerStates.player2.dronesOnBoard.lane1 = [slowDrone1, slowDrone2];

      const effect = {
        type: 'DAMAGE',
        value: 2
      };

      const context = {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        placedSections: { player1: ['bridge'], player2: ['bridge'] },
        callbacks: { logCallback: vi.fn() },
        card: {
          id: 'CARD013', name: 'Sidewinder Missiles', instanceId: 'inst_1',
          targeting: { type: 'LANE', affinity: 'ENEMY', affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 4 }] }
        }
      };

      const result = processor.process(effect, context);

      // Both drones should be damaged
      const lane1Drones = result.newPlayerStates.player2.dronesOnBoard.lane1;
      const mammoth = lane1Drones.find(d => d.id === 'mammoth_1');
      const talon = lane1Drones.find(d => d.id === 'talon_1');

      // Mammoth: 2 shields absorb damage, 0 hull damage (2 damage - 2 shields = 0)
      expect(mammoth.currentShields).toBe(0);
      expect(mammoth.hull).toBe(5);

      // Talon: 1 shield, 1 hull damage (2 damage - 1 shield = 1 hull)
      expect(talon.currentShields).toBe(0);
      expect(talon.hull).toBe(2);
    });
  });

  describe('processFilteredDamage with GTE comparison', () => {
    it('should only damage drones with speed >= filter value', () => {
      const slowDrone = {
        id: 'mammoth_1',
        name: 'Mammoth',
        hull: 5,
        currentShields: 2,
        speed: 2,
        attack: 3,
        owner: 'player2',
        isExhausted: false
      };
      const fastDrone = {
        id: 'dart_1',
        name: 'Dart',
        hull: 3,
        currentShields: 1,
        speed: 6,
        attack: 1,
        owner: 'player2',
        isExhausted: false
      };
      mockPlayerStates.player2.dronesOnBoard.lane1 = [slowDrone, fastDrone];

      // Effect: damage drones with speed >= 5
      const effect = {
        type: 'DAMAGE',
        value: 2
      };

      const context = {
        target: { id: 'lane1', owner: 'player2' },
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        placedSections: { player1: ['bridge'], player2: ['bridge'] },
        callbacks: { logCallback: vi.fn() },
        card: {
          id: 'TEST_CARD', name: 'Test Card', instanceId: 'inst_1',
          targeting: { type: 'LANE', affinity: 'ENEMY', affectedFilter: [{ stat: 'speed', comparison: 'GTE', value: 5 }] }
        }
      };

      const result = processor.process(effect, context);

      const lane1Drones = result.newPlayerStates.player2.dronesOnBoard.lane1;
      const mammoth = lane1Drones.find(d => d.id === 'mammoth_1');
      const dart = lane1Drones.find(d => d.id === 'dart_1');

      // Mammoth (speed 2) should NOT be damaged
      expect(mammoth.currentShields).toBe(2);
      expect(mammoth.hull).toBe(5);

      // Dart (speed 6) SHOULD be damaged
      expect(dart.currentShields).toBe(0);
      expect(dart.hull).toBe(2); // 2 damage - 1 shield = 1 hull damage
    });
  });
});
