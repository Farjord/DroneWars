/**
 * GameStateManager Tactical Items Tests
 * TDD: Tests for purchase, use, and get methods for tactical items
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import gameStateManager from './GameStateManager.js';
import { getTacticalItemById, tacticalItemCollection } from '../data/tacticalItemData.js';

describe('GameStateManager - tacticalItems', () => {
  beforeEach(() => {
    // Reset to a clean state with adequate credits
    gameStateManager.setState({
      singlePlayerProfile: {
        credits: 10000,
        tacticalItems: {
          ITEM_EVADE: 0,
          ITEM_EXTRACT: 0,
          ITEM_THREAT_REDUCE: 0
        }
      }
    });
  });

  describe('purchaseTacticalItem', () => {
    test('deducts credits and increments item quantity', () => {
      const item = getTacticalItemById('ITEM_EVADE');
      const initialCredits = gameStateManager.getState().singlePlayerProfile.credits;

      const result = gameStateManager.purchaseTacticalItem('ITEM_EVADE');

      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(1);

      const state = gameStateManager.getState();
      expect(state.singlePlayerProfile.credits).toBe(initialCredits - item.cost);
      expect(state.singlePlayerProfile.tacticalItems.ITEM_EVADE).toBe(1);
    });

    test('allows purchasing up to maxCapacity', () => {
      const item = getTacticalItemById('ITEM_EVADE');

      // Purchase up to max
      for (let i = 0; i < item.maxCapacity; i++) {
        const result = gameStateManager.purchaseTacticalItem('ITEM_EVADE');
        expect(result.success).toBe(true);
        expect(result.newQuantity).toBe(i + 1);
      }

      const state = gameStateManager.getState();
      expect(state.singlePlayerProfile.tacticalItems.ITEM_EVADE).toBe(item.maxCapacity);
    });

    test('returns error when insufficient credits', () => {
      gameStateManager.setState({
        singlePlayerProfile: {
          ...gameStateManager.getState().singlePlayerProfile,
          credits: 100 // Not enough for any item
        }
      });

      const result = gameStateManager.purchaseTacticalItem('ITEM_EVADE');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient credits');

      // Verify nothing changed
      const state = gameStateManager.getState();
      expect(state.singlePlayerProfile.credits).toBe(100);
      expect(state.singlePlayerProfile.tacticalItems.ITEM_EVADE).toBe(0);
    });

    test('returns error when at max capacity', () => {
      const item = getTacticalItemById('ITEM_EVADE');

      // Set to max capacity
      gameStateManager.setState({
        singlePlayerProfile: {
          ...gameStateManager.getState().singlePlayerProfile,
          tacticalItems: {
            ...gameStateManager.getState().singlePlayerProfile.tacticalItems,
            ITEM_EVADE: item.maxCapacity
          }
        }
      });

      const initialCredits = gameStateManager.getState().singlePlayerProfile.credits;
      const result = gameStateManager.purchaseTacticalItem('ITEM_EVADE');

      expect(result.success).toBe(false);
      expect(result.error).toContain('max capacity');

      // Verify credits weren't deducted
      const state = gameStateManager.getState();
      expect(state.singlePlayerProfile.credits).toBe(initialCredits);
    });

    test('returns error for invalid item id', () => {
      const result = gameStateManager.purchaseTacticalItem('INVALID_ITEM');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('handles null item id', () => {
      const result = gameStateManager.purchaseTacticalItem(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('useTacticalItem', () => {
    test('decrements item quantity and returns success', () => {
      // First purchase an item
      gameStateManager.setState({
        singlePlayerProfile: {
          ...gameStateManager.getState().singlePlayerProfile,
          tacticalItems: {
            ...gameStateManager.getState().singlePlayerProfile.tacticalItems,
            ITEM_EVADE: 2
          }
        }
      });

      const result = gameStateManager.useTacticalItem('ITEM_EVADE');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);

      const state = gameStateManager.getState();
      expect(state.singlePlayerProfile.tacticalItems.ITEM_EVADE).toBe(1);
    });

    test('returns remaining count after use', () => {
      gameStateManager.setState({
        singlePlayerProfile: {
          ...gameStateManager.getState().singlePlayerProfile,
          tacticalItems: {
            ...gameStateManager.getState().singlePlayerProfile.tacticalItems,
            ITEM_THREAT_REDUCE: 5
          }
        }
      });

      const result = gameStateManager.useTacticalItem('ITEM_THREAT_REDUCE');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    test('returns error when quantity is 0', () => {
      const result = gameStateManager.useTacticalItem('ITEM_EVADE');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No items available');

      // Verify nothing changed
      const state = gameStateManager.getState();
      expect(state.singlePlayerProfile.tacticalItems.ITEM_EVADE).toBe(0);
    });

    test('returns error for invalid item id', () => {
      const result = gameStateManager.useTacticalItem('INVALID_ITEM');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('can use item down to 0', () => {
      gameStateManager.setState({
        singlePlayerProfile: {
          ...gameStateManager.getState().singlePlayerProfile,
          tacticalItems: {
            ...gameStateManager.getState().singlePlayerProfile.tacticalItems,
            ITEM_EXTRACT: 1
          }
        }
      });

      const result = gameStateManager.useTacticalItem('ITEM_EXTRACT');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(0);

      const state = gameStateManager.getState();
      expect(state.singlePlayerProfile.tacticalItems.ITEM_EXTRACT).toBe(0);
    });
  });

  describe('getTacticalItemCount', () => {
    test('returns current quantity for valid item', () => {
      gameStateManager.setState({
        singlePlayerProfile: {
          ...gameStateManager.getState().singlePlayerProfile,
          tacticalItems: {
            ITEM_EVADE: 2,
            ITEM_EXTRACT: 1,
            ITEM_THREAT_REDUCE: 3
          }
        }
      });

      expect(gameStateManager.getTacticalItemCount('ITEM_EVADE')).toBe(2);
      expect(gameStateManager.getTacticalItemCount('ITEM_EXTRACT')).toBe(1);
      expect(gameStateManager.getTacticalItemCount('ITEM_THREAT_REDUCE')).toBe(3);
    });

    test('returns 0 for item with no purchases', () => {
      expect(gameStateManager.getTacticalItemCount('ITEM_EVADE')).toBe(0);
    });

    test('returns 0 for invalid item id', () => {
      expect(gameStateManager.getTacticalItemCount('INVALID_ITEM')).toBe(0);
    });

    test('returns 0 for null item id', () => {
      expect(gameStateManager.getTacticalItemCount(null)).toBe(0);
    });
  });
});
