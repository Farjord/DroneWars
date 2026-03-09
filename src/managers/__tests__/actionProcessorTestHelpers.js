/**
 * Shared test helpers for ActionProcessor tests.
 *
 * NOTE: vi.mock() declarations MUST remain at the top level of each test file
 * (Vitest hoists them). Only mock *factory functions* and constants live here.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Default player state shape — used by both test suites
// ---------------------------------------------------------------------------
const DEFAULT_PLAYER_1 = {
  name: 'Player 1',
  dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
  hand: [],
  energy: 5,
  shipSections: {}
};

const DEFAULT_PLAYER_2 = {
  name: 'Player 2',
  dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
  hand: [],
  energy: 5,
  shipSections: {}
};

// ---------------------------------------------------------------------------
// createMockGameStateManager
// ---------------------------------------------------------------------------
// A flexible factory that covers both the "simple" and "deep-clone" use-cases.
//
//   deepClone: false (default) — getState returns a shallow spread (fast, good
//     for tests that don't mutate nested state).
//   deepClone: true — getState returns JSON-round-tripped copies (needed when
//     tests read back mutated drone arrays, e.g. combat tests).
// ---------------------------------------------------------------------------
export function createMockGameStateManager(overrides = {}, { deepClone = false } = {}) {
  const defaultState = {
    gameMode: 'local',
    currentPlayer: 'player1',
    turnPhase: 'action',
    turn: 1,
    roundNumber: 1,
    actionsTakenThisTurn: 0,
    winner: null,
    passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
    commitments: {},
    player1: { ...DEFAULT_PLAYER_1 },
    player2: { ...DEFAULT_PLAYER_2 },
    placedSections: [null, null, null],
    opponentPlacedSections: [null, null, null],
    ...overrides
  };

  const cloneState = deepClone
    ? () => JSON.parse(JSON.stringify(defaultState))
    : () => ({ ...defaultState });

  return {
    getState: vi.fn(cloneState),
    get: vi.fn((key) => defaultState[key]),
    setState: vi.fn(),
    setPlayerStates: vi.fn(),
    updatePlayerState: vi.fn(),
    setTurnPhase: vi.fn(),
    setCurrentPlayer: vi.fn(),
    setPassInfo: vi.fn(),
    setWinner: vi.fn(),
    addLogEntry: vi.fn(),
    getLocalPlayerId: vi.fn(() => 'player1'),
    getLocalPlacedSections: vi.fn(() => [null, null, null]),
    createCallbacks: vi.fn(() => ({ logCallback: vi.fn() })),
    _updateContext: null
  };
}

// ---------------------------------------------------------------------------
// createMockAnimationManager — used by combat tests
// ---------------------------------------------------------------------------
export function createMockAnimationManager({ applyPending = false } = {}) {
  return {
    animations: {},
    executeAnimations: vi.fn(),
    executeWithStateUpdate: vi.fn(async (_animations, context) => {
      if (applyPending && context.pendingStateUpdate) {
        context.applyPendingStateUpdate();
      }
    }),
    waitForReactRender: vi.fn()
  };
}
