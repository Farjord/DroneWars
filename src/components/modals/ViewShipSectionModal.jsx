// ========================================
// VIEW SHIP SECTION MODAL
// ========================================
// Modal to display full ship section card details
// Shows complete card as seen in ShipPlacementScreen

import React from 'react';
import { X } from 'lucide-react';
import ShipSection from '../ui/ShipSection.jsx';

/**
 * VIEW SHIP SECTION MODAL
 * Displays a ship section's complete card details in a modal.
 * Click section in-game to view full stats, abilities, and information.
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {Object} data - Section data object containing:
 *   - sectionName: Section identifier (e.g., 'bridge')
 *   - sectionStats: Full section stats object
 *   - effectiveStats: Calculated effective stats for display
 *   - isInMiddleLane: Whether section is in middle lane (for bonus indicator)
 *   - isPlayer: Whether this is the player's section
 */
const ViewShipSectionModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const { sectionName, sectionStats, effectiveStats, isInMiddleLane, isPlayer } = data;

  // Format section name for display
  const displayName = sectionName === 'droneControlHub'
    ? 'Drone Control Hub'
    : sectionName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 max-w-[900px] w-[90vw] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div>
            <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400">
              {sectionStats.name || displayName}
            </h2>
            {isInMiddleLane && (
              <p className="text-sm text-yellow-400 font-bold mt-1">
                ⭐ Middle Lane - Bonus Stats Active
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>
        </div>

        {/* Full Card Display */}
        <div className="flex justify-center items-center">
          <div style={{ width: '600px', height: '160px' }}>
            <ShipSection
              section={sectionName}
              stats={sectionStats}
              effectiveStatsForDisplay={effectiveStats}
              isPlayer={isPlayer}
              isPlaceholder={false}
              onClick={() => {}} // No-op - modal display only
              onAbilityClick={() => {}} // No-op - modal display only
              isInteractive={false}
              isOpponent={!isPlayer}
              isHovered={false}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
              isCardTarget={false}
              isInMiddleLane={isInMiddleLane}
              reallocationState={null}
              gameEngine={{ getShipStatus: (stats) => {
                // Simple status calculation for display
                const hullPercent = stats.hull / stats.maxHull;
                if (hullPercent <= stats.thresholds.critical / stats.maxHull) return 'critical';
                if (hullPercent <= stats.thresholds.damaged / stats.maxHull) return 'damaged';
                return 'healthy';
              }}}
              turnPhase="action"
              isMyTurn={() => false}
              passInfo={{}}
              getLocalPlayerId={() => 'player1'}
              localPlayerState={{ energy: 0 }}
              shipAbilityMode={null}
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 space-y-3">
          {/* Description */}
          {sectionStats.description && (
            <div className="bg-black/40 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-cyan-400 mb-2">Description</h3>
              <p className="text-gray-300">{sectionStats.description}</p>
            </div>
          )}

          {/* Ability Details */}
          {sectionStats.ability && (
            <div className="bg-black/40 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-purple-400 mb-2">
                Ability: {sectionStats.ability.name}
              </h3>
              <p className="text-gray-300 mb-2">{sectionStats.ability.description}</p>
              <p className="text-sm text-yellow-400">
                Cost: {sectionStats.ability.cost.energy} Energy
              </p>
            </div>
          )}

          {/* Middle Lane Bonus Info */}
          {isInMiddleLane && sectionStats.middleLaneBonus && (
            <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-yellow-400 mb-2">Middle Lane Bonus</h3>
              <div className="flex gap-4 text-sm">
                {Object.entries(sectionStats.middleLaneBonus).map(([stat, bonus]) => (
                  <span key={stat} className="text-green-400 font-bold">
                    +{bonus} {stat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewShipSectionModal;
