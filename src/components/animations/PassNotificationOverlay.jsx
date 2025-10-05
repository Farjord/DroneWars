// ========================================
// PASS NOTIFICATION OVERLAY
// ========================================
// Displays a notification overlay when a player passes during their turn
// Shows "You Passed" or "Opponent Passed" based on player perspective
// Auto-dismisses after 1 second with fade-out animation

import React, { useState, useEffect } from 'react';

/**
 * PassNotificationOverlay - Shows pass notification with player-aware label
 * @param {string} label - "You Passed" or "Opponent Passed"
 * @param {Function} onComplete - Callback when animation completes
 */
const PassNotificationOverlay = ({ label, onComplete }) => {
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
        {/* Label with glowing effect - red styling matching pass button */}
        <h2
          className={`
            text-5xl font-orbitron font-bold uppercase tracking-wider
            text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-300
            animate-pulse
            drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]
          `}
        >
          {label}
        </h2>

        {/* Horizontal scan line effect */}
        <div
          className={`
            absolute top-1/2 left-0 w-full h-1 pointer-events-none
            ${isVisible ? 'animate-horizontalScan' : ''}
          `}
          style={{
            background: 'linear-gradient(to right, rgba(239, 68, 68, 0) 0%, rgba(239, 68, 68, 0.8) 50%, rgba(239, 68, 68, 0) 100%)',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.4)',
            transform: 'translateY(-50%)'
          }}
        />
      </div>

      {/* Inline keyframes for horizontal scan animation */}
      <style>{`
        @keyframes horizontalScan {
          0% {
            transform: translateX(-100%) translateY(-50%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%) translateY(-50%);
            opacity: 0;
          }
        }

        .animate-horizontalScan {
          animation: horizontalScan 800ms ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default PassNotificationOverlay;
