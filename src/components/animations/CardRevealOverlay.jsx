// ========================================
// CARD REVEAL OVERLAY
// ========================================
// Displays a card reveal overlay when any card is played (AI or human)
// Shows "You Played" or "Opponent Played" with the card image
// Auto-dismisses after 1 second with phase-out animation

import React, { useState, useEffect } from 'react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * CardRevealOverlay - Shows card being played with player-aware label
 * @param {Object} card - Full card object to display
 * @param {string} label - "You Played" or "Opponent Played"
 * @param {Function} onComplete - Callback when animation completes
 */
const CardRevealOverlay = ({ card, label, onComplete }) => {
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
            text-4xl font-orbitron font-bold uppercase tracking-wider
            text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-red-400 to-purple-400
            animate-pulse
            drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]
            card-reveal-label
            ${isVisible ? 'card-reveal-label-show' : ''}
          `}
        >
          {label}
        </h2>

        {/* Card display with matrix phase-out effect */}
        <div
          className={`
            transform scale-110 card-reveal-card
            ${!isVisible ? 'card-reveal-dissolve' : ''}
          `}
        >
          <ActionCard card={card} isPlayable={false} />
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

export default CardRevealOverlay;
