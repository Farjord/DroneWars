// ========================================
// RIGHT SIDE ICONS COMPONENT
// ========================================
// Unified icon stack for the RIGHT side of drone tokens.
// Displays: AbilityIcon (interactive) + status effects
// Priority-ordered with overflow handling (max 3 visible).

import React from 'react';
import { Ban, Move, Swords, Shield, CirclePause, Link2, ShieldOff } from 'lucide-react';

const MAX_VISIBLE = 3;

/**
 * NoEntryIcon - Overlays Ban icon on base icon.
 * Used for Cannot Move, Cannot Attack, Cannot Intercept.
 * Named export consumed by DroneTooltipPanel.
 */
export const NoEntryIcon = ({ baseIcon, size = 10, isExhausted = false }) => (
  <div className="relative flex items-center justify-center">
    {React.cloneElement(baseIcon, {
      size,
      className: isExhausted ? 'text-slate-400' : 'text-slate-200'
    })}
    <Ban size={20} className="absolute text-red-500" strokeWidth={3} />
  </div>
);

/**
 * AbilityIcon - Clickable ability button for drone tokens.
 */
const AbilityIcon = ({ onClick, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    className={`w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center border z-20 transition-all ${
      disabled
        ? 'border-gray-500 cursor-not-allowed opacity-60'
        : 'border-cyan-400 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-400/50 cursor-pointer'
    }`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={disabled ? 'text-gray-500' : 'text-cyan-400'}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  </button>
);

/**
 * Collects status effect entries in priority order.
 */
function collectStatuses(drone) {
  const statuses = [];

  if (drone.cannotAttack) {
    statuses.push({
      key: 'cannot-attack',
      icon: <NoEntryIcon baseIcon={<Swords />} isExhausted={drone.isExhausted} />
    });
  }
  if (drone.cannotMove) {
    statuses.push({
      key: 'cannot-move',
      icon: <NoEntryIcon baseIcon={<Move />} isExhausted={drone.isExhausted} />
    });
  }
  if (drone.cannotIntercept) {
    statuses.push({
      key: 'cannot-intercept',
      icon: <NoEntryIcon baseIcon={<Shield />} isExhausted={drone.isExhausted} />
    });
  }
  if (drone.isSnared) {
    statuses.push({
      key: 'snared',
      icon: <Link2 size={12} className={drone.isExhausted ? 'text-slate-400' : 'text-orange-400'} />
    });
  }
  if (drone.isSuppressed) {
    statuses.push({
      key: 'suppressed',
      icon: <ShieldOff size={12} className={drone.isExhausted ? 'text-slate-400' : 'text-violet-400'} />
    });
  }
  if (drone.doesNotReady) {
    statuses.push({
      key: 'does-not-ready',
      icon: <CirclePause size={14} className={drone.isExhausted ? 'text-slate-400' : 'text-amber-400'} />
    });
  }

  return statuses;
}

/**
 * RightSideIcons - Unified right-side icon stack for drone tokens.
 *
 * @param {Object} drone - The drone data object
 * @param {boolean} isPlayer - Whether this is a player-owned drone
 * @param {Array} activeAbilities - Active abilities from baseDrone
 * @param {Function} isAbilityUsable - Checks if ability can be activated
 * @param {Function} onAbilityClick - Callback when ability icon clicked
 */
const RightSideIcons = ({ drone, isPlayer, activeAbilities, isAbilityUsable, onAbilityClick }) => {
  if (!drone) return null;

  const showAbility = isPlayer && activeAbilities.length > 0;
  const statuses = collectStatuses(drone);

  if (!showAbility && statuses.length === 0) return null;

  // Determine how many status icon slots are available
  const statusSlots = showAbility ? MAX_VISIBLE - 1 : MAX_VISIBLE;
  const overflow = statuses.length - statusSlots;
  // When overflow, show (statusSlots - 1) real icons + 1 overflow badge
  const visibleStatuses = overflow > 0 ? statuses.slice(0, statusSlots - 1) : statuses;

  return (
    <div className="absolute top-5 -right-3.5 flex flex-col gap-1 z-20">
      {showAbility && (
        <AbilityIcon
          disabled={!isAbilityUsable(activeAbilities[0])}
          onClick={(e) => onAbilityClick && onAbilityClick(e, drone, activeAbilities[0])}
        />
      )}
      {visibleStatuses.map(status => (
        <div
          key={status.key}
          className="w-6 h-6 rounded-full flex items-center justify-center border bg-slate-800 border-slate-500"
        >
          {status.icon}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center border bg-slate-800 border-slate-500 text-xs text-white font-bold">
          +{overflow + 1}
        </div>
      )}
    </div>
  );
};

export default RightSideIcons;
