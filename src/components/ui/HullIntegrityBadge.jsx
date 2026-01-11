// ========================================
// HULL INTEGRITY BADGE COMPONENT
// ========================================
// Displays ship hull integrity as a countdown to win condition.
// Shows: remaining damage needed / total damage threshold
// Color changes based on proximity to winning (dealing enough damage).

import React from 'react';
import { Shield } from 'lucide-react';

/**
 * Get the color scheme based on remaining integrity percentage
 * @param {number} current - Current remaining to win
 * @param {number} threshold - Total damage threshold
 * @returns {Object} Color configuration { iconColor, textColor, borderColor, accentColor, glowColor }
 */
const getIntegrityColors = (current, threshold) => {
  if (threshold === 0) {
    // Edge case: avoid division by zero
    return {
      iconColor: 'text-gray-400',
      textColor: 'text-gray-300',
      borderColor: 'rgba(156, 163, 175, 0.3)',
      accentColor: 'rgba(156, 163, 175, 0.5)',
      glowColor: 'rgba(156, 163, 175, 0.1)'
    };
  }

  const percentage = current / threshold;

  if (percentage <= 0) {
    // Win condition met - bright red/danger
    return {
      iconColor: 'text-red-500',
      textColor: 'text-red-400',
      borderColor: 'rgba(239, 68, 68, 0.5)',
      accentColor: 'rgba(239, 68, 68, 0.7)',
      glowColor: 'rgba(239, 68, 68, 0.2)'
    };
  } else if (percentage < 0.25) {
    // Below 25% - danger (red)
    return {
      iconColor: 'text-red-400',
      textColor: 'text-red-300',
      borderColor: 'rgba(248, 113, 113, 0.4)',
      accentColor: 'rgba(248, 113, 113, 0.6)',
      glowColor: 'rgba(248, 113, 113, 0.15)'
    };
  } else if (percentage < 0.5) {
    // 25-50% - warning (yellow/orange)
    return {
      iconColor: 'text-yellow-400',
      textColor: 'text-yellow-300',
      borderColor: 'rgba(250, 204, 21, 0.4)',
      accentColor: 'rgba(250, 204, 21, 0.6)',
      glowColor: 'rgba(250, 204, 21, 0.15)'
    };
  } else {
    // Above 50% - healthy (green)
    return {
      iconColor: 'text-green-400',
      textColor: 'text-green-300',
      borderColor: 'rgba(74, 222, 128, 0.4)',
      accentColor: 'rgba(74, 222, 128, 0.6)',
      glowColor: 'rgba(74, 222, 128, 0.15)'
    };
  }
};

/**
 * HullIntegrityBadge - Displays hull integrity as damage remaining to win
 *
 * @param {Object} props
 * @param {number} props.current - Remaining damage needed to win (counts down to 0)
 * @param {number} props.threshold - Total damage needed to win
 * @param {boolean} props.isPlayer - True for player (cyan base), false for opponent (red base)
 */
const HullIntegrityBadge = ({ current, threshold, isPlayer }) => {
  const colors = getIntegrityColors(current, threshold);

  // Base theme colors from ResourceBadge pattern
  const baseBorderColor = isPlayer ? 'rgba(6, 182, 212, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const baseAccentColor = isPlayer ? 'rgba(6, 182, 212, 0.5)' : 'rgba(239, 68, 68, 0.5)';
  const baseGlowColor = isPlayer ? 'rgba(6, 182, 212, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div
      className="relative"
      style={{
        background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 28, 0.95) 100%)',
        border: `1px solid ${baseBorderColor}`,
        borderRadius: '2px',
        boxShadow: `0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 ${baseGlowColor}`,
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)'
      }}
      title={`Hull Integrity: ${current} / ${threshold} damage remaining`}
    >
      {/* Angular corner accent */}
      <div
        className="absolute top-0 left-0 w-2 h-2 z-10 pointer-events-none"
        style={{
          borderTop: `1px solid ${baseAccentColor}`,
          borderLeft: `1px solid ${baseAccentColor}`
        }}
      />
      <div className="px-3 py-1 flex items-center gap-2">
        <Shield size={18} className={colors.iconColor} />
        <span className="font-bold text-base whitespace-nowrap text-white">
          {current}
          <span className="hidden xl:inline"> / {threshold}</span>
        </span>
      </div>
    </div>
  );
};

export default HullIntegrityBadge;
