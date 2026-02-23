// ========================================
// BLUEPRINT POI - LOOT DISPLAY TESTS
// ========================================
// Tests for blueprint loot display logic and collection

import { describe, it, expect } from 'vitest';

describe('Blueprint PoI - Loot Display Logic', () => {
  describe('hasVisibleLoot condition', () => {
    it('should return true when blueprint exists (even with no cards)', () => {
      const poiLoot = {
        cards: [],
        credits: 0,
        blueprint: {
          type: 'blueprint',
          blueprintId: 'TestDrone',
          blueprintType: 'drone',
          rarity: 'Rare'
        }
      };

      const hasVisibleLoot = !!((poiLoot.cards?.length > 0) ||
                                poiLoot.blueprint ||
                                (poiLoot.salvageItems?.length > 0));

      expect(hasVisibleLoot).toBe(true);
    });

    it('should return false for credits-only loot (no cards, no blueprint)', () => {
      const poiLoot = {
        cards: [],
        credits: 50
      };

      const hasVisibleLoot = !!((poiLoot.cards?.length > 0) ||
                                poiLoot.blueprint ||
                                (poiLoot.salvageItems?.length > 0));

      expect(hasVisibleLoot).toBe(false);
    });

    it('should return true when cards exist', () => {
      const poiLoot = {
        cards: [{ id: 'card1' }, { id: 'card2' }],
        credits: 0
      };

      const hasVisibleLoot = !!((poiLoot.cards?.length > 0) ||
                                poiLoot.blueprint ||
                                (poiLoot.salvageItems?.length > 0));

      expect(hasVisibleLoot).toBe(true);
    });

    it('should return true when salvage items exist', () => {
      const poiLoot = {
        cards: [],
        credits: 0,
        salvageItems: [{ type: 'salvageItem', itemId: 'SALVAGE_PLASMA_COIL' }]
      };

      const hasVisibleLoot = !!((poiLoot.cards?.length > 0) ||
                                poiLoot.blueprint ||
                                (poiLoot.salvageItems?.length > 0));

      expect(hasVisibleLoot).toBe(true);
    });
  });

  describe('Blueprint collection in handlePOILootCollected', () => {
    it('should add blueprint to collectedLoot array', () => {
      const loot = {
        cards: [],
        credits: 0,
        blueprint: {
          type: 'blueprint',
          blueprintId: 'Ion Drone',
          blueprintType: 'drone',
          rarity: 'Common',
          droneData: {
            name: 'Ion Drone',
            class: 1,
            attack: 3,
            hull: 1
          },
          source: 'drone_blueprint_poi'
        }
      };

      const collectedLoot = [];

      // Simulate blueprint collection logic
      if (loot.blueprint) {
        collectedLoot.push({
          type: 'blueprint',
          blueprintId: loot.blueprint.blueprintId,
          blueprintType: loot.blueprint.blueprintType || 'drone',
          rarity: loot.blueprint.rarity,
          droneData: loot.blueprint.droneData,
          source: loot.blueprint.source || 'poi_loot'
        });
      }

      expect(collectedLoot.length).toBe(1);
      expect(collectedLoot[0].type).toBe('blueprint');
      expect(collectedLoot[0].blueprintId).toBe('Ion Drone');
      expect(collectedLoot[0].rarity).toBe('Common');
      expect(collectedLoot[0].droneData).toBeDefined();
      expect(collectedLoot[0].source).toBe('drone_blueprint_poi');
    });

    it('should handle mixed loot (cards + blueprint)', () => {
      const loot = {
        cards: [
          { type: 'card', id: 'CARD_MISSILE_BARRAGE' },
          { type: 'card', id: 'CARD_SHIELD_BOOST' }
        ],
        credits: 50,
        blueprint: {
          type: 'blueprint',
          blueprintId: 'Firefly',
          blueprintType: 'drone',
          rarity: 'Common',
          droneData: { name: 'Firefly', class: 1 },
          source: 'drone_blueprint_poi'
        }
      };

      const collectedLoot = [];

      // Add cards
      if (loot.cards && loot.cards.length > 0) {
        collectedLoot.push(...loot.cards);
      }

      // Add blueprint
      if (loot.blueprint) {
        collectedLoot.push({
          type: 'blueprint',
          blueprintId: loot.blueprint.blueprintId,
          blueprintType: loot.blueprint.blueprintType || 'drone',
          rarity: loot.blueprint.rarity,
          droneData: loot.blueprint.droneData,
          source: loot.blueprint.source || 'poi_loot'
        });
      }

      expect(collectedLoot.length).toBe(3);
      expect(collectedLoot[0].type).toBe('card');
      expect(collectedLoot[1].type).toBe('card');
      expect(collectedLoot[2].type).toBe('blueprint');
    });

    it('should handle cards-only loot (regression test)', () => {
      const loot = {
        cards: [
          { type: 'card', id: 'CARD_SHIELD_BOOST' },
          { type: 'card', id: 'CARD_DRONE_REPAIR' }
        ],
        credits: 25
      };

      const collectedLoot = [];

      // Add cards
      if (loot.cards && loot.cards.length > 0) {
        collectedLoot.push(...loot.cards);
      }

      // Add blueprint
      if (loot.blueprint) {
        collectedLoot.push({
          type: 'blueprint',
          blueprintId: loot.blueprint.blueprintId,
          blueprintType: loot.blueprint.blueprintType || 'drone',
          rarity: loot.blueprint.rarity,
          droneData: loot.blueprint.droneData,
          source: loot.blueprint.source || 'poi_loot'
        });
      }

      expect(collectedLoot.length).toBe(2);
      expect(collectedLoot[0].type).toBe('card');
      expect(collectedLoot[1].type).toBe('card');
    });
  });
});
