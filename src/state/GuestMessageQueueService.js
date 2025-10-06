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
    this.renderCompletePromise = null;
    this.renderCompleteResolve = null;
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

    // Subscribe to render complete events from App.jsx
    this.gameStateManager.subscribe((event) => {
      if (event.type === 'render_complete') {
        debugLog('STATE_SYNC', '✅ [GUEST QUEUE] Render complete received');
        if (this.renderCompleteResolve) {
          this.renderCompleteResolve();
          this.renderCompleteResolve = null;
          this.renderCompletePromise = null;
        }
      }
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
   * Process state update with proper timing
   * 1. Setup render listener FIRST (only if animations present)
   * 2. Apply state
   * 3. Wait for React render (only if animations present - performance optimization)
   * 4. Execute animations (if present)
   * 5. Complete
   *
   * Performance: State-only updates skip render wait for instant application
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

    // Step 1: Setup render promise BEFORE applying state (prevents race condition)
    // Only create promise if animations are present - optimization for state-only updates
    let renderPromise = null;
    if (hasAnimations) {
      debugLog('STATE_SYNC', '🔧 [GUEST QUEUE] Setting up render listener for animations...');
      renderPromise = this.waitForRender();
    }

    // Step 2: Apply state (this will trigger React re-render)
    debugLog('STATE_SYNC', '📝 [GUEST QUEUE] Applying state...');
    this.gameStateManager.applyHostState(state);

    // Step 3: Wait for React to render (only if animations are present)
    if (hasAnimations && renderPromise) {
      debugLog('STATE_SYNC', '⏳ [GUEST QUEUE] Waiting for React render before animations...');
      await renderPromise;
      debugLog('STATE_SYNC', '✅ [GUEST QUEUE] React render complete');

      // Step 4: Execute animations
      if (this.gameStateManager.actionProcessor?.animationManager) {
        debugLog('ANIMATIONS', '🎬 [GUEST QUEUE] Executing animations from HOST response...');
        await this.gameStateManager.actionProcessor.animationManager.executeAnimations(animationsToPlay, 'HOST_RESPONSE');
        debugLog('ANIMATIONS', '✅ [GUEST QUEUE] Host response animations complete');
      }
    } else {
      debugLog('STATE_SYNC', '⚡ [GUEST QUEUE] No animations - state applied immediately without render wait');
    }

    debugLog('STATE_SYNC', '✅ [GUEST QUEUE] State update processing complete');
  }

  /**
   * Wait for React render to complete
   * Creates promise that resolves when 'render_complete' event received
   */
  async waitForRender() {
    if (this.renderCompletePromise) {
      // Already waiting for render
      return this.renderCompletePromise;
    }

    this.renderCompletePromise = new Promise((resolve) => {
      this.renderCompleteResolve = resolve;
    });

    return this.renderCompletePromise;
  }

  /**
   * Get current queue status
   * @returns {Object} Queue statistics
   */
  getStatus() {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      waitingForRender: !!this.renderCompletePromise
    };
  }
}

export default GuestMessageQueueService;
