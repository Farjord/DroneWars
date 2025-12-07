// ========================================
// REPAIR BAY MODAL COMPONENT
// ========================================
// Slot picker modal that shows active ship slots and navigates to RepairBayScreen
// Acts as entry point to the full Repair Bay management screen

import React from 'react';
import { Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import { getAllShips } from '../../data/shipData';

/**
 * Count damage in a ship slot (drones + sections)
 */
const countDamage = (slot) => {
  if (!slot || slot.status !== 'active') return { drones: 0, sections: 0, total: 0 };

  const damagedDrones = (slot.droneSlots || []).filter(s => s.slotDamaged && s.assignedDrone).length;
  const damagedSections = ['l', 'm', 'r'].filter(lane => {
    const sectionSlot = slot.sectionSlots?.[lane];
    return sectionSlot?.componentId && (sectionSlot.damageDealt || 0) > 0;
  }).length;

  return {
    drones: damagedDrones,
    sections: damagedSections,
    total: damagedDrones + damagedSections
  };
};

/**
 * RepairBayModal Component
 * Simple slot picker that navigates to RepairBayScreen
 */
const RepairBayModal = ({ onClose }) => {
  const { gameState, gameStateManager } = useGameState();

  const shipSlots = gameState.singlePlayerShipSlots || [];
  const credits = gameState.singlePlayerProfile?.credits || 0;

  // Filter to active slots only
  const activeSlots = shipSlots.filter(slot => slot.status === 'active');

  /**
   * Handle slot click - navigate to RepairBayScreen
   */
  const handleSlotClick = (slotId) => {
    onClose(); // Close modal first
    gameStateManager.setState({
      appState: 'repairBay',
      repairBaySlotId: slotId
    });
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Wrench size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Repair Bay</h2>
            <p className="dw-modal-header-subtitle">Select a ship slot to manage</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Credits Display */}
          <div className="dw-modal-credits">
            <span className="dw-modal-credits-label">Available Credits</span>
            <span className="dw-modal-credits-value">{credits}</span>
          </div>

          {/* Slot List */}
          {activeSlots.length === 0 ? (
            <div className="dw-modal-empty">
              <div className="dw-modal-empty-icon">⚠️</div>
              <p className="dw-modal-empty-text">No active ship slots</p>
              <p style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginTop: '8px' }}>
                Configure a ship in the Hangar first
              </p>
            </div>
          ) : (
            <div className="dw-modal-scroll" style={{ maxHeight: '350px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeSlots.map(slot => {
                  const damage = countDamage(slot);
                  const shipName = getAllShips().find(s => s.id === slot.shipId)?.name || 'Unknown Ship';
                  const hasDamage = damage.total > 0;

                  return (
                    <button
                      key={slot.id}
                      className="dw-modal-info-box"
                      style={{
                        marginBottom: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'block',
                        width: '100%',
                        transition: 'all 0.2s ease',
                        border: hasDamage
                          ? '1px solid rgba(234, 179, 8, 0.4)'
                          : '1px solid rgba(100, 116, 139, 0.3)'
                      }}
                      onClick={() => handleSlotClick(slot.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(51, 65, 85, 0.6)';
                        e.currentTarget.style.borderColor = hasDamage
                          ? 'rgba(234, 179, 8, 0.6)'
                          : 'rgba(100, 116, 139, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '';
                        e.currentTarget.style.borderColor = hasDamage
                          ? 'rgba(234, 179, 8, 0.4)'
                          : 'rgba(100, 116, 139, 0.3)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: 0 }}>
                            {slot.name}
                          </h4>
                          <p style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', margin: '4px 0 0 0' }}>
                            {shipName}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {hasDamage ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
                              <AlertTriangle size={16} />
                              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                {damage.total} damaged
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80' }}>
                              <CheckCircle size={16} />
                              <span style={{ fontSize: '13px', fontWeight: '500' }}>
                                No damage
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {hasDamage && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                          {damage.drones > 0 && (
                            <span style={{ marginRight: '12px' }}>
                              🛸 {damage.drones} drone{damage.drones > 1 ? 's' : ''}
                            </span>
                          )}
                          {damage.sections > 0 && (
                            <span>
                              🔧 {damage.sections} section{damage.sections > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepairBayModal;
