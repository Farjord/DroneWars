// ========================================
// GAME FOOTER COMPONENT - CLEAN VERSION
// ========================================
// Simplified responsive design using media queries
// Cards display at natural size - no transform scaling

import React from 'react';
import { ChevronUp } from 'lucide-react';
import HandView from './footer/HandView.jsx';
import DronesView from './footer/DronesView.jsx';
import LogView from './footer/LogView.jsx';
import styles from './GameFooter.module.css';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * GameFooter - Tabbed interface for hand cards, drone pool, and game log
 * Baseline (1920px): ~254px total height
 * Scales up on larger screens via media queries
 */
function GameFooter({
  gameMode,
  localPlayerState,
  localPlayerEffectiveStats,
  sortedLocalActivePool,
  gameLog,
  footerView,
  isFooterOpen,
  selectedCard,
  turnPhase,
  mandatoryAction,
  excessCards,
  handleFooterButtonClick,
  handleCardClick,
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
  gameEngine,
  opponentPlayerState,
  setAiDecisionLogToShow,
  onCardInfoClick,
  handleCardDragStart,
  draggedCard,
  handleActionCardDragStart,
  draggedActionCard,
  actionsTakenThisTurn = 0,
  onCardPlayWarning,
  onCardPlayWarningClear
}) {
  // DISABLED: Render-based logging causes excessive noise on every GameFooter render
  // debugLog('HAND_VIEW', '📦 GameFooter received mandatoryAction:', {
  //   mandatoryAction,
  //   turnPhase,
  //   footerView
  // });

  return (
    <footer className={styles.footer}>
      {/* Tab Buttons */}
      <div className={styles.tabContainer}>
        <button
          onClick={() => handleFooterButtonClick('hand')}
          className={`${styles.tabButton} ${
            isFooterOpen && footerView === 'hand'
              ? styles.tabButtonActive
              : styles.tabButtonInactive
          }`}
        >
          <span className={styles.tabIcon}>
            {isFooterOpen && footerView === 'hand' && <ChevronUp size={14} />}
            Hand ({localPlayerState.hand.length}/{localPlayerEffectiveStats.totals.handLimit})
          </span>
        </button>

        <button
          onClick={() => handleFooterButtonClick('drones')}
          className={`${styles.tabButton} ${
            isFooterOpen && footerView === 'drones'
              ? styles.tabButtonActive
              : styles.tabButtonInactive
          }`}
        >
          <span className={styles.tabIcon}>
            {isFooterOpen && footerView === 'drones' && <ChevronUp size={14} />}
            Drones
          </span>
        </button>

        <button
          onClick={() => handleFooterButtonClick('log')}
          className={`${styles.tabButton} ${
            isFooterOpen && footerView === 'log'
              ? styles.tabButtonActive
              : styles.tabButtonInactive
          }`}
        >
          <span className={styles.tabIcon}>
            {isFooterOpen && footerView === 'log' && <ChevronUp size={14} />}
            Log ({gameLog.length})
          </span>
        </button>
      </div>

      {/* Content Container */}
      <div className={`${styles.contentContainer} ${
        isFooterOpen ? styles.contentOpen : styles.contentClosed
      } ${footerView === 'log' ? styles.contentContainerWithBg : ''}`}>
        <div className={styles.contentWrapper}>
          {/* View Content */}
          {footerView === 'hand' && (
            <div className={styles.viewContent}>
              <HandView
                gameMode={gameMode}
                localPlayerState={localPlayerState}
                localPlayerEffectiveStats={localPlayerEffectiveStats}
                selectedCard={selectedCard}
                turnPhase={turnPhase}
                mandatoryAction={mandatoryAction}
                excessCards={excessCards}
                handleCardClick={handleCardClick}
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
                gameEngine={gameEngine}
                opponentPlayerState={opponentPlayerState}
                handleActionCardDragStart={handleActionCardDragStart}
                draggedActionCard={draggedActionCard}
                actionsTakenThisTurn={actionsTakenThisTurn}
                onCardPlayWarning={onCardPlayWarning}
                onCardPlayWarningClear={onCardPlayWarningClear}
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
                onCardPlayWarning={onCardPlayWarning}
                onCardPlayWarningClear={onCardPlayWarningClear}
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