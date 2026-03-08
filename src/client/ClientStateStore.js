// ClientStateStore — Read-only state container for UI consumption.
// Wraps GameStateManager for backward compatibility, adding applyUpdate()
// for engine response paths. UI subscribes here instead of GSM directly.

import { debugLog } from '../utils/debugLogger.js';

class ClientStateStore {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this._listeners = [];
    this._appliedState = null;

    // Forward GSM events to our subscribers
    this._gsmUnsubscribe = gameStateManager.subscribe((event) => {
      if (this._appliedState && event.payload?.updates) {
        const updateKeys = Object.keys(event.payload.updates);
        debugLog('MP_SYNC_TRACE', 'ClientStateStore: GSM event — MERGING into appliedState', {
          eventType: event.type, updateKeys,
        });
        // Merge local changes into applied state (preserves server state for client)
        this._appliedState = { ...this._appliedState, ...event.payload.updates };
      } else {
        this._appliedState = null;
      }
      this._notify(event);
    });
  }

  getState() {
    if (this._appliedState) {
      return this._appliedState;
    }
    return this.gameStateManager.getState();
  }

  /**
   * Apply an authoritative state update from the engine.
   * Notifies subscribers with an ENGINE_UPDATE event.
   * @param {Object} state - Complete game state from engine response
   */
  applyUpdate(state) {
    this._appliedState = state;
    this._notify({ type: 'ENGINE_UPDATE' });
  }

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      const idx = this._listeners.indexOf(listener);
      if (idx > -1) this._listeners.splice(idx, 1);
    };
  }

  _notify(event) {
    this._listeners.forEach(listener => {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to prevent cascading failures
      }
    });
  }

  dispose() {
    if (this._gsmUnsubscribe) {
      this._gsmUnsubscribe();
    }
    this._listeners = [];
  }
}

export default ClientStateStore;
