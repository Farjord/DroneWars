// ========================================
// COMMAND MANAGER
// ========================================
// Handles serialization, validation, and execution of game commands
// for multiplayer synchronization. All game actions become commands
// that can be sent over the network and replayed on both clients.

import { gameEngine } from '../logic/gameLogic.js';
import gameStateManager from '../state/GameStateManager.js';

class CommandManager {
  constructor() {
    this.commandHistory = [];
    this.networkHandler = null; // Will be set by P2P manager
  }

  /**
   * Set the network handler for sending commands
   */
  setNetworkHandler(handler) {
    this.networkHandler = handler;
  }

  /**
   * Execute a command locally and optionally send to network
   * @param {Object} command - The command to execute
   * @param {boolean} sendToNetwork - Whether to send to opponent
   * @returns {Object} Result of command execution
   */
  async executeCommand(command, sendToNetwork = true) {
    try {
      // Add metadata to command
      const fullCommand = {
        ...command,
        id: this.generateCommandId(),
        timestamp: Date.now(),
        playerId: gameStateManager.getLocalPlayerId(),
      };

      // Validate command
      const validation = this.validateCommand(fullCommand);
      if (!validation.valid) {
        throw new Error(`Invalid command: ${validation.error}`);
      }

      // Execute command locally
      const result = await this.processCommand(fullCommand);

      // Add to history
      this.commandHistory.push(fullCommand);

      // Send to network if multiplayer and successful
      if (sendToNetwork && this.networkHandler && gameStateManager.get('gameMode') !== 'local') {
        this.networkHandler.sendCommand(fullCommand);
      }

      return result;
    } catch (error) {
      console.error('Command execution failed:', error);
      throw error;
    }
  }

  /**
   * Process a received command from the network
   * @param {Object} command - Command received from opponent
   */
  async receiveCommand(command) {
    try {
      // Validate received command
      const validation = this.validateCommand(command);
      if (!validation.valid) {
        console.error(`Invalid received command: ${validation.error}`);
        return;
      }

      // Process command without sending to network
      await this.processCommand(command);

      // Add to history
      this.commandHistory.push(command);
    } catch (error) {
      console.error('Failed to process received command:', error);
    }
  }

  /**
   * Validate a command before execution
   * @param {Object} command - Command to validate
   * @returns {Object} Validation result
   */
  validateCommand(command) {
    if (!command.type) {
      return { valid: false, error: 'Command missing type' };
    }

    if (!command.playerId) {
      return { valid: false, error: 'Command missing playerId' };
    }

    // Check if it's the correct player's turn
    const currentPlayer = gameStateManager.get('currentPlayer');
    if (currentPlayer && command.playerId !== currentPlayer) {
      return { valid: false, error: 'Not this player\'s turn' };
    }

    // Validate specific command types
    switch (command.type) {
      case 'ATTACK':
        return this.validateAttackCommand(command);
      case 'PLAY_CARD':
        return this.validateCardCommand(command);
      case 'DEPLOY_DRONE':
        return this.validateDeployCommand(command);
      case 'USE_ABILITY':
        return this.validateAbilityCommand(command);
      case 'MOVE_DRONE':
        return this.validateMoveCommand(command);
      case 'END_TURN':
        return this.validateEndTurnCommand(command);
      case 'PASS':
        return this.validatePassCommand(command);
      default:
        return { valid: false, error: `Unknown command type: ${command.type}` };
    }
  }

