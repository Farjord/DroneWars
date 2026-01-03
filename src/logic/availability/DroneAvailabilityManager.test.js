// ========================================
// DRONE AVAILABILITY MANAGER - TDD TESTS
// ========================================
// Tests written first for DroneAvailabilityManager
// Based on PRD: drone_availability_rebuild_system_prd.md

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeForCombat,
  processRebuildProgress,
  onDroneDeployed,
  onDroneDestroyed,
  onDroneRecalled,
  applyAccelerationBonus,
  getReadyCount,
  canDeploy
} from './DroneAvailabilityManager.js';

describe('DroneAvailabilityManager', () => {
  // ========================================
  // INITIALIZATION TESTS
  // ========================================
  describe('initializeForCombat', () => {
    it('should initialize all copies as ready for each drone type', () => {
      const activeDronePool = [
        { name: 'Dart', limit: 3, rebuildRate: 2.0 },
        { name: 'Mammoth', limit: 2, rebuildRate: 1.0 }
      ];

      const availability = initializeForCombat(activeDronePool);

      expect(availability.Dart.readyCount).toBe(3);
      expect(availability.Dart.inPlayCount).toBe(0);
      expect(availability.Dart.rebuildingCount).toBe(0);
      expect(availability.Dart.copyLimit).toBe(3);
      expect(availability.Dart.rebuildRate).toBe(2.0);
      expect(availability.Dart.rebuildProgress).toBe(0);
      expect(availability.Dart.accelerationBonus).toBe(0);

      expect(availability.Mammoth.readyCount).toBe(2);
      expect(availability.Mammoth.copyLimit).toBe(2);
      expect(availability.Mammoth.rebuildRate).toBe(1.0);
    });

    it('should apply upgrade modifiers to copy limit', () => {
      const activeDronePool = [
        { name: 'Dart', limit: 3, rebuildRate: 2.0 }
      ];
      const appliedUpgrades = {
        Dart: [{ mod: { stat: 'limit', value: 1 } }]
      };

      const availability = initializeForCombat(activeDronePool, appliedUpgrades);

      expect(availability.Dart.copyLimit).toBe(4);
      expect(availability.Dart.readyCount).toBe(4);
    });

    it('should handle mythic drones with limit 1', () => {
      const activeDronePool = [
        { name: 'Tempest', limit: 1, rebuildRate: 0.5 }
      ];

      const availability = initializeForCombat(activeDronePool);

      expect(availability.Tempest.copyLimit).toBe(1);
      expect(availability.Tempest.readyCount).toBe(1);
      expect(availability.Tempest.rebuildRate).toBe(0.5);
    });

    it('should return empty object for empty drone pool', () => {
      const availability = initializeForCombat([]);
      expect(availability).toEqual({});
    });
  });

  // ========================================
  // DEPLOYMENT TESTS
  // ========================================
  describe('onDroneDeployed', () => {
    it('should decrement readyCount and increment inPlayCount', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 2.0,
          readyCount: 3,
          inPlayCount: 0,
          rebuildingCount: 0,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = onDroneDeployed(availability, 'Dart');

      expect(result.Dart.readyCount).toBe(2);
      expect(result.Dart.inPlayCount).toBe(1);
      expect(result.Dart.rebuildingCount).toBe(0);
    });

    it('should not modify state if no ready copies available', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 2.0,
          readyCount: 0,
          inPlayCount: 3,
          rebuildingCount: 0,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = onDroneDeployed(availability, 'Dart');

      expect(result.Dart.readyCount).toBe(0);
      expect(result.Dart.inPlayCount).toBe(3);
    });

    it('should preserve other drone availability states', () => {
      const availability = {
        Dart: { copyLimit: 3, readyCount: 2, inPlayCount: 1, rebuildingCount: 0, rebuildProgress: 0, rebuildRate: 2.0, accelerationBonus: 0 },
        Mammoth: { copyLimit: 2, readyCount: 2, inPlayCount: 0, rebuildingCount: 0, rebuildProgress: 0, rebuildRate: 1.0, accelerationBonus: 0 }
      };

      const result = onDroneDeployed(availability, 'Dart');

      expect(result.Mammoth.readyCount).toBe(2);
      expect(result.Mammoth.inPlayCount).toBe(0);
    });
  });

  // ========================================
  // DESTRUCTION TESTS
  // ========================================
  describe('onDroneDestroyed', () => {
    it('should decrement inPlayCount and increment rebuildingCount', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 2.0,
          readyCount: 1,
          inPlayCount: 2,
          rebuildingCount: 0,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = onDroneDestroyed(availability, 'Dart');

      expect(result.Dart.readyCount).toBe(1);
      expect(result.Dart.inPlayCount).toBe(1);
      expect(result.Dart.rebuildingCount).toBe(1);
    });

    it('should handle destruction when no drones in play (edge case)', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 2.0,
          readyCount: 3,
          inPlayCount: 0,
          rebuildingCount: 0,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = onDroneDestroyed(availability, 'Dart');

      // Should not go negative
      expect(result.Dart.inPlayCount).toBe(0);
      expect(result.Dart.rebuildingCount).toBe(0);
    });
  });

  // ========================================
  // RECALL TESTS (Immediate availability)
  // ========================================
  describe('onDroneRecalled', () => {
    it('should decrement inPlayCount and increment readyCount immediately', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 2.0,
          readyCount: 1,
          inPlayCount: 2,
          rebuildingCount: 0,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = onDroneRecalled(availability, 'Dart');

      expect(result.Dart.readyCount).toBe(2);
      expect(result.Dart.inPlayCount).toBe(1);
      expect(result.Dart.rebuildingCount).toBe(0);
    });

    it('should not trigger rebuild - drone is immediately available', () => {
      const availability = {
        Mammoth: {
          copyLimit: 1,
          rebuildRate: 0.5,
          readyCount: 0,
          inPlayCount: 1,
          rebuildingCount: 0,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = onDroneRecalled(availability, 'Mammoth');

      expect(result.Mammoth.readyCount).toBe(1);
      expect(result.Mammoth.inPlayCount).toBe(0);
      expect(result.Mammoth.rebuildingCount).toBe(0);
    });
  });

  // ========================================
  // REBUILD PROGRESS TESTS
  // ========================================
  describe('processRebuildProgress', () => {
    it('should advance rebuild progress by rebuildRate', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 2.0,
          readyCount: 0,
          inPlayCount: 0,
          rebuildingCount: 3,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = processRebuildProgress(availability);

      // With rate 2.0, should rebuild 2 drones
      expect(result.Dart.readyCount).toBe(2);
      expect(result.Dart.rebuildingCount).toBe(1);
      expect(result.Dart.rebuildProgress).toBe(0);
    });

    it('should handle fractional rebuild rates (0.5 = 1 every 2 rounds)', () => {
      const availability = {
        Mammoth: {
          copyLimit: 1,
          rebuildRate: 0.5,
          readyCount: 0,
          inPlayCount: 0,
          rebuildingCount: 1,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      // Round 1: progress 0 -> 0.5
      const after1 = processRebuildProgress(availability);
      expect(after1.Mammoth.readyCount).toBe(0);
      expect(after1.Mammoth.rebuildingCount).toBe(1);
      expect(after1.Mammoth.rebuildProgress).toBe(0.5);

      // Round 2: progress 0.5 -> 1.0, converts to ready
      const after2 = processRebuildProgress(after1);
      expect(after2.Mammoth.readyCount).toBe(1);
      expect(after2.Mammoth.rebuildingCount).toBe(0);
      expect(after2.Mammoth.rebuildProgress).toBe(0);
    });

    it('should handle very slow rebuild rates (0.33 = 1 every 3 rounds)', () => {
      const availability = {
        Titan: {
          copyLimit: 1,
          rebuildRate: 0.34,
          readyCount: 0,
          inPlayCount: 0,
          rebuildingCount: 1,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      // Round 1: 0 -> 0.34
      const after1 = processRebuildProgress(availability);
      expect(after1.Titan.rebuildProgress).toBeCloseTo(0.34);
      expect(after1.Titan.readyCount).toBe(0);

      // Round 2: 0.34 -> 0.68
      const after2 = processRebuildProgress(after1);
      expect(after2.Titan.rebuildProgress).toBeCloseTo(0.68);
      expect(after2.Titan.readyCount).toBe(0);

      // Round 3: 0.68 -> 1.02, converts (progress becomes 0.02)
      const after3 = processRebuildProgress(after2);
      expect(after3.Titan.readyCount).toBe(1);
      expect(after3.Titan.rebuildingCount).toBe(0);
      expect(after3.Titan.rebuildProgress).toBeCloseTo(0.02);
    });

    it('should not rebuild if no drones are rebuilding', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 2.0,
          readyCount: 2,
          inPlayCount: 1,
          rebuildingCount: 0,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = processRebuildProgress(availability);

      expect(result.Dart.readyCount).toBe(2);
      expect(result.Dart.inPlayCount).toBe(1);
      expect(result.Dart.rebuildingCount).toBe(0);
    });

    it('should cap rebuilds at rebuildingCount', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 5.0, // High rate
          readyCount: 0,
          inPlayCount: 0,
          rebuildingCount: 2, // Only 2 rebuilding
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = processRebuildProgress(availability);

      // Can only rebuild 2, not 5
      expect(result.Dart.readyCount).toBe(2);
      expect(result.Dart.rebuildingCount).toBe(0);
    });

    it('should include acceleration bonus in effective rate', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 1.0,
          readyCount: 0,
          inPlayCount: 0,
          rebuildingCount: 2,
          rebuildProgress: 0,
          accelerationBonus: 1.0 // +1 from effect
        }
      };

      const result = processRebuildProgress(availability);

      // Effective rate = 1.0 + 1.0 = 2.0
      expect(result.Dart.readyCount).toBe(2);
      expect(result.Dart.rebuildingCount).toBe(0);
    });

    it('should process all drone types independently', () => {
      const availability = {
        Dart: {
          copyLimit: 3, rebuildRate: 2.0,
          readyCount: 0, inPlayCount: 0, rebuildingCount: 2,
          rebuildProgress: 0, accelerationBonus: 0
        },
        Mammoth: {
          copyLimit: 1, rebuildRate: 0.5,
          readyCount: 0, inPlayCount: 0, rebuildingCount: 1,
          rebuildProgress: 0, accelerationBonus: 0
        }
      };

      const result = processRebuildProgress(availability);

      expect(result.Dart.readyCount).toBe(2);
      expect(result.Dart.rebuildingCount).toBe(0);

      expect(result.Mammoth.readyCount).toBe(0);
      expect(result.Mammoth.rebuildingCount).toBe(1);
      expect(result.Mammoth.rebuildProgress).toBe(0.5);
    });
  });

  // ========================================
  // ACCELERATION BONUS TESTS
  // ========================================
  describe('applyAccelerationBonus', () => {
    it('should add to existing acceleration bonus', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 1.0,
          readyCount: 1,
          inPlayCount: 1,
          rebuildingCount: 1,
          rebuildProgress: 0,
          accelerationBonus: 0
        }
      };

      const result = applyAccelerationBonus(availability, 'Dart', 0.5);

      expect(result.Dart.accelerationBonus).toBe(0.5);
    });

    it('should stack multiple acceleration bonuses', () => {
      const availability = {
        Dart: {
          copyLimit: 3,
          rebuildRate: 1.0,
          readyCount: 1,
          inPlayCount: 1,
          rebuildingCount: 1,
          rebuildProgress: 0,
          accelerationBonus: 0.5
        }
      };

      const result = applyAccelerationBonus(availability, 'Dart', 0.5);

      expect(result.Dart.accelerationBonus).toBe(1.0);
    });
  });

  // ========================================
  // UTILITY FUNCTION TESTS
  // ========================================
  describe('getReadyCount', () => {
    it('should return ready count for specified drone', () => {
      const availability = {
        Dart: { readyCount: 2, inPlayCount: 1, rebuildingCount: 0, copyLimit: 3, rebuildRate: 2.0, rebuildProgress: 0, accelerationBonus: 0 }
      };

      expect(getReadyCount(availability, 'Dart')).toBe(2);
    });

    it('should return 0 for unknown drone', () => {
      const availability = {};
      expect(getReadyCount(availability, 'Unknown')).toBe(0);
    });
  });

  describe('canDeploy', () => {
    it('should return true if readyCount > 0', () => {
      const availability = {
        Dart: { readyCount: 1, inPlayCount: 2, rebuildingCount: 0, copyLimit: 3, rebuildRate: 2.0, rebuildProgress: 0, accelerationBonus: 0 }
      };

      expect(canDeploy(availability, 'Dart')).toBe(true);
    });

    it('should return false if readyCount is 0', () => {
      const availability = {
        Dart: { readyCount: 0, inPlayCount: 3, rebuildingCount: 0, copyLimit: 3, rebuildRate: 2.0, rebuildProgress: 0, accelerationBonus: 0 }
      };

      expect(canDeploy(availability, 'Dart')).toBe(false);
    });

    it('should return false for unknown drone (safe default)', () => {
      const availability = {};
      expect(canDeploy(availability, 'Unknown')).toBe(false);
    });
  });

  // ========================================
  // PRD SCENARIO TESTS
  // ========================================
  describe('PRD Scenarios', () => {
    describe('Scenario A: Attrition Drone (Firefly)', () => {
      it('should allow sustained pressure with limit 4, rebuild 1.0', () => {
        // Limit: 4, Rebuild: 1.0
        // Player deploys 1 per round, it dies each round
        // Rebuild returns 1 per round -> always can deploy at least 1

        let availability = initializeForCombat([
          { name: 'Firefly', limit: 4, rebuildRate: 1.0 }
        ]);

        // Round 1: Deploy 1
        availability = onDroneDeployed(availability, 'Firefly');
        expect(availability.Firefly.readyCount).toBe(3);
        expect(availability.Firefly.inPlayCount).toBe(1);

        // End of round: Drone destroyed
        availability = onDroneDestroyed(availability, 'Firefly');
        expect(availability.Firefly.rebuildingCount).toBe(1);

        // Round 2 start: Rebuild 1
        availability = processRebuildProgress(availability);
        expect(availability.Firefly.readyCount).toBe(4);
        expect(availability.Firefly.rebuildingCount).toBe(0);

        // Deploy 1 again
        availability = onDroneDeployed(availability, 'Firefly');
        expect(availability.Firefly.readyCount).toBe(3);
      });
    });

    describe('Scenario B: Defensive Interceptor Collapse', () => {
      it('should recover 2 of 3 interceptors in 1 round', () => {
        // Limit: 3, Rebuild: 2.0
        // All 3 destroyed in one round
        // Next round: 2 return

        let availability = initializeForCombat([
          { name: 'Interceptor', limit: 3, rebuildRate: 2.0 }
        ]);

        // Deploy all 3
        availability = onDroneDeployed(availability, 'Interceptor');
        availability = onDroneDeployed(availability, 'Interceptor');
        availability = onDroneDeployed(availability, 'Interceptor');
        expect(availability.Interceptor.inPlayCount).toBe(3);
        expect(availability.Interceptor.readyCount).toBe(0);

        // All 3 destroyed
        availability = onDroneDestroyed(availability, 'Interceptor');
        availability = onDroneDestroyed(availability, 'Interceptor');
        availability = onDroneDestroyed(availability, 'Interceptor');
        expect(availability.Interceptor.rebuildingCount).toBe(3);
        expect(availability.Interceptor.inPlayCount).toBe(0);

        // Round start: 2 rebuild
        availability = processRebuildProgress(availability);
        expect(availability.Interceptor.readyCount).toBe(2);
        expect(availability.Interceptor.rebuildingCount).toBe(1);

        // Next round: final 1 rebuilds
        availability = processRebuildProgress(availability);
        expect(availability.Interceptor.readyCount).toBe(3);
        expect(availability.Interceptor.rebuildingCount).toBe(0);
      });
    });

    describe('Scenario C: Full Board Wipe', () => {
      it('should allow partial redeploy next round after wipe', () => {
        // 5 drone types, various limits
        // After full wipe, each should have at least 1 ready next round

        let availability = initializeForCombat([
          { name: 'Dart', limit: 3, rebuildRate: 2.0 },
          { name: 'Firefly', limit: 4, rebuildRate: 1.0 },
          { name: 'Mammoth', limit: 2, rebuildRate: 1.0 },
          { name: 'Bastion', limit: 2, rebuildRate: 1.0 },
          { name: 'Tempest', limit: 1, rebuildRate: 0.5 }
        ]);

        // Deploy 2 of each (except Tempest which is limit 1)
        for (let i = 0; i < 2; i++) {
          availability = onDroneDeployed(availability, 'Dart');
          availability = onDroneDeployed(availability, 'Firefly');
          availability = onDroneDeployed(availability, 'Mammoth');
          availability = onDroneDeployed(availability, 'Bastion');
        }
        availability = onDroneDeployed(availability, 'Tempest');

        // Destroy all 9 drones
        for (let i = 0; i < 2; i++) {
          availability = onDroneDestroyed(availability, 'Dart');
          availability = onDroneDestroyed(availability, 'Firefly');
          availability = onDroneDestroyed(availability, 'Mammoth');
          availability = onDroneDestroyed(availability, 'Bastion');
        }
        availability = onDroneDestroyed(availability, 'Tempest');

        // Next round rebuild
        availability = processRebuildProgress(availability);

        // Should have at least some ready (no lockout)
        const totalReady =
          availability.Dart.readyCount +
          availability.Firefly.readyCount +
          availability.Mammoth.readyCount +
          availability.Bastion.readyCount +
          availability.Tempest.readyCount;

        expect(totalReady).toBeGreaterThanOrEqual(5); // Should have 8 ready

        // Specifically (based on rebuild rates):
        // Dart: limit 3, rate 2.0 - deployed 2, destroyed 2 -> 1 ready + 2 rebuilt = 3 ready
        expect(availability.Dart.readyCount).toBe(3);
        // Firefly: limit 4, rate 1.0 - deployed 2, destroyed 2 -> 2 ready + 1 rebuilt = 3 ready
        expect(availability.Firefly.readyCount).toBe(3);
        // Mammoth: limit 2, rate 1.0 - deployed 2, destroyed 2 -> 0 ready + 1 rebuilt = 1 ready
        expect(availability.Mammoth.readyCount).toBe(1);
        // Bastion: limit 2, rate 1.0 - deployed 2, destroyed 2 -> 0 ready + 1 rebuilt = 1 ready
        expect(availability.Bastion.readyCount).toBe(1);
        // Tempest: limit 1, rate 0.5 - deployed 1, destroyed 1 -> 0 ready + 0.5 progress = 0 ready
        expect(availability.Tempest.readyCount).toBe(0);
      });
    });

    describe('Scenario D: Mythic Drone (Mammoth equivalent)', () => {
      it('should have 2-round downtime with rebuild rate 0.5', () => {
        let availability = initializeForCombat([
          { name: 'MythicDrone', limit: 1, rebuildRate: 0.5 }
        ]);

        // Deploy the mythic drone
        availability = onDroneDeployed(availability, 'MythicDrone');
        expect(availability.MythicDrone.readyCount).toBe(0);
        expect(availability.MythicDrone.inPlayCount).toBe(1);

        // Mythic destroyed
        availability = onDroneDestroyed(availability, 'MythicDrone');
        expect(availability.MythicDrone.rebuildingCount).toBe(1);

        // Round 1: half rebuilt
        availability = processRebuildProgress(availability);
        expect(availability.MythicDrone.readyCount).toBe(0);
        expect(availability.MythicDrone.rebuildProgress).toBe(0.5);

        // Round 2: fully rebuilt
        availability = processRebuildProgress(availability);
        expect(availability.MythicDrone.readyCount).toBe(1);
        expect(availability.MythicDrone.rebuildingCount).toBe(0);
      });
    });

    describe('Scenario E: Healing / Preservation', () => {
      it('should not trigger rebuild if drone is not destroyed', () => {
        // If a drone is healed before destruction, availability should not change
        let availability = initializeForCombat([
          { name: 'Dart', limit: 3, rebuildRate: 2.0 }
        ]);

        // Deploy 2 drones
        availability = onDroneDeployed(availability, 'Dart');
        availability = onDroneDeployed(availability, 'Dart');

        const before = { ...availability.Dart };

        // Drone is healed (no destruction event)
        // Just process round (no onDroneDestroyed called)
        availability = processRebuildProgress(availability);

        // State should remain the same (no rebuilding started)
        expect(availability.Dart.inPlayCount).toBe(before.inPlayCount);
        expect(availability.Dart.rebuildingCount).toBe(0);
      });
    });
  });

  // ========================================
  // INVARIANT TESTS
  // ========================================
  describe('State Invariants', () => {
    it('should maintain invariant: ready + inPlay + rebuilding <= copyLimit', () => {
      let availability = initializeForCombat([
        { name: 'Dart', limit: 3, rebuildRate: 2.0 }
      ]);

      // Run through various operations
      availability = onDroneDeployed(availability, 'Dart');
      availability = onDroneDeployed(availability, 'Dart');
      availability = onDroneDestroyed(availability, 'Dart');
      availability = processRebuildProgress(availability);

      const total =
        availability.Dart.readyCount +
        availability.Dart.inPlayCount +
        availability.Dart.rebuildingCount;

      expect(total).toBeLessThanOrEqual(availability.Dart.copyLimit);
    });

    it('should never have negative counts', () => {
      let availability = initializeForCombat([
        { name: 'Dart', limit: 3, rebuildRate: 2.0 }
      ]);

      // Try to destroy more than deployed (edge case)
      availability = onDroneDestroyed(availability, 'Dart');
      availability = onDroneDestroyed(availability, 'Dart');

      expect(availability.Dart.readyCount).toBeGreaterThanOrEqual(0);
      expect(availability.Dart.inPlayCount).toBeGreaterThanOrEqual(0);
      expect(availability.Dart.rebuildingCount).toBeGreaterThanOrEqual(0);
    });
  });
});
