// GameClient — Unified client for all game modes.
// Delegates action sending to a Transport, receives { state, animations }
// responses, plays animations via AnimationManager, and pushes state to
// ClientStateStore.

import GameServer from '../server/GameServer.js';
import { addTeleportingFlags } from '../utils/teleportUtils.js';
import { debugLog } from '../utils/debugLogger.js';
import { flowCheckpoint } from '../utils/flowVerification.js';

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
    flowCheckpoint('CLIENT_RECEIVED', {
      anims: allAnimations.length,
      phase: newPhase,
    });

    // Extract phase/pass announcements — route to PhaseAnimationQueue, not AnimationManager
    const { visualAnimations } = this._extractAndQueueAnnouncements(allAnimations);

    // Preserve local gameMode from current store state
    state = { ...state, gameMode: this.getState().gameMode, localPlayerId: this.playerId };

    if (visualAnimations.length > 0) {
      const triggerAnims = visualAnimations.filter(a => a.animationName === 'TRIGGER_FIRED');
      debugLog('ANIM_TRACE', '[6/6] GameClient._onResponse', {
        previousPhase,
        newPhase,
        animCount: visualAnimations.length,
        animNames: visualAnimations.map(a => a.animationName),
        hasTeleportIn: visualAnimations.some(a => a.animationName === 'TELEPORT_IN'),
        hasAnimationManager: !!this.animationManager,
        playerId: this.playerId,
        ...(triggerAnims.length > 0 && {
          triggerSyncId: triggerAnims[0]?.payload?.triggerSyncId,
          triggerCount: triggerAnims.length,
        }),
      });
    }

    if (!this.animationManager || visualAnimations.length === 0) {
      if (!this.animationManager && visualAnimations.length > 0) {
        debugLog('STATE_SYNC', 'GameClient: animations skipped — AnimationManager not yet wired', {
          animCount: visualAnimations.length,
        });
      }
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

  /**
   * Apply intermediate state during animation playback.
   * Called by AnimationManager when processing STATE_SNAPSHOT events.
   * Merges snapshot player states into current state, preserving non-player fields.
   */
  applyIntermediateState(snapshotPlayerStates) {
    debugLog('ANIM_TRACE', '[state-intermediate] applyIntermediateState', {
      hasPlayer1: !!snapshotPlayerStates.player1,
      hasPlayer2: !!snapshotPlayerStates.player2,
    });
    const current = this.getState();
    this._applyState({
      ...current,
      player1: snapshotPlayerStates.player1 || current.player1,
      player2: snapshotPlayerStates.player2 || current.player2,
    });
  }

  // --- Internal helpers ---

  _applyState(state) {
    debugLog('DEPLOY_TRACE', '[10/10] GameClient._applyState', {
      turnPhase: state.turnPhase, currentPlayer: state.currentPlayer,
      gameMode: state.gameMode, playerId: this.playerId,
    });
    // Remote client mode: sync GSM so helper methods (getLocalPlayerState etc.) return current server state
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
    let announcementCount = 0;

    for (const anim of allAnimations) {
      if (announcementTypes.has(anim.animationName)) {
        announcementCount++;
        this._handleAnnouncementAnimation(anim);
      } else {
        visualAnimations.push(anim);
      }
    }

    flowCheckpoint('ANNOUNCEMENTS_SPLIT', {
      toQueue: announcementCount,
      toVisual: visualAnimations.length,
    });

    // Trigger playback if we queued announcements
    if (announcementCount > 0 && this.phaseAnimationQueue && !this.phaseAnimationQueue.isPlaying()) {
      this.phaseAnimationQueue.startPlayback('GC:after_announcements');
    }

    return { visualAnimations };
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
      this.phaseAnimationQueue.queueAnimation('playerPass', passText, null, 'GC:server_pass');
      debugLog('ROUND_TRANSITION_TRACE', '[RT-GC] Pass announcement received from server', {
        utc: new Date().toISOString(), passedPlayerId, passText, playerId: this.playerId,
      });
    }
  }

  // --- Action ack handling (M1: remote client desync prevention) ---

  _onActionAck({ actionType, success, error, authoritativeState }) {
    if (success) {
      debugLog('MP_SYNC_TRACE', '[6/10] Client received action ack', { actionType, success: true });
      return;
    }

    debugLog('MP_SYNC_TRACE', '[6/10] Client received action ack', { actionType, success: false, error });
    if (authoritativeState) {
      this._applyState({ ...authoritativeState, gameMode: this.getState().gameMode });
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
