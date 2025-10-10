// ========================================
// CARD SELECTION MODAL
// ========================================
// Modal for selecting cards for deck in testing mode
// Displays all available cards with quantity selectors

import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * CardSelectionModal - Select cards for deck
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler (cancel)
 * @param {function} onConfirm - Confirm handler (selectedCards) => void
 * @param {Object} initialSelection - Currently selected cards { "CARD001": 2, "CARD002": 3 }
 * @param {Array} allCards - Full card collection to choose from
 * @param {string} title - Modal title
 * @param {number} minCards - Minimum number of cards required (default: 40, set to 0 for no minimum)
 * @param {boolean} mandatory - If true, prevents dismissal (no cancel/close buttons) - for gameplay where cancellation breaks game state
 */
const CardSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialSelection = {},
  allCards = [],
  title = "Select Cards",
  minCards = 40,
  mandatory = false
}) => {
  const [selectedCards, setSelectedCards] = useState({});
  const [filters, setFilters] = useState({
    cost: { min: 0, max: 20 },
    type: 'all',
    search: ''
  });

  // Initialize selection from props
  useEffect(() => {
    if (isOpen) {
      setSelectedCards({ ...initialSelection });
    }
  }, [isOpen, initialSelection]);

  // Calculate total card count (must be before early return to maintain hook order)
  const totalCards = Object.values(selectedCards).reduce((sum, qty) => sum + qty, 0);
  const isComplete = totalCards >= minCards;
  const canConfirm = minCards === 0 ? true : isComplete; // No minimum = always can confirm

  // Filter cards (useMemo must be called on every render)
  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      // Cost filter
      if (card.cost < filters.cost.min || card.cost > filters.cost.max) return false;
      // Type filter
      if (filters.type !== 'all' && card.type !== filters.type) return false;
      // Search filter
      if (filters.search && !card.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      // Sort by cost, then name
      if (a.cost !== b.cost) return a.cost - b.cost;
      return a.name.localeCompare(b.name);
    });
  }, [allCards, filters]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // Get quantity for a card
  const getCardQuantity = (cardId) => {
    return selectedCards[cardId] || 0;
  };

  // Update card quantity
  const setCardQuantity = (cardId, quantity) => {
    if (quantity <= 0) {
      const newSelection = { ...selectedCards };
      delete newSelection[cardId];
      setSelectedCards(newSelection);
    } else {
      setSelectedCards(prev => ({ ...prev, [cardId]: quantity }));
    }
  };

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(selectedCards);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={mandatory ? undefined : onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border-2 border-cyan-500 p-8 shadow-2xl shadow-cyan-500/20 max-w-[1600px] max-h-[900px] w-[95vw] h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            {title}
          </h2>
          {!mandatory && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
          )}
        </div>

        {/* Card Counter & Filters */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div className={`text-3xl font-orbitron font-bold ${
              isComplete ? 'text-green-400' : (minCards === 0 ? 'text-cyan-400' : 'text-yellow-400')
            }`}>
              {minCards === 0 ? (
                `${totalCards} Cards Selected`
              ) : (
                `${totalCards} / ${minCards}+ Cards Selected`
              )}
            </div>
            {!isComplete && minCards > 0 && (
              <p className="text-gray-400 text-sm">
                Minimum {minCards} cards required
              </p>
            )}
            {minCards === 0 && (
              <p className="text-gray-400 text-sm">
                Select any number of cards
              </p>
            )}
            {isComplete && minCards > 0 && (
              <p className="text-green-400 text-sm">
                ✓ Ready to confirm selection
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-4 gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search cards..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
            />

            {/* Type Filter */}
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
            >
              <option value="all">All Types</option>
              <option value="Action">Action Cards</option>
              <option value="Upgrade">Upgrade Cards</option>
            </select>

            {/* Cost Range */}
            <div className="col-span-2">
              <label className="text-gray-400 text-sm mb-1 block">
                Cost Range: {filters.cost.min} - {filters.cost.max}
              </label>
              <div className="flex gap-2">
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={filters.cost.min}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    cost: { ...prev.cost, min: Math.min(parseInt(e.target.value), prev.cost.max) }
                  }))}
                  className="flex-1"
                />
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={filters.cost.max}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    cost: { ...prev.cost, max: Math.max(parseInt(e.target.value), prev.cost.min) }
                  }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Card Grid */}
        <div className="overflow-y-auto flex-grow pr-4 mb-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-wrap gap-[10px] justify-center">
              {filteredCards.map((card, index) => {
                const quantity = getCardQuantity(card.id);
                const maxQuantity = card.maxInDeck || 3;

                return (
                  <div
                    key={`${card.id}-${index}`}
                    className="relative flex flex-col items-center"
                  >
                    <div
                      className={`transition-all duration-200 ${
                        quantity > 0
                          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900'
                          : 'hover:ring-2 hover:ring-cyan-600'
                      }`}
                      style={{
                        filter: quantity > 0 ? 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.4))' : 'none'
                      }}
                    >
                      <ActionCard
                        card={card}
                        onClick={() => {}}
                        isPlayable={true}
                        isSelected={quantity > 0}
                        isMandatoryTarget={false}
                        scale={0.7}
                      />
                    </div>

                    {/* Quantity Selector */}
                    <div className="mt-2 flex items-center gap-2 bg-gray-800 rounded px-3 py-1">
                      {Array.from({ length: maxQuantity + 1 }).map((_, qty) => (
                        <button
                          key={qty}
                          onClick={() => setCardQuantity(card.id, qty)}
                          className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                            quantity === qty
                              ? 'bg-cyan-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-cyan-600 hover:text-white'
                          }`}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex justify-center gap-4 flex-shrink-0">
          {!mandatory && (
            <button
              onClick={onClose}
              className="btn-cancel"
              style={{
                padding: '12px 32px',
                fontSize: '1.1rem',
                minWidth: '150px'
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`btn-confirm ${!canConfirm ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              padding: '12px 32px',
              fontSize: '1.1rem',
              minWidth: '150px'
            }}
          >
            {canConfirm ? 'Confirm Selection' : (minCards > 0 ? `Add ${minCards - totalCards} More Cards` : 'Confirm Selection')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardSelectionModal;
