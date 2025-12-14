/**
 * DeploymentProcessor - Slot Damage Penalty Tests
 * TDD: Tests for using drone.effectiveLimit when available
 *
 * Bug: validateDeployment uses baseDroneInfo.limit, ignoring drone.effectiveLimit
 * which includes the -1 penalty for damaged slots.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock EffectRouter to avoid circular dependency issues
vi.mock('../EffectRouter.js', () => ({
  default: class MockEffectRouter {
    constructor() {}
    processEffects() { return { success: true }; }
  }
}));

// Now import DeploymentProcessor after mocking
import DeploymentProcessor from './DeploymentProcessor.js';

describe('DeploymentProcessor - slot damage penalty', () => {
  let processor;

  beforeEach(() => {
    processor = new DeploymentProcessor();
  });

  // Standard test setup
  const createMockPlayer = (deployedCounts = {}, appliedUpgrades = {}) => ({
    deployedDroneCounts: deployedCounts,
    appliedUpgrades: appliedUpgrades,
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    energy: 10,
    initialDeploymentBudget: 10,
    deploymentBudget: 5
  });

  const createMockEffectiveStats = (cpuLimit = 10) => ({
    totals: { cpuLimit }
  });

  describe('validateDeployment - effectiveLimit handling', () => {
    it('should use drone.effectiveLimit when available (damaged slot)', () => {
      // Dart has base limit 3, but damaged slot reduces to effectiveLimit 2
      const drone = { name: 'Dart', class: 1, effectiveLimit: 2 };
      const player = createMockPlayer({ 'Dart': 2 }); // Already deployed 2
      const effectiveStats = createMockEffectiveStats();

      const result = processor.validateDeployment(player, drone, 1, 0, effectiveStats, 'lane1');

      // Should be invalid because deployed (2) >= effectiveLimit (2)
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Deployment Limit Reached');
    });

    it('should allow deployment when under effectiveLimit', () => {
      // Dart with effectiveLimit 2 (damaged), only 1 deployed
      const drone = { name: 'Dart', class: 1, effectiveLimit: 2 };
      const player = createMockPlayer({ 'Dart': 1 }); // Only 1 deployed
      const effectiveStats = createMockEffectiveStats();

      const result = processor.validateDeployment(player, drone, 1, 0, effectiveStats, 'lane1');

      // Should be valid because deployed (1) < effectiveLimit (2)
      expect(result.isValid).toBe(true);
    });

    it('should fall back to base limit when effectiveLimit is not set', () => {
      // Normal drone without effectiveLimit (multiplayer or undamaged)
      // Dart has base limit 3
      const drone = { name: 'Dart', class: 1 }; // No effectiveLimit
      const player = createMockPlayer({ 'Dart': 2 }); // 2 deployed
      const effectiveStats = createMockEffectiveStats();

      const result = processor.validateDeployment(player, drone, 1, 0, effectiveStats, 'lane1');

      // Should be valid because deployed (2) < base limit (3)
      expect(result.isValid).toBe(true);
    });

    it('should add upgrade bonuses on top of effectiveLimit', () => {
      // Dart with effectiveLimit 2 (damaged), but +1 from upgrade = 3 effective
      const drone = { name: 'Dart', class: 1, effectiveLimit: 2 };
      const player = createMockPlayer(
        { 'Dart': 2 },
        { 'Dart': [{ mod: { stat: 'limit', value: 1 } }] } // +1 limit upgrade
      );
      const effectiveStats = createMockEffectiveStats();

      const result = processor.validateDeployment(player, drone, 1, 0, effectiveStats, 'lane1');

      // Should be valid: effectiveLimit (2) + upgrade (+1) = 3, deployed is 2
      expect(result.isValid).toBe(true);
    });

    it('should block deployment at exact effectiveLimit with upgrades', () => {
      // effectiveLimit 2 + upgrade +1 = 3, already deployed 3
      const drone = { name: 'Dart', class: 1, effectiveLimit: 2 };
      const player = createMockPlayer(
        { 'Dart': 3 },
        { 'Dart': [{ mod: { stat: 'limit', value: 1 } }] } // +1 limit upgrade
      );
      const effectiveStats = createMockEffectiveStats();

      const result = processor.validateDeployment(player, drone, 1, 0, effectiveStats, 'lane1');

      // Should be invalid: effectiveLimit (2) + upgrade (+1) = 3, deployed is 3
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Deployment Limit Reached');
    });
  });
});
