// GameEngine — Authoritative game action processing facade.
// Wraps ActionProcessor + GameStateManager + GameFlowManager.
// Returns { state, animations, result } from every processAction call.

import { debugLog } from '../utils/debugLogger.js';

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
   * @returns {Promise<{state: Object, animations: Object, result: Object}>}
   */
  async processAction(type, payload) {
    if (type === 'deployment') {
      debugLog('DEPLOY_TRACE', '[4/10] GameEngine.processAction delegating to GSM', { type });
    }
    const result = await this.gameStateManager.processAction(type, payload);
    await this.gameFlowManager.waitForPendingActionCompletion();
    const state = this.gameStateManager.getState();

    // Extract collected animations from ActionProcessor result (Phase 2 contract)
    const animations = result?.collectedAnimations || { actionAnimations: [], systemAnimations: [] };

    const animCount = (animations.actionAnimations?.length || 0) + (animations.systemAnimations?.length || 0);
    if (type === 'deployment') {
      debugLog('DEPLOY_TRACE', '[9/10] GameEngine returns {state, animations}', {
        animCount,
        turnPhase: state.turnPhase,
      });
    }

    return { state, animations, result };
  }

  getState() {
    return this.gameStateManager.getState();
  }

  getPlayerView(_playerId) {
    return this.getState();
  }
}

export default GameEngine;