  /**
   * Process a validated command
   * @param {Object} command - Command to process
   * @returns {Object} Command result
   */
  async processCommand(command) {
    const state = gameStateManager.getState();

    switch (command.type) {
      case 'ATTACK':
        return this.processAttackCommand(command, state);
      case 'PLAY_CARD':
        return this.processCardCommand(command, state);
      case 'DEPLOY_DRONE':
        return this.processDeployCommand(command, state);
      case 'USE_ABILITY':
        return this.processAbilityCommand(command, state);
      case 'MOVE_DRONE':
        return this.processMoveCommand(command, state);
      case 'END_TURN':
        return this.processEndTurnCommand(command, state);
      case 'PASS':
        return this.processPassCommand(command, state);
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  // --- COMMAND VALIDATORS ---

  validateAttackCommand(command) {
    if (!command.attackerId || !command.targetId) {
      return { valid: false, error: 'Attack command missing attacker or target' };
    }
    return { valid: true };
  }

  validateCardCommand(command) {
    if (!command.cardId) {
      return { valid: false, error: 'Card command missing cardId' };
    }
    return { valid: true };
  }

  validateDeployCommand(command) {
    if (!command.droneId || !command.laneId) {
      return { valid: false, error: 'Deploy command missing drone or lane' };
    }
    return { valid: true };
  }

  validateAbilityCommand(command) {
    if (!command.droneId || !command.abilityName) {
      return { valid: false, error: 'Ability command missing drone or ability name' };
    }
    return { valid: true };
  }

  validateMoveCommand(command) {
    if (!command.droneId || !command.fromLane || !command.toLane) {
      return { valid: false, error: 'Move command missing required parameters' };
    }
    return { valid: true };
  }

  validateEndTurnCommand(command) {
    return { valid: true };
  }

  validatePassCommand(command) {
    return { valid: true };
  }

  // --- COMMAND PROCESSORS ---

  async processAttackCommand(command, state) {
    const { attackerId, targetId, targetType } = command;

    // Find attacker and target
    const attacker = this.findDroneById(attackerId, state);
    const target = targetType === 'drone'
      ? this.findDroneById(targetId, state)
      : this.findSectionByName(targetId, state);

    if (!attacker || !target) {
      throw new Error('Invalid attacker or target');
    }

    // Use gameEngine to resolve attack
    const attackResult = gameEngine.resolveAttack(
      attacker,
      target,
      targetType,
      state.player1,
      state.player2,
      state.placedSections,
      state.opponentPlacedSections,
      (log) => gameStateManager.addLogEntry(log),
      null, // No ability damage for basic attacks
      null  // No damage type override
    );

    // Update game state with results
    gameStateManager.updatePlayers(attackResult.updatedPlayer1, attackResult.updatedPlayer2);

    return {
      type: 'ATTACK_RESULT',
      attacker: attacker.name,
      target: target.name,
      damage: attackResult.damage,
      destroyed: attackResult.wasDestroyed,
    };
  }

  async processCardCommand(command, state) {
    const { cardId, targetId } = command;
    const playerId = command.playerId;
    const playerState = state[playerId];

    // Find card in hand
    const card = playerState.hand.find(c => c.instanceId === cardId);
    if (!card) {
      throw new Error('Card not found in hand');
    }

    // Find target if specified
    let target = null;
    if (targetId) {
      target = this.findTargetById(targetId, state);
    }

    // Use gameEngine to resolve card play
    const cardResult = gameEngine.resolveCardPlay(
      card,
      target,
      playerState,
      state.player1,
      state.player2,
      state.placedSections,
      state.opponentPlacedSections,
      (log) => gameStateManager.addLogEntry(log)
    );

    // Update game state
    gameStateManager.updatePlayers(cardResult.updatedPlayer1, cardResult.updatedPlayer2);

    return {
      type: 'CARD_PLAYED',
      cardName: card.name,
      target: target?.name,
      effects: cardResult.effects,
    };
  }

  async processDeployCommand(command, state) {
    const { droneId, laneId } = command;
    const playerId = command.playerId;
    const playerState = state[playerId];

    // Find drone in ready zone
    const drone = playerState.dronesInHand.find(d => d.id === droneId);
    if (!drone) {
      throw new Error('Drone not found in ready zone');
    }

    // Use gameEngine to execute deployment
    const deployResult = gameEngine.executeDeployment(
      drone,
      laneId,
      playerState,
      state.placedSections,
      (log) => gameStateManager.addLogEntry(log)
    );

    // Update game state
    const updates = {};
    updates[playerId] = deployResult.updatedPlayerState;
    gameStateManager.setState(updates);

    return {
      type: 'DRONE_DEPLOYED',
      droneName: drone.name,
      lane: laneId,
    };
  }

  async processEndTurnCommand(command, state) {
    // Use gameEngine turn transition logic
    const transition = gameEngine.calculateTurnTransition(
      command.playerId,
      state.passInfo,
      state.firstPlayerOfRound,
      state.turn,
      state.turnPhase
    );

    // Apply transition
    switch (transition.action) {
      case 'CONTINUE_TURN':
        gameStateManager.setCurrentPlayer(transition.nextPlayer);
        break;
      case 'CHANGE_PLAYER':
        gameStateManager.setCurrentPlayer(transition.nextPlayer);
        break;
      case 'END_PHASE':
        gameStateManager.setTurnPhase(transition.nextPhase);
        if (transition.nextPlayer) {
          gameStateManager.setCurrentPlayer(transition.nextPlayer);
        }
        break;
      case 'END_ROUND':
        gameStateManager.setState({
          turn: state.turn + 1,
          turnPhase: transition.nextPhase,
          currentPlayer: transition.nextPlayer,
        });
        break;
    }

    return {
      type: 'TURN_ENDED',
      nextPlayer: transition.nextPlayer,
      nextPhase: transition.nextPhase,
    };
  }

  async processPassCommand(command, state) {
    const playerId = command.playerId;
    const passUpdates = {};

    if (playerId === 'player1') {
      passUpdates.player1Passed = true;
    } else {
      passUpdates.player2Passed = true;
    }

    if (!state.passInfo.firstPasser) {
      passUpdates.firstPasser = playerId;
    }

    gameStateManager.updatePassInfo(passUpdates);

    return {
      type: 'PLAYER_PASSED',
      playerId,
    };
  }

  // --- HELPER METHODS ---

  findDroneById(droneId, state) {
    // Search all lanes for both players
    for (const player of ['player1', 'player2']) {
      for (const laneId of ['lane1', 'lane2', 'lane3']) {
        const drone = state[player].dronesOnBoard[laneId]?.find(d => d.id === droneId);
        if (drone) return drone;
      }
    }
    return null;
  }

  findSectionByName(sectionName, state) {
    return state.player1.shipSections[sectionName] || state.player2.shipSections[sectionName];
  }

  findTargetById(targetId, state) {
    // Try to find as drone first
    let target = this.findDroneById(targetId, state);
    if (target) return target;

    // Try to find as section
    target = this.findSectionByName(targetId, state);
    if (target) return target;

    // Try lane targets
    if (targetId.startsWith('lane')) {
      return { id: targetId, type: 'lane' };
    }

    return null;
  }

  generateCommandId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get command history (for debugging/replay)
   */
  getHistory() {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
  }
}

// Create singleton instance
const commandManager = new CommandManager();

export default commandManager;