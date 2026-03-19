/**
 * singlePlayerDeckUtils.test.js
 * TDD tests for availability models
 *
 * Cards: shared across all decks, no cross-slot reservation.
 *   availableQuantity = 99 (starter) or min(inventory[cardId], maxInDeck) (non-starter)
 * Drones: blueprint model. Starter + unlocked blueprints, all unlimited (99).
 * Components: blueprint model. Same as drones.
 * Ships: consumable model. Inventory count IS the available count.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAvailableCards,
  calculateAvailableDrones,
  calculateAvailableComponents,
  calculateAvailableShips,
  calculateEffectiveMaxForCard
} from '../singlePlayerDeckUtils.js';
import { starterPoolCards, starterPoolDroneNames } from '../../../data/saveGameSchema.js';
import fullCardCollection from '../../../data/cardData.js';
import fullDroneCollection from '../../../data/droneData.js';
import { shipComponentCollection } from '../../../data/shipSectionData.js';

// ========================================
// CARDS — shared model (no reservation)
// ========================================
describe('calculateAvailableCards — shared model', () => {
  it('should return 99 for starter pool cards', () => {
    const starterCardId = starterPoolCards[0];
    expect(starterCardId).toBeDefined();

    const result = calculateAvailableCards({});
    const card = result.find(c => c.id === starterCardId);

    expect(card).toBeDefined();
    expect(card.availableQuantity).toBe(99);
    expect(card.isStarterPool).toBe(true);
  });

  it('should return min(inventory, maxInDeck) for non-starter cards', () => {
    const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));
    if (!nonStarterCard) return;

    const inventory = { [nonStarterCard.id]: 10 };
    const result = calculateAvailableCards(inventory);
    const card = result.find(c => c.id === nonStarterCard.id);

    expect(card).toBeDefined();
    // Should be capped at maxInDeck
    expect(card.availableQuantity).toBe(Math.min(10, nonStarterCard.maxInDeck));
    expect(card.isStarterPool).toBe(false);
  });

  it('should return 0 (filtered out) for non-starter cards not in inventory', () => {
    const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));
    if (!nonStarterCard) return;

    const result = calculateAvailableCards({});
    const card = result.find(c => c.id === nonStarterCard.id);

    // Should be filtered out (availableQuantity would be 0)
    expect(card).toBeUndefined();
  });

  it('same card should be available in multiple decks (no reservation)', () => {
    const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));
    if (!nonStarterCard) return;

    const inventory = { [nonStarterCard.id]: 2 };

    // Both calls should return the same availability — no reservation
    const result1 = calculateAvailableCards(inventory);
    const result2 = calculateAvailableCards(inventory);

    const card1 = result1.find(c => c.id === nonStarterCard.id);
    const card2 = result2.find(c => c.id === nonStarterCard.id);

    expect(card1.availableQuantity).toBe(card2.availableQuantity);
  });

  it('should cap availability at maxInDeck even when inventory is higher', () => {
    const nonStarterCard = fullCardCollection.find(
      c => !starterPoolCards.includes(c.id) && c.maxInDeck <= 4
    );
    if (!nonStarterCard) return;

    const inventory = { [nonStarterCard.id]: 99 };
    const result = calculateAvailableCards(inventory);
    const card = result.find(c => c.id === nonStarterCard.id);

    expect(card).toBeDefined();
    expect(card.availableQuantity).toBe(nonStarterCard.maxInDeck);
  });
});

// ========================================
// DRONES — blueprint model
// ========================================
describe('calculateAvailableDrones — blueprint model', () => {
  it('should return 99 for starter pool drones with no blueprints', () => {
    const starterDroneName = starterPoolDroneNames[0];
    expect(starterDroneName).toBeDefined();

    const result = calculateAvailableDrones([]);
    const drone = result.find(d => d.name === starterDroneName);

    expect(drone).toBeDefined();
    expect(drone.availableCount).toBe(99);
    expect(drone.isStarterPool).toBe(true);
  });

  it('should return unlocked blueprint drones with availableCount 99', () => {
    const nonStarterDrone = fullDroneCollection.find(
      d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
    );
    if (!nonStarterDrone) return;

    const result = calculateAvailableDrones([nonStarterDrone.name]);
    const drone = result.find(d => d.name === nonStarterDrone.name);

    expect(drone).toBeDefined();
    expect(drone.availableCount).toBe(99);
    expect(drone.isStarterPool).toBe(false);
  });

  it('should NOT return non-starter drones without blueprint', () => {
    const nonStarterDrone = fullDroneCollection.find(
      d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
    );
    if (!nonStarterDrone) return;

    const result = calculateAvailableDrones([]);
    const drone = result.find(d => d.name === nonStarterDrone.name);

    expect(drone).toBeUndefined();
  });

  it('should include all starter drones even with empty blueprints', () => {
    const result = calculateAvailableDrones([]);

    starterPoolDroneNames.forEach(name => {
      const drone = result.find(d => d.name === name);
      expect(drone).toBeDefined();
      expect(drone.availableCount).toBe(99);
    });
  });

  it('should filter out non-selectable drones', () => {
    const nonSelectableDrone = fullDroneCollection.find(d => d.selectable === false);
    if (!nonSelectableDrone) return;

    const result = calculateAvailableDrones([nonSelectableDrone.name]);
    const drone = result.find(d => d.name === nonSelectableDrone.name);

    expect(drone).toBeUndefined();
  });
});

// ========================================
// COMPONENTS — blueprint model
// ========================================
describe('calculateAvailableComponents — blueprint model', () => {
  const starterComponentId = shipComponentCollection.find(c =>
    starterPoolCards.includes(c.id)
  )?.id;

  it('should return 99 for starter pool components', () => {
    if (!starterComponentId) return;

    const result = calculateAvailableComponents([]);
    const comp = result.find(c => c.id === starterComponentId);

    expect(comp).toBeDefined();
    expect(comp.availableCount).toBe(99);
    expect(comp.isStarterPool).toBe(true);
  });

  it('should return unlocked blueprint components with availableCount 99', () => {
    const nonStarterComp = shipComponentCollection.find(
      c => !starterPoolCards.includes(c.id)
    );
    if (!nonStarterComp) return;

    const result = calculateAvailableComponents([nonStarterComp.id]);
    const comp = result.find(c => c.id === nonStarterComp.id);

    expect(comp).toBeDefined();
    expect(comp.availableCount).toBe(99);
    expect(comp.isStarterPool).toBe(false);
  });

  it('should NOT return non-starter components without blueprint', () => {
    const nonStarterComp = shipComponentCollection.find(
      c => !starterPoolCards.includes(c.id)
    );
    if (!nonStarterComp) return;

    const result = calculateAvailableComponents([]);
    const comp = result.find(c => c.id === nonStarterComp.id);

    expect(comp).toBeUndefined();
  });

  it('should include all starter components with empty blueprints', () => {
    const result = calculateAvailableComponents([]);
    const starterComponents = shipComponentCollection.filter(c =>
      starterPoolCards.includes(c.id)
    );

    starterComponents.forEach(sc => {
      const comp = result.find(c => c.id === sc.id);
      expect(comp).toBeDefined();
      expect(comp.availableCount).toBe(99);
    });
  });
});

// ========================================
// SHIPS — consumable model (Phase C)
// ========================================
describe('calculateAvailableShips — consumable model', () => {
  it('should return ship with correct availableCount from inventory', () => {
    const allShips = calculateAvailableShips({ SHIP_001: 2 });
    const ship = allShips.find(s => s.id === 'SHIP_001');

    expect(ship).toBeDefined();
    expect(ship.availableCount).toBe(2);
  });

  it('should filter out ships not in inventory', () => {
    const allShips = calculateAvailableShips({});
    const ship = allShips.find(s => s.id === 'SHIP_001');

    expect(ship).toBeUndefined();
  });

  it('should return multiple ships with correct counts', () => {
    const inventory = { SHIP_001: 1, SHIP_002: 3 };
    const allShips = calculateAvailableShips(inventory);

    const ship1 = allShips.find(s => s.id === 'SHIP_001');
    const ship2 = allShips.find(s => s.id === 'SHIP_002');

    // SHIP_001 always exists; SHIP_002 may not exist in shipData
    expect(ship1).toBeDefined();
    expect(ship1.availableCount).toBe(1);

    if (ship2) {
      expect(ship2.availableCount).toBe(3);
    }
  });

  it('should return empty array for empty inventory', () => {
    const allShips = calculateAvailableShips({});
    expect(allShips).toEqual([]);
  });
});

// ========================================
// calculateEffectiveMaxForCard — unchanged
// ========================================
describe('calculateEffectiveMaxForCard', () => {
  describe('basic availability limits', () => {
    it('should return availableQuantity when less than maxInDeck', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 2,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(2);
    });

    it('should return maxInDeck when availableQuantity exceeds it', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 10,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(4);
    });

    it('should handle starter pool cards (availableQuantity=99)', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 99,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(4);
    });
  });

  describe('with cards already in deck', () => {
    it('should account for copies already in deck', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 3,
        currentCountInDeck: 2,
        totalBaseCardCountInDeck: 2
      });
      expect(result).toBe(3);
    });

    it('should return current count when no more available', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 2,
        currentCountInDeck: 2,
        totalBaseCardCountInDeck: 2
      });
      expect(result).toBe(2);
    });
  });

  describe('base card variant tracking', () => {
    it('should limit based on base card total across variants', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 10,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 2
      });
      expect(result).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should return 0 when availableQuantity is 0', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 0,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(0);
    });

    it('should handle undefined availableQuantity (non-extraction mode)', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: undefined,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(4);
    });

    it('should never return negative values', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: -1,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
