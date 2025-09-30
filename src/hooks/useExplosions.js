// ========================================
// USE EXPLOSIONS HOOK
// ========================================
// Custom hook for managing explosion visual effects

import { useState, useCallback } from 'react';
import { gameEngine } from '../logic/gameLogic.js';
import { getElementCenter } from '../utils/gameUtils.js';

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

  const triggerExplosion = useCallback((targetId, capturedPosition = null) => {
    // Create the explosion effect using the pure function
    const explosionEffect = gameEngine.createExplosionEffect(targetId);

    // Use captured position if provided, otherwise try to get from DOM
    let pos = capturedPosition;
    if (!pos) {
      const droneElement = droneRefs.current[targetId];
      pos = getElementCenter(droneElement, gameAreaRef.current);
    }

    if (pos) {
      const explosionId = `${explosionEffect.timestamp}-${Math.random()}`;
      setExplosions(prev => [...prev, { id: explosionId, top: pos.y, left: pos.x }]);
      setTimeout(() => {
        setExplosions(prev => prev.filter(ex => ex.id !== explosionId));
      }, explosionEffect.duration);
    }
  }, [droneRefs, gameAreaRef]);

  return {
    explosions,
    triggerExplosion
  };
};