// GameEngine — Authoritative game action processing facade.
// Wraps ActionProcessor + GameStateManager + GameFlowManager.
// Returns { state, animations, result } from every processAction call.
// Pushes { state, animations } to registered clients via event callbacks.

import StateRedactor from './StateRedactor.js';
import { debugLog } from '../utils/debugLogger.js';
import { flowCheckpoint, resetFlowSeq } from '../utils/flowVerification.js';
import { personalizeAnnouncements } from '../utils/announcementUtils.js';
import { STATE_SNAPSHOT } from '../config/animationTypes.js';

class GameEngine {
  constructor(gameStateManager, actionProcessor, gameFlowManager) {
    this.gameStateManager = gameStateManager;
    this.actionProcessor = actionProcessor;
    this.gameFlowManager = gameFlowManager;
    this._clients = new Map(); // playerId -> callback
  }

  /**
   * Register a client to receive push responses after each processAction.
   * @param {string} playerId - The player this client represents
   * @param {Function} callback - Called with { state, animations } after each action
   */
  registerClient(playerId, callback) {
    this._clients.set(playerId, callback);
    debugLog('STATE_SYNC', `GameEngine: client registered for ${playerId}`);
  }

  /**
   * Unregister a client (e.g. on disconnect/dispose).
   * @param {string} playerId
   */
  unregisterClient(playerId) {
    this._clients.delete(playerId);
    debugLog('STATE_SYNC', `GameEngine: client unregistered for ${playerId}`);
  }

  /**
   * Process a game action authoritatively.
   * @param {string} type - Action type
   * @param {Object} payload - Action payload
   * @returns {Promise<{state: Object, animations: Object, result: Object}>}
   */
  async processAction(type, payload) {
    resetFlowSeq();
    flowCheckpoint('SERVER_ACTION_RECEIVED', { type, phase: this.gameStateManager.getState().turnPhase });
    if (type === 'deployment') {
      debugLog('DEPLOY_TRACE', '[4/10] GameEngine.processAction delegating to GSM', { type });
    }
    // Freeze ClientStateStore during processing — _emitToClients delivers
    // the final composite state with animations after processing completes.
    this.actionProcessor.startResponseCapture();
    this.gameStateManager.beginProcessing();
    try {
      const result = await this.gameStateManager.processAction(type, payload);
      await this.gameFlowManager.waitForPendingActionCompletion();
      const state = this.gameStateManager.getState();

      // Response accumulator captures all animations including cascading phase transitions
      const animations = this.actionProcessor.getAndClearResponseCapture();

      const animCount = (animations.actionAnimations?.length || 0) + (animations.systemAnimations?.length || 0);
      if (type === 'deployment') {
        debugLog('DEPLOY_TRACE', '[9/10] GameEngine returns {state, animations}', {
          animCount,
          turnPhase: state.turnPhase,
        });
      }

      flowCheckpoint('SERVER_BROADCASTING', {
        actionAnims: animations.actionAnimations?.length || 0,
        systemAnims: animations.systemAnimations?.length || 0,
      });

      await this._emitToClients(state, animations);

      // Consume one-shot UI notifications — already delivered to clients above
      if (state.lastInterception) {
        this.gameStateManager.setState({ lastInterception: null });
      }

      // Process deferred continuations in separate response cycles
      // (e.g., startNewRound after roundEnd trigger animations)
      const MAX_DEFERRED_ITERATIONS = 10;
      let deferredCount = 0;
      while (this.gameFlowManager.hasDeferredContinuation()) {
        if (++deferredCount > MAX_DEFERRED_ITERATIONS) {
          debugLog('STATE_SYNC', 'Deferred continuation loop exceeded max iterations — breaking', {
            maxIterations: MAX_DEFERRED_ITERATIONS,
          });
          break;
        }
        this.actionProcessor.startResponseCapture();
        await this.gameFlowManager.executeDeferredContinuation();
        await this.gameFlowManager.waitForPendingActionCompletion();
        const contAnimations = this.actionProcessor.getAndClearResponseCapture();
        const contState = this.gameStateManager.getState();
        await this._emitToClients(contState, contAnimations);
      }

      return { state, animations, result };
    } finally {
      this.gameStateManager.endProcessing();
    }
  }

  /**
   * Push state+animations to all registered clients in parallel.
   * Each client receives state redacted for their player perspective.
   * Promise.all preserves back-pressure (waits for slowest callback).
   * Error isolation prevents one client failure from blocking others.
   */
  async _emitToClients(state, animations) {
    const promises = [];
    for (const [playerId, callback] of this._clients) {
      const redactedState = StateRedactor.redactForPlayer(state, playerId);
      // Clone animations per client and redact STATE_SNAPSHOT payloads
      // so opponent hand/deck data isn't exposed.
      // snapshotPlayerStates is partial ({ player1, player2 } only) — intentional.
      const redactAnim = (anim) => {
        if (anim.animationName === STATE_SNAPSHOT && anim.payload?.snapshotPlayerStates) {
          return {
            ...anim,
            payload: {
              ...anim.payload,
              snapshotPlayerStates: StateRedactor.redactForPlayer(
                anim.payload.snapshotPlayerStates, playerId
              ),
            },
          };
        }
        return { ...anim };
      };
      const clientAnimations = {
        actionAnimations: (animations.actionAnimations || []).map(redactAnim),
        systemAnimations: (animations.systemAnimations || []).map(redactAnim),
      };
      this._personalizeAnnouncements(clientAnimations, playerId, state);

      promises.push(
        Promise.resolve(callback({ state: redactedState, animations: clientAnimations }))
          .catch(err => debugLog('STATE_SYNC', `Client ${playerId} delivery failed`, { error: err.message }))
      );
    }
    await Promise.all(promises);
  }

  /**
   * Personalize announcement animations for a specific client.
   * Delegates to shared utility — see src/utils/announcementUtils.js.
   */
  _personalizeAnnouncements(clientAnimations, playerId, state) {
    personalizeAnnouncements(clientAnimations, playerId, state);
  }

  getState() {
    return this.gameStateManager.getState();
  }
}

export default GameEngine;
