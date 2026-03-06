// --- useMultiplayerSync ---
// Manages multiplayer synchronization: waiting overlay, P2P messaging,
// guest phase transition detection, and simultaneous phase commitment monitoring.
// Extracted from App.jsx Phase C (Step 8).

import { useState, useRef, useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';
import StateRedactor from '../server/StateRedactor.js';

const useMultiplayerSync = ({
  gameState,
  turnPhase,
  isMultiplayer,
  getLocalPlayerId,
  getOpponentPlayerId,
  p2pManager,
  gameStateManager,
  phaseAnimationQueue,
  passInfo,
}) => {
  const [waitingForPlayerPhase, setWaitingForPlayerPhase] = useState(null);
  const previousPhaseRef = useRef(null);

  // --- GameFlowManager subscription (host/local only) ---
  // Clears waiting overlay when both players complete or when phase transitions
  useEffect(() => {
    if (gameStateManager.getLocalPlayerId() === 'player2') return;

    const handlePhaseEvent = (event) => {
      const { type, phase, playerId } = event;

      debugLog('PHASE_TRANSITIONS', `🔔 App.jsx received PhaseManager event: ${type}`, { phase, playerId });

      if (type === 'bothPlayersComplete') {
        const { phase: completedPhase } = event;
        debugLog('PHASE_TRANSITIONS', `🎯 Both players completed phase: ${completedPhase}`);

        if (waitingForPlayerPhase === completedPhase) {
          debugLog('PHASE_TRANSITIONS', `✅ Clearing waiting overlay immediately for completed phase: ${completedPhase}`);
          setWaitingForPlayerPhase(null);
        }
      }

      if (type === 'phaseTransition') {
        const { newPhase, previousPhase } = event;
        debugLog('PHASE_TRANSITIONS', `🔄 App.jsx handling phase transition: ${previousPhase} → ${newPhase}`);

        debugLog('PHASE_TRANSITIONS', `🔍 Waiting overlay check: waitingForPlayerPhase="${waitingForPlayerPhase}", previousPhase="${previousPhase}", match=${waitingForPlayerPhase === previousPhase}`);
        if (waitingForPlayerPhase === previousPhase) {
          debugLog('PHASE_TRANSITIONS', `✅ Clearing waiting overlay for phase: ${previousPhase}`);
          setWaitingForPlayerPhase(null);
        } else if (waitingForPlayerPhase) {
          debugLog('PHASE_TRANSITIONS', `⚠️ Waiting overlay NOT cleared: waiting for "${waitingForPlayerPhase}" but transition is from "${previousPhase}"`);
        }
      }
    };

    const unsubscribeGameFlow = gameStateManager.gameFlowManager?.subscribe(handlePhaseEvent);

    return () => {
      if (typeof unsubscribeGameFlow === 'function') {
        unsubscribeGameFlow();
      }
    };
  }, [isMultiplayer, getLocalPlayerId, waitingForPlayerPhase, gameStateManager]);

  // --- P2P data subscription ---
  // Handles incoming P2P messages: PHASE_COMPLETED logging and sync_requested responses
  useEffect(() => {
    if (!isMultiplayer()) return;

    const handleP2PData = (event) => {
      debugLog('MULTIPLAYER', '🔥 P2P Event received in App:', event);
      if (event.type === 'PHASE_COMPLETED') {
        const { phase } = event.data || event;
        debugLog('MULTIPLAYER', `🔥 Opponent completed phase: ${phase}`);
      }
      if (event.type === 'sync_requested' && gameStateManager.getLocalPlayerId() === 'player1') {
        debugLog('MULTIPLAYER', '🔄 Guest requested full state sync - sending response');
        const redactedState = StateRedactor.redactForPlayer(gameStateManager.getState(), 'player2');
        p2pManager.sendFullSyncResponse(redactedState, p2pManager.broadcastSequence);
      }
    };

    const unsubscribe = p2pManager.subscribe(handleP2PData);
    return unsubscribe;
  }, [isMultiplayer, p2pManager, gameStateManager]);

  // --- Guest phase transition detection ---
  // Guest watches turnPhase changes and synthesizes phaseTransition events locally
  // to clear waiting modals and show deployment complete modal
  useEffect(() => {
    if (gameStateManager.getLocalPlayerId() !== 'player2') return;

    const previousPhase = previousPhaseRef.current;

    if (previousPhase === null) {
      previousPhaseRef.current = turnPhase;
      return;
    }

    if (previousPhase !== turnPhase) {
      debugLog('PHASE_TRANSITIONS', `👁️ Guest detected phase change: ${previousPhase} → ${turnPhase}`);

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
          debugLog('PHASE_TRANSITIONS', `🔄 Guest handling synthetic phase transition: ${previousPhase} → ${newPhase}`);

          if (waitingForPlayerPhase === previousPhase) {
            setWaitingForPlayerPhase(null);
          }
        }
      };

      handlePhaseEvent(syntheticEvent);

      previousPhaseRef.current = turnPhase;
    }
  }, [turnPhase, gameState.gameStage, gameState.roundNumber, waitingForPlayerPhase, passInfo, gameStateManager]);

  // --- Simultaneous phase waiting modal monitoring ---
  // Monitors commitment status for simultaneous phases and shows waiting modal
  // Coordinates with phase animation queue to prevent race conditions
  useEffect(() => {
    if (!isMultiplayer()) return;

    const localPlayerId = getLocalPlayerId();
    const opponentPlayerId = getOpponentPlayerId();

    // Check commitment-based phases for waiting modal display
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
            setWaitingForPlayerPhase(phase);
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase(phase);
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === phase) {
        debugLog('COMMITMENTS', `✅ Both players committed - clearing waiting modal for ${phase}`);
        setWaitingForPlayerPhase(null);
      }
    }
  }, [turnPhase, gameState.commitments, isMultiplayer, getLocalPlayerId, getOpponentPlayerId, waitingForPlayerPhase, phaseAnimationQueue]);

  return {
    waitingForPlayerPhase,
    setWaitingForPlayerPhase,
  };
};

export default useMultiplayerSync;
