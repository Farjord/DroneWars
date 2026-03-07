// HostGameServer — Server-side orchestrator for P2P host mode.
// Wraps GameEngine + BroadcastService. Processes actions, broadcasts
// results to P2P guests, handles incoming guest actions.
// Exposes the same processAction interface as GameEngine so LocalTransport
// can call it transparently.

import StateRedactor from './StateRedactor.js';
import { debugLog } from '../utils/debugLogger.js';

class HostGameServer {
  constructor(gameEngine, broadcastService, { p2pManager = null, guestPlayerId = 'player2' } = {}) {
    this.gameEngine = gameEngine;
    this.broadcastService = broadcastService;
    this.p2pManager = p2pManager;
    this.guestPlayerId = guestPlayerId;
  }

  /**
   * Process a game action, broadcast to guests, return response.
   * Same interface as GameEngine.processAction so LocalTransport works unchanged.
   */
  async processAction(type, payload) {
    const response = await this.gameEngine.processAction(type, payload);

    // Broadcast state + animations to P2P guests
    const _dbg = this.gameEngine.getState();
    debugLog('ROUND_TRANSITION_TRACE', '[RT-DIAG-1] HostGameServer broadcast after action', {
      utc: new Date().toISOString(), actionType: type,
      turnPhase: _dbg?.turnPhase, round: _dbg?.roundNumber,
    });
    this.broadcastService.broadcastIfNeeded(`HostGameServer:${type}`);

    return response;
  }

  /**
   * Handle an action from a P2P guest.
   * Processes via GameEngine, broadcasts result, sends ack to guest.
   */
  async handleGuestAction(action) {
    debugLog('MP_SYNC_TRACE', '[10/11] Host processing guest action', { actionType: action?.type });

    try {
      const response = await this.gameEngine.processAction(action.type, action.payload);

      this.broadcastService.broadcastIfNeeded(`HostGameServer:guest_${action.type}`);

      if (this.p2pManager) {
        this.p2pManager.sendActionAck({
          actionType: action.type,
          success: true,
        });
      }

      return response;
    } catch (error) {
      debugLog('MP_SYNC_TRACE', 'Error processing guest action', { error: true, actionType: action?.type, message: error.message });

      if (this.p2pManager) {
        this.p2pManager.sendActionAck({
          actionType: action.type,
          success: false,
          error: error.message,
          authoritativeState: StateRedactor.redactForPlayer(
            this.gameEngine.getState(), this.guestPlayerId
          ),
        });
      }
      // Don't re-throw: ack already sent, and caller is an unhandled async P2P callback
    }
  }

  getState() {
    return this.gameEngine.getState();
  }

  getPlayerView(playerId) {
    return StateRedactor.redactForPlayer(this.gameEngine.getState(), playerId);
  }
}

export default HostGameServer;
