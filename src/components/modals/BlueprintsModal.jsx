// ========================================
// BLUEPRINTS MODAL COMPONENT
// ========================================
// View/craft from unlocked blueprints

import React, { useState, useMemo } from 'react';
import { Layers, Lock } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import droneData from '../../data/droneData';
import { shipComponentCollection } from '../../data/shipSectionData';
import { getAllShips } from '../../data/shipData';
import { RARITY_COLORS } from '../../data/cardData';
import { starterDeck } from '../../data/playerDeckData';
import { starterPoolShipIds } from '../../data/saveGameSchema';

/**
 * Starter deck items that should NOT appear as blueprints
 * Dynamically extracted from starterDeck - updates automatically if starter deck changes
 */
const STARTER_DRONE_NAMES = new Set(starterDeck.drones.map(d => d.name));
const STARTER_COMPONENT_IDS = new Set(Object.keys(starterDeck.shipComponents));
const STARTER_SHIP_IDS = new Set(starterPoolShipIds);

/**
 * BlueprintsModal Component
 * View/craft from unlocked blueprints
 * Craft costs by rarity: Common 100, Uncommon 250, Rare 600, Mythic 1500
 */
const BlueprintsModal = ({ onClose }) => {
  const { gameState, gameStateManager } = useGameState();
  const [selectedTab, setSelectedTab] = useState('Drones');
  const [feedback, setFeedback] = useState(null);

  // Fallbacks for showcase mode where game state may be empty
  const {
    singlePlayerProfile,
    singlePlayerInventory = {},
  } = gameState || {};

  const credits = singlePlayerProfile?.credits || 0;
  const unlockedBlueprints = singlePlayerProfile?.unlockedBlueprints || [];

  /**
   * Craft cost by rarity
   */
  const CRAFT_COSTS = {
    Common: 100,
    Uncommon: 250,
    Rare: 600,
    Mythic: 1500,
  };

  /**
   * Get filtered drone blueprints (excluding starter drones)
   */
  const droneBlueprints = useMemo(() => {
    return droneData
      .filter(drone => !STARTER_DRONE_NAMES.has(drone.name)) // Exclude starter drones
      .map(drone => ({
        ...drone,
        id: drone.name, // Drones use name as ID
        isUnlocked: unlockedBlueprints.includes(drone.name),
        craftCost: CRAFT_COSTS[drone.rarity] || 100,
        owned: singlePlayerInventory[drone.name] || 0,
      }));
  }, [unlockedBlueprints, singlePlayerInventory]);

  /**
   * Get filtered ship component blueprints (excluding starter components)
   */
  const shipBlueprints = useMemo(() => {
    return shipComponentCollection
      .filter(component => !STARTER_COMPONENT_IDS.has(component.id)) // Exclude starter components
      .map(component => ({
        ...component,
        isUnlocked: unlockedBlueprints.includes(component.id),
        craftCost: CRAFT_COSTS[component.rarity] || 100,
        owned: singlePlayerInventory[component.id] || 0,
      }));
  }, [unlockedBlueprints, singlePlayerInventory]);

  /**
   * Get filtered ship card blueprints (excluding starter ship)
   * Ships now work like drones - tracked in inventory with quantities
   */
  const shipCardBlueprints = useMemo(() => {
    return getAllShips()
      .filter(ship => !STARTER_SHIP_IDS.has(ship.id)) // Exclude starter ship
      .map(ship => {
        const owned = singlePlayerInventory[ship.id] || 0;
        return {
          ...ship,
          isUnlocked: owned > 0, // For stats: "owned" counts as unlocked
          craftCost: CRAFT_COSTS[ship.rarity] || 600, // Ships default to Rare cost
          owned,
        };
      });
  }, [singlePlayerInventory]);

  /**
   * Get collection stats
   */
  const stats = useMemo(() => {
    let current;
    if (selectedTab === 'Drones') {
      current = droneBlueprints;
    } else if (selectedTab === 'Ships') {
      current = shipBlueprints;
    } else {
      current = shipCardBlueprints;
    }
    return {
      unlocked: current.filter(b => b.isUnlocked).length,
      total: current.length,
    };
  }, [selectedTab, droneBlueprints, shipBlueprints, shipCardBlueprints]);

  /**
   * Check if blueprint is a ship card
   */
  const isShipCard = (blueprint) => {
    return blueprint.id?.startsWith('SHIP_');
  };

  /**
   * Handle craft button click
   */
  const handleCraft = (blueprint) => {
    const craftCost = blueprint.craftCost;

    // Check if player has enough credits
    if (credits < craftCost) {
      setFeedback({
        type: 'error',
        message: `Insufficient credits. Need ${craftCost}, have ${credits}`
      });
      return;
    }

    // Deduct credits
    const newProfile = {
      ...singlePlayerProfile,
      credits: singlePlayerProfile.credits - craftCost
    };

    // All items (ships, drones, components) are added to inventory
    const newInventory = {
      ...singlePlayerInventory,
      [blueprint.id]: (singlePlayerInventory[blueprint.id] || 0) + 1
    };

    gameStateManager.setState({
      singlePlayerProfile: newProfile,
      singlePlayerInventory: newInventory,
    });

    // Update card discovery state to 'owned' if not already (for drones/components)
    if (!isShipCard(blueprint)) {
      gameStateManager.updateCardDiscoveryState(blueprint.id, 'owned');
    }

    setFeedback({
      type: 'success',
      message: `Crafted ${blueprint.name} for ${craftCost} credits`
    });

    // Clear feedback after 2 seconds
    setTimeout(() => setFeedback(null), 2000);
  };

  /**
   * Get rarity color
   */
  const getRarityColor = (rarity) => {
    return RARITY_COLORS[rarity] || '#808080';
  };

  const currentBlueprints = selectedTab === 'Drones'
    ? droneBlueprints
    : selectedTab === 'Ships'
      ? shipBlueprints
      : shipCardBlueprints;
  const tabs = ['Drones', 'Ships', 'Ship Cards'];

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Layers size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Blueprints</h2>
            <p className="dw-modal-header-subtitle">{stats.unlocked} / {stats.total} unlocked</p>
          </div>
        </div>

        {/* Body */}
        <div className="dw-modal-body">
          {/* Credits Display */}
          <div className="dw-modal-credits">
            <span className="dw-modal-credits-label">Available Credits</span>
            <span className="dw-modal-credits-value">{credits}</span>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`dw-modal-feedback dw-modal-feedback--${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="dw-modal-tabs">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`dw-modal-tab ${selectedTab === tab ? 'dw-modal-tab--active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Blueprints Grid */}
          <div className="dw-modal-scroll" style={{ maxHeight: '400px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {currentBlueprints.map(blueprint => {
                const canAfford = credits >= blueprint.craftCost;

                return (
                  <div
                    key={blueprint.id}
                    className={`dw-blueprint-card ${!blueprint.isUnlocked ? 'dw-blueprint-card--locked' : ''}`}
                    style={{
                      padding: '12px',
                      borderRadius: '4px'
                    }}
                  >
                    <div className="dw-blueprint-card-scanline" />
                    <div className="dw-blueprint-card-inner">
                      {/* Locked View */}
                      {!blueprint.isUnlocked ? (
                        <div style={{ textAlign: 'center', padding: '16px 0', position: 'relative', zIndex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                            <Lock size={32} style={{ color: 'var(--modal-text-muted)' }} />
                          </div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: getRarityColor(blueprint.rarity),
                            marginBottom: '4px'
                          }}>
                            {blueprint.rarity}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)' }}>Locked</div>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          {/* Blueprint Name */}
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#fff',
                            marginBottom: '6px'
                          }}>
                            {blueprint.name}
                          </div>

                          {/* Type/Stats/Rarity */}
                          {isShipCard(blueprint) ? (
                            <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', marginBottom: '4px' }}>
                              Hull: {blueprint.baseHull} | Shields: {blueprint.baseShields}
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', marginBottom: '4px' }}>
                              {blueprint.type}
                            </div>
                          )}
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: getRarityColor(blueprint.rarity),
                            marginBottom: '8px'
                          }}>
                            {blueprint.rarity}
                          </div>

                          {/* Owned Count - not shown for ship cards */}
                          {blueprint.owned > 0 && !isShipCard(blueprint) && (
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--modal-success)',
                              marginBottom: '6px'
                            }}>
                              Owned: {blueprint.owned}
                            </div>
                          )}

                          {/* Ship Card Status - show Unlocked instead of Owned */}
                          {isShipCard(blueprint) && blueprint.isUnlocked && (
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--modal-success)',
                              marginBottom: '6px',
                              fontWeight: '600'
                            }}>
                              ✓ Unlocked
                            </div>
                          )}

                          {/* Craft Cost - only show if can still craft */}
                          {(!isShipCard(blueprint) || !blueprint.isUnlocked) && (
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--modal-text-secondary)',
                              marginBottom: '10px'
                            }}>
                              Cost: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{blueprint.craftCost}</span>
                            </div>
                          )}

                          {/* Craft/Unlock Button - not shown for already-unlocked ship cards */}
                          {(!isShipCard(blueprint) || !blueprint.isUnlocked) && (
                            <button
                              className={`dw-btn dw-btn-confirm dw-btn--full ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleCraft(blueprint)}
                              disabled={!canAfford}
                            >
                              {isShipCard(blueprint) ? 'Unlock' : 'Craft'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info Box */}
          <div className="dw-modal-info-box" style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0 }}>
              <strong style={{ color: 'var(--modal-theme)' }}>Craft Costs:</strong>{' '}
              Common {CRAFT_COSTS.Common}, Uncommon {CRAFT_COSTS.Uncommon}, Rare {CRAFT_COSTS.Rare}, Mythic {CRAFT_COSTS.Mythic} credits
            </p>
          </div>
        </div>

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

export default BlueprintsModal;
