// ========================================
// OPPONENT DECIDING INTERCEPTION MODAL
// ========================================
// Modal that appears for the attacker while defender is choosing whether to intercept
// Shows blocking overlay with transparent background during interception decision

import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

/**
 * OpponentDecidingInterceptionModal - Shows waiting state while opponent decides on interception
 * @param {boolean} show - Whether to show the modal
 * @param {string} opponentName - Name of the opponent making the decision
 */
const OpponentDecidingInterceptionModal = ({ show, opponentName = 'Opponent' }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-slate-900/95 rounded-2xl border-2 border-blue-500 p-6 shadow-2xl shadow-blue-500/20 max-w-md w-full mx-4">

        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
            <Shield className="w-6 h-6" />
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            Interception Decision
          </h3>
          <p className="text-gray-300 text-sm">
            {opponentName} is choosing whether to intercept
          </p>
        </div>

        {/* Info message */}
        <div className="bg-slate-800 rounded-lg p-3 mb-4">
          <p className="text-gray-400 text-xs mb-1">Waiting for defender's choice:</p>
          <p className="text-white text-sm">Attack will continue once decided</p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentDecidingInterceptionModal;
