// ========================================
// TACTICAL ITEM CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms tactical item usage with detection preview

import React from 'react';
import { ShieldMinus } from 'lucide-react';

/**
 * TACTICAL ITEM CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for tactical item usage with detection preview.
 * @param {boolean} show - Whether to show the modal
 * @param {Object} item - Tactical item data { name, image, effectValueMin, effectValueMax, effectDescription }
 * @param {number} currentDetection - Current detection level (0-100)
 * @param {Function} onCancel - Callback when usage is cancelled
 * @param {Function} onConfirm - Callback when usage is confirmed
 */
const TacticalItemConfirmationModal = ({ show, item, currentDetection, onCancel, onConfirm }) => {
  if (!show || !item) return null;

  // Get effect range (support both old effectValue and new min/max)
  const effectMin = item.effectValueMin ?? item.effectValue ?? 5;
  const effectMax = item.effectValueMax ?? item.effectValue ?? 15;

  // Calculate predicted detection range after use (clamped to 0)
  // Best case: max reduction, Worst case: min reduction
  const predictedBest = Math.max(0, currentDetection - effectMax);
  const predictedWorst = Math.max(0, currentDetection - effectMin);

  // Format the prediction range
  const predictedRange = predictedBest === predictedWorst
    ? `${predictedBest}%`
    : `${predictedBest}-${predictedWorst}%`;

  // Format the effect range
  const effectRange = effectMin === effectMax
    ? `${effectMin}%`
    : `${effectMin}-${effectMax}%`;

  return (
    <div className="dw-modal-overlay" data-testid="modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '6px' }}
              />
            ) : (
              <ShieldMinus size={28} />
            )}
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{item.name}</h2>
            <p className="dw-modal-header-subtitle">Reduce detection by {effectRange}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <div className="dw-modal-grid dw-modal-grid--2col">
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">Current Detection</div>
              <div className="dw-modal-stat-value" style={{ color: '#f59e0b' }}>{currentDetection}%</div>
            </div>
            <div className="dw-modal-stat">
              <div className="dw-modal-stat-label">After Use</div>
              <div className="dw-modal-stat-value" style={{ color: '#10b981' }}>{predictedRange}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dw-btn dw-btn-confirm" onClick={onConfirm}>
            Use Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default TacticalItemConfirmationModal;
