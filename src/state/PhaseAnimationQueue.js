// ========================================
// PHASE ANIMATION QUEUE
// ========================================
// Sequential animation queue for phase announcements
// Decouples phase processing from animation playback
// Ensures animations play one-at-a-time to guide player through game flow

import { debugLog, timingLog } from '../utils/debugLogger.js';

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
   */
  queueAnimation(phaseName, phaseText, subtitle = null) {
    const animation = {
      id: `phase-anim-${Date.now()}-${Math.random()}`,
      phaseName,
      phaseText,
      subtitle,
      queuedAt: Date.now(),
      stackTrace: new Error().stack // Capture call stack for debugging!
    };

    this.queue.push(animation);

    debugLog('TIMING', `📋 [ANIMATION QUEUE] Animation queued WITH STACK TRACE`, {
      phaseName,
      phaseText,
      queueLength: this.queue.length,
      isPlaying: this.isPlayingAnimations,
      timestamp: Date.now(),
      stackTrace: animation.stackTrace.split('\n').slice(0, 6).join('\n') // First 6 lines of stack
    });
  }

  /**
   * Start playing queued animations sequentially
   * Non-blocking - returns immediately, animations play in background
   */
  startPlayback() {
    if (this.isPlayingAnimations) {
      debugLog('TIMING', '⚠️ [ANIMATION QUEUE] Already playing, ignoring startPlayback()');
      return;
    }

    if (this.queue.length === 0) {
      debugLog('TIMING', '📋 [ANIMATION QUEUE] No animations to play');
      return;
    }

    timingLog('[ANIMATION QUEUE] Starting playback', {
      queueLength: this.queue.length,
      animations: this.queue.map(a => a.phaseText).join(' → ')
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

    const startTime = timingLog('[ANIMATION QUEUE] Playing animation', {
      phaseName: this.currentAnimation.phaseName,
      phaseText: this.currentAnimation.phaseText,
      subtitle: this.currentAnimation.subtitle || 'none',
      queuedFor: Date.now() - this.currentAnimation.queuedAt,
      remaining: this.queue.length
    });

    // Emit event for UI to display animation
    this.emit('animationStarted', this.currentAnimation);

    // Wait for animation duration (1500ms display + 300ms fade out)
    await new Promise(resolve => setTimeout(resolve, 1800));

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
