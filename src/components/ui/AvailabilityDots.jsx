// ========================================
// AVAILABILITY DOTS COMPONENT
// ========================================
// Renders dots representing drone deployment availability
// Part of the Drone Availability & Rebuild System (NEW MODEL)
//
// NEW Dot States (show deployment availability, not drone location):
// - Deployable: Solid green pip (ready AND under in-play limit)
// - Blocked: Green outline (ready BUT at deployment limit)
// - Rebuilding: Grey segmented circle with progress
// - Inactive: Grey outline (slot not producing)

import React from 'react';
import { debugLog } from '../../utils/debugLogger.js';

// Custom keyframes for stronger pulse effect (brighter and darker)
const pulseKeyframes = `
@keyframes pulse-strong {
  0%, 100% { opacity: 1; filter: brightness(1.4); }
  50% { opacity: 0.3; filter: brightness(0.6); }
}
`;

/**
 * Calculate segment count based on rebuild rate
 * Lower rates = more segments (slower rebuild)
 * @param {number} rebuildRate - Rate per round
 * @returns {number} Number of segments (1-3 typically)
 */
const calculateSegmentCount = (rebuildRate) => {
  if (rebuildRate >= 1.0) return 1;
  if (rebuildRate >= 0.5) return 2;
  return Math.ceil(1 / rebuildRate);
};

/**
 * Calculate how many segments are filled based on progress
 * @param {number} progress - Current rebuild progress (0.0 - 0.999)
 * @param {number} segmentCount - Total segments
 * @returns {number} Number of completely filled segments
 */
const calculateFilledSegments = (progress, segmentCount) => {
  return Math.floor(progress * segmentCount);
};

/**
 * AvailabilityDots Component
 * Displays a row of dots showing drone deployment availability
 *
 * @param {Object} availability - Drone availability state from droneAvailability
 *   - readyCount: Number ready to deploy
 *   - inPlayCount: Number currently on board
 *   - rebuildingCount: Number being rebuilt
 *   - rebuildProgress: Fractional progress (0.0 - 0.999)
 *   - copyLimit: Max simultaneous copies
 *   - rebuildRate: Rate per round
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
  gap = 2,
  enableDebug = false
}) => {
  // Use explicit copyLimit or fall back to availability.copyLimit
  const limit = explicitCopyLimit ?? availability?.copyLimit ?? 0;

  // Default to all ready if no availability data (pre-combat state)
  const readyCount = availability?.readyCount ?? limit;
  const inPlayCount = availability?.inPlayCount ?? 0;
  const rebuildingCount = availability?.rebuildingCount ?? 0;
  const rebuildProgress = availability?.rebuildProgress ?? 0;
  const rebuildRate = availability?.rebuildRate ?? 1.0;

  if (enableDebug) {
    debugLog('AVAILABILITY', `[${droneName}] AvailabilityDots render:`, {
      explicitCopyLimit,
      limit,
      availability,
      readyCount,
      inPlayCount,
      rebuildingCount
    });
  }

  // NEW MODEL: Calculate deployment availability
  const availableSlots = Math.max(0, limit - inPlayCount); // How many MORE can be deployed
  const deployablePips = Math.min(readyCount, availableSlots);
  const blockedOutlines = Math.max(0, readyCount - deployablePips); // Ready but can't deploy

  // Only rebuildRate slots can actively rebuild per round
  // Use ceiling to handle fractional rates (rate 1.5 = up to 2 active)
  const activelyRebuilding = Math.min(rebuildingCount, Math.ceil(rebuildRate));
  const queuedSlots = rebuildingCount - activelyRebuilding;

  const rebuildingSlots = activelyRebuilding;
  const inactiveSlots = Math.max(0, limit - readyCount - rebuildingCount) + queuedSlots;

  // Calculate segment info for rebuilding dots
  const segmentCount = calculateSegmentCount(rebuildRate);
  const filledSegments = calculateFilledSegments(rebuildProgress, segmentCount);

  // Build dots array
  const dots = [];

  // 1. Deployable pips (solid green)
  for (let i = 0; i < deployablePips; i++) {
    dots.push({ type: 'deployable', index: dots.length });
  }

  // 2. Blocked outlines (green outline)
  for (let i = 0; i < blockedOutlines; i++) {
    dots.push({ type: 'blocked', index: dots.length });
  }

  // 3. Rebuilding dots (grey with segments, current segment pulsing)
  for (let i = 0; i < rebuildingSlots; i++) {
    dots.push({
      type: 'rebuilding',
      index: dots.length,
      segmentCount,
      filledSegments
    });
  }

  // 4. Inactive dots (grey outline)
  for (let i = 0; i < inactiveSlots; i++) {
    dots.push({ type: 'inactive', index: dots.length });
  }

  if (enableDebug) {
    debugLog('AVAILABILITY', `[${droneName}] Dots array built:`, {
      dotsCount: dots.length,
      deployable: deployablePips,
      blocked: blockedOutlines,
      rebuilding: rebuildingSlots,
      inactive: inactiveSlots,
      queuedSlots
    });
  }

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
          size={dotSize}
          segmentCount={dot.segmentCount}
          filledSegments={dot.filledSegments}
        />
      ))}
    </div>
  );
};

/**
 * Individual Dot Component
 */
