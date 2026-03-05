// LocalGameServer — Thin delegation wrapper for single-player/local mode.
// Delegates action processing to GameEngine, state queries to GameStateManager.

import GameServer from './GameServer.js';
import StateRedactor from './StateRedactor.js';

class LocalGameServer extends GameServer {
  constructor(gameStateManager, { isMultiplayer = false, gameEngine = null } = {}) {
    super();
    this.gameStateManager = gameStateManager;
    this.gameEngine = gameEngine;
    this._isMultiplayer = isMultiplayer;
  }

  async submitAction(type, payload) {
    if (this.gameEngine) {
      const response = await this.gameEngine.processAction(type, payload);
      return response.result;
    }
    return this.gameStateManager.processAction(type, payload);
  }

  getState() {
    return this.gameStateManager.getState();
  }

  getPlayerView(playerId) {
    if (this.gameEngine) {
      return this.gameEngine.getPlayerView(playerId);
    }
    return StateRedactor.redactForPlayer(this.getState(), playerId);
  }

  getLocalPlayerId() {
    return 'player1';
  }

  isMultiplayer() {
    return this._isMultiplayer;
  }

  isPlayerAI(playerId) {
    return !this._isMultiplayer && playerId === 'player2';
  }

  onStateUpdate(callback) {
    return this.gameStateManager.subscribe(callback);
  }
}

export default LocalGameServer;
