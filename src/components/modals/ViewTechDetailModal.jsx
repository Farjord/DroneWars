// ========================================
// VIEW TECH DETAIL MODAL
// ========================================
// Modal to display Tech details when clicking a Tech Slot.
// Shows image and ability description.

import React from 'react';
import { Cpu, X } from 'lucide-react';
import fullTechCollection from '../../data/techData.js';

/**
 * VIEW TECH DETAIL MODAL
 * Displays a Tech drone's details in a modal.
 * Click a filled Tech Slot in-game to view ability, stats, and keywords.
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {Object} techDrone - Tech drone instance from game state (has id, name, image, abilities)
 */
const ViewTechDetailModal = ({ isOpen, onClose, techDrone }) => {
  if (!isOpen || !techDrone) return null;

  // Look up full definition from techData for canonical ability descriptions
  const baseDef = fullTechCollection.find(t => t.name === techDrone.name) || techDrone;

  // Find the primary ability (triggered or passive with a functional effect)
  const primaryAbility = (baseDef.abilities || []).find(
    a => a.type === 'TRIGGERED' || (a.type === 'PASSIVE' && a.effect?.type !== 'GRANT_KEYWORD')
  ) || (baseDef.abilities || []).find(a => a.description);

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--md dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Cpu size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{techDrone.name}</h2>
            <p className="dw-modal-header-subtitle">Tech Slot</p>
          </div>
          <button className="dw-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Image */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid var(--modal-action, #60a5fa)',
              boxShadow: '0 0 20px rgba(96, 165, 250, 0.3)',
            }}>
              <img
                src={techDrone.image}
                alt={techDrone.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Ability */}
          {primaryAbility && (
            <div className="dw-modal-info-box">
              <h3 className="dw-modal-info-title">Ability: {primaryAbility.name}</h3>
              <p className="dw-modal-text dw-modal-text--left">{primaryAbility.description}</p>
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

export default ViewTechDetailModal;
