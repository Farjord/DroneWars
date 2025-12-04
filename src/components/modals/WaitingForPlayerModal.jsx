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
      default:
        return 'Waiting for Opponent';
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
      {/* Content container with hex decorations */}
      <div className="relative flex items-center justify-center">
        {/* Background hex decorations - positioned behind text */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Upper-left hex - larger */}
          <svg
            className="absolute opacity-20"
            style={{ transform: 'translate(-120px, -30px)' }}
            width="100" height="115" viewBox="0 0 80 92"
          >
            <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.08)" stroke="#06b6d4" strokeWidth="1" />
          </svg>
          {/* Lower-right hex - medium */}
          <svg
            className="absolute opacity-15"
            style={{ transform: 'translate(100px, 25px)' }}
            width="80" height="92" viewBox="0 0 80 92"
          >
            <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.06)" stroke="#22d3ee" strokeWidth="0.8" />
          </svg>
          {/* Center-right small hex */}
          <svg
            className="absolute opacity-10"
            style={{ transform: 'translate(180px, -10px)' }}
            width="50" height="58" viewBox="0 0 80 92"
          >
            <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="rgba(6, 182, 212, 0.05)" stroke="#67e8f9" strokeWidth="0.5" />
          </svg>
          {/* Upper-right tiny hex */}
          <svg
            className="absolute opacity-12"
            style={{ transform: 'translate(60px, -45px)' }}
            width="40" height="46" viewBox="0 0 80 92"
          >
            <polygon points="40,0 80,23 80,69 40,92 0,69 0,23" fill="none" stroke="#22d3ee" strokeWidth="0.6" />
          </svg>
        </div>

        {/* Main text */}
        <h1
          className="text-6xl font-orbitron font-black uppercase tracking-widest text-center phase-announcement-shine relative z-10"
          style={{
            background: 'linear-gradient(90deg, #06b6d4, #22d3ee, #ffffff, #22d3ee, #06b6d4)',
            backgroundSize: '300% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(34, 211, 238, 0.3)',
            filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.4))'
          }}
        >
          {getPhaseText(phase)}
        </h1>
      </div>
    </div>
  );
};

export default WaitingForPlayerModal;