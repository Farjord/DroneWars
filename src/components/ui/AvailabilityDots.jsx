// ========================================
// AVAILABILITY DOTS COMPONENT
// ========================================
// Renders dots representing drone deployment availability
// Part of the Drone Availability & Rebuild System (NEW MODEL)
//
// Dot States (show deployment availability, not drone location):
// - Deployable: Solid green pip (ready AND under in-play limit)
// - Blocked: Green outline (ready BUT at deployment limit)
// - Rebuilding-Deployable: Segmented solid green, flashing (will be deployable when ready)
// - Rebuilding-Blocked: Segmented green outline, flashing (will be blocked when ready)
// - Inactive: Grey outline (slot not producing / queued)
// - N/A: Text display for non-deployable drones (limit === 999)

import React from 'react';
import { debugLog } from '../../utils/debugLogger.js';

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

  // Handle non-deployable drones (limit === 999)
  if (limit === 999) {
    return (
      <span className="text-gray-500 text-xs font-medium">N/A</span>
    );
  }

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

  // Calculate deployment availability
  const availableSlots = Math.max(0, limit - inPlayCount); // How many MORE can be deployed
  let deployablePips = Math.min(readyCount, availableSlots);
  let blockedOutlines = Math.max(0, readyCount - deployablePips); // Ready but can't deploy

  // Only rebuildRate slots can actively rebuild per round
  // Use ceiling to handle fractional rates (rate 1.5 = up to 2 active)
  const activelyRebuilding = Math.min(rebuildingCount, Math.ceil(rebuildRate));
  const queuedSlots = rebuildingCount - activelyRebuilding;

  const rebuildingSlots = activelyRebuilding;

  // Cap ready dots so total doesn't exceed limit when combined with rebuilding
  const maxReadySlots = Math.max(0, limit - rebuildingSlots);
  if (deployablePips + blockedOutlines > maxReadySlots) {
    deployablePips = Math.min(deployablePips, maxReadySlots);
    blockedOutlines = Math.min(blockedOutlines, maxReadySlots - deployablePips);
  }

  const inactiveSlots = Math.max(0, limit - deployablePips - blockedOutlines - rebuildingSlots);

  // Calculate segment info for rebuilding dots
  const segmentCount = calculateSegmentCount(rebuildRate);
  const filledSegments = calculateFilledSegments(rebuildProgress, segmentCount);

  // Calculate future available slots for deployment prediction
  // When rebuilding completes, will this drone be deployable?
  const futureAvailableSlots = Math.max(0, limit - inPlayCount);

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

  // 3. Rebuilding dots with deployment prediction
  // Determine if each rebuilding slot will be deployable when ready
  for (let i = 0; i < rebuildingSlots; i++) {
    // readyCount drones will claim slots first, then rebuilding drones in order
    const willBeDeployable = readyCount + i < futureAvailableSlots;
    dots.push({
      type: willBeDeployable ? 'rebuilding-deployable' : 'rebuilding-blocked',
      index: dots.length,
      segmentCount,
      filledSegments
    });
  }

  // 4. Inactive dots (grey outline) - queued slots waiting to rebuild
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

  if (type === 'rebuilding-deployable' || type === 'rebuilding-blocked') {
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

  if (type === 'rebuilding-deployable') {
    // Green segmented circle with current segment pulsing (will be deployable)
    return (
      <SegmentedDot
        size={size}
        segmentCount={segmentCount}
        filledSegments={filledSegments}
        willBeDeployable={true}
        dataAttrs={dataAttrs}
      />
    );
  }

  if (type === 'rebuilding-blocked') {
    // Green outline segmented circle with current segment pulsing (will be blocked)
    return (
      <SegmentedDot
        size={size}
        segmentCount={segmentCount}
        filledSegments={filledSegments}
        willBeDeployable={false}
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
 * Radar sweep effect: fills clockwise, then empties clockwise
 * Supports fractional rebuild rates with:
 * - Static completed segments
 * - Animated current segment
 * - Empty future segments
 * Style based on deployment prediction:
 * - willBeDeployable: true = solid pie fill
 * - willBeDeployable: false = ring/border only (hollow center)
 */
const SegmentedDot = ({ size, segmentCount, filledSegments, willBeDeployable, dataAttrs }) => {
  const center = size / 2;
  const segmentAngle = 360 / segmentCount;

  // Current segment position (the one being animated)
  // Start from 90deg (6 o'clock/bottom) so segment 0 is the LEFT half
  // Drawing clockwise from bottom goes UP the left side
  const currentSegmentIndex = filledSegments;
  const currentSegmentStartAngle = 90 + (currentSegmentIndex * segmentAngle);
  const currentSegmentEndAngle = currentSegmentStartAngle + segmentAngle;

  if (!willBeDeployable) {
    // BLOCKED: Ring style (hollow center)
    const strokeWidth = 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const segmentArcLength = circumference / segmentCount;
    const completedArcLength = filledSegments * segmentArcLength;

    return (
      <svg width={size} height={size} {...dataAttrs}>
        {/* Background grey ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#4b5563"
          strokeWidth={1}
        />

        {/* Completed segments - static green ring */}
        {filledSegments > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            strokeDasharray={`${completedArcLength} ${circumference - completedArcLength}`}
            style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
          />
        )}

        {/* Current segment - animated green ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          className="availability-fill-empty-animation"
          style={{
            '--arc-length': segmentArcLength,
            '--circumference': circumference,
            '--start-rotation': `${currentSegmentStartAngle}deg`,
            '--end-rotation': `${currentSegmentEndAngle}deg`
          }}
        />
      </svg>
    );
  }

  // DEPLOYABLE: Pie fill style (solid from center to edge)
  const pieRadius = size / 4;
  const pieStrokeWidth = size / 2;
  const pieCircumference = 2 * Math.PI * pieRadius;
  const pieSegmentArcLength = pieCircumference / segmentCount;
  const pieCompletedArcLength = filledSegments * pieSegmentArcLength;

  return (
    <svg width={size} height={size} {...dataAttrs}>
      {/* Background grey outline */}
      <circle
        cx={center}
        cy={center}
        r={center - 0.5}
        fill="transparent"
        stroke="#4b5563"
        strokeWidth={1}
      />

      {/* Completed segments - static green pie fill */}
      {filledSegments > 0 && (
        <circle
          cx={center}
          cy={center}
          r={pieRadius}
          fill="transparent"
          stroke="#22c55e"
          strokeWidth={pieStrokeWidth}
          strokeDasharray={`${pieCompletedArcLength} ${pieCircumference - pieCompletedArcLength}`}
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        />
      )}

      {/* Current segment - animated green pie fill */}
      <circle
        cx={center}
        cy={center}
        r={pieRadius}
        fill="transparent"
        stroke="#22c55e"
        strokeWidth={pieStrokeWidth}
        className="availability-fill-empty-animation"
        style={{
          '--arc-length': pieSegmentArcLength,
          '--circumference': pieCircumference,
          '--start-rotation': `${currentSegmentStartAngle}deg`,
          '--end-rotation': `${currentSegmentEndAngle}deg`
        }}
      />
    </svg>
  );
};

export default AvailabilityDots;
