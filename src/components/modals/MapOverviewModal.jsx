import React, { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { debugLog } from '../../utils/debugLogger.js';
import MapPreviewRenderer from '../ui/MapPreviewRenderer';

/**
 * MapOverviewModal Component
 * Detailed map preview before deployment with validation and gate selection
 */
const MapOverviewModal = ({ selectedSlotId, selectedMap, selectedCoordinate, activeSectors = [], onNavigate, onDeploy, onClose }) => {
  const { gameState } = useGameState();
  const [validationError, setValidationError] = useState(null);
  const [selectedGateId, setSelectedGateId] = useState(0); // Default to first gate

  // Find current index in sorted sectors for navigation
  const currentIndex = activeSectors.findIndex(s => s.coordinate === selectedCoordinate);

  // Get prev/next coordinates (cycling around)
  const prevCoordinate = currentIndex > 0
    ? activeSectors[currentIndex - 1].coordinate
    : activeSectors[activeSectors.length - 1]?.coordinate;
  const nextCoordinate = currentIndex < activeSectors.length - 1
    ? activeSectors[currentIndex + 1].coordinate
    : activeSectors[0]?.coordinate;

  // Navigation handlers
  const handlePrev = () => onNavigate?.(prevCoordinate);
  const handleNext = () => onNavigate?.(nextCoordinate);

  const {
    singlePlayerShipSlots,
    singlePlayerShipComponentInstances,
    singlePlayerDroneInstances,
    singlePlayerProfile,
  } = gameState;

  // Defensive: Guard against null props
  if (selectedSlotId == null || selectedMap == null) {
    debugLog('EXTRACTION', '❌ MapOverviewModal rendered with null props!', {
      selectedSlotId,
      selectedMap,
      hasSlotId: selectedSlotId != null,
      hasMap: selectedMap != null
    });

    console.error('[MapOverviewModal] Cannot render: null props', { selectedSlotId, selectedMap });

    return (
      <div className="modal-overlay">
        <div className="modal-container modal-container-sm">
          <h2 className="modal-title text-red-400 mb-4">Error Loading Map</h2>
          <p className="modal-text mb-4">
            Unable to load map details. Please try again.
          </p>
          <button
            onClick={onClose}
            className="btn-cancel w-full"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Log successful prop receipt
  debugLog('EXTRACTION', '✅ MapOverviewModal props received', {
    slotId: selectedSlotId,
    mapName: selectedMap.name,
    mapTier: selectedMap.tier
  });

  /**
   * Validate deployment readiness
   * Checks: all components have hull > 0, no damaged drones, sufficient credits
   */
  const validateDeployment = () => {
    const slot = singlePlayerShipSlots.find(s => s.id === selectedSlotId);
    if (!slot || slot.status !== 'active') {
      return { valid: false, error: 'Invalid ship slot' };
    }

    // Check ship components
    const components = slot.shipComponents;
    if (components) {
      for (const lane of ['left', 'middle', 'right']) {
        const compId = components[lane];
        if (compId) {
          // For slot 0, no instances exist (always full hull)
          if (selectedSlotId !== 0) {
            const instance = singlePlayerShipComponentInstances.find(
              i => i.componentId === compId && i.shipSlotId === selectedSlotId
            );
            if (instance && instance.currentHull <= 0) {
              return { valid: false, error: `Damaged ship component: ${compId}. Repair before deploying.` };
            }
          }
        }
      }
    }

    // Check drones
    if (slot.drones && slot.drones.length > 0) {
      for (const drone of slot.drones) {
        // For slot 0, drones never damaged
        if (selectedSlotId !== 0) {
          const droneId = drone.id || drone.name; // Handle both formats
          const instance = singlePlayerDroneInstances.find(
            i => (i.droneId === droneId || i.droneName === droneId) && i.shipSlotId === selectedSlotId
          );
          if (instance && instance.currentHull <= 0) {
            return { valid: false, error: `Damaged drone: ${droneId}. Repair before deploying.` };
          }
        }
      }
    }

    // Check entry cost (if any)
    const entryCost = selectedMap.entryCost || 0;
    if (singlePlayerProfile.credits < entryCost) {
      return { valid: false, error: `Insufficient credits. Need ${entryCost}, have ${singlePlayerProfile.credits}` };
    }

    return { valid: true };
  };

  /**
   * Handle deploy button click
   */
  const handleDeployClick = () => {
    debugLog('EXTRACTION', '🎯 Deploy button clicked in modal', {
      selectedSlotId,
      selectedMapName: selectedMap?.name,
      selectedGateId,
      hasSlotId: selectedSlotId != null,
      hasMap: selectedMap != null
    });

    const validation = validateDeployment();

    if (!validation.valid) {
      debugLog('EXTRACTION', '❌ Validation failed', { error: validation.error });
      console.warn('[MapOverviewModal] Validation failed:', validation.error);
      setValidationError(validation.error);
      return;
    }

    debugLog('EXTRACTION', '✅ Validation passed, calling onDeploy', {
      slotId: selectedSlotId,
      mapName: selectedMap.name,
      entryGateId: selectedGateId
    });

    setValidationError(null);
    onDeploy(selectedSlotId, selectedMap, selectedGateId); // Pass gate ID
  };

  /**
   * Get difficulty color
   */
  const getDifficultyColor = () => {
    if (selectedMap.tier === 1) return 'text-green-400';
    if (selectedMap.tier === 2) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Use actual POI breakdown from map data
  const poiBreakdown = selectedMap.poiTypeBreakdown || {};
  const totalPOIs = selectedMap.poiCount || Object.values(poiBreakdown).reduce((sum, count) => sum + count, 0);
  const gateCount = selectedMap.gates?.length || selectedMap.gateCount || 3;
  const entryCost = selectedMap.entryCost || 0;

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{
        maxWidth: '850px',
        width: '90vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Header with Navigation */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handlePrev}
            className="btn-utility px-3 py-2"
            disabled={activeSectors.length <= 1}
          >
            ← Prev
          </button>

          <div className="text-center flex-1">
            <h2 className="heading-font text-2xl font-bold text-white">Sector {selectedCoordinate}</h2>
            <p className="body-font text-sm text-gray-400">Ship Slot {selectedSlotId} | Tier {selectedMap.tier}</p>
          </div>

          <button
            onClick={handleNext}
            className="btn-utility px-3 py-2"
            disabled={activeSectors.length <= 1}
          >
            Next →
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="modal-close"
          style={{ position: 'absolute', top: '1rem', right: '1rem' }}
        >
          ×
        </button>

        {/* Two-Column Layout */}
        <div className="flex gap-6 mb-6">
          {/* Left Column: Map Preview */}
          <div className="flex flex-col">
            {/* Map Preview */}
            {selectedMap.hexes ? (
              <MapPreviewRenderer
                hexes={selectedMap.hexes}
                gates={selectedMap.gates || []}
                pois={selectedMap.pois || []}
                radius={selectedMap.radius || 5}
                selectedGateId={selectedGateId}
                onGateSelect={setSelectedGateId}
              />
            ) : (
              <div style={{
                width: '400px',
                height: '400px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🗺️</div>
                  <p>Map data loading...</p>
                </div>
              </div>
            )}

            {/* Gate Selection Info */}
            <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
              <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                Click a gate
                <svg width="16" height="16" viewBox="-8 -8 16 16" style={{ display: 'inline-block' }}>
                  <polygon
                    points="0,-6 6,0 0,6 -6,0"
                    fill="#3b82f6"
                    stroke="#fff"
                    strokeWidth="1"
                  />
                </svg>
                on the map to select entry point
              </p>
              <p className="text-cyan-400 font-bold">
                ▶ Entry Point: Gate {selectedGateId + 1}
              </p>
            </div>
          </div>

          {/* Right Column: Sector Intel */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Section Header */}
            <div className="border-b border-gray-700 pb-2">
              <h3 className="heading-font text-lg font-bold text-cyan-400">SECTOR INTEL</h3>
            </div>

            {/* Basic Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-900 rounded">
                <div className="text-xs text-gray-400 mb-1">Difficulty</div>
                <div className={`text-lg font-bold ${getDifficultyColor()}`}>
                  Tier {selectedMap.tier}
                </div>
              </div>
              <div className="p-3 bg-gray-900 rounded">
                <div className="text-xs text-gray-400 mb-1">Total POIs</div>
                <div className="text-lg font-bold text-white">{totalPOIs}</div>
              </div>
              <div className="p-3 bg-gray-900 rounded">
                <div className="text-xs text-gray-400 mb-1">Gates</div>
                <div className="text-lg font-bold text-blue-400">{gateCount}</div>
              </div>
            </div>

            {/* POI Breakdown */}
            <div className="p-4 bg-gray-900 rounded">
              <div className="text-sm text-gray-400 mb-3 border-b border-gray-700 pb-2">POI BREAKDOWN</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Ordnance:</span>
                  <span className="text-red-400 font-bold">{poiBreakdown.Ordnance || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Support:</span>
                  <span className="text-blue-400 font-bold">{poiBreakdown.Support || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Tactic:</span>
                  <span className="text-orange-400 font-bold">{poiBreakdown.Tactic || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Upgrade:</span>
                  <span className="text-purple-400 font-bold">{poiBreakdown.Upgrade || 0}</span>
                </div>
              </div>
            </div>

            {/* Detection & Encounter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-900 rounded">
                <div className="text-xs text-gray-400 mb-1">Starting Detection</div>
                <div className={`text-lg font-bold ${(selectedMap.baseDetection || 0) > 10 ? 'text-orange-400' : 'text-green-400'}`}>
                  {selectedMap.baseDetection || 0}%
                </div>
              </div>
              <div className="p-3 bg-gray-900 rounded">
                <div className="text-xs text-gray-400 mb-1">Encounter Risk</div>
                <div className={`text-lg font-bold ${(selectedMap.baseEncounterChance || 5) > 5 ? 'text-orange-400' : 'text-green-400'}`}>
                  {selectedMap.baseEncounterChance || 5}%
                </div>
              </div>
            </div>

            {/* Detection Warning */}
            {(selectedMap.baseDetection || 0) > 10 && (
              <div className="p-3 bg-orange-900 bg-opacity-30 border border-orange-700 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="text-orange-200 font-bold text-sm">Elevated Detection</div>
                    <p className="text-xs text-orange-300">
                      High POI density means you start with {selectedMap.baseDetection}% detection
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Error */}
            {validationError && (
              <div className="p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-xl">❌</span>
                  <div>
                    <div className="text-red-200 font-bold text-sm">Cannot Deploy</div>
                    <p className="text-xs text-red-300">{validationError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="btn-utility flex-1 py-3"
          >
            Back
          </button>
          <button
            onClick={handleDeployClick}
            className="btn-confirm flex-1 py-3"
          >
            Deploy →
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapOverviewModal;
