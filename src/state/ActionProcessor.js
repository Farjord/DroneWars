// ========================================
// ACTION PROCESSOR
// ========================================
// Centralized action processing system to prevent race conditions.
// All game actions must go through this processor to ensure serialization.

import { gameEngine } from '../logic/gameLogic.js';
import aiPhaseProcessor from './AIPhaseProcessor.js';
import GameDataService from '../services/GameDataService.js';

class ActionProcessor {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.gameDataService = new GameDataService(gameStateManager);

    // Wrapper function for game logic compatibility
    this.effectiveStatsWrapper = (drone, lane) => {
      return this.gameDataService.getEffectiveStats(drone, lane);
    };

    this.actionQueue = [];
    this.isProcessing = false;
    this.p2pManager = null;
    this.actionLocks = {
      attack: false,
      ability: false,
      deployment: false,
      cardPlay: false,
      shipAbility: false,
      turnTransition: false,
      phaseTransition: false,
      roundStart: false,
      reallocateShields: false,
      aiAction: false,
      aiTurn: false,
      playerPass: false,
      aiShipPlacement: false,
      commitment: false,
      processFirstPlayerDetermination: false
    };
  }

  /**
   * Set P2P manager for multiplayer support
   * @param {Object} p2pManager - P2P manager instance
   */
  setP2PManager(p2pManager) {
    this.p2pManager = p2pManager;
  }


  /**
   * Queue an action for processing
   * @param {Object} action - Action object with type and payload
   * @returns {Promise} Resolves when action is complete
   */
  async queueAction(action) {
    return new Promise((resolve, reject) => {
      this.actionQueue.push({
        ...action,
        resolve,
        reject,
        timestamp: Date.now()
      });
      this.processQueue();
    });
  }

  /**
   * Process the action queue serially
   */
  async processQueue() {
    if (this.isProcessing || this.actionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.actionQueue.length > 0) {
        const action = this.actionQueue.shift();

        try {
          const result = await this.processAction(action);
          action.resolve(result);
        } catch (error) {
          console.error('Action processing error:', error);
          action.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single action
   * @param {Object} action - Action to process
   */
  async processAction(action) {
    const { type, payload, isNetworkAction = false } = action;

    // Get current state for validation
    const currentState = this.gameStateManager.getState();

    // PASS STATE VALIDATION - Prevent actions after players have passed
    if (currentState.passInfo) {
      // Actions that should be blocked if current player has passed
      const playerActionTypes = ['attack', 'ability', 'deployment', 'cardPlay', 'shipAbility'];
      if (playerActionTypes.includes(type)) {
        // Determine the current player for this action
        let actionPlayerId = payload.playerId || currentState.currentPlayer;

        // For AI turns, the player is specified in payload
        if (type === 'aiTurn' && payload.playerId) {
          actionPlayerId = payload.playerId;
        }

        // Check if the player has already passed
        const playerPassKey = `${actionPlayerId}Passed`;
        if (currentState.passInfo[playerPassKey]) {
          console.log(`[PASS VALIDATION] Blocking ${type} action - ${actionPlayerId} has already passed`);
          throw new Error(`Cannot perform ${type} action: ${actionPlayerId} has already passed`);
        }
      }
    }

    // Handle shield allocation actions via commitment system
    if (currentState.turnPhase === 'allocateShields') {
      if (type === 'allocateShield') {
        console.log(`🛡️ Processing allocateShield action`);
        // TODO: Implement shield allocation via gameEngine
        return { success: true, message: 'Shield allocation not yet implemented in new system' };
      }
      if (type === 'resetShieldAllocation') {
        console.log(`🔄 Processing resetShieldAllocation action`);
        // TODO: Implement shield reset via gameEngine
        return { success: true, message: 'Shield reset not yet implemented in new system' };
      }
      if (type === 'endShieldAllocation') {
        console.log(`🏁 Processing endShieldAllocation action`);
        // Use commitment system for phase completion
        return await this.processCommitment({
          playerId: payload.playerId,
          phase: 'allocateShields',
          actionData: { shieldAllocation: [] }
        });
      }
    }

    // Check for action-specific locks
    if (this.actionLocks[type]) {
      throw new Error(`Action ${type} is currently locked`);
    }

    // Send to peer BEFORE processing locally (unless this is a network action)
    if (!isNetworkAction && this.p2pManager && this.p2pManager.isConnected) {
      const gameMode = this.gameStateManager.get('gameMode');
      if (gameMode !== 'local') {
        console.log(`[P2P ACTION] Sending action to peer:`, { type, payload });
        this.p2pManager.sendData({
          type: 'ACTION',
          action: { type, payload },
          timestamp: Date.now()
        });
      }
    }

    // Set lock for this action type
    this.actionLocks[type] = true;

    try {
      switch (type) {
        case 'attack':
          return await this.processAttack(payload);

        case 'ability':
          return await this.processAbility(payload);

        case 'deployment':
          return await this.processDeployment(payload);

        case 'cardPlay':
          return await this.processCardPlay(payload);

        case 'shipAbility':
          return await this.processShipAbility(payload);

        case 'turnTransition':
          return await this.processTurnTransition(payload);

        case 'phaseTransition':
          return await this.processPhaseTransition(payload);

        case 'roundStart':
          return await this.processRoundStart(payload);

        case 'reallocateShields':
          return await this.processReallocateShields(payload);

        case 'aiAction':
          return await this.processAiAction(payload);

        case 'aiTurn':
          return await this.processAiTurn(payload);

        case 'playerPass':
          return await this.processPlayerPass(payload);

        case 'aiShipPlacement':
          return await this.processAiShipPlacement(payload);

        case 'optionalDiscard':
          return await this.processOptionalDiscard(payload);

        case 'acknowledgeFirstPlayer':
          return await this.acknowledgeFirstPlayer(payload.playerId);

        case 'processFirstPlayerDetermination':
          return await this.processFirstPlayerDetermination();

        case 'commitment':
          return await this.processCommitment(payload);

        case 'draw':
          return await this.processDraw(payload);

        case 'energyReset':
          return await this.processEnergyReset(payload);

        default:
          throw new Error(`Unknown action type: ${type}`);
      }
    } finally {
      // Always release the lock
      this.actionLocks[type] = false;
    }
  }

  /**
   * Process attack action
   */
  async processAttack(payload) {
    const { attackDetails } = payload;

    const currentState = this.gameStateManager.getState();
    const allPlacedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    const logCallback = (entry) => {
      this.gameStateManager.addLogEntry(entry, 'resolveAttack',
        attackDetails.attackingPlayer === 'player2' ? attackDetails.aiContext : null);
    };

    // UI callbacks are handled by App.jsx
    const triggerExplosion = () => {};
    const triggerHitAnimation = () => {};

    const result = gameEngine.resolveAttack(
      attackDetails,
      { player1: currentState.player1, player2: currentState.player2 },
      allPlacedSections,
      logCallback,
      triggerExplosion,
      triggerHitAnimation
    );

    // Update game state with results
    this.gameStateManager.setPlayerStates(
      result.newPlayerStates.player1,
      result.newPlayerStates.player2
    );

    // Handle automatic turn transition if needed
    if (result.attackResult && result.attackResult.shouldEndTurn) {
      await this.processTurnTransition({
        newPlayer: attackDetails.attackingPlayer === 'player1' ? 'player2' : 'player1'
      });
    }

    return result;
  }

  /**
   * Process ability action
   */
  async processAbility(payload) {
    const { droneId, abilityIndex, targetId } = payload;

    const currentState = this.gameStateManager.getState();
    const playerStates = { player1: currentState.player1, player2: currentState.player2 };
    const allPlacedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    // Find the drone and ability
    let userDrone = null;
    let targetDrone = null;

    // Search for the drone in all lanes
    Object.values(playerStates).forEach(player => {
      Object.values(player.dronesOnBoard).forEach(lane => {
        lane.forEach(drone => {
          if (drone.id === droneId) {
            userDrone = drone;
          }
          if (drone.id === targetId) {
            targetDrone = drone;
          }
        });
      });
    });

    if (!userDrone || !userDrone.abilities[abilityIndex]) {
      throw new Error(`Invalid drone or ability: ${droneId}, ${abilityIndex}`);
    }

    const ability = userDrone.abilities[abilityIndex];

    const logCallback = (entry) => {
      this.gameStateManager.addLogEntry(entry, 'resolveAbility');
    };

    const resolveAttackCallback = async (attackDetails) => {
      return await this.processAttack({ attackDetails });
    };

    const result = gameEngine.resolveAbility(
      ability,
      userDrone,
      targetDrone,
      playerStates,
      allPlacedSections,
      logCallback,
      resolveAttackCallback
    );

    // Update game state with results
    this.gameStateManager.setPlayerStates(
      result.newPlayerStates.player1,
      result.newPlayerStates.player2
    );

    // Handle automatic turn transition if needed
    if (result.shouldEndTurn) {
      const currentState = this.gameStateManager.getState();
      await this.processTurnTransition({
        newPlayer: currentState.currentPlayer === 'player1' ? 'player2' : 'player1'
      });
    }

    return result;
  }

  /**
   * Process deployment action
   */
  async processDeployment(payload) {
    const { droneData, laneId, playerId, turn } = payload;

    const currentState = this.gameStateManager.getState();
    const playerState = currentState[playerId];
    const opponentId = playerId === 'player1' ? 'player2' : 'player1';
    const opponentState = currentState[opponentId];

    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    const logCallback = (entry) => {
      this.gameStateManager.addLogEntry(entry);
    };

    const result = gameEngine.executeDeployment(
      droneData,
      laneId,
      turn || currentState.turn,
      playerState,
      opponentState,
      placedSections,
      logCallback
    );

    if (result.success) {
      // Update the specific player state
      if (playerId === 'player1') {
        this.gameStateManager.updatePlayers(result.newPlayerState, {});
      } else {
        this.gameStateManager.updatePlayers({}, result.newPlayerState);
      }

      // Handle turn transition after successful deployment
      await this.processTurnTransition({
        newPlayer: playerId === 'player1' ? 'player2' : 'player1'
      });
    }

    return result;
  }

  /**
   * Process card play action
   */
  async processCardPlay(payload) {
    const { card, targetId, playerId } = payload;

    const currentState = this.gameStateManager.getState();
    const playerStates = { player1: currentState.player1, player2: currentState.player2 };
    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    const callbacks = {
      logCallback: (entry) => this.gameStateManager.addLogEntry(entry),
      explosionCallback: () => {}, // UI effect - handled by App.jsx
      hitAnimationCallback: () => {}, // UI effect - handled by App.jsx
      resolveAttackCallback: async (attackPayload) => {
        // Recursively handle attack through action processor
        return await this.processAttack(attackPayload);
      }
    };

    const result = gameEngine.resolveCardPlay(
      card,
      targetId,
      playerId,
      playerStates,
      placedSections,
      callbacks
    );

    // Update game state with results
    this.gameStateManager.setPlayerStates(
      result.newPlayerStates.player1,
      result.newPlayerStates.player2
    );

    // Handle automatic turn transition if needed
    if (result.shouldEndTurn) {
      const currentState = this.gameStateManager.getState();
      await this.processTurnTransition({
        newPlayer: currentState.currentPlayer === 'player1' ? 'player2' : 'player1'
      });
    }

    return result;
  }

  /**
   * Process ship ability action
   */
  async processShipAbility(payload) {
    const { ability, sectionName, targetId, playerId } = payload;

    const currentState = this.gameStateManager.getState();
    const playerStates = { player1: currentState.player1, player2: currentState.player2 };
    const placedSections = {
      player1: currentState.placedSections,
      player2: currentState.opponentPlacedSections
    };

    const callbacks = {
      logCallback: (entry) => this.gameStateManager.addLogEntry(entry),
      explosionCallback: () => {}, // UI effect - handled by App.jsx
      hitAnimationCallback: () => {}, // UI effect - handled by App.jsx
      resolveAttackCallback: async (attackPayload) => {
        // Recursively handle attack through action processor
        return await this.processAttack(attackPayload);
      }
    };

    const result = gameEngine.resolveShipAbility(
      ability,
      sectionName,
      targetId,
      playerStates,
      placedSections,
      callbacks
    );

    // Update game state with results
    this.gameStateManager.setPlayerStates(
      result.newPlayerStates.player1,
      result.newPlayerStates.player2
    );

    // Handle automatic turn transition if needed
    if (result.shouldEndTurn) {
      const currentState = this.gameStateManager.getState();
      await this.processTurnTransition({
        newPlayer: currentState.currentPlayer === 'player1' ? 'player2' : 'player1'
      });
    }

    return result;
  }

  /**
   * Process turn transition
   */
  async processTurnTransition(payload) {
    const { newPhase, newPlayer } = payload;

    console.log(`[TURN TRANSITION DEBUG] Processing turn transition:`, { newPhase, newPlayer });

    const currentState = this.gameStateManager.getState();
    console.log(`[TURN TRANSITION DEBUG] Current state before transition:`, {
      turnPhase: currentState.turnPhase,
      currentPlayer: currentState.currentPlayer,
      turn: currentState.turn
    });

    // Use gameLogic function to calculate transition effects
    const transitionResult = gameEngine.calculateTurnTransition(
      currentState.currentPlayer,
      currentState.passInfo,
      currentState.turnPhase,
      currentState.winner
    );

    // Apply explicit changes (overrides calculated logic if provided)
    if (newPhase) {
      console.log(`[TURN TRANSITION DEBUG] Setting new phase: ${newPhase}`);
      this.gameStateManager.setTurnPhase(newPhase);
    }

    if (newPlayer) {
      const currentState = this.gameStateManager.getState();
      let actualNewPlayer = newPlayer;

      // Check if trying to switch to a player who has passed
      if (currentState.passInfo && currentState.passInfo[`${newPlayer}Passed`]) {
        // Keep turn with current player instead
        actualNewPlayer = currentState.currentPlayer;
        console.log(`[TURN TRANSITION DEBUG] ${newPlayer} has passed, keeping turn with ${actualNewPlayer}`);
      } else {
        console.log(`[TURN TRANSITION DEBUG] Setting new player: ${actualNewPlayer}`);
      }

      // Always set the player (even if same) to trigger state change event
      this.gameStateManager.setCurrentPlayer(actualNewPlayer);
    }

    const newState = this.gameStateManager.getState();
    console.log(`[TURN TRANSITION DEBUG] State after transition:`, {
      turnPhase: newState.turnPhase,
      currentPlayer: newState.currentPlayer,
      turn: newState.turn,
      transitionType: transitionResult.type
    });

    return { success: true, transitionType: transitionResult.type };
  }

  /**
   * Process phase transition action
   */
  async processPhaseTransition(payload) {
    const { newPhase, resetPassInfo = true } = payload;

    const currentState = this.gameStateManager.getState();

    // Guard against re-entering same phase
    if (currentState.turnPhase === newPhase) {
      console.log(`[PHASE TRANSITION DEBUG] Skipping redundant transition to same phase: ${newPhase}`);
      return { success: true, message: 'Already in phase' };
    }

    console.log(`[PHASE TRANSITION DEBUG] Processing phase transition to: ${newPhase}`);

    // LOG PLACEMENT DATA BEFORE TRANSITION
    console.log(`[PLACEMENT DATA DEBUG] BEFORE transition to ${newPhase}:`, {
      currentPhase: currentState.turnPhase,
      placedSections: currentState.placedSections,
      opponentPlacedSections: currentState.opponentPlacedSections
    });

    const stateUpdates = {};

    // Handle phase-specific initialization
    if (newPhase === 'allocateShields') {
      // Initialize shield allocation for local player
      const localPlayerId = this.gameStateManager.getLocalPlayerId();
      const localPlayerState = currentState[localPlayerId];

      // Calculate shields available this turn
      const effectiveStats = this.gameDataService.getEffectiveShipStats(localPlayerState, this.gameStateManager.getLocalPlacedSections());
      const shieldsPerTurn = effectiveStats.totals.shieldsPerTurn;

      stateUpdates.shieldsToAllocate = shieldsPerTurn;
      console.log(`[SHIELD ALLOCATION DEBUG] Initialized shields to allocate: ${shieldsPerTurn}`);
    } else if (newPhase === 'placement') {
      // Initialize placement phase
      stateUpdates.unplacedSections = ['bridge', 'powerCell', 'droneControlHub'];
      stateUpdates.placedSections = Array(3).fill(null);
      stateUpdates.opponentPlacedSections = Array(3).fill(null);
      console.log(`[PLACEMENT DEBUG] Initialized placement phase`);
    }

    // Apply the phase change and any phase-specific updates
    stateUpdates.turnPhase = newPhase;
    this.gameStateManager.setState(stateUpdates);

    // Reset commitments for the new phase (clean slate)
    this.clearPhaseCommitments();

    // Reset pass info if requested (typical for new phase)
    if (resetPassInfo) {
      this.gameStateManager.setPassInfo({
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      });
    }

    console.log(`[PHASE TRANSITION DEBUG] Phase transition complete: ${currentState.turnPhase} → ${newPhase}`);

    // LOG PLACEMENT DATA AFTER TRANSITION
    const finalState = this.gameStateManager.getState();
    console.log(`[PLACEMENT DATA DEBUG] AFTER transition to ${newPhase}:`, {
      newPhase: finalState.turnPhase,
      placedSections: finalState.placedSections,
      opponentPlacedSections: finalState.opponentPlacedSections,
      stateUpdatesApplied: stateUpdates
    });

    return { success: true, newPhase };
  }

  /**
   * Process round start action
   */
  async processRoundStart(payload) {
    const { newTurn, newPhase = 'deployment', firstPlayer } = payload;

    console.log(`[ROUND START DEBUG] Processing round start for turn: ${newTurn}`);

    const currentState = this.gameStateManager.getState();

    // Use gameLogic functions to calculate round start effects
    const determinedFirstPlayer = firstPlayer || gameEngine.determineFirstPlayer(
      newTurn,
      currentState.firstPlayerOverride,
      currentState.firstPasserOfPreviousRound
    );

    // Calculate effective ship stats for both players
    const player1EffectiveStats = this.gameDataService.getEffectiveShipStats(
      currentState.player1,
      currentState.placedSections
    );
    const player2EffectiveStats = this.gameDataService.getEffectiveShipStats(
      currentState.player2,
      currentState.opponentPlacedSections
    );

    // Calculate new player states for the round using computed stats
    const newPlayer1State = gameEngine.calculateNewRoundPlayerState(
      currentState.player1,
      newTurn,
      player1EffectiveStats,
      currentState.player2,
      currentState.placedSections
    );

    const newPlayer2State = gameEngine.calculateNewRoundPlayerState(
      currentState.player2,
      newTurn,
      player2EffectiveStats,
      currentState.player1,
      currentState.opponentPlacedSections
    );

    // Apply all round start changes
    this.gameStateManager.setState({
      turn: newTurn,
      turnPhase: newPhase,
      currentPlayer: determinedFirstPlayer,
      firstPlayerOfRound: determinedFirstPlayer,
      passInfo: {
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      }
    });

    // Update player states
    this.gameStateManager.setPlayerStates(newPlayer1State, newPlayer2State);

    console.log(`[ROUND START DEBUG] Round start complete - Turn ${newTurn}, First player: ${determinedFirstPlayer}`);

    return {
      success: true,
      newTurn,
      newPhase,
      firstPlayer: determinedFirstPlayer,
      playerStates: { player1: newPlayer1State, player2: newPlayer2State }
    };
  }


  /**
   * Process shield reallocation action (ACTION PHASE ONLY)
   * Handles shield reallocation abilities during action phase gameplay.
   * Round start shield allocation should use direct GameStateManager updates.
   */
  async processReallocateShields(payload) {
    const {
      action, // 'remove', 'add', or 'restore'
      sectionName,
      originalShipSections, // for 'restore' action
      playerId = this.gameStateManager.getLocalPlayerId()
    } = payload;

    const currentState = this.gameStateManager.getState();

    // Validate this is only used during action phase
    if (currentState.turnPhase !== 'action') {
      throw new Error(`Shield reallocation through ActionProcessor is only valid during action phase, not ${currentState.turnPhase}`);
    }

    console.log(`[SHIELD REALLOCATION DEBUG] Processing action phase shield reallocation:`, { action, sectionName, playerId });

    const playerState = currentState[playerId];

    if (action === 'remove') {
      // Validate shield removal
      const section = playerState.shipSections[sectionName];
      if (!section || section.allocatedShields <= 0) {
        return {
          success: false,
          error: 'Cannot remove shield from this section'
        };
      }

      // Create new player state with shield removed
      const newShipSections = {
        ...playerState.shipSections,
        [sectionName]: {
          ...playerState.shipSections[sectionName],
          allocatedShields: playerState.shipSections[sectionName].allocatedShields - 1
        }
      };

      const newPlayerState = {
        ...playerState,
        shipSections: newShipSections
      };

      this.gameStateManager.updatePlayerState(playerId, newPlayerState);

      console.log(`[SHIELD REALLOCATION DEBUG] Shield removed from ${sectionName}`);
      return {
        success: true,
        action: 'remove',
        sectionName,
        newPlayerState
      };

    } else if (action === 'add') {
      // Validate shield addition - need access to placed sections for effective max calculation
      const placedSections = playerId === 'player1' ? currentState.placedSections : currentState.opponentPlacedSections;
      const effectiveMaxShields = gameEngine.getEffectiveSectionMaxShields(sectionName, playerState, placedSections);
      const section = playerState.shipSections[sectionName];

      if (!section || section.allocatedShields >= effectiveMaxShields) {
        return {
          success: false,
          error: 'Cannot add shield to this section'
        };
      }

      // Create new player state with shield added
      const newShipSections = {
        ...playerState.shipSections,
        [sectionName]: {
          ...playerState.shipSections[sectionName],
          allocatedShields: playerState.shipSections[sectionName].allocatedShields + 1
        }
      };

      const newPlayerState = {
        ...playerState,
        shipSections: newShipSections
      };

      this.gameStateManager.updatePlayerState(playerId, newPlayerState);

      console.log(`[SHIELD REALLOCATION DEBUG] Shield added to ${sectionName}`);
      return {
        success: true,
        action: 'add',
        sectionName,
        newPlayerState
      };

    } else if (action === 'restore') {
      // Restore original shield configuration
      if (!originalShipSections) {
        return {
          success: false,
          error: 'No original ship sections provided for restore'
        };
      }

      const newPlayerState = {
        ...playerState,
        shipSections: originalShipSections
      };

      this.gameStateManager.updatePlayerState(playerId, newPlayerState);

      console.log(`[SHIELD REALLOCATION DEBUG] Shield allocation restored to original state`);
      return {
        success: true,
        action: 'restore',
        newPlayerState
      };
    }

    return {
      success: false,
      error: `Unknown reallocation action: ${action}`
    };
  }

  /**
   * Process AI action
   */
  async processAiAction(payload) {
    const { aiDecision } = payload;

    // Route AI decision to appropriate action processor
    switch (aiDecision.type) {
      case 'deploy':
        const { droneToDeploy, targetLane } = aiDecision.payload;
        return await this.processDeployment({
          droneData: droneToDeploy,
          laneId: targetLane,
          playerId: 'player2', // AI is always player2
          turn: this.gameStateManager.get('turn')
        });

      case 'action':
        const chosenAction = aiDecision.payload;
        switch (chosenAction.type) {
          case 'attack':
            return await this.processAttack({
              attackDetails: {
                attackerId: chosenAction.attacker.id,
                targetId: chosenAction.target.id,
                attackingPlayer: 'player2',
                aiContext: aiDecision.logContext
              }
            });

          case 'play_card':
            return await this.processCardPlay({
              card: chosenAction.card,
              targetId: chosenAction.target?.id,
              playerId: 'player2'
            });

          case 'move':
            // Handle move through game engine
            const currentState = this.gameStateManager.getState();
            const moveCard = {
              name: 'AI Move',
              cost: 0,
              effect: { type: 'MOVE', properties: [] }
            };

            const moveResult = gameEngine.resolveSingleMove(
              moveCard,
              chosenAction.drone,
              chosenAction.fromLane,
              chosenAction.toLane,
              currentState.player2,
              currentState.player1,
              {
                player1: currentState.placedSections,
                player2: currentState.opponentPlacedSections
              },
              {
                logCallback: () => {},
                applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
                updateAurasCallback: gameEngine.updateAuras
              }
            );

            this.gameStateManager.updatePlayerState('player2', moveResult.newPlayerState);
            return moveResult;

          case 'ability':
            return await this.processAbility({
              droneId: chosenAction.drone.id,
              abilityIndex: chosenAction.abilityIndex,
              targetId: chosenAction.target?.id
            });

          default:
            throw new Error(`Unknown AI action subtype: ${chosenAction.type}`);
        }

      case 'pass':
        // Handle AI pass - already handled by GameStateManager
        return { success: true, action: 'pass' };

      default:
        throw new Error(`Unknown AI action type: ${aiDecision.type}`);
    }
  }

  /**
   * Process AI turn - coordinates between AIPhaseProcessor and ActionProcessor
   */
  async processAiTurn(payload) {
    const { turnPhase, playerId } = payload;

    console.log(`[AI TURN DEBUG] Starting AI turn for ${playerId} in phase: ${turnPhase}`);

    // Get current state from GameStateManager
    const currentState = this.gameStateManager.getState();
    const passInfo = currentState.passInfo;

    console.log(`[AI TURN DEBUG] Current state:`, {
      turnPhase: currentState.turnPhase,
      currentPlayer: currentState.currentPlayer,
      turn: currentState.turn,
      passInfo: passInfo
    });

    // Check if AI should pass
    if (passInfo[playerId + 'Passed']) {
      console.log(`[AI TURN DEBUG] AI already passed, returning`);
      return { success: true, action: 'already_passed' };
    }

    let aiDecision;

    // Delegate to AIPhaseProcessor for AI decision making
    console.log(`[AI TURN DEBUG] Delegating to AIPhaseProcessor for phase: ${turnPhase}`);
    if (turnPhase === 'deployment') {
      aiDecision = await aiPhaseProcessor.handleDeploymentTurn(currentState);
    } else if (turnPhase === 'action') {
      aiDecision = await aiPhaseProcessor.handleActionTurn(currentState);
    } else {
      aiDecision = { type: 'pass' };
      console.log(`[AI TURN DEBUG] AI passing due to unknown phase: ${turnPhase}`);
    }

    console.log(`[AI TURN DEBUG] AI decision from AIPhaseProcessor:`, aiDecision);

    // Process the AI's decision through appropriate action handlers
    console.log(`[AI TURN DEBUG] Processing AI decision:`, aiDecision.type);
    const result = await this.processAiDecision(aiDecision, playerId);
    console.log(`[AI TURN DEBUG] AI decision result:`, result);

    return result;
  }

  /**
   * Process AI decision through appropriate handlers
   */
  async processAiDecision(aiDecision, playerId) {
    console.log(`[AI DECISION DEBUG] Processing AI decision type: ${aiDecision.type}`);

    switch (aiDecision.type) {
      case 'deploy':
        const { droneToDeploy, targetLane } = aiDecision.payload;
        console.log(`[AI DECISION DEBUG] AI deploying:`, { droneToDeploy: droneToDeploy?.name, targetLane });

        const deployResult = await this.processDeployment({
          droneData: droneToDeploy,
          laneId: targetLane,
          playerId: playerId,
          turn: this.gameStateManager.get('turn')
        });

        console.log(`[AI DECISION DEBUG] Deployment result:`, deployResult);

        // Handle turn transition for deployment
        if (deployResult.success) {
          console.log(`[AI DECISION DEBUG] Deployment successful, transitioning turn`);
          await this.processTurnTransition({
            newPlayer: playerId === 'player1' ? 'player2' : 'player1'
          });
          console.log(`[AI DECISION DEBUG] Turn transition complete`);
        } else {
          console.log(`[AI DECISION DEBUG] Deployment failed, not transitioning turn`);
        }

        return deployResult;

      case 'action':
        const chosenAction = aiDecision.payload;
        let actionResult;

        switch (chosenAction.type) {
          case 'attack':
            actionResult = await this.processAttack({
              attackDetails: {
                attackerId: chosenAction.attacker.id,
                targetId: chosenAction.target.id,
                attackingPlayer: playerId,
                aiContext: aiDecision.logContext
              }
            });
            break;

          case 'play_card':
            actionResult = await this.processCardPlay({
              card: chosenAction.card,
              targetId: chosenAction.target?.id,
              playerId: playerId
            });
            break;

          case 'move':
            actionResult = await this.processMove(chosenAction, playerId);
            break;

          case 'ability':
            actionResult = await this.processAbility({
              droneId: chosenAction.drone.id,
              abilityIndex: chosenAction.abilityIndex,
              targetId: chosenAction.target?.id
            });
            break;

          default:
            throw new Error(`Unknown AI action subtype: ${chosenAction.type}`);
        }

        // Handle turn transition for action phase
        if (actionResult.shouldEndTurn !== false) {
          await this.processTurnTransition({
            newPlayer: playerId === 'player1' ? 'player2' : 'player1'
          });
        }

        return actionResult;

      case 'pass':
        console.log(`[AI DECISION DEBUG] AI passing`);
        // Handle AI pass
        const currentState = this.gameStateManager.getState();
        const wasFirstToPass = !currentState.passInfo[playerId === 'player1' ? 'player2Passed' : 'player1Passed'];

        console.log(`[AI DECISION DEBUG] Pass info before update:`, currentState.passInfo);

        this.gameStateManager.updatePassInfo({
          [playerId + 'Passed']: true,
          firstPasser: currentState.passInfo.firstPasser || (wasFirstToPass ? playerId : null)
        });

        const newPassInfo = this.gameStateManager.get('passInfo');
        console.log(`[AI DECISION DEBUG] Pass info after update:`, newPassInfo);

        // Check if both players have passed to end phase
        if (newPassInfo.player1Passed && newPassInfo.player2Passed) {
          console.log(`[AI DECISION DEBUG] Both players passed, transitioning phase`);
          if (currentState.turnPhase === 'deployment') {
            await this.processPhaseTransition({ newPhase: 'action' });
          } else if (currentState.turnPhase === 'action') {
            await this.processPhaseTransition({ newPhase: 'roundEnd' });
          }
        } else {
          console.log(`[AI DECISION DEBUG] Only AI passed, switching to other player`);
          // Switch to other player
          await this.processTurnTransition({
            newPlayer: playerId === 'player1' ? 'player2' : 'player1'
          });
        }

        return { success: true, action: 'pass' };

      default:
        throw new Error(`Unknown AI action type: ${aiDecision.type}`);
    }
  }

  /**
   * Process move action for AI
   */
  async processMove(chosenAction, playerId) {
    const currentState = this.gameStateManager.getState();
    const moveCard = {
      name: 'AI Move',
      cost: 0,
      effect: { type: 'MOVE', properties: [] }
    };

    const playerState = currentState[playerId];
    const opponentState = currentState[playerId === 'player1' ? 'player2' : 'player1'];

    const moveResult = gameEngine.resolveSingleMove(
      moveCard,
      chosenAction.drone,
      chosenAction.fromLane,
      chosenAction.toLane,
      playerState,
      opponentState,
      {
        player1: currentState.placedSections,
        player2: currentState.opponentPlacedSections
      },
      {
        logCallback: () => {},
        applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects,
        updateAurasCallback: gameEngine.updateAuras
      }
    );

    this.gameStateManager.updatePlayerState(playerId, moveResult.newPlayerState);
    return moveResult;
  }

  /**
   * Check if any actions are currently being processed
   */
  isActionInProgress() {
    return this.isProcessing || Object.values(this.actionLocks).some(locked => locked);
  }

  /**
   * Get current queue length
   */
  getQueueLength() {
    return this.actionQueue.length;
  }

  /**
   * Process action received from network peer
   * @param {Object} actionData - Action data from peer
   */
  async processNetworkAction(actionData) {
    const { action } = actionData;
    console.log(`[P2P ACTION] Processing network action:`, action);

    // Mark as network action to prevent re-sending
    const networkAction = {
      ...action,
      isNetworkAction: true
    };

    // Queue the network action for processing
    return await this.queueAction(networkAction);
  }

  /**
   * Process player pass action
   */
  async processPlayerPass(payload) {
    const { playerId, playerName, turnPhase, passInfo, opponentPlayerId } = payload;

    console.log('[PLAYER PASS DEBUG] Processing player pass through ActionProcessor:', {
      playerId,
      playerName,
      turnPhase,
      currentPassInfo: passInfo
    });

    const currentState = this.gameStateManager.getState();

    // Add log entry
    this.gameStateManager.addLogEntry({
      player: playerName,
      actionType: 'PASS',
      source: 'N/A',
      target: 'N/A',
      outcome: `Passed during ${turnPhase} phase.`
    }, 'playerPass');

    // Calculate pass info updates
    const opponentPassKey = `${opponentPlayerId}Passed`;
    const localPassKey = `${playerId}Passed`;
    const wasFirstToPass = !passInfo[opponentPassKey];
    const newPassInfo = {
      ...passInfo,
      [localPassKey]: true,
      firstPasser: passInfo.firstPasser || (wasFirstToPass ? playerId : null)
    };

    console.log('[PLAYER PASS DEBUG] Updating pass info:', newPassInfo);

    // Update pass info through GameStateManager
    this.gameStateManager.setPassInfo(newPassInfo, 'ActionProcessor');

    // Phase and turn transitions are now handled by SequentialPhaseManager
    // ActionProcessor only updates passInfo - SequentialPhaseManager detects changes and handles transitions

    // Sync to P2P if multiplayer
    if (this.p2pManager && this.p2pManager.isConnected) {
      this.p2pManager.sendAction('playerPass', {
        playerId,
        playerName,
        turnPhase,
        passInfo: newPassInfo
      });
    }

    return {
      success: true,
      newPassInfo
    };
  }

  /**
   * Process AI ship placement action
   */
  async processAiShipPlacement(payload) {
    const { placement, aiPersonality } = payload;

    console.log('[AI SHIP PLACEMENT] Processing AI ship placement:', {
      placement,
      aiPersonality
    });

    // Update opponent placed sections through GameStateManager
    console.error('🔥 CRITICAL - Setting opponentPlacedSections to:', placement);
    this.gameStateManager.setState({
      opponentPlacedSections: placement
    }, 'aiShipPlacement');

    // Verify it was set correctly
    const newState = this.gameStateManager.getState();
    console.error('🔥 CRITICAL - After setState, opponentPlacedSections is now:', newState.opponentPlacedSections);

    // Add log entry
    this.gameStateManager.addLogEntry({
      player: 'AI Opponent',
      actionType: 'SHIP_PLACEMENT',
      source: 'AI System',
      target: 'Ship Sections',
      outcome: `${aiPersonality} deployed ship sections: ${placement.join(', ')}`
    }, 'aiShipPlacement');

    // Sync to P2P if multiplayer (though this shouldn't happen for AI placement)
    if (this.p2pManager && this.p2pManager.isConnected) {
      this.p2pManager.sendAction('aiShipPlacement', {
        placement,
        aiPersonality
      });
    }

    return {
      success: true,
      placement
    };
  }


  /**
   * Process optional discard action
   */
  async processOptionalDiscard(payload) {
    const { playerId, cardsToDiscard } = payload;
    const currentState = this.gameStateManager.getState();

    console.log(`[OPTIONAL DISCARD DEBUG] Processing optional discard for ${playerId}:`, cardsToDiscard);

    if (!Array.isArray(cardsToDiscard)) {
      throw new Error('Cards to discard must be an array');
    }

    const playerState = currentState[playerId];
    if (!playerState) {
      throw new Error(`Player ${playerId} not found`);
    }

    // Remove cards from hand and add to discard pile
    const newHand = playerState.hand.filter(card =>
      !cardsToDiscard.some(discardCard => card.instanceId === discardCard.instanceId)
    );
    const newDiscardPile = [...playerState.discardPile, ...cardsToDiscard];

    // Update player state
    this.gameStateManager.updatePlayerState(playerId, {
      hand: newHand,
      discardPile: newDiscardPile
    });

    console.log(`[OPTIONAL DISCARD DEBUG] Discarded ${cardsToDiscard.length} cards for ${playerId}`);

    return {
      success: true,
      message: `Discarded ${cardsToDiscard.length} cards`,
      cardsDiscarded: cardsToDiscard
    };
  }

  /**
   * Process first player determination for the round
   * @returns {Object} First player determination result
   */
  async processFirstPlayerDetermination() {
    console.log('🎯 ActionProcessor: Processing first player determination');

    const currentState = this.gameStateManager.getState();

    // Import first player utilities
    const { determineFirstPlayer, getFirstPlayerReasonText } = await import('../utils/firstPlayerUtils.js');

    // Determine the first player
    const firstPlayer = determineFirstPlayer(
      currentState.turn,
      currentState.firstPlayerOverride,
      currentState.firstPasserOfPreviousRound
    );

    const reasonText = getFirstPlayerReasonText(
      currentState.turn,
      currentState.firstPlayerOverride,
      currentState.firstPasserOfPreviousRound
    );

    // Update state with first player information
    this.gameStateManager.updateState({
      currentPlayer: firstPlayer,
      firstPlayerOfRound: firstPlayer
    });

    console.log(`✅ First player determination complete: ${firstPlayer}`);

    return {
      success: true,
      firstPlayer,
      reasonText,
      turn: currentState.turn
    };
  }

  /**
   * Acknowledge first player determination
   * Handles first player determination acknowledgment
   * @param {string} playerId - Player acknowledging
   * @returns {Object} Acknowledgment result
   */
  async acknowledgeFirstPlayer(playerId) {
    console.log(`🎯 ActionProcessor: Processing first player acknowledgment for ${playerId}`);

    // Use the new commitment system for acknowledgments
    return await this.processCommitment({
      playerId,
      phase: 'determineFirstPlayer',
      actionData: { acknowledged: true }
    });
  }


  /**
   * Get phase commitment status
   * @param {string} phase - Phase name
   * @returns {Object|null} Commitment status
   */
  getPhaseCommitmentStatus(phase) {
    const currentState = this.gameStateManager.getState();

    if (!currentState.commitments[phase]) {
      return {
        phase,
        commitments: { player1: { completed: false }, player2: { completed: false } },
        bothComplete: false
      };
    }

    const commitments = currentState.commitments[phase];
    const bothComplete = commitments.player1.completed && commitments.player2.completed;

    return {
      phase,
      commitments,
      bothComplete
    };
  }

  /**
   * Clear commitments for a specific phase or all phases
   * @param {string} phase - Optional phase name, if not provided clears all
   */
  clearPhaseCommitments(phase = null) {
    const currentState = this.gameStateManager.getState();

    if (phase) {
      if (currentState.commitments[phase]) {
        currentState.commitments[phase] = {
          player1: { completed: false },
          player2: { completed: false }
        };
      }
      console.log(`🔄 Cleared commitments for phase: ${phase}`);
    } else {
      currentState.commitments = {};
      console.log('🔄 Cleared all phase commitments');
    }

    this.gameStateManager.updateState({
      commitments: currentState.commitments
    });
  }

  /**
   * Process commitment action for simultaneous phases
   * @param {Object} payload - Commitment payload
   * @returns {Object} Commitment result
   */
  async processCommitment(payload) {
    const { playerId, phase, actionData } = payload;

    console.log(`🤝 ActionProcessor: Processing ${phase} commitment for ${playerId}`);

    // Get current state
    const currentState = this.gameStateManager.getState();

    // Initialize commitments for this phase if not exists
    if (!currentState.commitments[phase]) {
      currentState.commitments[phase] = {
        player1: { completed: false },
        player2: { completed: false }
      };
    }

    // Store the commitment
    currentState.commitments[phase][playerId] = {
      completed: true,
      ...actionData
    };

    // Update the state
    this.gameStateManager.updateState({
      commitments: currentState.commitments
    });

    // Check if both players have committed
    const bothComplete = currentState.commitments[phase].player1.completed &&
                        currentState.commitments[phase].player2.completed;

    console.log(`✅ ${playerId} ${phase} committed, both complete: ${bothComplete}`);

    // For single-player mode, auto-complete AI commitment
    if (playerId === 'player1' && currentState.gameMode === 'local') {
      console.log('🤖 Single-player mode: Auto-completing AI commitment');
      // Trigger AI auto-completion through AIPhaseProcessor
      if (aiPhaseProcessor) {
        setTimeout(async () => {
          try {
            await this.handleAICommitment(phase, currentState);
          } catch (error) {
            console.error('AI commitment error:', error);
          }
        }, 100);
      }
    }

    return {
      success: true,
      data: {
        playerId,
        phase,
        actionData,
        bothPlayersComplete: bothComplete
      }
    };
  }

  /**
   * Handle AI commitment for simultaneous phases
   * @param {string} phase - Phase name
   * @param {Object} currentState - Current game state
   */
  async handleAICommitment(phase, currentState) {
    try {
      console.log(`🤖 Processing AI commitment for phase: ${phase}`);

      let aiResult;
      switch(phase) {
        case 'droneSelection':
          aiResult = await aiPhaseProcessor.processDroneSelection();
          await this.queueAction({
            type: 'commitment',
            payload: {
              playerId: 'player2',
              phase: 'droneSelection',
              actionData: { drones: aiResult }
            }
          });
          break;

        case 'deckSelection':
          aiResult = await aiPhaseProcessor.processDeckSelection();
          await this.queueAction({
            type: 'commitment',
            payload: {
              playerId: 'player2',
              phase: 'deckSelection',
              actionData: { deck: aiResult }
            }
          });
          break;

        case 'placement':
          aiResult = await aiPhaseProcessor.processPlacement();
          await this.queueAction({
            type: 'commitment',
            payload: {
              playerId: 'player2',
              phase: 'placement',
              actionData: { placement: aiResult }
            }
          });
          break;

        case 'mandatoryDiscard':
          aiResult = await aiPhaseProcessor.executeMandatoryDiscardTurn(currentState);
          await this.queueAction({
            type: 'commitment',
            payload: {
              playerId: 'player2',
              phase: 'mandatoryDiscard',
              actionData: { discardedCards: aiResult.cardsToDiscard }
            }
          });
          break;

        case 'optionalDiscard':
          aiResult = await aiPhaseProcessor.executeOptionalDiscardTurn(currentState);
          await this.queueAction({
            type: 'commitment',
            payload: {
              playerId: 'player2',
              phase: 'optionalDiscard',
              actionData: { discardedCards: aiResult.cardsToDiscard }
            }
          });
          break;

        case 'allocateShields':
          // AI shield allocation when implemented
          await this.queueAction({
            type: 'commitment',
            payload: {
              playerId: 'player2',
              phase: 'allocateShields',
              actionData: { shieldAllocation: [] }
            }
          });
          break;

        case 'mandatoryDroneRemoval':
          aiResult = await aiPhaseProcessor.executeMandatoryDroneRemovalTurn(currentState);
          await this.queueAction({
            type: 'commitment',
            payload: {
              playerId: 'player2',
              phase: 'mandatoryDroneRemoval',
              actionData: { removedDrones: aiResult.dronesToRemove }
            }
          });
          break;

        case 'determineFirstPlayer':
          // AI automatically acknowledges first player determination
          await this.queueAction({
            type: 'commitment',
            payload: {
              playerId: 'player2',
              phase: 'determineFirstPlayer',
              actionData: { acknowledged: true }
            }
          });
          break;

        default:
          console.warn(`⚠️ No AI handler for phase: ${phase}`);
      }

    } catch (error) {
      console.error('AI commitment error:', error);
    }
  }

  /**
   * Process automatic draw action
   * @param {Object} payload - Draw payload containing player states
   * @returns {Object} Draw result
   */
  async processDraw(payload) {
    const { player1, player2 } = payload;

    console.log('🃏 ActionProcessor: Processing automatic draw');

    // Update player states with draw results
    this.gameStateManager.setState({
      player1,
      player2
    });

    return {
      success: true,
      message: 'Draw completed',
      player1,
      player2
    };
  }

  /**
   * Process energy reset action
   * @param {Object} payload - Energy reset payload containing updated player states
   * @returns {Object} Energy reset result
   */
  async processEnergyReset(payload) {
    const { player1, player2 } = payload;

    console.log('⚡ ActionProcessor: Processing energy reset');

    // Update player states using setPlayerStates
    this.gameStateManager.setPlayerStates(player1, player2);

    return {
      success: true,
      message: 'Energy reset completed',
      player1,
      player2
    };
  }

  /**
   * Clear all pending actions (emergency use only)
   */
  clearQueue() {
    this.actionQueue.forEach(action => {
      action.reject(new Error('Action queue cleared'));
    });
    this.actionQueue = [];

    // Reset all locks
    Object.keys(this.actionLocks).forEach(key => {
      this.actionLocks[key] = false;
    });

    this.isProcessing = false;
  }
}

export default ActionProcessor;