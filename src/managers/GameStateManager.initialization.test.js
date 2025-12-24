/**
 * GameStateManager Initialization/Cleanup Tests
 * TDD: Tests written first to verify game state integrity at start/end
 *
 * These tests ensure:
 * - Game state is properly reset when games end
 * - Game state is validated before new games start
 * - Dirty state is detected and cleaned up
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gameStateManager from './GameStateManager.js';

describe('GameStateManager - Game State Initialization/Cleanup', () => {
  // Store original console.error to restore after tests
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Reset to clean state before each test
    // Manually set to a known clean state
    gameStateManager.setState({
      appState: 'menu',
      gameActive: false,
      testMode: false,
      gameMode: 'local',
      gameSeed: null,
      turnPhase: null,
      turn: null,
      currentPlayer: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      firstPlayerOverride: null,
      passInfo: null,
      winner: null,
      player1: null,
      player2: null,
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      shieldsToAllocate: 0,
      droneSelectionPool: [],
      droneSelectionTrio: [],
      gameLog: [],
      gameStage: 'preGame',
      roundNumber: 0,
      commitments: {},
      // New fields for expanded validation
      currentRunState: null,
      singlePlayerEncounter: null,
    });

    // Also ensure actionsTakenThisTurn is reset
    gameStateManager.setState({ actionsTakenThisTurn: 0 });

    // Mock console.error to capture calls
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('validatePreGameState()', () => {
    it('should return valid: true when state is clean', () => {
      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect dirty gameStage', () => {
      gameStateManager.setState({ gameStage: 'roundLoop' });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain("gameStage is 'roundLoop' (expected 'preGame')");
    });

    it('should detect non-zero roundNumber', () => {
      gameStateManager.setState({ roundNumber: 3 });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('roundNumber is 3 (expected 0)');
    });

    it('should detect gameActive: true', () => {
      gameStateManager.setState({ gameActive: true });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('gameActive is true (expected false)');
    });

    it('should detect non-null player1', () => {
      gameStateManager.setState({ player1: { name: 'Test' } });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('player1 is not null');
    });

    it('should detect non-null player2', () => {
      gameStateManager.setState({ player2: { name: 'Test' } });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('player2 is not null');
    });

    it('should detect non-null turnPhase', () => {
      gameStateManager.setState({ turnPhase: 'deployment' });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain("turnPhase is 'deployment' (expected null)");
    });

    it('should detect multiple issues at once', () => {
      gameStateManager.setState({
        gameStage: 'roundLoop',
        roundNumber: 5,
        gameActive: true,
        player1: { name: 'Player 1' },
      });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(4);
    });

    it('should detect orphaned singlePlayerEncounter (run state is in TacticalMapStateManager)', () => {
      // NOTE: currentRunState has been migrated to TacticalMapStateManager
      // This test now checks for orphaned singlePlayerEncounter
      gameStateManager.setState({
        singlePlayerEncounter: { type: 'combat' }
      });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('singlePlayerEncounter is not null');
    });

    it('should detect orphaned singlePlayerEncounter', () => {
      gameStateManager.setState({
        singlePlayerEncounter: { type: 'combat', enemyId: 'test' }
      });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('singlePlayerEncounter is not null');
    });

    it('should detect winner not cleared', () => {
      gameStateManager.setState({ winner: 'player1' });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain("winner is 'player1' (expected null)");
    });

    it('should detect non-empty commitments', () => {
      gameStateManager.setState({
        commitments: { deployment: { player1: { completed: true } } }
      });

      const result = gameStateManager.validatePreGameState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('commitments object is not empty');
    });
  });

  describe('resetGameState()', () => {
    it('should reset gameStage to preGame', () => {
      gameStateManager.setState({ gameStage: 'roundLoop' });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('gameStage')).toBe('preGame');
    });

    it('should reset roundNumber to 0', () => {
      gameStateManager.setState({ roundNumber: 5 });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('roundNumber')).toBe(0);
    });

    it('should reset gameActive to false', () => {
      gameStateManager.setState({ gameActive: true });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('gameActive')).toBe(false);
    });

    it('should reset turnPhase to null', () => {
      gameStateManager.setState({ turnPhase: 'deployment' });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('turnPhase')).toBe(null);
    });

    it('should reset player states to null', () => {
      gameStateManager.setState({
        player1: { name: 'Player 1' },
        player2: { name: 'Player 2' },
      });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('player1')).toBe(null);
      expect(gameStateManager.get('player2')).toBe(null);
    });

    it('should reset firstPlayerOverride to null', () => {
      gameStateManager.setState({ firstPlayerOverride: 'player2' });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('firstPlayerOverride')).toBe(null);
    });

    it('should reset testMode to false', () => {
      gameStateManager.setState({ testMode: true });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('testMode')).toBe(false);
    });

    it('should reset gameSeed to null', () => {
      gameStateManager.setState({ gameSeed: 12345 });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('gameSeed')).toBe(null);
    });

    it('should reset winner to null', () => {
      gameStateManager.setState({ winner: 'player1' });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('winner')).toBe(null);
    });

    it('should reset passInfo', () => {
      gameStateManager.setState({
        passInfo: { firstPasser: 'player1', player1Passed: true, player2Passed: false }
      });

      gameStateManager.resetGameState();

      const passInfo = gameStateManager.get('passInfo');
      expect(passInfo.firstPasser).toBe(null);
      expect(passInfo.player1Passed).toBe(false);
      expect(passInfo.player2Passed).toBe(false);
    });

    it('should reset actionsTakenThisTurn to 0', () => {
      gameStateManager.setState({ actionsTakenThisTurn: 5 });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('actionsTakenThisTurn')).toBe(0);
    });

    it('should reset commitments to empty object', () => {
      gameStateManager.setState({
        commitments: { deployment: { player1: { completed: true } } }
      });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('commitments')).toEqual({});
    });

    it('should reset all UI state arrays to empty', () => {
      gameStateManager.setState({
        placedSections: [{ id: 1 }],
        opponentPlacedSections: [{ id: 2 }],
        unplacedSections: [{ id: 3 }],
        gameLog: [{ message: 'test' }],
        droneSelectionPool: [{ name: 'Test Drone' }],
        droneSelectionTrio: [{ name: 'Test Drone' }],
      });

      gameStateManager.resetGameState();

      expect(gameStateManager.get('placedSections')).toEqual([]);
      expect(gameStateManager.get('opponentPlacedSections')).toEqual([]);
      expect(gameStateManager.get('unplacedSections')).toEqual([]);
      expect(gameStateManager.get('gameLog')).toEqual([]);
      expect(gameStateManager.get('droneSelectionPool')).toEqual([]);
      expect(gameStateManager.get('droneSelectionTrio')).toEqual([]);
    });

    it('should result in valid pre-game state', () => {
      // Set dirty state
      gameStateManager.setState({
        gameStage: 'roundLoop',
        roundNumber: 5,
        gameActive: true,
        turnPhase: 'action',
        player1: { name: 'Player 1' },
        player2: { name: 'Player 2' },
      });

      gameStateManager.resetGameState();

      // After reset, validation should pass
      const result = gameStateManager.validatePreGameState();
      expect(result.valid).toBe(true);
    });
  });

  describe('endGame()', () => {
    it('should set appState to menu', () => {
      gameStateManager.setState({ appState: 'inGame' });

      gameStateManager.endGame();

      expect(gameStateManager.get('appState')).toBe('menu');
    });

    it('should reset game state via resetGameState()', () => {
      // Simulate a mid-game state
      gameStateManager.setState({
        appState: 'inGame',
        gameActive: true,
        gameStage: 'roundLoop',
        roundNumber: 3,
        turnPhase: 'action',
        player1: { name: 'Player 1', energy: 5 },
        player2: { name: 'Player 2', energy: 3 },
      });

      gameStateManager.endGame();

      // Should be in clean pre-game state
      expect(gameStateManager.get('gameStage')).toBe('preGame');
      expect(gameStateManager.get('roundNumber')).toBe(0);
      expect(gameStateManager.get('gameActive')).toBe(false);
      expect(gameStateManager.get('player1')).toBe(null);
      expect(gameStateManager.get('player2')).toBe(null);
    });

    it('should result in valid pre-game state', () => {
      // Set up game state
      gameStateManager.setState({
        appState: 'inGame',
        gameActive: true,
        gameStage: 'roundLoop',
        roundNumber: 7,
        turnPhase: 'deployment',
      });

      gameStateManager.endGame();

      const result = gameStateManager.validatePreGameState();
      expect(result.valid).toBe(true);
    });
  });

  describe('startGame() - dirty state detection', () => {
    it('should not log error when state is clean', () => {
      // State is already clean from beforeEach

      gameStateManager.startGame('local');

      // console.error should not have been called with dirty state message
      const errorCalls = console.error.mock.calls;
      const dirtyStateCall = errorCalls.find(call =>
        call[0]?.includes?.('DIRTY STATE DETECTED')
      );
      expect(dirtyStateCall).toBeUndefined();
    });

    it('should log error and cleanup when gameStage is dirty', () => {
      gameStateManager.setState({ gameStage: 'roundLoop' });

      gameStateManager.startGame('local');

      // Should have logged error about dirty state
      expect(console.error).toHaveBeenCalled();
      const errorCalls = console.error.mock.calls;
      const dirtyStateCall = errorCalls.find(call =>
        call[0]?.includes?.('DIRTY STATE DETECTED')
      );
      expect(dirtyStateCall).toBeDefined();
    });

    it('should log error and cleanup when roundNumber is non-zero', () => {
      gameStateManager.setState({ roundNumber: 5 });

      gameStateManager.startGame('local');

      expect(console.error).toHaveBeenCalled();
    });

    it('should still initialize game correctly after cleaning dirty state', () => {
      // Set dirty state
      gameStateManager.setState({
        gameStage: 'roundLoop',
        roundNumber: 3,
        player1: { name: 'Old Player' },
      });

      gameStateManager.startGame('local', { name: 'New Player 1' }, { name: 'New Player 2' });

      // Game should be properly initialized
      expect(gameStateManager.get('appState')).toBe('inGame');
      expect(gameStateManager.get('gameActive')).toBe(true);
      expect(gameStateManager.get('turnPhase')).toBe('deckSelection');
      expect(gameStateManager.get('player1').name).toBe('New Player 1');
      expect(gameStateManager.get('player2').name).toBe('New Player 2');
    });
  });

  describe('Game lifecycle integration', () => {
    it('should maintain clean state through start -> end -> start cycle', () => {
      // Start first game
      gameStateManager.startGame('local');
      expect(gameStateManager.get('gameActive')).toBe(true);

      // Simulate playing (modify state)
      gameStateManager.setState({
        gameStage: 'roundLoop',
        roundNumber: 3,
        turnPhase: 'action',
      });

      // End game
      gameStateManager.endGame();

      // Validate state is clean
      const validation = gameStateManager.validatePreGameState();
      expect(validation.valid).toBe(true);

      // Start second game - should not log dirty state error
      console.error.mockClear();
      gameStateManager.startGame('local');

      const errorCalls = console.error.mock.calls;
      const dirtyStateCall = errorCalls.find(call =>
        call[0]?.includes?.('DIRTY STATE DETECTED')
      );
      expect(dirtyStateCall).toBeUndefined();
    });

    it('should detect dirty state if endGame was not called', () => {
      // Start first game
      gameStateManager.startGame('local');

      // Simulate playing
      gameStateManager.setState({
        gameStage: 'roundLoop',
        roundNumber: 3,
      });

      // Skip endGame() - directly try to start new game
      console.error.mockClear();
      gameStateManager.startGame('local');

      // Should detect and report dirty state
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('validatePreRunState()', () => {
    it('should return valid: true when state is clean for run', () => {
      // Set clean state for single-player run
      gameStateManager.setState({
        currentRunState: null,
        singlePlayerEncounter: null,
        gameActive: false
      });

      const result = gameStateManager.validatePreRunState();

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect existing run in progress', () => {
      // NOTE: Run state has been migrated to TacticalMapStateManager
      // This test now checks for orphaned singlePlayerEncounter as an indicator of active run
      gameStateManager.setState({
        singlePlayerEncounter: { type: 'combat' }
      });

      const result = gameStateManager.validatePreRunState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('singlePlayerEncounter is not null');
    });

    it('should detect orphaned encounter', () => {
      gameStateManager.setState({
        singlePlayerEncounter: { type: 'combat' }
      });

      const result = gameStateManager.validatePreRunState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('singlePlayerEncounter is not null');
    });

    it('should detect active PvP game', () => {
      gameStateManager.setState({ gameActive: true });

      const result = gameStateManager.validatePreRunState();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('gameActive is true (PvP game in progress)');
    });

    it('should detect multiple issues', () => {
      // NOTE: currentRunState has been migrated to TacticalMapStateManager
      // This test now checks 2 issues: singlePlayerEncounter and gameActive
      gameStateManager.setState({
        singlePlayerEncounter: { type: 'poi' },
        gameActive: true
      });

      const result = gameStateManager.validatePreRunState();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBe(2);
    });
  });

  describe('clearSinglePlayerContext()', () => {
    it('should clear singlePlayerEncounter (run state is in TacticalMapStateManager)', () => {
      // NOTE: currentRunState has been migrated to TacticalMapStateManager
      // This test now verifies singlePlayerEncounter is cleared
      gameStateManager.setState({
        singlePlayerEncounter: { type: 'combat' }
      });

      gameStateManager.clearSinglePlayerContext();

      expect(gameStateManager.get('singlePlayerEncounter')).toBe(null);
    });

    it('should clear singlePlayerEncounter', () => {
      gameStateManager.setState({
        singlePlayerEncounter: { type: 'combat', enemyId: 'test' }
      });

      gameStateManager.clearSinglePlayerContext();

      expect(gameStateManager.get('singlePlayerEncounter')).toBe(null);
    });

    it('should preserve singlePlayerProfile', () => {
      const profile = { credits: 500, aiCores: 3 };
      gameStateManager.setState({
        singlePlayerProfile: profile,
        currentRunState: { shipSlotId: 1 }
      });

      gameStateManager.clearSinglePlayerContext();

      expect(gameStateManager.get('singlePlayerProfile')).toEqual(profile);
    });

    it('should preserve singlePlayerInventory', () => {
      const inventory = { 'card-1': 2, 'card-2': 1 };
      gameStateManager.setState({
        singlePlayerInventory: inventory,
        currentRunState: { shipSlotId: 1 }
      });

      gameStateManager.clearSinglePlayerContext();

      expect(gameStateManager.get('singlePlayerInventory')).toEqual(inventory);
    });
  });

  describe('transitionToAppState()', () => {
    it('should set appState to new value', () => {
      gameStateManager.setState({ appState: 'menu' });

      gameStateManager.transitionToAppState('hangar');

      expect(gameStateManager.get('appState')).toBe('hangar');
    });

    it('should clean up active game when transitioning to menu', () => {
      // Set up active game
      gameStateManager.setState({
        appState: 'inGame',
        gameActive: true,
        gameStage: 'roundLoop',
        roundNumber: 3,
        player1: { name: 'Player 1' },
        player2: { name: 'Player 2' }
      });

      gameStateManager.transitionToAppState('menu');

      expect(gameStateManager.get('appState')).toBe('menu');
      expect(gameStateManager.get('gameActive')).toBe(false);
      expect(gameStateManager.get('gameStage')).toBe('preGame');
      expect(gameStateManager.get('player1')).toBe(null);
    });

    it('should clean up active run when transitioning to menu', () => {
      // Set up active single-player run with profile (required by endRun)
      // NOTE: currentRunState has been migrated to TacticalMapStateManager
      // This test now only verifies the appState transition works correctly
      gameStateManager.setState({
        appState: 'tacticalMap',
        singlePlayerProfile: {
          credits: 100,
          aiCores: 0,
          stats: { runsCompleted: 0, runsLost: 0 }
        },
        singlePlayerShipSlots: [{ id: 1, isImmutable: false }]
      });

      gameStateManager.transitionToAppState('menu');

      expect(gameStateManager.get('appState')).toBe('menu');
      // Run state cleanup is now handled by TacticalMapStateManager
    });

    it('should not clean up when transitioning between non-menu states', () => {
      // Active run exists
      gameStateManager.setState({
        appState: 'tacticalMap',
        currentRunState: { shipSlotId: 1 }
      });

      // Transition to combat screen (not menu)
      gameStateManager.transitionToAppState('singlePlayerCombat');

      // Run should still be active
      expect(gameStateManager.get('currentRunState')).not.toBe(null);
    });
  });

  describe('startGame() - single-player context cleanup', () => {
    it('should clear single-player context before starting PvP game', () => {
      // Set up orphaned single-player state
      // NOTE: currentRunState has been migrated to TacticalMapStateManager
      gameStateManager.setState({
        singlePlayerEncounter: { type: 'combat' }
      });

      gameStateManager.startGame('local');

      // SP encounter context should be cleared (run state is now in TacticalMapStateManager)
      expect(gameStateManager.get('singlePlayerEncounter')).toBe(null);
    });
  });
});
