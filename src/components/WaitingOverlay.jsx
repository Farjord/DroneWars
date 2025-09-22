// ========================================
// WAITING OVERLAY
// ========================================
// UI overlay that appears when waiting for opponent's turn
// Shows turn status and recent opponent actions

import React from 'react';
import { Loader2, Clock, User } from 'lucide-react';

const WaitingOverlay = ({ isVisible, currentPlayer, gameMode, roomCode, lastAction }) => {
  if (!isVisible) return null;

  const isMultiplayer = gameMode !== 'local';
  const opponentName = currentPlayer === 'player1' ? 'Player 1' : 'Player 2';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 pointer-events-none">
      <div className="bg-slate-900 rounded-2xl border-2 border-purple-500 p-6 shadow-2xl shadow-purple-500/20 max-w-md w-full mx-4">

        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-purple-400 mb-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            {isMultiplayer ? "Opponent's Turn" : "AI Thinking..."}
          </h3>
          <p className="text-gray-300 text-sm">
            {isMultiplayer ? `Waiting for ${opponentName}` : 'Processing AI actions...'}
          </p>
        </div>

        {/* Room info for multiplayer */}
        {isMultiplayer && roomCode && (
          <div className="bg-slate-800 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <User className="w-4 h-4" />
              <span>Room: {roomCode}</span>
            </div>
          </div>
        )}

        {/* Last action display */}
        {lastAction && (
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Recent action:</p>
            <p className="text-white text-sm">{lastAction}</p>
          </div>
        )}

        {/* Animated dots */}
        <div className="flex justify-center mt-4">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingOverlay;