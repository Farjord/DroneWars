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
  multiSelectState,
  selectedCard,
  turnPhase,
  mandatoryAction,
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
  passInfo,
  validCardTargets,
  gameEngine,
  opponentPlayerState,
  setAiDecisionLogToShow
}) {
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
            {isFooterOpen && footerView === 'hand' && <ChevronUp size={16} />}
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
            {isFooterOpen && footerView === 'drones' && <ChevronUp size={16} />}
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
            {isFooterOpen && footerView === 'log' && <ChevronUp size={16} />}
            Log ({gameLog.length})
          </span>
        </button>
      </div>

      {/* Content Container */}
      <div className={`${styles.contentContainer} ${
        isFooterOpen ? styles.contentOpen : styles.contentClosed
      }`}>
        <div className={styles.contentWrapper}>
          {/* Multi-select Overlay */}
          {multiSelectState && (
            <div className={styles.multiSelectOverlay}>
              <span className={styles.multiSelectText}>
                {multiSelectState.phase === 'select_source_lane' && 'Reposition: Select a source lane'}
                {multiSelectState.phase === 'select_drones' && `Select Drones (${multiSelectState.selectedDrones.length} / ${multiSelectState.maxSelection})`}
                {multiSelectState.phase === 'select_destination_lane' && 'Reposition: Select a destination lane'}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelCardSelection();
                }}
                className={styles.buttonDanger}
              >
                Cancel
              </button>

              {multiSelectState.phase === 'select_drones' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (multiSelectState.selectedDrones.length > 0) {
                      debugLog('HAND_VIEW', 'Confirm drones clicked');
                    }
                  }}
                  disabled={multiSelectState.selectedDrones.length === 0}
                  className={`${styles.buttonSuccess} ${
                    multiSelectState.selectedDrones.length === 0
                      ? styles.buttonDisabled
                      : ''
                  }`}
                >
                  Confirm Drones
                </button>
              )}
            </div>
          )}

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
              />
            </div>
          )}

          {footerView === 'drones' && (
            <div className={styles.viewContent}>
              <DronesView
                localPlayerState={localPlayerState}
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
                passInfo={passInfo}
                validCardTargets={validCardTargets}
              />
            </div>
          )}

          {footerView === 'log' && (
            <div className={styles.viewContent}>
              <LogView
                gameLog={gameLog}
                downloadLogAsCSV={downloadLogAsCSV}
                setAiDecisionLogToShow={setAiDecisionLogToShow}
              />
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

export default GameFooter;