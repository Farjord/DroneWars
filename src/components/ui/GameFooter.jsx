// ========================================
// GAME FOOTER COMPONENT
// ========================================
// Footer section with tabbed interface for Hand, Drones, and Log
// Extracted from App.jsx for better component organization

import React from 'react';
import { ChevronUp } from 'lucide-react';
import HandView from './footer/HandView.jsx';
import DronesView from './footer/DronesView.jsx';
import LogView from './footer/LogView.jsx';
import styles from './GameFooter.module.css';

/**
 * GameFooter - Footer with tabbed interface for hand cards, drone pool, and game log
 * @param {Object} props - Component props
 * @param {Object} props.localPlayerState - Local player state data
 * @param {Object} props.localPlayerEffectiveStats - Local player effective stats
 * @param {Array} props.sortedLocalActivePool - Sorted local active drone pool
 * @param {Array} props.gameLog - Game log entries
 * @param {string} props.footerView - Current footer view ('hand', 'drones', 'log')
 * @param {boolean} props.isFooterOpen - Whether footer is open
 * @param {Object} props.multiSelectState - Multi-select state
 * @param {Object} props.selectedCard - Currently selected card
 * @param {string} props.turnPhase - Current turn phase
 * @param {boolean} props.mandatoryAction - Whether there's a mandatory action
 * @param {Function} props.handleFooterButtonClick - Handle footer button click
 * @param {Function} props.handleCardClick - Handle card click
 * @param {Function} props.cancelCardSelection - Cancel card selection
 * @param {Function} props.downloadLogAsCSV - Download log as CSV
 * @param {Function} props.getLocalPlayerId - Get local player ID
 * @param {Function} props.isMyTurn - Check if it's local player's turn
 * @param {string} props.hoveredCardId - Currently hovered card ID
 * @param {Function} props.setHoveredCardId - Set hovered card ID
 * @param {Function} props.setIsViewDiscardModalOpen - Open discard pile modal
 * @param {Function} props.setIsViewDeckModalOpen - Open deck modal
 * @param {number} props.optionalDiscardCount - Optional discard count
 * @param {Function} props.handleRoundStartDraw - Handle round start draw
 * @param {Function} props.checkBothPlayersHandLimitComplete - Check hand limit completion
 * @param {Function} props.handleToggleDroneSelection - Handle drone selection
 * @param {Object} props.selectedDrone - Currently selected drone
 * @param {Function} props.setViewUpgradesModal - Set view upgrades modal
 * @param {Function} props.handleConfirmMandatoryDiscard - Handle mandatory discard
 * @param {Function} props.handleRoundStartDiscard - Handle round start discard
 * @param {Function} props.setConfirmationModal - Set confirmation modal
 * @param {number} props.turn - Current turn number
 * @param {Object} props.passInfo - Pass information
 * @param {Array} props.validCardTargets - Valid card targets
 * @param {Object} props.gameEngine - Game engine instance
 * @param {Object} props.opponentPlayerState - Opponent player state
 * @param {Function} props.setAiDecisionLogToShow - Set AI decision log
 */
function GameFooter({
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
            {isFooterOpen && footerView === 'hand' && <ChevronUp size={20} />}
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
            {isFooterOpen && footerView === 'drones' && <ChevronUp size={20} />}
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
            {isFooterOpen && footerView === 'log' && <ChevronUp size={20} />}
            Log ({gameLog.length})
          </span>
        </button>
      </div>

      <div className={`${styles.contentContainer} ${
        isFooterOpen ? styles.contentOpen : styles.contentClosed
      }`}>
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
                    // This would need to be passed as a prop or handled differently
                    console.log('Confirm drones clicked');
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

        {footerView === 'hand' && (
          <HandView
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
        )}
        {footerView === 'drones' && (
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
        )}
        {footerView === 'log' && (
          <LogView
            gameLog={gameLog}
            downloadLogAsCSV={downloadLogAsCSV}
            setAiDecisionLogToShow={setAiDecisionLogToShow}
          />
        )}
      </div>
    </footer>
  );
}

export default GameFooter;