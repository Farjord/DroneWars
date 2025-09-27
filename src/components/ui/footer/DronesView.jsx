// ========================================
// DRONES VIEW COMPONENT
// ========================================
// Drone pool display showing available drones for deployment
// Part of GameFooter component refactoring

import React from 'react';
import DroneCard from '../DroneCard.jsx';
import styles from '../GameFooter.module.css';

/**
 * DronesView - Displays drone pool with deployment controls
 * @param {Object} props - Component props
 * @param {Object} props.localPlayerState - Local player state data
 * @param {Array} props.sortedLocalActivePool - Sorted local active drone pool
 * @param {Object} props.selectedCard - Currently selected card
 * @param {string} props.turnPhase - Current turn phase
 * @param {boolean} props.mandatoryAction - Whether there's a mandatory action
 * @param {Function} props.handleToggleDroneSelection - Handle drone selection
 * @param {Object} props.selectedDrone - Currently selected drone
 * @param {Function} props.setViewUpgradesModal - Set view upgrades modal
 * @param {Function} props.getLocalPlayerId - Get local player ID
 * @param {Function} props.isMyTurn - Check if it's local player's turn
 * @param {number} props.turn - Current turn number
 * @param {Object} props.passInfo - Pass information
 * @param {Array} props.validCardTargets - Valid card targets
 */
function DronesView({
  localPlayerState,
  sortedLocalActivePool,
  selectedCard,
  turnPhase,
  mandatoryAction,
  handleToggleDroneSelection,
  selectedDrone,
  setViewUpgradesModal,
  getLocalPlayerId,
  isMyTurn,
  turn,
  passInfo,
  validCardTargets
}) {
  return (
    <div className={styles.droneContainer}>
      <div className={styles.droneGrid}>
        {sortedLocalActivePool.map((drone, index) => {
          const totalResource = turn === 1 ? localPlayerState.initialDeploymentBudget + localPlayerState.energy : localPlayerState.energy;
          const canAfford = totalResource >= drone.class;
          const isUpgradeTarget = selectedCard?.type === 'Upgrade' && validCardTargets.some(t => t.id === drone.name);

          return (
            <DroneCard
              key={index}
              drone={drone}
              onClick={handleToggleDroneSelection}
              isSelected={selectedDrone && selectedDrone.name === drone.name}
              isSelectable={(turnPhase === 'deployment' && isMyTurn() && !passInfo[`${getLocalPlayerId()}Passed`] && canAfford && !mandatoryAction) || isUpgradeTarget}
              deployedCount={localPlayerState.deployedDroneCounts[drone.name] || 0}
              appliedUpgrades={localPlayerState.appliedUpgrades[drone.name] || []}
              isUpgradeTarget={isUpgradeTarget}
              onViewUpgrades={(d, upgrades) => setViewUpgradesModal({ droneName: d.name, upgrades })}
            />
          );
        })}
      </div>
    </div>
  );
}

export default DronesView;