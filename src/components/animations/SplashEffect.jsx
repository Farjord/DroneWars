// ========================================
// SPLASH EFFECT COMPONENT
// ========================================
// Visual component for rendering splash damage shockwave
// Shows expanding explosion ring from impact point

import React, { useState, useEffect } from 'react';

/**
 * SPLASH EFFECT COMPONENT
 * Renders an animated shockwave that expands from the impact point
 * Used for SPLASH damage mechanic where damage spreads to adjacent drones
 * @param {Object} centerPos - Center position of explosion {x, y}
 * @param {number} duration - Duration in milliseconds (default: 1000)
 * @param {Function} onComplete - Callback when animation completes
 */
const SplashEffect = ({ centerPos, duration = 1000, onComplete }) => {
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(0.1);

  useEffect(() => {
    // Expand animation
    const expandTimer = setTimeout(() => {
      setScale(2.5);
    }, 50);

    // Fade out animation
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, duration * 0.7);

    // Complete
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        left: `${centerPos.x}px`,
        top: `${centerPos.y}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9997,
        width: '200px',
        height: '200px'
      }}
    >
      {/* Outer shockwave ring */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          borderRadius: '50%',
          border: '3px solid rgba(255, 165, 0, 0.8)',
          opacity: opacity,
          transition: `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
          boxShadow: `
            0 0 20px rgba(255, 165, 0, 0.8),
            inset 0 0 20px rgba(255, 165, 0, 0.4)
          `
        }}
      />

      {/* Middle shockwave ring (delayed) */}
      <div
        style={{
          position: 'absolute',
          width: '80%',
          height: '80%',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale * 0.8})`,
          borderRadius: '50%',
          border: '2px solid rgba(255, 200, 0, 0.6)',
          opacity: opacity * 0.8,
          transition: `all ${duration * 1.1}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
          boxShadow: '0 0 15px rgba(255, 200, 0, 0.6)'
        }}
      />

      {/* Core explosion flash */}
      <div
        style={{
          position: 'absolute',
          width: '60%',
          height: '60%',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale * 0.4})`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(255, 165, 0, 0.6) 40%, rgba(255, 165, 0, 0) 70%)',
          opacity: opacity,
          transition: `all ${duration * 0.8}ms ease-out`,
          boxShadow: `
            0 0 30px rgba(255, 165, 0, 1),
            0 0 60px rgba(255, 165, 0, 0.5)
          `
        }}
      />

      {/* Impact particles */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <div
          key={angle}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            left: '50%',
            top: '50%',
            borderRadius: '50%',
            background: 'rgba(255, 165, 0, 0.9)',
            transform: `
              translate(-50%, -50%)
              rotate(${angle}deg)
              translateY(${scale * -40}px)
            `,
            opacity: opacity * 0.7,
            transition: `all ${duration}ms ease-out`,
            boxShadow: '0 0 8px rgba(255, 165, 0, 0.8)'
          }}
        />
      ))}

      {/* Secondary particle ring */}
      {[30, 90, 150, 210, 270, 330].map((angle) => (
        <div
          key={`secondary-${angle}`}
          style={{
            position: 'absolute',
            width: '6px',
            height: '6px',
            left: '50%',
            top: '50%',
            borderRadius: '50%',
            background: 'rgba(255, 200, 0, 0.8)',
            transform: `
              translate(-50%, -50%)
              rotate(${angle}deg)
              translateY(${scale * -30}px)
            `,
            opacity: opacity * 0.5,
            transition: `all ${duration * 1.2}ms ease-out`,
            boxShadow: '0 0 6px rgba(255, 200, 0, 0.6)'
          }}
        />
      ))}
    </div>
  );
};

export default SplashEffect;
