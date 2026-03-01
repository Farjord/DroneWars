// ========================================
// SHIP SECTION COMPACT COMPONENT
// ========================================
// Compact ship section display for in-game use.
// Chevron clip-path with 11 decorative layers (visual, clipped)
// and a separate unclipped content layer for interactive elements.

import React from 'react';
import ShipAbilityIcon from './ShipAbilityIcon.jsx';
import { FACTION_COLORS, getShipClipPath, ShipSectionVisualLayers } from './ShipSectionLayers.jsx';

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
  columnIndex,
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
  const fc = isOpponent ? FACTION_COLORS.opponent : FACTION_COLORS.player;
  const clipPath = getShipClipPath(isOpponent, columnIndex);

  // Reallocation visual state
  let reallocationEffect = '';
  if (reallocationState) {
    switch (reallocationState) {
      case 'can-remove':
        reallocationEffect = 'ring-2 ring-orange-400/50 shadow-lg shadow-orange-400/30';
        break;
      case 'removed-from':
        reallocationEffect = 'ring-4 ring-orange-600/80 shadow-lg shadow-orange-600/50';
        break;
      case 'cannot-remove':
      case 'cannot-add':
        reallocationEffect = 'opacity-50';
        break;
      case 'can-add':
        reallocationEffect = 'ring-2 ring-green-400/50 shadow-lg shadow-green-400/30';
        break;
      case 'added-to':
        reallocationEffect = 'ring-4 ring-green-600/80 shadow-lg shadow-green-600/50';
        break;
    }
  }

  const hoverEffect = isHovered ? 'shadow-xl' : '';
  const shadowColor = isOpponent ? 'shadow-red-500/20' : 'shadow-cyan-500/20';

  // Handle clicks — shield allocation/targeting takes priority, then view full card
  const handleClick = (e) => {
    const consumed = onClick ? onClick(e) === true : false;
    if (!consumed && !isTargetingMode && !reallocationState && turnPhase !== 'allocateShields' && onViewFullCard) {
      onViewFullCard();
    }
  };

  return (
    // Outer container — unclipped, sized, receives events and state effects
    <div
      ref={sectionRef}
      className={`
        relative h-full cursor-pointer
        transition-all duration-300
        ${shadowColor} ${hoverEffect}
        ${reallocationEffect}
      `}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Clipped visual layer — 11 decorative layers + ship art, no interaction */}
      <div
        className={isCardTarget ? 'animate-pulse' : ''}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <ShipSectionVisualLayers
          isOpponent={isOpponent}
          columnIndex={columnIndex}
          clipPath={clipPath}
          shipImage={stats.image}
        />
      </div>

      {/* Content layer — unclipped, interactive, constrained to safe zone */}
      <div style={{
        position: 'absolute',
        top: isOpponent ? '10%' : '42%',
        bottom: isOpponent ? '42%' : '10%',
        left: '15%',
        right: '15%',
        zIndex: 10,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '0.3vh',
      }}>
        {/* Ship Name */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{
            color: '#fff',
            fontWeight: 800,
            fontSize: 'clamp(0.5rem, 1vw, 1rem)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            textShadow: `0 0 0.8vw ${fc.primary}aa, 0 0 1.5vw ${fc.primary}44, 0 1px 3px rgba(0,0,0,0.9)`,
            textAlign: 'center',
          }}>
            {stats.type}
          </span>
        </div>

        {/* Shields + Action Button */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '0.4vw', justifyContent: 'center', alignItems: 'center' }}>
            {Array(stats.shields).fill(0).map((_, i) => (
              <svg key={i} style={{
                width: '1.2vw', height: '1.4vw',
                minWidth: '10px', minHeight: '12px',
                filter: i < stats.allocatedShields ? `drop-shadow(0 0 0.4vw ${fc.primary}88)` : 'none',
              }} viewBox="0 0 20 23">
                <polygon
                  points="10,1 19,6 19,17 10,22 1,17 1,6"
                  fill={i < stats.allocatedShields ? fc.primary : 'transparent'}
                  stroke={fc.primary}
                  strokeWidth="1.5"
                  opacity={i < stats.allocatedShields ? 0.95 : 0.15}
                />
                {i < stats.allocatedShields && (
                  <polygon points="10,4 16,7.5 16,15 10,19 4,15 4,7.5" fill={fc.bright} opacity="0.25" />
                )}
              </svg>
            ))}
          </div>

          {/* Ability button — absolute right */}
          {isPlayer && stats.ability && (
            <div style={{ position: 'absolute', right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2vh' }}>
              <ShipAbilityIcon
                ability={stats.ability}
                isUsable={
                  turnPhase === 'action' &&
                  isMyTurn() &&
                  !passInfo[`${getLocalPlayerId()}Passed`] &&
                  localPlayerState.energy >= stats.ability.cost.energy &&
                  (stats.ability.activationLimit == null ||
                    (localPlayerState.shipSections?.[section]?.abilityActivationCount || 0) < stats.ability.activationLimit)
                }
                isSelected={shipAbilityMode?.ability.id === stats.ability.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onAbilityClick(e, {...stats, name: section}, stats.ability);
                }}
              />
            </div>
          )}
        </div>

        {/* Hull Bar */}
        <div style={{ display: 'flex', gap: '0.12vw', justifyContent: 'center' }}>
          {Array.from({ length: stats.maxHull }).map((_, i) => {
            const hullPoint = i + 1;
            const { critical, damaged } = stats.thresholds;
            const isFilled = i < stats.hull;
            let bgColor;
            if (!isFilled) {
              bgColor = 'rgba(255,255,255,0.03)';
            } else if (hullPoint <= critical) {
              bgColor = `linear-gradient(180deg, ${FACTION_COLORS.opponent.bright}, ${FACTION_COLORS.opponent.primary})`;
            } else {
              bgColor = `linear-gradient(180deg, ${fc.bright}, ${fc.primary})`;
            }
            return (
              <div key={i} style={{
                width: '0.65vw', height: '0.7vw',
                minWidth: '5px', minHeight: '5px',
                background: bgColor,
                borderRadius: '1px',
                boxShadow: isFilled
                  ? `0 0 0.3vw ${fc.primary}88, 0 0 0.6vw ${fc.primary}33`
                  : `inset 0 0 0.1vw rgba(255,255,255,0.03)`,
                border: isFilled ? 'none' : `0.03vw solid rgba(255,255,255,0.05)`,
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ShipSectionCompact;
