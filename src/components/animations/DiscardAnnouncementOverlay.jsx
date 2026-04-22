// ========================================
// DISCARD ANNOUNCEMENT OVERLAY
// ========================================
// Full-screen overlay shown when cards are discarded. Cards shatter outward
// simultaneously. Consistent z-index and backdrop with existing overlays.
//
// Timing (ms): appear 300 + shatter 600 + hold 500 + fade 300 = 1700 total.
// Configured in config/announcementTiming.js.

import React, { useState, useEffect } from 'react';
import ShatterCard from './ShatterCard.jsx';
import {
  DISCARD_APPEAR_MS,
  DISCARD_SHATTER_MS,
  DISCARD_HOLD_MS,
  DISCARD_FADE_MS,
} from '../../config/announcementTiming.js';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * DiscardAnnouncementOverlay
 *
 * @param {Object[]} cards - Array of full card objects that were discarded
 * @param {string} discardingPlayerId - 'player1' | 'player2'
 * @param {string} localPlayerId - The local player's id (for header text)
 * @param {Function} onComplete - Called once fade-out finishes
 */
const DiscardAnnouncementOverlay = ({ cards, discardingPlayerId, localPlayerId, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isShattered, setIsShattered] = useState(false);

  useEffect(() => {
    debugLog('ANNOUNCE_TRACE', `🃏 DISCARD OVERLAY card count=${cards?.length} discardingPlayer=${discardingPlayerId}`);
    // Mount-only: prevent log storm on re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const shatterTimer = setTimeout(() => {
      setIsShattered(true);
    }, DISCARD_APPEAR_MS);

    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, DISCARD_APPEAR_MS + DISCARD_SHATTER_MS + DISCARD_HOLD_MS);

    const cleanupTimer = setTimeout(() => {
      onComplete?.();
    }, DISCARD_APPEAR_MS + DISCARD_SHATTER_MS + DISCARD_HOLD_MS + DISCARD_FADE_MS);

    return () => {
      clearTimeout(shatterTimer);
      clearTimeout(fadeTimer);
      clearTimeout(cleanupTimer);
    };
  }, [onComplete]);

  const isOwnDiscard = discardingPlayerId === localPlayerId;
  const headerText = isOwnDiscard ? 'You Discarded' : 'Opponent Discarded';

  return (
    <div
      className={`
        fixed inset-0 z-[10000] flex items-center justify-center
        transition-all duration-300 pointer-events-none
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className={`
          relative flex flex-col items-center gap-6
          transition-all duration-300 transform
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'}
        `}
      >
        <span
          className={`
            text-sm font-orbitron font-bold uppercase tracking-widest
            ${isOwnDiscard ? 'text-cyan-300' : 'text-red-300'}
          `}
        >
          {headerText}
        </span>

        <div className="flex flex-row items-start gap-6">
          {(cards || []).map((card, idx) => (
            <ShatterCard
              key={card.instanceId || idx}
              card={card}
              triggered={isShattered}
              shatterDurationMs={DISCARD_SHATTER_MS}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiscardAnnouncementOverlay;
