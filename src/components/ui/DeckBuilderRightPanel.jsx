import React from 'react';
import { Eye, AlertTriangle, Settings } from 'lucide-react';
import ShipCard from './ShipCard.jsx';
import ShipConfigurationTab from './ShipConfigurationTab.jsx';
import DeckStatisticsCharts from './DeckStatisticsCharts.jsx';

const DeckBuilderRightPanel = ({
  // Navigation
  rightPanelView, setRightPanelView,
  mobileActivePanel,
  // Counts / validation
  cardCount, totalCardLimit,
  droneCount, maxDrones,
  shipComponentCount,
  isDeckValid, isDronesValid, shipComponentsValid,
  // Data
  activeShip,
  deckListForDisplay, baseCardCounts,
  deck, onDeckChange,
  typeLimits, typeCounts,
  droneListForDisplay, droneInstances,
  onDronesChange,
  selectedShipComponents, activeComponentCollection,
  componentInstances,
  // Statistics
  deckStats, droneStats,
  activeChartView, setActiveChartView,
  isStatsVisible, setIsStatsVisible,
  // Ship config
  shipSlot, droneSlots, credits,
  onRepairDroneSlot, onRepairSectionSlot,
  // Save
  handleSaveWithToast, showSaveToast, setShowSaveToast,
  allowInvalidSave, onSaveInvalid,
  // Handlers
  resetDeck, resetDrones, onShipComponentsChange,
  setDetailedCard, setDetailedDrone,
  // Config
  mode, readOnly,
}) => {
  return (
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
  );
};

export default DeckBuilderRightPanel;
