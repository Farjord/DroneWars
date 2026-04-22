// ========================================
// CARD DISCARD OVERLAY
// ========================================
// Displays a card discard overlay when cards are discarded
// Shows the discarded cards with a red discard visual effect
// Auto-dismisses after configured duration with fade-out animation

import React, { useState, useEffect } from 'react';
import './revealOverlay.css';
import ActionCard from '../ui/ActionCard.jsx';
import { DISCARD_TOTAL_MS, ACTION_ANNOUNCEMENT_FADE_MS } from '../../config/announcementTiming.js';

/**
 * CardDiscardOverlay - Shows cards being discarded
 * @param {Array} cards - Array of card objects to display as discarded
 * @param {string} label - "You Discarded" or "Opponent Discarded"
 * @param {Function} onComplete - Callback when animation completes
 */
const CardDiscardOverlay = ({ cards, label, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in immediately
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss after DISCARD_TOTAL_MS
    const displayTimer = setTimeout(() => {
      setIsVisible(false);

      // Wait for fade-out animation to complete before cleanup
      const cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, ACTION_ANNOUNCEMENT_FADE_MS);

      return () => clearTimeout(cleanupTimer);
    }, DISCARD_TOTAL_MS);

    return () => clearTimeout(displayTimer);
  }, [onComplete]);

  // Ensure cards is an array
  const cardsArray = Array.isArray(cards) ? cards : [cards];

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
        {/* Label with glowing effect - red styling for discard */}
        <h2
          className={`
            text-4xl font-orbitron font-bold uppercase tracking-wider
            text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400
            animate-pulse
            drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]
            card-reveal-label
            ${isVisible ? 'card-reveal-label-show' : ''}
          `}
        >
          {label}
        </h2>

        {/* Cards display in a row if multiple */}
        <div
          className={`
            transform scale-100 card-reveal-card flex gap-4 justify-center flex-wrap max-w-4xl
            ${!isVisible ? 'card-reveal-dissolve' : ''}
          `}
        >
          {cardsArray.map((card, idx) => (
            <div key={card.instanceId || idx} className="transform scale-90">
              <ActionCard card={card} isPlayable={false} />
            </div>
          ))}
        </div>

        {/* Digital scan line effect */}
        <div
          className={`
            absolute inset-0 pointer-events-none
            bg-gradient-to-b from-transparent via-red-500/10 to-transparent
            card-reveal-scanline
            ${isVisible ? 'card-reveal-scanline-active' : ''}
          `}
        />
      </div>
    </div>
  );
};

export default CardDiscardOverlay;
