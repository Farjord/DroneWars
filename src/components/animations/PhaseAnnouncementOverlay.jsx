// ========================================
// PHASE ANNOUNCEMENT OVERLAY
// ========================================
// Displays a full-screen phase announcement when transitioning between game phases
// Shows phase name with Drone Wars gradient styling and shine effect
// Auto-dismisses after 1.5 seconds

import React, { useState, useEffect } from 'react';

/**
 * PhaseAnnouncementOverlay - Shows phase name during phase transitions
 * @param {string} phaseText - The text to display (e.g., "DEPLOYMENT PHASE")
 * @param {string} subtitle - Optional subtitle text (e.g., "You Go First")
 * @param {Function} onComplete - Callback when animation completes
 */
const PhaseAnnouncementOverlay = ({ phaseText, subtitle, onComplete }) => {
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
          relative flex flex-col items-center
          transition-all duration-300 transform
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'}
        `}
      >
        {/* Phase text with gradient and glow */}
        <h1
          className={`
            text-6xl font-orbitron font-black uppercase tracking-widest text-center
            phase-announcement-text
            ${isVisible ? 'phase-announcement-shine' : ''}
          `}
          style={{
            background: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 136, 255, 0.3)',
            filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.4))'
          }}
        >
          {phaseText}
        </h1>

        {/* Optional subtitle (for deployment/action phases showing who goes first) */}
        {subtitle && (
          <p
            className={`
              text-2xl font-orbitron font-medium uppercase tracking-wider text-center
              text-cyan-300/80 mt-4
              transition-all duration-300
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
          >
            {subtitle}
          </p>
        )}

        {/* Decorative line beneath text */}
        <div
          className={`
            mt-8 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent
            transition-all duration-500
            ${isVisible ? 'w-96 opacity-100' : 'w-0 opacity-0'}
          `}
        />

        {/* Scan line effect */}
        <div
          className={`
            absolute inset-0 pointer-events-none overflow-hidden
          `}
        >
          <div
            className={`
              absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent
              phase-announcement-scanline
              ${isVisible ? 'phase-announcement-scanline-active' : ''}
            `}
          />
        </div>
      </div>
    </div>
  );
};

export default PhaseAnnouncementOverlay;
