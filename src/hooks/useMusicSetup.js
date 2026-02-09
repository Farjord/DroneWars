// ========================================
// USE MUSIC SETUP HOOK
// ========================================
// Drives MusicManager from appState changes.
// Handles deferred start when audio is not yet unlocked.

import { useEffect, useRef } from 'react';
import MusicManager from '../managers/MusicManager.js';
import SoundManager from '../managers/SoundManager.js';

/**
 * Hook to drive background music based on appState.
 * Call from AppRouter after useSoundSetup.
 *
 * @param {string} appState - Current gameState.appState value
 */
export function useMusicSetup(appState) {
  const musicManager = MusicManager.getInstance();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    musicManager.setScreen(appState);

    // Handle deferred start (setScreen called before audio unlocked)
    if (!hasStartedRef.current) {
      const soundManager = SoundManager.getInstance();
      if (soundManager.isUnlocked) {
        hasStartedRef.current = true;
      } else {
        // Poll until unlocked, then re-call setScreen to start music
        const interval = setInterval(() => {
          const sm = SoundManager.getInstance();
          if (sm.isUnlocked) {
            hasStartedRef.current = true;
            musicManager.setScreen(appState);
            clearInterval(interval);
          }
        }, 500);
        return () => clearInterval(interval);
      }
    }
  }, [appState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => musicManager.stop();
  }, []);
}
