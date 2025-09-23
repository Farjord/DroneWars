// ========================================
// USE GAME STATE HOOK
// ========================================
// React hook for integrating GameStateManager with React components
// Provides reactive access to game state and multiplayer functionality

import { useState, useEffect, useCallback } from 'react';
import gameStateManager from '../state/GameStateManager.js';
import p2pManager from '../network/P2PManager.js';

export const useGameState = () => {
  const [gameState, setGameState] = useState(gameStateManager.getState());
  const [p2pStatus, setP2pStatus] = useState(p2pManager.getStatus());

  // Subscribe to game state changes
  useEffect(() => {
    const unsubscribe = gameStateManager.subscribe((event) => {
      setGameState(gameStateManager.getState());
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
  }, [gameState.currentPlayer, gameState.gameMode]);

  const getLocalPlayerId = useCallback(() => {
    return gameStateManager.getLocalPlayerId();
  }, [gameState.gameMode]);

  const getOpponentPlayerId = useCallback(() => {
    return gameStateManager.getOpponentPlayerId();
  }, [gameState.gameMode]);

  const isMultiplayer = useCallback(() => {
    return gameState.gameMode !== 'local';
  }, [gameState.gameMode]);

  const isWaitingForOpponent = useCallback(() => {
    return isMultiplayer() && !isMyTurn();
  }, [isMultiplayer, isMyTurn]);

  // Perspective methods
  const getLocalPlayerState = useCallback(() => {
    return gameStateManager.getLocalPlayerState();
  }, [gameState.gameMode]);

  const getOpponentPlayerState = useCallback(() => {
    return gameStateManager.getOpponentPlayerState();
  }, [gameState.gameMode]);

  const isLocalPlayer = useCallback((playerId) => {
    return gameStateManager.isLocalPlayer(playerId);
  }, [gameState.gameMode]);

  const getLocalPlacedSections = useCallback(() => {
    return gameStateManager.getLocalPlacedSections();
  }, [gameState.gameMode, gameState.placedSections, gameState.opponentPlacedSections]);

  const getOpponentPlacedSections = useCallback(() => {
    return gameStateManager.getOpponentPlacedSections();
  }, [gameState.gameMode, gameState.placedSections, gameState.opponentPlacedSections]);

  // State update methods
  const updateGameState = useCallback((updates, eventType) => {
    gameStateManager.setState(updates, eventType);
  }, []);

  const updatePlayers = useCallback((player1Updates, player2Updates) => {
    gameStateManager.updatePlayers(player1Updates, player2Updates);
  }, []);

  const updatePlayerState = useCallback((playerId, updates) => {
    gameStateManager.updatePlayerState(playerId, updates);
  }, []);

  const setPlayerStates = useCallback((newPlayer1, newPlayer2) => {
    gameStateManager.setPlayerStates(newPlayer1, newPlayer2);
  }, []);

  const setCurrentPlayer = useCallback((playerId) => {
    gameStateManager.setCurrentPlayer(playerId);
  }, []);

  const setTurnPhase = useCallback((phase) => {
    gameStateManager.setTurnPhase(phase);
  }, []);

  const setFirstPlayerOfRound = useCallback((playerId) => {
    gameStateManager.setFirstPlayerOfRound(playerId);
  }, []);

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
    updateGameState,
    updatePlayers,
    updatePlayerState,
    setPlayerStates,
    setCurrentPlayer,
    setTurnPhase,
    setFirstPlayerOfRound,
    setFirstPasserOfPreviousRound,
    setFirstPlayerOverride,
    setPassInfo,
    updatePassInfo,
    addLogEntry,
    resetGame,
    setWinner,

    // Action processing
    processAction,
    isActionInProgress,
    getActionQueueLength,
    clearActionQueue,

    // Direct access to managers (for complex operations)
    gameStateManager,
    p2pManager,
  };
};