// RemoteGameServer — Guest-mode server that sends actions to host
// and processes locally for optimistic feedback.

import GameServer from './GameServer.js';

class RemoteGameServer extends GameServer {
  constructor(gameStateManager, p2pManager) {
    super();
    this.gameStateManager = gameStateManager;
    this.p2pManager = p2pManager;
  }

  async submitAction(type, payload) {
    this.p2pManager.sendActionToHost(type, payload);
    const result = await this.gameStateManager.processAction(type, payload);
    if (result.animations) {
      this.gameStateManager.trackOptimisticAnimations(result.animations);
    }
    return result;
  }

  getState() {
    return this.gameStateManager.getState();
  }

  getPlayerView(_playerId) {
    return this.getState(); // Phase 8: redaction
  }

  getLocalPlayerId() {
    return this.gameStateManager.getLocalPlayerId();
  }

  isPlayerAI() {
    return false;
  }

  onStateUpdate(callback) {
    return this.gameStateManager.subscribe(callback);
  }
}

export default RemoteGameServer;
