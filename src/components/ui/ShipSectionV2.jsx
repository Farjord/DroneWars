// ========================================
// SHIP SECTION V2 COMPONENT
// ========================================
// Simplified, compact ship section overlay for new battlefield design
// Displays: Section name, ability icon, shields, and segmented hull bar

import React from 'react';
import styles from './ShipSectionV2.module.css';

/**
 * SHIP ABILITY ICON V2
 * Compact ability button positioned at top-right of section
 */
const ShipAbilityIconV2 = ({ onClick, ability, isUsable, isSelected }) => (
  <button
    onClick={onClick}
    disabled={!isUsable}
    className={`${styles.abilityIcon} ${isUsable ? styles.abilityUsable : styles.abilityDisabled} ${isSelected ? styles.abilitySelected : ''}`}
    title={`${ability.name} - Cost: ${ability.cost.energy} Energy`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  </button>
);

/**
 * SHIP SECTION V2 COMPONENT
 * Compact overlay section for new ship display
 * @param {string} section - Section identifier (bridge, powerCell, droneControlHub)
 * @param {Object} stats - Section stats and configuration
 * @param {boolean} isPlayer - Whether this is the player's section
 * @param {Function} onClick - Click handler for section
 * @param {Function} onAbilityClick - Ability activation handler
 * @param {boolean} isInteractive - Whether section is interactive
 * @param {boolean} isCardTarget - Whether section is targeted by current action
 * @param {boolean} isInMiddleLane - Whether section is in center position
 * @param {string} reallocationState - Shield reallocation visual state
 * @param {Object} gameEngine - Game engine for status calculations
 * @param {string} turnPhase - Current turn phase
 * @param {Function} isMyTurn - Check if it's player's turn
 * @param {Object} passInfo - Pass information
 * @param {Function} getLocalPlayerId - Get local player ID
 * @param {Object} localPlayerState - Local player state
 * @param {Object} shipAbilityMode - Current ship ability mode
 * @param {Function} onMouseEnter - Mouse enter handler
 * @param {Function} onMouseLeave - Mouse leave handler
 * @param {Object} sectionRef - Ref for DOM element
 */
const ShipSectionV2 = ({
  section,
  stats,
  isPlayer,
  onClick,
  onAbilityClick,
  isInteractive,
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
  onMouseEnter,
  onMouseLeave,
  sectionRef
}) => {
  const sectionStatus = gameEngine.getShipStatus(stats);

  // Determine border color based on state
  let borderClass = styles.borderDefault;
  if (reallocationState) {
    switch (reallocationState) {
      case 'can-remove':
        borderClass = styles.borderCanRemove;
        break;
      case 'removed-from':
        borderClass = styles.borderRemovedFrom;
        break;
      case 'cannot-remove':
        borderClass = styles.borderCannotRemove;
        break;
      case 'can-add':
        borderClass = styles.borderCanAdd;
        break;
      case 'added-to':
        borderClass = styles.borderAddedTo;
        break;
      case 'cannot-add':
        borderClass = styles.borderCannotAdd;
        break;
    }
  } else if (sectionStatus === 'critical') {
    borderClass = styles.borderCritical;
  } else if (sectionStatus === 'damaged') {
    borderClass = styles.borderDamaged;
  }

  const cardTargetClass = isCardTarget ? styles.cardTarget : '';
  const interactiveClass = isInteractive ? styles.interactive : '';

  // Format section name for display
  const sectionName = section === 'droneControlHub'
    ? 'Control Hub'
    : section === 'powerCell'
    ? 'Power Cell'
    : section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  return (
    <div
      ref={sectionRef}
      className={`${styles.sectionBox} ${borderClass} ${cardTargetClass} ${interactiveClass}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header: Section Name + Ability Icon */}
      <div className={styles.header}>
        <h3 className={styles.sectionName}>{sectionName}</h3>
        {isPlayer && stats.ability && (
          <ShipAbilityIconV2
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

      {/* Shields Display */}
      <div className={styles.shieldsContainer}>
        {Array(stats.shields).fill(0).map((_, i) => (
          <div key={i} className={styles.shieldIcon}>
            {i < stats.allocatedShields ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.shieldFilled}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="black" strokeWidth="1.5"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.shieldEmpty}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Hull Bar - Segmented with color coding */}
      <div className={styles.hullBar}>
        {Array.from({ length: stats.maxHull }).map((_, i) => {
          const hullPoint = i + 1;
          const { critical, damaged } = stats.thresholds;

          // Determine segment color based on threshold
          let segmentClass;
          if (hullPoint <= critical) {
            segmentClass = styles.hullCritical;
          } else if (hullPoint <= damaged) {
            segmentClass = styles.hullDamaged;
          } else {
            segmentClass = styles.hullHealthy;
          }

          // Filled or empty based on current hull
          const isFilledClass = i < stats.hull ? segmentClass : styles.hullEmpty;

          return (
            <div key={i} className={`${styles.hullSegment} ${isFilledClass}`}></div>
          );
        })}
      </div>
    </div>
  );
};

export default ShipSectionV2;
