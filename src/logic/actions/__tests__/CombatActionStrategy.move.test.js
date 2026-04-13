/**
 * CombatActionStrategy — processMove goAgain propagation tests
 * TDD: Tests written first to cover goAgain from ON_MOVE trigger (Infiltrator bug).
 *
 * Bug: goAgain was only captured from mineResult (ON_LANE_MOVEMENT_IN),
 * so triggers on ON_MOVE that granted GO_AGAIN were silently ignored.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted — shared fireTrigger mock across all TriggerProcessor instances
const { mockFireTrigger } = vi.hoisted(() => ({
  mockFireTrigger: vi.fn(),
}));

vi.mock('../../triggers/TriggerProcessor.js', () => ({
  default: class {
    fireTrigger(...args) { return mockFireTrigger(...args); }
  },
}));

vi.mock('../../triggers/triggerConstants.js', () => ({
  TRIGGER_TYPES: { ON_MOVE: 'ON_MOVE', ON_LANE_MOVEMENT_IN: 'ON_LANE_MOVEMENT_IN' },
}));

vi.mock('../../combat/InterceptionProcessor.js', () => ({
  calculateAiInterception: vi.fn(() => ({ hasInterceptors: false })),
}));

vi.mock('../../combat/AttackProcessor.js', () => ({
  resolveAttack: vi.fn(),
}));

vi.mock('../../statsCalculator.js', () => ({
  calculateEffectiveStats: vi.fn(() => ({ keywords: new Set() })),
}));

vi.mock('../../abilities/AbilityResolver.js', () => ({
  default: { resolveAbility: vi.fn() },
}));

vi.mock('../../gameLogic.js', () => ({
  gameEngine: { updateAuras: vi.fn((ps) => ps.dronesOnBoard) },
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

import { processMove } from '../CombatActionStrategy.js';

// --- Helpers ---

const makeDrone = (id = 'drone-1', name = 'Infiltrator') => ({
  id,
  name,
  attack: 2,
  health: 3,
  currentHealth: 3,
  shield: 0,
  abilities: [],
  keywords: [],
  isExhausted: false,
  isSnared: false,
});

const makePlayerState = (dronesOnBoard = {}) => ({
  name: 'Player',
  energy: 5,
  hand: [],
  deck: [],
  discardPile: [],
  dronesOnBoard: { lane1: [], lane2: [], lane3: [], ...dronesOnBoard },
});

const makeMoveCtx = () => {
  const drone = makeDrone();
  const state = {
    player1: makePlayerState({ lane1: [drone] }),
    player2: makePlayerState(),
  };
  return {
    ctx: {
      getState: () => state,
      getPlacedSections: () => ({ player1: [], player2: [] }),
      setPlayerStates: vi.fn(),
      addLogEntry: vi.fn(),
      mapAnimationEvents: vi.fn(() => []),
      executeAndCaptureAnimations: vi.fn(),
      executeGoAgainAnimation: vi.fn(),
    },
  };
};

const noTrigger = () => ({ triggered: false, goAgain: false, animationEvents: [] });

const MOVE_PAYLOAD = {
  droneId: 'drone-1',
  fromLane: 'lane1',
  toLane: 'lane2',
  playerId: 'player1',
  insertionIndex: undefined,
};

// --- Tests ---

describe('CombatActionStrategy — processMove goAgain propagation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns shouldEndTurn false when ON_MOVE trigger grants goAgain', async () => {
    const { ctx } = makeMoveCtx();

    // triggered: false avoids supplying newPlayerStates — only the goAgain capture
    // path is under test. In production, goAgain: true always pairs with triggered: true.
    mockFireTrigger
      .mockReturnValueOnce({ triggered: false, goAgain: true, animationEvents: [] }) // ON_MOVE
      .mockReturnValueOnce(noTrigger());                                              // ON_LANE_MOVEMENT_IN

    const result = await processMove(MOVE_PAYLOAD, ctx);

    expect(result.shouldEndTurn).toBe(false);
    expect(ctx.executeGoAgainAnimation).toHaveBeenCalledWith('player1');
  });

  it('returns shouldEndTurn true when no trigger grants goAgain', async () => {
    const { ctx } = makeMoveCtx();

    mockFireTrigger
      .mockReturnValueOnce(noTrigger()) // ON_MOVE
      .mockReturnValueOnce(noTrigger()); // ON_LANE_MOVEMENT_IN

    const result = await processMove(MOVE_PAYLOAD, ctx);

    expect(result.shouldEndTurn).toBe(true);
    expect(ctx.executeGoAgainAnimation).not.toHaveBeenCalled();
  });

  it('returns shouldEndTurn false when ON_LANE_MOVEMENT_IN grants goAgain (regression guard)', async () => {
    const { ctx } = makeMoveCtx();

    mockFireTrigger
      .mockReturnValueOnce(noTrigger())                                                              // ON_MOVE: no goAgain
      .mockReturnValueOnce({ triggered: false, goAgain: true, animationEvents: [] }); // ON_LANE_MOVEMENT_IN: goAgain (same shortcut as above)

    const result = await processMove(MOVE_PAYLOAD, ctx);

    expect(result.shouldEndTurn).toBe(false);
    expect(ctx.executeGoAgainAnimation).toHaveBeenCalledWith('player1');
  });
});
