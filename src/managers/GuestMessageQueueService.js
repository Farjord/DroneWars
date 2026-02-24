// ========================================
// GUEST MESSAGE QUEUE SERVICE
// ========================================
// Queues and processes all host→guest messages sequentially
// Ensures proper render timing and animation completion
// Prevents race conditions and message loss on guest side

import { debugLog, timingLog, getTimestamp } from '../utils/debugLogger.js';
import { addTeleportingFlags } from '../utils/teleportUtils.js';
import { arraysMatch, dronesMatch } from '../utils/stateComparisonUtils.js';

class GuestMessageQueueService {
  constructor(gameStateManager, phaseAnimationQueue = null) {
    this.gameStateManager = gameStateManager;
    this.phaseAnimationQueue = phaseAnimationQueue; // For guest phase announcements
    this.messageQueue = [];
    this.isProcessing = false;
    this.pendingHostState = null; // Track state update for AnimationManager callback (with isTeleporting for TELEPORT_IN)
    this.pendingFinalHostState = null; // Track final state for TELEPORT_IN reveal (without isTeleporting)

    // Sequence tracking for message ordering
    this.lastProcessedSequence = 0;
    this.pendingOutOfOrderMessages = new Map(); // sequenceId -> message
    this.PENDING_THRESHOLD = 3; // Trigger resync after this many pending messages
    this.isResyncing = false;

    // P2PManager reference (set via setP2PManager)
    this.p2pManager = null;

    // Event listeners for resync events
    this.listeners = new Set();

    // PHASE MANAGER INTEGRATION (Phase 6):
    // Complex validation logic removed. Guest now trusts PhaseManager's authoritative broadcasts.
    // PhaseManager ensures consistent state, so Guest no longer needs to validate phase transitions.
  }

  /**
   * Set P2PManager reference for requesting resyncs
   * @param {Object} p2pManager - P2PManager instance
   */
  setP2PManager(p2pManager) {
    this.p2pManager = p2pManager;
  }

  /**
   * Subscribe to queue events (resync_started, resync_completed)
   * @param {Function} listener - Event handler function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to listeners
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  emit(type, data = {}) {
    this.listeners.forEach(listener => {
      try {
        listener({ type, data });
      } catch (error) {
        debugLog('MULTIPLAYER', '❌ Error in GuestMessageQueueService listener:', error);
      }
    });
  }

  /**
   * Apply pending state update (called by AnimationManager during orchestration)
   * Used by AnimationManager.executeWithStateUpdate() to apply state at correct timing
   */
  async applyPendingStateUpdate() {
    if (this.pendingHostState) {
      const applyStartTime = timingLog('[GUEST] Applying host state', {
        phase: this.pendingHostState.turnPhase
      });

      debugLog('ANIMATIONS', '📝 [STATE UPDATE] GuestMessageQueueService applying pending host state');
      this.gameStateManager.applyHostState(this.pendingHostState);

      timingLog('[GUEST] Host state applied', {
        phase: this.pendingHostState.turnPhase
      }, applyStartTime);

      // PHASE MANAGER INTEGRATION (Phase 6):
      // Cascade triggering removed. Guest no longer processes cascades optimistically.
      // PhaseManager handles all phase transitions, Guest just applies the authoritative state.
    } else {
      debugLog('ANIMATIONS', '⚠️ [STATE UPDATE] No pending host state to apply');
    }
  }

  /**
   * Get animation source for logging
   * Used by AnimationManager.executeWithStateUpdate() for logging
   * @returns {string} Animation source identifier
   */
  getAnimationSource() {
    return 'HOST_RESPONSE';
  }

  /**
   * Reveal teleported drones mid-animation (called by AnimationManager)
   * Removes isTeleporting flags to make drones visible at 70% of TELEPORT_IN animation
   * @param {Array} teleportAnimations - TELEPORT_IN animations being played
   */
  revealTeleportedDrones(teleportAnimations) {
    debugLog('ANIMATIONS', '✨ [TELEPORT REVEAL] GuestMessageQueueService revealing teleported drones:', {
      count: teleportAnimations.length,
      hasPendingFinalState: !!this.pendingFinalHostState
    });

    if (this.pendingFinalHostState) {
      // Apply final state without isTeleporting flags (original state from host)
      this.gameStateManager.applyHostState(this.pendingFinalHostState);
      debugLog('ANIMATIONS', '✅ [TELEPORT REVEAL] Drones revealed');
    } else {
      debugLog('ANIMATIONS', '⚠️ [TELEPORT REVEAL] No pending final host state to apply');
    }
  }

  /**
   * Add isTeleporting flags to drones in TELEPORT_IN animations
   * Creates modified state where teleporting drones are invisible (isTeleporting: true)
   * @param {Object} state - Host state to modify
   * @param {Array} animations - All animations being played
   * @returns {Object} Modified state with isTeleporting flags
   */

