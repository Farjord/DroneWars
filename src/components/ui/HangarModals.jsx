import React from 'react';
import SaveLoadModal from '../modals/SaveLoadModal';
import InventoryModal from '../modals/InventoryModal';
import MapOverviewModal from '../modals/MapOverviewModal';
import BlueprintsModal from '../modals/BlueprintsModal';
import ReplicatorModal from '../modals/ReplicatorModal';
import ShopModal from '../modals/ShopModal';
import RunSummaryModal from '../modals/RunSummaryModal';
import MIARecoveryModal from '../modals/MIARecoveryModal';
import BossEncounterModal from '../modals/BossEncounterModal';
import ConfirmationModal from '../modals/ConfirmationModal';
import QuickDeployManager from '../quickDeploy/QuickDeployManager';
import ReputationProgressModal from '../modals/ReputationProgressModal';
import ReputationRewardModal from '../modals/ReputationRewardModal';
import MissionTrackerModal from '../modals/MissionTrackerModal';
import DeployingScreen from './DeployingScreen';
import LoadingEncounterScreen from './LoadingEncounterScreen';
import {
  IntroTutorialModal,
  InventoryTutorialModal,
  ReplicatorTutorialModal,
  BlueprintsTutorialModal,
  ShopTutorialModal,
  RepairBayTutorialModal,
  TacticalMapOverviewTutorialModal,
  DeckBuilderTutorialModal,
} from '../modals/tutorials';
import MissionService from '../../logic/missions/MissionService';
import { starterDeck } from '../../data/playerDeckData.js';
import { debugLog } from '../../utils/debugLogger.js';

// --- Tutorial Configuration ---
// Maps tutorial key to component + optional extra dismiss actions
const TUTORIAL_COMPONENTS = {
  inventory: InventoryTutorialModal,
  replicator: ReplicatorTutorialModal,
  blueprints: BlueprintsTutorialModal,
  shop: ShopTutorialModal,
  tacticalMapOverview: TacticalMapOverviewTutorialModal,
};

