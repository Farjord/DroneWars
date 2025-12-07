/**
 * RepairSectionCard Component
 * Standalone card component for ship sections in Repair Bay
 *
 * Unlike ShipSectionCompact, this component doesn't require a gameEngine
 * instance and is designed for static display with repair functionality.
 */

import React from 'react';
import { Wrench, AlertTriangle } from 'lucide-react';

/**
 * Get lane label from lane code
 */
const getLaneLabel = (lane) => {
  switch (lane) {
    case 'l': return 'Left';
    case 'm': return 'Middle';
    case 'r': return 'Right';
    default: return lane?.toUpperCase() || '';
  }
};

/**
 * RepairSectionCard Component
 * @param {Object} component - Ship component data from shipComponentCollection
 * @param {string} sectionImage - Ship-specific image path (from resolveShipSectionImage)
 * @param {Object} hull - { current, max } hull values
 * @param {boolean} isDamaged - Whether the section has damage
 * @param {boolean} isDestroyed - Whether hull is 0
 * @param {Function} onRepair - Callback when repair button clicked
 * @param {number} repairCost - Cost to repair
 * @param {boolean} canAfford - Whether player can afford repair
 * @param {string} lane - Lane code ('l', 'm', 'r')
 */
const RepairSectionCard = ({
  component,
  sectionImage,
  hull,
  isDamaged,
  isDestroyed,
  onRepair,
  repairCost,
  canAfford,
  lane
}) => {
  // Empty state
  if (!component) {
    return (
      <div className="repair-section-card repair-section-card--empty">
        <div className="repair-section-card__lane">{getLaneLabel(lane)}</div>
        <div className="repair-section-card__empty-content">
          <span>Empty</span>
        </div>
      </div>
    );
  }

  const hullPercentage = hull.max > 0 ? (hull.current / hull.max) * 100 : 0;

  // Determine status class
  const getStatusClass = () => {
    if (isDestroyed) return 'repair-section-card--destroyed';
    if (isDamaged) return 'repair-section-card--damaged';
    return '';
  };

  // Hull bar color
  const getHullBarColor = () => {
    if (isDestroyed || hull.current === 0) return 'bg-red-600';
    if (isDamaged) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleRepairClick = () => {
    if (canAfford && onRepair) {
      onRepair();
    }
  };

  // Use sectionImage if provided, fallback to component.image
  const imageUrl = sectionImage || component.image;

  return (
    <div className={`repair-section-card ${getStatusClass()}`}>
      {/* Background Image */}
      {imageUrl && (
        <div
          className="repair-section-card__bg"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}

      {/* Overlay */}
      <div className="repair-section-card__overlay" />

      {/* Content */}
      <div className="repair-section-card__content">
        {/* Lane Label */}
        <div className="repair-section-card__lane">{getLaneLabel(lane)}</div>

        {/* Component Type */}
        <div className="repair-section-card__type">{component.type}</div>

        {/* Component Name */}
        <div className="repair-section-card__name">{component.name}</div>

        {/* Destroyed Indicator */}
        {isDestroyed && (
          <div className="repair-section-card__destroyed">
            <AlertTriangle size={14} />
            <span>Destroyed</span>
          </div>
        )}

        {/* Hull Bar */}
        <div className="repair-section-card__hull">
          <div className="repair-section-card__hull-bar">
            <div
              className={`repair-section-card__hull-fill ${getHullBarColor()}`}
              style={{ width: `${Math.max(0, Math.min(100, hullPercentage))}%` }}
            />
          </div>
          <div className="repair-section-card__hull-text">
            {hull.current}/{hull.max} HP
          </div>
        </div>

        {/* Repair Button */}
        {isDamaged && (
          <button
            className={`dw-btn dw-btn--sm ${canAfford ? 'dw-btn-confirm' : 'dw-btn-secondary'}`}
            onClick={handleRepairClick}
            disabled={!canAfford}
            aria-label="Repair"
          >
            <Wrench size={12} />
            <span>Repair ({repairCost} cr)</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RepairSectionCard;
