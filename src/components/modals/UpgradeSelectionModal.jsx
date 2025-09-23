// ========================================
// UPGRADE SELECTION MODAL COMPONENT
// ========================================
// Displays modal for selecting which drone type to apply an upgrade to
// Shows available targets with visual selection feedback

import React, { useState } from 'react';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * UPGRADE SELECTION MODAL COMPONENT
 * Displays modal for selecting which drone type to apply an upgrade to.
 * Shows available targets with visual selection feedback.
 * @param {Object} selectionData - Contains card and target data
 * @param {Function} onConfirm - Callback when upgrade target is confirmed
 * @param {Function} onCancel - Callback when selection is cancelled
 */
const UpgradeSelectionModal = ({ selectionData, onConfirm, onCancel }) => {
  const { card, targets } = selectionData;
  const [selectedTarget, setSelectedTarget] = useState(null);

  return (
      <GamePhaseModal
          title={`Apply Upgrade: ${card.name}`}
          text="Select a drone type from your active pool to apply this permanent upgrade to."
          onClose={onCancel}
          maxWidthClass="max-w-4xl"
      >
          <div className="flex justify-center my-4">
              <ActionCard card={card} isPlayable={false} />
          </div>

          <div className="my-4 p-4 bg-black/20 rounded-lg max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {targets.map(drone => (
                      <div
                          key={drone.id}
                          onClick={() => setSelectedTarget(drone)}
                          className={`p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center gap-4
                              ${selectedTarget?.id === drone.id ? 'bg-purple-700 border-purple-400' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}
                          `}
                      >
                          <img src={drone.image} alt={drone.name} className="w-12 h-12 rounded-md object-cover" />
                          <span className="font-semibold text-white">{drone.name}</span>
                      </div>
                  ))}
              </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
              <button
                  onClick={onCancel}
                  className="bg-pink-600 text-white font-bold py-2 px-6 rounded-full hover:bg-pink-700 transition-colors"
              >
                  Cancel
              </button>
              <button
                  onClick={() => onConfirm(card, selectedTarget)}
                  disabled={!selectedTarget}
                  className="bg-green-600 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed enabled:hover:bg-green-700"
              >
                  Confirm Upgrade
              </button>
          </div>
      </GamePhaseModal>
  );
};

export default UpgradeSelectionModal;