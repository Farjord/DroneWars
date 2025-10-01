// ========================================
// TELEPORT EFFECT COMPONENT
// ========================================
// Visual component for rendering drone teleport-in animation

import React, { useState, useEffect } from 'react';

/**
 * TELEPORT EFFECT COMPONENT
 * Renders a particle-based teleport animation at specified coordinates.
 * Shows expanding rings and energy particles for a sci-fi teleport effect.
 * @param {number} top - Y position in pixels
 * @param {number} left - X position in pixels
 * @param {number} duration - Duration in milliseconds (default: 800)
 * @param {string} color - Color of the teleport effect (default: cyan for player, pink for opponent)
 * @param {Function} onComplete - Callback when animation completes
 */
const TeleportEffect = ({ top, left, duration = 800, color = '#00ffff', onComplete }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particles in a circular pattern
    const newParticles = [];
    const particleCount = 16;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      newParticles.push({
        id: i,
        angle,
        delay: (i / particleCount) * 200 // Stagger the particles
      });
    }
    setParticles(newParticles);

    // Complete callback
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: '120px',
        height: '180px',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      {/* Expanding rings */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '100%',
          height: '100%',
          transform: 'translate(-50%, -50%)',
          animation: `teleportRing ${duration}ms ease-out forwards`
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '20px',
            height: '20px',
            border: `2px solid ${color}`,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `teleportExpand ${duration}ms ease-out forwards`,
            boxShadow: `0 0 20px ${color}`
          }}
        />
      </div>

      {/* Second ring with delay */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '100%',
          height: '100%',
          transform: 'translate(-50%, -50%)',
          animation: `teleportRing ${duration}ms ease-out ${duration * 0.2}ms forwards`
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '20px',
            height: '20px',
            border: `2px solid ${color}`,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `teleportExpand ${duration}ms ease-out ${duration * 0.2}ms forwards`,
            boxShadow: `0 0 15px ${color}`
          }}
        />
      </div>

      {/* Energy particles spiraling in */}
      {particles.map(particle => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '6px',
            height: '6px',
            backgroundColor: color,
            borderRadius: '50%',
            boxShadow: `0 0 8px ${color}`,
            '--angle': `${particle.angle}rad`,
            animation: `teleportParticle ${duration}ms ease-in ${particle.delay}ms forwards`
          }}
        />
      ))}

      {/* Central glow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '40px',
          height: '40px',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${color}cc 0%, ${color}00 70%)`,
          animation: `teleportGlow ${duration}ms ease-in-out forwards`
        }}
      />
    </div>
  );
};

export default TeleportEffect;
