// GameClient — Unified client for all game modes.
// Delegates action sending to a Transport, receives { state, animations }
// responses, plays animations via AnimationManager, and pushes state to
// ClientStateStore.

import GameServer from '../server/GameServer.js';
import { addTeleportingFlags } from '../utils/teleportUtils.js';
import { debugLog } from '../utils/debugLogger.js';
import { flowCheckpoint } from '../utils/flowVerification.js';
import { extractAnnouncements } from '../utils/announcementUtils.js';
import { TRIGGER_FIRED, TELEPORT_IN } from '../config/animationTypes.js';

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
    this.pendingFullFinalState = null;
    this._teleportingDroneIds = new Set();

    // Response queue — serializes _onResponse processing so concurrent
    // server broadcasts (e.g., deferred continuation) don't overlap
    this._responseQueue = [];
    this._processingResponse = false;
    // Wire up transport handlers
    this.transport.onResponse(response => this._onResponse(response));
    this.transport.onActionAck(ack => this._onActionAck(ack));
    // onQueueDrained no longer needed — AnnouncementQueue auto-plays on enqueue
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

  async _onResponse(data) {
    this._responseQueue.push(data);
    if (this._processingResponse) return;
    this._processingResponse = true;
    try {
      while (this._responseQueue.length > 0) {
        try {
          await this._processResponse(this._responseQueue.shift());
        } catch (error) {
          debugLog('STATE_SYNC', 'Error processing server response', { error: error.message });
        }
      }
    } finally {
      this._processingResponse = false;
      // Signal: all responses processed, all animations complete
      const gsm = this.clientStateStore?.gameStateManager;
      if (gsm) {
        debugLog('AI_TURN_TRACE', '[AI-00] RESPONSE_CYCLE_COMPLETE emitting');
        gsm.emit('RESPONSE_CYCLE_COMPLETE');
      }
    }
  }

  async _processResponse({ state, animations }) {
    const previousPhase = this.getState().turnPhase;
    const newPhase = state.turnPhase;
    const allAnimations = this._collectAnimations(animations);

    flowCheckpoint('CLIENT_RECEIVED', {
      anims: allAnimations.length,
      phase: newPhase,
    });

    // Extract deployment meta event (carries preDeployTriggerState) before announcement routing.
    // This event is never played as a visual animation — it only informs pending state setup.
    const preDeployMeta = allAnimations.find(a => a.animationName === 'DEPLOYMENT_PRE_TRIGGER');
    const preDeployTriggerState = preDeployMeta?.payload?.preDeployTriggerState ?? null;
    const animationsForDisplay = preDeployMeta
      ? allAnimations.filter(a => a.animationName !== 'DEPLOYMENT_PRE_TRIGGER')
      : allAnimations;

    // Extract phase/pass announcements — route to AnnouncementQueue, not AnimationManager
    const { visualAnimations } = this._extractAndQueueAnnouncements(animationsForDisplay);

    // Preserve local gameMode from current store state
    state = { ...state, gameMode: this.getState().gameMode, localPlayerId: this.playerId };

    // Notify UI of interception immediately (before animation pipeline)
    if (state.lastInterception) {
      const gsm = this.clientStateStore?.gameStateManager;
      if (gsm) {
        gsm.emit('INTERCEPTION_OCCURRED', { lastInterception: state.lastInterception });
      }
      // Consume one-shot notification — prevent it persisting in the React store
      // and re-triggering the useInterception fallback useEffect on every update
      state.lastInterception = null;
    }

    // No visual animations — apply state immediately.
    // Announcement overlay (if any) covers the full screen, so background
    // UI updates are invisible. This lets hooks react to phase transitions
    // without waiting for the overlay to finish (~1.8s).
    if (!this.animationManager || visualAnimations.length === 0) {
      if (!this.animationManager && visualAnimations.length > 0) {
        debugLog('STATE_SYNC', 'GameClient: animations skipped — AnimationManager not yet wired', {
          animCount: visualAnimations.length,
        });
      }
      this._applyState(state);
      // Still await announcement completion to maintain response ordering
      if (this.phaseAnimationQueue) {
        await this.phaseAnimationQueue.waitUntilIdle();
      }
      return;
    }

    if (visualAnimations.length > 0) {
      const triggerAnims = visualAnimations.filter(a => a.animationName === TRIGGER_FIRED);
      debugLog('ANIM_TRACE', '[6/6] GameClient._onResponse', {
        previousPhase,
        newPhase,
        animCount: visualAnimations.length,
        animNames: visualAnimations.map(a => a.animationName),
        hasTeleportIn: visualAnimations.some(a => a.animationName === TELEPORT_IN),
        hasAnimationManager: !!this.animationManager,
        playerId: this.playerId,
        ...(triggerAnims.length > 0 && {
          triggerSyncId: triggerAnims[0]?.payload?.triggerSyncId,
          triggerCount: triggerAnims.length,
        }),
      });
    }

    // Visual animations present — wait for announcement overlay before
    // playing animations or applying state (original behavior).
    if (this.phaseAnimationQueue) {
      await this.phaseAnimationQueue.waitUntilIdle();
    }

    // TELEPORT_IN handling
    const hasTeleportIn = visualAnimations.some(anim => anim.animationName === TELEPORT_IN);
    const hasTriggerAnimations = visualAnimations.some(anim => anim.animationName === TRIGGER_FIRED);

    debugLog('DEPLOY_TRACE', '[9a/10] _onResponse: about to add isTeleporting flags', {
      hasTeleportIn,
      hasTriggerAnimations,
      hasPreDeployTriggerState: !!preDeployTriggerState,
    });

    if (hasTeleportIn && hasTriggerAnimations && preDeployTriggerState) {
      // Deployment with TELEPORT_IN + triggers: use mark-free pre-trigger state as the
      // intermediate pending state so the mark does not appear before TELEPORT_IN plays.
      // pendingServerState  → pre-trigger players + isTeleporting (drone invisible)
      // pendingFinalServerState → pre-trigger players (no isTeleporting, for drone reveal at 70%)
      // pendingFullFinalState   → full engine state (applied after all animations for turn transitions)
      const preStateWithTeleporting = addTeleportingFlags(
        { player1: preDeployTriggerState.player1, player2: preDeployTriggerState.player2 },
        visualAnimations
      );
      this.pendingServerState = { ...state, ...preStateWithTeleporting };
      this.pendingFinalServerState = { ...state, ...preDeployTriggerState };
      this.pendingFullFinalState = state;
    } else if (hasTeleportIn) {
      const modifiedPlayers = addTeleportingFlags(
        { player1: state.player1, player2: state.player2 },
        visualAnimations
      );
      this.pendingServerState = { ...state, ...modifiedPlayers };
      this.pendingFinalServerState = state;
      this.pendingFullFinalState = null;
    } else {
      this.pendingServerState = state;
      this.pendingFinalServerState = null;
      this.pendingFullFinalState = null;
    }

    this._teleportingDroneIds = hasTeleportIn
      ? new Set(
          visualAnimations
            .filter(a => a.animationName === TELEPORT_IN)
            .map(a => a.payload?.targetId)
            .filter(Boolean)
        )
      : new Set();

    try {
      await this.animationManager.executeWithStateUpdate(visualAnimations, this);
      // Apply full final state after all animations — handles turn transitions
      // deferred when using pre-trigger state as pendingServerState.
      if (this.pendingFullFinalState) {
        this._applyState(this.pendingFullFinalState);
      }
    } finally {
      this.pendingServerState = null;
      this.pendingFinalServerState = null;
      this.pendingFullFinalState = null;
      this._teleportingDroneIds = new Set();
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
    // Clear teleporting IDs now that the drone is being revealed — subsequent
    // STATE_SNAPSHOT events must not re-hide the already-visible drone.
    this._teleportingDroneIds = new Set();
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
   * Re-applies isTeleporting on drones that are currently mid-teleport — server
   * snapshots never carry this client-side flag, so without this a teleporting
   * drone would flash visible in any mid-sequence state update before TELEPORT_IN plays.
   */
  applyIntermediateState(snapshotPlayerStates) {
    debugLog('ANIM_TRACE', '[state-intermediate] applyIntermediateState', {
      hasPlayer1: !!snapshotPlayerStates.player1,
      hasPlayer2: !!snapshotPlayerStates.player2,
    });
    const current = this.getState();

    const preserveTeleportingFlags = (newPlayer) => {
      if (!newPlayer?.dronesOnBoard || this._teleportingDroneIds.size === 0) return newPlayer;
      let anyModified = false;
      const dronesOnBoard = Object.fromEntries(
        Object.entries(newPlayer.dronesOnBoard).map(([lane, drones]) => [
          lane,
          Array.isArray(drones)
            ? drones.map(drone => {
                if (this._teleportingDroneIds.has(drone.id) && !drone.isTeleporting) {
                  anyModified = true;
                  return { ...drone, isTeleporting: true };
                }
                return drone;
              })
            : drones,
        ])
      );
      return anyModified ? { ...newPlayer, dronesOnBoard } : newPlayer;
    };

    this._applyState({
      ...current,
      player1: preserveTeleportingFlags(snapshotPlayerStates.player1 || current.player1),
      player2: preserveTeleportingFlags(snapshotPlayerStates.player2 || current.player2),
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
   * queue them into AnnouncementQueue (auto-plays), return remaining visual animations.
   * Server has already personalized all text/subtitles — client just passes through.
   * Delegates to shared extractAnnouncements utility (single source of truth).
   */
  _extractAndQueueAnnouncements(allAnimations) {
    const { announcements, visualAnimations } = extractAnnouncements(allAnimations);

    flowCheckpoint('ANNOUNCEMENTS_SPLIT', {
      toQueue: announcements.length,
      toVisual: visualAnimations.length,
    });

    if (announcements.length > 0 && this.phaseAnimationQueue) {
      this.phaseAnimationQueue.enqueueAll(announcements);
    }

    return { visualAnimations };
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

  dispose() {
    this.transport.dispose();
  }
}

export default GameClient;
