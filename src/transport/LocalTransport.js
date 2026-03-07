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
    if (type === 'deployment') {
      debugLog('DEPLOY_TRACE', '[3/10] LocalTransport.sendAction calling GameEngine', {
        type,
        playerId: this.playerId,
      });
    }
    const { state, animations, result } = await this.gameEngine.processAction(type, payload);
    const redactedState = StateRedactor.redactForPlayer(state, this.playerId);

    if (this._responseCallback) {
      // Strip animations — host/local mode already plays them via ActionProcessor.
      // Sending empty animations prevents GameClient from double-animating.
      await this._responseCallback({
        state: redactedState,
        animations: { actionAnimations: [], systemAnimations: [] },
        result,
      });
    }

    return result;
  }

  onResponse(callback) {
    this._responseCallback = callback;
  }

  dispose() {
    this._responseCallback = null;
  }
}

export default LocalTransport;
