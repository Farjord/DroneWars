import React, { useState, useEffect } from 'react';

const CardVisualEffect = ({ visualType, sourceId, targetId, duration = 800, onComplete, droneRefs, gameAreaRef }) => {
  const [isActive, setIsActive] = useState(false);
  const [positions, setPositions] = useState(null);

  useEffect(() => {
    // Calculate start and end positions
    const targetEl = droneRefs.current[targetId];
    if (!targetEl || !gameAreaRef.current) {
      onComplete?.();
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();
    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();

    // Source position (player hand area, approximate)
    const sourceY = sourceId === 'player1-hand' ?
      gameAreaRect.bottom - 100 :
      gameAreaRect.top + 100;
    const sourceX = gameAreaRect.left + (gameAreaRect.width / 2);

    setPositions({
      start: { x: sourceX, y: sourceY },
      end: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 }
    });

    setIsActive(true);

    // Complete after duration
    const timer = setTimeout(() => {
      setIsActive(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [visualType, sourceId, targetId, duration, droneRefs, gameAreaRef, onComplete]);

  if (!isActive || !positions) return null;

  // Render based on visual type
  switch (visualType) {
    case 'LASER_BLAST':
      return <LaserBlastEffect positions={positions} duration={duration} />;
    case 'ENERGY_WAVE':
      return <EnergyWaveEffect positions={positions} duration={duration} />;
    default:
      return null;
  }
};

// Laser blast sub-component
const LaserBlastEffect = ({ positions, duration }) => {
  const angle = Math.atan2(
    positions.end.y - positions.start.y,
    positions.end.x - positions.start.x
  );
  const length = Math.sqrt(
    Math.pow(positions.end.x - positions.start.x, 2) +
    Math.pow(positions.end.y - positions.start.y, 2)
  );

  return (
    <div
      style={{
        position: 'fixed',
        left: positions.start.x,
        top: positions.start.y,
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
const EnergyWaveEffect = ({ positions, duration }) => {
  return (
    <div
      style={{
        position: 'fixed',
        left: positions.start.x - 20,
        top: positions.start.y - 20,
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
*/
