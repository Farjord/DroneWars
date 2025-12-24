/**
 * TacticalMapStateManager Tests
 * TDD tests for the tactical map state manager
 *
 * This manager handles run state:
 * - mapData (hexes, pois, gates, backgroundIndex)
 * - playerPosition, detection
 * - shipSections, collectedLoot
 * - POI tracking (looted, fled, highAlert)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TacticalMapStateManager } from './TacticalMapStateManager.js';

describe('TacticalMapStateManager', () => {
  let manager;

  beforeEach(() => {
    manager = new TacticalMapStateManager();
  });

  describe('initialization', () => {
    it('should initialize with null state when no run is active', () => {
      // When no run is active, state should be null
      // This is different from an empty object - null means "no run"
      expect(manager.getState()).toBeNull();
    });

    it('should have isRunActive() method that returns false initially', () => {
      expect(manager.isRunActive()).toBe(false);
    });
  });

  describe('startRun', () => {
    it('should initialize state when starting a run', () => {
      const mapData = {
        hexes: [],
        gates: [{ q: 0, r: 0 }],
        pois: [],
        backgroundIndex: 3,
        tier: 1,
        seed: 12345
      };

      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData,
        startingGate: { q: 0, r: 0 }
      });

      expect(manager.isRunActive()).toBe(true);
      expect(manager.getState()).not.toBeNull();
      expect(manager.getState().mapData.backgroundIndex).toBe(3);
    });

    it('should preserve mapData.backgroundIndex throughout the run', () => {
      const mapData = {
        hexes: [],
        gates: [{ q: 0, r: 0 }],
        pois: [],
        backgroundIndex: 4,
        tier: 1,
        seed: 12345
      };

      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData,
        startingGate: { q: 0, r: 0 }
      });

      // Update other state
      manager.setState({ detection: 50 });
      manager.setState({ playerPosition: { q: 1, r: 1 } });

      // backgroundIndex should still be preserved
      expect(manager.getState().mapData.backgroundIndex).toBe(4);
    });

    it('should set initial playerPosition to startingGate', () => {
      const mapData = {
        hexes: [],
        gates: [{ q: 2, r: 3 }],
        pois: [],
        backgroundIndex: 0,
        tier: 1,
        seed: 12345
      };

      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData,
        startingGate: { q: 2, r: 3 }
      });

      expect(manager.getState().playerPosition).toEqual({ q: 2, r: 3 });
      expect(manager.getState().insertionGate).toEqual({ q: 2, r: 3 });
    });

    it('should initialize with zero detection from mapData.baseDetection', () => {
      const mapData = {
        hexes: [],
        gates: [{ q: 0, r: 0 }],
        pois: [],
        backgroundIndex: 0,
        baseDetection: 15,
        tier: 1,
        seed: 12345
      };

      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData,
        startingGate: { q: 0, r: 0 }
      });

      expect(manager.getState().detection).toBe(15);
    });
  });

  describe('setState', () => {
    beforeEach(() => {
      // Start a run for these tests
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 2,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });
    });

    it('should update state with partial updates', () => {
      manager.setState({ detection: 25 });
      expect(manager.getState().detection).toBe(25);
    });

    it('should not overwrite mapData when updating other fields', () => {
      const originalBackgroundIndex = manager.getState().mapData.backgroundIndex;

      manager.setState({ detection: 50 });
      manager.setState({ playerPosition: { q: 1, r: 1 } });
      manager.setState({ collectedLoot: [{ type: 'card', cardId: 'test' }] });

      expect(manager.getState().mapData.backgroundIndex).toBe(originalBackgroundIndex);
    });

    it('should allow updating nested mapData properties', () => {
      // If you need to update something in mapData, you must spread
      const currentMapData = manager.getState().mapData;
      manager.setState({
        mapData: {
          ...currentMapData,
          // backgroundIndex stays the same because we're spreading
        }
      });

      expect(manager.getState().mapData.backgroundIndex).toBe(2);
    });

    it('should throw error if run is not active', () => {
      manager.endRun();
      expect(() => manager.setState({ detection: 50 })).toThrow();
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers when state changes', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 0,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 0,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });

      listener.mockClear();
      unsubscribe();

      manager.setState({ detection: 50 });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('endRun', () => {
    it('should reset state to null when run ends', () => {
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 0,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });

      expect(manager.isRunActive()).toBe(true);

      manager.endRun();

      expect(manager.isRunActive()).toBe(false);
      expect(manager.getState()).toBeNull();
    });

    it('should notify subscribers when run ends', () => {
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 0,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });

      const listener = vi.fn();
      manager.subscribe(listener);
      listener.mockClear();

      manager.endRun();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('combat integration', () => {
    // These tests verify the key fix: backgroundIndex survives combat

    it('should preserve all state including backgroundIndex when combat starts', () => {
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 3,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });

      manager.setState({ detection: 30 });
      manager.setState({ playerPosition: { q: 1, r: 1 } });

      // Simulate what happens when combat starts
      // TacticalMapStateManager should NOT be reset or modified
      // Combat uses CombatStateManager instead

      // After "combat" (nothing happens to this manager)
      expect(manager.getState().mapData.backgroundIndex).toBe(3);
      expect(manager.getState().detection).toBe(30);
      expect(manager.getState().playerPosition).toEqual({ q: 1, r: 1 });
    });

    it('should allow updating shipSections after combat victory', () => {
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 2,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 },
        shipSections: {
          bridge: { hull: 10, maxHull: 10 },
          powerCell: { hull: 10, maxHull: 10 },
          droneControlHub: { hull: 10, maxHull: 10 }
        }
      });

      // Simulate damage from combat
      manager.setState({
        shipSections: {
          bridge: { hull: 7, maxHull: 10 },
          powerCell: { hull: 10, maxHull: 10 },
          droneControlHub: { hull: 8, maxHull: 10 }
        },
        currentHull: 25
      });

      // backgroundIndex should still be preserved
      expect(manager.getState().mapData.backgroundIndex).toBe(2);
      expect(manager.getState().shipSections.bridge.hull).toBe(7);
    });

    it('should allow adding to collectedLoot after combat', () => {
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 4,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });

      const existingLoot = manager.getState().collectedLoot || [];
      manager.setState({
        collectedLoot: [...existingLoot, { type: 'card', cardId: 'laser1' }]
      });

      // backgroundIndex should still be preserved
      expect(manager.getState().mapData.backgroundIndex).toBe(4);
      expect(manager.getState().collectedLoot.length).toBe(1);
    });

    it('should track combatsWon counter', () => {
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 1,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });

      expect(manager.getState().combatsWon).toBe(0);

      manager.setState({ combatsWon: 1 });
      expect(manager.getState().combatsWon).toBe(1);
      expect(manager.getState().mapData.backgroundIndex).toBe(1);
    });
  });

  describe('POI tracking', () => {
    beforeEach(() => {
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [{ q: 1, r: 1 }, { q: 2, r: 2 }],
          backgroundIndex: 0,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });
    });

    it('should track looted POIs', () => {
      const lootedPOIs = manager.getState().lootedPOIs || [];
      manager.setState({
        lootedPOIs: [...lootedPOIs, { q: 1, r: 1 }]
      });

      expect(manager.getState().lootedPOIs).toContainEqual({ q: 1, r: 1 });
    });

    it('should track fled POIs', () => {
      const fledPOIs = manager.getState().fledPOIs || [];
      manager.setState({
        fledPOIs: [...fledPOIs, { q: 2, r: 2 }]
      });

      expect(manager.getState().fledPOIs).toContainEqual({ q: 2, r: 2 });
    });

    it('should track high alert POIs', () => {
      const highAlertPOIs = manager.getState().highAlertPOIs || [];
      manager.setState({
        highAlertPOIs: [...highAlertPOIs, { q: 1, r: 1, bonus: 10 }]
      });

      expect(manager.getState().highAlertPOIs).toContainEqual({ q: 1, r: 1, bonus: 10 });
    });
  });

  describe('pending state', () => {
    beforeEach(() => {
      manager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [{ q: 0, r: 0 }],
          pois: [],
          backgroundIndex: 0,
          tier: 1,
          seed: 12345
        },
        startingGate: { q: 0, r: 0 }
      });
    });

    it('should store pendingPOICombat for post-combat processing', () => {
      manager.setState({
        pendingPOICombat: {
          packType: 'ORDNANCE_PACK',
          q: 1,
          r: 1,
          poiName: 'Weapons Cache'
        }
      });

      expect(manager.getState().pendingPOICombat).toEqual({
        packType: 'ORDNANCE_PACK',
        q: 1,
        r: 1,
        poiName: 'Weapons Cache'
      });
    });

    it('should store pendingWaypoints for journey resumption', () => {
      manager.setState({
        pendingWaypoints: [{ q: 1, r: 1 }, { q: 2, r: 2 }]
      });

      expect(manager.getState().pendingWaypoints).toEqual([
        { q: 1, r: 1 },
        { q: 2, r: 2 }
      ]);
    });

    it('should clear pending state when processed', () => {
      manager.setState({
        pendingPOICombat: { packType: 'ORDNANCE_PACK', q: 1, r: 1 },
        pendingWaypoints: [{ q: 2, r: 2 }]
      });

      manager.setState({
        pendingPOICombat: null,
        pendingWaypoints: null
      });

      expect(manager.getState().pendingPOICombat).toBeNull();
      expect(manager.getState().pendingWaypoints).toBeNull();
    });
  });
});
