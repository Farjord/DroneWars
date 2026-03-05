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
    this.broadcastSequence = 0;
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

    // If not connected, preserve pending animations for next successful broadcast
    if (!this.p2pManager?.isConnected) {
      debugLog('BROADCAST_TIMING', `⚠️ [HOST BROADCAST] Not connected — preserving pending animations | Trigger: ${trigger}`);
      return;
    }

    // Priority: finalState (post-teleport) > pendingState (pre-teleport/normal) > currentState
    const stateToBroadcast = this.pendingFinalState || this.pendingStateUpdate || this.gameStateManager.getState();
    const actionAnimations = this.getAndClearPendingActionAnimations();
    const systemAnimations = this.getAndClearPendingSystemAnimations();

    this.broadcastSequence++;
    const stateSource = this.pendingFinalState ? 'FINAL' : this.pendingStateUpdate ? 'PENDING' : 'CURRENT';
    debugLog('BROADCAST_TIMING', `📡 [HOST BROADCAST] Source: ${stateSource} | Trigger: ${trigger} | Seq: ${this.broadcastSequence} | Anims: ${actionAnimations.length + systemAnimations.length}`);

    const redactedState = StateRedactor.redactForPlayer(stateToBroadcast, 'player2');
    this.p2pManager.broadcastState(redactedState, actionAnimations, systemAnimations);
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
    this.broadcastSequence = 0;
  }
}

export default BroadcastService;
