// ========================================
// EXPLOSION EFFECT COMPONENT
// ========================================
// Visual component for rendering explosion animations

import React, { useState, useEffect } from 'react';

/**
 * EXPLOSION EFFECT COMPONENT
 * Renders a particle-based explosion effect at specified coordinates.
 * Supports configurable sizes for different explosion scales.
 * @param {number} top - Y position in pixels
 * @param {number} left - X position in pixels
 * @param {string} size - Size variant: 'small' or 'large' (default: 'large')
 */
const ExplosionEffect = ({ top, left, size = 'large' }) => {
  const [particles, setParticles] = useState([]);

  // Size configuration for different explosion scales
  const sizeConfig = {
    small: {
      particleCount: 8,
      radiusMin: 30,
      radiusMax: 50,
      particleSizeMin: 4,
      particleSizeMax: 8,
      duration: 500
    },
    large: {
      particleCount: 15,
      radiusMin: 60,
      radiusMax: 100,
      particleSizeMin: 8,
      particleSizeMax: 16,
      duration: 800
    }
  };

  const config = sizeConfig[size] || sizeConfig.large;

  useEffect(() => {
    // Generate particles with random directions and speeds
    const newParticles = [];
    for (let i = 0; i < config.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / config.particleCount;
      const radius = config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin);
      const particleSize = config.particleSizeMin + Math.random() * (config.particleSizeMax - config.particleSizeMin);

      newParticles.push({
        id: i,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: particleSize,
        opacity: 1
      });
    }
    setParticles(newParticles);
  }, [config.particleCount, config.radiusMin, config.radiusMax, config.particleSizeMin, config.particleSizeMax]);

  return (
    <div
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        pointerEvents: 'none',
        zIndex: 9999
      }}
    >
      {particles.map(particle => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            borderRadius: '50%',
            backgroundColor: '#ff6b00',
            boxShadow: '0 0 10px #ff6b00',
            '--tx': `${particle.x}px`,
            '--ty': `${particle.y}px`,
            animation: `explosionParticle ${config.duration}ms ease-out forwards`,
            animationDelay: '0ms'
          }}
        />
      ))}
    </div>
  );
};

export default ExplosionEffect;