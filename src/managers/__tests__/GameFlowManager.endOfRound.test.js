// ========================================
// GAMEFLOWMANAGER END OF ROUND PHASE TESTS
// ========================================
// Tests the roundEnd automatic phase: banner, trigger processing, startNewRound

import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameFlowManager from '../GameFlowManager.js';
import PhaseManager from '../PhaseManager.js';
import RoundManager from '../../logic/round/RoundManager.js';
import { createMockGameStateManager, createMockPlayer } from '../../test/helpers/phaseTestHelpers.js';

// Mock RoundManager
vi.mock('../../logic/round/RoundManager.js', () => ({
  default: {
    processRoundEndTriggers: vi.fn(() => ({
      player1: { hand: [], dronesOnBoard: {} },
      player2: { hand: [], dronesOnBoard: {} },
      animationEvents: []
    })),
    readyDronesAndRestoreShields: vi.fn((player) => ({ ...player })),
    drawToHandLimit: vi.fn((player) => player),
  }
}));

// Mock other imports used by GameFlowManager
vi.mock('../../logic/map/shipPlacementUtils.js', () => ({
  initializeShipPlacement: vi.fn()
}));
vi.mock('../../services/GameDataService.js', () => ({
  default: { getInstance: vi.fn(() => ({ getEffectiveShipStats: vi.fn(() => ({ totals: { energyPerTurn: 5, handLimit: 5, deploymentBudget: 3, initialDeployment: 2, shieldsPerTurn: 0 } })) })) }
}));
vi.mock('../../logic/gameLogic.js', () => ({ gameEngine: {} }));
vi.mock('../TacticalMapStateManager.js', () => ({ default: {} }));
vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(), timingLog: vi.fn(), getTimestamp: vi.fn()
}));
vi.mock('../../utils/flowVerification.js', () => ({
  flowCheckpoint: vi.fn()
}));
vi.mock('../../utils/stateHelpers.js', () => ({
  countDrones: vi.fn(() => 0)
}));
vi.mock('../../logic/phase/phaseDisplayUtils.js', () => ({
  SEQUENTIAL_PHASES: ['deployment', 'action']
}));
vi.mock('../../logic/actions/CommitmentStrategy.js', () => ({
  isPreGameComplete: vi.fn(() => true)
}));
vi.mock('../../logic/phase/PhaseRequirementChecker.js', () => ({
  default: class { isPhaseRequired() { return true; } }
}));
vi.mock('../RoundInitializationProcessor.js', () => ({
  default: class {
    constructor() {}
    async process() { return { gameStageTransitioned: false, quickDeployExecuted: false }; }
  }
}));
vi.mock('../../logic/availability/DroneAvailabilityManager.js', () => ({
  processRebuildProgress: vi.fn((a) => a)
}));
vi.mock('../../logic/combat/LaneControlCalculator.js', () => ({
  LaneControlCalculator: { calculateLaneControl: vi.fn(() => ({})) }
}));
vi.mock('../../logic/cards/cardDrawUtils.js', () => ({
  performAutomaticDraw: vi.fn((gs) => ({ player1: gs.player1, player2: gs.player2 }))
}));

