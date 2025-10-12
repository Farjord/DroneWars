// ========================================
// DECK BUILDING MODAL
// ========================================
// Visual grid-based deck building interface matching Deck Builder style
// Used in Testing Mode for deck configuration

import { useState, useMemo, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * DeckBuildingModal - Grid-based deck building interface
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {function} onConfirm - Confirm handler receiving deckComposition object
 * @param {object} initialSelection - Initial deck composition {cardId: quantity}
 * @param {array} allCards - Full card collection to choose from
 * @param {string} title - Modal title
 * @param {number} minCards - Minimum cards required (default: 40)
 */
function DeckBuildingModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelection = {},
  allCards = [],
  title = 'Build Deck',
  minCards = 40
}) {
  // Local deck composition state
  const [deckComposition, setDeckComposition] = useState({ ...initialSelection });

  // Sync internal state when modal opens or initialSelection changes
  useEffect(() => {
    if (isOpen) {
      setDeckComposition({ ...initialSelection });
    }
  }, [isOpen, initialSelection]);

  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'cost', 'type'
  const [filterType, setFilterType] = useState('all'); // 'all', 'DRONE', 'SHIP', 'ACTION'

  // Detailed card view state
  const [detailedCard, setDetailedCard] = useState(null);

  // Calculate total cards in deck
  const totalCards = useMemo(() => {
    return Object.values(deckComposition).reduce((sum, count) => sum + count, 0);
  }, [deckComposition]);

  // Filter and sort cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = allCards;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(card =>
        card.name.toLowerCase().includes(term) ||
        (card.description && card.description.toLowerCase().includes(term))
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(card => card.type === filterType);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'cost') {
        return (a.cost || 0) - (b.cost || 0);
      } else if (sortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });

    return sorted;
  }, [allCards, searchTerm, filterType, sortBy]);

  // Handle card quantity increment
  const incrementCard = (cardId) => {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    const currentCount = deckComposition[cardId] || 0;
    const maxInDeck = card.maxInDeck || 4;

    if (currentCount < maxInDeck) {
      setDeckComposition(prev => ({
        ...prev,
        [cardId]: currentCount + 1
      }));
    }
  };

  // Handle card quantity decrement
  const decrementCard = (cardId) => {
    const currentCount = deckComposition[cardId] || 0;

    if (currentCount > 0) {
      const newComposition = { ...deckComposition };
      if (currentCount === 1) {
        delete newComposition[cardId]; // Remove card if count reaches 0
      } else {
        newComposition[cardId] = currentCount - 1;
      }
      setDeckComposition(newComposition);
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    if (totalCards >= minCards) {
      onConfirm(deckComposition);
      onClose();
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setDeckComposition({ ...initialSelection }); // Reset to initial
    onClose();
  };

  if (!isOpen) return null;

  const isValidDeck = totalCards >= minCards;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-cyan-500 shadow-2xl flex flex-col max-w-7xl w-full max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white heading-font">{title}</h2>
            <p className="text-sm text-gray-400 mt-1">
              Cards: <span className={totalCards >= minCards ? 'text-green-400' : 'text-red-400'}>{totalCards}</span> / {minCards} minimum
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-700 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-grow min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Types</option>
            <option value="DRONE">Drones</option>
            <option value="SHIP">Ship Sections</option>
            <option value="ACTION">Action Cards</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="name">Sort by Name</option>
            <option value="cost">Sort by Cost</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>

        {/* Card Grid */}
        <div className="flex-grow overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedCards.map((card) => {
              const currentCount = deckComposition[card.id] || 0;
              const maxInDeck = card.maxInDeck || 4;
              const isAtMax = currentCount >= maxInDeck;

              return (
                <div key={card.id} className="flex flex-col items-center gap-2">
                  {/* Card Component */}
                  <ActionCard
                    card={card}
                    onClick={() => setDetailedCard(card)}
                    isPlayable={true}
                    scale={1.0}
                  />

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 bg-slate-800/70 px-3 py-1 rounded-lg border border-gray-600">
                    <button
                      onClick={() => decrementCard(card.id)}
                      disabled={currentCount === 0}
                      className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                        currentCount === 0
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      -
                    </button>
                    <span className="font-bold text-base min-w-[50px] text-center text-white">
                      {currentCount}/{maxInDeck}
                    </span>
                    <button
                      onClick={() => incrementCard(card.id)}
                      disabled={isAtMax}
                      className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                        isAtMax
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="btn-cancel px-6 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValidDeck}
            className={`px-6 py-2 rounded transition-all ${
              isValidDeck
                ? 'btn-continue'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>

      {/* Detailed Card Modal */}
      {detailedCard && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
          onClick={() => setDetailedCard(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ActionCard
              card={detailedCard}
              onClick={() => setDetailedCard(null)}
              isPlayable={true}
              scale={2.0}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DeckBuildingModal;
