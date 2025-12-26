import { describe, it, expect } from 'vitest';
import lootGenerator from './LootGenerator.js';
import fullDroneCollection from '../../data/droneData.js';
import { starterPoolDroneNames } from '../../data/saveGameSchema.js';
import { SALVAGE_ITEMS } from '../../data/salvageItemData.js';

describe('LootGenerator - Drone Blueprint Generation', () => {

  describe('generateDroneBlueprint - Class Filtering', () => {
    it('LIGHT POI should only generate class 0-2 drones', () => {
      const unlockedBlueprints = [];
      const results = new Set();

      // Generate multiple blueprints to test distribution
      for (let i = 0; i < 100; i++) {
        const blueprint = lootGenerator.generateDroneBlueprint('DRONE_BLUEPRINT_LIGHT', 1, unlockedBlueprints);
        if (blueprint?.type === 'blueprint') {
          results.add(blueprint.droneData.class);
        }
      }

      // All classes should be in range 0-2
      results.forEach(droneClass => {
        expect(droneClass).toBeGreaterThanOrEqual(0);
        expect(droneClass).toBeLessThanOrEqual(2);
      });
    });

    it('MEDIUM POI should only generate class 1-3 drones', () => {
      const unlockedBlueprints = [];
      const results = new Set();

      // Generate multiple blueprints to test distribution
      for (let i = 0; i < 100; i++) {
        const blueprint = lootGenerator.generateDroneBlueprint('DRONE_BLUEPRINT_MEDIUM', 1, unlockedBlueprints);
        if (blueprint?.type === 'blueprint') {
          results.add(blueprint.droneData.class);
        }
      }

      // All classes should be in range 1-3
      results.forEach(droneClass => {
        expect(droneClass).toBeGreaterThanOrEqual(1);
        expect(droneClass).toBeLessThanOrEqual(3);
      });
    });

    it('HEAVY POI should only generate class 2+ drones', () => {
      const unlockedBlueprints = [];
      const results = new Set();

      // Generate multiple blueprints to test distribution
      for (let i = 0; i < 100; i++) {
        const blueprint = lootGenerator.generateDroneBlueprint('DRONE_BLUEPRINT_HEAVY', 1, unlockedBlueprints);
        if (blueprint?.type === 'blueprint') {
          results.add(blueprint.droneData.class);
        }
      }

      // All classes should be >= 2
      results.forEach(droneClass => {
        expect(droneClass).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('generateDroneBlueprint - Starter Exclusion', () => {
    it('should never award starter drones', () => {
      const unlockedBlueprints = [];

      // Generate many blueprints
      for (let i = 0; i < 200; i++) {
        const poiType = ['DRONE_BLUEPRINT_LIGHT', 'DRONE_BLUEPRINT_MEDIUM', 'DRONE_BLUEPRINT_HEAVY'][i % 3];
        const blueprint = lootGenerator.generateDroneBlueprint(poiType, 1, unlockedBlueprints);

        if (blueprint?.type === 'blueprint') {
          const droneName = blueprint.blueprintId;
          expect(starterPoolDroneNames).not.toContain(droneName);
        }
      }
    });

    it('starter drones should be: Scanner, Shark, Dart, Talon, Mammoth', () => {
      // Verify our assumption about starter drones
      expect(starterPoolDroneNames).toEqual(
        expect.arrayContaining(['Scanner', 'Shark', 'Dart', 'Talon', 'Mammoth'])
      );
    });
  });

  describe('generateDroneBlueprint - Unlocked Blueprint Exclusion', () => {
    it('should not award drones that are already unlocked', () => {
      // Find some non-starter drones to mark as unlocked
      const nonStarterDrones = fullDroneCollection.filter(
        d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
      );

      const unlockedBlueprints = nonStarterDrones.slice(0, 10).map(d => d.name);

      // Generate many blueprints
      for (let i = 0; i < 100; i++) {
        const blueprint = lootGenerator.generateDroneBlueprint('DRONE_BLUEPRINT_LIGHT', 1, unlockedBlueprints);

        if (blueprint?.type === 'blueprint') {
          const droneName = blueprint.blueprintId;
          expect(unlockedBlueprints).not.toContain(droneName);
        }
      }
    });
  });

  describe('generateDroneBlueprint - Exhaustion Handling', () => {
    it('should return blueprint_exhausted when all drones in band are unlocked', () => {
      // Get all non-starter, selectable drones
      const allUnlockable = fullDroneCollection.filter(
        d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
      ).map(d => d.name);

      const blueprint = lootGenerator.generateDroneBlueprint('DRONE_BLUEPRINT_LIGHT', 1, allUnlockable);

      expect(blueprint).toBeDefined();
      expect(blueprint.type).toBe('blueprint_exhausted');
      expect(blueprint.poiType).toBe('DRONE_BLUEPRINT_LIGHT');
      expect(blueprint.tier).toBe(1);
    });

    it('should return blueprint_exhausted for each POI type when exhausted', () => {
      const allUnlockable = fullDroneCollection.filter(
        d => !starterPoolDroneNames.includes(d.name) && d.selectable !== false
      ).map(d => d.name);

      const poiTypes = ['DRONE_BLUEPRINT_LIGHT', 'DRONE_BLUEPRINT_MEDIUM', 'DRONE_BLUEPRINT_HEAVY'];

      poiTypes.forEach(poiType => {
        const blueprint = lootGenerator.generateDroneBlueprint(poiType, 2, allUnlockable);
        expect(blueprint.type).toBe('blueprint_exhausted');
        expect(blueprint.poiType).toBe(poiType);
      });
    });
  });

  describe('generateDroneBlueprint - Rarity Distribution', () => {
    it('tier 1 should produce mostly Common drones', () => {
      const unlockedBlueprints = [];
      const rarities = { Common: 0, Uncommon: 0, Rare: 0 };

      for (let i = 0; i < 100; i++) {
        const blueprint = lootGenerator.generateDroneBlueprint('DRONE_BLUEPRINT_MEDIUM', 1, unlockedBlueprints);
        if (blueprint?.type === 'blueprint') {
          const rarity = blueprint.rarity || 'Common';
          rarities[rarity] = (rarities[rarity] || 0) + 1;
        }
      }

      // Tier 1: 90% Common, 10% Uncommon
      // Allow some variance, but Common should dominate
      expect(rarities.Common).toBeGreaterThan(rarities.Uncommon);
      expect(rarities.Rare || 0).toBe(0); // No Rare in tier 1
    });

    it('tier 3 should have higher Rare chances', () => {
      const unlockedBlueprints = [];
      const rarities = { Common: 0, Uncommon: 0, Rare: 0 };

      // Use HEAVY POI which has better coverage of class 3 (where Aegis is)
      // HEAVY: 60% class 2, 30% class 3, 10% class 4
      // Class 3 has Rare drones like Aegis
      for (let i = 0; i < 500; i++) {
        const blueprint = lootGenerator.generateDroneBlueprint('DRONE_BLUEPRINT_HEAVY', 3, unlockedBlueprints);
        if (blueprint?.type === 'blueprint') {
          const rarity = blueprint.rarity || 'Common';
          rarities[rarity] = (rarities[rarity] || 0) + 1;
        }
      }

      // Tier 3: 40% Common, 45% Uncommon, 15% Rare
      // With 500 samples and HEAVY POI (30% class 3 weight), we should see some Rare
      // Just verify that Rare drones can appear (main goal of tier 3)
      expect(rarities.Rare || 0).toBeGreaterThan(0);
      // Also verify we got some variety (not all one rarity)
      expect(Object.keys(rarities).filter(k => rarities[k] > 0).length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('LootGenerator - Blueprint Fallback Salvage', () => {

  describe('generateBlueprintFallbackSalvage - Rarity Tier Mapping', () => {
    it('Common blueprint exhaustion should give Uncommon salvage', () => {
      const rng = lootGenerator.createRNG(12345);
      const salvage = lootGenerator.generateBlueprintFallbackSalvage('Common', rng);

      expect(salvage.type).toBe('salvageItem');
      expect(salvage.rarity).toBe('Uncommon');
    });

    it('Uncommon blueprint exhaustion should give Rare salvage', () => {
      const rng = lootGenerator.createRNG(12345);
      const salvage = lootGenerator.generateBlueprintFallbackSalvage('Uncommon', rng);

      expect(salvage.type).toBe('salvageItem');
      expect(salvage.rarity).toBe('Rare');
    });

    it('Rare blueprint exhaustion should give Mythic salvage', () => {
      const rng = lootGenerator.createRNG(12345);
      const salvage = lootGenerator.generateBlueprintFallbackSalvage('Rare', rng);

      expect(salvage.type).toBe('salvageItem');
      expect(salvage.rarity).toBe('Mythic');
    });

    it('Mythic blueprint exhaustion should give Mythic salvage (capped)', () => {
      const rng = lootGenerator.createRNG(12345);
      const salvage = lootGenerator.generateBlueprintFallbackSalvage('Mythic', rng);

      expect(salvage.type).toBe('salvageItem');
      expect(salvage.rarity).toBe('Mythic');
    });
  });

  describe('generateBlueprintFallbackSalvage - Salvage Item Selection', () => {
    it('should only select items with target rarity', () => {
      const rng = lootGenerator.createRNG(12345);
      const salvage = lootGenerator.generateBlueprintFallbackSalvage('Common', rng);

      // Common→Uncommon, so should select from Uncommon items
      const itemDef = SALVAGE_ITEMS.find(item => item.id === salvage.itemId);
      expect(itemDef).toBeDefined();
      expect(itemDef.rarity).toBe('Uncommon');
    });

    it('credit value should be within selected item range', () => {
      const rng = lootGenerator.createRNG(12345);
      const salvage = lootGenerator.generateBlueprintFallbackSalvage('Uncommon', rng);

      // Find the item definition
      const itemDef = SALVAGE_ITEMS.find(item => item.id === salvage.itemId);
      expect(itemDef).toBeDefined();

      // Credit value should be within range
      expect(salvage.creditValue).toBeGreaterThanOrEqual(itemDef.creditRange.min);
      expect(salvage.creditValue).toBeLessThanOrEqual(itemDef.creditRange.max);
    });
  });

  describe('generateBlueprintFallbackSalvage - Seeded RNG', () => {
    it('same seed should produce same salvage item', () => {
      const rng1 = lootGenerator.createRNG(12345);
      const salvage1 = lootGenerator.generateBlueprintFallbackSalvage('Common', rng1);

      const rng2 = lootGenerator.createRNG(12345);
      const salvage2 = lootGenerator.generateBlueprintFallbackSalvage('Common', rng2);

      expect(salvage1.itemId).toBe(salvage2.itemId);
    });

    it('different seeds should potentially produce different items', () => {
      const results = new Set();

      for (let seed = 1; seed <= 50; seed++) {
        const rng = lootGenerator.createRNG(seed);
        const salvage = lootGenerator.generateBlueprintFallbackSalvage('Common', rng);
        results.add(salvage.itemId);
      }

      // With 50 rolls, we should see at least 2 different items
      expect(results.size).toBeGreaterThan(1);
    });
  });
});

describe('Salvage Items - Rarity Property', () => {
  it('all salvage items should have a rarity property', () => {
    SALVAGE_ITEMS.forEach(item => {
      expect(item.rarity).toBeDefined();
      expect(['Common', 'Uncommon', 'Rare', 'Mythic']).toContain(item.rarity);
    });
  });

  it('should have correct rarity distribution', () => {
    const rarityCounts = { Common: 0, Uncommon: 0, Rare: 0, Mythic: 0 };

    SALVAGE_ITEMS.forEach(item => {
      rarityCounts[item.rarity]++;
    });

    // Expected: 15 Common, 5 Uncommon, 4 Rare, 5 Mythic
    expect(rarityCounts.Common).toBe(15);
    expect(rarityCounts.Uncommon).toBe(5);
    expect(rarityCounts.Rare).toBe(4);
    expect(rarityCounts.Mythic).toBe(5);
  });
});
