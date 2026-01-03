// ========================================
// DRONES VIEW COMPONENT - CLEAN VERSION
// ========================================
// Cards display at natural size - no scaling wrappers

import React, { useState, useRef, useEffect } from 'react';
import DroneCard from '../DroneCard.jsx';
import ActionCard from '../ActionCard.jsx';
import CardBackPlaceholder from '../CardBackPlaceholder.jsx';
import styles from '../GameFooter.module.css';
import { calculateCardFanRotation, getHoverTransform, getCardTransition, calculateCardArcOffset, CARD_FAN_CONFIG } from '../../../utils/cardAnimationUtils.js';
import { debugLog } from '../../../utils/debugLogger.js';

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
  roundNumber,
  passInfo,
  validCardTargets,
  setIsViewDiscardModalOpen,
  setIsViewDeckModalOpen,
  handleCardDragStart,
  draggedCard
}) {
  const [hoveredDroneId, setHoveredDroneId] = useState(null);
  const [discardHovered, setDiscardHovered] = useState(false);

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
    <div className={styles.handContainer} style={{ paddingLeft: '16px', paddingRight: '16px' }}>
      {/* Discard Pile */}
      <div className={styles.cardPile}>
        <div
          onClick={() => setIsViewDiscardModalOpen(true)}
          onMouseEnter={() => setDiscardHovered(true)}
          onMouseLeave={() => setDiscardHovered(false)}
          style={{
            width: '150px',
            height: '183.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
            cursor: 'pointer',
            transform: discardHovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.2s ease'
          }}
        >
          {localPlayerState.discardPile.length > 0 ? (
            <div style={{ pointerEvents: 'none' }}>
              <ActionCard
                card={localPlayerState.discardPile[localPlayerState.discardPile.length - 1]}
                scale={0.667}
                isPlayable={false}
              />
            </div>
          ) : (
            <CardBackPlaceholder scale={0.667} variant="discard" isHovered={discardHovered} />
          )}
        </div>
        <p className={styles.pileLabel}>
          Discard <span style={{ color: '#9ca3af', fontWeight: 'bold' }}>({localPlayerState.discardPile.length})</span>
        </p>
      </div>

      {/* Drone Grid - Center Section */}
      <div className={styles.handSection}>
        <div className={styles.handCardsContainer}>
          <div ref={droneGridRef} className={styles.handCardsWrapper}>
            {sortedLocalActivePool.map((drone, index) => {
              // Debug: trace availability lookup
              debugLog('AVAILABILITY', `[${drone.name}] DronesView lookup:`, {
                availability: localPlayerState.droneAvailability?.[drone.name],
                hasAvailabilityState: !!localPlayerState.droneAvailability
              });

              const totalResource = roundNumber === 1
                ? localPlayerState.initialDeploymentBudget + localPlayerState.energy
                : localPlayerState.deploymentBudget + localPlayerState.energy;
              const canAfford = totalResource >= drone.class;
              const hasDeploymentBudget = roundNumber === 1
                ? localPlayerState.initialDeploymentBudget > 0
                : localPlayerState.deploymentBudget > 0;
              const isUpgradeTarget = selectedCard?.type === 'Upgrade'
                && validCardTargets.some(t => t.id === drone.name);

              const isHovered = hoveredDroneId === drone.name;
              const isSelected = selectedDrone && selectedDrone.name === drone.name;

              // Determine if drone is selectable for deployment
              const isSelectable = (turnPhase === 'deployment' &&
                isMyTurn() &&
                !passInfo[`${getLocalPlayerId()}Passed`] &&
                canAfford &&
                !mandatoryAction) ||
                isUpgradeTarget;

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
                  key={drone.name}
                  className={styles.droneCardWrapper}
                  style={wrapperStyle}
                  onMouseEnter={() => setHoveredDroneId(drone.name)}
                  onMouseLeave={() => setHoveredDroneId(null)}
                  onMouseDown={(e) => {
                    // Only initiate drag for selectable drones during deployment
                    debugLog('DRAG_DROP_DEPLOY', '🖱️ Drag started from DronesView', { droneName: drone.name, isSelectable, hasHandler: !!handleCardDragStart });
                    if (isSelectable && handleCardDragStart) {
                      e.preventDefault();
                      handleCardDragStart(drone, e);
                    }
                  }}
                >
                  <DroneCard
                    drone={drone}
                    onClick={handleToggleDroneSelection}
                    isSelected={selectedDrone && selectedDrone.name === drone.name}
                    isSelectable={isSelectable}
                    deployedCount={localPlayerState.deployedDroneCounts[drone.name] || 0}
                    appliedUpgrades={localPlayerState.appliedUpgrades[drone.name] || []}
                    availability={localPlayerState.droneAvailability?.[drone.name]}
                    isUpgradeTarget={isUpgradeTarget}
                    onViewUpgrades={(d, upgrades) => setViewUpgradesModal({ droneName: d.name, upgrades })}
                    hasDeploymentBudget={hasDeploymentBudget}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deck Pile */}
      <div className={styles.cardPile}>
        <div style={{ width: '150px', height: '183.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
          <CardBackPlaceholder
            scale={0.667}
            variant="deck"
            onClick={() => setIsViewDeckModalOpen(true)}
          />
        </div>
        <p className={styles.pileLabel}>
          Deck <span style={{ color: '#22d3ee', fontWeight: 'bold' }}>({localPlayerState.deck.length})</span>
        </p>
      </div>
    </div>
  );
}

export default DronesView;