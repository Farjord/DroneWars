import React from 'react';
import { X } from 'lucide-react';
import DroneCard from '../ui/DroneCard.jsx';
import ActionCard from '../ui/ActionCard.jsx';

/**
 * VIEW DECK MODAL
 * Displays a player's complete deck and drones in a large modal
 * Reusable for player decks, AI decks, etc.
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {Array} drones - Array of drone objects to display
 * @param {Array} cards - Array of {card, quantity} objects to display
 */
const ViewDeckModal = ({ isOpen, onClose, title, drones = [], cards = [] }) => {
  if (!isOpen) return null;

  // Sort drones by cost (class field)
  const sortedDrones = [...drones].sort((a, b) => a.class - b.class);

  // Sort cards by cost
  const sortedCards = [...cards].sort((a, b) => a.card.cost - b.card.cost);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 max-w-[1300px] max-h-[900px] w-[95vw] h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-grow pr-4">
          {/* Drones Section */}
          <div className="mb-6">
            <h3 className="text-xl font-orbitron text-cyan-400 mb-3">Drones ({sortedDrones.length})</h3>
            {sortedDrones.length > 0 ? (
              <div className="flex flex-wrap gap-[10px]">
                {sortedDrones.map((drone, index) => (
                  <div key={`${drone.name}-${index}`}>
                    <DroneCard
                      drone={drone}
                      onClick={() => {}}
                      isSelectable={false}
                      isSelected={false}
                      deployedCount={0}
                      appliedUpgrades={[]}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-500 text-xl italic">No drones selected</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-purple-500/30 mb-6"></div>

          {/* Cards Section */}
          <div className="mb-6">
            <h3 className="text-xl font-orbitron text-purple-400 mb-3">
              Cards ({sortedCards.reduce((sum, item) => sum + item.quantity, 0)})
            </h3>
            {sortedCards.length > 0 ? (
              <div className="flex flex-wrap gap-[10px]">
                {sortedCards.map((item, index) => (
                  <div key={`${item.card.id}-${index}`} className="relative">
                    <ActionCard
                      card={item.card}
                      onClick={() => {}}
                      isPlayable={true}
                      isSelected={false}
                      isMandatoryTarget={false}
                    />
                    {/* Quantity Badge */}
                    {item.quantity > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white font-bold text-sm px-2 py-1 rounded z-10">
                        x{item.quantity}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-500 text-xl italic">No cards in deck</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDeckModal;
