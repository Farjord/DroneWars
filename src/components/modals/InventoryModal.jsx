import React, { useState, useMemo } from 'react';
import { useGameState } from '../../hooks/useGameState';
import fullCardCollection from '../../data/cardData';
import { RARITY_COLORS } from '../../data/cardData';

/**
 * InventoryModal Component
 * Full card glossary (owned + unowned) with collection progress
 */
const InventoryModal = ({ onClose }) => {
  const { gameState } = useGameState();
  const [selectedTab, setSelectedTab] = useState('All');
  const [selectedCard, setSelectedCard] = useState(null);

  const {
    singlePlayerInventory,
    singlePlayerDiscoveredCards,
    singlePlayerShipSlots,
  } = gameState;

  /**
   * Extract cards from Ship Slot 0 (immutable starter deck)
   * Slot 0 cards have infinite quantity
   */
  const slot0Cards = useMemo(() => {
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    if (!slot0 || !slot0.decklist) return {};

    const cardMap = {};
    for (const card of slot0.decklist) {
      cardMap[card.id] = Infinity;  // Infinite quantity for starter deck
    }
    return cardMap;
  }, [singlePlayerShipSlots]);

  /**
   * Enrich cards with discovery state and quantity
   * Merges Slot 0 cards (infinite) with inventory cards (finite)
   */
  const enrichedCards = useMemo(() => {
    return fullCardCollection.map(card => {
      const discoveryEntry = singlePlayerDiscoveredCards.find(d => d.cardId === card.id);

      // Determine quantity: Slot 0 cards show ∞, inventory cards show number
      let quantity;
      let isFromSlot0 = false;

      if (slot0Cards[card.id] === Infinity) {
        quantity = Infinity;
        isFromSlot0 = true;
      } else {
        quantity = singlePlayerInventory[card.id] || 0;
      }

      // Determine discovery state
      // - If in Slot 0 or inventory: 'owned'
      // - If in discoveredCards: use that state
      // - Otherwise: 'undiscovered'
      let discoveryState;
      if (isFromSlot0 || quantity > 0) {
        discoveryState = 'owned';
      } else if (discoveryEntry) {
        discoveryState = discoveryEntry.state;
      } else {
        discoveryState = 'undiscovered';
      }

      return {
        ...card,
        discoveryState,
        quantity,
        isFromSlot0  // Track for visual indicator
      };
    });
  }, [singlePlayerInventory, singlePlayerDiscoveredCards, slot0Cards]);

  /**
   * Filter cards by selected tab
   */
  const filteredCards = useMemo(() => {
    if (selectedTab === 'All') return enrichedCards;
    return enrichedCards.filter(card => card.type === selectedTab);
  }, [enrichedCards, selectedTab]);

  /**
   * Calculate collection stats
   * Includes Slot 0 cards and inventory cards in owned count
   */
  const collectionStats = useMemo(() => {
    const stats = {
      total: enrichedCards.length,
      owned: enrichedCards.filter(c => c.discoveryState === 'owned' || c.quantity > 0 || c.quantity === Infinity).length,
      discovered: enrichedCards.filter(c => c.discoveryState === 'discovered').length,
      byRarity: {}
    };

    // Stats per rarity
    for (const rarity of ['Common', 'Uncommon', 'Rare', 'Mythic']) {
      const rarityCards = enrichedCards.filter(c => c.rarity === rarity);
      stats.byRarity[rarity] = {
        total: rarityCards.length,
        owned: rarityCards.filter(c => c.discoveryState === 'owned' || c.quantity > 0 || c.quantity === Infinity).length,
      };
    }

    return stats;
  }, [enrichedCards]);

  /**
   * Get card visual style based on discovery state
   */
  const getCardStyle = (card) => {
    if (card.discoveryState === 'undiscovered') {
      return 'opacity-50 grayscale cursor-default';
    }
    if (card.discoveryState === 'discovered') {
      return 'opacity-70 grayscale cursor-pointer hover:opacity-80';
    }
    return 'cursor-pointer hover:scale-105 transition-transform';
  };

  /**
   * Get rarity badge color
   */
  const getRarityColor = (rarity) => {
    return RARITY_COLORS[rarity] || '#808080';
  };

  /**
   * Handle card click
   */
  const handleCardClick = (card) => {
    if (card.discoveryState !== 'undiscovered') {
      setSelectedCard(card);
    }
  };

  const tabs = ['All', 'Ordnance', 'Tactic', 'Support', 'Upgrade'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Inventory</h2>
            <p className="text-sm text-gray-400">
              {collectionStats.owned} / {collectionStats.total} cards owned
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Collection Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Object.entries(collectionStats.byRarity).map(([rarity, stats]) => (
            <div
              key={rarity}
              className="p-3 bg-gray-900 rounded border"
              style={{ borderColor: getRarityColor(rarity) }}
            >
              <div className="text-sm text-gray-400">{rarity}</div>
              <div className="text-lg font-bold" style={{ color: getRarityColor(rarity) }}>
                {stats.owned} / {stats.total}
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`
                px-4 py-2 font-bold transition-colors
                ${selectedTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
          {filteredCards.map(card => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`relative p-3 bg-gray-900 rounded-lg border-2 ${getCardStyle(card)}`}
              style={{
                borderColor: card.discoveryState === 'owned'
                  ? getRarityColor(card.rarity)
                  : '#4B5563'
              }}
            >
              {/* Undiscovered Placeholder */}
              {card.discoveryState === 'undiscovered' ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">???</div>
                  <div className="text-xs text-gray-500">{card.rarity}</div>
                </div>
              ) : (
                <>
                  {/* Card Name */}
                  <div className="font-bold text-sm text-white mb-1 line-clamp-2">
                    {card.name}
                  </div>

                  {/* Card Type */}
                  <div className="text-xs text-gray-400 mb-2">{card.type}</div>

                  {/* Cost */}
                  <div className="text-xs text-blue-400 mb-2">
                    Cost: {card.cost}
                  </div>

                  {/* Rarity Badge */}
                  <div
                    className="text-xs font-bold mb-2"
                    style={{ color: getRarityColor(card.rarity) }}
                  >
                    {card.rarity}
                  </div>

                  {/* Quantity Badge */}
                  {card.discoveryState === 'owned' && (
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${
                      card.quantity === Infinity ? 'bg-blue-600' : 'bg-green-600'
                    }`}>
                      {card.quantity === Infinity ? '∞' : `×${card.quantity}`}
                    </div>
                  )}

                  {/* "0 owned" for discovered cards */}
                  {card.discoveryState === 'discovered' && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-gray-600 rounded-full text-xs">
                      0 owned
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Card Detail Popup */}
        {selectedCard && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border-2"
              style={{ borderColor: getRarityColor(selectedCard.rarity) }}>
              {/* Card Name */}
              <h3 className="text-2xl font-bold text-white mb-2">{selectedCard.name}</h3>

              {/* Meta Info */}
              <div className="flex gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-400">Type: </span>
                  <span className="text-white">{selectedCard.type}</span>
                </div>
                <div>
                  <span className="text-gray-400">Cost: </span>
                  <span className="text-blue-400">{selectedCard.cost}</span>
                </div>
                <div>
                  <span className="text-gray-400">Rarity: </span>
                  <span style={{ color: getRarityColor(selectedCard.rarity) }}>
                    {selectedCard.rarity}
                  </span>
                </div>
              </div>

              {/* Quantity */}
              {selectedCard.discoveryState === 'owned' && (
                <div className={`mb-4 p-2 bg-opacity-30 border rounded ${
                  selectedCard.quantity === Infinity
                    ? 'bg-blue-900 border-blue-700'
                    : 'bg-green-900 border-green-700'
                }`}>
                  <span className={selectedCard.quantity === Infinity ? 'text-blue-200' : 'text-green-200'}>
                    Owned: {selectedCard.quantity === Infinity ? '∞' : selectedCard.quantity}
                    {selectedCard.isFromSlot0 && (
                      <span className="ml-2 text-xs">(Starter Deck)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Description */}
              <div className="mb-4 p-3 bg-gray-900 rounded">
                <p className="text-gray-300 text-sm">{selectedCard.description}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedCard(null)}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default InventoryModal;
