// ========================================
// STATIC BACKGROUND COMPONENT
// ========================================
// Renders static image backgrounds for the game
// Alternative to the animated SpaceBackground component

import React from 'react';

/**
 * StaticBackground - Displays a static image as the game background
 * @param {Object} props
 * @param {string} props.imagePath - Path to the background image (relative to public folder)
 */
const StaticBackground = ({ imagePath }) => {
  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${imagePath})`,
        backgroundColor: '#0a0a1a' // Fallback color while image loads
      }}
    />
  );
};

export default StaticBackground;
