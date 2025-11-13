// ========================================
// USE EXPLOSIONS HOOK
// ========================================
// Custom hook for managing explosion visual effects

import { useState, useCallback } from 'react';
import { getElementCenter } from '../utils/gameUtils.js';
import { debugLog } from '../utils/debugLogger.js';

/**
 * USE EXPLOSIONS HOOK
 * Manages explosion visual effects state and triggering logic.
 * Provides explosion state array and trigger function for visual feedback.
 * @param {Object} droneRefs - Ref object containing drone element references
 * @param {Object} gameAreaRef - Ref to the game area container element
 * @returns {Object} { explosions, triggerExplosion }
 */
export const useExplosions = (droneRefs, gameAreaRef) => {
  const [explosions, setExplosions] = useState([]);

  const triggerExplosion = useCallback((targetId, capturedPosition = null, size = 'large') => {
    debugLog('ANIMATIONS', '🔥 [EXPLOSION] triggerExplosion called:', { targetId, capturedPosition, size });

    // Create the explosion effect descriptor (inlined from gameLogic.js)
    const explosionEffect = {
      type: 'EXPLOSION',
      targetId,
      duration: 1000,
      timestamp: Date.now()
    };

    // Use captured position if provided, otherwise try to get from DOM
    let pos = capturedPosition;
    if (!pos) {
      const droneElement = droneRefs.current[targetId];
      debugLog('ANIMATIONS', '🔥 [EXPLOSION] Looking for drone element:', { targetId, found: !!droneElement });
      pos = getElementCenter(droneElement, gameAreaRef.current);
    }

    debugLog('ANIMATIONS', '🔥 [EXPLOSION] Position calculated:', pos);

    if (pos) {
      const explosionId = `${explosionEffect.timestamp}-${Math.random()}`;
      debugLog('ANIMATIONS', '🔥 [EXPLOSION] Adding explosion to state:', { explosionId, top: pos.y, left: pos.x, size });
      setExplosions(prev => [...prev, { id: explosionId, top: pos.y, left: pos.x, size }]);
      setTimeout(() => {
        setExplosions(prev => prev.filter(ex => ex.id !== explosionId));
      }, explosionEffect.duration);
    } else {
      console.warn('🔥 [EXPLOSION] No position found, explosion not triggered');
    }
  }, [droneRefs, gameAreaRef]);

  return {
    explosions,
    triggerExplosion
  };
};