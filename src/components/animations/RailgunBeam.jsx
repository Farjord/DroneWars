// ========================================
// RAILGUN BEAM COMPONENT
// ========================================
// Instant beam effect with white core + cyan outline
// Staggered fade animation
// Single straight line from turret through drone (extends further if overflow)

import React, { useState, useEffect } from 'react';

/**
 * RAILGUN BEAM EFFECT
 * Renders a straight beam from start to end position
 * @param {Object} startPos - Starting position {x, y} (turret gun)
 * @param {Object} endPos - Ending position {x, y} (drone center or extended)
 * @param {number} attackValue - Attack value to scale beam thickness (default: 8)
 * @param {number} duration - Total duration in ms (default: 1000)
 * @param {Function} onComplete - Callback when animation completes
 */
const RailgunBeam = ({ startPos, endPos, attackValue = 8, duration = 1000, onComplete }) => {
  const [whiteOpacity, setWhiteOpacity] = useState(1);
  const [cyanOpacity, setCyanOpacity] = useState(1);

  useEffect(() => {
    const whiteFadeStart = 0;
    const whiteFadeDuration = 500;
    const cyanFadeStart = 300;
    const cyanFadeDuration = 500;

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;

      // White core fade (0-500ms)
      if (elapsed >= whiteFadeStart && elapsed < whiteFadeStart + whiteFadeDuration) {
        const progress = (elapsed - whiteFadeStart) / whiteFadeDuration;
        setWhiteOpacity(1 - progress);
      } else if (elapsed >= whiteFadeStart + whiteFadeDuration) {
        setWhiteOpacity(0);
      }

      // Cyan outline fade (300-800ms)
      if (elapsed >= cyanFadeStart && elapsed < cyanFadeStart + cyanFadeDuration) {
        const progress = (elapsed - cyanFadeStart) / cyanFadeDuration;
        setCyanOpacity(1 - progress);
      } else if (elapsed >= cyanFadeStart + cyanFadeDuration) {
        setCyanOpacity(0);
      }

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }, [duration, onComplete]);

  if (!startPos || !endPos) {
    return null;
  }

  // Calculate beam geometry
  const dx = endPos.x - startPos.x;
  const dy = endPos.y - startPos.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Scale thickness based on attack value (same formula as LaserEffect)
  const thickness = Math.max(3, 2 + attackValue * 1.5);
  const glowSize = thickness * 2;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${startPos.x}px`,
        top: `${startPos.y}px`,
        width: `${length}px`,
        height: `${thickness}px`,
        transformOrigin: '0 50%',
        transform: `rotate(${angle}deg)`,
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'opacity 150ms ease-in-out'
      }}
    >
      {/* Cyan outline (outer glow) */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to right, rgba(34, 211, 238, 0), rgba(34, 211, 238, 1) 10%, rgba(34, 211, 238, 1) 90%, rgba(34, 211, 238, 0))',
          boxShadow: `0 0 ${glowSize}px rgba(34, 211, 238, 0.8), 0 0 ${glowSize * 2}px rgba(34, 211, 238, 0.4)`,
          opacity: cyanOpacity,
          transition: 'opacity 150ms ease-in-out'
        }}
      />

      {/* White core (inner bright line) */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '40%',
          top: '30%',
          background: 'linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.9) 20%, rgba(255, 255, 255, 0.9) 80%, rgba(255, 255, 255, 0))',
          filter: 'blur(1px)',
          opacity: whiteOpacity,
          transition: 'opacity 150ms ease-in-out'
        }}
      />
    </div>
  );
};

export default RailgunBeam;
