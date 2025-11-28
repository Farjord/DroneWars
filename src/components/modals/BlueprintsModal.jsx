// ========================================
// BLUEPRINTS MODAL COMPONENT
// ========================================
// View/craft from unlocked blueprints

import React, { useState, useMemo } from 'react';
import { Layers, Lock } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import droneData from '../../data/droneData';
import { shipComponentCollection } from '../../data/shipData';
import { RARITY_COLORS } from '../../data/cardData';
import { starterDeck } from '../../data/playerDeckData';

/**
 * Starter deck items that should NOT appear as blueprints
 * Dynamically extracted from starterDeck - updates automatically if starter deck changes
 */
const STARTER_DRONE_NAMES = new Set(starterDeck.drones.map(d => d.name));
const STARTER_COMPONENT_IDS = new Set(Object.keys(starterDeck.shipComponents));

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
   * Get collection stats
   */
  const stats = useMemo(() => {
    const current = selectedTab === 'Drones' ? droneBlueprints : shipBlueprints;
    return {
      unlocked: current.filter(b => b.isUnlocked).length,
      total: current.length,
    };
  }, [selectedTab, droneBlueprints, shipBlueprints]);

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

    // Add to inventory
    const newInventory = {
      ...singlePlayerInventory,
      [blueprint.id]: (singlePlayerInventory[blueprint.id] || 0) + 1
    };

    gameStateManager.setState({
      singlePlayerProfile: newProfile,
      singlePlayerInventory: newInventory,
    });

    // Update card discovery state to 'owned' if not already
    gameStateManager.updateCardDiscoveryState(blueprint.id, 'owned');

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

  const currentBlueprints = selectedTab === 'Drones' ? droneBlueprints : shipBlueprints;
  const tabs = ['Drones', 'Ships'];

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

                          {/* Type/Rarity */}
                          <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', marginBottom: '4px' }}>
                            {blueprint.type}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: getRarityColor(blueprint.rarity),
                            marginBottom: '8px'
                          }}>
                            {blueprint.rarity}
                          </div>

                          {/* Owned Count */}
                          {blueprint.owned > 0 && (
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--modal-success)',
                              marginBottom: '6px'
                            }}>
                              Owned: {blueprint.owned}
                            </div>
                          )}

                          {/* Craft Cost */}
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--modal-text-secondary)',
                            marginBottom: '10px'
                          }}>
                            Cost: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{blueprint.craftCost}</span>
                          </div>

                          {/* Craft Button */}
                          <button
                            className={`dw-btn dw-btn-confirm dw-btn--full ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleCraft(blueprint)}
                            disabled={!canAfford}
                          >
                            Craft
                          </button>
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
