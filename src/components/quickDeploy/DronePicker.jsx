/**
 * DronePicker Component
 * Modal for selecting a drone to add to the roster
 * Groups drones by starter/blueprinted and shows stats
 */

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { starterPoolDroneNames } from '../../data/saveGameSchema';
import { RARITY_COLORS } from '../../data/cardData';

/**
 * DronePicker Component
 * @param {Object} props
 * @param {Array} props.availableDrones - All drones player can use
 * @param {Set} props.excludedDrones - Drones already in roster (grayed out)
 * @param {Function} props.onSelect - Callback when drone is selected
 * @param {Function} props.onClose - Close modal callback
 */
const DronePicker = ({ availableDrones, excludedDrones, onSelect, onClose }) => {
  // Separate starter and blueprinted drones
  const { starterDrones, blueprintedDrones } = useMemo(() => {
    const starter = [];
    const blueprinted = [];

    availableDrones.forEach(drone => {
      if (starterPoolDroneNames.includes(drone.name)) {
        starter.push(drone);
      } else {
        blueprinted.push(drone);
      }
    });

    // Sort by class (cost) then name
    const sortFn = (a, b) => {
      if (a.class !== b.class) return a.class - b.class;
      return a.name.localeCompare(b.name);
    };

    return {
      starterDrones: starter.sort(sortFn),
      blueprintedDrones: blueprinted.sort(sortFn)
    };
  }, [availableDrones]);

  const renderDroneCard = (drone) => {
    const isExcluded = excludedDrones.has(drone.name);
    const rarityColor = RARITY_COLORS[drone.rarity] || '#808080';

    return (
      <div
        key={drone.name}
        onClick={() => !isExcluded && onSelect(drone.name)}
        style={{
          background: isExcluded
            ? 'rgba(50, 50, 50, 0.4)'
            : 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))',
          border: `1px solid ${isExcluded ? 'rgba(100,100,100,0.3)' : 'rgba(6, 182, 212, 0.4)'}`,
          borderRadius: '6px',
          padding: '12px',
          cursor: isExcluded ? 'not-allowed' : 'pointer',
          opacity: isExcluded ? 0.5 : 1,
          transition: 'all 0.15s ease'
        }}
      >
        {/* Name and rarity */}
        <div style={{
          fontSize: '13px',
          fontWeight: '600',
          color: isExcluded ? '#666' : '#fff',
          marginBottom: '6px'
        }}>
          {drone.name}
        </div>

        <div style={{
          fontSize: '10px',
          fontWeight: '600',
          color: isExcluded ? '#555' : rarityColor,
          marginBottom: '8px'
        }}>
          {drone.rarity}
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '4px',
          fontSize: '10px',
          color: isExcluded ? '#555' : 'rgba(255,255,255,0.7)'
        }}>
          <span>ATK: {drone.attack}</span>
          <span>HP: {drone.hull}</span>
          <span>SPD: {drone.speed}</span>
          <span>SHD: {drone.shields}</span>
        </div>

        {/* Cost */}
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          fontWeight: '600',
          color: isExcluded ? '#555' : '#fbbf24'
        }}>
          Cost: {drone.class}
        </div>

        {/* Already in roster badge */}
        {isExcluded && (
          <div style={{
            marginTop: '8px',
            fontSize: '10px',
            color: '#888',
            textAlign: 'center'
          }}>
            In Roster
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="dw-modal-overlay"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="dw-modal-content dw-modal--lg dw-modal--action"
        style={{ maxWidth: '700px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Select Drone</h2>
            <p className="dw-modal-header-subtitle">
              {availableDrones.length - excludedDrones.size} available
            </p>
          </div>
          <button
            className="dw-btn dw-btn-secondary"
            style={{ padding: '8px' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="dw-modal-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {/* Starter Drones Section */}
          {starterDrones.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--modal-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px'
              }}>
                Starter Drones
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px'
              }}>
                {starterDrones.map(renderDroneCard)}
              </div>
            </div>
          )}

          {/* Blueprinted Drones Section */}
          {blueprintedDrones.length > 0 && (
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--modal-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px'
              }}>
                Blueprinted Drones
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px'
              }}>
                {blueprintedDrones.map(renderDroneCard)}
              </div>
            </div>
          )}

          {/* Empty state */}
          {blueprintedDrones.length === 0 && starterDrones.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: 'var(--modal-text-muted)'
            }}>
              No drones available
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DronePicker;
