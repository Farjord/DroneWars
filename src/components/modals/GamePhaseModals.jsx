// ========================================
// GAME PHASE MODALS
// ========================================
// Modal components for game phase transitions
// Extracted from App.jsx to improve component organization

import React from 'react';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';

/**
 * Round End Modal - Announces the end of the round
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onContinue - Callback when continue button is clicked
 */
export const RoundEndModal = ({ show, onContinue }) => {
  if (!show) return null;

  return (
    <GamePhaseModal
      title="Round Over"
      text="Both players have passed. The action phase has ended."
      onClose={onContinue}
    >
      <div className="flex justify-center mt-6">
        <button
          onClick={onContinue}
          className="btn-continue"
        >
          Begin Next Round
        </button>
      </div>
    </GamePhaseModal>
  );
};