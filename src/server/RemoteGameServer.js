// RemoteGameServer — Guest-mode server that sends actions to host,
// processes locally for optimistic feedback, and handles the full
// host→guest receive path (state updates, animations, phase announcements).

import GameServer from './GameServer.js';
import MessageQueue from './MessageQueue.js';
import { addTeleportingFlags } from '../utils/teleportUtils.js';
import { arraysMatch, dronesMatch } from '../utils/stateComparisonUtils.js';
import { debugLog } from '../utils/debugLogger.js';

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

const MILESTONE_PHASES = ['droneSelection', 'placement', 'mandatoryDiscard', 'optionalDiscard', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'];

class RemoteGameServer extends GameServer {
  constructor(gameStateManager, p2pManager, { phaseAnimationQueue } = {}) {
    super();
    this.gameStateManager = gameStateManager;
    this.p2pManager = p2pManager;
    this.phaseAnimationQueue = phaseAnimationQueue;

    // stateProvider protocol fields (used by AnimationManager.executeWithStateUpdate)
    this.pendingHostState = null;
    this.pendingFinalHostState = null;

    // Validation state
    this.validatingState = {
      isValidating: false,
      targetPhase: null,
      guestState: null,
      timestamp: null,
    };

    this.messageQueue = null;
  }

  // --- Initialization ---

  initialize() {
    this.messageQueue = new MessageQueue({
      processMessage: (message) => this._processMessage(message),
      onResyncNeeded: () => this._onResyncNeeded(),
      onResyncResponse: (fullState) => this._onResyncResponse(fullState),
      onQueueDrained: () => this._onQueueDrained(),
    });

    this.p2pManager.subscribe((event) => {
      if (event.type === 'state_update_received') {
        this.messageQueue.enqueue(event);
      } else if (event.type === 'action_ack_received') {
        this._handleActionAck(event.data);
      }
    });
  }

  // --- GameServer interface ---

  async submitAction(type, payload) {
    this.p2pManager.sendActionToHost(type, payload);
    const result = await this.gameStateManager.processAction(type, payload);
    if (result.animations) {
      this.gameStateManager.trackOptimisticAnimations(result.animations);
    }
    return result;
  }

  getState() {
    return this.gameStateManager.getState();
  }

  getPlayerView(_playerId) {
    return this.getState();
  }

  getLocalPlayerId() {
    return 'player2';
  }

  isMultiplayer() {
    return true;
  }

  isPlayerAI() {
    return false;
  }

  onStateUpdate(callback) {
    return this.gameStateManager.subscribe(callback);
  }

  // --- stateProvider protocol (AnimationManager.executeWithStateUpdate) ---

  async applyPendingStateUpdate() {
    if (this.pendingHostState) {
      debugLog('ANIMATIONS', '[STATE UPDATE] RemoteGameServer applying pending host state');
      this.gameStateManager.applyHostState(this.pendingHostState);
    }
  }

  getAnimationSource() {
    return 'HOST_RESPONSE';
  }

  revealTeleportedDrones() {
    if (this.pendingFinalHostState) {
      this.gameStateManager.applyHostState(this.pendingFinalHostState);
    }
  }

  // --- Validation ---

  startValidation(targetPhase, guestState) {
    this.validatingState = {
      isValidating: true,
      targetPhase,
      guestState: JSON.parse(JSON.stringify(guestState)),
      timestamp: Date.now(),
    };
  }

  shouldValidateBroadcast(incomingPhase) {
    return this.validatingState.isValidating &&
           this.validatingState.targetPhase === incomingPhase;
  }

  // --- MessageQueue callbacks ---

  _handleActionAck({ actionType, success, error, authoritativeState }) {
    if (success) {
      debugLog('TIMING', `[GUEST] Action acknowledged by host: ${actionType}`);
      return;
    }

    // Host rejected the action — revert optimistic state
    debugLog('TIMING', `⚠️ [GUEST] Action rejected by host: ${actionType} — ${error}`);
    if (authoritativeState) {
      this.gameStateManager.applyHostState(authoritativeState);
    }
  }

  _onResyncNeeded() {
    if (this.p2pManager) {
      this.p2pManager.requestFullSync();
    }
  }

  _onResyncResponse(fullState) {
    if (fullState.state) {
      this.gameStateManager.applyHostState(fullState.state);
    }
  }

  _onQueueDrained() {
    if (this.phaseAnimationQueue && !this.phaseAnimationQueue.isPlaying()) {
      const queueLength = this.phaseAnimationQueue.getQueueLength();
      if (queueLength > 0) {
        debugLog('TIMING', `[GUEST] Scheduling animation playback after React render (50ms delay)`);
        setTimeout(() => {
          this.phaseAnimationQueue.startPlayback('RemoteGameServer:after_drain');
        }, 50);
      }
    }
  }

  async _processMessage(message) {
    if (message.type === 'state_update_received') {
      await this._processStateUpdate(message.data);
    }
  }

  // --- Core receive path ---

  async _processStateUpdate({ state, actionAnimations, systemAnimations }) {
    // Validation mode: check if broadcast matches validation target
    if (this.shouldValidateBroadcast(state.turnPhase)) {
      await this._validateOptimisticState(state);
      this.validatingState.isValidating = false;
      return;
    }

    const guestPhase = this.gameStateManager.getState().turnPhase;
    const hostPhase = state.turnPhase;

    // Queue phase announcements based on transition patterns
    this._queuePhaseAnnouncements(guestPhase, hostPhase);

    // Preserve guest gameMode
    state = { ...state, gameMode: this.gameStateManager.getState().gameMode };

    // Filter duplicate animations (optimistic dedup)
    const filtered = this.gameStateManager.filterAnimations(
      actionAnimations || [],
      systemAnimations || []
    );

    const allAnimations = [...filtered.actionAnimations, ...filtered.systemAnimations];

    // Check if all animations were filtered out
    const totalIncoming = (actionAnimations?.length || 0) + (systemAnimations?.length || 0);
    const allFiltered = totalIncoming > 0 && allAnimations.length === 0;

    if (allFiltered) {
      const currentState = this.gameStateManager.getState();
      const statesMatch = this._compareGameStates(currentState, state);
      if (statesMatch) {
        return; // Skip redundant state application
      }
    }

    // Get AnimationManager
    const animationManager = this.gameStateManager.actionProcessor?.animationManager;

    if (!animationManager) {
      this.gameStateManager.applyHostState(state);
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
      await animationManager.executeWithStateUpdate(allAnimations, this);
    } finally {
      this.pendingHostState = null;
      this.pendingFinalHostState = null;
    }
  }

  // --- Phase announcement queueing ---

  _queuePhaseAnnouncements(guestPhase, hostPhase) {
    if (!this.phaseAnimationQueue || guestPhase === hostPhase) return;

    // PATTERN 1: action → non-action (round transition)
    if (guestPhase === 'action' && hostPhase !== 'action' && PHASE_TEXT_MAP[hostPhase]) {
      const guestState = this.gameStateManager.getState();
      const localPlayerId = this.gameStateManager.getLocalPlayerId();
      const localPassKey = `${localPlayerId}Passed`;

      if (guestState.passInfo?.[localPassKey] && guestState.passInfo.firstPasser === localPlayerId) {
        this.phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null, 'RGS:pattern1_pass');
      }

      this.phaseAnimationQueue.queueAnimation('actionComplete', 'ACTION PHASE COMPLETE', 'Transitioning to Next Round', 'RGS:pattern1_actionComplete');
      this.phaseAnimationQueue.queueAnimation('roundAnnouncement', 'ROUND', null, 'RGS:pattern1_round');
    }

    // PATTERN 2: placement → roundInitialization (Round 1)
    else if (guestPhase === 'placement' && hostPhase === 'roundInitialization') {
      this.phaseAnimationQueue.queueAnimation('roundAnnouncement', 'ROUND', null, 'RGS:pattern2_round');
    }

    // PATTERN 2.5: deployment → action
    else if (guestPhase === 'deployment' && hostPhase === 'action') {
      const guestState = this.gameStateManager.getState();
      const localPlayerId = this.gameStateManager.getLocalPlayerId();
      const localPassKey = `${localPlayerId}Passed`;

      if (guestState.passInfo?.[localPassKey] && guestState.passInfo.firstPasser === localPlayerId) {
        this.phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null, 'RGS:pattern2.5_pass');
      }

      this.phaseAnimationQueue.queueAnimation('deploymentComplete', 'DEPLOYMENT COMPLETE', null, 'RGS:pattern2.5_deploy');
    }

    // PATTERN 3: Generic phase announcement for target phase
    if (PHASE_TEXT_MAP[hostPhase]) {
      const subtitle = hostPhase === 'roundInitialization'
        ? 'Drawing Cards, Gaining Energy, Resetting Drones...'
        : hostPhase === 'actionComplete'
          ? 'Transitioning to Next Round'
          : null;

      this.phaseAnimationQueue.queueAnimation(hostPhase, PHASE_TEXT_MAP[hostPhase], subtitle, 'RGS:pattern3_generic');
    }
  }

  // --- State comparison ---

  _compareGameStates(currentState, hostState) {
    const players = ['player1', 'player2'];

    for (const player of players) {
      const p1 = currentState[player];
      const p2 = hostState[player];

      if (p1.energy !== p2.energy) return false;
      if (p1.shields !== p2.shields) return false;
      if (p1.health !== p2.health) return false;

      // Redacted state: opponent hand is [] with handCount — compare counts only
      if (p2.handCount !== undefined) {
        if ((p1.hand?.length ?? p1.handCount ?? 0) !== p2.handCount) return false;
      } else {
        const hand1Ids = p1.hand?.map(c => c.instanceId) || [];
        const hand2Ids = p2.hand?.map(c => c.instanceId) || [];
        if (!arraysMatch(hand1Ids, hand2Ids, `${player}.hand`)) return false;
      }

      for (const lane of ['lane1', 'lane2', 'lane3']) {
        if (!dronesMatch(p1.dronesOnBoard?.[lane] || [], p2.dronesOnBoard?.[lane] || [], `${player}.${lane}`)) return false;
        if (!dronesMatch(p1.techSlots?.[lane] || [], p2.techSlots?.[lane] || [], `${player}.techSlots.${lane}`)) return false;
      }
    }

    if (currentState.currentPlayer !== hostState.currentPlayer) return false;
    if (currentState.turnPhase !== hostState.turnPhase) return false;
    if (currentState.roundNumber !== hostState.roundNumber) return false;

    return true;
  }

  // --- Validation ---

  async _validateOptimisticState(hostState) {
    const guestState = this.validatingState.guestState;
    const mismatches = this._deepCompareStates(guestState, hostState, 'state');

    if (mismatches.length > 0) {
      debugLog('VALIDATION', 'Guest optimistic state differs from host', {
        mismatchCount: mismatches.length,
        mismatches: mismatches.slice(0, 10),
      });
    }

    // Always apply host state (host is authoritative)
    this.gameStateManager.applyHostState(hostState);
  }

  _deepCompareStates(guestState, hostState, path = '') {
    const mismatches = [];

    // Skip redacted private fields — host state has handCount when redacted
    const REDACTED_FIELDS = ['hand', 'deck', 'discardPile'];
    const isRedactedPlayer = hostState?.handCount !== undefined;

    const allKeys = new Set([
      ...Object.keys(guestState || {}),
      ...Object.keys(hostState || {}),
    ]);

    for (const key of allKeys) {
      const fullPath = path ? `${path}.${key}` : key;

      // Skip private fields on redacted player objects
      if (isRedactedPlayer && REDACTED_FIELDS.includes(key)) continue;

      const guestVal = guestState?.[key];
      const hostVal = hostState?.[key];

      if (typeof guestVal !== typeof hostVal) {
        mismatches.push(`${fullPath}: type mismatch (${typeof guestVal} vs ${typeof hostVal})`);
        continue;
      }

      if (guestVal === null || guestVal === undefined || hostVal === null || hostVal === undefined) {
        if (guestVal !== hostVal) mismatches.push(`${fullPath}: ${guestVal} vs ${hostVal}`);
        continue;
      }

      if (Array.isArray(guestVal) && Array.isArray(hostVal)) {
        if (!arraysMatch(guestVal, hostVal, fullPath)) {
          mismatches.push(`${fullPath}: array mismatch (lengths: ${guestVal.length} vs ${hostVal.length})`);
        }
        continue;
      }

      if (typeof guestVal === 'object' && typeof hostVal === 'object') {
        mismatches.push(...this._deepCompareStates(guestVal, hostVal, fullPath));
        continue;
      }

      if (guestVal !== hostVal) {
        mismatches.push(`${fullPath}: ${guestVal} vs ${hostVal}`);
      }
    }

    return mismatches;
  }
}

export default RemoteGameServer;
