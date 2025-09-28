// ========================================
// OPPONENT TURN MODAL COMPONENT
// ========================================
// Modal that displays when it's the opponent's turn to act
// Cannot be manually closed - automatically removed when turn changes

import React from 'react';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';

/**
 * OPPONENT TURN MODAL COMPONENT
 * Shows a non-dismissible notification when it's the opponent's turn.
 * Automatically removed when the turn changes back to the player.
 * @param {boolean} show - Whether to show the modal
 * @param {boolean} isMultiplayer - Whether this is a multiplayer game
 * @param {string} phase - Current game phase ('deployment' or 'action')
 * @param {string} actionType - Type of action ('deploy', 'action', 'another') for custom messaging
 */
const OpponentTurnModal = ({ show, isMultiplayer, phase, actionType = 'action' }) => {
  if (!show) return null;

  // Determine title based on game mode
  const title = isMultiplayer ? "Opponent's Turn" : "AI Thinking...";

  // Determine message based on phase and action type
  let text;
  if (actionType === 'deploy') {
    text = isMultiplayer
      ? "Your opponent is deploying a drone. Wait for their turn to complete."
      : "AI is deciding on drone deployment...";
  } else if (actionType === 'another') {
    text = "Your opponent takes another action!";
  } else if (phase === 'deployment') {
    text = isMultiplayer
      ? "Your opponent is deploying a drone. Wait for their turn to complete."
      : "AI is deciding on drone deployment...";
  } else {
    text = isMultiplayer
      ? "Your opponent is taking their turn."
      : "AI is deciding on its next action...";
  }

  return (
    <GamePhaseModal
      title={title}
      text={text}
      onClose={null} // Cannot be manually closed
    />
  );
};

export default OpponentTurnModal;