import React, { useState } from 'react';
import { X } from 'lucide-react';

// Card component for displaying selectable cards
const SelectableCard = ({ card, isSelected, onClick }) => (
  <div
    className={`w-52 h-72 rounded-lg p-1 cursor-pointer transition-all duration-200 ${
      isSelected ? 'bg-green-500/60 shadow-lg shadow-green-500/30' : 'bg-purple-800/80 hover:bg-purple-700/80'
    }`}
    onClick={() => onClick(card)}
  >
    <div className="w-full h-full bg-slate-900 flex flex-col font-orbitron text-purple-300 overflow-hidden rounded-md">
      <div className="text-center py-1 px-2 bg-purple-900/50 flex justify-between items-center">
        <span className="font-bold text-sm uppercase tracking-wider truncate">{card.name}</span>
        <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span className="text-white font-bold text-sm ml-1">{card.cost}</span>
        </div>
      </div>
      <div className="p-1">
        <div className="relative h-24">
          <img src={card.image} alt={card.name} className="w-full h-full object-cover rounded" />
          <div className="absolute inset-0 border border-purple-400/50 rounded"></div>
          {isSelected && (
            <div className="absolute inset-0 bg-green-500/20 border-2 border-green-400 rounded flex items-center justify-center">
              <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                ✓
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex-grow mx-2 my-1 bg-black/50 border border-purple-800/70 p-2 flex flex-col min-h-0">
        <div className="flex-grow relative font-exo font-normal text-purple-200">
          <p className="text-sm leading-tight text-center">{card.description}</p>
        </div>
      </div>
      <div className="text-center text-xs py-1 bg-purple-900/50 uppercase font-semibold tracking-widest">
        {card.type} Card
      </div>
    </div>
  </div>
);

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
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full max-w-7xl relative flex flex-col h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            {type === 'search_and_draw' ? 'Choose Cards to Draw' : 'Select Cards'}
          </h2>
          <p className="text-gray-300 text-lg">
            {filter ?
              `Select ${drawCount} ${filter.type} card${drawCount > 1 ? 's' : ''} from ${searchedCards.length} found ${filter.type} cards` :
              `Select ${drawCount} card${drawCount > 1 ? 's' : ''} from the top ${searchedCards.length} cards of your deck`
            }
          </p>
          <div className="mt-2">
            <span className={`text-lg font-bold ${canConfirm ? 'text-green-400' : 'text-yellow-400'}`}>
              {selectedCards.length} of {drawCount} selected
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center">
            {searchedCards.map((card, index) => (
              <SelectableCard
                key={card.instanceId || `${card.id}-${index}`}
                card={card}
                isSelected={selectedCards.some(c => {
                  const cardIdentifier = card.instanceId || `${card.id}-${card.name}`;
                  const existingIdentifier = c.instanceId || `${c.id}-${c.name}`;
                  return existingIdentifier === cardIdentifier;
                })}
                onClick={handleCardClick}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={handleClose}
            className="bg-gray-600 text-white font-bold py-3 px-8 rounded-full hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`font-bold py-3 px-8 rounded-full transition-colors ${
              canConfirm
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardSelectionModal;