// ========================================
// LASER EFFECT COMPONENT
// ========================================
// Visual component for rendering laser beam attack animations

import React, { useState, useEffect } from 'react';

/**
 * LASER EFFECT COMPONENT
 * Renders an animated laser beam from source to target position.
 * Laser thickness scales based on attack value.
 * @param {Object} startPos - Starting position {x, y}
 * @param {Object} endPos - Ending position {x, y}
 * @param {number} attackValue - Attack value to scale laser thickness (default: 1)
 * @param {number} duration - Duration in milliseconds (default: 500)
 * @param {Function} onComplete - Callback when animation completes
 */
const LaserEffect = ({ startPos, endPos, attackValue = 1, duration = 500, onComplete }) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in quickly
    setTimeout(() => setOpacity(1), 50);

    // Fade out and complete
    const fadeOutTime = duration * 0.7; // Start fading at 70% of duration
    setTimeout(() => setOpacity(0), fadeOutTime);

    // Complete
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  // Calculate laser geometry
  const dx = endPos.x - startPos.x;
  const dy = endPos.y - startPos.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Scale thickness based on attack value (min 3px, scales up with attack)
  const thickness = Math.max(3, 2 + attackValue * 1.5);

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
        zIndex: 9998,
        opacity: opacity,
        transition: `opacity ${duration * 0.15}ms ease-in-out`
      }}
    >
      {/* Core laser beam */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to right, rgba(255, 0, 0, 0), rgba(255, 0, 0, 1) 10%, rgba(255, 0, 0, 1) 90%, rgba(255, 0, 0, 0))',
          boxShadow: `0 0 ${thickness * 2}px rgba(255, 0, 0, 0.8), 0 0 ${thickness * 4}px rgba(255, 0, 0, 0.4)`,
          animation: `laserPulse ${duration}ms ease-in-out`
        }}
      />

      {/* Bright core */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '40%',
          top: '30%',
          background: 'linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.9) 20%, rgba(255, 255, 255, 0.9) 80%, rgba(255, 255, 255, 0))',
          filter: 'blur(1px)'
        }}
      />
    </div>
  );
};

export default LaserEffect;
