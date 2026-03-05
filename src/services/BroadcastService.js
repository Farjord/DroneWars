// ========================================
// BROADCAST SERVICE
// ========================================
// Centralizes all host→guest state broadcasting logic.
// Owns the host guard, animation pending arrays, and state priority logic.
// Replaces scattered broadcastStateToGuest() calls across the codebase.

import { debugLog } from '../utils/debugLogger.js';

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
    return this.gameServer?.getLocalPlayerId() === 'player1';
  }

  /**
   * Broadcast current game state to guest if this is the host.
   * Single public entry point — all call sites use this instead of manual guards.
   * @param {string} trigger - Reason for broadcast (for debug logging)
   */
  broadcastIfNeeded(trigger = 'unknown') {
    if (!this._isHost()) return;
    if (!this.p2pManager?.isConnected) return;

    // Priority: finalState (post-teleport) > pendingState (pre-teleport/normal) > currentState
    const stateToBroadcast = this.pendingFinalState || this.pendingStateUpdate || this.gameStateManager.getState();
    const actionAnimations = this.getAndClearPendingActionAnimations();
    const systemAnimations = this.getAndClearPendingSystemAnimations();

    const stateSource = this.pendingFinalState ? 'FINAL' : this.pendingStateUpdate ? 'PENDING' : 'CURRENT';
    debugLog('BROADCAST_TIMING', `📡 [HOST BROADCAST] Source: ${stateSource} | Trigger: ${trigger} | Anims: ${actionAnimations.length + systemAnimations.length}`);

    this.p2pManager.broadcastState(stateToBroadcast, actionAnimations, systemAnimations);
  }

  /**
   * Capture animations for broadcasting (used by executeAndCaptureAnimations).
   * @param {Array} animations - Animation events to capture
   * @param {boolean} isSystemAnimation - True for system animations, false for action animations
   */
  captureAnimations(animations, isSystemAnimation = false) {
    if (!animations || animations.length === 0) return;
    if (!this._isHost()) return;
    (isSystemAnimation ? this.pendingSystemAnimations : this.pendingActionAnimations).push(...animations);
  }

  /**
   * Capture action animations for broadcast, filtering out STATE_SNAPSHOT.
   * Used by ActionContext's captureAnimationsForBroadcast.
   * @param {Array} animations - Animation events to capture
   */
  captureAnimationsForBroadcast(animations) {
    if (!this._isHost() || !animations || animations.length === 0) return;
    const broadcastAnimations = animations.filter(a => a.animationName !== 'STATE_SNAPSHOT');
    this.pendingActionAnimations.push(...broadcastAnimations);
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
