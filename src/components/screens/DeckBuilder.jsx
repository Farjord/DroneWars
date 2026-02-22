import React, { useState, useEffect } from 'react';
import { Eye, ArrowLeft, AlertTriangle, Settings } from 'lucide-react';
import DeckStatisticsCharts from '../ui/DeckStatisticsCharts.jsx';
import DeckBuilderLeftPanel from '../ui/DeckBuilderLeftPanel.jsx';
import ShipCard from '../ui/ShipCard.jsx';
import CardDetailPopup from '../ui/CardDetailPopup.jsx';
import DroneDetailPopup from '../ui/DroneDetailPopup.jsx';
import ShipComponentDetailPopup from '../ui/ShipComponentDetailPopup.jsx';
import ViewDeckModal from '../modals/ViewDeckModal.jsx';
import DeckExportModal from '../modals/DeckExportModal.jsx';
import DeckImportModal from '../modals/DeckImportModal.jsx';
import DeckLoadModal from '../modals/DeckLoadModal.jsx';
import ShipConfigurationTab from '../ui/ShipConfigurationTab.jsx';
import CardFilterModal from '../modals/CardFilterModal.jsx';
import DroneFilterModal from '../modals/DroneFilterModal.jsx';
import { getAllShips, getDefaultShip } from '../../data/shipData.js';
import useDeckBuilderData from '../../hooks/useDeckBuilderData.js';
import { debugLog } from '../../utils/debugLogger.js';
import { DEV_CONFIG } from '../../config/devConfig.js';


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

        {/* Right Side: Your Items */}
        <div className={`w-full lg:w-1/3 ${mobileActivePanel === 'left' ? 'hidden lg:flex' : 'flex'} flex-col dw-panel h-[calc(100vh-140px)] lg:h-[calc(100vh-99px)] mx-[10px] lg:mr-[10px] lg:ml-0`}>
          <div className="dw-panel-header">
            <div className="dw-modal-tabs" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0, flexWrap: 'wrap' }}>
              <button
                onClick={() => setRightPanelView('shipCard')}
                className={`dw-modal-tab ${rightPanelView === 'shipCard' ? 'dw-modal-tab--active' : ''}`}
              >
                Ship
              </button>
              <button
                onClick={() => setRightPanelView('deck')}
                className={`dw-modal-tab ${rightPanelView === 'deck' ? 'dw-modal-tab--active' : ''}`}
              >
                Deck ({cardCount}/{totalCardLimit})
              </button>
              <button
                onClick={() => setRightPanelView('drones')}
                className={`dw-modal-tab ${rightPanelView === 'drones' ? 'dw-modal-tab--active' : ''}`}
              >
                Drones ({droneCount}/{maxDrones})
              </button>
              <button
                onClick={() => setRightPanelView('ship')}
                className={`dw-modal-tab ${rightPanelView === 'ship' ? 'dw-modal-tab--active' : ''}`}
              >
                Components ({shipComponentCount}/3)
              </button>
              {/* Config tab only appears in extraction mode */}
              {mode === 'extraction' && shipSlot && (
                <button
                  onClick={() => setRightPanelView('config')}
                  className={`dw-modal-tab ${rightPanelView === 'config' ? 'dw-modal-tab--active' : ''}`}
                >
                  <Settings size={14} className="inline mr-1" />
                  Config
                </button>
              )}
            </div>
            <button
              onClick={readOnly ? undefined : (rightPanelView === 'deck' ? resetDeck : rightPanelView === 'drones' ? resetDrones : () => onShipComponentsChange(null, null))}
              disabled={readOnly}
              className={`dw-btn dw-btn-secondary ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Reset
            </button>
          </div>

          {/* SELECTED SHIP VIEW */}
          {rightPanelView === 'shipCard' && (
            <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
              {activeShip ? (
                <div className="flex flex-col items-center">
                  <ShipCard
                    ship={activeShip}
                    onClick={() => {}}
                    isSelectable={false}
                    isSelected={false}
                    scale={0.75}
                  />
                  <div className="dw-info-box mt-4 w-full">
                    <h4 className="dw-info-box-title">Deck Limits</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="dw-info-row">
                        <span className="dw-info-row-label">Total Cards:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.totalCards}</span>
                      </div>
                      <div className="dw-info-row">
                        <span className="dw-info-row-label dw-info-row-label--ordnance">Ordnance:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.ordnanceLimit}</span>
                      </div>
                      <div className="dw-info-row">
                        <span className="dw-info-row-label dw-info-row-label--tactic">Tactic:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.tacticLimit}</span>
                      </div>
                      <div className="dw-info-row">
                        <span className="dw-info-row-label dw-info-row-label--support">Support:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.supportLimit}</span>
                      </div>
                      <div className="dw-info-row">
                        <span className="dw-info-row-label dw-info-row-label--upgrade">Upgrade:</span>
                        <span className="dw-info-row-value">{activeShip.deckLimits.upgradeLimit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dw-empty-state">
                  No ship selected. Go to the Ship tab to select one.
                </div>
              )}
            </div>
          )}

          {/* DECK LIST VIEW */}
          {rightPanelView === 'deck' && (
          <div className="flex-grow overflow-y-auto pr-2 deck-list dw-modal-scroll">
            {deckListForDisplay.length > 0 ? (
              deckListForDisplay.map(card => {
                const isAtMax = baseCardCounts[card.baseCardId] >= card.maxInDeck;
                return (
                  <div key={card.id} className="deck-list-item">
                    <button
                      onClick={() => setDetailedCard(card)}
                      className="p-1 text-gray-400 hover:text-white flex-shrink-0 mr-3"
                      title="View Card Details"
                    >
                      <Eye size={18} />
                    </button>
                    <span className="flex-grow truncate" title={card.name}>{card.name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => !readOnly && onDeckChange(card.id, card.quantity - 1)}
                        disabled={readOnly}
                        className={`deck-edit-btn ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        -
                      </button>
                      <span className="font-bold w-8 text-center">x {card.quantity}</span>
                      <button
                        onClick={() => !readOnly && onDeckChange(card.id, card.quantity + 1)}
                        disabled={readOnly || isAtMax}
                        className={`deck-edit-btn ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 italic">Your deck is empty. Add cards from the left.</p>
            )}
          </div>
          )}

          {/* CARD TYPE COUNTS DISPLAY */}
          {rightPanelView === 'deck' && cardCount > 0 && (
            <div className="dw-type-stats">
              <h3 className="dw-type-stats-title">Card Types</h3>
              <div className="space-y-1">
                {Object.entries(typeLimits).map(([type, limit]) => {
                  const count = typeCounts[type] || 0;
                  const isOverLimit = count > limit;
                  const percentage = (count / limit) * 100;
                  const typeClass = type.toLowerCase();
                  return (
                    <div key={type} className="dw-type-stats-row">
                      <span className={`dw-type-stats-label ${isOverLimit ? 'dw-type-stats-label--danger' : `dw-type-stats-label--${typeClass}`}`}>
                        {type}:
                      </span>
                      <div className="dw-progress-bar">
                        <div
                          className={`dw-progress-bar-fill ${isOverLimit ? 'dw-progress-bar-fill--danger' : 'dw-progress-bar-fill--action'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                        <span className="dw-progress-bar-label">
                          {count}/{limit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DRONE LIST VIEW */}
          {rightPanelView === 'drones' && (
          <div className="flex-grow overflow-y-auto pr-2 deck-list dw-modal-scroll">
            {droneListForDisplay.length > 0 ? (
              droneListForDisplay.map(drone => {
                // Check for damage indicator (extraction mode only)
                const droneInstance = droneInstances.find(i => i.droneName === drone.name);
                const isDamaged = drone.hasDamagedInstance || droneInstance?.isDamaged;

                return (
                  <div key={drone.name} className={`deck-list-item ${isDamaged ? 'bg-yellow-900/20 border-l-2 border-yellow-500' : ''}`}>
                    {/* Damage indicator */}
                    {isDamaged && (
                      <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mr-2" title="Damaged - Cannot deploy until repaired" />
                    )}
                    {/* Eye icon to view drone details */}
                    <button
                      onClick={() => setDetailedDrone(drone)}
                      className="p-1 text-gray-400 hover:text-white flex-shrink-0 mr-3"
                      title="View Drone Details"
                    >
                      <Eye size={18} />
                    </button>
                    <span className="flex-grow truncate" title={drone.name}>{drone.name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => onDronesChange(drone.name, 0)}
                        disabled={readOnly}
                        className="deck-edit-btn"
                      >
                        -
                      </button>
                      <span className="font-bold w-8 text-center">x {drone.quantity}</span>
                      <button
                        onClick={() => onDronesChange(drone.name, 1)}
                        disabled={readOnly || droneCount >= maxDrones}
                        className="deck-edit-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 italic">Your drone pool is empty. Add drones from the left.</p>
            )}
          </div>
          )}

          {/* SHIP COMPONENTS VIEW */}
          {rightPanelView === 'ship' && (
          <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
            <div className="flex flex-col gap-4">
              {/* Display ship layout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['l', 'm', 'r'].map((lane, index) => {
                  const componentEntry = Object.entries(selectedShipComponents || {}).find(([id, l]) => l === lane);
                  const component = componentEntry ? activeComponentCollection.find(c => c.id === componentEntry[0]) : null;

                  return (
                    <div key={lane} className={`p-4 rounded-lg border-2 ${component ? 'border-cyan-500 bg-cyan-900/10' : 'border-dashed border-gray-600 bg-gray-800/30'}`}>
                      <div className="text-center mb-2">
                        <span className="font-bold text-sm text-cyan-400">
                          {index === 1 ? 'MIDDLE (Bonus)' : index === 0 ? 'LEFT' : 'RIGHT'}
                        </span>
                      </div>
                      {component ? (
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">{component.type}</div>
                          <div className="font-bold text-white mb-2">{component.name}</div>
                          <div className="text-xs text-gray-500 mb-2">{component.description}</div>
                          {index === 1 && (
                            <div className="text-xs text-cyan-300 font-semibold">
                              + Bonus Stats
                            </div>
                          )}
                          {/* Hull display for extraction mode */}
                          {mode === 'extraction' && componentInstances.length > 0 && (() => {
                            const inst = componentInstances.find(i => i.componentId === componentEntry[0]);
                            if (inst) {
                              const hullPercent = (inst.currentHull / inst.maxHull) * 100;
                              const isDamaged = inst.currentHull < inst.maxHull;
                              return (
                                <div className="mt-2 p-2 bg-gray-800/50 rounded">
                                  <div className="text-xs text-gray-400 mb-1">Hull</div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-grow bg-gray-700 rounded h-2 overflow-hidden">
                                      <div
                                        className={`h-full transition-all ${hullPercent < 50 ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${hullPercent}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold">{inst.currentHull}/{inst.maxHull}</span>
                                  </div>
                                  {isDamaged && (
                                    <div className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                      <AlertTriangle size={12} /> Repair Needed
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 italic text-xs py-4">
                          No component
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* List view of selected components */}
              {shipComponentCount > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-gray-400 mb-2">Selected Components</h4>
                  <div className="deck-list">
                    {Object.entries(selectedShipComponents || {})
                      .filter(([id, lane]) => lane)
                      .map(([id, lane]) => {
                        const component = activeComponentCollection.find(c => c.id === id);
                        if (!component) return null;

                        return (
                          <div key={id} className="deck-list-item">
                            <span className="flex-grow truncate" title={component.name}>
                              {component.name} ({component.type})
                            </span>
                            <span className="font-bold text-cyan-400">
                              Lane: {lane.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {shipComponentCount === 0 && (
                <p className="text-gray-500 italic text-center py-8">
                  No ship components selected. Select components from the left.
                </p>
              )}
            </div>
          </div>
          )}

          {/* SHIP CONFIGURATION VIEW (Extraction mode only) */}
          {rightPanelView === 'config' && mode === 'extraction' && shipSlot && (
            <ShipConfigurationTab
              shipSlot={shipSlot}
              droneSlots={droneSlots}
              credits={credits}
              onRepairDroneSlot={onRepairDroneSlot}
              onRepairSectionSlot={onRepairSectionSlot}
              readOnly={readOnly}
            />
          )}

          {/* --- Statistics Section --- */}
          <DeckStatisticsCharts
            rightPanelView={rightPanelView}
            cardCount={cardCount}
            droneCount={droneCount}
            deckStats={deckStats}
            droneStats={droneStats}
            deckListForDisplay={deckListForDisplay}
            activeChartView={activeChartView}
            setActiveChartView={setActiveChartView}
            isStatsVisible={isStatsVisible}
            setIsStatsVisible={setIsStatsVisible}
          />

                    {/* Save/Confirm Button - hidden in readOnly mode */}
                    {!readOnly && (
                      <>
                        {/* Save confirmation toast - appears above button */}
                        {showSaveToast && (
                          <div className="save-toast-inline">
                            <span className="save-toast-icon">✓</span>
                            <span className="save-toast-text">Deck Saved!</span>
                          </div>
                        )}
                        {allowInvalidSave ? (
                          // Extraction mode: can save incomplete, but with warning
                          <button
                            onClick={isDeckValid && isDronesValid && shipComponentsValid ? handleSaveWithToast : () => { onSaveInvalid(); setShowSaveToast(true); setTimeout(() => setShowSaveToast(false), 1500); }}
                            className={`w-full p-4 mt-4 text-lg font-bold font-orbitron dw-btn-no-scale ${
                              isDeckValid && isDronesValid && shipComponentsValid
                                ? 'dw-btn dw-btn-confirm'
                                : 'bg-yellow-600 hover:bg-yellow-500 text-black'
                            }`}
                            title={!shipComponentsValid ? 'You must select all 3 ship components with lanes assigned' : ''}
                          >
                            {isDeckValid && isDronesValid && shipComponentsValid
                              ? 'Save Deck'
                              : 'Save Incomplete Deck'}
                          </button>
                        ) : (
                          // Multiplayer mode: must be complete
                          <button
                            onClick={handleSaveWithToast}
                            disabled={!isDeckValid || !isDronesValid || !shipComponentsValid}
                            className="dw-btn dw-btn-confirm w-full p-4 mt-4 text-lg font-bold font-orbitron dw-btn-no-scale disabled:opacity-50"
                            title={!shipComponentsValid ? 'You must select all 3 ship components with lanes assigned' : ''}
                          >
                            Confirm Deck, Drones & Ship
                          </button>
                        )}
                        {/* Validation warnings for extraction mode */}
                        {allowInvalidSave && (!isDeckValid || !isDronesValid || !shipComponentsValid) && (
                          <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded text-xs text-yellow-300">
                            <div className="flex items-center gap-1 font-semibold mb-1">
                              <AlertTriangle size={14} /> Deck Incomplete - Cannot Deploy
                            </div>
                            {!isDeckValid && <div>Need {totalCardLimit} cards (have {Object.values(deck || {}).reduce((sum, qty) => sum + qty, 0)})</div>}
                            {!isDronesValid && <div>Need {maxDrones} drones (have {droneCount})</div>}
                            {!shipComponentsValid && <div>Need 3 ship components with unique lanes</div>}
                          </div>
                        )}
                      </>
                    )}
                    {readOnly && (
                      <div className="text-center text-gray-500 italic mt-4 p-4 bg-gray-800/50 rounded">
                        Viewing Starter Deck (Read Only)
                      </div>
                    )}
        </div>
      </div>
     </div>

    </>
  );
};

export default DeckBuilder;