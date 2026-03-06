// P2PTransport — Transport for P2P guest mode.
// Wraps P2PManager + MessageQueue for reliable ordered message delivery.

import Transport from './Transport.js';
import MessageQueue from './MessageQueue.js';
import { debugLog } from '../utils/debugLogger.js';

class P2PTransport extends Transport {
  constructor(p2pManager) {
    super();
    this.p2pManager = p2pManager;
    this._responseCallback = null;
    this._ackCallback = null;
    this._queueDrainedCallback = null;
    this._unsubscribe = null;

    this.messageQueue = new MessageQueue({
      processMessage: (message) => this._processMessage(message),
      onResyncNeeded: () => this._onResyncNeeded(),
      onResyncResponse: (fullState) => this._onResyncResponse(fullState),
      onQueueDrained: () => this._queueDrainedCallback?.(),
    });

    this._unsubscribe = this.p2pManager.subscribe((event) => {
      if (event.type === 'state_update_received') {
        this.messageQueue.enqueue(event);
      } else if (event.type === 'action_ack_received') {
        this._ackCallback?.(event.data);
      }
    });
  }

  async sendAction(type, payload) {
    this.p2pManager.sendActionToHost(type, payload);
    return { success: true, pending: true };
  }

  onResponse(callback) {
    this._responseCallback = callback;
  }

  onActionAck(callback) {
    this._ackCallback = callback;
  }

  onQueueDrained(callback) {
    this._queueDrainedCallback = callback;
  }

  // --- MessageQueue callbacks ---

  async _processMessage(message) {
    if (message.type === 'state_update_received' && this._responseCallback) {
      const { state, actionAnimations, systemAnimations } = message.data;
      this._responseCallback({
        state,
        animations: {
          actionAnimations: actionAnimations || [],
          systemAnimations: systemAnimations || [],
        },
      });
    }
  }

  _onResyncNeeded() {
    debugLog('MP_SYNC_TRACE', 'P2PTransport requesting full sync', { resync: true, requesting: true });
    this.p2pManager.requestFullSync();
  }

  _onResyncResponse(fullState) {
    debugLog('MP_SYNC_TRACE', 'P2PTransport resync response received', { resync: true, received: true });
    if (fullState.state && this._responseCallback) {
      this._responseCallback({
        state: fullState.state,
        animations: { actionAnimations: [], systemAnimations: [] },
      });
    }
  }

  dispose() {
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._responseCallback = null;
    this._ackCallback = null;
    this._queueDrainedCallback = null;
  }
}

export default P2PTransport;
