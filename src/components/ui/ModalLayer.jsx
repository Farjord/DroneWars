import React from 'react';

// --- Modal Component Imports ---
import LogModal from '../modals/LogModal.jsx';
import GamePhaseModal from './GamePhaseModal.jsx';
import ModalContainer from './ModalContainer.jsx';
import CardViewerModal from '../modals/CardViewerModal';
import CardSelectionModal from '../modals/CardSelectionModal';
import AICardPlayReportModal from '../modals/AICardPlayReportModal.jsx';
import DetailedDroneModal from '../modals/debug/DetailedDroneModal.jsx';
import WaitingForPlayerModal from '../modals/WaitingForPlayerModal.jsx';
import ConfirmationModal from '../modals/ConfirmationModal.jsx';
import MandatoryActionModal from '../modals/MandatoryActionModal.jsx';
import WinnerModal from '../modals/WinnerModal.jsx';
import AIDecisionLogModal from '../modals/AIDecisionLogModal.jsx';
import ViewShipSectionModal from '../modals/ViewShipSectionModal.jsx';
import DeploymentConfirmationModal from '../modals/DeploymentConfirmationModal.jsx';
import MoveConfirmationModal from '../modals/MoveConfirmationModal.jsx';
import AttackConfirmationModal from '../modals/AttackConfirmationModal.jsx';
import InterceptionOpportunityModal from '../modals/InterceptionOpportunityModal.jsx';
import OpponentDecidingInterceptionModal from '../modals/OpponentDecidingInterceptionModal.jsx';
import CardConfirmationModal from '../modals/CardConfirmationModal.jsx';
import AdditionalCostConfirmationModal from '../modals/AdditionalCostConfirmationModal.jsx';
import DroneAbilityConfirmationModal from '../modals/DroneAbilityConfirmationModal.jsx';
import ShipAbilityConfirmationModal from '../modals/ShipAbilityConfirmationModal.jsx';
import AIHandDebugModal from '../modals/AIHandDebugModal.jsx';
import GameDebugModal from '../modals/GameDebugModal.jsx';
import OpponentDronesModal from '../modals/OpponentDronesModal.jsx';
import GlossaryModal from '../modals/GlossaryModal.jsx';
import AIStrategyModal from '../modals/AIStrategyModal.jsx';
import AddCardToHandModal from '../modals/AddCardToHandModal.jsx';
import CardDetailModal from '../modals/CardDetailModal.jsx';
import AbandonRunModal from '../modals/AbandonRunModal.jsx';

import { debugLog } from '../../utils/debugLogger';

