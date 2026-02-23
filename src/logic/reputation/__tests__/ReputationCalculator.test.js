/**
 * ReputationCalculator.test.js
 * Tests for loadout value calculation with starter pool exclusion
 *
 * Test Requirement: Starter pool items (cards, drones, ships, components)
 * should NOT contribute to loadout value. Only non-starter items that
 * represent player risk should count towards reputation gain.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCardValue,
  calculateShipValue,
  calculateDroneValue,
  calculateComponentValue,
  calculateLoadoutValue,
  getBlueprintCost
} from '../ReputationCalculator.js';
import { starterPoolCards, starterPoolDroneNames, starterPoolShipIds } from '../../../data/saveGameSchema.js';
import fullCardCollection from '../../../data/cardData.js';
import fullDroneCollection from '../../../data/droneData.js';
import { shipComponentCollection } from '../../../data/shipSectionData.js';
import { shipCollection } from '../../../data/shipData.js';

describe('ReputationCalculator - Starter Pool Exclusion', () => {

  describe('calculateCardValue', () => {
    it('should return 0 for a deck containing only starter pool cards', () => {
      // Use actual starter pool card IDs
      const starterOnlyDecklist = [
        { id: starterPoolCards[0], quantity: 4 },
        { id: starterPoolCards[1], quantity: 4 }
      ];

      const value = calculateCardValue(starterOnlyDecklist);
      expect(value).toBe(0);
    });

    it('should calculate value only for non-starter cards', () => {
      // Find a non-starter card
      const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));

      if (nonStarterCard) {
        const expectedCost = getBlueprintCost(nonStarterCard.rarity);
        const decklist = [{ id: nonStarterCard.id, quantity: 2 }];

        const value = calculateCardValue(decklist);
        expect(value).toBe(expectedCost * 2);
      }
    });

    it('should calculate value correctly for mixed deck (starter + non-starter)', () => {
      // Find a non-starter card
      const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));

      if (nonStarterCard) {
        const expectedCost = getBlueprintCost(nonStarterCard.rarity);

        // Mix of starter (should be 0) and non-starter (should count)
        const mixedDecklist = [
          { id: starterPoolCards[0], quantity: 4 },  // Starter - 0 value
          { id: nonStarterCard.id, quantity: 3 }     // Non-starter - counted
        ];

        const value = calculateCardValue(mixedDecklist);
        expect(value).toBe(expectedCost * 3);  // Only non-starter counts
      }
    });

    it('should return 0 for empty decklist', () => {
      expect(calculateCardValue([])).toBe(0);
      expect(calculateCardValue(null)).toBe(0);
      expect(calculateCardValue(undefined)).toBe(0);
    });
  });

  describe('calculateShipValue', () => {
    it('should return 0 for starter pool ships', () => {
      const starterShipId = starterPoolShipIds[0];
      expect(starterShipId).toBeDefined();

      const value = calculateShipValue(starterShipId);
      expect(value).toBe(0);
    });

    it('should calculate value for non-starter ships', () => {
      // Find a non-starter ship
      const nonStarterShip = shipCollection.find(s => !starterPoolShipIds.includes(s.id));

      if (nonStarterShip) {
        const expectedCost = getBlueprintCost(nonStarterShip.rarity);
        const value = calculateShipValue(nonStarterShip.id);
        expect(value).toBe(expectedCost);
      }
    });

    it('should return 0 for null/undefined shipId', () => {
      expect(calculateShipValue(null)).toBe(0);
      expect(calculateShipValue(undefined)).toBe(0);
    });
  });

  describe('calculateDroneValue', () => {
    it('should return 0 for starter pool drones', () => {
      const starterDrones = starterPoolDroneNames.map(name => ({ name }));

      const value = calculateDroneValue(starterDrones);
      expect(value).toBe(0);
    });

    it('should calculate value for non-starter drones', () => {
      // Find a non-starter drone
      const nonStarterDrone = fullDroneCollection.find(
        d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
      );

      if (nonStarterDrone) {
        const expectedCost = getBlueprintCost(nonStarterDrone.rarity);
        const drones = [{ name: nonStarterDrone.name }];

        const value = calculateDroneValue(drones);
        expect(value).toBe(expectedCost);
      }
    });

    it('should calculate value correctly for mixed drones (starter + non-starter)', () => {
      const nonStarterDrone = fullDroneCollection.find(
        d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
      );

      if (nonStarterDrone) {
        const expectedCost = getBlueprintCost(nonStarterDrone.rarity);

        const mixedDrones = [
          { name: starterPoolDroneNames[0] },  // Starter - 0 value
          { name: nonStarterDrone.name }        // Non-starter - counted
        ];

        const value = calculateDroneValue(mixedDrones);
        expect(value).toBe(expectedCost);
      }
    });

    it('should return 0 for empty/null drones array', () => {
      expect(calculateDroneValue([])).toBe(0);
      expect(calculateDroneValue(null)).toBe(0);
      expect(calculateDroneValue(undefined)).toBe(0);
    });
  });

  describe('calculateComponentValue', () => {
    // Get starter component IDs (they're stored in starterPoolCards)
    const starterComponentIds = shipComponentCollection
      .filter(c => starterPoolCards.includes(c.id))
      .map(c => c.id);

    it('should return 0 for starter pool components', () => {
      if (starterComponentIds.length > 0) {
        const starterComponents = {};
        starterComponentIds.forEach((id, i) => {
          starterComponents[id] = ['l', 'm', 'r'][i % 3];
        });

        const value = calculateComponentValue(starterComponents);
        expect(value).toBe(0);
      }
    });

    it('should calculate value for non-starter components', () => {
      const nonStarterComponent = shipComponentCollection.find(
        c => !starterPoolCards.includes(c.id)
      );

      if (nonStarterComponent) {
        const expectedCost = getBlueprintCost(nonStarterComponent.rarity);
        const components = { [nonStarterComponent.id]: 'l' };

        const value = calculateComponentValue(components);
        expect(value).toBe(expectedCost);
      }
    });

    it('should return 0 for empty/null components', () => {
      expect(calculateComponentValue({})).toBe(0);
      expect(calculateComponentValue(null)).toBe(0);
      expect(calculateComponentValue(undefined)).toBe(0);
    });
  });

  describe('calculateLoadoutValue', () => {
    it('should return 0 for Slot 0 (immutable starter deck)', () => {
      const slot0 = {
        id: 0,
        isImmutable: true,
        decklist: [{ id: starterPoolCards[0], quantity: 4 }],
        shipId: starterPoolShipIds[0],
        drones: [{ name: starterPoolDroneNames[0] }],
        shipComponents: { 'POWERCELL_001': 'l' }
      };

      const result = calculateLoadoutValue(slot0);
      expect(result.totalValue).toBe(0);
      expect(result.isStarterDeck).toBe(true);
    });

    it('should return 0 for custom deck using only starter pool items', () => {
      const customSlotWithStarterOnly = {
        id: 1,
        isImmutable: false,
        decklist: starterPoolCards.slice(0, 5).map(id => ({ id, quantity: 4 })),
        shipId: starterPoolShipIds[0],
        drones: starterPoolDroneNames.map(name => ({ name })),
        shipComponents: {
          'POWERCELL_001': 'l',
          'BRIDGE_001': 'm',
          'DRONECONTROL_001': 'r'
        }
      };

      const result = calculateLoadoutValue(customSlotWithStarterOnly);
      expect(result.totalValue).toBe(0);
      expect(result.isStarterDeck).toBe(false);  // Not slot 0, but still 0 value
    });

    it('should calculate value only for non-starter items in custom deck', () => {
      const nonStarterCard = fullCardCollection.find(c => !starterPoolCards.includes(c.id));
      const nonStarterDrone = fullDroneCollection.find(
        d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
      );

      if (nonStarterCard && nonStarterDrone) {
        const customSlot = {
          id: 2,
          isImmutable: false,
          decklist: [
            { id: starterPoolCards[0], quantity: 4 },  // Starter - 0
            { id: nonStarterCard.id, quantity: 2 }     // Non-starter - counted
          ],
          shipId: starterPoolShipIds[0],  // Starter ship - 0
          drones: [
            { name: starterPoolDroneNames[0] },  // Starter - 0
            { name: nonStarterDrone.name }        // Non-starter - counted
          ],
          shipComponents: { 'POWERCELL_001': 'l' }  // Starter - 0
        };

        const result = calculateLoadoutValue(customSlot);
        const expectedCardValue = getBlueprintCost(nonStarterCard.rarity) * 2;
        const expectedDroneValue = getBlueprintCost(nonStarterDrone.rarity);

        expect(result.cardValue).toBe(expectedCardValue);
        expect(result.droneValue).toBe(expectedDroneValue);
        expect(result.shipValue).toBe(0);
        expect(result.componentValue).toBe(0);
        expect(result.totalValue).toBe(expectedCardValue + expectedDroneValue);
      }
    });
  });
});
