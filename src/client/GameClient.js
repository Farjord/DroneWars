// GameClient — Unified client for all game modes.
// Delegates action sending to a Transport, receives { state, animations }
// responses, plays animations via AnimationManager, and pushes state to
// ClientStateStore.

import GameServer from '../server/GameServer.js';
import { addTeleportingFlags } from '../utils/teleportUtils.js';
import { debugLog } from '../utils/debugLogger.js';

class GameClient extends GameServer {
  constructor(transport, { clientStateStore, playerId, phaseAnimationQueue = null, animationManager = null }) {
    super();
    this.transport = transport;
    this.clientStateStore = clientStateStore;
    this.playerId = playerId;
    this.phaseAnimationQueue = phaseAnimationQueue;
    this.animationManager = animationManager;

    // stateProvider protocol fields (used by AnimationManager.executeWithStateUpdate)
    this.pendingHostState = null;
    this.pendingFinalHostState = null;
    this._localGameMode = null; // Cached on first response to avoid per-response store reads

    // Wire up transport handlers
    this.transport.onResponse(response => this._onResponse(response));
    this.transport.onActionAck(ack => this._onActionAck(ack));
    this.transport.onQueueDrained(() => this._onQueueDrained());
  }

  // --- GameServer interface ---

  async submitAction(type, payload) {
    if (type === 'deployment') {
      debugLog('DEPLOY_TRACE', '[2/10] GameClient.submitAction routing to transport', {
        type,
        hasTransport: !!this.transport,
      });
    }
    return this.transport.sendAction(type, payload);
  }

  getState() {
    return this.clientStateStore.getState();
  }

  getPlayerView(_playerId) {
    return this.getState();
  }

  getLocalPlayerId() {
    return this.playerId;
  }

  isMultiplayer() {
    const gameMode = this.getState()?.gameMode;
    return gameMode === 'host' || gameMode === 'guest';
  }

  isPlayerAI(playerId) {
    return !this.isMultiplayer() && playerId !== this.playerId;
  }

  onStateUpdate(callback) {
    return this.clientStateStore.subscribe(callback);
  }

  // --- Transport response handler ---

  async _onResponse({ state, animations }) {
    const previousPhase = this.getState().turnPhase;
    const newPhase = state.turnPhase;
    const allAnimations = this._collectAnimations(animations);

    // Extract phase/pass announcements — route to PhaseAnimationQueue, not AnimationManager
    const { visualAnimations, hadAnnouncements } = this._extractAndQueueAnnouncements(allAnimations);

    if (visualAnimations.length > 0) {
      debugLog('ANIM_TRACE', '[7a/7] GameClient._onResponse entry', {
        previousPhase,
        newPhase,
        animCount: visualAnimations.length,
        hasTeleportIn: visualAnimations.some(a => a.animationName === 'TELEPORT_IN'),
      });
    }

    // Preserve local gameMode (cached on first response to avoid per-response spread overhead)
    if (!this._localGameMode) {
      this._localGameMode = this.getState().gameMode;
    }
    state = { ...state, gameMode: this._localGameMode, localPlayerId: this.playerId };

    const triggerAnims = visualAnimations.filter(a => a.animationName === 'TRIGGER_FIRED');
    if (triggerAnims.length > 0) {
      debugLog('TRIGGER_SYNC_TRACE', '[7/8] Trigger received by GameClient', {
        utc: new Date().toISOString(),
        triggerSyncId: triggerAnims[0]?.payload?.triggerSyncId,
        triggerCount: triggerAnims.length,
        totalAnimCount: visualAnimations.length,
        willAnimate: !!this.animationManager,
      });
    }

    if (visualAnimations.length > 0) {
      debugLog('ANIM_TRACE', '[7/7] GameClient._onResponse received', {
        animCount: visualAnimations.length,
        animNames: visualAnimations.map(a => a.animationName),
        hasAnimationManager: !!this.animationManager,
        willPlayAnimations: !!this.animationManager && visualAnimations.length > 0,
      });
    }

    if (!this.animationManager || visualAnimations.length === 0) {
      this._applyState(state);
      return;
    }

    // TELEPORT_IN handling
    const hasTeleportIn = visualAnimations.some(anim => anim.animationName === 'TELEPORT_IN');

    if (hasTeleportIn) {
      const modifiedPlayers = addTeleportingFlags(
        { player1: state.player1, player2: state.player2 },
        visualAnimations
      );
      this.pendingHostState = { ...state, ...modifiedPlayers };
      this.pendingFinalHostState = state;
    } else {
      this.pendingHostState = state;
      this.pendingFinalHostState = null;
    }

    try {
      await this.animationManager.executeWithStateUpdate(visualAnimations, this);
    } finally {
      this.pendingHostState = null;
      this.pendingFinalHostState = null;
    }
  }

