// ========================================
// KPI CHANGE POPUP COMPONENT
// ========================================
// Visual component for rendering KPI change notifications
// Circle popup with +X/-X text that floats up and fades out

import React, { useEffect } from 'react';
import '../../styles/animations.css';

/**
 * KPI CHANGE POPUP COMPONENT
 * Renders a circle popup notification showing KPI changes (+X/-X).
 * Auto-dismisses after 1.2s animation.
 * @param {number} delta - The change amount (positive or negative)
 * @param {Object} position - { left, top, width, height } in pixels
 * @param {string} type - 'energy' | 'momentum' | 'hand' | 'deployment' | 'threat'
 * @param {Function} onComplete - Callback when animation completes
 */
const KPIChangePopup = ({ delta, position, type, onComplete }) => {
  useEffect(() => {
    if (!position || delta === 0) {
      onComplete?.();
      return;
    }

    // Complete callback after animation duration (1.2s)
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1200);

    return () => clearTimeout(timer);
  }, [delta, position, onComplete]);

  if (!position || delta === 0) return null;

  // Base colors by type
  const baseColors = {
    energy: { base: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)' },      // yellow
    momentum: { base: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)' },    // blue
    hand: { base: '#22d3ee', glow: 'rgba(34, 211, 238, 0.6)' },        // cyan
    deployment: { base: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },  // purple
    threat: { base: '#f97316', glow: 'rgba(249, 115, 22, 0.6)' }      // orange
  };

  // Delta tint colors
  const deltaTint = delta > 0
    ? { color: '#22c55e', shadow: 'rgba(34, 197, 94, 0.8)' }  // green for positive
    : { color: '#ef4444', shadow: 'rgba(239, 68, 68, 0.8)' }; // red for negative

  const colors = baseColors[type] || baseColors.energy;
  const displayText = delta > 0 ? `+${delta}` : `${delta}`;

  // Calculate center position
  const centerX = position.left + position.width / 2;
  const centerY = position.top + position.height / 2;

  return (
    <div
      className="kpi-popup-animation"
      style={{
        position: 'fixed',
        left: `${centerX}px`,
        top: `${centerY}px`,
        pointerEvents: 'none',
        zIndex: 10000
      }}
    >
      {/* Circle with glowing border */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 28, 0.95) 100%)`,
          border: `2px solid ${colors.base}`,
          boxShadow: `
            0 0 12px ${colors.glow},
            0 0 24px ${colors.glow},
            inset 0 0 8px ${deltaTint.shadow}
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Delta text */}
        <span
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            fontFamily: 'Orbitron, sans-serif',
            color: deltaTint.color,
            textShadow: `0 0 8px ${deltaTint.shadow}, 0 0 16px ${deltaTint.shadow}`
          }}
        >
          {displayText}
        </span>
      </div>
    </div>
  );
};

export default KPIChangePopup;