describe('GameFlowManager - End of Round Phase', () => {
  let gfm;
  let mockGameStateManager;
  let mockActionProcessor;
  let phaseManager;

  beforeEach(() => {
    // Reset singleton
    GameFlowManager.instance = null;

    mockGameStateManager = createMockGameStateManager();
    const state = mockGameStateManager.getState();
    state.turnPhase = 'action';
    state.gameStage = 'roundLoop';
    state.roundNumber = 1;
    state.firstPlayerOfRound = 'player1';
    state.passInfo = { player1Passed: true, player2Passed: true, firstPasser: 'player2' };
    state.placedSections = {};
    state.opponentPlacedSections = {};
    state.player1 = createMockPlayer('player1');
    state.player2 = createMockPlayer('player2');
    mockGameStateManager.setState(state);

    mockActionProcessor = {
      processPhaseTransition: vi.fn(),
      processTurnTransition: vi.fn(),
      processPlayerPass: vi.fn(),
      setPhaseManager: vi.fn(),
      processFirstPlayerDetermination: vi.fn(async () => ({ success: true, firstPlayer: 'player1' })),
      queueAction: vi.fn(async () => ({ success: true })),
      executeAndCaptureAnimations: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
    };

    gfm = new GameFlowManager();
    phaseManager = new PhaseManager(mockGameStateManager, { isAuthority: true });

    gfm.initialize(mockGameStateManager, mockActionProcessor);
    gfm.phaseManager = phaseManager;
    gfm.gameStage = 'roundLoop';
    gfm.isPhaseAuthority = true;

    vi.clearAllMocks();
  });

  describe('Phase classification', () => {
    it('roundEnd is in AUTOMATIC_PHASES', () => {
      expect(gfm.AUTOMATIC_PHASES).toContain('roundEnd');
    });
  });

  describe('processPhaseLogicOnly routing', () => {
    it('routes roundEnd to processRoundEnd()', async () => {
      // Spy on processRoundEnd to confirm routing
      const spy = vi.spyOn(gfm, 'processRoundEnd').mockResolvedValue(null);
      await gfm.processPhaseLogicOnly('roundEnd', 'action');
      expect(spy).toHaveBeenCalledWith('action');
    });
  });

  describe('processRoundEnd', () => {
    it('emits END OF ROUND phase announcement', async () => {
      // Stub startNewRound to prevent full round transition
      vi.spyOn(gfm, 'startNewRound').mockResolvedValue();

      await gfm.processRoundEnd('action');

      expect(mockActionProcessor.executeAndCaptureAnimations).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            animationName: 'PHASE_ANNOUNCEMENT',
            payload: expect.objectContaining({ phase: 'roundEnd', text: 'END OF ROUND' })
          })
        ]),
        true
      );
    });

    it('calls RoundManager.processRoundEndTriggers with correct firstPlayerOfRound', async () => {
      vi.spyOn(gfm, 'startNewRound').mockResolvedValue();

      await gfm.processRoundEnd('action');

      expect(RoundManager.processRoundEndTriggers).toHaveBeenCalledWith(
        expect.anything(), // player1State
        expect.anything(), // player2State
        expect.anything(), // placedSections
        expect.any(Function), // logCallback
        'player1' // firstPlayerOfRound from game state
      );
    });

    it('queues trigger results when triggers fire', async () => {
      vi.spyOn(gfm, 'startNewRound').mockResolvedValue();
      RoundManager.processRoundEndTriggers.mockReturnValueOnce({
        player1: { hand: [], dronesOnBoard: {}, modified: true },
        player2: { hand: [], dronesOnBoard: {} },
        animationEvents: [{ type: 'effect' }]
      });

      await gfm.processRoundEnd('action');

      const triggerCalls = mockActionProcessor.queueAction.mock.calls.filter(
        c => c[0].type === 'roundEndTriggers'
      );
      expect(triggerCalls.length).toBe(1);
      expect(triggerCalls[0][0].payload.player1.modified).toBe(true);
    });

    it('includes animationEvents in queueAction payload when triggers fire', async () => {
      vi.spyOn(gfm, 'startNewRound').mockResolvedValue();
      const mockAnimEvents = [{ type: 'effect', name: 'heal' }, { type: 'effect', name: 'shield' }];
      RoundManager.processRoundEndTriggers.mockReturnValueOnce({
        player1: { hand: [], dronesOnBoard: {} },
        player2: { hand: [], dronesOnBoard: {} },
        animationEvents: mockAnimEvents
      });

      await gfm.processRoundEnd('action');

      const triggerCalls = mockActionProcessor.queueAction.mock.calls.filter(
        c => c[0].type === 'roundEndTriggers'
      );
      expect(triggerCalls[0][0].payload.animationEvents).toEqual(mockAnimEvents);
    });

    it('calls startNewRound after processing', async () => {
      const spy = vi.spyOn(gfm, 'startNewRound').mockResolvedValue();

      await gfm.processRoundEnd('action');

      expect(spy).toHaveBeenCalled();
    });

    it('works with no triggers (just banner + startNewRound)', async () => {
      vi.spyOn(gfm, 'startNewRound').mockResolvedValue();
      RoundManager.processRoundEndTriggers.mockReturnValueOnce({
        player1: { hand: [], dronesOnBoard: {} },
        player2: { hand: [], dronesOnBoard: {} },
        animationEvents: []
      });

      await gfm.processRoundEnd('action');

      // Banner still emitted
      expect(mockActionProcessor.executeAndCaptureAnimations).toHaveBeenCalled();
      // startNewRound still called
      expect(gfm.startNewRound).toHaveBeenCalled();
      // No trigger action queued (empty animation events)
      const triggerCalls = mockActionProcessor.queueAction.mock.calls.filter(
        c => c[0].type === 'roundEndTriggers'
      );
      expect(triggerCalls.length).toBe(0);
    });

    it('returns null (automatic phase with no next-phase — startNewRound handles flow)', async () => {
      vi.spyOn(gfm, 'startNewRound').mockResolvedValue();

      const result = await gfm.processRoundEnd('action');

      expect(result).toBeNull();
    });
  });

  describe('Flow rewiring', () => {
    it('action phase completion transitions to roundEnd (not directly to startNewRound)', async () => {
      // Set up gfm in roundLoop with action phase
      gfm.gameStage = 'roundLoop';
      gfm.currentPhase = 'action';

      // Spy on transitionToPhase to capture the target phase
      const transitionSpy = vi.spyOn(gfm, 'transitionToPhase').mockResolvedValue();

      // Simulate action phase completing (both players passed, no next phase in round)
      await gfm.onSequentialPhaseComplete('action', { reason: 'both_passed' });

      // Should transition to roundEnd, not call startNewRound directly
      expect(transitionSpy).toHaveBeenCalledWith('roundEnd');
    });
  });
});
