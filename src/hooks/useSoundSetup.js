// ========================================
// USE SOUND SETUP HOOK
// ========================================
// Initializes the sound system and handles autoplay unlock
// Follows the useAnimationSetup pattern

import { useEffect } from 'react';
import SoundManager from '../managers/SoundManager.js';
import SoundEventBridge from '../managers/SoundEventBridge.js';
import combatStateManager from '../managers/CombatStateManager.js';
import { SOUND_MANIFEST } from '../config/soundConfig.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * Hook to initialize the sound system
 * - Attaches one-time user gesture listeners for autoplay unlock
 * - Creates SoundEventBridge and connects to game managers
 * - Cleanup: removes DOM listeners, disconnects bridge
 *
 * @param {Object} gameStateManager - GameStateManager instance
 * @param {Object} phaseAnimationQueue - PhaseAnimationQueue instance
 */
export function useSoundSetup(gameStateManager, phaseAnimationQueue) {
  useEffect(() => {
    const soundManager = SoundManager.getInstance();
    const bridge = new SoundEventBridge();

    // Set manifest for preloading
    soundManager.setManifest(SOUND_MANIFEST);

    // Autoplay unlock handler - called on first user interaction
    let unlocked = false;
    const handleUnlock = () => {
      if (unlocked) return;
      unlocked = true;

      debugLog('SOUND', '🔓 User gesture detected, unlocking audio...');
      soundManager.unlock();

      // Remove listeners after first unlock
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
      document.removeEventListener('keydown', handleUnlock);
    };

    // Attach unlock listeners
    document.addEventListener('click', handleUnlock);
    document.addEventListener('touchstart', handleUnlock);
    document.addEventListener('keydown', handleUnlock);

    // Global button click sound via capture-phase delegation
    const handleButtonClick = (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      if (button.disabled) return;
      if (button.dataset.noClickSound !== undefined) return;
      soundManager.play('ui_click');
    };
    document.addEventListener('click', handleButtonClick, true);

    // Connect bridge to game managers
    const actionProcessor = gameStateManager?.actionProcessor || null;
    bridge.connect({
      phaseAnimationQueue,
      actionProcessor,
      combatStateManager,
      gameStateManager,
    });

    debugLog('SOUND', '🎵 Sound system initialized');

    // Cleanup
    return () => {
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
      document.removeEventListener('keydown', handleUnlock);
      document.removeEventListener('click', handleButtonClick, true);
      bridge.disconnect();
      debugLog('SOUND', '🎵 Sound system cleaned up');
    };
  }, [gameStateManager, phaseAnimationQueue]);
}
