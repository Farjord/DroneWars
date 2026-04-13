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

function makeOpponentWithMine(lane = 'lane1') {
  const mine = { id: 'p2_mine_0001', name: 'InhibitorMine', isExhausted: false, hull: 1, attack: 0 };
  const dronesOnBoard = { lane1: [], lane2: [], lane3: [] };
  dronesOnBoard[lane] = [mine];
  return {
    name: 'P2',
    dronesOnBoard,
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

  it('ON_DEPLOY-only: DEPLOYMENT_PRE_TRIGGER + TELEPORT_IN precede trigger events, no bridge snapshot', () => {
    // ON_DEPLOY trigger returns animation events (no mine trigger)
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

    const events = result.animationEvents;
    const types = events.map(e => e.type);

    // DEPLOYMENT_PRE_TRIGGER meta event carries preDeployTriggerState and comes first
    const metaIdx = types.indexOf('DEPLOYMENT_PRE_TRIGGER');
    expect(metaIdx).toBe(0);
    expect(events[metaIdx].preDeployTriggerState).toBeDefined();

    // TELEPORT_IN follows the meta event
    const teleportIdx = types.indexOf('TELEPORT_IN');
    expect(teleportIdx).toBeGreaterThan(metaIdx);

    // No bridge STATE_SNAPSHOT for ON_DEPLOY-only triggers — drone is
    // established by the TELEPORT_IN animation itself
    expect(types).not.toContain('STATE_SNAPSHOT');

    // TRIGGER_CHAIN_PAUSE follows TELEPORT_IN
    const pauseIdx = types.indexOf('TRIGGER_CHAIN_PAUSE');
    expect(pauseIdx).toBeGreaterThan(teleportIdx);

    // Trigger event follows pause
    const triggerIdx = types.indexOf('TRIGGER_FIRED');
    expect(triggerIdx).toBeGreaterThan(pauseIdx);

    // Trigger events tagged post-state so client plays them after TELEPORT_IN
    expect(events[pauseIdx].timingOverride).toBe('post-state');
    expect(events[triggerIdx].timingOverride).toBe('post-state');
  });

  it('returns preDeployTriggerState capturing state before ON_DEPLOY fires', () => {
    // ON_DEPLOY marks the opponent drone
    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_DEPLOY') {
        const modified = JSON.parse(JSON.stringify(context.playerStates));
        // Simulate Scanner marking an opponent drone
        const oppDrones = modified.player2?.dronesOnBoard?.lane1 ?? [];
        if (oppDrones[0]) oppDrones[0].isMarked = true;
        return {
          triggered: true,
          newPlayerStates: modified,
          animationEvents: [{ type: 'TRIGGER_FIRED', abilityName: 'Target Scanner' }],
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    const opponentWithDrone = {
      ...makeOpponentState(),
      dronesOnBoard: { lane1: [{ id: 'p2_d_0001', name: 'Dart', isMarked: false }], lane2: [], lane3: [] },
    };

    const drone = { name: 'Scanner', class: 1, hull: 2, attack: 1, shields: 0 };
    const result = processor.executeDeployment(
      drone, 'lane2', 2,
      makePlayerState(), opponentWithDrone,
      { player1: [], player2: [] },
      vi.fn(), 'player1'
    );

    // preDeployTriggerState: captured before ON_DEPLOY → opponent drone NOT marked
    expect(result.preDeployTriggerState).toBeDefined();
    const preOpponentDrones = result.preDeployTriggerState.player2.dronesOnBoard.lane1;
    expect(preOpponentDrones[0].isMarked).toBe(false);

    // finalPlayerState / opponentState: after ON_DEPLOY → opponent drone IS marked
    expect(result.opponentState.dronesOnBoard.lane1[0].isMarked).toBe(true);
  });

  it('bridge STATE_SNAPSHOT uses pre-mine state when ON_LANE_DEPLOYMENT fires', () => {
    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_LANE_DEPLOYMENT') {
        // Simulate mine trigger: exhaust deployed drone, remove mine
        const modifiedStates = JSON.parse(JSON.stringify(context.playerStates));
        const deployedDrone = modifiedStates.player1.dronesOnBoard.lane1.find(d => d.name === 'Spectre');
        if (deployedDrone) deployedDrone.isExhausted = true;
        modifiedStates.player2.dronesOnBoard.lane1 = modifiedStates.player2.dronesOnBoard.lane1.filter(
          d => d.name !== 'InhibitorMine'
        );
        return {
          triggered: true,
          newPlayerStates: modifiedStates,
          animationEvents: [{ type: 'TRIGGER_FIRED', abilityName: 'Inhibitor Detonation' }],
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    const drone = { name: 'Spectre', class: 1, hull: 3, attack: 2, shields: 0 };
    const result = processor.executeDeployment(
      drone, 'lane1', 2,
      makePlayerState(), makeOpponentWithMine(),
      { player1: [], player2: [] },
      vi.fn(), 'player1'
    );

    const snapshot = result.animationEvents.find(e => e.type === 'STATE_SNAPSHOT');
    expect(snapshot).toBeDefined();

    // Bridge snapshot should show drone NOT exhausted (pre-mine state)
    const snapshotDrone = snapshot.snapshotPlayerStates.player1.dronesOnBoard.lane1
      .find(d => d.name === 'Spectre');
    expect(snapshotDrone).toBeDefined();
    expect(snapshotDrone.isExhausted).toBe(false);

    // Bridge snapshot should still have the mine present
    const snapshotMine = snapshot.snapshotPlayerStates.player2.dronesOnBoard.lane1
      .find(d => d.name === 'InhibitorMine');
    expect(snapshotMine).toBeDefined();
  });

  it('returns preMineIntermediateState with pre-mine player states', () => {
    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_LANE_DEPLOYMENT') {
        const modifiedStates = JSON.parse(JSON.stringify(context.playerStates));
        const deployedDrone = modifiedStates.player1.dronesOnBoard.lane1.find(d => d.name === 'Spectre');
        if (deployedDrone) deployedDrone.isExhausted = true;
        return {
          triggered: true,
          newPlayerStates: modifiedStates,
          animationEvents: [{ type: 'TRIGGER_FIRED' }],
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    const drone = { name: 'Spectre', class: 1, hull: 3, attack: 2, shields: 0 };
    const result = processor.executeDeployment(
      drone, 'lane1', 2,
      makePlayerState(), makeOpponentWithMine(),
      { player1: [], player2: [] },
      vi.fn(), 'player1'
    );

    // preMineIntermediateState should exist
    expect(result.preMineIntermediateState).toBeDefined();

    // Pre-mine: drone NOT exhausted
    const preMineDrone = result.preMineIntermediateState.player1.dronesOnBoard.lane1
      .find(d => d.name === 'Spectre');
    expect(preMineDrone.isExhausted).toBe(false);

    // Final: drone IS exhausted
    const finalDrone = result.newPlayerState.dronesOnBoard.lane1
      .find(d => d.name === 'Spectre');
    expect(finalDrone.isExhausted).toBe(true);
  });

  it('preMineIntermediateState includes ON_DEPLOY effects but not mine effects', () => {
    mockFireTrigger.mockImplementation((triggerType, context) => {
      if (triggerType === 'ON_DEPLOY') {
        // ON_DEPLOY adds a stat mod
        const modifiedStates = JSON.parse(JSON.stringify(context.playerStates));
        const deployedDrone = modifiedStates.player1.dronesOnBoard.lane1.find(d => d.name === 'Spectre');
        if (deployedDrone) {
          deployedDrone.statMods = [{ stat: 'attack', value: 1, source: 'DeployBoost' }];
        }
        return {
          triggered: true,
          newPlayerStates: modifiedStates,
          animationEvents: [{ type: 'STAT_BUFF' }],
        };
      }
      if (triggerType === 'ON_LANE_DEPLOYMENT') {
        // Mine trigger exhausts the drone
        const modifiedStates = JSON.parse(JSON.stringify(context.playerStates));
        const deployedDrone = modifiedStates.player1.dronesOnBoard.lane1.find(d => d.name === 'Spectre');
        if (deployedDrone) deployedDrone.isExhausted = true;
        return {
          triggered: true,
          newPlayerStates: modifiedStates,
          animationEvents: [{ type: 'TRIGGER_FIRED' }],
        };
      }
      return { triggered: false, newPlayerStates: null, animationEvents: [] };
    });

    const drone = { name: 'Spectre', class: 1, hull: 3, attack: 2, shields: 0 };
    const result = processor.executeDeployment(
      drone, 'lane1', 2,
      makePlayerState(), makeOpponentWithMine(),
      { player1: [], player2: [] },
      vi.fn(), 'player1'
    );

    const preMineDrone = result.preMineIntermediateState.player1.dronesOnBoard.lane1
      .find(d => d.name === 'Spectre');
    // Should have ON_DEPLOY stat mod
    expect(preMineDrone.statMods).toEqual([{ stat: 'attack', value: 1, source: 'DeployBoost' }]);
    // Should NOT be exhausted (mine effect not yet applied)
    expect(preMineDrone.isExhausted).toBe(false);
  });

  it('no regression — preMineIntermediateState returned when no triggers fire', () => {
    mockFireTrigger.mockReturnValue({
      triggered: false, newPlayerStates: null, animationEvents: [],
    });

    const drone = { name: 'Spectre', class: 1, hull: 3, attack: 2, shields: 0 };
    const result = processor.executeDeployment(
      drone, 'lane1', 2,
      makePlayerState(), makeOpponentState(),
      { player1: [], player2: [] },
      vi.fn(), 'player1'
    );

    // preMineIntermediateState should still be returned
    expect(result.preMineIntermediateState).toBeDefined();

    // Should functionally match newPlayerState (no trigger modifications)
    const preMineDrone = result.preMineIntermediateState.player1.dronesOnBoard.lane1
      .find(d => d.name === 'Spectre');
    const finalDrone = result.newPlayerState.dronesOnBoard.lane1
      .find(d => d.name === 'Spectre');
    expect(preMineDrone.isExhausted).toBe(finalDrone.isExhausted);
  });

  it('TELEPORT_IN is NOT preceded by STATE_SNAPSHOT (timing override guard)', () => {
    // Deployment places TELEPORT_IN in actionEvents (before STATE_SNAPSHOT).
    // This ensures the mapAnimationEvents timing override (if it existed) would never trigger.
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
    const teleportIdx = types.indexOf('TELEPORT_IN');
    expect(teleportIdx).toBeGreaterThanOrEqual(0);

    // The event immediately before TELEPORT_IN must NOT be STATE_SNAPSHOT
    if (teleportIdx > 0) {
      expect(types[teleportIdx - 1]).not.toBe('STATE_SNAPSHOT');
    }
  });
});
