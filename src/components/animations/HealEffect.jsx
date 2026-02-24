// ========================================
// HEAL EFFECT COMPONENT
// ========================================
// Visual component for rendering healing animation
// Green smokey effect with floating + symbols

import React, { useState, useEffect } from 'react';

// Size-dependent configuration lookup
const SIZE_CONFIG = {
  small: { particleCount: 12, spread: 40, glowSize: 30, duration: 1000 },
  medium: { particleCount: 18, spread: 60, glowSize: 50, duration: 1200 },
  large: { particleCount: 24, spread: 80, glowSize: 70, duration: 1400 }
};

/** Derive size tier from heal amount */
const getSizeTier = (healAmount) => healAmount === 1 ? 'small' : healAmount <= 3 ? 'medium' : 'large';

/**
 * HEAL EFFECT COMPONENT
 * Renders a particle-based heal animation with floating + symbols.
 * Size scales based on heal amount: 1 HP = small, 2-3 HP = medium, 4+ HP = large
 * @param {Object} position - { left, top, width, height } in pixels
 * @param {number} healAmount - Amount healed (determines size)
 * @param {Function} onComplete - Callback when animation completes
 */
const HealEffect = ({ position, healAmount, onComplete }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!position || !healAmount) {
      onComplete?.();
      return;
    }

    const size = getSizeTier(healAmount);
    const config = SIZE_CONFIG[size];

    // Generate particles in random positions within spread radius
    const newParticles = [];
    for (let i = 0; i < config.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / config.particleCount + (Math.random() - 0.5) * 0.5;
      const distance = config.spread * (0.5 + Math.random() * 0.5);

      newParticles.push({
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        delay: (i / config.particleCount) * 300, // Stagger over 300ms
        floatDistance: 40 + Math.random() * 30, // How far it floats up
        symbol: Math.random() > 0.3 ? '+' : '✨' // Mix of + and sparkles
      });
    }
    setParticles(newParticles);

    // Complete callback after animation duration
    const timer = setTimeout(() => {
      onComplete?.();
    }, config.duration);

    return () => clearTimeout(timer);
  }, [healAmount, onComplete, position]);

  if (!position || !healAmount) return null;

  const size = getSizeTier(healAmount);
  const config = SIZE_CONFIG[size];

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.left + position.width / 2}px`,
        top: `${position.top + position.height / 2}px`,
        width: `${config.spread * 2}px`,
        height: `${config.spread * 2}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9998
      }}
    >
      {/* Pulsing central glow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: `${config.glowSize}px`,
          height: `${config.glowSize}px`,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.8) 0%, rgba(34, 197, 94, 0.4) 50%, rgba(34, 197, 94, 0) 70%)',
          animation: `healPulse ${config.duration}ms ease-out forwards`,
          borderRadius: '50%'
        }}
      />

      {/* Floating particles with + symbols */}
      {particles.map(particle => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '20px',
            height: '20px',
            color: '#22c55e',
            fontSize: size === 'large' ? '18px' : size === 'medium' ? '16px' : '14px',
            fontWeight: 'bold',
            textShadow: '0 0 4px rgba(34, 197, 94, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '--start-x': `${particle.x}px`,
            '--start-y': `${particle.y}px`,
            '--float-distance': `${particle.floatDistance}px`,
            animation: `healFloat ${config.duration}ms ease-out ${particle.delay}ms forwards`,
            opacity: 0
          }}
        >
          {particle.symbol}
        </div>
      ))}

      {/* Secondary glow ring */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: `${config.glowSize * 1.5}px`,
          height: `${config.glowSize * 1.5}px`,
          transform: 'translate(-50%, -50%)',
          border: '2px solid rgba(34, 197, 94, 0.6)',
          borderRadius: '50%',
          animation: `healPulse ${config.duration}ms ease-out 100ms forwards`,
          boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
        }}
      />

      {/* Sparkle particles for extra visual interest */}
      {size !== 'small' && particles.slice(0, Math.floor(config.particleCount / 3)).map((particle, idx) => (
        <div
          key={`sparkle-${idx}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '8px',
            height: '8px',
            backgroundColor: '#22c55e',
            borderRadius: '50%',
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)',
            '--start-x': `${particle.x * 0.7}px`,
            '--start-y': `${particle.y * 0.7}px`,
            '--float-distance': `${particle.floatDistance * 0.8}px`,
            animation: `healFloat ${config.duration}ms ease-out ${particle.delay + 150}ms forwards, healSparkle ${config.duration}ms ease-in-out ${particle.delay + 150}ms infinite`,
            opacity: 0
          }}
        />
      ))}
    </div>
  );
};

export default HealEffect;
