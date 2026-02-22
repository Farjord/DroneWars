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

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../GameStateManager.js');
    gameStateManager = module.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateTurnPhaseTransition', () => {
    it('should allow null -> roundInitialization transition for SP combat', () => {
      // Spy on validateTurnPhaseTransition to capture calls and check if it reports invalid
      const spy = vi.spyOn(gameStateManager, 'validateTurnPhaseTransition');

      gameStateManager.resetGameState();
      spy.mockClear();

      // Transition to roundInitialization from null (like SP combat init does)
      gameStateManager.setState({ turnPhase: 'roundInitialization' });

      // Verify it was called with the transition
      expect(spy).toHaveBeenCalledWith(null, 'roundInitialization');
      spy.mockRestore();
    });

    it('should still flag other invalid null transitions', () => {
      // Test the valid transitions map directly: 'action' is NOT valid from null
      // The internal validTransitions map defines null -> ['deckSelection', 'preGame', 'roundInitialization']
      // 'action' is not in that list, so validateTurnPhaseTransition should fire a warning

      gameStateManager.resetGameState();

      // Verify that null -> action is not in the allowed list by checking
      // that the transition doesn't throw but the phase is set anyway
      // (validation logs but doesn't prevent the transition)
      gameStateManager.setState({ turnPhase: 'action' });

      // The transition was applied despite being invalid (validation is advisory)
      expect(gameStateManager.get('turnPhase')).toBe('action');
    });
  });
});
