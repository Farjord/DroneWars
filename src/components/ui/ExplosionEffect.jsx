// ========================================
// EXPLOSION EFFECT COMPONENT
// ========================================
// Visual component for rendering explosion animations

import React from 'react';

/**
 * EXPLOSION EFFECT COMPONENT
 * Renders a CSS-animated explosion effect at specified coordinates.
 * Automatically times out after animation duration.
 * @param {number} top - Y position in pixels
 * @param {number} left - X position in pixels
 */
const ExplosionEffect = ({ top, left }) => (
  <div className="explosion" style={{ top: `${top}px`, left: `${left}px` }}></div>
);

export default ExplosionEffect;