// ========================================
// HAND VIEW COMPONENT - CLEAN VERSION
// ========================================
// Cards display at natural size - no scaling
// Simple responsive layout

import React, { useRef, useState, useEffect } from 'react';
import ActionCard from '../ActionCard.jsx';
import styles from '../GameFooter.module.css';
import { debugLog } from '../../../utils/debugLogger.js';
import { calculateCardFanRotation, getHoverTransform, getCardTransition, calculateCardArcOffset, CARD_FAN_CONFIG } from '../../../utils/cardAnimationUtils.js';

function HandView({
  gameMode,
  localPlayerState,
  localPlayerEffectiveStats,
  selectedCard,
  turnPhase,
  mandatoryAction,
  handleCardClick,
  getLocalPlayerId,
  isMyTurn,
  hoveredCardId,
  setHoveredCardId,
  setIsViewDiscardModalOpen,
  setIsViewDeckModalOpen,
  optionalDiscardCount,
  handleRoundStartDraw,
  checkBothPlayersHandLimitComplete,
  handleConfirmMandatoryDiscard,
  handleRoundStartDiscard,
  setConfirmationModal,
  passInfo,
  validCardTargets,
  gameEngine,
  opponentPlayerState
}) {
  // Debug logging for component props
  const localPlayerId = getLocalPlayerId();
  const myTurn = isMyTurn();
  const playerPassed = passInfo[`${localPlayerId}Passed`];

  debugLog('HAND_VIEW', 'HandView render:', {
    gameMode,
    localPlayerId,
    turnPhase,
    isMyTurn: myTurn,
    playerPassed,
    handSize: localPlayerState.hand.length,
    energy: localPlayerState.energy,
    passInfo,
    mandatoryAction,
    mandatoryActionType: mandatoryAction?.type,
    isMandatoryDiscard: mandatoryAction?.type === 'discard'
  });

  // Dynamic overlap calculation
  const handSectionRef = useRef(null);
  const [dynamicOverlap, setDynamicOverlap] = useState(CARD_FAN_CONFIG.cardOverlapPx);

  useEffect(() => {
    const calculateOverlap = () => {
      if (!handSectionRef.current || localPlayerState.hand.length === 0) return;

      const containerWidth = handSectionRef.current.offsetWidth;
      const cardWidth = 225; // ActionCard base width
      const handSize = localPlayerState.hand.length;

      // Calculate total width needed with default overlap
      const totalWidthWithDefaultOverlap = cardWidth + (handSize - 1) * (cardWidth + CARD_FAN_CONFIG.cardOverlapPx);

      if (totalWidthWithDefaultOverlap > containerWidth) {
        // Need more overlap - calculate how much
        const availableWidthForOverlaps = containerWidth - cardWidth;
        const neededOverlap = (availableWidthForOverlaps / (handSize - 1)) - cardWidth;
        setDynamicOverlap(Math.min(neededOverlap, CARD_FAN_CONFIG.cardOverlapPx)); // Don't expand, only compress
      } else {
        // Use default overlap
        setDynamicOverlap(CARD_FAN_CONFIG.cardOverlapPx);
      }
    };

    calculateOverlap();
    window.addEventListener('resize', calculateOverlap);
    return () => window.removeEventListener('resize', calculateOverlap);
  }, [localPlayerState.hand.length]);

  // Hand layout logic - uses centralized card animation utilities

  return (
    <div className={styles.handContainer}>
      {/* Discard Pile */}
      <div className={styles.cardPile}>
        <div onClick={() => setIsViewDiscardModalOpen(true)} className={styles.discardCard}>
          <p className={styles.discardCardText}>{localPlayerState.discardPile.length}</p>
        </div>
        <p className={styles.pileLabel}>Discard Pile</p>
      </div>

      {/* Hand Section */}
      <div ref={handSectionRef} className={styles.handSection}>
        <div className={styles.handCardsContainer}>
          <div className={styles.handCardsWrapper}>
            {localPlayerState.hand.map((card, index) => {
              // Check card playability conditions
              const hasEnoughEnergy = localPlayerState.energy >= card.cost;
              // Ensure player states are always passed in correct order (player1, player2)
              const player1State = localPlayerId === 'player1' ? localPlayerState : opponentPlayerState;
              const player2State = localPlayerId === 'player1' ? opponentPlayerState : localPlayerState;
              const hasValidTargets = !card.targeting ||
                gameEngine.getValidTargets(localPlayerId, null, card, player1State, player2State).length > 0;
              const isActionPhasePlayable = turnPhase === 'action' &&
                myTurn &&
                !playerPassed &&
                hasEnoughEnergy &&
                hasValidTargets;
              const isOptionalDiscardPlayable = turnPhase === 'optionalDiscard' &&
                optionalDiscardCount < localPlayerEffectiveStats.totals.discardLimit;
              const cardIsPlayable = isActionPhasePlayable || isOptionalDiscardPlayable;

              const isHovered = hoveredCardId === card.instanceId;

              // Calculate fan rotation and spacing using centralized utilities
              const rotationDeg = calculateCardFanRotation(index, localPlayerState.hand.length);
              const marginLeft = index === 0 ? 0 : dynamicOverlap; // Use dynamic overlap
              const arcOffset = calculateCardArcOffset(rotationDeg, localPlayerState.hand.length);

              // Build style object
              const style = {
                zIndex: isHovered ? CARD_FAN_CONFIG.zIndex.hovered : CARD_FAN_CONFIG.zIndex.normal(index),
                transform: isHovered ? getHoverTransform() : `translateY(${arcOffset}px) rotate(${rotationDeg}deg)`,
                marginLeft: `${marginLeft}px`,
                transformOrigin: CARD_FAN_CONFIG.transformOrigin,
                transition: getCardTransition()
              };

              return (
                <div
                  key={card.instanceId || `${card.id}-${index}`}
                  className={styles.cardWrapper}
                  style={style}
                  onMouseEnter={() => setHoveredCardId(card.instanceId)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  <ActionCard
                    card={card}
                    isSelected={selectedCard?.instanceId === card.instanceId}
                    isDimmed={selectedCard && selectedCard.instanceId !== card.instanceId}
                    isPlayable={cardIsPlayable}
                    isMandatoryTarget={mandatoryAction?.type === 'discard'}
                    onClick={
                      mandatoryAction?.type === 'discard'
                        ? (c) => setConfirmationModal({ 
                            type: 'discard', 
                            target: c, 
                            onConfirm: () => handleConfirmMandatoryDiscard(c), 
                            onCancel: () => setConfirmationModal(null), 
                            text: `Are you sure you want to discard ${c.name}?` 
                          })
                        : turnPhase === 'optionalDiscard'
                          ? (c) => setConfirmationModal({ 
                              type: 'discard', 
                              target: c, 
                              onConfirm: () => handleRoundStartDiscard(c), 
                              onCancel: () => setConfirmationModal(null), 
                              text: `Are you sure you want to discard ${c.name}?` 
                            })
                          : handleCardClick
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deck Pile */}
      <div className={styles.cardPile}>
        <div onClick={() => setIsViewDeckModalOpen(true)} className={styles.deckCard}>
          <p className={styles.deckCardText}>{localPlayerState.deck.length}</p>
        </div>
        <p className={styles.pileLabel}>Deck</p>
      </div>
    </div>
  );
}

export default HandView;