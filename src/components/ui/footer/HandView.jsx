// ========================================
// HAND VIEW COMPONENT - CLEAN VERSION
// ========================================
// Cards display at natural size - no scaling
// Simple responsive layout

import React from 'react';
import ActionCard from '../ActionCard.jsx';
import styles from '../GameFooter.module.css';

function HandView({
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
  // Hand layout logic - simplified
  const cardWidthPx = 225; // Natural card width
  const gapPx = 12;
  const maxCardsBeforeFan = 6;
  const applyFanEffect = localPlayerState.hand.length > maxCardsBeforeFan;
  const targetHandWidthPx = (maxCardsBeforeFan * cardWidthPx) + ((maxCardsBeforeFan - 1) * gapPx);
  const numCards = localPlayerState.hand.length;

  let marginLeftPx = 0;
  if (numCards > 1 && applyFanEffect) {
    const spaceBetweenCards = (targetHandWidthPx - cardWidthPx) / (numCards - 1);
    marginLeftPx = spaceBetweenCards - cardWidthPx;
  }

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
      <div className={styles.handSection}>
        {mandatoryAction?.type === 'discard' && mandatoryAction.fromAbility && (
          <p className={styles.mandatoryDiscardWarning}>
            You must discard {mandatoryAction.count} card(s).
          </p>
        )}
        
        <div
          className={styles.handCardsContainer}
          style={applyFanEffect ? { width: `${targetHandWidthPx}px` } : {}}
        >
          <div className={`${styles.handCardsWrapper} ${!applyFanEffect ? styles.handCardsWrapperGap : ''}`}>
            {localPlayerState.hand.map((card, index) => {
              const hoveredIndex = hoveredCardId 
                ? localPlayerState.hand.findIndex(c => c.instanceId === hoveredCardId) 
                : -1;
              
              let transformClass = '';
              let style = { zIndex: index };

              // Apply hover effects for fan layout
              if (applyFanEffect && hoveredIndex !== -1) {
                if (index < hoveredIndex) {
                  transformClass = 'transform -translate-x-12';
                } else if (index > hoveredIndex) {
                  transformClass = 'transform translate-x-12';
                } else {
                  transformClass = 'transform -translate-y-8 scale-105';
                  style.zIndex = 50;
                }
              }

              // Apply fan spacing
              if (applyFanEffect && index > 0) {
                style.marginLeft = `${marginLeftPx}px`;
              }

              return (
                <div
                  key={card.instanceId}
                  className={`${styles.cardWrapper} ${transformClass}`}
                  style={style}
                  onMouseEnter={() => setHoveredCardId(card.instanceId)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  <ActionCard
                    card={card}
                    isSelected={selectedCard?.instanceId === card.instanceId}
                    isPlayable={
                      (turnPhase === 'action' &&
                        isMyTurn() &&
                        !passInfo[`${getLocalPlayerId()}Passed`] &&
                        localPlayerState.energy >= card.cost &&
                        (!card.targeting || gameEngine.getValidTargets(getLocalPlayerId(), null, card, localPlayerState, opponentPlayerState).length > 0)) ||
                      (turnPhase === 'optionalDiscard' && optionalDiscardCount < localPlayerEffectiveStats.totals.discardLimit)
                    }
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
        
        {turnPhase === 'optionalDiscard' && (
          <div className={styles.optionalDiscardControls}>
            <p className={styles.optionalDiscardCounter}>
              Discarded: {optionalDiscardCount} / {localPlayerEffectiveStats.discardLimit}
            </p>
            <button 
              onClick={() => { 
                handleRoundStartDraw(); 
                checkBothPlayersHandLimitComplete(); 
              }} 
              className={styles.finishDiscardButton}
            >
              Finish Discarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HandView;