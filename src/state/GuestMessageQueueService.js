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

    // CRITICAL FIX: Play animations BEFORE applying state
    //
    // Why this order is necessary:
    // - Host processes actions and creates animations while entities still exist in Host's state
    // - Host then broadcasts post-processed state (entities already removed) + animation list
    // - Guest receives this and must play animations using Guest's CURRENT state (entities still in DOM)
    // - Then Guest applies the new state (which removes entities from DOM)
    //
    // Wrong order (old code):
    //   Apply state → React renders (removes drones) → Try to animate → Can't find DOM elements ❌
    //
    // Correct order (matches Host's flow):
    //   Animate using current state → Apply new state → React renders ✅
    if (hasAnimations) {
      if (this.gameStateManager.actionProcessor?.animationManager) {
        debugLog('ANIMATIONS', '🎬 [GUEST QUEUE] Playing animations BEFORE state update (entities still in DOM)...');
        await this.gameStateManager.actionProcessor.animationManager.executeAnimations(animationsToPlay, 'HOST_RESPONSE');
        debugLog('ANIMATIONS', '✅ [GUEST QUEUE] Animations complete, now applying state update');
      }
    }

    // Apply state after animations (entities can now be safely removed from DOM)
    debugLog('STATE_SYNC', '📝 [GUEST QUEUE] Applying state update...');
    this.gameStateManager.applyHostState(state);

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
