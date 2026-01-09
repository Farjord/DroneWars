import React from 'react';
import { Users } from 'lucide-react';
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
 * @param {Object} droneAvailability - Availability state for opponent's drones (keyed by name)
 */
const OpponentDronesModal = ({ isOpen, onClose, drones = [], appliedUpgrades = {}, droneAvailability = {} }) => {
  if (!isOpen) return null;

  // Sort drones by cost (class field)
  const sortedDrones = [...drones].sort((a, b) => a.class - b.class);

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xxl dw-modal--action" style={{ maxWidth: '1400px', width: '95vw' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Users size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Opponent's Drones</h2>
            <p className="dw-modal-header-subtitle">{sortedDrones.length} drone{sortedDrones.length !== 1 ? 's' : ''} selected</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {sortedDrones.length > 0 ? (
            <div className="flex flex-nowrap gap-3 justify-center overflow-x-auto py-2">
              {sortedDrones.map((drone, index) => (
                <div key={`${drone.name}-${index}`}>
                  <DroneCard
                    drone={drone}
                    onClick={() => {}}
                    isSelectable={false}
                    isSelected={false}
                    deployedCount={0}
                    appliedUpgrades={appliedUpgrades[drone.name] || []}
                    availability={droneAvailability?.[drone.name]}
                    isViewOnly={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="dw-modal-info-box" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--modal-text-secondary)', fontStyle: 'italic' }}>No drones selected yet</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpponentDronesModal;
