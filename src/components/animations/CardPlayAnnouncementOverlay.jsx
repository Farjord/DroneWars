// ========================================
// CARD PLAY ANNOUNCEMENT OVERLAY
// ========================================
// Full-screen overlay shown when a card is played that targets at least one
// non-player entity (DRONE / LANE / SHIP_SECTION / TECH). Renders a 3-column
// layout: [Card] TARGETING → [Target(s)]. For cards with only NONE / CARD_IN_HAND
// targeting, EffectChainProcessor still emits CARD_REVEAL — this overlay never fires.

import React, { useState, useEffect } from 'react';
import './revealOverlay.css';
import ActionCard from '../ui/ActionCard.jsx';
import { ACTION_ANNOUNCEMENT_DISPLAY_MS, ACTION_ANNOUNCEMENT_FADE_MS } from '../../config/announcementTiming.js';
import { debugLog } from '../../utils/debugLogger.js';
import { LaneBadge, ScaledDroneToken, ScaledEntityToken, formatLane } from './announcementTokens.jsx';
import { resolveShipSectionImage } from '../../logic/cards/shipSectionImageResolver.js';

/**
 * Renders a single target entry in the right-hand column.
 * Shape differs by kind — see buildAnnouncementTargets in EffectChainProcessor.js.
 */
const TargetEntry = ({ target }) => {
  const { kind, targetIsPlayer } = target;

  if (kind === 'DRONE') {
    return (
      <div className="flex flex-col items-center gap-2">
        <ScaledDroneToken drone={target.drone} isPlayer={targetIsPlayer} lane={target.lane} />
        <LaneBadge laneId={target.lane} />
      </div>
    );
  }

  if (kind === 'LANE') {
    if (target.sectionType) {
      const iconUrl = resolveShipSectionImage(target.shipId, target.sectionType, target.targetIsPlayer ?? true);
      return (
        <div className="flex flex-col items-center gap-2">
          <ScaledEntityToken label={target.sectionType} isPlayer={target.targetIsPlayer} iconUrl={iconUrl} />
          <LaneBadge laneId={target.lane} />
        </div>
      );
    }
    // Fallback when section data is unavailable (e.g. no placed sections in test/AI context).
    return (
      <div className="flex flex-col items-center justify-center">
        <span className={`font-orbitron font-bold text-cyan-200 uppercase tracking-wider${target.summary ? ' text-3xl drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]' : ' text-2xl'}`}>
          {formatLane(target.lane)}
        </span>
      </div>
    );
  }

  if (kind === 'SHIP_SECTION') {
    const iconUrl = resolveShipSectionImage(target.shipId, target.sectionType, targetIsPlayer ?? true);
    return (
      <div className="flex flex-col items-center gap-2">
        <ScaledEntityToken label={target.sectionType} isPlayer={targetIsPlayer} iconUrl={iconUrl} />
        <LaneBadge laneId={target.lane} />
      </div>
    );
  }

  if (kind === 'TECH') {
    return (
      <div className="flex flex-col items-center gap-2">
        <ScaledEntityToken label={target.techName} subLabel="Tech" isPlayer={targetIsPlayer} />
        <LaneBadge laneId={target.lane} />
      </div>
    );
  }

  if (kind === 'DRONE_TYPE') {
    return (
      <div className="flex flex-col items-center gap-2">
        <ScaledDroneToken drone={target.drone} isPlayer={target.targetIsPlayer} lane={null} />
      </div>
    );
  }

  return null;
};

/**
 * CardPlayAnnouncementOverlay
 *
 * @param {Object} payload - { cardData, cardName, playerId, cardIsPlayer, targets: [{kind, ...}] }
 * @param {Function} onComplete - Called once fade-out animation finishes
 */
const CardPlayAnnouncementOverlay = ({ payload, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const p = payload || {};
    debugLog('ANNOUNCE_TRACE', `🎬 CARD OVERLAY RENDER card=${p.cardName} targetCount=${p.targets?.length || 0} cardIsPlayer=${p.cardIsPlayer}`, {
      payloadKeys: Object.keys(p),
      targetKinds: (p.targets || []).map(t => t.kind),
    });
    // Mount-only: intentional empty dep array. Prevents log storm from fade-timer re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    let cleanupTimer;
    const displayTimer = setTimeout(() => {
      setIsVisible(false);
      cleanupTimer = setTimeout(() => {
        onComplete?.();
      }, ACTION_ANNOUNCEMENT_FADE_MS);
    }, ACTION_ANNOUNCEMENT_DISPLAY_MS);

    return () => {
      clearTimeout(displayTimer);
      clearTimeout(cleanupTimer);
    };
  }, [onComplete]);

  const { cardData, cardIsPlayer, targets = [] } = payload;
  const label = cardIsPlayer ? 'You Played' : 'Opponent Played';

  // Multi-target layout: 1-2 in a row; 3+ wraps into a 3-column grid.
  const useGrid = targets.length >= 3;
  const targetScale = useGrid ? 'scale-75' : '';

  return (
    <div
      className={`
        fixed inset-0 z-[10000] flex items-center justify-center
        transition-all duration-300 pointer-events-none
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* duration-300 matches ACTION_ANNOUNCEMENT_FADE_MS */}
      {/* Semi-transparent background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Content container — duration-300 matches ACTION_ANNOUNCEMENT_FADE_MS */}
      <div
        className={`
          relative flex flex-row items-center justify-center gap-8
          transition-all duration-300 transform
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'}
        `}
      >
        {/* Card column */}
        <div className="flex flex-col items-center gap-2">
          <span
            className={`
              text-sm font-orbitron font-bold uppercase tracking-widest
              ${cardIsPlayer ? 'text-cyan-300' : 'text-red-300'}
            `}
          >
            {label}
          </span>
          <ActionCard card={cardData} isPlayable={true} />
        </div>

        {/* Centre label column */}
        <div className="flex flex-col items-center justify-center px-4">
          <span className="text-3xl font-orbitron font-bold text-cyan-400 uppercase tracking-widest drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]">
            TARGETING →
          </span>
        </div>

        {/* Target column(s) */}
        <div
          className={
            useGrid
              ? 'grid grid-cols-3 gap-4 items-center justify-items-center'
              : 'flex flex-row items-center gap-6'
          }
        >
          {targets.map((t, idx) => (
            <div key={idx} className={targetScale}>
              <TargetEntry target={t} />
            </div>
          ))}
        </div>
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
  );
};

export default CardPlayAnnouncementOverlay;
