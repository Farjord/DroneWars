/**
 * GameStateManager POI Outcome State Tracking Tests
 * TDD: Tests written first to verify POI outcome tracking
 *
 * These tests ensure:
 * - fledPOIs is initialized in startRun()
 * - lootedPOIs tracks successful salvage
 * - fledPOIs tracks escaped/evaded POIs
 * - POIs cannot be in both arrays
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gameStateManager from './GameStateManager.js';

// Mock dependencies that startRun() needs
vi.mock('../logic/loot/LootGenerator.js', () => ({
  default: {
    openPack: vi.fn(() => ({ cards: [], salvageItems: [] })),
    generateCombatSalvage: vi.fn(() => ({ cards: [], salvageItem: null, aiCores: 0 })),
    generateSalvageSlots: vi.fn(() => [])
  }
}));

vi.mock('../logic/extraction/mapGenerator.js', () => ({
  generateMapData: vi.fn(() => ({
    hexes: [
      { q: 0, r: 0, type: 'gate' },
      { q: 1, r: 0, type: 'poi', poiData: { name: 'Test POI', encounterChance: 20 } }
    ],
    gates: [{ q: 0, r: 0 }],
    tier: 1
  }))
}));

describe('GameStateManager - POI Outcome State Tracking', () => {
  beforeEach(() => {
    // Reset to clean state before each test
    gameStateManager.setState({
      appState: 'hangar',
      currentRunState: null,
      singlePlayerProfile: {
        credits: 1000,
        securityTokens: 5
      },
      singlePlayerShipSlots: [
        {
          id: 1,
          status: 'active',
          shipId: 'ship_standard',
          deck: [],
          sectionSlots: {
            bridge: { slotId: 1, componentId: 'bridge_standard', currentHull: 10 },
            powerCell: { slotId: 2, componentId: 'powercell_standard', currentHull: 10 },
            droneControlHub: { slotId: 3, componentId: 'hub_standard', currentHull: 10 }
          },
          activeDronePool: []
        }
      ]
    });
  });

  describe('fledPOIs initialization', () => {
    it('should initialize fledPOIs as empty array in startRun()', () => {
      // ACT: Start a new run
      gameStateManager.startRun(1, 1);

      // ASSERT: fledPOIs should be an empty array
      const runState = gameStateManager.getState().currentRunState;
      expect(runState).toBeDefined();
      expect(runState.fledPOIs).toBeDefined();
      expect(runState.fledPOIs).toEqual([]);
    });

    it('should initialize lootedPOIs as empty array in startRun()', () => {
      // ACT: Start a new run
      gameStateManager.startRun(1, 1);

      // ASSERT: lootedPOIs should be an empty array
      const runState = gameStateManager.getState().currentRunState;
      expect(runState.lootedPOIs).toBeDefined();
      expect(runState.lootedPOIs).toEqual([]);
    });

    it('should initialize highAlertPOIs as empty array in startRun()', () => {
      // ACT: Start a new run
      gameStateManager.startRun(1, 1);

      // ASSERT: highAlertPOIs should be an empty array
      const runState = gameStateManager.getState().currentRunState;
      expect(runState.highAlertPOIs).toBeDefined();
      expect(runState.highAlertPOIs).toEqual([]);
    });
  });

  describe('POI state updates', () => {
    beforeEach(() => {
      // Start a run for these tests
      gameStateManager.startRun(1, 1);
    });

    it('should allow adding POI to lootedPOIs (successful salvage)', () => {
      // ARRANGE
      const poiCoords = { q: 5, r: -2 };

      // ACT: Simulate successful salvage
      const currentState = gameStateManager.getState();
      gameStateManager.setState({
        currentRunState: {
          ...currentState.currentRunState,
          lootedPOIs: [...currentState.currentRunState.lootedPOIs, poiCoords]
        }
      });

      // ASSERT
      const runState = gameStateManager.getState().currentRunState;
      expect(runState.lootedPOIs).toContainEqual(poiCoords);
      expect(runState.lootedPOIs).toHaveLength(1);
    });

    it('should allow adding POI to fledPOIs (escaped/evaded)', () => {
      // ARRANGE
      const poiCoords = { q: 3, r: -1 };

      // ACT: Simulate escape from POI
      const currentState = gameStateManager.getState();
      gameStateManager.setState({
        currentRunState: {
          ...currentState.currentRunState,
          fledPOIs: [...currentState.currentRunState.fledPOIs, poiCoords]
        }
      });

      // ASSERT
      const runState = gameStateManager.getState().currentRunState;
      expect(runState.fledPOIs).toContainEqual(poiCoords);
      expect(runState.fledPOIs).toHaveLength(1);
    });

    it('should keep lootedPOIs and fledPOIs separate', () => {
      // ARRANGE
      const lootedPoi = { q: 1, r: 0 };
      const fledPoi = { q: 2, r: -1 };

      // ACT: Add one to each array
      const currentState = gameStateManager.getState();
      gameStateManager.setState({
        currentRunState: {
          ...currentState.currentRunState,
          lootedPOIs: [...currentState.currentRunState.lootedPOIs, lootedPoi],
          fledPOIs: [...currentState.currentRunState.fledPOIs, fledPoi]
        }
      });

      // ASSERT
      const runState = gameStateManager.getState().currentRunState;
      expect(runState.lootedPOIs).toContainEqual(lootedPoi);
      expect(runState.lootedPOIs).not.toContainEqual(fledPoi);
      expect(runState.fledPOIs).toContainEqual(fledPoi);
      expect(runState.fledPOIs).not.toContainEqual(lootedPoi);
    });

    it('should support multiple POIs in fledPOIs', () => {
      // ARRANGE
      const poi1 = { q: 1, r: 0 };
      const poi2 = { q: 2, r: -1 };
      const poi3 = { q: 3, r: -2 };

      // ACT: Add multiple POIs
      const currentState = gameStateManager.getState();
      gameStateManager.setState({
        currentRunState: {
          ...currentState.currentRunState,
          fledPOIs: [poi1, poi2, poi3]
        }
      });

      // ASSERT
      const runState = gameStateManager.getState().currentRunState;
      expect(runState.fledPOIs).toHaveLength(3);
      expect(runState.fledPOIs).toContainEqual(poi1);
      expect(runState.fledPOIs).toContainEqual(poi2);
      expect(runState.fledPOIs).toContainEqual(poi3);
    });
  });

  describe('POI lookup helpers', () => {
    beforeEach(() => {
      gameStateManager.startRun(1, 1);
    });

    it('should be able to check if POI is in fledPOIs', () => {
      // ARRANGE
      const fledPoi = { q: 5, r: -3 };
      const currentState = gameStateManager.getState();
      gameStateManager.setState({
        currentRunState: {
          ...currentState.currentRunState,
          fledPOIs: [fledPoi]
        }
      });

      // ACT: Check if POI is fled
      const runState = gameStateManager.getState().currentRunState;
      const isFled = runState.fledPOIs.some(p => p.q === 5 && p.r === -3);
      const isNotFled = runState.fledPOIs.some(p => p.q === 0 && p.r === 0);

      // ASSERT
      expect(isFled).toBe(true);
      expect(isNotFled).toBe(false);
    });

    it('should be able to check if POI is in lootedPOIs', () => {
      // ARRANGE
      const lootedPoi = { q: 4, r: -2 };
      const currentState = gameStateManager.getState();
      gameStateManager.setState({
        currentRunState: {
          ...currentState.currentRunState,
          lootedPOIs: [lootedPoi]
        }
      });

      // ACT: Check if POI is looted
      const runState = gameStateManager.getState().currentRunState;
      const isLooted = runState.lootedPOIs.some(p => p.q === 4 && p.r === -2);
      const isNotLooted = runState.lootedPOIs.some(p => p.q === 0 && p.r === 0);

      // ASSERT
      expect(isLooted).toBe(true);
      expect(isNotLooted).toBe(false);
    });
  });
});
