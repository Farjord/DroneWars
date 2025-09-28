// ========================================
// GAME PHASE MODALS
// ========================================
// Modal components for game phase transitions
// Extracted from App.jsx to improve component organization

import React from 'react';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';

/**
 * First Player Modal - Shows which player goes first this round
 * @param {boolean} show - Whether to show the modal
 * @param {string} firstPlayerOfRound - ID of the first player
 * @param {string} localPlayerId - ID of the local player
 * @param {string} localPlayerName - Name of the local player
 * @param {string} opponentPlayerName - Name of the opponent player
 * @param {number} turn - Current turn number
 * @param {string} firstPasserOfPreviousRound - ID of player who passed first last round
 * @param {Function} onContinue - Callback when continue button is clicked
 */
export const FirstPlayerModal = ({
  show,
  firstPlayerOfRound,
  localPlayerId,
  localPlayerName,
  opponentPlayerName,
  turn,
  firstPasserOfPreviousRound,
  onContinue
}) => {
  if (!show) return null;

  const firstPlayerName = firstPlayerOfRound === localPlayerId ? localPlayerName : opponentPlayerName;

  // Calculate reason text internally
  let reasonText;
  if (turn === 1) {
    reasonText = "The first player is determined randomly for the first round.";
  } else {
    const passerName = firstPasserOfPreviousRound === localPlayerId ? localPlayerName : opponentPlayerName;
    reasonText = `${passerName} passed first in the previous round, securing the initiative.`;
  }

  const modalText = `${firstPlayerName} will go first this round. ${reasonText}`;

  return (
    <GamePhaseModal
      title="First Player Determined"
      text={modalText}
      onClose={onContinue}
    >
      <div className="flex justify-center mt-6">
        <button
          onClick={onContinue}
          className="btn-continue"
        >
          Continue
        </button>
      </div>
    </GamePhaseModal>
  );
};

/**
 * Action Phase Start Modal - Announces the start of the action phase
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onContinue - Callback when continue button is clicked
 */
export const ActionPhaseStartModal = ({ show, onContinue }) => {
  if (!show) return null;

  return (
    <GamePhaseModal
      title="Action Phase"
      text="Deployment has ended. Prepare for action!"
      onClose={onContinue}
    >
      <div className="flex justify-center mt-6">
        <button
          onClick={onContinue}
          className="btn-continue"
        >
          Continue
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