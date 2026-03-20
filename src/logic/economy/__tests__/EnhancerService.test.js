import { describe, it, expect, vi, beforeEach } from 'vitest';
import fullCardCollection from '../../../data/cardData.js';
import { starterPoolCards } from '../../../data/saveGameSchema.js';
import { ECONOMY } from '../../../data/economyData.js';

// Mock dependencies
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

vi.mock('../CreditManager.js', () => ({
  default: {
    canAfford: vi.fn(() => true),
    deduct: vi.fn(() => ({ success: true, newBalance: 500 }))
  }
}));

// Import after mocks
import enhancerService from '../EnhancerService.js';
import gameStateManager from '../../../managers/GameStateManager.js';
import creditManager from '../CreditManager.js';

// Find a real non-starter, non-enhanced, non-aiOnly card with a known _ENHANCED version
const enhancedIds = new Set(
  fullCardCollection
    .filter(c => c.id.endsWith('_ENHANCED'))
    .map(c => c.baseCardId)
);
const baseCardWithEnhanced = fullCardCollection.find(
  c => !c.id.endsWith('_ENHANCED') && !c.aiOnly && enhancedIds.has(c.id) && !starterPoolCards.includes(c.id)
);
const baseCardWithoutEnhanced = fullCardCollection.find(
  c => !c.id.endsWith('_ENHANCED') && !c.aiOnly && !enhancedIds.has(c.id) && !starterPoolCards.includes(c.id)
);

// Find a starter card that has an enhanced version (for starter enhancement tests)
const starterActionCards = starterPoolCards.filter(id => enhancedIds.has(id));
const starterCardId = starterActionCards[0];

function createMockState(overrides = {}) {
  return {
    singlePlayerProfile: { credits: 5000 },
    singlePlayerInventory: {},
    singlePlayerShipSlots: [],
    ...overrides
  };
}

