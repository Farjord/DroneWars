// ========================================
// RAILGUN TURRET COMPONENT
// ========================================
// Reusable turret animation for Railgun cards
// Scales down from original 64x192px design
// Rotates to point at target

import React, { useState, useEffect } from 'react';

/**
 * RAILGUN TURRET ANIMATION
 * @param {number} rotation - Angle in degrees to rotate turret (-90 = up, 0 = right, 90 = down)
 * @param {number} sizeMultiplier - Scale multiplier (default: 1 = 17x50px)
 * @param {Function} onComplete - Callback when animation completes
 */
const RailgunTurret = ({ rotation = -90, sizeMultiplier = 1, onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timeline = [
      { stage: 0, duration: 0 },     // Instant start
      { stage: 1, duration: 600 },   // Deploy: hatch + gun opening
      { stage: 2, duration: 400 },   // Decals build
      { stage: 3, duration: 600 },   // Charging
      { stage: 4, duration: 500 },   // SHOOTING
      { stage: 5, duration: 600 },   // Retract: gun + hatch closing
    ];

    let currentIndex = 0;
    const timeouts = [];

    const advance = () => {
      setStage(timeline[currentIndex].stage);
      currentIndex++;

      if (currentIndex < timeline.length) {
        const timeout = setTimeout(advance, timeline[currentIndex].duration);
        timeouts.push(timeout);
      } else {
        // Animation complete
        if (onComplete) onComplete();
      }
    };

    advance();

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [onComplete]);

  // Base scale to fit 50px max dimension (from original 192px height)
  const baseScale = 0.26;
  const finalScale = baseScale * sizeMultiplier;

  // Calculate gun scale and opacity
  const getGunTransform = () => {
    if (stage === 0) return { scale: 0.01, opacity: 0 }; // Hidden
    if (stage === 1) return { scale: 1, opacity: 1 };    // Opening
    if (stage >= 2 && stage <= 4) return { scale: 1, opacity: 1 }; // Fully open
    if (stage === 5) return { scale: 0.01, opacity: 0 }; // Closing
    return { scale: 0.01, opacity: 0 };
  };

  const gunTransform = getGunTransform();

  return (
    <div
      style={{
        transform: `scale(${finalScale}) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        width: '64px',
        height: '192px',
        position: 'relative'
      }}
    >
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes shootRecoil {
          0% {
            transform: translate(-50%, -50%) translateY(0);
          }
          35% {
            transform: translate(-50%, -50%) translateY(24px);
          }
          100% {
            transform: translate(-50%, -50%) translateY(0);
          }
        }
      `}</style>

      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>

        {/* Hatch */}
        <div
          style={{
            opacity: stage >= 1 ? (stage === 5 ? 0 : 1) : 0,
            transform: `scale(${stage >= 1 && stage <= 4 ? 1.1 : 0.5})`,
            transition: 'all 600ms ease-in-out',
            width: '112px',
            height: '112px',
            background: 'black',
            borderRadius: '50%',
            border: '4px solid #6b7280',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
          }}
        />

        {/* Gun - always rendered, visibility controlled by scale/opacity */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: stage === 4 ? 'shootRecoil 500ms cubic-bezier(0.4, 0.0, 0.1, 1)' : 'none'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '192px',
              background: 'linear-gradient(to top, #475569, #64748b, #22d3ee)',
              borderRadius: '32px',
              position: 'relative',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              transform: `scaleY(${gunTransform.scale})`,
              opacity: gunTransform.opacity,
              transformOrigin: 'center',
              transition: 'all 600ms ease-in-out'
            }}
          >
            {/* Tip glow */}
            <div
              style={{
                position: 'absolute',
                top: '-4px',
                left: '50%',
                width: '48px',
                height: '16px',
                background: '#22d3ee',
                borderRadius: '50%',
                transform: `translateX(-50%) scale(${stage === 3 ? 1.3 : 1})`,
                boxShadow: stage === 3
                  ? '0 0 20px rgba(34, 211, 238, 0.8)'
                  : '0 0 10px rgba(34, 211, 238, 0.5)',
                transition: 'all 400ms ease-in-out'
              }}
            />

            {/* Charging glow */}
            {stage === 3 && (
              <>
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '64px',
                  height: '24px',
                  background: '#7dd3fc',
                  borderRadius: '50%',
                  filter: 'blur(8px)',
                  opacity: 0.7,
                  animation: 'pulse 1s infinite'
                }} />
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80px',
                  height: '32px',
                  background: '#60a5fa',
                  borderRadius: '50%',
                  filter: 'blur(16px)',
                  opacity: 0.5,
                  animation: 'pulse 1s infinite'
                }} />
              </>
            )}

            {/* Decals */}
            {(stage >= 2 && stage <= 4) && (
              <>
                {/* Center decals */}
                <div style={{
                  position: 'absolute',
                  top: '32px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  height: '32px',
                  border: '2px solid #334155',
                  background: 'rgba(71, 85, 105, 0.5)',
                  animation: stage === 2 ? 'fadeInScale 250ms ease-out 50ms forwards' : 'none',
                  opacity: stage === 2 ? 0 : 1
                }} />
                <div style={{
                  position: 'absolute',
                  top: '80px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '24px',
                  border: '2px solid #334155',
                  background: 'rgba(71, 85, 105, 0.5)',
                  animation: stage === 2 ? 'fadeInScale 250ms ease-out 100ms forwards' : 'none',
                  opacity: stage === 2 ? 0 : 1
                }} />
                <div style={{
                  position: 'absolute',
                  top: '128px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  height: '32px',
                  border: '2px solid #334155',
                  background: 'rgba(71, 85, 105, 0.5)',
                  animation: stage === 2 ? 'fadeInScale 250ms ease-out 150ms forwards' : 'none',
                  opacity: stage === 2 ? 0 : 1
                }} />

                {/* Side decals */}
                <div style={{
                  position: 'absolute',
                  top: '48px',
                  left: '-8px',
                  width: '24px',
                  height: '24px',
                  border: '2px solid #334155',
                  background: 'rgba(71, 85, 105, 0.5)',
                  animation: stage === 2 ? 'slideInFromLeft 250ms ease-out 100ms forwards' : 'none',
                  opacity: stage === 2 ? 0 : 1
                }} />
                <div style={{
                  position: 'absolute',
                  top: '112px',
                  left: '-12px',
                  width: '20px',
                  height: '20px',
                  border: '2px solid #334155',
                  background: 'rgba(71, 85, 105, 0.5)',
                  animation: stage === 2 ? 'slideInFromLeft 250ms ease-out 150ms forwards' : 'none',
                  opacity: stage === 2 ? 0 : 1
                }} />

                <div style={{
                  position: 'absolute',
                  top: '48px',
                  right: '-8px',
                  width: '24px',
                  height: '24px',
                  border: '2px solid #334155',
                  background: 'rgba(71, 85, 105, 0.5)',
                  animation: stage === 2 ? 'slideInFromRight 250ms ease-out 100ms forwards' : 'none',
                  opacity: stage === 2 ? 0 : 1
                }} />
                <div style={{
                  position: 'absolute',
                  top: '112px',
                  right: '-12px',
                  width: '20px',
                  height: '20px',
                  border: '2px solid #334155',
                  background: 'rgba(71, 85, 105, 0.5)',
                  animation: stage === 2 ? 'slideInFromRight 250ms ease-out 150ms forwards' : 'none',
                  opacity: stage === 2 ? 0 : 1
                }} />
              </>
            )}
          </div>

          {/* Shooting muzzle flash (kept from original, beam removed) */}
          {stage === 4 && (
            <>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                width: '96px',
                height: '96px',
                background: '#22d3ee',
                borderRadius: '50%',
                filter: 'blur(24px)',
                opacity: 0.8,
                animation: 'pulse 500ms'
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                width: '128px',
                height: '128px',
                background: '#7dd3fc',
                borderRadius: '50%',
                filter: 'blur(48px)',
                opacity: 0.6
              }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RailgunTurret;
