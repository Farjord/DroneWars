// ========================================
// CARD DETAIL MODAL COMPONENT
// ========================================
// Shows detailed view of a specific action card.
// Used for viewing card details from the game log.

import React from 'react';
import { FileText } from 'lucide-react';
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
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <FileText size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{card.name}</h2>
            <p className="dw-modal-header-subtitle">{card.type} Card</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ActionCard
              card={card}
              onClick={() => {}}
              isPlayable={true}
              isSelected={false}
              scale={1.1}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;
