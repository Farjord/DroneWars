import { describe, it, expect, vi, beforeEach } from 'vitest';
import RoundInitializationProcessor from '../RoundInitializationProcessor.js';

vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now()),
  getTimestamp: vi.fn(() => Date.now())
}));

vi.mock('../../services/GameDataService.js', () => ({
  default: {
    getInstance: vi.fn(() => ({
      getEffectiveShipStats: vi.fn(() => ({
        totals: {
          energyPerTurn: 3,
          initialDeployment: 5,
          deploymentBudget: 4,
          shieldsPerTurn: 2
        }
      }))
    }))
  }
}));

vi.mock('../../logic/round/RoundManager.js', () => ({
  default: {
    readyDronesAndRestoreShields: vi.fn((player) => ({ ...player, exhausted: false })),
    processRoundStartTriggers: vi.fn(() => null)
  }
}));

vi.mock('../../logic/EffectRouter.js', () => ({
  default: vi.fn()
}));

vi.mock('../../logic/availability/DroneAvailabilityManager.js', () => ({
  processRebuildProgress: vi.fn((availability) => availability)
}));

vi.mock('../../logic/combat/LaneControlCalculator.js', () => ({
  LaneControlCalculator: {
    calculateLaneControl: vi.fn(() => ({ lane1: null, lane2: null, lane3: null }))
  }
}));

vi.mock('../../utils/cardDrawUtils.js', () => ({
  performAutomaticDraw: vi.fn(() => ({
    player1: { hand: [{ name: 'card1' }] },
    player2: { hand: [{ name: 'card2' }] }
  }))
}));

function createMockGameStateManager(overrides = {}) {
  const state = {
    roundNumber: 0,
    turn: 0,
    gameMode: 'local',
    turnPhase: 'placement',
    player1: { hand: [], dronesOnBoard: {}, energy: 0 },
    player2: { hand: [], dronesOnBoard: {}, energy: 0 },
    placedSections: [],
    opponentPlacedSections: [],
    shieldsToAllocate: 0,
    opponentShieldsToAllocate: 0,
    pendingQuickDeploy: null,
    quickDeployments: [],
    ...overrides
  };

  return {
    getState: vi.fn(() => ({ ...state })),
    get: vi.fn((key) => state[key]),
    setState: vi.fn((updates) => Object.assign(state, updates)),
    _state: state
  };
}

function createMockActionProcessor() {
  return {
    processFirstPlayerDetermination: vi.fn().mockResolvedValue({ firstPlayer: 'player1' }),
    queueAction: vi.fn().mockResolvedValue(undefined),
    p2pManager: null
  };
}

