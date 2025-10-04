// ========================================
// DRONES VIEW COMPONENT - CLEAN VERSION
// ========================================
// Cards display at natural size - no scaling wrappers

import React from 'react';
import DroneCard from '../DroneCard.jsx';
import styles from '../GameFooter.module.css';

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
          const totalResource = turn === 1 
            ? localPlayerState.initialDeploymentBudget + localPlayerState.energy 
            : localPlayerState.energy;
          const canAfford = totalResource >= drone.class;
          const isUpgradeTarget = selectedCard?.type === 'Upgrade' 
            && validCardTargets.some(t => t.id === drone.name);

          return (
            <DroneCard
              key={index}
              drone={drone}
              onClick={handleToggleDroneSelection}
              isSelected={selectedDrone && selectedDrone.name === drone.name}
              isSelectable={
                (turnPhase === 'deployment' && 
                 isMyTurn() && 
                 !passInfo[`${getLocalPlayerId()}Passed`] && 
                 canAfford && 
                 !mandatoryAction) || 
                isUpgradeTarget
              }
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