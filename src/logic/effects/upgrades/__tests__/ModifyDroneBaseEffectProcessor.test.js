// ========================================
// MODIFY DRONE BASE EFFECT PROCESSOR TESTS
// ========================================
// TDD: Tests for MODIFY_DRONE_BASE effect
// Bug fix: Shield upgrades should immediately update deployed drones

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock debugLogger to prevent console output during tests
vi.mock('../../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Import the processor
import ModifyDroneBaseEffectProcessor from '../ModifyDroneBaseEffectProcessor.js';

describe('ModifyDroneBaseEffectProcessor', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ModifyDroneBaseEffectProcessor();
  });

  // Helper to create standard mock player states
  const createMockPlayerStates = () => ({
    player1: {
      energy: 10,
      appliedUpgrades: {},
      dronesOnBoard: {
        lane1: [
          { id: 'drone1', name: 'Talon', hull: 2, currentShields: 1, currentMaxShields: 1 }
        ],
        lane2: [
          { id: 'drone2', name: 'Talon', hull: 2, currentShields: 1, currentMaxShields: 1 },
          { id: 'drone3', name: 'Mammoth', hull: 4, currentShields: 2, currentMaxShields: 2 }
        ],
        lane3: []
      }
    },
    player2: {
      energy: 10,
      appliedUpgrades: {},
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
    }
  });

  // ========================================
  // BUG FIX: Shield upgrades should update deployed drones
  // ========================================
  describe('BUG FIX: shield upgrades should immediately update deployed drones', () => {
    it('should add active shields to all deployed drones of the upgraded type', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'SHIELD_AMPLIFIER', name: 'Shield Amplifier', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'shields', value: 1 }
      };

      const result = processor.process(effect, mockContext);

      // Drone1 in lane1 should have shields updated (1 + 1 = 2)
      const drone1 = result.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(drone1.currentShields).toBe(2);
      expect(drone1.currentMaxShields).toBe(2);

      // Drone2 in lane2 should also have shields updated (1 + 1 = 2)
      const drone2 = result.newPlayerStates.player1.dronesOnBoard.lane2[0];
      expect(drone2.currentShields).toBe(2);
      expect(drone2.currentMaxShields).toBe(2);

      // Mammoth should NOT be affected (different drone type)
      const mammoth = result.newPlayerStates.player1.dronesOnBoard.lane2[1];
      expect(mammoth.currentShields).toBe(2);
      expect(mammoth.currentMaxShields).toBe(2);
    });

    it('should handle shield upgrades with value > 1 (e.g., Shield Amplifier+)', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'SHIELD_AMPLIFIER_ENHANCED', name: 'Shield Amplifier+', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'shields', value: 2 }
      };

      const result = processor.process(effect, mockContext);

      // Talon drones should gain +2 shields
      const drone1 = result.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(drone1.currentShields).toBe(3);
      expect(drone1.currentMaxShields).toBe(3);
    });

    it('should still store the upgrade in appliedUpgrades for future deployments', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'SHIELD_AMPLIFIER', name: 'Shield Amplifier', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'shields', value: 1 }
      };

      const result = processor.process(effect, mockContext);

      // Upgrade should be stored
      expect(result.newPlayerStates.player1.appliedUpgrades['Talon']).toBeDefined();
      expect(result.newPlayerStates.player1.appliedUpgrades['Talon'].length).toBe(1);
      expect(result.newPlayerStates.player1.appliedUpgrades['Talon'][0].mod.stat).toBe('shields');
    });
  });

  // ========================================
  // FUTURE-PROOFING: Hull upgrades
  // ========================================
  describe('future-proofing: hull upgrades should update deployed drones', () => {
    it('should increase hull of deployed drones when hull upgrade is applied', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'HULL_UPGRADE', name: 'Hull Plating', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'hull', value: 1 }
      };

      const result = processor.process(effect, mockContext);

      // Talon drones should gain +1 hull
      const drone1 = result.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(drone1.hull).toBe(3);

      const drone2 = result.newPlayerStates.player1.dronesOnBoard.lane2[0];
      expect(drone2.hull).toBe(3);

      // Mammoth should NOT be affected
      const mammoth = result.newPlayerStates.player1.dronesOnBoard.lane2[1];
      expect(mammoth.hull).toBe(4);
    });
  });

  // ========================================
  // NON-DEPLOYED DRONE STATS (dynamic calculation)
  // ========================================
  describe('stats that are calculated dynamically should only store upgrade', () => {
    it('should store attack upgrade but not modify deployed drones directly', () => {
      const mockPlayerStates = createMockPlayerStates();
      // Add attack stat to drones for verification
      mockPlayerStates.player1.dronesOnBoard.lane1[0].attack = 2;

      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'EFFICIENCY_MODULE', name: 'Weapons Upgrade', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'attack', value: 1 }
      };

      const result = processor.process(effect, mockContext);

      // Attack is calculated dynamically, so drone.attack should not change
      // (calculateEffectiveStats handles this)
      const drone1 = result.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(drone1.attack).toBe(2); // Unchanged

      // But upgrade should be stored
      expect(result.newPlayerStates.player1.appliedUpgrades['Talon']).toBeDefined();
    });
  });

  // ========================================
  // ANIMATION EVENTS
  // ========================================
  describe('animation events for stat upgrades', () => {
    it('should emit STAT_BUFF events for attack upgrades on deployed drones', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'EFFICIENCY_MODULE', name: 'Weapons Upgrade', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'attack', value: 1 }
      };

      const result = processor.process(effect, mockContext);

      // Should emit one STAT_BUFF per deployed Talon (2 total: lane1 + lane2)
      expect(result.animationEvents).toHaveLength(2);
      expect(result.animationEvents[0]).toMatchObject({
        type: 'STAT_BUFF', targetId: 'drone1', targetType: 'drone', stat: 'attack'
      });
      expect(result.animationEvents[1]).toMatchObject({
        type: 'STAT_BUFF', targetId: 'drone2', targetType: 'drone', stat: 'attack'
      });
    });

    it('should emit STAT_BUFF events for speed upgrades on deployed drones', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'SPEED_UP', name: 'Thruster Upgrade', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'speed', value: 1 }
      };

      const result = processor.process(effect, mockContext);

      expect(result.animationEvents).toHaveLength(2);
      expect(result.animationEvents[0]).toMatchObject({ type: 'STAT_BUFF', stat: 'speed' });
    });

    it('should NOT emit animation events for shield upgrades', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'SHIELD_AMPLIFIER', name: 'Shield Amplifier', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'shields', value: 1 }
      };

      const result = processor.process(effect, mockContext);
      expect(result.animationEvents).toEqual([]);
    });

    it('should NOT emit animation events for hull upgrades', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'HULL_UP', name: 'Hull Plating', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'hull', value: 1 }
      };

      const result = processor.process(effect, mockContext);
      expect(result.animationEvents).toEqual([]);
    });

    it('should NOT emit animation events for ability upgrades', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'ABILITY_CARD', name: 'Overload Module', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'ability', abilityToAdd: { name: 'Overload', type: 'active' } }
      };

      const result = processor.process(effect, mockContext);
      expect(result.animationEvents).toEqual([]);
    });

    it('should emit no events when no matching drones are deployed', () => {
      const mockPlayerStates = createMockPlayerStates();
      mockPlayerStates.player1.dronesOnBoard = { lane1: [], lane2: [], lane3: [] };

      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'EFFICIENCY_MODULE', name: 'Weapons Upgrade', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'attack', value: 1 }
      };

      const result = processor.process(effect, mockContext);
      expect(result.animationEvents).toEqual([]);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('edge cases', () => {
    it('should handle drones with missing shield values gracefully', () => {
      const mockPlayerStates = createMockPlayerStates();
      // Remove shield values from drone
      delete mockPlayerStates.player1.dronesOnBoard.lane1[0].currentShields;
      delete mockPlayerStates.player1.dronesOnBoard.lane1[0].currentMaxShields;

      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'SHIELD_AMPLIFIER', name: 'Shield Amplifier', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'shields', value: 1 }
      };

      const result = processor.process(effect, mockContext);

      // Should initialize from 0 and add the upgrade value
      const drone1 = result.newPlayerStates.player1.dronesOnBoard.lane1[0];
      expect(drone1.currentShields).toBe(1);
      expect(drone1.currentMaxShields).toBe(1);
    });

    it('should handle empty dronesOnBoard gracefully', () => {
      const mockPlayerStates = createMockPlayerStates();
      mockPlayerStates.player1.dronesOnBoard = { lane1: [], lane2: [], lane3: [] };

      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        target: { name: 'Talon' },
        card: { id: 'SHIELD_AMPLIFIER', name: 'Shield Amplifier', slots: 1 }
      };

      const effect = {
        type: 'MODIFY_DRONE_BASE',
        mod: { stat: 'shields', value: 1 }
      };

      // Should not throw
      const result = processor.process(effect, mockContext);

      // Upgrade should still be stored
      expect(result.newPlayerStates.player1.appliedUpgrades['Talon']).toBeDefined();
    });
  });
});
