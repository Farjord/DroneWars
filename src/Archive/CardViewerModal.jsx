import React from 'react';
import { X } from 'lucide-react';

// We can reuse the ActionCard component for consistency
const ActionCard = ({ card }) => (
  <div className="w-52 h-72 rounded-lg p-1 bg-purple-800/80">
    <div className="w-full h-full bg-slate-900 flex flex-col font-orbitron text-purple-300 overflow-hidden rounded-md">
      <div className="text-center py-1 px-2 bg-purple-900/50 flex justify-between items-center">
        <span className="font-bold text-sm uppercase tracking-wider truncate">{card.name}</span>
        <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <span className="text-white font-bold text-sm ml-1">{card.cost}</span>
        </div>
      </div>
      <div className="p-1">
        <div className="relative h-24">
          <img src={card.image} alt={card.name} className="w-full h-full object-cover rounded" />
          <div className="absolute inset-0 border border-purple-400/50 rounded"></div>
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
                  <ActionCard card={card} />
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