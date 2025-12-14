/**
 * ShopModal Component
 * Purchase tactical items for credits
 * Based on ReplicatorModal pattern
 */

import React, { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import gameStateManager from '../../managers/GameStateManager.js';
import { tacticalItemCollection, getTacticalItemById } from '../../data/tacticalItemData.js';
import TacticalItemCard from '../ui/TacticalItemCard.jsx';

/**
 * ShopModal Component
 * Allows players to purchase tactical items for credits
 */
const ShopModal = ({ onClose }) => {
  const { gameState } = useGameState();
  const [feedback, setFeedback] = useState(null);

  const { singlePlayerProfile } = gameState;
  const credits = singlePlayerProfile?.credits || 0;

  /**
   * Handle purchase of a tactical item
   */
  const handlePurchase = (item) => {
    const result = gameStateManager.purchaseTacticalItem(item.id);

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setFeedback({
      type: 'success',
      message: `Purchased ${item.name} for ${item.cost.toLocaleString()} credits`
    });

    setTimeout(() => setFeedback(null), 2000);
  };

  /**
   * Check if player can afford and has capacity for an item
   */
  const canPurchase = (item) => {
    const owned = singlePlayerProfile?.tacticalItems?.[item.id] || 0;
    return credits >= item.cost && owned < item.maxCapacity;
  };

  /**
   * Get current quantity owned for an item
   */
  const getOwnedQuantity = (itemId) => {
    return singlePlayerProfile?.tacticalItems?.[itemId] || 0;
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <ShoppingCart size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Shop</h2>
            <p className="dw-modal-header-subtitle">Purchase tactical items for your runs</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Credits Display */}
          <div className="dw-modal-credits">
            <span className="dw-modal-credits-label">Available Credits</span>
            <span className="dw-modal-credits-value">{credits.toLocaleString()}</span>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`dw-modal-feedback dw-modal-feedback--${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* Items Grid */}
          <div className="dw-modal-scroll" style={{ maxHeight: '400px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
              justifyItems: 'center'
            }}>
              {tacticalItemCollection.map(item => {
                const owned = getOwnedQuantity(item.id);
                const canBuy = canPurchase(item);
                const atMaxCapacity = owned >= item.maxCapacity;

                return (
                  <div key={item.id} className="flex flex-col items-center gap-2">
                    <TacticalItemCard
                      item={item}
                      showCost={true}
                      onBuy={() => handlePurchase(item)}
                      disabled={!canBuy}
                    />
                    {/* Owned quantity display */}
                    <div className="text-sm font-orbitron text-center">
                      <span className={`${atMaxCapacity ? 'text-green-400' : 'text-cyan-300'}`}>
                        Owned: {owned} / {item.maxCapacity}
                      </span>
                      {atMaxCapacity && (
                        <span className="block text-xs text-green-400 mt-1">MAX</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info Box */}
          <div className="dw-modal-info-box" style={{ marginTop: '16px', background: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
            <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0 }}>
              <strong style={{ color: '#06b6d4' }}>Tactical Items</strong> can be used during runs on the tactical map.
              Each item type has a maximum capacity limit.
            </p>
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

export default ShopModal;
