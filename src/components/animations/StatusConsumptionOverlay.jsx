// ========================================
// STATUS CONSUMPTION OVERLAY
// ========================================
// Displays a notification overlay when a snare or suppression status is consumed
// Shows "You Removed..." or "Opponent Removed..." styled like CardRevealOverlay
// Auto-dismisses after 1 second with fade-out animation

import React, { useState, useEffect } from 'react';

/**
 * StatusConsumptionOverlay - Shows status effect consumption with player-aware label
 * @param {string} label - "You Removed Snare Effect From X in Lane Y" or "Opponent Removed..."
 * @param {string} droneName - Name of the affected drone
 * @param {string} statusType - 'snared' or 'suppressed'
 * @param {Function} onComplete - Callback when animation completes
 */
const StatusConsumptionOverlay = ({ label, droneName, statusType, onComplete }) => {
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

  const isSnared = statusType === 'snared';
  const gradientColors = isSnared
    ? 'from-green-400 via-emerald-400 to-green-400'
    : 'from-orange-400 via-amber-400 to-orange-400';
  const glowColor = isSnared
    ? 'rgba(52,211,153,0.8)'
    : 'rgba(251,146,60,0.8)';
  const iconBorderColor = isSnared
    ? 'border-green-400/60'
    : 'border-orange-400/60';
  const iconGlow = isSnared
    ? '0 0 30px rgba(52,211,153,0.4)'
    : '0 0 30px rgba(251,146,60,0.4)';
  const statusLabel = isSnared ? 'SNARE' : 'SUPPRESSION';
  const statusIcon = isSnared ? '\u26D3' : '\u26A0'; // chain / warning

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
            text-3xl font-orbitron font-bold uppercase tracking-wider
            text-transparent bg-clip-text bg-gradient-to-r ${gradientColors}
            animate-pulse
            card-reveal-label
            ${isVisible ? 'card-reveal-label-show' : ''}
          `}
          style={{ filter: `drop-shadow(0 0 20px ${glowColor})` }}
        >
          {label}
        </h2>

        {/* Status icon display (replaces card image) */}
        <div
          className={`
            transform scale-110
            flex flex-col items-center justify-center
            w-48 h-32 rounded-lg
            bg-gray-900/80 border-2 ${iconBorderColor}
            ${!isVisible ? 'card-reveal-dissolve' : ''}
          `}
          style={{ boxShadow: iconGlow }}
        >
          <span className="text-5xl mb-2">{statusIcon}</span>
          <span
            className={`
              text-lg font-orbitron font-bold uppercase tracking-wider
              text-transparent bg-clip-text bg-gradient-to-r ${gradientColors}
            `}
          >
            {statusLabel}
          </span>
        </div>

        {/* Digital scan line effect */}
        <div
          className={`
            absolute inset-0 pointer-events-none
            bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent
            card-reveal-scanline
            ${isVisible ? 'card-reveal-scanline-active' : ''}
          `}
        />
      </div>
    </div>
  );
};

export default StatusConsumptionOverlay;
