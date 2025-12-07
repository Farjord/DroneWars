// ========================================
// REPLICATOR MODAL COMPONENT
// ========================================
// Duplicate owned cards for credits

import React, { useState, useMemo } from 'react';
import { Copy, Package } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import { RARITY_COLORS } from '../../data/cardData';
import replicatorService from '../../logic/economy/ReplicatorService.js';

/**
 * ReplicatorModal Component
 * Duplicate owned cards for credits
 * Uses ReplicatorService for cost calculations and replication operations
 */
const ReplicatorModal = ({ onClose }) => {
  const { gameState } = useGameState();
  const [feedback, setFeedback] = useState(null);
  const [selectedTab, setSelectedTab] = useState('All');

  const { singlePlayerProfile } = gameState;
  const credits = singlePlayerProfile?.credits || 0;

  // Get costs from service for display (with fallback for showcase mode)
  let REPLICATE_COSTS = { Common: 100, Uncommon: 250, Rare: 600, Mythic: 1500 };
  try {
    const costs = replicatorService.getAllCosts();
    if (costs) REPLICATE_COSTS = costs;
  } catch (e) {
    console.debug('ReplicatorModal: Service costs not available in preview mode');
  }

  /**
   * Get replicatable cards (owned non-starter cards)
   */
  const ownedCards = useMemo(() => {
    try {
      return replicatorService.getReplicatableCards().map(({ card, quantity, replicationCost, isStarterCard }) => ({
        ...card,
        quantity,
        replicateCost: replicationCost,
        isStarterCard: isStarterCard || false
      }));
    } catch (e) {
      console.debug('ReplicatorModal: Service not available in preview mode');
      return [];
    }
  }, [gameState?.singlePlayerInventory, gameState?.singlePlayerShipSlots]);

  /**
   * Filter by tab
   */
  const filteredCards = useMemo(() => {
    if (selectedTab === 'All') return ownedCards;
    return ownedCards.filter(card => card.type === selectedTab);
  }, [ownedCards, selectedTab]);

  /**
   * Handle replicate button click
   */
  const handleReplicate = (card) => {
    const result = replicatorService.replicate(card.id);

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Replicated ${card.name} for ${result.cost} credits`
    });

    setTimeout(() => setFeedback(null), 2000);
  };

  /**
   * Get rarity color
   */
  const getRarityColor = (rarity) => {
    return RARITY_COLORS[rarity] || '#808080';
  };

  const tabs = ['All', 'Ordnance', 'Tactic', 'Support', 'Upgrade'];

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Copy size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Replicator</h2>
            <p className="dw-modal-header-subtitle">Duplicate owned cards for credits</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Credits Display */}
          <div className="dw-modal-credits">
            <span className="dw-modal-credits-label">Available Credits</span>
            <span className="dw-modal-credits-value">{credits}</span>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`dw-modal-feedback dw-modal-feedback--${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* Empty State */}
          {ownedCards.length === 0 ? (
            <div className="dw-modal-empty">
              <div className="dw-modal-empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <Package size={48} style={{ color: 'var(--modal-text-muted)', opacity: 0.5 }} />
              </div>
              <p className="dw-modal-empty-text">No Cards to Replicate</p>
              <p style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginTop: '8px' }}>
                You don't own any cards yet. Acquire cards through gameplay or crafting.
              </p>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="dw-modal-tabs">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`dw-modal-tab ${selectedTab === tab ? 'dw-modal-tab--active' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              <div className="dw-modal-scroll" style={{ maxHeight: '400px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '12px'
                }}>
                  {filteredCards.map(card => {
                    const canAfford = credits >= card.replicateCost;

                    return (
                      <div
                        key={card.id}
                        className="dw-modal-info-box"
                        style={{
                          marginBottom: 0,
                          borderColor: getRarityColor(card.rarity)
                        }}
                      >
                        {/* Card Name */}
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#fff',
                          marginBottom: '6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {card.name}
                        </div>

                        {/* Type & Rarity */}
                        <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', marginBottom: '4px' }}>
                          {card.type}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: getRarityColor(card.rarity),
                          marginBottom: '6px'
                        }}>
                          {card.rarity}
                        </div>

                        {/* Current Quantity */}
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--modal-text-secondary)',
                          marginBottom: '4px'
                        }}>
                          Owned: <span style={{ color: 'var(--modal-success)', fontWeight: '600' }}>{card.quantity}</span>
                        </div>

                        {/* Replicate Cost */}
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--modal-text-secondary)',
                          marginBottom: '10px'
                        }}>
                          Cost: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{card.replicateCost}</span>
                        </div>

                        {/* Replicate Button */}
                        <button
                          className={`dw-btn dw-btn-confirm dw-btn--full ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(180deg, #9333ea 0%, #7e22ce 100%)' }}
                          onClick={() => handleReplicate(card)}
                          disabled={!canAfford}
                        >
                          Replicate
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info Box */}
              <div className="dw-modal-info-box" style={{ marginTop: '16px', background: 'rgba(147, 51, 234, 0.1)', borderColor: 'rgba(147, 51, 234, 0.3)' }}>
                <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0 }}>
                  <strong style={{ color: '#a855f7' }}>Costs:</strong>{' '}
                  Common {REPLICATE_COSTS.Common}, Uncommon {REPLICATE_COSTS.Uncommon}, Rare {REPLICATE_COSTS.Rare}, Mythic {REPLICATE_COSTS.Mythic}
                </p>
              </div>
            </>
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

export default ReplicatorModal;
