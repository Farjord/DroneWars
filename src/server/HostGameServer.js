// HostGameServer — Server-side orchestrator for P2P host mode.
// Wraps GameEngine, registers P2P guest as a GameEngine client so
// _emitToClients delivers to both local and remote clients via the
// same code path. Handles incoming guest actions.

import StateRedactor from './StateRedactor.js';
import { debugLog } from '../utils/debugLogger.js';

class HostGameServer {
  constructor(gameEngine, { p2pManager = null, guestPlayerId = 'player2' } = {}) {
    this.gameEngine = gameEngine;
    this.p2pManager = p2pManager;
    this.guestPlayerId = guestPlayerId;

    // Register P2P delivery as a GameEngine client — same mechanism as LocalTransport.
    // _emitToClients will redact state for player2 and call this callback.
    if (p2pManager) {
      this.gameEngine.registerClient(guestPlayerId, ({ state, animations }) => {
        if (!p2pManager.isConnected) return;
        p2pManager.broadcastState(
          state,
          animations?.actionAnimations || [],
          animations?.systemAnimations || []
        );
      });
    }
  }

  /**
   * Process a game action, return response.
   * State + animations are delivered to ALL clients (local + P2P) via _emitToClients.
   */
  async processAction(type, payload) {
    return this.gameEngine.processAction(type, payload);
  }

  /**
   * Handle an action from a P2P guest.
   * Processes via GameEngine (which delivers to all clients), sends ack to guest.
   */
  async handleGuestAction(action) {
    debugLog('MP_SYNC_TRACE', '[10/11] Server processing remote action', { actionType: action?.type });

    try {
      const response = await this.gameEngine.processAction(action.type, action.payload);

      if (this.p2pManager) {
        this.p2pManager.sendActionAck({
          actionType: action.type,
          success: true,
        });
      }

      return response;
    } catch (error) {
      debugLog('MP_SYNC_TRACE', 'Error processing remote action', { error: true, actionType: action?.type, message: error.message });

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

  // Delegate client registration to GameEngine (LocalTransport calls these)
  registerClient(playerId, callback) {
    this.gameEngine.registerClient(playerId, callback);
  }

  unregisterClient(playerId) {
    this.gameEngine.unregisterClient(playerId);
  }

  getState() {
    return this.gameEngine.getState();
  }

  getPlayerView(playerId) {
    return StateRedactor.redactForPlayer(this.gameEngine.getState(), playerId);
  }
}

export default HostGameServer;
