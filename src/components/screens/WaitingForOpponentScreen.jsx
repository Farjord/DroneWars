// ========================================
// WAITING FOR OPPONENT SCREEN
// ========================================
// Shared component shown when local player has completed a step
// but is waiting for their opponent to finish.

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * SUBMITTING OVERLAY COMPONENT
 * Displays feedback while remote client's action is being sent to host and confirmed.
 * Shows between clicking Continue and host confirming the commitment.
 */
export const SubmittingOverlay = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center p-8">
        <Loader2 className="w-16 h-16 mx-auto text-cyan-400 animate-spin mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">
          Processing Your Selection
        </h2>
        <p className="text-gray-400 text-lg">
          Sending your choices to the host...
        </p>
      </div>
    </div>
  );
};

/**
 * WAITING FOR OPPONENT SCREEN COMPONENT
 * Displays waiting screen when opponent is still making selections.
 * Shows loading indicator and current status.
 * @param {string} phase - Current sub-phase (deckSelection, droneSelection, placement)
 * @param {string} localPlayerStatus - Local player completion status text
 */
const WaitingForOpponentScreen = ({ phase, localPlayerStatus }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center p-8">
        <Loader2 className="w-16 h-16 mx-auto text-cyan-400 animate-spin mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">
          Waiting for Your Opponent
        </h2>
        <p className="text-gray-400 text-lg mb-6">
          {phase === 'droneSelection' && 'Your opponent is still selecting their drones...'}
          {phase === 'deckSelection' && 'Your opponent is still choosing their deck...'}
          {phase === 'placement' && 'Your opponent is still placing their ship components...'}
          {!phase && 'Your opponent is still making their selections...'}
        </p>
        {localPlayerStatus && (
          <div className="bg-slate-800 rounded-lg p-4 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-green-400 mb-2">Your Selection Complete</h3>
            <p className="text-gray-300 text-sm">{localPlayerStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingForOpponentScreen;
