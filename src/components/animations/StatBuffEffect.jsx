// ========================================
// STAT BUFF/DEBUFF EFFECT COMPONENT
// ========================================
// Visual component for stat modification animations
// Buff: Green swirling particles around hex center
// Debuff: Red jagged zap particles radiating from center

import React, { useState, useEffect } from 'react';
import './StatBuffEffect.css';

const DURATION = 1200;
const BUFF_COLOR = '#22c55e';
const DEBUFF_COLOR = '#ef4444';

/**
 * Generate swirling buff particles in circular orbits
 * @param {number} count - Number of particles
 * @returns {Array} Particle configs
 */
const generateBuffParticles = (count) => {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      id: i,
      startAngle: angle,
      radius: 8 + Math.random() * 12,
      delay: (i / count) * 200,
      size: 3 + Math.random() * 2
    });
  }
  return particles;
};

/**
 * Generate jagged zap/lightning lines radiating from center
 * @param {number} count - Number of zap lines
 * @returns {Array} Zap configs
 */
const generateDebuffParticles = (count) => {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const length = 10 + Math.random() * 10;
    particles.push({
      id: i,
      angle,
      length,
      delay: (i / count) * 150,
      zigzagOffset: (Math.random() - 0.5) * 6
    });
  }
  return particles;
};

/**
 * STAT BUFF/DEBUFF EFFECT COMPONENT
 * Renders particle-based buff (green swirl) or debuff (red zap) animation.
 * Sized for ~28px hex elements.
 * @param {Object} position - { left, top, width, height } in pixels
 * @param {boolean} isBuff - true for buff (green), false for debuff (red)
 * @param {Function} onComplete - Callback when animation completes
 */
const StatBuffEffect = ({ position, isBuff, onComplete }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!position) {
      onComplete?.();
      return;
    }

    const newParticles = isBuff
      ? generateBuffParticles(8)
      : generateDebuffParticles(6);
    setParticles(newParticles);

    const timer = setTimeout(() => {
      onComplete?.();
    }, DURATION);

    return () => clearTimeout(timer);
  }, [position, isBuff, onComplete]);

  if (!position) return null;

  const color = isBuff ? BUFF_COLOR : DEBUFF_COLOR;
  const centerX = position.left + position.width / 2;
  const centerY = position.top + position.height / 2;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${centerX}px`,
        top: `${centerY}px`,
        width: '40px',
        height: '40px',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9998
      }}
    >
      {/* Central glow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '20px',
          height: '20px',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${color}cc 0%, ${color}66 50%, transparent 70%)`,
          animation: `statGlow ${DURATION}ms ease-out forwards`,
          borderRadius: '50%'
        }}
      />

      {/* Buff: swirling particles */}
      {isBuff && particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: color,
            borderRadius: '50%',
            boxShadow: `0 0 4px ${color}`,
            '--orbit-radius': `${p.radius}px`,
            '--start-angle': `${p.startAngle}rad`,
            animation: `statSwirl ${DURATION}ms ease-in-out ${p.delay}ms forwards`,
            opacity: 0
          }}
        />
      ))}

      {/* Debuff: jagged zap lines */}
      {!isBuff && particles.map(p => {
        const endX = Math.cos(p.angle) * p.length;
        const endY = Math.sin(p.angle) * p.length;
        const midX = Math.cos(p.angle) * (p.length * 0.5) + p.zigzagOffset;
        const midY = Math.sin(p.angle) * (p.length * 0.5) - p.zigzagOffset;

        return (
          <svg
            key={p.id}
            viewBox="-20 -20 40 40"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '40px',
              height: '40px',
              transform: 'translate(-50%, -50%)',
              overflow: 'visible',
              animation: `statZap ${DURATION}ms ease-out ${p.delay}ms forwards`,
              opacity: 0
            }}
          >
            <polyline
              points={`0,0 ${midX},${midY} ${endX},${endY}`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              filter={`drop-shadow(0 0 3px ${color})`}
            />
          </svg>
        );
      })}
    </div>
  );
};

export default StatBuffEffect;
