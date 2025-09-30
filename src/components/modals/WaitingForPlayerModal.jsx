// ========================================
// WAITING FOR PLAYER MODAL
// ========================================
// Modal that appears when waiting for opponent to acknowledge in simultaneous phases
// Shows waiting state for multiplayer synchronization

import React from 'react';
import { Clock, User, Loader2 } from 'lucide-react';

/**
 * WaitingForPlayerModal - Shows waiting state for simultaneous phase acknowledgment
 * @param {boolean} show - Whether to show the modal
 * @param {string} phase - The phase we're waiting for (e.g., 'determineFirstPlayer')
 * @param {string} opponentName - Name of the opponent we're waiting for
 * @param {string} roomCode - Room code for multiplayer sessions
 */
const WaitingForPlayerModal = ({ show, phase, opponentName = 'Opponent', roomCode }) => {
  if (!show) return null;

  // Get phase-specific messages
  const getPhaseMessage = (phase) => {
    switch (phase) {
      case 'determineFirstPlayer':
        return {
          title: 'Waiting for Acknowledgment',
          message: `Waiting for ${opponentName} to acknowledge first player determination`
        };
      case 'mandatoryDiscard':
        return {
          title: 'Waiting for Discard',
          message: `Waiting for ${opponentName} to complete mandatory discard`
        };
      case 'allocateShields':
        return {
          title: 'Waiting for Shield Allocation',
          message: `Waiting for ${opponentName} to allocate shields`
        };
      case 'mandatoryDroneRemoval':
        return {
          title: 'Waiting for Drone Removal',
          message: `Waiting for ${opponentName} to remove excess drones`
        };
      case 'deploymentComplete':
        return {
          title: 'Waiting for Acknowledgment',
          message: `Waiting for ${opponentName} to acknowledge deployment complete`
        };
      default:
        return {
          title: 'Waiting for Opponent',
          message: `Waiting for ${opponentName} to complete their action`
        };
    }
  };

  const { title, message } = getPhaseMessage(phase);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-slate-900 rounded-2xl border-2 border-amber-500 p-6 shadow-2xl shadow-amber-500/20 max-w-md w-full mx-4">

        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
            <Clock className="w-6 h-6" />
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            {title}
          </h3>
          <p className="text-gray-300 text-sm">
            {message}
          </p>
        </div>

        {/* Room info */}
        {roomCode && (
          <div className="bg-slate-800 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <User className="w-4 h-4" />
              <span>Room: {roomCode}</span>
            </div>
          </div>
        )}

        {/* Info message */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <p className="text-gray-400 text-xs mb-1">You have completed your part:</p>
          <p className="text-white text-sm">Waiting for opponent to finish</p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingForPlayerModal;