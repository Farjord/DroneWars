// ========================================
// SOUND MANAGER
// ========================================
// Core audio engine using Web Audio API for precise timing
// Singleton pattern (matches ActionProcessor, TransitionManager)
// Handles autoplay unlock, preloading, and fire-and-forget playback

import { debugLog } from '../utils/debugLogger.js';

class SoundManager {
  static instance = null;

  static getInstance() {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  constructor() {
    if (SoundManager.instance) {
      return SoundManager.instance;
    }

    this.audioContext = null;
    this.masterGain = null;
    this.channelGains = {}; // sfx, ambient, music
    this.buffers = new Map(); // soundId → AudioBuffer
    this.activeSources = new Map(); // soundId → Set<AudioBufferSourceNode>
    this.isUnlocked = false;
    this.isPreloaded = false;
    this.manifest = null; // Set via setManifest()
    this._preloadPromise = null;
  }

  /**
   * Set the sound manifest (called before preload)
   * @param {Object} manifest - Map of soundId → { path, channel, volume }
   */
  setManifest(manifest) {
    this.manifest = manifest;
  }

  /**
   * Create AudioContext and gain node chain (idempotent)
   * @returns {boolean} True if context exists after call
   */
  _createAudioContext() {
    if (this.audioContext) return true;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // Create channel gains: sfx, ambient, music
      for (const channel of ['sfx', 'ambient', 'music']) {
        const gain = this.audioContext.createGain();
        gain.gain.value = 1.0;
        gain.connect(this.masterGain);
        this.channelGains[channel] = gain;
      }

      return true;
    } catch (error) {
      console.warn('[SoundManager] Failed to create AudioContext:', error.message);
      return false;
    }
  }

  /**
   * Preload all sounds during splash screen (no user gesture required)
   * Creates a suspended AudioContext, fetches and decodes all audio files
   * @param {Function} onProgress - Callback: { total, loaded, failed }
   * @returns {Promise<void>}
   */
  preloadOnly(onProgress) {
    // Guard against double-invocation (same pattern as AssetPreloader.loadAll)
    if (this._preloadPromise) return this._preloadPromise;

    this._preloadPromise = (async () => {
      if (!this.manifest) return;

      // Create suspended AudioContext (no user gesture needed for this)
      if (!this._createAudioContext()) return;

      const entries = Object.entries(this.manifest);
      if (entries.length === 0) return;

      debugLog('SOUND', '📦 Preloading sounds (suspended context)...', { count: entries.length });

      const CONCURRENCY = 4;
      let index = 0;
      let loaded = 0;
      let failed = 0;
      const total = entries.length;

      onProgress?.({ total, loaded, failed });

      const loadNext = async () => {
        while (index < entries.length) {
          const currentIndex = index++;
          const [soundId, config] = entries[currentIndex];

          try {
            const response = await fetch(config.path);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.buffers.set(soundId, audioBuffer);
            loaded++;
          } catch (error) {
            failed++;
            debugLog('SOUND', `⚠️ Failed to load: ${soundId}`, { path: config.path, error: error.message });
          }

          onProgress?.({ total, loaded, failed });
        }
      };

      // Run concurrent loaders
      const workers = [];
      for (let i = 0; i < Math.min(CONCURRENCY, entries.length); i++) {
        workers.push(loadNext());
      }
      await Promise.all(workers);

      this.isPreloaded = true;
      debugLog('SOUND', '✅ Preload complete (suspended context)', { loaded, failed, total });
    })();

    return this._preloadPromise;
  }

  /**
   * Unlock audio context - must be called from user gesture (click/touch/keydown)
   * If preloadOnly() was used, just resumes the existing suspended context
   */
  async unlock() {
    if (this.isUnlocked) return;

    try {
      // Create context if preloadOnly() wasn't called (fallback path)
      if (!this._createAudioContext()) return;

      // Resume if suspended (autoplay policy — requires user gesture)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isUnlocked = true;
      debugLog('SOUND', '🔊 AudioContext unlocked', { state: this.audioContext.state });

      // Start preloading if not already done by preloadOnly()
      if (!this.isPreloaded) {
        this.preload();
      }
    } catch (error) {
      console.warn('[SoundManager] Failed to unlock AudioContext:', error.message);
    }
  }

