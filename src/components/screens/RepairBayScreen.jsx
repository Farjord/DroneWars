/**
 * RepairBayScreen Component
 * Full-screen management UI for ship configuration and repairs
 *
 * Features:
 * - Ship slot selector (sidebar)
 * - Drone slots display with DroneCard components (drag-to-reorder)
 * - Ship sections display with hull/damage status
 * - Repair buttons for damaged items
 */

import React, { useState, useMemo } from 'react';
import { Wrench, AlertTriangle, CheckCircle, GripVertical, Star, Trash2, Lock, Cpu } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import DroneCard from '../ui/DroneCard';
import RepairSectionCard from '../ui/RepairSectionCard';
import fullDroneCollection from '../../data/droneData';
import { shipComponentCollection } from '../../data/shipSectionData';
import { getAllShips, getShipById } from '../../data/shipData';
import repairService from '../../logic/economy/RepairService';
import { resolveShipSectionImage } from '../../utils/shipSectionImageResolver';
import { validateDeckForDeployment } from '../../utils/singlePlayerDeckUtils.js';
import { validateShipSlot } from '../../utils/slotDamageUtils.js';
import { ECONOMY } from '../../data/economyData.js';
import ReputationService from '../../logic/reputation/ReputationService';
import miaRecoveryService from '../../logic/singlePlayer/MIARecoveryService.js';
import ReputationTrack from '../ui/ReputationTrack';

/**
 * Get drone data by name
 */
const getDroneByName = (droneName) => {
  return fullDroneCollection.find(d => d.name === droneName) || null;
};

/**
 * Get ship component by ID
 */
const getComponentById = (componentId) => {
  return shipComponentCollection.find(c => c.id === componentId) || null;
};

/**
 * Calculate section hull from ship and component
 */
const calculateSectionHull = (shipSlot, lane) => {
  const sectionSlot = shipSlot?.sectionSlots?.[lane];
  if (!sectionSlot?.componentId) return { current: 0, max: 0 };

  const component = getComponentById(sectionSlot.componentId);
  const ship = getAllShips().find(s => s.id === shipSlot.shipId);

  if (!component || !ship) return { current: 0, max: 0 };

  // Base hull from component + ship bonus
  const maxHull = (component.stats?.hull || 0) + (ship.baseHull || 0);
  const damageDealt = sectionSlot.damageDealt || 0;
  const currentHull = Math.max(0, maxHull - damageDealt);

  return { current: currentHull, max: maxHull };
};

/**
 * Count damage in a ship slot
 */
const countDamage = (slot) => {
  if (!slot || slot.status !== 'active') return { drones: 0, sections: 0, total: 0 };

  const damagedDrones = (slot.droneSlots || []).filter(s => s.slotDamaged && s.assignedDrone).length;
  const damagedSections = ['l', 'm', 'r'].filter(lane => {
    const sectionSlot = slot.sectionSlots?.[lane];
    return sectionSlot?.componentId && (sectionSlot.damageDealt || 0) > 0;
  }).length;

  return {
    drones: damagedDrones,
    sections: damagedSections,
    total: damagedDrones + damagedSections
  };
};

/**
 * Drone Slot Display Component
 * Wraps DroneCard with slot number, damage indicator, and drag functionality
 */
