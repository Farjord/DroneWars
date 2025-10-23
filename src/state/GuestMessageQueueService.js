// ========================================
// GUEST MESSAGE QUEUE SERVICE
// ========================================
// Queues and processes all host→guest messages sequentially
// Ensures proper render timing and animation completion
// Prevents race conditions and message loss on guest side

import { debugLog } from '../utils/debugLogger.js';

class GuestMessageQueueService {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.messageQueue = [];
    this.isProcessing = false;
    this.pendingHostState = null; // Track state update for AnimationManager callback (with isTeleporting for TELEPORT_IN)
    this.pendingFinalHostState = null; // Track final state for TELEPORT_IN reveal (without isTeleporting)
  }

  /**
   * Apply pending state update (called by AnimationManager during orchestration)
   * Used by AnimationManager.executeWithStateUpdate() to apply state at correct timing
   */
  applyPendingStateUpdate() {
    if (this.pendingHostState) {
      debugLog('ANIMATIONS', '📝 [STATE UPDATE] GuestMessageQueueService applying pending host state');
      this.gameStateManager.applyHostState(this.pendingHostState);
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
    debugLog('MULTIPLAYER', '📝 [GUEST QUEUE] Enqueuing message:', {
      type: message.type,
      queueLength: this.messageQueue.length + 1
    });

    this.messageQueue.push(message);
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
    debugLog('MULTIPLAYER', '▶️ [GUEST QUEUE] Starting queue processing');

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      debugLog('MULTIPLAYER', '🔄 [GUEST QUEUE] Processing message:', {
        type: message.type,
        remaining: this.messageQueue.length
      });

      await this.processMessage(message);
    }

    this.isProcessing = false;
    debugLog('MULTIPLAYER', '⏹️ [GUEST QUEUE] Queue processing complete');
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
    // VALIDATION LOG: Verify received state completeness
    debugLog('BROADCAST_TIMING', `📥 [GUEST RECEIVE] Phase: ${state?.turnPhase} | Player: ${state?.currentPlayer} | Fields: ${Object.keys(state || {}).length} | Queue: ${this.messageQueue.length} | Anims: ${(actionAnimations?.length || 0) + (systemAnimations?.length || 0)}`);

    debugLog('STATE_SYNC', '📊 [GUEST QUEUE] Processing state update:', {
      turnPhase: state?.turnPhase,
      actionAnimationCount: actionAnimations?.length || 0,
      systemAnimationCount: systemAnimations?.length || 0
    });

    // Filter duplicate animations (optimistic action deduplication)
    // This is GuestMessageQueueService's unique responsibility
    const filtered = this.gameStateManager.filterAnimations(
      actionAnimations || [],
      systemAnimations || []
    );

    const allAnimations = [...filtered.actionAnimations, ...filtered.systemAnimations];

    debugLog('ANIMATIONS', '📊 [GUEST QUEUE] Animation filtering complete:', {
      incomingCount: (actionAnimations?.length || 0) + (systemAnimations?.length || 0),
      afterFilterCount: allAnimations.length,
      skipped: ((actionAnimations?.length || 0) + (systemAnimations?.length || 0)) - allAnimations.length
    });

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

    try {
      // Delegate to AnimationManager for timing orchestration
      // AnimationManager will: play pre-state animations → update state → play post-state animations
      await animationManager.executeWithStateUpdate(allAnimations, this);
    } finally {
      this.pendingHostState = null;
      this.pendingFinalHostState = null;
    }

    debugLog('STATE_SYNC', '✅ [GUEST QUEUE] State update processing complete');
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
}

export default GuestMessageQueueService;
