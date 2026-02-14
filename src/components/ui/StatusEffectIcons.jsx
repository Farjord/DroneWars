// ========================================
// STATUS EFFECT ICONS COMPONENT
// ========================================
// Displays status effect icons on the RIGHT side of drone tokens
// Shows Cannot Move, Cannot Attack, Cannot Intercept, Does Not Ready
// Priority order with overflow handling (+X indicator)

import React from 'react';
import { Ban, Move, Swords, Shield, CirclePause, Link2, ShieldOff } from 'lucide-react';

/**
 * NoEntryIcon - Overlays Ban icon on base icon
 * Used for Cannot Move, Cannot Attack, Cannot Intercept
 */
const NoEntryIcon = ({ baseIcon, size = 10, isExhausted = false }) => (
  <div className="relative flex items-center justify-center">
    {React.cloneElement(baseIcon, {
      size,
      className: isExhausted ? 'text-slate-400' : 'text-slate-200'
    })}
    <Ban size={20} className="absolute text-red-500" strokeWidth={3} />
  </div>
);

/**
 * StatusEffectIcons - Displays status effects on drone tokens
 *
 * @param {Object} drone - Drone object with status flags
 * @param {boolean} drone.cannotMove - Cannot move restriction
 * @param {boolean} drone.cannotAttack - Cannot attack restriction
 * @param {boolean} drone.cannotIntercept - Cannot intercept restriction
 * @param {boolean} drone.doesNotReady - Does not ready next phase
 * @param {boolean} isPlayer - Whether this is player's drone (unused, for consistency)
 * @returns {JSX.Element|null} Status icon display or null
 */
const StatusEffectIcons = ({ drone, isPlayer }) => {
  if (!drone) return null;

  // Collect statuses in priority order
  const statuses = [];

  // Priority 1: Cannot Attack
  if (drone.cannotAttack) {
    statuses.push({
      key: 'cannot-attack',
      title: 'Cannot Attack',
      icon: <NoEntryIcon baseIcon={<Swords />} isExhausted={drone.isExhausted} />
    });
  }

  // Priority 2: Cannot Move
  if (drone.cannotMove) {
    statuses.push({
      key: 'cannot-move',
      title: 'Cannot Move',
      icon: <NoEntryIcon baseIcon={<Move />} isExhausted={drone.isExhausted} />
    });
  }

  // Priority 3: Cannot Intercept
  if (drone.cannotIntercept) {
    statuses.push({
      key: 'cannot-intercept',
      title: 'Cannot Intercept',
      icon: <NoEntryIcon baseIcon={<Shield />} isExhausted={drone.isExhausted} />
    });
  }

  // Priority 4: Snared (next move cancelled)
  if (drone.isSnared) {
    statuses.push({
      key: 'snared',
      title: 'Snared - Next move will be cancelled',
      icon: (
        <Link2
          size={12}
          className={drone.isExhausted ? 'text-slate-400' : 'text-orange-400'}
        />
      )
    });
  }

  // Priority 5: Suppressed (next attack cancelled)
  if (drone.isSuppressed) {
    statuses.push({
      key: 'suppressed',
      title: 'Suppressed - Next attack will be cancelled',
      icon: (
        <ShieldOff
          size={12}
          className={drone.isExhausted ? 'text-slate-400' : 'text-violet-400'}
        />
      )
    });
  }

  // Priority 6: Does Not Ready
  if (drone.doesNotReady) {
    statuses.push({
      key: 'does-not-ready',
      title: 'Does Not Ready Next Phase',
      icon: (
        <CirclePause
          size={14}
          className={drone.isExhausted ? 'text-slate-400' : 'text-amber-400'}
        />
      )
    });
  }

  // No statuses to display
  if (statuses.length === 0) {
    return null;
  }

  // Show first 2 icons, then +X overflow indicator
  const visible = statuses.slice(0, 2);
  const overflow = statuses.length - 2;

  return (
    <div className="absolute top-5 -right-3.5 flex flex-col gap-1 z-20">
      {visible.map(status => (
        <div
          key={status.key}
          className="w-6 h-6 rounded-full flex items-center justify-center border bg-slate-800 border-slate-500"
          title={status.title}
        >
          {status.icon}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center border bg-slate-800 border-slate-500 text-xs text-white font-bold"
          title={`+${overflow} more status effects`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};

export default StatusEffectIcons;
