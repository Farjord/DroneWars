// ========================================
// ANNOUNCEMENT TOKENS
// ========================================
// Shared primitives for action announcement overlays (drone attack/move, card play).
// LaneBadge   — small "Lane N" pill shown beneath a token.
// ScaledDroneToken — 1.3× DroneToken wrapper used when a drone is the subject/target of an announcement.
// EntityToken — drone-shell-shaped card WITHOUT stat hexes. Used for SHIP_SECTION / TECH
//               targets in CardPlayAnnouncementOverlay where no numeric stats make sense.

import React from 'react';
import DroneToken from '../ui/DroneToken.jsx';
import { FACTION_COLORS } from '../../utils/factionColors.js';

/**
 * Formats a lane id like 'lane1' into a human-readable label like 'Lane 1'.
 * Returns '' when laneId is falsy so callers never crash on missing data.
 */
const LANE_LABELS = { lane1: 'Left Lane', lane2: 'Centre Lane', lane3: 'Right Lane' };
export const formatLane = (laneId) => LANE_LABELS[laneId] ?? '';

/**
 * Badge shown beneath a token to identify its lane. Sized to match the width of an ActionCard (~225px).
 * Renders nothing when laneId is missing so we don't show an empty bubble.
 */
export const LaneBadge = ({ laneId }) => {
  if (!laneId) return null;
  return (
    <span className="mt-2 py-1.5 rounded-full bg-black/50 border border-cyan-400/40 text-cyan-200 font-orbitron text-sm uppercase tracking-wider text-center" style={{ width: '225px' }}>
      {formatLane(laneId)}
    </span>
  );
};

/**
 * Wrapper that scales a DroneToken by 1.3× for the overlay display.
 * Forwards `lane` so DroneToken can compute effective stats (auras, lane-conditional mods).
 */
export const ScaledDroneToken = ({ drone, isPlayer, lane }) => (
  // `zoom` (rather than `transform: scale()`) because zoom reflows parent layout —
  // flex column reserves the scaled height so LaneBadge / stat hexes aren't covered.
  // 2.4× makes the token approximately the same height as a native-size ActionCard (275px).
  <div style={{ zoom: 2.4 }}>
    <DroneToken
      drone={drone}
      isPlayer={isPlayer}
      lane={lane}
      isPotentialInterceptor={false}
      isInvalidTarget={false}
      isActionTarget={false}
      droneRefs={{ current: {} }}
    />
  </div>
);

/**
 * Wrapper that scales an EntityToken by 2.4× — mirrors ScaledDroneToken exactly.
 */
export const ScaledEntityToken = ({ label, subLabel, isPlayer, iconUrl }) => (
  <div style={{ zoom: 2.4 }}>
    <EntityToken label={label} subLabel={subLabel} isPlayer={isPlayer} iconUrl={iconUrl} />
  </div>
);

/**
 * Drone-shell-shaped token for non-drone entities (SHIP_SECTION, TECH).
 * Same outer dimensions and border treatment as DroneToken but without attack/speed hexes —
 * renders a label (e.g. section name or tech name) and optional icon in place of the drone art.
 *
 * @param {string} label       Primary label (e.g. "Droneworks Hull", "System Purge")
 * @param {string} [subLabel]  Secondary label shown below the primary (e.g. entity type)
 * @param {boolean} isPlayer   Drives faction border/glow tint
 * @param {string} [iconUrl]   Optional image URL — rendered as a background icon
 */

export const EntityToken = ({ label, subLabel, isPlayer, iconUrl }) => {
  const fc = isPlayer ? FACTION_COLORS.player : FACTION_COLORS.opponent;
  const borderColor = isPlayer ? 'border-cyan-400/70' : 'border-red-400/70';

  return (
    <div
      className="relative"
      style={{
        width: 'clamp(85px, 4.427vw, 115px)',
        height: 'clamp(115px, 5.99vw, 156px)',
      }}
    >
        <div
          className={`relative w-full h-full rounded-lg shadow-lg border ${borderColor} overflow-hidden`}
          style={{
            background: `radial-gradient(ellipse at center, ${fc.bg} 0%, ${fc.bgDark} 100%)`,
            boxShadow: `0 0 12px ${fc.glow}40, inset 0 0 18px ${fc.primary}22`,
          }}
        >
          {iconUrl && (
            <img
              src={iconUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.7) 100%)`,
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span
              className="font-orbitron font-bold uppercase tracking-wider leading-tight"
              style={{ color: fc.bright, fontSize: 'clamp(10px, 0.85vw, 13px)' }}
            >
              {label}
            </span>
            {subLabel && (
              <span
                className="mt-1 font-orbitron uppercase tracking-widest opacity-80"
                style={{ color: fc.accent, fontSize: 'clamp(8px, 0.6vw, 10px)' }}
              >
                {subLabel}
              </span>
            )}
          </div>
        </div>
    </div>
  );
};
