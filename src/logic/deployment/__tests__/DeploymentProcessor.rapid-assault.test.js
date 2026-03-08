/**
 * DeploymentProcessor - Trigger Usage Initialization Tests
 * Tests for initializing triggerUsesMap when deploying drones
 *
 * When drones are deployed, they should have triggerUsesMap initialized to {}
 * so that triggered abilities (like RAPID/ASSAULT) can be used in the current round.
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

// Mock statsCalculator
vi.mock('../../statsCalculator.js', () => ({
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
import DeploymentProcessor from '../DeploymentProcessor.js';

describe('DeploymentProcessor - trigger usage initialization', () => {
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

  const placedSections = {
    player1: ['core', null, null],
    player2: ['core', null, null]
  };

  it('should initialize triggerUsesMap as empty when drone is deployed', () => {
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

    // Assert: Deployed drone should have triggerUsesMap initialized
    const deployedDrone = result.newPlayerState.dronesOnBoard.lane1[0];
    expect(deployedDrone.triggerUsesMap).toEqual({});
  });

  it('should initialize triggerUsesMap for drones with triggered abilities', () => {
    // Setup: Deploy a Blitz (has RAPID triggered ability)
    const blitzDrone = {
      name: 'Blitz',
      class: 2,
      attack: 2,
      hull: 2,
      shields: 1,
      speed: 5,
      abilities: [{
        name: 'Rapid Response',
        type: 'TRIGGERED',
        trigger: 'ON_MOVE',
        usesPerRound: 1,
        keywordIcon: 'RAPID',
        effects: [{ type: 'DOES_NOT_EXHAUST' }]
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

    // Assert: Deployed drone should have triggerUsesMap initialized empty
    const deployedDrone = result.newPlayerState.dronesOnBoard.lane1[0];
    expect(deployedDrone.triggerUsesMap).toEqual({});
  });
});
