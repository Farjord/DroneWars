// ========================================
// MUSIC MANAGER
// ========================================
// Manages looping background music with crossfading between zones.
// Peer to SoundManager — reuses its audioContext, buffers, and music channel gain.

import SoundManager from './SoundManager.js';
import { SCREEN_TO_ZONE, ZONE_TO_TRACK, MUSIC_CROSSFADE_MS } from '../config/soundConfig.js';
import { debugLog } from '../utils/debugLogger.js';

class MusicManager {
  static instance = null;

  static getInstance() {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  constructor() {
    if (MusicManager.instance) {
      return MusicManager.instance;
    }

    this.activeSlot = null;    // { source, gain } currently playing
    this.fadingOutSlot = null;  // { source, gain } being faded out
    this.currentZone = null;
    this.currentTrack = null;
    this.override = null;       // Override zone (deploying/victory/defeat)
    this.screenZone = null;     // Zone derived from appState (preserved during override)
  }

  /**
   * Called when appState changes. Maps to a zone and transitions if needed.
   * @param {string} appState - Current appState value
   */
  setScreen(appState) {
    const zone = SCREEN_TO_ZONE[appState] || null;
    this.screenZone = zone;

    // If an override is active, don't change music based on screen
    if (this.override) {
      debugLog('MUSIC', `Screen → ${appState} (zone: ${zone}), override active: ${this.override}`);
      return;
    }

    if (zone) {
      this._transitionToZone(zone);
    }
  }

  /**
   * Force a music zone override (for transition screens like deploying/victory/defeat).
   * @param {string} zoneId - Zone to override to
   */
  setOverride(zoneId) {
    this.override = zoneId;
    debugLog('MUSIC', `Override set: ${zoneId}`);
    this._transitionToZone(zoneId);
  }

  /**
   * Clear the override, reverting to the current screen's zone.
   */
  clearOverride() {
    const previousOverride = this.override;
    this.override = null;
    debugLog('MUSIC', `Override cleared (was: ${previousOverride})`);

    // Revert to the screen-based zone
    if (this.screenZone) {
      this._transitionToZone(this.screenZone);
    }
  }

  /**
   * Core crossfade logic. Transitions to a new zone's track.
   * @param {string} zone - Target zone
   */
  _transitionToZone(zone) {
    const trackId = ZONE_TO_TRACK[zone];
    if (!trackId) {
      debugLog('MUSIC', `No track for zone: ${zone}`);
      return;
    }

    // Same track already playing — no-op
    if (trackId === this.currentTrack) {
      debugLog('MUSIC', `Already playing ${trackId}, no transition needed`);
      return;
    }

    const soundManager = SoundManager.getInstance();

    // If audio not unlocked yet, record zone for deferred start
    if (!soundManager.isUnlocked || !soundManager.audioContext) {
      this.currentZone = zone;
      this.currentTrack = null;
      debugLog('MUSIC', `Audio not unlocked, deferring zone: ${zone}`);
      return;
    }

    const buffer = soundManager.buffers.get(trackId);
    if (!buffer) {
      debugLog('MUSIC', `Buffer not loaded for ${trackId}, deferring`);
      this.currentZone = zone;
      this.currentTrack = null;
      return;
    }

    const ctx = soundManager.audioContext;
    const fadeSeconds = MUSIC_CROSSFADE_MS / 1000;
    const now = ctx.currentTime;

    // Fade out current active slot
    if (this.activeSlot) {
      // If there's already something fading out, kill it immediately
      if (this.fadingOutSlot) {
        this._killSlot(this.fadingOutSlot);
      }

      this.fadingOutSlot = this.activeSlot;
      this.activeSlot = null;

      try {
        this.fadingOutSlot.gain.gain.cancelScheduledValues(now);
        this.fadingOutSlot.gain.gain.setValueAtTime(this.fadingOutSlot.gain.gain.value, now);
        this.fadingOutSlot.gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);

        // Schedule stop after fade completes
        const fadingSlot = this.fadingOutSlot;
        setTimeout(() => {
          this._killSlot(fadingSlot);
          if (this.fadingOutSlot === fadingSlot) {
            this.fadingOutSlot = null;
          }
        }, MUSIC_CROSSFADE_MS + 100);
      } catch (e) {
        this._killSlot(this.fadingOutSlot);
        this.fadingOutSlot = null;
      }
    }

    // Create new source and fade in
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Look up the manifest volume for this track
      const manifestVolume = soundManager.manifest?.[trackId]?.volume ?? 0.35;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(manifestVolume, now + fadeSeconds);

      source.connect(gain);
      gain.connect(soundManager.channelGains.music);

      source.start(0);

      this.activeSlot = { source, gain };
      this.currentZone = zone;
      this.currentTrack = trackId;

      debugLog('MUSIC', `Crossfading to ${trackId} (zone: ${zone})`, { fadeMs: MUSIC_CROSSFADE_MS });
    } catch (e) {
      debugLog('MUSIC', `Failed to start ${trackId}: ${e.message}`);
      this.currentTrack = null;
    }
  }

  /**
   * Immediately kill a slot (stop source, disconnect)
   */
  _killSlot(slot) {
    if (!slot) return;
    try {
      slot.source.stop();
    } catch (e) { /* already stopped */ }
    try {
      slot.source.disconnect();
      slot.gain.disconnect();
    } catch (e) { /* already disconnected */ }
  }

  /**
   * Stop all music and reset state. Called on cleanup.
   */
  stop() {
    this._killSlot(this.activeSlot);
    this._killSlot(this.fadingOutSlot);
    this.activeSlot = null;
    this.fadingOutSlot = null;
    this.currentZone = null;
    this.currentTrack = null;
    this.override = null;
    this.screenZone = null;
    debugLog('MUSIC', 'MusicManager stopped');
  }
}

export default MusicManager;
