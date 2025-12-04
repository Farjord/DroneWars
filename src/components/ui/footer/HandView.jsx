// ========================================
// HAND VIEW COMPONENT - CLEAN VERSION
// ========================================
// Cards display at natural size - no scaling
// Simple responsive layout

import React, { useRef, useState, useEffect, useMemo } from 'react';
import ActionCard from '../ActionCard.jsx';
import CardBackPlaceholder from '../CardBackPlaceholder.jsx';
import styles from '../GameFooter.module.css';
import { debugLog } from '../../../utils/debugLogger.js';
import { calculateCardFanRotation, getHoverTransform, getCardTransition, calculateCardArcOffset, CARD_FAN_CONFIG } from '../../../utils/cardAnimationUtils.js';
import TargetingRouter from '../../../logic/TargetingRouter.js';

// Initialize TargetingRouter for card targeting validation
const targetingRouter = new TargetingRouter();

function HandView({
  gameMode,
  localPlayerState,
  localPlayerEffectiveStats,
  selectedCard,
  turnPhase,
  mandatoryAction,
  excessCards,
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

  // Dynamic overlap calculation
  const handSectionRef = useRef(null);
  const [dynamicOverlap, setDynamicOverlap] = useState(CARD_FAN_CONFIG.cardOverlapPx);

  // Refs for card sizing debugging
  const discardWrapperRef = useRef(null);
  const deckWrapperRef = useRef(null);

  // Log actual DOM dimensions for debugging
  useEffect(() => {
    if (discardWrapperRef.current) {
      const rect = discardWrapperRef.current.getBoundingClientRect();
      const child = discardWrapperRef.current.firstChild;
      const childRect = child?.getBoundingClientRect();

      debugLog('CARD_SIZING', '📐 Discard wrapper dimensions:', {
        wrapper: { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom },
        card: childRect ? { width: childRect.width, height: childRect.height } : 'no child'
      });
    }
    if (deckWrapperRef.current) {
      const rect = deckWrapperRef.current.getBoundingClientRect();
      const child = deckWrapperRef.current.firstChild;
      const childRect = child?.getBoundingClientRect();

      debugLog('CARD_SIZING', '📐 Deck wrapper dimensions:', {
        wrapper: { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom },
        card: childRect ? { width: childRect.width, height: childRect.height } : 'no child'
      });
    }
  }, []);

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

  // Memoize valid targets calculation - this was causing massive performance issues
  // Previously ran getValidTargets for EVERY card on EVERY render (5-7 cards × many renders = hundreds of calculations)
  const cardValidTargetsMap = useMemo(() => {
    const player1State = localPlayerId === 'player1' ? localPlayerState : opponentPlayerState;
    const player2State = localPlayerId === 'player1' ? opponentPlayerState : localPlayerState;

    const targetMap = new Map();
    localPlayerState.hand.forEach(card => {
      if (!card.targeting) {
        targetMap.set(card.instanceId, true);
      } else {
        const hasTargets = targetingRouter.routeTargeting({
          actingPlayerId: localPlayerId,
          source: null,
          definition: card,
          player1: player1State,
          player2: player2State
        }).length > 0;
        targetMap.set(card.instanceId, hasTargets);
      }
    });
    return targetMap;
  }, [
    localPlayerState.hand.map(c => c.instanceId).join(','), // Hand composition
    localPlayerId,
    // Serialize drone IDs AND state flags that affect targeting (isExhausted, isMarked)
    Object.values(localPlayerState.dronesOnBoard).flatMap(lane =>
      lane.map(d => `${d.id}:${d.isExhausted}:${d.isMarked}`)
    ).join(','),
    Object.values(opponentPlayerState.dronesOnBoard).flatMap(lane =>
      lane.map(d => `${d.id}:${d.isExhausted}:${d.isMarked}`)
    ).join(','),
    // Serialize ship section keys - only changes when sections change
    Object.keys(localPlayerState.shipSections).sort().join(','),
    Object.keys(opponentPlayerState.shipSections).sort().join(',')
  ]);

  return (
    <div className={styles.handContainer} style={{ paddingLeft: '16px', paddingRight: '16px' }}>
      {/* Discard Pile */}
      <div className={styles.cardPile}>
        <div ref={discardWrapperRef} style={{ width: '150px', height: '183.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
          <CardBackPlaceholder
            scale={0.667}
            variant="discard"
            onClick={() => setIsViewDiscardModalOpen(true)}
          />
        </div>
        <p className={styles.pileLabel}>
          Discard <span style={{ color: '#9ca3af', fontWeight: 'bold' }}>({localPlayerState.discardPile.length})</span>
        </p>
      </div>

      {/* Hand Section */}
      <div ref={handSectionRef} className={styles.handSection}>
        <div className={styles.handCardsContainer}>
          <div className={styles.handCardsWrapper}>
            {localPlayerState.hand.map((card, index) => {
              // Check card playability conditions
              const hasEnoughEnergy = localPlayerState.energy >= card.cost;
              // Use memoized valid targets calculation instead of calling getValidTargets on every render
              const hasValidTargets = cardValidTargetsMap.get(card.instanceId);
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
                  className={`${styles.cardWrapper} ${mandatoryAction?.type === 'discard' ? 'animate-pulse' : ''}`}
                  style={style}
                  onMouseEnter={() => {
                    setHoveredCardId(card.instanceId);
                    // Debug logging on hover - shows this specific card's state
                    debugLog('HAND_VIEW', `🎯 Card hover - ${card.name}:`, {
                      cardName: card.name,
                      mandatoryAction: mandatoryAction ? {
                        type: mandatoryAction.type,
                        fromAbility: mandatoryAction.fromAbility,
                        count: mandatoryAction.count
                      } : null,
                      excessCards,
                      isPlayable: cardIsPlayable
                    });
                  }}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  <ActionCard
                    card={card}
                    isSelected={selectedCard?.instanceId === card.instanceId}
                    isDimmed={selectedCard && selectedCard.instanceId !== card.instanceId}
                    isPlayable={cardIsPlayable}
                    mandatoryAction={mandatoryAction}
                    excessCards={excessCards}
                    onClick={
                      mandatoryAction?.type === 'discard'
                        ? (c) => {
                            // For phase-based mandatory discards, check if limit reached
                            if (!mandatoryAction.fromAbility && excessCards <= 0) {
                              debugLog('DISCARD', '🚫 Cannot discard - already at hand limit');
                              return;
                            }
                            setConfirmationModal({
                              type: 'discard',
                              target: c,
                              onConfirm: () => handleConfirmMandatoryDiscard(c),
                              onCancel: () => setConfirmationModal(null),
                              text: `Are you sure you want to discard ${c.name}?`
                            });
                          }
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
        <div ref={deckWrapperRef} style={{ width: '150px', height: '183.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
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

export default HandView;