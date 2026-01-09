/**
 * TransitionManager Tests (TDD)
 *
 * Tests for the TransitionManager coordinator that handles all state transitions
 * between TacticalMap and Combat.
 *
 * Test-Driven Development: These tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import transitionManager from './TransitionManager.js';
import tacticalMapStateManager from './TacticalMapStateManager.js';
import gameStateManager from './GameStateManager.js';

// Mock dependencies
vi.mock('./TacticalMapStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn(),
    isRunActive: vi.fn()
  }
}));

vi.mock('./GameStateManager.js', () => ({
  default: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

// Mock debugLogger
vi.mock('../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Helper: Create minimal valid TacticalMapState
function createMockTacticalMapState(overrides = {}) {
  return {
    shipSlotId: 1,
    mapTier: 1,
    mapData: { backgroundIndex: 0, hexes: [] },
    playerPosition: { q: 5, r: 3 },
    insertionGate: { q: 0, r: 0 },
    detection: 45,
    encounterDetectionChance: 23.5,
    shipSections: {
      bridge: { id: 'COMP_BRIDGE_1', hull: 8, maxHull: 10, lane: 'm' },
      powerCell: { id: 'COMP_POWER_1', hull: 10, maxHull: 10, lane: 'l' },
      droneControlHub: { id: 'COMP_HUB_1', hull: 7, maxHull: 10, lane: 'r' }
    },
    currentHull: 25,
    maxHull: 30,
    collectedLoot: [],
    creditsEarned: 150,
    aiCoresEarned: 2,
    lootedPOIs: [],
    fledPOIs: [],
    highAlertPOIs: [],
    runStartTime: Date.now(),
    hexesMoved: 12,
    hexesExplored: [],
    poisVisited: [],
    combatsWon: 1,
    combatsLost: 0,
    combatReputationEarned: [],
    pendingPOICombat: null,
    pendingPath: null,
    pendingWaypointIndexes: null,
    pendingSalvageLoot: null,
    pendingSalvageState: null,
    pendingBlockadeExtraction: false,
    blockadeCleared: false,
    ...overrides
  };
}

// Helper: Create mock waypoint context
function createMockWaypointContext(overrides = {}) {
  return {
    waypoints: [
      {
        hex: { q: 10, r: 10 },
        pathFromPrev: [
          { q: 5, r: 3 },
          { q: 6, r: 4 },
          { q: 7, r: 5 },
          { q: 8, r: 6 },
          { q: 10, r: 10 }
        ],
        segmentCost: 12.5,
        cumulativeDetection: 25.0,
        segmentEncounterRisk: 8.3,
        cumulativeEncounterRisk: 15.7
      },
      {
        hex: { q: 15, r: 15 },
        pathFromPrev: [
          { q: 10, r: 10 },
          { q: 12, r: 12 },
          { q: 15, r: 15 }
        ],
        segmentCost: 10.0,
        cumulativeDetection: 35.0,
        segmentEncounterRisk: 6.0,
        cumulativeEncounterRisk: 20.8
      }
    ],
    currentWaypointIndex: 0,
    currentHexIndex: 2,
    isAtPOI: false,
    ...overrides
  };
}

// Helper: Create mock salvage state
function createMockSalvageState(overrides = {}) {
  return {
    poi: { q: 5, r: 3, poiData: { rewardType: 'SALVAGE_PACK' } },
    zone: 'mid',
    totalSlots: 5,
    slots: [
      { type: 'card', content: { cardId: 'card_1' }, revealed: true },
      { type: 'salvageItem', content: { id: 'salvage_1' }, revealed: true },
      { type: 'card', content: { cardId: 'card_2' }, revealed: false },
      { type: 'salvageItem', content: { id: 'salvage_2' }, revealed: false },
      { type: 'token', content: { tokenType: 'security' }, revealed: false }
    ],
    currentSlotIndex: 2,
    currentEncounterChance: 35,
    encounterTriggered: true,
    scanningInProgress: false,
    returnedFromCombat: false,
    ...overrides
  };
}

describe('TransitionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset TransitionManager state
    transitionManager._reset();

    // Default: active run with valid state
    tacticalMapStateManager.isRunActive.mockReturnValue(true);
    tacticalMapStateManager.getState.mockReturnValue(createMockTacticalMapState());
    gameStateManager.getState.mockReturnValue({ appState: 'tacticalMap', masterSeed: 12345 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // prepareForCombat() Tests
  // ============================================================
  describe('prepareForCombat()', () => {
    describe('Snapshot Creation', () => {
      it('should create a valid snapshot with metadata', () => {
        const context = {
          entryReason: 'poi_encounter',
          sourceLocation: 'TacticalMapScreen:handleEncounterProceed',
          aiId: 'AI_SCOUT_1',
          poi: { q: 5, r: 3, poiData: { packType: 'ORDNANCE_PACK' } }
        };

        const snapshot = transitionManager.prepareForCombat(context);

        expect(snapshot).toBeDefined();
        expect(snapshot.metadata).toBeDefined();
        expect(snapshot.metadata.snapshotId).toMatch(/^snap_\d+$/);
        expect(snapshot.metadata.timestamp).toBeTypeOf('number');
        expect(snapshot.metadata.entryReason).toBe('poi_encounter');
        expect(snapshot.metadata.sourceLocation).toBe('TacticalMapScreen:handleEncounterProceed');
        expect(snapshot.metadata.combatContext.aiId).toBe('AI_SCOUT_1');
      });

      it('should capture full TacticalMapStateManager state', () => {
        const mockState = createMockTacticalMapState({
          detection: 55,
          creditsEarned: 200,
          aiCoresEarned: 5
        });
        tacticalMapStateManager.getState.mockReturnValue(mockState);

        const snapshot = transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1'
        });

        expect(snapshot.tacticalMapState).toBeDefined();
        expect(snapshot.tacticalMapState.detection).toBe(55);
        expect(snapshot.tacticalMapState.creditsEarned).toBe(200);
        expect(snapshot.tacticalMapState.aiCoresEarned).toBe(5);
        expect(snapshot.tacticalMapState.shipSections).toBeDefined();
      });

      it('should store simplified waypoint format (flat list + markers)', () => {
        const waypointContext = createMockWaypointContext();

        const snapshot = transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1',
          waypointContext
        });

        expect(snapshot.waypointData).toBeDefined();
        // Flat hex list
        expect(snapshot.waypointData.pathHexes).toBeInstanceOf(Array);
        expect(snapshot.waypointData.pathHexes.every(h => typeof h === 'string')).toBe(true);
        // Waypoint markers (indexes into pathHexes)
        expect(snapshot.waypointData.waypointIndexes).toBeInstanceOf(Array);
        expect(snapshot.waypointData.waypointIndexes.every(i => typeof i === 'number')).toBe(true);
        // Current position
        expect(snapshot.waypointData.currentHexIndex).toBe(2);
      });

      it('should correctly flatten waypoint paths to hex list', () => {
        const waypointContext = createMockWaypointContext({
          currentWaypointIndex: 0,
          currentHexIndex: 2, // At hex index 2 of waypoint 0
          isAtPOI: false
        });

        const snapshot = transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1',
          waypointContext
        });

        // Should include: remaining hexes from current waypoint + all hexes from next waypoints
        // Current waypoint path: [5,3], [6,4], [7,5], [8,6], [10,10] - we're at index 2 (7,5)
        // Remaining: [8,6], [10,10]
        // Next waypoint path: [10,10], [12,12], [15,15] - skip first (duplicate)
        // Final: ['8,6', '10,10', '12,12', '15,15']
        expect(snapshot.waypointData.pathHexes).toEqual([
          '8,6', '10,10', '12,12', '15,15'
        ]);

        // Waypoint destination indexes (where each waypoint ends)
        // 10,10 is at index 1, 15,15 is at index 3
        expect(snapshot.waypointData.waypointIndexes).toEqual([1, 3]);
      });

      it('should handle at-POI waypoint context correctly', () => {
        const waypointContext = createMockWaypointContext({
          currentWaypointIndex: 0,
          currentHexIndex: 4, // At POI destination
          isAtPOI: true
        });

        const snapshot = transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1',
          waypointContext
        });

        // When at POI, skip current waypoint entirely
        // Next waypoint path: [10,10], [12,12], [15,15] - skip first (duplicate destination)
        expect(snapshot.waypointData.pathHexes).toEqual([
          '12,12', '15,15'
        ]);
        expect(snapshot.waypointData.waypointIndexes).toEqual([1]);
        expect(snapshot.waypointData.isAtPOI).toBe(true);
      });

      it('should capture salvage state when mid-salvage', () => {
        const salvageState = createMockSalvageState();

        const snapshot = transitionManager.prepareForCombat({
          entryReason: 'salvage_encounter',
          aiId: 'AI_SCOUT_1',
          salvageState
        });

        expect(snapshot.salvageState).toBeDefined();
        expect(snapshot.salvageState.currentSlotIndex).toBe(2);
        expect(snapshot.salvageState.slots.length).toBe(5);
        expect(snapshot.salvageState.encounterTriggered).toBe(true);
      });

      it('should collect revealed loot from salvage slots', () => {
        const salvageState = createMockSalvageState();

        const snapshot = transitionManager.prepareForCombat({
          entryReason: 'salvage_encounter',
          aiId: 'AI_SCOUT_1',
          salvageState
        });

        // Should have pre-calculated revealed loot
        expect(snapshot.salvageState.revealedLoot).toBeDefined();
        expect(snapshot.salvageState.revealedLoot.cards.length).toBe(1);
        expect(snapshot.salvageState.revealedLoot.salvageItems.length).toBe(1);
      });
    });

    describe('Validation', () => {
      it('should throw if no active run', () => {
        tacticalMapStateManager.isRunActive.mockReturnValue(false);

        expect(() => {
          transitionManager.prepareForCombat({
            entryReason: 'poi_encounter',
            aiId: 'AI_SCOUT_1'
          });
        }).toThrow('Cannot prepare for combat - no active run');
      });

      it('should throw if transition already in progress', () => {
        // First call succeeds
        transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1'
        });

        // Second call should fail
        expect(() => {
          transitionManager.prepareForCombat({
            entryReason: 'poi_encounter',
            aiId: 'AI_SCOUT_2'
          });
        }).toThrow('Transition already in progress');
      });

      it('should throw if entryReason is missing', () => {
        expect(() => {
          transitionManager.prepareForCombat({ aiId: 'AI_SCOUT_1' });
        }).toThrow('entryReason is required');
      });

      it('should throw if aiId is missing', () => {
        expect(() => {
          transitionManager.prepareForCombat({ entryReason: 'poi_encounter' });
        }).toThrow('aiId is required');
      });

      it('should validate player position exists', () => {
        tacticalMapStateManager.getState.mockReturnValue(
          createMockTacticalMapState({ playerPosition: null })
        );

        expect(() => {
          transitionManager.prepareForCombat({
            entryReason: 'poi_encounter',
            aiId: 'AI_SCOUT_1'
          });
        }).toThrow('Invalid player position');
      });

      it('should validate ship sections have valid hull', () => {
        tacticalMapStateManager.getState.mockReturnValue(
          createMockTacticalMapState({
            shipSections: {
              bridge: { hull: -5 } // Invalid negative hull
            }
          })
        );

        expect(() => {
          transitionManager.prepareForCombat({
            entryReason: 'poi_encounter',
            aiId: 'AI_SCOUT_1'
          });
        }).toThrow('Invalid ship sections');
      });
    });

    describe('Logging', () => {
      it('should log transition start with full context', async () => {
        const { debugLog } = await import('../utils/debugLogger.js');

        transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          sourceLocation: 'TacticalMapScreen:1345',
          aiId: 'AI_SCOUT_1',
          poi: { q: 5, r: 3 }
        });

        expect(debugLog).toHaveBeenCalledWith(
          'TRANSITION_MANAGER',
          expect.stringContaining('TacticalMap -> Combat'),
          expect.any(Object)
        );
      });
    });

    describe('State Persistence', () => {
      it('should store snapshot for later restoration', () => {
        const context = {
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1'
        };

        transitionManager.prepareForCombat(context);

        expect(transitionManager.hasSnapshot()).toBe(true);
        expect(transitionManager.getCurrentSnapshot()).toBeDefined();
      });

      it('should store waypoint data in TacticalMapStateManager', () => {
        const waypointContext = createMockWaypointContext();

        transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1',
          waypointContext
        });

        // Uses pendingWaypointDestinations (not pendingWaypointIndexes) for WaypointManager compatibility
        expect(tacticalMapStateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({
            pendingPath: expect.any(Array),
            pendingWaypointDestinations: expect.any(Array)
          })
        );
      });
    });
  });

  // ============================================================
  // returnFromCombat() Tests
  // ============================================================
  describe('returnFromCombat()', () => {
    // Helper: prepare a snapshot before each return test
    function prepareSnapshot(waypointContext = null, salvageState = null) {
      const context = {
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1',
        waypointContext,
        salvageState
      };
      return transitionManager.prepareForCombat(context);
    }

    describe('Victory Outcomes', () => {
      it('should retrieve stored snapshot', () => {
        prepareSnapshot();

        const result = transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular'
        });

        expect(result).toBeDefined();
        expect(result.snapshotRestored).toBe(true);
      });

      it('should apply hull delta correctly', () => {
        const initialState = createMockTacticalMapState({
          shipSections: {
            bridge: { hull: 10, maxHull: 10 },
            powerCell: { hull: 10, maxHull: 10 },
            droneControlHub: { hull: 10, maxHull: 10 }
          },
          currentHull: 30,
          maxHull: 30
        });
        tacticalMapStateManager.getState.mockReturnValue(initialState);
        prepareSnapshot();

        transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular',
          hullDelta: {
            bridge: -3,
            powerCell: -2,
            droneControlHub: -1
          }
        });

        // Should update TacticalMapStateManager with new hull values
        expect(tacticalMapStateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({
            shipSections: expect.objectContaining({
              bridge: expect.objectContaining({ hull: 7 }),
              powerCell: expect.objectContaining({ hull: 8 }),
              droneControlHub: expect.objectContaining({ hull: 9 })
            }),
            currentHull: 24
          })
        );
      });

      it('should apply loot delta correctly', () => {
        prepareSnapshot();

        transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular',
          lootCollected: {
            cards: [{ cardId: 'card_new_1' }, { cardId: 'card_new_2' }],
            salvageItems: [{ id: 'salvage_new_1', creditValue: 75 }],
            aiCores: 3,
            credits: 75
          }
        });

        expect(tacticalMapStateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({
            creditsEarned: 225, // 150 + 75
            aiCoresEarned: 5    // 2 + 3
          })
        );
      });

      it('should restore waypoints from simplified format', () => {
        const waypointContext = createMockWaypointContext();
        prepareSnapshot(waypointContext);

        const result = transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular',
          shouldRestoreWaypoints: true
        });

        expect(result.waypointsRestored).toBe(true);
        expect(result.restoredWaypoints).toBeDefined();
        expect(result.restoredWaypoints.length).toBeGreaterThan(0);
      });

      it('should reconstruct waypoints with correct pathFromPrev', () => {
        const waypointContext = createMockWaypointContext();
        prepareSnapshot(waypointContext);

        // Mock state after combat (player moved back to last position)
        tacticalMapStateManager.getState.mockReturnValue(
          createMockTacticalMapState({
            playerPosition: { q: 7, r: 5 }, // Where they were when combat started
            pendingPath: ['8,6', '10,10', '12,12', '15,15'],
            pendingWaypointIndexes: [1, 3]
          })
        );

        const result = transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular',
          shouldRestoreWaypoints: true
        });

        // First waypoint should have path from current position to first destination
        expect(result.restoredWaypoints[0].hex).toEqual({ q: 10, r: 10 });
        expect(result.restoredWaypoints[0].pathFromPrev[0]).toEqual({ q: 7, r: 5 }); // Start
        expect(result.restoredWaypoints[0].pathFromPrev).toContainEqual({ q: 8, r: 6 });
        expect(result.restoredWaypoints[0].pathFromPrev).toContainEqual({ q: 10, r: 10 }); // End
      });

      it('should restore salvage state for mid-salvage combat', () => {
        const salvageState = createMockSalvageState();
        prepareSnapshot(null, salvageState);

        const result = transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular',
          shouldRestoreSalvage: true
        });

        expect(result.salvageRestored).toBe(true);
        expect(result.restoredSalvageState).toBeDefined();
        expect(result.restoredSalvageState.currentSlotIndex).toBe(2);
        expect(result.restoredSalvageState.returnedFromCombat).toBe(true);
      });

      it('should handle blockade victory with extraction flag', () => {
        prepareSnapshot();

        transitionManager.returnFromCombat({
          result: 'victory',
          type: 'blockade'
        });

        expect(tacticalMapStateManager.setState).toHaveBeenCalledWith(
          expect.objectContaining({
            pendingBlockadeExtraction: true,
            blockadeCleared: true
          })
        );
      });

      it('should handle blueprint victory', () => {
        prepareSnapshot();

        const result = transitionManager.returnFromCombat({
          result: 'victory',
          type: 'blueprint',
          blueprint: {
            blueprintId: 'DRONE_INTERCEPTOR',
            rarity: 'Uncommon'
          }
        });

        expect(result.hasPendingBlueprint).toBe(true);
      });
    });

    describe('Defeat Outcomes', () => {
      it('should log game over chain for defeat', async () => {
        const { debugLog } = await import('../utils/debugLogger.js');
        prepareSnapshot();

        transitionManager.returnFromCombat({
          result: 'defeat',
          defeatReason: 'hull_destroyed'
        });

        expect(debugLog).toHaveBeenCalledWith(
          'TRANSITION_MANAGER',
          expect.stringContaining('GAME OVER'),
          expect.any(Object)
        );
      });

      it('should not restore waypoints on defeat', () => {
        const waypointContext = createMockWaypointContext();
        prepareSnapshot(waypointContext);

        const result = transitionManager.returnFromCombat({
          result: 'defeat',
          defeatReason: 'hull_destroyed'
        });

        expect(result.waypointsRestored).toBe(false);
      });

      it('should include event chain in game over log', () => {
        prepareSnapshot();

        const result = transitionManager.returnFromCombat({
          result: 'defeat',
          defeatReason: 'hull_destroyed',
          eventChain: [
            { timestamp: Date.now() - 300000, event: 'POI Encounter', location: '(5,3)' },
            { timestamp: Date.now() - 200000, event: 'Salvage started', slots: 5 },
            { timestamp: Date.now() - 100000, event: 'Combat triggered', roll: 12.3 },
            { timestamp: Date.now(), event: 'Hull destroyed', damage: 24 }
          ]
        });

        expect(result.gameOverChain).toBeDefined();
        expect(result.gameOverChain.length).toBe(4);
      });
    });

    describe('Validation', () => {
      it('should throw if no snapshot exists', () => {
        // Don't prepare snapshot
        expect(() => {
          transitionManager.returnFromCombat({
            result: 'victory',
            type: 'regular'
          });
        }).toThrow('No snapshot to restore');
      });

      it('should throw if result is missing', () => {
        prepareSnapshot();

        expect(() => {
          transitionManager.returnFromCombat({ type: 'regular' });
        }).toThrow('result is required');
      });

      it('should validate restored position matches pre-combat', () => {
        prepareSnapshot();

        // Mock state with different position (shouldn't happen but validate anyway)
        tacticalMapStateManager.getState.mockReturnValue(
          createMockTacticalMapState({ playerPosition: { q: 99, r: 99 } })
        );

        const result = transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular'
        });

        // Should log a warning but not throw
        expect(result.validationWarnings).toContain('Position mismatch');
      });
    });

    describe('Logging', () => {
      it('should log transition complete with state diff', async () => {
        const { debugLog } = await import('../utils/debugLogger.js');
        prepareSnapshot();

        transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular',
          hullDelta: { bridge: -5 }
        });

        expect(debugLog).toHaveBeenCalledWith(
          'TRANSITION_MANAGER',
          expect.stringContaining('Combat -> TacticalMap'),
          expect.objectContaining({
            outcome: 'victory',
            type: 'regular'
          })
        );
      });
    });

    describe('Cleanup', () => {
      it('should clear snapshot after successful return', () => {
        prepareSnapshot();

        transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular'
        });

        expect(transitionManager.hasSnapshot()).toBe(false);
      });

      it('should NOT clear pending path in returnFromCombat (WaypointManager handles clearing)', () => {
        const waypointContext = createMockWaypointContext();
        prepareSnapshot(waypointContext);

        // Clear mock call history after prepareSnapshot
        tacticalMapStateManager.setState.mockClear();

        transitionManager.returnFromCombat({
          result: 'victory',
          type: 'regular',
          shouldRestoreWaypoints: true
        });

        // returnFromCombat should NOT clear pendingPath - WaypointManager.restorePathAfterCombat() does that
        // This ensures the path survives until TacticalMapScreen mounts and restores it
        const setStateCalls = tacticalMapStateManager.setState.mock.calls;
        const clearedPath = setStateCalls.some(call =>
          call[0].pendingPath === null && call[0].pendingWaypointDestinations === null
        );
        expect(clearedPath).toBe(false);
      });
    });
  });

  // ============================================================
  // Integration Tests
  // ============================================================
  describe('Integration: Full Combat Cycles', () => {
    it('POI encounter: prepare -> combat -> return with victory', () => {
      // Prepare
      const snapshot = transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        sourceLocation: 'TacticalMapScreen:1100',
        aiId: 'AI_SCOUT_1',
        poi: { q: 5, r: 3, poiData: { packType: 'ORDNANCE_PACK' } }
      });

      expect(snapshot.metadata.entryReason).toBe('poi_encounter');
      expect(transitionManager.hasSnapshot()).toBe(true);

      // Return
      const result = transitionManager.returnFromCombat({
        result: 'victory',
        type: 'regular',
        lootCollected: {
          cards: [{ cardId: 'card_1' }],
          aiCores: 2
        }
      });

      expect(result.snapshotRestored).toBe(true);
      expect(transitionManager.hasSnapshot()).toBe(false);
    });

    it('Salvage encounter: prepare -> combat -> return with salvage resume', () => {
      const salvageState = createMockSalvageState();
      const waypointContext = createMockWaypointContext();

      // Prepare
      const snapshot = transitionManager.prepareForCombat({
        entryReason: 'salvage_encounter',
        aiId: 'AI_SCOUT_1',
        salvageState,
        waypointContext
      });

      expect(snapshot.salvageState).toBeDefined();
      expect(snapshot.salvageState.currentSlotIndex).toBe(2);

      // Update mock state for return
      tacticalMapStateManager.getState.mockReturnValue(
        createMockTacticalMapState({
          pendingPath: ['8,6', '10,10', '12,12', '15,15'],
          pendingWaypointIndexes: [1, 3]
        })
      );

      // Return
      const result = transitionManager.returnFromCombat({
        result: 'victory',
        type: 'regular',
        shouldRestoreSalvage: true,
        shouldRestoreWaypoints: true
      });

      expect(result.salvageRestored).toBe(true);
      expect(result.restoredSalvageState.currentSlotIndex).toBe(2);
      expect(result.restoredSalvageState.returnedFromCombat).toBe(true);
      expect(result.waypointsRestored).toBe(true);
    });

    it('Blockade encounter: prepare -> combat -> return with extraction', () => {
      // Prepare
      transitionManager.prepareForCombat({
        entryReason: 'blockade',
        aiId: 'AI_BLOCKADE_1',
        isBlockade: true
      });

      // Return
      const result = transitionManager.returnFromCombat({
        result: 'victory',
        type: 'blockade'
      });

      expect(result.snapshotRestored).toBe(true);
      expect(tacticalMapStateManager.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingBlockadeExtraction: true,
          blockadeCleared: true
        })
      );
    });

    it('Mid-path encounter: waypoints stored and restored correctly', () => {
      const waypointContext = createMockWaypointContext({
        currentWaypointIndex: 0,
        currentHexIndex: 2,
        isAtPOI: false
      });

      // Prepare
      const snapshot = transitionManager.prepareForCombat({
        entryReason: 'auto_encounter',
        aiId: 'AI_PATROL_1',
        waypointContext
      });

      // Verify flat hex list is correct
      expect(snapshot.waypointData.pathHexes).toEqual([
        '8,6', '10,10', '12,12', '15,15'
      ]);
      expect(snapshot.waypointData.waypointIndexes).toEqual([1, 3]);

      // Mock state for return
      tacticalMapStateManager.getState.mockReturnValue(
        createMockTacticalMapState({
          playerPosition: { q: 7, r: 5 },
          pendingPath: ['8,6', '10,10', '12,12', '15,15'],
          pendingWaypointIndexes: [1, 3]
        })
      );

      // Return
      const result = transitionManager.returnFromCombat({
        result: 'victory',
        type: 'regular',
        shouldRestoreWaypoints: true
      });

      // Verify waypoints reconstructed correctly
      expect(result.restoredWaypoints.length).toBe(2);
      expect(result.restoredWaypoints[0].hex).toEqual({ q: 10, r: 10 });
      expect(result.restoredWaypoints[1].hex).toEqual({ q: 15, r: 15 });
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('Edge Cases', () => {
    it('should handle no waypoints gracefully', () => {
      const snapshot = transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1',
        waypointContext: null
      });

      expect(snapshot.waypointData).toBeNull();
    });

    it('should handle empty waypoints array', () => {
      const snapshot = transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1',
        waypointContext: {
          waypoints: [],
          currentWaypointIndex: 0,
          currentHexIndex: 0,
          isAtPOI: false
        }
      });

      expect(snapshot.waypointData).toBeNull();
    });

    it('should handle last waypoint with no remaining path', () => {
      const waypointContext = {
        waypoints: [
          {
            hex: { q: 10, r: 10 },
            pathFromPrev: [{ q: 5, r: 3 }, { q: 10, r: 10 }]
          }
        ],
        currentWaypointIndex: 0,
        currentHexIndex: 1, // At destination
        isAtPOI: true
      };

      const snapshot = transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1',
        waypointContext
      });

      // No remaining path
      expect(snapshot.waypointData).toBeNull();
    });

    it('should handle consecutive combat transitions', () => {
      // First combat
      transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1'
      });
      transitionManager.returnFromCombat({
        result: 'victory',
        type: 'regular'
      });

      // Second combat (immediately after)
      const snapshot = transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_2'
      });

      expect(snapshot).toBeDefined();
      expect(snapshot.metadata.combatContext.aiId).toBe('AI_SCOUT_2');
    });
  });

  // ============================================================
  // Utility Methods
  // ============================================================
  describe('Utility Methods', () => {
    it('hasSnapshot() should return correct state', () => {
      expect(transitionManager.hasSnapshot()).toBe(false);

      transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1'
      });

      expect(transitionManager.hasSnapshot()).toBe(true);

      transitionManager.returnFromCombat({
        result: 'victory',
        type: 'regular'
      });

      expect(transitionManager.hasSnapshot()).toBe(false);
    });

    it('getCurrentSnapshot() should return snapshot or null', () => {
      expect(transitionManager.getCurrentSnapshot()).toBeNull();

      transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1'
      });

      const snapshot = transitionManager.getCurrentSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.metadata.entryReason).toBe('poi_encounter');
    });

    it('getTransitionHistory() should track all transitions', () => {
      // First transition
      transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1'
      });
      transitionManager.returnFromCombat({
        result: 'victory',
        type: 'regular'
      });

      // Second transition
      transitionManager.prepareForCombat({
        entryReason: 'salvage_encounter',
        aiId: 'AI_SCOUT_2'
      });
      transitionManager.returnFromCombat({
        result: 'victory',
        type: 'regular'
      });

      const history = transitionManager.getTransitionHistory();
      expect(history.length).toBe(2);
      expect(history[0].entryReason).toBe('poi_encounter');
      expect(history[1].entryReason).toBe('salvage_encounter');
    });

    it('_reset() should clear all state', () => {
      transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1'
      });

      transitionManager._reset();

      expect(transitionManager.hasSnapshot()).toBe(false);
      expect(transitionManager.getTransitionHistory()).toEqual([]);
    });
  });

  // ==========================================================
  // BUG FIX TESTS - TDD to prove issues exist then verify fixes
  // ==========================================================

  describe('Bug Fix: Waypoints should persist after returnFromCombat', () => {
    beforeEach(() => {
      // Track setState calls to verify pendingPath is NOT cleared
      const currentState = createMockTacticalMapState();
      tacticalMapStateManager.getState.mockReturnValue(currentState);
      tacticalMapStateManager.isRunActive.mockReturnValue(true);

      // Mock setState to actually update the mock state
      tacticalMapStateManager.setState.mockImplementation((updates) => {
        Object.assign(currentState, updates);
      });
    });

    it('should NOT clear pendingPath in returnFromCombat - let WaypointManager clear it', () => {
      // Setup: store waypoints via prepareForCombat
      const waypoints = [
        {
          hex: { q: 5, r: 5 },
          pathFromPrev: [{ q: 0, r: 0 }, { q: 5, r: 5 }],
          segmentCost: 10,
          cumulativeDetection: 15,
          segmentEncounterRisk: 5,
          cumulativeEncounterRisk: 5
        },
        {
          hex: { q: 10, r: 10 },
          pathFromPrev: [{ q: 5, r: 5 }, { q: 10, r: 10 }],
          segmentCost: 12,
          cumulativeDetection: 25,
          segmentEncounterRisk: 6,
          cumulativeEncounterRisk: 11
        }
      ];

      transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'test-ai',
        waypointContext: { waypoints, currentWaypointIndex: 0, currentHexIndex: 0, isAtPOI: false }
      });

      // Verify pendingPath was stored
      const stateAfterPrepare = tacticalMapStateManager.getState();
      expect(stateAfterPrepare.pendingPath).not.toBeNull();
      expect(stateAfterPrepare.pendingPath.length).toBeGreaterThan(0);

      // Call returnFromCombat
      transitionManager.returnFromCombat({
        result: 'victory',
        type: 'regular',
        shouldRestoreWaypoints: true
      });

      // CRITICAL: pendingPath should STILL exist after returnFromCombat
      // WaypointManager.restorePathAfterCombat() is responsible for clearing it
      const stateAfterReturn = tacticalMapStateManager.getState();
      expect(stateAfterReturn.pendingPath).not.toBeNull();
      expect(stateAfterReturn.pendingPath.length).toBeGreaterThan(0);
    });
  });

  describe('Bug Fix: Salvage state should be persisted to TacticalMapStateManager', () => {
    beforeEach(() => {
      const currentState = createMockTacticalMapState();
      tacticalMapStateManager.getState.mockReturnValue(currentState);
      tacticalMapStateManager.isRunActive.mockReturnValue(true);

      tacticalMapStateManager.setState.mockImplementation((updates) => {
        Object.assign(currentState, updates);
      });
    });

    it('should persist salvage state to pendingSalvageState in prepareForCombat', () => {
      const salvageState = {
        poi: { q: 5, r: 5 },
        totalSlots: 5,
        slots: [
          { revealed: true, type: 'card', content: { cardId: 'CARD001' } },
          { revealed: false, type: null, content: null },
          { revealed: false, type: null, content: null }
        ],
        currentSlotIndex: 1,
        currentEncounterChance: 15
      };

      transitionManager.prepareForCombat({
        entryReason: 'salvage_encounter',
        aiId: 'test-ai',
        salvageState: salvageState
      });

      // CRITICAL: pendingSalvageState should be persisted to TacticalMapStateManager
      const state = tacticalMapStateManager.getState();
      expect(state.pendingSalvageState).not.toBeNull();
      expect(state.pendingSalvageState.slots).toBeDefined();
      expect(state.pendingSalvageState.slots[0].revealed).toBe(true);
    });
  });

  describe('Bug Fix: Should use pendingWaypointDestinations not pendingWaypointIndexes', () => {
    beforeEach(() => {
      const currentState = createMockTacticalMapState();
      tacticalMapStateManager.getState.mockReturnValue(currentState);
      tacticalMapStateManager.isRunActive.mockReturnValue(true);

      tacticalMapStateManager.setState.mockImplementation((updates) => {
        Object.assign(currentState, updates);
      });
    });

    it('should store pendingWaypointDestinations for WaypointManager compatibility', () => {
      const waypoints = [
        {
          hex: { q: 5, r: 5 },
          pathFromPrev: [{ q: 0, r: 0 }, { q: 5, r: 5 }],
          segmentCost: 10,
          cumulativeDetection: 15,
          segmentEncounterRisk: 5,
          cumulativeEncounterRisk: 5
        },
        {
          hex: { q: 10, r: 10 },
          pathFromPrev: [{ q: 5, r: 5 }, { q: 10, r: 10 }],
          segmentCost: 12,
          cumulativeDetection: 25,
          segmentEncounterRisk: 6,
          cumulativeEncounterRisk: 11
        }
      ];

      transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'test-ai',
        waypointContext: { waypoints, currentWaypointIndex: 0, currentHexIndex: 0, isAtPOI: false }
      });

      // CRITICAL: Should use pendingWaypointDestinations (not pendingWaypointIndexes)
      const state = tacticalMapStateManager.getState();
      expect(state.pendingWaypointDestinations).toBeDefined();
      expect(state.pendingWaypointDestinations).not.toBeNull();
      expect(state.pendingWaypointDestinations.length).toBeGreaterThan(0);
      expect(state.pendingWaypointDestinations[0].hex).toBeDefined();
      expect(state.pendingWaypointDestinations[0].segmentCost).toBeDefined();
    });
  });

  // ==========================================================
  // Bug Fix: transitionInProgress flag stuck after failures
  // ==========================================================
  describe('Bug Fix: transitionInProgress flag stuck after failures', () => {
    beforeEach(() => {
      const currentState = createMockTacticalMapState();
      tacticalMapStateManager.getState.mockReturnValue(currentState);
      tacticalMapStateManager.isRunActive.mockReturnValue(true);

      tacticalMapStateManager.setState.mockImplementation((updates) => {
        Object.assign(currentState, updates);
      });
    });

    it('should reset transitionInProgress if prepareForCombat throws after setting flag', () => {
      // Arrange: Mock _captureWaypointState to throw AFTER flag is set
      const originalCapture = transitionManager._captureWaypointState.bind(transitionManager);
      transitionManager._captureWaypointState = () => {
        throw new Error('Simulated waypoint capture failure');
      };

      // Act: Call prepareForCombat with waypoint context (triggers the throwing method)
      try {
        transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1',
          waypointContext: createMockWaypointContext()
        });
      } catch (e) {
        // Expected to throw
      }

      // Assert: transitionInProgress should be FALSE, not stuck at true
      expect(transitionManager.transitionInProgress).toBe(false);

      // Cleanup
      transitionManager._captureWaypointState = originalCapture;
    });

    it('should allow new transition after prepareForCombat failure', () => {
      // Arrange: Force prepareForCombat to fail by breaking state
      tacticalMapStateManager.getState.mockReturnValue(
        createMockTacticalMapState({ playerPosition: null })
      );

      // First call fails (validation error before flag is set - this is OK)
      expect(() => {
        transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_1'
        });
      }).toThrow('Invalid player position');

      // Restore valid state
      tacticalMapStateManager.getState.mockReturnValue(createMockTacticalMapState());

      // Second call should succeed (not throw "Transition already in progress")
      expect(() => {
        transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_2'
        });
      }).not.toThrow();
    });

    it('should expose forceReset() method for error recovery', () => {
      // Start a transition
      transitionManager.prepareForCombat({
        entryReason: 'poi_encounter',
        aiId: 'AI_SCOUT_1'
      });

      expect(transitionManager.transitionInProgress).toBe(true);

      // Force reset (simulates what TacticalMapScreen error handler would call)
      transitionManager.forceReset();

      // Should be able to start new transition
      expect(transitionManager.transitionInProgress).toBe(false);
      expect(() => {
        transitionManager.prepareForCombat({
          entryReason: 'poi_encounter',
          aiId: 'AI_SCOUT_2'
        });
      }).not.toThrow();
    });

    it('should reset transitionInProgress if _captureSalvageState throws', () => {
      // Arrange: Mock _captureSalvageState to throw AFTER flag is set
      const originalCapture = transitionManager._captureSalvageState.bind(transitionManager);
      transitionManager._captureSalvageState = () => {
        throw new Error('Simulated salvage capture failure');
      };

      // Act: Call prepareForCombat with salvage state (triggers the throwing method)
      try {
        transitionManager.prepareForCombat({
          entryReason: 'salvage_encounter',
          aiId: 'AI_SCOUT_1',
          salvageState: createMockSalvageState()
        });
      } catch (e) {
        // Expected to throw
      }

      // Assert: transitionInProgress should be FALSE, not stuck at true
      expect(transitionManager.transitionInProgress).toBe(false);

      // Cleanup
      transitionManager._captureSalvageState = originalCapture;
    });
  });
});
