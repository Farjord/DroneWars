import React, { useState, useEffect } from 'react';

// Helper function to generate random band properties (only called once per band)
const generateBandProperties = () => {
  const isTopLeft = Math.random() > 0.5;
  
  return {
    // Static properties - never change
    width: `${180 + Math.random() * 40}%`,
    height: `${60 + Math.random() * 40}%`,
    gradientAngle: isTopLeft ? 120 + Math.random() * 30 : -60 + Math.random() * 30,
    colorIntensity: {
      r: 4 + Math.random() * 10,
      g: 8 + Math.random() * 16,
      b: 24 + Math.random() * 20,
    },
    opacity: 0.5 + Math.random() * 0.4,
    scale: 1 + (Math.random() * 0.2 - 0.1),
    
    // Dynamic properties - these will change
    position: isTopLeft ? {
      top: `${-30 + Math.random() * 20}%`,
      left: `${-60 + Math.random() * 20}%`,
    } : {
      bottom: `${-35 + Math.random() * 20}%`,
      right: `${-60 + Math.random() * 20}%`,
    },
    rotation: isTopLeft ? -20 + Math.random() * 15 : 8 + Math.random() * 15,
  };
};

// Helper function to generate only new position/rotation
const generateNewMovement = () => {
  const isTopLeft = Math.random() > 0.5;
  
  return {
    position: isTopLeft ? {
      top: `${-30 + Math.random() * 20}%`,
      left: `${-60 + Math.random() * 20}%`,
    } : {
      bottom: `${-35 + Math.random() * 20}%`,
      right: `${-60 + Math.random() * 20}%`,
    },
    rotation: isTopLeft ? -20 + Math.random() * 15 : 8 + Math.random() * 15,
  };
};

// Single Band Component
const MorphingBand = ({ id, properties }) => {
  const startColor = `rgb(${properties.colorIntensity.r} ${properties.colorIntensity.g} ${properties.colorIntensity.b})`;
  
  const positionStyles = properties.position.top !== undefined 
    ? { top: properties.position.top, left: properties.position.left }
    : { bottom: properties.position.bottom, right: properties.position.right };
  
  return (
    <div
      className="absolute"
      style={{
        width: properties.width,
        height: properties.height,
        ...positionStyles,
        transform: `rotate(${properties.rotation}deg) scale(${properties.scale})`,
        background: `linear-gradient(${properties.gradientAngle}deg, ${startColor} 0%, transparent 100%)`,
        opacity: properties.opacity,
        transition: 'all 8s ease-in-out',
        willChange: 'transform',
      }}
    />
  );
};

// Main Background Component - This is what you'll import and use
const MorphingBackground = () => {
  const [bands, setBands] = useState([]);

  // Initialize bands
  useEffect(() => {
    const initialCount = 3 + Math.floor(Math.random() * 3); // 3-5 bands
    const initialBands = Array.from({ length: initialCount }, (_, i) => ({
      id: i,
      properties: generateBandProperties(),
    }));
    
    setBands(initialBands);
  }, []);

  // Periodically move bands
  useEffect(() => {
    if (bands.length === 0) return;

    const interval = setInterval(() => {
      setBands(currentBands => {
        // Pick a random band to move
        const indexToMove = Math.floor(Math.random() * currentBands.length);
        
        return currentBands.map((band, index) => {
          if (index === indexToMove) {
            // Only update position and rotation, keep everything else the same
            const newMovement = generateNewMovement();
            return {
              ...band,
              properties: {
                ...band.properties,
                position: newMovement.position,
                rotation: newMovement.rotation,
              }
            };
          }
          return band;
        });
      });
    }, 10000); // Move a random band every 10 seconds

    return () => clearInterval(interval);
  }, [bands.length]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {bands.map(band => (
        <MorphingBand key={band.id} id={band.id} properties={band.properties} />
      ))}
    </div>
  );
};

export default MorphingBackground;