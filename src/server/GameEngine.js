// GameEngine — Authoritative game action processing facade.
// Wraps ActionProcessor + GameStateManager + GameFlowManager.
// Returns { state, animations, result } from every processAction call.
// Pushes { state, animations } to registered clients via event callbacks.

import StateRedactor from './StateRedactor.js';
import { debugLog } from '../utils/debugLogger.js';

class GameEngine {
  constructor(gameStateManager, actionProcessor, gameFlowManager) {
    this.gameStateManager = gameStateManager;
    this.actionProcessor = actionProcessor;
    this.gameFlowManager = gameFlowManager;
    this._clients = new Map(); // playerId -> callback
  }

  /**
   * Register a client to receive push responses after each processAction.
   * @param {string} playerId - The player this client represents
   * @param {Function} callback - Called with { state, animations } after each action
   */
  registerClient(playerId, callback) {
    this._clients.set(playerId, callback);
    debugLog('STATE_SYNC', `GameEngine: client registered for ${playerId}`);
  }

  /**
   * Unregister a client (e.g. on disconnect/dispose).
   * @param {string} playerId
   */
  unregisterClient(playerId) {
    this._clients.delete(playerId);
    debugLog('STATE_SYNC', `GameEngine: client unregistered for ${playerId}`);
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

    await this._emitToClients(state, animations);

    return { state, animations, result };
  }

  /**
   * Push state+animations to all registered clients in parallel.
   * Each client receives state redacted for their player perspective.
   * Promise.all preserves back-pressure (waits for slowest callback).
   * Error isolation prevents one client failure from blocking others.
   */
  async _emitToClients(state, animations) {
    const promises = [];
    for (const [playerId, callback] of this._clients) {
      const redactedState = StateRedactor.redactForPlayer(state, playerId);
      const p1Total = ['lane1','lane2','lane3'].reduce((s, l) => s + (redactedState.player1?.dronesOnBoard?.[l] || []).length, 0);
      const p2Total = ['lane1','lane2','lane3'].reduce((s, l) => s + (redactedState.player2?.dronesOnBoard?.[l] || []).length, 0);
      debugLog('DEPLOY_TRACE', '_emitToClients drone snapshot', {
        playerId, p1Total, p2Total, phase: redactedState.turnPhase,
      });
      promises.push(
        Promise.resolve(callback({ state: redactedState, animations }))
          .catch(err => debugLog('STATE_SYNC', `Client ${playerId} delivery failed`, { error: err.message }))
      );
    }
    await Promise.all(promises);
  }

  getState() {
    return this.gameStateManager.getState();
  }

  getPlayerView(_playerId) {
    return this.getState();
  }
}

export default GameEngine;