  /**
   * Preload all sounds from manifest (post-unlock fallback path)
   * Fetches MP3s and decodes to AudioBuffers with concurrency limit
   */
  async preload() {
    if (!this.audioContext || !this.manifest || this.isPreloaded) return;

    const entries = Object.entries(this.manifest);
    if (entries.length === 0) return;

    debugLog('SOUND', '📦 Preloading sounds...', { count: entries.length });

    const CONCURRENCY = 4;
    let index = 0;
    let loaded = 0;
    let failed = 0;

    const loadNext = async () => {
      while (index < entries.length) {
        const currentIndex = index++;
        const [soundId, config] = entries[currentIndex];

        try {
          const response = await fetch(config.path);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          this.buffers.set(soundId, audioBuffer);
          loaded++;
        } catch (error) {
          failed++;
          debugLog('SOUND', `⚠️ Failed to load: ${soundId}`, { path: config.path, error: error.message });
        }
      }
    };

    // Run concurrent loaders
    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY, entries.length); i++) {
      workers.push(loadNext());
    }
    await Promise.all(workers);

    this.isPreloaded = true;
    debugLog('SOUND', '✅ Preload complete', { loaded, failed, total: entries.length });
  }

  /**
   * Play a sound by ID - fire-and-forget, non-blocking
   * @param {string} soundId - Sound identifier from manifest
   * @param {Object} options - Playback options
   * @param {string} options.channel - 'sfx' | 'ambient' | 'music' (default: 'sfx')
   * @param {number} options.delay - Delay in ms before playing (sample-accurate)
   * @param {number} options.volume - Per-play volume multiplier 0-1 (default: 1)
   * @param {number} options.playbackRate - Speed multiplier (default: 1)
   * @param {boolean} options.loop - Whether to loop (default: false)
   */
  play(soundId, options = {}) {
    // Skip if not unlocked or tab hidden
    if (!this.isUnlocked || !this.audioContext) return;
    if (document.hidden) return;

    const buffer = this.buffers.get(soundId);
    if (!buffer) return; // Silent failure for missing/unloaded sounds

    const {
      channel = 'sfx',
      delay = 0,
      volume = 1,
      playbackRate = 1,
      loop = false
    } = options;

    // Look up default volume from manifest
    const manifestEntry = this.manifest?.[soundId];
    const defaultVolume = manifestEntry?.volume ?? 1;

    try {
      // Create source node (Web Audio creates new node per play - intended pattern)
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.loop = loop;

      // Create per-play gain node: source → playGain → channelGain → masterGain → destination
      const playGain = this.audioContext.createGain();
      playGain.gain.value = volume * defaultVolume;

      source.connect(playGain);
      playGain.connect(this.channelGains[channel] || this.channelGains.sfx);

      // Track active source for stop()
      if (!this.activeSources.has(soundId)) {
        this.activeSources.set(soundId, new Set());
      }
      this.activeSources.get(soundId).add(source);

      // Cleanup on end
      source.onended = () => {
        const sources = this.activeSources.get(soundId);
        if (sources) {
          sources.delete(source);
          if (sources.size === 0) {
            this.activeSources.delete(soundId);
          }
        }
      };

      // Schedule playback (sample-accurate timing)
      const startTime = this.audioContext.currentTime + (delay / 1000);
      source.start(startTime);

      debugLog('SOUND', `▶️ ${soundId}`, { channel, delay, volume: volume * defaultVolume });
    } catch (error) {
      // Silent failure - never block game logic
      debugLog('SOUND', `⚠️ Play failed: ${soundId}`, { error: error.message });
    }
  }

  /**
   * Stop a playing sound with optional fade out
   * @param {string} soundId - Sound to stop
   * @param {number} fadeOutMs - Fade out duration in ms (default: 0 = immediate)
   */
  stop(soundId, fadeOutMs = 0) {
    const sources = this.activeSources.get(soundId);
    if (!sources || sources.size === 0) return;

    sources.forEach(source => {
      try {
        if (fadeOutMs > 0 && source.context) {
          // Fade out via the connected gain node
          // Note: We can't easily access the per-play gain node here,
          // so we just stop after the fade duration
          const stopTime = this.audioContext.currentTime + (fadeOutMs / 1000);
          source.stop(stopTime);
        } else {
          source.stop();
        }
      } catch (error) {
        // Source may already be stopped
      }
    });

    this.activeSources.delete(soundId);
  }

  /**
   * Set volume for a channel
   * @param {string} channel - 'sfx' | 'ambient' | 'music' | 'master'
   * @param {number} value - Volume 0-1
   */
  setVolume(channel, value) {
    const clampedValue = Math.max(0, Math.min(1, value));

    if (channel === 'master' && this.masterGain) {
      this.masterGain.gain.value = clampedValue;
    } else if (this.channelGains[channel]) {
      this.channelGains[channel].gain.value = clampedValue;
    }
  }

  /**
   * Clean up all resources
   */
  dispose() {
    // Stop all active sources
    this.activeSources.forEach((sources) => {
      sources.forEach(source => {
        try { source.stop(); } catch (e) { /* already stopped */ }
      });
    });
    this.activeSources.clear();
    this.buffers.clear();

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }

    this.audioContext = null;
    this.masterGain = null;
    this.channelGains = {};
    this.isUnlocked = false;
    this.isPreloaded = false;
    this._preloadPromise = null;

    SoundManager.instance = null;

    debugLog('SOUND', '🔇 SoundManager disposed');
  }
}

export default SoundManager;
