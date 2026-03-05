// GameEngine — Authoritative game action processing facade.
// Wraps ActionProcessor + GameStateManager + GameFlowManager.
// Returns { state, animations, result } from every processAction call.

import StateRedactor from './StateRedactor.js';

class GameEngine {
  constructor(gameStateManager, actionProcessor, gameFlowManager) {
    this.gameStateManager = gameStateManager;
    this.actionProcessor = actionProcessor;
    this.gameFlowManager = gameFlowManager;
  }

  /**
   * Process a game action authoritatively.
   * @param {string} type - Action type
   * @param {Object} payload - Action payload
   * @returns {Promise<{state: Object, result: Object}>}
   */
  async processAction(type, payload) {
    const result = await this.gameStateManager.processAction(type, payload);
    const state = this.gameStateManager.getState();
    return { state, result };
  }

  getState() {
    return this.gameStateManager.getState();
  }

  getPlayerView(playerId) {
    return StateRedactor.redactForPlayer(this.getState(), playerId);
  }
}

export default GameEngine;
