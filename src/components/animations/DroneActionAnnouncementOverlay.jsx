// ========================================
// DRONE ACTION ANNOUNCEMENT OVERLAY
// ========================================
// Full-screen clash overlay shown before drone attacks and drone moves.
// Displays attacker/target tokens (attack variant) or drone + lane info (move variant).
// Auto-dismisses after ACTION_ANNOUNCEMENT_DISPLAY_MS with a fade-out.

import React, { useState, useEffect } from 'react';
import './revealOverlay.css';
import DroneToken from '../ui/DroneToken.jsx';
import { ACTION_ANNOUNCEMENT_DISPLAY_MS, ACTION_ANNOUNCEMENT_FADE_MS } from '../../config/announcementTiming.js';

/**
 * Formats a lane id like 'lane1' into a human-readable label like 'Lane 1'.
 * @param {string} laneId
 * @returns {string}
 */
const formatLane = (laneId) => laneId.replace('lane', 'Lane ');

/**
 * Small badge shown beneath a drone token to identify its lane.
 * @param {string} laneId - Raw lane identifier e.g. 'lane1'
 */
const LaneBadge = ({ laneId }) => (
  <span className="mt-2 px-3 py-0.5 rounded-full bg-black/50 border border-cyan-400/40 text-cyan-200 font-orbitron text-xs uppercase tracking-wider">
    {formatLane(laneId)}
  </span>
);

/**
 * Wrapper that scales a DroneToken by 1.3× for the overlay display.
 * All non-interactive props are set to their safe no-op defaults so DroneToken
 * renders without needing game context (the mock in tests replaces DroneToken entirely).
 */
const ScaledDroneToken = ({ drone, isPlayer }) => (
  <div style={{ transform: 'scale(1.3)', transformOrigin: 'center top' }}>
    <DroneToken
      drone={drone}
      isPlayer={isPlayer}
      isPotentialInterceptor={false}
      isInvalidTarget={false}
      isActionTarget={false}
      droneRefs={{ current: {} }}
    />
  </div>
);

/**
 * DroneActionAnnouncementOverlay
 *
 * @param {'attack'|'move'} variant - Which action is being announced
 * @param {Object} payload
 *   Attack: { attackerDrone, attackerLane, attackerIsPlayer, targetDrone, targetLane, targetIsPlayer, isIntercepted }
 *   Move:   { drone, sourceLane, destinationLane, droneIsPlayer }
 * @param {Function} onComplete - Called once fade-out animation finishes
 */
const DroneActionAnnouncementOverlay = ({ variant, payload, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

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

  const renderAttackContent = () => {
    // targetDrone holds the interceptor drone when isIntercepted=true — payload contract
    const { attackerDrone, attackerLane, attackerIsPlayer, targetDrone, targetLane, targetIsPlayer, isIntercepted } = payload;

    return (
      <>
        {/* Attacker column */}
        <div className="flex flex-col items-center gap-2">
          <ScaledDroneToken drone={attackerDrone} isPlayer={attackerIsPlayer} />
          <LaneBadge laneId={attackerLane} />
        </div>

        {/* Centre label column */}
        <div className="flex flex-col items-center gap-3 px-6">
          <span className="text-3xl font-orbitron font-bold text-red-400 uppercase tracking-widest drop-shadow-[0_0_12px_rgba(248,113,113,0.8)]">
            ATTACKS →
          </span>
          {isIntercepted && (
            <span className="px-4 py-1 rounded-full bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-orbitron text-sm uppercase tracking-wider animate-pulse">
              INTERCEPTED!
            </span>
          )}
        </div>

        {/* Target column */}
        <div className="flex flex-col items-center gap-2">
          <ScaledDroneToken drone={targetDrone} isPlayer={targetIsPlayer} />
          <LaneBadge laneId={targetLane} />
        </div>
      </>
    );
  };

  const renderMoveContent = () => {
    const { drone, sourceLane, destinationLane, droneIsPlayer } = payload;

    return (
      <>
        {/* Drone column */}
        <div className="flex flex-col items-center gap-2">
          <ScaledDroneToken drone={drone} isPlayer={droneIsPlayer} />
          <LaneBadge laneId={sourceLane} />
        </div>

        {/* Centre label */}
        <div className="flex flex-col items-center justify-center px-6">
          <span className="text-3xl font-orbitron font-bold text-cyan-400 uppercase tracking-widest drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]">
            MOVES →
          </span>
        </div>

        {/* Destination column */}
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-2xl font-orbitron font-bold text-cyan-200 uppercase tracking-wider">
            {formatLane(destinationLane)}
          </span>
        </div>
      </>
    );
  };

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
        {variant === 'attack' ? renderAttackContent() : renderMoveContent()}
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

export default DroneActionAnnouncementOverlay;
