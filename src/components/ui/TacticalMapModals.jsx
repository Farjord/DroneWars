import React from 'react';
import POIEncounterModal from '../modals/POIEncounterModal.jsx';
import BlueprintEncounterModal from '../modals/BlueprintEncounterModal.jsx';
import DroneBlueprintRewardModal from '../modals/DroneBlueprintRewardModal.jsx';
import SalvageModal from '../modals/SalvageModal.jsx';
import EscapeConfirmModal from '../modals/EscapeConfirmModal.jsx';
import QuickDeploySelectionModal from '../modals/QuickDeploySelectionModal.jsx';
import LoadingEncounterScreen from '../ui/LoadingEncounterScreen.jsx';
import ExtractionLoadingScreen from '../ui/ExtractionLoadingScreen.jsx';
import EscapeLoadingScreen from '../ui/EscapeLoadingScreen.jsx';
import RunInventoryModal from '../modals/RunInventoryModal.jsx';
import LootRevealModal from '../modals/LootRevealModal.jsx';
import AbandonRunModal from '../modals/AbandonRunModal.jsx';
import ExtractionLootSelectionModal from '../modals/ExtractionLootSelectionModal.jsx';
import ExtractionConfirmModal from '../modals/ExtractionConfirmModal.jsx';
import TacticalItemConfirmationModal from '../modals/TacticalItemConfirmationModal.jsx';
import MissionTrackerModal from '../modals/MissionTrackerModal.jsx';
import { TacticalMapTutorialModal } from '../modals/tutorials';
import DetectionManager from '../../logic/detection/DetectionManager.js';
import ExtractionController from '../../logic/singlePlayer/ExtractionController.js';
import aiPersonalities from '../../data/aiData.js';
import gameStateManager from '../../managers/GameStateManager.js';
import MissionService from '../../logic/missions/MissionService.js';

