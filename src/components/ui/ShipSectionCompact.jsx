// ========================================
// SHIP SECTION COMPACT COMPONENT
// ========================================
// Compact ship section display for in-game use
// Vertically stacked layout with click-to-view full card modal
// Removes detailed stats text, keeps shields/hull/ability button

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
    className={`w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border-2 z-20 transition-all duration-200 flex-shrink-0 ${isUsable ? 'border-cyan-400 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-400/50' : 'bg-slate-900 border-gray-600 opacity-60 cursor-not-allowed'} ${isSelected ? 'ring-2 ring-cyan-300 scale-110' : ''}`}
    title={`${ability.name} - Cost: ${ability.cost.energy} Energy`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isUsable ? 'text-cyan-400' : 'text-gray-500'}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  </button>
);

/**
 * SHIP SECTION COMPACT COMPONENT
 * Compact display for ship sections during gameplay.
 * Click section to view full card details in modal.
 * @param {Object} section - Section identifier
 * @param {Object} stats - Section stats and configuration
 * @param {boolean} isPlayer - Whether this is the player's section
 * @param {boolean} isPlaceholder - Whether this is a placeholder slot
 * @param {Function} onClick - Callback when section is clicked (for shield allocation/targeting)
 * @param {Function} onAbilityClick - Callback when ability is activated
 * @param {Function} onViewFullCard - Callback to open modal with full card details
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
const ShipSectionCompact = ({
  section,
  stats,
  isPlayer,
  isPlaceholder,
  onClick,
  onAbilityClick,
  onViewFullCard,
  isInteractive,
  isOpponent,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  isCardTarget,
  isInMiddleLane,
  isTargetingMode,
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
  const hoverEffect = isHovered ? 'shadow-xl' : '';

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

  const backgroundImageStyle = {
    backgroundImage: `url(${stats.image})`,
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  };

  // Handle clicks - shield allocation/targeting takes priority, then view full card
  const handleClick = (e) => {
    // If onClick returns true it consumed the click (e.g., started targeting)
    const consumed = onClick ? onClick(e) === true : false;

    // Only open modal when NOT consumed, NOT targeting, NOT reallocating, NOT allocating shields, and modal handler exists
    if (!consumed && !isTargetingMode && !reallocationState && turnPhase !== 'allocateShields' && onViewFullCard) {
      onViewFullCard();
    }
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
        transition-all duration-300 overflow-hidden cursor-pointer
        ${borderColor}
        ${hoverEffect}
        ${cardTargetEffect}
        ${reallocationEffect}
      `}
      style={backgroundImageStyle}
      onClick={handleClick}
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

      {/* 3-Column Grid Layout: Left (empty) | Middle (content) | Right (ability) */}
      <div className="relative z-10 grid grid-cols-[1fr_2fr_1fr] gap-2 h-full p-3">
        {/* Left Section - Empty for spacing/balance */}
        <div></div>

        {/* Middle Section - Title, Status, Shields, Hull (all centered) */}
        <div className="flex flex-col items-center justify-center gap-2 h-full">
          {/* Title */}
          <p className="font-orbitron text-lg uppercase tracking-widest text-white text-center">{stats.type}</p>

          {/* Status Badge */}
          <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${sectionStatus === 'healthy' ? 'bg-cyan-500/20 text-cyan-300' : sectionStatus === 'damaged' ? 'bg-cyan-700/20 text-cyan-500' : 'bg-red-500/20 text-red-300'}`}>
            {sectionStatus.charAt(0).toUpperCase() + sectionStatus.slice(1)}
          </div>

          {/* Shields */}
          <div className="flex gap-1 items-center">
            {Array(stats.shields).fill(0).map((_, i) => (
              i < stats.allocatedShields
                ? <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.6" className="text-cyan-300"><path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z" stroke="currentColor" strokeWidth="1.5"></path></svg>
                : <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M12,0 L24,6 L24,18 L12,24 L0,18 L0,6 Z" stroke="currentColor" strokeWidth="1.5"></path></svg>
            ))}
          </div>

          {/* Hull */}
          <div className="flex justify-center gap-1">
            {Array.from({ length: stats.maxHull }).map((_, i) => {
              const hullPoint = i + 1;
              const { critical, damaged } = stats.thresholds;
              let thresholdColor;
              if (hullPoint <= critical) {
                thresholdColor = 'bg-red-500';
              } else if (hullPoint <= damaged) {
                thresholdColor = 'bg-cyan-600';
              } else {
                thresholdColor = 'bg-cyan-400';
              }
              const isFilled = i < stats.hull;
              return (
                <div key={i} className={`h-4 w-4 rounded-sm ${isFilled ? thresholdColor : 'bg-gray-400'} border border-black/50`}></div>
              );
            })}
          </div>
        </div>

        {/* Right Section - Ability Button and Name (centered) */}
        <div className="flex flex-col items-center justify-center gap-2 h-full">
          {isPlayer && stats.ability && (
            <>
              <ShipAbilityIcon
                ability={stats.ability}
                isUsable={
                  turnPhase === 'action' &&
                  isMyTurn() &&
                  !passInfo[`${getLocalPlayerId()}Passed`] &&
                  localPlayerState.energy >= stats.ability.cost.energy &&
                  // Check activation limit (per-round usage)
                  (stats.ability.activationLimit == null ||
                    (localPlayerState.shipSections?.[section]?.abilityActivationCount || 0) < stats.ability.activationLimit)
                }
                isSelected={shipAbilityMode?.ability.id === stats.ability.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onAbilityClick(e, {...stats, name: section}, stats.ability);
                }}
              />
              <p className="font-bold text-xs text-purple-400 leading-tight text-center">{stats.ability.name}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipSectionCompact;
