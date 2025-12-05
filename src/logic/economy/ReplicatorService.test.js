/**
 * ReplicatorService.test.js
 * TDD tests for starter card replication restrictions
 *
 * Test Requirement: Starter cards should NOT be replicable - they are always
 * available in unlimited quantities and don't need to be crafted/replicated.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import replicatorService from './ReplicatorService.js';
import gameStateManager from '../../managers/GameStateManager.js';
import { starterPoolCards } from '../../data/saveGameSchema.js';
import fullCardCollection from '../../data/cardData.js';

// Mock the gameStateManager
vi.mock('../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

// Mock creditManager
vi.mock('./CreditManager.js', () => ({
  default: {
    canAfford: vi.fn(() => true),
    deduct: vi.fn(() => ({ success: true }))
  }
}));

describe('ReplicatorService - Starter Card Restrictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default state with some credits and inventory
    gameStateManager.getState.mockReturnValue({
      singlePlayerCredits: 1000,
      singlePlayerInventory: {
        'CARD_OWNED_001': 2,  // A non-starter card the player owns
        'CARD_OWNED_002': 1
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isStarterCard', () => {
    it('should return true for cards in starterPoolCards', () => {
      // Get a starter card from the actual pool
      const starterCardId = starterPoolCards[0];
      expect(starterCardId).toBeDefined();
      expect(replicatorService.isStarterCard(starterCardId)).toBe(true);
    });

    it('should return false for cards NOT in starterPoolCards', () => {
      expect(replicatorService.isStarterCard('NON_EXISTENT_CARD')).toBe(false);
    });
  });

  describe('canReplicate - starter cards should be blocked', () => {
    it('should return canReplicate: false for starter pool cards', () => {
      // Get a starter card from the actual pool
      const starterCardId = starterPoolCards[0];
      expect(starterCardId).toBeDefined();

      const result = replicatorService.canReplicate(starterCardId);

      expect(result.canReplicate).toBe(false);
    });

    it('should return reason: "Starter cards cannot be replicated" for starter cards', () => {
      const starterCardId = starterPoolCards[0];

      const result = replicatorService.canReplicate(starterCardId);

      expect(result.reason).toBe('Starter cards cannot be replicated');
    });

    it('should still allow replication of non-starter cards owned in inventory', () => {
      // Find a non-starter card from the collection
      const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));

      if (nonStarterCard) {
        // Set up inventory with this card
        gameStateManager.getState.mockReturnValue({
          singlePlayerCredits: 1000,
          singlePlayerInventory: {
            [nonStarterCard.id]: 1
          }
        });

        const result = replicatorService.canReplicate(nonStarterCard.id);

        expect(result.canReplicate).toBe(true);
      }
    });

    it('should still block non-starter cards that are not owned', () => {
      // Use a card that doesn't exist in inventory
      const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));

      if (nonStarterCard) {
        gameStateManager.getState.mockReturnValue({
          singlePlayerCredits: 1000,
          singlePlayerInventory: {} // Empty inventory
        });

        const result = replicatorService.canReplicate(nonStarterCard.id);

        expect(result.canReplicate).toBe(false);
        expect(result.reason).toBe('Card not owned');
      }
    });
  });

  describe('getReplicatableCards - should exclude starter cards', () => {
    it('should NOT include starter pool cards in replicatable list', () => {
      const replicatableCards = replicatorService.getReplicatableCards();

      // Check that no starter pool cards are in the result
      const hasStarterCard = replicatableCards.some(item =>
        starterPoolCards.includes(item.card.id)
      );

      expect(hasStarterCard).toBe(false);
    });

    it('should only include cards from inventory (non-starter)', () => {
      // Set up inventory with specific non-starter cards
      const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));

      if (nonStarterCard) {
        gameStateManager.getState.mockReturnValue({
          singlePlayerCredits: 1000,
          singlePlayerInventory: {
            [nonStarterCard.id]: 3
          }
        });

        const replicatableCards = replicatorService.getReplicatableCards();

        // Should only contain the owned non-starter card
        expect(replicatableCards.length).toBe(1);
        expect(replicatableCards[0].card.id).toBe(nonStarterCard.id);
        expect(replicatableCards[0].quantity).toBe(3);
      }
    });

    it('should return empty array when player only has starter cards conceptually available', () => {
      // Player has no owned cards in inventory
      gameStateManager.getState.mockReturnValue({
        singlePlayerCredits: 1000,
        singlePlayerInventory: {}
      });

      const replicatableCards = replicatorService.getReplicatableCards();

      // Should be empty since starter cards are excluded and no non-starters are owned
      expect(replicatableCards.length).toBe(0);
    });
  });

  describe('getReplicationCost - should still work for display purposes', () => {
    it('should return starter costs for starter cards (for UI info)', () => {
      const starterCardId = starterPoolCards[0];
      const card = fullCardCollection.find(c => c.id === starterCardId);

      if (card) {
        const cost = replicatorService.getReplicationCost(starterCardId);
        // Starter cards use STARTER_REPLICATION_COSTS which are lower
        // We just verify it returns a number (the cost calculation itself still works)
        expect(typeof cost).toBe('number');
        expect(cost).toBeGreaterThan(0);
      }
    });
  });
});
