// ========================================
// GUEST SYNC MANAGER
// ========================================
// Handles P2P guest integration, optimistic action tracking,
// host state application, and milestone validation.
// Extracted from GameStateManager — receives GSM via constructor injection.

import GuestMessageQueueService from './GuestMessageQueueService.js';
import OptimisticActionService from './OptimisticActionService.js';
import { debugLog } from '../utils/debugLogger.js';

class GuestSyncManager {
  constructor(gsm) {
    this.gsm = gsm;

    // Optimistic action tracking for client-side prediction (guest mode)
    this.optimisticActionService = new OptimisticActionService();

    // Guest message queue service (initialized when guest joins)
    this.guestQueueService = null;

    // P2P integration will be set up lazily when needed
    this.p2pIntegrationSetup = false;

    // Phases where guest stops and validates state with host
    this.MILESTONE_PHASES = ['droneSelection', 'placement', 'mandatoryDiscard', 'optionalDiscard', 'allocateShields', 'mandatoryDroneRemoval', 'deployment'];

    // Tracks when guest is waiting for specific broadcast to validate optimistic state
    this.validatingState = {
      isValidating: false,
      targetPhase: null,
      guestState: null,
      timestamp: null
    };
  }

  // --- P2P Integration ---

  setupP2PIntegration(p2pManager) {
    if (this.p2pIntegrationSetup) return;

    // Wire up bidirectional integration
    this.gsm.actionProcessor.setP2PManager(p2pManager);
    p2pManager.setActionProcessor(this.gsm.actionProcessor);

    // Subscribe to P2P events
    p2pManager.subscribe((event) => {
      switch (event.type) {
        case 'multiplayer_mode_change':
          this.gsm.setMultiplayerMode(event.data.mode, event.data.isHost);

          // Initialize guest queue service when becoming guest
          if (event.data.mode === 'guest' && !this.guestQueueService) {
            debugLog('STATE_SYNC', '🎯 [GUEST QUEUE] Initializing service for guest mode');
            const phaseAnimationQueue = this.gsm.actionProcessor?.phaseAnimationQueue || null;
            this.guestQueueService = new GuestMessageQueueService(this.gsm, phaseAnimationQueue);
            this.guestQueueService.initialize(p2pManager);
          }
          break;
        case 'state_update_received':
          if (this.gsm.state.gameMode === 'guest' && !this.guestQueueService) {
            debugLog('STATE_SYNC', '⚠️ [GUEST QUEUE] Service not initialized, applying state directly (fallback)');
            this.applyHostState(event.data.state);
          }
          break;
        case 'state_sync_requested': {
          const currentState = this.gsm.getState();
          p2pManager.sendData({
            type: 'GAME_STATE_SYNC',
            state: currentState,
            timestamp: Date.now(),
          });
          break;
        }
      }
    });

    this.p2pIntegrationSetup = true;
  }

  // --- Validation ---

  startValidation(targetPhase, guestState) {
    this.validatingState = {
      isValidating: true,
      targetPhase: targetPhase,
      guestState: JSON.parse(JSON.stringify(guestState)),
      timestamp: Date.now()
    };

    debugLog('VALIDATION', '🔍 [START VALIDATION] Waiting for host broadcast', {
      targetPhase,
      currentPhase: guestState.turnPhase
    });
  }

  shouldValidateBroadcast(incomingPhase) {
    return this.validatingState.isValidating &&
           this.validatingState.targetPhase === incomingPhase;
  }

  isMilestonePhase(phase) {
    return this.MILESTONE_PHASES.includes(phase);
  }

  // --- Host State Application ---

  applyHostState(hostState) {
    if (this.gsm.state.gameMode !== 'guest') {
      debugLog('STATE_SYNC', '⚠️ applyHostState should only be called in guest mode');
      return;
    }

    const beforeFields = Object.keys(this.gsm.state).length;
    debugLog('BROADCAST_TIMING', `📝 [GUEST APPLY] Before: ${beforeFields} fields | Incoming: ${Object.keys(hostState).length} fields | Phase: ${hostState.turnPhase} → ${this.gsm.state.turnPhase}`);

    debugLog('STATE_SYNC', '[GUEST STATE UPDATE] Applying state from host:', {
      turnPhase: hostState.turnPhase,
      currentPlayer: hostState.currentPlayer,
      roundNumber: hostState.roundNumber
    });

    debugLog('STATE_SYNC', '[GUEST] Received player2 hand from host:', {
      handSize: hostState.player2?.hand?.length || 0,
      sampleCard: hostState.player2?.hand?.[0] || null,
      sampleInstanceId: hostState.player2?.hand?.[0]?.instanceId,
      hasInstanceId: hostState.player2?.hand?.[0]?.instanceId !== undefined
    });

    if (hostState.commitments && Object.keys(hostState.commitments).length > 0) {
      debugLog('COMMITMENTS', '[GUEST] Received commitment values from host:', {
        phases: Object.keys(hostState.commitments),
        fullCommitments: hostState.commitments,
        currentPhase: hostState.turnPhase
      });

      const currentPhaseCommitments = hostState.commitments[hostState.turnPhase];
      if (currentPhaseCommitments) {
        debugLog('COMMITMENTS', `[GUEST] Current phase (${hostState.turnPhase}) commitment status:`, {
          player1Completed: currentPhaseCommitments.player1?.completed || false,
          player2Completed: currentPhaseCommitments.player2?.completed || false
        });
      }
    }

    // Preserve guest's local gameMode
    const localGameMode = this.gsm.state.gameMode;

    // Guest directly applies host's authoritative state without validation
    this.gsm.state = { ...hostState };
    this.gsm.state.gameMode = localGameMode;

    // Verify critical fields after application
    const missing = [];
    if (this.gsm.state.turnPhase === undefined) missing.push('turnPhase');
    if (this.gsm.state.currentPlayer === undefined) missing.push('currentPlayer');
    if (this.gsm.state.player1 === undefined) missing.push('player1');
    if (this.gsm.state.player2 === undefined) missing.push('player2');
    if (missing.length > 0) {
      debugLog('BROADCAST_TIMING', `🚨 [GUEST APPLY] MISSING FIELDS: ${missing.join(', ')}`);
    } else {
      debugLog('BROADCAST_TIMING', `✅ [GUEST APPLY] State complete | After: ${Object.keys(this.gsm.state).length} fields`);
    }

    debugLog('STATE_SYNC', '[GUEST] After applying state - player2 hand check:', {
      handSize: this.gsm.state.player2?.hand?.length || 0,
      sampleCard: this.gsm.state.player2?.hand?.[0] || null,
      sampleInstanceId: this.gsm.state.player2?.hand?.[0]?.instanceId,
      hasInstanceId: this.gsm.state.player2?.hand?.[0]?.instanceId !== undefined
    });

    this.gsm.emit('HOST_STATE_UPDATE', { hostState });
  }

  // --- Optimistic Action Tracking ---

  trackOptimisticAnimations(animations) {
    this.optimisticActionService.trackAction(animations);
  }

  filterAnimations(actionAnimations, systemAnimations) {
    return this.optimisticActionService.filterAnimations(actionAnimations, systemAnimations);
  }

  hasRecentOptimisticActions() {
    const status = this.optimisticActionService.getStatus();
    return status.actionAnimationsTracked > 0 || status.systemAnimationsTracked > 0;
  }

  clearOptimisticActions() {
    this.optimisticActionService.clearTrackedAnimations();
  }
}

export default GuestSyncManager;
