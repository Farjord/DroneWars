// ========================================
// AI CARD PLAY REPORT MODAL
// ========================================
// Modal that displays information about cards played by the AI opponent
// Shows the card that was played and any target information

import React from 'react';
import ActionCard from '../ui/ActionCard.jsx';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';

/**
 * AI CARD PLAY REPORT MODAL
 * Shows details of cards played by AI opponent with target information.
 * @param {Object} report - Card play report with card, target, and lane info
 * @param {Function} onClose - Callback when modal is closed
 */
const AICardPlayReportModal = ({ report, onClose }) => {
  if (!report) return null;

  const { card, targetName, targetLane } = report;

  return (
    <GamePhaseModal title="AI Action: Card Played" text="" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 mt-4">
        <p className="text-center text-lg text-gray-300">
          The opponent played <strong className="text-purple-400">{card.name}</strong>
          {targetName && (
            <> on <strong className="text-cyan-400">{targetName}</strong>
            {targetLane && <> in <strong className="text-yellow-400">{targetLane}</strong></>}
            </>
          )}!
        </p>
        {/* Display the card that was played */}
        <div className="transform scale-75">
          <ActionCard card={card} isPlayable={false} />
        </div>
      </div>
      <div className="flex justify-center mt-6">
        <button onClick={onClose} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-full hover:bg-purple-700 transition-colors">
          Continue
        </button>
      </div>
    </GamePhaseModal>
  );
};

export default AICardPlayReportModal;