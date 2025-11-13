import React, { useState, useEffect } from 'react';

const CardVisualEffect = ({ visualType, startPos, endPos, onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const ANIMATION_DURATION = 800; // Standardized duration for all card visual effects

  useEffect(() => {
    if (!startPos || !endPos) {
      onComplete?.();
      return;
    }

    setIsActive(true);

    // Complete after duration
    const timer = setTimeout(() => {
      setIsActive(false);
      onComplete?.();
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [visualType, startPos, endPos, onComplete]);

  if (!isActive || !startPos || !endPos) return null;

  // Render based on visual type
  switch (visualType) {
    case 'LASER_BLAST':
      return <LaserBlastEffect startPos={startPos} endPos={endPos} duration={ANIMATION_DURATION} />;
    case 'ENERGY_WAVE':
      return <EnergyWaveEffect startPos={startPos} endPos={endPos} duration={ANIMATION_DURATION} />;
    case 'NUKE_BLAST':
      return <NukeBlastEffect endPos={endPos} duration={ANIMATION_DURATION} />;
    default:
      return null;
  }
};

// Laser blast sub-component
const LaserBlastEffect = ({ startPos, endPos, duration }) => {
  const angle = Math.atan2(
    endPos.y - startPos.y,
    endPos.x - startPos.x
  );
  const length = Math.sqrt(
    Math.pow(endPos.x - startPos.x, 2) +
    Math.pow(endPos.y - startPos.y, 2)
  );

  return (
    <div
      style={{
        position: 'fixed',
        left: startPos.x,
        top: startPos.y,
        width: length,
        height: '4px',
        backgroundColor: '#ff0000',
        boxShadow: '0 0 10px #ff0000, 0 0 20px #ff0000',
        transformOrigin: '0 50%',
        transform: `rotate(${angle}rad)`,
        zIndex: 9998,
        pointerEvents: 'none',
        animation: `laserFade ${duration}ms ease-out forwards`
      }}
    />
  );
};

// Energy wave sub-component (placeholder - customize as needed)
const EnergyWaveEffect = ({ endPos, duration }) => {
  return (
    <div
      style={{
        position: 'fixed',
        left: endPos.x - 20,
        top: endPos.y - 20,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#00ff00',
        opacity: 0.7,
        zIndex: 9998,
        pointerEvents: 'none',
        animation: `energyPulse ${duration}ms ease-out forwards`
      }}
    />
  );
};

// Nuke blast sub-component - Large explosion covering lane area
const NukeBlastEffect = ({ endPos, duration }) => {
  return (
    <>
      {/* Expanding blast wave */}
      <div
        style={{
          position: 'fixed',
          left: endPos.x - 150,
          top: endPos.y - 150,
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,100,0,0.9) 0%, rgba(255,50,0,0.6) 40%, rgba(255,200,0,0.3) 70%, transparent 100%)',
          zIndex: 9998,
          pointerEvents: 'none',
          animation: `nukeExpand ${duration}ms ease-out forwards`
        }}
      />
      {/* Bright flash */}
      <div
        style={{
          position: 'fixed',
          left: endPos.x - 200,
          top: endPos.y - 200,
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          opacity: 0.8,
          zIndex: 9997,
          pointerEvents: 'none',
          animation: `nukeFlash ${duration}ms ease-out forwards`
        }}
      />
    </>
  );
};

export default CardVisualEffect;

// Add CSS animations to your stylesheet:
/*
@keyframes laserFade {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes energyPulse {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(2); opacity: 0.5; }
  100% { transform: scale(3); opacity: 0; }
}

@keyframes nukeExpand {
  0% { transform: scale(0.1); opacity: 1; }
  50% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes nukeFlash {
  0% { opacity: 0.8; transform: scale(0.5); }
  10% { opacity: 1; transform: scale(1); }
  40% { opacity: 0.6; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(1.5); }
}
*/
