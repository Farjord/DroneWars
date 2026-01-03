// ========================================
// AVAILABILITY DOTS COMPONENT
// ========================================
// Renders dots representing drone copy availability status
// Part of the Drone Availability & Rebuild System
//
// Dot States:
// - Ready: Solid green filled (available to deploy)
// - In-Play: Green outline/hollow (currently deployed)
// - Rebuilding: Grey with animated partial fill (returning)
// - Unavailable: Dark outline/hollow (slot not active)

import React from 'react';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * AvailabilityDots Component
 * Displays a row of dots showing drone copy availability status
 *
 * @param {Object} availability - Drone availability state from droneAvailability
 *   - readyCount: Number ready to deploy
 *   - inPlayCount: Number currently on board
 *   - rebuildingCount: Number being rebuilt
 *   - rebuildProgress: Fractional progress (0.0 - 0.999)
 *   - copyLimit: Max simultaneous copies
 * @param {number} copyLimit - Explicit copy limit (fallback if not in availability)
 * @param {string} droneName - Name of the drone (for debug logging)
 * @param {number} dotSize - Dot diameter in pixels (default: 10)
 * @param {number} gap - Gap between dots in pixels (default: 2)
 */
const AvailabilityDots = ({
  availability,
  copyLimit: explicitCopyLimit,
  droneName = 'unknown',
  dotSize = 10,
  gap = 2
}) => {
  // Use explicit copyLimit or fall back to availability.copyLimit
  const limit = explicitCopyLimit ?? availability?.copyLimit ?? 0;

  // Default to all ready if no availability data (pre-combat state)
  const readyCount = availability?.readyCount ?? limit;
  const inPlayCount = availability?.inPlayCount ?? 0;
  const rebuildingCount = availability?.rebuildingCount ?? 0;
  const rebuildProgress = availability?.rebuildProgress ?? 0;

  debugLog('AVAILABILITY', `[${droneName}] AvailabilityDots render:`, {
    explicitCopyLimit,
    limit,
    availability,
    readyCount,
    inPlayCount,
    rebuildingCount
  });

  // Build dots array: Ready first, then In-Play, then Rebuilding, then Unavailable
  const dots = [];
  let remaining = limit;

  // Ready dots (solid green)
  // Pre-calculate count to avoid loop condition changing mid-iteration
  const readyToAdd = Math.min(readyCount, remaining);
  for (let i = 0; i < readyToAdd; i++) {
    dots.push({ type: 'ready', index: dots.length });
    remaining--;
  }

  // In-Play dots (green outline)
  const inPlayToAdd = Math.min(inPlayCount, remaining);
  for (let i = 0; i < inPlayToAdd; i++) {
    dots.push({ type: 'inPlay', index: dots.length });
    remaining--;
  }

  // Rebuilding dots (grey with partial fill)
  const rebuildingToAdd = Math.min(rebuildingCount, remaining);
  for (let i = 0; i < rebuildingToAdd; i++) {
    // First rebuilding dot shows progress, rest are empty
    const showProgress = i === 0 && rebuildProgress > 0;
    dots.push({
      type: 'rebuilding',
      index: dots.length,
      progress: showProgress ? rebuildProgress : 0
    });
    remaining--;
  }

  // Unavailable dots (dark outline - slots that exist but aren't active)
  // This shouldn't normally happen, but handles edge cases
  for (let i = 0; i < remaining; i++) {
    dots.push({ type: 'unavailable', index: dots.length });
  }

  debugLog('AVAILABILITY', `[${droneName}] Dots array built:`, {
    dotsCount: dots.length,
    dots: dots.map(d => d.type)
  });

  if (dots.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center"
      style={{ gap: `${gap}px` }}
      title={`Ready: ${readyCount}, In-Play: ${inPlayCount}, Rebuilding: ${rebuildingCount}`}
    >
      {dots.map((dot) => (
        <Dot
          key={dot.index}
          type={dot.type}
          progress={dot.progress}
          size={dotSize}
        />
      ))}
    </div>
  );
};

/**
 * Individual Dot Component
 */
const Dot = ({ type, progress = 0, size }) => {
  const baseClasses = 'rounded-full transition-all duration-300';

  // Styles based on dot type
  const styles = {
    ready: {
      // Solid green filled
      className: `${baseClasses} bg-green-500`,
      style: { width: size, height: size }
    },
    inPlay: {
      // Green outline (hollow)
      className: `${baseClasses} border-2 border-green-500 bg-transparent`,
      style: { width: size, height: size }
    },
    rebuilding: {
      // Grey with optional partial fill showing progress
      className: `${baseClasses} border-2 border-gray-500 overflow-hidden relative`,
      style: { width: size, height: size }
    },
    unavailable: {
      // Dark outline (hollow)
      className: `${baseClasses} border border-gray-700 bg-transparent`,
      style: { width: size, height: size }
    }
  };

  const dotStyle = styles[type] || styles.unavailable;

  // Special handling for rebuilding dots with progress fill
  if (type === 'rebuilding' && progress > 0) {
    return (
      <div
        className={dotStyle.className}
        style={dotStyle.style}
      >
        {/* Progress fill (fills from bottom to top) */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gray-400 animate-pulse"
          style={{
            height: `${Math.min(progress * 100, 100)}%`,
            transition: 'height 0.3s ease-out'
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={dotStyle.className}
      style={dotStyle.style}
    />
  );
};

export default AvailabilityDots;
