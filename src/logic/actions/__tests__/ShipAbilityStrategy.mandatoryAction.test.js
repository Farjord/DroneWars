import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must use vi.hoisted so mocks are available when vi.mock factories run (hoisted above imports)
const { mockProcess, mockComplete } = vi.hoisted(() => ({
  mockProcess: vi.fn(),
  mockComplete: vi.fn(),
}));

vi.mock('../../abilities/ship/RecalculateAbilityProcessor.js', () => ({
  default: { process: mockProcess, complete: mockComplete },
}));

// Mock shipComponentCollection to avoid data imports
vi.mock('../../../data/shipSectionData.js', () => ({
  shipComponentCollection: [],
}));

import { processRecalculateAbility, processRecalculateComplete } from '../ShipAbilityStrategy.js';

const makePlayerState = (overrides = {}) => ({
  name: 'Player',
  energy: 5,
  hand: [],
  deck: [],
  discardPile: [],
  shipSections: { bridge: { abilityActivationCount: 0 } },
  dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
  ...overrides,
});

const makeCtx = () => {
  const state = {
    player1: makePlayerState(),
    player2: makePlayerState(),
    mandatoryActionPending: null,
  };
  return {
    ctx: {
      getState: () => state,
      getLocalPlayerId: () => 'player1',
      updatePlayerState: vi.fn((pid, ps) => { state[pid] = ps; }),
      setState: vi.fn((patch) => Object.assign(state, patch)),
      isPlayerAI: vi.fn(() => false),
    },
    state,
  };
};

describe('ShipAbilityStrategy — mandatoryActionPending state-based delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processRecalculateAbility sets mandatoryActionPending for human players', async () => {
    const mandatoryAction = { type: 'discard', actingPlayerId: 'player1', count: 1 };
    mockProcess.mockReturnValue({
      newPlayerStates: { player1: makePlayerState(), player2: makePlayerState() },
      mandatoryAction,
      shouldEndTurn: false,
    });

    const { ctx, state } = makeCtx();

    const result = await processRecalculateAbility(
      { sectionName: 'bridge', playerId: 'player1' },
      ctx
    );

    expect(result.mandatoryAction).toEqual(mandatoryAction);
    expect(ctx.setState).toHaveBeenCalledWith({ mandatoryActionPending: mandatoryAction });
    expect(state.mandatoryActionPending).toEqual(mandatoryAction);
  });

  it('processRecalculateAbility does NOT set mandatoryActionPending for AI players', async () => {
    mockProcess.mockReturnValue({
      newPlayerStates: { player1: makePlayerState(), player2: makePlayerState() },
      shouldEndTurn: true,
      // No mandatoryAction — AI auto-discards
    });

    const { ctx } = makeCtx();

    const result = await processRecalculateAbility(
      { sectionName: 'bridge', playerId: 'player1' },
      ctx
    );

    expect(result.mandatoryAction).toBeUndefined();
    expect(result.shouldEndTurn).toBe(true);
    expect(ctx.setState).not.toHaveBeenCalled();
  });

  it('processRecalculateComplete clears mandatoryActionPending', async () => {
    mockComplete.mockReturnValue({
      newPlayerStates: { player1: makePlayerState(), player2: makePlayerState() },
      shouldEndTurn: true,
    });

    const { ctx, state } = makeCtx();
    state.mandatoryActionPending = { type: 'discard', actingPlayerId: 'player1' };

    await processRecalculateComplete({ playerId: 'player1' }, ctx);

    expect(ctx.setState).toHaveBeenCalledWith({ mandatoryActionPending: null });
    expect(state.mandatoryActionPending).toBeNull();
  });
});
