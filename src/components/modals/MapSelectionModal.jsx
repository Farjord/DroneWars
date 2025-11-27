import React, { useState, useMemo } from 'react';
import { useGameState } from '../../hooks/useGameState';
import SeededRandom from '../../utils/seededRandom';

/**
 * MapSelectionModal Component
 * Shows 3-6 procedurally generated maps per tier for selected ship slot
 */
const MapSelectionModal = ({ selectedSlotId, onMapSelected, onClose }) => {
  const { gameState } = useGameState();
  const [selectedTier, setSelectedTier] = useState(1);

  const gameSeed = gameState.singlePlayerProfile?.gameSeed || Date.now();

  /**
   * Generate maps for a specific tier
   * Uses game seed for deterministic generation
   */
  const generateMapsForTier = (tier) => {
    const rng = new SeededRandom(gameSeed + tier * 1000);
    const mapCount = 3 + rng.randomInt(0, 4); // 3-6 maps

    return Array.from({ length: mapCount }, (_, i) => {
      // Create a unique seed for this map
      const mapSeed = gameSeed + tier * 1000 + i;
      const mapRng = new SeededRandom(mapSeed);

      return {
        id: `map_${tier}_${i}_${gameSeed}`,
        tier,
        seed: mapSeed,
        name: `Sector ${String.fromCharCode(65 + tier - 1)}-${i + 1}`,
        nodeCounts: {
          combat: mapRng.randomInt(3, 8),
          treasure: mapRng.randomInt(1, 4),
          event: mapRng.randomInt(1, 3),
          boss: 1
        },
        difficulty: tier,
        estimatedLoot: mapRng.randomInt(100, 500) * tier,
        detectionRisk: mapRng.randomInt(10, 40) * tier,
      };
    });
  };

  /**
   * Get maps for current tier (memoized for performance)
   */
  const currentMaps = useMemo(
    () => generateMapsForTier(selectedTier),
    [selectedTier, gameSeed]
  );

  /**
   * Handle map click
   */
  const handleMapClick = (map) => {
    onMapSelected(map);
  };

  /**
   * Get difficulty color
   */
  const getDifficultyColor = (tier) => {
    if (tier === 1) return 'text-green-400';
    if (tier === 2) return 'text-yellow-400';
    return 'text-red-400';
  };

  /**
   * Get total nodes for a map
   */
  const getTotalNodes = (map) => {
    return Object.values(map.nodeCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Map Selection</h2>
            <p className="text-sm text-gray-400">Select a map for Ship Slot {selectedSlotId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tier Selector */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`
                flex-1 px-4 py-3 rounded-lg font-bold transition-colors
                ${selectedTier === tier
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              Tier {tier}
              <span className={`ml-2 ${getDifficultyColor(tier)}`}>
                {tier === 1 ? '(Easy)' : tier === 2 ? '(Medium)' : '(Hard)'}
              </span>
            </button>
          ))}
        </div>

        {/* Maps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentMaps.map(map => {
            const totalNodes = getTotalNodes(map);

            return (
              <div
                key={map.id}
                onClick={() => handleMapClick(map)}
                className="p-4 bg-gray-900 rounded-lg border-2 border-gray-700 hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg"
              >
                {/* Map Name */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-white text-lg">{map.name}</h3>
                  <span className={`text-sm font-bold ${getDifficultyColor(map.tier)}`}>
                    T{map.tier}
                  </span>
                </div>

                {/* Node Counts */}
                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Combat Nodes:</span>
                    <span className="text-red-400 font-bold">{map.nodeCounts.combat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Treasure Nodes:</span>
                    <span className="text-yellow-400 font-bold">{map.nodeCounts.treasure}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Event Nodes:</span>
                    <span className="text-blue-400 font-bold">{map.nodeCounts.event}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Boss Nodes:</span>
                    <span className="text-purple-400 font-bold">{map.nodeCounts.boss}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700 my-3"></div>

                {/* Stats */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Nodes:</span>
                    <span className="text-white font-bold">{totalNodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. Loot:</span>
                    <span className="text-yellow-400 font-bold">{map.estimatedLoot} ¤</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Detection Risk:</span>
                    <span className="text-orange-400 font-bold">{map.detectionRisk}%</span>
                  </div>
                </div>

                {/* Select Hint */}
                <div className="mt-3 text-center text-xs text-gray-500">
                  Click to select
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-700 rounded">
          <p className="text-sm text-blue-200">
            <strong>Tip:</strong> Higher tier maps offer greater rewards but pose increased danger.
            Choose wisely based on your ship's condition and deck strength.
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MapSelectionModal;
