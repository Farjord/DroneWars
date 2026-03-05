import { describe, it, expect } from 'vitest';
import StateRedactor from '../StateRedactor.js';

const makeCard = (id) => ({ instanceId: id, name: `Card_${id}`, cost: 1 });

const makePlayerState = (cardCount = 3) => ({
  hand: Array.from({ length: cardCount }, (_, i) => makeCard(`h${i}`)),
  deck: Array.from({ length: cardCount + 2 }, (_, i) => makeCard(`d${i}`)),
  discardPile: Array.from({ length: cardCount - 1 }, (_, i) => makeCard(`dp${i}`)),
  energy: 5,
  momentum: 2,
  shields: 1,
  dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
  techSlots: { lane1: [], lane2: [], lane3: [] },
  activeDronePool: [{ type: 'Scout' }],
  deployedDroneCounts: {},
  totalDronesDeployed: 0,
  droneAvailability: {},
  appliedUpgrades: [],
  shipSections: [],
});

const makeGameState = () => ({
  player1: makePlayerState(3),
  player2: makePlayerState(4),
  turnPhase: 'action',
  currentPlayer: 'player1',
  roundNumber: 2,
});

describe('StateRedactor', () => {
  describe('redactForPlayer', () => {
    it('preserves viewer own hand/deck/discard with full card objects', () => {
      const state = makeGameState();
      const redacted = StateRedactor.redactForPlayer(state, 'player1');

      expect(redacted.player1.hand).toHaveLength(3);
      expect(redacted.player1.hand[0]).toHaveProperty('instanceId');
      expect(redacted.player1.deck).toHaveLength(5);
      expect(redacted.player1.discardPile).toHaveLength(2);
    });

    it('replaces opponent hand/deck/discard with empty arrays', () => {
      const state = makeGameState();
      const redacted = StateRedactor.redactForPlayer(state, 'player1');

      expect(redacted.player2.hand).toEqual([]);
      expect(redacted.player2.deck).toEqual([]);
      expect(redacted.player2.discardPile).toEqual([]);
    });

    it('adds correct counts for opponent redacted fields', () => {
      const state = makeGameState();
      const redacted = StateRedactor.redactForPlayer(state, 'player1');

      expect(redacted.player2.handCount).toBe(4);
      expect(redacted.player2.deckCount).toBe(6);
      expect(redacted.player2.discardCount).toBe(3);
    });

    it('preserves all public fields for both players', () => {
      const state = makeGameState();
      const redacted = StateRedactor.redactForPlayer(state, 'player2');

      // Viewer (player2) public fields
      expect(redacted.player2.energy).toBe(5);
      expect(redacted.player2.momentum).toBe(2);
      expect(redacted.player2.shields).toBe(1);
      expect(redacted.player2.dronesOnBoard).toEqual({ lane1: [], lane2: [], lane3: [] });
      expect(redacted.player2.activeDronePool).toEqual([{ type: 'Scout' }]);

      // Opponent (player1) public fields preserved
      expect(redacted.player1.energy).toBe(5);
      expect(redacted.player1.momentum).toBe(2);
      expect(redacted.player1.shields).toBe(1);
      expect(redacted.player1.activeDronePool).toEqual([{ type: 'Scout' }]);
    });

    it('leaves global state fields untouched', () => {
      const state = makeGameState();
      const redacted = StateRedactor.redactForPlayer(state, 'player1');

      expect(redacted.turnPhase).toBe('action');
      expect(redacted.currentPlayer).toBe('player1');
      expect(redacted.roundNumber).toBe(2);
    });

    it('produces count of 0 for empty arrays', () => {
      const state = makeGameState();
      state.player2.hand = [];
      state.player2.deck = [];
      state.player2.discardPile = [];

      const redacted = StateRedactor.redactForPlayer(state, 'player1');

      expect(redacted.player2.handCount).toBe(0);
      expect(redacted.player2.deckCount).toBe(0);
      expect(redacted.player2.discardCount).toBe(0);
    });

    it('works symmetrically for player2 as viewer', () => {
      const state = makeGameState();
      const redacted = StateRedactor.redactForPlayer(state, 'player2');

      // Player1 (opponent) should be redacted
      expect(redacted.player1.hand).toEqual([]);
      expect(redacted.player1.handCount).toBe(3);
      expect(redacted.player1.deckCount).toBe(5);
      expect(redacted.player1.discardCount).toBe(2);

      // Player2 (viewer) should be preserved
      expect(redacted.player2.hand).toHaveLength(4);
      expect(redacted.player2.hand[0]).toHaveProperty('instanceId');
    });
  });
});
