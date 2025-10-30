// ========================================
// CARD DETAIL MODAL COMPONENT
// ========================================
// Shows detailed view of a specific action card.
// Used for viewing card details from the game log.
// Follows the same pattern as DetailedDroneModal.

import React from 'react';
import { X } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * CardDetailModal - Displays detailed card information in a modal
 * @param {boolean} isOpen - Whether the modal should be displayed
 * @param {Object} card - The card data to display
 * @param {Function} onClose - Callback when modal is closed
 */
const CardDetailModal = ({ isOpen, card, onClose }) => {
  // Don't render if not open or no card data
  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 text-center mb-4">
          {card.name}
        </h2>
        <div className="flex justify-center">
          <ActionCard
            card={card}
            onClick={() => {}}
            isPlayable={true}
            isSelected={false}
            scale={1.2}
          />
        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;
