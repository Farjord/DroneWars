import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, AlertTriangle } from 'lucide-react';
import DroneCard from '../ui/DroneCard.jsx';
import ActionCard from '../ui/ActionCard.jsx';
import ShipCard from '../ui/ShipCard.jsx';
import ShipSection from '../ui/ShipSection.jsx';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import { gameEngine } from '../../logic/gameLogic.js';
import { resolveShipSectionStats } from '../../utils/shipSectionImageResolver.js';

// Swimlane configuration constants
const TYPE_ORDER = { Ordnance: 0, Support: 1, Tactic: 2, Upgrade: 3 };
const RARITY_ORDER = { Common: 0, Uncommon: 1, Rare: 2, Mythic: 3 };

const SWIMLANE_MODES = [
  { value: 'cost', label: 'Cost' },
  { value: 'type', label: 'Type' },
  { value: 'rarity', label: 'Rarity' }
];

const SUB_SORT_OPTIONS = [
  { value: 'cost', label: 'Cost' },
  { value: 'type', label: 'Type' },
  { value: 'rarity', label: 'Rarity' }
];

/**
 * VIEW DECK MODAL
 * Displays a player's complete deck and drones in a large modal
 * Reusable for player decks, AI decks, etc.
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {Array} drones - Array of drone objects to display
 * @param {Array} cards - Array of {card, quantity} objects to display
 * @param {Object} shipComponents - Object mapping component IDs to lanes (e.g., { BRIDGE_001: 'l', POWERCELL_001: 'm' })
 * @param {Object} ship - Ship card object for resolving ship-specific section images
 * @param {Array} componentInstances - Component instances for hull tracking (extraction mode)
 * @param {Array} droneInstances - Drone instances for damage tracking (extraction mode)
 * @param {string} mode - 'multiplayer' | 'extraction' - affects display features
 */
