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
  calculateAvailableShips
} from './singlePlayerDeckUtils.js';
import { starterPoolCards, starterPoolDroneNames, starterPoolShipIds } from '../data/saveGameSchema.js';
import fullCardCollection from '../data/cardData.js';
import fullDroneCollection from '../data/droneData.js';
import { shipComponentCollection } from '../data/shipSectionData.js';

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
