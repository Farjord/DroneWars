import React, { useState, useEffect, useRef } from 'react';

// Pixel offsets to center the trail particle relative to the drone sprite
const TRAIL_OFFSET_X = 35;
const TRAIL_OFFSET_Y = 60;

const FlyingDrone = ({ droneData, startPos, endPos, config, onComplete }) => {
  const [position, setPosition] = useState(startPos);
  const [trail, setTrail] = useState([]);
  const animationRef = useRef();
  const startTime = useRef(Date.now());

  useEffect(() => {
    const duration = config.duration || 800;
    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      const x = startPos.x + (endPos.x - startPos.x) * eased;
      const y = startPos.y + (endPos.y - startPos.y) * eased;
      
      setPosition({ x, y });
      
      if (config.trail) {
        setTrail(prev => [...prev.slice(-8), { id: Date.now(), x, y }]);
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startPos, endPos, config, onComplete]);

  return (
    <>
      {trail.map((particle, index) => (
        <div
          key={particle.id}
          style={{
            position: 'fixed',
            left: particle.x + TRAIL_OFFSET_X,
            top: particle.y + TRAIL_OFFSET_Y,
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: droneData.owner === 'player1' ? '#00bcd4' : '#e91e63',
            opacity: 0.3 + (index * 0.05),
            filter: 'blur(2px)',
            pointerEvents: 'none',
            zIndex: 9998
          }}
        />
      ))}
      
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: '90px',
          height: '135px',
          zIndex: 9999,
          pointerEvents: 'none',
          transform: `scale(${config.isReturn ? 1 : 1.1})`,
          transition: 'transform 0.3s'
        }}
      >
        <img 
          src={droneData.image} 
          alt={droneData.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        />
      </div>
    </>
  );
};

export default FlyingDrone;