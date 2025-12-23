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

/**
 * TDD Tests: placedSections derived from runState lane assignments
 * BUG FIX: Ship sections appear in wrong lanes because placedSections
 * uses hardcoded fallback ['bridge', 'powerCell', 'droneControlHub']
 * instead of deriving order from runState.shipSections[key].lane
 */
describe('SinglePlayerCombatInitializer - placedSections lane assignments', () => {
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

    // Mock getAIPersonality to return a valid AI
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

  it('should order player1PlacedSections based on runState.shipSections lane assignments', async () => {
    // EXPLANATION: The starter deck may have different lane assignments than default.
    // powerCell in left lane (l), bridge in middle (m), droneControlHub in right (r)
    // So placedSections should be ['powerCell', 'bridge', 'droneControlHub']
    // NOT the hardcoded default ['bridge', 'powerCell', 'droneControlHub']

    const mockRunState = {
      shipSlotId: 0,
      currentHull: 30,
      shipSections: {
        powerCell: { id: 'POWERCELL_001', name: 'Power Cell', type: 'Power Cell', lane: 'l', hull: 10, maxHull: 10 },
        bridge: { id: 'BRIDGE_001', name: 'Bridge', type: 'Bridge', lane: 'm', hull: 10, maxHull: 10 },
        droneControlHub: { id: 'DRONECONTROL_001', name: 'Drone Control Hub', type: 'Drone Control Hub', lane: 'r', hull: 10, maxHull: 10 }
      }
    };

    // ACT: Call initiateCombat with runState that has custom lane assignments
    await SinglePlayerCombatInitializer.initiateCombat(
      'Rogue Scout Pattern',
      mockRunState,
      null,
      false
    );

    // ASSERT: placedSections should reflect lane order, NOT hardcoded default
    const combatStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].placedSections
    );

    expect(combatStateCall).toBeDefined();
    // Expected: ['powerCell', 'bridge', 'droneControlHub'] based on lane order (l=0, m=1, r=2)
    // NOT the hardcoded default ['bridge', 'powerCell', 'droneControlHub']
    expect(combatStateCall[0].placedSections).toEqual(['powerCell', 'bridge', 'droneControlHub']);
  });

  it('should use default order when runState has no shipSections', async () => {
    // EXPLANATION: When there's no lane info, fall back to default order

    const mockRunState = {
      shipSlotId: 0,
      currentHull: 30
      // No shipSections
    };

    await SinglePlayerCombatInitializer.initiateCombat(
      'Rogue Scout Pattern',
      mockRunState,
      null,
      false
    );

    const combatStateCall = setStateSpy.mock.calls.find(
      call => call[0] && call[0].placedSections
    );

    expect(combatStateCall).toBeDefined();
    // Default fallback order
    expect(combatStateCall[0].placedSections).toEqual(['bridge', 'powerCell', 'droneControlHub']);
  });
});

/**
 * TDD Tests: Residual state cleanup
 * BUG FIX: Force Win during deployment leaves game state corrupted.
 * Next game gets stuck on ROUNDINITIALIZATION because residual state persists.
 */
describe('SinglePlayerCombatInitializer - residual state cleanup', () => {
  let resetGameStateSpy;
  let setStateSpy;
  let getSpy;
  let originalGetState;
  let originalGet;

  beforeEach(() => {
    // Spy on resetGameState and setState
    resetGameStateSpy = vi.spyOn(gameStateManager, 'resetGameState').mockImplementation(() => {});
    setStateSpy = vi.spyOn(gameStateManager, 'setState').mockImplementation(() => {});
    originalGetState = gameStateManager.getState;
    originalGet = gameStateManager.get;

    // Mock getAIPersonality to return a valid AI
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
    gameStateManager.get = originalGet;
  });

  it('should call resetGameState when residual gameActive state is detected', async () => {
    // EXPLANATION: Force Win can leave gameActive=true and player states populated.
    // This test verifies that initiateCombat() cleans up residual state before
    // starting a new combat to prevent the game from getting stuck.

    const residualState = {
      appState: 'inGame',
      gameActive: true,  // Residual from Force Win
      turnPhase: 'deployment',  // Residual from Force Win
      gameStage: 'combat',
      roundNumber: 3,
      player1: { name: 'old player' },  // Residual
      player2: { name: 'old AI' },  // Residual
      singlePlayerShipSlots: [
        { id: 0, shipId: 'SHIP_001', decklist: [], activeDronePool: [] }
      ]
    };

    // Mock get() to return residual state values
    gameStateManager.get = vi.fn((key) => residualState[key]);

    // Mock getState() for parts that use it
    gameStateManager.getState = vi.fn(() => residualState);

    const mockRunState = { shipSlotId: 0, currentHull: 30 };

    // ACT: Start new combat
    await SinglePlayerCombatInitializer.initiateCombat(
      'Rogue Scout Pattern',
      mockRunState,
      null,
      false
    );

    // ASSERT: resetGameState should have been called to clean up residual state
    expect(resetGameStateSpy).toHaveBeenCalled();
  });

  it('should NOT call resetGameState when no residual state exists', async () => {
    // EXPLANATION: When starting combat fresh (no residual state),
    // resetGameState should NOT be called unnecessarily.

    const cleanState = {
      appState: 'tacticalMap',
      gameActive: false,  // No residual
      turnPhase: null,  // No residual
      gameStage: 'preGame',
      roundNumber: 0,
      player1: null,  // Clean
      player2: null,  // Clean
      singlePlayerShipSlots: [
        { id: 0, shipId: 'SHIP_001', decklist: [], activeDronePool: [] }
      ]
    };

    // Mock get() to return clean state values
    gameStateManager.get = vi.fn((key) => cleanState[key]);

    // Mock getState() for parts that use it
    gameStateManager.getState = vi.fn(() => cleanState);

    const mockRunState = { shipSlotId: 0, currentHull: 30 };

    // ACT: Start new combat
    await SinglePlayerCombatInitializer.initiateCombat(
      'Rogue Scout Pattern',
      mockRunState,
      null,
      false
    );

    // ASSERT: resetGameState should NOT be called when state is clean
    expect(resetGameStateSpy).not.toHaveBeenCalled();
  });
});
