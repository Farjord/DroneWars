// ========================================
// WAITING OVERLAY
// ========================================
// UI overlay that appears when waiting for opponent's turn
// Shows turn status with shimmer gradient text

import React from 'react';
import MorphingBackground from './MorphingBackground.jsx';

const WaitingOverlay = ({ isVisible, currentPlayer, gameMode, roomCode, lastAction, localPlayerState, opponentPlayerState, getLocalPlayerId }) => {
  if (!isVisible) return null;

  const isMultiplayer = gameMode !== 'local';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      <MorphingBackground />
      <h1
        className="text-6xl font-orbitron font-black uppercase tracking-widest text-center phase-announcement-shine relative z-10"
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
        {isMultiplayer ? "Opponent Thinking" : "AI Thinking"}
      </h1>
    </div>
  );
};

export default WaitingOverlay;