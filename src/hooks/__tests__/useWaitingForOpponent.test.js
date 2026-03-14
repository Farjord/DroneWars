import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock debugLogger before importing hook
vi.mock('../../utils/debugLogger.js', () => ({
  debugLog: vi.fn(),
}));

import useWaitingForOpponent from '../useWaitingForOpponent.js';

// --- Helpers ---

function makePhaseAnimationQueue({ queueLength = 0, playing = false } = {}) {
  const completeCallbacks = [];
  return {
    getQueueLength: () => queueLength,
    isPlaying: () => playing,
    onComplete: (fn) => {
      completeCallbacks.push(fn);
      return () => {
        const idx = completeCallbacks.indexOf(fn);
        if (idx >= 0) completeCallbacks.splice(idx, 1);
      };
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
    phaseAnimationQueue: makePhaseAnimationQueue(),
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

    it('clears overlay for remote client when both committed (no host-only branching)', () => {
      // Verifies the unified effect handles remote clients identically
      const initialProps = defaultProps({
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
      });

      const { result, rerender } = renderHook(
        (props) => useWaitingForOpponent(props),
        { initialProps }
      );

      expect(result.current.waitingForPlayerPhase).toBe('mandatoryDiscard');

      // Opponent commits (remote receives updated commitments via sync)
      rerender(defaultProps({
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
      }));

      expect(result.current.waitingForPlayerPhase).toBeNull();
    });

    it('clears overlay when phase advances (covers former Effect 2 scenario)', () => {
      // Verifies the failsafe handles what Effect 2 used to do for remote clients
      const initialProps = defaultProps({
        turnPhase: 'allocateShields',
        gameState: {
          commitments: {
            allocateShields: {
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

      expect(result.current.waitingForPlayerPhase).toBe('allocateShields');

      // Phase advances (host pushed new phase via sync)
      rerender(defaultProps({
        turnPhase: 'action',
        gameState: { commitments: {}, gameStage: 'combat', roundNumber: 1 },
      }));

      expect(result.current.waitingForPlayerPhase).toBeNull();
    });
  });

  describe('deferred waiting modal race condition', () => {

    it('does NOT show modal after onComplete fires if phase has already advanced', () => {
      let queueLength = 1;
      let playing = true;
      const completeCallbacks = [];

      const phaseAnimationQueue = {
        getQueueLength: () => queueLength,
        isPlaying: () => playing,
        onComplete: (fn) => {
          completeCallbacks.push(fn);
          return () => {
            const idx = completeCallbacks.indexOf(fn);
            if (idx >= 0) completeCallbacks.splice(idx, 1);
          };
        },
      };

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
        phaseAnimationQueue,
      });

      const { result, rerender } = renderHook(
        (props) => useWaitingForOpponent(props),
        { initialProps }
      );

      // Modal should NOT be set yet (deferred to onComplete)
      expect(result.current.waitingForPlayerPhase).toBeNull();
      expect(completeCallbacks.length).toBe(1);

      // Phase advances before onComplete fires
      queueLength = 0;
      playing = false;
      rerender(defaultProps({
        turnPhase: 'deployment',
        gameState: { commitments: {}, gameStage: 'combat', roundNumber: 1 },
        phaseAnimationQueue,
      }));

      // Fire the stale onComplete callback
      act(() => {
        completeCallbacks.forEach(fn => fn());
      });

      // Modal must NOT appear — phase has advanced past optionalDiscard
      expect(result.current.waitingForPlayerPhase).toBeNull();
    });

    it('cancels pending onComplete when effect re-runs', () => {
      let queueLength = 1;
      let playing = true;
      const completeCallbacks = [];

      const phaseAnimationQueue = {
        getQueueLength: () => queueLength,
        isPlaying: () => playing,
        onComplete: (fn) => {
          completeCallbacks.push(fn);
          return () => {
            const idx = completeCallbacks.indexOf(fn);
            if (idx >= 0) completeCallbacks.splice(idx, 1);
          };
        },
      };

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
        phaseAnimationQueue,
      });

      const { rerender } = renderHook(
        (props) => useWaitingForOpponent(props),
        { initialProps }
      );

      expect(completeCallbacks.length).toBe(1);

      // Re-render with phase change triggers effect re-run; old subscription should be cleaned up
      queueLength = 0;
      playing = false;
      rerender(defaultProps({
        turnPhase: 'deployment',
        gameState: { commitments: {}, gameStage: 'combat', roundNumber: 1 },
        phaseAnimationQueue,
      }));

      // The old callback should have been unsubscribed
      expect(completeCallbacks.length).toBe(0);
    });
  });

  describe('engine batch processing (commitments cleared + phase advanced in one update)', () => {

    it('clears overlay when state jumps from "local committed" to "phase advanced + commitments cleared"', () => {
      // This is the core bug scenario: the engine processes both commits and advances
      // the phase in a single cycle, so React never sees an intermediate state with
      // both players committed. The overlay must still clear via the failsafe.
      const initialProps = defaultProps({
        turnPhase: 'allocateShields',
        gameState: {
          commitments: {
            allocateShields: {
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

      expect(result.current.waitingForPlayerPhase).toBe('allocateShields');

      // Engine batches: both commit + phase advances + commitments cleared — single update
      rerender(defaultProps({
        turnPhase: 'action',
        gameState: { commitments: {}, gameStage: 'combat', roundNumber: 1 },
      }));

      expect(result.current.waitingForPlayerPhase).toBeNull();
    });

    it('clears overlay when commitments object reference is reused (same empty object)', () => {
      // Edge case: state management reuses the same empty commitments reference
      const sharedEmptyCommitments = {};

      const initialProps = defaultProps({
        turnPhase: 'allocateShields',
        gameState: {
          commitments: {
            allocateShields: {
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

      expect(result.current.waitingForPlayerPhase).toBe('allocateShields');

      // Phase advances with the shared empty object — commitmentKey changes even if ref doesn't
      rerender(defaultProps({
        turnPhase: 'action',
        gameState: { commitments: sharedEmptyCommitments, gameStage: 'combat', roundNumber: 1 },
      }));

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
