// ========================================
// VIEW SHIP SECTION MODAL
// ========================================
// Modal to display full ship section card details
// Shows complete card as seen in ShipPlacementScreen

import React from 'react';
import { Cpu, X } from 'lucide-react';
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
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Cpu size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{sectionStats.name || displayName}</h2>
            <p className="dw-modal-header-subtitle">
              {isInMiddleLane ? 'Middle Lane - Bonus Active' : 'Ship Section'}
            </p>
          </div>
          <button className="dw-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Ship Section Card Display */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                  // Simple status calculation for display (defensive for showcase mode)
                  if (!stats?.thresholds || stats.hull === undefined || stats.maxHull === undefined) {
                    return 'healthy'; // Default to healthy if missing data
                  }
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

          {/* Description */}
          {sectionStats.description && (
            <div className="dw-modal-info-box" style={{ marginTop: '1.5rem' }}>
              <h3 className="dw-modal-info-title">Description</h3>
              <p className="dw-modal-text dw-modal-text--left">{sectionStats.description}</p>
            </div>
          )}

          {/* Ability Details */}
          {sectionStats.ability && (
            <div className="dw-modal-info-box">
              <h3 className="dw-modal-info-title">Ability: {sectionStats.ability.name}</h3>
              <p className="dw-modal-text dw-modal-text--left">{sectionStats.ability.description}</p>
              <p className="dw-modal-text dw-modal-text--left" style={{ color: 'var(--modal-action)', marginTop: '0.5rem' }}>
                Cost: {sectionStats.ability.cost.energy} Energy
              </p>
            </div>
          )}

          {/* Middle Lane Bonus Info */}
          {isInMiddleLane && sectionStats.middleLaneBonus && (
            <div className="dw-modal-info-box">
              <h3 className="dw-modal-info-title">Middle Lane Bonus</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {Object.entries(sectionStats.middleLaneBonus).map(([stat, bonus]) => (
                  <span key={stat} className="dw-modal-stat-value--success">
                    +{bonus} {stat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-confirm dw-btn--full" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewShipSectionModal;
