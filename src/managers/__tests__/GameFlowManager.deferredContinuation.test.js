// ========================================
// GAMEFLOWMANAGER DEFERRED CONTINUATION TESTS
// ========================================
// Tests the deferContinuation / hasDeferredContinuation / executeDeferredContinuation mechanism

import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameFlowManager from '../GameFlowManager.js';

// Mock all imports used by GameFlowManager
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

describe('GameFlowManager - Deferred Continuation', () => {
  let gfm;

  beforeEach(() => {
    GameFlowManager.instance = null;
    gfm = new GameFlowManager();
  });

  it('hasDeferredContinuation returns false when nothing deferred', () => {
    expect(gfm.hasDeferredContinuation()).toBe(false);
  });

  it('deferContinuation stores function, hasDeferredContinuation returns true', () => {
    gfm.deferContinuation(() => {});
    expect(gfm.hasDeferredContinuation()).toBe(true);
  });

  it('executeDeferredContinuation calls and clears the stored function', async () => {
    const fn = vi.fn();
    gfm.deferContinuation(fn);

    await gfm.executeDeferredContinuation();

    expect(fn).toHaveBeenCalledOnce();
    expect(gfm.hasDeferredContinuation()).toBe(false);
  });

  it('executeDeferredContinuation does nothing when nothing deferred', async () => {
    // Should not throw
    await gfm.executeDeferredContinuation();
    expect(gfm.hasDeferredContinuation()).toBe(false);
  });

  it('executeDeferredContinuation awaits async functions', async () => {
    let resolved = false;
    gfm.deferContinuation(async () => {
      await new Promise(r => setTimeout(r, 10));
      resolved = true;
    });

    await gfm.executeDeferredContinuation();

    expect(resolved).toBe(true);
  });
});
