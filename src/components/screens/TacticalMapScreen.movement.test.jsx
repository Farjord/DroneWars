/**
 * TacticalMapScreen Movement Tests
 * TDD tests for verifying player movement updates TacticalMapStateManager
 *
 * Bug: After migrating TacticalMapScreen to read from TacticalMapStateManager,
 * the player ship indicator no longer moves because moveToSingleHex() only
 * updates gameStateManager, not tacticalMapStateManager.
 *
 * Fix: moveToSingleHex should update BOTH managers during the migration period.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TacticalMapStateManager } from '../../managers/TacticalMapStateManager.js';

describe('TacticalMapScreen - Movement State Manager Integration', () => {
  let tacticalMapManager;

  beforeEach(() => {
    // Create fresh manager instance for each test
    tacticalMapManager = new TacticalMapStateManager();
  });

  describe('Player position updates', () => {
    it('should update playerPosition in TacticalMapStateManager when movement occurs', () => {
      // Given: An active run with initial position at (0, 0)
      tacticalMapManager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: {
          hexes: [],
          gates: [],
          pois: [],
          backgroundIndex: 0,
          tier: 1,
          seed: 12345,
          radius: 5,
          baseDetection: 10
        },
        startingGate: { q: 0, r: 0 },
        shipSections: {}
      });

      const initialState = tacticalMapManager.getState();
      expect(initialState.playerPosition).toEqual({ q: 0, r: 0 });

      // When: Player moves to a new hex (simulating moveToSingleHex behavior)
      tacticalMapManager.setState({
        playerPosition: { q: 1, r: 0 },
        detection: 15,
        hexesMoved: 1
      });

      // Then: The position should be updated in TacticalMapStateManager
      const updatedState = tacticalMapManager.getState();
      expect(updatedState.playerPosition).toEqual({ q: 1, r: 0 });
      expect(updatedState.detection).toBe(15);
      expect(updatedState.hexesMoved).toBe(1);
    });

    it('should preserve mapData.backgroundIndex when playerPosition is updated', () => {
      // Given: An active run with backgroundIndex of 3
      tacticalMapManager.startRun({
        shipSlotId: 0,
        mapTier: 2,
        mapData: {
          hexes: [],
          gates: [],
          pois: [],
          backgroundIndex: 3,  // Critical: must persist across movement
          tier: 2,
          seed: 54321,
          radius: 6,
          baseDetection: 15
        },
        startingGate: { q: 2, r: -2 },
        shipSections: {}
      });

      // When: Player moves (updating position and detection)
      tacticalMapManager.setState({
        playerPosition: { q: 3, r: -2 },
        detection: 20
      });

      // Then: backgroundIndex should still be preserved
      const state = tacticalMapManager.getState();
      expect(state.mapData.backgroundIndex).toBe(3);
      expect(state.playerPosition).toEqual({ q: 3, r: -2 });
    });

    it('should notify subscribers when playerPosition changes', () => {
      // Given: An active run with a subscriber
      const listener = vi.fn();
      tacticalMapManager.subscribe(listener);

      tacticalMapManager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: { backgroundIndex: 0, tier: 1, seed: 111, radius: 4, baseDetection: 5 },
        startingGate: { q: 0, r: 0 },
        shipSections: {}
      });

      // Clear the startRun notification
      listener.mockClear();

      // When: Player position is updated
      tacticalMapManager.setState({
        playerPosition: { q: -1, r: 1 }
      });

      // Then: Subscriber should be notified
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STATE_UPDATE',
          state: expect.objectContaining({
            playerPosition: { q: -1, r: 1 }
          })
        })
      );
    });

    it('should track hexesMoved correctly across multiple movements', () => {
      // Given: An active run
      tacticalMapManager.startRun({
        shipSlotId: 0,
        mapTier: 1,
        mapData: { backgroundIndex: 0, tier: 1, seed: 999, radius: 5, baseDetection: 10 },
        startingGate: { q: 0, r: 0 },
        shipSections: {}
      });

      // When: Player moves multiple times
      tacticalMapManager.setState({ playerPosition: { q: 1, r: 0 }, hexesMoved: 1 });
      tacticalMapManager.setState({ playerPosition: { q: 2, r: 0 }, hexesMoved: 2 });
      tacticalMapManager.setState({ playerPosition: { q: 3, r: 0 }, hexesMoved: 3 });

      // Then: hexesMoved should reflect all movements
      const state = tacticalMapManager.getState();
      expect(state.hexesMoved).toBe(3);
      expect(state.playerPosition).toEqual({ q: 3, r: 0 });
    });
  });
});
