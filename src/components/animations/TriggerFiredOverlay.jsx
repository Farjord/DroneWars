// ========================================
// TRIGGER FIRED NOTIFICATION OVERLAY
// ========================================
// Compact banner announcing a triggered ability activation
// Amber/orange accent — positioned in upper screen area
// ~400ms display + 100ms fade-out = 500ms total

import React, { useState, useEffect } from 'react';

/**
 * TriggerFiredOverlay - Compact trigger announcement banner
 * @param {string} droneName - Name of the drone whose trigger activated
 * @param {string} abilityName - Name of the triggered ability
 * @param {Function} onComplete - Callback when animation completes
 */
const TriggerFiredOverlay = ({ droneName, abilityName, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in immediately
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss after 400ms display
    const displayTimer = setTimeout(() => {
      setIsVisible(false);

      // Wait for fade-out to complete before cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, 100); // 100ms fade-out

      return () => clearTimeout(cleanupTimer);
    }, 400);

    return () => clearTimeout(displayTimer);
  }, [onComplete]);

  return (
    <div
      className="fixed top-[15%] left-1/2 z-[10000] pointer-events-none"
      style={{
        transform: 'translateX(-50%)',
        transition: 'opacity 100ms ease-out',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div
        className="flex items-center gap-3 px-6 py-3 rounded-lg border border-amber-500/60"
        style={{
          background: 'linear-gradient(135deg, rgba(30,20,10,0.92) 0%, rgba(50,30,10,0.92) 100%)',
          boxShadow: '0 0 20px rgba(245,158,11,0.3), 0 0 40px rgba(245,158,11,0.1), inset 0 1px 0 rgba(245,158,11,0.2)',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 100ms ease-out'
        }}
      >
        {/* Trigger icon */}
        <span
          className="text-amber-400 text-lg"
          style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' }}
        >
          &#9889;
        </span>

        {/* Drone name */}
        <span
          className="font-orbitron font-bold text-sm uppercase tracking-wider text-amber-300"
          style={{ textShadow: '0 0 8px rgba(245,158,11,0.4)' }}
        >
          {droneName}
        </span>

        {/* Separator */}
        <span className="text-amber-600/60 text-xs">&mdash;</span>

        {/* Ability name */}
        <span
          className="font-orbitron text-sm tracking-wide text-amber-100/90"
          style={{ textShadow: '0 0 6px rgba(245,158,11,0.2)' }}
        >
          {abilityName}
        </span>
      </div>
    </div>
  );
};

export default TriggerFiredOverlay;
