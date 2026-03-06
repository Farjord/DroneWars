// ========================================
// USE GAME STATE HOOK
// ========================================
// React hook for integrating GameStateManager with React components
// Provides reactive access to game state and multiplayer functionality

import { useState, useEffect, useCallback } from 'react';
import gameStateManager from '../managers/GameStateManager.js';
import clientStateStore from '../client/clientStateStore.singleton.js';
import p2pManager from '../network/P2PManager.js';
import { isSimultaneousPhase, isSequentialPhase } from '../logic/phase/phaseDisplayUtils.js';
import { debugLog } from '../utils/debugLogger.js';

let initTraceStep4Logged = false;

export const useGameState = () => {
  const [gameState, setGameState] = useState(clientStateStore.getState());
  const [p2pStatus, setP2pStatus] = useState(p2pManager.getStatus());

  // Set up P2P integration on first render
  useEffect(() => {
    gameStateManager.setupP2PIntegration(p2pManager);
  }, []);

  // Subscribe to game state changes via ClientStateStore
  useEffect(() => {
    if (!initTraceStep4Logged) {
      debugLog('INIT_TRACE', '[4/8] useGameState subscribed to ClientStateStore', {
        initialPhase: clientStateStore.getState().turnPhase,
        initialAppState: clientStateStore.getState().appState,
      });
      initTraceStep4Logged = true;
    }

    const unsubscribe = clientStateStore.subscribe((event) => {
      // DEBUG: Log when hook receives events
      if (event.type === 'PLAYER_STATES_SET') {
        debugLog('RESOURCE_RESET', `👂 [USEGAMESTATE] Received PLAYER_STATES_SET event, calling setGameState`, {
          timestamp: Date.now(),
          eventType: event.type
        });
      }

      if (event.type === 'ENGINE_UPDATE') {
        debugLog('DEPLOY_TRACE', '[12/12] useGameState setGameState triggering re-render', {
          newPhase: clientStateStore.getState().turnPhase,
          eventType: event.type,
        });
      }

      setGameState(clientStateStore.getState());
    });

    return unsubscribe;
  }, []);

  // Subscribe to P2P status changes
  useEffect(() => {
    const unsubscribe = p2pManager.subscribe((event) => {
      setP2pStatus(p2pManager.getStatus());
    });

    return unsubscribe;
  }, []);

  // Convenience methods
  const isMyTurn = useCallback(() => {
    return gameStateManager.isMyTurn();
  }, [gameState.currentPlayer, gameState.localPlayerId]);

  const getLocalPlayerId = useCallback(() => {
    return gameStateManager.getLocalPlayerId();
  }, [gameState.localPlayerId]);

  const getOpponentPlayerId = useCallback(() => {
    return gameStateManager.getOpponentPlayerId();
  }, [gameState.localPlayerId]);

  const isMultiplayer = useCallback(() => {
    return gameStateManager.isMultiplayer();
  }, [gameState.localPlayerId]);

  const isWaitingForOpponent = useCallback(() => {
    return isMultiplayer() && !isMyTurn();
  }, [isMultiplayer, isMyTurn]);

  // Perspective methods
  const getLocalPlayerState = useCallback(() => {
    return gameStateManager.getLocalPlayerState();
  }, [gameState.localPlayerId]);

  const getOpponentPlayerState = useCallback(() => {
    return gameStateManager.getOpponentPlayerState();
  }, [gameState.localPlayerId]);

  const isLocalPlayer = useCallback((playerId) => {
    return gameStateManager.isLocalPlayer(playerId);
  }, [gameState.localPlayerId]);

  const getLocalPlacedSections = useCallback(() => {
    return gameStateManager.getLocalPlacedSections();
  }, [gameState.localPlayerId, gameState.placedSections, gameState.opponentPlacedSections]);

  const getOpponentPlacedSections = useCallback(() => {
    const sections = gameStateManager.getOpponentPlacedSections();
    // Only debug during placement phase when sections should exist
    if (gameState.turnPhase === 'placement' && sections.some(s => s !== null)) {
      debugLog('STATE_SYNC', '⚠️ CRITICAL - getOpponentPlacedSections returning:', { sections, opponentPlacedSections: gameState.opponentPlacedSections });
    }
    return sections;
  }, [gameState.localPlayerId, gameState.placedSections, gameState.opponentPlacedSections, gameState.turnPhase]);

  // State update methods
  // updateGameState removed - use managers for state transitions

  const updatePlayers = useCallback((player1Updates, player2Updates) => {
    gameStateManager.updatePlayers(player1Updates, player2Updates);
  }, []);

  const updatePlayerState = useCallback((playerId, updates) => {
    gameStateManager.updatePlayerState(playerId, updates);
  }, []);

  const setPlayerStates = useCallback((newPlayer1, newPlayer2) => {
    gameStateManager.setPlayerStates(newPlayer1, newPlayer2);
  }, []);

  // Direct state setters removed - use managers for phase transitions

  const setFirstPasserOfPreviousRound = useCallback((playerId) => {
    gameStateManager.setFirstPasserOfPreviousRound(playerId);
  }, []);

  const setFirstPlayerOverride = useCallback((playerId) => {
    gameStateManager.setFirstPlayerOverride(playerId);
  }, []);

  const setPassInfo = useCallback((passInfo) => {
    gameStateManager.setPassInfo(passInfo);
  }, []);

  const updatePassInfo = useCallback((passUpdates) => {
    gameStateManager.updatePassInfo(passUpdates);
  }, []);

  const addLogEntry = useCallback((entry, debugSource, aiDecisionContext) => {
    gameStateManager.addLogEntry(entry, debugSource, aiDecisionContext);
  }, []);

  const resetGame = useCallback(() => {
    gameStateManager.reset();
  }, []);

  const endGame = useCallback(() => {
    gameStateManager.endGame();
  }, []);

  const setWinner = useCallback((winnerId) => {
    gameStateManager.setWinner(winnerId);
  }, []);

  // Action processing methods
  const processAction = useCallback(async (actionType, payload) => {
    return await gameStateManager.processAction(actionType, payload);
  }, []);

  const isActionInProgress = useCallback(() => {
    return gameStateManager.isActionInProgress();
  }, []);

  const getActionQueueLength = useCallback(() => {
    return gameStateManager.getActionQueueLength();
  }, []);

  const clearActionQueue = useCallback(() => {
    gameStateManager.clearActionQueue();
  }, []);

  // Phase-aware routing methods
  const isCurrentPhaseSimultaneous = useCallback(() => {
    return isSimultaneousPhase(gameState.turnPhase);
  }, [gameState.turnPhase]);

  const isCurrentPhaseSequential = useCallback(() => {
    return isSequentialPhase(gameState.turnPhase);
  }, [gameState.turnPhase]);

  const routeAction = useCallback(async (actionType, payload) => {
    const currentPhase = gameState.turnPhase;
    const isSequential = isSequentialPhase(currentPhase);

    debugLog('STATE_SYNC', `🔀 useGameState.routeAction: ${actionType} in phase ${currentPhase} (${isSequential ? 'sequential' : 'simultaneous'})`);

    if (isSequential) {
      // Sequential phases: use ActionProcessor for serialized execution
      return await processAction(actionType, payload);
    } else {
      // Simultaneous phases: direct updates (requires implementation in calling component)
      debugLog('STATE_SYNC', `⚠️ Simultaneous phase action ${actionType} requires direct GameStateManager updates in component`);
      return {
        success: false,
        error: `Simultaneous phase action ${actionType} should use direct updates (updateGameState/updatePlayerState) rather than routeAction`,
        phase: currentPhase,
        recommendation: 'Use direct GameStateManager methods for simultaneous phases'
      };
    }
  }, [gameState.turnPhase, processAction]);

  return {
    // State
    gameState,
    p2pStatus,

    // Computed values
    isMyTurn,
    getLocalPlayerId,
    getOpponentPlayerId,
    isMultiplayer,
    isWaitingForOpponent,

    // Perspective methods
    getLocalPlayerState,
    getOpponentPlayerState,
    isLocalPlayer,
    getLocalPlacedSections,
    getOpponentPlacedSections,

    // State management
    updatePlayers,
    updatePlayerState,
    setPlayerStates,
    setFirstPasserOfPreviousRound,
    setFirstPlayerOverride,
    setPassInfo,
    updatePassInfo,
    addLogEntry,
    resetGame,
    endGame,
    setWinner,

    // Action processing
    processAction,
    isActionInProgress,
    getActionQueueLength,
    clearActionQueue,

    // Phase-aware routing
    isSimultaneousPhase: isCurrentPhaseSimultaneous,
    isSequentialPhase: isCurrentPhaseSequential,
    routeAction,

    // Direct access to managers (for complex operations)
    gameStateManager,
    p2pManager,
  };
};