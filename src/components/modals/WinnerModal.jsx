// ========================================
// WINNER MODAL COMPONENT
// ========================================
// Modal that displays when the game ends, showing victory or defeat message

import React from 'react';
import { X } from 'lucide-react';

/**
 * WINNER MODAL COMPONENT
 * Shows victory or defeat message when the game ends.
 * @param {string} winner - ID of the winning player
 * @param {string} localPlayerId - ID of the local player
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onClose - Callback when modal is closed
 */
const WinnerModal = ({ winner, localPlayerId, show, onClose }) => {
  if (!show) return null;

  const isVictory = winner === localPlayerId;

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-container-md">
        {onClose && (
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">{isVictory ? "Victory!" : "Defeat!"}</h2>
        <p className="modal-text">
          {isVictory
            ? "You have crippled the enemy command ship."
            : "Your command ship has been crippled."
          }
        </p>
        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="btn-continue">
            View Final Board
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;