  /**
   * Compare two arrays for equality
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @param {string} context - Context for logging (e.g., 'player1.hand')
   * @returns {boolean} True if arrays match
   */

  /**
   * Compare current game state with incoming host state
   * Used to detect if optimistic action result matches host confirmation
   * @param {Object} currentState - Current local game state
   * @param {Object} hostState - Incoming host state
   * @returns {boolean} True if states match (can skip application)
   */
  compareGameStates(currentState, hostState) {
    debugLog('OPTIMISTIC', '🔄 [STATE COMPARE] Starting state comparison');
    debugLog('STATE_SYNC', '🔄 [STATE COMPARE] Comparing current state vs host state');

    // Compare player1 and player2 states
    const players = ['player1', 'player2'];

    for (const player of players) {
      const p1 = currentState[player];
      const p2 = hostState[player];

      // Compare critical properties
      if (p1.energy !== p2.energy) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${player}.energy - mismatch:`, {
          current: p1.energy,
          host: p2.energy
        });
        return false;
      }

      if (p1.shields !== p2.shields) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${player}.shields - mismatch:`, {
          current: p1.shields,
          host: p2.shields
        });
        return false;
      }

      if (p1.health !== p2.health) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${player}.health - mismatch:`, {
          current: p1.health,
          host: p2.health
        });
        return false;
      }

      // Compare hand (card instance IDs)
      const hand1Ids = p1.hand?.map(c => c.instanceId) || [];
      const hand2Ids = p2.hand?.map(c => c.instanceId) || [];
      if (!arraysMatch(hand1Ids, hand2Ids, `${player}.hand`)) {
        return false;
      }

      // Compare drones on board (all three lanes)
      for (const lane of ['lane1', 'lane2', 'lane3']) {
        const drones1 = p1.dronesOnBoard?.[lane] || [];
        const drones2 = p2.dronesOnBoard?.[lane] || [];

        if (!dronesMatch(drones1, drones2, `${player}.${lane}`)) {
          return false;
        }
      }
    }

    // Compare other critical game state
    if (currentState.currentPlayer !== hostState.currentPlayer) {
      debugLog('OPTIMISTIC', '❌ [STATE COMPARE] currentPlayer - mismatch:', {
        current: currentState.currentPlayer,
        host: hostState.currentPlayer
      });
      return false;
    }

    if (currentState.turnPhase !== hostState.turnPhase) {
      debugLog('OPTIMISTIC', '❌ [STATE COMPARE] turnPhase - mismatch:', {
        current: currentState.turnPhase,
        host: hostState.turnPhase
      });
      return false;
    }

    if (currentState.roundNumber !== hostState.roundNumber) {
      debugLog('OPTIMISTIC', '❌ [STATE COMPARE] roundNumber - mismatch:', {
        current: currentState.roundNumber,
        host: hostState.roundNumber
      });
      return false;
    }

    // All comparisons passed
    debugLog('OPTIMISTIC', '✅ [STATE COMPARE] States match - comparison complete');
    debugLog('STATE_SYNC', '✅ [STATE COMPARE] All state properties verified as matching');

    return true; // States match
  }

  /**
   * Initialize service and subscribe to P2P messages
   * Called when guest joins multiplayer session
   * @param {Object} p2pManager - P2P manager instance
   */
  initialize(p2pManager) {
    debugLog('MULTIPLAYER', '🎯 [GUEST QUEUE] Initializing GuestMessageQueueService');

    // Subscribe to state update messages from host (filter for queuing)
    // Other events (setup, control) are handled directly by GameStateManager
    p2pManager.subscribe((event) => {
      if (event.type === 'state_update_received') {
        debugLog('MULTIPLAYER', '📥 [GUEST QUEUE] Received state update, queuing for processing');
        this.enqueueMessage(event);
      }
      // Setup events like 'multiplayer_mode_change' and 'joined_room' handled elsewhere
    });
  }

  /**
   * Add message to queue and start processing
   * Handles sequence tracking for out-of-order message detection
   * @param {Object} message - P2P message from host
   */
  enqueueMessage(message) {
    const queueEntryTime = getTimestamp();
    const sequenceId = message.data?.sequenceId;
    const isFullSync = message.data?.isFullSync;

    debugLog('MULTIPLAYER', '📝 [GUEST QUEUE] Enqueuing message:', {
      type: message.type,
      sequenceId: sequenceId,
      isFullSync: isFullSync || false,
      lastProcessed: this.lastProcessedSequence,
      queueLength: this.messageQueue.length + 1
    });

    // Handle full sync response (from resync request)
    if (isFullSync) {
      debugLog('MULTIPLAYER', '🔄 [GUEST QUEUE] Received full sync response');
      this.handleResyncResponse({
        state: message.data?.state,
        sequenceId: sequenceId
      });
      return; // Don't add to normal queue
    }

    // Handle sequence tracking for state updates
    if (sequenceId !== undefined && message.type === 'state_update_received') {
      // Check for out-of-order message (gap in sequence)
      if (sequenceId > this.lastProcessedSequence + 1) {
        // Out of order - queue it for later
        this.pendingOutOfOrderMessages.set(sequenceId, { ...message, queueEntryTime });
        debugLog('MULTIPLAYER', `⏸️ [GUEST QUEUE] Out-of-order message seq=${sequenceId}, waiting for seq=${this.lastProcessedSequence + 1}`, {
          pendingCount: this.pendingOutOfOrderMessages.size
        });

        // Check if we need to trigger resync
        if (this.pendingOutOfOrderMessages.size > this.PENDING_THRESHOLD) {
          this.triggerResync();
        }
        return; // Don't add to normal queue yet
      }

      // Update sequence tracking for in-order messages
      this.lastProcessedSequence = sequenceId;
    }

    // Add timestamp for queue wait time calculation
    const messageWithTimestamp = {
      ...message,
      queueEntryTime: queueEntryTime
    };

    timingLog('[GUEST QUEUE] Message enqueued', {
      type: message.type,
      sequenceId: sequenceId,
      phase: message.data?.state?.turnPhase,
      queueLength: this.messageQueue.length + 1
    });

    this.messageQueue.push(messageWithTimestamp);
    this.processQueue();

    // After processing, check if we can now process pending out-of-order messages
    this.processPendingMessages();
  }

  /**
   * Process any pending out-of-order messages that are now in sequence
   */
  processPendingMessages() {
    let nextSeq = this.lastProcessedSequence + 1;

    while (this.pendingOutOfOrderMessages.has(nextSeq)) {
      const message = this.pendingOutOfOrderMessages.get(nextSeq);
      this.pendingOutOfOrderMessages.delete(nextSeq);

      debugLog('MULTIPLAYER', `✅ [GUEST QUEUE] Processing previously pending message seq=${nextSeq}`);

      this.messageQueue.push(message);
      this.lastProcessedSequence = nextSeq;
      nextSeq++;
    }

    // Continue processing queue if we added messages
    if (this.messageQueue.length > 0 && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Trigger a full state resync when too many messages are pending
   * This indicates likely network issues or lost messages
   */
  triggerResync() {
    if (this.isResyncing) {
      debugLog('MULTIPLAYER', '⏸️ [GUEST QUEUE] Resync already in progress');
      return;
    }

    this.isResyncing = true;
    debugLog('MULTIPLAYER', '🔄 [GUEST QUEUE] Triggering full state resync - too many pending messages', {
      pendingCount: this.pendingOutOfOrderMessages.size,
      threshold: this.PENDING_THRESHOLD
    });

    // Clear pending queue - we'll get fresh state
    this.pendingOutOfOrderMessages.clear();
    this.messageQueue = [];

    // Request full state from host
    if (this.p2pManager) {
      this.p2pManager.requestFullSync();
    } else {
      debugLog('MULTIPLAYER', '⚠️ GuestMessageQueueService: Cannot request resync - no P2PManager reference');
    }

    // Emit event for UI (show "Syncing..." indicator)
    this.emit('resync_started', {});
  }

  /**
   * Handle full state resync response from host
   * @param {Object} fullState - Complete state from host
   */
  handleResyncResponse(fullState) {
    debugLog('MULTIPLAYER', '✅ [GUEST QUEUE] Received resync response', {
      sequenceId: fullState.sequenceId,
      phase: fullState.state?.turnPhase
    });

    // Apply full state
    if (fullState.state) {
      this.gameStateManager.applyHostState(fullState.state);
    }

    // Update sequence tracking
    if (fullState.sequenceId !== undefined) {
      this.lastProcessedSequence = fullState.sequenceId;
    }

    this.isResyncing = false;
    this.emit('resync_completed', {});
  }

  /**
   * Process message queue sequentially
   * Only one message processed at a time
   */
  async processQueue() {
    if (this.isProcessing) {
      debugLog('MULTIPLAYER', '⏸️ [GUEST QUEUE] Already processing, queue length:', this.messageQueue.length);
      return;
    }

    this.isProcessing = true;
    const queueStartTime = timingLog('[GUEST QUEUE] Processing started', {
      queueLength: this.messageQueue.length
    });

    debugLog('MULTIPLAYER', '▶️ [GUEST QUEUE] Starting queue processing');

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      const queueWaitTime = getTimestamp() - message.queueEntryTime;

      const msgStartTime = timingLog('[GUEST QUEUE] Message processing', {
        type: message.type,
        queueWaitTime: `${queueWaitTime.toFixed(2)}ms`,
        remaining: this.messageQueue.length
      });

      debugLog('MULTIPLAYER', '🔄 [GUEST QUEUE] Processing message:', {
        type: message.type,
        remaining: this.messageQueue.length
      });

      await this.processMessage(message);

      timingLog('[GUEST QUEUE] Message complete', {
        type: message.type
      }, msgStartTime);
    }

    this.isProcessing = false;
    debugLog('MULTIPLAYER', '⏹️ [GUEST QUEUE] Queue processing complete');
    timingLog('[GUEST QUEUE] Processing finished', {}, queueStartTime);

    // Start animation playback after all messages processed
    // Add small delay to allow React to render and App.jsx to subscribe to events
    // This is necessary because setState() is asynchronous - we call setState() during queue
    // processing, but React hasn't re-rendered yet. Without this delay, the first animation
    // event fires before App.jsx's useEffect runs and creates event subscriptions.
    // 50ms provides comfortable buffer (3x typical 16ms render time) while remaining imperceptible.
    if (this.phaseAnimationQueue && !this.phaseAnimationQueue.isPlaying()) {
      const queueLength = this.phaseAnimationQueue.getQueueLength();
      if (queueLength > 0) {
        debugLog('TIMING', `🎬 [GUEST] Scheduling animation playback after React render (50ms delay)`, {
          queuedAnimations: queueLength
        });
        setTimeout(() => {
          this.phaseAnimationQueue.startPlayback('GMQS:after_process:604');
        }, 50);
      }
    }
  }

  /**
   * Process individual message based on type
   * @param {Object} message - Message to process
   */
  async processMessage(message) {
    switch (message.type) {
      case 'state_update_received':
        await this.processStateUpdate(message.data);
        break;

      // Future: Add other message types here
      // case 'modal_request':
      // case 'phase_announcement':
      // etc.

      default:
        debugLog('MULTIPLAYER', '⚠️ [GUEST QUEUE] Unknown message type:', message.type);
    }
  }

  /**
   * Process state update with animation timing
   * Delegates timing orchestration to AnimationManager
   */
  async processStateUpdate({ state, actionAnimations, systemAnimations }) {
    const updateStartTime = timingLog('[GUEST] State update started', {
      phase: state?.turnPhase,
      currentPlayer: state?.currentPlayer,
      incomingAnims: (actionAnimations?.length || 0) + (systemAnimations?.length || 0),
      actionAnimNames: actionAnimations?.map(a => a.animationName).join(', ') || 'none',
      systemAnimNames: systemAnimations?.map(a => a.animationName).join(', ') || 'none'
    });

    // VALIDATION LOG: Verify received state completeness
    debugLog('BROADCAST_TIMING', `📥 [GUEST RECEIVE] Phase: ${state?.turnPhase} | Player: ${state?.currentPlayer} | Fields: ${Object.keys(state || {}).length} | Queue: ${this.messageQueue.length} | Anims: ${(actionAnimations?.length || 0) + (systemAnimations?.length || 0)}`);

    debugLog('STATE_SYNC', '📊 [GUEST QUEUE] Processing state update:', {
      turnPhase: state?.turnPhase,
      actionAnimationCount: actionAnimations?.length || 0,
      systemAnimationCount: systemAnimations?.length || 0
    });

    // PLACEMENT CASCADE DIAGNOSTIC: Log commitments in received state
    if (state?.commitments?.placement) {
      debugLog('PLACEMENT_CASCADE', '📦 [GUEST RECEIVE] Placement commitments in broadcast:', {
        player1Completed: state.commitments.placement.player1?.completed,
        player2Completed: state.commitments.placement.player2?.completed,
        bothComplete: state.commitments.placement.player1?.completed && state.commitments.placement.player2?.completed
      });
    } else {
      debugLog('PLACEMENT_CASCADE', '⚠️ [GUEST RECEIVE] No placement commitments in broadcast');
    }

    // VALIDATION MODE: Check if this broadcast matches our validation target
    if (this.gameStateManager.shouldValidateBroadcast(state.turnPhase)) {
      const validationStartTime = timingLog('[GUEST VALIDATION] Matching broadcast received', {
        phase: state.turnPhase,
        validationStarted: this.gameStateManager.validatingState.timestamp,
        latency: Date.now() - this.gameStateManager.validatingState.timestamp
      });

      // Perform deep validation immediately
      await this.validateOptimisticState(state);

      // Clear validation state
      this.gameStateManager.validatingState.isValidating = false;

      timingLog('[GUEST VALIDATION] Complete and synced', {
        phase: state.turnPhase
      }, validationStartTime);

      return; // Don't process as normal broadcast
    }

    // PHASE MANAGER INTEGRATION (Phase 6): SIMPLIFIED VALIDATION
    // Guest now trusts PhaseManager's authoritative broadcasts unconditionally.
    // Complex validation logic removed - PhaseManager prevents race conditions and ensures consistency.

    const guestPhase = this.gameStateManager.getState().turnPhase;
    const hostPhase = state.turnPhase;

    debugLog('PHASE_MANAGER', `📥 [GUEST] Accepting PhaseManager broadcast`, {
      guestPhase,
      hostPhase,
      reason: 'PhaseManager is authoritative - no validation needed'
    });

    // Queue phase announcement for guest UI feedback
    // This ensures guest sees ROUND X, UPKEEP, DEPLOYMENT, etc. announcements
    // Matches host behavior (ActionProcessor.processPhaseTransition lines 1660-1712)
    const phaseTextMap = {
      roundAnnouncement: 'ROUND',
      roundInitialization: 'UPKEEP',
      mandatoryDiscard: 'MANDATORY DISCARD PHASE',
      optionalDiscard: 'OPTIONAL DISCARD PHASE',
      allocateShields: 'ALLOCATE SHIELDS',
      mandatoryDroneRemoval: 'REMOVE EXCESS DRONES',
      deployment: 'DEPLOYMENT PHASE',
      deploymentComplete: 'DEPLOYMENT COMPLETE',
      action: 'ACTION PHASE',
      actionComplete: 'ACTION PHASE COMPLETE'
    };

    // Queue phase announcements based on transition patterns
    // Guest must infer pseudo-phases (actionComplete, roundAnnouncement) from state transitions
    // because host doesn't broadcast pseudo-phases, only real phase changes
    if (this.phaseAnimationQueue && guestPhase !== hostPhase) {

      // PATTERN 1: Leaving action phase → Queue ACTION COMPLETE + ROUND announcements
      // This happens when transitioning from end of one round to start of next round
      if (guestPhase === 'action' && hostPhase !== 'action' && phaseTextMap[hostPhase]) {
        debugLog('PHASE_TRANSITIONS', `🎬 [GUEST] Detected round transition (action → ${hostPhase}), queueing: actionComplete, roundAnnouncement`);

        // Check if guest already passed (if so, opponent must have also passed to trigger round end)
        // For round to progress from action phase, BOTH players must pass
        const guestState = this.gameStateManager.getState();
        const localPlayerId = this.gameStateManager.getLocalPlayerId();
        const localPassKey = `${localPlayerId}Passed`;

        if (guestState.passInfo?.[localPassKey]) {
          // Guest already passed, and phase is transitioning to next round
          // This means opponent also passed (otherwise round wouldn't progress)

          // Only queue OPPONENT PASSED if guest was the FIRST to pass
          // If opponent passed first, guest already knew - don't show redundant announcement
          if (guestState.passInfo.firstPasser === localPlayerId) {
            // Queue OPPONENT PASSED before other announcements
            this.phaseAnimationQueue.queueAnimation(
              'playerPass',
              'OPPONENT PASSED',
              null,
              'GMQS:pattern1_pass:737'
            );
            debugLog('PASS_LOGIC', `📋 [GUEST] Queued OPPONENT PASSED (inferred from round transition after local pass)`);
          }
        }

        // Queue ACTION PHASE COMPLETE (pseudo-phase)
        this.phaseAnimationQueue.queueAnimation(
          'actionComplete',
          'ACTION PHASE COMPLETE',
          'Transitioning to Next Round',
          'GMQS:pattern1_actionComplete:747'
        );

        // Queue ROUND announcement (pseudo-phase, round number calculated at playback)
        this.phaseAnimationQueue.queueAnimation(
          'roundAnnouncement',
          'ROUND',
          null,
          'GMQS:pattern1_round:754'
        );

        debugLog('PHASE_TRANSITIONS', `✅ [GUEST] Queued round transition announcements`);
      }

      // PATTERN 2: Leaving placement → roundInitialization (Round 1 only)
      // This happens at game start when transitioning to Round 1
      else if (guestPhase === 'placement' && hostPhase === 'roundInitialization') {
        debugLog('PHASE_TRANSITIONS', `🎬 [GUEST] Detected Round 1 start (placement → roundInitialization), queueing: roundAnnouncement`);

        // Queue ROUND 1 announcement (pseudo-phase)
        this.phaseAnimationQueue.queueAnimation(
          'roundAnnouncement',
          'ROUND',
          null,
          'GMQS:pattern2_round:769'
        );

        debugLog('PHASE_TRANSITIONS', `✅ [GUEST] Queued Round 1 announcement`);
      }

      // PATTERN 2.5: Leaving deployment → action
      // This happens when both players complete deployment (pass)
      else if (guestPhase === 'deployment' && hostPhase === 'action') {
        debugLog('PHASE_TRANSITIONS', `🎬 [GUEST] Detected deployment complete (deployment → action)`);

        // Check if guest already passed (if so, opponent must have also passed to end deployment)
        // For deployment to end, BOTH players must pass
        const guestState = this.gameStateManager.getState();
        const localPlayerId = this.gameStateManager.getLocalPlayerId();
        const localPassKey = `${localPlayerId}Passed`;

        if (guestState.passInfo?.[localPassKey]) {
          // Guest already passed, and phase is transitioning to action
          // This means opponent also passed (otherwise deployment wouldn't end)

          // Only queue OPPONENT PASSED if guest was the FIRST to pass
          // If opponent passed first, guest already knew - don't show redundant announcement
          if (guestState.passInfo.firstPasser === localPlayerId) {
            // Queue OPPONENT PASSED before DEPLOYMENT COMPLETE announcement
            this.phaseAnimationQueue.queueAnimation(
              'playerPass',
              'OPPONENT PASSED',
              null,
              'GMQS:pattern2.5_pass:797'
            );
            debugLog('PASS_LOGIC', `📋 [GUEST] Queued OPPONENT PASSED (inferred from deployment → action transition after local pass)`);
          }
        }

        // Queue DEPLOYMENT COMPLETE announcement (pseudo-phase)
        this.phaseAnimationQueue.queueAnimation(
          'deploymentComplete',
          'DEPLOYMENT COMPLETE',
          null,
          'GMQS:pattern2.5_deploy:807'
        );
        debugLog('PHASE_TRANSITIONS', `📋 [GUEST] Queued DEPLOYMENT COMPLETE announcement`);

        debugLog('PHASE_TRANSITIONS', `✅ [GUEST] Queued deployment completion announcements`);
      }

      // PATTERN 3: All phase transitions → Queue actual phase announcement
      // Queue announcement for the actual phase we're transitioning to
      if (phaseTextMap[hostPhase]) {
        debugLog('PHASE_TRANSITIONS', `🎬 [GUEST] Queueing announcement for: ${hostPhase}`);

        const phaseText = phaseTextMap[hostPhase];

        // Calculate subtitle for specific phases (matches ActionProcessor logic)
        const subtitle = hostPhase === 'roundInitialization'
          ? 'Drawing Cards, Gaining Energy, Resetting Drones...'
          : hostPhase === 'actionComplete'
          ? 'Transitioning to Next Round'
          : null;

        this.phaseAnimationQueue.queueAnimation(hostPhase, phaseText, subtitle, 'GMQS:pattern3_generic:831');
        debugLog('PHASE_TRANSITIONS', `✅ [GUEST] Successfully queued announcement: ${hostPhase}`);
      }

      // Note: Playback is started explicitly after queue processing completes
      // This ensures App.jsx is mounted and subscribed before animations play
      // Same approach as host (GameFlowManager starts playback after cascade completes)
    }

    // PHASE MANAGER INTEGRATION (Phase 6): SIMPLIFIED STATE APPLICATION
    // Preserve only essential guest identity, trust PhaseManager for everything else

    const currentGuestState = this.gameStateManager.getState();

    const preservedFields = {
      gameMode: currentGuestState.gameMode,  // Must stay 'guest'
    };

    // Merge host state with preserved guest identity
    state = {
      ...state,           // Copy all authoritative game state from host (PhaseManager controlled)
      ...preservedFields  // Overwrite with preserved guest identity
    };

    debugLog('PHASE_MANAGER', '✅ [GUEST] Applying PhaseManager state', {
      guestPhase,
      hostPhase: state.turnPhase,
      preservedGameMode: preservedFields.gameMode
    });

    // Filter duplicate animations (optimistic action deduplication)
    // This is GuestMessageQueueService's unique responsibility
    const filtered = this.gameStateManager.filterAnimations(
      actionAnimations || [],
      systemAnimations || []
    );

    debugLog('PASS_LOGIC', `🔍 [GUEST] After filterAnimations`, {
      incomingSystemCount: systemAnimations?.length || 0,
      filteredSystemCount: filtered.systemAnimations.length,
      systemAnimNames: filtered.systemAnimations.map(a => a.animationName).join(', ') || 'none'
    });

    // Note: PHASE_ANNOUNCEMENT animations are NOT broadcast by host
    // Guest queues phase announcements locally based on its own optimistic processing
    // This ensures each client handles its own presentation layer independently
    debugLog('ANIMATIONS', `🔍 [GUEST] Filtering animations (PHASE_ANNOUNCEMENT not included in broadcasts)`, {
      systemAnimCount: filtered.systemAnimations.length,
      actionAnimCount: filtered.actionAnimations.length
    });

    const allAnimations = [...filtered.actionAnimations, ...filtered.systemAnimations];

    debugLog('ANIMATIONS', '📊 [GUEST QUEUE] Animation filtering complete:', {
      incomingCount: (actionAnimations?.length || 0) + (systemAnimations?.length || 0),
      afterFilterCount: allAnimations.length,
      skipped: ((actionAnimations?.length || 0) + (systemAnimations?.length || 0)) - allAnimations.length
    });

    if (allAnimations.length > 0) {
      timingLog('[GUEST] Filtered animations', {
        incomingCount: (actionAnimations?.length || 0) + (systemAnimations?.length || 0),
        filteredCount: allAnimations.length,
        skippedCount: ((actionAnimations?.length || 0) + (systemAnimations?.length || 0)) - allAnimations.length,
        remainingAnimNames: allAnimations.map(a => a.animationName).join(', ')
      });
    }

    // Check if all animations were filtered out (optimistic deduplication)
    const totalIncoming = (actionAnimations?.length || 0) + (systemAnimations?.length || 0);
    const allFiltered = totalIncoming > 0 && allAnimations.length === 0;

    if (allFiltered) {
      // All animations filtered - verify current state matches incoming host state
      debugLog('STATE_SYNC', '🔄 [GUEST QUEUE] All animations filtered (optimistic match), verifying state consistency');

      const currentState = this.gameStateManager.getState();
      const statesMatch = this.compareGameStates(currentState, state);

      if (statesMatch) {
        // States match - skip redundant state application to prevent React re-render flicker
        debugLog('STATE_SYNC', '✅ [GUEST QUEUE] States match, skipping redundant state application');
        debugLog('STATE_SYNC', '✅ [GUEST QUEUE] State update processing complete (optimistic match, no update needed)');
        return; // Early exit - prevents unnecessary state application
      } else {
        // States differ - this indicates a potential issue with optimistic logic
        debugLog('STATE_SYNC', '⚠️ [GUEST QUEUE] STATE MISMATCH DETECTED after optimistic action', {
          warning: 'Optimistic logic may differ from host validation',
          hint: 'Host state will be applied to maintain consistency'
        });
        // Fall through to apply host state (host is authoritative)
      }
    }

    // Check if AnimationManager is available
    const animationManager = this.gameStateManager.actionProcessor?.animationManager;

    if (!animationManager) {
      // AnimationManager not initialized yet (early state update before useAnimationSetup runs)
      // This can happen when guest joins and receives initial state before App.jsx renders
      // Apply state directly without animation orchestration
      debugLog('ANIMATIONS', '⚠️ [GUEST QUEUE] AnimationManager not initialized, applying state without animations');
      this.gameStateManager.applyHostState(state);

      // SIMULTANEOUS CHECKPOINT CASCADE: Trigger cascade processing if both players complete
      if (this.triggerSimultaneousCascade) {
        this.triggerSimultaneousCascade = false; // Reset flag
        const cascadePhase = this.simultaneousCascadePhase;
        debugLog('VALIDATION', `🎯 [${cascadePhase.toUpperCase()} CHECKPOINT] Triggering cascade processing (no animations path)`);

        // Get GameFlowManager and trigger cascade through onSimultaneousPhaseComplete
        const gameFlowManager = this.gameStateManager.gameFlowManager;
        if (gameFlowManager) {
          const phaseCommitments = state.commitments?.[cascadePhase];
          await gameFlowManager.onSimultaneousPhaseComplete(cascadePhase, phaseCommitments);
        } else {
          debugLog('MULTIPLAYER', `❌ [${cascadePhase.toUpperCase()} CHECKPOINT] GameFlowManager not available`);
        }
      }

      // BOTH-PASS CASCADE: Trigger automatic cascade if both-pass transition landed on automatic phase
      if (this.triggerBothPassCascade) {
        this.triggerBothPassCascade = false; // Reset flag
        debugLog('VALIDATION', `🎯 [BOTH-PASS CASCADE] Triggering cascade from: ${this.bothPassStartPhase} (no animations path)`);

        // Get GameFlowManager and trigger cascade processing
        const gameFlowManager = this.gameStateManager.gameFlowManager;
        if (gameFlowManager) {
          await gameFlowManager.processAutomaticPhasesUntilCheckpoint(this.bothPassStartPhase);
        } else {
          debugLog('MULTIPLAYER', '❌ [BOTH-PASS CASCADE] GameFlowManager not available');
        }
      }

      debugLog('STATE_SYNC', '✅ [GUEST QUEUE] State update processing complete (no animations)');
      return;
    }

    // Check for TELEPORT_IN animations - need special state handling
    const hasTeleportIn = allAnimations.some(anim => anim.animationName === 'TELEPORT_IN');

    if (hasTeleportIn) {
      debugLog('ANIMATIONS', '🌀 [TELEPORT] Detected TELEPORT_IN animations, preparing invisible drone state');

      // Create modified state with isTeleporting flags for affected drones
      const modifiedPlayers = addTeleportingFlags(
        { player1: state.player1, player2: state.player2 },
        allAnimations
      );
      const stateWithInvisibleDrones = { ...state, ...modifiedPlayers };

      // Set both states for TELEPORT_IN reveal flow
      this.pendingHostState = stateWithInvisibleDrones;  // Invisible drones (with isTeleporting)
      this.pendingFinalHostState = state;                // Visible drones (without isTeleporting)

      debugLog('ANIMATIONS', '🌀 [TELEPORT] States prepared:', {
        invisibleState: !!this.pendingHostState,
        finalState: !!this.pendingFinalHostState
      });
    } else {
      // Normal flow - no TELEPORT_IN animations
      this.pendingHostState = state;
      this.pendingFinalHostState = null;
    }

    const animStartTime = timingLog('[GUEST] Animation execution started', {
      animCount: allAnimations.length,
      animNames: allAnimations.map(a => a.animationName).join(', ')
    });

    try {
      // Delegate to AnimationManager for timing orchestration
      // AnimationManager will: play pre-state animations → update state → play post-state animations
      await animationManager.executeWithStateUpdate(allAnimations, this);
    } finally {
      this.pendingHostState = null;
      this.pendingFinalHostState = null;
    }

    timingLog('[GUEST] Animation execution complete', {
      animCount: allAnimations.length,
      animNames: allAnimations.map(a => a.animationName).join(', ')
    }, animStartTime);

    debugLog('STATE_SYNC', '✅ [GUEST QUEUE] State update processing complete');

    timingLog('[GUEST] State update complete', {
      phase: state?.turnPhase
    }, updateStartTime);
  }

  /**
   * Get current queue status
   * @returns {Object} Queue statistics
   */
  getStatus() {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Validate guest's optimistic state against host's authoritative state
   * Performs deep recursive comparison of all state properties
   * @param {Object} hostState - Host's authoritative state
   */
  async validateOptimisticState(hostState) {
    const guestState = this.gameStateManager.validatingState.guestState;

    debugLog('VALIDATION', '🔍 [STATE COMPARE] Starting deep validation', {
      guestPhase: guestState.turnPhase,
      hostPhase: hostState.turnPhase
    });

    // Deep recursive comparison
    const mismatches = this.deepCompareStates(guestState, hostState, 'state');

    if (mismatches.length > 0) {
      debugLog('VALIDATION', '⚠️ [STATE MISMATCH] Guest optimistic state differs from host', {
        mismatchCount: mismatches.length,
        mismatches: mismatches.slice(0, 10), // First 10 for readability
        action: 'applying_host_authoritative_state'
      });
    } else {
      debugLog('VALIDATION', '✅ [STATE MATCH] Guest optimistic state matches host perfectly');
    }

    // ALWAYS apply host state (host is authoritative)
    this.gameStateManager.applyHostState(hostState);
  }

  /**
   * Deep recursive comparison of two state objects
   * @param {Object} guestState - Guest's optimistic state
   * @param {Object} hostState - Host's authoritative state
   * @param {string} path - Current property path for logging
   * @returns {Array<string>} Array of mismatch descriptions
   */
  deepCompareStates(guestState, hostState, path = '') {
    const mismatches = [];

    // Compare all properties recursively
    const allKeys = new Set([
      ...Object.keys(guestState || {}),
      ...Object.keys(hostState || {})
    ]);

    for (const key of allKeys) {
      const fullPath = path ? `${path}.${key}` : key;
      const guestVal = guestState?.[key];
      const hostVal = hostState?.[key];

      // Type mismatch
      if (typeof guestVal !== typeof hostVal) {
        mismatches.push(`${fullPath}: type mismatch (${typeof guestVal} vs ${typeof hostVal})`);
        continue;
      }

      // Null/undefined
      if (guestVal === null || guestVal === undefined || hostVal === null || hostVal === undefined) {
        if (guestVal !== hostVal) {
          mismatches.push(`${fullPath}: ${guestVal} vs ${hostVal}`);
        }
        continue;
      }

      // Arrays
      if (Array.isArray(guestVal) && Array.isArray(hostVal)) {
        if (!arraysMatch(guestVal, hostVal, fullPath)) {
          mismatches.push(`${fullPath}: array mismatch (lengths: ${guestVal.length} vs ${hostVal.length})`);
        }
        continue;
      }

      // Objects - recurse
      if (typeof guestVal === 'object' && typeof hostVal === 'object') {
        const nestedMismatches = this.deepCompareStates(guestVal, hostVal, fullPath);
        mismatches.push(...nestedMismatches);
        continue;
      }

      // Primitives
      if (guestVal !== hostVal) {
        mismatches.push(`${fullPath}: ${guestVal} vs ${hostVal}`);
      }
    }

    return mismatches;
  }
}

export default GuestMessageQueueService;
