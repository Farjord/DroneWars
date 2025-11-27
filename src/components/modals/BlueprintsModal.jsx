import React, { useState, useMemo } from 'react';
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

  const {
    singlePlayerProfile,
    singlePlayerInventory,
  } = gameState;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Blueprints</h2>
            <p className="text-sm text-gray-400">
              {stats.unlocked} / {stats.total} unlocked
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Credits Display */}
        <div className="mb-4 p-3 bg-gray-900 rounded">
          <span className="text-gray-400">Available Credits: </span>
          <span className="text-yellow-400 font-bold text-lg">{credits}</span>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className={`
            p-3 rounded mb-4
            ${feedback.type === 'success' ? 'bg-green-900 bg-opacity-30 border border-green-700 text-green-200' : ''}
            ${feedback.type === 'error' ? 'bg-red-900 bg-opacity-30 border border-red-700 text-red-200' : ''}
          `}>
            {feedback.message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {['Drones', 'Ships'].map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`
                px-4 py-2 rounded font-bold transition-colors
                ${selectedTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Blueprints Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentBlueprints.map(blueprint => {
            const canAfford = credits >= blueprint.craftCost;

            return (
              <div
                key={blueprint.id}
                className={`
                  p-4 bg-gray-900 rounded-lg border-2 transition-all
                  ${blueprint.isUnlocked
                    ? 'border-gray-700'
                    : 'border-gray-800 opacity-60'
                  }
                `}
              >
                {/* Locked View */}
                {!blueprint.isUnlocked ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">🔒</div>
                    <div className="text-xs font-bold mb-1"
                      style={{ color: getRarityColor(blueprint.rarity) }}>
                      {blueprint.rarity}
                    </div>
                    <div className="text-xs text-gray-500">Locked</div>
                  </div>
                ) : (
                  <>
                    {/* Blueprint Name */}
                    <div className="font-bold text-white mb-2">{blueprint.name}</div>

                    {/* Type/Rarity */}
                    <div className="text-xs text-gray-400 mb-1">{blueprint.type}</div>
                    <div className="text-xs font-bold mb-3"
                      style={{ color: getRarityColor(blueprint.rarity) }}>
                      {blueprint.rarity}
                    </div>

                    {/* Owned Count */}
                    {blueprint.owned > 0 && (
                      <div className="mb-2 text-sm text-green-400">
                        Owned: {blueprint.owned}
                      </div>
                    )}

                    {/* Craft Cost */}
                    <div className="mb-3 text-sm text-gray-400">
                      Cost: <span className="text-yellow-400 font-bold">{blueprint.craftCost}</span>
                    </div>

                    {/* Craft Button */}
                    <button
                      onClick={() => handleCraft(blueprint)}
                      disabled={!canAfford}
                      className={`
                        w-full px-3 py-2 rounded font-bold text-sm transition-colors
                        ${canAfford
                          ? 'bg-blue-600 hover:bg-blue-500'
                          : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }
                      `}
                    >
                      Craft
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-700 rounded">
          <p className="text-sm text-blue-200">
            <strong>Craft Costs:</strong> Common {CRAFT_COSTS.Common}, Uncommon {CRAFT_COSTS.Uncommon},
            Rare {CRAFT_COSTS.Rare}, Mythic {CRAFT_COSTS.Mythic} credits
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default BlueprintsModal;
