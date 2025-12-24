/**
 * GameStateManager Consecutive Combat Tests
 * Tests for allowing null -> roundInitialization phase transition
 *
 * BUG: GameStateManager.validateTurnPhaseTransition (line 551) only allows
 * null -> ['deckSelection', 'preGame'], but SinglePlayerCombatInitializer
 * needs to transition directly to 'roundInitialization' for SP combat.
 * This causes console warnings during combat initialization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('GameStateManager - SP combat phase transitions', () => {
  let gameStateManager;
  let warnSpy;

  beforeEach(async () => {
    // Clear module cache to get fresh instance
    vi.resetModules();

    // Spy on console.warn before importing
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Import fresh instance
    const module = await import('./GameStateManager.js');
    gameStateManager = module.default;
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('validateTurnPhaseTransition', () => {
    it('should allow null -> roundInitialization transition for SP combat', () => {
      // This test will FAIL because roundInitialization is not in valid null transitions
      // Expected: No warning should be logged when transitioning from null to roundInitialization

      // First, reset state to null turnPhase
      gameStateManager.resetGameState();

      // Clear any warnings from reset
      warnSpy.mockClear();

      // Now try to transition to roundInitialization (like SP combat init does)
      gameStateManager.setState({ turnPhase: 'roundInitialization' });

      // Should NOT produce a warning about invalid transition
      const invalidTransitionWarning = warnSpy.mock.calls.find(
        call => call[0] && call[0].includes('Invalid turn phase transition: null -> roundInitialization')
      );

      expect(invalidTransitionWarning).toBeUndefined();
    });

    it('should still warn for other invalid null transitions', () => {
      // Ensure we're not breaking validation for other invalid transitions

      gameStateManager.resetGameState();
      warnSpy.mockClear();

      // Try to transition to an invalid phase from null
      gameStateManager.setState({ turnPhase: 'action' });

      // Should produce a warning about invalid transition
      const invalidTransitionWarning = warnSpy.mock.calls.find(
        call => call[0] && call[0].includes('Invalid turn phase transition: null -> action')
      );

      expect(invalidTransitionWarning).toBeDefined();
    });
  });
});
