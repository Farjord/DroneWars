// ========================================
// HAND VIEW COMPONENT
// ========================================
// Hand cards display with deck/discard piles and optional discard controls
// Part of GameFooter component refactoring

import React from 'react';
import ActionCard from '../ActionCard.jsx';
import styles from '../GameFooter.module.css';

/**
 * HandView - Displays player's hand cards with deck/discard piles
 * @param {Object} props - Component props
 * @param {Object} props.localPlayerState - Local player state data
 * @param {Object} props.localPlayerEffectiveStats - Local player effective stats
 * @param {Object} props.selectedCard - Currently selected card
 * @param {string} props.turnPhase - Current turn phase
 * @param {boolean} props.mandatoryAction - Whether there's a mandatory action
 * @param {Function} props.handleCardClick - Handle card click
 * @param {Function} props.getLocalPlayerId - Get local player ID
 * @param {Function} props.isMyTurn - Check if it's local player's turn
 * @param {string} props.hoveredCardId - Currently hovered card ID
 * @param {Function} props.setHoveredCardId - Set hovered card ID
 * @param {Function} props.setIsViewDiscardModalOpen - Open discard pile modal
 * @param {Function} props.setIsViewDeckModalOpen - Open deck modal
 * @param {number} props.optionalDiscardCount - Optional discard count
 * @param {Function} props.handleRoundStartDraw - Handle round start draw
 * @param {Function} props.checkBothPlayersHandLimitComplete - Check hand limit completion
 * @param {Function} props.handleConfirmMandatoryDiscard - Handle mandatory discard
 * @param {Function} props.handleRoundStartDiscard - Handle round start discard
 * @param {Function} props.setConfirmationModal - Set confirmation modal
 * @param {Object} props.passInfo - Pass information
 * @param {Array} props.validCardTargets - Valid card targets
 * @param {Object} props.gameEngine - Game engine instance
 * @param {Object} props.opponentPlayerState - Opponent player state
 */
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
  // Hand layout logic
  const cardWidthPx = 208;
  const gapPx = 16;
  const maxCardsBeforeFan = 7;
  const applyFanEffect = localPlayerState.hand.length > maxCardsBeforeFan;
  const targetHandWidthPx = (maxCardsBeforeFan * cardWidthPx) + ((maxCardsBeforeFan - 1) * gapPx);
  const numCards = localPlayerState.hand.length;

  let marginLeftPx = 0;
  if (numCards > 1) {
    const spaceBetweenCards = (targetHandWidthPx - cardWidthPx) / (numCards - 1);
    marginLeftPx = spaceBetweenCards - cardWidthPx;
  }

  return (
    <div className={styles.handContainer}>
      <div className={styles.cardPile}>
        <div onClick={() => setIsViewDiscardModalOpen(true)} className={styles.discardCard}>
          <p className={styles.discardCardText}>{localPlayerState.discardPile.length}</p>
        </div>
        <p className={styles.pileLabel}>Discard Pile</p>
      </div>

      <div className={styles.handSection}>
        <div className={styles.handHeader}>
          <h3 className={`${styles.handTitle} ${localPlayerState.hand.length > localPlayerEffectiveStats.totals.handLimit ? styles.handTitleOverLimit : styles.handTitleNormal}`}>Your Hand ({localPlayerState.hand.length}/{localPlayerEffectiveStats.totals.handLimit})</h3>
        </div>
        {mandatoryAction?.type === 'discard' && mandatoryAction.fromAbility && (
          <p className={styles.mandatoryDiscardWarning}>You must discard {mandatoryAction.count} card(s).</p>
        )}
        <div
          className={styles.handCardsContainer}
          style={ applyFanEffect ? { width: `${targetHandWidthPx}px` } : {} }
        >
          <div className={`${styles.handCardsWrapper} ${!applyFanEffect ? styles.handCardsWrapperGap : ''}`}>
            {localPlayerState.hand.map((card, index) => {
              const hoveredIndex = hoveredCardId ? localPlayerState.hand.findIndex(c => c.instanceId === hoveredCardId) : -1;
              let transformClass = '';
              let style = { zIndex: index };

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
                        ? (c) => setConfirmationModal({ type: 'discard', target: c, onConfirm: () => handleConfirmMandatoryDiscard(c), onCancel: () => setConfirmationModal(null), text: `Are you sure you want to discard ${c.name}?` })
                        : turnPhase === 'optionalDiscard'
                          ? (c) => setConfirmationModal({ type: 'discard', target: c, onConfirm: () => handleRoundStartDiscard(c), onCancel: () => setConfirmationModal(null), text: `Are you sure you want to discard ${c.name}?` })
                          : handleCardClick
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.cardPile}>
        <div onClick={() => setIsViewDeckModalOpen(true)} className={styles.deckCard}><p className={styles.deckCardText}>{localPlayerState.deck.length}</p></div>
        <p className={styles.pileLabel}>Deck</p>
        {turnPhase === 'optionalDiscard' && (
          <div className={styles.optionalDiscardControls}>
            <p className={styles.optionalDiscardCounter}>Discarded: {optionalDiscardCount} / {localPlayerEffectiveStats.discardLimit}</p>
            <button onClick={() => { handleRoundStartDraw(); checkBothPlayersHandLimitComplete(); }} className={styles.finishDiscardButton}>
              Finish Discarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HandView;