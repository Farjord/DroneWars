// ========================================
// PHASE ANIMATION QUEUE
// ========================================
// Sequential animation queue for phase announcements
// Decouples phase processing from animation playback
// Ensures animations play one-at-a-time to guide player through game flow

import { debugLog, timingLog } from '../utils/debugLogger.js';

// Total phase display duration: 1500ms display + 300ms fade out
const PHASE_DISPLAY_DURATION = 1800;

class PhaseAnimationQueue {
  constructor(gameStateManager = null) {
    this.queue = [];
    this.isPlayingAnimations = false;
    this.currentAnimation = null;
    this.listeners = new Map();
    this.gameStateManager = gameStateManager; // For dynamic subtitle calculation
  }

  /**
   * Add animation to queue
   * @param {string} phaseName - Internal phase name (e.g., 'determineFirstPlayer')
   * @param {string} phaseText - Display text (e.g., 'DETERMINING FIRST PLAYER')
   * @param {string} subtitle - Optional subtitle text
   * @param {string} source - Source identifier for tracing (e.g., 'AP:host_transition:1892')
   */
  queueAnimation(phaseName, phaseText, subtitle = null, source = 'unknown') {
    // DEDUPLICATION: Check if same phaseName is currently playing
    // This prevents the same announcement from playing twice in a row
    if (this.currentAnimation && this.currentAnimation.phaseName === phaseName) {
      debugLog('ANNOUNCE_TRACE', `⛔ DEDUP: ${phaseName} blocked - already playing`, {
        source,
        playingFrom: this.currentAnimation.source,
        phaseText
      });
      return; // Don't queue same phase that's already playing
    }

    // DEDUPLICATION: Check if same phaseName already exists in queue
    const existingIndex = this.queue.findIndex(a => a.phaseName === phaseName);
    if (existingIndex !== -1) {
      // Update existing animation with new text (in case it changed)
      const existingSource = this.queue[existingIndex].source;
      this.queue[existingIndex].phaseText = phaseText;
      if (subtitle !== null) {
        this.queue[existingIndex].subtitle = subtitle;
      }

      debugLog('ANNOUNCE_TRACE', `⛔ DEDUP: ${phaseName} blocked - already in queue`, {
        newSource: source,
        existingSource,
        queuePosition: existingIndex
      });
      return; // Don't add duplicate
    }

    const animation = {
      id: `phase-anim-${crypto.randomUUID()}`,
      phaseName,
      phaseText,
      subtitle,
      source,
      queuedAt: Date.now()
    };

    this.queue.push(animation);

    debugLog('ANNOUNCE_TRACE', `📋 QUEUE: ${phaseName} from ${source}`, {
      phaseText,
      queueLength: this.queue.length,
      isPlaying: this.isPlayingAnimations
    });
  }

  /**
   * Start playing queued animations sequentially
   * Non-blocking - returns immediately, animations play in background
   * @param {string} source - Source identifier for tracing
   */
  startPlayback(source = 'unknown') {
    if (this.isPlayingAnimations) {
      debugLog('ANNOUNCE_TRACE', `⚠️ PLAYBACK: Already playing, ignoring call from ${source}`);
      return;
    }

    if (this.queue.length === 0) {
      debugLog('ANNOUNCE_TRACE', `⚠️ PLAYBACK: No animations to play (from ${source})`);
      return;
    }

    debugLog('ANNOUNCE_TRACE', `▶️ PLAYBACK: Started from ${source}`, {
      queueLength: this.queue.length,
      animations: this.queue.map(a => `${a.phaseName}[${a.source}]`).join(' → ')
    });

    this.isPlayingAnimations = true;
    this.emit('playbackStateChanged', true);

    // Start playing first animation (non-blocking)
    this.playNext();
  }

