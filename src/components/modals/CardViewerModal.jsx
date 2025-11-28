import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * CardViewerModal - Displays cards in a grid
 * @param {boolean} groupByType - When true, groups cards by type and shows quantities
 * @param {Array} allCards - Full deck composition (deck + hand + discardPile) for showing 0-count cards
 */
const CardViewerModal = ({ isOpen, onClose, cards, title, shouldSort, groupByType = false, allCards = [] }) => {
  if (!isOpen) {
    return null;
  }

  // When groupByType is enabled, group cards and calculate quantities
  const groupedCards = useMemo(() => {
    if (!groupByType) return null;

    // Get unique cards from allCards (full deck composition)
    const allCardMap = new Map();
    allCards.forEach(card => {
      if (!allCardMap.has(card.id)) {
        allCardMap.set(card.id, { card, totalCount: 0 });
      }
      allCardMap.get(card.id).totalCount++;
    });

    // Count remaining in deck (cards prop)
    const remainingMap = new Map();
    cards.forEach(card => {
      remainingMap.set(card.id, (remainingMap.get(card.id) || 0) + 1);
    });

    // Build grouped list with remaining counts
    const grouped = [];
    allCardMap.forEach(({ card }, cardId) => {
      grouped.push({
        card,
        remaining: remainingMap.get(cardId) || 0
      });
    });

    // Sort by name
    return grouped.sort((a, b) => a.card.name.localeCompare(b.card.name));
  }, [cards, allCards, groupByType]);

  // Standard mode: sort cards if needed
  const cardsToDisplay = shouldSort && !groupByType
    ? [...cards].sort((a, b) => a.name.localeCompare(b.name))
    : cards;

  // Calculate subtitle based on mode
  const subtitleText = groupByType
    ? `${cards.length} card${cards.length !== 1 ? 's' : ''} remaining`
    : `${cardsToDisplay.length} card${cardsToDisplay.length !== 1 ? 's' : ''}`;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        style={{ maxWidth: '1280px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Eye size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{title}</h2>
            <p className="dw-modal-header-subtitle">{subtitleText}</p>
          </div>
        </div>

        {/* Body - Scrollable Card Grid */}
        <div className="dw-modal-body" style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
          {groupByType ? (
            /* Grouped mode with containers */
            groupedCards && groupedCards.length > 0 ? (
              <div className="dw-modal-scroll" style={{ height: '100%' }}>
                <div className="flex flex-wrap gap-[12px] justify-center">
                  {groupedCards.map(({ card, remaining }) => (
                    <div
                      key={card.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.35)',
                        borderRadius: '4px',
                        padding: '16px',
                        paddingBottom: '10px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                        opacity: remaining === 0 ? 0.6 : 1
                      }}
                    >
                      <div style={{ filter: remaining === 0 ? 'grayscale(0.8)' : 'none' }}>
                        <ActionCard
                          card={card}
                          onClick={() => {}}
                          isPlayable={remaining > 0}
                          isSelected={false}
                          mandatoryAction={null}
                          excessCards={0}
                        />
                      </div>
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '4px 0',
                          color: remaining === 0 ? 'var(--modal-text-muted)' : 'var(--modal-theme)',
                          fontWeight: '600',
                          fontSize: '15px',
                          textAlign: 'center'
                        }}
                      >
                        {remaining} remaining
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="dw-modal-info-box" style={{ textAlign: 'center', padding: '60px' }}>
                <p style={{ color: 'var(--modal-text-secondary)', fontStyle: 'italic', fontSize: '18px' }}>There are no cards here!</p>
              </div>
            )
          ) : (
            /* Standard mode */
            cardsToDisplay.length > 0 ? (
              <div className="dw-modal-scroll" style={{ height: '100%' }}>
                <div className="grid grid-cols-5 gap-6 justify-items-center">
                  {cardsToDisplay.map((card, index) => (
                    <div key={`${card.instanceId}-${index}`}>
                      <ActionCard
                        card={card}
                        onClick={() => {}}
                        isPlayable={true}
                        isSelected={false}
                        mandatoryAction={null}
                        excessCards={0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="dw-modal-info-box" style={{ textAlign: 'center', padding: '60px' }}>
                <p style={{ color: 'var(--modal-text-secondary)', fontStyle: 'italic', fontSize: '18px' }}>There are no cards here!</p>
              </div>
            )
          )}
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

export default CardViewerModal;