const TacticalMapModals = ({
  // Blueprint encounter
  showBlueprintEncounterModal,
  pendingBlueprintEncounter,
  handleBlueprintEncounterAccept,
  handleBlueprintEncounterDecline,
  handleBlueprintQuickDeploy,
  validQuickDeployments,
  // POI encounter
  showPOIModal,
  currentEncounter,
  handleEncounterProceed,
  setShowPOIModal,
  setShowQuickDeploySelection,
  handleEscapeRequest,
  handleEvadeItem,
  handleEncounterClose,
  // Quick deploy selection
  showQuickDeploySelection,
  setSelectedQuickDeploy,
  blueprintQuickDeployPending,
  setBlueprintQuickDeployPending,
  handleBlueprintEncounterAcceptWithQuickDeploy,
  handleEncounterProceedWithQuickDeploy,
  extractionQuickDeployPending,
  setExtractionQuickDeployPending,
  setShowExtractionConfirm,
  salvageQuickDeployPending,
  setSalvageQuickDeployPending,
  setShowSalvageModal,
  setShowBlueprintEncounterModal,
  // Salvage
  showSalvageModal,
  activeSalvage,
  tierConfig,
  handleSalvageSlot,
  handleSalvageLeave,
  handleSalvageCombat,
  setSalvageQuickDeployPending: setSalvageQDPending,
  handleSalvageQuit,
  // Extraction confirm
  showExtractionConfirm,
  handleExtractionCancel,
  handleExtractionConfirmed,
  handleExtractionWithItem,
  handleBlockadeCombat,
  handleBlockadeQuickDeploy,
  // Tactical item confirmation
  tacticalItemConfirmation,
  handleTacticalItemCancel,
  handleTacticalItemConfirm,
  // Loading screens
  showLoadingEncounter,
  loadingEncounterData,
  handleLoadingEncounterComplete,
  showExtractionScreen,
  extractionScreenData,
  handleExtractionScreenComplete,
  showEscapeLoadingScreen,
  escapeLoadingData,
  handleEscapeLoadingComplete,
  // Inventory
  showInventory,
  handleCloseInventory,
  currentRunState,
  // Blueprint reward
  showBlueprintRewardModal,
  pendingBlueprintReward,
  handleBlueprintRewardAccepted,
  // POI loot
  poiLootToReveal,
  handlePOILootCollected,
  // Abandon
  showAbandonModal,
  setShowAbandonModal,
  handleConfirmAbandon,
  // Escape confirm
  showEscapeConfirm,
  handleEscapeConfirm,
  handleEscapeCancel,
  shipSections,
  escapeContext,
  // Loot selection
  showLootSelectionModal,
  pendingLootSelection,
  handleLootSelectionConfirm,
  // Mission tracker
  showMissionTracker,
  setShowMissionTracker,
  // Tutorial
  showTutorial,
  setShowTutorial,
}) => {
  return (
    <>
      {/* Blueprint Encounter Modal (Phase 5) */}
      {showBlueprintEncounterModal && pendingBlueprintEncounter && (
        <BlueprintEncounterModal
          encounter={pendingBlueprintEncounter}
          show={showBlueprintEncounterModal}
          onAccept={handleBlueprintEncounterAccept}
          onDecline={handleBlueprintEncounterDecline}
          onQuickDeploy={handleBlueprintQuickDeploy}
          validQuickDeployments={validQuickDeployments}
        />
      )}

      {/* POI Encounter Modal */}
      {showPOIModal && currentEncounter && (
        <POIEncounterModal
          encounter={currentEncounter}
          onProceed={handleEncounterProceed}
          onQuickDeploy={() => {
            setShowPOIModal(false);
            setShowQuickDeploySelection(true);
          }}
          validQuickDeployments={validQuickDeployments}
          onEscape={() => handleEscapeRequest({ type: 'poi', isPOI: true })}
          onEvade={handleEvadeItem}
          evadeItemCount={gameStateManager.getTacticalItemCount('ITEM_EVADE')}
          onClose={handleEncounterClose}
        />
      )}

      {/* Quick Deploy Selection Modal */}
      {showQuickDeploySelection && (
        <QuickDeploySelectionModal
          validQuickDeployments={validQuickDeployments}
          onSelect={(deployment) => {
            setSelectedQuickDeploy(deployment);
            setShowQuickDeploySelection(false);

            if (blueprintQuickDeployPending) {
              setBlueprintQuickDeployPending(false);
              handleBlueprintEncounterAcceptWithQuickDeploy(deployment);
            } else {
              handleEncounterProceedWithQuickDeploy(deployment);
            }
          }}
          onBack={() => {
            setShowQuickDeploySelection(false);
            if (blueprintQuickDeployPending) {
              setBlueprintQuickDeployPending(false);
              setShowBlueprintEncounterModal(true);
            } else if (extractionQuickDeployPending) {
              setExtractionQuickDeployPending(false);
              setShowExtractionConfirm(true);
            } else if (salvageQuickDeployPending) {
              setSalvageQuickDeployPending(false);
              setShowSalvageModal(true);
            } else {
              setShowPOIModal(true);
            }
          }}
        />
      )}

      {/* Salvage Modal (progressive POI salvage) */}
      {showSalvageModal && activeSalvage && (
        <SalvageModal
          salvageState={activeSalvage}
          tierConfig={tierConfig}
          detection={activeSalvage.detection || DetectionManager.getCurrentDetection()}
          onSalvageSlot={handleSalvageSlot}
          onLeave={handleSalvageLeave}
          onEngageCombat={handleSalvageCombat}
          onQuickDeploy={() => {
            setShowSalvageModal(false);
            setShowQuickDeploySelection(true);
            setSalvageQDPending(true);
          }}
          onEscape={() => handleEscapeRequest({ type: 'salvage', isPOI: true })}
          validQuickDeployments={validQuickDeployments}
          onQuit={handleSalvageQuit}
        />
      )}

      {/* Extraction Confirmation Modal */}
      {showExtractionConfirm && (
        <ExtractionConfirmModal
          detection={DetectionManager.getCurrentDetection()}
          onCancel={handleExtractionCancel}
          onExtract={handleExtractionConfirmed}
          onExtractWithItem={handleExtractionWithItem}
          extractItemCount={gameStateManager.getTacticalItemCount('ITEM_EXTRACT')}
          onEngageCombat={handleBlockadeCombat}
          onQuickDeploy={handleBlockadeQuickDeploy}
          validQuickDeployments={validQuickDeployments}
        />
      )}

      {/* Tactical Item Confirmation Modal */}
      <TacticalItemConfirmationModal
        show={!!tacticalItemConfirmation}
        item={tacticalItemConfirmation?.item}
        currentDetection={tacticalItemConfirmation?.currentDetection || 0}
        onCancel={handleTacticalItemCancel}
        onConfirm={handleTacticalItemConfirm}
      />

      {/* Loading Encounter Screen (combat transition) */}
      {showLoadingEncounter && loadingEncounterData && (
        <LoadingEncounterScreen
          encounterData={loadingEncounterData}
          onComplete={handleLoadingEncounterComplete}
        />
      )}

      {/* Extraction Loading Screen (extraction transition) */}
      {showExtractionScreen && (
        <ExtractionLoadingScreen
          extractionData={extractionScreenData}
          onComplete={handleExtractionScreenComplete}
        />
      )}

      {/* Escape Loading Screen (escape transition) */}
      {showEscapeLoadingScreen && escapeLoadingData && (
        <EscapeLoadingScreen
          escapeData={escapeLoadingData}
          onComplete={handleEscapeLoadingComplete}
        />
      )}

      {/* Run Inventory Modal */}
      {showInventory && (
        <RunInventoryModal
          currentRunState={currentRunState}
          onClose={handleCloseInventory}
        />
      )}

      {/* Blueprint Reward Modal (dedicated reveal animation) */}
      {showBlueprintRewardModal && pendingBlueprintReward && (
        <DroneBlueprintRewardModal
          blueprint={pendingBlueprintReward}
          onAccept={handleBlueprintRewardAccepted}
          show={true}
        />
      )}

      {/* POI Loot Reveal Modal (for card packs and mixed loot) */}
      {poiLootToReveal && (
        <LootRevealModal
          loot={poiLootToReveal}
          onCollect={handlePOILootCollected}
          show={true}
        />
      )}

      {/* Abandon Run Confirmation Modal */}
      <AbandonRunModal
        show={showAbandonModal}
        onCancel={() => setShowAbandonModal(false)}
        onConfirm={handleConfirmAbandon}
        lootCount={currentRunState?.collectedLoot?.length || 0}
        creditsEarned={currentRunState?.creditsEarned || 0}
      />

      {/* Escape Confirmation Modal */}
      {(() => {
        const escapeAiId = currentEncounter?.aiId;
        const escapeAiPersonality = escapeAiId
          ? aiPersonalities.find(ai => ai.name === escapeAiId) || aiPersonalities[0]
          : aiPersonalities[0];
        const escapeCheckResult = currentRunState
          ? ExtractionController.checkEscapeCouldDestroy(currentRunState, escapeAiPersonality)
          : { couldDestroy: false, escapeDamageRange: { min: 2, max: 2 } };

        return (
          <EscapeConfirmModal
            show={showEscapeConfirm}
            onConfirm={handleEscapeConfirm}
            onCancel={handleEscapeCancel}
            shipSections={shipSections}
            couldDestroyShip={escapeCheckResult.couldDestroy}
            isPOIEncounter={escapeContext?.isPOI || false}
            escapeDamageRange={escapeCheckResult.escapeDamageRange}
            encounterDetectionChance={currentRunState?.encounterDetectionChance || 0}
          />
        );
      })()}

      {/* Loot Selection Modal (for Slot 0 extraction limit) */}
      <ExtractionLootSelectionModal
        isOpen={showLootSelectionModal}
        collectedLoot={pendingLootSelection?.collectedLoot || []}
        limit={pendingLootSelection?.limit || 3}
        onConfirm={handleLootSelectionConfirm}
        onCancel={() => handleLootSelectionConfirm([])}
      />

      {/* Mission Tracker Modal */}
      {showMissionTracker && (
        <MissionTrackerModal
          onClose={() => setShowMissionTracker(false)}
        />
      )}

      {/* Tactical Map Tutorial Modal */}
      {showTutorial === 'tacticalMap' && (
        <TacticalMapTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('tacticalMap');
            setShowTutorial(null);
          }}
        />
      )}
    </>
  );
};

export default TacticalMapModals;