function ModalLayer({
  // --- Modal state ---
  isLogModalOpen,
  modalContent,
  waitingForPlayerPhase,
  deploymentConfirmation,
  moveConfirmation,
  attackConfirmation,
  playerInterceptionChoice,
  interceptionModeActive,
  showOpponentDecidingModal,
  detailedDroneInfo,
  cardToView,
  aiCardPlayReport,
  aiDecisionLogToShow,
  winner,
  showWinnerModal,
  showAbandonRunModal,
  viewShipSectionModal,
  mandatoryAction,
  localPlayerEffectiveStats,
  showMandatoryActionModal,
  shouldShowDiscardUI,
  shouldShowRemovalUI,
  isInMandatoryDiscardPhase,
  hasCommittedDiscard,
  excessCards,
  isInMandatoryRemovalPhase,
  hasCommittedRemoval,
  excessDrones,
  confirmationModal,
  viewUpgradesModal,
  destroyUpgradeModal,
  upgradeSelectionModal,
  cardConfirmation,
  additionalCostConfirmation,
  abilityConfirmation,
  showAiHandModal,
  AI_HAND_DEBUG_MODE,
  opponentPlayerState,
  showOpponentDronesModal,
  opponentSelectedDrones,
  showDebugModal,
  showGlossaryModal,
  showAIStrategyModal,
  showAddCardModal,
  isViewDeckModalOpen,
  isViewDiscardModalOpen,
  localPlayerState,
  cardSelectionModal,
  shipAbilityConfirmation,
  gameState,

  // --- Callbacks ---
  onCloseLogModal,
  onCloseGamePhaseModal,
  onCancelDeployment,
  onConfirmDeployment,
  onCancelMove,
  onConfirmMove,
  onCancelAttack,
  onConfirmAttack,
  onViewBattlefield,
  onConfirmIntercept,
  onDeclineIntercept,
  onCloseDetailedDrone,
  onCloseCardDetail,
  onCloseAiCardPlayReport,
  onCloseAiDecisionLog,
  onCloseWinnerModal,
  onCancelAbandonRun,
  onConfirmAbandonRun,
  onCloseViewShipSection,
  onCloseMandatoryActionModal,
  onCancelCardConfirmation,
  onConfirmCardPlay,
  onConfirmAdditionalCost,
  onCancelAdditionalCost,
  onCancelDroneAbility,
  onConfirmDroneAbility,
  onCloseAiHandModal,
  onCloseOpponentDronesModal,
  onCloseDebugModal,
  onCloseGlossaryModal,
  onCloseAIStrategyModal,
  onCloseAddCardModal,
  onConfirmAddCards,
  onCloseViewDeckModal,
  onCloseViewDiscardModal,
  onCloseCardSelectionModal,
  onConfirmCardSelection,
  onCancelShipAbility,
  onConfirmShipAbility,
  handleCardInfoClick,
  downloadLogAsCSV,
  setAiDecisionLogToShow,

  // --- Game data ---
  gameLog,
  gameEngine,
  turnPhase,
  isMyTurn,
  passInfo,
  getLocalPlayerId,
  shipAbilityMode,
  droneRefs,
  p2pRoomCode,
  lootCount,
  creditsEarned,
  gameStateManager,
  gameDataService,
  gameMode,
  deckCards,
  allDeckCards,
  discardPileCards,

  // --- Upgrade modal setters ---
  setViewUpgradesModal,
  setDestroyUpgradeModal,
  setUpgradeSelectionModal,
  resolveCardPlay,
  cancelCardSelection,
  setCardSelectionModal,
}) {
  // Compute mandatoryAction value for MandatoryActionModal
  const computedMandatoryAction = mandatoryAction?.fromAbility
    ? mandatoryAction
    : isInMandatoryDiscardPhase && !hasCommittedDiscard
      ? { type: 'discard', count: excessCards }
      : isInMandatoryRemovalPhase && !hasCommittedRemoval
        ? { type: 'destroy', count: excessDrones }
        : null;

  return (
    <>
      <LogModal
        isOpen={isLogModalOpen}
        onClose={onCloseLogModal}
        gameLog={gameLog}
        downloadLogAsCSV={downloadLogAsCSV}
        setAiDecisionLogToShow={setAiDecisionLogToShow}
        onCardInfoClick={handleCardInfoClick}
      />

      {modalContent && (
        <GamePhaseModal
          title={modalContent.title}
          text={modalContent.text}
          onClose={modalContent.onClose === null ? null : (modalContent.onClose || onCloseGamePhaseModal)}
        >
          {modalContent.children}
        </GamePhaseModal>
      )}

      <WaitingForPlayerModal
        show={!!waitingForPlayerPhase}
        phase={waitingForPlayerPhase}
        opponentName={opponentPlayerState.name}
        roomCode={p2pRoomCode}
      />

      <DeploymentConfirmationModal
        deploymentConfirmation={deploymentConfirmation}
        show={!!deploymentConfirmation}
        onCancel={onCancelDeployment}
        onConfirm={onConfirmDeployment}
      />

      {/* CHECKPOINT 7: Modal Displayed */}
      {moveConfirmation && (() => {
        debugLog('SINGLE_MOVE_FLOW', '🪟 CHECKPOINT 7: Modal displayed', {
          moveConfirmation: moveConfirmation,
          droneId: moveConfirmation.droneId,
          owner: moveConfirmation.owner,
          from: moveConfirmation.from,
          to: moveConfirmation.to,
          hasCard: !!moveConfirmation.card,
          cardName: moveConfirmation.card?.name,
          hasAllRequiredFields: !!(moveConfirmation.droneId && moveConfirmation.owner && moveConfirmation.from && moveConfirmation.to)
        });
        return null;
      })()}

      <MoveConfirmationModal
        moveConfirmation={moveConfirmation}
        show={!!moveConfirmation}
        isSnared={moveConfirmation?.isSnared}
        onCancel={onCancelMove}
        onConfirm={onConfirmMove}
      />

      <AttackConfirmationModal
        attackConfirmation={attackConfirmation}
        show={!!attackConfirmation}
        onCancel={onCancelAttack}
        onConfirm={onConfirmAttack}
      />

      <InterceptionOpportunityModal
        choiceData={playerInterceptionChoice}
        show={!!(playerInterceptionChoice && !interceptionModeActive)}
        onViewBattlefield={onViewBattlefield}
        onIntercept={onConfirmIntercept}
        onDecline={onDeclineIntercept}
        gameEngine={gameEngine}
        turnPhase={turnPhase}
        isMyTurn={isMyTurn}
        passInfo={passInfo}
        getLocalPlayerId={getLocalPlayerId}
        localPlayerState={localPlayerState}
        shipAbilityMode={shipAbilityMode}
        droneRefs={droneRefs}
        mandatoryAction={mandatoryAction}
      />

      <OpponentDecidingInterceptionModal
        show={showOpponentDecidingModal}
        opponentName={opponentPlayerState?.name || 'Opponent'}
      />

      <DetailedDroneModal
        isOpen={!!detailedDroneInfo}
        drone={detailedDroneInfo?.drone}
        droneAvailability={
          detailedDroneInfo?.isPlayer
            ? localPlayerState?.droneAvailability
            : opponentPlayerState?.droneAvailability
        }
        onClose={onCloseDetailedDrone}
      />

      <CardDetailModal
        isOpen={!!cardToView}
        card={cardToView}
        onClose={onCloseCardDetail}
      />

      {aiCardPlayReport && (
        <AICardPlayReportModal
          report={aiCardPlayReport}
          onClose={onCloseAiCardPlayReport}
        />
      )}

      <AIDecisionLogModal
        decisionLog={aiDecisionLogToShow}
        show={!!aiDecisionLogToShow}
        onClose={onCloseAiDecisionLog}
        getLocalPlayerId={getLocalPlayerId}
        gameState={gameState}
      />

      <WinnerModal
        winner={winner}
        localPlayerId={getLocalPlayerId()}
        show={winner && showWinnerModal}
        onClose={onCloseWinnerModal}
      />

      <AbandonRunModal
        show={showAbandonRunModal}
        onCancel={onCancelAbandonRun}
        onConfirm={onConfirmAbandonRun}
        lootCount={lootCount}
        creditsEarned={creditsEarned}
      />

      <ViewShipSectionModal
        isOpen={!!viewShipSectionModal}
        onClose={onCloseViewShipSection}
        data={viewShipSectionModal}
      />

      <MandatoryActionModal
        mandatoryAction={computedMandatoryAction}
        effectiveStats={localPlayerEffectiveStats}
        show={(shouldShowDiscardUI || shouldShowRemovalUI || mandatoryAction?.fromAbility) && showMandatoryActionModal}
        onClose={onCloseMandatoryActionModal}
      />

      <ConfirmationModal
        confirmationModal={confirmationModal}
        show={!!confirmationModal}
      />

      <ModalContainer
        viewUpgradesModal={viewUpgradesModal}
        setViewUpgradesModal={setViewUpgradesModal}
        destroyUpgradeModal={destroyUpgradeModal}
        setDestroyUpgradeModal={setDestroyUpgradeModal}
        upgradeSelectionModal={upgradeSelectionModal}
        setUpgradeSelectionModal={setUpgradeSelectionModal}
        resolveCardPlay={resolveCardPlay}
        getLocalPlayerId={getLocalPlayerId}
        cancelCardSelection={cancelCardSelection}
      />

      <CardConfirmationModal
        cardConfirmation={cardConfirmation}
        show={!!cardConfirmation}
        onCancel={onCancelCardConfirmation}
        onConfirm={onConfirmCardPlay}
      />

      {additionalCostConfirmation && (
        <AdditionalCostConfirmationModal
          card={additionalCostConfirmation.card}
          costSelection={additionalCostConfirmation.costSelection}
          effectTarget={additionalCostConfirmation.effectTarget}
          onConfirm={onConfirmAdditionalCost}
          onCancel={onCancelAdditionalCost}
        />
      )}

      <DroneAbilityConfirmationModal
        abilityConfirmation={abilityConfirmation}
        show={!!abilityConfirmation}
        onCancel={onCancelDroneAbility}
        onConfirm={onConfirmDroneAbility}
      />

      <AIHandDebugModal
        opponentPlayerState={opponentPlayerState}
        show={showAiHandModal}
        debugMode={AI_HAND_DEBUG_MODE}
        onClose={onCloseAiHandModal}
      />

      <OpponentDronesModal
        isOpen={showOpponentDronesModal}
        onClose={onCloseOpponentDronesModal}
        drones={opponentSelectedDrones}
        appliedUpgrades={opponentPlayerState.appliedUpgrades}
        droneAvailability={opponentPlayerState.droneAvailability}
      />

      <GameDebugModal
        show={showDebugModal}
        onClose={onCloseDebugModal}
        gameStateManager={gameStateManager}
        gameDataService={gameDataService}
      />

      {showGlossaryModal && (
        <GlossaryModal onClose={onCloseGlossaryModal} />
      )}

      {showAIStrategyModal && (
        <AIStrategyModal onClose={onCloseAIStrategyModal} />
      )}

      <AddCardToHandModal
        isOpen={showAddCardModal}
        onClose={onCloseAddCardModal}
        onConfirm={onConfirmAddCards}
        gameMode={gameMode}
      />

      <CardViewerModal
        isOpen={isViewDeckModalOpen}
        onClose={onCloseViewDeckModal}
        cards={deckCards}
        allCards={allDeckCards}
        title="Remaining Cards in Deck"
        groupByType={true}
      />

      <CardViewerModal
        isOpen={isViewDiscardModalOpen}
        onClose={onCloseViewDiscardModal}
        cards={discardPileCards}
        title="Discard Pile"
        shouldSort={false}
      />

      <CardSelectionModal
        isOpen={!!cardSelectionModal}
        onClose={cardSelectionModal?.onCancel || onCloseCardSelectionModal}
        onConfirm={cardSelectionModal?.onConfirm || onConfirmCardSelection}
        selectionData={cardSelectionModal}
        mandatory={true}
      />

      <ShipAbilityConfirmationModal
        shipAbilityConfirmation={shipAbilityConfirmation}
        show={!!shipAbilityConfirmation}
        onCancel={onCancelShipAbility}
        onConfirm={onConfirmShipAbility}
      />
    </>
  );
}

export default React.memo(ModalLayer);
