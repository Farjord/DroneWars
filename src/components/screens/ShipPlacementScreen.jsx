// ========================================
// SHIP PLACEMENT SCREEN COMPONENT
// ========================================
// Provides interface for placing ship sections during initial setup
// Shows unplaced sections and lane slots with center lane bonus indication

import React from 'react';
import ShipSection from '../ui/ShipSection.jsx';

/**
 * SHIP PLACEMENT SCREEN COMPONENT
 * Provides interface for placing ship sections during initial setup.
 * Shows unplaced sections and lane slots with center lane bonus indication.
 * @param {Array} unplaced - Array of unplaced section names
 * @param {Array} placed - Array of placed sections by lane index
 * @param {string} selected - Currently selected section name
 * @param {Function} onSectionSelect - Callback when section is selected
 * @param {Function} onLaneSelect - Callback when lane is selected for placement
 * @param {Function} onConfirm - Callback when layout is confirmed
 * @param {Object} player - Player state data
 * @param {Object} gameEngine - Game engine instance
 * @param {string} turnPhase - Current turn phase
 * @param {Function} isMyTurn - Function to check if it's player's turn
 * @param {Object} passInfo - Pass information object
 * @param {Function} getLocalPlayerId - Function to get local player ID
 * @param {Object} localPlayerState - Local player state
 * @param {Object} shipAbilityMode - Current ship ability mode
 */
const ShipPlacementScreen = ({
  unplaced,
  placed,
  selected,
  onSectionSelect,
  onLaneSelect,
  onConfirm,
  player,
  gameEngine,
  turnPhase,
  isMyTurn,
  passInfo,
  getLocalPlayerId,
  localPlayerState,
  shipAbilityMode
}) => {
  const allPlaced = placed.every(section => section !== null);

  console.log(`🔥 ShipPlacementScreen rendered:`, {
    allPlaced,
    placed,
    unplaced,
    selected
  });

  return (
    <div className="flex flex-col items-center w-full h-full justify-start pt-8 px-4">
      <h2 className="text-3xl font-bold mb-2 text-white text-center font-orbitron">
        Configure Your Ship Layout
      </h2>
      <p className="text-center text-gray-400 mb-8">
        Select a section, then click an empty lane to place it. You can also click a placed section to pick it up again.
        The ship section placed in the centre lane will gain a bonus to its stats.
      </p>

      {/* This container holds both rows of ship sections */}
      <div className="flex flex-col items-center w-full space-y-4">
        {/* Unplaced Sections Row */}
        <div className="flex w-full justify-between gap-8">
          {['bridge', 'powerCell', 'droneControlHub'].map(sectionName => (
            <div key={sectionName} className="flex-1 min-w-0 h-[190px]">
              {unplaced.includes(sectionName) && (
                <div
                  onClick={() => onSectionSelect(sectionName)}
                  className={`h-full transition-all duration-300 rounded-xl ${selected === sectionName ? 'scale-105 ring-4 ring-cyan-400' : 'opacity-70 hover:opacity-100 cursor-pointer'}`}
                >
                  <ShipSection
                    section={sectionName}
                    stats={player.shipSections[sectionName]}
                    effectiveStatsForDisplay={player.shipSections[sectionName].stats.healthy}
                    isPlayer={true}
                    isInteractive={true}
                    gameEngine={gameEngine}
                    turnPhase={turnPhase}
                    isMyTurn={isMyTurn}
                    passInfo={passInfo}
                    getLocalPlayerId={getLocalPlayerId}
                    localPlayerState={localPlayerState}
                    shipAbilityMode={shipAbilityMode}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Placed Sections Row */}
        <div className="flex w-full justify-between gap-8">
          {[0, 1, 2].map(laneIndex => {
            const placedSectionName = placed[laneIndex];
            const isSelectedForPlacement = selected && !placed[laneIndex];

            return (
              <div
                key={laneIndex}
                className="flex-1 min-w-0 h-[190px]"
                onClick={() => onLaneSelect(laneIndex)}
              >
                {placedSectionName ? (
                  <ShipSection
                    section={placedSectionName}
                    stats={player.shipSections[placedSectionName]}
                    effectiveStatsForDisplay={gameEngine.calculateEffectiveShipStats(player, placed).bySection[placedSectionName]}
                    isPlayer={true}
                    isInteractive={true}
                    isInMiddleLane={laneIndex === 1}
                    gameEngine={gameEngine}
                    turnPhase={turnPhase}
                    isMyTurn={isMyTurn}
                    passInfo={passInfo}
                    getLocalPlayerId={getLocalPlayerId}
                    localPlayerState={localPlayerState}
                    shipAbilityMode={shipAbilityMode}
                  />
                ) : (
                  <div className={`bg-black/30 rounded-xl border-2 border-dashed border-purple-500/50 flex items-center justify-center text-purple-300/70 p-4 h-full transition-colors duration-300 ${isSelectedForPlacement ? 'cursor-pointer hover:border-purple-500 hover:bg-purple-900/20' : ''}`}>
                    <span className="text-center font-bold">
                      {laneIndex === 1 ? 'Lane 2 (Center Bonus)' : `Lane ${laneIndex + 1}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => {
          console.log(`🔥 Confirm Layout button clicked! allPlaced: ${allPlaced}`);
          onConfirm();
        }}
        disabled={!allPlaced}
        className="mt-12 bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-green-500 shadow-lg"
      >
        Confirm Layout
      </button>
    </div>
  );
};

export default ShipPlacementScreen;