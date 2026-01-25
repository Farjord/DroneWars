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
import { isDoctrineCardPlayable } from '../../../logic/targeting/DoctrineValidator.js';

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
  opponentPlayerState,
  // Action card drag-and-drop props
  handleActionCardDragStart,
  draggedActionCard
}) {
  // Debug logging for component props
  const localPlayerId = getLocalPlayerId();
  const myTurn = isMyTurn();
  const playerPassed = passInfo[`${localPlayerId}Passed`];

  // Dynamic overlap calculation
  const handSectionRef = useRef(null);
  const [dynamicOverlap, setDynamicOverlap] = useState(CARD_FAN_CONFIG.cardOverlapPx);

  // Hover state for discard pile (applies to both CardBackPlaceholder and ActionCard)
  const [discardHovered, setDiscardHovered] = useState(false);

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
      debugLog('ADDITIONAL_COST_VALIDATION', '🔍 Checking card playability', {
        cardName: card.name,
        cardId: card.id,
        hasAdditionalCost: !!card.additionalCost,
        hasTargeting: !!card.targeting
      });

      // NEW: Check for additional cost cards first
      if (card.additionalCost) {
        debugLog('ADDITIONAL_COST_VALIDATION', '💰 Card has additional cost - checking cost targets', {
          cardName: card.name,
          costType: card.additionalCost.type,
          costTargeting: card.additionalCost.targeting
        });

        // Card has additional cost - check for valid COST targets
        const hasCostTargets = targetingRouter.routeTargeting({
          actingPlayerId: localPlayerId,
          source: null,
          definition: { targeting: card.additionalCost.targeting },  // Use cost targeting
          player1: player1State,
          player2: player2State
        }).length > 0;

        debugLog('ADDITIONAL_COST_VALIDATION',
          hasCostTargets ? '✅ Card is PLAYABLE (has cost targets)' : '❌ Card is UNPLAYABLE (no cost targets)',
          {
            cardName: card.name,
            hasCostTargets,
            costTargeting: card.additionalCost.targeting
          }
        );

        targetMap.set(card.instanceId, hasCostTargets);
      } else if (!card.targeting) {
        debugLog('ADDITIONAL_COST_VALIDATION', '✅ Card is PLAYABLE (no targeting)', {
          cardName: card.name
        });
        // No targeting = always playable
        targetMap.set(card.instanceId, true);
      } else {
        // Normal card - check for valid effect targets
        const hasTargets = targetingRouter.routeTargeting({
          actingPlayerId: localPlayerId,
          source: null,
          definition: card,
          player1: player1State,
          player2: player2State
        }).length > 0;

        debugLog('ADDITIONAL_COST_VALIDATION',
          hasTargets ? '✅ Card is PLAYABLE (has targets)' : '❌ Card is UNPLAYABLE (no targets)',
          {
            cardName: card.name,
            hasTargets
          }
        );

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
        <div
          ref={discardWrapperRef}
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

              // Check Doctrine card lane control conditions
              let doctrinePlayable = true;
              if (card.type === 'Doctrine') {
                // Construct playerStates object from local and opponent states
                const playerStates = localPlayerId === 'player1'
                  ? { player1: localPlayerState, player2: opponentPlayerState }
                  : { player1: opponentPlayerState, player2: localPlayerState };
                doctrinePlayable = isDoctrineCardPlayable(card, localPlayerId, playerStates);
              }

              // Combine all playability checks
              // Doctrine validation only applies during action phase, not discard phase
              const cardIsPlayable = turnPhase === 'action'
                ? (isActionPhasePlayable && doctrinePlayable)
                : isOptionalDiscardPlayable;

              const isHovered = hoveredCardId === card.instanceId;

              // Calculate fan rotation and spacing using centralized utilities
              const rotationDeg = calculateCardFanRotation(index, localPlayerState.hand.length);
              const marginLeft = index === 0 ? 0 : dynamicOverlap; // Use dynamic overlap
              const arcOffset = calculateCardArcOffset(rotationDeg, localPlayerState.hand.length);

              // Check if this card is being dragged
              const isDragging = draggedActionCard?.card?.instanceId === card.instanceId;
              const isElevated = isHovered || isDragging;

              // Build style object
              const style = {
                zIndex: isElevated ? CARD_FAN_CONFIG.zIndex.hovered : CARD_FAN_CONFIG.zIndex.normal(index),
                transform: isElevated ? getHoverTransform() : `translateY(${arcOffset}px) rotate(${rotationDeg}deg)`,
                marginLeft: `${marginLeft}px`,
                transformOrigin: CARD_FAN_CONFIG.transformOrigin,
                transition: getCardTransition()
              };

              // Apply pulse effect during mandatory discard (all cards) or optional discard (only selectable cards)
              const shouldPulse = mandatoryAction?.type === 'discard' ||
                (turnPhase === 'optionalDiscard' && cardIsPlayable);

              return (
                <div
                  key={card.instanceId || `${card.id}-${index}`}
                  className={`${styles.cardWrapper} ${shouldPulse ? 'animate-pulse' : ''}`}
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
                  onMouseDown={(e) => {
                    // Initiate drag for playable cards during action phase (not during mandatory action)
                    // Uses threshold detection to distinguish click from drag
                    if (cardIsPlayable && turnPhase === 'action' && !mandatoryAction && handleActionCardDragStart) {
                      e.preventDefault();

                      // Store start position and card rect immediately (before React nullifies event)
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const originalEvent = e;
                      const cardRect = e.currentTarget.getBoundingClientRect();
                      let dragStarted = false;

                      const handleMouseMove = (moveEvent) => {
                        if (dragStarted) return;
                        const dx = moveEvent.clientX - startX;
                        const dy = moveEvent.clientY - startY;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance > 5) { // 5px threshold
                          dragStarted = true;
                          handleActionCardDragStart(card, originalEvent, cardRect);
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        }
                      };

                      const handleMouseUp = () => {
                        // Clean up listeners if drag never started (was just a click)
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }
                  }}
                >
                  <ActionCard
                    card={card}
                    isSelected={selectedCard?.instanceId === card.instanceId}
                    isDimmed={selectedCard && selectedCard.instanceId !== card.instanceId}
                    isDragging={draggedActionCard?.card?.instanceId === card.instanceId}
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
                          : card.type === 'Drone'
                            ? handleCardClick  // Only Drone cards are click-playable
                            : null             // Action cards use drag-only
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