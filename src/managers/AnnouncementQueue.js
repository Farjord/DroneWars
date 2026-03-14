// ========================================
// ANNOUNCEMENT QUEUE
// ========================================
// Sequential FIFO queue for phase/pass announcements.
// Starts HELD — announcements accumulate but don't play until release() is called.
// App.jsx calls release() on mount, hold() on unmount, ensuring announcements
// never play before the UI subscriber is ready.
// Zero external dependencies; server personalizes all text before delivery.

import { debugLog, timingLog } from '../utils/debugLogger.js';
import { flowCheckpoint } from '../utils/flowVerification.js';

// Total phase display duration: 1500ms display + 300ms fade out
const PHASE_DISPLAY_DURATION = 1800;
// Compound cross-fade: 1000ms stage1 + 300ms cross-fade + 1000ms stage2 + 300ms fade out
const COMPOUND_DISPLAY_DURATION = 2600;

class AnnouncementQueue {
  constructor() {
    this.queue = [];
    this.isPlayingAnimations = false;
    this.currentAnimation = null;
    this.listeners = new Map();
    this._held = true; // Start held — release() called when UI subscriber mounts
  }

  /**
   * Add a single announcement and auto-start playback.
   * @param {{ id: string, phaseName: string, phaseText: string, subtitle: string|null }} announcement
   */
  enqueue(announcement) {
    this.queue.push(announcement);
    debugLog('ANNOUNCE_TRACE', `📋 QUEUE: ${announcement.phaseName}`, {
      phaseText: announcement.phaseText,
      queueLength: this.queue.length,
      isPlaying: this.isPlayingAnimations,
    });
    this._tryPlay();
  }

  /**
   * Add a batch of announcements in order, then auto-start playback.
   * @param {Array} announcements
   */
  enqueueAll(announcements) {
    for (const a of announcements) {
      this.queue.push(a);
    }
    debugLog('ANNOUNCE_TRACE', `📋 QUEUE_BATCH: ${announcements.length} items`, {
      names: announcements.map(a => a.phaseName).join(' → '),
      queueLength: this.queue.length,
      isPlaying: this.isPlayingAnimations,
    });
    this._tryPlay();
  }

  isPlaying() {
    return this.isPlayingAnimations;
  }

  getCurrentAnimation() {
    return this.currentAnimation;
  }

  getQueueLength() {
    return this.queue.length;
  }

  clear() {
    debugLog('TIMING', '🗑️ [ANNOUNCEMENT QUEUE] Clearing queue', {
      clearedCount: this.queue.length,
    });
    this.queue = [];
    this.isPlayingAnimations = false;
    this.currentAnimation = null;
    this._held = true; // Re-hold on clear — next game must call release() after UI mounts
    this.emit('playbackStateChanged', false);
    // Note: Do NOT clear listeners — UI subscriptions persist across game resets.
  }

  /**
   * Hold the queue — announcements accumulate but don't play.
   * Called by App.jsx on unmount to prevent playback without a UI subscriber.
   */
  hold() {
    this._held = true;
  }

  /**
   * Release the queue — start playing any queued announcements.
   * Called by App.jsx on mount after registering event listeners.
   */
  release() {
    this._held = false;
    this._tryPlay();
  }

  onComplete(callback) {
    return this.on('complete', callback);
  }

  // --- Event emitter ---

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    };
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // --- Internal ---

  _tryPlay() {
    if (this._held || this.isPlayingAnimations || this.queue.length === 0) return;
    this.isPlayingAnimations = true;
    this.emit('playbackStateChanged', true);
    this._playNext();
  }

  async _playNext() {
    if (this.queue.length === 0) {
      timingLog('[ANNOUNCEMENT QUEUE] Playback complete');
      this.isPlayingAnimations = false;
      this.currentAnimation = null;
      this.emit('playbackStateChanged', false);
      this.emit('complete');
      return;
    }

    this.currentAnimation = this.queue.shift();
    flowCheckpoint('ANNOUNCEMENT_PLAYING', {
      name: this.currentAnimation.phaseName,
      text: this.currentAnimation.phaseText,
      remaining: this.queue.length,
    });

    debugLog('ANNOUNCE_TRACE', `🎬 PLAYING: ${this.currentAnimation.phaseName}`, {
      phaseText: this.currentAnimation.phaseText,
      subtitle: this.currentAnimation.subtitle || 'none',
      remaining: this.queue.length,
    });

    this.emit('animationStarted', this.currentAnimation);

    const duration = this.currentAnimation.compound ? COMPOUND_DISPLAY_DURATION : PHASE_DISPLAY_DURATION;
    await new Promise(resolve => setTimeout(resolve, duration));

    // SAFETY: If clear() was called during the await, abort gracefully
    if (!this.currentAnimation) {
      debugLog('ANNOUNCE_TRACE', '⚠️ ABORTED: clear() was called during playback');
      return;
    }

    this.emit('animationEnded', this.currentAnimation);
    this._playNext();
  }
}

export default AnnouncementQueue;
