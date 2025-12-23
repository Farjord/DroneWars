/**
 * DroneBlueprintRewardModal.jsx
 * Special modal for Drone Blueprint rewards after combat victory
 *
 * Displays a face-down blueprint card that auto-reveals after ~1 second,
 * showing drone details and an Accept button to add to inventory.
 */

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { RARITY_COLORS } from '../../data/cardPackData.js';
import DroneCard from '../ui/DroneCard.jsx';
import HiddenCard from '../ui/HiddenCard.jsx';
import './DroneBlueprintRewardModal.css';

function DroneBlueprintRewardModal({ blueprint, onAccept, show }) {
  const [isRevealed, setIsRevealed] = useState(false);

  // Reset state when modal is shown
  useEffect(() => {
    if (show) {
      setIsRevealed(false);
    }
  }, [show]);

  // Auto-reveal after ~1 second delay
  useEffect(() => {
    if (show && !isRevealed) {
      const timer = setTimeout(() => {
        setIsRevealed(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [show, isRevealed]);

  if (!show) return null;

  const { blueprintId, rarity, droneData } = blueprint || {};
  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.Common;

  // Create drone object for DroneCard if we have droneData
  const drone = droneData || {
    name: blueprintId || 'Unknown Drone',
    attack: 0,
    hull: 0,
    speed: 0,
    rarity: rarity || 'Common'
  };

  const handleAccept = () => {
    onAccept(blueprint);
  };

  return (
    <div className="dw-modal-overlay">
      <div
        className="dw-modal-content dw-modal--md dw-modal--action drone-blueprint-reward-modal"
        onClick={e => e.stopPropagation()}
        style={{
          '--modal-theme': '#a855f7',
          '--modal-theme-bg': 'rgba(168, 85, 247, 0.08)',
          '--modal-theme-border': 'rgba(168, 85, 247, 0.4)'
        }}
      >
        {/* Header */}
        <div className="dw-modal-header" style={{ borderBottomColor: 'rgba(168, 85, 247, 0.3)' }}>
          <div className="dw-modal-header-icon" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
            <Star size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title" style={{ color: '#a855f7' }}>
              DRONE BLUEPRINT ACQUIRED!
            </h2>
            <p className="dw-modal-header-subtitle">
              A new drone design has been discovered
            </p>
          </div>
        </div>

        {/* Body - Card Display */}
        <div className="dw-modal-body drone-blueprint-card-container">
          <div className={`drone-blueprint-flipper ${isRevealed ? 'revealed' : ''}`}>
            {/* Face-down card */}
            {!isRevealed && (
              <div className="drone-blueprint-back">
                <HiddenCard variant="blueprint" />
              </div>
            )}

            {/* Revealed drone card */}
            {isRevealed && (
              <div className="drone-blueprint-front">
                <DroneCard drone={drone} showStats={true} />

                {/* Rarity badge */}
                <div
                  className="drone-blueprint-rarity"
                  style={{ color: rarityColor }}
                >
                  {rarity || 'Common'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Accept Button (only after reveal) */}
        {isRevealed && (
          <div className="dw-modal-footer">
            <button
              className="dw-modal-button dw-modal-button--primary"
              onClick={handleAccept}
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                minWidth: '200px'
              }}
            >
              ACCEPT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DroneBlueprintRewardModal;
