import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import gameStateManager from '../GameStateManager.js';

// Mock the map generator to avoid complex dependencies
vi.mock('../logic/map/generateMapData.js', () => ({
  default: () => ({
    name: 'Test Sector',
    hexes: [{ q: 0, r: 0 }],
    gates: [{ q: 0, r: 0 }],
    poiCount: 1,
    gateCount: 1,
    baseDetection: 0
  })
}));

/**
 * GameStateManager.resetGameState Tests - TDD Approach
 *
 * These tests verify that resetGameState() properly sets ownership context
 * to avoid "Unknown cannot update" ownership violations when resetting
 * game orchestration fields (gameActive, turnPhase, gameStage, roundNumber).
 *
 * Call chain that triggers these violations:
 * LootRevealModal.handleContinue()
 *   → WinnerModal.handleLootCollected()
 *     → CombatOutcomeProcessor.finalizeLootCollection()
 *       → gameStateManager.resetGameState()
 */

describe('GameStateManager.resetGameState', () => {
  let ownershipViolations;
  let originalSetState;

  beforeEach(() => {
    ownershipViolations = [];

    // Save original setState for tests that need to mock it
    originalSetState = gameStateManager.setState.bind(gameStateManager);

    // Mock console.warn to capture ownership violations
    vi.spyOn(console, 'warn').mockImplementation((msg, ...args) => {
      if (typeof msg === 'string' && msg.includes('OWNERSHIP VIOLATION')) {
        ownershipViolations.push({ msg, args });
      }
    });

    // Set up initial game state to reset from (simulating mid-game state)
    gameStateManager._updateContext = 'GameFlowManager';
    gameStateManager.setState({
      gameActive: true,
      turnPhase: 'action',
      gameStage: 'inProgress',
      roundNumber: 3,
      player1: { name: 'Test Player 1' },
      player2: { name: 'Test Player 2' }
    });
    gameStateManager._updateContext = null;
  });

  afterEach(() => {
    // Restore original setState if it was mocked
    gameStateManager.setState = originalSetState;
    vi.restoreAllMocks();
  });

  describe('Ownership Validation', () => {
    it('should NOT trigger ownership violations when resetting game state', () => {
      // Act: Call resetGameState (which updates game orchestration fields)
      gameStateManager.resetGameState();

      // Assert: No ownership violations should occur
      // BUG: Currently fails because resetGameState() doesn't set _updateContext
      expect(ownershipViolations).toHaveLength(0);
    });

    it('should set _updateContext to GameFlowManager during reset', () => {
      // Spy on setState to capture the context during the call
      let contextDuringReset = 'not-captured';
      const originalSetState = gameStateManager.setState.bind(gameStateManager);
      gameStateManager.setState = function(state, reason) {
        contextDuringReset = this._updateContext;
        return originalSetState(state, reason);
      };

      // Act
      gameStateManager.resetGameState();

      // Assert: Context should have been GameFlowManager during setState call
      // BUG: Currently fails because resetGameState() doesn't set _updateContext
      expect(contextDuringReset).toBe('GameFlowManager');
    });

    it('should clear _updateContext after reset completes', () => {
      // Act
      gameStateManager.resetGameState();

      // Assert: Context should be null after reset
      expect(gameStateManager._updateContext).toBe(null);
    });

    it('should clear _updateContext even if setState throws', () => {
      // Setup: Make setState throw an error
      gameStateManager.setState = vi.fn(() => {
        throw new Error('Test error');
      });

      // Act & Assert: Should throw but still clear context
      // BUG: Currently fails because resetGameState() doesn't use try-finally
      expect(() => gameStateManager.resetGameState()).toThrow('Test error');
      expect(gameStateManager._updateContext).toBe(null);
    });
  });

  describe('State Reset Values', () => {
    it('should reset game orchestration fields to initial values', () => {
      // Act
      gameStateManager.resetGameState();

      // Assert
      const state = gameStateManager.getState();
      expect(state.gameActive).toBe(false);
      expect(state.turnPhase).toBe(null);
      expect(state.gameStage).toBe('preGame');
      expect(state.roundNumber).toBe(0);
    });

    it('should reset player states to null', () => {
      // Act
      gameStateManager.resetGameState();

      // Assert
      const state = gameStateManager.getState();
      expect(state.player1).toBe(null);
      expect(state.player2).toBe(null);
    });

    it('should reset pass info to initial values', () => {
      // Act
      gameStateManager.resetGameState();

      // Assert
      const state = gameStateManager.getState();
      expect(state.passInfo).toEqual({
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      });
    });
  });
});
