// ========================================
// GUEST MESSAGE QUEUE SERVICE
// ========================================
// Queues and processes all host→guest messages sequentially
// Ensures proper render timing and animation completion
// Prevents race conditions and message loss on guest side

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
    console.log('🎯 [GUEST QUEUE] Initializing GuestMessageQueueService');

    // Subscribe to state update messages from host (filter for queuing)
    // Other events (setup, control) are handled directly by GameStateManager
    p2pManager.subscribe((event) => {
      if (event.type === 'state_update_received') {
        console.log('📥 [GUEST QUEUE] Received state update, queuing for processing');
        this.enqueueMessage(event);
      }
      // Setup events like 'multiplayer_mode_change' and 'joined_room' handled elsewhere
    });

    // Subscribe to render complete events from App.jsx
    this.gameStateManager.subscribe((event) => {
      if (event.type === 'render_complete') {
        console.log('✅ [GUEST QUEUE] Render complete received');
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
    console.log('📝 [GUEST QUEUE] Enqueuing message:', {
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
      console.log('⏸️ [GUEST QUEUE] Already processing, queue length:', this.messageQueue.length);
      return;
    }

    this.isProcessing = true;
    console.log('▶️ [GUEST QUEUE] Starting queue processing');

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      console.log('🔄 [GUEST QUEUE] Processing message:', {
        type: message.type,
        remaining: this.messageQueue.length
      });

      await this.processMessage(message);
    }

    this.isProcessing = false;
    console.log('⏹️ [GUEST QUEUE] Queue processing complete');
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
  async processStateUpdate({ state, animations }) {
    console.log('📊 [GUEST QUEUE] Processing state update:', {
      turnPhase: state?.turnPhase,
      hasAnimations: animations?.length > 0,
      animationCount: animations?.length || 0
    });

    // Check if we have recent optimistic actions (client-side prediction)
    const hasOptimisticActions = this.gameStateManager.hasRecentOptimisticActions();

    // Skip animations if we processed this optimistically (already played animations)
    const shouldSkipAnimations = hasOptimisticActions && animations && animations.length > 0;

    if (shouldSkipAnimations) {
      console.log('🔮 [GUEST QUEUE] Skipping animations - already played optimistically');
    }

    const hasAnimations = animations && animations.length > 0 && !shouldSkipAnimations;

    // Step 1: Setup render promise BEFORE applying state (prevents race condition)
    // Only create promise if animations are present - optimization for state-only updates
    let renderPromise = null;
    if (hasAnimations) {
      console.log('🔧 [GUEST QUEUE] Setting up render listener for animations...');
      renderPromise = this.waitForRender();
    }

    // Step 2: Apply state (this will trigger React re-render)
    console.log('📝 [GUEST QUEUE] Applying state...');
    this.gameStateManager.applyHostState(state);

    // Step 3: Wait for React to render (only if animations are present)
    if (hasAnimations && renderPromise) {
      console.log('⏳ [GUEST QUEUE] Waiting for React render before animations...');
      await renderPromise;
      console.log('✅ [GUEST QUEUE] React render complete');

      // Step 4: Execute animations
      if (this.gameStateManager.actionProcessor?.animationManager) {
        console.log('🎬 [GUEST QUEUE] Executing animations...');
        await this.gameStateManager.actionProcessor.animationManager.executeAnimations(animations);
        console.log('✅ [GUEST QUEUE] Animations complete');
      }
    } else {
      console.log('⚡ [GUEST QUEUE] No animations - state applied immediately without render wait');
    }

    console.log('✅ [GUEST QUEUE] State update processing complete');
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
