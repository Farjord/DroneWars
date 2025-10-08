// ========================================
// CARD STAT HEXAGON COMPONENT
// ========================================
// Renders hexagonal or flat hexagonal stat display for drones and cards
// Used to display attack, speed, and other numeric stats

import React from 'react';

/**
 * CARD STAT HEXAGON COMPONENT
 * Renders hexagonal stat display with icon and value.
 * Supports both standard hexagon and flat hexagon shapes.
 * @param {number} value - The stat value to display
 * @param {boolean} isFlat - Whether to use flat hexagon shape
 * @param {React.Component} icon - Lucide icon component
 * @param {string} iconColor - Tailwind color class for icon
 * @param {string} textColor - Tailwind text color class
 */
const CardStatHexagon = ({ value, isFlat, icon: Icon, iconColor, textColor = 'text-white' }) => (
  <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-black/60 flex items-center justify-center p-0.5`}>
    <div className={`${isFlat ? 'hexagon-flat' : 'hexagon'} w-full h-full bg-slate-900/80 flex items-center justify-center`}>
      <div className={`flex items-center justify-center gap-1 font-bold ${textColor}`}>
        {Icon && <Icon size={10} className={iconColor} />}
        <span className="font-orbitron text-sm">{value}</span>
      </div>
    </div>
  </div>
);

export default CardStatHexagon;