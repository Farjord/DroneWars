// --- useMultiplayerSync ---
// Manages multiplayer synchronization: waiting overlay, P2P messaging,
// guest phase transition detection, and simultaneous phase commitment monitoring.
// Extracted from App.jsx Phase C (Step 8).

import { useState, useRef, useEffect } from 'react';
import { debugLog } from '../utils/debugLogger.js';

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
    if (gameState.gameMode === 'guest') return;

    const handlePhaseEvent = (event) => {
      const { type, phase, playerId, data } = event;

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
        const { newPhase, previousPhase, firstPlayerResult } = event;
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
  }, [isMultiplayer, getLocalPlayerId, waitingForPlayerPhase, gameState.gameMode, gameStateManager]);

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
      if (event.type === 'sync_requested' && gameStateManager.isHost()) {
        debugLog('MULTIPLAYER', '🔄 Guest requested full state sync - sending response');
        const currentState = gameStateManager.getState();
        p2pManager.sendFullSyncResponse(currentState);
      }
    };

    const unsubscribe = p2pManager.subscribe(handleP2PData);
    return unsubscribe;
  }, [isMultiplayer, p2pManager, gameStateManager]);

  // --- Guest phase transition detection ---
  // Guest watches turnPhase changes and synthesizes phaseTransition events locally
  // to clear waiting modals and show deployment complete modal
  useEffect(() => {
    if (gameState.gameMode !== 'guest') return;

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
  }, [turnPhase, gameState.gameStage, gameState.roundNumber, gameState.gameMode, waitingForPlayerPhase, passInfo]);

  // --- Simultaneous phase waiting modal monitoring ---
  // Monitors commitment status for simultaneous phases and shows waiting modal
  // Coordinates with phase animation queue to prevent race conditions
  useEffect(() => {
    if (!isMultiplayer()) return;

    const localPlayerId = getLocalPlayerId();
    const opponentPlayerId = getOpponentPlayerId();

    // Check mandatoryDiscard phase
    if (turnPhase === 'mandatoryDiscard') {
      const localCommitted = gameState.commitments?.mandatoryDiscard?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.mandatoryDiscard?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', '✋ Local player committed but opponent has not - showing waiting modal for mandatoryDiscard');

        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('mandatoryDiscard');
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase('mandatoryDiscard');
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === 'mandatoryDiscard') {
        debugLog('COMMITMENTS', '✅ Both players committed - clearing waiting modal for mandatoryDiscard');
        setWaitingForPlayerPhase(null);
      }
    }

    // Check optionalDiscard phase
    if (turnPhase === 'optionalDiscard') {
      const localCommitted = gameState.commitments?.optionalDiscard?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.optionalDiscard?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', '✋ Local player committed but opponent has not - showing waiting modal for optionalDiscard');

        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('optionalDiscard');
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase('optionalDiscard');
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === 'optionalDiscard') {
        debugLog('COMMITMENTS', '✅ Both players committed - clearing waiting modal for optionalDiscard');
        setWaitingForPlayerPhase(null);
      }
    }

    // Check allocateShields phase
    if (turnPhase === 'allocateShields') {
      const localCommitted = gameState.commitments?.allocateShields?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.allocateShields?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', '✋ Local player committed but opponent has not - showing waiting modal for allocateShields');

        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('allocateShields');
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase('allocateShields');
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === 'allocateShields') {
        debugLog('COMMITMENTS', '✅ Both players committed - clearing waiting modal for allocateShields');
        setWaitingForPlayerPhase(null);
      }
    }

    // Check mandatoryDroneRemoval phase
    if (turnPhase === 'mandatoryDroneRemoval') {
      const localCommitted = gameState.commitments?.mandatoryDroneRemoval?.[localPlayerId]?.completed;
      const opponentCommitted = gameState.commitments?.mandatoryDroneRemoval?.[opponentPlayerId]?.completed;

      if (localCommitted && !opponentCommitted) {
        debugLog('COMMITMENTS', '✋ Local player committed but opponent has not - showing waiting modal for mandatoryDroneRemoval');

        if (phaseAnimationQueue && (phaseAnimationQueue.getQueueLength() > 0 || phaseAnimationQueue.isPlaying())) {
          debugLog('PHASE_TRANSITIONS', '⏳ Waiting for announcement queue to complete before showing waiting modal', {
            queueLength: phaseAnimationQueue.getQueueLength(),
            isPlaying: phaseAnimationQueue.isPlaying()
          });
          const unsubscribe = phaseAnimationQueue.onComplete(() => {
            setWaitingForPlayerPhase('mandatoryDroneRemoval');
            unsubscribe();
          });
        } else {
          setWaitingForPlayerPhase('mandatoryDroneRemoval');
        }
      } else if (localCommitted && opponentCommitted && waitingForPlayerPhase === 'mandatoryDroneRemoval') {
        debugLog('COMMITMENTS', '✅ Both players committed - clearing waiting modal for mandatoryDroneRemoval');
        setWaitingForPlayerPhase(null);
      }
    }
  }, [turnPhase, gameState.commitments, isMultiplayer, getLocalPlayerId, getOpponentPlayerId, waitingForPlayerPhase, phaseAnimationQueue]);

  // --- Guest render completion for animations ---
  // Signal to GuestMessageQueueService that React has finished rendering
  // This ensures animations (like teleport effects) have valid DOM elements to target
  useEffect(() => {
    if (gameState.gameMode === 'guest') {
      gameStateManager.emit('render_complete');
    }
  }, [gameState, gameStateManager]);

  return {
    waitingForPlayerPhase,
    setWaitingForPlayerPhase,
  };
};

export default useMultiplayerSync;