describe('RoundInitializationProcessor', () => {
  let processor;
  let mockGSM;
  let mockAP;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGSM = createMockGameStateManager();
    mockAP = createMockActionProcessor();
    processor = new RoundInitializationProcessor(mockGSM, mockAP);
  });

  // --- Step 1: Game stage transition & round number ---

  describe('Step 1: Stage + round number', () => {
    it('signals gameStageTransitioned when not in roundLoop', async () => {
      const result = await processor.process({ isRoundLoop: false });
      expect(result.gameStageTransitioned).toBe(true);
    });

    it('does not signal gameStageTransitioned when already in roundLoop', async () => {
      const result = await processor.process({ isRoundLoop: true });
      expect(result.gameStageTransitioned).toBe(false);
    });

    it('initializes round 1 when roundNumber is 0', async () => {
      await processor.process({ isRoundLoop: false });
      expect(mockGSM.setState).toHaveBeenCalledWith({ roundNumber: 1, turn: 1 });
    });

    it('does not re-initialize round number when already > 0', async () => {
      mockGSM = createMockGameStateManager({ roundNumber: 2 });
      processor = new RoundInitializationProcessor(mockGSM, mockAP);

      await processor.process({ isRoundLoop: true });

      const roundInitCalls = mockGSM.setState.mock.calls.filter(
        call => call[0].roundNumber === 1 && call[0].turn === 1
      );
      expect(roundInitCalls.length).toBe(0);
    });
  });

  // --- Step 2: First player determination ---

  describe('Step 2: First player', () => {
    it('calls processFirstPlayerDetermination', async () => {
      await processor.process({ isRoundLoop: false });
      expect(mockAP.processFirstPlayerDetermination).toHaveBeenCalledOnce();
    });
  });

  // --- Step 3: Energy reset ---

  describe('Step 3: Energy reset', () => {
    it('queues energyReset action', async () => {
      await processor.process({ isRoundLoop: false });

      const energyResetCalls = mockAP.queueAction.mock.calls.filter(
        call => call[0].type === 'energyReset'
      );
      expect(energyResetCalls.length).toBe(1);
      expect(energyResetCalls[0][0].payload).toHaveProperty('player1');
      expect(energyResetCalls[0][0].payload).toHaveProperty('player2');
      expect(energyResetCalls[0][0].payload).toHaveProperty('shieldsToAllocate');
    });

    it('sets initialDeploymentBudget on round 1, deploymentBudget on round 2+', async () => {
      // Round 1 scenario: roundNumber starts at 0, gets set to 1
      await processor.process({ isRoundLoop: false });

      const energyCall = mockAP.queueAction.mock.calls.find(c => c[0].type === 'energyReset');
      // Round 1: initialDeployment = 5, deploymentBudget = 0
      expect(energyCall[0].payload.player1.initialDeploymentBudget).toBe(5);
      expect(energyCall[0].payload.player1.deploymentBudget).toBe(0);
    });

    it('sets shields to 0 on round 1', async () => {
      await processor.process({ isRoundLoop: false });

      const energyCall = mockAP.queueAction.mock.calls.find(c => c[0].type === 'energyReset');
      expect(energyCall[0].payload.shieldsToAllocate).toBe(0);
      expect(energyCall[0].payload.opponentShieldsToAllocate).toBe(0);
    });
  });

  // --- Step 4: Card draw ---

  describe('Step 4: Card draw', () => {
    it('queues draw action', async () => {
      await processor.process({ isRoundLoop: false });

      const drawCalls = mockAP.queueAction.mock.calls.filter(c => c[0].type === 'draw');
      expect(drawCalls.length).toBe(1);
    });
  });

  // --- Step 5: Quick deploy ---

  describe('Step 5: Quick deploy', () => {
    it('executes quick deploy on round 1 when pending', async () => {
      mockGSM = createMockGameStateManager({
        roundNumber: 0,
        pendingQuickDeploy: 'qd-1',
        quickDeployments: [{ id: 'qd-1', name: 'Rush', placements: [] }]
      });
      processor = new RoundInitializationProcessor(mockGSM, mockAP);

      const executeQD = vi.fn().mockResolvedValue(undefined);
      const result = await processor.process({
        isRoundLoop: false,
        executeQuickDeploy: executeQD
      });

      expect(executeQD).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'qd-1', name: 'Rush' })
      );
      expect(result.quickDeployExecuted).toBe(true);
    });

    it('does not execute quick deploy when no callback provided', async () => {
      mockGSM = createMockGameStateManager({
        roundNumber: 0,
        pendingQuickDeploy: 'qd-1',
        quickDeployments: [{ id: 'qd-1', name: 'Rush', placements: [] }]
      });
      processor = new RoundInitializationProcessor(mockGSM, mockAP);

      const result = await processor.process({ isRoundLoop: false });
      expect(result.quickDeployExecuted).toBe(false);
    });

    it('does not execute quick deploy on round 2+', async () => {
      mockGSM = createMockGameStateManager({
        roundNumber: 2,
        pendingQuickDeploy: 'qd-1',
        quickDeployments: [{ id: 'qd-1', name: 'Rush', placements: [] }]
      });
      processor = new RoundInitializationProcessor(mockGSM, mockAP);

      const executeQD = vi.fn().mockResolvedValue(undefined);
      const result = await processor.process({
        isRoundLoop: true,
        executeQuickDeploy: executeQD
      });

      expect(executeQD).not.toHaveBeenCalled();
      expect(result.quickDeployExecuted).toBe(false);
    });

    it('clears pendingQuickDeploy when template not found', async () => {
      mockGSM = createMockGameStateManager({
        roundNumber: 0,
        pendingQuickDeploy: 'nonexistent',
        quickDeployments: []
      });
      processor = new RoundInitializationProcessor(mockGSM, mockAP);

      const executeQD = vi.fn();
      await processor.process({ isRoundLoop: false, executeQuickDeploy: executeQD });

      expect(executeQD).not.toHaveBeenCalled();
      expect(mockGSM.setState).toHaveBeenCalledWith({ pendingQuickDeploy: null });
    });
  });

  // --- Full sequence ordering ---

  describe('Action sequence ordering', () => {
    it('queues actions in correct order: energyReset → draw', async () => {
      await processor.process({ isRoundLoop: false });

      const actionTypes = mockAP.queueAction.mock.calls.map(c => c[0].type);
      const energyIdx = actionTypes.indexOf('energyReset');
      const drawIdx = actionTypes.indexOf('draw');

      expect(energyIdx).toBeLessThan(drawIdx);
    });

    it('calls firstPlayerDetermination before energyReset', async () => {
      const callOrder = [];
      mockAP.processFirstPlayerDetermination.mockImplementation(() => {
        callOrder.push('firstPlayer');
        return Promise.resolve({ firstPlayer: 'player1' });
      });
      mockAP.queueAction.mockImplementation((action) => {
        callOrder.push(action.type);
        return Promise.resolve();
      });

      await processor.process({ isRoundLoop: false });

      expect(callOrder.indexOf('firstPlayer')).toBeLessThan(callOrder.indexOf('energyReset'));
    });
  });
});
