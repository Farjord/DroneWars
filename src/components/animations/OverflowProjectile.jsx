// ========================================
// OVERFLOW PROJECTILE COMPONENT
// ========================================
// Visual component for rendering overflow damage projectile
// Shows energy ball traveling from source → drone → ship section (if overflow)

import React, { useState, useEffect } from 'react';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * OVERFLOW PROJECTILE COMPONENT
 * Renders an animated energy projectile that travels through multiple targets
 * Used for OVERFLOW damage mechanic where excess damage continues to ship
 * @param {Object} startPos - Starting position {x, y}
 * @param {Object} dronePos - Drone target position {x, y}
 * @param {Object} shipPos - Ship section position {x, y} (if overflow)
 * @param {boolean} hasOverflow - Whether overflow damage occurred
 * @param {boolean} isPiercing - Whether damage is piercing (affects color)
 * @param {number} duration - Total duration in milliseconds (default: 1200)
 * @param {Function} onDroneImpact - Callback when projectile hits drone
 * @param {Function} onComplete - Callback when animation completes
 */
const OverflowProjectile = ({
  startPos,
  dronePos,
  shipPos,
  hasOverflow = false,
  isPiercing = false,
  duration = 1200,
  onDroneImpact,
  onComplete
}) => {
  const [phase, setPhase] = useState('travel-to-drone'); // 'travel-to-drone' | 'impact-drone' | 'travel-to-ship' | 'complete'
  const [position, setPosition] = useState(startPos);

  useEffect(() => {
    const phaseDuration = hasOverflow ? duration / 3 : duration / 2;

    // Phase 1: Travel to drone
    const travelTimer1 = setTimeout(() => {
      setPosition(dronePos);
      setPhase('impact-drone');

      // Trigger damage animations on impact
      debugLog('ANIMATIONS', '🎯 [OVERFLOW] Projectile hit drone, triggering onDroneImpact callback', {
        hasCallback: !!onDroneImpact,
        hasOverflow,
        isPiercing
      });

      onDroneImpact?.();
    }, phaseDuration);

    // Phase 2: Impact at drone (brief pause)
    const impactTimer = setTimeout(() => {
      if (hasOverflow) {
        setPhase('travel-to-ship');
      } else {
        setPhase('complete');
      }
    }, phaseDuration * 2);

    // Phase 3: Travel to ship (if overflow)
    let travelTimer2;
    if (hasOverflow) {
      travelTimer2 = setTimeout(() => {
        setPosition(shipPos);
        setPhase('complete');
      }, phaseDuration * 2.5);
    }

    // Complete
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(travelTimer1);
      clearTimeout(impactTimer);
      if (travelTimer2) clearTimeout(travelTimer2);
      clearTimeout(completeTimer);
    };
  }, [startPos, dronePos, shipPos, hasOverflow, duration, onDroneImpact, onComplete]);

  // Color based on piercing property
  const color = isPiercing ? 'cyan' : 'orange';
  const rgbColor = isPiercing ? '0, 255, 255' : '255, 165, 0';

  // Size scales based on phase
  const size = phase === 'impact-drone' ? 40 : 24;
  const glowSize = phase === 'impact-drone' ? 80 : 50;

  // Calculate position based on phase
  let currentX = position.x;
  let currentY = position.y;

  if (phase === 'travel-to-ship' && hasOverflow) {
    // Interpolate between drone and ship
    const progress = 0.5; // Mid-travel
    currentX = dronePos.x + (shipPos.x - dronePos.x) * progress;
    currentY = dronePos.y + (shipPos.y - dronePos.y) * progress;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${currentX}px`,
        top: `${currentY}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: `all ${duration / 3}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        opacity: phase === 'complete' ? 0 : 1
      }}
    >
      {/* Outer glow */}
      <div
        style={{
          position: 'absolute',
          width: `${glowSize}px`,
          height: `${glowSize}px`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${rgbColor}, 0.6), rgba(${rgbColor}, 0) 70%)`,
          animation: `pulse ${duration / 4}ms infinite alternate`
        }}
      />

      {/* Core energy ball */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), ${color} 60%)`,
          boxShadow: `
            0 0 ${size / 2}px ${color},
            0 0 ${size}px rgba(${rgbColor}, 0.8),
            inset 0 0 ${size / 4}px rgba(255, 255, 255, 0.5)
          `,
          animation: phase === 'impact-drone' ? `impact ${duration / 6}ms ease-out` : 'none'
        }}
      />

      {/* Electric arcs for piercing */}
      {isPiercing && (
        <div
          style={{
            position: 'absolute',
            width: '120%',
            height: '120%',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `1px solid rgba(${rgbColor}, 0.6)`,
            animation: `spin ${duration / 2}ms linear infinite`
          }}
        />
      )}
    </div>
  );
};

// CSS animations would be injected or in global styles
const styles = `
@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.3; }
}

@keyframes impact {
  0% { transform: scale(1); }
  50% { transform: scale(1.5); }
  100% { transform: scale(1); }
}

@keyframes spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
`;

export default OverflowProjectile;
