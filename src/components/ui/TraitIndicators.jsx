// ========================================
// TRAIT INDICATORS COMPONENT
// ========================================
// Displays trait icons (Marked, PASSIVE, INERT) on drone tokens.
// Positioned on top-left of drone token, vertically stacked.
// Hierarchy: Marked → Passive → Inert (top to bottom)

import React from 'react';
import { Anchor, Feather } from 'lucide-react';
import TargetLockIcon from './TargetLockIcon.jsx';

/**
 * TRAIT INDICATORS COMPONENT
 * Renders trait icons on drone tokens in a unified vertical stack.
 * - MARKED: TargetLock icon (red glow) - priority target
 * - PASSIVE: Feather icon (emerald color) - cannot attack or intercept
 * - INERT: Anchor icon (amber color) - cannot move
 *
 * @param {Object} drone - The drone data object (for isMarked status)
 * @param {Object} effectiveStats - The drone's calculated effective stats (with keywords Set)
 */
const TraitIndicators = ({ drone, effectiveStats }) => {
  if (!effectiveStats?.keywords) return null;

  const isMarked = drone?.isMarked;
  const hasPassive = effectiveStats.keywords.has('PASSIVE');
  const hasInert = effectiveStats.keywords.has('INERT');
  if (!isMarked && !hasPassive && !hasInert) return null;

  const icons = [];

  // Hierarchy: Marked first, then Passive, then Inert
  if (isMarked) {
    icons.push(
      <div
        key="marked"
        className="w-6 h-6 flex items-center justify-center marked-glow"
        title="Marked - Priority target"
      >
        <TargetLockIcon size={24} />
      </div>
    );
  }

  if (hasPassive) {
    icons.push(
      <div
        key="passive"
        className="w-5 h-5 rounded-sm flex items-center justify-center bg-emerald-950 border border-emerald-500 shadow-md"
        title="Passive - Cannot attack or intercept"
      >
        <Feather size={12} className="text-emerald-400" />
      </div>
    );
  }

  if (hasInert) {
    icons.push(
      <div
        key="inert"
        className="w-5 h-5 rounded-sm flex items-center justify-center bg-amber-950 border border-amber-500 shadow-md"
        title="Inert - Cannot move"
      >
        <Anchor size={12} className="text-amber-400" />
      </div>
    );
  }

  return (
    <div className="absolute top-5 left-[-14px] flex flex-col gap-1 z-30 pointer-events-none">
      {icons}
      <style>{`
        .marked-glow {
          animation: targetGlow 2s ease-in-out infinite;
        }
        @keyframes targetGlow {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 2px rgba(239, 68, 68, 0.8)); }
          50% { filter: brightness(1.5) drop-shadow(0 0 8px rgba(239, 68, 68, 1)); }
        }
      `}</style>
    </div>
  );
};

export default TraitIndicators;
