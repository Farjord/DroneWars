// ========================================
// DISCARD ANNOUNCEMENT OVERLAY
// ========================================
// Displays a full-screen shatter-card overlay when cards are discarded.
// Cards split into 6 CSS clip-path polygon shards that fly apart.
// Timing: appear 300ms, shatter 600ms, hold 500ms, fade 300ms = 1700ms total

import React, { useState, useEffect } from 'react';
import './revealOverlay.css';

/**
 * DiscardAnnouncementOverlay - Shows discarded cards with shattering animation
 * @param {Array} cards - Array of card objects that were discarded
 * @param {string} discardingPlayerId - 'player1' or 'player2'
 * @param {Function} onComplete - Callback when animation completes
 */
const DiscardAnnouncementOverlay = ({ cards, discardingPlayerId, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isShattered, setIsShattered] = useState(false);

  useEffect(() => {
    // Trigger fade-in immediately
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Start shattering after 300ms
    const shatterTimer = setTimeout(() => {
      setIsShattered(true);
    }, 300);

    // Auto-dismiss after 1700ms total
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);

      // Wait for fade-out animation to complete before cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, 300); // Match CSS transition duration

      return () => clearTimeout(cleanupTimer);
    }, 1700);

    return () => {
      clearTimeout(shatterTimer);
      clearTimeout(dismissTimer);
    };
  }, [onComplete]);

  const isPlayer = discardingPlayerId === 'player1';
  const headerText = isPlayer ? 'You Discarded' : 'Opponent Discarded';

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
        {/* Header label */}
        <h2
          className={`
            text-3xl font-orbitron font-bold uppercase tracking-wider
            text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-400
            animate-pulse
            card-reveal-label
            ${isVisible ? 'card-reveal-label-show' : ''}
          `}
          style={{ filter: 'drop-shadow(0 0 20px rgba(248,113,113,0.8))' }}
        >
          {headerText}
        </h2>

        {/* Cards container */}
        <div className="flex gap-4 items-center justify-center">
          {cards && cards.map((card, index) => (
            <div
              key={index}
              className={`
                relative w-32 h-48 rounded-lg overflow-hidden
                bg-gray-900/80 border-2 border-red-400/60
                transition-all duration-600
                ${isShattered ? 'discard-shatter' : 'discard-appear'}
              `}
              style={{
                boxShadow: '0 0 30px rgba(248,113,113,0.4)',
              }}
            >
              {/* Card content placeholder - will be replaced with actual ActionCard component */}
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                {card.name || 'Card'}
              </div>
            </div>
          ))}
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

export default DiscardAnnouncementOverlay;
