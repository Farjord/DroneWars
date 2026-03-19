/**
 * CombatActionStrategy — Interception badge + announcement tests
 * TDD: Tests written first for unified lastInterception and INTERCEPTION_ANNOUNCEMENT.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks (available when vi.mock factories run)
const { mockCalculateAiInterception, mockResolveAttack } = vi.hoisted(() => ({
  mockCalculateAiInterception: vi.fn(),
  mockResolveAttack: vi.fn(),
}));

vi.mock('../../combat/InterceptionProcessor.js', () => ({
  calculateAiInterception: mockCalculateAiInterception,
}));

vi.mock('../../combat/AttackProcessor.js', () => ({
  resolveAttack: mockResolveAttack,
}));

vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn(),
}));

vi.mock('../../abilities/AbilityResolver.js', () => ({
  default: { resolveAbility: vi.fn() },
}));

vi.mock('../../gameLogic.js', () => ({
  gameEngine: { updateAuras: vi.fn((ps) => ps.dronesOnBoard) },
}));

vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: vi.fn().mockImplementation(() => ({
    fireTrigger: vi.fn(() => ({ triggered: false, animationEvents: [] })),
  })),
}));

vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_MOVE: 'ON_MOVE', ON_LANE_MOVEMENT_IN: 'ON_LANE_MOVEMENT_IN' },
}));

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

vi.mock('../../../utils/gameUtils.js', () => ({
  hasMovementInhibitorInLane: vi.fn(() => false),
}));

vi.mock('../../effects/movement/animations/DefaultMovementAnimation.js', () => ({
  buildDefaultMovementAnimation: vi.fn(() => []),
}));

vi.mock('../../animations/AnimationSequenceBuilder.js', () => ({
  buildAnimationSequence: vi.fn(() => []),
}));

vi.mock('../../utils/laneInsertionUtils.js', () => ({
  insertDroneInLane: vi.fn((lane, drone) => lane.push(drone)),
}));

import { processAttack } from '../CombatActionStrategy.js';

// --- Helpers ---

const makeDrone = (id, name = 'TestDrone') => ({
  id,
  name,
  attack: 3,
  health: 5,
  currentHealth: 5,
  shield: 0,
  abilities: [],
  keywords: [],
});

const makePlayerState = (overrides = {}) => ({
  name: 'Player',
  energy: 5,
  hand: [],
  deck: [],
  discardPile: [],
  dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
  ...overrides,
});

const makeCtx = (overrides = {}) => {
  const state = {
    player1: makePlayerState({ name: 'Human' }),
    player2: makePlayerState({ name: 'AI Player' }),
    interceptionPending: null,
    lastInterception: null,
    ...overrides.stateOverrides,
  };

  const capturedAnimations = [];

  return {
    ctx: {
      getState: () => state,
      getPlacedSections: () => ({ player1: [], player2: [] }),
      setState: vi.fn((patch) => Object.assign(state, patch)),
      setPlayerStates: vi.fn(),
      addLogEntry: vi.fn(),
      isPlayerAI: overrides.isPlayerAI || vi.fn(() => false),
      getAiPhaseProcessor: overrides.getAiPhaseProcessor || vi.fn(() => null),
      mapAnimationEvents: vi.fn((events) => (events || []).map(e => ({
        animationName: e.type || e.animationName,
        timing: 'pre-state',
        payload: e,
      }))),
      captureAnimations: vi.fn((anims) => capturedAnimations.push(...anims)),
      getAnimationManager: vi.fn(() => null),
      checkWinCondition: vi.fn(),
      executeGoAgainAnimation: vi.fn(),
    },
    state,
    capturedAnimations,
  };
};

const makeAttackDetails = (overrides = {}) => ({
  attackingPlayer: 'player1',
  source: makeDrone('attacker-1', 'Attacker'),
  target: makeDrone('target-1', 'Target'),
  damage: 3,
  ...overrides,
});

// --- Tests ---

describe('CombatActionStrategy — interception badge (lastInterception)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: resolveAttack returns a basic result
    mockResolveAttack.mockReturnValue({
      newPlayerStates: {
        player1: makePlayerState(),
        player2: makePlayerState(),
      },
      animationEvents: [],
      shouldEndTurn: true,
    });
  });

  it('sets lastInterception when human defender intercepts (resubmitted attack)', async () => {
    const interceptorDrone = makeDrone('interceptor-1', 'Shield Drone');
    const attackDetails = makeAttackDetails({
      interceptor: interceptorDrone,  // Human already chose interceptor
    });

    // No interception block entered (interceptor already set)
    mockCalculateAiInterception.mockReturnValue({ hasInterceptors: false });

    const { ctx, state } = makeCtx();
    await processAttack({ attackDetails }, ctx);

    // lastInterception should be set because interceptor is truthy
    expect(ctx.setState).toHaveBeenCalledWith(expect.objectContaining({
      lastInterception: expect.objectContaining({
        interceptor: interceptorDrone,
        originalTarget: attackDetails.target,
      }),
    }));
    expect(state.lastInterception.interceptor.id).toBe('interceptor-1');
  });

  it('sets lastInterception when AI defender intercepts', async () => {
    const interceptorDrone = makeDrone('ai-interceptor-1', 'AI Shield');
    const attackDetails = makeAttackDetails(); // No interceptor set yet

    mockCalculateAiInterception.mockReturnValue({
      hasInterceptors: true,
      interceptors: [interceptorDrone],
      attackDetails,
    });

    const mockAiProcessor = {
      makeInterceptionDecision: vi.fn().mockResolvedValue({
        interceptor: interceptorDrone,
      }),
    };

    const { ctx, state } = makeCtx({
      isPlayerAI: vi.fn((pid) => pid === 'player2'),
      getAiPhaseProcessor: vi.fn(() => mockAiProcessor),
    });

    await processAttack({ attackDetails }, ctx);

    // lastInterception should be set
    expect(state.lastInterception).toBeTruthy();
    expect(state.lastInterception.interceptor.id).toBe('ai-interceptor-1');
    expect(state.lastInterception.originalTarget.id).toBe('target-1');
  });

  it('does NOT set lastInterception when interception is declined (interceptor: null)', async () => {
    const attackDetails = makeAttackDetails({
      interceptor: null,  // Human explicitly declined
    });

    mockCalculateAiInterception.mockReturnValue({ hasInterceptors: false });

    const { ctx, state } = makeCtx();
    await processAttack({ attackDetails }, ctx);

    // lastInterception should NOT be set (null is falsy)
    const lastInterceptionCalls = ctx.setState.mock.calls.filter(
      ([patch]) => 'lastInterception' in patch
    );
    expect(lastInterceptionCalls).toHaveLength(0);
    expect(state.lastInterception).toBeNull();
  });

  it('does NOT set lastInterception when AI defender declines interception', async () => {
    const attackDetails = makeAttackDetails();

    mockCalculateAiInterception.mockReturnValue({
      hasInterceptors: true,
      interceptors: [makeDrone('potential-1')],
      attackDetails,
    });

    const mockAiProcessor = {
      makeInterceptionDecision: vi.fn().mockResolvedValue({
        interceptor: null,  // AI declined
      }),
    };

    const { ctx, state } = makeCtx({
      isPlayerAI: vi.fn((pid) => pid === 'player2'),
      getAiPhaseProcessor: vi.fn(() => mockAiProcessor),
    });

    await processAttack({ attackDetails }, ctx);

    // lastInterception should NOT be set
    const lastInterceptionCalls = ctx.setState.mock.calls.filter(
      ([patch]) => patch.lastInterception && patch.lastInterception !== null
    );
    expect(lastInterceptionCalls).toHaveLength(0);
  });

  it('includes lane in lastInterception from attackDetails.lane', async () => {
    const interceptorDrone = makeDrone('interceptor-1', 'Shield Drone');
    const attackDetails = makeAttackDetails({
      interceptor: interceptorDrone,
      lane: 'lane2',
    });

    mockCalculateAiInterception.mockReturnValue({ hasInterceptors: false });

    const { ctx, state } = makeCtx();
    await processAttack({ attackDetails }, ctx);

    expect(state.lastInterception.lane).toBe('lane2');
  });

  it('does NOT set lastInterception for card-based attacks even with sourceCardInstanceId', async () => {
    const attackDetails = makeAttackDetails({
      sourceCardInstanceId: 'card-abc',  // Card attack — skips interception block
    });

    mockCalculateAiInterception.mockReturnValue({ hasInterceptors: false });

    const { ctx, state } = makeCtx();
    await processAttack({ attackDetails }, ctx);

    const lastInterceptionCalls = ctx.setState.mock.calls.filter(
      ([patch]) => 'lastInterception' in patch
    );
    expect(lastInterceptionCalls).toHaveLength(0);
  });
});

describe('CombatActionStrategy — INTERCEPTION_ANNOUNCEMENT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAttack.mockReturnValue({
      newPlayerStates: {
        player1: makePlayerState(),
        player2: makePlayerState(),
      },
      animationEvents: [],
      shouldEndTurn: true,
    });
  });

  it('emits INTERCEPTION_ANNOUNCEMENT when AI defender has interceptors', async () => {
    const attackDetails = makeAttackDetails();
    const interceptorDrone = makeDrone('interceptor-1');

    mockCalculateAiInterception.mockReturnValue({
      hasInterceptors: true,
      interceptors: [interceptorDrone],
      attackDetails,
    });

    const mockAiProcessor = {
      makeInterceptionDecision: vi.fn().mockResolvedValue({
        interceptor: interceptorDrone,
      }),
    };

    const { ctx, capturedAnimations } = makeCtx({
      isPlayerAI: vi.fn((pid) => pid === 'player2'),
      getAiPhaseProcessor: vi.fn(() => mockAiProcessor),
    });

    await processAttack({ attackDetails }, ctx);

    // Should have captured an INTERCEPTION_ANNOUNCEMENT
    const announcementCaptures = capturedAnimations.filter(
      a => a.animationName === 'INTERCEPTION_ANNOUNCEMENT'
    );
    expect(announcementCaptures).toHaveLength(1);
    expect(announcementCaptures[0].payload.text).toBe('OPPONENT DECIDING INTERCEPTION');
  });

  it('does NOT emit INTERCEPTION_ANNOUNCEMENT when no interceptors available', async () => {
    const attackDetails = makeAttackDetails();

    mockCalculateAiInterception.mockReturnValue({
      hasInterceptors: false,
    });

    const { ctx, capturedAnimations } = makeCtx({
      isPlayerAI: vi.fn((pid) => pid === 'player2'),
    });

    await processAttack({ attackDetails }, ctx);

    const announcementCaptures = capturedAnimations.filter(
      a => a.animationName === 'INTERCEPTION_ANNOUNCEMENT'
    );
    expect(announcementCaptures).toHaveLength(0);
  });

  it('does NOT emit INTERCEPTION_ANNOUNCEMENT for human defender', async () => {
    const attackDetails = makeAttackDetails();

    mockCalculateAiInterception.mockReturnValue({
      hasInterceptors: true,
      interceptors: [makeDrone('interceptor-1')],
      attackDetails,
    });

    // Human defender — isPlayerAI returns false for everyone
    const { ctx, capturedAnimations } = makeCtx({
      isPlayerAI: vi.fn(() => false),
    });

    const result = await processAttack({ attackDetails }, ctx);

    // Should return needsInterceptionDecision instead
    expect(result.needsInterceptionDecision).toBe(true);

    // No announcement emitted
    const announcementCaptures = capturedAnimations.filter(
      a => a.animationName === 'INTERCEPTION_ANNOUNCEMENT'
    );
    expect(announcementCaptures).toHaveLength(0);
  });
});
