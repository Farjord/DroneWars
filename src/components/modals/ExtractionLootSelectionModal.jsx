// ========================================
// EXTRACTION LOOT SELECTION MODAL
// ========================================
// Shown when player extracts with Slot 0 and has more loot than the limit
// Player must choose which items to keep
// Displays full card components for all item types

import React, { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';

// Import card components
import ActionCard from '../ui/ActionCard.jsx';
import DroneCard from '../ui/DroneCard.jsx';
import ShipCard from '../ui/ShipCard.jsx';
import ResourceCard from '../ui/ResourceCard.jsx';

// Import data collections
import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';

/**
 * ExtractionLootSelectionModal Component
 * Allows player to select which loot items to keep when over the extraction limit
 * Displays full card components for each item type
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

  /**
   * Render the appropriate card component for each item type
   */
  const renderItemCard = (item, index) => {
    const isSelected = selectedItems.includes(index);

    // Bluescale filter for blueprint cards (like grayscale but in blue tones)
    const bluescaleFilter = 'grayscale(100%) sepia(30%) saturate(300%) hue-rotate(180deg) brightness(0.9)';

    // Wrapper with selection overlay and hover effects
    const CardWrapper = ({ children, isBlueprint = false }) => (
      <div
        className="relative cursor-pointer transition-all duration-200 hover:scale-[1.03]"
        onClick={() => handleItemClick(index)}
        style={{
          transform: isSelected ? 'scale(1.02)' : undefined,
        }}
      >
        {/* Make card non-interactive so clicks pass through to wrapper */}
        {/* Apply bluescale filter for blueprints */}
        <div
          className="pointer-events-none"
          style={isBlueprint ? { filter: bluescaleFilter } : undefined}
        >
          {children}
        </div>

        {/* Selection overlay */}
        {isSelected && (
          <>
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                border: '3px solid #22c55e',
                borderRadius: '8px',
                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)'
              }}
            />
            <div
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center z-30"
            >
              <Check size={16} color="#fff" />
            </div>
          </>
        )}
      </div>
    );

    // Card type: Display ActionCard
    if (item.type === 'card') {
      const cardData = fullCardCollection.find(c => c.id === item.id || c.id === item.cardId);
      if (!cardData) {
        return (
          <CardWrapper key={index}>
            <div className="w-[225px] h-[275px] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
              Card Not Found
            </div>
          </CardWrapper>
        );
      }
      return (
        <CardWrapper key={index}>
          <ActionCard
            card={cardData}
            isPlayable={true}
            isSelected={false}
            isDimmed={false}
            onClick={() => {}}
          />
        </CardWrapper>
      );
    }

    // Blueprint type: Display DroneCard for the drone that would be unlocked
    // Shows with blue tint + white hatch lines like a technical drawing
    if (item.type === 'blueprint') {
      const droneData = fullDroneCollection.find(
        d => d.name === item.id || d.name === item.droneId || d.name === item.droneName
      );
      if (!droneData) {
        return (
          <CardWrapper key={index} isBlueprint={true}>
            <div className="w-[225px] h-[275px] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-center px-4">
              <div>
                <div className="text-blue-400 text-sm mb-2">BLUEPRINT</div>
                <div>Unknown Drone</div>
              </div>
            </div>
          </CardWrapper>
        );
      }
      return (
        <CardWrapper key={index} isBlueprint={true}>
          <DroneCard
            drone={droneData}
            isSelectable={false}
            isSelected={false}
            deployedCount={0}
            isViewOnly={true}
            onClick={() => {}}
          />
        </CardWrapper>
      );
    }

    // Component type: Display ShipCard
    if (item.type === 'component' || item.type === 'ship_component') {
      const componentData = shipComponentCollection?.find(c => c.id === item.id);
      if (!componentData) {
        return (
          <CardWrapper key={index}>
            <div className="w-[225px] h-[275px] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-center px-4">
              <div>
                <div className="text-orange-400 text-sm mb-2">COMPONENT</div>
                <div>{item.name || 'Unknown'}</div>
              </div>
            </div>
          </CardWrapper>
        );
      }
      return (
        <CardWrapper key={index}>
          <ShipCard
            ship={componentData}
            isSelectable={false}
            isSelected={false}
            onClick={() => {}}
          />
        </CardWrapper>
      );
    }

    // Resource types: Display ResourceCard
    if (item.type === 'credits') {
      return (
        <CardWrapper key={index}>
          <ResourceCard
            resourceType="credits"
            amount={item.amount || 0}
            isSelected={isSelected}
            onClick={() => {}}
          />
        </CardWrapper>
      );
    }

    // Salvage Item type: Display ResourceCard with salvage item data
    if (item.type === 'salvageItem') {
      return (
        <CardWrapper key={index}>
          <ResourceCard
            resourceType="salvageItem"
            salvageItem={{
              name: item.name,
              creditValue: item.creditValue,
              image: item.image,
              description: item.description
            }}
            isSelected={isSelected}
            onClick={() => {}}
          />
        </CardWrapper>
      );
    }

    if (item.type === 'token') {
      return (
        <CardWrapper key={index}>
          <ResourceCard
            resourceType="token"
            amount={item.amount || 0}
            isSelected={isSelected}
            onClick={() => {}}
          />
        </CardWrapper>
      );
    }

    if (item.type === 'aiCores') {
      return (
        <CardWrapper key={index}>
          <ResourceCard
            resourceType="aiCores"
            amount={item.amount || 0}
            isSelected={isSelected}
            onClick={() => {}}
          />
        </CardWrapper>
      );
    }

    // Fallback for unknown types
    return (
      <CardWrapper key={index}>
        <div className="w-[225px] h-[275px] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-center px-4">
          <div>
            <div className="text-gray-400 text-sm mb-2">{item.type?.toUpperCase() || 'UNKNOWN'}</div>
            <div>{item.name || item.id || 'Unknown Item'}</div>
          </div>
        </div>
      </CardWrapper>
    );
  };

  return (
    <div className="dw-modal-overlay">
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        style={{ maxWidth: '1100px', width: '95vw' }}
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
            fontSize: '18px',
            fontWeight: 'bold',
            color: selectedItems.length <= limit ? 'var(--modal-success)' : 'var(--modal-error)'
          }}>
            {selectedItems.length} / {limit} selected
          </span>
          <span style={{ fontSize: '14px', color: 'var(--modal-text-secondary)', marginLeft: '12px' }}>
            ({collectedLoot.length - selectedItems.length} will be discarded)
          </span>
        </div>

        {/* Body - Scrollable Card Grid */}
        <div className="dw-modal-body dw-modal-scroll" style={{ maxHeight: '500px', padding: '16px' }}>
          <div
            className="grid gap-4 justify-items-center"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(225px, max-content))',
              justifyContent: 'center'
            }}
          >
            {collectedLoot.map((item, index) => renderItemCard(item, index))}
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
            Unselected items will be lost. Damaged ship sections reduce your extraction capacity.
            Higher reputation levels increase custom deck limits.
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
