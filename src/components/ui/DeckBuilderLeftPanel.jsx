import React from 'react';
import { Eye, Upload, Download, Grid, LayoutGrid, List, Rocket, Filter } from 'lucide-react';
import ShipCard from './ShipCard.jsx';
import ActionCard from './ActionCard.jsx';
import DroneCard from './DroneCard.jsx';
import FilterChip from './FilterChip.jsx';
import { getTypeBackgroundClass, getTypeTextClass, getRarityDisplay } from '../../logic/cards/cardTypeStyles.js';
import { calculateEffectiveMaxForCard } from '../../logic/singlePlayer/singlePlayerDeckUtils.js';
import {
  countActiveFilters,
  countActiveDroneFilters,
  generateFilterChips,
  generateDroneFilterChips,
} from '../../logic/cards/deckFilterUtils.js';

const DeckBuilderLeftPanel = ({
  leftPanelView, setLeftPanelView, setRightPanelView,
  mobileActivePanel,
  cardsViewMode, setCardsViewMode,
  dronesViewMode, setDronesViewMode,
  setShowViewDeckModal, setShowLoadDeckModal,
  setShowImportModal, setShowExportModal,
  setShowCardFilterModal, setShowDroneFilterModal,
  allShips, activeShip, onShipChange,
  filteredAndSortedCards, filterOptions, filters, sortConfig,
  deck, baseCardCounts,
  filteredAndSortedDrones, droneFilters, droneSortConfig,
  selectedDrones,
  activeComponentCollection, selectedShipComponents,
  onDeckChange, onDronesChange, onShipComponentsChange,
  requestSort, requestDroneSort,
  handleRemoveCardFilterChip, handleRemoveDroneFilterChip,
  resetFilters, resetDroneFilters,
  setDetailedCard, setDetailedDrone, setDetailedShipComponent,
  mode, readOnly,
}) => {
  return (
    <div className={`w-full lg:w-2/3 ${mobileActivePanel === 'right' ? 'hidden lg:flex' : 'flex'} flex-col dw-panel h-[calc(100vh-140px)] lg:h-[calc(100vh-99px)] mx-[10px] lg:ml-[10px] lg:mr-0`}>
      <div className="dw-panel-header">
        {/* Main navigation tabs */}
        <div className="dw-modal-tabs" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <button
            onClick={() => {
              setLeftPanelView('shipCard');
              setRightPanelView('shipCard');
            }}
            className={`dw-modal-tab ${leftPanelView === 'shipCard' ? 'dw-modal-tab--active' : ''}`}
          >
            Ship
          </button>
          <button
            onClick={() => {
              setLeftPanelView('ship');
              setRightPanelView('ship');
            }}
            className={`dw-modal-tab ${leftPanelView === 'ship' ? 'dw-modal-tab--active' : ''}`}
          >
            Ship Sections
          </button>
          <button
            onClick={() => {
              setLeftPanelView('drones');
              setRightPanelView('drones');
            }}
            className={`dw-modal-tab ${leftPanelView === 'drones' ? 'dw-modal-tab--active' : ''}`}
          >
            Drones
          </button>
          <button
            onClick={() => {
              setLeftPanelView('cards');
              setRightPanelView('deck');
            }}
            className={`dw-modal-tab ${leftPanelView === 'cards' ? 'dw-modal-tab--active' : ''}`}
          >
            Cards
          </button>
          {/* Utility buttons */}
          <button
            onClick={() => setShowViewDeckModal(true)}
            className="dw-modal-tab"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Grid size={14} />
            View Deck
          </button>
          <button
            onClick={() => setShowLoadDeckModal(true)}
            className="dw-modal-tab"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Rocket size={14} />
            Load Deck
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="dw-modal-tab"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="dw-modal-tab"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            Export
          </button>
        </div>
        {/* View mode and filter controls */}
        <div className="flex gap-2 items-center">
          {leftPanelView === 'cards' && (
            <>
              <button
                onClick={() => setCardsViewMode('table')}
                className={`dw-modal-tab ${cardsViewMode === 'table' ? 'dw-modal-tab--active' : ''}`}
                title="Table View"
                style={{ padding: '6px 10px' }}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setCardsViewMode('grid')}
                className={`dw-modal-tab ${cardsViewMode === 'grid' ? 'dw-modal-tab--active' : ''}`}
                title="Grid View"
                style={{ padding: '6px 10px' }}
              >
                <LayoutGrid size={16} />
              </button>
            </>
          )}
          {leftPanelView === 'drones' && (
            <>
              <button
                onClick={() => setDronesViewMode('table')}
                className={`dw-modal-tab ${dronesViewMode === 'table' ? 'dw-modal-tab--active' : ''}`}
                title="Table View"
                style={{ padding: '6px 10px' }}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setDronesViewMode('grid')}
                className={`dw-modal-tab ${dronesViewMode === 'grid' ? 'dw-modal-tab--active' : ''}`}
                title="Grid View"
                style={{ padding: '6px 10px' }}
              >
                <LayoutGrid size={16} />
              </button>
            </>
          )}
          <button
            onClick={leftPanelView === 'cards' ? resetFilters : resetDroneFilters}
            className="dw-btn dw-btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* SHIP CARD VIEW */}
      {leftPanelView === 'shipCard' && (
        <div className="flex-1 overflow-y-auto dw-modal-scroll">
          <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-cyan-700/50">
            <h3 className="text-lg font-orbitron text-cyan-400 mb-2">Select Your Ship</h3>
            <p className="text-sm text-gray-400">
              Choose a ship to define your deck composition limits. Each ship has different hull, shields, and thresholds,
              as well as unique deck building constraints.
            </p>
          </div>
          <div className="flex flex-col gap-4 px-2">
            {allShips.map(ship => (
              <ShipCard
                key={ship.id}
                ship={ship}
                onClick={() => onShipChange && onShipChange(ship)}
                isSelectable={!readOnly && !!onShipChange}
                isSelected={activeShip?.id === ship.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* CARDS VIEW */}
      {leftPanelView === 'cards' && (
      <>
      {/* --- Filter Button + Chips (shown in both table and grid view) --- */}
      <div className="dw-filter-header">
        <button
          className="dw-filter-btn"
          onClick={() => setShowCardFilterModal(true)}
        >
          <Filter size={16} />
          <span>Filters</span>
          {countActiveFilters(filters, filterOptions) > 0 && (
            <span className="dw-filter-btn__count">
              {countActiveFilters(filters, filterOptions)}
            </span>
          )}
        </button>
        <div className="dw-filter-chips">
          {generateFilterChips(filters, filterOptions).map((chip, index) => (
            <FilterChip
              key={`${chip.filterType}-${chip.filterValue || index}`}
              label={chip.label}
              filterType={chip.filterType}
              filterValue={chip.filterValue}
              onRemove={handleRemoveCardFilterChip}
            />
          ))}
        </div>
      </div>

      {/* TABLE VIEW */}
      {cardsViewMode === 'table' && (
      <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
        <table className="w-full text-left deck-builder-table">
          <thead>
            <tr>
              <th>Info</th>
              <th><button onClick={() => requestSort('name')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'name' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Name{sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestSort('type')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'type' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Type{sortConfig.key === 'type' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestSort('rarity')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'rarity' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Rarity{sortConfig.key === 'rarity' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestSort('cost')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'cost' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Cost{sortConfig.key === 'cost' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestSort('description')} className={`w-full text-left transition-colors underline cursor-pointer ${sortConfig.key === 'description' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Description{sortConfig.key === 'description' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th>Abilities</th>
              <th>Targeting</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedCards.map((card, index) => {
              const currentCountForThisVariant = deck[card.id] || 0;
              const totalCountForBaseCard = baseCardCounts[card.baseCardId] || 0;
              const maxInDeck = card.maxInDeck;

              return (
                <tr key={`${card.id}-${index}`} className={getTypeBackgroundClass(card.type)}>
                  <td><button onClick={() => setDetailedCard(card)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                  <td className="font-bold">{card.name}</td>
                  <td className={`font-semibold ${getTypeTextClass(card.type)}`}>{card.type}</td>
                  <td style={{ color: getRarityDisplay(card, mode).color }}>{getRarityDisplay(card, mode).text}</td>
                  <td>{card.cost}</td>
                  <td className="text-xs text-gray-400">{card.description}</td>
                  <td><div className="flex flex-wrap gap-2">{card.keywords.map(k => <span key={k} className="ability-chip">{k}</span>)}</div></td>
                  <td className="text-xs">{card.targetingText === 'N/A' ? <span className="text-gray-500">N/A</span> : card.targetingText}</td>
                  <td>
                    <div className="quantity-buttons">
                      {(() => {
                        const effectiveMax = calculateEffectiveMaxForCard({
                          maxInDeck: card.maxInDeck,
                          availableQuantity: card.availableQuantity,
                          currentCountInDeck: currentCountForThisVariant,
                          totalBaseCardCountInDeck: totalCountForBaseCard
                        });
                        return Array.from({ length: maxInDeck + 1 }).map((_, i) => {
                          const isSelected = i === currentCountForThisVariant;
                          const isUnavailable = i > effectiveMax;
                          return (
                            <button
                              key={i}
                              onClick={() => !readOnly && !isUnavailable && onDeckChange(card.id, i)}
                              className={`quantity-btn ${isSelected ? 'selected' : ''} ${isUnavailable ? 'unavailable' : ''} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={readOnly || isUnavailable}
                            >
                              {i}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* GRID VIEW */}
      {cardsViewMode === 'grid' && (
      <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedCards.map((card, index) => {
            const currentCountForThisVariant = deck[card.id] || 0;
            const totalCountForBaseCard = baseCardCounts[card.baseCardId] || 0;
            const effectiveMax = calculateEffectiveMaxForCard({
              maxInDeck: card.maxInDeck,
              availableQuantity: card.availableQuantity,
              currentCountInDeck: currentCountForThisVariant,
              totalBaseCardCountInDeck: totalCountForBaseCard
            });
            const isAtMax = currentCountForThisVariant >= effectiveMax;

            return (
              <div key={`${card.id}-${index}`} className="flex flex-col items-center gap-2">
                {/* Card Component with AI Badge Overlay */}
                <div className="relative">
                  <ActionCard
                    card={card}
                    onClick={() => setDetailedCard(card)}
                    isPlayable={true}
                    isSelected={false}
                    mandatoryAction={null}
                    excessCards={0}
                    scale={1.0}
                  />
                  {card.aiOnly && (
                    <div className="dw-ai-badge">AI</div>
                  )}
                </div>
                {/* Quantity Controls */}
                <div className="dw-quantity-control">
                  <button
                    onClick={() => !readOnly && currentCountForThisVariant > 0 && onDeckChange(card.id, currentCountForThisVariant - 1)}
                    disabled={readOnly || currentCountForThisVariant === 0}
                    className={`dw-quantity-btn ${readOnly ? 'opacity-50' : ''}`}
                  >
                    -
                  </button>
                  <span className="dw-quantity-value">
                    {currentCountForThisVariant}/{effectiveMax}
                  </span>
                  <button
                    onClick={() => !readOnly && !isAtMax && onDeckChange(card.id, currentCountForThisVariant + 1)}
                    disabled={readOnly || isAtMax}
                    className={`dw-quantity-btn ${readOnly ? 'opacity-50' : ''}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
      </>
      )}

      {/* DRONES VIEW */}
      {leftPanelView === 'drones' && (
      <>
      {/* --- Drone Filter Button + Chips (shown in both table and grid view) --- */}
      <div className="dw-filter-header">
        <button
          className="dw-filter-btn"
          onClick={() => setShowDroneFilterModal(true)}
        >
          <Filter size={16} />
          <span>Filters</span>
          {countActiveDroneFilters(droneFilters) > 0 && (
            <span className="dw-filter-btn__count">
              {countActiveDroneFilters(droneFilters)}
            </span>
          )}
        </button>
        <div className="dw-filter-chips">
          {generateDroneFilterChips(droneFilters).map((chip, index) => (
            <FilterChip
              key={`${chip.filterType}-${chip.filterValue || index}`}
              label={chip.label}
              filterType={chip.filterType}
              filterValue={chip.filterValue}
              onRemove={handleRemoveDroneFilterChip}
            />
          ))}
        </div>
      </div>

      {/* TABLE VIEW */}
      {dronesViewMode === 'table' && (
      <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
        <table className="w-full text-left deck-builder-table">
          <thead>
            <tr>
              <th>Info</th>
              <th><button onClick={() => requestDroneSort('name')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'name' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Name{droneSortConfig.key === 'name' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestDroneSort('rarity')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'rarity' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Rarity{droneSortConfig.key === 'rarity' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestDroneSort('class')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'class' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Cost{droneSortConfig.key === 'class' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestDroneSort('attack')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'attack' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Attack{droneSortConfig.key === 'attack' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestDroneSort('speed')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'speed' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Speed{droneSortConfig.key === 'speed' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestDroneSort('shields')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'shields' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Shields{droneSortConfig.key === 'shields' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestDroneSort('hull')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'hull' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Hull{droneSortConfig.key === 'hull' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th>Abilities</th>
              <th>Description</th>
              <th><button onClick={() => requestDroneSort('limit')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'limit' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Limit{droneSortConfig.key === 'limit' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th><button onClick={() => requestDroneSort('upgradeSlots')} className={`w-full text-left transition-colors underline cursor-pointer ${droneSortConfig.key === 'upgradeSlots' ? 'text-cyan-400' : 'hover:text-cyan-400'}`}>Upgrades{droneSortConfig.key === 'upgradeSlots' && (droneSortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</button></th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedDrones.map((drone, index) => {
              const currentQuantity = (selectedDrones && selectedDrones[drone.name]) || 0;

              return (
                <tr key={`${drone.name}-${index}`}>
                  <td><button onClick={() => setDetailedDrone(drone)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                  <td className="font-bold">{drone.name}</td>
                  <td style={{ color: getRarityDisplay(drone, mode).color }}>{getRarityDisplay(drone, mode).text}</td>
                  <td>{drone.class}</td>
                  <td>{drone.attack}</td>
                  <td>{drone.speed}</td>
                  <td>{drone.shields}</td>
                  <td>{drone.hull}</td>
                  <td><div className="flex flex-wrap gap-2">{drone.keywords.map(k => <span key={k} className="ability-chip">{k}</span>)}</div></td>
                  <td className="text-xs text-gray-400">{drone.description}</td>
                  <td>{drone.limit}</td>
                  <td>{drone.upgradeSlots}</td>
                  <td>
                    <div className="quantity-buttons">
                      <button onClick={() => !readOnly && onDronesChange(drone.name, 0)} disabled={readOnly} className={`quantity-btn ${currentQuantity === 0 ? 'selected' : ''} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>0</button>
                      <button onClick={() => !readOnly && onDronesChange(drone.name, 1)} disabled={readOnly} className={`quantity-btn ${currentQuantity === 1 ? 'selected' : ''} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>1</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* GRID VIEW */}
      {dronesViewMode === 'grid' && (
      <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedDrones.map((drone, index) => {
            const currentQuantity = (selectedDrones && selectedDrones[drone.name]) || 0;
            const maxQuantity = 1; // Drones can only be selected 0 or 1 times
            const isAtMax = currentQuantity >= maxQuantity;

            return (
              <div key={`${drone.name}-${index}`} className="flex flex-col items-center gap-2">
                {/* Drone Card Component with AI Badge Overlay */}
                <div className="relative">
                  <DroneCard
                    drone={drone}
                    onClick={() => setDetailedDrone(drone)}
                    isSelectable={false}
                    isSelected={false}
                    deployedCount={0}
                    ignoreDeployLimit={true}
                    appliedUpgrades={[]}
                    scale={1.0}
                    isViewOnly={true}
                  />
                  {drone.aiOnly && (
                    <div className="dw-ai-badge">AI</div>
                  )}
                </div>
                {/* Quantity Controls */}
                <div className="dw-quantity-control">
                  <button
                    onClick={() => !readOnly && currentQuantity > 0 && onDronesChange(drone.name, currentQuantity - 1)}
                    disabled={readOnly || currentQuantity === 0}
                    className={`dw-quantity-btn ${readOnly ? 'opacity-50' : ''}`}
                  >
                    -
                  </button>
                  <span className="dw-quantity-value">
                    {currentQuantity}/{maxQuantity}
                  </span>
                  <button
                    onClick={() => !readOnly && !isAtMax && onDronesChange(drone.name, currentQuantity + 1)}
                    disabled={readOnly || isAtMax}
                    className={`dw-quantity-btn ${readOnly ? 'opacity-50' : ''}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
      </>
      )}

      {/* SHIP COMPONENTS VIEW */}
      {leftPanelView === 'ship' && (
      <>
      <div className="flex-grow overflow-y-auto pr-2 dw-modal-scroll">
        <table className="w-full text-left deck-builder-table">
          <thead>
            <tr>
              <th>Info</th>
              <th>Type</th>
              <th>Name</th>
              <th>Rarity</th>
              <th>Description</th>
              <th>Lane</th>
            </tr>
          </thead>
          <tbody>
            {[
              { type: 'Bridge', label: 'BRIDGE', headerBg: 'bg-cyan-900/20', textColor: 'text-cyan-400', activeBg: 'bg-cyan-500', hoverBg: 'hover:bg-cyan-600' },
              { type: 'Power Cell', label: 'POWER CELL', headerBg: 'bg-purple-900/20', textColor: 'text-purple-400', activeBg: 'bg-purple-500', hoverBg: 'hover:bg-purple-600' },
              { type: 'Drone Control Hub', label: 'DRONE CONTROL HUB', headerBg: 'bg-red-900/20', textColor: 'text-red-400', activeBg: 'bg-red-500', hoverBg: 'hover:bg-red-600' },
            ].map(({ type, label, headerBg, textColor, activeBg, hoverBg }) => (
              <React.Fragment key={type}>
                <tr className={headerBg}>
                  <td colSpan="6" className={`font-bold ${textColor} text-sm py-2`}>{label}</td>
                </tr>
                {activeComponentCollection.filter(comp => comp.type === type).map((component, index) => {
                  const selectedLane = selectedShipComponents?.[component.id] || null;
                  const occupiedLanes = Object.entries(selectedShipComponents || {})
                    .filter(([id, lane]) => id !== component.id && lane)
                    .map(([id, lane]) => lane);

                  return (
                    <tr key={`${component.id}-${index}`}>
                      <td><button onClick={() => setDetailedShipComponent(component)} className="p-1 text-gray-400 hover:text-white"><Eye size={18} /></button></td>
                      <td className={`font-semibold ${textColor}`}>{component.type}</td>
                      <td className="font-bold">{component.name}</td>
                      <td style={{ color: getRarityDisplay(component, mode).color }}>{getRarityDisplay(component, mode).text}</td>
                      <td className="text-xs text-gray-400">{component.description}</td>
                      <td>
                        <div className="flex gap-2">
                          {['l', 'm', 'r'].map(lane => (
                            <button
                              key={lane}
                              onClick={() => !readOnly && onShipComponentsChange(component.id, selectedLane === lane ? null : lane)}
                              disabled={readOnly || (occupiedLanes.includes(lane) && selectedLane !== lane)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${readOnly ? 'opacity-50' : ''} ${
                                selectedLane === lane
                                  ? `${activeBg} text-white`
                                  : readOnly || occupiedLanes.includes(lane)
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : `bg-gray-700 text-gray-300 ${hoverBg} hover:text-white`
                              }`}
                            >
                              {lane.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
};

export default DeckBuilderLeftPanel;
