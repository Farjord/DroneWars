/**
 * QuickDeployEditorScreen Component
 * Full-page screen for creating/editing quick deployment templates
 * Uses actual game components (DroneLanesDisplay, DroneCard) for visual fidelity
 */

import React, { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import fullDroneCollection from '../../data/droneData';
import { starterPoolDroneNames } from '../../data/saveGameSchema';
import { calculateTotalCost, getDroneByName, validateAgainstDeck } from '../../logic/quickDeploy/QuickDeployValidator';
import { calculateEffectiveStats, calculateSectionBaseStats } from '../../logic/statsCalculator';
import { shipComponentCollection } from '../../data/shipSectionData';
import { getAllShips } from '../../data/shipData';
import QuickDeployService from '../../logic/quickDeploy/QuickDeployService';
import DroneLanesDisplay from '../ui/DroneLanesDisplay';
import DroneCard from '../ui/DroneCard';
import DronePicker from '../quickDeploy/DronePicker';
import { EditorStatsProvider } from '../../contexts/EditorStatsContext';

/**
 * QuickDeployEditorScreen Component
 * Full-page editor for creating/editing quick deployment templates
 */
const QuickDeployEditorScreen = () => {
  const { gameState, gameStateManager } = useGameState();

  // Get editing data from gameState
  const editingData = gameState.quickDeployEditorData || {};
  const deployment = editingData.deployment || {
    id: null,
    name: '',
    droneRoster: [],
    placements: []
  };
  const isCreating = editingData.isCreating !== false;

  // Editor state
  const [name, setName] = useState(deployment.name || '');
  const [droneRoster, setDroneRoster] = useState([...deployment.droneRoster] || []);
  const [placements, setPlacements] = useState([...deployment.placements] || []);
  const [selectedDrone, setSelectedDrone] = useState(null); // Drone selected for placement
  const [showDronePicker, setShowDronePicker] = useState(null); // Slot index to pick for

  // Refs for DroneLanesDisplay
  const droneRefs = useRef({});

  // Service for saving
  const service = useMemo(() => new QuickDeployService(gameStateManager), [gameStateManager]);

  // Get available drones (starter + blueprinted)
  const unlockedBlueprints = gameState.singlePlayerProfile?.unlockedBlueprints || [];
  const availableDrones = useMemo(() => {
    return fullDroneCollection.filter(drone => {
      return starterPoolDroneNames.includes(drone.name) || unlockedBlueprints.includes(drone.name);
    });
  }, [unlockedBlueprints]);

  // Calculate current deployment cost
  const totalCost = calculateTotalCost(placements);

  // Validation
  const errors = useMemo(() => {
    const errs = [];
    if (!name.trim()) errs.push('Name is required');
    if (droneRoster.length < 5) errs.push(`Need ${5 - droneRoster.length} more drone(s) in roster`);
    return errs;
  }, [name, droneRoster]);

  const canSave = errors.length === 0;

  // Convert placements to dronesOnBoard format for DroneLanesDisplay
  const mockPlayerState = useMemo(() => {
    const dronesOnBoard = {
      lane1: [],
      lane2: [],
      lane3: []
    };

    placements.forEach((placement, index) => {
      const droneData = getDroneByName(placement.droneName);
      if (!droneData) return;

      const laneKey = `lane${placement.lane + 1}`;

      // Create drone object with all fields required by stats calculator
      dronesOnBoard[laneKey].push({
        id: `editor_${placement.droneName}_${index}`,
        name: droneData.name,
        image: droneData.image,
        hull: droneData.hull,
        currentShields: droneData.shields,
        isExhausted: false,
        statMods: [],        // Required for stat calculation
        isMarked: false,
        isTeleporting: false
      });
    });

    return {
      dronesOnBoard,
      shipSections: {},
      energy: 0,
      appliedUpgrades: {}  // Required for stats calculator
    };
  }, [placements]);

  // Empty opponent state for DroneLanesDisplay
  const emptyOpponentState = useMemo(() => ({
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: {},
    appliedUpgrades: {}  // Required for stats calculator
  }), []);

  // Create editor stats context value - calculates stats using mock state instead of global state
  const editorStatsValue = useMemo(() => ({
    getEffectiveStats: (drone, lane) => calculateEffectiveStats(
      drone,
      lane,
      mockPlayerState,      // has dronesOnBoard with all placements
      emptyOpponentState,
      { player1: [], player2: [] }  // no ship sections in editor
    )
  }), [mockPlayerState, emptyOpponentState]);

  // Get ship slots for validation
  const shipSlots = gameState.singlePlayerShipSlots || [];

  // Validate current deployment against all active slots
  const slotValidation = useMemo(() => {
    const currentDeployment = {
      droneRoster,
      placements
    };

    return shipSlots.map(slot => {
      if (slot.status !== 'active' || !slot.droneSlots || slot.droneSlots.filter(s => s.assignedDrone).length === 0) {
        return { slot, valid: false, reasons: [{ type: 'inactive', message: 'Slot not active or empty' }] };
      }

      const shipCard = getAllShips().find(s => s.id === slot.shipId);
      if (!shipCard) {
        return { slot, valid: false, reasons: [{ type: 'no_ship', message: 'No ship found' }] };
      }

      // Convert shipComponents { sectionId: lane } to ordered array [left, middle, right]
      const shipComponentsObj = slot.shipComponents || {};
      const laneOrder = { 'l': 0, 'm': 1, 'r': 2 };
      const placedSections = Object.entries(shipComponentsObj)
        .sort((a, b) => laneOrder[a[1]] - laneOrder[b[1]])
        .map(([sectionId]) => sectionId);

      // Build proper ship sections with hull/thresholds
      const shipSections = {};
      for (const sectionId of placedSections) {
        const sectionTemplate = shipComponentCollection.find(c => c.id === sectionId);
        if (sectionTemplate) {
          const baseStats = calculateSectionBaseStats(shipCard, sectionTemplate);
          shipSections[sectionId] = {
            ...JSON.parse(JSON.stringify(sectionTemplate)),
            hull: baseStats.hull,
            maxHull: baseStats.maxHull,
            thresholds: baseStats.thresholds
          };
        }
      }

      const mockPlayerStateForValidation = { shipSections };
      const result = validateAgainstDeck(currentDeployment, slot, mockPlayerStateForValidation, placedSections);

      return {
        slot,
        name: slot.name || `Slot ${slot.id}`,
        valid: result.valid,
        reasons: result.reasons
      };
    }).filter(v => v.slot.status === 'active' && v.slot.droneSlots?.filter(s => s.assignedDrone).length > 0);
  }, [droneRoster, placements, shipSlots]);

  // Handle selecting a drone from the roster for placement
  const handleSelectDrone = (drone) => {
    const droneName = drone.name;
    const droneData = getDroneByName(droneName);
    const placedCount = placements.filter(p => p.droneName === droneName).length;

    // Only block if at deployment limit
    if (placedCount >= droneData.limit) {
      return;
    }
    // Toggle selection
    setSelectedDrone(selectedDrone === droneName ? null : droneName);
  };

  // Handle clicking a lane to place selected drone
  const handleLaneClick = (e, laneId, isPlayer) => {
    if (!selectedDrone || !isPlayer) return;

    // Convert laneId to lane index (lane1 -> 0, lane2 -> 1, lane3 -> 2)
    const laneIndex = parseInt(laneId.replace('lane', '')) - 1;

    // Add placement
    setPlacements([...placements, { droneName: selectedDrone, lane: laneIndex }]);
    setSelectedDrone(null);
  };

  // Handle clicking a placed drone token to remove it
  const handleTokenClick = (e, drone, isPlayer) => {
    if (!isPlayer) return;

    // Find and remove ONE placement matching this drone's id
    // The drone.id format is `editor_${droneName}_${index}` where index is the placement index
    const placementIndex = placements.findIndex((p, idx) =>
      drone.id === `editor_${p.droneName}_${idx}`
    );

    if (placementIndex !== -1) {
      const newPlacements = [...placements];
      newPlacements.splice(placementIndex, 1);
      setPlacements(newPlacements);
    }
  };

  // Handle opening drone picker for a roster slot
  const handleOpenPicker = (slotIndex) => {
    setShowDronePicker(slotIndex);
  };

  // Handle drone selection from picker
  const handleDroneSelected = (droneName) => {
    if (showDronePicker === null) return;

    const newRoster = [...droneRoster];

    // If replacing an existing drone, remove its placements
    if (showDronePicker < droneRoster.length) {
      const oldDrone = droneRoster[showDronePicker];
      if (oldDrone) {
        setPlacements(placements.filter(p => p.droneName !== oldDrone));
      }
      newRoster[showDronePicker] = droneName;
    } else {
      // Adding new drone
      newRoster.push(droneName);
    }

    setDroneRoster(newRoster);
    setShowDronePicker(null);
  };

  // Handle removing a drone from roster
  const handleRemoveFromRoster = (slotIndex) => {
    const droneName = droneRoster[slotIndex];
    if (!droneName) return;

    // Remove placements for this drone
    setPlacements(placements.filter(p => p.droneName !== droneName));

    // Remove from roster
    const newRoster = droneRoster.filter((_, i) => i !== slotIndex);
    setDroneRoster(newRoster);
  };

  // Handle save
  const handleSave = () => {
    if (!canSave) return;

    try {
      if (isCreating) {
        service.create(name.trim(), droneRoster, placements);
      } else {
        service.update(deployment.id, {
          name: name.trim(),
          droneRoster,
          placements
        });
      }
      // Navigate back to hangar
      gameStateManager.setState({
        appState: 'hangar',
        quickDeployEditorData: null
      });
    } catch (error) {
      console.error('Failed to save quick deployment:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    gameStateManager.setState({
      appState: 'hangar',
      quickDeployEditorData: null
    });
  };

  // Get drones already in roster (for filtering picker)
  const dronesInRoster = new Set(droneRoster);

  // Get placement count for a drone
  const getPlacementCount = (droneName) => placements.filter(p => p.droneName === droneName).length;

  // Check if a drone is at its deployment limit
  const isAtLimit = (droneName) => {
    const droneData = getDroneByName(droneName);
    return getPlacementCount(droneName) >= droneData.limit;
  };

  return (
    <div className="heading-font" style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--color-bg-primary)'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(17, 24, 39, 0.95)',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
        zIndex: 10
      }}>
        {/* Left: Back button */}
        <button
          className="dw-btn dw-btn-secondary"
          style={{ padding: '8px 12px' }}
          onClick={handleCancel}
        >
          <ArrowLeft size={18} />
          <span style={{ marginLeft: '8px' }}>Back</span>
        </button>

        {/* Center: Name input */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 2rem' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deployment Name..."
            className="dw-input"
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '10px 16px',
              fontSize: '14px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '4px',
              color: '#fff',
              textAlign: 'center'
            }}
          />
        </div>

        {/* Right: Stats and Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="dw-stat-box" style={{ padding: '6px 12px' }}>
            <span className="dw-stat-box-label">COST</span>
            <span className="dw-stat-box-value" style={{ color: '#fbbf24' }}>{totalCost}</span>
          </div>
          <div className="dw-stat-box" style={{ padding: '6px 12px' }}>
            <span className="dw-stat-box-label">PLACED</span>
            <span className="dw-stat-box-value" style={{ color: '#06b6d4' }}>{placements.length}</span>
          </div>
          <button
            className={`dw-btn dw-btn-confirm ${!canSave ? 'opacity-50' : ''}`}
            style={{ padding: '8px 16px' }}
            onClick={handleSave}
            disabled={!canSave}
          >
            <Save size={18} style={{ marginRight: '6px' }} />
            Save
          </button>
        </div>
      </header>

      {/* Errors banner */}
      {errors.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.15)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.4)'
        }}>
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: '12px', color: '#ef4444' }}>
            {errors.join(' • ')}
          </span>
        </div>
      )}

      {/* Slot Compatibility Section */}
      {slotValidation.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '10px 14px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
            Slot Compatibility:
          </span>
          {slotValidation.map(v => (
            <div
              key={v.slot.id}
              title={!v.valid ? v.reasons.map(r => r.message).join(', ') : 'Compatible'}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                background: v.valid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${v.valid ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: v.valid ? '#22c55e' : '#ef4444',
                cursor: !v.valid ? 'help' : 'default'
              }}
            >
              {v.name} {v.valid ? '\u2713' : '\u2717'}
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        gap: '1rem',
        overflow: 'hidden'
      }}>
        {/* Lane Assignment Section */}
        <div style={{
          flex: 1,
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Section header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Lane Assignment
            </div>
            {selectedDrone && (
              <span style={{
                color: '#06b6d4',
                fontSize: '12px',
                padding: '4px 12px',
                background: 'rgba(6, 182, 212, 0.2)',
                borderRadius: '4px'
              }}>
                Click a lane to place <strong>{selectedDrone}</strong>
              </span>
            )}
          </div>

          {/* Lanes - Using DroneLanesDisplay wrapped with EditorStatsProvider */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '100%' }}>
              <EditorStatsProvider value={editorStatsValue}>
                <DroneLanesDisplay
                  player={mockPlayerState}
                  isPlayer={true}
                  onLaneClick={handleLaneClick}
                  getLocalPlayerId={() => 'editor'}
                  getOpponentPlayerId={() => 'none'}
                  abilityMode={null}
                  validAbilityTargets={[]}
                  selectedCard={null}
                  validCardTargets={[]}
                  multiSelectState={null}
                  turnPhase={selectedDrone ? 'deployment' : 'action'}
                  localPlayerState={mockPlayerState}
                  opponentPlayerState={emptyOpponentState}
                  localPlacedSections={[]}
                  opponentPlacedSections={[]}
                  gameEngine={null}
                  getPlacedSectionsForEngine={() => []}
                  handleTokenClick={handleTokenClick}
                  handleAbilityIconClick={null}
                  selectedDrone={null}
                  recentlyHitDrones={[]}
                  potentialInterceptors={[]}
                  potentialGuardians={[]}
                  droneRefs={droneRefs}
                  mandatoryAction={null}
                  setHoveredTarget={() => {}}
                  interceptedBadge={null}
                />
              </EditorStatsProvider>
            </div>
          </div>
        </div>

        {/* Drone Roster Section */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          {/* Section header */}
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#fff',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Drone Roster ({droneRoster.length}/5)
            <span style={{
              fontWeight: 'normal',
              marginLeft: '12px',
              color: 'var(--modal-text-secondary)',
              fontSize: '11px',
              textTransform: 'none'
            }}>
              Click a drone to select, then click a lane to place it
            </span>
          </div>

          {/* Roster cards using DroneCard */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {[0, 1, 2, 3, 4].map(slotIndex => {
              const droneName = droneRoster[slotIndex];
              const droneData = droneName ? getDroneByName(droneName) : null;
              const placedCount = droneName ? getPlacementCount(droneName) : 0;
              const atLimit = droneName && isAtLimit(droneName);
              const isSelected = selectedDrone === droneName;

              if (!droneName || !droneData) {
                // Empty slot - show placeholder
                return (
                  <div
                    key={slotIndex}
                    onClick={() => handleOpenPicker(slotIndex)}
                    style={{
                      width: '225px',
                      height: '275px',
                      background: 'rgba(17, 24, 39, 0.6)',
                      border: '2px dashed rgba(6, 182, 212, 0.4)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      fontSize: '48px',
                      color: 'rgba(6, 182, 212, 0.5)',
                      marginBottom: '8px'
                    }}>
                      +
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.4)'
                    }}>
                      Add Drone
                    </div>
                  </div>
                );
              }

              // Filled slot - show DroneCard with placement state
              return (
                <div
                  key={slotIndex}
                  style={{
                    position: 'relative',
                    opacity: atLimit ? 0.6 : 1
                  }}
                >
                  <DroneCard
                    drone={droneData}
                    onClick={handleSelectDrone}
                    isSelectable={!atLimit}
                    isSelected={isSelected}
                    deployedCount={placedCount}
                  />

                  {/* Swap button overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPicker(slotIndex);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      border: '1px solid rgba(6, 182, 212, 0.5)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      color: '#06b6d4',
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                  >
                    Swap
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drone Picker Modal */}
      {showDronePicker !== null && (
        <DronePicker
          availableDrones={availableDrones}
          excludedDrones={dronesInRoster}
          onSelect={handleDroneSelected}
          onClose={() => setShowDronePicker(null)}
        />
      )}
    </div>
  );
};

export default QuickDeployEditorScreen;
