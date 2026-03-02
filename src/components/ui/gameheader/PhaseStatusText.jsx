// ========================================
// PHASE STATUS TEXT COMPONENT
// ========================================
// Displays the current phase name (Tier 1 of the center column)
// Extracted from GameHeader.jsx

import React from 'react';
import { getPhaseDisplayName } from '../../../logic/phase/phaseDisplayUtils.js';

/**
 * PhaseStatusText - Shows the current phase display name (Tier 1 only).
 * Contextual annotations are now handled by Tier 2 in GameHeader.
 */
function PhaseStatusText({ turnPhase }) {
  return (
    <h2
      className="font-bold uppercase tracking-widest text-white"
      style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(0.7rem, 1.1vw, 1.1rem)',
      }}
    >
      {getPhaseDisplayName(turnPhase)}
    </h2>
  );
}

export default PhaseStatusText;
