// ========================================
// LEFT SIDE ICONS COMPONENT
// ========================================
// Unified icon stack for the LEFT side of drone tokens.
// Displays: Marked, RAPID, ASSAULT, PASSIVE, INERT
// Priority-ordered with overflow handling (max 3 visible).

import React from 'react';
import { Gauge, Crosshair, Feather, Anchor } from 'lucide-react';
import fullDroneCollection from '../../data/droneData.js';
import TargetLockIcon from './TargetLockIcon.jsx';

const MAX_VISIBLE = 3;

/**
 * LeftSideIcons - Unified left-side icon stack for drone tokens.
 *
 * @param {Object} drone - The drone data object
 * @param {Object} effectiveStats - Effective stats with keywords Set
 * @param {boolean} isPlayer - Whether visually owned by local player (for border colors)
 */
const LeftSideIcons = ({ drone, effectiveStats, isPlayer }) => {
  const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
  const keywords = effectiveStats?.keywords ?? new Set();

  const icons = [];

  // Priority 1: Marked
  if (drone?.isMarked) {
    icons.push(
      <div key="marked" className="w-6 h-6 flex items-center justify-center marked-glow">
        <TargetLockIcon size={24} />
      </div>
    );
  }

  // Priority 2: Rapid
  const hasRapid = baseDrone?.abilities?.some(a => a.keywordIcon === 'RAPID');
  if (hasRapid) {
    const isUsed = (drone.triggerUsesMap?.['Rapid Response'] || 0) >= 1;
    icons.push(
      <div
        key="rapid"
        className={`w-6 h-6 rounded-full flex items-center justify-center border ${
          isUsed
            ? 'bg-slate-700 border-slate-500'
            : isPlayer
              ? 'bg-cyan-900 border-cyan-400 shadow-lg shadow-cyan-400/30'
              : 'bg-red-950 border-red-500 shadow-lg shadow-red-500/30'
        }`}
      >
        <Gauge size={14} className={isUsed ? 'text-slate-500' : 'text-blue-400'} />
      </div>
    );
  }

  // Priority 3: Assault
  const hasAssault = baseDrone?.abilities?.some(a => a.keywordIcon === 'ASSAULT');
  if (hasAssault) {
    const isUsed = (drone.triggerUsesMap?.['Assault Protocol'] || 0) >= 1;
    icons.push(
      <div
        key="assault"
        className={`w-6 h-6 rounded-full flex items-center justify-center border ${
          isUsed
            ? 'bg-slate-700 border-slate-500'
            : isPlayer
              ? 'bg-cyan-900 border-cyan-400 shadow-lg shadow-cyan-400/30'
              : 'bg-red-950 border-red-500 shadow-lg shadow-red-500/30'
        }`}
      >
        <Crosshair size={14} className={isUsed ? 'text-slate-500' : 'text-red-400'} />
      </div>
    );
  }

  // Priority 4: Passive
  if (keywords.has('PASSIVE')) {
    icons.push(
      <div key="passive" className="w-5 h-5 rounded-sm flex items-center justify-center bg-emerald-950 border border-emerald-500 shadow-md">
        <Feather size={12} className="text-emerald-400" />
      </div>
    );
  }

  // Priority 5: Inert
  if (keywords.has('INERT')) {
    icons.push(
      <div key="inert" className="w-5 h-5 rounded-sm flex items-center justify-center bg-amber-950 border border-amber-500 shadow-md">
        <Anchor size={12} className="text-amber-400" />
      </div>
    );
  }

  if (icons.length === 0) return null;

  const overflow = icons.length - MAX_VISIBLE;
  // When overflow, show first (MAX_VISIBLE - 1) icons + overflow badge
  const visible = overflow > 0 ? icons.slice(0, MAX_VISIBLE - 1) : icons;

  return (
    <div className="absolute top-5 -left-3.5 flex flex-col gap-1 z-20 pointer-events-none">
      {visible}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center border bg-slate-800 border-slate-500 text-xs text-white font-bold">
          +{overflow + 1}
        </div>
      )}
    </div>
  );
};

export default LeftSideIcons;
