// LocalGameServer — Thin delegation wrapper for single-player/local mode.
// Every method delegates to GameStateManager. No behavior change from direct GSM calls.

import GameServer from './GameServer.js';

class LocalGameServer extends GameServer {
  constructor(gameStateManager, { isMultiplayer = false } = {}) {
    super();
    this.gameStateManager = gameStateManager;
    this._isMultiplayer = isMultiplayer;
  }

  async submitAction(type, payload) {
    return this.gameStateManager.processAction(type, payload);
  }

  getState() {
    return this.gameStateManager.getState();
  }

  getPlayerView(_playerId) {
    return this.getState(); // Phase 8: redaction
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
