// ========================================
// CARDS TAB CONTENT COMPONENT
// ========================================
// Cards category: filter tabs, stats bar, and card grid

import React, { useMemo } from 'react';
import HiddenCard from '../../ui/HiddenCard';
import ActionCard from '../../ui/ActionCard';
import { getRarityColor, getCardStyle } from './inventoryUtils';
import RarityStatsBar from './RarityStatsBar';

const CARD_TYPE_TABS = ['All', 'Ordnance', 'Tactic', 'Support', 'Upgrade'];

/**
 * CardsTabContent Component
 * Renders the cards inventory tab with type filters, rarity stats, and card grid.
 */
const CardsTabContent = ({
  enrichedCards,
  collectionStats,
  selectedTab,
  setSelectedTab,
  onCardClick,
}) => {
  const filteredCards = useMemo(() => {
    if (selectedTab === 'All') return enrichedCards;
    return enrichedCards.filter(card => card.type === selectedTab);
  }, [enrichedCards, selectedTab]);

  return (
    <>
      {/* Fixed Filters */}
      <div style={{ flexShrink: 0 }}>
        {/* Collection Stats Grid - Compact */}
        <RarityStatsBar byRarity={collectionStats.byRarity} />

        {/* Tab Navigation */}
        <div className="dw-modal-tabs" style={{ marginBottom: '12px' }}>
          {CARD_TYPE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`dw-modal-tab ${selectedTab === tab ? 'dw-modal-tab--active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Grid (rendered inside parent's scroll area) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '10px',
        justifyItems: 'center'
      }}>
        {filteredCards.map(card => {
          const textColor = card.isFromSlot0
            ? 'var(--modal-action)'
            : card.discoveryState === 'discovered'
              ? 'var(--modal-text-muted)'
              : 'var(--modal-success)';

          return (
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
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}
            >
              {card.discoveryState === 'undiscovered' ? (
                /* Undiscovered - Use HiddenCard component (scaled to match ActionCard) */
                <>
                  <div
                    style={{
                      width: '162px',
                      height: '198px',
                      overflow: 'visible'
                    }}
                  >
                    <div style={{
                      transform: 'scale(0.72)',
                      transformOrigin: 'top left'
                    }}>
                      <HiddenCard
                        rarity={card.rarity}
                        size="full"
                        style={{ opacity: 0.8 }}
                      />
                    </div>
                  </div>
                  {/* Rarity label for hidden cards */}
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '4px 0',
                      color: getRarityColor(card.rarity),
                      fontWeight: '600',
                      fontSize: '15px',
                      textAlign: 'center'
                    }}
                  >
                    {card.rarity}
                  </div>
                </>
              ) : (
                /* Owned/Discovered - Show full ActionCard (scaled down) */
                <>
                  <div
                    onClick={() => onCardClick(card)}
                    style={{
                      width: '162px',
                      height: '198px',
                      overflow: 'visible',
                      cursor: 'pointer',
                      ...getCardStyle(card)
                    }}
                  >
                    <div style={{
                      transform: 'scale(0.72)',
                      transformOrigin: 'top left'
                    }}>
                      <ActionCard card={card} isPlayable={card.discoveryState === 'owned'} />
                    </div>
                  </div>

                  {/* Quantity Bar */}
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '4px 0',
                      color: textColor,
                      fontWeight: '600',
                      fontSize: '15px',
                      textAlign: 'center'
                    }}
                  >
                    {card.isFromSlot0 ? (
                      <>Starter Card - ∞</>
                    ) : card.discoveryState === 'discovered' ? (
                      <>Not Owned</>
                    ) : (
                      <>×{card.quantity} Owned</>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CardsTabContent;
