// ========================================
// MODAL SHOWCASE SCREEN
// ========================================
// Dev-only screen for previewing all modal components
// Accessible via MenuScreen button or Ctrl+M keyboard shortcut

import { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import gameStateManager from '../../managers/GameStateManager.js';
import { debugLog } from '../../utils/debugLogger.js';
import { getMockPropsForModal, getModalsByCategory, MODAL_CATEGORIES } from './modalShowcaseHelpers.js';

// Import all modal components
import WinnerModal from '../modals/WinnerModal.jsx';
import InterceptionOpportunityModal from '../modals/InterceptionOpportunityModal.jsx';
import OpponentDecidingInterceptionModal from '../modals/OpponentDecidingInterceptionModal.jsx';
import DeploymentConfirmationModal from '../modals/DeploymentConfirmationModal.jsx';
import CardConfirmationModal from '../modals/CardConfirmationModal.jsx';
import DroneAbilityConfirmationModal from '../modals/DroneAbilityConfirmationModal.jsx';
import ShipAbilityConfirmationModal from '../modals/ShipAbilityConfirmationModal.jsx';
import MoveConfirmationModal from '../modals/MoveConfirmationModal.jsx';
import MandatoryActionModal from '../modals/MandatoryActionModal.jsx';
import ConfirmationModal from '../modals/ConfirmationModal.jsx';
import AICardPlayReportModal from '../modals/AICardPlayReportModal.jsx';
import AIDecisionLogModal from '../modals/AIDecisionLogModal.jsx';
import AIHandDebugModal from '../modals/AIHandDebugModal.jsx';
import GameDebugModal from '../modals/GameDebugModal.jsx';
import WaitingForPlayerModal from '../modals/WaitingForPlayerModal.jsx';
import OpponentDronesModal from '../modals/OpponentDronesModal.jsx';
import ViewUpgradesModal from '../modals/ViewUpgradesModal.jsx';
import UpgradeSelectionModal from '../modals/UpgradeSelectionModal.jsx';
import DestroyUpgradeModal from '../modals/DestroyUpgradeModal.jsx';
import CardSelectionModal from '../modals/CardSelectionModal.jsx';
import CardViewerModal from '../modals/CardViewerModal.jsx';
import ViewDeckModal from '../modals/ViewDeckModal.jsx';
import GamePhaseModal from '../ui/GamePhaseModal.jsx';
import PhaseAnnouncementOverlay from '../animations/PhaseAnnouncementOverlay.jsx';
import DetailedDroneModal from '../modals/debug/DetailedDroneModal.jsx';

// Extraction / Into the Eremos modals
import AbandonRunModal from '../modals/AbandonRunModal.jsx';
import MapOverviewModal from '../modals/MapOverviewModal.jsx';
import WaypointConfirmationModal from '../modals/WaypointConfirmationModal.jsx';
import POIEncounterModal from '../modals/POIEncounterModal.jsx';
import SalvageModal from '../modals/SalvageModal.jsx';
import LootRevealModal from '../modals/LootRevealModal.jsx';
import RunInventoryModal from '../modals/RunInventoryModal.jsx';
import ExtractionLootSelectionModal from '../modals/ExtractionLootSelectionModal.jsx';
import RunSummaryModal from '../modals/RunSummaryModal.jsx';
import MIARecoveryModal from '../modals/MIARecoveryModal.jsx';
import DroneBlueprintRewardModal from '../modals/DroneBlueprintRewardModal.jsx';

// Utility modals
import CardDetailModal from '../modals/CardDetailModal.jsx';
import GlossaryModal from '../modals/GlossaryModal.jsx';
import AIStrategyModal from '../modals/AIStrategyModal.jsx';
import ViewShipSectionModal from '../modals/ViewShipSectionModal.jsx';
import LogModal from '../modals/LogModal.jsx';

// Hangar modals
import SaveLoadModal from '../modals/SaveLoadModal.jsx';
import InventoryModal from '../modals/InventoryModal.jsx';
import BlueprintsModal from '../modals/BlueprintsModal.jsx';
import RepairBayModal from '../modals/RepairBayModal.jsx';
import ReplicatorModal from '../modals/ReplicatorModal.jsx';

/**
 * Modal Showcase Screen Component
 * Provides a dev-only interface to preview all modal components
 */
function ModalShowcaseScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedModal, setSelectedModal] = useState(null);
  const [selectedModalProps, setSelectedModalProps] = useState(null);

  const modalsByCategory = getModalsByCategory();

  // Filter modals based on search query
  const filteredModals = modalsByCategory[activeCategory].filter(modalName =>
    modalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle modal selection
  const handleModalClick = (modalName) => {
    const mockProps = getMockPropsForModal(modalName);
    if (mockProps) {
      setSelectedModal(modalName);
      setSelectedModalProps(mockProps.props);
    }
  };

  // Handle ESC key to close modal preview
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && selectedModal) {
        setSelectedModal(null);
        setSelectedModalProps(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedModal]);

  // Close modal preview
  const closeModalPreview = () => {
    setSelectedModal(null);
    setSelectedModalProps(null);
  };

  // Return to menu
  const handleCloseShowcase = () => {
    gameStateManager.setState({ appState: 'menu' });
  };

  // Render the currently selected modal
  const renderSelectedModal = () => {
    if (!selectedModal || !selectedModalProps) return null;

    // Override onClose/onCancel/onConfirm handlers to close preview instead
    const overrideProps = {
      ...selectedModalProps,
      onClose: closeModalPreview,
      onCancel: closeModalPreview,
      onConfirm: () => {
        debugLog('STATE_SYNC', `${selectedModal}: Confirmed`);
        closeModalPreview();
      },
      onIntercept: (drone) => {
        debugLog('STATE_SYNC', `${selectedModal}: Intercept with`, drone);
        closeModalPreview();
      },
      onDecline: () => {
        debugLog('STATE_SYNC', `${selectedModal}: Declined`);
        closeModalPreview();
      },
      onComplete: () => {
        debugLog('STATE_SYNC', `${selectedModal}: Completed`);
        closeModalPreview();
      },
      onSelect: (selection) => {
        debugLog('STATE_SYNC', `${selectedModal}: Selected`, selection);
        closeModalPreview();
      }
    };

    // Map modal names to components
    const modalComponents = {
      WinnerModal,
      'WinnerModal (Defeat)': WinnerModal,
      InterceptionOpportunityModal,
      OpponentDecidingInterceptionModal,
      DeploymentConfirmationModal,
      CardConfirmationModal,
      DroneAbilityConfirmationModal,
      ShipAbilityConfirmationModal,
      MoveConfirmationModal,
      MandatoryActionModal,
      ConfirmationModal,
      AICardPlayReportModal,
      AIDecisionLogModal,
      AIHandDebugModal,
      GameDebugModal,
      WaitingForPlayerModal,
      OpponentDronesModal,
      ViewUpgradesModal,
      UpgradeSelectionModal,
      DestroyUpgradeModal,
      CardSelectionModal,
      CardViewerModal,
      ViewDeckModal,
      GamePhaseModal,
      PhaseAnnouncementOverlay,
      'PhaseAnnouncementOverlay (Action)': PhaseAnnouncementOverlay,
      'PhaseAnnouncementOverlay (Combat)': PhaseAnnouncementOverlay,
      DetailedDroneModal,
      // Extraction / Into the Eremos modals
      AbandonRunModal,
      MapOverviewModal,
      WaypointConfirmationModal,
      POIEncounterModal,
      SalvageModal,
      SalvageModal_midSalvage: SalvageModal,
      SalvageModal_allRevealed: SalvageModal,
      SalvageModal_encounter: SalvageModal,
      LootRevealModal,
      RunInventoryModal,
      ExtractionLootSelectionModal,
      RunSummaryModal,
      MIARecoveryModal,
      DroneBlueprintRewardModal,
      // Utility modals
      CardDetailModal,
      GlossaryModal,
      AIStrategyModal,
      ViewShipSectionModal,
      LogModal,
      // Hangar modals
      SaveLoadModal,
      InventoryModal,
      BlueprintsModal,
      RepairBayModal,
      ReplicatorModal
    };

    const ModalComponent = modalComponents[selectedModal];
    if (!ModalComponent) {
      debugLog('STATE_SYNC', `Modal component not found: ${selectedModal}`);
      return null;
    }

    return <ModalComponent {...overrideProps} />;
  };

  return (
    <div className="body-font" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(2, 6, 23, 1)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '60px 20px 20px 20px'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        marginBottom: '24px',
        flexShrink: 0
      }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-cyan-500/20 p-3 rounded-lg">
            <Layers size={28} className="text-cyan-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-cyan-400">Modal Showcase</h1>
            <p className="text-gray-400">Dev Preview Tool</p>
          </div>
          <button
            onClick={handleCloseShowcase}
            className="dw-btn dw-btn-secondary"
          >
            Back to Menu
          </button>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search modals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Category Tabs */}
      <div style={{
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        marginBottom: '24px',
        flexShrink: 0
      }}>
        <div className="border-b border-gray-700">
          <div className="flex space-x-1 dw-modal-scroll-x">
            {Object.entries(MODAL_CATEGORIES).map(([key, { name, count }]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === key
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {name} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Grid - scrollable */}
      <div
        className="dw-modal-scroll"
        style={{
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          flex: 1,
          minHeight: 0
        }}
      >
        {filteredModals.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No modals found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredModals.map((modalName) => {
              const mockConfig = getMockPropsForModal(modalName);
              const category = mockConfig?.category || 'unknown';

              return (
                <button
                  key={modalName}
                  onClick={() => handleModalClick(modalName)}
                  className="p-5 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer text-left transition-all hover:bg-gray-700 hover:border-cyan-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/20"
                >
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    {category}
                  </div>
                  <div className="text-lg font-bold text-cyan-400 mb-1">
                    {modalName.replace(/Modal$/, '')}
                  </div>
                  <div className="text-sm text-gray-400">
                    Click to preview
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Render Selected Modal */}
      {renderSelectedModal()}

      {/* Help Text */}
      <div
        style={{
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          flexShrink: 0
        }}
        className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400"
      >
        <div className="mb-2 font-bold text-cyan-400">
          Keyboard Shortcuts:
        </div>
        <ul className="m-0 pl-5 list-disc">
          <li className="mb-1">
            <strong className="text-gray-300">ESC:</strong> Close modal preview
          </li>
          <li className="mb-1">
            <strong className="text-gray-300">Ctrl+M:</strong> Toggle Modal Showcase from anywhere
          </li>
        </ul>
        <div className="mt-3 italic text-gray-500">
          All modal interactions are logged to console. Buttons will close the preview instead of performing actual actions.
        </div>
      </div>
    </div>
  );
}

export default ModalShowcaseScreen;
