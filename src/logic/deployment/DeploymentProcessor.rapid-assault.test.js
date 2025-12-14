/**
 * DeploymentProcessor - RAPID/ASSAULT Initialization Tests
 * TDD: Tests for initializing rapidUsed and assaultUsed flags when deploying drones
 *
 * When drones are deployed, they should have rapidUsed and assaultUsed set to false
 * so that abilities can be used in the current round if applicable.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock EffectRouter to avoid circular dependency issues
vi.mock('../EffectRouter.js', () => ({
  default: class MockEffectRouter {
    constructor() {}
    processEffects() { return { success: true }; }
  }
}));

// Mock statsCalculator
vi.mock('../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn((drone) => ({
    attack: drone.attack || 1,
    speed: drone.speed || 1,
    maxShields: drone.shields || 1,
    keywords: new Set()
  })),
  calculateEffectiveShipStats: vi.fn(() => ({
    totals: { cpuLimit: 10 }
  }))
}));

// Now import DeploymentProcessor after mocking
import DeploymentProcessor from './DeploymentProcessor.js';

describe('DeploymentProcessor - RAPID/ASSAULT initialization', () => {
  let processor;

  beforeEach(() => {
    processor = new DeploymentProcessor();
  });

  // Standard test setup
  const createMockPlayer = (overrides = {}) => ({
    name: 'Player 1',
    deployedDroneCounts: {},
    appliedUpgrades: {},
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    energy: 10,
    initialDeploymentBudget: 10,
    deploymentBudget: 5,
    totalDronesDeployed: 0,
    ...overrides
  });

  const createMockOpponent = () => ({
    name: 'Player 2',
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    appliedUpgrades: {},
    deployedDroneCounts: {}
  });

  const createMockEffectiveStats = () => ({
    totals: { cpuLimit: 10 }
  });

  const placedSections = {
    player1: ['core', null, null],
    player2: ['core', null, null]
  };

  it('should initialize rapidUsed as false when drone is deployed', () => {
    // EXPLANATION: When any drone is deployed, it should have rapidUsed=false
    // so that if it has the RAPID ability, it can use it immediately.

    // Setup: Deploy a Dart
    const drone = {
      name: 'Dart',
      class: 1,
      attack: 1,
      hull: 1,
      shields: 1,
      speed: 6,
      abilities: []
    };
    const player = createMockPlayer();
    const opponent = createMockOpponent();

    // Action: Deploy the drone
    const result = processor.executeDeployment(
      drone,
      'lane1',
      2,  // turn > 1 uses deploymentBudget
      player,
      opponent,
      placedSections,
      vi.fn(),  // logCallback
      'player1'
    );

    // Assert: Deployed drone should have rapidUsed=false
    const deployedDrone = result.newPlayerState.dronesOnBoard.lane1[0];
    expect(deployedDrone.rapidUsed).toBe(false);
  });

  it('should initialize assaultUsed as false when drone is deployed', () => {
    // EXPLANATION: When any drone is deployed, it should have assaultUsed=false
    // so that if it has the ASSAULT ability, it can use it immediately.

    // Setup: Deploy a Talon
    const drone = {
      name: 'Talon',
      class: 2,
      attack: 3,
      hull: 2,
      shields: 1,
      speed: 4,
      abilities: []
    };
    const player = createMockPlayer();
    const opponent = createMockOpponent();

    // Action: Deploy the drone
    const result = processor.executeDeployment(
      drone,
      'lane1',
      2,
      player,
      opponent,
      placedSections,
      vi.fn(),
      'player1'
    );

    // Assert: Deployed drone should have assaultUsed=false
    const deployedDrone = result.newPlayerState.dronesOnBoard.lane1[0];
    expect(deployedDrone.assaultUsed).toBe(false);
  });

  it('should initialize both rapidUsed and assaultUsed for all deployed drones', () => {
    // EXPLANATION: All deployed drones should have both flags initialized,
    // regardless of whether they have those abilities or not.

    // Setup: Deploy a Blitz (has RAPID ability)
    const blitzDrone = {
      name: 'Blitz',
      class: 2,
      attack: 2,
      hull: 2,
      shields: 1,
      speed: 5,
      abilities: [{
        name: 'Rapid Response',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'RAPID' }
      }]
    };
    const player = createMockPlayer();
    const opponent = createMockOpponent();

    // Action: Deploy the drone
    const result = processor.executeDeployment(
      blitzDrone,
      'lane1',
      2,
      player,
      opponent,
      placedSections,
      vi.fn(),
      'player1'
    );

    // Assert: Deployed drone should have both flags initialized to false
    const deployedDrone = result.newPlayerState.dronesOnBoard.lane1[0];
    expect(deployedDrone.rapidUsed).toBe(false);
    expect(deployedDrone.assaultUsed).toBe(false);
  });
});