const DroneSlotDisplay = ({
  index,
  droneSlot,
  onRepair,
  credits,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop
}) => {
  const droneName = droneSlot?.assignedDrone;
  const isDamaged = droneSlot?.slotDamaged ?? false;
  const droneData = droneName ? getDroneByName(droneName) : null;
  const repairCost = droneName && repairService.getDroneRepairCost ? repairService.getDroneRepairCost(droneName) : 500;
  const canAfford = credits >= repairCost;

  if (!droneName || !droneData) {
    return (
      <div className="repair-bay-drone-slot repair-bay-drone-slot--empty">
        <div className="text-center py-8">
          <div className="text-xs text-gray-500 mb-1">Slot {index + 1}</div>
          <div className="text-gray-500">Empty</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`repair-bay-drone-slot ${isDragging ? 'repair-bay-drone-slot--dragging' : ''} ${isDragOver ? 'repair-bay-drone-slot--drag-over' : ''}`}
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    >
      {/* Slot Number Badge */}
      <div className="absolute top-2 left-2 z-10 bg-black/70 px-2 py-1 rounded text-xs text-cyan-400 flex items-center gap-1">
        <GripVertical size={10} />
        Slot {index + 1}
      </div>

      {/* Damage Indicator */}
      {isDamaged && (
        <div className="absolute top-2 right-2 z-10 bg-yellow-500/90 px-2 py-1 rounded text-xs text-black font-medium flex items-center gap-1">
          <AlertTriangle size={10} />
          Damaged
        </div>
      )}

      {/* Drone Card */}
      <DroneCard
        drone={droneData}
        isViewOnly={true}
        isSelectable={false}
        deployedCount={0}
      />

      {/* Repair Button */}
      {isDamaged && (
        <button
          className={`w-full mt-2 py-2 px-3 rounded text-xs flex items-center justify-center gap-2 ${
            canAfford
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (canAfford) onRepair(index);
          }}
          disabled={!canAfford}
        >
          <Wrench size={12} />
          Repair ({repairCost} cr)
        </button>
      )}
    </div>
  );
};

/**
 * RepairBayScreen Component
 */
const RepairBayScreen = () => {
  const { gameState, gameStateManager } = useGameState();

  // Get data from game state (matching Hangar pattern)
  const singlePlayerProfile = gameState.singlePlayerProfile;
  const singlePlayerShipSlots = gameState.singlePlayerShipSlots || [];
  const credits = singlePlayerProfile?.credits || 0;
  const initialSlotId = gameState.repairBaySlotId ?? 0;

  // Local state
  const [selectedSlotId, setSelectedSlotId] = useState(initialSlotId);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showReputationProgress, setShowReputationProgress] = useState(false);

  // Get active slots only (for main content display)
  const activeSlots = useMemo(() => {
    return singlePlayerShipSlots.filter(slot => slot.status === 'active');
  }, [singlePlayerShipSlots]);

  // Get selected slot
  const selectedSlot = singlePlayerShipSlots.find(s => s.id === selectedSlotId) || activeSlots[0];

  // Handle back/exit navigation
  const handleBack = () => {
    gameStateManager.setState({ appState: 'hangar' });
  };

  // Handle unlock slot (matching Hangar)
  const handleUnlockSlot = (e) => {
    e.stopPropagation();
    gameStateManager.unlockNextDeckSlot();
  };

  // Handle star toggle (matching Hangar)
  const handleStarToggle = (e, slotId) => {
    e.stopPropagation();
    const currentDefault = singlePlayerProfile?.defaultShipSlotId;
    gameStateManager.setDefaultShipSlot(currentDefault === slotId ? null : slotId);
  };

  // Handle slot selection
  const handleSelectSlot = (slotId) => {
    setSelectedSlotId(slotId);
    setFeedback(null);
  };

  // Handle drone reordering
  const handleSwapDrones = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || !selectedSlot) return;

    const newSlots = [...selectedSlot.droneSlots];
    // Swap only the assignedDrone values, slot damage stays in place
    const tempDrone = newSlots[fromIndex].assignedDrone;
    newSlots[fromIndex] = { ...newSlots[fromIndex], assignedDrone: newSlots[toIndex].assignedDrone };
    newSlots[toIndex] = { ...newSlots[toIndex], assignedDrone: tempDrone };

    // Update game state
    if (gameStateManager.updateShipSlotDroneOrder) {
      gameStateManager.updateShipSlotDroneOrder(selectedSlotId, newSlots);
    } else {
      // Fallback: update via setState
      const updatedSlots = singlePlayerShipSlots.map(slot =>
        slot.id === selectedSlotId ? { ...slot, droneSlots: newSlots } : slot
      );
      gameStateManager.setState({ singlePlayerShipSlots: updatedSlots });
    }

    setFeedback({ type: 'success', message: 'Drones reordered' });
    setTimeout(() => setFeedback(null), 2000);
  };

  // Handle drone repair
  const handleRepairDrone = async (slotIndex) => {
    try {
      const result = repairService.repairDroneSlot
        ? await repairService.repairDroneSlot(selectedSlotId, slotIndex)
        : { success: false, error: 'Repair service not available' };

      if (result.success) {
        setFeedback({ type: 'success', message: `Drone repaired for ${result.cost} credits` });
      } else {
        setFeedback({ type: 'error', message: result.error || 'Repair failed' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Repair failed' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  // Handle section repair
  const handleRepairSection = async (lane) => {
    try {
      const result = repairService.repairSectionSlot
        ? await repairService.repairSectionSlot(selectedSlotId, lane)
        : { success: false, error: 'Repair service not available' };

      if (result.success) {
        setFeedback({ type: 'success', message: `Section repaired for ${result.cost} credits` });
      } else {
        setFeedback({ type: 'error', message: result.error || 'Repair failed' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Repair failed' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  // Drag handlers
  const handleDragStart = (index) => () => setDraggedIndex(index);
  const handleDragOver = (index) => (e) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleDrop = (toIndex) => () => {
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      handleSwapDrones(draggedIndex, toIndex);
    }
    handleDragEnd();
  };

  return (
    <div className="repair-bay-screen heading-font">
      {/* Header - Exact Hangar style */}
      <header style={{
        background: 'linear-gradient(45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(-45deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(180deg, rgba(20, 28, 42, 0.95) 0%, rgba(10, 14, 22, 0.95) 100%)',
        backgroundSize: '10px 10px, 10px 10px, 100% 100%',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
        zIndex: 10
      }}>
        {/* Left: Title */}
        <h1 style={{
          fontSize: '1.5rem',
          color: '#e5e7eb',
          letterSpacing: '0.1em'
        }}>REPAIR BAY</h1>

        {/* Right: Stats (matching Hangar) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[
            { label: 'CREDITS', value: singlePlayerProfile?.credits || 0, color: '#fbbf24' },
            { label: 'AI CORES', value: singlePlayerProfile?.aiCores || 0, color: '#f97316' },
            { label: 'TOKENS', value: singlePlayerProfile?.securityTokens || 0, color: '#06b6d4' },
            { label: 'MAP KEYS', value: 0, color: '#60a5fa' },
            { label: 'RUNS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#e5e7eb' },
            { label: 'EXTRACTIONS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#22c55e' },
            { label: 'COMBATS WON', value: singlePlayerProfile?.stats?.totalCombatsWon || 0, color: '#10b981' },
            { label: 'MAX TIER', value: singlePlayerProfile?.stats?.highestTierCompleted || 1, color: '#a855f7' }
          ].map(({ label, value, color }) => (
            <div key={label} className="dw-stat-box" style={{ minWidth: '70px', padding: '6px 10px' }}>
              <span className="dw-stat-box-label">{label}</span>
              <span className="dw-stat-box-value" style={{ color }}>{value}</span>
            </div>
          ))}

          {/* Reputation Track */}
          {(() => {
            const repData = ReputationService.getLevelData();
            const unclaimed = ReputationService.getUnclaimedRewards();
            return (
              <ReputationTrack
                current={repData.currentRep}
                level={repData.level}
                progress={repData.progress}
                currentInLevel={repData.currentInLevel}
                requiredForNext={repData.requiredForNext}
                unclaimedCount={unclaimed.length}
                isMaxLevel={repData.isMaxLevel}
                onClick={() => setShowReputationProgress(true)}
              />
            );
          })()}
        </div>
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`repair-bay-feedback ${feedback.type === 'success' ? 'repair-bay-feedback--success' : 'repair-bay-feedback--error'}`}>
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {feedback.message}
        </div>
      )}

      <div className="repair-bay-content" style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '3fr 1fr',
        overflow: 'hidden'
      }}>
        {/* Main Content - LEFT side */}
        <main className="repair-bay-main">
          {selectedSlot ? (
            <>
              {/* Ship Sections */}
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  Ship Sections
                </h2>
                <div className="repair-bay-sections-grid">
                  {['l', 'm', 'r'].map(lane => {
                    const sectionSlot = selectedSlot.sectionSlots?.[lane];
                    const component = sectionSlot?.componentId ? getComponentById(sectionSlot.componentId) : null;
                    const hull = calculateSectionHull(selectedSlot, lane);
                    const damageDealt = sectionSlot?.damageDealt || 0;
                    const repairCost = repairService.getSectionRepairCost ? repairService.getSectionRepairCost(damageDealt) : damageDealt * 200;
                    const canAfford = credits >= repairCost;
                    const isDestroyed = hull.current <= 0;
                    const isDamaged = damageDealt > 0;

                    // Resolve ship-specific image based on ship type and section type
                    const sectionImage = component
                      ? resolveShipSectionImage(selectedSlot.shipId, component.type)
                      : null;

                    return (
                      <RepairSectionCard
                        key={lane}
                        component={component}
                        sectionImage={sectionImage}
                        hull={hull}
                        isDamaged={isDamaged}
                        isDestroyed={isDestroyed}
                        onRepair={() => handleRepairSection(lane)}
                        repairCost={repairCost}
                        canAfford={canAfford}
                        lane={lane}
                      />
                    );
                  })}
                </div>
              </section>

              {/* Drone Slots */}
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  Drone Slots
                  <span className="text-xs text-gray-400 font-normal">(drag to reorder)</span>
                </h2>
                <div className="repair-bay-drones-grid">
                  {(selectedSlot.droneSlots || []).map((droneSlot, index) => (
                    <DroneSlotDisplay
                      key={index}
                      index={index}
                      droneSlot={droneSlot}
                      onRepair={handleRepairDrone}
                      credits={credits}
                      isDragging={draggedIndex === index}
                      isDragOver={dragOverIndex === index}
                      onDragStart={handleDragStart(index)}
                      onDragOver={handleDragOver(index)}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop(index)}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              Select a ship slot to manage
            </div>
          )}
        </main>

        {/* Sidebar - RIGHT side (exact Hangar ships panel) */}
        <aside
          className="flex flex-col p-6"
          style={{
            borderLeft: '2px solid rgba(6, 182, 212, 0.3)',
            background: 'rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* Toggle section header - matches Hangar */}
          <div className="flex gap-2" style={{ marginBottom: '0.5rem' }}>
            <button className="dw-btn dw-btn-confirm" style={{ flex: 1 }}>
              SHIPS
            </button>
          </div>

          <div className="flex flex-col panel-scrollable" style={{ flex: 1, gap: '0.75rem' }}>
            {singlePlayerShipSlots.map((slot) => {
              const isDefault = singlePlayerProfile?.defaultShipSlotId === slot.id;
              const isSlot0 = slot.id === 0;
              const isActive = slot.status === 'active';
              const isEmpty = slot.status === 'empty';
              const isMia = slot.status === 'mia';
              const isSelected = slot.id === selectedSlotId;

              // Deck slot unlock state
              const isUnlocked = gameStateManager.isSlotUnlocked(slot.id);
              const highestUnlocked = singlePlayerProfile?.highestUnlockedSlot ?? 0;
              const isNextToUnlock = !isUnlocked && slot.id === highestUnlocked + 1;
              const unlockCost = isNextToUnlock ? ECONOMY.DECK_SLOT_UNLOCK_COSTS[slot.id] : null;
              const canAffordUnlock = unlockCost !== null && credits >= unlockCost;

              // Get card/drone counts for active slots
              const cardCount = isActive ? (slot.decklist || []).reduce((sum, c) => sum + c.quantity, 0) : 0;
              const droneCount = isActive ? (slot.droneSlots || []).filter(s => s.assignedDrone).length : 0;

              // Check if deck is valid (for active slots)
              const deckValidation = isActive ? (() => {
                const deckObj = {};
                (slot.decklist || []).forEach(card => {
                  deckObj[card.id] = card.quantity;
                });
                const dronesObj = {};
                (slot.droneSlots || []).forEach(s => {
                  if (s.assignedDrone) dronesObj[s.assignedDrone] = 1;
                });
                return validateDeckForDeployment(deckObj, dronesObj, slot.shipComponents);
              })() : { valid: true };
              const isValidDeck = deckValidation.valid;

              // Check if ship is undeployable (all sections destroyed)
              const slotValidation = isActive ? validateShipSlot(slot) : { isUndeployable: false };
              const isUndeployable = slotValidation.isUndeployable;

              // Damage count for repair bay
              const damage = countDamage(slot);
              const hasDamage = damage.total > 0;

              // Determine slot state class
              const getSlotClass = () => {
                if (!isUnlocked) return 'dw-deck-slot--locked';
                if (isMia) return 'dw-deck-slot--mia';
                if (isEmpty) return 'dw-deck-slot--empty';
                if (isUndeployable) return 'dw-deck-slot--undeployable';
                if (isSelected) return 'dw-deck-slot--active';
                if (isDefault) return 'dw-deck-slot--default';
                return '';
              };

              // Get ship image for active slots background
              const ship = isActive && slot.shipId ? getShipById(slot.shipId) : null;
              const shipImage = ship?.image || null;

              return (
                <div
                  key={slot.id}
                  className={`dw-deck-slot ${getSlotClass()}`}
                  onClick={() => isUnlocked && isActive && handleSelectSlot(slot.id)}
                  style={shipImage ? {
                    backgroundImage: `url(${shipImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: isUnlocked && isActive ? 'pointer' : 'default'
                  } : { cursor: isUnlocked && isActive ? 'pointer' : 'default' }}
                >
                  {!isUnlocked ? (
                    // LOCKED SLOT CONTENT
                    <div className="dw-deck-slot-locked-content">
                      <Lock size={18} className="dw-deck-slot-lock-icon" />
                      <span className="dw-deck-slot-locked-label">SLOT {slot.id}</span>

                      {isNextToUnlock ? (
                        <button
                          className={`dw-btn dw-btn-confirm dw-btn--sm dw-btn--full ${!canAffordUnlock ? 'dw-btn--disabled' : ''}`}
                          onClick={handleUnlockSlot}
                          disabled={!canAffordUnlock}
                        >
                          UNLOCK - {unlockCost?.toLocaleString()}
                        </button>
                      ) : (
                        <span className="dw-deck-slot-locked-hint">
                          Unlock Slot {slot.id - 1} first
                        </span>
                      )}
                    </div>
                  ) : (
                    // UNLOCKED SLOT CONTENT - wrapped in overlay div for ship image backgrounds
                    <div className={shipImage ? 'dw-deck-slot-content' : undefined}>
                      {/* Header Row: Slot name/id + Star */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-orbitron text-sm flex items-center gap-1 ${isMia ? 'text-red-400' : isUndeployable ? 'text-red-400' : 'text-cyan-400'}`}>
                          {isSlot0 ? 'STARTER' : `SLOT ${slot.id}`}
                          {isActive && isUndeployable && (
                            <AlertTriangle size={14} className="text-red-400" title="Ship undeployable - all sections destroyed" />
                          )}
                          {isActive && !isValidDeck && !isUndeployable && (
                            <AlertTriangle size={14} className="text-orange-400" title="Incomplete deck" />
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Star button (only for active slots) */}
                          {isActive && (
                            <button
                              onClick={(e) => handleStarToggle(e, slot.id)}
                              className={`p-1 rounded transition-colors ${
                                isDefault
                                  ? 'text-yellow-400 hover:text-yellow-300'
                                  : 'text-gray-500 hover:text-gray-400'
                              }`}
                              title={isDefault ? 'Default ship for deployment' : 'Set as default'}
                            >
                              <Star size={16} fill={isDefault ? 'currentColor' : 'none'} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Deck Name */}
                      <div className="font-medium text-white text-sm truncate">
                        {isActive ? (slot.name || 'Unnamed Deck') : isMia ? 'MIA' : 'Empty Slot'}
                      </div>

                      {/* Stats for active slots */}
                      {isActive && (
                        <div className={`text-xs mt-1 ${isUndeployable ? 'text-red-400' : isValidDeck ? 'text-gray-400' : 'text-orange-400'}`}>
                          {isUndeployable
                            ? 'UNDEPLOYABLE - All sections destroyed'
                            : <>
                                {cardCount}/40 cards • {droneCount}/5 drones
                                {!isValidDeck && ' (incomplete)'}
                              </>
                          }
                        </div>
                      )}

                      {/* Damage Status - Repair Bay specific */}
                      {isActive && (
                        hasDamage ? (
                          <div className="flex items-center gap-1 mt-2 text-yellow-400 text-xs">
                            <AlertTriangle size={12} />
                            {damage.total} damaged ({damage.drones} drone{damage.drones !== 1 ? 's' : ''}, {damage.sections} section{damage.sections !== 1 ? 's' : ''})
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-2 text-green-400 text-xs">
                            <CheckCircle size={12} />
                            No damage
                          </div>
                        )
                      )}

                      {/* MIA indicator */}
                      {isMia && (
                        <div className="text-xs text-red-400 mt-1">
                          Recover in Hangar
                        </div>
                      )}

                      {/* Empty slot indicator */}
                      {isEmpty && (
                        <div className="text-xs text-gray-500 mt-1">
                          Create in Hangar
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Exit button - matches Hangar exactly */}
          <button
            onClick={handleBack}
            className="dw-btn dw-btn-danger dw-btn--full"
            style={{ marginTop: 'auto' }}
          >
            EXIT
          </button>
        </aside>
      </div>
    </div>
  );
};

export default RepairBayScreen;
