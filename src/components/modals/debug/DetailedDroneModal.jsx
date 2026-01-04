// ========================================
// DETAILED DRONE MODAL COMPONENT
// ========================================
// Shows detailed view of a specific drone card with interactive help panel.
// Clicking on card stats displays contextual help for new players.

import React, { useState } from 'react';
import { Cpu, HelpCircle, Crosshair, Shield, Square, Gauge, Power, Wrench, Users } from 'lucide-react';
import DroneCard from '../../ui/DroneCard.jsx';
import { DRONE_HELP_TEXT } from '../../../data/droneHelpText.js';

// Map icon names to actual icon components
const ICON_MAP = {
  Crosshair,
  Shield,
  Square,
  Gauge,
  Power,
  Wrench,
  Users
};

/**
 * DetailedDroneModal - Displays detailed drone information in a modal
 * @param {boolean} isOpen - Whether the modal should be displayed
 * @param {Object} drone - The drone data to display
 * @param {Object} droneAvailability - Availability state for all drones (keyed by name)
 * @param {Function} onClose - Callback when modal is closed
 */
const DetailedDroneModal = ({ isOpen, drone, droneAvailability, onClose }) => {
  const [selectedStat, setSelectedStat] = useState(null);

  // Don't render if not open or no drone data
  if (!isOpen || !drone) return null;

  const helpContent = selectedStat ? DRONE_HELP_TEXT[selectedStat] : null;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--action" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        {/* Header - Centered */}
        <div className="dw-modal-header" style={{ justifyContent: 'center' }}>
          <div className="dw-modal-header-icon">
            <Cpu size={28} />
          </div>
          <div className="dw-modal-header-info" style={{ textAlign: 'center' }}>
            <h2 className="dw-modal-header-title">{drone.name}</h2>
            <p className="dw-modal-header-subtitle">Class {drone.class} Drone</p>
          </div>
        </div>

        {/* Body - Two Column Layout */}
        <div className="dw-modal-body">
          <div className="flex gap-4 items-start justify-center">
            {/* Left: Drone Card */}
            <div className="flex-shrink-0">
              <DroneCard
                drone={drone}
                isSelectable={false}
                deployedCount={0}
                isViewOnly={true}
                onStatClick={setSelectedStat}
                selectedStat={selectedStat}
                availability={droneAvailability?.[drone?.name]}
                enableDebug={true}
              />
            </div>

            {/* Right: Help Panel */}
            <div
              className="flex-shrink-0 p-4 rounded"
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                width: '220px',
                minHeight: '275px'
              }}
            >
              {helpContent ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    {helpContent.icon && ICON_MAP[helpContent.icon] && (
                      React.createElement(ICON_MAP[helpContent.icon], { size: 18, className: 'text-cyan-400' })
                    )}
                    <h3 className="text-cyan-400 font-semibold uppercase tracking-wide text-sm">
                      {helpContent.title}
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {helpContent.description}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <HelpCircle size={32} className="text-cyan-600 mb-3 opacity-50" />
                  <p className="text-gray-500 text-sm italic">
                    Select an icon on the card to learn more
                  </p>
                </div>
              )}
            </div>
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