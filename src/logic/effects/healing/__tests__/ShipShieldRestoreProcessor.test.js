// ========================================
// SHIP SHIELD RESTORE PROCESSOR TESTS
// ========================================
// TDD: Tests for RESTORE_SECTION_SHIELDS effect
// Bug fix: Handle object-format placedSections from ActionProcessor

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock debugLogger to prevent console output during tests
vi.mock('../../../../utils/debugLogger.js', () => ({
  debugLog: vi.fn()
}));

// Import the processor
import ShipShieldRestoreProcessor from '../ShipShieldRestoreProcessor.js';

describe('ShipShieldRestoreProcessor', () => {
  let processor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ShipShieldRestoreProcessor();
  });

  // Helper to create standard mock player states
  const createMockPlayerStates = () => ({
    player1: {
      energy: 10,
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {
        bridge: { hull: 10, shields: 4, allocatedShields: 1, middleLaneBonus: { 'Shields Per Turn': 1 } },
        powerCell: { hull: 8, shields: 3, allocatedShields: 2 },
        droneControlHub: { hull: 6, shields: 2, allocatedShields: 0 }
      }
    },
    player2: {
      energy: 10,
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {
        bridge: { hull: 10, shields: 4, allocatedShields: 0, middleLaneBonus: { 'Shields Per Turn': 1 } },
        powerCell: { hull: 8, shields: 3, allocatedShields: 1 },
        droneControlHub: { hull: 6, shields: 2, allocatedShields: 0 }
      }
    }
  });

  // ========================================
  // BUG SCENARIO: Object-format placedSections from ActionProcessor
  // ========================================
  describe('BUG FIX: object-format placedSections from ActionProcessor', () => {
    it('should restore shields when placedSections is passed as object { player1, player2 }', () => {
      // This is how ActionProcessor passes placedSections
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        // Object format from ActionProcessor.processCardPlay lines 1035-1038
        placedSections: {
          player1: ['powerCell', 'bridge', 'droneControlHub'],  // bridge is in middle lane (index 1)
          player2: ['droneControlHub', 'bridge', 'powerCell']
        },
        target: {
          name: 'bridge',
          id: 'bridge',
          owner: 'player1'
        },
        card: { id: 'CARD037', name: 'Shield Boost', instanceId: 'inst_001' }
      };

      const effect = { type: 'RESTORE_SECTION_SHIELDS', value: 2 };

      // This should NOT throw and should restore shields
      const result = processor.process(effect, mockContext);

      // Shield Boost restores up to 2 shields
      // bridge has max 4 shields + 1 middle lane bonus = 5 max
      // bridge has 1 allocated, so can restore min(2, 4) = 2
      expect(result.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(3);
    });

    it('should restore shields for player2 when placedSections is object format', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player2',
        playerStates: mockPlayerStates,
        // Object format from ActionProcessor
        placedSections: {
          player1: ['powerCell', 'bridge', 'droneControlHub'],
          player2: ['droneControlHub', 'bridge', 'powerCell']  // bridge is in middle lane (index 1)
        },
        target: {
          name: 'bridge',
          id: 'bridge',
          owner: 'player2'
        },
        card: { id: 'CARD037', name: 'Shield Boost', instanceId: 'inst_002' }
      };

      const effect = { type: 'RESTORE_SECTION_SHIELDS', value: 2 };

      const result = processor.process(effect, mockContext);

      // player2's bridge has max 4 shields + 1 middle lane bonus = 5 max
      // player2's bridge has 0 allocated, so can restore min(2, 5) = 2
      expect(result.newPlayerStates.player2.shipSections.bridge.allocatedShields).toBe(2);
    });

    it('should calculate middle lane bonus correctly with object-format placedSections', () => {
      const mockPlayerStates = createMockPlayerStates();
      // Set bridge to have 4 shields already (need middle lane bonus to restore more)
      mockPlayerStates.player1.shipSections.bridge.allocatedShields = 4;

      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        placedSections: {
          player1: ['powerCell', 'bridge', 'droneControlHub'],  // bridge at index 1 (middle)
          player2: ['droneControlHub', 'bridge', 'powerCell']
        },
        target: {
          name: 'bridge',
          id: 'bridge',
          owner: 'player1'
        },
        card: { id: 'CARD037', name: 'Shield Boost', instanceId: 'inst_003' }
      };

      const effect = { type: 'RESTORE_SECTION_SHIELDS', value: 2 };

      const result = processor.process(effect, mockContext);

      // bridge has base 4 shields + 1 middle lane bonus = 5 max
      // Already has 4, so can restore min(2, 1) = 1
      expect(result.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(5);
    });
  });

  // ========================================
  // LEGACY FORMAT: Array-format placedSections (should still work)
  // ========================================
  describe('legacy array-format placedSections', () => {
    it('should restore shields with array-format placedSections', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        // Legacy array format
        placedSections: ['powerCell', 'bridge', 'droneControlHub'],
        opponentPlacedSections: ['droneControlHub', 'bridge', 'powerCell'],
        target: {
          name: 'bridge',
          id: 'bridge',
          owner: 'player1'
        },
        card: { id: 'CARD037', name: 'Shield Boost', instanceId: 'inst_004' }
      };

      const effect = { type: 'RESTORE_SECTION_SHIELDS', value: 2 };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player1.shipSections.bridge.allocatedShields).toBe(3);
    });

    it('should use opponentPlacedSections for player2 with legacy format', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player2',
        playerStates: mockPlayerStates,
        // Legacy array format - placedSections is player1's, opponentPlacedSections is player2's
        placedSections: ['powerCell', 'bridge', 'droneControlHub'],
        opponentPlacedSections: ['droneControlHub', 'bridge', 'powerCell'],
        target: {
          name: 'bridge',
          id: 'bridge',
          owner: 'player2'
        },
        card: { id: 'CARD037', name: 'Shield Boost', instanceId: 'inst_005' }
      };

      const effect = { type: 'RESTORE_SECTION_SHIELDS', value: 2 };

      const result = processor.process(effect, mockContext);

      expect(result.newPlayerStates.player2.shipSections.bridge.allocatedShields).toBe(2);
    });
  });

  // ========================================
  // STANDARD BEHAVIOR TESTS
  // ========================================
  describe('standard restore behavior', () => {
    it('should not exceed max shields', () => {
      const mockPlayerStates = createMockPlayerStates();
      // Set bridge to already have max shields (4)
      mockPlayerStates.player1.shipSections.powerCell.allocatedShields = 3; // max for powerCell

      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        placedSections: {
          player1: ['powerCell', 'bridge', 'droneControlHub'],
          player2: ['droneControlHub', 'bridge', 'powerCell']
        },
        target: {
          name: 'powerCell',
          id: 'powerCell',
          owner: 'player1'
        },
        card: { id: 'CARD037', name: 'Shield Boost', instanceId: 'inst_006' }
      };

      const effect = { type: 'RESTORE_SECTION_SHIELDS', value: 2 };

      const result = processor.process(effect, mockContext);

      // powerCell has max 3 shields, already at 3, so no change
      expect(result.newPlayerStates.player1.shipSections.powerCell.allocatedShields).toBe(3);
    });

    it('should return animation events on successful restore', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        placedSections: {
          player1: ['powerCell', 'bridge', 'droneControlHub'],
          player2: ['droneControlHub', 'bridge', 'powerCell']
        },
        target: {
          name: 'bridge',
          id: 'bridge',
          owner: 'player1'
        },
        card: { id: 'CARD037', name: 'Shield Boost', instanceId: 'inst_007' }
      };

      const effect = { type: 'RESTORE_SECTION_SHIELDS', value: 2 };

      const result = processor.process(effect, mockContext);

      expect(result.animationEvents).toBeDefined();
      expect(result.animationEvents.length).toBeGreaterThan(0);
    });

    it('should handle missing section gracefully', () => {
      const mockPlayerStates = createMockPlayerStates();
      const mockContext = {
        actingPlayerId: 'player1',
        playerStates: mockPlayerStates,
        placedSections: {
          player1: ['powerCell', 'bridge', 'droneControlHub'],
          player2: ['droneControlHub', 'bridge', 'powerCell']
        },
        target: {
          name: 'nonexistent',
          id: 'nonexistent',
          owner: 'player1'
        },
        card: { id: 'CARD037', name: 'Shield Boost', instanceId: 'inst_008' }
      };

      const effect = { type: 'RESTORE_SECTION_SHIELDS', value: 2 };

      // Should not throw
      const result = processor.process(effect, mockContext);

      // Should return unchanged state
      expect(result.newPlayerStates).toBeDefined();
    });
  });
});
