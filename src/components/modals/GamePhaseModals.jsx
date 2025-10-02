// ========================================
// GAME PHASE MODALS
// ========================================
// Modal components for game phase transitions
// Extracted from App.jsx to improve component organization

import React from 'react';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';

/**
 * Deployment Complete Modal - Announces the end of deployment phase
 * @param {boolean} show - Whether to show the modal
 * @param {string} firstPlayerOfRound - ID of the first player
 * @param {string} localPlayerId - ID of the local player
 * @param {string} localPlayerName - Name of the local player
 * @param {string} opponentPlayerName - Name of the opponent player
 * @param {Function} onContinue - Callback when continue button is clicked
 */
export const DeploymentCompleteModal = ({
  show,
  firstPlayerOfRound,
  localPlayerId,
  localPlayerName,
  opponentPlayerName,
  onContinue
}) => {
  if (!show) return null;

  const firstPlayerName = firstPlayerOfRound === localPlayerId ? localPlayerName : opponentPlayerName;
  const modalText = `Deployment phase has ended. The action phase will now begin with ${firstPlayerName} going first.`;

  return (
    <GamePhaseModal
      title="Deployment Complete"
      text={modalText}
      onClose={onContinue}
    >
      <div className="flex justify-center mt-6">
        <button
          onClick={onContinue}
          className="btn-continue"
        >
          Continue to Action Phase
        </button>
      </div>
    </GamePhaseModal>
  );
};

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