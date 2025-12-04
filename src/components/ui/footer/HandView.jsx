// ========================================
// HAND VIEW COMPONENT - CLEAN VERSION
// ========================================
// Cards display at natural size - no scaling
// Simple responsive layout

import React, { useRef, useState, useEffect, useMemo } from 'react';
import ActionCard from '../ActionCard.jsx';
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
    <div className={styles.handContainer}>
      {/* Discard Pile - Stacked Cards */}
      <div className={styles.cardPile}>
        <div
          onClick={() => setIsViewDiscardModalOpen(true)}
          className={styles.discardPileContainer}
          style={{ cursor: 'pointer' }}
        >
          {localPlayerState.discardPile.length === 0 ? (
            <div className={styles.discardCard}>
              <p className={styles.discardCardText}>0</p>
            </div>
          ) : (
            <div className={styles.discardStackWrapper}>
              {/* Show last 3 cards, oldest first (bottom), newest last (top) */}
              {localPlayerState.discardPile.slice(-3).map((card, index, arr) => {
                const offset = (arr.length - 1 - index) * 6; // Older cards offset more
                const rotation = (index - 1) * 2; // Slight rotation variance
                return (
                  <div
                    key={card.instanceId || `discard-${index}`}
                    style={{
                      position: 'absolute',
                      top: offset,
                      left: offset,
                      zIndex: index + 1, // Newer cards on top
                      transform: `rotate(${rotation}deg)`,
                      pointerEvents: 'none'
                    }}
                  >
                    <ActionCard card={card} scale={0.5} isPlayable={false} onClick={() => {}} />
                  </div>
                );
              })}
              {/* Count badge if more than 3 cards */}
              {localPlayerState.discardPile.length > 3 && (
                <div className={styles.discardCountBadge}>
                  {localPlayerState.discardPile.length}
                </div>
              )}
            </div>
          )}
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

      {/* Deck Pile - Card Back Design */}
      <div className={styles.cardPile}>
        <div
          onClick={() => setIsViewDeckModalOpen(true)}
          className={styles.deckCardBack}
          style={{
            width: 'clamp(115px, 5.8cqw, 140px)',
            height: 'clamp(155px, 7.9cqw, 190px)',
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
            background: 'linear-gradient(135deg, #0a1628 0%, #0e2a4a 25%, #0c1929 50%, #0a2540 75%, #061018 100%)',
            border: '2px solid rgba(6, 182, 212, 0.6)',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 40px rgba(6, 182, 212, 0.15)',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Background circuit pattern */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 130"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0.12 }}
          >
            {/* Horizontal circuit lines */}
            <line x1="0" y1="25" x2="100" y2="25" stroke="#22d3ee" strokeWidth="0.5" />
            <line x1="0" y1="65" x2="100" y2="65" stroke="#22d3ee" strokeWidth="0.5" />
            <line x1="0" y1="105" x2="100" y2="105" stroke="#22d3ee" strokeWidth="0.5" />
            {/* Vertical circuit lines */}
            <line x1="20" y1="0" x2="20" y2="130" stroke="#22d3ee" strokeWidth="0.5" />
            <line x1="50" y1="0" x2="50" y2="130" stroke="#22d3ee" strokeWidth="0.5" />
            <line x1="80" y1="0" x2="80" y2="130" stroke="#22d3ee" strokeWidth="0.5" />
            {/* Circuit nodes */}
            <circle cx="20" cy="25" r="2" fill="#06b6d4" opacity="0.6" />
            <circle cx="80" cy="25" r="2" fill="#06b6d4" opacity="0.6" />
            <circle cx="50" cy="65" r="3" fill="#22d3ee" opacity="0.8" />
            <circle cx="20" cy="105" r="2" fill="#06b6d4" opacity="0.6" />
            <circle cx="80" cy="105" r="2" fill="#06b6d4" opacity="0.6" />
          </svg>

          {/* Corner accents - top left */}
          <div style={{
            position: 'absolute', top: '4px', left: '4px',
            width: '16px', height: '16px',
            borderTop: '2px solid rgba(34, 211, 238, 0.7)',
            borderLeft: '2px solid rgba(34, 211, 238, 0.7)'
          }} />
          {/* Corner accents - top right */}
          <div style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '16px', height: '16px',
            borderTop: '2px solid rgba(34, 211, 238, 0.7)',
            borderRight: '2px solid rgba(34, 211, 238, 0.7)'
          }} />
          {/* Corner accents - bottom left */}
          <div style={{
            position: 'absolute', bottom: '4px', left: '4px',
            width: '16px', height: '16px',
            borderBottom: '2px solid rgba(34, 211, 238, 0.7)',
            borderLeft: '2px solid rgba(34, 211, 238, 0.7)'
          }} />

          {/* Layered hexagon pattern - outer */}
          <svg
            width="70"
            height="80"
            viewBox="0 0 100 115"
            style={{ position: 'relative', zIndex: 1 }}
          >
            {/* Outermost hexagon - faint */}
            <polygon
              points="50,2 95,27 95,88 50,113 5,88 5,27"
              fill="none"
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth="1"
            />
            {/* Middle hexagon */}
            <polygon
              points="50,12 85,32 85,83 50,103 15,83 15,32"
              fill="none"
              stroke="rgba(6, 182, 212, 0.35)"
              strokeWidth="1.5"
            />
            {/* Inner hexagon - brighter */}
            <polygon
              points="50,22 75,37 75,78 50,93 25,78 25,37"
              fill="none"
              stroke="rgba(34, 211, 238, 0.5)"
              strokeWidth="2"
            />
            {/* Center hexagon - brightest */}
            <polygon
              points="50,35 62,43 62,72 50,80 38,72 38,43"
              fill="rgba(6, 182, 212, 0.15)"
              stroke="rgba(34, 211, 238, 0.7)"
              strokeWidth="1.5"
            />
            {/* Central dot */}
            <circle cx="50" cy="57.5" r="4" fill="rgba(34, 211, 238, 0.6)" />
            <circle cx="50" cy="57.5" r="2" fill="rgba(255, 255, 255, 0.8)" />

            {/* Decorative lines radiating from center */}
            <line x1="50" y1="35" x2="50" y2="22" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="1" />
            <line x1="62" y1="43" x2="75" y2="37" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="1" />
            <line x1="62" y1="72" x2="75" y2="78" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="1" />
            <line x1="50" y1="80" x2="50" y2="93" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="1" />
            <line x1="38" y1="72" x2="25" y2="78" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="1" />
            <line x1="38" y1="43" x2="25" y2="37" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="1" />
          </svg>

          {/* Glow effect overlay */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
        </div>
        {/* Deck count - below the card */}
        <p className={styles.pileLabel}>
          Deck <span style={{ color: '#22d3ee', fontWeight: 'bold' }}>({localPlayerState.deck.length})</span>
        </p>
      </div>
    </div>
  );
}

export default HandView;