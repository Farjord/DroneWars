// ========================================
// GUEST MESSAGE QUEUE SERVICE
// ========================================
// Queues and processes all host→guest messages sequentially
// Ensures proper render timing and animation completion
// Prevents race conditions and message loss on guest side

import { debugLog, timingLog, getTimestamp } from '../utils/debugLogger.js';

class GuestMessageQueueService {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.messageQueue = [];
    this.isProcessing = false;
    this.pendingHostState = null; // Track state update for AnimationManager callback (with isTeleporting for TELEPORT_IN)
    this.pendingFinalHostState = null; // Track final state for TELEPORT_IN reveal (without isTeleporting)

    // CHECKPOINT PHASE MATRIX
    // Defines valid host phases when guest is at each checkpoint
    // Accounts for auto-skipped phases and phase progression after bothComplete
    this.ALLOWED_HOST_PHASES = {
      // Pre-game checkpoints
      'placement': ['placement', 'gameInitializing', 'determineFirstPlayer', 'energyReset', 'draw', 'deployment'],

      // Round loop checkpoints
      'optionalDiscard': ['optionalDiscard', 'draw', 'allocateShields'],
      'allocateShields': ['allocateShields', 'mandatoryDroneRemoval', 'deployment'],
      'mandatoryDiscard': ['mandatoryDiscard', 'optionalDiscard', 'draw'],
      'mandatoryDroneRemoval': ['mandatoryDroneRemoval', 'deployment'],
      'deployment': ['deployment', 'action'],  // Sequential phase (both players at same phase)
      'action': ['action', 'determineFirstPlayer']  // Sequential phase transitions to new round
    };
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

      // SIMULTANEOUS CHECKPOINT CASCADE: Trigger cascade processing if both players complete
      if (this.triggerSimultaneousCascade) {
        this.triggerSimultaneousCascade = false; // Reset flag
        const cascadePhase = this.simultaneousCascadePhase;
        debugLog('VALIDATION', `🎯 [${cascadePhase.toUpperCase()} CHECKPOINT] Triggering cascade processing (after animations)`);

        // Get GameFlowManager and trigger cascade through onSimultaneousPhaseComplete
        const gameFlowManager = this.gameStateManager.gameFlowManager;
        if (gameFlowManager) {
          const currentState = this.gameStateManager.getState();
          const phaseCommitments = currentState.commitments?.[cascadePhase];
          await gameFlowManager.onSimultaneousPhaseComplete(cascadePhase, phaseCommitments);
        } else {
          console.error(`❌ [${cascadePhase.toUpperCase()} CHECKPOINT] GameFlowManager not available`);
        }
      }

      // BOTH-PASS CASCADE: Trigger automatic cascade if both-pass transition landed on automatic phase
      if (this.triggerBothPassCascade) {
        this.triggerBothPassCascade = false; // Reset flag
        debugLog('VALIDATION', `🎯 [BOTH-PASS CASCADE] Triggering cascade from: ${this.bothPassStartPhase}`);

        // Get GameFlowManager and trigger cascade processing
        const gameFlowManager = this.gameStateManager.gameFlowManager;
        if (gameFlowManager) {
          await gameFlowManager.processAutomaticPhasesUntilCheckpoint(this.bothPassStartPhase);
        } else {
          console.error('❌ [BOTH-PASS CASCADE] GameFlowManager not available');
        }
      }
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
  addTeleportingFlags(state, animations) {
    // Extract TELEPORT_IN animations and their target drones
    const teleportAnimations = animations.filter(anim => anim.animationName === 'TELEPORT_IN');

    if (teleportAnimations.length === 0) {
      return state; // No changes needed
    }

    debugLog('ANIMATIONS', '🌀 [TELEPORT] Adding isTeleporting flags to drones:', {
      animationCount: teleportAnimations.length
    });

    // Create deep copy of state to modify - preserve ALL top-level properties
    // Critical: Must copy turnPhase, currentPlayer, roundNumber, etc. to avoid desyncs
    const modifiedState = {
      ...state, // Copy all top-level properties (turnPhase, currentPlayer, etc.)
      player1: JSON.parse(JSON.stringify(state.player1)),
      player2: JSON.parse(JSON.stringify(state.player2))
    };

    // Add isTeleporting flag to each drone being teleported
    teleportAnimations.forEach((anim, index) => {
      const { targetPlayer, targetLane, targetId } = anim.payload || {};

      if (!targetPlayer || !targetLane || !targetId) {
        debugLog('ANIMATIONS', '⚠️ [TELEPORT] Missing payload data in TELEPORT_IN animation:', anim);
        return;
      }

      // Find and mark the drone as teleporting
      const playerState = modifiedState[targetPlayer];
      const lane = playerState?.dronesOnBoard?.[targetLane];

      if (lane && Array.isArray(lane)) {
        const droneIndex = lane.findIndex(d => d.id === targetId);
        if (droneIndex !== -1) {
          lane[droneIndex].isTeleporting = true;
          debugLog('ANIMATIONS', `🌀 [TELEPORT ${index + 1}/${teleportAnimations.length}] Marked drone as invisible:`, {
            targetPlayer,
            targetLane,
            targetId,
            droneName: lane[droneIndex].name
          });
        } else {
          debugLog('ANIMATIONS', '⚠️ [TELEPORT] Drone not found in lane:', {
            targetPlayer,
            targetLane,
            targetId
          });
        }
      }
    });

    return modifiedState;
  }

  /**
   * Compare two arrays for equality
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @param {string} context - Context for logging (e.g., 'player1.hand')
   * @returns {boolean} True if arrays match
   */
  arraysMatch(arr1, arr2, context = 'arrays') {
    if (!arr1 || !arr2) {
      const match = arr1 === arr2;
      if (!match) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${context} - null/undefined mismatch:`, {
          arr1: arr1,
          arr2: arr2
        });
      }
      return match;
    }

    if (arr1.length !== arr2.length) {
      debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${context} - length mismatch:`, {
        current: arr1.length,
        host: arr2.length
      });
      return false;
    }

    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${context}[${i}] - element mismatch:`, {
          current: arr1[i],
          host: arr2[i]
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Compare two drone arrays for equality
   * @param {Array} drones1 - First drone array
   * @param {Array} drones2 - Second drone array
   * @param {string} lane - Lane identifier for logging (e.g., 'player1.lane1')
   * @returns {boolean} True if drone arrays match
   */
  dronesMatch(drones1, drones2, lane = 'lane') {
    if (drones1.length !== drones2.length) {
      debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane} - drone count mismatch:`, {
        current: drones1.length,
        host: drones2.length
      });
      return false;
    }

    for (let i = 0; i < drones1.length; i++) {
      const d1 = drones1[i];
      const d2 = drones2[i];

      // Compare critical drone properties
      if (d1.id !== d2.id) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane}[${i}].id - mismatch:`, {
          current: d1.id,
          host: d2.id
        });
        return false;
      }

      if (d1.health !== d2.health) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane}[${i}].health - mismatch:`, {
          droneId: d1.id,
          current: d1.health,
          host: d2.health
        });
        return false;
      }

      if (d1.name !== d2.name) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane}[${i}].name - mismatch:`, {
          droneId: d1.id,
          current: d1.name,
          host: d2.name
        });
        return false;
      }

      if (d1.isTeleporting !== d2.isTeleporting) {
        debugLog('OPTIMISTIC', `❌ [STATE COMPARE] ${lane}[${i}].isTeleporting - mismatch:`, {
          droneId: d1.id,
          current: d1.isTeleporting,
          host: d2.isTeleporting
        });
        return false;
      }

      // Note: Not comparing all properties to avoid false negatives
      // Focus on gameplay-critical fields that affect rendering
    }

    return true;
  }

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
      if (!this.arraysMatch(hand1Ids, hand2Ids, `${player}.hand`)) {
        return false;
      }

      // Compare drones on board (all three lanes)
      for (const lane of ['lane1', 'lane2', 'lane3']) {
        const drones1 = p1.dronesOnBoard?.[lane] || [];
        const drones2 = p2.dronesOnBoard?.[lane] || [];

        if (!this.dronesMatch(drones1, drones2, `${player}.${lane}`)) {
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
   * @param {Object} message - P2P message from host
   */
  enqueueMessage(message) {
    const queueEntryTime = getTimestamp();

    debugLog('MULTIPLAYER', '📝 [GUEST QUEUE] Enqueuing message:', {
      type: message.type,
      queueLength: this.messageQueue.length + 1
    });

    // Add timestamp for queue wait time calculation
    const messageWithTimestamp = {
      ...message,
      queueEntryTime: queueEntryTime
    };

    timingLog('[GUEST QUEUE] Message enqueued', {
      type: message.type,
      phase: message.data?.state?.turnPhase,
      queueLength: this.messageQueue.length + 1
    });

    this.messageQueue.push(messageWithTimestamp);
    this.processQueue();
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
        console.warn('⚠️ [GUEST QUEUE] Unknown message type:', message.type);
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

    // VALIDATION LOGIC: Guest processes broadcasts in different scenarios
    const guestPhase = this.gameStateManager.getState().turnPhase;
    const hostPhase = state.turnPhase;

    // PRE-GAME PHASES: Always accept broadcasts to enable initial game start
    // Includes: null → deckSelection → droneSelection
    // NOTE: 'placement' is NOT a pre-game phase - it's a simultaneous phase that triggers
    // optimistic processing when both players complete (handled by GameFlowManager)
    const preGamePhases = [null, 'deckSelection', 'droneSelection'];
    const isPreGame = preGamePhases.includes(guestPhase);

    // BOTH-PASS TRANSITION: Accept phase-mismatched broadcasts during sequential transitions
    // Both players process both-pass optimistically (GameFlowManager lines 246-255), creating temporary phase mismatch
    // Example: Guest passes first in deployment → waits. Host passes → transitions to action → broadcasts action state.
    // Guest needs to accept this "action" broadcast even though still at deployment.
    //
    // KEY: Check guest's LOCAL passInfo, not broadcast's passInfo (which gets reset during phase transition)
    // Only accept if guest has LOCALLY passed - prevents accepting transitions before guest is ready
    const sequentialPhases = ['deployment', 'action'];
    const localState = this.gameStateManager.getState();
    const guestHasPassedLocally = localState.passInfo?.player2Passed || false;

    // Round start phases that can follow ACTION phase after both-pass
    const roundStartPhases = ['determineFirstPlayer', 'energyReset', 'mandatoryDiscard', 'optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval'];

    const bothInSequentialPhases = sequentialPhases.includes(guestPhase) && sequentialPhases.includes(hostPhase);
    const isActionToRoundStart = guestPhase === 'action' && roundStartPhases.includes(hostPhase);

    const isValidSequentialTransition =
      (guestPhase === 'deployment' && hostPhase === 'action') ||  // Guest passed first in deployment, host transitioned to action
      (guestPhase === 'action' && hostPhase === 'deployment') ||  // Host passed first in deployment, guest transitioned to action
      isActionToRoundStart;                                        // Guest passed first in action, host transitioned to new round

    const isBothPassBroadcast = guestHasPassedLocally && (bothInSequentialPhases || isActionToRoundStart) && isValidSequentialTransition;

    // Debug log to diagnose why both-pass broadcasts aren't matching
    debugLog('VALIDATION', `🔍 [BOTH-PASS CHECK]`, {
      guestPhase,
      hostPhase,
      broadcastPassInfo: state.passInfo,
      localPassInfo: localState.passInfo,
      guestHasPassedLocally,
      bothInSequentialPhases,
      isActionToRoundStart,
      isValidSequentialTransition,
      finalResult: isBothPassBroadcast
    });

    // SEQUENTIAL PHASES: Accept broadcasts when BOTH players in SAME sequential phase
    // During deployment and action phases, guest must receive every host action (deploy, attack, pass, etc.)
    // But ONLY when both are in the same phase - prevents state regression when host is behind
    const bothInSameSequentialPhase =
      sequentialPhases.includes(guestPhase) &&
      guestPhase === hostPhase; // Must be same phase to prevent regression

    if (isPreGame) {
      debugLog('VALIDATION', `✅ [GUEST] Accepting pre-game broadcast`, {
        guestPhase: guestPhase || 'null',
        hostPhase,
        reason: 'Pre-game initialization'
      });
      // Continue to state processing below
    } else if (isBothPassBroadcast) {
      debugLog('VALIDATION', `✅ [GUEST] Accepting both-pass transition broadcast`, {
        guestPhase,
        hostPhase,
        passInfo: state.passInfo,
        reason: 'Both players passed - accepting phase transition despite phase mismatch'
      });

      const phaseAnimationQueue = this.gameStateManager.gameFlowManager?.phaseAnimationQueue;

      if (phaseAnimationQueue) {
        // Queue OPPONENT PASSED notification FIRST
        // Both-pass transition occurred AND guest has passed locally → opponent must have passed too
        phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null);
        debugLog('VALIDATION', `🎬 [GUEST] Queued OPPONENT PASSED notification (deduced from both-pass transition)`);

        // Then queue phase announcement for the new phase
        // Guest needs this because it doesn't call processPhaseTransition directly
        // Host queues announcements during processPhaseTransition, guest must queue locally
        if (hostPhase !== guestPhase) {
          const phaseTextMap = {
            'action': 'ACTION PHASE',
            'deployment': 'DEPLOYMENT PHASE',
            'determineFirstPlayer': 'DETERMINING FIRST PLAYER',
            'energyReset': 'ENERGY RESET',
            'draw': 'DRAW PHASE'
          };

          if (phaseTextMap[hostPhase]) {
            phaseAnimationQueue.queueAnimation(hostPhase, phaseTextMap[hostPhase], null);
            debugLog('VALIDATION', `🎬 [GUEST] Queued phase announcement for: ${hostPhase}`);
          }
        }

        // Start playback immediately if not already playing
        const queueLength = phaseAnimationQueue.getQueueLength();
        if (queueLength > 0 && !phaseAnimationQueue.isPlaying()) {
          debugLog('VALIDATION', `🎬 [GUEST] Starting playback for both-pass transition announcements`);
          phaseAnimationQueue.startPlayback();
        }
      }

      // Check if both-pass transition lands on an AUTOMATIC phase
      // If yes, set flag to trigger cascade after applying host state
      const automaticPhases = ['gameInitializing', 'energyReset', 'draw', 'determineFirstPlayer'];
      if (automaticPhases.includes(hostPhase)) {
        this.triggerBothPassCascade = true;
        this.bothPassStartPhase = hostPhase;
        debugLog('VALIDATION', `🎯 [BOTH-PASS CASCADE] Will trigger cascade from: ${hostPhase}`);
      }

      // Continue to state processing below
    } else if (bothInSameSequentialPhase) {
      debugLog('VALIDATION', `✅ [GUEST] Accepting sequential phase broadcast`, {
        guestPhase,
        hostPhase,
        reason: 'Both in same sequential phase - host authoritative for actions'
      });
      // Continue to state processing below
    } else {
      // IN-GAME CHECKPOINT VALIDATION: Only process at matching checkpoints
      // This applies during automatic phase cascades (determineFirstPlayer, energyReset, draw, etc.)
      const isCheckpoint = this.gameStateManager.isMilestonePhase(guestPhase);

      // If Guest is NOT at a checkpoint, ignore all broadcasts
      if (!isCheckpoint) {
        debugLog('VALIDATION', `⏭️ [GUEST] Ignoring broadcast - not at checkpoint`, {
          guestPhase,
          hostPhase,
          reason: 'Between checkpoints during automatic cascade'
        });
        return;
      }

      // If Guest IS at checkpoint, check if host phase is in allowed list
      const allowedPhases = this.ALLOWED_HOST_PHASES[guestPhase] || [guestPhase];
      if (!allowedPhases.includes(hostPhase)) {
        debugLog('VALIDATION', `⏸️ [GUEST] Host phase not in allowed list for checkpoint`, {
          guestPhase,
          hostPhase,
          allowedPhases,
          waiting: `Guest at ${guestPhase}, host at ${hostPhase}`
        });
        return;
      }

      // Host phase is allowed for this checkpoint - VALIDATE!
      debugLog('VALIDATION', `✅ [GUEST] Checkpoint match - validating state`, {
        checkpointPhase: guestPhase,
        hostPhase,
        allowedPhases
      });
    }

    // Preserve guest-specific identity fields before applying host state
    const currentGuestState = this.gameStateManager.getState();
    const preservedFields = {
      gameMode: currentGuestState.gameMode,  // Must stay 'guest'
    };

    // SIMULTANEOUS CHECKPOINT: Check if both players complete, trigger cascade processing
    // This handles ALL simultaneous phases (placement, optionalDiscard, allocateShields, etc.)
    const gameFlowManager = this.gameStateManager.gameFlowManager;
    if (gameFlowManager && gameFlowManager.isSimultaneousPhase(guestPhase)) {
      const phaseCommitments = state.commitments?.[guestPhase];
      const bothComplete = phaseCommitments?.player1?.completed && phaseCommitments?.player2?.completed;

      if (bothComplete) {
        // SIMULTANEOUS CASCADE: Also preserve turnPhase when cascade will be triggered
        // This prevents Guest from jumping to Host's advanced phase before processing cascade
        preservedFields.turnPhase = currentGuestState.turnPhase;
        debugLog('VALIDATION', '🔒 [CASCADE] Preserving guest phase for cascade processing', {
          guestPhase: currentGuestState.turnPhase,
          hostPhase: state.turnPhase,
          reason: 'Guest will process cascade and queue announcements before accepting host phase'
        });
      }
    }

    // Merge host state with preserved guest identity
    state = {
      ...state,           // Copy all authoritative game state from host
      ...preservedFields  // Overwrite with preserved guest identity
    };

    debugLog('VALIDATION', '🔄 [CHECKPOINT VALIDATION] Preserving guest identity', {
      preservedGameMode: preservedFields.gameMode,
      hostGameMode: state.gameMode,
      checkpointPhase: guestPhase,
      preservedPhase: preservedFields.turnPhase || 'none'
    });

    // Re-check both complete after potential phase preservation
    if (gameFlowManager && gameFlowManager.isSimultaneousPhase(guestPhase)) {
      const phaseCommitments = state.commitments?.[guestPhase];
      const bothComplete = phaseCommitments?.player1?.completed && phaseCommitments?.player2?.completed;

      debugLog('VALIDATION', `🔍 [${guestPhase.toUpperCase()} CHECKPOINT] Checking completion status`, {
        phase: guestPhase,
        player1Complete: phaseCommitments?.player1?.completed,
        player2Complete: phaseCommitments?.player2?.completed,
        bothComplete
      });

      if (bothComplete) {
        debugLog('VALIDATION', `🚀 [${guestPhase.toUpperCase()} CHECKPOINT] Both complete - will trigger cascade after state applied`);
        // Set flag to trigger cascade after state application
        this.triggerSimultaneousCascade = true;
        this.simultaneousCascadePhase = guestPhase;
      }
    }

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
          console.error(`❌ [${cascadePhase.toUpperCase()} CHECKPOINT] GameFlowManager not available`);
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
          console.error('❌ [BOTH-PASS CASCADE] GameFlowManager not available');
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
      const stateWithInvisibleDrones = this.addTeleportingFlags(state, allAnimations);

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
        if (!this.arraysMatch(guestVal, hostVal, fullPath)) {
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