const ViewDeckModal = ({
  isOpen,
  onClose,
  title,
  drones = [],
  cards = [],
  shipComponents = {},
  ship = null,
  componentInstances = [],
  droneInstances = [],
  mode = 'multiplayer'
}) => {
  // Sort drones by cost (class field)
  const sortedDrones = useMemo(() => [...drones].sort((a, b) => a.class - b.class), [drones]);

  // Sort cards by cost
  const sortedCards = useMemo(() => [...cards].sort((a, b) => a.card.cost - b.card.cost), [cards]);

  // Calculate total cards count
  const totalCards = useMemo(() => sortedCards.reduce((sum, item) => sum + item.quantity, 0), [sortedCards]);

  // Swimlane state
  const [swimlaneMode, setSwimlaneMode] = useState('cost');
  const [subSortBy, setSubSortBy] = useState('cost');
  const [viewMode, setViewMode] = useState('swimlane'); // 'swimlane' | 'matrix'

  // Reset settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setSwimlaneMode('cost');
      setSubSortBy('cost');
      setViewMode('swimlane');
    }
  }, [isOpen]);

  // Group and sort cards into swimlanes
  const swimlaneGroups = useMemo(() => {
    // Define group configurations
    const getGroups = () => {
      switch (swimlaneMode) {
        case 'cost': {
          const costs = [...new Set(cards.map(c => c.card.cost))].sort((a, b) => a - b);
          return costs.map(cost => ({ key: cost, label: `Cost ${cost}`, headerClass: '' }));
        }
        case 'type':
          return [
            { key: 'Ordnance', label: 'Ordnance', headerClass: 'dw-swimlane-header--ordnance' },
            { key: 'Support', label: 'Support', headerClass: 'dw-swimlane-header--support' },
            { key: 'Tactic', label: 'Tactic', headerClass: 'dw-swimlane-header--tactic' },
            { key: 'Upgrade', label: 'Upgrade', headerClass: 'dw-swimlane-header--upgrade' }
          ];
        case 'rarity':
          return [
            { key: 'Common', label: 'Common', headerClass: 'dw-swimlane-header--common' },
            { key: 'Uncommon', label: 'Uncommon', headerClass: 'dw-swimlane-header--uncommon' },
            { key: 'Rare', label: 'Rare', headerClass: 'dw-swimlane-header--rare' },
            { key: 'Mythic', label: 'Mythic', headerClass: 'dw-swimlane-header--mythic' }
          ];
        default:
          return [];
      }
    };

    // Sub-sort function
    const sortCards = (items) => {
      return [...items].sort((a, b) => {
        switch (subSortBy) {
          case 'cost': return a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name);
          case 'type': return TYPE_ORDER[a.card.type] - TYPE_ORDER[b.card.type] || a.card.name.localeCompare(b.card.name);
          case 'rarity': return RARITY_ORDER[a.card.rarity] - RARITY_ORDER[b.card.rarity] || a.card.name.localeCompare(b.card.name);
          default: return 0;
        }
      });
    };

    // Group and sort cards
    const groups = getGroups();
    return groups.map(group => {
      const groupCards = cards.filter(item => {
        const value = swimlaneMode === 'cost' ? item.card.cost : item.card[swimlaneMode];
        return value === group.key;
      });
      return { ...group, cards: sortCards(groupCards) };
    }).filter(group => group.cards.length > 0); // Hide empty swimlanes
  }, [cards, swimlaneMode, subSortBy]);

  // Matrix view data - 2D grid with columns (group by) and rows (sort by)
  const matrixData = useMemo(() => {
    if (viewMode !== 'matrix') return null;

    // Get column groups (based on swimlaneMode - the "Group by")
    const getColumnGroups = () => {
      switch (swimlaneMode) {
        case 'cost': {
          const costs = [...new Set(cards.map(c => c.card.cost))].sort((a, b) => a - b);
          return costs.map(cost => ({ key: cost, label: `${cost}`, headerClass: '' }));
        }
        case 'type':
          return [
            { key: 'Ordnance', label: 'Ordnance', headerClass: 'dw-matrix-header--ordnance' },
            { key: 'Support', label: 'Support', headerClass: 'dw-matrix-header--support' },
            { key: 'Tactic', label: 'Tactic', headerClass: 'dw-matrix-header--tactic' },
            { key: 'Upgrade', label: 'Upgrade', headerClass: 'dw-matrix-header--upgrade' }
          ];
        case 'rarity':
          return [
            { key: 'Common', label: 'Common', headerClass: 'dw-matrix-header--common' },
            { key: 'Uncommon', label: 'Uncommon', headerClass: 'dw-matrix-header--uncommon' },
            { key: 'Rare', label: 'Rare', headerClass: 'dw-matrix-header--rare' },
            { key: 'Mythic', label: 'Mythic', headerClass: 'dw-matrix-header--mythic' }
          ];
        default:
          return [];
      }
    };

    // Get row groups (based on subSortBy)
    const getRowGroups = () => {
      switch (subSortBy) {
        case 'cost': {
          const costs = [...new Set(cards.map(c => c.card.cost))].sort((a, b) => a - b);
          return costs.map(cost => ({ key: cost, label: `Cost ${cost}` }));
        }
        case 'type':
          return [
            { key: 'Ordnance', label: 'Ordnance' },
            { key: 'Support', label: 'Support' },
            { key: 'Tactic', label: 'Tactic' },
            { key: 'Upgrade', label: 'Upgrade' }
          ];
        case 'rarity':
          return [
            { key: 'Common', label: 'Common' },
            { key: 'Uncommon', label: 'Uncommon' },
            { key: 'Rare', label: 'Rare' },
            { key: 'Mythic', label: 'Mythic' }
          ];
        default:
          return [];
      }
    };

    const columns = getColumnGroups();
    const rows = getRowGroups();

    // Helper functions for getting values
    const getColumnValue = (card) => swimlaneMode === 'cost' ? card.cost : card[swimlaneMode];
    const getRowValue = (card) => {
      return subSortBy === 'cost' ? card.cost : card[subSortBy];
    };

    // Filter to only columns that have cards
    const columnsWithCards = columns.filter(col =>
      cards.some(item => getColumnValue(item.card) === col.key)
    );

    // Filter to only rows that have cards
    const rowsWithCards = rows.filter(row =>
      cards.some(item => getRowValue(item.card) === row.key)
    );

    return {
      columns: columnsWithCards,
      rows: rowsWithCards,
      getCell: (colKey, rowKey) => {
        return cards.filter(item =>
          getColumnValue(item.card) === colKey &&
          getRowValue(item.card) === rowKey
        ).sort((a, b) => a.card.name.localeCompare(b.card.name));
      }
    };
  }, [cards, swimlaneMode, subSortBy, viewMode]);

  // Build available tabs based on what content exists
  const availableTabs = useMemo(() => {
    const tabs = [];
    if (ship) tabs.push({ id: 'ship', label: 'Ship' });
    if (Object.keys(shipComponents).length > 0) tabs.push({ id: 'layout', label: 'Layout' });
    tabs.push({ id: 'drones', label: `Drones (${sortedDrones.length})` });
    tabs.push({ id: 'cards', label: `Cards (${totalCards})` });
    return tabs;
  }, [ship, shipComponents, sortedDrones.length, totalCards]);

  // Active tab state - default to first available tab
  const [activeTab, setActiveTab] = useState(() => {
    if (ship) return 'ship';
    if (Object.keys(shipComponents).length > 0) return 'layout';
    return 'drones';
  });

  // Helper function to calculate middle lane bonus stats
  const calculateMiddleLaneBonusStats = (comp, applyBonus) => {
    const baseStats = comp.stats.healthy;
    const bonus = comp.middleLaneBonus || {};
    const effectiveStats = {};

    Object.keys(baseStats).forEach(stat => {
      effectiveStats[stat] = baseStats[stat] + (applyBonus ? (bonus[stat] || 0) : 0);
    });

    return effectiveStats;
  };

  if (!isOpen) return null;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        style={{ maxWidth: '1500px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <BookOpen size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">{title}</h2>
            <p className="dw-modal-header-subtitle">
              {sortedDrones.length} drone{sortedDrones.length !== 1 ? 's' : ''}, {totalCards} card{totalCards !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="dw-modal-tabs" style={{ marginBottom: '0' }}>
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`dw-modal-tab ${activeTab === tab.id ? 'dw-modal-tab--active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="dw-modal-body" style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
          <div className="dw-modal-scroll" style={{ height: '100%' }}>
          {/* Ship Tab Content */}
          {activeTab === 'ship' && ship && (
            <div className="mb-6">
              <h3 className="text-xl font-orbitron text-cyan-400 mb-3">Your Ship</h3>
              <div className="flex justify-center">
                <ShipCard ship={ship} isSelectable={false} />
              </div>
            </div>
          )}

          {/* Layout Tab Content */}
          {activeTab === 'layout' && Object.keys(shipComponents).length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-orbitron text-yellow-400 mb-3">Ship Layout</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {['l', 'm', 'r'].map((lane, index) => {
                  const componentEntry = Object.entries(shipComponents).find(([, l]) => l === lane);
                  const component = componentEntry ? shipComponentCollection.find(c => c.id === componentEntry[0]) : null;

                  return (
                    <div key={lane}>
                      <div className="text-center mb-2">
                        <span className={`font-bold text-sm ${index === 1 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                          {index === 1 ? 'MIDDLE (Bonus)' : index === 0 ? 'LEFT' : 'RIGHT'}
                        </span>
                      </div>
                      {component ? (
                        <div>
                          <div className="h-[200px]">
                            <ShipSection
                              section={component.key}
                              stats={resolveShipSectionStats(component, ship)}
                              effectiveStatsForDisplay={calculateMiddleLaneBonusStats(component, index === 1)}
                              isPlayer={true}
                              isInMiddleLane={index === 1}
                              gameEngine={gameEngine}
                              isInteractive={false}
                              turnPhase="placement"
                              isMyTurn={() => false}
                              passInfo={{}}
                              getLocalPlayerId={() => 'player1'}
                              localPlayerState={{}}
                              shipAbilityMode={null}
                            />
                          </div>
                          {/* Hull Display (extraction mode only) */}
                          {mode === 'extraction' && (() => {
                            const instance = componentInstances.find(i => i.componentId === componentEntry[0]);
                            if (instance && instance.currentHull < instance.maxHull) {
                              const hullPercent = (instance.currentHull / instance.maxHull) * 100;
                              return (
                                <div className="mt-2 px-2">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-gray-400">Hull</span>
                                    <span className={hullPercent < 50 ? 'text-red-400' : 'text-cyan-400'}>
                                      {instance.currentHull}/{instance.maxHull}
                                    </span>
                                  </div>
                                  <div className="h-2 bg-gray-700 rounded overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        hullPercent < 25 ? 'bg-red-500' :
                                        hullPercent < 50 ? 'bg-yellow-500' : 'bg-cyan-500'
                                      }`}
                                      style={{ width: `${hullPercent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <div className="h-[200px] bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                          <span className="text-center text-gray-500 italic text-xs">
                            Empty Lane
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drones Tab Content */}
          {activeTab === 'drones' && (
            <div className="mb-6">
              <h3 className="text-xl font-orbitron text-cyan-400 mb-3">Drones ({sortedDrones.length})</h3>
              {sortedDrones.length > 0 ? (
                <div className="max-w-[1165px] mx-auto">
                  <div className="flex flex-wrap gap-[10px] justify-center">
                    {sortedDrones.map((drone, index) => {
                      // Check for damage in extraction mode
                      const droneInstance = mode === 'extraction'
                        ? droneInstances.find(i => i.droneName === drone.name)
                        : null;
                      const isDamaged = droneInstance?.isDamaged;

                      return (
                        <div
                          key={`${drone.name}-${index}`}
                          className={`relative ${isDamaged ? 'ring-2 ring-yellow-500 rounded-lg' : ''}`}
                        >
                          {/* Damage indicator */}
                          {isDamaged && (
                            <div className="absolute -top-2 -right-2 z-10 bg-yellow-500 rounded-full p-1">
                              <AlertTriangle size={14} className="text-black" />
                            </div>
                          )}
                          <DroneCard
                            drone={drone}
                            onClick={() => {}}
                            isSelectable={false}
                            isSelected={false}
                            deployedCount={0}
                            appliedUpgrades={[]}
                            isViewOnly={true}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <p className="text-gray-500 text-xl italic">No drones selected</p>
                </div>
              )}
            </div>
          )}

          {/* Cards Tab Content */}
          {activeTab === 'cards' && (
            <div className="mb-6">
              <h3 className="text-xl font-orbitron text-purple-400 mb-3">
                Cards ({totalCards})
              </h3>

              {/* View Controls */}
              <div className="dw-swimlane-controls">
                <div className="dw-swimlane-control-group">
                  <span className="dw-swimlane-control-label">View:</span>
                  <div className="dw-swimlane-mode-group">
                    <button
                      className={`dw-swimlane-mode-btn ${viewMode === 'swimlane' ? 'dw-swimlane-mode-btn--active' : ''}`}
                      onClick={() => setViewMode('swimlane')}
                    >
                      Swimlane
                    </button>
                    <button
                      className={`dw-swimlane-mode-btn ${viewMode === 'matrix' ? 'dw-swimlane-mode-btn--active' : ''}`}
                      onClick={() => setViewMode('matrix')}
                    >
                      Matrix
                    </button>
                  </div>
                </div>
                <div className="dw-swimlane-control-group">
                  <span className="dw-swimlane-control-label">{viewMode === 'matrix' ? 'Columns:' : 'Group by:'}</span>
                  <div className="dw-swimlane-mode-group">
                    {SWIMLANE_MODES.map(mode => (
                      <button
                        key={mode.value}
                        className={`dw-swimlane-mode-btn ${swimlaneMode === mode.value ? 'dw-swimlane-mode-btn--active' : ''}`}
                        onClick={() => setSwimlaneMode(mode.value)}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="dw-swimlane-control-group">
                  <span className="dw-swimlane-control-label">{viewMode === 'matrix' ? 'Rows:' : 'Sort by:'}</span>
                  <select
                    className="dw-filter-select"
                    value={subSortBy}
                    onChange={(e) => setSubSortBy(e.target.value)}
                  >
                    {SUB_SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="dw-swimlane-scroll-hint">
                  Shift + scroll to pan horizontally
                </div>
              </div>

              {/* Swimlane View */}
              {viewMode === 'swimlane' && swimlaneGroups.length > 0 && (
                <div className="dw-swimlane-container">
                  {swimlaneGroups.map(group => (
                    <div key={group.key} className="dw-swimlane">
                      <div className={`dw-swimlane-header ${group.headerClass}`}>
                        <span className="dw-swimlane-title">{group.label}</span>
                        <span className="dw-swimlane-count">
                          {group.cards.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                      </div>
                      <div className="dw-swimlane-cards">
                        {group.cards.map((item, index) => (
                          <div key={`${item.card.id}-${index}`} className="dw-swimlane-card">
                            <ActionCard
                              card={item.card}
                              onClick={() => {}}
                              isPlayable={true}
                              isSelected={false}
                              mandatoryAction={null}
                              excessCards={0}
                            />
                            <div className="dw-swimlane-card-quantity">
                              ×{item.quantity} in deck
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Matrix View */}
              {viewMode === 'matrix' && matrixData && matrixData.columns.length > 0 && (
                <div className="dw-matrix-container">
                  {/* Column Headers */}
                  <div className="dw-matrix-header-row">
                    <div className="dw-matrix-corner"></div>
                    {matrixData.columns.map(col => (
                      <div key={col.key} className={`dw-matrix-col-header ${col.headerClass}`}>
                        {col.label}
                      </div>
                    ))}
                  </div>

                  {/* Matrix Rows */}
                  {matrixData.rows.map(row => {
                    // Check if this row has any cards in any column
                    const rowHasCards = matrixData.columns.some(col =>
                      matrixData.getCell(col.key, row.key).length > 0
                    );
                    if (!rowHasCards) return null;

                    return (
                      <div key={row.key} className="dw-matrix-row">
                        <div className="dw-matrix-row-header">{row.label}</div>
                        {matrixData.columns.map(col => {
                          const cellCards = matrixData.getCell(col.key, row.key);
                          if (cellCards.length === 0) {
                            return (
                              <div key={col.key} className="dw-matrix-cell dw-matrix-cell--empty"></div>
                            );
                          }
                          return (
                            <div key={col.key} className="dw-matrix-cell">
                              {cellCards.map((item, index) => (
                                <div key={`${item.card.id}-${index}`} className="dw-swimlane-card">
                                  <ActionCard
                                    card={item.card}
                                    onClick={() => {}}
                                    isPlayable={true}
                                    isSelected={false}
                                    mandatoryAction={null}
                                    excessCards={0}
                                  />
                                  <div className="dw-swimlane-card-quantity">
                                    ×{item.quantity} in deck
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No cards message */}
              {cards.length === 0 && (
                <div className="dw-modal-info-box" style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: 'var(--modal-text-secondary)', fontStyle: 'italic' }}>No cards in deck</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDeckModal;
