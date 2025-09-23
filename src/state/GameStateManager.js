// ========================================
// GAME STATE MANAGER
// ========================================
// Centralized game state management for multiplayer support.
// Separates core game state from UI state and provides event-driven updates.

import { gameEngine, startingDecklist } from '../logic/gameLogic.js';
import ActionProcessor from './ActionProcessor.js';

class GameStateManager {
  constructor() {
    // Event listeners for state changes
    this.listeners = new Set();

    // Core game state (shared across players)
    this.state = {
      // --- GAME FLOW ---
      turnPhase: 'preGame',
      turn: 1,
      currentPlayer: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      firstPlayerOverride: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      winner: null,

      // --- PLAYER STATES ---
      player1: gameEngine.initialPlayerState('Player 1', startingDecklist),
      player2: gameEngine.initialPlayerState('Player 2', startingDecklist),

      // --- SHIP PLACEMENT ---
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      shieldsToAllocate: 0,

      // --- DRONE SELECTION ---
      droneSelectionPool: [],
      droneSelectionTrio: [],

      // --- GAME LOG ---
      gameLog: [],

      // --- MULTIPLAYER STATE ---
      isHost: false,
      isGuest: false,
      isConnected: false,
      opponentId: null,
      gameMode: 'local', // 'local', 'host', 'guest'
    };

    // Initialize action processor
    this.actionProcessor = new ActionProcessor(this);

    // Initialize state
    this.reset();
  }

