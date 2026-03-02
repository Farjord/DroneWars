/**
 * DeploymentProcessor - Lane Capacity Tests
 * TDD: Tests for MAX_DRONES_PER_LANE enforcement in validateDeployment()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TriggerProcessor to avoid circular dependency issues
vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = vi.fn().mockReturnValue({
        triggered: false, newPlayerStates: null, animationEvents: []
      });
    }
  }
}));

vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_DEPLOY: 'ON_DEPLOY' }
}));

import DeploymentProcessor from '../DeploymentProcessor.js';

describe('DeploymentProcessor - lane capacity limit', () => {
  let processor;

  beforeEach(() => {
    processor = new DeploymentProcessor();
  });

  const createMockPlayer = (laneDrones = {}, deployedCounts = {}, appliedUpgrades = {}) => ({
    deployedDroneCounts: deployedCounts,
    appliedUpgrades: appliedUpgrades,
    dronesOnBoard: {
      lane1: laneDrones.lane1 || [],
      lane2: laneDrones.lane2 || [],
      lane3: laneDrones.lane3 || [],
    },
    energy: 10,
    initialDeploymentBudget: 10,
    deploymentBudget: 5,
  });

  const createMockEffectiveStats = (cpuLimit = 10) => ({
    totals: { cpuLimit }
  });

  const makeDrones = (count, name = 'Dart') =>
    Array.from({ length: count }, (_, i) => ({
      id: `${name}_${i}`,
      name,
      hull: 2,
      isExhausted: false,
    }));

  const makeTokens = (count, name = 'Proximity Mine') =>
    Array.from({ length: count }, (_, i) => ({
      id: `${name}_${i}`,
      name,
      hull: 1,
      isToken: true,
    }));

  describe('validateDeployment - lane capacity', () => {
    it('should reject deployment when lane has 5 drones', () => {
      const player = createMockPlayer({ lane1: makeDrones(5) });
      const drone = { name: 'Dart', class: 1 };
      const result = processor.validateDeployment(
        player, drone, 2, 5, createMockEffectiveStats(), 'lane1'
      );
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('full');
    });

    it('should allow deployment when lane has 4 drones', () => {
      const player = createMockPlayer({ lane1: makeDrones(4) });
      const drone = { name: 'Dart', class: 1 };
      const result = processor.validateDeployment(
        player, drone, 2, 4, createMockEffectiveStats(), 'lane1'
      );
      expect(result.isValid).toBe(true);
    });

    it('should count tokens toward capacity', () => {
      const mixed = [...makeDrones(3), ...makeTokens(2)];
      const player = createMockPlayer({ lane1: mixed });
      const drone = { name: 'Dart', class: 1 };
      const result = processor.validateDeployment(
        player, drone, 2, 5, createMockEffectiveStats(), 'lane1'
      );
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('full');
    });

    it('should not affect other lanes', () => {
      const player = createMockPlayer({
        lane1: makeDrones(5),
        lane2: makeDrones(2),
      });
      const drone = { name: 'Dart', class: 1 };
      const result = processor.validateDeployment(
        player, drone, 2, 7, createMockEffectiveStats(), 'lane2'
      );
      expect(result.isValid).toBe(true);
    });

    it('should not interfere with existing validations when no targetLane', () => {
      // Without a targetLane, capacity check should be skipped
      const player = createMockPlayer();
      const drone = { name: 'Dart', class: 1 };
      const result = processor.validateDeployment(
        player, drone, 2, 0, createMockEffectiveStats(), null
      );
      expect(result.isValid).toBe(true);
    });
  });
});
