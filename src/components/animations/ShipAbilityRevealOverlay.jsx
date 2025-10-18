// ========================================
// SHIP ABILITY REVEAL OVERLAY
// ========================================
// Displays an overlay when opponent uses a ship ability
// Shows "Opponent Used [Ability Name]"
// Auto-dismisses after 1 second with fade animation

import React, { useState, useEffect } from 'react';

/**
 * ShipAbilityRevealOverlay - Shows opponent ship ability usage
 * @param {string} abilityName - Name of the ability used
 * @param {string} label - "Opponent Used" or similar
 * @param {Function} onComplete - Callback when animation completes
 */
const ShipAbilityRevealOverlay = ({ abilityName, label, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in immediately
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss after 1 second
    const displayTimer = setTimeout(() => {
      setIsVisible(false);

      // Wait for fade-out animation to complete before cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, 300); // Match CSS transition duration

      return () => clearTimeout(cleanupTimer);
    }, 1000);

    return () => clearTimeout(displayTimer);
  }, [onComplete]);

  return (
    <div
      className={`
        fixed inset-0 z-[10000] flex items-center justify-center
        transition-all duration-300 pointer-events-none
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Semi-transparent background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Content container */}
      <div
        className={`
          relative flex flex-col items-center gap-6
          transition-all duration-300 transform
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'}
        `}
      >
        {/* Label with glowing effect */}
        <h2
          className={`
            text-5xl font-orbitron font-bold uppercase tracking-wider
            text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400
            animate-pulse
            drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]
          `}
        >
          {label}
        </h2>

        {/* Ability name with glowing effect */}
        <p
          className={`
            text-6xl font-orbitron font-bold uppercase tracking-wider
            text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400
            drop-shadow-[0_0_30px_rgba(34,211,238,0.9)]
            transition-all duration-300
            ${isVisible ? 'scale-100' : 'scale-90'}
          `}
        >
          {abilityName}
        </p>

        {/* Digital scan line effect */}
        <div
          className={`
            absolute inset-0 pointer-events-none
            bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent
            transition-all duration-1000
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}
          `}
        />
      </div>
    </div>
  );
};

export default ShipAbilityRevealOverlay;
