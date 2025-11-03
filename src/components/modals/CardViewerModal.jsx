import React from 'react';
import { X } from 'lucide-react';
import ActionCard from '../ui/ActionCard.jsx';

// RENAMED COMPONENT and UPDATED PROPS
const CardViewerModal = ({ isOpen, onClose, cards, title, shouldSort }) => {
  if (!isOpen) {
    return null;
  }

  // Conditionally sort the cards based on the 'shouldSort' prop
  const cardsToDisplay = shouldSort 
    ? [...cards].sort((a, b) => a.name.localeCompare(b.name)) 
    : cards;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full max-w-7xl relative flex flex-col h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
          <X size={24} />
        </button>
        {/* Use the title prop for the heading */}
        <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 text-center mb-4 flex-shrink-0">
          {title} ({cardsToDisplay.length})
        </h2>
        
        {cardsToDisplay.length > 0 ? (
          <div className="flex-grow overflow-y-auto pr-4">
            <div className="grid grid-cols-5 gap-6">
              {cardsToDisplay.map((card, index) => (
                <div key={`${card.instanceId}-${index}`} className="flex justify-center">
                  <ActionCard
                    card={card}
                    onClick={() => {}}
                    isPlayable={true}
                    isSelected={false}
                    isMandatoryTarget={false}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-500 text-2xl italic">There are no cards here!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardViewerModal;