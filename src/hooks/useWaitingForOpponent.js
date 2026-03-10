// --- useWaitingForOpponent ---
// Single source of truth for the "waiting for opponent" modal.
// Monitors commitment status for simultaneous phases and shows/clears
// the waiting overlay. Works uniformly for SP, VS, and multiplayer modes.

import { useState, useRef, useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';

const useWaitingForOpponent = ({
  gameState,
  turnPhase,
  getLocalPlayerId,
  getOpponentPlayerId,
  gameStateManager,
  phaseAnimationQueue,
  passInfo,
}) => {
  const [waitingForPlayerPhase, setWaitingForPlayerPhase] = useState(null);
  const previousPhaseRef = useRef(null);

  // Ref mirrors state to avoid stale closures in event handlers
  const waitingPhaseRef = useRef(null);
  const setWaitingPhase = (value) => {
    waitingPhaseRef.current = value;
    setWaitingForPlayerPhase(value);
  };

  // --- Effect 1: GameFlowManager subscription (host/local only) ---
  // Clears waiting overlay when both players complete or when phase transitions
  useEffect(() => {
    if (gameStateManager.isRemoteClient()) return;

    const handlePhaseEvent = (event) => {
      const { type, phase, playerId } = event;

      debugLog('PHASE_TRANSITIONS', `🔔 App.jsx received PhaseManager event: ${type}`, { phase, playerId });

      if (type === 'bothPlayersComplete') {
        const { phase: completedPhase } = event;
        debugLog('PHASE_TRANSITIONS', `🎯 Both players completed phase: ${completedPhase}`);

        if (waitingPhaseRef.current === completedPhase) {
          debugLog('PHASE_TRANSITIONS', `✅ Clearing waiting overlay immediately for completed phase: ${completedPhase}`);
          setWaitingPhase(null);
        }
      }

      if (type === 'phaseTransition') {
        const { newPhase, previousPhase } = event;
        debugLog('PHASE_TRANSITIONS', `🔄 App.jsx handling phase transition: ${previousPhase} → ${newPhase}`);

        debugLog('PHASE_TRANSITIONS', `🔍 Waiting overlay check: waitingForPlayerPhase="${waitingPhaseRef.current}", previousPhase="${previousPhase}", match=${waitingPhaseRef.current === previousPhase}`);
        if (waitingPhaseRef.current === previousPhase) {
          debugLog('PHASE_TRANSITIONS', `✅ Clearing waiting overlay for phase: ${previousPhase}`);
          setWaitingPhase(null);
        } else if (waitingPhaseRef.current) {
          debugLog('PHASE_TRANSITIONS', `⚠️ Waiting overlay NOT cleared: waiting for "${waitingPhaseRef.current}" but transition is from "${previousPhase}"`);
        }
      }
    };

    const unsubscribeGameFlow = gameStateManager.gameFlowManager?.subscribe(handlePhaseEvent);

    return () => {
      if (typeof unsubscribeGameFlow === 'function') {
        unsubscribeGameFlow();
      }
    };
  }, [gameStateManager]);

  // --- Effect 2: Remote client phase transition detection ---
  // Remote client watches turnPhase changes and synthesizes phaseTransition events locally
  useEffect(() => {
    if (!gameStateManager.isRemoteClient()) return;

    const previousPhase = previousPhaseRef.current;

    if (previousPhase === null) {
      previousPhaseRef.current = turnPhase;
      return;
    }

    if (previousPhase !== turnPhase) {
      debugLog('PHASE_TRANSITIONS', `👁️ Remote client detected phase change: ${previousPhase} → ${turnPhase}`);

      const syntheticEvent = {
        type: 'phaseTransition',
        newPhase: turnPhase,
        previousPhase: previousPhase,
        gameStage: gameState.gameStage,
        roundNumber: gameState.roundNumber,
        firstPlayerResult: null
      };

      const handlePhaseEvent = (event) => {
        const { type } = event;

        if (type === 'phaseTransition') {
          const { newPhase, previousPhase } = event;
          debugLog('PHASE_TRANSITIONS', `🔄 Remote client handling synthetic phase transition: ${previousPhase} → ${newPhase}`);

          if (waitingPhaseRef.current === previousPhase) {
            setWaitingPhase(null);
          }
        }
      };

      handlePhaseEvent(syntheticEvent);

      previousPhaseRef.current = turnPhase;
    }
  }, [turnPhase, gameState.gameStage, gameState.roundNumber, passInfo, gameStateManager]);

  // --- Effect 3: Simultaneous phase commitment monitoring (single source of truth) ---
  // Shows waiting modal when local player committed but opponent hasn't.
  // Clears it when both committed. No isMultiplayer guard — works for all modes.
  useEffect(() => {
    const localPlayerId = getLocalPlayerId();
    const opponentPlayerId = getOpponentPlayerId();

    for (const phase of ['mandatoryDiscard', 'optionalDiscard', 'allocateShields', 'mandatoryDroneRemoval']) {
      if (turnPhase !== phase) continue;

      const localCommitted = gameState.commitments?.[phase]?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.[phase]?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', `✋ Local player committed but opponent has not - showing waiting modal for ${phase}`);

        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingPhase(phase);
            unsubscribe();
          });
        } else {
          setWaitingPhase(phase);
        }
      } else if (localCommitted && opponentCommitted && waitingPhaseRef.current === phase) {
        debugLog('COMMITMENTS', `✅ Both players committed - clearing waiting modal for ${phase}`);
        setWaitingPhase(null);
      }
    }

    // Failsafe: clear stale waiting modal if turnPhase has moved past the waited phase
    if (waitingPhaseRef.current && turnPhase !== waitingPhaseRef.current) {
      debugLog('PHASE_TRANSITIONS', `Failsafe: clearing stale waiting modal for "${waitingPhaseRef.current}" — turnPhase is now "${turnPhase}"`);
      setWaitingPhase(null);
    }
  }, [turnPhase, gameState.commitments, getLocalPlayerId, getOpponentPlayerId, phaseAnimationQueue]);

  return {
    waitingForPlayerPhase,
  };
};

export default useWaitingForOpponent;
