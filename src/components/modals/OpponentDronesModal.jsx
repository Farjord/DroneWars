import React from 'react';
import { X } from 'lucide-react';
import DroneCard from '../ui/DroneCard.jsx';

/**
 * OPPONENT DRONES MODAL
 * Displays the opponent's selected drone cards in a modal
 * Shows the 5 drones they chose during drone selection phase
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {Array} drones - Array of drone objects to display
 * @param {Object} appliedUpgrades - Applied upgrades object keyed by drone name
 */
const OpponentDronesModal = ({ isOpen, onClose, drones = [], appliedUpgrades = {} }) => {
  if (!isOpen) return null;

  // Sort drones by cost (class field)
  const sortedDrones = [...drones].sort((a, b) => a.class - b.class);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border-2 border-pink-500 p-8 shadow-2xl shadow-pink-500/20 max-w-[1400px] max-h-[600px] w-[95vw] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-pink-400">
            Opponent's Selected Drones
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
            <h3 className="text-xl font-orbitron text-cyan-400 mb-3">
              Drones ({sortedDrones.length})
            </h3>
            {sortedDrones.length > 0 ? (
              <div className="w-full mx-auto">
                <div className="flex flex-nowrap gap-[10px] justify-center">
                  {sortedDrones.map((drone, index) => (
                    <div key={`${drone.name}-${index}`}>
                      <DroneCard
                        drone={drone}
                        onClick={() => {}}
                        isSelectable={false}
                        isSelected={false}
                        deployedCount={0}
                        appliedUpgrades={appliedUpgrades[drone.name] || []}
                        isViewOnly={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-500 text-xl italic">No drones selected yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentDronesModal;
