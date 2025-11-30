// ========================================
// EXTRACTION LOOT SELECTION MODAL
// ========================================
// Shown when player extracts with Slot 0 and has more loot than the limit
// Player must choose which items to keep

import React, { useState } from 'react';
import { Package, Check, AlertTriangle } from 'lucide-react';
import { RARITY_COLORS } from '../../data/cardData';
import fullCardCollection from '../../data/cardData';
import fullDroneCollection from '../../data/droneData';
import { shipComponentCollection } from '../../data/shipSectionData';

/**
 * ExtractionLootSelectionModal Component
 * Allows player to select which loot items to keep when over the extraction limit
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {Array} collectedLoot - All collected loot items
 * @param {number} limit - Maximum items player can keep
 * @param {function} onConfirm - Called with selected items array
 * @param {function} onCancel - Called when player cancels (abandons extra loot)
 */
const ExtractionLootSelectionModal = ({ isOpen, collectedLoot = [], limit = 3, onConfirm, onCancel }) => {
  const [selectedItems, setSelectedItems] = useState([]);

  if (!isOpen) {
    return null;
  }

  // Get card/drone/component details for display
  const getItemDetails = (item) => {
    if (item.type === 'card') {
      const card = fullCardCollection.find(c => c.id === item.id);
      return {
        name: card?.name || item.id,
        type: 'Card',
        subtype: card?.type || 'Unknown',
        rarity: card?.rarity || 'Common',
        image: card?.image
      };
    } else if (item.type === 'drone') {
      const drone = fullDroneCollection.find(d => d.name === item.id);
      return {
        name: drone?.name || item.id,
        type: 'Drone',
        subtype: `Class ${drone?.class || 1}`,
        rarity: drone?.rarity || 'Common',
        image: drone?.image
      };
    } else if (item.type === 'component' || item.type === 'ship_component') {
      const comp = shipComponentCollection.find(c => c.id === item.id);
      return {
        name: comp?.name || item.id,
        type: 'Ship Section',
        subtype: comp?.type || 'Unknown',
        rarity: comp?.rarity || 'Common',
        image: comp?.image
      };
    } else if (item.type === 'blueprint') {
      return {
        name: item.name || item.id,
        type: 'Blueprint',
        subtype: item.blueprintType || 'Unknown',
        rarity: 'Rare',
        image: null
      };
    }
    return {
      name: item.id || 'Unknown',
      type: item.type || 'Item',
      subtype: '',
      rarity: 'Common',
      image: null
    };
  };

  // Toggle item selection
  const handleItemClick = (index) => {
    setSelectedItems(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else if (prev.length < limit) {
        return [...prev, index];
      }
      return prev;
    });
  };

  // Confirm selection
  const handleConfirm = () => {
    const selected = selectedItems.map(i => collectedLoot[i]);
    onConfirm(selected);
  };

  // Confirm with no selection (discard all)
  const handleDiscardAll = () => {
    onConfirm([]);
  };

  const canConfirm = selectedItems.length <= limit;
  const getRarityColor = (rarity) => RARITY_COLORS[rarity] || '#808080';

  return (
    <div className="dw-modal-overlay">
      <div
        className="dw-modal-content dw-modal--xl dw-modal--action"
        style={{ maxWidth: '900px', width: '90vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon" style={{ color: '#f59e0b' }}>
            <AlertTriangle size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Extraction Limit</h2>
            <p className="dw-modal-header-subtitle">
              Your starter deck can only extract with {limit} items
            </p>
          </div>
        </div>

        {/* Selection Counter */}
        <div style={{
          textAlign: 'center',
          padding: '12px',
          borderBottom: '1px solid var(--modal-border)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <span style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: selectedItems.length <= limit ? 'var(--modal-success)' : 'var(--modal-error)'
          }}>
            {selectedItems.length} / {limit} selected
          </span>
          <span style={{ fontSize: '13px', color: 'var(--modal-text-secondary)', marginLeft: '12px' }}>
            ({collectedLoot.length - selectedItems.length} will be discarded)
          </span>
        </div>

        {/* Body - Scrollable Item Grid */}
        <div className="dw-modal-body" style={{ maxHeight: '400px', overflow: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px',
            padding: '8px 0'
          }}>
            {collectedLoot.map((item, index) => {
              const details = getItemDetails(item);
              const isSelected = selectedItems.includes(index);

              return (
                <div
                  key={`${item.type}-${item.id}-${index}`}
                  onClick={() => handleItemClick(index)}
                  className="dw-modal-info-box"
                  style={{
                    cursor: 'pointer',
                    marginBottom: 0,
                    borderColor: isSelected ? 'var(--modal-success)' : getRarityColor(details.rarity),
                    borderWidth: isSelected ? '2px' : '1px',
                    background: isSelected ? 'rgba(34, 197, 94, 0.1)' : undefined,
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--modal-success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={14} color="#fff" />
                    </div>
                  )}

                  {/* Item Type Badge */}
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#fff',
                    background: details.type === 'Card' ? '#6366f1' :
                               details.type === 'Drone' ? '#10b981' :
                               details.type === 'Ship Section' ? '#f59e0b' :
                               '#8b5cf6',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginBottom: '6px',
                    display: 'inline-block'
                  }}>
                    {details.type}
                  </div>

                  {/* Item Name */}
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {details.name}
                  </div>

                  {/* Subtype */}
                  <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', marginBottom: '4px' }}>
                    {details.subtype}
                  </div>

                  {/* Rarity */}
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: getRarityColor(details.rarity)
                  }}>
                    {details.rarity}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Text */}
        <div className="dw-modal-info-box" style={{
          margin: '0 16px 16px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderColor: 'rgba(245, 158, 11, 0.3)'
        }}>
          <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0 }}>
            <strong style={{ color: '#f59e0b' }}>Note:</strong>{' '}
            Unselected items will be lost. Upgrade to a custom ship slot to remove this limit.
          </p>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button
            className="dw-btn dw-btn-cancel"
            onClick={handleDiscardAll}
          >
            Discard All
          </button>
          <button
            className="dw-btn dw-btn-confirm"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Extract with {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtractionLootSelectionModal;
