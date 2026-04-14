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
  isOpponent,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  isCardTarget,
  isAffectedSection,
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
        ${reallocationEffect}
        ${isCardTarget ? 'valid-target' : ''}
      `}
      style={isCardTarget ? {
        '--valid-target-color': fc.glow,
        '--valid-target-color-dim': `${fc.glow}60`,
      } : undefined}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Hover glow — shape-aware via filter-on-parent / clip-on-child */}
      <div style={{
        position: 'absolute', inset: 0,
        filter: `drop-shadow(0 0 8px ${fc.glow}) drop-shadow(0 0 18px ${fc.glow}aa) drop-shadow(0 0 34px ${fc.glow}55)`,
        pointerEvents: 'none',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.25s ease-in-out',
      }}>
        <div style={{
          width: '100%', height: '100%',
          clipPath,
          background: fc.primary + '40',
        }} />
      </div>

      {/* Clipped visual layer — 11 decorative layers + ship art, no interaction */}
      <div
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <ShipSectionVisualLayers
          isOpponent={isOpponent}
          columnIndex={columnIndex}
          clipPath={clipPath}
          shipImage={stats.image}
        />
      </div>

      {/* Affected section overlay — animate-pulse intentionally NOT converted to .valid-target:
          isAffectedSection is a passive collateral-damage indicator (Crossfire, Encirclement),
          not a "valid target" signal. These are semantically distinct visual states. */}
      {isAffectedSection && (
        <div
          className="animate-pulse"
          style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'none',
            filter: `drop-shadow(0 0 8px ${FACTION_COLORS.opponent.accent}cc) drop-shadow(0 0 18px ${FACTION_COLORS.opponent.accent}80)`,
          }}
        >
          <div style={{
            width: '100%', height: '100%',
            clipPath,
            background: `${FACTION_COLORS.opponent.accent}40`,
          }} />
        </div>
      )}

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
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(0.5rem, 1vw, 1rem)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            textShadow: `0 0 0.8vw ${fc.primary}aa, 0 0 1.5vw ${fc.primary}44, 0 1px 3px rgba(0,0,0,0.9)`,
            textAlign: 'center',
            background: 'rgba(0,0,0,0.65)',
            borderRadius: '4px',
            padding: '2px 8px',
            border: '1px solid rgba(255,255,255,0.15)',
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
              }} viewBox="0 0 20 23">
                <polygon
                  points="10,1 19,6 19,17 10,22 1,17 1,6"
                  fill={i < stats.allocatedShields ? FACTION_COLORS.player.accentLight : 'none'}
                  fillOpacity={i < stats.allocatedShields ? 0.6 : 1}
                  stroke={i < stats.allocatedShields ? FACTION_COLORS.player.accentLight : '#4b5563'}
                  strokeWidth="1.5"
                />
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
              <span className="text-purple-400 font-bold tracking-wider font-exo uppercase"
                style={{ fontSize: 'clamp(0.35rem, 0.6vw, 0.6rem)', lineHeight: 1, whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.65)', borderRadius: '4px', padding: '1px 4px', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {stats.ability.name}
              </span>
            </div>
          )}

          {/* Opponent ability label — display only */}
          {!isPlayer && stats.ability && (
            <div style={{ position: 'absolute', right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2vh' }}>
              <div className={`w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                stats.ability.activationLimit != null && (stats.abilityActivationCount || 0) >= stats.ability.activationLimit
                  ? 'border-gray-600 opacity-60'
                  : ''
              }`}
                style={stats.ability.activationLimit == null || (stats.abilityActivationCount || 0) < stats.ability.activationLimit
                  ? { borderColor: FACTION_COLORS.opponent.primary } : undefined}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={stats.ability.activationLimit == null || (stats.abilityActivationCount || 0) < stats.ability.activationLimit
                    ? { color: FACTION_COLORS.opponent.primary } : undefined}
                  className={
                  stats.ability.activationLimit != null && (stats.abilityActivationCount || 0) >= stats.ability.activationLimit
                    ? 'text-gray-500'
                    : ''
                }>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <span className="text-purple-400 font-bold tracking-wider font-exo uppercase"
                style={{ fontSize: 'clamp(0.35rem, 0.6vw, 0.6rem)', lineHeight: 1, whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.65)', borderRadius: '4px', padding: '1px 4px', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {stats.ability.name}
              </span>
            </div>
          )}
        </div>

        {/* Hull Bar */}
        <div style={{ display: 'flex', gap: '0.12vw', justifyContent: 'center' }}>
          {Array.from({ length: stats.maxHull }).map((_, i) => {
            const hullPoint = i + 1;
            const { damaged, critical } = stats.thresholds;
            const isFilled = i < stats.hull;
            let bgColor;
            if (!isFilled) {
              bgColor = '#9ca3af';
            } else if (hullPoint <= critical) {
              bgColor = FACTION_COLORS.opponent.accent;
            } else if (hullPoint <= damaged) {
              bgColor = FACTION_COLORS.player.accentDark;
            } else {
              bgColor = FACTION_COLORS.player.accent;
            }
            return (
              <div key={i} style={{
                width: '0.65vw', height: '0.7vw',
                minWidth: '5px', minHeight: '5px',
                background: bgColor,
                borderRadius: '2px',
                border: '1px solid rgba(0,0,0,0.5)',
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ShipSectionCompact;
