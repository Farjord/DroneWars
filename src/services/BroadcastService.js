// ========================================
// BROADCAST SERVICE
// ========================================
// Centralizes all host→guest state broadcasting logic.
// Owns the host guard, animation pending arrays, and state priority logic.
// Replaces scattered broadcastStateToGuest() calls across the codebase.

import { debugLog } from '../utils/debugLogger.js';
import StateRedactor from '../server/StateRedactor.js';

class BroadcastService {
  constructor({ gameStateManager, p2pManager }) {
    this.gameStateManager = gameStateManager;
    this.p2pManager = p2pManager;
    this.gameServer = null;

    this.pendingActionAnimations = [];
    this.pendingSystemAnimations = [];
    this.pendingStateUpdate = null;
    this.pendingFinalState = null;
  }

  setGameServer(server) {
    this.gameServer = server;
  }

  _isHost() {
    if (!this.gameServer) {
      debugLog('MP_SYNC_TRACE', 'BroadcastService._isHost() called before gameServer wired', { guard: true });
      return false;
    }
    return this.gameServer.getLocalPlayerId() === 'player1';
  }

  /**
   * Broadcast current game state to guest if this is the host.
   * Single public entry point — all call sites use this instead of manual guards.
   * @param {string} trigger - Reason for broadcast (for debug logging)
   */
  broadcastIfNeeded(trigger = 'unknown') {
    if (!this._isHost()) return;

    // If not connected, preserve pending animations for next successful broadcast
    if (!this.p2pManager?.isConnected) {
      debugLog('MP_SYNC_TRACE', 'Not connected — preserving pending animations', { guard: true, preservingAnimations: true, trigger });
      return;
    }

    // Priority: finalState (post-teleport) > pendingState (pre-teleport/normal) > currentState
    const stateToBroadcast = this.pendingFinalState || this.pendingStateUpdate || this.gameStateManager.getState();
    const actionAnimations = this.getAndClearPendingActionAnimations();
    const systemAnimations = this.getAndClearPendingSystemAnimations();

    const stateSource = this.pendingFinalState ? 'FINAL' : this.pendingStateUpdate ? 'PENDING' : 'CURRENT';
    debugLog('MP_SYNC_TRACE', '[2/11] Broadcast decision', { stateSource, trigger, animCount: actionAnimations.length + systemAnimations.length });

    const redactedState = StateRedactor.redactForPlayer(stateToBroadcast, 'player2');
    this.p2pManager.broadcastState(redactedState, actionAnimations, systemAnimations);
  }

  /**
   * Capture animations for broadcasting.
   * @param {Array} animations - Animation events to capture
   * @param {{ isSystem?: boolean, excludeStateSnapshot?: boolean }} options
   */
  captureAnimations(animations, { isSystem = false, excludeStateSnapshot = false } = {}) {
    if (!animations || animations.length === 0) return;
    if (!this._isHost()) return;
    const filtered = excludeStateSnapshot
      ? animations.filter(a => a.animationName !== 'STATE_SNAPSHOT')
      : animations;
    (isSystem ? this.pendingSystemAnimations : this.pendingActionAnimations).push(...filtered);
  }

  getAndClearPendingActionAnimations() {
    const animations = [...this.pendingActionAnimations];
    this.pendingActionAnimations = [];
    return animations;
  }

  getAndClearPendingSystemAnimations() {
    const animations = [...this.pendingSystemAnimations];
    this.pendingSystemAnimations = [];
    return animations;
  }

  setPendingStates(pendingStateUpdate, pendingFinalState) {
    this.pendingStateUpdate = pendingStateUpdate;
    this.pendingFinalState = pendingFinalState;
  }

  clearPendingStates() {
    this.pendingStateUpdate = null;
    this.pendingFinalState = null;
  }

  reset() {
    this.pendingActionAnimations = [];
    this.pendingSystemAnimations = [];
    this.pendingStateUpdate = null;
    this.pendingFinalState = null;
  }
}

export default BroadcastService;
