// ========================================
// CARD WARNING OVERLAY
// ========================================
// Displays a warning overlay when a player attempts to play an unplayable card
// Shows specific reasons why the card cannot be played
// Auto-dismisses after 1.5 seconds with fade-out animation

import React, { useState, useEffect } from 'react';

/**
 * CardWarningOverlay - Shows reasons why a card cannot be played
 * @param {string[]} reasons - Array of reason strings to display
 * @param {Function} onComplete - Callback when animation completes
 */
const CardWarningOverlay = ({ reasons, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in immediately
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss after 1.5 seconds
    const displayTimer = setTimeout(() => {
      setIsVisible(false);

      // Wait for fade-out animation to complete before cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, 300); // Match CSS transition duration

      return () => clearTimeout(cleanupTimer);
    }, 1500);

    return () => clearTimeout(displayTimer);
  }, [onComplete]);

  if (!reasons || reasons.length === 0) return null;

  return (
    <div
      className={`
        fixed inset-0 z-[10000] flex items-center justify-center
        transition-all duration-300 pointer-events-none
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Semi-transparent background */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content container */}
      <div
        className={`
          relative flex flex-col items-center gap-3
          transition-all duration-300 transform
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'}
        `}
      >
        {/* Warning title */}
        <h2
          className="
            text-2xl font-orbitron font-bold uppercase tracking-wider
            text-amber-400
            drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]
          "
        >
          Cannot Play Card
        </h2>

        {/* Reason list - vertically stacked */}
        <div className="flex flex-col items-center gap-2">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="
                flex items-center gap-2
                px-4 py-1.5 rounded
                bg-amber-900/40 border border-amber-500/30
              "
            >
              <span className="text-amber-300 text-sm font-bold">!</span>
              <span className="text-amber-100 text-sm font-medium font-orbitron tracking-wide">
                {reason}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CardWarningOverlay;
