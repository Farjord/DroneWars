/**
 * singlePlayerDeckUtils.test.js
 * TDD tests for infinite starter cards in ALL deck slots
 *
 * Test Requirement: Starter cards, drones, and components should be infinite (99)
 * in ALL slots (0-5), not just Slot 0. Non-starter items should still use inventory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateAvailableCards,
  calculateAvailableDrones,
  calculateAvailableComponents,
  calculateAvailableShips,
  calculateEffectiveMaxForCard
} from '../singlePlayerDeckUtils.js';
import { starterPoolCards, starterPoolDroneNames, starterPoolShipIds } from '../../../data/saveGameSchema.js';
import fullCardCollection from '../../../data/cardData.js';
import fullDroneCollection from '../../../data/droneData.js';
import { shipComponentCollection } from '../../../data/shipSectionData.js';

describe('calculateAvailableCards - Infinite Starter Cards', () => {
  const mockShipSlots = [
    { id: 0, status: 'active', decklist: [], drones: [], shipComponents: {} },
    { id: 1, status: 'active', decklist: [], drones: [], shipComponents: {} },
    { id: 2, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 3, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 4, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 5, status: 'empty', decklist: [], drones: [], shipComponents: {} }
  ];

  describe('Slot 0 behavior', () => {
    it('should return 99 for starter cards in Slot 0', () => {
      const starterCardId = starterPoolCards[0];
      expect(starterCardId).toBeDefined();

      const availableCards = calculateAvailableCards(0, mockShipSlots, {});
      const starterCard = availableCards.find(c => c.id === starterCardId);

      expect(starterCard).toBeDefined();
      expect(starterCard.availableQuantity).toBe(99);
      expect(starterCard.isStarterPool).toBe(true);
    });
  });

  describe('Slots 1-5 behavior - NEW requirement', () => {
    it('should return 99 for starter pool cards in Slots 1-5', () => {
      const starterCardId = starterPoolCards[0];
      expect(starterCardId).toBeDefined();

      // Test for Slot 1
      const availableCards = calculateAvailableCards(1, mockShipSlots, {});
      const starterCard = availableCards.find(c => c.id === starterCardId);

      expect(starterCard).toBeDefined();
      expect(starterCard.availableQuantity).toBe(99);
      expect(starterCard.isStarterPool).toBe(true);
    });

    it('should return 99 for starter cards in Slot 3', () => {
      const starterCardId = starterPoolCards[0];

      const availableCards = calculateAvailableCards(3, mockShipSlots, {});
      const starterCard = availableCards.find(c => c.id === starterCardId);

      expect(starterCard).toBeDefined();
      expect(starterCard.availableQuantity).toBe(99);
    });

    it('should return 99 for starter cards in Slot 5', () => {
      const starterCardId = starterPoolCards[0];

      const availableCards = calculateAvailableCards(5, mockShipSlots, {});
      const starterCard = availableCards.find(c => c.id === starterCardId);

      expect(starterCard).toBeDefined();
      expect(starterCard.availableQuantity).toBe(99);
    });

    it('should still use inventory for non-starter cards in Slots 1-5', () => {
      // Find a non-starter card
      const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));

      if (nonStarterCard) {
        // Set up inventory with 5 of this card
        const inventory = { [nonStarterCard.id]: 5 };

        const availableCards = calculateAvailableCards(1, mockShipSlots, inventory);
        const card = availableCards.find(c => c.id === nonStarterCard.id);

        expect(card).toBeDefined();
        expect(card.availableQuantity).toBe(5);
        expect(card.isStarterPool).toBe(false);
      }
    });

    it('should not double-count starter cards used in other slots', () => {
      const starterCardId = starterPoolCards[0];

      // Set up Slot 1 using some starter cards
      const slotsWithUsage = [
        { id: 0, status: 'active', decklist: [], drones: [], shipComponents: {} },
        { id: 1, status: 'active', decklist: [{ id: starterCardId, quantity: 4 }], drones: [], shipComponents: {} },
        { id: 2, status: 'empty', decklist: [], drones: [], shipComponents: {} },
        { id: 3, status: 'empty', decklist: [], drones: [], shipComponents: {} },
        { id: 4, status: 'empty', decklist: [], drones: [], shipComponents: {} },
        { id: 5, status: 'empty', decklist: [], drones: [], shipComponents: {} }
      ];

      // Even though Slot 1 uses starter cards, Slot 2 should still have 99 available
      const availableCards = calculateAvailableCards(2, slotsWithUsage, {});
      const starterCard = availableCards.find(c => c.id === starterCardId);

      expect(starterCard).toBeDefined();
      expect(starterCard.availableQuantity).toBe(99);
    });
  });
});

describe('calculateAvailableDrones - Infinite Starter Drones', () => {
  const mockShipSlots = [
    { id: 0, status: 'active', decklist: [], drones: [], shipComponents: {} },
    { id: 1, status: 'active', decklist: [], drones: [], shipComponents: {} },
    { id: 2, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 3, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 4, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 5, status: 'empty', decklist: [], drones: [], shipComponents: {} }
  ];

  it('should return 99 for starter pool drones in Slot 0', () => {
    const starterDroneName = starterPoolDroneNames[0];
    expect(starterDroneName).toBeDefined();

    const availableDrones = calculateAvailableDrones(0, mockShipSlots, []);
    const starterDrone = availableDrones.find(d => d.name === starterDroneName);

    expect(starterDrone).toBeDefined();
    expect(starterDrone.availableCount).toBe(99);
    expect(starterDrone.isStarterPool).toBe(true);
  });

  it('should return 99 for starter pool drones in Slot 1', () => {
    const starterDroneName = starterPoolDroneNames[0];

    const availableDrones = calculateAvailableDrones(1, mockShipSlots, []);
    const starterDrone = availableDrones.find(d => d.name === starterDroneName);

    expect(starterDrone).toBeDefined();
    expect(starterDrone.availableCount).toBe(99);
    expect(starterDrone.isStarterPool).toBe(true);
  });

  it('should return 99 for starter pool drones in Slot 5', () => {
    const starterDroneName = starterPoolDroneNames[0];

    const availableDrones = calculateAvailableDrones(5, mockShipSlots, []);
    const starterDrone = availableDrones.find(d => d.name === starterDroneName);

    expect(starterDrone).toBeDefined();
    expect(starterDrone.availableCount).toBe(99);
  });

  it('should use instances for non-starter drones in Slots 1-5', () => {
    // Find a non-starter drone
    const nonStarterDrone = fullDroneCollection.find(
      d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
    );

    if (nonStarterDrone) {
      // Create drone instances
      const droneInstances = [
        { instanceId: 'INST_001', droneName: nonStarterDrone.name, shipSlotId: null, isDamaged: false },
        { instanceId: 'INST_002', droneName: nonStarterDrone.name, shipSlotId: null, isDamaged: false }
      ];

      const availableDrones = calculateAvailableDrones(1, mockShipSlots, droneInstances);
      const drone = availableDrones.find(d => d.name === nonStarterDrone.name);

      expect(drone).toBeDefined();
      expect(drone.availableCount).toBe(2);
      expect(drone.isStarterPool).toBe(false);
    }
  });
});

describe('calculateAvailableComponents - Infinite Starter Components', () => {
  const mockShipSlots = [
    { id: 0, status: 'active', decklist: [], drones: [], shipComponents: {} },
    { id: 1, status: 'active', decklist: [], drones: [], shipComponents: {} },
    { id: 2, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 3, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 4, status: 'empty', decklist: [], drones: [], shipComponents: {} },
    { id: 5, status: 'empty', decklist: [], drones: [], shipComponents: {} }
  ];

  // Get starter component IDs from starterPoolCards (components are in there too)
  const starterComponentId = shipComponentCollection.find(c =>
    starterPoolCards.includes(c.id)
  )?.id;

  it('should return 99 for starter pool components in Slot 0', () => {
    if (!starterComponentId) return; // Skip if no starter component found

    const availableComponents = calculateAvailableComponents(0, mockShipSlots, []);
    const starterComponent = availableComponents.find(c => c.id === starterComponentId);

    expect(starterComponent).toBeDefined();
    expect(starterComponent.availableCount).toBe(99);
    expect(starterComponent.isStarterPool).toBe(true);
  });

  it('should return 99 for starter pool components in Slot 1', () => {
    if (!starterComponentId) return;

    const availableComponents = calculateAvailableComponents(1, mockShipSlots, []);
    const starterComponent = availableComponents.find(c => c.id === starterComponentId);

    expect(starterComponent).toBeDefined();
    expect(starterComponent.availableCount).toBe(99);
    expect(starterComponent.isStarterPool).toBe(true);
  });

  it('should return 99 for starter pool components in Slot 5', () => {
    if (!starterComponentId) return;

    const availableComponents = calculateAvailableComponents(5, mockShipSlots, []);
    const starterComponent = availableComponents.find(c => c.id === starterComponentId);

    expect(starterComponent).toBeDefined();
    expect(starterComponent.availableCount).toBe(99);
  });

  it('should use instances for non-starter components in Slots 1-5', () => {
    // Find a non-starter component
    const nonStarterComponent = shipComponentCollection.find(
      c => !starterPoolCards.includes(c.id)
    );

    if (nonStarterComponent) {
      // Create component instances
      const componentInstances = [
        { instanceId: 'COMP_001', componentId: nonStarterComponent.id, shipSlotId: null, currentHull: 10, maxHull: 10 }
      ];

      const availableComponents = calculateAvailableComponents(1, mockShipSlots, componentInstances);
      const component = availableComponents.find(c => c.id === nonStarterComponent.id);

      expect(component).toBeDefined();
      expect(component.availableCount).toBe(1);
      expect(component.isStarterPool).toBe(false);
    }
  });
});

describe('calculateAvailableShips - Infinite Starter Ships', () => {
  const mockShipSlots = [
    { id: 0, status: 'active', shipId: 'SHIP_001', decklist: [], drones: [], shipComponents: {} },
    { id: 1, status: 'empty', shipId: null, decklist: [], drones: [], shipComponents: {} },
    { id: 2, status: 'empty', shipId: null, decklist: [], drones: [], shipComponents: {} },
    { id: 3, status: 'empty', shipId: null, decklist: [], drones: [], shipComponents: {} },
    { id: 4, status: 'empty', shipId: null, decklist: [], drones: [], shipComponents: {} },
    { id: 5, status: 'empty', shipId: null, decklist: [], drones: [], shipComponents: {} }
  ];

  it('should return 99 for starter pool ships in Slot 0', () => {
    const starterShipId = starterPoolShipIds[0];
    if (!starterShipId) return;

    const availableShips = calculateAvailableShips(0, mockShipSlots, {});
    const starterShip = availableShips.find(s => s.id === starterShipId);

    expect(starterShip).toBeDefined();
    expect(starterShip.availableCount).toBe(99);
    expect(starterShip.isStarterPool).toBe(true);
  });

  it('should return 99 for starter pool ships in Slot 1', () => {
    const starterShipId = starterPoolShipIds[0];
    if (!starterShipId) return;

    const availableShips = calculateAvailableShips(1, mockShipSlots, {});
    const starterShip = availableShips.find(s => s.id === starterShipId);

    expect(starterShip).toBeDefined();
    expect(starterShip.availableCount).toBe(99);
    expect(starterShip.isStarterPool).toBe(true);
  });

  it('should return 99 for starter pool ships in Slot 5', () => {
    const starterShipId = starterPoolShipIds[0];
    if (!starterShipId) return;

    const availableShips = calculateAvailableShips(5, mockShipSlots, {});
    const starterShip = availableShips.find(s => s.id === starterShipId);

    expect(starterShip).toBeDefined();
    expect(starterShip.availableCount).toBe(99);
  });
});

/**
 * calculateEffectiveMaxForCard - TDD tests for deck editor card limits
 *
 * This function calculates the effective maximum copies of a card that can be
 * in a deck, considering:
 * - maxInDeck: The card's inherent limit (e.g., 4 for common, 2 for rare)
 * - availableQuantity: How many copies the player owns and are available
 * - currentCountInDeck: How many of this specific variant are in the deck
 * - totalBaseCardCountInDeck: Total of all variants of this base card in deck
 */
