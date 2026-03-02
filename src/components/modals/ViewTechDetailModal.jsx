// ========================================
// VIEW TECH DETAIL MODAL
// ========================================
// Modal to display full Tech drone details when clicking a Tech Slot.
// Shows image, fixed stats, ability description, and keywords.

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

  // Find the primary triggered ability (not INERT/PASSIVE keyword grants)
  const primaryAbility = (baseDef.abilities || []).find(
    a => a.type === 'TRIGGERED' || (a.type === 'PASSIVE' && a.effect?.type !== 'GRANT_KEYWORD')
  );

  // Collect keywords from GRANT_KEYWORD abilities
  const keywords = (baseDef.abilities || [])
    .filter(a => a.effect?.type === 'GRANT_KEYWORD')
    .map(a => a.effect.keyword);

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

          {/* Stats */}
          <div className="dw-modal-info-box">
            <h3 className="dw-modal-info-title">Stats</h3>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
              <span className="dw-modal-text">ATK: 0</span>
              <span className="dw-modal-text">Hull: 1</span>
              <span className="dw-modal-text">Shields: 0</span>
              <span className="dw-modal-text">Speed: 0</span>
            </div>
          </div>

          {/* Ability */}
          {primaryAbility && (
            <div className="dw-modal-info-box">
              <h3 className="dw-modal-info-title">Ability: {primaryAbility.name}</h3>
              <p className="dw-modal-text dw-modal-text--left">{primaryAbility.description}</p>
            </div>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="dw-modal-info-box">
              <h3 className="dw-modal-info-title">Keywords</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {keywords.map(kw => (
                  <span key={kw} style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(96, 165, 250, 0.15)',
                    color: 'var(--modal-action, #60a5fa)',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
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
