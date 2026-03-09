import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFireTrigger = vi.fn();

vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class MockTriggerProcessor {
    constructor() {
      this.fireTrigger = mockFireTrigger;
    }
  }
}));
vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: {
    ON_DEPLOY: 'ON_DEPLOY',
    ON_LANE_DEPLOYMENT: 'ON_LANE_DEPLOYMENT',
  },
}));
vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

import DeploymentProcessor from '../DeploymentProcessor.js';

function makePlayerState(overrides = {}) {
  return {
    name: 'P1',
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    deployedDroneCounts: {},
    appliedUpgrades: {},
    energy: 10,
    deploymentBudget: 5,
    initialDeploymentBudget: 10,
    totalDronesDeployed: 0,
    droneAvailability: null,
    shipSections: {},
    ...overrides,
  };
}

function makeOpponentState() {
  return {
    name: 'P2',
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: {},
  };
}

describe('DeploymentProcessor animation ordering', () => {
  let processor;

  beforeEach(() => {
    mockFireTrigger.mockReset();
    processor = new DeploymentProcessor();
    // Stub validateDeployment to always pass
    processor.validateDeployment = vi.fn().mockReturnValue({
      isValid: true,
      budgetCost: 1,
      energyCost: 0,
    });
  });

  it('TELEPORT_IN precedes trigger events with STATE_SNAPSHOT bridge', () => {
    // ON_DEPLOY trigger returns animation events
    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_DEPLOY') {
        return {
          triggered: true,
          newPlayerStates: context.playerStates,
          animationEvents: [{ type: 'TRIGGER_FIRED', abilityName: 'ShieldBoost' }],
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    const drone = { name: 'Bastion', class: 1, hull: 4, attack: 1, shields: 5 };
    const result = processor.executeDeployment(
      drone, 'lane1', 2,
      makePlayerState(), makeOpponentState(),
      { player1: [], player2: [] },
      vi.fn(), 'player1'
    );

    const types = result.animationEvents.map(e => e.type);

    // TELEPORT_IN should come before triggers
    const teleportIdx = types.indexOf('TELEPORT_IN');
    expect(teleportIdx).toBeGreaterThanOrEqual(0);

    // STATE_SNAPSHOT should bridge action and trigger events
    const snapshotIdx = types.indexOf('STATE_SNAPSHOT');
    expect(snapshotIdx).toBeGreaterThan(teleportIdx);

    // TRIGGER_CHAIN_PAUSE between snapshot and triggers
    const pauseIdx = types.indexOf('TRIGGER_CHAIN_PAUSE');
    expect(pauseIdx).toBeGreaterThan(snapshotIdx);

    // Trigger events after pause
    const triggerIdx = types.indexOf('TRIGGER_FIRED');
    expect(triggerIdx).toBeGreaterThan(pauseIdx);
  });
});
