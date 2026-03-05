// ClientStateStore — Read-only state container for UI consumption.
// Wraps GameStateManager for backward compatibility, adding applyUpdate()
// for engine/guest response paths. UI subscribes here instead of GSM directly.

class ClientStateStore {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this._listeners = [];
    this._appliedState = null;

    // Forward GSM events to our subscribers
    this._gsmUnsubscribe = gameStateManager.subscribe((event) => {
      // Clear applied state so getState falls through to GSM
      this._appliedState = null;
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
   * Apply an authoritative state update from the engine or host.
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
