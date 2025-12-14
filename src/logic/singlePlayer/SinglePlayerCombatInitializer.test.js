/**
 * SinglePlayerCombatInitializer Tests - shipId inclusion
 * TDD: Tests written first to verify shipId is included in player state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SinglePlayerCombatInitializer from './SinglePlayerCombatInitializer.js';
import gameStateManager from '../../managers/GameStateManager.js';

describe('SinglePlayerCombatInitializer - shipId inclusion', () => {
  describe('buildPlayerState', () => {
    it('should include shipId in returned player state', () => {
      const mockShipSlot = { shipId: 'SHIP_001', decklist: [], activeDronePool: [] };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.shipId).toBeDefined();
      expect(playerState.shipId).toBe('SHIP_001');
    });

    it('should use default ship ID when shipSlot.shipId is null', () => {
      const mockShipSlot = { shipId: null, decklist: [], activeDronePool: [] };
      const mockRunState = {};

      const playerState = SinglePlayerCombatInitializer.buildPlayerState(mockShipSlot, mockRunState);

      expect(playerState.shipId).toBeDefined();
      expect(playerState.shipId).toBe('SHIP_001'); // Default ship
    });
  });

  describe('buildAIState', () => {
    it('should include shipId in returned AI state', () => {
      const mockAIPersonality = {
        id: 'AI_001',
        name: 'Test AI',
        shipId: 'SHIP_002',
        decklist: [],
        dronePool: []
      };

      const aiState = SinglePlayerCombatInitializer.buildAIState(mockAIPersonality);

      expect(aiState.shipId).toBeDefined();
      expect(aiState.shipId).toBe('SHIP_002');
    });

    it('should use default ship ID when AI has no shipId', () => {
      const mockAIPersonality = {
        id: 'AI_001',
        name: 'Test AI',
        shipId: null,
        decklist: [],
        dronePool: []
      };

      const aiState = SinglePlayerCombatInitializer.buildAIState(mockAIPersonality);

      expect(aiState.shipId).toBeDefined();
      expect(aiState.shipId).toBe('SHIP_001'); // Default ship
    });
  });
});

/**
 * TDD Tests: isBlockade flag propagation
 * BUG FIX: When player wins blockade combat during extraction, they should
 * auto-extract to hangar instead of returning to tactical map.
 *
 * Root cause: isBlockade flag is stored in React state but never passed
 * to initiateCombat(), so it's missing from singlePlayerEncounter.
 */
describe('SinglePlayerCombatInitializer - isBlockade flag', () => {
  let setStateSpy;
  let originalGetState;

  beforeEach(() => {
    // Save original and spy on setState
    setStateSpy = vi.spyOn(gameStateManager, 'setState').mockImplementation(() => {});
    originalGetState = gameStateManager.getState;

    // Mock getState to return minimal valid state
    gameStateManager.getState = vi.fn(() => ({
      singlePlayerShipSlots: [
        { id: 0, shipId: 'SHIP_001', decklist: [], activeDronePool: [] }
      ]
    }));

    // Mock getAIPersonality to return a valid AI - this is critical!
    // Without this mock, initiateCombat() returns early and never calls setState
    vi.spyOn(SinglePlayerCombatInitializer, 'getAIPersonality').mockReturnValue({
      name: 'Test AI',
      difficulty: 1,
      shipId: 'SHIP_001',
      decklist: [],
      dronePool: [],
      modes: ['extraction'],
      shipDeployment: { placement: ['bridge', 'powerCell', 'droneControlHub'] }
    });

    // Mock gameFlowManager to avoid phase transition calls
    gameStateManager.gameFlowManager = {
      processRoundInitialization: vi.fn().mockResolvedValue('deployment'),
      transitionToPhase: vi.fn().mockResolvedValue(undefined)
    };

    // Mock actionProcessor
    gameStateManager.actionProcessor = {
      phaseAnimationQueue: {
        queueAnimation: vi.fn()
      },
      setAIPhaseProcessor: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    gameStateManager.getState = originalGetState;
  });

  it('should store isBlockade: true in singlePlayerEncounter when passed', async () => {
    // This test verifies the fix for the bug where winning a blockade combat
    // returns player to tactical map instead of auto-extracting.

    const mockRunState = { shipSlotId: 0, currentHull: 30 };

    // ACT: Call initiateCombat with isBlockade = true
    await SinglePlayerCombatInitializer.initiateCombat(
      'Rogue Scout Pattern',  // aiId
      mockRunState,           // currentRunState
      null,                   // quickDeployId
      true                    // isBlockade - THE KEY PARAMETER
    );

    // ASSERT: singlePlayerEncounter should include isBlockade: true
    const combatStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].singlePlayerEncounter
    );

    expect(combatStateCall).toBeDefined();
    expect(combatStateCall[0].singlePlayerEncounter.isBlockade).toBe(true);
  });

  it('should store isBlockade: false in singlePlayerEncounter when not passed', async () => {
    const mockRunState = { shipSlotId: 0, currentHull: 30 };

    // ACT: Call without isBlockade parameter (should default to false)
    await SinglePlayerCombatInitializer.initiateCombat(
      'Rogue Scout Pattern',
      mockRunState,
      null
      // isBlockade not passed - should default to false
    );

    // ASSERT: singlePlayerEncounter.isBlockade should be false
    const combatStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].singlePlayerEncounter
    );

    expect(combatStateCall).toBeDefined();
    expect(combatStateCall[0].singlePlayerEncounter.isBlockade).toBe(false);
  });

  /**
   * TDD Tests: isBlockadeCombat flag in currentRunState
   * BUG FIX: singlePlayerEncounter can be cleared before WinnerModal reads it.
   * By also storing the flag in currentRunState, CombatOutcomeProcessor can use
   * it as a fallback, ensuring blockade victories are properly detected.
   */
  it('should set currentRunState.isBlockadeCombat=true when isBlockade=true', async () => {
    // EXPLANATION: Storing isBlockadeCombat in currentRunState provides a
    // fallback if singlePlayerEncounter is cleared before victory processing.

    const mockRunState = { shipSlotId: 0, currentHull: 30 };

    // ACT: Call initiateCombat with isBlockade = true
    await SinglePlayerCombatInitializer.initiateCombat(
      'Rogue Scout Pattern',
      mockRunState,
      null,
      true  // isBlockade
    );

    // ASSERT: currentRunState should include isBlockadeCombat: true
    const runStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].currentRunState?.isBlockadeCombat !== undefined
    );

    expect(runStateCall).toBeDefined();
    expect(runStateCall[0].currentRunState.isBlockadeCombat).toBe(true);
  });

  it('should NOT set currentRunState.isBlockadeCombat when isBlockade=false', async () => {
    // EXPLANATION: Regular (non-blockade) combat should NOT have isBlockadeCombat flag.

    const mockRunState = { shipSlotId: 0, currentHull: 30 };

    // ACT: Call initiateCombat with isBlockade = false (default)
    await SinglePlayerCombatInitializer.initiateCombat(
      'Rogue Scout Pattern',
      mockRunState,
      null,
      false  // isBlockade = false explicitly
    );

    // ASSERT: currentRunState should NOT have isBlockadeCombat: true
    const runStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].currentRunState
    );

    // If it exists, it should be false or undefined, not true
    if (runStateCall && runStateCall[0].currentRunState.isBlockadeCombat !== undefined) {
      expect(runStateCall[0].currentRunState.isBlockadeCombat).toBe(false);
    }
    // If isBlockadeCombat is not set at all, that's also acceptable
  });
});
