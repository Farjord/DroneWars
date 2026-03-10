import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock debugLogger before importing hook
vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

import useWaitingForOpponent from '../useWaitingForOpponent.js';

// --- Helpers ---

function makeGameStateManager({ isRemote = false } = {}) {
  const subscribers = [];
  return {
    isRemoteClient: () => isRemote,
    gameFlowManager: {
      subscribe: (fn) => {
        subscribers.push(fn);
        return () => {
          const idx = subscribers.indexOf(fn);
          if (idx >= 0) subscribers.splice(idx, 1);
        };
      },
      _emit: (event) => subscribers.forEach(fn => fn(event)),
    },
  };
}

function makePhaseAnimationQueue({ queueLength = 0, playing = false } = {}) {
  const completeCallbacks = [];
  return {
    getQueueLength: () => queueLength,
    isPlaying: () => playing,
    onComplete: (fn) => {
      completeCallbacks.push(fn);
      return () => {};
    },
    _fireComplete: () => completeCallbacks.forEach(fn => fn()),
  };
}

function defaultProps(overrides = {}) {
  return {
    gameState: { commitments: {}, gameStage: 'combat', roundNumber: 1 },
    turnPhase: 'action',
    getLocalPlayerId: () => 'player1',
    getOpponentPlayerId: () => 'player2',
    gameStateManager: makeGameStateManager(),
    phaseAnimationQueue: makePhaseAnimationQueue(),
    passInfo: {},
    ...overrides,
  };
}

// --- Tests ---

describe('useWaitingForOpponent', () => {

  describe('commitment-monitoring effect (single source of truth)', () => {

    it('shows waiting modal when local player committed but opponent has not', () => {
      const props = defaultProps({
        turnPhase: 'optionalDiscard',
        gameState: {
          commitments: {
            optionalDiscard: {
              player1: { completed: true },
              // player2 not committed
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
      });

      const { result } = renderHook(() => useWaitingForOpponent(props));

      expect(result.current.waitingForPlayerPhase).toBe('optionalDiscard');
    });

    it('clears waiting modal when both players committed', () => {
      // Start with only local committed to get into waiting state
      const initialProps = defaultProps({
        turnPhase: 'optionalDiscard',
        gameState: {
          commitments: {
            optionalDiscard: {
              player1: { completed: true },
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
      });

      const { result, rerender } = renderHook(
        (props) => useWaitingForOpponent(props),
        { initialProps }
      );

      expect(result.current.waitingForPlayerPhase).toBe('optionalDiscard');

      // Now both committed
      const updatedProps = defaultProps({
        turnPhase: 'optionalDiscard',
        gameState: {
          commitments: {
            optionalDiscard: {
              player1: { completed: true },
              player2: { completed: true },
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
      });

      rerender(updatedProps);

      expect(result.current.waitingForPlayerPhase).toBeNull();
    });

    it('clears waiting modal (failsafe) when turnPhase advances past the waited phase', () => {
      const initialProps = defaultProps({
        turnPhase: 'optionalDiscard',
        gameState: {
          commitments: {
            optionalDiscard: {
              player1: { completed: true },
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
      });

      const { result, rerender } = renderHook(
        (props) => useWaitingForOpponent(props),
        { initialProps }
      );

      expect(result.current.waitingForPlayerPhase).toBe('optionalDiscard');

      // Phase advances — failsafe should clear
      rerender(defaultProps({
        turnPhase: 'deployment',
        gameState: { commitments: {}, gameStage: 'combat', roundNumber: 1 },
      }));

      expect(result.current.waitingForPlayerPhase).toBeNull();
    });

    it('does NOT show modal when opponent has already committed (AI instant commit)', () => {
      const props = defaultProps({
        turnPhase: 'mandatoryDiscard',
        gameState: {
          commitments: {
            mandatoryDiscard: {
              player1: { completed: true },
              player2: { completed: true },
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
      });

      const { result } = renderHook(() => useWaitingForOpponent(props));

      expect(result.current.waitingForPlayerPhase).toBeNull();
    });

    it('works in local/SP mode (no isMultiplayer guard)', () => {
      // This is the core bug fix test: SP mode should still show/clear the modal
      const props = defaultProps({
        turnPhase: 'allocateShields',
        gameState: {
          commitments: {
            allocateShields: {
              player1: { completed: true },
              // player2 (AI) not yet committed
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
      });

      const { result, rerender } = renderHook(
        (props) => useWaitingForOpponent(props),
        { initialProps: props }
      );

      // Should show — no isMultiplayer guard blocking it
      expect(result.current.waitingForPlayerPhase).toBe('allocateShields');

      // AI commits
      rerender(defaultProps({
        turnPhase: 'allocateShields',
        gameState: {
          commitments: {
            allocateShields: {
              player1: { completed: true },
              player2: { completed: true },
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
      }));

      // Should clear
      expect(result.current.waitingForPlayerPhase).toBeNull();
    });
  });

  describe('stale closure fix', () => {

    it('GameFlowManager bothPlayersComplete event clears the modal via ref', () => {
      const gsm = makeGameStateManager();

      const props = defaultProps({
        turnPhase: 'mandatoryDiscard',
        gameState: {
          commitments: {
            mandatoryDiscard: {
              player1: { completed: true },
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
        gameStateManager: gsm,
      });

      const { result } = renderHook(() => useWaitingForOpponent(props));

      // Modal is set by the commitment-monitoring effect
      expect(result.current.waitingForPlayerPhase).toBe('mandatoryDiscard');

      // Simulate GameFlowManager firing bothPlayersComplete
      act(() => {
        gsm.gameFlowManager._emit({
          type: 'bothPlayersComplete',
          phase: 'mandatoryDiscard',
        });
      });

      expect(result.current.waitingForPlayerPhase).toBeNull();
    });

    it('GameFlowManager phaseTransition event clears the modal via ref', () => {
      const gsm = makeGameStateManager();

      const props = defaultProps({
        turnPhase: 'optionalDiscard',
        gameState: {
          commitments: {
            optionalDiscard: {
              player1: { completed: true },
            },
          },
          gameStage: 'combat',
          roundNumber: 1,
        },
        gameStateManager: gsm,
      });

      const { result } = renderHook(() => useWaitingForOpponent(props));

      expect(result.current.waitingForPlayerPhase).toBe('optionalDiscard');

      act(() => {
        gsm.gameFlowManager._emit({
          type: 'phaseTransition',
          newPhase: 'deployment',
          previousPhase: 'optionalDiscard',
        });
      });

      expect(result.current.waitingForPlayerPhase).toBeNull();
    });
  });

  describe('does not return setWaitingForPlayerPhase', () => {
    it('return value has no setter — only waitingForPlayerPhase', () => {
      const { result } = renderHook(() => useWaitingForOpponent(defaultProps()));

      expect(result.current).toHaveProperty('waitingForPlayerPhase');
      expect(result.current).not.toHaveProperty('setWaitingForPlayerPhase');
    });
  });
});
