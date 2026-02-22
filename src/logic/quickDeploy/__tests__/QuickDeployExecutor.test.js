import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuickDeployExecutor from '../QuickDeployExecutor.js';

const { mockExecuteDeployment } = vi.hoisted(() => ({
  mockExecuteDeployment: vi.fn(() => ({
    success: true,
    newPlayerState: { hand: [], dronesOnBoard: { lane1: [{ name: 'Scout' }] } },
    opponentState: null
  }))
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now()),
  getTimestamp: vi.fn(() => Date.now())
}));

vi.mock('../../../data/droneData.js', () => ({
  default: [
    { name: 'Scout', cost: 1, attack: 1, hp: 1 },
    { name: 'Tank', cost: 3, attack: 2, hp: 4 },
    { name: 'Sniper', cost: 2, attack: 3, hp: 2 }
  ]
}));

vi.mock('../../deployment/DeploymentProcessor.js', () => ({
  default: class MockDeploymentProcessor {
    executeDeployment(...args) { return mockExecuteDeployment(...args); }
  }
}));

function createMockGSM(overrides = {}) {
  const state = {
    player1: { hand: [], dronesOnBoard: {} },
    player2: { hand: [], dronesOnBoard: {} },
    placedSections: [],
    opponentPlacedSections: [],
    pendingQuickDeploy: null,
    ...overrides
  };
  return {
    getState: vi.fn(() => JSON.parse(JSON.stringify(state))),
    setState: vi.fn((updates) => Object.assign(state, updates)),
    addLogEntry: vi.fn(),
    _state: state
  };
}

function createMockActionProcessor(opts = {}) {
  return {
    aiPhaseProcessor: opts.withAI ? {
      executeSingleDeployment: vi.fn().mockResolvedValue(undefined),
      finishDeploymentPhase: vi.fn().mockResolvedValue(undefined)
    } : null
  };
}

function createMockTacticalMapStateManager(overrides = {}) {
  const state = { pendingQuickDeploy: null, ...overrides };
  return {
    getState: vi.fn(() => ({ ...state })),
    setState: vi.fn((updates) => Object.assign(state, updates))
  };
}

describe('QuickDeployExecutor', () => {
  let executor;
  let mockGSM;
  let mockAP;
  let mockTMSM;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGSM = createMockGSM();
    mockAP = createMockActionProcessor({ withAI: true });
    mockTMSM = createMockTacticalMapStateManager();
    executor = new QuickDeployExecutor(mockGSM, mockAP, mockTMSM);
  });

  it('deploys drones in deploymentOrder sequence', async () => {
    const quickDeploy = {
      name: 'Rush',
      placements: [
        { droneName: 'Scout', lane: 0 },
        { droneName: 'Tank', lane: 1 }
      ],
      deploymentOrder: [1, 0]
    };

    await executor.execute(quickDeploy);

    // Should call executeDeployment twice
    expect(mockExecuteDeployment).toHaveBeenCalledTimes(2);

    // First call should be placement[1] (Tank) due to deploymentOrder
    const firstCall = mockExecuteDeployment.mock.calls[0];
    expect(firstCall[0].name).toBe('Tank');
    expect(firstCall[1]).toBe('lane2'); // lane index 1 → lane2

    // Second call should be placement[0] (Scout)
    const secondCall = mockExecuteDeployment.mock.calls[1];
    expect(secondCall[0].name).toBe('Scout');
    expect(secondCall[1]).toBe('lane1');
  });

  it('falls back to array order when no deploymentOrder', async () => {
    const quickDeploy = {
      name: 'Default',
      placements: [
        { droneName: 'Scout', lane: 0 },
        { droneName: 'Sniper', lane: 2 }
      ]
    };

    await executor.execute(quickDeploy);

    const calls = mockExecuteDeployment.mock.calls;
    expect(calls[0][0].name).toBe('Scout');
    expect(calls[1][0].name).toBe('Sniper');
  });

  it('interleaves AI deployment after each player drone', async () => {
    const quickDeploy = {
      name: 'Rush',
      placements: [{ droneName: 'Scout', lane: 0 }]
    };

    await executor.execute(quickDeploy);

    expect(mockAP.aiPhaseProcessor.executeSingleDeployment).toHaveBeenCalledOnce();
  });

  it('calls finishDeploymentPhase after all player drones', async () => {
    const quickDeploy = {
      name: 'Rush',
      placements: [{ droneName: 'Scout', lane: 0 }]
    };

    await executor.execute(quickDeploy);

    expect(mockAP.aiPhaseProcessor.finishDeploymentPhase).toHaveBeenCalledOnce();
  });

  it('clears pendingQuickDeploy from both game state and tactical map state', async () => {
    mockTMSM = createMockTacticalMapStateManager({ pendingQuickDeploy: 'qd-1' });
    executor = new QuickDeployExecutor(mockGSM, mockAP, mockTMSM);

    const quickDeploy = {
      name: 'Rush',
      placements: [{ droneName: 'Scout', lane: 0 }]
    };

    await executor.execute(quickDeploy);

    expect(mockGSM.setState).toHaveBeenCalledWith({ pendingQuickDeploy: null });
    expect(mockTMSM.setState).toHaveBeenCalledWith({ pendingQuickDeploy: null });
  });

  it('skips invalid placement indices', async () => {
    const quickDeploy = {
      name: 'Bad',
      placements: [{ droneName: 'Scout', lane: 0 }],
      deploymentOrder: [5, 0] // index 5 doesn't exist
    };

    await executor.execute(quickDeploy);

    expect(mockExecuteDeployment).toHaveBeenCalledOnce();
  });

  it('skips drones not found in collection', async () => {
    const quickDeploy = {
      name: 'Unknown',
      placements: [{ droneName: 'NonexistentDrone', lane: 0 }]
    };

    await executor.execute(quickDeploy);

    expect(mockExecuteDeployment).not.toHaveBeenCalled();
  });

  it('handles failed deployment gracefully', async () => {
    mockExecuteDeployment.mockReturnValueOnce({
      success: false,
      error: 'Lane full'
    });

    const quickDeploy = {
      name: 'Rush',
      placements: [{ droneName: 'Scout', lane: 0 }]
    };

    await executor.execute(quickDeploy);

    // Should NOT call AI deployment after failed deployment
    expect(mockAP.aiPhaseProcessor.executeSingleDeployment).not.toHaveBeenCalled();
    // But finishDeploymentPhase should still be called
    expect(mockAP.aiPhaseProcessor.finishDeploymentPhase).toHaveBeenCalledOnce();
  });

  it('clears pendingQuickDeploy on error', async () => {
    mockExecuteDeployment.mockImplementationOnce(() => {
      throw new Error('Deployment crash');
    });

    const quickDeploy = {
      name: 'Crash',
      placements: [{ droneName: 'Scout', lane: 0 }]
    };

    await executor.execute(quickDeploy);

    expect(mockGSM.setState).toHaveBeenCalledWith({ pendingQuickDeploy: null });
  });

  it('works when no AI processor available', async () => {
    mockAP = createMockActionProcessor({ withAI: false });
    executor = new QuickDeployExecutor(mockGSM, mockAP, mockTMSM);

    const quickDeploy = {
      name: 'NoAI',
      placements: [{ droneName: 'Scout', lane: 0 }]
    };

    // Should not throw
    await executor.execute(quickDeploy);
    expect(mockExecuteDeployment).toHaveBeenCalledOnce();
  });
});
