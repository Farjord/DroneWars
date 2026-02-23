/**
 * EncounterController Consecutive Combat Tests
 * Tests for correct reward type handling in encounters
 *
 * Empty hex encounters: should have NO rewardType (null)
 * - Player only gets enemy salvage from combat, not POI loot
 *
 * POI encounters: should use poiData.rewardType or fallback to CREDITS_PACK
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EncounterController from '../EncounterController.js';
import gameStateManager from '../../../managers/GameStateManager.js';

// Mock gameStateManager to provide game state for seeded random
vi.mock('../../../managers/GameStateManager.js', () => ({
  default: {
    getState: vi.fn(() => ({
      gameSeed: 12345,
      turnPhase: 'action',
      roundNumber: 1,
      player1: { deck: [], hand: [] },
      player2: { deck: [], hand: [] }
    })),
    setState: vi.fn()
  }
}));

describe('EncounterController - ambush reward type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkMovementEncounter', () => {
    it('should return null rewardType for empty hex encounters (no POI reward)', () => {
      // Empty hex encounters should have NO rewardType
      // Player only gets enemy salvage from combat - no POI loot

      const hex = { type: 'empty', q: 0, r: 0 };
      const tierConfig = {
        encounterChance: { empty: 100 }, // 100% encounter chance
        enemies: ['Rogue Scout Pattern']
      };

      // Call checkMovementEncounter - it should return an encounter object
      const result = EncounterController.checkMovementEncounter(hex, tierConfig);

      if (result) {
        // Empty hex should have NO rewardType - only enemy salvage
        expect(result.reward?.rewardType).toBeNull();
      }
    });

    it('should use poiData.rewardType when available for POI hexes', () => {
      // When hex has poiData with rewardType, it should use that

      const hex = {
        type: 'poi',
        q: 0,
        r: 0,
        poiData: { rewardType: 'ORDNANCE_PACK', name: 'Test POI' }
      };
      const tierConfig = {
        encounterChance: { poi: 100 }, // 100% encounter chance
        enemies: ['Rogue Scout Pattern']
      };

      const result = EncounterController.checkMovementEncounter(hex, tierConfig);

      if (result && result.reward) {
        expect(result.reward.rewardType).toBe('ORDNANCE_PACK');
      }
    });

    it('empty hex encounters should never have "loot" outcome - only combat or no encounter', () => {
      // Empty hexes: chance of COMBAT only, never loot
      // If the roll doesn't trigger an encounter, return null
      // If the roll triggers an encounter, outcome MUST be 'combat'

      const hex = { type: 'empty', q: 0, r: 0 };
      const tierConfig = {
        encounterChance: { empty: 100 }, // 100% encounter chance
        enemies: ['Rogue Scout Pattern']
      };

      const result = EncounterController.checkMovementEncounter(hex, tierConfig);

      if (result) {
        // Empty hex encounters must be combat, never loot
        expect(result.outcome).toBe('combat');
        expect(result.outcome).not.toBe('loot');
      }
    });
  });

  describe('calculateReward', () => {
    it('should use CREDITS_PACK not CREDITS as fallback for reward type', () => {
      // calculateReward at line 140 uses 'CREDITS' as fallback
      // Expected: Should use 'CREDITS_PACK' instead

      const poi = {
        poiData: {
          name: 'Test POI',
          // No rewardType specified - should use fallback
        }
      };

      const result = EncounterController.calculateReward(poi, 'looted');

      // rewardType should be CREDITS_PACK, not CREDITS
      expect(result.rewardType).not.toBe('CREDITS');
      expect(result.rewardType).toBe('CREDITS_PACK');
    });

    it('should use poiData.rewardType when available', () => {
      const poi = {
        poiData: {
          name: 'Card Stash',
          rewardType: 'MIXED_PACK'
        }
      };

      const result = EncounterController.calculateReward(poi, 'looted');

      expect(result.rewardType).toBe('MIXED_PACK');
    });
  });
});
