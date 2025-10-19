// ========================================
// BARRAGE IMPACT COMPONENT
// ========================================
// Visual component for rendering "peppered shots" effect
// Shows multiple small impact flashes over a target drone
// Used for Barrage splash damage card

import React from 'react';

/**
 * BARRAGE IMPACT COMPONENT
 * Renders a single small impact flash
 * @param {Object} position - Position of impact {left, top}
 * @param {number} size - Size of impact flash (default: 10px)
 * @param {number} delay - Delay before showing (for stagger effect)
 * @param {Function} onComplete - Callback when animation completes
 */
const BarrageImpact = ({ position, size = 10, delay = 0, onComplete }) => {
  const [visible, setVisible] = React.useState(false);
  const [opacity, setOpacity] = React.useState(0);

  React.useEffect(() => {
    // Delay before showing
    const showTimer = setTimeout(() => {
      setVisible(true);
      setOpacity(1);
    }, delay);

    // Fade out after brief flash
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, delay + 100);

    // Complete and remove
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, delay + 250);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [delay, onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 1), rgba(255, 165, 0, 0.9))',
        opacity: opacity,
        transition: 'opacity 150ms ease-out',
        boxShadow: `
          0 0 ${size * 2}px rgba(255, 165, 0, 0.9),
          0 0 ${size}px rgba(255, 255, 255, 0.8)
        `,
        pointerEvents: 'none',
        zIndex: 9998
      }}
    />
  );
};

export default BarrageImpact;
