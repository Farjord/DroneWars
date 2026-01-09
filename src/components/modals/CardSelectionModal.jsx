import React, { useState } from 'react';
import { Layers, Check } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

const CardSelectionModal = ({ isOpen, onClose, onConfirm, selectionData }) => {
  const [selectedCards, setSelectedCards] = useState([]);

  if (!isOpen || !selectionData) {
    return null;
  }

  const { searchedCards, drawCount, type, filter } = selectionData;

  const handleCardClick = (card) => {
    setSelectedCards(prev => {
      // Use instanceId if available, otherwise use a combination of id and name as fallback
      const cardIdentifier = card.instanceId || `${card.id}-${card.name}`;
      const isCurrentlySelected = prev.some(c => {
        const existingIdentifier = c.instanceId || `${c.id}-${c.name}`;
        return existingIdentifier === cardIdentifier;
      });

      if (isCurrentlySelected) {
        // Deselect the card
        return prev.filter(c => {
          const existingIdentifier = c.instanceId || `${c.id}-${c.name}`;
          return existingIdentifier !== cardIdentifier;
        });
      } else if (prev.length < drawCount) {
        // Select the card if we haven't reached the limit
        return [...prev, card];
      } else {
        // Replace the last selected card if at limit
        return [...prev.slice(0, -1), card];
      }
    });
  };

  const handleConfirm = () => {
    if (selectedCards.length === drawCount) {
      onConfirm(selectedCards);
      setSelectedCards([]);
    }
  };

  const handleClose = () => {
    setSelectedCards([]);
    onClose();
  };

  const canConfirm = selectedCards.length === drawCount;

  return (
    <div className="dw-modal-overlay">
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        style={{ maxWidth: '1280px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Layers size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">
              {type === 'search_and_draw' ? 'Choose Cards to Draw' : 'Select Cards'}
            </h2>
            <p className="dw-modal-header-subtitle">
              {filter ?
                `Select ${drawCount} ${filter.type} card${drawCount > 1 ? 's' : ''} from ${searchedCards.length} found` :
                `Select ${drawCount} from top ${searchedCards.length} cards`
              }
            </p>
          </div>
        </div>

        {/* Selection Counter */}
        <div style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid var(--modal-border)' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: canConfirm ? 'var(--modal-success)' : 'var(--modal-warning, #f59e0b)' }}>
            {selectedCards.length} of {drawCount} selected
          </span>
        </div>

        {/* Body - Scrollable Card Grid */}
        <div className="dw-modal-body" style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <div className="flex flex-wrap gap-4 justify-center" style={{ paddingTop: '12px' }}>
              {searchedCards.map((card, index) => {
                const cardIdentifier = card.instanceId || `${card.id}-${card.name}`;
                const isSelected = selectedCards.some(c => {
                  const existingIdentifier = c.instanceId || `${c.id}-${c.name}`;
                  return existingIdentifier === cardIdentifier;
                });

                return (
                  <div
                    key={card.instanceId || `${card.id}-${index}`}
                    onClick={() => handleCardClick(card)}
                    className="cursor-pointer relative transition-transform hover:scale-105"
                    style={{
                      borderRadius: '12px',
                      boxShadow: isSelected ? '0 0 20px rgba(34, 197, 94, 0.6)' : 'none',
                      outline: isSelected ? '3px solid #22c55e' : 'none'
                    }}
                  >
                    <ActionCard
                      card={card}
                      onClick={() => handleCardClick(card)}
                      isPlayable={true}
                      isSelected={false}
                    />
                    {/* Selection Checkmark Overlay */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 shadow-lg">
                        <Check size={20} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button
            className="dw-btn dw-btn-confirm"
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{ opacity: canConfirm ? 1 : 0.5, cursor: canConfirm ? 'pointer' : 'not-allowed' }}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardSelectionModal;