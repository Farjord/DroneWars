import React, { useState, useMemo } from 'react';
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

  // Get costs from service for display
  const REPLICATE_COSTS = replicatorService.getAllCosts();

  /**
   * Get owned cards with replicate costs
   * Excludes Slot 0 cards (can't replicate infinite starter deck cards)
   */
  const ownedCards = useMemo(() => {
    return replicatorService.getReplicatableCards().map(({ card, quantity, replicationCost }) => ({
      ...card,
      quantity,
      replicateCost: replicationCost
    }));
  }, [gameState.singlePlayerInventory, gameState.singlePlayerShipSlots]);

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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Replicator</h2>
            <p className="text-sm text-gray-400">Duplicate owned cards for credits</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Credits Display */}
        <div className="mb-4 p-3 bg-gray-900 rounded">
          <span className="text-gray-400">Available Credits: </span>
          <span className="text-yellow-400 font-bold text-lg">{credits}</span>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className={`
            p-3 rounded mb-4
            ${feedback.type === 'success' ? 'bg-green-900 bg-opacity-30 border border-green-700 text-green-200' : ''}
            ${feedback.type === 'error' ? 'bg-red-900 bg-opacity-30 border border-red-700 text-red-200' : ''}
          `}>
            {feedback.message}
          </div>
        )}

        {/* Empty State */}
        {ownedCards.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-xl mb-2">No Cards to Replicate</p>
            <p className="text-sm">You don't own any cards yet. Acquire cards through gameplay or crafting.</p>
          </div>
        ) : (
          <>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCards.map(card => {
                const canAfford = credits >= card.replicateCost;

                return (
                  <div
                    key={card.id}
                    className="p-4 bg-gray-900 rounded-lg border-2"
                    style={{ borderColor: getRarityColor(card.rarity) }}
                  >
                    {/* Card Name */}
                    <div className="font-bold text-white mb-2 line-clamp-2">{card.name}</div>

                    {/* Type & Rarity */}
                    <div className="text-xs text-gray-400 mb-1">{card.type}</div>
                    <div className="text-xs font-bold mb-1"
                      style={{ color: getRarityColor(card.rarity) }}>
                      {card.rarity}
                    </div>

                    {/* Current Quantity */}
                    <div className="mb-2 text-sm text-gray-400">
                      Owned: <span className="text-green-400 font-bold">{card.quantity}</span>
                    </div>

                    {/* Replicate Cost */}
                    <div className="mb-3 text-sm text-gray-400">
                      Cost: <span className="text-yellow-400 font-bold">{card.replicateCost}</span>
                    </div>

                    {/* Replicate Button */}
                    <button
                      onClick={() => handleReplicate(card)}
                      disabled={!canAfford}
                      className={`
                        w-full px-3 py-2 rounded font-bold text-sm transition-colors
                        ${canAfford
                          ? 'bg-purple-600 hover:bg-purple-500'
                          : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }
                      `}
                    >
                      Replicate
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-purple-900 bg-opacity-30 border border-purple-700 rounded">
              <p className="text-sm text-purple-200">
                <strong>Replicate Costs:</strong> Common {REPLICATE_COSTS.Common}, Uncommon {REPLICATE_COSTS.Uncommon},
                Rare {REPLICATE_COSTS.Rare}, Mythic {REPLICATE_COSTS.Mythic} credits
              </p>
            </div>
          </>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ReplicatorModal;
