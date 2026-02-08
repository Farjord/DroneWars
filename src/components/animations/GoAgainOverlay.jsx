// ========================================
// GO AGAIN NOTIFICATION OVERLAY
// ========================================
// Displays a notification overlay when a goAgain card or attack resolves
// Shows "Go Again" (cyan) for local player, "Opponent Goes Again" (red) for opponent
// Auto-dismisses after 800ms with fade-out animation

import React, { useState, useEffect } from 'react';

/**
 * GoAgainOverlay - Shows go again notification with player-aware styling
 * @param {string} label - "Go Again" or "Opponent Goes Again"
 * @param {boolean} isLocalPlayer - true for cyan styling, false for red styling
 * @param {Function} onComplete - Callback when animation completes
 */
const GoAgainOverlay = ({ label, isLocalPlayer, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in immediately
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss after 800ms
    const displayTimer = setTimeout(() => {
      setIsVisible(false);

      // Wait for fade-out animation to complete before cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, 300); // Match CSS transition duration

      return () => clearTimeout(cleanupTimer);
    }, 800);

    return () => clearTimeout(displayTimer);
  }, [onComplete]);

  // Cyan styling for local player, red for opponent
  const gradientClass = isLocalPlayer
    ? 'from-cyan-300 via-cyan-400 to-cyan-300'
    : 'from-red-300 via-red-400 to-red-300';

  const glowColor = isLocalPlayer
    ? 'rgba(6,182,212,0.8)'
    : 'rgba(239,68,68,0.8)';

  const glowColorFaded = isLocalPlayer
    ? 'rgba(6,182,212,0.4)'
    : 'rgba(239,68,68,0.4)';

  const scanLineStyle = {
    background: `linear-gradient(to right, ${glowColor.replace('0.8', '0')} 0%, ${glowColor} 50%, ${glowColor.replace('0.8', '0')} 100%)`,
    boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColorFaded}`,
    transform: 'translateY(-50%)'
  };

  return (
    <div
      className={`
        fixed inset-0 z-[10000] flex items-center justify-center
        transition-all duration-300 pointer-events-none
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Lighter semi-transparent background */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

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
            text-transparent bg-clip-text bg-gradient-to-r ${gradientClass}
            animate-pulse
          `}
          style={{
            filter: `drop-shadow(0 0 20px ${glowColor})`
          }}
        >
          {label}
        </h2>

        {/* Horizontal scan line effect */}
        <div
          className={`
            absolute top-1/2 left-0 w-full h-1 pointer-events-none
            ${isVisible ? 'animate-goAgainScan' : ''}
          `}
          style={scanLineStyle}
        />
      </div>

      {/* Inline keyframes for scan animation */}
      <style>{`
        @keyframes goAgainScan {
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

        .animate-goAgainScan {
          animation: goAgainScan 800ms ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default GoAgainOverlay;
