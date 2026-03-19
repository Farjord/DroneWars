// ========================================
// MOVEMENT BLOCKED NOTIFICATION OVERLAY
// ========================================
// Compact banner announcing a blocked movement (lane full)
// Red/crimson accent — positioned over the blocked drone
// ~800ms display + 200ms fade-in/out = 1200ms total budget

import React, { useState, useEffect } from 'react';

/**
 * MovementBlockedOverlay - Compact movement blocked banner
 * @param {string} droneName - Name of the drone that couldn't move
 * @param {string} message - Reason text (e.g. "Movement Blocked")
 * @param {{ x: number, y: number }|null} position - Drone screen position, or null for center fallback
 * @param {Function} onComplete - Callback when animation completes
 */
const MovementBlockedOverlay = ({ droneName, message, position, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const displayTimer = setTimeout(() => {
      setIsVisible(false);

      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, 200);

      return () => clearTimeout(cleanupTimer);
    }, 800);

    return () => clearTimeout(displayTimer);
  }, [onComplete]);

  const positionStyles = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -110%)',
      }
    : {
        position: 'fixed',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
      };

  return (
    <div
      className="z-[10000] pointer-events-none"
      style={{
        ...positionStyles,
        transition: 'opacity 200ms ease-out',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div
        className="flex items-center gap-3 px-6 py-3 rounded-lg border border-red-500/60"
        style={{
          background: 'linear-gradient(135deg, rgba(30,10,10,0.92) 0%, rgba(50,10,10,0.92) 100%)',
          boxShadow: '0 0 20px rgba(239,68,68,0.3), 0 0 40px rgba(239,68,68,0.1), inset 0 1px 0 rgba(239,68,68,0.2)',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 200ms ease-out'
        }}
      >
        {/* Blocked icon */}
        <span
          className="text-red-400 text-lg"
          style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))' }}
        >
          &#10005;
        </span>

        {/* Drone name */}
        <span
          className="font-orbitron font-bold text-sm uppercase tracking-wider text-red-300"
          style={{ textShadow: '0 0 8px rgba(239,68,68,0.4)' }}
        >
          {droneName}
        </span>

        {/* Separator */}
        <span className="text-red-600/60 text-xs">&mdash;</span>

        {/* Message */}
        <span
          className="font-orbitron text-sm tracking-wide text-red-100/90"
          style={{ textShadow: '0 0 6px rgba(239,68,68,0.2)' }}
        >
          {message}
        </span>
      </div>
    </div>
  );
};

export default MovementBlockedOverlay;
