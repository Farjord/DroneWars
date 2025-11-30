// ========================================
// INVENTORY MODAL COMPONENT
// ========================================
// Full inventory with category tabs: Cards, Drones, Ships, Ship Sections

import React, { useState, useMemo } from 'react';
import { Package, Layers, Cpu, Rocket, Box } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import fullCardCollection from '../../data/cardData';
import { RARITY_COLORS } from '../../data/cardData';
import fullDroneCollection from '../../data/droneData';
import { shipComponentCollection } from '../../data/shipSectionData';
import { shipCollection } from '../../data/shipData';
import HiddenCard from '../ui/HiddenCard';
import ActionCard from '../ui/ActionCard';

/**
 * InventoryModal Component
 * Full inventory with category tabs: Cards, Drones, Ships, Ship Sections
 */
const InventoryModal = ({ onClose }) => {
  const { gameState } = useGameState();
  const [activeCategory, setActiveCategory] = useState('Cards');
  const [selectedTab, setSelectedTab] = useState('All');
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // For drones/ships/components

  // Fallbacks for showcase mode where game state may be empty
  const {
    singlePlayerInventory = {},
    singlePlayerDiscoveredCards = [],
    singlePlayerShipSlots = [],
    singlePlayerDroneInstances = [],
    singlePlayerShipComponentInstances = [],
    singlePlayerOwnedShips = [],
  } = gameState || {};

  /**
   * Extract cards from Ship Slot 0 (immutable starter deck)
   * Slot 0 cards have infinite quantity
   */
  const slot0Cards = useMemo(() => {
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    if (!slot0 || !slot0.decklist) return {};

    const cardMap = {};
    for (const card of slot0.decklist) {
      cardMap[card.id] = Infinity;  // Infinite quantity for starter deck
    }
    return cardMap;
  }, [singlePlayerShipSlots]);

  /**
   * Enrich cards with discovery state and quantity
   * Merges Slot 0 cards (infinite) with inventory cards (finite)
   */
  const enrichedCards = useMemo(() => {
    return fullCardCollection.map(card => {
      const discoveryEntry = singlePlayerDiscoveredCards.find(d => d.cardId === card.id);

      // Determine quantity: Slot 0 cards show ∞, inventory cards show number
      let quantity;
      let isFromSlot0 = false;

      if (slot0Cards[card.id] === Infinity) {
        quantity = Infinity;
        isFromSlot0 = true;
      } else {
        quantity = singlePlayerInventory[card.id] || 0;
      }

      // Determine discovery state
      // - If in Slot 0 or inventory: 'owned'
      // - If in discoveredCards: use that state
      // - Otherwise: 'undiscovered'
      let discoveryState;
      if (isFromSlot0 || quantity > 0) {
        discoveryState = 'owned';
      } else if (discoveryEntry) {
        discoveryState = discoveryEntry.state;
      } else {
        discoveryState = 'undiscovered';
      }

      return {
        ...card,
        discoveryState,
        quantity,
        isFromSlot0  // Track for visual indicator
      };
    });
  }, [singlePlayerInventory, singlePlayerDiscoveredCards, slot0Cards]);

  /**
   * Filter cards by selected tab
   */
  const filteredCards = useMemo(() => {
    if (selectedTab === 'All') return enrichedCards;
    return enrichedCards.filter(card => card.type === selectedTab);
  }, [enrichedCards, selectedTab]);

  /**
   * Calculate collection stats
   * Includes Slot 0 cards and inventory cards in owned count
   */
  const collectionStats = useMemo(() => {
    const stats = {
      total: enrichedCards.length,
      owned: enrichedCards.filter(c => c.discoveryState === 'owned' || c.quantity > 0 || c.quantity === Infinity).length,
      discovered: enrichedCards.filter(c => c.discoveryState === 'discovered').length,
      byRarity: {}
    };

    // Stats per rarity
    for (const rarity of ['Common', 'Uncommon', 'Rare', 'Mythic']) {
      const rarityCards = enrichedCards.filter(c => c.rarity === rarity);
      stats.byRarity[rarity] = {
        total: rarityCards.length,
        owned: rarityCards.filter(c => c.discoveryState === 'owned' || c.quantity > 0 || c.quantity === Infinity).length,
      };
    }

    return stats;
  }, [enrichedCards]);

  /**
   * Get Slot 0 drones for reference (starter drones)
   */
  const slot0Drones = useMemo(() => {
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    if (!slot0 || !slot0.drones) return [];
    return slot0.drones.map(d => d.name || d.id);
  }, [singlePlayerShipSlots]);

  /**
   * Get Slot 0 ship components for reference (starter components)
   */
  const slot0Components = useMemo(() => {
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    if (!slot0 || !slot0.shipComponents) return [];
    const comps = [];
    for (const lane of ['left', 'middle', 'right']) {
      if (slot0.shipComponents[lane]) {
        comps.push(slot0.shipComponents[lane]);
      }
    }
    return comps;
  }, [singlePlayerShipSlots]);

  /**
   * Enriched drone data with ownership info
   * Shows all drones with discoveryState for placeholder rendering
   */
  const enrichedDrones = useMemo(() => {
    return fullDroneCollection.map(drone => {
      const droneId = drone.name || drone.id;
      const isStarterDrone = slot0Drones.includes(droneId);

      // Count owned instances (not assigned to any slot)
      const ownedInstances = singlePlayerDroneInstances.filter(
        inst => (inst.droneName === droneId || inst.droneId === droneId) && inst.shipSlotId === null
      );

      const isOwned = isStarterDrone || ownedInstances.length > 0;

      return {
        ...drone,
        isStarterDrone,
        ownedCount: ownedInstances.length,
        instances: ownedInstances,
        discoveryState: isOwned ? 'owned' : 'undiscovered'
      };
    });
  }, [singlePlayerDroneInstances, slot0Drones]);

  /**
   * Drone stats
   */
  const droneStats = useMemo(() => {
    const starterCount = enrichedDrones.filter(d => d.isStarterDrone).length;
    const ownedCount = enrichedDrones.filter(d => d.ownedCount > 0 || d.isStarterDrone).length;
    const totalInstances = singlePlayerDroneInstances.filter(i => i.shipSlotId === null).length;

    return {
      total: enrichedDrones.length,
      owned: ownedCount,
      starter: starterCount,
      instances: totalInstances
    };
  }, [enrichedDrones, singlePlayerDroneInstances]);

  /**
   * Enriched ship component data with ownership info
   * Shows all components with discoveryState for placeholder rendering
   */
  const enrichedComponents = useMemo(() => {
    return shipComponentCollection.map(comp => {
      const compId = comp.id;
      const isStarterComponent = slot0Components.includes(compId);

      // Count owned instances (not assigned to any slot)
      const ownedInstances = singlePlayerShipComponentInstances.filter(
        inst => inst.componentId === compId && inst.shipSlotId === null
      );

      const isOwned = isStarterComponent || ownedInstances.length > 0;

      return {
        ...comp,
        isStarterComponent,
        ownedCount: ownedInstances.length,
        instances: ownedInstances,
        discoveryState: isOwned ? 'owned' : 'undiscovered'
      };
    });
  }, [singlePlayerShipComponentInstances, slot0Components]);

  /**
   * Ship component stats
   */
  const componentStats = useMemo(() => {
    const starterCount = enrichedComponents.filter(c => c.isStarterComponent).length;
    const ownedCount = enrichedComponents.filter(c => c.ownedCount > 0 || c.isStarterComponent).length;
    const totalInstances = singlePlayerShipComponentInstances.filter(i => i.shipSlotId === null).length;

    return {
      total: enrichedComponents.length,
      owned: ownedCount,
      starter: starterCount,
      instances: totalInstances
    };
  }, [enrichedComponents, singlePlayerShipComponentInstances]);

  /**
   * Enriched ship data with ownership info
   * Shows all ships with discoveryState for placeholder rendering
   */
  const enrichedShips = useMemo(() => {
    // Get starter deck ship
    const slot0 = singlePlayerShipSlots?.find(slot => slot.id === 0);
    const starterShipId = slot0?.shipId;

    return (shipCollection || []).map(ship => {
      const isStarterShip = ship.id === starterShipId;
      const ownedCount = singlePlayerOwnedShips.filter(s => s === ship.id || s.shipId === ship.id).length;
      const isOwned = isStarterShip || ownedCount > 0;

      return {
        ...ship,
        isStarterShip,
        ownedCount,
        discoveryState: isOwned ? 'owned' : 'undiscovered'
      };
    });
  }, [singlePlayerOwnedShips, singlePlayerShipSlots]);

  /**
   * Ship stats
   */
  const shipStats = useMemo(() => {
    const starterCount = enrichedShips.filter(s => s.isStarterShip).length;
    const ownedCount = enrichedShips.filter(s => s.ownedCount > 0 || s.isStarterShip).length;

    return {
      total: enrichedShips.length,
      owned: ownedCount,
      starter: starterCount
    };
  }, [enrichedShips]);

  /**
   * Category tabs configuration
   */
  const categories = [
    { id: 'Cards', label: 'Cards', icon: Layers, count: collectionStats.owned },
    { id: 'Drones', label: 'Drones', icon: Cpu, count: droneStats.owned },
    { id: 'Ships', label: 'Ships', icon: Rocket, count: shipStats.owned },
    { id: 'Sections', label: 'Ship Sections', icon: Box, count: componentStats.owned }
  ];

  /**
   * Get card visual style based on discovery state
   * Note: ActionCard handles grayscale via isPlayable prop
   */
  const getCardStyle = (card) => {
    if (card.discoveryState === 'undiscovered') {
      return { opacity: 0.5, cursor: 'default' };
    }
    if (card.discoveryState === 'discovered') {
      return { opacity: 0.7, cursor: 'pointer' };
    }
    return { cursor: 'pointer' };
  };

  /**
   * Get rarity badge color
   */
  const getRarityColor = (rarity) => {
    return RARITY_COLORS[rarity] || '#808080';
  };

  /**
   * Handle card click
   */
  const handleCardClick = (card) => {
    if (card.discoveryState !== 'undiscovered') {
      setSelectedCard(card);
    }
  };

  const cardTypeTabs = ['All', 'Ordnance', 'Tactic', 'Support', 'Upgrade'];

  /**
   * Get subtitle based on active category
   */
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
      <div className="dw-modal-content dw-modal--action" onClick={e => e.stopPropagation()} style={{ maxWidth: '1150px', width: '95%' }}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Package size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Inventory</h2>
            <p className="dw-modal-header-subtitle">{getSubtitle()}</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Category Tabs */}
          <div className="dw-modal-tabs" style={{ marginBottom: '16px' }}>
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

          {/* ===== CARDS CATEGORY ===== */}
          {activeCategory === 'Cards' && (
            <>
              {/* Collection Stats Grid */}
              <div className="dw-modal-grid dw-modal-grid--4" style={{ marginBottom: '16px' }}>
                {Object.entries(collectionStats.byRarity).map(([rarity, stats]) => (
                  <div
                    key={rarity}
                    className="dw-modal-stat"
                    style={{ borderLeft: `3px solid ${getRarityColor(rarity)}` }}
                  >
                    <div className="dw-modal-stat-label">{rarity}</div>
                    <div className="dw-modal-stat-value" style={{ color: getRarityColor(rarity) }}>
                      {stats.owned} / {stats.total}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tab Navigation */}
              <div className="dw-modal-tabs">
                {cardTypeTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`dw-modal-tab ${selectedTab === tab ? 'dw-modal-tab--active' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

          {/* Cards Grid */}
          <div className="dw-modal-scroll" style={{ maxHeight: '550px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '10px',
              justifyItems: 'center'
            }}>
              {filteredCards.map(card => {
                const textColor = card.isFromSlot0
                  ? 'var(--modal-action)'
                  : card.discoveryState === 'discovered'
                    ? 'var(--modal-text-muted)'
                    : 'var(--modal-success)';

                return (
                  <div
                    key={card.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'rgba(0, 0, 0, 0.35)',
                      borderRadius: '4px',
                      padding: '16px',
                      paddingBottom: '10px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {card.discoveryState === 'undiscovered' ? (
                      /* Undiscovered - Use HiddenCard component (scaled to match ActionCard) */
                      <>
                        <div
                          style={{
                            width: '162px',
                            height: '198px',
                            overflow: 'visible'
                          }}
                        >
                          <div style={{
                            transform: 'scale(0.72)',
                            transformOrigin: 'top left'
                          }}>
                            <HiddenCard
                              rarity={card.rarity}
                              size="full"
                              style={{ opacity: 0.8 }}
                            />
                          </div>
                        </div>
                        {/* Rarity label for hidden cards */}
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '4px 0',
                            color: getRarityColor(card.rarity),
                            fontWeight: '600',
                            fontSize: '15px',
                            textAlign: 'center'
                          }}
                        >
                          {card.rarity}
                        </div>
                      </>
                    ) : (
                      /* Owned/Discovered - Show full ActionCard (scaled down) */
                      <>
                        <div
                          onClick={() => handleCardClick(card)}
                          style={{
                            width: '162px',
                            height: '198px',
                            overflow: 'visible',
                            cursor: 'pointer',
                            ...getCardStyle(card)
                          }}
                        >
                          <div style={{
                            transform: 'scale(0.72)',
                            transformOrigin: 'top left'
                          }}>
                            <ActionCard card={card} isPlayable={card.discoveryState === 'owned'} />
                          </div>
                        </div>

                        {/* Quantity Bar */}
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '4px 0',
                            color: textColor,
                            fontWeight: '600',
                            fontSize: '15px',
                            textAlign: 'center'
                          }}
                        >
                          {card.isFromSlot0 ? (
                            <>Starter Card - ∞</>
                          ) : card.discoveryState === 'discovered' ? (
                            <>Not Owned</>
                          ) : (
                            <>×{card.quantity} Owned</>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
            </>
          )}

          {/* ===== DRONES CATEGORY ===== */}
          {activeCategory === 'Drones' && (
            <div className="dw-modal-scroll" style={{ maxHeight: '550px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                {enrichedDrones.map(drone => {
                  if (drone.discoveryState === 'undiscovered') {
                    // Placeholder for undiscovered drone
                    return (
                      <div
                        key={drone.name || drone.id}
                        className="dw-modal-info-box"
                        style={{
                          marginBottom: 0,
                          opacity: 0.4,
                          borderColor: 'var(--modal-border)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--modal-text-muted)' }}>???</div>
                            <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)' }}>Class ?</div>
                          </div>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: getRarityColor(drone.rarity),
                            color: '#fff'
                          }}>
                            {drone.rarity}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginTop: '8px' }}>
                          Undiscovered Drone
                        </div>
                      </div>
                    );
                  }

                  // Owned drone - show full details
                  return (
                    <div
                      key={drone.name || drone.id}
                      className="dw-modal-info-box"
                      style={{
                        marginBottom: 0,
                        borderColor: getRarityColor(drone.rarity)
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{drone.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)' }}>Class {drone.class}</div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: getRarityColor(drone.rarity),
                          color: '#fff'
                        }}>
                          {drone.rarity}
                        </span>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', marginBottom: '8px' }}>
                        <span><span style={{ color: 'var(--modal-text-secondary)' }}>HP:</span> {drone.hull}</span>
                        <span><span style={{ color: 'var(--modal-text-secondary)' }}>ATK:</span> {drone.attack}</span>
                        <span><span style={{ color: 'var(--modal-text-secondary)' }}>DEF:</span> {drone.defense}</span>
                      </div>

                      {/* Ownership */}
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: drone.isStarterDrone ? 'var(--modal-action)' : 'var(--modal-success)'
                      }}>
                        {drone.isStarterDrone ? (
                          'Starter Drone - ∞'
                        ) : (
                          `×${drone.ownedCount} in Inventory`
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== SHIPS CATEGORY ===== */}
          {activeCategory === 'Ships' && (
            <div className="dw-modal-scroll" style={{ maxHeight: '550px' }}>
              {enrichedShips.length === 0 ? (
                <div className="dw-modal-info-box" style={{ textAlign: 'center', padding: '40px' }}>
                  <Rocket size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p style={{ color: 'var(--modal-text-secondary)' }}>No ships available in the collection</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px'
                }}>
                  {enrichedShips.map(ship => {
                    if (ship.discoveryState === 'undiscovered') {
                      // Placeholder for undiscovered ship
                      return (
                        <div
                          key={ship.id}
                          className="dw-modal-info-box"
                          style={{
                            marginBottom: 0,
                            opacity: 0.4,
                            borderColor: 'var(--modal-border)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--modal-text-muted)' }}>???</div>
                              <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)' }}>Unknown Class</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginTop: '8px' }}>
                            Undiscovered Ship
                          </div>
                        </div>
                      );
                    }

                    // Owned ship - show full details
                    return (
                      <div
                        key={ship.id}
                        className="dw-modal-info-box"
                        style={{
                          marginBottom: 0,
                          borderColor: 'var(--modal-action)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{ship.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)' }}>{ship.class || 'Standard'}</div>
                          </div>
                          {ship.isStarterShip && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--modal-action)',
                              color: '#fff'
                            }}>
                              STARTER
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {ship.description && (
                          <div style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '8px' }}>
                            {ship.description}
                          </div>
                        )}

                        {/* Ownership */}
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: ship.isStarterShip ? 'var(--modal-action)' : 'var(--modal-success)'
                        }}>
                          {ship.isStarterShip ? (
                            'Starter Ship - ∞'
                          ) : (
                            `×${ship.ownedCount} Owned`
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== SHIP SECTIONS CATEGORY ===== */}
          {activeCategory === 'Sections' && (
            <div className="dw-modal-scroll" style={{ maxHeight: '550px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                {enrichedComponents.map(comp => {
                  if (comp.discoveryState === 'undiscovered') {
                    // Placeholder for undiscovered component
                    return (
                      <div
                        key={comp.id}
                        className="dw-modal-info-box"
                        style={{
                          marginBottom: 0,
                          opacity: 0.4,
                          borderColor: 'var(--modal-border)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--modal-text-muted)' }}>???</div>
                            <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)' }}>Unknown Type</div>
                          </div>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: getRarityColor(comp.rarity),
                            color: '#fff'
                          }}>
                            {comp.rarity}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginTop: '8px' }}>
                          Undiscovered Section
                        </div>
                      </div>
                    );
                  }

                  // Owned component - show full details
                  return (
                    <div
                      key={comp.id}
                      className="dw-modal-info-box"
                      style={{
                        marginBottom: 0,
                        borderColor: getRarityColor(comp.rarity)
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{comp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)' }}>{comp.type}</div>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: getRarityColor(comp.rarity),
                          color: '#fff'
                        }}>
                          {comp.rarity}
                        </span>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', marginBottom: '8px' }}>
                        <span><span style={{ color: 'var(--modal-text-secondary)' }}>Hull:</span> {comp.hull || comp.maxHull}</span>
                        {comp.cardSlots && <span><span style={{ color: 'var(--modal-text-secondary)' }}>Slots:</span> {comp.cardSlots}</span>}
                      </div>

                      {/* Ability if present */}
                      {comp.ability && (
                        <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', marginBottom: '8px', fontStyle: 'italic' }}>
                          <strong style={{ color: 'var(--modal-action)' }}>{comp.ability.name}:</strong> {comp.ability.description}
                        </div>
                      )}

                      {/* Ownership */}
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: comp.isStarterComponent ? 'var(--modal-action)' : 'var(--modal-success)'
                      }}>
                        {comp.isStarterComponent ? (
                          'Starter Section - ∞'
                        ) : (
                          `×${comp.ownedCount} in Inventory`
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Card Detail Popup */}
        {selectedCard && (
          <div className="dw-modal-overlay" onClick={() => setSelectedCard(null)} style={{ zIndex: 1200 }}>
            <div
              className="dw-modal-content dw-modal--lg dw-modal--action"
              onClick={e => e.stopPropagation()}
              style={{ borderColor: getRarityColor(selectedCard.rarity) }}
            >
              {/* Header */}
              <div className="dw-modal-header">
                <div className="dw-modal-header-info">
                  <h2 className="dw-modal-header-title">{selectedCard.name}</h2>
                  <p className="dw-modal-header-subtitle">{selectedCard.type} Card</p>
                </div>
              </div>

              {/* Body */}
              <div className="dw-modal-body">
                {/* Card Display + Info Layout */}
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                  {/* ActionCard Display */}
                  <div style={{ flexShrink: 0 }}>
                    <ActionCard card={selectedCard} />
                  </div>

                  {/* Card Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Meta Info */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--modal-text-secondary)' }}>Cost: </span>
                        <span style={{ color: 'var(--modal-action)', fontWeight: '600' }}>{selectedCard.cost}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--modal-text-secondary)' }}>Rarity: </span>
                        <span style={{ color: getRarityColor(selectedCard.rarity), fontWeight: '600' }}>
                          {selectedCard.rarity}
                        </span>
                      </div>
                    </div>

                    {/* Quantity */}
                    {selectedCard.discoveryState === 'owned' && (
                      <div className="dw-modal-info-box" style={{
                        background: selectedCard.quantity === Infinity ? 'rgba(6, 182, 212, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        borderColor: selectedCard.quantity === Infinity ? 'rgba(6, 182, 212, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                      }}>
                        <span style={{ color: selectedCard.quantity === Infinity ? 'var(--modal-action)' : 'var(--modal-success)' }}>
                          Owned: {selectedCard.quantity === Infinity ? '∞' : selectedCard.quantity}
                          {selectedCard.isFromSlot0 && (
                            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--modal-text-secondary)' }}>
                              (Starter Deck)
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <div className="dw-modal-info-box">
                      <p style={{ fontSize: '13px', color: 'var(--modal-text-primary)', margin: 0, lineHeight: 1.5 }}>
                        {selectedCard.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="dw-modal-actions">
                <button className="dw-btn dw-btn-cancel" onClick={() => setSelectedCard(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
