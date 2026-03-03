// ========================================
// PHASE STATUS TEXT COMPONENT
// ========================================
// Displays the current phase name (Tier 1 of the center column)
// Extracted from GameHeader.jsx

import React from 'react';
import { getPhaseDisplayName } from '../../../logic/phase/phaseDisplayUtils.js';

/**
 * PhaseStatusText - Shows the current phase display name (Tier 1 only).
 * Uses a slow rotating gradient (matching uncommon card border style)
 * clipped to text for a metallic sheen effect.
 */
function PhaseStatusText({ turnPhase }) {
  return (
    <h2
      className="font-bold uppercase tracking-widest"
      style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(0.7rem, 1.1vw, 1.1rem)',
        background: `linear-gradient(
          90deg,
          rgba(200,220,255,0.85) 0%,
          rgba(255,255,255,1) 20%,
          rgba(160,200,255,0.8) 40%,
          rgba(255,255,255,1) 50%,
          rgba(160,200,255,0.8) 60%,
          rgba(255,255,255,1) 80%,
          rgba(200,220,255,0.85) 100%
        )`,
        backgroundSize: '400% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'cardBorderRotate 15s linear infinite',
      }}
    >
      {getPhaseDisplayName(turnPhase)}
    </h2>
  );
}

export default PhaseStatusText;
