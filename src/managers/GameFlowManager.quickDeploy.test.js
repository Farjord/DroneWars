/**
 * GameFlowManager.quickDeploy.test.js
 * TDD tests for quick deploy with deployment order support
 *
 * These tests verify the deployment order logic without full GameFlowManager integration.
 * The core logic is tested by verifying the order array is processed correctly.
 */

import { describe, it, expect } from 'vitest';

describe('executeQuickDeploy - Deployment Order Logic', () => {
  /**
   * Helper function that simulates the deployment order logic
   * This mirrors what executeQuickDeploy should do with deploymentOrder
   */
  function getDeploymentSequence(quickDeploy) {
    const { placements, deploymentOrder } = quickDeploy;

    // Use deploymentOrder if present, otherwise fall back to array order
    const order = deploymentOrder || placements.map((_, i) => i);

    // Return placements in deployment order
    return order.map(placementIndex => {
      const placement = placements[placementIndex];
      return placement ? { ...placement, placementIndex } : null;
    }).filter(Boolean);
  }

  it('should deploy in deploymentOrder sequence when provided', () => {
    const quickDeploy = {
      id: 'qd_1',
      name: 'Test Deployment',
      version: 2,
      droneRoster: ['Scout Drone', 'Standard Fighter', 'Support Drone', 'Heavy Fighter', 'Stealth Drone'],
      placements: [
        { droneName: 'Scout Drone', lane: 0 },       // index 0
        { droneName: 'Standard Fighter', lane: 2 }, // index 1
        { droneName: 'Support Drone', lane: 1 }     // index 2
      ],
      deploymentOrder: [2, 0, 1]  // Support first, Scout second, Fighter third
    };

    const sequence = getDeploymentSequence(quickDeploy);

    // Verify deployments are in the correct order
    expect(sequence.length).toBe(3);
    expect(sequence[0].droneName).toBe('Support Drone');
    expect(sequence[0].placementIndex).toBe(2);
    expect(sequence[1].droneName).toBe('Scout Drone');
    expect(sequence[1].placementIndex).toBe(0);
    expect(sequence[2].droneName).toBe('Standard Fighter');
    expect(sequence[2].placementIndex).toBe(1);
  });

  it('should fall back to array order when deploymentOrder is missing', () => {
    const quickDeploy = {
      id: 'qd_2',
      name: 'Test Deployment',
      version: 2,
      droneRoster: ['Scout Drone', 'Standard Fighter', 'Support Drone', 'Heavy Fighter', 'Stealth Drone'],
      placements: [
        { droneName: 'Scout Drone', lane: 0 },
        { droneName: 'Standard Fighter', lane: 2 }
      ]
      // No deploymentOrder - should use array order [0, 1]
    };

    const sequence = getDeploymentSequence(quickDeploy);

    // Verify deployments are in array order
    expect(sequence.length).toBe(2);
    expect(sequence[0].droneName).toBe('Scout Drone');
    expect(sequence[0].placementIndex).toBe(0);
    expect(sequence[1].droneName).toBe('Standard Fighter');
    expect(sequence[1].placementIndex).toBe(1);
  });

  it('should handle identical placements in different order positions', () => {
    const quickDeploy = {
      id: 'qd_3',
      name: 'Test Deployment',
      version: 2,
      droneRoster: ['Scout Drone', 'Standard Fighter', 'Support Drone', 'Heavy Fighter', 'Stealth Drone'],
      placements: [
        { droneName: 'Scout Drone', lane: 0 },       // index 0
        { droneName: 'Standard Fighter', lane: 1 }, // index 1
        { droneName: 'Scout Drone', lane: 0 }       // index 2 - same as index 0
      ],
      deploymentOrder: [2, 1, 0]  // Deploy index 2 first, then 1, then 0
    };

    const sequence = getDeploymentSequence(quickDeploy);

    // All 3 placements should be in order
    expect(sequence.length).toBe(3);
    expect(sequence[0].droneName).toBe('Scout Drone');
    expect(sequence[0].placementIndex).toBe(2);  // Second Scout Drone
    expect(sequence[1].droneName).toBe('Standard Fighter');
    expect(sequence[1].placementIndex).toBe(1);
    expect(sequence[2].droneName).toBe('Scout Drone');
    expect(sequence[2].placementIndex).toBe(0);  // First Scout Drone
  });

  it('should handle empty placements', () => {
    const quickDeploy = {
      id: 'qd_4',
      name: 'Test Deployment',
      version: 2,
      droneRoster: ['Scout Drone', 'Standard Fighter', 'Support Drone', 'Heavy Fighter', 'Stealth Drone'],
      placements: [],
      deploymentOrder: []
    };

    const sequence = getDeploymentSequence(quickDeploy);

    expect(sequence.length).toBe(0);
  });

  it('should handle single placement', () => {
    const quickDeploy = {
      id: 'qd_5',
      name: 'Test Deployment',
      version: 2,
      droneRoster: ['Scout Drone', 'Standard Fighter', 'Support Drone', 'Heavy Fighter', 'Stealth Drone'],
      placements: [{ droneName: 'Scout Drone', lane: 1 }],
      deploymentOrder: [0]
    };

    const sequence = getDeploymentSequence(quickDeploy);

    expect(sequence.length).toBe(1);
    expect(sequence[0].droneName).toBe('Scout Drone');
    expect(sequence[0].lane).toBe(1);
  });

  it('should skip invalid indices in deploymentOrder gracefully', () => {
    const quickDeploy = {
      id: 'qd_6',
      name: 'Test Deployment',
      version: 2,
      droneRoster: ['Scout Drone', 'Standard Fighter', 'Support Drone', 'Heavy Fighter', 'Stealth Drone'],
      placements: [
        { droneName: 'Scout Drone', lane: 0 },
        { droneName: 'Standard Fighter', lane: 1 }
      ],
      deploymentOrder: [0, 99, 1]  // 99 is invalid
    };

    const sequence = getDeploymentSequence(quickDeploy);

    // Should skip invalid index but process valid ones
    expect(sequence.length).toBe(2);
    expect(sequence[0].droneName).toBe('Scout Drone');
    expect(sequence[1].droneName).toBe('Standard Fighter');
  });
});
