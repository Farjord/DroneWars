// ========================================
// BLUEPRINTS MODAL COMPONENT
// ========================================
// View/craft from unlocked blueprints

import React, { useState, useMemo } from 'react';
import { Layers, Lock, Cpu } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import droneData from '../../data/droneData';
import { shipComponentCollection } from '../../data/shipSectionData';
import { getAllShips } from '../../data/shipData';
import { RARITY_COLORS } from '../../data/cardData';
import { starterDeck } from '../../data/playerDeckData';
import { starterPoolShipIds } from '../../data/saveGameSchema';
import { ECONOMY } from '../../data/economyData';
import { getAICoresCost } from '../../data/aiCoresData';

/**
 * Starter deck items - now INCLUDED in blueprints with special costs
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
  const aiCores = singlePlayerProfile?.aiCores || 0;
  const unlockedBlueprints = singlePlayerProfile?.unlockedBlueprints || [];

  /**
   * Craft cost by rarity (regular and starter)
   * Uses centralized values from economyData.js
   */
  const CRAFT_COSTS = ECONOMY.REPLICATION_COSTS;

  const STARTER_COSTS = ECONOMY.STARTER_BLUEPRINT_COSTS || CRAFT_COSTS;

  /**
   * Get drone blueprints (including starter drones with special costs)
   */
  const droneBlueprints = useMemo(() => {
    return droneData
      .filter(drone => drone.selectable !== false)
      .map(drone => {
        const isStarterItem = STARTER_DRONE_NAMES.has(drone.name);
        const costTable = isStarterItem ? STARTER_COSTS : CRAFT_COSTS;
        return {
          ...drone,
          id: drone.name, // Drones use name as ID
          isUnlocked: isStarterItem || unlockedBlueprints.includes(drone.name), // Starter items always unlocked
          isStarterItem,
          craftCost: costTable[drone.rarity] || 100,
          aiCoresCost: getAICoresCost(drone.rarity),
          owned: singlePlayerInventory[drone.name] || 0,
        };
      });
  }, [unlockedBlueprints, singlePlayerInventory, STARTER_COSTS]);

  /**
   * Get ship component blueprints (including starter components with special costs)
   */
  const shipBlueprints = useMemo(() => {
    return shipComponentCollection
      .map(component => {
        const isStarterItem = STARTER_COMPONENT_IDS.has(component.id);
        const costTable = isStarterItem ? STARTER_COSTS : CRAFT_COSTS;
        return {
          ...component,
          isUnlocked: isStarterItem || unlockedBlueprints.includes(component.id), // Starter items always unlocked
          isStarterItem,
          craftCost: costTable[component.rarity] || 100,
          aiCoresCost: getAICoresCost(component.rarity),
          owned: singlePlayerInventory[component.id] || 0,
        };
      });
  }, [unlockedBlueprints, singlePlayerInventory, STARTER_COSTS]);

  /**
   * Get ship card blueprints (including starter ship with special cost)
   * Ships now work like drones - tracked in inventory with quantities
   */
  const shipCardBlueprints = useMemo(() => {
    return getAllShips()
      .map(ship => {
        const isStarterItem = STARTER_SHIP_IDS.has(ship.id);
        const costTable = isStarterItem ? STARTER_COSTS : CRAFT_COSTS;
        const owned = singlePlayerInventory[ship.id] || 0;
        return {
          ...ship,
          isUnlocked: isStarterItem || owned > 0, // Starter items always unlocked; for regular: "owned" counts as unlocked
          isStarterItem,
          craftCost: costTable[ship.rarity] || 600, // Ships default to Rare cost
          aiCoresCost: getAICoresCost(ship.rarity || 'Rare'),
          owned,
        };
      });
  }, [singlePlayerInventory, STARTER_COSTS]);

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
    const aiCoresCost = blueprint.aiCoresCost;

    // Check if player has enough credits
    if (credits < craftCost) {
      setFeedback({
        type: 'error',
        message: `Insufficient credits. Need ${craftCost}, have ${credits}`
      });
      return;
    }

    // Check if player has enough AI Cores
    if (aiCores < aiCoresCost) {
      setFeedback({
        type: 'error',
        message: `Insufficient AI Cores. Need ${aiCoresCost}, have ${aiCores}`
      });
      return;
    }

    // Deduct credits and AI Cores
    const newProfile = {
      ...singlePlayerProfile,
      credits: singlePlayerProfile.credits - craftCost,
      aiCores: singlePlayerProfile.aiCores - aiCoresCost
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
      message: `Crafted ${blueprint.name} for ${craftCost} credits + ${aiCoresCost} AI Core${aiCoresCost > 1 ? 's' : ''}`
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
          {/* Currency Display */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <div className="dw-modal-credits" style={{ flex: 1, marginBottom: 0 }}>
              <span className="dw-modal-credits-label">Credits</span>
              <span className="dw-modal-credits-value">{credits}</span>
            </div>
            <div className="dw-modal-credits" style={{
              flex: 1,
              marginBottom: 0,
              '--modal-theme': '#f97316',
              '--modal-theme-bg': 'rgba(249, 115, 22, 0.08)'
            }}>
              <span className="dw-modal-credits-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={14} style={{ color: '#f97316' }} />
                AI Cores
              </span>
              <span className="dw-modal-credits-value" style={{ color: '#f97316' }}>{aiCores}</span>
            </div>
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
                const canAffordCredits = credits >= blueprint.craftCost;
                const canAffordCores = aiCores >= blueprint.aiCoresCost;
                const canAfford = canAffordCredits && canAffordCores;

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
                          {/* Starter Badge */}
                          {blueprint.isStarterItem && (
                            <div style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              color: '#fff',
                              background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              marginBottom: '6px',
                              display: 'inline-block'
                            }}>
                              STARTER
                            </div>
                          )}

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
                              <div>
                                <span style={{ color: canAffordCredits ? '#fbbf24' : '#ef4444', fontWeight: '600' }}>
                                  {blueprint.craftCost}
                                </span>
                                <span style={{ color: 'var(--modal-text-muted)', marginLeft: '4px' }}>credits</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <Cpu size={12} style={{ color: canAffordCores ? '#f97316' : '#ef4444' }} />
                                <span style={{ color: canAffordCores ? '#f97316' : '#ef4444', fontWeight: '600' }}>
                                  {blueprint.aiCoresCost}
                                </span>
                                <span style={{ color: 'var(--modal-text-muted)' }}>AI Core{blueprint.aiCoresCost > 1 ? 's' : ''}</span>
                              </div>
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
            <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0, marginBottom: '4px' }}>
              <strong style={{ color: 'var(--modal-theme)' }}>Credit Costs:</strong>{' '}
              Common {CRAFT_COSTS.Common}, Uncommon {CRAFT_COSTS.Uncommon}, Rare {CRAFT_COSTS.Rare}, Mythic {CRAFT_COSTS.Mythic}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--modal-text-primary)', margin: 0, marginBottom: '4px' }}>
              <strong style={{ color: '#f97316' }}>AI Cores Costs:</strong>{' '}
              Common 1, Uncommon 2, Rare 3, Mythic 5
            </p>
            <p style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', margin: 0 }}>
              AI Cores drop from defeating AI enemies in combat
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
