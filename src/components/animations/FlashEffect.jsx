import React, { useState, useEffect } from 'react';

const FlashEffect = ({ position, color = '#00bcd4', intensity = 0.6, onComplete }) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!position) {
      onComplete?.();
      return;
    }

    // Animation sequence: fade in quickly, hold, fade out
    const fadeInDuration = 50;
    const holdDuration = 100;
    const fadeOutDuration = 150;

    // Fade in
    const t1 = setTimeout(() => setOpacity(intensity), 10);

    // Start fade out
    const t2 = setTimeout(() => setOpacity(0), fadeInDuration + holdDuration);

    // Complete
    const t3 = setTimeout(() => {
      onComplete?.();
    }, fadeInDuration + holdDuration + fadeOutDuration);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [intensity, onComplete, position]);

  if (!position) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
        backgroundColor: color,
        opacity: opacity,
        borderRadius: '8px',
        pointerEvents: 'none',
        zIndex: 9997,
        transition: `opacity ${opacity > 0 ? '50ms' : '150ms'} ease-${opacity > 0 ? 'in' : 'out'}`
      }}
    />
  );
};

export default FlashEffect;
