// ========================================
// INTERCEPTION SELECTION LINE COMPONENT
// ========================================
// Renders a pulsing dotted blue line between selected interceptor and attacker
// Shows the player's chosen interception path during battlefield selection mode.

import React, { useState, useEffect } from 'react';
import { getElementCenter } from '../../utils/gameUtils.js';

/**
 * INTERCEPTION SELECTION LINE COMPONENT
 * Shows a pulsing dotted blue line between selected interceptor drone and attacker.
 * Similar to InterceptionTargetLine but shows the interception choice rather than attack path.
 * @param {Object} interceptor - The selected interceptor drone
 * @param {Object} attacker - The attacking drone
 * @param {Object} droneRefs - Refs to drone DOM elements
 * @param {Object} gameAreaRef - Ref to game area container
 * @param {boolean} visible - Whether line should be displayed
 */
const InterceptionSelectionLine = ({ interceptor, attacker, droneRefs, gameAreaRef, visible }) => {
  const [positions, setPositions] = useState({ start: null, end: null });

  useEffect(() => {
    if (!visible || !interceptor || !attacker || !gameAreaRef?.current) {
      setPositions({ start: null, end: null });
      return;
    }

    const updatePositions = () => {
      // Get interceptor position (player's drone - start of line)
      const interceptorEl = droneRefs?.current?.[interceptor?.id];
      const interceptorPos = getElementCenter(interceptorEl, gameAreaRef.current);

      // Get attacker position (opponent's drone - end of line)
      const attackerEl = droneRefs?.current?.[attacker?.id];
      const attackerPos = getElementCenter(attackerEl, gameAreaRef.current);

      if (interceptorPos && attackerPos) {
        setPositions({ start: interceptorPos, end: attackerPos });
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      updatePositions();
    });

    // Recalculate on resize
    window.addEventListener('resize', updatePositions);

    // Also set up an interval to keep positions updated (in case of scroll/layout changes)
    const intervalId = setInterval(updatePositions, 100);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePositions);
      clearInterval(intervalId);
    };
  }, [visible, interceptor, attacker, droneRefs, gameAreaRef]);

  if (!visible || !positions.start || !positions.end) return null;

  const { start, end } = positions;

  // Create path for the line (interceptor -> attacker)
  const pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  // Blue color for interception selection (vs red for attack)
  const lineColor = '#00aaff';

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 46 }}
    >
      <defs>
        {/* Glow filter for the line */}
        <filter id="interception-selection-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow line */}
      <path
        d={pathD}
        stroke={lineColor}
        strokeWidth="6"
        strokeDasharray="12 8"
        fill="none"
        filter="url(#interception-selection-glow)"
        opacity="0.4"
      />

      {/* Core dotted line */}
      <path
        d={pathD}
        stroke={lineColor}
        strokeWidth="3"
        strokeDasharray="12 8"
        fill="none"
        opacity="0.9"
      >
        {/* Animate the dash offset for flowing effect */}
        <animate
          attributeName="stroke-dashoffset"
          values="0;-40"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>

      {/* Pulsing circles at endpoints - interceptor (start) */}
      <circle cx={start.x} cy={start.y} r="8" fill={lineColor} opacity="0.6">
        <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx={start.x} cy={start.y} r="4" fill={lineColor} opacity="0.9" />

      {/* Pulsing circles at endpoints - attacker (end) */}
      <circle cx={end.x} cy={end.y} r="8" fill={lineColor} opacity="0.6">
        <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx={end.x} cy={end.y} r="4" fill={lineColor} opacity="0.9" />
    </svg>
  );
};

export default InterceptionSelectionLine;
