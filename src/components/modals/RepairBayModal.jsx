// ========================================
// REPAIR BAY MODAL COMPONENT
// ========================================
// Shows damaged ship components and allows repairing them for credits

import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import repairService from '../../logic/economy/RepairService.js';

/**
 * RepairBayModal Component
 * Shows damaged ship components and allows repairing them for credits
 * Uses RepairService for cost calculations and repair operations
 */
const RepairBayModal = ({ onClose }) => {
  const { gameState } = useGameState();
  const [feedback, setFeedback] = useState(null);

  const { singlePlayerProfile } = gameState;
  const credits = singlePlayerProfile?.credits || 0;

  /**
   * Handle repair button click
   */
  const handleRepair = (instance) => {
    const result = repairService.repairComponent(instance.instanceId);

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Component repaired for ${result.cost} credits`
    });

    setTimeout(() => setFeedback(null), 2000);
  };

  /**
   * Repair all damaged components
   */
  const handleRepairAll = () => {
    const result = repairService.repairAllComponents();

    if (!result.success) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      message: `${result.count} components repaired for ${result.cost} credits`
    });

    setTimeout(() => setFeedback(null), 2000);
  };

  // Safely get damaged components (fallback for showcase mode)
  let damagedComponents = [];
  let totalRepairCost = 0;
  try {
    damagedComponents = repairService.getDamagedComponents() || [];
    totalRepairCost = repairService.getTotalRepairCost() || 0;
  } catch (e) {
    // Service may fail in showcase mode without full game state
    console.debug('RepairBayModal: Service not available in preview mode');
  }

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--lg dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Wrench size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Repair Bay</h2>
            <p className="dw-modal-header-subtitle">Restore damaged components</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Credits Display */}
          <div className="dw-modal-credits">
            <span className="dw-modal-credits-label">Available Credits</span>
            <span className="dw-modal-credits-value">{credits}</span>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`dw-modal-feedback dw-modal-feedback--${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* Damaged Components List */}
          {damagedComponents.length === 0 ? (
            <div className="dw-modal-empty">
              <div className="dw-modal-empty-icon">✓</div>
              <p className="dw-modal-empty-text">No damaged components</p>
              <p style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginTop: '8px' }}>
                All ship components are at full hull
              </p>
            </div>
          ) : (
            <>
              {/* Repair All Button */}
              <div style={{ marginBottom: '16px' }}>
                <button
                  className={`dw-btn dw-btn-success dw-btn--full ${credits < totalRepairCost ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleRepairAll}
                  disabled={credits < totalRepairCost}
                >
                  Repair All ({totalRepairCost} credits)
                </button>
              </div>

              {/* Component List */}
              <div className="dw-modal-scroll" style={{ maxHeight: '300px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {damagedComponents.map(instance => {
                    const repairCost = repairService.getHullRepairCost(instance);
                    const hullPercentage = (instance.currentHull / instance.maxHull) * 100;
                    const canAfford = credits >= repairCost;

                    return (
                      <div
                        key={instance.instanceId}
                        className="dw-modal-info-box"
                        style={{ marginBottom: 0 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: 0 }}>
                              {instance.componentId}
                            </h4>
                            <p style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', margin: '4px 0 0 0' }}>
                              Ship Slot {instance.shipSlotId}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)' }}>Hull</div>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '700',
                              color: hullPercentage > 50 ? '#fbbf24' : '#ef4444'
                            }}>
                              {instance.currentHull} / {instance.maxHull}
                            </div>
                          </div>
                        </div>

                        {/* Hull Bar */}
                        <div style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginBottom: '12px'
                        }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${hullPercentage}%`,
                              backgroundColor: hullPercentage > 50 ? '#fbbf24' : '#ef4444',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>

                        {/* Repair Button Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                            Repair Cost: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{repairCost}</span> credits
                          </div>
                          <button
                            className={`dw-btn dw-btn-confirm ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{ minWidth: '80px', padding: '6px 16px' }}
                            onClick={() => handleRepair(instance)}
                            disabled={!canAfford}
                          >
                            Repair
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
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

export default RepairBayModal;
