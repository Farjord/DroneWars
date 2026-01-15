// ========================================
// DISCARD EFFECT PROCESSOR TESTS
// ========================================
// TDD: Tests for DISCARD effect type
// Randomly removes cards from target player's hand to discard pile

import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiscardEffectProcessor from './DiscardEffectProcessor.js';

describe('DiscardEffectProcessor', () => {
  let processor;
  let mockPlayerStates;
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new DiscardEffectProcessor();

    // Standard mock player states with cards in hand
    mockPlayerStates = {
      player1: {
        energy: 10,
        hand: [
          { id: 'card_p1_1', name: 'Card1' },
          { id: 'card_p1_2', name: 'Card2' }
        ],
        deck: [],
        discardPile: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      },
      player2: {
        energy: 10,
        hand: [
          { id: 'card_p2_1', name: 'OpponentCard1' },
          { id: 'card_p2_2', name: 'OpponentCard2' },
          { id: 'card_p2_3', name: 'OpponentCard3' },
          { id: 'card_p2_4', name: 'OpponentCard4' },
          { id: 'card_p2_5', name: 'OpponentCard5' }
        ],
        deck: [],
        discardPile: [],
        dronesOnBoard: { lane1: [], lane2: [], lane3: [] }
      }
    };

    // Standard mock context
    mockContext = {
      actingPlayerId: 'player1',
      playerStates: mockPlayerStates
    };
  });

  describe('Normal discard operations', () => {
    it('should discard 2 cards from opponent with 5 cards', () => {
      const effect = { type: 'DISCARD', count: 2, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify hand size reduced from 5 to 3
      expect(result.newPlayerStates.player2.hand).toHaveLength(3);
      // Verify discard pile increased by 2
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(2);
      // Verify acting player's hand unchanged
      expect(result.newPlayerStates.player1.hand).toHaveLength(2);
    });

    it('should discard 1 card from opponent', () => {
      const effect = { type: 'DISCARD', count: 1, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify hand size reduced from 5 to 4
      expect(result.newPlayerStates.player2.hand).toHaveLength(4);
      // Verify discard pile has 1 card
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(1);
    });

    it('should discard 3 cards from opponent', () => {
      const effect = { type: 'DISCARD', count: 3, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify hand size reduced from 5 to 2
      expect(result.newPlayerStates.player2.hand).toHaveLength(2);
      // Verify discard pile has 3 cards
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(3);
    });

    it('should discard all cards when count equals hand size', () => {
      const effect = { type: 'DISCARD', count: 5, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify hand is empty
      expect(result.newPlayerStates.player2.hand).toHaveLength(0);
      // Verify all cards in discard pile
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(5);
    });

    it('should default to opponent when targetPlayer not specified', () => {
      const effect = { type: 'DISCARD', count: 2 };

      const result = processor.process(effect, mockContext);

      // Should discard from opponent (player2)
      expect(result.newPlayerStates.player2.hand).toHaveLength(3);
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(2);
      // Acting player unchanged
      expect(result.newPlayerStates.player1.hand).toHaveLength(2);
    });

    it('should work correctly when player2 is acting player', () => {
      mockContext.actingPlayerId = 'player2';
      const effect = { type: 'DISCARD', count: 1, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Should discard from opponent (player1)
      expect(result.newPlayerStates.player1.hand).toHaveLength(1);
      expect(result.newPlayerStates.player1.discardPile).toHaveLength(1);
      // Acting player (player2) unchanged
      expect(result.newPlayerStates.player2.hand).toHaveLength(5);
    });
  });

  describe('Edge cases - fewer cards than count', () => {
    it('should discard all available cards when count exceeds hand size', () => {
      const effect = { type: 'DISCARD', count: 10, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Should discard all 5 available cards (not 10)
      expect(result.newPlayerStates.player2.hand).toHaveLength(0);
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(5);
    });

    it('should discard 2 cards when opponent has only 2 cards and count is 3', () => {
      mockPlayerStates.player2.hand = [
        { id: 'card_1', name: 'Card1' },
        { id: 'card_2', name: 'Card2' }
      ];
      const effect = { type: 'DISCARD', count: 3, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Should discard all 2 available cards
      expect(result.newPlayerStates.player2.hand).toHaveLength(0);
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(2);
    });

    it('should handle empty hand gracefully', () => {
      mockPlayerStates.player2.hand = [];
      const effect = { type: 'DISCARD', count: 2, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Should not throw error, hand remains empty
      expect(result.newPlayerStates.player2.hand).toHaveLength(0);
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(0);
    });
  });

  describe('Edge cases - zero and negative counts', () => {
    it('should handle zero count gracefully (no-op)', () => {
      const effect = { type: 'DISCARD', count: 0, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // No cards should be discarded
      expect(result.newPlayerStates.player2.hand).toHaveLength(5);
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(0);
    });

    it('should treat negative count as 0 (defensive programming)', () => {
      const effect = { type: 'DISCARD', count: -2, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // No cards should be discarded
      expect(result.newPlayerStates.player2.hand).toHaveLength(5);
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(0);
    });
  });

  describe('Self-targeting (optional feature)', () => {
    it('should discard from self when targetPlayer is "self"', () => {
      const effect = { type: 'DISCARD', count: 1, targetPlayer: 'self' };

      const result = processor.process(effect, mockContext);

      // Should discard from acting player (player1)
      expect(result.newPlayerStates.player1.hand).toHaveLength(1);
      expect(result.newPlayerStates.player1.discardPile).toHaveLength(1);
      // Opponent unchanged
      expect(result.newPlayerStates.player2.hand).toHaveLength(5);
    });

    it('should discard all self cards when count exceeds hand size', () => {
      const effect = { type: 'DISCARD', count: 5, targetPlayer: 'self' };

      const result = processor.process(effect, mockContext);

      // Should discard all 2 available cards from acting player
      expect(result.newPlayerStates.player1.hand).toHaveLength(0);
      expect(result.newPlayerStates.player1.discardPile).toHaveLength(2);
    });
  });

  describe('Discard pile accumulation', () => {
    it('should add to existing discard pile', () => {
      mockPlayerStates.player2.discardPile = [
        { id: 'old_card_1', name: 'OldCard1' },
        { id: 'old_card_2', name: 'OldCard2' }
      ];
      const effect = { type: 'DISCARD', count: 2, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify discard pile increased from 2 to 4
      expect(result.newPlayerStates.player2.discardPile).toHaveLength(4);
      // Verify old cards still present
      expect(result.newPlayerStates.player2.discardPile[0].id).toBe('old_card_1');
      expect(result.newPlayerStates.player2.discardPile[1].id).toBe('old_card_2');
    });
  });

  describe('State immutability', () => {
    it('should not mutate original playerStates', () => {
      const effect = { type: 'DISCARD', count: 2, targetPlayer: 'opponent' };

      const originalHandSize = mockPlayerStates.player2.hand.length;
      const originalDiscardSize = mockPlayerStates.player2.discardPile.length;

      processor.process(effect, mockContext);

      // Original state should be unchanged
      expect(mockPlayerStates.player2.hand).toHaveLength(originalHandSize);
      expect(mockPlayerStates.player2.discardPile).toHaveLength(originalDiscardSize);
    });

    it('should not mutate acting player when discarding from opponent', () => {
      const effect = { type: 'DISCARD', count: 2, targetPlayer: 'opponent' };

      const originalHandSize = mockPlayerStates.player1.hand.length;

      processor.process(effect, mockContext);

      // Acting player's original state should be unchanged
      expect(mockPlayerStates.player1.hand).toHaveLength(originalHandSize);
    });
  });

  describe('Random selection', () => {
    it('should randomly select cards from hand (not always first)', () => {
      // Run multiple times to verify randomness
      const discardedCardIds = new Set();

      for (let i = 0; i < 10; i++) {
        const freshMockPlayerStates = {
          player1: { energy: 10, hand: [], deck: [], discardPile: [] },
          player2: {
            energy: 10,
            hand: [
              { id: 'card_1', name: 'Card1' },
              { id: 'card_2', name: 'Card2' },
              { id: 'card_3', name: 'Card3' }
            ],
            deck: [],
            discardPile: []
          }
        };

        const freshContext = {
          actingPlayerId: 'player1',
          playerStates: freshMockPlayerStates
        };

        const effect = { type: 'DISCARD', count: 1, targetPlayer: 'opponent' };
        const result = processor.process(effect, freshContext);

        // Track which card was discarded
        const discardedCard = result.newPlayerStates.player2.discardPile[0];
        discardedCardIds.add(discardedCard.id);
      }

      // Over 10 runs, we should see some variety (not always the same card)
      // This is probabilistic, but with 3 cards and 10 runs, we expect > 1 unique card
      expect(discardedCardIds.size).toBeGreaterThan(1);
    });

    it('should not discard the same card twice in one effect', () => {
      const effect = { type: 'DISCARD', count: 3, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // All discarded cards should have unique IDs
      const discardedIds = result.newPlayerStates.player2.discardPile.map(c => c.id);
      const uniqueIds = new Set(discardedIds);
      expect(uniqueIds.size).toBe(discardedIds.length);
    });
  });

  describe('Return value structure', () => {
    it('should return correct result structure', () => {
      const effect = { type: 'DISCARD', count: 2, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify standard result structure
      expect(result).toHaveProperty('newPlayerStates');
      expect(result).toHaveProperty('additionalEffects');
      expect(result).toHaveProperty('animationEvents');
      expect(Array.isArray(result.additionalEffects)).toBe(true);
      expect(Array.isArray(result.animationEvents)).toBe(true);
    });

    it('should have valid player states in result', () => {
      const effect = { type: 'DISCARD', count: 2, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player1).toBeDefined();
      expect(result.newPlayerStates.player2).toBeDefined();
      expect(Array.isArray(result.newPlayerStates.player1.hand)).toBe(true);
      expect(Array.isArray(result.newPlayerStates.player2.hand)).toBe(true);
      expect(Array.isArray(result.newPlayerStates.player2.discardPile)).toBe(true);
    });
  });

  describe('Correct cards moved to discard', () => {
    it('should move actual card objects from hand to discard', () => {
      mockPlayerStates.player2.hand = [
        { id: 'card_unique_1', name: 'UniqueCard1', cost: 2 },
        { id: 'card_unique_2', name: 'UniqueCard2', cost: 3 }
      ];
      const effect = { type: 'DISCARD', count: 1, targetPlayer: 'opponent' };

      const result = processor.process(effect, mockContext);

      // Verify the discarded card is one of the original cards
      const discardedCard = result.newPlayerStates.player2.discardPile[0];
      const originalIds = ['card_unique_1', 'card_unique_2'];
      expect(originalIds).toContain(discardedCard.id);

      // Verify it has full card properties
      expect(discardedCard).toHaveProperty('name');
      expect(discardedCard).toHaveProperty('cost');
    });
  });
});
