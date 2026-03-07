// LocalTransport — In-process transport that calls GameEngine directly.
// Used for single-player and P2P host modes (zero latency).
// Receives state+animations via GameEngine's push callback (registerClient),
// not from processAction return values.

import Transport from './Transport.js';
import { debugLog } from '../utils/debugLogger.js';

class LocalTransport extends Transport {
  constructor(gameEngine, { playerId }) {
    super();
    this.gameEngine = gameEngine;
    this.playerId = playerId;
    this._responseCallback = null;

    // Register as a client on GameEngine to receive push responses.
    // The callback is awaited by GameEngine._emitToClients, so animation
    // playback in GameClient blocks the server until complete.
    this.gameEngine.registerClient(playerId, (response) => this._responseCallback?.(response));
  }

  async sendAction(type, payload) {
    if (type === 'deployment') {
      debugLog('DEPLOY_TRACE', '[3/10] LocalTransport.sendAction calling GameEngine', {
        type,
        playerId: this.playerId,
      });
    }
    // Response (state + animations) arrives via the registered push callback,
    // NOT from the return value. Only extract result for the ack return.
    const { result } = await this.gameEngine.processAction(type, payload);
    return result;
  }

  onResponse(callback) {
    this._responseCallback = callback;
  }

  dispose() {
    this.gameEngine.unregisterClient(this.playerId);
    this._responseCallback = null;
  }
}

export default LocalTransport;