const HangarModals = ({
  activeModal,
  closeAllModals,
  // Map overview
  selectedBossId,
  selectedSlotId,
  selectedMap,
  selectedCoordinate,
  activeSectors,
  onBossChallenge,
  onNavigateSector,
  onDeploy,
  // Run summary
  lastRunSummary,
  onDismissRunSummary,
  // MIA
  selectedMiaSlot,
  onCloseMiaModal,
  // New deck
  singlePlayerShipSlots,
  onNewDeckOption,
  // Delete
  deleteConfirmation,
  onDeleteConfirm,
  onDeleteCancel,
  // Copy starter
  copyStarterConfirmation,
  onCancelCopyStarter,
  onConfirmCopyStarter,
  // Empty deck
  emptyDeckConfirmation,
  onCancelEmptyDeck,
  onConfirmEmptyDeck,
  // Reputation
  showReputationProgress,
  setShowReputationProgress,
  showReputationRewards,
  setShowReputationRewards,
  // Missions
  showMissionTracker,
  setShowMissionTracker,
  // Tutorials
  showTutorial,
  setShowTutorial,
  isHelpIconTutorial,
  setIsHelpIconTutorial,
  gameStateManager,
  // Deploy/loading screens
  showDeployingScreen,
  deployingData,
  onDeployingComplete,
  showBossLoadingScreen,
  bossLoadingData,
  onBossLoadingComplete,
}) => {
  return (
    <>
      {/* Standard modals */}
      {activeModal === 'saveLoad' && <SaveLoadModal onClose={closeAllModals} />}
      {activeModal === 'inventory' && <InventoryModal onClose={closeAllModals} onShowHelp={() => setShowTutorial('inventory')} />}
      {activeModal === 'blueprints' && <BlueprintsModal onClose={closeAllModals} onShowHelp={() => setShowTutorial('blueprints')} />}
      {activeModal === 'replicator' && <ReplicatorModal onClose={closeAllModals} onShowHelp={() => setShowTutorial('replicator')} />}
      {activeModal === 'shop' && <ShopModal onClose={closeAllModals} onShowHelp={() => setShowTutorial('shop')} />}
      {activeModal === 'quickDeploy' && <QuickDeployManager onClose={closeAllModals} />}

      {/* Boss Encounter Modal */}
      {activeModal === 'bossEncounter' && selectedBossId && (
        <BossEncounterModal
          bossId={selectedBossId}
          selectedSlotId={selectedSlotId}
          onChallenge={onBossChallenge}
          onClose={closeAllModals}
        />
      )}

      {/* Map Overview Modal */}
      {activeModal === 'mapOverview' && (() => {
        debugLog('EXTRACTION', '🖼️ Rendering MapOverviewModal', {
          selectedSlotId,
          selectedMapName: selectedMap?.name,
          selectedCoordinate,
          hasSlotId: selectedSlotId != null,
          hasMap: selectedMap != null
        });

        return (
          <MapOverviewModal
            selectedSlotId={selectedSlotId}
            selectedMap={selectedMap}
            selectedCoordinate={selectedCoordinate}
            activeSectors={activeSectors}
            onNavigate={onNavigateSector}
            onDeploy={onDeploy}
            onClose={closeAllModals}
            onShowHelp={() => setShowTutorial('tacticalMapOverview')}
          />
        );
      })()}

      {/* Run Summary Modal */}
      {lastRunSummary && (
        <RunSummaryModal
          summary={lastRunSummary}
          onClose={onDismissRunSummary}
        />
      )}

      {/* MIA Recovery Modal */}
      {activeModal === 'miaRecovery' && selectedMiaSlot && (
        <MIARecoveryModal
          shipSlot={selectedMiaSlot}
          onClose={onCloseMiaModal}
        />
      )}

      {/* New Deck Prompt Modal */}
      {activeModal === 'newDeckPrompt' && (
        <div className="dw-modal-overlay" onClick={closeAllModals}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Create New Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text">How would you like to start your new deck?</p>
            </div>
            <div className="dw-modal-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => onNewDeckOption('empty')}
                className="dw-btn dw-btn-confirm dw-btn--full"
              >
                Start Empty
              </button>
              {singlePlayerShipSlots[0]?.status === 'active' && (
                <button
                  onClick={() => onNewDeckOption('copyFromSlot0')}
                  className="dw-btn dw-btn-secondary dw-btn--full"
                >
                  Copy from {singlePlayerShipSlots[0]?.name || 'Starter Deck'}
                </button>
              )}
              <button
                onClick={closeAllModals}
                className="dw-btn dw-btn-cancel dw-btn--full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Deck Confirmation Modal */}
      {deleteConfirmation && (
        <ConfirmationModal
          confirmationModal={{
            type: 'delete',
            text: `Delete "${deleteConfirmation.slotName}"? All non-starter cards will be returned to your inventory.`,
            onConfirm: onDeleteConfirm,
            onCancel: onDeleteCancel
          }}
          show={true}
        />
      )}

      {/* Copy Starter Deck Confirmation Modal */}
      {copyStarterConfirmation && (
        <div className="dw-modal-overlay" onClick={onCancelCopyStarter}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Copy Starter Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text" style={{ marginBottom: '12px' }}>
                This will create owned copies of all starter deck items in your inventory:
              </p>
              <ul style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '12px', paddingLeft: '20px' }}>
                <li>{starterDeck.decklist?.reduce((sum, c) => sum + c.quantity, 0) || 40} cards</li>
                <li>{starterDeck.droneSlots?.filter(s => s.assignedDrone).length || 5} drones</li>
                <li>{Object.keys(starterDeck.shipComponents || {}).length || 3} ship components</li>
                <li>1 ship</li>
              </ul>
            </div>
            <div className="dw-modal-actions">
              <button onClick={onCancelCopyStarter} className="dw-btn dw-btn-cancel">Cancel</button>
              <button onClick={onConfirmCopyStarter} className="dw-btn dw-btn-confirm">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Deck Creation Confirmation Modal */}
      {emptyDeckConfirmation && (
        <div className="dw-modal-overlay" onClick={onCancelEmptyDeck}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Create Empty Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text" style={{ marginBottom: '12px' }}>
                This will create a new empty deck slot that you can customize with any cards.
              </p>
              <p className="dw-modal-text" style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '12px' }}>
                Starter cards are always available in unlimited quantities for deck building.
              </p>
            </div>
            <div className="dw-modal-actions">
              <button onClick={onCancelEmptyDeck} className="dw-btn dw-btn-cancel">Cancel</button>
              <button onClick={onConfirmEmptyDeck} className="dw-btn dw-btn-confirm">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Reputation Progress Modal */}
      {showReputationProgress && (
        <ReputationProgressModal
          onClose={() => setShowReputationProgress(false)}
          onClaimRewards={() => {
            setShowReputationProgress(false);
            setShowReputationRewards(true);
          }}
        />
      )}

      {/* Reputation Reward Modal */}
      {showReputationRewards && (
        <ReputationRewardModal
          onClose={() => setShowReputationRewards(false)}
        />
      )}

      {/* Mission Tracker Modal */}
      {showMissionTracker && (
        <MissionTrackerModal
          onClose={() => setShowMissionTracker(false)}
          onRewardClaimed={() => {}}
        />
      )}

      {/* Tutorial Modals - data-driven for simple ones */}
      {Object.entries(TUTORIAL_COMPONENTS).map(([key, Component]) => (
        showTutorial === key && (
          <Component
            key={key}
            onDismiss={() => {
              MissionService.dismissTutorial(key);
              setShowTutorial(null);
            }}
          />
        )
      ))}

      {/* Intro tutorial - special: has onSkipAll */}
      {showTutorial === 'intro' && (
        <IntroTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('intro');
            setShowTutorial(null);
            setIsHelpIconTutorial(false);
          }}
          onSkipAll={!isHelpIconTutorial ? () => {
            MissionService.skipIntroMissions();
            MissionService.dismissTutorial('intro');
            MissionService.dismissTutorial('inventory');
            MissionService.dismissTutorial('replicator');
            MissionService.dismissTutorial('blueprints');
            MissionService.dismissTutorial('shop');
            MissionService.dismissTutorial('repairBay');
            MissionService.dismissTutorial('deckBuilder');
            setShowTutorial(null);
            setIsHelpIconTutorial(false);
          } : undefined}
        />
      )}

      {/* RepairBay tutorial - special: navigates to repairBay on dismiss */}
      {showTutorial === 'repairBay' && (
        <RepairBayTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('repairBay');
            MissionService.recordProgress('SCREEN_VISIT', { screen: 'repairBay' });
            setShowTutorial(null);
            gameStateManager.setState({ appState: 'repairBay' });
          }}
        />
      )}

      {/* DeckBuilder tutorial - special: records screen visit on dismiss */}
      {showTutorial === 'deckBuilder' && (
        <DeckBuilderTutorialModal
          onDismiss={() => {
            MissionService.dismissTutorial('deckBuilder');
            MissionService.recordProgress('SCREEN_VISIT', { screen: 'deckBuilder' });
            setShowTutorial(null);
          }}
        />
      )}

      {/* Deploying Screen (transition from Hangar to Tactical Map) */}
      {showDeployingScreen && (
        <DeployingScreen
          deployData={{
            shipName: deployingData?.shipName,
            destination: deployingData?.map?.name || `Sector ${selectedCoordinate}`
          }}
          onComplete={onDeployingComplete}
        />
      )}

      {/* Boss Encounter Loading Screen */}
      {showBossLoadingScreen && bossLoadingData && (
        <LoadingEncounterScreen
          encounterData={bossLoadingData}
          onComplete={onBossLoadingComplete}
        />
      )}
    </>
  );
};

export default HangarModals;
