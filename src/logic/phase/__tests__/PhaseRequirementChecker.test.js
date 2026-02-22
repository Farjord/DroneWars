import { describe, it, expect, vi, beforeEach } from 'vitest';
import PhaseRequirementChecker from '../PhaseRequirementChecker.js';

vi.mock('../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
  timingLog: vi.fn(() => Date.now()),
  getTimestamp: vi.fn(() => Date.now())
}));

function createMockGameDataService(overrides = {}) {
  const defaults = { handLimit: 5, cpuLimit: 4, shieldsPerTurn: 2 };
  const totals = { ...defaults, ...overrides };
  return {
    getEffectiveShipStats: vi.fn(() => ({ totals }))
  };
}

function createBaseGameState(overrides = {}) {
  return {
    roundNumber: 2,
    gameMode: 'local',
    turnPhase: 'action',
    shieldsToAllocate: 0,
    opponentShieldsToAllocate: 0,
    placedSections: [],
    opponentPlacedSections: [],
    player1: {
      hand: [{ name: 'card1' }, { name: 'card2' }],
      dronesOnBoard: {}
    },
    player2: {
      hand: [{ name: 'card3' }],
      dronesOnBoard: {}
    },
    ...overrides
  };
}

describe('PhaseRequirementChecker', () => {
  let checker;
  let mockGameDataService;

  beforeEach(() => {
    mockGameDataService = createMockGameDataService();
    checker = new PhaseRequirementChecker(mockGameDataService);
  });

  // --- isPhaseRequired ---

  describe('isPhaseRequired', () => {
    it('roundInitialization: false on round 1, true on round 2+', () => {
      const round1 = createBaseGameState({ roundNumber: 1 });
      const round2 = createBaseGameState({ roundNumber: 2 });
      expect(checker.isPhaseRequired('roundInitialization', round1)).toBe(false);
      expect(checker.isPhaseRequired('roundInitialization', round2)).toBe(true);
    });

    it('optionalDiscard: false on round 1, true if cards exist on round 2+', () => {
      const round1 = createBaseGameState({ roundNumber: 1 });
      expect(checker.isPhaseRequired('optionalDiscard', round1)).toBe(false);

      const round2WithCards = createBaseGameState({ roundNumber: 2 });
      expect(checker.isPhaseRequired('optionalDiscard', round2WithCards)).toBe(true);

      const round2NoCards = createBaseGameState({
        roundNumber: 2,
        player1: { hand: [], dronesOnBoard: {} },
        player2: { hand: [], dronesOnBoard: {} }
      });
      expect(checker.isPhaseRequired('optionalDiscard', round2NoCards)).toBe(false);
    });

    it('deployment: false if quickDeployExecutedThisRound on round 1', () => {
      const round1 = createBaseGameState({ roundNumber: 1 });
      expect(checker.isPhaseRequired('deployment', round1, { quickDeployExecutedThisRound: true })).toBe(false);
      expect(checker.isPhaseRequired('deployment', round1, { quickDeployExecutedThisRound: false })).toBe(true);
    });

    it('action: always required', () => {
      expect(checker.isPhaseRequired('action', createBaseGameState())).toBe(true);
    });

    it('unknown phases: default to required', () => {
      expect(checker.isPhaseRequired('unknownPhase', createBaseGameState())).toBe(true);
    });
  });

  // --- Hand limit checks ---

  describe('anyPlayerExceedsHandLimit', () => {
    it('returns true when player1 exceeds limit', () => {
      const gameState = createBaseGameState({
        player1: { hand: new Array(6).fill({ name: 'card' }), dronesOnBoard: {} }
      });
      expect(checker.anyPlayerExceedsHandLimit(gameState)).toBe(true);
    });

    it('returns false when both players are within limit', () => {
      const gameState = createBaseGameState();
      expect(checker.anyPlayerExceedsHandLimit(gameState)).toBe(false);
    });
  });

  // --- Shield checks ---

  describe('anyPlayerHasShieldsToAllocate', () => {
    it('returns false on round 1 even with shields', () => {
      const gameState = createBaseGameState({ roundNumber: 1, shieldsToAllocate: 3 });
      expect(checker.anyPlayerHasShieldsToAllocate(gameState)).toBe(false);
    });

    it('returns true on round 2+ with shields', () => {
      const gameState = createBaseGameState({ roundNumber: 2, shieldsToAllocate: 2 });
      expect(checker.anyPlayerHasShieldsToAllocate(gameState)).toBe(true);
    });

    it('returns false on round 2+ with no shields', () => {
      const gameState = createBaseGameState({ roundNumber: 2 });
      expect(checker.anyPlayerHasShieldsToAllocate(gameState)).toBe(false);
    });
  });

  // --- Drone limit checks ---

  describe('anyPlayerExceedsDroneLimit', () => {
    it('returns true when player exceeds CPU limit', () => {
      const drones = Array.from({ length: 5 }, (_, i) => ({ name: `drone${i}`, isToken: false }));
      const gameState = createBaseGameState({
        player1: { hand: [], dronesOnBoard: { lane1: drones } }
      });
      expect(checker.anyPlayerExceedsDroneLimit(gameState)).toBe(true);
    });

    it('excludes tokens from drone count', () => {
      const drones = [
        { name: 'real1', isToken: false },
        { name: 'real2', isToken: false },
        { name: 'token1', isToken: true },
        { name: 'token2', isToken: true }
      ];
      const gameState = createBaseGameState({
        player1: { hand: [], dronesOnBoard: { lane1: drones } }
      });
      expect(checker.anyPlayerExceedsDroneLimit(gameState)).toBe(false);
    });
  });

  // --- Per-player checks ---

  describe('playerExceedsHandLimit / playerExceedsDroneLimit', () => {
    it('playerExceedsHandLimit checks specific player', () => {
      const gameState = createBaseGameState({
        player1: { hand: new Array(6).fill({ name: 'card' }), dronesOnBoard: {} },
        player2: { hand: [{ name: 'card' }], dronesOnBoard: {} }
      });
      expect(checker.playerExceedsHandLimit('player1', gameState)).toBe(true);
      expect(checker.playerExceedsHandLimit('player2', gameState)).toBe(false);
    });

    it('playerExceedsDroneLimit checks specific player', () => {
      const drones = Array.from({ length: 5 }, (_, i) => ({ name: `drone${i}`, isToken: false }));
      const gameState = createBaseGameState({
        player1: { hand: [], dronesOnBoard: { lane1: drones } },
        player2: { hand: [], dronesOnBoard: {} }
      });
      expect(checker.playerExceedsDroneLimit('player1', gameState)).toBe(true);
      expect(checker.playerExceedsDroneLimit('player2', gameState)).toBe(false);
    });

    it('returns false for missing gameDataService', () => {
      const noServiceChecker = new PhaseRequirementChecker(null);
      expect(noServiceChecker.playerExceedsHandLimit('player1', createBaseGameState())).toBe(false);
      expect(noServiceChecker.playerExceedsDroneLimit('player1', createBaseGameState())).toBe(false);
    });
  });
});
