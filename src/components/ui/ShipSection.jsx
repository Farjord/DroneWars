// ========================================
// SHIP SECTION COMPONENT
// ========================================
// Individual ship section display with status, stats, abilities, and interactions
// Supports shield reallocation, card targeting, and ability activation

import React from 'react';

/**
 * SHIP ABILITY ICON COMPONENT
 * Renders the ability activation button for ship sections.
 * @param {Function} onClick - Callback when ability is activated
 * @param {Object} ability - Ability data object
 * @param {boolean} isUsable - Whether the ability can be used
 * @param {boolean} isSelected - Whether the ability is currently selected
 */
const ShipAbilityIcon = ({ onClick, ability, isUsable, isSelected }) => (
  <button
    onClick={onClick}
    disabled={!isUsable}
    className={`w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center border-2 border-black/50 z-20 transition-all duration-200 flex-shrink-0 ${isUsable ? 'hover:bg-purple-500' : 'bg-gray-700 opacity-60 cursor-not-allowed'} ${isSelected ? 'ring-2 ring-yellow-300 scale-110' : ''}`}
    title={`${ability.name} - Cost: ${ability.cost.energy} Energy`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  </button>
);

/**
 * SHIP SECTION COMPONENT
 * Displays individual ship sections with stats, abilities, and visual states.
 * Supports shield reallocation, card targeting, and interactive elements.
 * @param {Object} section - Section identifier
 * @param {Object} stats - Section stats and configuration
 * @param {Object} effectiveStatsForDisplay - Calculated stats for display
 * @param {boolean} isPlayer - Whether this is the player's section
 * @param {boolean} isPlaceholder - Whether this is a placeholder slot
 * @param {Function} onClick - Callback when section is clicked
 * @param {Function} onAbilityClick - Callback when ability is activated
 * @param {boolean} isInteractive - Whether section should be interactive
 * @param {boolean} isOpponent - Whether this is opponent's section
 * @param {boolean} isHovered - Whether section is currently hovered
 * @param {Function} onMouseEnter - Mouse enter event handler
 * @param {Function} onMouseLeave - Mouse leave event handler
 * @param {boolean} isCardTarget - Whether section is targeted by current action
 * @param {boolean} isInMiddleLane - Whether section is in center lane (bonus)
 * @param {string} reallocationState - Current shield reallocation state
 * @param {Object} gameEngine - Game engine instance for status calculations
 * @param {string} turnPhase - Current turn phase
 * @param {Function} isMyTurn - Function to check if it's player's turn
 * @param {Object} passInfo - Pass information object
 * @param {Function} getLocalPlayerId - Function to get local player ID
 * @param {Object} localPlayerState - Local player state
 * @param {Object} shipAbilityMode - Current ship ability mode
 */
const ShipSection = ({
  section,
  stats,
  effectiveStatsForDisplay,
  isPlayer,
  isPlaceholder,
  onClick,
  onAbilityClick,
  isInteractive,
  isOpponent,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  isCardTarget,
  isInMiddleLane,
  reallocationState,
  gameEngine,
  turnPhase,
  isMyTurn,
  passInfo,
  getLocalPlayerId,
  localPlayerState,
  shipAbilityMode,
  sectionRef
}) => {
  if (isPlaceholder) {
    return (
      <div
        className="bg-black/30 rounded-sm border-2 border-dashed border-purple-500/50 flex items-center justify-center text-purple-300/70 p-4 min-h-[160px] h-full transition-colors duration-300 cursor-pointer hover:border-purple-500 hover:text-purple-300"
        onClick={onClick}
      >
        <span className="text-center">Click to place section</span>
      </div>
    );
  }

  const sectionStatus = gameEngine.getShipStatus(stats);

  const overlayColor = sectionStatus === 'critical' ? 'bg-red-900/60' : sectionStatus === 'damaged' ? 'bg-yellow-900/50' : 'bg-black/60';
  let borderColor = sectionStatus === 'critical' ? 'border-red-500' : sectionStatus === 'damaged' ? 'border-yellow-500' : (isOpponent ? 'border-red-500' : 'border-cyan-500');
  const shadowColor = isOpponent ? 'shadow-red-500/20' : 'shadow-cyan-500/20';
  const hoverEffect = isHovered ? 'scale-105 shadow-xl' : '';

  // Override border color for shield reallocation states
  let reallocationEffect = '';
  if (reallocationState) {
    switch (reallocationState) {
      case 'can-remove':
        borderColor = 'border-orange-400';
        reallocationEffect = 'ring-2 ring-orange-400/50 shadow-lg shadow-orange-400/30';
        break;
      case 'removed-from':
        borderColor = 'border-orange-600';
        reallocationEffect = 'ring-4 ring-orange-600/80 shadow-lg shadow-orange-600/50 bg-orange-900/20';
        break;
      case 'cannot-remove':
        borderColor = 'border-gray-600';
        reallocationEffect = 'opacity-50';
        break;
      case 'can-add':
        borderColor = 'border-green-400';
        reallocationEffect = 'ring-2 ring-green-400/50 shadow-lg shadow-green-400/30';
        break;
      case 'added-to':
        borderColor = 'border-green-600';
        reallocationEffect = 'ring-4 ring-green-600/80 shadow-lg shadow-green-600/50 bg-green-900/20';
        break;
      case 'cannot-add':
        borderColor = 'border-gray-600';
        reallocationEffect = 'opacity-50';
        break;
    }
  }

  const cardTargetEffect = isCardTarget ? 'ring-4 ring-purple-400 shadow-lg shadow-purple-400/50 animate-pulse' : '';
  const sectionName = section === 'droneControlHub' ? 'Drone Control Hub' : section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  const backgroundImageStyle = {
    backgroundImage: `url(${stats.image})`,
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  };

  // Determine the accent color for the corner based on current state
  const getAccentColor = () => {
    if (reallocationState) {
      if (reallocationState.includes('orange')) return 'rgba(251, 146, 60, 0.7)';
      if (reallocationState.includes('green')) return 'rgba(74, 222, 128, 0.7)';
      return 'rgba(107, 114, 128, 0.5)';
    }
    if (sectionStatus === 'critical') return 'rgba(239, 68, 68, 0.7)';
    if (sectionStatus === 'damaged') return 'rgba(234, 179, 8, 0.7)';
    return isOpponent ? 'rgba(239, 68, 68, 0.5)' : 'rgba(6, 182, 212, 0.5)';
  };

  return (
    <div
      ref={sectionRef}
      className={`
        relative rounded-sm shadow-lg ${shadowColor} border-2 h-full
        transition-all duration-300 overflow-hidden
        ${borderColor}
        ${isInteractive ? `cursor-pointer ${hoverEffect}` : ''}
        ${cardTargetEffect}
        ${reallocationEffect}
      `}
      style={backgroundImageStyle}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Angular corner accent */}
      <div
        className="absolute top-0 left-0 w-3 h-3 z-20 pointer-events-none"
        style={{
          borderTop: `2px solid ${getAccentColor()}`,
          borderLeft: `2px solid ${getAccentColor()}`
        }}
      />
      <div className={`absolute inset-0 ${overlayColor}`}></div>

      <div className="relative z-10 flex flex-col items-center p-2 h-full">
          <div className="flex items-center justify-between w-full mb-2">
            {/* Left side: Name + Status inline */}
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg text-white">{stats.name || sectionName}</p>
              <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${sectionStatus === 'healthy' ? 'bg-green-500/20 text-green-300' : sectionStatus === 'damaged' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                {sectionStatus.charAt(0).toUpperCase() + sectionStatus.slice(1)}
              </div>
            </div>

            {/* Right side: Ability button */}
            {isPlayer && stats.ability && (
              <ShipAbilityIcon
                ability={stats.ability}
                isUsable={
                  turnPhase === 'action' &&
                  isMyTurn() &&
                  !passInfo[`${getLocalPlayerId()}Passed`] &&
                  localPlayerState.energy >= stats.ability.cost.energy
                }
                isSelected={shipAbilityMode?.ability.id === stats.ability.id}
                onClick={(e) => onAbilityClick(e, {...stats, name: section}, stats.ability)}
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 w-full items-center mt-auto">
            <div className="flex flex-col items-start text-sm text-gray-300">
              {effectiveStatsForDisplay && Object.entries(effectiveStatsForDisplay).map(([key, value]) => {
                const isBoosted = isInMiddleLane && stats.middleLaneBonus && stats.middleLaneBonus[key];
                return (
                    <span key={key} className="flex items-center text-xs">
                        <span className="font-semibold mr-1">{key}:</span>
                        <span className={isBoosted ? 'text-green-400 font-bold' : ''}>{value}</span>
                    </span>
                );
              })}
            </div>

            <div className="flex flex-col items-center">
              <div className="flex gap-1 items-center mb-2">
                {Array(stats.shields).fill(0).map((_, i) => (
                  <div key={i}>
                    {i < stats.allocatedShields
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-300"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path></svg>
                    }
                  </div>
                ))}
              </div>
              <div className="flex w-full justify-center gap-1">
                {Array.from({ length: stats.maxHull }).map((_, i) => {
                    const hullPoint = i + 1;
                    const { critical, damaged } = stats.thresholds;
                    let thresholdColor;
                    if (hullPoint <= critical) {
                        thresholdColor = 'bg-red-500';
                    } else if (hullPoint <= damaged) {
                        thresholdColor = 'bg-orange-500';
                    } else {
                        thresholdColor = 'bg-green-500';
                    }
                    const isFilled = i < stats.hull;
                    return (
                      <div key={i} className={`h-4 w-4 rounded-sm ${isFilled ? thresholdColor : 'bg-gray-400'} border border-black/50`}></div>
                    );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center h-full pl-4 text-center">
              {stats.ability && (
                <>
                  <h4 className="font-bold text-sm text-purple-300 leading-tight mb-1">{stats.ability.name}</h4>
                  <p className="text-xs text-white leading-tight">{stats.ability.description}</p>
                </>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default ShipSection;