// ========================================
// AI HAND DEBUG MODAL COMPONENT
// ========================================
// Modal that displays the opponent's hand for debug purposes

import React from 'react';
import { X } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * AI HAND DEBUG MODAL COMPONENT
 * Shows the opponent's hand cards for debug purposes only.
 * @param {Object} opponentPlayerState - Opponent player state with hand data
 * @param {boolean} show - Whether to show the modal
 * @param {boolean} debugMode - Whether debug mode is enabled
 * @param {Function} onClose - Callback when modal is closed
 */
const AIHandDebugModal = ({ opponentPlayerState, show, debugMode, onClose }) => {
  if (!show || !debugMode || !opponentPlayerState) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-6xl">
        {onClose && (
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        )}
        <h2 className="modal-title">Opponent's Hand (Debug View)</h2>
        <p className="modal-text">
          The opponent is holding {opponentPlayerState.hand.length} card(s). This view is for debug purposes only.
        </p>
        <div className="flex flex-nowrap items-center gap-4 my-4 p-4 overflow-x-auto bg-black/20 rounded">
          {opponentPlayerState.hand.length > 0 ? (
            opponentPlayerState.hand.map(card => (
              <ActionCard
                key={card.instanceId}
                card={card}
                isPlayable={false}
              />
            ))
          ) : (
            <p className="text-gray-500 italic">The opponent's hand is empty.</p>
          )}
        </div>
        <div className="flex justify-center mt-6">
          <button onClick={onClose} className="btn-continue">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIHandDebugModal;