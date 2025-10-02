// ========================================
// OPPONENT DECIDING INTERCEPTION MODAL
// ========================================
// Modal that appears for the attacker while defender is choosing whether to intercept
// Shows blocking overlay with shimmer text during interception decision

import React from 'react';

/**
 * OpponentDecidingInterceptionModal - Shows waiting state while opponent decides on interception
 * @param {boolean} show - Whether to show the modal
 * @param {string} opponentName - Name of the opponent making the decision (not used - kept for compatibility)
 */
const OpponentDecidingInterceptionModal = ({ show, opponentName = 'Opponent' }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      <h1
        className="text-6xl font-orbitron font-black uppercase tracking-widest text-center phase-announcement-shine"
        style={{
          background: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 136, 255, 0.3)',
          filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.4))'
        }}
      >
        Opponent Deciding Interception
      </h1>
    </div>
  );
};

export default OpponentDecidingInterceptionModal;
