// ========================================
// INTERCEPTION TARGET LINE COMPONENT
// ========================================
// Renders a pulsing dotted red line between attacker and target
// during interception opportunity modal display.

import React, { useState, useEffect } from 'react';
import { getElementCenter } from '../../utils/gameUtils.js';

/**
 * INTERCEPTION TARGET LINE COMPONENT
 * Shows a pulsing dotted red line between attacker drone and its target.
 * @param {Object} attackDetails - Contains attacker, target, targetType, lane
 * @param {Object} droneRefs - Refs to drone DOM elements
 * @param {Object} shipSectionRefs - Refs to ship section DOM elements
 * @param {Object} gameAreaRef - Ref to game area container
 * @param {boolean} visible - Whether line should be displayed
 */
const InterceptionTargetLine = ({ attackDetails, droneRefs, shipSectionRefs, gameAreaRef, visible }) => {
  const [positions, setPositions] = useState({ start: null, end: null });

  useEffect(() => {
    if (!visible || !attackDetails || !gameAreaRef?.current) {
      setPositions({ start: null, end: null });
      return;
    }

    const updatePositions = () => {
      const { attacker, target, targetType } = attackDetails;

      // Debug: log available drone refs
      console.log('[InterceptionTargetLine] Looking for attacker:', attacker?.id);
      console.log('[InterceptionTargetLine] Available droneRefs keys:', Object.keys(droneRefs?.current || {}));

      // Get attacker position (opponent's drone)
      const attackerEl = droneRefs?.current?.[attacker?.id];
      const attackerPos = getElementCenter(attackerEl, gameAreaRef.current);

      console.log('[InterceptionTargetLine] Attacker element found:', !!attackerEl);
      console.log('[InterceptionTargetLine] Attacker position:', attackerPos);

      // Get target position (drone or ship section)
      let targetPos = null;
      if (targetType === 'drone') {
        const targetEl = droneRefs?.current?.[target?.id];
        targetPos = getElementCenter(targetEl, gameAreaRef.current);
        console.log('[InterceptionTargetLine] Target drone element found:', !!targetEl);
      } else if (targetType === 'section' && target?.name) {
        // Section refs use format: "local-{sectionName}" or "opponent-{sectionName}"
        // For interception, the target is the local player's own section being defended
        const sectionKey = `local-${target.name}`;
        const sectionEl = shipSectionRefs?.current?.[sectionKey];
        targetPos = getElementCenter(sectionEl, gameAreaRef.current);
        console.log('[InterceptionTargetLine] Target section element found:', !!sectionEl);
      }

      console.log('[InterceptionTargetLine] Target position:', targetPos);

      if (attackerPos && targetPos) {
        setPositions({ start: attackerPos, end: targetPos });
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
  }, [visible, attackDetails, droneRefs, shipSectionRefs, gameAreaRef]);

  if (!visible || !positions.start || !positions.end) return null;

  const { start, end } = positions;

  // Create path for the line
  const pathD = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 45 }}
    >
      <defs>
        {/* Glow filter for the line */}
        <filter id="interception-glow" x="-50%" y="-50%" width="200%" height="200%">
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
        stroke="#ef4444"
        strokeWidth="6"
        strokeDasharray="12 8"
        fill="none"
        filter="url(#interception-glow)"
        opacity="0.4"
      />

      {/* Core dotted line */}
      <path
        d={pathD}
        stroke="#ef4444"
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

      {/* Pulsing circles at endpoints */}
      <circle cx={start.x} cy={start.y} r="8" fill="#ef4444" opacity="0.6">
        <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx={start.x} cy={start.y} r="4" fill="#ef4444" opacity="0.9" />

      <circle cx={end.x} cy={end.y} r="8" fill="#ef4444" opacity="0.6">
        <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx={end.x} cy={end.y} r="4" fill="#ef4444" opacity="0.9" />
    </svg>
  );
};

export default InterceptionTargetLine;