  // --- stateProvider protocol (AnimationManager.executeWithStateUpdate) ---

  async applyPendingStateUpdate() {
    if (this.pendingHostState) {
      debugLog('ANIMATIONS', '[STATE UPDATE] GameClient applying pending state');
      this._applyState(this.pendingHostState);
    }
  }

  getAnimationSource() {
    return 'SERVER';
  }

  revealTeleportedDrones() {
    if (!this.pendingFinalHostState) return;
    const current = this.getState();
    const revealed = {
      ...current,
      player1: { ...current.player1, lanes: this.pendingFinalHostState.player1?.lanes },
      player2: { ...current.player2, lanes: this.pendingFinalHostState.player2?.lanes },
    };
    this._applyState(revealed);
  }

  // --- Internal helpers ---

  _applyState(state) {
    debugLog('DEPLOY_TRACE', '[10/10] GameClient._applyState', {
      turnPhase: state.turnPhase, currentPlayer: state.currentPlayer,
      gameMode: state.gameMode,
    });
    // Guest mode: sync GSM so helper methods (getLocalPlayerState etc.) return current server-broadcast data
    if (state.gameMode === 'guest') {
      this.clientStateStore.gameStateManager.syncFromServer(state);
    }
    this.clientStateStore.applyUpdate(state);
  }

  _collectAnimations(animations) {
    if (!animations) return [];
    return [...(animations.actionAnimations || []), ...(animations.systemAnimations || [])];
  }

  /**
   * Extract PHASE_ANNOUNCEMENT and PASS_ANNOUNCEMENT from animations,
   * queue them into PhaseAnimationQueue, and return the remaining visual animations.
   */
  _extractAndQueueAnnouncements(allAnimations) {
    const announcementTypes = new Set(['PHASE_ANNOUNCEMENT', 'PASS_ANNOUNCEMENT']);
    const visualAnimations = [];
    let hadAnnouncements = false;

    for (const anim of allAnimations) {
      if (announcementTypes.has(anim.animationName)) {
        hadAnnouncements = true;
        this._handleAnnouncementAnimation(anim);
      } else {
        visualAnimations.push(anim);
      }
    }

    // Trigger playback if we queued announcements
    if (hadAnnouncements && this.phaseAnimationQueue && !this.phaseAnimationQueue.isPlaying()) {
      this.phaseAnimationQueue.startPlayback('GC:after_announcements');
    }

    return { visualAnimations, hadAnnouncements };
  }

  _handleAnnouncementAnimation(anim) {
    if (!this.phaseAnimationQueue) return;

    if (anim.animationName === 'PHASE_ANNOUNCEMENT') {
      const { phase, text, subtitle } = anim.payload;
      this.phaseAnimationQueue.queueAnimation(phase, text, subtitle, 'GC:server_phase');
      debugLog('ROUND_TRANSITION_TRACE', '[RT-GC] Phase announcement received from server', {
        utc: new Date().toISOString(), phase, text,
      });
    } else if (anim.animationName === 'PASS_ANNOUNCEMENT') {
      const { passedPlayerId } = anim.payload;
      const passText = passedPlayerId === this.playerId ? 'YOU PASSED' : 'OPPONENT PASSED';
      this.phaseAnimationQueue.queueAnimation('playerPass', passText, null, 'GC:server_pass');
      debugLog('ROUND_TRANSITION_TRACE', '[RT-GC] Pass announcement received from server', {
        utc: new Date().toISOString(), passedPlayerId, passText,
      });
    }
  }

  // --- Action ack handling (M1: guest desync prevention) ---

  _onActionAck({ actionType, success, error, authoritativeState }) {
    if (success) {
      debugLog('MP_SYNC_TRACE', '[7/11] GameClient action acknowledged', { actionType, success: true });
      return;
    }

    debugLog('MP_SYNC_TRACE', '[7/11] GameClient action rejected', { actionType, success: false, error });
    if (authoritativeState) {
      this._applyState({ ...authoritativeState, gameMode: this._localGameMode || this.getState().gameMode });
    }
  }

  // --- Queue drain handler (M2: phase animation playback trigger) ---

  _onQueueDrained() {
    if (!this.phaseAnimationQueue) return;
    if (this.phaseAnimationQueue.isPlaying()) return;

    const queueLength = this.phaseAnimationQueue.getQueueLength();
    if (queueLength > 0) {
      debugLog('TIMING', '[GameClient] Scheduling animation playback after queue drain (50ms delay)');
      setTimeout(() => {
        this.phaseAnimationQueue.startPlayback('GameClient:after_drain');
      }, 50);
    }
  }

  dispose() {
    this.transport.dispose();
  }
}

export default GameClient;
