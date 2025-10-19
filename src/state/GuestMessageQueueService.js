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
   *
   * Flow:
   * 1. Play animations using Guest's CURRENT state (entities still in DOM)
   * 2. Apply Host's state update (entities removed)
   * 3. React re-renders (entities removed from DOM)
   *
   * This order matches Host's flow: animate during processing, then update state.
   */
  async processStateUpdate({ state, actionAnimations, systemAnimations }) {
    debugLog('STATE_SYNC', '📊 [GUEST QUEUE] Processing state update:', {
      turnPhase: state?.turnPhase,
      hasActionAnimations: actionAnimations?.length > 0,
      hasSystemAnimations: systemAnimations?.length > 0,
      actionAnimationCount: actionAnimations?.length || 0,
      systemAnimationCount: systemAnimations?.length || 0
    });

    // Check if we have recent optimistic actions (client-side prediction)
    const hasOptimisticActions = this.gameStateManager.hasRecentOptimisticActions();
    const optimisticCount = this.gameStateManager.optimisticActions?.length || 0;

    // Smart filtering: Skip action animations if optimistic, always keep system animations
    let filteredActionAnimations = actionAnimations || [];
    if (hasOptimisticActions && actionAnimations && actionAnimations.length > 0) {
      debugLog('ANIMATIONS', '⏭️ [GUEST QUEUE] SKIPPING action animations - already played optimistically');
      filteredActionAnimations = [];
    }

    // System animations always play (phase announcements, etc.)
    const systemAnimationsToPlay = systemAnimations || [];

    // Combine animations to execute
    const animationsToPlay = [...filteredActionAnimations, ...systemAnimationsToPlay];

    debugLog('ANIMATIONS', '🔍 [GUEST QUEUE] Animation filtering decision:', {
      hasOptimisticActions,
      optimisticActionsCount: optimisticCount,
      incomingActionCount: actionAnimations?.length || 0,
      incomingSystemCount: systemAnimations?.length || 0,
      skippedActionCount: (actionAnimations?.length || 0) - filteredActionAnimations.length,
      systemAnimationsKept: systemAnimationsToPlay.length,
      totalToPlay: animationsToPlay.length,
      reasoning: hasOptimisticActions
        ? 'Filtered action animations (optimistic), kept system animations'
        : 'Playing all animations (no optimistic actions)'
    });

    const hasAnimations = animationsToPlay.length > 0;

    // CRITICAL FIX: Split animations by timing requirements
    //
    // Animation categories:
    // - PRE-STATE: Need existing entities (explosions, lasers, etc.) - play before state update
    // - POST-STATE: Need new entities (teleport-in, spawns, etc.) - play after state update + render
    // - INDEPENDENT: Don't need specific entities (card reveals, notifications) - play anytime
    //
    // Order:
    // 1. PRE-STATE animations (with current state intact)
    // 2. Apply state update
    // 3. Wait for React render
    // 4. POST-STATE animations (with new state rendered)
    //
    const preStateAnimations = [];
    const postStateAnimations = [];
    const independentAnimations = [];

    if (hasAnimations) {
      for (const animation of animationsToPlay) {
        const timing = animation.timing || 'pre-state';  // Default to pre-state for safety

        if (timing === 'post-state') {
          postStateAnimations.push(animation);
        } else if (timing === 'independent') {
          independentAnimations.push(animation);
        } else {
          preStateAnimations.push(animation);
        }
      }

      debugLog('ANIMATIONS', '🔍 [GUEST QUEUE] Animation timing split:', {
        preStateCount: preStateAnimations.length,
        postStateCount: postStateAnimations.length,
        independentCount: independentAnimations.length,
        total: animationsToPlay.length
      });
    }

    // Step 1: Play INDEPENDENT and PRE-STATE animations (current state still intact)
    // IMPORTANT: Independent animations (card reveals, notifications) play FIRST for better UX
    // Then pre-state animations (combat effects) play after player knows what's happening
    const preAnimations = [...independentAnimations, ...preStateAnimations];
    if (preAnimations.length > 0 && this.gameStateManager.actionProcessor?.animationManager) {
      debugLog('ANIMATIONS', '🎬 [GUEST QUEUE] Playing INDEPENDENT + PRE-STATE animations (entities still in DOM)...');
      await this.gameStateManager.actionProcessor.animationManager.executeAnimations(preAnimations, 'HOST_RESPONSE_PRE');
      debugLog('ANIMATIONS', '✅ [GUEST QUEUE] INDEPENDENT + PRE-STATE animations complete');
    }

    // Step 2: Apply state update (with special handling for TELEPORT_IN animations)
    // Check if we have TELEPORT_IN animations that need visibility management
    const teleportAnimations = postStateAnimations.filter(anim => anim.animationName === 'TELEPORT_IN');
    const hasTeleportAnimations = teleportAnimations.length > 0;

    if (hasTeleportAnimations) {
      debugLog('ANIMATIONS', '✨ [GUEST QUEUE] Detected TELEPORT_IN animations - managing drone visibility');

      // Create modified state with isTeleporting flags for target drones
      const modifiedState = { ...state };

      teleportAnimations.forEach(anim => {
        const { targetId, laneId, playerId } = anim.payload;
        const playerKey = playerId; // 'player1' or 'player2'

        if (modifiedState[playerKey] && modifiedState[playerKey].dronesOnBoard && modifiedState[playerKey].dronesOnBoard[laneId]) {
          modifiedState[playerKey] = {
            ...modifiedState[playerKey],
            dronesOnBoard: {
              ...modifiedState[playerKey].dronesOnBoard,
              [laneId]: modifiedState[playerKey].dronesOnBoard[laneId].map(drone =>
                drone.id === targetId ? { ...drone, isTeleporting: true } : drone
              )
            }
          };
        }
      });

      debugLog('STATE_SYNC', '📝 [GUEST QUEUE] Applying state with isTeleporting flags...');
      this.gameStateManager.applyHostState(modifiedState);

      // Wait for React to render invisible placeholder drones
      debugLog('ANIMATIONS', '⏳ [GUEST QUEUE] Waiting for React to render invisible placeholder drones...');
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
      debugLog('ANIMATIONS', '✅ [GUEST QUEUE] Invisible placeholders rendered');

      // Start playing POST-STATE animations
      if (this.gameStateManager.actionProcessor?.animationManager) {
        debugLog('ANIMATIONS', '🎬 [GUEST QUEUE] Playing POST-STATE animations with visibility management...');
        const animationPromise = this.gameStateManager.actionProcessor.animationManager.executeAnimations(postStateAnimations, 'HOST_RESPONSE_POST');

        // Schedule drone reveal at 70% of animation duration (matching host behavior)
        const teleportConfig = this.gameStateManager.actionProcessor.animationManager?.animations?.TELEPORT_IN;
        const revealDelay = (teleportConfig?.duration || 600) * (teleportConfig?.config?.revealAt || 0.7);

        setTimeout(() => {
          debugLog('ANIMATIONS', '✨ [GUEST QUEUE] Revealing drones at 70% of teleport animation...');
          this.gameStateManager.applyHostState(state); // Apply original state without isTeleporting flags
        }, revealDelay);

        // Wait for animations to complete
        await animationPromise;
        debugLog('ANIMATIONS', '✅ [GUEST QUEUE] POST-STATE animations complete');
      }
    } else {
      // No teleport animations - standard flow
      debugLog('STATE_SYNC', '📝 [GUEST QUEUE] Applying state update...');
      this.gameStateManager.applyHostState(state);

      // Wait for React to render new state
      if (postStateAnimations.length > 0) {
        debugLog('ANIMATIONS', '⏳ [GUEST QUEUE] Waiting for React to render new state...');
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });
        debugLog('ANIMATIONS', '✅ [GUEST QUEUE] React render complete');
      }

      // Play POST-STATE animations
      if (postStateAnimations.length > 0 && this.gameStateManager.actionProcessor?.animationManager) {
        debugLog('ANIMATIONS', '🎬 [GUEST QUEUE] Playing POST-STATE animations (new entities in DOM)...');
        await this.gameStateManager.actionProcessor.animationManager.executeAnimations(postStateAnimations, 'HOST_RESPONSE_POST');
        debugLog('ANIMATIONS', '✅ [GUEST QUEUE] POST-STATE animations complete');
      }
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
