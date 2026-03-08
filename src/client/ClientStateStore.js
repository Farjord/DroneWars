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
        // Merge local changes into applied state (preserves server state for client)
        this._appliedState = { ...this._appliedState, ...event.payload.updates };
      } else {
        this._appliedState = null;
      }
      // Single combined log, only when drones exist
      const resultState = this.getState();
      const p1Total = ['lane1','lane2','lane3'].reduce((s, l) => s + (resultState.player1?.dronesOnBoard?.[l] || []).length, 0);
      const p2Total = ['lane1','lane2','lane3'].reduce((s, l) => s + (resultState.player2?.dronesOnBoard?.[l] || []).length, 0);
      if (p1Total > 0 || p2Total > 0) {
        debugLog('DEPLOY_TRACE', 'ClientStateStore: GSM event → drone state', {
          eventType: event.type,
          source: this._appliedState ? 'appliedState' : 'gsm',
          p1Total, p2Total,
        });
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
    const p1Total = ['lane1','lane2','lane3'].reduce((s, l) => s + (state.player1?.dronesOnBoard?.[l] || []).length, 0);
    const p2Total = ['lane1','lane2','lane3'].reduce((s, l) => s + (state.player2?.dronesOnBoard?.[l] || []).length, 0);
    debugLog('DEPLOY_TRACE', 'ClientStateStore.applyUpdate', {
      p1Total, p2Total, phase: state.turnPhase,
    });
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
