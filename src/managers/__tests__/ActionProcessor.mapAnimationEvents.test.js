import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ALL transitive dependencies that ActionProcessor's strategy imports pull in
vi.mock('../../utils/debugLogger.js', () => ({ debugLog: vi.fn(), timingLog: vi.fn() }));
vi.mock('../../utils/flowVerification.js', () => ({ flowCheckpoint: vi.fn() }));
vi.mock('../../utils/stateHelpers.js', () => ({ countDrones: vi.fn() }));
vi.mock('../../logic/game/WinConditionChecker.js', () => ({ default: { checkGameStateForWinner: vi.fn() } }));
vi.mock('../AIPhaseProcessor.js', () => ({ default: {} }));
vi.mock('../../services/GameDataService.js', () => ({ default: { getInstance: vi.fn().mockReturnValue({}) } }));
vi.mock('../PhaseManager.js', () => ({ default: class {} }));
vi.mock('../../logic/actions/CombatActionStrategy.js', () => ({
  processAttack: vi.fn(), processMove: vi.fn(), processAbility: vi.fn(),
}));
vi.mock('../../logic/actions/CardActionStrategy.js', () => ({
  processCardPlay: vi.fn(), processSearchAndDrawCompletion: vi.fn(),
}));
vi.mock('../../logic/actions/ShipAbilityStrategy.js', () => ({
  processRecallAbility: vi.fn(), processTargetLockAbility: vi.fn(),
  processRecalculateAbility: vi.fn(), processRecalculateComplete: vi.fn(),
  processReallocateShieldsAbility: vi.fn(), processReallocateShieldsComplete: vi.fn(),
  validateShipAbilityActivationLimit: vi.fn(),
}));
vi.mock('../../logic/actions/PhaseTransitionStrategy.js', () => ({
  processTurnTransition: vi.fn(), processPhaseTransition: vi.fn(),
  processRoundStart: vi.fn(), processFirstPlayerDetermination: vi.fn(),
}));
vi.mock('../../logic/actions/CommitmentStrategy.js', () => ({
  getPhaseCommitmentStatus: vi.fn(), clearPhaseCommitments: vi.fn(),
  processCommitment: vi.fn(), handleAICommitment: vi.fn(), applyPhaseCommitments: vi.fn(),
}));
vi.mock('../../logic/actions/StateUpdateStrategy.js', () => ({
  processDraw: vi.fn(), processEnergyReset: vi.fn(), processRoundStartTriggers: vi.fn(),
  processRebuildProgress: vi.fn(), processMomentumAward: vi.fn(),
}));
vi.mock('../../logic/actions/DroneActionStrategy.js', () => ({
  processDeployment: vi.fn(), processDestroyDrone: vi.fn(), processOptionalDiscard: vi.fn(),
  processPlayerPass: vi.fn(), processAiShipPlacement: vi.fn(), processAiAction: vi.fn(),
}));
vi.mock('../../logic/actions/ShieldActionStrategy.js', () => ({
  processAddShield: vi.fn(), processResetShields: vi.fn(), processReallocateShields: vi.fn(),
}));
vi.mock('../../logic/actions/MiscActionStrategy.js', () => ({
  processStatusConsumption: vi.fn(), processDebugAddCardsToHand: vi.fn(), processForceWin: vi.fn(),
}));

import ActionProcessor from '../ActionProcessor.js';

describe('mapAnimationEvents — TELEPORT_IN timing', () => {
  let ap;
  const TELEPORT_IN_NATIVE_TIMING = 'post-state';

  beforeEach(() => {
    ActionProcessor.reset();

    const mockGSM = {
      getState: vi.fn().mockReturnValue({}),
      get: vi.fn(),
      setState: vi.fn(),
      _updateContext: null,
    };
    ap = ActionProcessor.getInstance(mockGSM);

    ap.setAnimationManager({
      animations: {
        TELEPORT_IN: { timing: TELEPORT_IN_NATIVE_TIMING, duration: 600 },
        CARD_REVEAL: { timing: 'pre-state', duration: 400 },
        DAMAGE_EFFECT: { timing: 'pre-state', duration: 300 },
      },
    });
  });

  afterEach(() => {
    ActionProcessor.reset();
  });

  it('TELEPORT_IN after STATE_SNAPSHOT keeps post-state timing', () => {
    const events = [
      { type: 'STATE_SNAPSHOT', snapshotPlayerStates: {} },
      { type: 'TELEPORT_IN', sourceId: 'drone1' },
    ];

    const mapped = ap._getActionContext().mapAnimationEvents(events);

    const teleportEntry = mapped.find(e => e.animationName === 'TELEPORT_IN');
    expect(teleportEntry.timing).toBe('post-state');
  });

  it('TELEPORT_IN without preceding STATE_SNAPSHOT keeps post-state timing', () => {
    const events = [
      { type: 'CARD_REVEAL', cardId: 'c1' },
      { type: 'TELEPORT_IN', sourceId: 'drone1' },
    ];

    const mapped = ap._getActionContext().mapAnimationEvents(events);

    const teleportEntry = mapped.find(e => e.animationName === 'TELEPORT_IN');
    expect(teleportEntry.timing).toBe('post-state');
  });

  it('non-TELEPORT_IN events preserve their native timing', () => {
    const events = [
      { type: 'STATE_SNAPSHOT', snapshotPlayerStates: {} },
      { type: 'DAMAGE_EFFECT', targetId: 'drone1' },
    ];

    const mapped = ap._getActionContext().mapAnimationEvents(events);

    const snapshot = mapped.find(e => e.animationName === 'STATE_SNAPSHOT');
    expect(snapshot.timing).toBe('pre-state');

    const damage = mapped.find(e => e.animationName === 'DAMAGE_EFFECT');
    expect(damage.timing).toBe('pre-state');
  });
});