describe('calculateEffectiveMaxForCard', () => {
  describe('basic availability limits', () => {
    // Player owns 2 copies, maxInDeck=4 → Can only add 2
    it('should return availableQuantity when less than maxInDeck', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 2,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(2);
    });

    // Player owns 10 copies, maxInDeck=4 → Can only add 4
    it('should return maxInDeck when availableQuantity exceeds it', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 10,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(4);
    });

    // Starter cards have availableQuantity=99, should respect maxInDeck
    it('should handle starter pool cards (availableQuantity=99)', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 99,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(4);
    });

    // Rare cards with maxInDeck=2
    it('should handle rare cards with maxInDeck=2', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 2,
        availableQuantity: 5,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(2);
    });
  });

  describe('with cards already in deck', () => {
    // Own 3, have 2 in deck, maxInDeck=4 → effectiveMax = 3 (can still have up to 3)
    it('should account for copies already in deck', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 3,
        currentCountInDeck: 2,
        totalBaseCardCountInDeck: 2
      });
      expect(result).toBe(3);
    });

    // Own 2, have 2 in deck → effectiveMax = 2 (at max ownership)
    it('should return current count when no more available', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 2,
        currentCountInDeck: 2,
        totalBaseCardCountInDeck: 2
      });
      expect(result).toBe(2);
    });

    // Own 4, have 4 in deck, maxInDeck=4 → effectiveMax = 4 (at both limits)
    it('should allow keeping cards at both maxInDeck and availability limit', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 4,
        currentCountInDeck: 4,
        totalBaseCardCountInDeck: 4
      });
      expect(result).toBe(4);
    });

    // Own 1, have 0 in deck, maxInDeck=4 → effectiveMax = 1
    it('should allow adding up to available even with empty deck', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 1,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(1);
    });
  });

  describe('base card variant tracking', () => {
    // Have 2x CARD001 (base), adding CARD001_ENHANCED (variant)
    // Both share baseCardId, maxInDeck=4, own 10 of enhanced
    // Can only add 2 more enhanced because base already has 2
    it('should limit based on base card total across variants', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 10,
        currentCountInDeck: 0,      // This variant (enhanced) has 0 in deck
        totalBaseCardCountInDeck: 2  // But base card total is 2
      });
      expect(result).toBe(2);
    });

    // Own 3 of enhanced, base card has 2 regular in deck
    // maxInDeck=4 means only 2 slots left for enhanced
    // limited to min(2 remaining base, 3 owned) = 2
    it('should combine availability and base card limits', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 3,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 2
      });
      expect(result).toBe(2);
    });

    // Have 2 enhanced in deck, base total is 3 (1 regular + 2 enhanced)
    // maxInDeck=4, own 5 enhanced
    // remaining for base = 4 - (3 - 2) = 3
    // effectiveMax = min(3, 5) = 3
    it('should correctly calculate with mixed variants in deck', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 5,
        currentCountInDeck: 2,       // 2 enhanced in deck
        totalBaseCardCountInDeck: 3   // Total: 1 regular + 2 enhanced
      });
      expect(result).toBe(3);
    });

    // Edge case: current variant count equals total base count
    it('should work when only one variant is in deck', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 4,
        currentCountInDeck: 3,
        totalBaseCardCountInDeck: 3  // Same as current (no other variants)
      });
      expect(result).toBe(4);
    });
  });

  describe('edge cases', () => {
    // No copies available
    it('should return 0 when availableQuantity is 0', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: 0,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(0);
    });

    // Non-extraction mode cards may not have availableQuantity
    it('should handle undefined availableQuantity (non-extraction mode)', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: undefined,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(4); // Falls back to maxInDeck
    });

    // Null availability
    it('should handle null availableQuantity', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: null,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(4); // Falls back to maxInDeck
    });

    // Should never return negative
    it('should never return negative values', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 4,
        availableQuantity: -1,  // Invalid but shouldn't break
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBeGreaterThanOrEqual(0);
    });

    // Zero maxInDeck (theoretical edge case)
    it('should handle maxInDeck of 0', () => {
      const result = calculateEffectiveMaxForCard({
        maxInDeck: 0,
        availableQuantity: 5,
        currentCountInDeck: 0,
        totalBaseCardCountInDeck: 0
      });
      expect(result).toBe(0);
    });
  });
});