  /**
   * Play next animation in queue (recursive)
   * @private
   */
  async playNext() {
    if (this.queue.length === 0) {
      // Queue empty, playback complete
      timingLog('[ANIMATION QUEUE] Playback complete');
      this.isPlayingAnimations = false;
      this.currentAnimation = null;
      this.emit('playbackStateChanged', false);
      this.emit('complete');
      return;
    }

    // Get next animation
    this.currentAnimation = this.queue.shift();

    // Calculate dynamic round number for round announcements
    // This ensures correct round number using fresh state at playback time
    if (this.currentAnimation.phaseName === 'roundAnnouncement' && this.gameStateManager) {
      const currentState = this.gameStateManager.getState();
      const roundNumber = currentState.roundNumber || 1;
      this.currentAnimation.phaseText = `ROUND ${roundNumber}`;

      debugLog('SUBTITLE_CALC', `✅ Calculated round announcement text: "ROUND ${roundNumber}"`, {
        roundNumber,
        originalText: 'ROUND',
        calculatedText: this.currentAnimation.phaseText
      });
    }

    // Calculate subtitle dynamically for deployment/action phases
    // This ensures correct "You Go First" vs "Opponent Goes First" using fresh state
    if ((this.currentAnimation.phaseName === 'deployment' || this.currentAnimation.phaseName === 'action') && this.gameStateManager) {
      const currentState = this.gameStateManager.getState();
      const localPlayerId = this.gameStateManager.getLocalPlayerId();
      const firstPlayerId = currentState.firstPlayerOfRound;

      debugLog('SUBTITLE_CALC', `🎯 Calculating subtitle for ${this.currentAnimation.phaseName}`, {
        localPlayerId,
        firstPlayerId,
        gameMode: currentState.gameMode,
        currentPlayer: currentState.currentPlayer,
        match: firstPlayerId === localPlayerId,
        types: `firstPlayerId(${typeof firstPlayerId}) === localPlayerId(${typeof localPlayerId})`
      });

      if (firstPlayerId === localPlayerId) {
        this.currentAnimation.subtitle = 'You Go First';
        debugLog('SUBTITLE_CALC', `✅ Set subtitle: "You Go First"`);
      } else if (firstPlayerId) {
        this.currentAnimation.subtitle = 'Opponent Goes First';
        debugLog('SUBTITLE_CALC', `✅ Set subtitle: "Opponent Goes First"`);
      } else {
        debugLog('SUBTITLE_CALC', `⚠️ No firstPlayerId set - subtitle will be null`);
      }
    }

    debugLog('ANNOUNCE_TRACE', `🎬 PLAYING: ${this.currentAnimation.phaseName} from ${this.currentAnimation.source}`, {
      phaseText: this.currentAnimation.phaseText,
      subtitle: this.currentAnimation.subtitle || 'none',
      remaining: this.queue.length
    });

    const startTime = timingLog('[ANIMATION QUEUE] Playing animation', {
      phaseName: this.currentAnimation.phaseName,
      phaseText: this.currentAnimation.phaseText,
      source: this.currentAnimation.source,
      subtitle: this.currentAnimation.subtitle || 'none',
      queuedFor: Date.now() - this.currentAnimation.queuedAt,
      remaining: this.queue.length
    });

    // Emit event for UI to display animation
    this.emit('animationStarted', this.currentAnimation);

    // Wait for animation duration (1500ms display + 300ms fade out)
    await new Promise(resolve => setTimeout(resolve, PHASE_DISPLAY_DURATION));

    // SAFETY CHECK: If clear() was called during the await, abort gracefully
    // This prevents crash when currentAnimation is null
    if (!this.currentAnimation) {
      debugLog('ANNOUNCE_TRACE', '⚠️ ABORTED: clear() was called during playback');
      return;
    }

    timingLog('[ANIMATION QUEUE] Animation complete', {
      phaseName: this.currentAnimation.phaseName,
      phaseText: this.currentAnimation.phaseText
    }, startTime);

    // Emit completion event
    this.emit('animationEnded', this.currentAnimation);

    // Play next animation
    this.playNext();
  }

  /**
   * Check if animations are currently playing
   * @returns {boolean}
   */
  isPlaying() {
    return this.isPlayingAnimations;
  }

  /**
   * Get current animation being played
   * @returns {Object|null}
   */
  getCurrentAnimation() {
    return this.currentAnimation;
  }

  /**
   * Get number of queued animations
   * @returns {number}
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Clear all queued animations (for resets)
   */
  clear() {
    debugLog('TIMING', '🗑️ [ANIMATION QUEUE] Clearing queue', {
      clearedCount: this.queue.length
    });

    this.queue = [];
    this.isPlayingAnimations = false;
    this.currentAnimation = null;
    this.emit('playbackStateChanged', false);
    // Note: Do NOT clear listeners here - UI subscriptions (App.jsx) are set up
    // on mount and must persist across game resets. Clearing them breaks animations.
  }

  /**
   * Register callback for when playback completes
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onComplete(callback) {
    return this.on('complete', callback);
  }

  /**
   * Event emitter - subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Event emitter - unsubscribe from events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Event emitter - emit events
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export default PhaseAnimationQueue;
