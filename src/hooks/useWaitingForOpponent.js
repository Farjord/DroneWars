// --- useWaitingForOpponent ---
// Single source of truth for the "waiting for opponent" modal.
// Monitors commitment status for simultaneous phases and shows/clears
// the waiting overlay. Works uniformly for SP, VS, and multiplayer modes.

import { useState, useRef, useEffect, useMemo } from 'react';
import { debugLog } from '../utils/debugLogger.js';

const useWaitingForOpponent = ({
  gameState,
  turnPhase,
  getLocalPlayerId,
  getOpponentPlayerId,
  phaseAnimationQueue,
}) => {
  const [waitingForPlayerPhase, setWaitingForPlayerPhase] = useState(null);

  // Ref mirrors state to avoid stale closures in event handlers
  const waitingPhaseRef = useRef(null);
  const setWaitingPhase = (value) => {
    waitingPhaseRef.current = value;
    setWaitingForPlayerPhase(value);
  };

  // Always-current ref so deferred onComplete closures can check if phase is still active
  const turnPhaseRef = useRef(turnPhase);
  turnPhaseRef.current = turnPhase;

  // Tracks pending onComplete subscription so it can be cancelled on effect re-run
  const pendingOnCompleteRef = useRef(null);

  // Derive a primitive string from commitments so React's shallow dep comparison
  // always detects changes — even when the commitments object reference is reused.
  const commitmentKey = useMemo(() => {
    const c = gameState.commitments?.[turnPhase];
    if (!c) return '';
    const localId = getLocalPlayerId();
    const opponentId = getOpponentPlayerId();
    return `${turnPhase}:${c[localId]?.completed || false}-${c[opponentId]?.completed || false}`;
  }, [turnPhase, gameState.commitments, getLocalPlayerId, getOpponentPlayerId]);

  // Commitment monitoring + failsafe clearing.
  // Shows waiting modal when local player committed but opponent hasn't.
  // Clears it when both committed, or when phase advances past the waited phase.
  useEffect(() => {
    debugLog('COMMITMENTS', 'useWaitingForOpponent effect fired', {
      turnPhase,
      commitmentKey,
      waitingPhaseRef: waitingPhaseRef.current,
      commitmentKeys: Object.keys(gameState.commitments || {}),
      hasPendingOnComplete: !!pendingOnCompleteRef.current,
    });

    // Cancel any stale pending onComplete from previous effect run
    if (pendingOnCompleteRef.current) {
      pendingOnCompleteRef.current();
      pendingOnCompleteRef.current = null;
    }

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
            // Guard: only show if phase hasn't advanced since we registered
            if (turnPhaseRef.current === phase) {
              setWaitingPhase(phase);
            }
            pendingOnCompleteRef.current = null;
            unsubscribe();
          });
          pendingOnCompleteRef.current = unsubscribe;
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
  }, [turnPhase, commitmentKey, getLocalPlayerId, getOpponentPlayerId, phaseAnimationQueue]);

  return {
    waitingForPlayerPhase,
  };
};

export default useWaitingForOpponent;
