// ========================================
// ADDITIONAL COST CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms cards with additional costs
// Shows both the cost and the effect before finalizing

import React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { extractDroneNameFromId } from '../../logic/droneUtils.js';

/**
 * ADDITIONAL COST CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for cards with additional costs
 * Displays both the cost and the effect before finalizing
 *
 * @param {Object} card - Card being played
 * @param {Object} costSelection - Selected cost target(s)
 * @param {Object} effectTarget - Selected effect target
 * @param {Function} onConfirm - Callback when confirmed
 * @param {Function} onCancel - Callback when cancelled
 */
const AdditionalCostConfirmationModal = ({ card, costSelection, effectTarget, onConfirm, onCancel }) => {
  if (!card || !costSelection || !effectTarget) return null;

  /**
   * Render cost description
   */
  const renderCostDescription = () => {
    const costType = card.additionalCost.type;

    if (costType === 'EXHAUST_DRONE') {
      const droneName = extractDroneNameFromId(costSelection.target.id);
      return `Exhaust ${droneName}`;
    }

    if (costType === 'SINGLE_MOVE' || costType === 'MULTI_MOVE') {
      const droneName = extractDroneNameFromId(costSelection.drone.id);
      const from = costSelection.sourceLane.replace('lane', 'Lane ');
      const to = costSelection.toLane.replace('lane', 'Lane ');
      return `Move ${droneName} from ${from} to ${to}`;
    }

    if (costType === 'DISCARD_CARD') {
      return `Discard ${costSelection.card.name}`;
    }

    return card.additionalCost.description || 'Pay cost';
  };

  /**
   * Render effect description
   */
  const renderEffectDescription = () => {
    const effectType = card.effect.type;

    if (effectType === 'EXHAUST_DRONE') {
      const droneName = effectTarget.name || extractDroneNameFromId(effectTarget.id);
      return `Exhaust ${droneName}`;
    }

    if (effectType === 'SINGLE_MOVE' || effectType === 'MULTI_MOVE') {
      const droneName = effectTarget.name || extractDroneNameFromId(effectTarget.id);
      return `Move ${droneName}`;
    }

    if (effectType === 'MODIFY_STAT') {
      const droneName = effectTarget.name || extractDroneNameFromId(effectTarget.id);
      const mod = card.effect.mod;
      const value = mod.value === 'COST_CARD_VALUE' ? costSelection.card?.cost : mod.value;
      return `Give ${droneName} +${value} ${mod.stat}`;
    }

    if (effectType === 'DAMAGE') {
      const droneName = effectTarget.name || extractDroneNameFromId(effectTarget.id);
      return `Deal ${card.effect.value} damage to ${droneName}`;
    }

    return 'Apply effect';
  };

  return (
    <div className="dw-modal-overlay" onClick={onCancel}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <AlertCircle size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Confirm Card Play</h2>
            <p className="dw-modal-header-subtitle">{card.name}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          <div className="text-center mb-4">
            <h4 className="text-xl font-bold text-cyan-300">{card.name}</h4>
            {card.cost > 0 && (
              <p className="text-sm text-gray-400">Energy Cost: {card.cost}</p>
            )}
          </div>

          <div className="space-y-3">
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.375rem',
              padding: '0.75rem'
            }}>
              <p className="text-sm font-semibold" style={{ color: '#f87171', marginBottom: '0.25rem' }}>Cost:</p>
              <p style={{ color: 'white' }}>{renderCostDescription()}</p>
            </div>

            <div style={{
              backgroundColor: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '0.375rem',
              padding: '0.75rem'
            }}>
              <p className="text-sm font-semibold" style={{ color: '#22d3ee', marginBottom: '0.25rem' }}>Effect:</p>
              <p style={{ color: 'white' }}>{renderEffectDescription()}</p>
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-4 text-center">
            This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onCancel}>
            <X size={18} style={{ marginRight: '0.5rem' }} />
            Cancel
          </button>
          <button className="dw-btn dw-btn-confirm" onClick={onConfirm}>
            <Check size={18} style={{ marginRight: '0.5rem' }} />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdditionalCostConfirmationModal;
