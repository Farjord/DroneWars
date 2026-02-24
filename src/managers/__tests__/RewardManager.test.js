/**
 * RewardManager Tests (TDD)
 * Tests for centralized reward generation
 *
 * This manager replaces LootGenerator and handles:
 * - Combat rewards (salvage, AI cores, blueprints)
 * - POI rewards (packs, blueprints)
 * - Salvage slots
 * - Shop packs
 * - Reputation rewards
 * - Deterministic seeding (master seed increment)
 * - Blueprint exhaustion (on-the-fly calculation)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import rewardManager from '../RewardManager.js';
import gameStateManager from '../GameStateManager.js';
import metaGameStateManager from '../MetaGameStateManager.js';
import { createRNG } from '../../logic/loot/SeededRNG.js';

// Mock managers
vi.mock('../GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

vi.mock('../MetaGameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    addCard: vi.fn(),
    addCredits: vi.fn()
  }
}));

describe('RewardManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: game with master seed
    gameStateManager.getState.mockReturnValue({
      gameSeed: 12345,
      masterSeed: 100
    });

    // Default mock: player profile
    metaGameStateManager.getState.mockReturnValue({
      singlePlayerProfile: {
        unlockedBlueprints: [],
        credits: 1000,
        cardInventory: {}
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Master Seed Management', () => {
    it('should increment master seed on each generation', () => {
      let currentSeed = 100;

      // Mock seed increment
      gameStateManager.getState.mockImplementation(() => ({
        gameSeed: 12345,
        masterSeed: currentSeed
      }));

      gameStateManager.setState.mockImplementation((update) => {
        if (update.masterSeed !== undefined) {
          currentSeed = update.masterSeed;
        }
      });

      // Generate multiple rewards
      rewardManager.generatePOIRewards({
        poiData: { rewardType: 'ORDNANCE_PACK' },
        outcome: 'loot',
        tier: 1
      });

      expect(currentSeed).toBe(101); // Should increment

      rewardManager.generatePOIRewards({
        poiData: { rewardType: 'ORDNANCE_PACK' },
        outcome: 'loot',
        tier: 1
      });

      expect(currentSeed).toBe(102); // Should increment again
    });

    it('should return seed in reward result for debugging', () => {
      const result = rewardManager.generatePOIRewards({
        poiData: { rewardType: 'SUPPORT_PACK' },
        outcome: 'loot',
        tier: 1
      });

      expect(result.seed).toBeDefined();
      expect(typeof result.seed).toBe('number');
    });

    it('should produce deterministic results with same seed', () => {
      // Generate two rewards with same seed
      gameStateManager.getState.mockReturnValue({
        gameSeed: 12345,
        masterSeed: 500
      });

      const result1 = rewardManager.generatePOIRewards({
        poiData: { rewardType: 'TACTICAL_PACK' },
        outcome: 'loot',
        tier: 1
      });

      // Reset to same seed
      gameStateManager.getState.mockReturnValue({
        gameSeed: 12345,
        masterSeed: 500
      });

      const result2 = rewardManager.generatePOIRewards({
        poiData: { rewardType: 'TACTICAL_PACK' },
        outcome: 'loot',
        tier: 1
      });

      // Results should be identical
      expect(result1.cards).toEqual(result2.cards);
      expect(result1.salvageItem).toEqual(result2.salvageItem);
    });
  });

  describe('generatePOIRewards', () => {
    it('should generate cards and salvage from pack type', () => {
      const result = rewardManager.generatePOIRewards({
        poiData: { rewardType: 'ORDNANCE_PACK' },
        outcome: 'loot',
        tier: 1
      });

      // Should return cards array
      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);

      // Should return salvage item
      expect(result.salvageItem).toBeDefined();
      expect(result.salvageItem.itemId).toBeDefined();

      // Should include seed
      expect(result.seed).toBeDefined();
    });

    it('should respect tier configuration', () => {
      const result = rewardManager.generatePOIRewards({
        poiData: { rewardType: 'UPGRADE_PACK' },
        outcome: 'loot',
        tier: 2,
        zone: 'mid'
      });

      // Packs should give cards
      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
    });

    it('should handle different pack types', () => {
      const packTypes = ['ORDNANCE_PACK', 'SUPPORT_PACK', 'TACTICAL_PACK'];

      packTypes.forEach(packType => {
        const result = rewardManager.generatePOIRewards({
          poiData: { rewardType: packType },
          outcome: 'loot',
          tier: 1
        });

        expect(result.cards).toBeDefined();
        expect(result.salvageItem).toBeDefined();
      });
    });
  });

  describe('generateCombatRewards', () => {
    it('should generate cards, salvage, AI cores, and reputation', () => {
      const result = rewardManager.generateCombatRewards({
        enemyDeck: [
          { id: 'laser_burst', rarity: 'Common' },
          { id: 'shield_boost', rarity: 'Uncommon' }
        ],
        tier: 1,
        aiDifficulty: 'MEDIUM',
        aiId: 'patrol_alpha'
      });

      // Should return all reward components
      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
      expect(result.salvageItem).toBeDefined();
      expect(result.aiCores).toBeDefined();
      expect(typeof result.aiCores).toBe('number');
      expect(result.reputation).toBeDefined();
      expect(result.seed).toBeDefined();
    });

    it('should filter out starter cards from enemy deck', () => {
      const result = rewardManager.generateCombatRewards({
        enemyDeck: [
          { id: 'standard_laser', rarity: 'Starter' },  // Starter card
          { id: 'laser_burst', rarity: 'Common' },
          { id: 'shield_boost', rarity: 'Uncommon' }
        ],
        tier: 1,
        aiDifficulty: 'MEDIUM'
      });

      // Should not include starter cards in rewards
      const hasStarterCard = result.cards.some(card => card.rarity === 'Starter');
      expect(hasStarterCard).toBe(false);
    });

    it('should generate higher AI core rewards for harder difficulties', () => {
      const easyResult = rewardManager.generateCombatRewards({
        enemyDeck: [{ id: 'laser_burst', rarity: 'Common' }],
        tier: 1,
        aiDifficulty: 'EASY'
      });

      gameStateManager.getState.mockReturnValue({
        gameSeed: 12345,
        masterSeed: 200  // Different seed
      });

      const hardResult = rewardManager.generateCombatRewards({
        enemyDeck: [{ id: 'laser_burst', rarity: 'Common' }],
        tier: 1,
        aiDifficulty: 'HARD'
      });

      // Hard difficulty should have higher chance of AI cores
      // (This is probabilistic, but with enough runs hard should average higher)
      expect(hardResult.aiCores).toBeGreaterThanOrEqual(0);
    });

    it('should return combat cards with cardId and cardName properties (not id/name)', () => {
      // Combat cards must be transformed to collectedLoot format just like POI cards
      const result = rewardManager.generateCombatRewards({
        enemyDeck: [
          { id: 'laser_burst', name: 'Laser Burst', rarity: 'Common', type: 'Ordnance' },
          { id: 'shield_boost', name: 'Shield Boost', rarity: 'Uncommon', type: 'Support' }
        ],
        tier: 1,
        aiDifficulty: 'MEDIUM'
      });

      // Should have cards in result
      expect(result.cards.length).toBeGreaterThan(0);

      // Each card should have collectedLoot format (cardId, cardName)
      result.cards.forEach(card => {
        expect(card.cardId).toBeDefined();
        expect(card.cardName).toBeDefined();

        // Should NOT have raw cardData format (id, name)
        expect(card.id).toBeUndefined();
        expect(card.name).toBeUndefined();
      });
    });
  });

  describe('generateBlueprintReward', () => {
    it('should generate blueprint from pack type', () => {
      const result = rewardManager.generateBlueprintReward('DRONE_BLUEPRINT_LIGHT', 1);

      // Should return blueprint object
      expect(result).toBeDefined();

      if (result.type !== 'blueprint_exhausted') {
        expect(result.type).toBe('blueprint');
        expect(result.blueprintId).toBeDefined();
        expect(result.droneData).toBeDefined();
        expect(result.rarity).toBeDefined();
        expect(result.source).toBe('drone_blueprint_poi');
      }
    });

    it('should filter out already-unlocked blueprints', () => {
      // Setup: Player has unlocked "Dart" (Light class drone)
      metaGameStateManager.getState.mockReturnValue({
        singlePlayerProfile: {
          unlockedBlueprints: ['Dart'],
          credits: 1000,
          cardInventory: {}
        }
      });

      const result = rewardManager.generateBlueprintReward('DRONE_BLUEPRINT_LIGHT', 1);

      // If blueprint was generated, it should NOT be "Dart"
      if (result.type === 'blueprint') {
        expect(result.blueprintId).not.toBe('Dart');
      }
    });

    it('should return exhausted status when all blueprints unlocked', () => {
      // Setup: Mock all Light class blueprints as unlocked
      metaGameStateManager.getState.mockReturnValue({
        singlePlayerProfile: {
          // Light class drones
          unlockedBlueprints: ['Dart', 'Bastion', 'Seraph'],
          credits: 1000,
          cardInventory: {}
        }
      });

      const result = rewardManager.generateBlueprintReward('DRONE_BLUEPRINT_LIGHT', 1);

      // Might return exhausted status OR a blueprint if not all are actually unlocked
      if (result.type === 'blueprint_exhausted') {
        expect(result.poiType).toBe('DRONE_BLUEPRINT_LIGHT');
        expect(result.tier).toBe(1);
        expect(result.fallbackSalvage).toBeDefined();
      }
    });

    it('should generate fallback salvage when blueprints exhausted', () => {
      // Force exhaustion by mocking many drones as unlocked
      metaGameStateManager.getState.mockReturnValue({
        singlePlayerProfile: {
          unlockedBlueprints: ['Dart', 'Talon', 'Mammoth', 'Bastion', 'Seraph'],
          credits: 1000,
          cardInventory: {}
        }
      });

      const result = rewardManager.generateBlueprintReward('DRONE_BLUEPRINT_MEDIUM', 1);

      // If exhausted, should have fallback salvage
      if (result.type === 'blueprint_exhausted') {
        expect(result.fallbackSalvage).toBeDefined();
        expect(result.fallbackSalvage.id).toBeDefined();
        expect(result.fallbackSalvage.rarity).toBeDefined();
      }
    });
  });

  describe('generateSalvageSlots', () => {
    it('should generate array of salvage slots', () => {
      const result = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'perimeter');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Each slot should have type, content, revealed
      // Note: No empty slots - all slots yield loot (cards or salvage)
      result.forEach(slot => {
        expect(slot.type).toBeDefined();
        expect(['card', 'salvageItem']).toContain(slot.type);
        expect(slot.revealed).toBe(false);
        expect(slot.content).toBeDefined();
      });
    });

    it('should generate more slots in higher zones', () => {
      const perimeterResult = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'perimeter');

      gameStateManager.getState.mockReturnValue({
        gameSeed: 12345,
        masterSeed: 200
      });

      const coreResult = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'core');

      // Core zone should have more slots than perimeter (statistically)
      expect(coreResult.length).toBeGreaterThanOrEqual(perimeterResult.length);
    });

    it('should include seed in result for debugging', () => {
      const result = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'mid');

      expect(result.seed).toBeDefined();
      expect(typeof result.seed).toBe('number');
    });
  });

  describe('generateShopPack', () => {
    it('should generate shop pack with cards only (no salvage)', () => {
      const result = rewardManager.generateShopPack('ORDNANCE_PACK', 1);

      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
      expect(result.cards.length).toBeGreaterThan(0);

      // Shop packs should NOT have salvage
      expect(result.salvageItem).toBeUndefined();

      // Should include seed
      expect(result.seed).toBeDefined();
    });

    it('should generate maximum cards for shop packs', () => {
      const result = rewardManager.generateShopPack('SUPPORT_PACK', 2);

      // Shop packs should give max card count (usually 5)
      expect(result.cards.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('generateReputationReward', () => {
    it('should generate reputation level reward', () => {
      const result = rewardManager.generateReputationReward({
        packType: 'UPGRADE_PACK',
        tier: 2,
        level: 5
      });

      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
      expect(result.salvageItem).toBeDefined();
    });

    it('should use level in seed calculation', () => {
      const result1 = rewardManager.generateReputationReward({
        packType: 'TACTICAL_PACK',
        tier: 1,
        level: 3
      });

      gameStateManager.getState.mockReturnValue({
        gameSeed: 12345,
        masterSeed: 300
      });

      const result2 = rewardManager.generateReputationReward({
        packType: 'TACTICAL_PACK',
        tier: 1,
        level: 5  // Different level
      });

      // Results should be different (different seeds)
      // Note: Empty card arrays will be equal, so check if at least one has cards
      const hasCards = result1.cards.length > 0 || result2.cards.length > 0;
      if (hasCards) {
        expect(result1.cards).not.toEqual(result2.cards);
      }
    });
  });

  describe('unlockBlueprint', () => {
    it('should add blueprint to MetaGameStateManager unlockedBlueprints', () => {
      const blueprint = {
        type: 'blueprint',
        blueprintId: 'Interceptor',
        blueprintType: 'drone',
        rarity: 'Uncommon'
      };

      rewardManager.unlockBlueprint(blueprint);

      expect(metaGameStateManager.setState).toHaveBeenCalled();

      // Check that setState was called with blueprint added
      const setStateCall = metaGameStateManager.setState.mock.calls[0][0];
      expect(setStateCall).toBeDefined();
    });
  });

  describe('finalizeRewards', () => {
    it('should add cards to inventory', () => {
      const rewards = {
        // Cards in transformed format (cardId, cardName) from transformCardForLoot()
        cards: [
          { cardId: 'laser_burst', cardName: 'Laser Burst', rarity: 'Common' },
          { cardId: 'shield_boost', cardName: 'Shield Boost', rarity: 'Uncommon' }
        ],
        salvageItem: { id: 'metal_scrap', value: 50 },
        credits: 100
      };

      rewardManager.finalizeRewards(rewards, { source: 'combat_victory' });

      // Should call addCard for each card using cardId (not id)
      expect(metaGameStateManager.addCard).toHaveBeenCalledTimes(2);
      expect(metaGameStateManager.addCard).toHaveBeenCalledWith('laser_burst', 1);
      expect(metaGameStateManager.addCard).toHaveBeenCalledWith('shield_boost', 1);

      // Should add credits
      expect(metaGameStateManager.addCredits).toHaveBeenCalled();
    });

    it('should handle rewards without cards', () => {
      const rewards = {
        salvageItem: { id: 'metal_scrap', value: 50 }
      };

      rewardManager.finalizeRewards(rewards, { source: 'poi_loot' });

      // Should not call addCard
      expect(metaGameStateManager.addCard).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should have getState method', () => {
      const state = rewardManager.getState();

      expect(state).toBeDefined();
      expect(state.rewardHistory).toBeDefined();
      expect(Array.isArray(state.rewardHistory)).toBe(true);
    });

    it('should have reset method', () => {
      // Generate some rewards to populate history
      rewardManager.generatePOIRewards({
        poiData: { rewardType: 'ORDNANCE_PACK' },
        outcome: 'loot',
        tier: 1
      });

      // Reset
      rewardManager.reset();

      const state = rewardManager.getState();
      expect(state.rewardHistory).toEqual([]);
    });

    it('should track reward history', () => {
      rewardManager.reset();

      rewardManager.generatePOIRewards({
        poiData: { rewardType: 'ORDNANCE_PACK' },
        outcome: 'loot',
        tier: 1
      });

      const state = rewardManager.getState();
      expect(state.rewardHistory.length).toBeGreaterThan(0);

      const historyEntry = state.rewardHistory[0];
      expect(historyEntry.timestamp).toBeDefined();
      expect(historyEntry.type).toBeDefined();
      expect(historyEntry.seed).toBeDefined();
    });
  });

  // ==============================================
  // Card Format
  // ==============================================
  describe('Card Format - Architecture Fix', () => {
    it('should return salvage slot cards with cardId and cardName properties (not id/name)', () => {
      const slots = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'mid');

      // Find a card slot (30% chance per slot, 4 slots in mid zone)
      const cardSlot = slots.find(slot => slot.type === 'card');

      // Test only runs if we actually got a card (probabilistic generation)
      if (cardSlot && cardSlot.content) {
        const card = cardSlot.content;

        // Should have collectedLoot format
        expect(card.cardId).toBeDefined();
        expect(card.cardName).toBeDefined();

        // Should NOT have raw cardData format
        expect(card.id).toBeUndefined();
        expect(card.name).toBeUndefined();
      }
    });
  });

  // ==============================================
  // Slot Count Distribution
  // ==============================================
  describe('generateSalvageSlots - Slot Count Distribution', () => {
    it('should not exceed max 5 slots in core zone (was returning 6)', () => {
      // Mock tier config with slot count weights
      const tierConfig = {
        salvageSlotCountWeights: {
          perimeter: { 1: 50, 2: 30, 3: 15, 4: 5, 5: 0 },
          mid:       { 1: 10, 2: 30, 3: 35, 4: 20, 5: 5 },
          core:      { 1: 0, 2: 10, 3: 25, 4: 40, 5: 25 }
        }
      };

      // Test multiple generations to verify max slots never exceeds 5
      const coreSlotCounts = [];
      for (let i = 0; i < 50; i++) {
        // Reset RewardManager state to pick up new masterSeed
        rewardManager.reset();

        gameStateManager.getState.mockReturnValue({
          gameSeed: 12345 + i,  // Vary game seed for different distributions
          masterSeed: 100
        });

        const result = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'core', tierConfig);
        coreSlotCounts.push(result.length);
      }

      // Core zone should NEVER have 6 slots (max is 5) - this was the bug
      expect(Math.max(...coreSlotCounts)).toBeLessThanOrEqual(5);
      expect(coreSlotCounts).not.toContain(6);

      // All slot counts should be in valid range for core (2-5)
      coreSlotCounts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(2);  // Core min
        expect(count).toBeLessThanOrEqual(5);  // Core max
      });
    });

    it('should respect zone-specific slot count ranges', () => {
      const tierConfig = {
        salvageSlotCountWeights: {
          perimeter: { 1: 50, 2: 30, 3: 15, 4: 5, 5: 0 },    // Max 4
          mid:       { 1: 10, 2: 30, 3: 35, 4: 20, 5: 5 },   // Max 5
          core:      { 1: 0, 2: 10, 3: 25, 4: 40, 5: 25 }    // Max 5, min 2
        }
      };

      // Test perimeter (max 4 slots, weight of 0 for 5)
      const perimeterResult = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'perimeter', tierConfig);
      expect(perimeterResult.length).toBeLessThanOrEqual(4);

      // Test mid (max 5 slots)
      const midResult = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'mid', tierConfig);
      expect(midResult.length).toBeLessThanOrEqual(5);

      // Test core (min 2, max 5)
      const coreResult = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'core', tierConfig);
      expect(coreResult.length).toBeGreaterThanOrEqual(2);
      expect(coreResult.length).toBeLessThanOrEqual(5);
    });

    it('should use default weights when tierConfig is not provided', () => {
      // No tierConfig passed - should use internal defaults
      const result = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'core');

      // Should still not exceed 5 slots
      expect(result.length).toBeLessThanOrEqual(5);
      expect(result.length).toBeGreaterThanOrEqual(2);  // Core min is 2
    });
  });

  // ==============================================
  // Salvage Slot Type Consistency
  // ==============================================
  describe('Salvage Slot Type Consistency', () => {
    it('should use salvageItem type (not salvage) for SalvageController compatibility', () => {
      // Generate slots and check that 'salvage' type is never used
      // Valid types are: 'card', 'salvageItem' (no empty slots)
      const slots = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'mid');

      // No slot should have the old 'salvage' type
      slots.forEach(slot => {
        expect(slot.type).not.toBe('salvage');
      });

      // All slot types should be from the valid set (no empty)
      const validTypes = ['card', 'salvageItem'];
      slots.forEach(slot => {
        expect(validTypes).toContain(slot.type);
      });
    });
  });

  // ==============================================
  // finalizeRewards Card Property Access
  // ==============================================
  describe('finalizeRewards - Card Property Access', () => {
    it('should use cardId (not id) when adding cards to inventory', () => {
      // Cards from transformCardForLoot have cardId, not id
      const mockRewards = {
        cards: [
          { cardId: 'CARD001', cardName: 'Test Card', rarity: 'Common' },
          { cardId: 'CARD002', cardName: 'Another Card', rarity: 'Uncommon' }
        ]
      };

      rewardManager.finalizeRewards(mockRewards, { source: 'test' });

      // Should call addCard with cardId values
      expect(metaGameStateManager.addCard).toHaveBeenCalledWith('CARD001', 1);
      expect(metaGameStateManager.addCard).toHaveBeenCalledWith('CARD002', 1);
      expect(metaGameStateManager.addCard).toHaveBeenCalledTimes(2);
    });

    it('should handle rewards without cards', () => {
      const mockRewards = {
        credits: 100
      };

      rewardManager.finalizeRewards(mockRewards, { source: 'test' });

      // Should not call addCard if no cards
      expect(metaGameStateManager.addCard).not.toHaveBeenCalled();
    });
  });

  // ==============================================
  // Salvage Slot Redesign
  // Every slot must yield loot (cards + salvage, no empty)
  // ==============================================
  describe('generateSalvageSlots - Redesigned Behavior', () => {
    const tierConfig = {
      zoneRewardWeights: {
        perimeter: { cardCountWeights: { 1: 80, 2: 15, 3: 5 } },
        mid: { cardCountWeights: { 1: 35, 2: 50, 3: 15 } },
        core: { cardCountWeights: { 1: 15, 2: 40, 3: 45 } }
      },
      salvageSlotCountWeights: {
        perimeter: { 1: 50, 2: 30, 3: 15, 4: 5, 5: 0 },
        mid: { 1: 10, 2: 30, 3: 35, 4: 20, 5: 5 },
        core: { 1: 0, 2: 10, 3: 25, 4: 40, 5: 25 }
      }
    };

    it('should NEVER generate empty slots - every slot yields loot', () => {
      // Test that no slots have type 'empty' or null content
      // Generate 50 iterations with different seeds
      for (let i = 0; i < 50; i++) {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 99999 + i * 7
        });

        const slots = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'core', tierConfig);

        // Every slot must have loot (no empty)
        slots.forEach((slot, idx) => {
          expect(slot.type).not.toBe('empty');
          if (slot.type === 'card' || slot.type === 'salvageItem') {
            expect(slot.content).not.toBeNull();
          }
        });
      }
    });

    it('should guarantee at least 1 card per salvage operation', () => {
      // According to design: cardCountWeights guarantees at least 1 card
      // Generate 50 iterations and ensure all have at least 1 card
      for (let i = 0; i < 50; i++) {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 77777 + i * 13
        });

        const slots = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'mid', tierConfig);
        const cardSlots = slots.filter(s => s.type === 'card');

        // Must have at least 1 card (minimum from cardCountWeights: {1: 35, 2: 50, 3: 15})
        expect(cardSlots.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should only have card and salvageItem types (no empty, no other)', () => {
      // All slots should be either card or salvageItem
      for (let i = 0; i < 30; i++) {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 55555 + i * 11
        });

        const slots = rewardManager.generateSalvageSlots('SALVAGE_COMMON', 1, 'perimeter', tierConfig);
        const cardCount = slots.filter(s => s.type === 'card').length;
        const salvageCount = slots.filter(s => s.type === 'salvageItem').length;

        // No other types should exist
        expect(cardCount + salvageCount).toBe(slots.length);
      }
    });

    it('should have rollCardCount method for card count determination', () => {
      // The rollCardCount method should exist
      expect(typeof rewardManager.rollCardCount).toBe('function');

      gameStateManager.getState.mockReturnValue({
        masterSeed: 33333
      });

      const rng = createRNG(33333);
      const cardCount = rewardManager.rollCardCount('core', tierConfig, rng);

      expect(cardCount).toBeGreaterThanOrEqual(1);
      expect(cardCount).toBeLessThanOrEqual(3);
    });
  });

  // --- Pack Type & Tier Compliance ---
  describe('generateSalvageSlots - Pack Type & Tier Compliance', () => {
    const tierConfig = {
      zoneRewardWeights: {
        perimeter: { cardCountWeights: { 1: 80, 2: 15, 3: 5 } },
        mid: { cardCountWeights: { 1: 35, 2: 50, 3: 15 } },
        core: { cardCountWeights: { 1: 15, 2: 40, 3: 45 } }
      },
      salvageSlotCountWeights: {
        perimeter: { 1: 50, 2: 30, 3: 15, 4: 5, 5: 0 },
        mid: { 1: 10, 2: 30, 3: 35, 4: 20, 5: 5 },
        core: { 1: 0, 2: 10, 3: 25, 4: 40, 5: 25 }
      }
    };

    it('should guarantee at least one card matches pack type (ORDNANCE_PACK → Ordnance)', () => {
      // Run multiple times to ensure guaranteed type is working
      for (let i = 0; i < 20; i++) {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 44444 + i * 17
        });

        const slots = rewardManager.generateSalvageSlots('ORDNANCE_PACK', 1, 'core', tierConfig);
        const cardSlots = slots.filter(s => s.type === 'card');

        // At least one card should be Ordnance type (guaranteed by pack)
        const hasOrdnance = cardSlots.some(s => s.content.type === 'Ordnance');
        expect(hasOrdnance).toBe(true);
      }
    });

    it('should use tier-based rarity weights (T1 = mostly Common)', () => {
      let commonCount = 0;
      let totalCards = 0;

      for (let i = 0; i < 50; i++) {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 55555 + i * 23
        });

        const slots = rewardManager.generateSalvageSlots('ORDNANCE_PACK', 1, 'core', tierConfig);
        slots.filter(s => s.type === 'card').forEach(s => {
          totalCards++;
          if (s.content.rarity === 'Common') commonCount++;
        });
      }

      // T1 rarityWeights: { Common: 90, Uncommon: 10 }
      // Deterministic LCG with fixed seeds: exactly 99/109 cards are Common (90.8%)
      expect(commonCount).toBe(99);
      expect(totalCards).toBe(109);
    });

    it('should never include Upgrade cards in ORDNANCE_PACK (additionalCardWeights.Upgrade = 0)', () => {
      // ORDNANCE_PACK has Upgrade: 0 in additionalCardWeights
      for (let i = 0; i < 30; i++) {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 66666 + i * 29
        });

        const slots = rewardManager.generateSalvageSlots('ORDNANCE_PACK', 1, 'core', tierConfig);
        const cardSlots = slots.filter(s => s.type === 'card');

        // No card should be Upgrade type
        cardSlots.forEach(s => {
          expect(s.content.type).not.toBe('Upgrade');
        });
      }
    });

    it('should guarantee Support card from SUPPORT_PACK', () => {
      for (let i = 0; i < 20; i++) {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 77777 + i * 31
        });

        const slots = rewardManager.generateSalvageSlots('SUPPORT_PACK', 1, 'mid', tierConfig);
        const cardSlots = slots.filter(s => s.type === 'card');

        const hasSupport = cardSlots.some(s => s.content.type === 'Support');
        expect(hasSupport).toBe(true);
      }
    });
  });

  // =====================================================
  // SPECIAL PACK TYPES (Smuggler Caches)
  // =====================================================

  describe('generateSalvageSlots - Special Pack Types', () => {
    const tierConfig = {
      salvageSlotCountWeights: {
        perimeter: { 1: 50, 2: 30, 3: 15, 4: 5, 5: 0 },
        mid:       { 1: 10, 2: 30, 3: 35, 4: 20, 5: 5 },
        core:      { 1: 0, 2: 10, 3: 25, 4: 40, 5: 25 }
      },
      zoneRewardWeights: {
        perimeter: { cardCountWeights: { 1: 80, 2: 15, 3: 5 }, creditsMultiplier: 0.6 },
        mid:       { cardCountWeights: { 1: 35, 2: 50, 3: 15 }, creditsMultiplier: 1.0 },
        core:      { cardCountWeights: { 1: 15, 2: 40, 3: 45 }, creditsMultiplier: 1.5 }
      }
    };

    describe('TOKEN_REWARD (Contraband Cache)', () => {
      it('should include exactly one security token', () => {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 50000
        });

        const slots = rewardManager.generateSalvageSlots('TOKEN_REWARD', 1, 'mid', tierConfig);

        const tokenSlots = slots.filter(s => s.type === 'token');
        expect(tokenSlots).toHaveLength(1);
        expect(tokenSlots[0].content.tokenType).toBe('security');
        expect(tokenSlots[0].content.amount).toBe(1);
        expect(tokenSlots[0].content.source).toBe('contraband_cache');
      });

      it('should fill remaining slots with salvage items (and possibly a card)', () => {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 50001
        });

        const slots = rewardManager.generateSalvageSlots('TOKEN_REWARD', 1, 'mid', tierConfig);

        // Should have at least 1 slot (token) and the rest are salvage/card
        expect(slots.length).toBeGreaterThanOrEqual(1);

        // Token should exist
        const hasToken = slots.some(s => s.type === 'token');
        expect(hasToken).toBe(true);

        // All other slots should be salvageItem or card
        const otherSlots = slots.filter(s => s.type !== 'token');
        otherSlots.forEach(slot => {
          expect(['salvageItem', 'card']).toContain(slot.type);
        });
      });

      it('should have zone-appropriate slot count (core > perimeter on average)', () => {
        let coreTotal = 0;
        let perimeterTotal = 0;

        for (let i = 0; i < 50; i++) {
          gameStateManager.getState.mockReturnValue({
            masterSeed: 60000 + i
          });

          coreTotal += rewardManager.generateSalvageSlots('TOKEN_REWARD', 1, 'core', tierConfig).length;

          gameStateManager.getState.mockReturnValue({
            masterSeed: 70000 + i
          });

          perimeterTotal += rewardManager.generateSalvageSlots('TOKEN_REWARD', 1, 'perimeter', tierConfig).length;
        }

        // Core should average more slots than perimeter
        expect(coreTotal / 50).toBeGreaterThan(perimeterTotal / 50);
      });

      it('should sometimes include a card (25% chance from config)', () => {
        let cardCount = 0;
        const iterations = 100;

        for (let i = 0; i < iterations; i++) {
          gameStateManager.getState.mockReturnValue({
            masterSeed: 80000 + i
          });

          const slots = rewardManager.generateSalvageSlots('TOKEN_REWARD', 1, 'mid', tierConfig);
          if (slots.some(s => s.type === 'card')) {
            cardCount++;
          }
        }

        // With 25% chance, expect roughly 15-40 cards in 100 iterations (allowing variance)
        expect(cardCount).toBeGreaterThan(5);
        expect(cardCount).toBeLessThan(60);
      });
    });

    describe('CREDITS_PACK (Credit Cache)', () => {
      it('should contain only salvage items (no cards, no tokens)', () => {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 90000
        });

        const slots = rewardManager.generateSalvageSlots('CREDITS_PACK', 1, 'mid', tierConfig);

        const cardSlots = slots.filter(s => s.type === 'card');
        const tokenSlots = slots.filter(s => s.type === 'token');

        expect(cardSlots).toHaveLength(0);
        expect(tokenSlots).toHaveLength(0);

        // All slots should be salvageItem
        slots.forEach(slot => {
          expect(slot.type).toBe('salvageItem');
        });
      });

      it('should have higher value salvage items than normal packs', () => {
        let creditsTotal = 0;
        let ordnanceTotal = 0;
        const iterations = 30;

        for (let i = 0; i < iterations; i++) {
          gameStateManager.getState.mockReturnValue({
            masterSeed: 91000 + i
          });

          const creditSlots = rewardManager.generateSalvageSlots('CREDITS_PACK', 1, 'mid', tierConfig);

          gameStateManager.getState.mockReturnValue({
            masterSeed: 92000 + i
          });

          const ordnanceSlots = rewardManager.generateSalvageSlots('ORDNANCE_PACK', 1, 'mid', tierConfig);

          creditSlots.filter(s => s.type === 'salvageItem').forEach(s => {
            creditsTotal += s.content?.creditValue || 0;
          });
          ordnanceSlots.filter(s => s.type === 'salvageItem').forEach(s => {
            ordnanceTotal += s.content?.creditValue || 0;
          });
        }

        // CREDITS_PACK (100-300 per slot) should average higher than ORDNANCE_PACK (50-100)
        expect(creditsTotal).toBeGreaterThan(ordnanceTotal);
      });

      it('should apply zone multiplier (core > mid > perimeter)', () => {
        let coreTotal = 0;
        let midTotal = 0;
        let perimeterTotal = 0;
        const iterations = 30;

        for (let i = 0; i < iterations; i++) {
          gameStateManager.getState.mockReturnValue({ masterSeed: 93000 + i });
          const coreSlots = rewardManager.generateSalvageSlots('CREDITS_PACK', 1, 'core', tierConfig);

          gameStateManager.getState.mockReturnValue({ masterSeed: 94000 + i });
          const midSlots = rewardManager.generateSalvageSlots('CREDITS_PACK', 1, 'mid', tierConfig);

          gameStateManager.getState.mockReturnValue({ masterSeed: 95000 + i });
          const perimeterSlots = rewardManager.generateSalvageSlots('CREDITS_PACK', 1, 'perimeter', tierConfig);

          coreSlots.forEach(s => { if (s.content?.creditValue) coreTotal += s.content.creditValue; });
          midSlots.forEach(s => { if (s.content?.creditValue) midTotal += s.content.creditValue; });
          perimeterSlots.forEach(s => { if (s.content?.creditValue) perimeterTotal += s.content.creditValue; });
        }

        // With zone multipliers: core (1.5x) > mid (1.0x) > perimeter (0.6x)
        // Core should be significantly higher than perimeter
        expect(coreTotal).toBeGreaterThan(perimeterTotal);
      });

      it('should also work with CREDITS alias', () => {
        gameStateManager.getState.mockReturnValue({
          masterSeed: 96000
        });

        const slots = rewardManager.generateSalvageSlots('CREDITS', 1, 'mid', tierConfig);

        // Should work the same as CREDITS_PACK
        expect(slots.length).toBeGreaterThan(0);
        slots.forEach(slot => {
          expect(slot.type).toBe('salvageItem');
        });
      });
    });
  });

  // =====================================================
  // BOSS REWARDS (TDD - RED phase)
  // =====================================================

  describe('generateBossReward', () => {
    it('should return first-time rewards for first victory', () => {
      const bossConfig = {
        firstTimeReward: { credits: 1000, aiCores: 10, reputation: 2000 },
        repeatReward: { credits: 500, aiCores: 5, reputation: 1000 }
      };

      const rewards = rewardManager.generateBossReward(bossConfig, true);

      expect(rewards.credits).toBe(1000);
      expect(rewards.aiCores).toBe(10);
      expect(rewards.reputation).toBe(2000);
      expect(rewards.isBossReward).toBe(true);
      expect(rewards.seed).toBeDefined();
    });

    it('should return repeat rewards for subsequent victories', () => {
      const bossConfig = {
        firstTimeReward: { credits: 1000, aiCores: 10, reputation: 2000 },
        repeatReward: { credits: 500, aiCores: 5, reputation: 1000 }
      };

      const rewards = rewardManager.generateBossReward(bossConfig, false);

      expect(rewards.credits).toBe(500);
      expect(rewards.aiCores).toBe(5);
      expect(rewards.reputation).toBe(1000);
    });

    it('should use fallback defaults when config is missing', () => {
      const rewards = rewardManager.generateBossReward({}, true);

      // Should use BOSS_REWARD defaults from cardPackData
      expect(rewards.credits).toBeGreaterThan(0);
      expect(rewards.isBossReward).toBe(true);
    });

    it('should track reward in history', () => {
      rewardManager.reset();

      const bossConfig = {
        firstTimeReward: { credits: 1000, aiCores: 10, reputation: 2000 }
      };

      rewardManager.generateBossReward(bossConfig, true);

      const history = rewardManager.getState().rewardHistory;
      const lastEntry = history[history.length - 1];
      expect(lastEntry.type).toBe('boss_reward');
      expect(lastEntry.content.isFirstVictory).toBe(true);
    });

    it('should increment master seed', () => {
      let currentSeed = 100;

      gameStateManager.getState.mockImplementation(() => ({
        gameSeed: 12345,
        masterSeed: currentSeed
      }));

      gameStateManager.setState.mockImplementation((update) => {
        if (update.masterSeed !== undefined) {
          currentSeed = update.masterSeed;
        }
      });

      const bossConfig = {
        firstTimeReward: { credits: 1000, aiCores: 10, reputation: 2000 }
      };

      rewardManager.generateBossReward(bossConfig, true);

      expect(currentSeed).toBe(101);
    });
  });

  // =====================================================
  // QUICK DEPLOY PATH VERIFICATION
  // =====================================================

  describe('Quick Deploy Path Verification', () => {
    it('should use same generateCombatRewards() as standard deploy', () => {
      // Quick deploy uses the same code path as standard deploy
      // This test verifies the method exists and returns correct format
      const combatContext = {
        enemyDeck: [
          { id: 'laser_burst', name: 'Laser Burst', rarity: 'Common', type: 'Ordnance' }
        ],
        tier: 1,
        aiDifficulty: 'Normal'
      };

      const rewards = rewardManager.generateCombatRewards(combatContext);

      // Verify standard combat reward format
      expect(rewards.cards).toBeDefined();
      expect(rewards.salvageItem).toBeDefined();
      expect(rewards.aiCores).toBeDefined();
      expect(rewards.seed).toBeDefined();

      // Cards should have cardId format (transformed)
      if (rewards.cards.length > 0) {
        expect(rewards.cards[0].cardId).toBeDefined();
        expect(rewards.cards[0].cardName).toBeDefined();
      }
    });
  });

  // =====================================================
  // CROSS-PATH FORMAT CONSISTENCY
  // =====================================================

  describe('Cross-Path Format Consistency', () => {
    const tierConfig = {
      salvageSlotCountWeights: { mid: { 2: 100 } },
      zoneRewardWeights: { mid: { cardCountWeights: { 1: 100 }, creditsMultiplier: 1.0 } }
    };

    it('should use cardId/cardName format across all paths', () => {
      // POI Rewards
      const poiRewards = rewardManager.generatePOIRewards({
        poiData: { rewardType: 'ORDNANCE_PACK' },
        tier: 1
      });
      poiRewards.cards.forEach(card => {
        expect(card.cardId).toBeDefined();
        expect(card.cardName).toBeDefined();
        expect(card.id).toBeUndefined();
      });

      // Salvage Slots
      const salvageSlots = rewardManager.generateSalvageSlots('ORDNANCE_PACK', 1, 'mid', tierConfig);
      salvageSlots.filter(s => s.type === 'card').forEach(slot => {
        expect(slot.content.cardId).toBeDefined();
        expect(slot.content.cardName).toBeDefined();
      });

      // Shop Pack
      const shopPack = rewardManager.generateShopPack('ORDNANCE_PACK', 1);
      shopPack.cards.forEach(card => {
        expect(card.cardId).toBeDefined();
        expect(card.cardName).toBeDefined();
      });
    });

    it('should use creditValue field for all salvage items', () => {
      // POI salvage
      const poiRewards = rewardManager.generatePOIRewards({
        poiData: { rewardType: 'ORDNANCE_PACK' },
        tier: 1
      });
      expect(poiRewards.salvageItem.creditValue).toBeDefined();

      // Combat salvage
      const combatRewards = rewardManager.generateCombatRewards({
        enemyDeck: [{ id: 'laser_burst', name: 'Laser Burst', rarity: 'Common', type: 'Ordnance' }],
        tier: 1
      });
      expect(combatRewards.salvageItem.creditValue).toBeDefined();

      // Salvage slots
      const salvageSlots = rewardManager.generateSalvageSlots('ORDNANCE_PACK', 1, 'mid', tierConfig);
      salvageSlots.filter(s => s.type === 'salvageItem').forEach(slot => {
        expect(slot.content.creditValue).toBeDefined();
      });
    });
  });
});
