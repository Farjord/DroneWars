// ========================================
// GAME FOOTER COMPONENT - CLEAN VERSION
// ========================================
// Simplified responsive design using media queries
// Cards display at natural size - no transform scaling

import React from 'react';
import HandView from './footer/HandView.jsx';
import DronesView from './footer/DronesView.jsx';
import LogView from './footer/LogView.jsx';
import styles from './GameFooter.module.css';

/**
 * GameFooter - Tabbed interface for hand cards, drone pool, and game log
 * Baseline (1920px): ~254px total height
 * Scales up on larger screens via media queries
 */
function GameFooter({
  localPlayerState,
  localPlayerEffectiveStats,
  sortedLocalActivePool,
  gameLog,
  footerView,
  onToggleFooterView,
  selectedCard,
  turnPhase,
  mandatoryAction,
  excessCards,
  cancelCardSelection,
  downloadLogAsCSV,
  getLocalPlayerId,
  isMyTurn,
  hoveredCardId,
  setHoveredCardId,
  setIsViewDiscardModalOpen,
  setIsViewDeckModalOpen,
  optionalDiscardCount,
  handleRoundStartDraw,
  checkBothPlayersHandLimitComplete,
  handleToggleDroneSelection,
  selectedDrone,
  setViewUpgradesModal,
  handleConfirmMandatoryDiscard,
  handleRoundStartDiscard,
  setConfirmationModal,
  turn,
  roundNumber,
  passInfo,
  validCardTargets,
  effectChainState,
  setPendingChainTarget,
  gameEngine,
  opponentPlayerState,
  setAiDecisionLogToShow,
  onCardInfoClick,
  handleCardDragStart,
  draggedCard,
  handleActionCardDragStart,
  draggedActionCard,
  actionsTakenThisTurn = 0,
}) {
  const isTargetingFromFooter = selectedCard || draggedActionCard || draggedCard;

  return (
    <footer
      className={styles.footer}
      data-footer
      style={isTargetingFromFooter ? { zIndex: 150 } : undefined}
    >
      <div className={`${styles.contentContainer} ${footerView === 'log' ? styles.contentContainerWithBg : ''}`}>
        <div className={styles.contentWrapper}>
          {footerView === 'hand' && (
            <div className={styles.viewContent}>
              <HandView
                localPlayerState={localPlayerState}
                localPlayerEffectiveStats={localPlayerEffectiveStats}
                selectedCard={selectedCard}
                turnPhase={turnPhase}
                mandatoryAction={mandatoryAction}
                excessCards={excessCards}
                getLocalPlayerId={getLocalPlayerId}
                isMyTurn={isMyTurn}
                hoveredCardId={hoveredCardId}
                setHoveredCardId={setHoveredCardId}
                setIsViewDiscardModalOpen={setIsViewDiscardModalOpen}
                setIsViewDeckModalOpen={setIsViewDeckModalOpen}
                optionalDiscardCount={optionalDiscardCount}
                handleRoundStartDraw={handleRoundStartDraw}
                checkBothPlayersHandLimitComplete={checkBothPlayersHandLimitComplete}
                handleConfirmMandatoryDiscard={handleConfirmMandatoryDiscard}
                handleRoundStartDiscard={handleRoundStartDiscard}
                setConfirmationModal={setConfirmationModal}
                passInfo={passInfo}
                validCardTargets={validCardTargets}
                effectChainState={effectChainState}
                setPendingChainTarget={setPendingChainTarget}
                gameEngine={gameEngine}
                opponentPlayerState={opponentPlayerState}
                handleActionCardDragStart={handleActionCardDragStart}
                draggedActionCard={draggedActionCard}
                actionsTakenThisTurn={actionsTakenThisTurn}
                onToggleView={onToggleFooterView}
              />
            </div>
          )}

          {footerView === 'drones' && (
            <div className={styles.viewContent}>
              <DronesView
                localPlayerState={localPlayerState}
                localPlayerEffectiveStats={localPlayerEffectiveStats}
                sortedLocalActivePool={sortedLocalActivePool}
                selectedCard={selectedCard}
                turnPhase={turnPhase}
                mandatoryAction={mandatoryAction}
                handleToggleDroneSelection={handleToggleDroneSelection}
                selectedDrone={selectedDrone}
                setViewUpgradesModal={setViewUpgradesModal}
                getLocalPlayerId={getLocalPlayerId}
                isMyTurn={isMyTurn}
                turn={turn}
                roundNumber={roundNumber}
                passInfo={passInfo}
                validCardTargets={validCardTargets}
                setIsViewDiscardModalOpen={setIsViewDiscardModalOpen}
                setIsViewDeckModalOpen={setIsViewDeckModalOpen}
                handleCardDragStart={handleCardDragStart}
                draggedCard={draggedCard}
                onToggleView={onToggleFooterView}
              />
            </div>
          )}

          {footerView === 'log' && (
            <div className={styles.viewContent}>
              <LogView
                gameLog={gameLog}
                downloadLogAsCSV={downloadLogAsCSV}
                setAiDecisionLogToShow={setAiDecisionLogToShow}
                onCardInfoClick={onCardInfoClick}
              />
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

export default GameFooter;