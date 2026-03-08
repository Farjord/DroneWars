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
    this.pendingServerState = null;
    this.pendingFinalServerState = null;
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
        playerId: this.playerId,
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
      debugLog('ANIM_TRACE', '[6a/6] GameClient._onResponse entry', {
        previousPhase,
        newPhase,
        animCount: visualAnimations.length,
        hasTeleportIn: visualAnimations.some(a => a.animationName === 'TELEPORT_IN'),
        playerId: this.playerId,
      });
    }

    // Preserve local gameMode (cached on first response to avoid per-response spread overhead)
    if (!this._localGameMode) {
      this._localGameMode = this.getState().gameMode;
    }
    state = { ...state, gameMode: this._localGameMode, localPlayerId: this.playerId };

    const triggerAnims = visualAnimations.filter(a => a.animationName === 'TRIGGER_FIRED');
    if (triggerAnims.length > 0) {
      debugLog('TRIGGER_SYNC_TRACE', '[6/7] Trigger received by GameClient', {
        utc: new Date().toISOString(),
        triggerSyncId: triggerAnims[0]?.payload?.triggerSyncId,
        triggerCount: triggerAnims.length,
        totalAnimCount: visualAnimations.length,
        willAnimate: !!this.animationManager,
        playerId: this.playerId,
      });
    }

    if (visualAnimations.length > 0) {
      debugLog('ANIM_TRACE', '[6/6] GameClient._onResponse received', {
        animCount: visualAnimations.length,
        animNames: visualAnimations.map(a => a.animationName),
        hasAnimationManager: !!this.animationManager,
        willPlayAnimations: !!this.animationManager && visualAnimations.length > 0,
        playerId: this.playerId,
      });
    }

    if (!this.animationManager || visualAnimations.length === 0) {
      this._applyState(state);
      return;
    }

    // TELEPORT_IN handling
    const hasTeleportIn = visualAnimations.some(anim => anim.animationName === 'TELEPORT_IN');

    debugLog('DEPLOY_TRACE', '[9a/10] _onResponse: about to add isTeleporting flags', {
      hasTeleportIn,
    });

    if (hasTeleportIn) {
      const modifiedPlayers = addTeleportingFlags(
        { player1: state.player1, player2: state.player2 },
        visualAnimations
      );
      this.pendingServerState = { ...state, ...modifiedPlayers };
      this.pendingFinalServerState = state;
    } else {
      this.pendingServerState = state;
      this.pendingFinalServerState = null;
    }

    try {
      await this.animationManager.executeWithStateUpdate(visualAnimations, this);
    } finally {
      this.pendingServerState = null;
      this.pendingFinalServerState = null;
    }
  }

  // --- stateProvider protocol (AnimationManager.executeWithStateUpdate) ---

  async applyPendingStateUpdate() {
    if (this.pendingServerState) {
      debugLog('DEPLOY_TRACE', '[9b/10] applyPendingStateUpdate: applying state WITH isTeleporting', {
        hasPendingState: !!this.pendingServerState,
      });
      this._applyState(this.pendingServerState);
    }
  }

  getAnimationSource() {
    return 'SERVER';
  }

  revealTeleportedDrones() {
    if (!this.pendingFinalServerState) return;
    const current = this.getState();
    const revealed = {
      ...current,
      player1: { ...current.player1, dronesOnBoard: this.pendingFinalServerState.player1?.dronesOnBoard },
      player2: { ...current.player2, dronesOnBoard: this.pendingFinalServerState.player2?.dronesOnBoard },
    };
    this._applyState(revealed);
  }

  // --- Internal helpers ---

  _applyState(state) {
    debugLog('DEPLOY_TRACE', '[10/10] GameClient._applyState', {
      turnPhase: state.turnPhase, currentPlayer: state.currentPlayer,
      gameMode: state.gameMode, playerId: this.playerId,
    });
    // Guest mode: sync GSM so helper methods (getLocalPlayerState etc.) return current server state
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
        if (anim._apDirectQueued) {
          // Already direct-queued by ActionProcessor — skip to prevent duplicates
          continue;
        }
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

    // Phase 1: Diagnostic — trace when response has animations but no announcements
    if (!hadAnnouncements && allAnimations.length > 0) {
      debugLog('ANNOUNCE_TRACE', '[GC] Response had animations but no announcements', {
        animNames: allAnimations.map(a => a.animationName),
        phase: this.getState().turnPhase,
      });
    }

    return { visualAnimations, hadAnnouncements };
  }

  _handleAnnouncementAnimation(anim) {
    if (!this.phaseAnimationQueue) return;

    if (anim.animationName === 'PHASE_ANNOUNCEMENT') {
      const { phase, text, subtitle } = anim.payload;
      this.phaseAnimationQueue.queueAnimation(phase, text, subtitle, 'GC:server_phase');
      debugLog('ROUND_TRANSITION_TRACE', '[RT-GC] Phase announcement received from server', {
        utc: new Date().toISOString(), phase, text, playerId: this.playerId,
      });
    } else if (anim.animationName === 'PASS_ANNOUNCEMENT') {
      const { passedPlayerId } = anim.payload;
      const passText = passedPlayerId === this.playerId ? 'YOU PASSED' : 'OPPONENT PASSED';
      debugLog('ANNOUNCE_TRACE', '[GC] PASS_ANNOUNCEMENT arriving at GC (late path)', {
        passedPlayerId,
        passText,
        currentPAQLength: this.phaseAnimationQueue?.getQueueLength() ?? -1,
        isPlaying: this.phaseAnimationQueue?.isPlaying() ?? false,
        currentlyPlaying: this.phaseAnimationQueue?.getCurrentAnimation?.()?.phaseName || null,
      });
      this.phaseAnimationQueue.queueAnimation('playerPass', passText, null, 'GC:server_pass');
      debugLog('ROUND_TRANSITION_TRACE', '[RT-GC] Pass announcement received from server', {
        utc: new Date().toISOString(), passedPlayerId, passText, playerId: this.playerId,
      });
    }
  }

  // --- Action ack handling (M1: guest desync prevention) ---

  _onActionAck({ actionType, success, error, authoritativeState }) {
    if (success) {
      debugLog('MP_SYNC_TRACE', '[6/10] Client received action ack', { actionType, success: true });
      return;
    }

    debugLog('MP_SYNC_TRACE', '[6/10] Client received action ack', { actionType, success: false, error });
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
