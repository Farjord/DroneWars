// ========================================
// WAITING FOR PLAYER MODAL
// ========================================
// Modal that appears when waiting for opponent to acknowledge in simultaneous phases
// Shows waiting state for multiplayer synchronization with shimmer text

import React from 'react';

/**
 * WaitingForPlayerModal - Shows waiting state for simultaneous phase acknowledgment
 * @param {boolean} show - Whether to show the modal
 * @param {string} phase - The phase we're waiting for (e.g., 'determineFirstPlayer')
 * @param {string} opponentName - Name of the opponent we're waiting for (not used - kept for compatibility)
 * @param {string} roomCode - Room code for multiplayer sessions (not used - kept for compatibility)
 */
const WaitingForPlayerModal = ({ show, phase, opponentName = 'Opponent', roomCode }) => {
  if (!show) return null;

  // Get phase-specific display text
  const getPhaseText = (phase) => {
    switch (phase) {
      case 'determineFirstPlayer':
        return 'Waiting for Opponent';
      case 'mandatoryDiscard':
        return 'Opponent Discarding';
      case 'optionalDiscard':
        return 'Opponent Discarding Cards';
      case 'allocateShields':
        return 'Opponent Allocating Shields';
      case 'mandatoryDroneRemoval':
        return 'Opponent Removing Drones';
      case 'deploymentComplete':
        return 'Waiting for Opponent';
      default:
        return 'Waiting for Opponent';
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
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
        {getPhaseText(phase)}
      </h1>
    </div>
  );
};

export default WaitingForPlayerModal;