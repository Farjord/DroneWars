import React, { useState, useMemo } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { debugLog } from '../../utils/debugLogger.js';
import { validateDeckForDeployment } from '../../utils/singlePlayerDeckUtils.js';
import { ECONOMY } from '../../data/economyData.js';
import ReputationService from '../../logic/reputation/ReputationService.js';
import MapPreviewRenderer from '../ui/MapPreviewRenderer';
import { Map, AlertTriangle, XCircle, Info, Shield, HelpCircle } from 'lucide-react';

/**
 * MapOverviewModal Component
 * Detailed map preview before deployment with validation and gate selection
 */
const MapOverviewModal = ({ selectedSlotId, selectedMap, selectedCoordinate, activeSectors = [], onNavigate, onDeploy, onClose, onShowHelp }) => {
  const { gameState } = useGameState();
  const [validationError, setValidationError] = useState(null);
  const [selectedGateId, setSelectedGateId] = useState(0); // Default to first gate
  const [currentSlotId, setCurrentSlotId] = useState(selectedSlotId); // Track selected ship slot

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

  // Compute all active slots with validity info
  const allActiveSlots = useMemo(() => {
    if (!singlePlayerShipSlots) return [];

    return singlePlayerShipSlots
      .filter(slot => slot.status === 'active')
      .map(slot => {
        // Convert slot data to validation format
        const deckObj = {};
        (slot.decklist || []).forEach(card => {
          deckObj[card.id] = card.quantity;
        });
        const dronesObj = {};
        (slot.droneSlots || []).forEach(s => {
          if (s.assignedDrone) dronesObj[s.assignedDrone] = 1;
        });

        const validation = validateDeckForDeployment(deckObj, dronesObj, slot.shipComponents);
        return { ...slot, isValid: validation.valid };
      });
  }, [singlePlayerShipSlots]);

  // Check if the currently selected slot is invalid
  const isCurrentSlotInvalid = useMemo(() => {
    const current = allActiveSlots.find(s => s.id === currentSlotId);
    return current && !current.isValid;
  }, [allActiveSlots, currentSlotId]);

  // Get current slot details for display
  const currentSlot = singlePlayerShipSlots?.find(s => s.id === currentSlotId);

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
      <div className="dw-modal-overlay" onClick={onClose}>
        <div className="dw-modal-content dw-modal--sm dw-modal--danger" onClick={e => e.stopPropagation()}>
          <div className="dw-modal-header">
            <div className="dw-modal-header-icon">
              <AlertTriangle size={28} />
            </div>
            <div className="dw-modal-header-info">
              <h2 className="dw-modal-header-title">Error Loading Map</h2>
              <p className="dw-modal-header-subtitle">Unable to load map details</p>
            </div>
          </div>
          <div className="dw-modal-body">
            <p className="dw-modal-text">
              Please try again or select a different sector.
            </p>
          </div>
          <div className="dw-modal-actions">
            <button onClick={onClose} className="dw-btn dw-btn-cancel dw-btn--full">
              Close
            </button>
          </div>
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
   * Checks: deck validity, all components have hull > 0, no damaged drones, sufficient credits
   */
  const validateDeployment = () => {
    const slot = singlePlayerShipSlots.find(s => s.id === currentSlotId);
    if (!slot || slot.status !== 'active') {
      return { valid: false, error: 'Invalid ship slot' };
    }

    // Check deck validity (40 cards, 5 drones, 3 components)
    const deckObj = {};
    (slot.decklist || []).forEach(card => {
      deckObj[card.id] = card.quantity;
    });
    const dronesObj = {};
    (slot.droneSlots || []).forEach(s => {
      if (s.assignedDrone) dronesObj[s.assignedDrone] = 1;
    });
    const deckValidation = validateDeckForDeployment(deckObj, dronesObj, slot.shipComponents);
    if (!deckValidation.valid) {
      return { valid: false, error: deckValidation.errors[0] };
    }

    // Check ship components for damage
    const components = slot.shipComponents;
    if (components) {
      for (const lane of ['left', 'middle', 'right']) {
        const compId = components[lane];
        if (compId) {
          // For slot 0, no instances exist (always full hull)
          if (currentSlotId !== 0) {
            const instance = singlePlayerShipComponentInstances.find(
              i => i.componentId === compId && i.shipSlotId === currentSlotId
            );
            if (instance && instance.currentHull <= 0) {
              return { valid: false, error: `Damaged ship component: ${compId}. Repair before deploying.` };
            }
          }
        }
      }
    }

    // Check drone slots for damage (using slot-based damage model)
    if (slot.droneSlots && slot.droneSlots.length > 0 && currentSlotId !== 0) {
      for (const droneSlot of slot.droneSlots) {
        if (droneSlot.assignedDrone && droneSlot.slotDamaged) {
          // Note: Slot damage reduces drone limit but doesn't prevent deployment
          // This check is kept for consistency but may be adjusted based on game design
        }
      }
    }

    // Check entry cost (if any)
    const entryCost = selectedMap.entryCost || 0;
    if (singlePlayerProfile.credits < entryCost) {
      return { valid: false, error: `Insufficient credits. Need ${entryCost}, have ${singlePlayerProfile.credits}` };
    }

    // Check token cost for maps with token-required PoIs
    if (selectedMap.requiresToken) {
      const tokenCost = 1;
      const playerTokens = singlePlayerProfile.securityTokens || 0;
      if (playerTokens < tokenCost) {
        return { valid: false, error: `Requires 1 Security Token. You have ${playerTokens}.` };
      }
    }

    return { valid: true };
  };

  /**
   * Handle deploy button click
   */
  const handleDeployClick = () => {
    debugLog('EXTRACTION', '🎯 Deploy button clicked in modal', {
      currentSlotId,
      selectedMapName: selectedMap?.name,
      selectedGateId,
      hasSlotId: currentSlotId != null,
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
      slotId: currentSlotId,
      mapName: selectedMap.name,
      entryGateId: selectedGateId
    });

    setValidationError(null);
    onDeploy(currentSlotId, selectedMap, selectedGateId); // Pass gate ID
  };

  /**
   * Get difficulty color - returns actual color values for inline styles
   */
  const getDifficultyColor = () => {
    if (selectedMap.tier === 1) return '#22c55e';  // green
    if (selectedMap.tier === 2) return '#eab308';  // yellow
    return '#ef4444';  // red
  };

  // Use actual POI breakdown from map data
  const poiBreakdown = selectedMap.poiTypeBreakdown || {};
  const totalPOIs = selectedMap.poiCount || Object.values(poiBreakdown).reduce((sum, count) => sum + count, 0);
  const gateCount = selectedMap.gates?.length || selectedMap.gateCount || 3;
  const entryCost = selectedMap.entryCost || 0;

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xl dw-modal--action" style={{ maxWidth: '760px' }} onClick={e => e.stopPropagation()}>
        {/* Header with Navigation */}
        <div className="dw-modal-header">
          <button
            onClick={handlePrev}
            className="dw-btn dw-btn-secondary"
            disabled={activeSectors.length <= 1}
            style={{ marginRight: '12px' }}
          >
            ← Prev
          </button>

          <div className="dw-modal-header-info" style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
            <h2 className="dw-modal-header-title">Sector {selectedCoordinate}</h2>
            <p className="dw-modal-header-subtitle">
              {currentSlot ? (currentSlot.id === 0 ? 'Starter Deck' : (currentSlot.name || `Slot ${currentSlotId}`)) : 'No Ship'} | Tier {selectedMap.tier}
            </p>
            {onShowHelp && (
              <button
                onClick={onShowHelp}
                title="Show help"
                style={{
                  position: 'absolute',
                  top: '0',
                  right: '-28px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#06b6d4',
                  opacity: 0.7,
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                <HelpCircle size={18} />
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            className="dw-btn dw-btn-secondary"
            disabled={activeSectors.length <= 1}
            style={{ marginLeft: '12px' }}
          >
            Next →
          </button>
        </div>

        {/* Body - Two Column Grid Layout */}
        <div className="dw-modal-body">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '340px 340px',
            gap: '12px 24px'
          }}>
            {/* Row 1, Col 1: Map - pushed to bottom of row */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {selectedMap.hexes ? (
                <MapPreviewRenderer
                  hexes={selectedMap.hexes}
                  gates={selectedMap.gates || []}
                  pois={selectedMap.pois || []}
                  radius={selectedMap.radius || 5}
                  selectedGateId={selectedGateId}
                  onGateSelect={setSelectedGateId}
                  size={340}
                />
              ) : (
                <div style={{
                  width: '340px',
                  height: '340px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '6px',
                  border: '1px solid var(--modal-action-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ textAlign: 'center', color: 'var(--modal-text-muted)' }}>
                    <Map size={48} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p>Map data loading...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Row 1, Col 2: Intel + POI Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Section Header */}
              <div style={{ borderBottom: '1px solid var(--modal-border)', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--modal-action)', margin: 0 }}>SECTOR INTEL</h3>
              </div>

              {/* Basic Stats */}
              <div className="dw-modal-grid dw-modal-grid--3">
                <div className="dw-modal-stat">
                  <div className="dw-modal-stat-label">Difficulty</div>
                  <div className="dw-modal-stat-value" style={{ color: getDifficultyColor() }}>
                    Tier {selectedMap.tier}
                  </div>
                </div>
                <div className="dw-modal-stat">
                  <div className="dw-modal-stat-label">Total POIs</div>
                  <div className="dw-modal-stat-value">{totalPOIs}</div>
                </div>
                <div className="dw-modal-stat">
                  <div className="dw-modal-stat-label">Gates</div>
                  <div className="dw-modal-stat-value" style={{ color: '#3b82f6' }}>{gateCount}</div>
                </div>
              </div>

              {/* POI Breakdown - Single Column */}
              <div className="dw-modal-info-box" style={{ flex: 1 }}>
                <p className="dw-modal-info-title" style={{ marginBottom: '8px' }}>POI BREAKDOWN</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--modal-text-secondary)' }}>Ordnance:</span>
                    <span style={{ color: 'var(--modal-danger)', fontWeight: 600 }}>{poiBreakdown.Ordnance || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--modal-text-secondary)' }}>Support:</span>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>{poiBreakdown.Support || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--modal-text-secondary)' }}>Tactic:</span>
                    <span style={{ color: '#3b82f6', fontWeight: 600 }}>{poiBreakdown.Tactic || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--modal-text-secondary)' }}>Upgrade:</span>
                    <span style={{ color: '#a855f7', fontWeight: 600 }}>{poiBreakdown.Upgrade || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--modal-text-secondary)' }}>Resource:</span>
                    <span style={{ color: '#f97316', fontWeight: 600 }}>{poiBreakdown.Resource || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--modal-text-secondary)' }}>Blueprints:</span>
                    <span style={{ color: '#a855f7', fontWeight: 600 }}>{selectedMap.dronePoiCount || poiBreakdown.Drone || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2, Col 1: Gate Selection Info */}
            <div className="dw-modal-info-box" style={{ width: '100%', height: '100%' }}>
              <p style={{ fontSize: '13px', color: 'var(--modal-text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <p style={{ color: 'var(--modal-action)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="-8 -8 16 16" style={{ display: 'inline-block' }}>
                  <polygon
                    points="0,-6 6,0 0,6 -6,0"
                    fill="#22c55e"
                    stroke="#fff"
                    strokeWidth="1"
                  />
                </svg>
                Entry Point: Gate {selectedGateId + 1}
              </p>
            </div>

            {/* Row 2, Col 2: Detection & Encounter */}
            <div className="dw-modal-grid dw-modal-grid--2" style={{ height: '100%' }}>
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label">Starting Detection</div>
                <div className="dw-modal-stat-value" style={{ color: (selectedMap.baseDetection || 0) > 10 ? '#f97316' : 'var(--modal-success)' }}>
                  {selectedMap.baseDetection || 0}%
                </div>
              </div>
              <div className="dw-modal-stat">
                <div className="dw-modal-stat-label">Encounter Risk</div>
                <div className="dw-modal-stat-value" style={{ color: (selectedMap.baseEncounterChance || 5) > 5 ? '#f97316' : 'var(--modal-success)' }}>
                  {selectedMap.baseEncounterChance || 5}%
                </div>
              </div>
            </div>

            {/* Row 3, Col 1: Requirements */}
            <div className="dw-modal-info-box" style={{ width: '100%', height: '100%' }}>
              <p className="dw-modal-info-title" style={{ marginBottom: '8px' }}>REQUIREMENTS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                {/* Entry Requirements */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--modal-text-secondary)' }}>
                    <Shield size={14} style={{ color: '#06b6d4' }} />
                    Entry Requirements:
                  </span>
                  {selectedMap?.requiresToken ? (
                    <span style={{
                      color: (singlePlayerProfile?.securityTokens || 0) >= 1 ? '#22c55e' : '#ef4444',
                      fontWeight: 600
                    }}>
                      1 Token (You have: {singlePlayerProfile?.securityTokens || 0})
                    </span>
                  ) : (
                    <span style={{ color: 'var(--modal-text-muted)' }}>None</span>
                  )}
                </div>

                {/* Extraction Limit */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--modal-text-secondary)' }}>
                    <Info size={14} style={{ color: '#f59e0b' }} />
                    Extraction Limit:
                  </span>
                  {(() => {
                    const isStarterDeck = currentSlotId === 0;
                    const baseLimit = isStarterDeck
                      ? (ECONOMY.STARTER_DECK_EXTRACTION_LIMIT || 3)
                      : (ECONOMY.CUSTOM_DECK_EXTRACTION_LIMIT || 6);
                    const reputationBonus = isStarterDeck ? 0 : ReputationService.getExtractionBonus();
                    const totalLimit = baseLimit + reputationBonus;

                    return (
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                        {totalLimit} items{reputationBonus > 0 && ` (+${reputationBonus} rep)`}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Row 3, Col 2: Deploy Ship */}
            <div className="dw-modal-info-box" style={{ width: '100%', height: '100%' }}>
              <p className="dw-modal-info-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                DEPLOY SHIP
                {isCurrentSlotInvalid && (
                  <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={14} />
                    CURRENT SHIP IS INVALID
                  </span>
                )}
              </p>
              {allActiveSlots.length > 0 ? (
                <select
                  value={currentSlotId}
                  onChange={(e) => setCurrentSlotId(Number(e.target.value))}
                  className="w-full bg-slate-700 border border-cyan-500/50 rounded px-3 py-2 text-white font-orbitron focus:outline-none focus:border-cyan-400"
                >
                  {allActiveSlots.map(slot => (
                    <option key={slot.id} value={slot.id}>
                      {!slot.isValid ? '⚠ ' : ''}{slot.id === 0 ? 'Starter Deck' : (slot.name || `Ship Slot ${slot.id}`)}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ color: 'var(--modal-danger)', fontSize: '13px' }}>
                  <p style={{ margin: 0 }}>No ships available.</p>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--modal-text-secondary)' }}>
                    Create a ship in the Hangar first.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Validation Error (outside grid, full width) */}
          {validationError && (
            <div className="dw-modal-info-box" style={{ marginTop: '12px', '--modal-theme': 'var(--modal-danger)', '--modal-theme-bg': 'var(--modal-danger-bg)', '--modal-theme-border': 'var(--modal-danger-border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <XCircle size={18} style={{ color: 'var(--modal-danger)', flexShrink: 0 }} />
                <div>
                  <p className="dw-modal-info-title">Cannot Deploy</p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--modal-text-primary)' }}>{validationError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button onClick={onClose} className="dw-btn dw-btn-cancel">
            Back
          </button>
          <button
            onClick={handleDeployClick}
            className="dw-btn dw-btn-confirm"
            disabled={allActiveSlots.length === 0 || isCurrentSlotInvalid}
          >
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapOverviewModal;
