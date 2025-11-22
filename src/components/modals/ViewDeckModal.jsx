import React from 'react';
import { X } from 'lucide-react';
import DroneCard from '../ui/DroneCard.jsx';
import ActionCard from '../ui/ActionCard.jsx';
import ShipSection from '../ui/ShipSection.jsx';
import { shipComponentCollection } from '../../data/shipData.js';
import { gameEngine } from '../../logic/gameLogic.js';

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
 * @param {Object} shipComponents - Object mapping component IDs to lanes (e.g., { BRIDGE_001: 'l', POWERCELL_001: 'm' })
 */
const ViewDeckModal = ({ isOpen, onClose, title, drones = [], cards = [], shipComponents = {} }) => {
  if (!isOpen) return null;

  // Sort drones by cost (class field)
  const sortedDrones = [...drones].sort((a, b) => a.class - b.class);

  // Sort cards by cost
  const sortedCards = [...cards].sort((a, b) => a.card.cost - b.card.cost);

  // Helper function to calculate middle lane bonus stats
  const calculateMiddleLaneBonusStats = (comp, applyBonus) => {
    const baseStats = comp.stats.healthy;
    const bonus = comp.middleLaneBonus || {};
    const effectiveStats = {};

    Object.keys(baseStats).forEach(stat => {
      effectiveStats[stat] = baseStats[stat] + (applyBonus ? (bonus[stat] || 0) : 0);
    });

    return effectiveStats;
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 max-w-[1500px] max-h-[900px] w-[95vw] h-[90vh] flex flex-col"
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
          {/* Ship Layout Section */}
          {Object.keys(shipComponents).length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-orbitron text-yellow-400 mb-3">Ship Layout</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {['l', 'm', 'r'].map((lane, index) => {
                  const componentEntry = Object.entries(shipComponents).find(([id, l]) => l === lane);
                  const component = componentEntry ? shipComponentCollection.find(c => c.id === componentEntry[0]) : null;

                  return (
                    <div key={lane}>
                      <div className="text-center mb-2">
                        <span className={`font-bold text-sm ${index === 1 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                          {index === 1 ? 'MIDDLE (Bonus)' : index === 0 ? 'LEFT' : 'RIGHT'}
                        </span>
                      </div>
                      {component ? (
                        <div className="h-[200px]">
                          <ShipSection
                            section={component.key}
                            stats={component}
                            effectiveStatsForDisplay={calculateMiddleLaneBonusStats(component, index === 1)}
                            isPlayer={true}
                            isInMiddleLane={index === 1}
                            gameEngine={gameEngine}
                            isInteractive={false}
                            turnPhase="placement"
                            isMyTurn={() => false}
                            passInfo={{}}
                            getLocalPlayerId={() => 'player1'}
                            localPlayerState={{}}
                            shipAbilityMode={null}
                          />
                        </div>
                      ) : (
                        <div className="h-[200px] bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                          <span className="text-center text-gray-500 italic text-xs">
                            Empty Lane
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Divider */}
              <div className="border-t border-purple-500/30 mb-6"></div>
            </div>
          )}

          {/* Drones Section */}
          <div className="mb-6">
            <h3 className="text-xl font-orbitron text-cyan-400 mb-3">Drones ({sortedDrones.length})</h3>
            {sortedDrones.length > 0 ? (
              <div className="max-w-[1165px] mx-auto">
                <div className="flex flex-wrap gap-[10px] justify-center">
                  {sortedDrones.map((drone, index) => (
                    <div key={`${drone.name}-${index}`}>
                      <DroneCard
                        drone={drone}
                        onClick={() => {}}
                        isSelectable={false}
                        isSelected={false}
                        deployedCount={0}
                        appliedUpgrades={[]}
                        isViewOnly={true}
                      />
                    </div>
                  ))}
                </div>
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
              <div className="max-w-[1165px] mx-auto">
                <div className="flex flex-wrap gap-[10px] justify-center">
                  {sortedCards.map((item, index) => (
                    <div key={`${item.card.id}-${index}`} className="relative">
                      <ActionCard
                        card={item.card}
                        onClick={() => {}}
                        isPlayable={true}
                        isSelected={false}
                        mandatoryAction={null}
                        excessCards={0}
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
