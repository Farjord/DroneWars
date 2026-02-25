/**
 * QuickDeployEditorScreen Component
 * Full-page screen for creating/editing quick deployment templates
 * Uses actual game components (DroneLanesDisplay, DroneCard) for visual fidelity
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { useGameState } from '../../hooks/useGameState';
import SoundManager from '../../managers/SoundManager.js';
import { debugLog } from '../../utils/debugLogger.js';
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
import DeploymentOrderQueue from '../quickDeploy/DeploymentOrderQueue';
import { EditorStatsProvider } from '../../contexts/EditorStatsContext';
import TargetingArrow, { calculatePolygonPoints } from '../ui/TargetingArrow';

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
  // Initialize deploymentOrder from deployment or default to [0, 1, 2, ...] matching placements
  const [deploymentOrder, setDeploymentOrder] = useState(
    deployment.deploymentOrder || deployment.placements.map((_, i) => i)
  );
  const [selectedDrone, setSelectedDrone] = useState(null); // Drone selected for placement
  const [showDronePicker, setShowDronePicker] = useState(null); // Slot index to pick for
  const [draggedDrone, setDraggedDrone] = useState(null); // { drone, droneName } - Drone being dragged for placement
  const [dragStartPos, setDragStartPos] = useState(null); // { x, y, drone, name } - Pending drag start position
  const [droneDragArrowState, setDroneDragArrowState] = useState({
    visible: false,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 }
  });

  // Movement threshold before drag starts (allows clicks to work)
  const DRAG_THRESHOLD = 5;

  // Refs for DroneLanesDisplay and drag arrow
  const droneRefs = useRef({});
  const droneDragArrowRef = useRef(null);
  const editorAreaRef = useRef(null);

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

    placements.forEach((placement, placementIndex) => {
      const droneData = getDroneByName(placement.droneName);
      if (!droneData) return;

      const laneKey = `lane${placement.lane + 1}`;

      // Find this placement's position in deploymentOrder (for displaying order badge)
      const orderPosition = deploymentOrder.indexOf(placementIndex);
      const displayOrder = orderPosition !== -1 ? orderPosition + 1 : null;

      // Create drone object with all fields required by stats calculator
      dronesOnBoard[laneKey].push({
        id: `editor_${placement.droneName}_${placementIndex}`,
        name: droneData.name,
        image: droneData.image,
        hull: droneData.hull,
        currentShields: droneData.shields,
        isExhausted: false,
        statMods: [],        // Required for stat calculation
        isMarked: false,
        isTeleporting: false,
        deploymentOrderNumber: displayOrder  // 1-based order for badge display
      });
    });

    return {
      dronesOnBoard,
      shipSections: {},
      energy: 0,
      appliedUpgrades: {}  // Required for stats calculator
    };
  }, [placements, deploymentOrder]);

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

  // Helper to place a drone in a lane
  const placeDroneInLane = (droneName, laneId) => {
    // Convert laneId to lane index (lane1 -> 0, lane2 -> 1, lane3 -> 2)
    const laneIndex = parseInt(laneId.replace('lane', '')) - 1;

    // Add placement and append new index to deploymentOrder
    const newPlacementIndex = placements.length;
    setPlacements([...placements, { droneName, lane: laneIndex }]);
    setDeploymentOrder([...deploymentOrder, newPlacementIndex]);
  };

  // Handle clicking a lane to place selected drone
  const handleLaneClick = (e, laneId, isPlayer) => {
    if (!selectedDrone || !isPlayer) return;
    placeDroneInLane(selectedDrone, laneId);
    setSelectedDrone(null);
  };

  // Game-style drag handlers using mouseDown/mouseUp with TargetingArrow
  // Note: startPos is pre-calculated and passed from dragStartPos when threshold is exceeded
  const handleDroneDragStart = (drone, droneName, startPos) => {
    if (isAtLimit(droneName)) return;

    setDraggedDrone({ drone, droneName });

    if (startPos) {
      setDroneDragArrowState({
        visible: true,
        start: { x: startPos.arrowX, y: startPos.arrowY },
        end: { x: startPos.arrowX, y: startPos.arrowY }
      });
    }
  };

  // Drag end - clears state and optionally places drone
  const handleDroneDragEnd = (targetDrone, laneId = null) => {
    if (draggedDrone && laneId) {
      placeDroneInLane(draggedDrone.droneName, laneId);
    }
    setDraggedDrone(null);
    setDroneDragArrowState(prev => ({ ...prev, visible: false }));
  };

  // Mouse move effect for arrow tracking and movement threshold detection
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Check if we need to start drag (movement threshold exceeded)
      if (dragStartPos && !draggedDrone) {
        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          // Movement threshold exceeded - start actual drag using stored position
          handleDroneDragStart(dragStartPos.drone, dragStartPos.name, dragStartPos);
          setDragStartPos(null);
        }
      }

      // Update arrow position if drag is active
      if (droneDragArrowState.visible && droneDragArrowRef.current && editorAreaRef.current) {
        const areaRect = editorAreaRef.current.getBoundingClientRect();
        const endX = e.clientX - areaRect.left;
        const endY = e.clientY - areaRect.top;

        const newPoints = calculatePolygonPoints(
          droneDragArrowState.start,
          { x: endX, y: endY }
        );
        droneDragArrowRef.current.setAttribute('points', newPoints);
      }
    };

    const handleMouseUp = () => {
      // Clear pending drag start (allows click to complete normally)
      setDragStartPos(null);

      // Cancel active drag if mouseup outside valid target
      // Use setTimeout to allow React onClick handlers to fire first
      if (draggedDrone) {
        setTimeout(() => handleDroneDragEnd(null, null), 0);
      }
    };

    // Listen on document for mousemove (user can drag outside the area)
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [droneDragArrowState.visible, droneDragArrowState.start, draggedDrone, dragStartPos]);

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

      // Update deploymentOrder: remove the index and renumber remaining indices
      const newOrder = deploymentOrder
        .filter(idx => idx !== placementIndex)  // Remove the deleted index
        .map(idx => idx > placementIndex ? idx - 1 : idx);  // Renumber indices after the removed one
      setDeploymentOrder(newOrder);
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

    // If replacing an existing drone, remove its placements and update deploymentOrder
    if (showDronePicker < droneRoster.length) {
      const oldDrone = droneRoster[showDronePicker];
      if (oldDrone) {
        // Find indices of placements being removed
        const removedIndices = new Set(
          placements
            .map((p, idx) => p.droneName === oldDrone ? idx : -1)
            .filter(idx => idx !== -1)
        );

        // Filter placements
        const newPlacements = placements.filter(p => p.droneName !== oldDrone);
        setPlacements(newPlacements);

        // Update deploymentOrder: remove indices and renumber
        if (removedIndices.size > 0) {
          let newIndex = 0;
          const indexMapping = {};
          placements.forEach((_, oldIdx) => {
            if (!removedIndices.has(oldIdx)) {
              indexMapping[oldIdx] = newIndex++;
            }
          });

          const newOrder = deploymentOrder
            .filter(idx => !removedIndices.has(idx))
            .map(idx => indexMapping[idx]);
          setDeploymentOrder(newOrder);
        }
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

    // Find indices of placements being removed
    const removedIndices = new Set(
      placements
        .map((p, idx) => p.droneName === droneName ? idx : -1)
        .filter(idx => idx !== -1)
    );

    // Filter placements
    const newPlacements = placements.filter(p => p.droneName !== droneName);
    setPlacements(newPlacements);

    // Update deploymentOrder: remove indices and renumber
    if (removedIndices.size > 0) {
      // Build a mapping from old indices to new indices
      let newIndex = 0;
      const indexMapping = {};
      placements.forEach((_, oldIdx) => {
        if (!removedIndices.has(oldIdx)) {
          indexMapping[oldIdx] = newIndex++;
        }
      });

      const newOrder = deploymentOrder
        .filter(idx => !removedIndices.has(idx))
        .map(idx => indexMapping[idx]);
      setDeploymentOrder(newOrder);
    }

    // Remove from roster
    const newRoster = droneRoster.filter((_, i) => i !== slotIndex);
    setDroneRoster(newRoster);
  };

  // Handle save
  const handleSave = () => {
    if (!canSave) return;

    try {
      if (isCreating) {
        // Create new deployment - create() will set default deploymentOrder
        // but then immediately update with the user's order
        const created = service.create(name.trim(), droneRoster, placements);
        // Update with custom deploymentOrder if different from default
        if (JSON.stringify(deploymentOrder) !== JSON.stringify(placements.map((_, i) => i))) {
          service.update(created.id, { deploymentOrder });
        }
      } else {
        service.update(deployment.id, {
          name: name.trim(),
          droneRoster,
          placements,
          deploymentOrder
        });
      }
      // Navigate back to hangar
      gameStateManager.setState({
        appState: 'hangar',
        quickDeployEditorData: null
      });
    } catch (error) {
      debugLog('QUICK_DEPLOY', 'Failed to save quick deployment:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    gameStateManager.setState({
      appState: 'hangar',
      quickDeployEditorData: null
    });
  };

  // Handle reordering deployment order from the order panel
  const handleReorder = (newOrder) => {
    setDeploymentOrder(newOrder);
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
      <div
        ref={editorAreaRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          gap: '1rem',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Targeting Arrow - FIRST inside relative container (matches App.jsx pattern) */}
        <TargetingArrow
          visible={droneDragArrowState.visible}
          start={droneDragArrowState.start}
          end={droneDragArrowState.end}
          lineRef={droneDragArrowRef}
          color="#06b6d4"
          showPulses={false}
        />

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
                  turnPhase={selectedDrone || draggedDrone ? 'deployment' : 'action'}
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
                  draggedDrone={draggedDrone}
                  handleDroneDragEnd={handleDroneDragEnd}
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
          padding: '1rem',
          position: 'relative'
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

          {/* Content wrapper - cards centered, order panel absolutely positioned on right */}
          <div style={{
            position: 'relative'
          }}>
            {/* Roster cards using DroneCard - always centered */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              paddingRight: placements.length > 0 ? '376px' : '0' // Make room for order panel
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
                    onClick={() => { SoundManager.getInstance().play('ui_click'); handleOpenPicker(slotIndex); }}
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
                  data-testid={`roster-drone-${droneName}`}
                  onMouseDown={(e) => {
                    // Record position - drag starts only after movement threshold (allows clicks)
                    if (!atLimit && editorAreaRef.current) {
                      const areaRect = editorAreaRef.current.getBoundingClientRect();
                      const tokenRect = e.currentTarget.getBoundingClientRect();
                      const arrowX = tokenRect.left + tokenRect.width / 2 - areaRect.left;
                      const arrowY = tokenRect.top - areaRect.top + 15;
                      setDragStartPos({
                        x: e.clientX,
                        y: e.clientY,
                        drone: droneData,
                        name: droneName,
                        arrowX,
                        arrowY
                      });
                    }
                  }}
                  style={{
                    position: 'relative',
                    opacity: atLimit ? 0.6 : 1,
                    cursor: atLimit ? 'not-allowed' : 'grab',
                    userSelect: 'none',
                    zIndex: draggedDrone?.droneName === droneName ? 50 : 10
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

            {/* Deploy Order Panel - Absolutely positioned on right */}
            {placements.length > 0 && (
              <div
                className="panel-scrollable"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '360px',
                  maxHeight: '280px',
                  background: 'rgba(17, 24, 39, 0.6)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  borderRadius: '6px',
                  padding: '0.75rem'
                }}
              >
                <DeploymentOrderQueue
                  placements={placements}
                  deploymentOrder={deploymentOrder}
                  onReorder={handleReorder}
                />
              </div>
            )}
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
