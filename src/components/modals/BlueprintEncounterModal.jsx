// ========================================
// BLUEPRINT ENCOUNTER MODAL
// ========================================
// Modal displayed when player lands on a blueprint PoI
// Shows guardian AI details and asks player to engage or decline
// Declining is instant (no damage, no animations), allows re-engagement later

import React from 'react';
import { AlertTriangle, Shield, Cpu, Zap, Award } from 'lucide-react';

/**
 * BlueprintEncounterModal - Display blueprint PoI encounter confirmation
 *
 * @param {Object} encounter - Encounter result from EncounterController
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onAccept - Callback when player engages combat (standard deployment)
 * @param {Function} onDecline - Callback when player declines (instant, no damage)
 * @param {Function} onQuickDeploy - Callback when player chooses quick deploy
 * @param {Array} validQuickDeployments - Array of valid quick deployments
 */
function BlueprintEncounterModal({
  encounter,
  show,
  onAccept,
  onDecline,
  onQuickDeploy,
  validQuickDeployments = []
}) {
  if (!show || !encounter) return null;

  const { poi, aiData } = encounter;
  const poiData = poi?.poiData || {};

  /**
   * Get reward label from reward type
   */
  const getRewardLabel = (rewardType) => {
    const labels = {
      'DRONE_BLUEPRINT_LIGHT': 'Light Drone Blueprint',
      'DRONE_BLUEPRINT_MEDIUM': 'Medium Drone Blueprint',
      'DRONE_BLUEPRINT_HEAVY': 'Heavy Drone Blueprint',
      'DRONE_BLUEPRINT_FIGHTER': 'Fighter Drone Blueprint'
    };
    return labels[rewardType] || 'Drone Blueprint';
  };

  /**
   * Get difficulty display color
   */
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="dw-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="dw-modal-content dw-modal--lg dw-modal--danger" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: poiData.color || '#ef4444' }}>
            <Cpu size={32} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title" style={{ color: poiData.color }}>
              BLUEPRINT FACILITY DETECTED
            </h2>
            <p className="dw-modal-header-subtitle">
              {poiData.name || 'Unknown Location'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* POI Image (if available) */}
          {poiData.image && (
            <div style={{ marginBottom: '16px', width: '100%', overflow: 'hidden' }}>
              <img
                src={poiData.image}
                alt={poiData.name}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  borderRadius: '8px',
                  border: `2px solid ${poiData.color || '#ef4444'}`
                }}
              />
            </div>
          )}

          {/* POI Description */}
          <p className="dw-modal-text" style={{ marginBottom: '16px' }}>
            {poiData.description || 'Blueprint production facility'}
          </p>

          {/* Guaranteed Combat Warning */}
          <div className="dw-modal-info-box" style={{
            marginBottom: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <p style={{ color: '#ef4444', fontWeight: 700, margin: '0 0 4px 0', fontSize: '14px' }}>
                  GUARANTEED COMBAT
                </p>
                <p style={{ color: 'var(--modal-text-secondary)', margin: 0, fontSize: '13px' }}>
                  This facility is defended by an automated guardian AI. Combat is unavoidable if you proceed.
                </p>
              </div>
            </div>
          </div>

          {/* Guardian AI Info */}
          {aiData && (
            <div className="dw-modal-info-box" style={{ marginBottom: '16px' }}>
              <p className="dw-modal-info-title" style={{
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Shield size={18} />
                GUARDIAN PROFILE
              </p>

              <div className="dw-modal-grid dw-modal-grid--3">
                <div className="dw-modal-stat">
                  <div className="dw-modal-stat-label">Guardian</div>
                  <div className="dw-modal-stat-value" style={{ fontSize: '14px' }}>
                    {aiData.name || 'Unknown AI'}
                  </div>
                </div>
                <div className="dw-modal-stat">
                  <div className="dw-modal-stat-label">Ship Class</div>
                  <div className="dw-modal-stat-value" style={{ fontSize: '14px' }}>
                    {aiData.shipClass || 'Unknown'}
                  </div>
                </div>
                <div className="dw-modal-stat">
                  <div className="dw-modal-stat-label">Difficulty</div>
                  <div className="dw-modal-stat-value" style={{
                    color: getDifficultyColor(aiData.difficulty),
                    fontSize: '14px'
                  }}>
                    {aiData.difficulty || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reward Info */}
          <div className="dw-modal-info-box" style={{ marginBottom: '16px' }}>
            <p className="dw-modal-info-title" style={{
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#22c55e'
            }}>
              <Award size={18} />
              VICTORY REWARD
            </p>
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-value" style={{
                color: poiData.color || '#22c55e',
                fontSize: '16px'
              }}>
                {getRewardLabel(poiData.rewardType)}
              </div>
            </div>
          </div>

          {/* Flavour Text */}
          {poiData.flavourText && (
            <p className="dw-modal-text" style={{
              fontStyle: 'italic',
              marginBottom: '0',
              fontSize: '13px',
              color: 'var(--modal-text-secondary)'
            }}>
              {poiData.flavourText}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onDecline} className="dw-btn dw-btn-cancel">
            DECLINE
          </button>

          {/* Conditional rendering based on valid quick deployments */}
          {validQuickDeployments.length > 0 ? (
            // Has quick deployments - show both options
            <>
              <button onClick={onAccept} className="dw-btn dw-btn-secondary">
                STANDARD DEPLOY
              </button>
              <button onClick={onQuickDeploy} className="dw-btn dw-btn-danger">
                <Zap size={16} style={{ marginRight: '6px' }} />
                QUICK DEPLOY
              </button>
            </>
          ) : (
            // No quick deployments - single engage button
            <button onClick={onAccept} className="dw-btn dw-btn-danger">
              ENGAGE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BlueprintEncounterModal;
