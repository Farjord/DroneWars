// ========================================
// DRONES VIEW COMPONENT - CLEAN VERSION
// ========================================
// Cards display at natural size - no scaling wrappers

import React, { useState, useRef, useEffect } from 'react';
import DroneCard from '../DroneCard.jsx';
import styles from '../GameFooter.module.css';
import { calculateCardFanRotation, getHoverTransform, getCardTransition, calculateCardArcOffset, CARD_FAN_CONFIG } from '../../../utils/cardAnimationUtils.js';

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
  const [hoveredDroneId, setHoveredDroneId] = useState(null);

  // Dynamic overlap calculation (same as HandView)
  const droneGridRef = useRef(null);
  const [dynamicOverlap, setDynamicOverlap] = useState(CARD_FAN_CONFIG.cardOverlapPx);

  useEffect(() => {
    const calculateOverlap = () => {
      if (!droneGridRef.current || sortedLocalActivePool.length === 0) return;

      const containerWidth = droneGridRef.current.offsetWidth;
      const cardWidth = 225; // DroneCard base width (same as ActionCard)
      const poolSize = sortedLocalActivePool.length;

      // Calculate total width needed with default overlap
      const totalWidthWithDefaultOverlap = cardWidth + (poolSize - 1) * (cardWidth + CARD_FAN_CONFIG.cardOverlapPx);

      if (totalWidthWithDefaultOverlap > containerWidth) {
        // Need more overlap - calculate how much
        const availableWidthForOverlaps = containerWidth - cardWidth;
        const neededOverlap = (availableWidthForOverlaps / (poolSize - 1)) - cardWidth;
        setDynamicOverlap(Math.min(neededOverlap, CARD_FAN_CONFIG.cardOverlapPx)); // Don't expand, only compress
      } else {
        // Use default overlap
        setDynamicOverlap(CARD_FAN_CONFIG.cardOverlapPx);
      }
    };

    calculateOverlap();
    window.addEventListener('resize', calculateOverlap);
    return () => window.removeEventListener('resize', calculateOverlap);
  }, [sortedLocalActivePool.length]);

  return (
    <div className={styles.droneContainer}>
      <div ref={droneGridRef} className={styles.droneGrid}>
        {sortedLocalActivePool.map((drone, index) => {
          const totalResource = turn === 1
            ? localPlayerState.initialDeploymentBudget + localPlayerState.energy
            : localPlayerState.energy;
          const canAfford = totalResource >= drone.class;
          const isUpgradeTarget = selectedCard?.type === 'Upgrade'
            && validCardTargets.some(t => t.id === drone.name);

          const isHovered = hoveredDroneId === drone.name;
          const isSelected = selectedDrone && selectedDrone.name === drone.name;

          // Calculate fan rotation and spacing using centralized utilities
          const rotationDeg = calculateCardFanRotation(index, sortedLocalActivePool.length);
          const marginLeft = index === 0 ? 0 : dynamicOverlap; // Use dynamic overlap
          const arcOffset = calculateCardArcOffset(rotationDeg, sortedLocalActivePool.length);

          const wrapperStyle = {
            zIndex: (isHovered || isSelected) ? CARD_FAN_CONFIG.zIndex.hovered : CARD_FAN_CONFIG.zIndex.normal(index),
            transform: (isHovered || isSelected) ? getHoverTransform() : `translateY(${arcOffset}px) rotate(${rotationDeg}deg)`,
            marginLeft: `${marginLeft}px`,
            transformOrigin: CARD_FAN_CONFIG.transformOrigin,
            transition: getCardTransition()
          };

          return (
            <div
              key={index}
              className={styles.droneCardWrapper}
              style={wrapperStyle}
              onMouseEnter={() => setHoveredDroneId(drone.name)}
              onMouseLeave={() => setHoveredDroneId(null)}
            >
              <DroneCard
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DronesView;