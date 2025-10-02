// ========================================
// WINNER MODAL COMPONENT
// ========================================
// Modal that displays when the game ends, showing victory or defeat message
// Auto-dismisses after 4 seconds to reveal final board state

import React, { useEffect } from 'react';

/**
 * WINNER MODAL COMPONENT
 * Shows dramatic victory or defeat animation when the game ends.
 * Auto-dismisses after 4 seconds to allow players to view final board.
 * @param {string} winner - ID of the winning player
 * @param {string} localPlayerId - ID of the local player
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Callback when modal is closed
 */
const WinnerModal = ({ winner, localPlayerId, show, onClose }) => {
  const isVictory = winner === localPlayerId;

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      {isVictory ? (
        // Victory Screen - Green shimmer gradient
        <h1
          className="text-8xl font-orbitron font-black uppercase tracking-widest text-center phase-announcement-shine"
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
          VICTORY
        </h1>
      ) : (
        // Defeat Screen - Red glow with CPU shutdown effects
        <div className="relative w-full h-full flex items-center justify-center screen-flicker">
          {/* Main DEFEAT text */}
          <h1
            className="text-8xl font-orbitron font-black uppercase tracking-widest text-center defeat-glow screen-distort z-10"
            style={{
              color: '#ff3232',
              textShadow: '0 0 30px rgba(255, 50, 50, 1), 0 0 60px rgba(255, 50, 50, 0.8), 0 0 90px rgba(255, 50, 50, 0.6)',
              filter: 'drop-shadow(0 0 30px rgba(255, 50, 50, 0.6))'
            }}
          >
            DEFEAT
          </h1>

          {/* Scanline shutdown effect */}
          <div
            className="absolute w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent scanline-shutdown"
            style={{
              boxShadow: '0 0 10px rgba(255, 50, 50, 0.8)'
            }}
          />

          {/* Red overlay pulse */}
          <div
            className="absolute inset-0 bg-red-900/20 defeat-glow"
            style={{
              mixBlendMode: 'multiply'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default WinnerModal;
