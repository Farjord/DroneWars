/**
 * ShopModal Component
 * Purchase tactical items and card packs for credits
 */

import React, { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import gameStateManager from '../../managers/GameStateManager.js';
import { tacticalItemCollection } from '../../data/tacticalItemData.js';
import packTypes, { getPackCostForTier } from '../../data/cardPackData.js';
import TacticalItemCard from '../ui/TacticalItemCard.jsx';
import LootRevealModal from './LootRevealModal.jsx';

/**
 * CardPackShopCard Component
 * Displays a purchaseable card pack in the shop
 */
const CardPackShopCard = ({ packType, tier, config, cost, canAfford, onBuy }) => {
  const tierLabel = `T${tier}`;
  const cardCount = config.cardCount.max;
  const packColor = config.color || '#667eea';

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-lg p-[4px] relative group transition-all duration-200 hover:scale-[1.02]"
        style={{
          width: '225px',
          height: '275px',
          backgroundColor: `${packColor}20`,
          border: `2px solid ${packColor}`,
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)'
        }}
      >
        <div className="w-full h-full relative flex flex-col font-orbitron overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${packColor}40 0%, ${packColor}10 100%)`
            }}
          />

          {/* Header - Pack Name */}
          <div
            className="flex items-center justify-center px-2 py-2 min-h-[40px]"
            style={{ backgroundColor: `${packColor}80` }}
          >
            <span className="text-white text-sm uppercase tracking-wide text-center font-bold">
              {config.name}
            </span>
          </div>

          {/* Tier Badge */}
          <div className="absolute top-1 right-1 px-2 py-0.5 rounded text-xs font-bold bg-black/60 text-yellow-400">
            {tierLabel}
          </div>

          {/* Middle - Icon & Description */}
          <div className="flex-1 flex flex-col items-center justify-center p-3 relative z-10">
            <Package size={48} style={{ color: packColor, marginBottom: '8px' }} />
            <p className="text-xs text-gray-200 text-center leading-relaxed px-2">
              {config.description}
            </p>
            <p className="text-sm text-white font-bold mt-2">
              Contains {cardCount} card{cardCount > 1 ? 's' : ''}
            </p>
          </div>

          {/* Footer - Cost & Buy */}
          <div
            className="flex flex-col items-center justify-center py-2 min-h-[60px]"
            style={{ backgroundColor: `${packColor}80` }}
          >
            <span className="font-orbitron text-lg font-bold text-yellow-400">
              {cost.toLocaleString()}
              <span className="text-sm ml-1 opacity-80">cr</span>
            </span>
            <button
              onClick={onBuy}
              disabled={!canAfford}
              className={`
                mt-1 px-4 py-1 text-xs font-orbitron uppercase tracking-wide rounded
                transition-all duration-200
                ${!canAfford
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                }
              `}
            >
              Buy Pack
            </button>
          </div>
        </div>
      </div>

      {/* Limited Stock label */}
      <div className="text-xs font-orbitron text-center text-amber-400">
        Limited Stock
      </div>
    </div>
  );
};

/**
 * ShopModal Component
 * Allows players to purchase tactical items and card packs
 */
const ShopModal = ({ onClose }) => {
  const { gameState } = useGameState();
  const [feedback, setFeedback] = useState(null);
  const [purchasedCards, setPurchasedCards] = useState(null); // For loot reveal

  const { singlePlayerProfile } = gameState;
  const credits = singlePlayerProfile?.credits || 0;

  // Get shop pack from state
  const shopPack = singlePlayerProfile?.shopPack;
  const packConfig = shopPack ? packTypes[shopPack.packType] : null;
  const packCost = shopPack ? getPackCostForTier(shopPack.tier) : 0;
  const canAffordPack = credits >= packCost;

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
   * Handle purchase of a card pack
   */
  const handlePackPurchase = () => {
    if (!shopPack || !canAffordPack) return;

    const result = gameStateManager.purchaseCardPack();

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    // Show loot reveal modal with purchased cards
    setPurchasedCards({
      cards: result.cards,
      salvageItems: [], // No salvage from shop packs
      aiCores: 0
    });

    setFeedback({
      type: 'success',
      message: `Purchased ${packConfig?.name || 'Card Pack'} for ${result.cost.toLocaleString()} credits`
    });
  };

  /**
   * Handle loot collection (close reveal modal)
   */
  const handleLootCollected = () => {
    setPurchasedCards(null);
    setFeedback(null);
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
    <>
      <div className="dw-modal-overlay" onClick={onClose}>
        <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="dw-modal-header">
            <div className="dw-modal-header-icon">
              <ShoppingCart size={28} />
            </div>
            <div className="dw-modal-header-info">
              <h2 className="dw-modal-header-title">Shop</h2>
              <p className="dw-modal-header-subtitle">Purchase tactical items and card packs</p>
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
                {/* Card Pack (if available) */}
                {shopPack && packConfig && (
                  <CardPackShopCard
                    packType={shopPack.packType}
                    tier={shopPack.tier}
                    config={packConfig}
                    cost={packCost}
                    canAfford={canAffordPack}
                    onBuy={handlePackPurchase}
                  />
                )}

                {/* Tactical Items */}
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
                <strong style={{ color: '#06b6d4' }}>Card Packs</strong> contain guaranteed cards based on tier.
                A new pack appears after each successful extraction.
                <br />
                <strong style={{ color: '#06b6d4' }}>Tactical Items</strong> can be used during runs on the tactical map.
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

      {/* Loot Reveal Modal for purchased packs */}
      {purchasedCards && (
        <LootRevealModal
          loot={purchasedCards}
          onCollect={handleLootCollected}
          show={true}
        />
      )}
    </>
  );
};

export default ShopModal;
