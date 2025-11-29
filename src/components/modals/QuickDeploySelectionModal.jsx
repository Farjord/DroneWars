// ========================================
// QUICK DEPLOY SELECTION MODAL
// ========================================
// Modal for selecting a quick deployment before combat
// Shows available quick deployments with their details

import React from 'react';
import { Zap, ArrowLeft } from 'lucide-react';
import { calculateTotalCost } from '../../logic/quickDeploy/QuickDeployValidator';

/**
 * QuickDeploySelectionModal - Select quick deployment for combat
 *
 * @param {Array} validQuickDeployments - Array of valid quick deployments
 * @param {Function} onSelect - Callback when a deployment is selected (receives deployment object)
 * @param {Function} onBack - Callback to go back to encounter modal
 */
function QuickDeploySelectionModal({ validQuickDeployments = [], onSelect, onBack }) {
  return (
    <div className="dw-modal-overlay" onClick={onBack}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: 'var(--modal-action)' }}>
            <Zap size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Quick Deployment</h2>
            <p className="dw-modal-header-subtitle">Select a pre-configured deployment</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <p className="dw-modal-text" style={{ marginBottom: '16px' }}>
            Choose a quick deployment to automatically place your drones at the start of combat.
          </p>

          {/* Deployment List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {validQuickDeployments.map(deployment => {
              const cost = calculateTotalCost(deployment.placements);
              const droneCount = deployment.placements.length;

              return (
                <button
                  key={deployment.id}
                  onClick={() => onSelect(deployment)}
                  className="dw-blueprint-card"
                  style={{
                    padding: '14px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div className="dw-blueprint-card-scanline" />
                  <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#fff',
                      marginBottom: '4px'
                    }}>
                      {deployment.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--modal-text-secondary)'
                    }}>
                      {droneCount} drone{droneCount !== 1 ? 's' : ''} deployed
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {/* Lane Preview */}
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {[0, 1, 2].map(lane => {
                        const dronesInLane = deployment.placements.filter(p => p.lane === lane).length;
                        return (
                          <div
                            key={lane}
                            style={{
                              width: '20px',
                              height: '20px',
                              background: dronesInLane > 0 ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255,255,255,0.1)',
                              border: `1px solid ${dronesInLane > 0 ? 'rgba(6, 182, 212, 0.6)' : 'rgba(255,255,255,0.2)'}`,
                              borderRadius: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: dronesInLane > 0 ? '#06b6d4' : 'rgba(255,255,255,0.3)'
                            }}
                          >
                            {dronesInLane || '-'}
                          </div>
                        );
                      })}
                    </div>
                    {/* Cost */}
                    <div style={{
                      padding: '4px 10px',
                      background: 'rgba(251, 191, 36, 0.15)',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#fbbf24'
                    }}>
                      {cost} cost
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button
            onClick={onBack}
            className="dw-btn dw-btn-secondary dw-btn--full"
          >
            <ArrowLeft size={16} style={{ marginRight: '6px' }} />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuickDeploySelectionModal;
