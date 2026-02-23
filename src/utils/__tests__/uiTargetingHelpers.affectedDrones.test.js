// ========================================
// AFFECTED DRONES CALCULATION TESTS
// ========================================
// TDD tests for calculateAffectedDroneIds function
// Tests filtering logic for LANE-targeting cards

import { describe, it, expect, vi } from 'vitest';
import { calculateAffectedDroneIds } from '../uiTargetingHelpers.js';

describe('calculateAffectedDroneIds', () => {
  // Mock effective stats function - returns drone stats directly unless overridden
  const mockGetEffectiveStats = vi.fn((drone, laneId, context) => ({
    speed: drone.speed,
    attack: drone.attack,
    hull: drone.hull,
    baseSpeed: drone.speed,
    baseAttack: drone.attack
  }));

  // Mock player states
  const createPlayerState = (dronesOnBoard = { lane1: [], lane2: [], lane3: [] }) => ({
    dronesOnBoard,
    shipSections: {}
  });

  // Mock drones with various speeds
  const fastDrone1 = { id: 'fast-1', name: 'Fast Drone 1', speed: 6, attack: 2, hull: 2 };
  const fastDrone2 = { id: 'fast-2', name: 'Fast Drone 2', speed: 5, attack: 2, hull: 2 };
  const slowDrone1 = { id: 'slow-1', name: 'Slow Drone 1', speed: 3, attack: 2, hull: 2 };
  const slowDrone2 = { id: 'slow-2', name: 'Slow Drone 2', speed: 2, attack: 2, hull: 2 };
  const mediumDrone = { id: 'medium-1', name: 'Medium Drone', speed: 4, attack: 2, hull: 2 };

  beforeEach(() => {
    mockGetEffectiveStats.mockClear();
  });

  describe('non-LANE targeting cards (returns empty)', () => {
    it('should return empty array for non-LANE targeting cards', () => {
      const droneTargetingCard = {
        targeting: { type: 'DRONE', affinity: 'ENEMY' },
        effect: { type: 'DAMAGE', value: 2 }
      };
      const result = calculateAffectedDroneIds(
        droneTargetingCard,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        createPlayerState({ lane1: [fastDrone1] }),
        'player1',
        mockGetEffectiveStats,
        {}
      );
      expect(result).toEqual([]);
    });

    it('should return empty array for null card', () => {
      const result = calculateAffectedDroneIds(
        null,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        createPlayerState(),
        'player1',
        mockGetEffectiveStats,
        {}
      );
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined card', () => {
      const result = calculateAffectedDroneIds(
        undefined,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        createPlayerState(),
        'player1',
        mockGetEffectiveStats,
        {}
      );
      expect(result).toEqual([]);
    });
  });

  describe('FILTERED scope with stat filter', () => {
    // Shrieker Missiles - DESTROY drones with speed >= 5
    const shriekerMissiles = {
      id: 'CARD010',
      name: 'Shrieker Missiles',
      targeting: { type: 'LANE', affinity: 'ENEMY' },
      effect: { type: 'DESTROY', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'GTE', value: 5 } }
    };

    // Sidewinder Missiles - DAMAGE drones with speed <= 3
    const sidewinderMissiles = {
      id: 'CARD013',
      name: 'Sidewinder Missiles',
      targeting: { type: 'LANE', affinity: 'ENEMY' },
      effect: { type: 'DAMAGE', value: 2, scope: 'FILTERED', filter: { stat: 'speed', comparison: 'LTE', value: 3 } }
    };

    it('should return drone IDs matching GTE filter (Shrieker Missiles - speed >= 5)', () => {
      const player2State = createPlayerState({
        lane1: [fastDrone1, fastDrone2, slowDrone1], // speeds: 6, 5, 3
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        shriekerMissiles,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Only drones with speed >= 5 should be affected
      expect(result).toContain('fast-1'); // speed 6
      expect(result).toContain('fast-2'); // speed 5
      expect(result).not.toContain('slow-1'); // speed 3
      expect(result.length).toBe(2);
    });

    it('should return drone IDs matching LTE filter (Sidewinder Missiles - speed <= 3)', () => {
      const player2State = createPlayerState({
        lane1: [fastDrone1, slowDrone1, slowDrone2], // speeds: 6, 3, 2
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        sidewinderMissiles,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Only drones with speed <= 3 should be affected
      expect(result).not.toContain('fast-1'); // speed 6
      expect(result).toContain('slow-1'); // speed 3
      expect(result).toContain('slow-2'); // speed 2
      expect(result.length).toBe(2);
    });

    it('should return drone IDs matching EQ filter', () => {
      const eqFilterCard = {
        targeting: { type: 'LANE', affinity: 'ENEMY' },
        effect: { type: 'DAMAGE', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'EQ', value: 4 } }
      };

      const player2State = createPlayerState({
        lane1: [fastDrone1, mediumDrone, slowDrone1], // speeds: 6, 4, 3
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        eqFilterCard,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Only drone with speed == 4 should be affected
      expect(result).toEqual(['medium-1']);
    });

    it('should return drone IDs matching GT filter', () => {
      const gtFilterCard = {
        targeting: { type: 'LANE', affinity: 'ENEMY' },
        effect: { type: 'DAMAGE', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'GT', value: 5 } }
      };

      const player2State = createPlayerState({
        lane1: [fastDrone1, fastDrone2, slowDrone1], // speeds: 6, 5, 3
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        gtFilterCard,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Only drone with speed > 5 should be affected
      expect(result).toEqual(['fast-1']); // speed 6 only
    });

    it('should return drone IDs matching LT filter', () => {
      const ltFilterCard = {
        targeting: { type: 'LANE', affinity: 'ENEMY' },
        effect: { type: 'DAMAGE', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'LT', value: 4 } }
      };

      const player2State = createPlayerState({
        lane1: [fastDrone1, mediumDrone, slowDrone1], // speeds: 6, 4, 3
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        ltFilterCard,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Only drone with speed < 4 should be affected
      expect(result).toEqual(['slow-1']); // speed 3 only
    });

    it('should use effective stats (drone with speed upgrade should count as higher)', () => {
      // Override mock to return upgraded speed for a specific drone
      const upgradeAwareGetEffectiveStats = vi.fn((drone, laneId, context) => {
        if (drone.id === 'slow-1') {
          // Simulate +2 speed upgrade
          return { ...drone, speed: drone.speed + 2 }; // 3 + 2 = 5
        }
        return { ...drone };
      });

      const player2State = createPlayerState({
        lane1: [fastDrone1, slowDrone1], // base speeds: 6, 3 (but slow-1 has +2 upgrade = 5)
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        shriekerMissiles, // speed >= 5
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        upgradeAwareGetEffectiveStats,
        {}
      );

      // slow-1 should now match because effective speed is 5
      expect(result).toContain('fast-1'); // speed 6
      expect(result).toContain('slow-1'); // effective speed 5 (3 + 2 upgrade)
      expect(result.length).toBe(2);
    });

    it('should return drones from all valid target lanes', () => {
      const player2State = createPlayerState({
        lane1: [fastDrone1], // speed 6
        lane2: [fastDrone2], // speed 5
        lane3: [slowDrone1] // speed 3
      });

      const result = calculateAffectedDroneIds(
        shriekerMissiles,
        [
          { id: 'lane1', owner: 'player2' },
          { id: 'lane2', owner: 'player2' },
          { id: 'lane3', owner: 'player2' }
        ],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Should include matching drones from all lanes
      expect(result).toContain('fast-1'); // lane1, speed 6
      expect(result).toContain('fast-2'); // lane2, speed 5
      expect(result).not.toContain('slow-1'); // lane3, speed 3
      expect(result.length).toBe(2);
    });

    it('should return empty array if no drones match filter', () => {
      const player2State = createPlayerState({
        lane1: [slowDrone1, slowDrone2], // speeds: 3, 2
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        shriekerMissiles, // speed >= 5
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      expect(result).toEqual([]);
    });

    it('should return all matching drones if all match filter', () => {
      const player2State = createPlayerState({
        lane1: [fastDrone1, fastDrone2], // speeds: 6, 5
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        shriekerMissiles, // speed >= 5
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      expect(result).toContain('fast-1');
      expect(result).toContain('fast-2');
      expect(result.length).toBe(2);
    });
  });

  describe('LANE scope (no filter) - affects all drones', () => {
    // Nuke - DESTROY all drones in lane
    const nukeCard = {
      id: 'CARD011',
      name: 'Nuke',
      targeting: { type: 'LANE', affinity: 'ANY' },
      effect: { type: 'DESTROY', scope: 'LANE' }
    };

    // Shield Recharge - HEAL all friendly drones
    const shieldRechargeCard = {
      id: 'CARD008',
      name: 'Shield Recharge',
      targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      effect: { type: 'HEAL_SHIELDS', value: 2, goAgain: true }
    };

    // Streamline - MODIFY_STAT for all friendly drones
    const streamlineCard = {
      id: 'CARD015',
      name: 'Streamline',
      targeting: { type: 'LANE', affinity: 'FRIENDLY' },
      effect: { type: 'MODIFY_STAT', mod: { stat: 'speed', value: 1, type: 'permanent' }, goAgain: true }
    };

    it('should return ALL drone IDs in targeted lanes for LANE scope (Nuke)', () => {
      const player2State = createPlayerState({
        lane1: [fastDrone1, slowDrone1, mediumDrone],
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        nukeCard,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // All drones in lane should be affected
      expect(result).toContain('fast-1');
      expect(result).toContain('slow-1');
      expect(result).toContain('medium-1');
      expect(result.length).toBe(3);
    });

    it('should return ALL friendly drone IDs for HEAL effects without filter (Shield Recharge)', () => {
      const player1State = createPlayerState({
        lane1: [fastDrone1, slowDrone1],
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        shieldRechargeCard,
        [{ id: 'lane1', owner: 'player1' }],
        player1State,
        createPlayerState(),
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // All drones in friendly lane should be affected
      expect(result).toContain('fast-1');
      expect(result).toContain('slow-1');
      expect(result.length).toBe(2);
    });

    it('should return ALL friendly drone IDs for MODIFY_STAT without filter (Streamline)', () => {
      const player1State = createPlayerState({
        lane1: [fastDrone1, mediumDrone, slowDrone1],
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        streamlineCard,
        [{ id: 'lane1', owner: 'player1' }],
        player1State,
        createPlayerState(),
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // All drones in lane should be affected
      expect(result).toContain('fast-1');
      expect(result).toContain('medium-1');
      expect(result).toContain('slow-1');
      expect(result.length).toBe(3);
    });
  });

  describe('maxTargets handling', () => {
    // Strafe Run - DAMAGE up to 3 drones with hull >= 1
    const strafeRunCard = {
      id: 'CARD034',
      name: 'Strafe Run',
      targeting: { type: 'LANE', affinity: 'ENEMY' },
      effect: {
        type: 'DAMAGE',
        value: 1,
        scope: 'FILTERED',
        maxTargets: 3,
        filter: { stat: 'hull', comparison: 'GTE', value: 1 }
      }
    };

    const drone1 = { id: 'd1', speed: 4, attack: 2, hull: 2 };
    const drone2 = { id: 'd2', speed: 4, attack: 2, hull: 2 };
    const drone3 = { id: 'd3', speed: 4, attack: 2, hull: 2 };
    const drone4 = { id: 'd4', speed: 4, attack: 2, hull: 2 };
    const drone5 = { id: 'd5', speed: 4, attack: 2, hull: 2 };

    it('should limit to maxTargets drones (Strafe Run - max 3 targets)', () => {
      const player2State = createPlayerState({
        lane1: [drone1, drone2, drone3, drone4, drone5], // 5 drones, all with hull >= 1
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        strafeRunCard,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Should only include first 3 drones (maxTargets limit)
      expect(result.length).toBe(3);
    });

    it('should return frontmost drones when maxTargets applies', () => {
      const player2State = createPlayerState({
        lane1: [drone1, drone2, drone3, drone4, drone5], // 5 drones in order
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        strafeRunCard,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Should be the first 3 drones (frontmost)
      expect(result).toEqual(['d1', 'd2', 'd3']);
    });

    it('should return all drones if fewer than maxTargets match', () => {
      const player2State = createPlayerState({
        lane1: [drone1, drone2], // Only 2 drones
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        strafeRunCard, // maxTargets: 3
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Should include all 2 drones (less than maxTargets)
      expect(result).toEqual(['d1', 'd2']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty lanes gracefully', () => {
      const shriekerMissiles = {
        targeting: { type: 'LANE', affinity: 'ENEMY' },
        effect: { type: 'DESTROY', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'GTE', value: 5 } }
      };

      const result = calculateAffectedDroneIds(
        shriekerMissiles,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        createPlayerState(), // Empty lanes
        'player1',
        mockGetEffectiveStats,
        {}
      );

      expect(result).toEqual([]);
    });

    it('should handle lanes with only non-matching drones', () => {
      const shriekerMissiles = {
        targeting: { type: 'LANE', affinity: 'ENEMY' },
        effect: { type: 'DESTROY', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'GTE', value: 5 } }
      };

      const player2State = createPlayerState({
        lane1: [slowDrone1, slowDrone2], // All slow drones
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        shriekerMissiles,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      expect(result).toEqual([]);
    });

    it('should handle empty validLaneTargets array', () => {
      const shriekerMissiles = {
        targeting: { type: 'LANE', affinity: 'ENEMY' },
        effect: { type: 'DESTROY', scope: 'FILTERED', filter: { stat: 'speed', comparison: 'GTE', value: 5 } }
      };

      const result = calculateAffectedDroneIds(
        shriekerMissiles,
        [], // No valid targets
        createPlayerState(),
        createPlayerState({ lane1: [fastDrone1] }),
        'player1',
        mockGetEffectiveStats,
        {}
      );

      expect(result).toEqual([]);
    });

    it('should handle LANE cards without scope (treat as LANE scope)', () => {
      // Card with no scope specified
      const noScopeCard = {
        targeting: { type: 'LANE', affinity: 'ENEMY' },
        effect: { type: 'DAMAGE', value: 1 } // No scope field
      };

      const player2State = createPlayerState({
        lane1: [fastDrone1, slowDrone1],
        lane2: [],
        lane3: []
      });

      const result = calculateAffectedDroneIds(
        noScopeCard,
        [{ id: 'lane1', owner: 'player2' }],
        createPlayerState(),
        player2State,
        'player1',
        mockGetEffectiveStats,
        {}
      );

      // Should affect all drones (no filter means all)
      expect(result).toContain('fast-1');
      expect(result).toContain('slow-1');
      expect(result.length).toBe(2);
    });
  });
});
