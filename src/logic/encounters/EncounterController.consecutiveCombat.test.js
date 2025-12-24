/**
 * EncounterController Consecutive Combat Tests
 * Tests for correct pack type fallback in ambush encounters
 *
 * BUG: EncounterController uses 'CREDITS' as fallback rewardType (line 140, 405),
 * but LootGenerator only recognizes 'CREDITS_PACK'. This causes:
 * - "Unknown pack type: CREDITS" console error
 * - Empty loot generation for ambush encounters
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EncounterController from './EncounterController.js';
import gameStateManager from '../../managers/GameStateManager.js';

// Mock gameStateManager to provide game state for seeded random
vi.mock('../../managers/GameStateManager.js', () => ({
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
    it('should use CREDITS_PACK not CREDITS for empty hex encounter reward type', () => {
      // This test reproduces the bug where 'CREDITS' is used as fallback (line 405)
      // Expected: Should use 'CREDITS_PACK' instead

      const hex = { type: 'empty', q: 0, r: 0 };
      const tierConfig = {
        encounterChance: { empty: 100 }, // 100% encounter chance
        enemies: ['Rogue Scout Pattern']
      };

      // Call checkMovementEncounter - it should return an encounter object
      const result = EncounterController.checkMovementEncounter(hex, tierConfig);

      if (result) {
        // The rewardType should be CREDITS_PACK, not CREDITS
        // This will FAIL currently because line 405 uses 'CREDITS'
        expect(result.reward?.rewardType).not.toBe('CREDITS');
        expect(result.reward?.rewardType).toBe('CREDITS_PACK');
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
