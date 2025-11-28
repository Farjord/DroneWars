// ========================================
// DETAILED DRONE MODAL COMPONENT
// ========================================
// Shows detailed view of a specific drone card.
// Used for viewing drone stats, abilities, and image.

import React from 'react';
import { Cpu } from 'lucide-react';
import DroneCard from '../../ui/DroneCard.jsx';

/**
 * DetailedDroneModal - Displays detailed drone information in a modal
 * @param {boolean} isOpen - Whether the modal should be displayed
 * @param {Object} drone - The drone data to display
 * @param {Function} onClose - Callback when modal is closed
 */
const DetailedDroneModal = ({ isOpen, drone, onClose }) => {
  // Don't render if not open or no drone data
  if (!isOpen || !drone) return null;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Cpu size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{drone.name}</h2>
            <p className="dw-modal-header-subtitle">Class {drone.class} Drone</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DroneCard drone={drone} isSelectable={false} deployedCount={0} isViewOnly={true} />
          </div>
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

export default DetailedDroneModal;