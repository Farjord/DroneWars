// ========================================
// INVENTORY MODAL COMPONENT
// ========================================
// Full inventory with category tabs: Cards, Drones, Ships, Ship Sections, Tactical

import React, { useState } from 'react';
import { Package, Layers, Cpu, Rocket, Box, Zap, HelpCircle } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import useInventoryData from './inventory/useInventoryData';
import CardsTabContent from './inventory/CardsTabContent';
import DronesTabContent from './inventory/DronesTabContent';
import ShipsTabContent from './inventory/ShipsTabContent';
import SectionsTabContent from './inventory/SectionsTabContent';
import TacticalTabContent from './inventory/TacticalTabContent';
import CardDetailPopup from './inventory/CardDetailPopup';

/**
 * InventoryModal Component
 * Full inventory with category tabs: Cards, Drones, Ships, Ship Sections, Tactical
 */
const InventoryModal = ({ onClose, onShowHelp }) => {
  const { gameState } = useGameState();
  const [activeCategory, setActiveCategory] = useState('Cards');
  const [selectedTab, setSelectedTab] = useState('All');
  const [selectedCard, setSelectedCard] = useState(null);

  const {
    enrichedCards,
    enrichedDrones,
    enrichedShips,
    enrichedComponents,
    collectionStats,
    droneStats,
    shipStats,
    componentStats,
    tacticalItemsOwned,
    singlePlayerProfile,
  } = useInventoryData(gameState);

  const categories = [
    { id: 'Cards', label: 'Cards', icon: Layers, count: collectionStats.owned },
    { id: 'Drones', label: 'Drones', icon: Cpu, count: droneStats.owned },
    { id: 'Ships', label: 'Ships', icon: Rocket, count: shipStats.owned },
    { id: 'Sections', label: 'Ship Sections', icon: Box, count: componentStats.owned },
    { id: 'Tactical', label: 'Items', icon: Zap, count: tacticalItemsOwned }
  ];

  const handleCardClick = (card) => {
    if (card.discoveryState !== 'undiscovered') {
      setSelectedCard(card);
    }
  };

  const getSubtitle = () => {
    switch (activeCategory) {
      case 'Cards':
        return `${collectionStats.owned} / ${collectionStats.total} cards owned`;
      case 'Drones':
        return `${droneStats.owned} / ${droneStats.total} drones owned (${droneStats.instances} in inventory)`;
      case 'Ships':
        return `${shipStats.owned} / ${shipStats.total} ships owned`;
      case 'Sections':
        return `${componentStats.owned} / ${componentStats.total} sections owned (${componentStats.instances} in inventory)`;
      default:
        return '';
    }
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--action"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '1150px',
          width: '95%',
          height: '85vh',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="dw-modal-header" style={{ position: 'relative' }}>
          <div className="dw-modal-header-icon">
            <Package size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Inventory</h2>
            <p className="dw-modal-header-subtitle">{getSubtitle()}</p>
          </div>
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="dw-modal-help-btn"
              title="Show help"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                color: '#06b6d4',
                opacity: 0.7,
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              <HelpCircle size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div
          className="dw-modal-body"
          style={{
            flex: '1 1 auto',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          {/* Category Tabs - Fixed at top */}
          <div className="dw-modal-tabs" style={{ marginBottom: '16px', flexShrink: 0 }}>
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`dw-modal-tab ${activeCategory === cat.id ? 'dw-modal-tab--active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Icon size={16} />
                  {cat.label}
                  <span style={{
                    fontSize: '11px',
                    opacity: 0.7,
                    background: 'rgba(255,255,255,0.1)',
                    padding: '2px 6px',
                    borderRadius: '8px'
                  }}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Content Area */}
          <div className="dw-modal-scroll" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
            {activeCategory === 'Cards' && (
              <CardsTabContent
                enrichedCards={enrichedCards}
                collectionStats={collectionStats}
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                onCardClick={handleCardClick}
              />
            )}
            {activeCategory === 'Drones' && (
              <DronesTabContent
                enrichedDrones={enrichedDrones}
                droneStats={droneStats}
              />
            )}
            {activeCategory === 'Ships' && (
              <ShipsTabContent
                enrichedShips={enrichedShips}
                shipStats={shipStats}
              />
            )}
            {activeCategory === 'Sections' && (
              <SectionsTabContent
                enrichedComponents={enrichedComponents}
                componentStats={componentStats}
              />
            )}
            {activeCategory === 'Tactical' && (
              <TacticalTabContent
                singlePlayerProfile={singlePlayerProfile}
              />
            )}
          </div>
        </div>

        {/* Card Detail Popup */}
        <CardDetailPopup
          selectedCard={selectedCard}
          onClose={() => setSelectedCard(null)}
        />

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;