const Dot = ({ type, size, segmentCount = 1, filledSegments = 0 }) => {
  const baseClasses = 'rounded-full transition-all duration-300';

  // Build data attributes for testing
  const dataAttrs = {
    'data-dot-type': type
  };

  if (type === 'rebuilding') {
    dataAttrs['data-segment-count'] = String(segmentCount);
    dataAttrs['data-filled-segments'] = String(filledSegments);
  }

  // Styles based on dot type
  if (type === 'deployable') {
    // Solid green filled
    return (
      <div
        className={`${baseClasses} bg-green-500`}
        style={{ width: size, height: size }}
        {...dataAttrs}
      />
    );
  }

  if (type === 'blocked') {
    // Green outline (ready but can't deploy)
    return (
      <div
        className={`${baseClasses} border-2 border-green-500 bg-transparent`}
        style={{ width: size, height: size }}
        {...dataAttrs}
      />
    );
  }

  if (type === 'rebuilding') {
    // Grey segmented circle with current segment pulsing
    return (
      <SegmentedDot
        size={size}
        segmentCount={segmentCount}
        filledSegments={filledSegments}
        dataAttrs={dataAttrs}
      />
    );
  }

  // Inactive - grey outline
  return (
    <div
      className={`${baseClasses} border border-gray-600 bg-transparent`}
      style={{ width: size, height: size }}
      {...dataAttrs}
    />
  );
};

/**
 * Segmented Dot for rebuilding visualization
 * Uses CSS conic-gradient for segment display
 */
const SegmentedDot = ({ size, segmentCount, filledSegments, dataAttrs }) => {
  // Calculate the angle for each segment
  const segmentAngle = 360 / segmentCount;

  // Current segment is the one being worked on (after filled segments)
  const currentSegmentIndex = filledSegments;

  // Build gradient stops for conic-gradient
  // Gradient starts from top (-90deg or 270deg in CSS)
  let gradientStops = [];

  for (let i = 0; i < segmentCount; i++) {
    const startAngle = i * segmentAngle;
    const endAngle = (i + 1) * segmentAngle;

    if (i < filledSegments) {
      // Filled segment - static grey (completed)
      gradientStops.push(`#6b7280 ${startAngle}deg ${endAngle}deg`);
    } else if (i === currentSegmentIndex) {
      // Current segment - transparent so pulsing overlay is visible
      gradientStops.push(`transparent ${startAngle}deg ${endAngle}deg`);
    } else {
      // Future segment - empty
      gradientStops.push(`transparent ${startAngle}deg ${endAngle}deg`);
    }
  }

  const gradient = `conic-gradient(from -90deg, ${gradientStops.join(', ')})`;

  return (
    <div
      className="relative rounded-full border border-gray-500"
      style={{
        width: size,
        height: size
      }}
      {...dataAttrs}
    >
      {/* Inject keyframes for pulse animation */}
      <style>{pulseKeyframes}</style>
      {/* Background gradient showing segments */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient
        }}
      />
      {/* Pulsing overlay for current segment - stronger pulse effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: buildPulsingGradient(segmentCount, currentSegmentIndex),
          animation: 'pulse-strong 1.5s ease-in-out infinite'
        }}
      />
    </div>
  );
};

/**
 * Build a gradient for the pulsing animation on current segment
 * Shows the full segment as pulsing (work in progress)
 */
const buildPulsingGradient = (segmentCount, currentIndex) => {
  const segmentAngle = 360 / segmentCount;

  let stops = [];
  for (let i = 0; i < segmentCount; i++) {
    const sAngle = i * segmentAngle;
    const eAngle = (i + 1) * segmentAngle;

    if (i === currentIndex) {
      // Full segment pulsing
      stops.push(`#9ca3af ${sAngle}deg ${eAngle}deg`);
    } else {
      stops.push(`transparent ${sAngle}deg ${eAngle}deg`);
    }
  }

  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
};

export default AvailabilityDots;