  // --- EVENT SYSTEM ---

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function called when state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   * @param {string} type - Type of change
   * @param {Object} payload - Additional data
   */
  emit(type, payload = {}) {
    this.listeners.forEach(listener => {
      try {
        listener({ type, payload, state: this.getState() });
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  // --- STATE ACCESS ---

  /**
   * Get current state (read-only)
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get specific state property
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Update state and notify listeners
   */
  setState(updates, eventType = 'STATE_UPDATE') {
    const prevState = { ...this.state };

    // Validate state consistency before update
    this.validateStateUpdate(updates, prevState);

    this.state = { ...this.state, ...updates };
    this.emit(eventType, { updates, prevState });
  }

  /**
   * Validate state updates for consistency and race conditions
   */
  validateStateUpdate(updates, prevState) {
    // Check for concurrent action processing - only warn about external updates
    // ActionProcessor is allowed to update state during action processing
    if (this.actionProcessor.isActionInProgress() && Object.keys(updates).length > 0) {
      // Get the current call stack to see if this update is coming from ActionProcessor
      const stack = new Error().stack;
      const isFromActionProcessor = stack && stack.includes('ActionProcessor');

      if (!isFromActionProcessor) {
        const dangerousUpdates = ['player1', 'player2', 'turnPhase', 'currentPlayer'];
        const hasDangerousUpdate = dangerousUpdates.some(key => key in updates);

        if (hasDangerousUpdate) {
          console.warn('Race condition detected: External state update during action processing', {
            updates: Object.keys(updates),
            actionInProgress: true,
            queueLength: this.actionProcessor.getQueueLength(),
            stack: stack?.split('\n').slice(0, 5) // First 5 lines of stack for debugging
          });
        }
      }
    }

    // Validate player state consistency
    if (updates.player1 || updates.player2) {
      this.validatePlayerStates(updates.player1 || prevState.player1, updates.player2 || prevState.player2);
    }

    // Validate turn phase transitions
    if (updates.turnPhase && updates.turnPhase !== prevState.turnPhase) {
      this.validateTurnPhaseTransition(prevState.turnPhase, updates.turnPhase);
    }
  }

  /**
   * Validate player states for data integrity
   */
  validatePlayerStates(player1, player2) {
    if (!player1 || !player2) return;

    // Check for negative values
    const validatePlayerValues = (player, playerId) => {
      if (player.energy < 0) {
        console.error(`Invalid state: ${playerId} has negative energy: ${player.energy}`);
      }
      if (player.deploymentBudget < 0) {
        console.error(`Invalid state: ${playerId} has negative deployment budget: ${player.deploymentBudget}`);
      }
    };

    validatePlayerValues(player1, 'player1');
    validatePlayerValues(player2, 'player2');

    // Check for duplicate drone IDs
    const allDroneIds = new Set();
    [player1, player2].forEach((player, playerIndex) => {
      Object.values(player.dronesOnBoard).forEach(lane => {
        lane.forEach(drone => {
          if (allDroneIds.has(drone.id)) {
            console.error(`Duplicate drone ID detected: ${drone.id} in player${playerIndex + 1}`);
          }
          allDroneIds.add(drone.id);
        });
      });
    });
  }

  /**
   * Validate turn phase transitions
   */
  validateTurnPhaseTransition(fromPhase, toPhase) {
    const validTransitions = {
      'preGame': ['droneSelection', 'deckSelection'],
      'droneSelection': ['deckSelection'],
      'deckSelection': ['placement'],
      'placement': ['initialDraw', 'deployment'],
      'initialDraw': ['deployment'],
      'deployment': ['action', 'roundEnd'],
      'action': ['deployment', 'roundEnd', 'gameEnd'],
      'roundEnd': ['deployment', 'gameEnd'],
      'gameEnd': []
    };

    if (!validTransitions[fromPhase]?.includes(toPhase)) {
      console.warn(`Invalid turn phase transition: ${fromPhase} -> ${toPhase}`);
    }
  }

  // --- GAME STATE METHODS ---

  /**
   * Reset game to initial state
   */
  reset() {
    const initialState = {
      turnPhase: 'preGame',
      turn: 1,
      currentPlayer: null,
      firstPlayerOfRound: null,
      firstPasserOfPreviousRound: null,
      firstPlayerOverride: null,
      passInfo: { firstPasser: null, player1Passed: false, player2Passed: false },
      winner: null,
      player1: gameEngine.initialPlayerState('Player 1', startingDecklist),
      player2: gameEngine.initialPlayerState('Player 2', startingDecklist),
      placedSections: [],
      opponentPlacedSections: [],
      unplacedSections: [],
      shieldsToAllocate: 0,
      droneSelectionPool: [],
      droneSelectionTrio: [],
      gameLog: [],
    };

    this.setState(initialState, 'GAME_RESET');
  }

  /**
   * Set multiplayer mode and role
   */
  setMultiplayerMode(mode, isHost = false) {
    this.setState({
      gameMode: mode,
      isHost: isHost && mode !== 'local',
      isGuest: !isHost && mode !== 'local',
    }, 'MULTIPLAYER_MODE_SET');
  }

  /**
   * Update player states
   */
  updatePlayers(player1Updates = {}, player2Updates = {}) {
    const updates = {};
    if (Object.keys(player1Updates).length > 0) {
      updates.player1 = { ...this.state.player1, ...player1Updates };
    }
    if (Object.keys(player2Updates).length > 0) {
      updates.player2 = { ...this.state.player2, ...player2Updates };
    }

    if (Object.keys(updates).length > 0) {
      this.setState(updates, 'PLAYERS_UPDATED');
    }
  }

  /**
   * Update specific player state directly
   */
  updatePlayerState(playerId, updates) {
    if (playerId === 'player1') {
      this.updatePlayers(updates, {});
    } else if (playerId === 'player2') {
      this.updatePlayers({}, updates);
    }
  }

  /**
   * Set player states directly (for gameLogic integration)
   */
  setPlayerStates(newPlayer1, newPlayer2) {
    this.setState({
      player1: newPlayer1,
      player2: newPlayer2
    }, 'PLAYER_STATES_SET');
  }

  /**
   * Set current player
   */
  setCurrentPlayer(playerId) {
    this.setState({ currentPlayer: playerId }, 'CURRENT_PLAYER_CHANGED');
  }

  /**
   * Set turn phase
   */
  setTurnPhase(phase) {
    this.setState({ turnPhase: phase }, 'TURN_PHASE_CHANGED');
  }

  /**
   * Set first player of round
   */
  setFirstPlayerOfRound(playerId) {
    this.setState({ firstPlayerOfRound: playerId }, 'FIRST_PLAYER_OF_ROUND_SET');
  }

  /**
   * Set first passer of previous round
   */
  setFirstPasserOfPreviousRound(playerId) {
    this.setState({ firstPasserOfPreviousRound: playerId }, 'FIRST_PASSER_OF_PREVIOUS_ROUND_SET');
  }

  /**
   * Set first player override
   */
  setFirstPlayerOverride(playerId) {
    this.setState({ firstPlayerOverride: playerId }, 'FIRST_PLAYER_OVERRIDE_SET');
  }

  /**
   * Update pass information
   */
  updatePassInfo(passUpdates) {
    const updatedPassInfo = { ...this.state.passInfo, ...passUpdates };
    this.setState({ passInfo: updatedPassInfo }, 'PASS_INFO_UPDATED');
  }

  /**
   * Set pass information directly
   */
  setPassInfo(passInfo) {
    this.setState({ passInfo: passInfo }, 'PASS_INFO_SET');
  }

  /**
   * Check if it's the local player's turn (for multiplayer)
   */
  isMyTurn() {
    if (this.state.gameMode === 'local') return true;
    if (this.state.gameMode === 'host') return this.state.currentPlayer === 'player1';
    if (this.state.gameMode === 'guest') return this.state.currentPlayer === 'player2';
    return false;
  }

  /**
   * Get local player ID based on role
   */
  getLocalPlayerId() {
    if (this.state.gameMode === 'local') return 'player1'; // For local AI games
    if (this.state.gameMode === 'host') return 'player1';
    if (this.state.gameMode === 'guest') return 'player2';
    return 'player1';
  }

  /**
   * Get opponent player ID
   */
  getOpponentPlayerId() {
    const localId = this.getLocalPlayerId();
    return localId === 'player1' ? 'player2' : 'player1';
  }

  /**
   * Get local player state object
   */
  getLocalPlayerState() {
    const localId = this.getLocalPlayerId();
    return this.state[localId];
  }

  /**
   * Get opponent player state object
   */
  getOpponentPlayerState() {
    const opponentId = this.getOpponentPlayerId();
    return this.state[opponentId];
  }

  /**
   * Check if a given player ID is the local player (for UI perspective)
   */
  isLocalPlayer(playerId) {
    return playerId === this.getLocalPlayerId();
  }

  /**
   * Get placed sections for local player (UI perspective)
   */
  getLocalPlacedSections() {
    if (this.state.gameMode === 'local') return this.state.placedSections;
    if (this.state.gameMode === 'host') return this.state.placedSections;
    if (this.state.gameMode === 'guest') return this.state.opponentPlacedSections;
    return this.state.placedSections;
  }

  /**
   * Get placed sections for opponent (UI perspective)
   */
  getOpponentPlacedSections() {
    if (this.state.gameMode === 'local') return this.state.opponentPlacedSections;
    if (this.state.gameMode === 'host') return this.state.opponentPlacedSections;
    if (this.state.gameMode === 'guest') return this.state.placedSections;
    return this.state.opponentPlacedSections;
  }

  /**
   * Add log entry
   */
  addLogEntry(entry, debugSource = null, aiDecisionContext = null) {
    // Merge debugSource and aiDecisionContext into the entry object
    const enhancedEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now(),
      round: entry.round || this.state.turn
    };

    // Add debugSource if provided
    if (debugSource) {
      enhancedEntry.debugSource = debugSource;
    }

    // Add aiDecisionContext if provided
    if (aiDecisionContext) {
      enhancedEntry.aiDecisionContext = aiDecisionContext;
    }

    const updatedLog = [...this.state.gameLog, enhancedEntry];
    this.setState({ gameLog: updatedLog }, 'LOG_ENTRY_ADDED');
  }

  /**
   * Update pass information
   */
  updatePassInfo(passUpdates) {
    const updatedPassInfo = { ...this.state.passInfo, ...passUpdates };
    this.setState({ passInfo: updatedPassInfo }, 'PASS_INFO_UPDATED');
  }

  /**
   * Set winner
   */
  setWinner(winnerId) {
    this.setState({ winner: winnerId }, 'GAME_ENDED');
  }

  // --- ACTION PROCESSING ---

  /**
   * Process a game action through the action queue
   * @param {string} actionType - Type of action (attack, ability, deployment, etc.)
   * @param {Object} payload - Action-specific data
   * @returns {Promise} Resolves when action is complete
   */
  async processAction(actionType, payload) {
    return await this.actionProcessor.queueAction({
      type: actionType,
      payload: payload
    });
  }

  /**
   * Check if any actions are currently being processed
   */
  isActionInProgress() {
    return this.actionProcessor.isActionInProgress();
  }

  /**
   * Get current action queue length
   */
  getActionQueueLength() {
    return this.actionProcessor.getQueueLength();
  }

  /**
   * Emergency action queue clear (use with caution)
   */
  clearActionQueue() {
    this.actionProcessor.clearQueue();
  }
}

// Create singleton instance
const gameStateManager = new GameStateManager();

export default gameStateManager;