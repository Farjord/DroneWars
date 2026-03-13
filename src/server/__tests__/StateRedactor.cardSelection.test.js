import { describe, it, expect } from 'vitest';
import StateRedactor from '../StateRedactor.js';

const makeGameState = (cardSelectionPending = null, mandatoryActionPending = null) => ({
  player1: {
    hand: [{ id: 'c1' }],
    deck: [{ id: 'c2' }],
    discardPile: [],
    energy: 5,
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] },
    activeDronePool: [],
    deployedDroneCounts: {},
    totalDronesDeployed: 0,
    droneAvailability: {},
    appliedUpgrades: [],
    shipSections: [],
  },
  player2: {
    hand: [{ id: 'c3' }],
    deck: [{ id: 'c4' }],
    discardPile: [],
    energy: 5,
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    techSlots: { lane1: [], lane2: [], lane3: [] },
    activeDronePool: [],
    deployedDroneCounts: {},
    totalDronesDeployed: 0,
    droneAvailability: {},
    appliedUpgrades: [],
    shipSections: [],
  },
  turnPhase: 'action',
  currentPlayer: 'player1',
  cardSelectionPending,
  mandatoryActionPending,
});

describe('StateRedactor — cardSelectionPending', () => {
  it('redacts cardSelectionPending when viewer is not the acting player', () => {
    const state = makeGameState({
      type: 'search_and_draw',
      playerId: 'player1',
      searchedCards: [{ id: 'c1', name: 'Scout Drone' }],
      selectCount: 1,
    });

    const redacted = StateRedactor.redactForPlayer(state, 'player2');

    expect(redacted.cardSelectionPending).toBeNull();
  });

  it('preserves cardSelectionPending when viewer is the acting player', () => {
    const searchedCards = [{ id: 'c1', name: 'Scout Drone' }];
    const state = makeGameState({
      type: 'search_and_draw',
      playerId: 'player1',
      searchedCards,
      selectCount: 1,
    });

    const redacted = StateRedactor.redactForPlayer(state, 'player1');

    expect(redacted.cardSelectionPending).toEqual({
      type: 'search_and_draw',
      playerId: 'player1',
      searchedCards,
      selectCount: 1,
    });
  });

  it('handles null cardSelectionPending gracefully', () => {
    const state = makeGameState(null);

    const redactedP1 = StateRedactor.redactForPlayer(state, 'player1');
    const redactedP2 = StateRedactor.redactForPlayer(state, 'player2');

    expect(redactedP1.cardSelectionPending).toBeNull();
    expect(redactedP2.cardSelectionPending).toBeNull();
  });
});

describe('StateRedactor — mandatoryActionPending', () => {
  it('redacts mandatoryActionPending when viewer is not the acting player', () => {
    const state = makeGameState(null, {
      type: 'discard',
      actingPlayerId: 'player1',
      count: 1,
    });

    const redacted = StateRedactor.redactForPlayer(state, 'player2');

    expect(redacted.mandatoryActionPending).toBeNull();
  });

  it('preserves mandatoryActionPending when viewer is the acting player', () => {
    const pending = {
      type: 'discard',
      actingPlayerId: 'player1',
      count: 1,
    };
    const state = makeGameState(null, pending);

    const redacted = StateRedactor.redactForPlayer(state, 'player1');

    expect(redacted.mandatoryActionPending).toEqual(pending);
  });

  it('handles null mandatoryActionPending gracefully', () => {
    const state = makeGameState(null, null);

    const redactedP1 = StateRedactor.redactForPlayer(state, 'player1');
    const redactedP2 = StateRedactor.redactForPlayer(state, 'player2');

    expect(redactedP1.mandatoryActionPending).toBeNull();
    expect(redactedP2.mandatoryActionPending).toBeNull();
  });
});
