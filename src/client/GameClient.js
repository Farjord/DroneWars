// GameClient — Unified client for all game modes.
// Delegates action sending to a Transport, receives { state, animations }
// responses, plays animations via AnimationManager, and pushes state to
// ClientStateStore.

import GameServer from '../server/GameServer.js';
import { addTeleportingFlags } from '../utils/teleportUtils.js';
import { debugLog } from '../utils/debugLogger.js';

const PHASE_SUBTITLE_MAP = {
  roundInitialization: 'Drawing Cards, Gaining Energy, Resetting Drones...',
  actionComplete: 'Transitioning to Next Round',
};

const PHASE_TEXT_MAP = {
  roundAnnouncement: 'ROUND',
  roundInitialization: 'UPKEEP',
  mandatoryDiscard: 'MANDATORY DISCARD PHASE',
  optionalDiscard: 'OPTIONAL DISCARD PHASE',
  allocateShields: 'ALLOCATE SHIELDS',
  mandatoryDroneRemoval: 'REMOVE EXCESS DRONES',
  deployment: 'DEPLOYMENT PHASE',
  deploymentComplete: 'DEPLOYMENT COMPLETE',
  action: 'ACTION PHASE',
  actionComplete: 'ACTION PHASE COMPLETE',
};

class GameClient extends GameServer {
  constructor(transport, { clientStateStore, playerId, isMultiplayer = false, phaseAnimationQueue = null, animationManager = null }) {
    super();
    this.transport = transport;
    this.clientStateStore = clientStateStore;
    this.playerId = playerId;
    this._isMultiplayer = isMultiplayer;
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
      debugLog('DEPLOY_TRACE', '[2/12] GameClient.submitAction routing to transport', {
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
    return this._isMultiplayer;
  }

  isPlayerAI(playerId) {
    return !this._isMultiplayer && playerId !== this.playerId;
  }

  onStateUpdate(callback) {
    return this.clientStateStore.subscribe(callback);
  }

  // --- Transport response handler ---

  async _onResponse({ state, animations }) {
    const previousPhase = this.getState().turnPhase;
    const newPhase = state.turnPhase;
    const allAnimations = this._collectAnimations(animations);
    debugLog('ANIM_TRACE', '[7a/7] GameClient._onResponse entry', {
      previousPhase,
      newPhase,
      animCount: allAnimations.length,
      hasTeleportIn: allAnimations.some(a => a.animationName === 'TELEPORT_IN'),
    });

    // Queue phase announcements for multiplayer transitions
    if (this._isMultiplayer) {
      this._queuePhaseAnnouncements(previousPhase, newPhase);
    }

    // Preserve local gameMode (cached on first response to avoid per-response spread overhead)
    if (!this._localGameMode) {
      this._localGameMode = this.getState().gameMode;
    }
    state = { ...state, gameMode: this._localGameMode };

    debugLog('ANIM_TRACE', '[7/7] GameClient._onResponse received', {
      animCount: allAnimations.length,
      animNames: allAnimations.map(a => a.animationName),
      hasAnimationManager: !!this.animationManager,
      willPlayAnimations: !!this.animationManager && allAnimations.length > 0,
    });

    if (!this.animationManager || allAnimations.length === 0) {
      this._applyState(state);
      return;
    }

    // TELEPORT_IN handling
    const hasTeleportIn = allAnimations.some(anim => anim.animationName === 'TELEPORT_IN');

    if (hasTeleportIn) {
      const modifiedPlayers = addTeleportingFlags(
        { player1: state.player1, player2: state.player2 },
        allAnimations
      );
      this.pendingHostState = { ...state, ...modifiedPlayers };
      this.pendingFinalHostState = state;
    } else {
      this.pendingHostState = state;
      this.pendingFinalHostState = null;
    }

    try {
      await this.animationManager.executeWithStateUpdate(allAnimations, this);
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
    return this._isMultiplayer ? 'HOST_RESPONSE' : 'LOCAL_ENGINE';
  }

  revealTeleportedDrones() {
    if (this.pendingFinalHostState) {
      this._applyState(this.pendingFinalHostState);
    }
  }

  // --- Internal helpers ---

  _applyState(state) {
    this.clientStateStore.applyUpdate(state);
  }

  _collectAnimations(animations) {
    if (!animations) return [];
    return [...(animations.actionAnimations || []), ...(animations.systemAnimations || [])];
  }

  // --- Phase announcement queueing ---

  _queuePhaseAnnouncements(guestPhase, hostPhase) {
    if (!this.phaseAnimationQueue || guestPhase === hostPhase) return;

    // PATTERN 1: action → non-action (round transition)
    if (guestPhase === 'action' && hostPhase !== 'action' && PHASE_TEXT_MAP[hostPhase]) {
      const currentState = this.getState();
      const localPassKey = `${this.playerId}Passed`;

      if (currentState.passInfo?.[localPassKey] && currentState.passInfo.firstPasser === this.playerId) {
        this.phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null, 'GC:pattern1_pass');
      }

      this.phaseAnimationQueue.queueAnimation('actionComplete', 'ACTION PHASE COMPLETE', 'Transitioning to Next Round', 'GC:pattern1_actionComplete');
      this.phaseAnimationQueue.queueAnimation('roundAnnouncement', 'ROUND', null, 'GC:pattern1_round');
    }

    // PATTERN 2: placement → roundInitialization (Round 1)
    else if (guestPhase === 'placement' && hostPhase === 'roundInitialization') {
      this.phaseAnimationQueue.queueAnimation('roundAnnouncement', 'ROUND', null, 'GC:pattern2_round');
    }

    // PATTERN 2.5: deployment → action
    else if (guestPhase === 'deployment' && hostPhase === 'action') {
      const currentState = this.getState();
      const localPassKey = `${this.playerId}Passed`;

      if (currentState.passInfo?.[localPassKey] && currentState.passInfo.firstPasser === this.playerId) {
        this.phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null, 'GC:pattern2.5_pass');
      }

      this.phaseAnimationQueue.queueAnimation('deploymentComplete', 'DEPLOYMENT COMPLETE', null, 'GC:pattern2.5_deploy');
    }

    // PATTERN 3: Generic phase announcement for target phase
    if (PHASE_TEXT_MAP[hostPhase]) {
      const subtitle = PHASE_SUBTITLE_MAP[hostPhase] ?? null;
      this.phaseAnimationQueue.queueAnimation(hostPhase, PHASE_TEXT_MAP[hostPhase], subtitle, 'GC:pattern3_generic');
    }
  }

  // --- Action ack handling (M1: guest desync prevention) ---

  _onActionAck({ actionType, success, error, authoritativeState }) {
    if (success) {
      debugLog('STATE_SYNC', `[GameClient] Action acknowledged: ${actionType}`);
      return;
    }

    debugLog('STATE_SYNC', `[GameClient] Action rejected: ${actionType} — ${error}`);
    if (authoritativeState) {
      this._applyState({ ...authoritativeState, gameMode: this._localGameMode || this.getState().gameMode });
    }
  }

  // --- Queue drain handler (M2: phase animation playback trigger) ---

  _onQueueDrained() {
    if (!this._isMultiplayer || !this.phaseAnimationQueue) return;
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
