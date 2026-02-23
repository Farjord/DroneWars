import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import DeckBuilderLeftPanel from '../../ui/DeckBuilderLeftPanel.jsx';
import DeckBuilderRightPanel from '../../ui/DeckBuilderRightPanel.jsx';
import CardDetailPopup from '../../ui/CardDetailPopup.jsx';
import DroneDetailPopup from '../../ui/DroneDetailPopup.jsx';
import ShipComponentDetailPopup from '../../ui/ShipComponentDetailPopup.jsx';
import ViewDeckModal from '../../modals/ViewDeckModal.jsx';
import DeckExportModal from '../../modals/DeckExportModal.jsx';
import DeckImportModal from '../../modals/DeckImportModal.jsx';
import DeckLoadModal from '../../modals/DeckLoadModal.jsx';
import CardFilterModal from '../../modals/CardFilterModal.jsx';
import DroneFilterModal from '../../modals/DroneFilterModal.jsx';
import { getAllShips, getDefaultShip } from '../../../data/shipData.js';
import useDeckBuilderData from './hooks/useDeckBuilderData.js';
import { debugLog } from '../../../utils/debugLogger.js';
import { DEV_CONFIG } from '../../../config/devConfig.js';

const DeckBuilder = ({
  selectedDrones,
  fullCardCollection,
  deck,
  onDeckChange,
  onDronesChange,
  selectedShipComponents,
  onShipComponentsChange,
  selectedShip = null,         // Selected ship card (null = use default)
  onShipChange,                // Callback when ship selection changes
  onConfirmDeck,
  onImportDeck,
  onBack,
  // Preserved fields for import/export round-trip
  preservedFields = {},        // Fields preserved from import (name, description, etc.)
  onPreservedFieldsChange,     // Callback when preserved fields change
  // Extraction mode props
  maxDrones = 10,              // 5 for extraction, 10 for multiplayer
  droneInstances = [],         // For damage display (yellow triangle)
  componentInstances = [],     // For hull display (health bar)
  readOnly = false,            // For Slot 0 view-only mode
  allowInvalidSave = false,    // Allow save with invalid deck
  mode = 'multiplayer',        // 'multiplayer' | 'extraction'
  onSaveInvalid,               // Callback for saving invalid deck
  deckName = '',               // Current deck name (extraction mode)
  onDeckNameChange,            // Callback for name change
  availableDrones = null,      // Filtered drone collection (extraction mode)
  availableComponents = null,  // Filtered component collection (extraction mode)
  availableShips = null,       // Filtered ship collection (extraction mode)
  // Ship Configuration Tab props (extraction mode only)
  shipSlot = null,             // Current ship slot for configuration tab
  droneSlots = null,           // Current drone slots being edited (for config tab display)
  credits = 0,                 // Player's credits for repairs
  onRepairDroneSlot = null,    // Callback when drone slot is repaired
  onRepairSectionSlot = null   // Callback when section slot is repaired
}) => {
  // Use provided ship or default
  const activeShip = selectedShip || getDefaultShip();
  // In extraction mode, use filtered ships; otherwise show all
  const allShips = availableShips || getAllShips();
  const [detailedCard, setDetailedCard] = useState(null);
  const [detailedDrone, setDetailedDrone] = useState(null);
  const [detailedShipComponent, setDetailedShipComponent] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLoadDeckModal, setShowLoadDeckModal] = useState(false);
  const [showViewDeckModal, setShowViewDeckModal] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Panel view toggles
  const [leftPanelView, setLeftPanelView] = useState('shipCard'); // 'shipCard', 'cards', 'drones', or 'ship'
  const [rightPanelView, setRightPanelView] = useState('shipCard'); // 'shipCard', 'deck', 'drones', 'ship', or 'config' (extraction only)

  // Mobile responsive: which panel is visible on small screens
  const [mobileActivePanel, setMobileActivePanel] = useState('left'); // 'left' or 'right'

  // Card filters - new popup-based filter system
  const [filters, setFilters] = useState({
    searchText: '',
    cost: { min: 0, max: 99 }, // Temporary values, updated by effect
    rarity: [],
    type: [],
    target: [],
    damageType: [],
    abilities: [],
    hideEnhanced: false,
    includeAIOnly: false,
  });
  const [showCardFilterModal, setShowCardFilterModal] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  // Drone filters - new popup-based filter system
  const [droneFilters, setDroneFilters] = useState({
    searchText: '',
    rarity: [],
    class: [],
    abilities: [],
    damageType: [],
    includeAIOnly: false,
  });
  const [showDroneFilterModal, setShowDroneFilterModal] = useState(false);
  const [droneSortConfig, setDroneSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const [activeChartView, setActiveChartView] = useState('cost');
  const [isStatsVisible, setIsStatsVisible] = useState(true);

  // View mode toggles for cards and drones (table or grid)
  const [cardsViewMode, setCardsViewMode] = useState('table'); // 'table' or 'grid'
  const [dronesViewMode, setDronesViewMode] = useState('table'); // 'table' or 'grid'

  // --- Data Processing Hook ---
  const {
    processedCardCollection, processedDroneCollection, activeComponentCollection,
    filterOptions, droneFilterOptions,
    cardCount, deckListForDisplay, baseCardCounts, typeCounts,
    typeLimits, totalCardLimit, typeValid, isDeckValid,
    droneCount, droneListForDisplay, isDronesValid,
    shipComponentCount, shipComponentsValid,
    deckStats, droneStats, viewDeckData,
    filteredAndSortedCards, filteredAndSortedDrones,
  } = useDeckBuilderData({
    fullCardCollection, availableDrones, availableComponents,
    deck, selectedDrones, selectedShipComponents,
    mode, activeShip, maxDrones,
    filters, sortConfig, droneFilters, droneSortConfig,
  });

  // Initialize cost filter range once filter options are calculated
  useEffect(() => {
    if (filterOptions.minCost !== Infinity && filterOptions.maxCost !== -Infinity) {
      setFilters(prev => ({
        ...prev,
        cost: { min: filterOptions.minCost, max: filterOptions.maxCost }
      }));
    }
  }, [filterOptions.minCost, filterOptions.maxCost]);

  const handleSaveWithToast = () => {
    debugLog('DECK_BUILDER', 'handleSaveWithToast', { mode, readOnly });
    onConfirmDeck();

    if (!readOnly) {
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 1500);
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const requestDroneSort = (key) => {
    let direction = 'ascending';
    if (droneSortConfig.key === key && droneSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setDroneSortConfig({ key, direction });
  };

  // Handler for removing filter chips
  const handleRemoveCardFilterChip = (filterType, filterValue) => {
    setFilters(prev => {
      if (filterType === 'searchText') {
        return { ...prev, searchText: '' };
      }
      if (filterType === 'cost') {
        return { ...prev, cost: { min: filterOptions.minCost, max: filterOptions.maxCost } };
      }
      if (filterType === 'hideEnhanced') {
        return { ...prev, hideEnhanced: false };
      }
      if (filterType === 'includeAIOnly') {
        return { ...prev, includeAIOnly: false };
      }
      // Array filters - remove specific value
      const current = prev[filterType] || [];
      return { ...prev, [filterType]: current.filter(v => v !== filterValue) };
    });
  };

  const handleRemoveDroneFilterChip = (filterType, filterValue) => {
    setDroneFilters(prev => {
      if (filterType === 'searchText') {
        return { ...prev, searchText: '' };
      }
      if (filterType === 'includeAIOnly') {
        return { ...prev, includeAIOnly: false };
      }
      // Array filters - remove specific value
      const current = prev[filterType] || [];
      return { ...prev, [filterType]: current.filter(v => v !== filterValue) };
    });
  };

  const resetFilters = () => {
    setFilters({
      searchText: '',
      cost: { min: filterOptions.minCost, max: filterOptions.maxCost },
      rarity: [],
      type: [],
      target: [],
      damageType: [],
      abilities: [],
      hideEnhanced: false,
      includeAIOnly: false,
    });
  };

  const resetDroneFilters = () => {
    setDroneFilters({
      searchText: '',
      rarity: [],
      class: [],
      abilities: [],
      damageType: [],
      includeAIOnly: false,
    });
  };

  const resetDeck = () => {
    // Clear all cards from the deck by setting each to 0
    Object.keys(deck).forEach(cardId => {
      if (deck[cardId] > 0) {
        onDeckChange(cardId, 0);
      }
    });
  };

  const resetDrones = () => {
    // Clear all drones from the selection by setting each to 0
    Object.keys(selectedDrones || {}).forEach(droneName => {
      if (selectedDrones[droneName] > 0) {
        onDronesChange(droneName, 0);
      }
    });
  };

  const leftPanelProps = {
    leftPanelView, setLeftPanelView, setRightPanelView,
    mobileActivePanel,
    cardsViewMode, setCardsViewMode, dronesViewMode, setDronesViewMode,
    setShowViewDeckModal, setShowLoadDeckModal, setShowImportModal, setShowExportModal,
    setShowCardFilterModal, setShowDroneFilterModal,
    allShips, activeShip, onShipChange,
    filteredAndSortedCards, filterOptions, filters, sortConfig,
    deck, baseCardCounts,
    filteredAndSortedDrones, droneFilters, droneSortConfig, selectedDrones,
    activeComponentCollection, selectedShipComponents,
    onDeckChange, onDronesChange, onShipComponentsChange,
    requestSort, requestDroneSort,
    handleRemoveCardFilterChip, handleRemoveDroneFilterChip,
    resetFilters, resetDroneFilters,
    setDetailedCard, setDetailedDrone, setDetailedShipComponent,
    mode, readOnly,
  };

  const rightPanelProps = {
    rightPanelView, setRightPanelView,
    mobileActivePanel,
    cardCount, totalCardLimit, droneCount, maxDrones,
    shipComponentCount, isDeckValid, isDronesValid, shipComponentsValid,
    activeShip,
    deckListForDisplay, baseCardCounts, deck, onDeckChange,
    typeLimits, typeCounts,
    droneListForDisplay, droneInstances, onDronesChange,
    selectedShipComponents, activeComponentCollection, componentInstances,
    deckStats, droneStats, activeChartView, setActiveChartView,
    isStatsVisible, setIsStatsVisible,
    shipSlot, droneSlots, credits, onRepairDroneSlot, onRepairSectionSlot,
    handleSaveWithToast, showSaveToast, setShowSaveToast,
    allowInvalidSave, onSaveInvalid,
    resetDeck, resetDrones, onShipComponentsChange,
    setDetailedCard, setDetailedDrone,
    mode, readOnly,
  };

  return (
    <>
    <div className="w-full flex flex-col text-white font-exo mt-8 text-sm">
      {detailedCard && <CardDetailPopup card={detailedCard} onClose={() => setDetailedCard(null)} />}
      {detailedDrone && <DroneDetailPopup drone={detailedDrone} onClose={() => setDetailedDrone(null)} />}
      {detailedShipComponent && <ShipComponentDetailPopup component={detailedShipComponent} onClose={() => setDetailedShipComponent(null)} ship={activeShip} />}
      {showExportModal && <DeckExportModal deck={deck} selectedDrones={selectedDrones} selectedShipComponents={selectedShipComponents} activeShip={activeShip} preservedFields={preservedFields} onClose={() => setShowExportModal(false)} />}
      {showImportModal && <DeckImportModal onImportDeck={onImportDeck} onClose={() => setShowImportModal(false)} />}
      {showLoadDeckModal && <DeckLoadModal onImportDeck={onImportDeck} onClose={() => setShowLoadDeckModal(false)} />}
      <ViewDeckModal
        isOpen={showViewDeckModal}
        onClose={() => setShowViewDeckModal(false)}
        title="Your Deck & Drones"
        drones={viewDeckData.drones}
        cards={viewDeckData.cards}
        shipComponents={selectedShipComponents || {}}
        ship={activeShip}
      />

      {/* Card Filter Modal */}
      <CardFilterModal
        isOpen={showCardFilterModal}
        onClose={() => setShowCardFilterModal(false)}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        mode={mode}
        devMode={DEV_CONFIG.enabled}
      />

      {/* Drone Filter Modal */}
      <DroneFilterModal
        isOpen={showDroneFilterModal}
        onClose={() => setShowDroneFilterModal(false)}
        filters={droneFilters}
        onFiltersChange={setDroneFilters}
        filterOptions={droneFilterOptions}
        mode={mode}
        devMode={DEV_CONFIG.enabled}
      />

      <div className="flex justify-between items-center mb-4 px-4">
        {/* Left: Back button */}
        <div className="w-32">
          {onBack && (
            <button onClick={onBack} className="dw-btn dw-btn-cancel flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
          )}
        </div>

        {/* Center: Title or Deck Name Input */}
        {mode === 'extraction' && onDeckNameChange && !readOnly ? (
          <input
            type="text"
            value={deckName}
            onChange={(e) => onDeckNameChange(e.target.value)}
            className="bg-slate-700 border border-cyan-500/50 rounded px-4 py-2 text-white font-orbitron text-xl text-center w-80 focus:outline-none focus:border-cyan-400"
            placeholder="Enter deck name..."
          />
        ) : (
          <h1 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            {mode === 'extraction' && readOnly ? 'Starter Deck (Read-Only)' : 'Deck Builder'}
          </h1>
        )}

        {/* Right: Spacer to balance layout */}
        <div className="w-32" />
      </div>
      
      {/* Mobile Panel Toggle - visible only on small screens */}
      <div className="flex lg:hidden mb-2 mx-[10px] rounded-lg overflow-hidden border border-cyan-500/30">
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            mobileActivePanel === 'left'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setMobileActivePanel('left')}
        >
          Available
        </button>
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            mobileActivePanel === 'right'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => setMobileActivePanel('right')}
        >
          Your Deck
        </button>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 mb-[10px]">

        <DeckBuilderLeftPanel {...leftPanelProps} />

        <DeckBuilderRightPanel {...rightPanelProps} />
      </div>
     </div>

    </>
  );
};

export default DeckBuilder;