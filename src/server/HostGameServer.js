// HostGameServer — Server-side orchestrator for P2P host mode.
// Wraps GameEngine, registers the remote peer as a GameEngine client so
// _emitToClients delivers to both local and remote clients via the
// same code path. Handles incoming remote actions.

import StateRedactor from './StateRedactor.js';
import { debugLog } from '../utils/debugLogger.js';

class HostGameServer {
  constructor(gameEngine, { p2pManager = null, remotePlayerId = 'player2' } = {}) {
    this.gameEngine = gameEngine;
    this.p2pManager = p2pManager;
    this.remotePlayerId = remotePlayerId;

    // Register P2P delivery as a GameEngine client — same mechanism as LocalTransport.
    // _emitToClients will redact state for player2 and call this callback.
    if (p2pManager) {
      this.gameEngine.registerClient(remotePlayerId, ({ state, animations }) => {
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
   * Handle an action from the remote peer.
   * Processes via GameEngine (which delivers to all clients), sends ack to remote client.
   */
  async handleRemoteAction(action) {
    debugLog('MP_SYNC_TRACE', '[9/10] Server processing remote action', { actionType: action?.type });

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
            this.gameEngine.getState(), this.remotePlayerId
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
