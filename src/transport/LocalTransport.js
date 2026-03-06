// LocalTransport — In-process transport that calls GameEngine directly.
// Used for single-player and P2P host modes (zero latency).

import Transport from './Transport.js';
import StateRedactor from '../server/StateRedactor.js';
import { debugLog } from '../utils/debugLogger.js';

class LocalTransport extends Transport {
  constructor(gameEngine, { playerId }) {
    super();
    this.gameEngine = gameEngine;
    this.playerId = playerId;
    this._responseCallback = null;
  }

  async sendAction(type, payload) {
    debugLog('DEPLOY_TRACE', '[3/12] LocalTransport.sendAction calling GameEngine', {
      type,
      playerId: this.playerId,
    });
    const { state, animations, result } = await this.gameEngine.processAction(type, payload);
    const redactedState = StateRedactor.redactForPlayer(state, this.playerId);
    debugLog('DEPLOY_TRACE', '[9/12] LocalTransport state redacted', {
      playerId: this.playerId,
    });

    if (this._responseCallback) {
      await this._responseCallback({ state: redactedState, animations, result });
    }

    return result;
  }

  onResponse(callback) {
    this._responseCallback = callback;
  }

  onActionAck(_callback) {
    // No-op: local transport has no ack mechanism
  }

  dispose() {
    this._responseCallback = null;
  }
}

export default LocalTransport;
