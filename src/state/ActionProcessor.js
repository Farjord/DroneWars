// ========================================
// ACTION PROCESSOR
// ========================================
// Centralized action processing system to prevent race conditions.
// All game actions must go through this processor to ensure serialization.

import { gameEngine } from '../logic/gameLogic.js';
import { aiBrain } from '../logic/aiLogic.js';

class ActionProcessor {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.actionQueue = [];
    this.isProcessing = false;
    this.p2pManager = null;
    this.actionLocks = {
      attack: false,
      ability: false,
      deployment: false,
      cardPlay: false,
      turnTransition: false,
      phaseTransition: false,
      roundStart: false,
      reallocateShields: false,
      aiAction: false,
      aiTurn: false,
      playerPass: false,
      aiShipPlacement: false
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

    // Validate that round start shield allocation actions use direct updates
    if (type === 'allocateShield' && currentState.turnPhase === 'allocateShields') {
      throw new Error('Round start shield allocation should use direct updates, not ActionProcessor');
    }
    if (type === 'resetShieldAllocation' && currentState.turnPhase === 'allocateShields') {
      throw new Error('Round start shield allocation reset should use direct updates, not ActionProcessor');
    }
    if (type === 'endShieldAllocation' && currentState.turnPhase === 'allocateShields') {
      throw new Error('Round start shield allocation completion should use direct updates, not ActionProcessor');
    }

    // Check for action-specific locks
    if (this.actionLocks[type]) {
      throw new Error(`Action ${type} is currently locked`);
    }

    // Send to peer BEFORE processing locally (unless this is a network action)
    if (!isNetworkAction && this.p2pManager && this.p2pManager.isConnected) {
      const multiplayerState = this.gameStateManager.get('multiplayer');
      if (multiplayerState && multiplayerState.enabled) {
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
      console.log(`[TURN TRANSITION DEBUG] Setting new player: ${newPlayer}`);
      this.gameStateManager.setCurrentPlayer(newPlayer);
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

    console.log(`[PHASE TRANSITION DEBUG] Processing phase transition to: ${newPhase}`);

    const currentState = this.gameStateManager.getState();
    const stateUpdates = {};

    // Handle phase-specific initialization
    if (newPhase === 'allocateShields') {
      // Initialize shield allocation for local player
      const localPlayerId = this.gameStateManager.getLocalPlayerId();
      const localPlayerState = currentState[localPlayerId];

      // Calculate shields available this turn
      const effectiveStats = gameEngine.calculateEffectiveStats(localPlayerState);
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

    // Use gameLogic function to calculate phase transition effects
    const phaseTransitionResult = gameEngine.calculateTurnTransition(
      currentState.currentPlayer,
      currentState.passInfo,
      currentState.turnPhase,
      currentState.winner
    );

    // Apply the phase change and any phase-specific updates
    stateUpdates.turnPhase = newPhase;
    this.gameStateManager.setState(stateUpdates);

    // Reset pass info if requested (typical for new phase)
    if (resetPassInfo) {
      this.gameStateManager.setPassInfo({
        firstPasser: null,
        player1Passed: false,
        player2Passed: false
      });
    }

    console.log(`[PHASE TRANSITION DEBUG] Phase transition complete: ${currentState.turnPhase} → ${newPhase}`);

    return { success: true, newPhase, transitionType: phaseTransitionResult.type };
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

    // Calculate new player states for the round
    const newPlayer1State = gameEngine.calculateNewRoundPlayerState(
      currentState.player1,
      newTurn,
      gameEngine.calculateEffectiveStats,
      currentState.player2,
      currentState.placedSections
    );

    const newPlayer2State = gameEngine.calculateNewRoundPlayerState(
      currentState.player2,
      newTurn,
      gameEngine.calculateEffectiveStats,
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
   * Process AI turn - coordinates between aiLogic and gameLogic
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

    // Have AI analyze GameStateManager state and make decision
    console.log(`[AI TURN DEBUG] AI making decision for phase: ${turnPhase}`);
    if (turnPhase === 'deployment') {
      aiDecision = aiBrain.handleOpponentTurn({
        player1: currentState.player1,
        player2: currentState.player2,
        turn: currentState.turn,
        placedSections: currentState.placedSections,
        opponentPlacedSections: currentState.opponentPlacedSections,
        getShipStatus: gameEngine.getShipStatus,
        calculateEffectiveShipStats: gameEngine.calculateEffectiveShipStats,
        calculateEffectiveStats: gameEngine.calculateEffectiveStats,
        addLogEntry: (entry, debugSource, aiDecisionContext) => {
          this.gameStateManager.addLogEntry(entry, debugSource, aiDecisionContext);
        }
      });
    } else if (turnPhase === 'action') {
      aiDecision = aiBrain.handleOpponentAction({
        player1: currentState.player1,
        player2: currentState.player2,
        placedSections: currentState.placedSections,
        opponentPlacedSections: currentState.opponentPlacedSections,
        getShipStatus: gameEngine.getShipStatus,
        getLaneOfDrone: gameEngine.getLaneOfDrone,
        getValidTargets: gameEngine.getValidTargets,
        calculateEffectiveStats: gameEngine.calculateEffectiveStats,
        addLogEntry: (entry, debugSource, aiDecisionContext) => {
          this.gameStateManager.addLogEntry(entry, debugSource, aiDecisionContext);
        }
      });
    } else {
      aiDecision = { type: 'pass' };
      console.log(`[AI TURN DEBUG] AI passing due to unknown phase: ${turnPhase}`);
    }

    console.log(`[AI TURN DEBUG] AI decision:`, aiDecision);

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
            await this.processTurnTransition({ newPhase: 'action' });
          } else if (currentState.turnPhase === 'action') {
            await this.processTurnTransition({ newPhase: 'roundEnd' });
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

    // Handle phase transitions based on both players passing
    if (newPassInfo[opponentPlayerId + 'Passed']) {
      if (turnPhase === 'deployment') {
        await this.processPhaseTransition({ nextPhase: 'action' });
      } else if (turnPhase === 'action') {
        await this.processPhaseTransition({ nextPhase: 'endRound' });
      }
    } else {
      // End turn for current player - switch to opponent
      await this.processTurnTransition({
        newPlayer: opponentPlayerId
      });
    }

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