describe('EnhancerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameStateManager.getState.mockReturnValue(createMockState());
  });

  // ====================
  // Cycle 1: Cost lookups
  // ====================
  describe('getEnhancementCost', () => {
    it('returns correct cost for each rarity', () => {
      if (!baseCardWithEnhanced) return;
      const cost = enhancerService.getEnhancementCost(baseCardWithEnhanced.id);
      expect(cost).toBe(ECONOMY.ENHANCEMENT_COSTS[baseCardWithEnhanced.rarity]);
    });

    it('returns Common cost for unknown card', () => {
      const cost = enhancerService.getEnhancementCost('NONEXISTENT_CARD');
      expect(cost).toBe(ECONOMY.ENHANCEMENT_COSTS.Common);
    });
  });

  describe('getCopiesRequired', () => {
    it('returns per-rarity value from ENHANCEMENT_COPIES_REQUIRED', () => {
      if (!baseCardWithEnhanced) return;
      const copies = enhancerService.getCopiesRequired(baseCardWithEnhanced.id);
      expect(copies).toBe(ECONOMY.ENHANCEMENT_COPIES_REQUIRED[baseCardWithEnhanced.rarity]);
    });
  });

  describe('getEnhancedVersion', () => {
    it('returns the _ENHANCED card object for a base card with an enhanced version', () => {
      if (!baseCardWithEnhanced) return;
      const enhanced = enhancerService.getEnhancedVersion(baseCardWithEnhanced.id);
      expect(enhanced).not.toBeNull();
      expect(enhanced.id).toBe(baseCardWithEnhanced.id + '_ENHANCED');
    });

    it('returns null for a card with no enhanced version', () => {
      if (!baseCardWithoutEnhanced) return;
      const enhanced = enhancerService.getEnhancedVersion(baseCardWithoutEnhanced.id);
      expect(enhanced).toBeNull();
    });
  });

  // ====================
  // Cycle 2: canEnhance
  // ====================
  describe('canEnhance', () => {
    it('returns false when player has fewer than required copies', () => {
      if (!baseCardWithEnhanced) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: 1 }
      }));
      const result = enhancerService.canEnhance(baseCardWithEnhanced.id);
      expect(result.canEnhance).toBe(false);
    });

    it('returns false when player has insufficient credits', () => {
      if (!baseCardWithEnhanced) return;
      creditManager.canAfford.mockReturnValue(false);
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: 5 }
      }));
      const result = enhancerService.canEnhance(baseCardWithEnhanced.id);
      expect(result.canEnhance).toBe(false);
    });

    it('returns false when no enhanced version exists', () => {
      if (!baseCardWithoutEnhanced) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithoutEnhanced.id]: 5 }
      }));
      const result = enhancerService.canEnhance(baseCardWithoutEnhanced.id);
      expect(result.canEnhance).toBe(false);
    });

    it('returns false for a card that is already _ENHANCED', () => {
      const enhancedCard = fullCardCollection.find(c => c.id.endsWith('_ENHANCED'));
      if (!enhancedCard) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [enhancedCard.id]: 5 }
      }));
      const result = enhancerService.canEnhance(enhancedCard.id);
      expect(result.canEnhance).toBe(false);
    });

    it('returns true when all requirements are met', () => {
      if (!baseCardWithEnhanced) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: 5 }
      }));
      creditManager.canAfford.mockReturnValue(true);
      const result = enhancerService.canEnhance(baseCardWithEnhanced.id);
      expect(result.canEnhance).toBe(true);
    });

    it('returns true for starter cards with sufficient credits (no copy check)', () => {
      if (!starterCardId) return;
      creditManager.canAfford.mockReturnValue(true);
      const result = enhancerService.canEnhance(starterCardId);
      expect(result.canEnhance).toBe(true);
    });

    it('returns false for starter cards with insufficient credits', () => {
      if (!starterCardId) return;
      creditManager.canAfford.mockReturnValue(false);
      const result = enhancerService.canEnhance(starterCardId);
      expect(result.canEnhance).toBe(false);
    });
  });

  // ============================
  // Cycle 3: getEnhanceableCards
  // ============================
  describe('getEnhanceableCards', () => {
    it('returns cards with enough copies', () => {
      if (!baseCardWithEnhanced) return;
      const copiesNeeded = ECONOMY.ENHANCEMENT_COPIES_REQUIRED[baseCardWithEnhanced.rarity];
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: copiesNeeded + 1 }
      }));
      creditManager.canAfford.mockReturnValue(true);
      const cards = enhancerService.getEnhanceableCards();
      expect(cards.some(c => c.card.id === baseCardWithEnhanced.id)).toBe(true);
    });

    it('does not include cards with fewer than required copies', () => {
      if (!baseCardWithEnhanced) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: 1 }
      }));
      const cards = enhancerService.getEnhanceableCards();
      expect(cards.some(c => c.card.id === baseCardWithEnhanced.id)).toBe(false);
    });

    it('does not include _ENHANCED cards', () => {
      const enhancedCard = fullCardCollection.find(c => c.id.endsWith('_ENHANCED'));
      if (!enhancedCard) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [enhancedCard.id]: 10 }
      }));
      const cards = enhancerService.getEnhanceableCards();
      expect(cards.some(c => c.card.id === enhancedCard.id)).toBe(false);
    });

    it('does not include aiOnly cards', () => {
      const aiOnlyCard = fullCardCollection.find(c => c.aiOnly);
      if (!aiOnlyCard) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [aiOnlyCard.id]: 10 }
      }));
      const cards = enhancerService.getEnhanceableCards();
      expect(cards.some(c => c.card.id === aiOnlyCard.id)).toBe(false);
    });

    it('includes starter cards (enhanceable for credits only)', () => {
      if (!starterCardId) return;
      creditManager.canAfford.mockReturnValue(true);
      const cards = enhancerService.getEnhanceableCards();
      expect(cards.some(c => c.card.id === starterCardId)).toBe(true);
    });
  });

  // ========================
  // Cycle 4: enhance (core)
  // ========================
  describe('enhance', () => {
    it('deducts copies from inventory, deducts credits, adds 1 enhanced copy', () => {
      if (!baseCardWithEnhanced) return;
      const copiesNeeded = ECONOMY.ENHANCEMENT_COPIES_REQUIRED[baseCardWithEnhanced.rarity];
      const startingQty = copiesNeeded + 2;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: startingQty },
        singlePlayerShipSlots: []
      }));
      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = enhancerService.enhance(baseCardWithEnhanced.id);

      expect(result.success).toBe(true);
      expect(result.removedCopies).toBe(copiesNeeded);
      expect(result.enhancedCardId).toBe(baseCardWithEnhanced.id + '_ENHANCED');

      // Verify setState was called with updated inventory
      const setStateCall = gameStateManager.setState.mock.calls[0][0];
      expect(setStateCall.singlePlayerInventory[baseCardWithEnhanced.id]).toBe(startingQty - copiesNeeded);
      expect(setStateCall.singlePlayerInventory[baseCardWithEnhanced.id + '_ENHANCED']).toBe(1);
    });

    it('enhance starter card deducts credits only, no inventory deduction', () => {
      if (!starterCardId) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: {},
        singlePlayerShipSlots: []
      }));
      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = enhancerService.enhance(starterCardId);

      expect(result.success).toBe(true);
      expect(result.removedCopies).toBe(0);

      // Verify enhanced card was added
      const setStateCall = gameStateManager.setState.mock.calls[0][0];
      expect(setStateCall.singlePlayerInventory[starterCardId + '_ENHANCED']).toBe(1);
      // Starter card quantity should not be affected (no inventory entry to deduct from)
      expect(setStateCall.singlePlayerInventory[starterCardId]).toBeUndefined();
    });

    it('returns correct result shape', () => {
      if (!baseCardWithEnhanced) return;
      const copiesNeeded = ECONOMY.ENHANCEMENT_COPIES_REQUIRED[baseCardWithEnhanced.rarity];
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: copiesNeeded },
        singlePlayerShipSlots: []
      }));
      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = enhancerService.enhance(baseCardWithEnhanced.id);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('cost');
      expect(result).toHaveProperty('removedCopies');
      expect(result).toHaveProperty('enhancedCardId');
    });

    it('fails when canEnhance returns false', () => {
      if (!baseCardWithEnhanced) return;
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: 0 }
      }));
      const result = enhancerService.enhance(baseCardWithEnhanced.id);
      expect(result.success).toBe(false);
    });
  });

  // ==============================
  // Cycle 5: enhance (deck auto-fix)
  // ==============================
  describe('enhance - deck auto-fix', () => {
    it('caps deck quantities when inventory drops below deck usage', () => {
      if (!baseCardWithEnhanced) return;
      const copiesNeeded = ECONOMY.ENHANCEMENT_COPIES_REQUIRED[baseCardWithEnhanced.rarity];
      // Player has exactly copiesNeeded + 1 copies. After enhancement, 1 remains.
      // But deck uses 2 in slot 1 — should cap to 1.
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: copiesNeeded + 1 },
        singlePlayerShipSlots: [
          { name: 'Starter', decklist: [] }, // slot 0 (starter)
          { name: 'Slot 1', decklist: [{ id: baseCardWithEnhanced.id, quantity: 2 }] }
        ]
      }));
      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = enhancerService.enhance(baseCardWithEnhanced.id);

      expect(result.success).toBe(true);
      expect(result.deckWarnings.length).toBeGreaterThan(0);

      const setStateCall = gameStateManager.setState.mock.calls[0][0];
      const slot1Deck = setStateCall.singlePlayerShipSlots[1].decklist;
      const entry = slot1Deck.find(e => e.id === baseCardWithEnhanced.id);
      expect(entry.quantity).toBe(1); // capped to remaining inventory
    });

    it('removes deck entries where quantity reaches 0', () => {
      if (!baseCardWithEnhanced) return;
      const copiesNeeded = ECONOMY.ENHANCEMENT_COPIES_REQUIRED[baseCardWithEnhanced.rarity];
      // Player has exactly copiesNeeded copies. After enhancement, 0 remain.
      // Deck has 1 copy — should be removed entirely.
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: copiesNeeded },
        singlePlayerShipSlots: [
          { name: 'Starter', decklist: [] },
          { name: 'Slot 1', decklist: [{ id: baseCardWithEnhanced.id, quantity: 1 }] }
        ]
      }));
      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = enhancerService.enhance(baseCardWithEnhanced.id);

      expect(result.success).toBe(true);
      const setStateCall = gameStateManager.setState.mock.calls[0][0];
      const slot1Deck = setStateCall.singlePlayerShipSlots[1].decklist;
      expect(slot1Deck.find(e => e.id === baseCardWithEnhanced.id)).toBeUndefined();
    });

    it('distributes remaining inventory sequentially across multiple slots', () => {
      if (!baseCardWithEnhanced) return;
      const copiesNeeded = ECONOMY.ENHANCEMENT_COPIES_REQUIRED[baseCardWithEnhanced.rarity];
      // Player has copiesNeeded + 3 copies. After enhancement, 3 remain.
      // 4 slots each use 2 copies — sequential cap: slot1=2, slot2=1, slot3=0, slot4=0
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: copiesNeeded + 3 },
        singlePlayerShipSlots: [
          { name: 'Starter', decklist: [] },
          { name: 'Slot 1', decklist: [{ id: baseCardWithEnhanced.id, quantity: 2 }] },
          { name: 'Slot 2', decklist: [{ id: baseCardWithEnhanced.id, quantity: 2 }] },
          { name: 'Slot 3', decklist: [{ id: baseCardWithEnhanced.id, quantity: 2 }] },
          { name: 'Slot 4', decklist: [{ id: baseCardWithEnhanced.id, quantity: 2 }] }
        ]
      }));
      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = enhancerService.enhance(baseCardWithEnhanced.id);

      expect(result.success).toBe(true);
      const setStateCall = gameStateManager.setState.mock.calls[0][0];
      const slots = setStateCall.singlePlayerShipSlots;

      // Slot 1: 2 remain (capped at min(2, 3) = 2), remaining = 1
      expect(slots[1].decklist.find(e => e.id === baseCardWithEnhanced.id)?.quantity).toBe(2);
      // Slot 2: 1 remain (capped at min(2, 1) = 1), remaining = 0
      expect(slots[2].decklist.find(e => e.id === baseCardWithEnhanced.id)?.quantity).toBe(1);
      // Slot 3: removed (capped at 0)
      expect(slots[3].decklist.find(e => e.id === baseCardWithEnhanced.id)).toBeUndefined();
      // Slot 4: removed (capped at 0)
      expect(slots[4].decklist.find(e => e.id === baseCardWithEnhanced.id)).toBeUndefined();
    });

    it('returns empty deckWarnings when no decks are affected', () => {
      if (!baseCardWithEnhanced) return;
      const copiesNeeded = ECONOMY.ENHANCEMENT_COPIES_REQUIRED[baseCardWithEnhanced.rarity];
      gameStateManager.getState.mockReturnValue(createMockState({
        singlePlayerInventory: { [baseCardWithEnhanced.id]: copiesNeeded + 5 },
        singlePlayerShipSlots: [
          { name: 'Starter', decklist: [] },
          { name: 'Slot 1', decklist: [{ id: baseCardWithEnhanced.id, quantity: 1 }] }
        ]
      }));
      creditManager.canAfford.mockReturnValue(true);
      creditManager.deduct.mockReturnValue({ success: true });

      const result = enhancerService.enhance(baseCardWithEnhanced.id);

      expect(result.success).toBe(true);
      expect(result.deckWarnings).toEqual([]);
    });
  });
});
