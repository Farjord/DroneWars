// ========================================
// HEX INFO PANEL
// ========================================
// Fixed right-side panel with two views:
// 1. Waypoint List view (default) - Shows journey plan
// 2. Hex Info view - Shows details for inspected hex

import React, { useState, useRef } from 'react';
import { Info } from 'lucide-react';
import MovementController from '../../logic/map/MovementController.js';
import DetectionManager from '../../logic/detection/DetectionManager.js';
import SalvageController from '../../logic/salvage/SalvageController.js';
import { mapTiers } from '../../data/mapData.js';
import { packTypes } from '../../data/cardPackData.js';
import { HEX_INFO_HELP_TEXT } from '../../data/hexInfoHelpText.js';
import { axialToDisplayLabel } from '../../utils/hexGrid.js';
import DetectionMeter from './DetectionMeter.jsx';
import './HexInfoPanel.css';

// ========================================
// SVG ICON COMPONENTS
// ========================================

// Diamond/Cube icon for POIs
const IconPOI = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M12 6L18 12L12 18L6 12L12 6Z" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
  </svg>
);

// Hexagon portal icon for Gates
const IconGate = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.8" />
  </svg>
);

// Simple hex outline for empty hexes
const IconHex = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

// Crosshair/target icon for current position
const IconCrosshair = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" />
    <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1.5" />
    <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// Radar/grid icon for empty state
const IconRadar = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
    <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
    <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
    <path d="M12 12L18 6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// Checkmark icon
const IconCheck = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Warning triangle icon
const IconWarning = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`svg-icon ${className}`}>
    <path d="M12 3L22 21H2L12 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="12" y1="9" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17.5" r="1" fill="currentColor" />
  </svg>
);

// ========================================
// STAT LABEL WITH INFO TOOLTIP
// ========================================

/**
 * StatLabel - Label with optional info icon tooltip
 * Uses fixed positioning to escape overflow clipping from parent containers
 * @param {string} text - The label text
 * @param {string} helpKey - Key into HEX_INFO_HELP_TEXT for tooltip content
 */
const StatLabel = ({ text, helpKey }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const wrapperRef = useRef(null);
  const helpContent = helpKey ? HEX_INFO_HELP_TEXT[helpKey] : null;

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const tooltipWidth = 200; // matches CSS width
      const padding = 8;

      // Calculate centered position
      let left = rect.left + rect.width / 2;

      // Check right edge overflow - if tooltip would go past viewport, align to right edge
      if (left + tooltipWidth / 2 > window.innerWidth - padding) {
        left = window.innerWidth - padding - tooltipWidth / 2;
      }

      // Check left edge overflow (less likely but good to handle)
      if (left - tooltipWidth / 2 < padding) {
        left = padding + tooltipWidth / 2;
      }

      setTooltipStyle({
        left,
        top: rect.bottom + 8,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <span className="stat-label">
      {text}
      {helpContent && (
        <span
          ref={wrapperRef}
          className="stat-info-wrapper"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Info size={12} className="stat-info-icon" />
          {showTooltip && (
            <span className="stat-tooltip stat-tooltip-visible" style={tooltipStyle}>
              {helpContent.description}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

/**
 * EscapeRouteDisplay - Shows nearest extraction gate coordinate
 */
const EscapeRouteDisplay = ({ escapeRouteData, hasWaypoints, mapRadius }) => {
  if (!escapeRouteData) return null;

  const { fromCurrent, afterJourney, noPathExists } = escapeRouteData;

  if (noPathExists) {
    return (
      <div className="escape-route-display escape-route-trapped">
        <span className="escape-route-icon">!</span>
        <span className="escape-route-text">No escape route available</span>
      </div>
    );
  }

  const getStatusClass = (wouldMIA) => wouldMIA ? 'escape-critical' : 'escape-safe';
  const getGateLabel = (routeData) => {
    if (!routeData?.gate) return '?';
    if (routeData.wouldMIA) return 'MIA';
    return axialToDisplayLabel(routeData.gate.q, routeData.gate.r, mapRadius);
  };

  return (
    <div className="escape-route-display">
      <div className="escape-route-header">
        <StatLabel text="Escape Route" helpKey="escapeRoute" />
      </div>
      <div className="escape-route-values">
        {fromCurrent && (
          <div className={`escape-route-item ${getStatusClass(fromCurrent.wouldMIA)}`}>
            <span className="escape-label">Current</span>
            <span className="escape-arrow">→</span>
            <span className="escape-gate">{getGateLabel(fromCurrent)}</span>
          </div>
        )}
        {hasWaypoints && afterJourney && (
          <>
            <span className="escape-divider">|</span>
            <div className={`escape-route-item ${getStatusClass(afterJourney.wouldMIA)}`}>
              <span className="escape-label">After Journey</span>
              <span className="escape-arrow">→</span>
              <span className="escape-gate">{getGateLabel(afterJourney)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * HexInfoPanel - Two-view panel for journey planning and hex inspection
 *
 * Views:
 * - inspectedHex === null: Waypoint List view
 * - inspectedHex !== null: Hex Info view
 */
function HexInfoPanel({
  // Journey state
  waypoints,
  currentDetection,
  playerPosition,
  mapData,

  // View state
  inspectedHex,

  // Waypoint List actions
  onWaypointClick,
  onCommence,
  onClearAll,

  // Hex Info actions
  onBackToJourney,
  onToggleWaypoint,
  isWaypointFn,

  // Movement state
  isMoving,
  isPaused,
  onTogglePause,
  onCancel,
  currentWaypointIndex = 0,
  currentHexIndex = 0,
  totalWaypoints = 0,

  // Tier config for calculations
  tierConfig: passedTierConfig,
  mapRadius = 5,

  // Looted POI tracking
  lootedPOIs = [],

  // Scanning state
  isScanningHex = false,

  // Escape route data
  escapeRouteData = null,

  // Pathfinding mode
  pathMode = 'shortest',
  onPathModeChange,
  previewPath = null
}) {
  // Use passed tierConfig if available, otherwise compute from mapData
  const tierConfig = passedTierConfig || (mapData ? mapTiers[mapData.tier - 1] : null);

  // ========================================
  // HEX INFO HELPERS
  // ========================================

  const getTargetLabel = (hex) => {
    if (!hex) return '';
    if (hex.type === 'poi') return 'Point of Interest';
    if (hex.type === 'gate') return 'Extraction Gate';
    return 'Empty Hex';
  };

  const getTargetIcon = (hex, size = 24) => {
    if (!hex) return null;
    if (hex.type === 'poi') return <IconPOI size={size} className="icon-poi" />;
    if (hex.type === 'gate') return <IconGate size={size} className="icon-gate" />;
    return <IconHex size={size} className="icon-hex" />;
  };

  const getPoiDetail = (hex) => {
    if (hex?.type === 'poi' && hex.poiData) {
      return hex.poiData.name || hex.poiType;
    }
    return null;
  };

  const getLootSummary = (hex) => {
    if (hex?.type !== 'poi' || !hex.poiData) return null;

    const rewardType = hex.poiData.rewardType;

    // Handle standard card packs
    if (packTypes[rewardType]) {
      const pack = packTypes[rewardType];

      // Special case for CREDITS_PACK (no cards, just credits)
      if (pack.cardCount.max === 0) {
        return {
          type: pack.name,
          description: `${pack.creditsRange.min}-${pack.creditsRange.max} credits`,
          color: pack.color
        };
      }

      const cardType = pack.guaranteedTypes[0]?.toLowerCase() || 'mixed';
      return {
        type: pack.name,
        description: `${pack.cardCount.min}-${pack.cardCount.max} ${cardType} cards + credits`,
        color: pack.color
      };
    }

    // Handle special non-pack reward types
    const specialRewards = {
      DRONE_BLUEPRINT_LIGHT: { type: 'Scout Drone Blueprint', description: 'Light drone schematic', color: '#4ade80' },
      DRONE_BLUEPRINT_FIGHTER: { type: 'Fighter Drone Blueprint', description: 'Combat drone schematic', color: '#f97316' },
      DRONE_BLUEPRINT_HEAVY: { type: 'Heavy Drone Blueprint', description: 'Heavy drone schematic', color: '#ef4444' },
      TOKEN_REWARD: { type: 'Security Token', description: 'Guaranteed token + credits', color: '#06b6d4' }
    };

    return specialRewards[rewardType] || null;
  };

  const getDetectionColorClass = (value) => {
    if (value < 50) return 'value-safe';
    if (value < 80) return 'value-warning';
    return 'value-critical';
  };


  // Get reward quality label based on zone (for risk/reward indication)
  const getRewardQualityLabel = (zone) => {
    switch (zone) {
      case 'core': return { text: 'High Value', color: '#f59e0b' };
      case 'mid': return { text: 'Standard', color: '#06b6d4' };
      case 'perimeter': return { text: 'Low Value', color: '#6b7280' };
      default: return { text: 'Standard', color: '#06b6d4' };
    }
  };

  // Check if a POI has been looted
  const isLootedPOI = (hex) => {
    if (!hex || hex.type !== 'poi') return false;
    return lootedPOIs.some(p => p.q === hex.q && p.r === hex.r);
  };

  // Get movement preview for inspected hex
  const getHexPreview = () => {
    if (!inspectedHex || !mapData || !tierConfig) return null;

    // Calculate from last waypoint position or player position
    const startPosition = waypoints.length > 0
      ? waypoints[waypoints.length - 1].hex
      : playerPosition;

    // Get current detection level (end of journey or current)
    const startDetection = waypoints.length > 0
      ? waypoints[waypoints.length - 1].cumulativeDetection
      : currentDetection;

    // Use previewPath from parent if provided (respects pathfinding mode)
    if (previewPath && previewPath.length > 0) {
      const detectionCost = previewPath.reduce((cost, hex) => {
        return cost + DetectionManager.getHexDetectionCost(hex, tierConfig, mapRadius);
      }, 0);

      return {
        path: previewPath,
        distance: previewPath.length - 1,
        cost: detectionCost,
        newDetection: startDetection + detectionCost,
        valid: true,
        reason: '',
        currentDetection: startDetection
      };
    }

    // Fallback: use basic A* when no previewPath provided
    return MovementController.getMovementPreview(
      startPosition,
      inspectedHex,
      mapData.hexes,
      tierConfig
    );
  };

  const preview = inspectedHex ? getHexPreview() : null;

  const isCurrentPosition = inspectedHex &&
    inspectedHex.q === playerPosition.q &&
    inspectedHex.r === playerPosition.r;

  const isAlreadyWaypoint = inspectedHex && isWaypointFn ? isWaypointFn(inspectedHex) : false;

  // ========================================
  // RENDER: MOVEMENT STATE
  // ========================================

  if (isMoving) {
    return (
      <div className="hex-info-panel">
        <div className="hex-info-header">
          <h2 className="hex-info-title">{isPaused ? 'Paused' : 'Moving...'}</h2>
        </div>

        <div className="hex-info-detection">
          <DetectionMeter detection={currentDetection} />
          {/* Blockade Risk Display */}
          <div className="blockade-risk-display">
            <StatLabel text="Extraction Blockade Chance" helpKey="extractionBlockadeChance" />
            <span
              className={`blockade-risk-value ${currentDetection >= 80 ? 'blockade-critical' : currentDetection >= 50 ? 'blockade-warning' : ''}`}
              data-testid="blockade-risk-value"
            >
              {Math.round(currentDetection)}%
            </span>
          </div>
        </div>

        <div className="hex-info-content">
          <div className="movement-progress">
            <div className="movement-waypoint-info">
              <span className="movement-waypoint-label">Waypoint</span>
              <span className="movement-waypoint-counter">
                {currentWaypointIndex + 1} of {totalWaypoints}
              </span>
            </div>
            <p className="movement-status">
              {isPaused ? 'Paused' : 'Traveling to waypoint...'}
            </p>

            {/* Threat scan indicator */}
            {isScanningHex && (
              <div className="threat-scan-indicator">
                <span className="threat-scan-icon">⚠</span>
                <span className="threat-scan-label">ENEMY THREAT SCAN ACTIVE</span>
              </div>
            )}

            {/* Upcoming hexes during movement */}
            {(() => {
              const currentWaypoint = waypoints[currentWaypointIndex];
              const path = currentWaypoint?.pathFromPrev || [];

              // Get next 4 hexes from current position
              const upcomingHexes = [];
              for (let i = 0; i < 4 && (currentHexIndex + i) < path.length; i++) {
                const hex = path[currentHexIndex + i];
                if (hex && tierConfig) {
                  upcomingHexes.push({
                    hex,
                    index: i,
                    encounterChance: MovementController.getHexEncounterChance(hex, tierConfig, mapData),
                    threatIncrease: DetectionManager.getHexDetectionCost(hex, tierConfig, mapRadius)
                  });
                }
              }

              if (upcomingHexes.length === 0) return null;

              return (
                <div className="upcoming-hexes">
                  <div className="upcoming-hexes-header">Upcoming</div>
                  <div className="upcoming-hexes-list">
                    {upcomingHexes.map((item, idx) => (
                      <div
                        key={`${item.hex.q},${item.hex.r}`}
                        className={`upcoming-hex-item ${idx === 0 ? 'upcoming-hex-current' : ''}`}
                      >
                        <span className="upcoming-hex-number">{idx + 1}</span>
                        <div className="upcoming-hex-stats">
                          <span className="upcoming-hex-risk">⚔ {item.encounterChance}%</span>
                          <span className="upcoming-hex-threat">Threat: +{item.threatIncrease.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="hex-info-actions">
          <button
            onClick={onTogglePause}
            className={isPaused ? 'dw-btn dw-btn-confirm w-full' : 'dw-btn dw-btn-secondary w-full'}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="hex-action-link"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: HEX INFO VIEW
  // ========================================

  if (inspectedHex) {
    return (
      <div className="hex-info-panel">
        {/* Title header */}
        <div className="hex-info-header">
          <h2 className="hex-info-title">Hex Details</h2>
        </div>

        <div className="hex-info-detection">
          <DetectionMeter detection={currentDetection} />
          {/* Blockade Risk Display */}
          <div className="blockade-risk-display">
            <StatLabel text="Extraction Blockade Chance" helpKey="extractionBlockadeChance" />
            <span
              className={`blockade-risk-value ${currentDetection >= 80 ? 'blockade-critical' : currentDetection >= 50 ? 'blockade-warning' : ''}`}
              data-testid="blockade-risk-value"
            >
              {Math.round(currentDetection)}%
            </span>
          </div>
        </div>

        <div className="hex-info-content">
          {isCurrentPosition ? (
            <div className="hex-info-current">
              <span className="current-icon"><IconCrosshair size={48} className="icon-current" /></span>
              <p className="current-text">Current Position</p>
              <p className="current-hint">You are here</p>
            </div>
          ) : (
            <div className="hex-info-selected">
              {/* Target info - POIs get image thumbnail, others get icon */}
              {inspectedHex.type === 'poi' && inspectedHex.poiData?.image ? (
                <div className="hex-target hex-target-poi">
                  <div
                    className="hex-target-image"
                    style={{ backgroundImage: `url(${inspectedHex.poiData.image})` }}
                  />
                  <div className="hex-target-details">
                    <div
                      className="hex-target-name"
                      style={{ color: inspectedHex.poiData?.color || '#f59e0b' }}
                    >
                      {inspectedHex.poiData?.name || 'Unknown POI'}
                    </div>
                    {inspectedHex.poiData?.description && (
                      <div className="hex-target-description">
                        {inspectedHex.poiData.description}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hex-target">
                  <span className="hex-target-icon">{getTargetIcon(inspectedHex)}</span>
                  <div className="hex-target-details">
                    <div className="hex-target-label">{getTargetLabel(inspectedHex)}</div>
                    {getPoiDetail(inspectedHex) && (
                      <div className="hex-target-sublabel">{getPoiDetail(inspectedHex)}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Loot info for PoIs - show "Claimed" if already looted */}
              {inspectedHex?.type === 'poi' && (
                isLootedPOI(inspectedHex) ? (
                  <div className="hex-loot-claimed">
                    <span className="claimed-icon"><IconCheck size={16} className="icon-claimed" /></span>
                    <span className="claimed-text">Rewards Claimed</span>
                  </div>
                ) : (
                  getLootSummary(inspectedHex) && (() => {
                    const lootSummary = getLootSummary(inspectedHex);
                    const qualityLabel = getRewardQualityLabel(inspectedHex.zone);
                    return (
                      <div className="hex-loot-info" style={{ borderLeftColor: lootSummary.color }}>
                        <div className="loot-type">
                          {lootSummary.type}
                          <span className="loot-quality" style={{ color: qualityLabel.color }}>
                            {' · '}{qualityLabel.text}
                          </span>
                        </div>
                        <div className="loot-desc">{lootSummary.description}</div>
                      </div>
                    );
                  })()
                )
              )}

              {/* Guaranteed Combat Warning for drone blueprint PoIs */}
              {inspectedHex?.type === 'poi' &&
               inspectedHex.poiData?.encounterChance === 100 &&
               !isLootedPOI(inspectedHex) && (
                <div className="hex-guaranteed-combat">
                  <div className="guaranteed-combat-header">
                    <span className="guaranteed-combat-icon">⚔</span>
                    <span className="guaranteed-combat-text">GUARANTEED COMBAT</span>
                  </div>
                  {inspectedHex.poiData?.guardianAI && (
                    <div className="guaranteed-combat-enemy">
                      <span className="enemy-label">Guarded by: </span>
                      <span className="enemy-name">{inspectedHex.poiData.guardianAI.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Movement stats (if not already a waypoint) */}
              {preview && !isAlreadyWaypoint && (() => {
                // Single-hex stats (raw values for this hex only)
                const hexEncounterChance = MovementController.getHexEncounterChance(inspectedHex, tierConfig, mapData);
                // POIs use their own encounterChance for salvage risk (not movement encounter)
                // Calculate threat-adjusted salvage risk for POIs
                const baseEncounterChance = inspectedHex.poiData?.encounterChance || 15;
                const threatLevel = DetectionManager.getThreshold();
                const threatBonus = inspectedHex.type === 'poi'
                  ? SalvageController._calculateThreatBonus(inspectedHex, tierConfig, threatLevel)
                  : 0;
                const salvageRisk = Math.round(baseEncounterChance + threatBonus);
                const increaseRange = tierConfig?.salvageEncounterIncreaseRange || { min: 5, max: 15 };
                const hexThreatIncrease = DetectionManager.getHexDetectionCost(inspectedHex, tierConfig, mapRadius);
                const lootingThreat = inspectedHex.type === 'poi'
                  ? (inspectedHex.poiData?.threatIncrease || tierConfig?.detectionTriggers?.looting || 10)
                  : 0;

                // Calculate segment encounter risk for the path (for journey totals)
                const segmentEncounterRisk = preview.path
                  ? MovementController.calculateEncounterRisk(preview.path, tierConfig, mapData)
                  : 0;

                // Calculate cumulative encounter risk combining with existing journey
                // P(at least one in journey) = 1 - P(none in all segments)
                const prevEncounterRisk = waypoints.length > 0
                  ? waypoints[waypoints.length - 1].cumulativeEncounterRisk
                  : 0;
                const prevPNoEncounter = (100 - prevEncounterRisk) / 100;
                const segmentPNoEncounter = (100 - segmentEncounterRisk) / 100;
                const cumulativeEncounterRisk = (1 - (prevPNoEncounter * segmentPNoEncounter)) * 100;

                const totalDetectionAfterMove = preview.newDetection + lootingThreat;

                return (
                  <>
                    {/* SELECTED HEX Section - Raw per-hex stats only */}
                    <div className="hex-stats-section">
                      <div className="hex-stats-section-header">Selected Hex</div>
                      <div className="hex-stats">
                        <div className="hex-stat">
                          <StatLabel text="Distance" helpKey="distance" />
                          <span className="stat-value">{preview.distance} hexes</span>
                        </div>
                        <div className="hex-stat">
                          {inspectedHex.type === 'poi' ? (
                            <>
                              <StatLabel text="Salvage Risk" helpKey="salvageRisk" />
                              <span className="stat-value">{salvageRisk}% <span className="stat-subtext">(+{increaseRange.min}% - {increaseRange.max}%)</span></span>
                            </>
                          ) : (
                            <>
                              <StatLabel text="Movement Encounter Chance" helpKey="movementEncounterChance" />
                              <span className="stat-value">{hexEncounterChance}%</span>
                            </>
                          )}
                        </div>
                        <div className="hex-stat">
                          <StatLabel text="Threat Increase" helpKey="threatIncrease" />
                          <span className="stat-value stat-value-cost">+{hexThreatIncrease.toFixed(1)}%</span>
                        </div>
                        {inspectedHex.type === 'poi' && (
                          <div className="hex-stat">
                            <StatLabel text="Salvage Threat" helpKey="salvageThreat" />
                            <span className="stat-value stat-value-cost">+{lootingThreat.toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PROPOSED JOURNEY Section - Cumulative totals */}
                    <div className="hex-stats-section">
                      <div className="hex-stats-section-header">Proposed Journey</div>
                      <div className="hex-stats">
                        <div className="hex-stat">
                          <StatLabel text="Movement Encounter Risk" helpKey="journeyEncounterRisk" />
                          <span className="stat-value stat-value-encounter">⚔ {cumulativeEncounterRisk.toFixed(1)}%</span>
                        </div>
                        <div className="hex-stat hex-stat-total">
                          <StatLabel text="Threat After Move" helpKey="threatAfterMove" />
                          <span className={`stat-value ${getDetectionColorClass(totalDetectionAfterMove)}`}>
                            → {totalDetectionAfterMove.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Warning if already waypoint */}
              {isAlreadyWaypoint && (
                <div className="hex-info-waypoint-badge">
                  <span className="waypoint-badge-icon"><IconCheck size={14} className="icon-check" /></span>
                  <span className="waypoint-badge-text">Already a waypoint</span>
                </div>
              )}

              {/* Warning for invalid path */}
              {preview && !preview.valid && !isAlreadyWaypoint && (
                <div className="hex-warning">
                  <span className="warning-icon"><IconWarning size={18} className="icon-warning" /></span>
                  <span className="warning-text">{preview.reason}</span>
                </div>
              )}

              {/* Warning for high threat */}
              {preview && preview.valid && !isAlreadyWaypoint && (() => {
                const lootingThreat = inspectedHex.type === 'poi'
                  ? (inspectedHex.poiData?.threatIncrease || tierConfig?.detectionTriggers?.looting || 10)
                  : 0;
                return (preview.newDetection + lootingThreat) >= 80;
              })() && (
                <div className="hex-caution">
                  <span className="caution-icon"><IconWarning size={18} className="icon-caution" /></span>
                  <span className="caution-text">
                    Critical threat level! Risk of MIA.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pathfinding Mode Toggle - show for valid destinations */}
        {onPathModeChange && !isCurrentPosition && !isAlreadyWaypoint && (
          <div className="pathfinding-mode-toggle">
            <span className="toggle-label">Path:</span>
            <button
              className={`toggle-btn ${pathMode === 'lowEncounter' ? 'active' : ''}`}
              onClick={() => onPathModeChange('lowEncounter')}
            >
              Low Encounter
            </button>
            <button
              className={`toggle-btn ${pathMode === 'lowThreat' ? 'active' : ''}`}
              onClick={() => onPathModeChange('lowThreat')}
            >
              Low Threat
            </button>
          </div>
        )}

        {/* Actions - Back and Add Waypoint side by side */}
        <div className="hex-info-actions hex-info-actions-row">
          <button
            onClick={onBackToJourney}
            className="dw-btn dw-btn-secondary"
          >
            Back
          </button>
          {!isCurrentPosition && (
            <button
              onClick={() => onToggleWaypoint(inspectedHex)}
              className={isAlreadyWaypoint ? 'dw-btn dw-btn-cancel' : 'dw-btn dw-btn-confirm'}
              disabled={!isAlreadyWaypoint && preview && !preview.valid}
            >
              {isAlreadyWaypoint ? 'Remove Waypoint' : 'Add Waypoint'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: WAYPOINT LIST VIEW (default)
  // ========================================

  return (
    <div className="hex-info-panel">
      <div className="hex-info-header">
        <h2 className="hex-info-title">Waypoints</h2>
      </div>

      <div className="hex-info-detection">
        <DetectionMeter detection={currentDetection} />
        {/* Blockade Risk Display */}
        <div className="blockade-risk-display">
          <StatLabel text="Extraction Blockade Chance" helpKey="extractionBlockadeChance" />
          <span
            className={`blockade-risk-value ${currentDetection >= 80 ? 'blockade-critical' : currentDetection >= 50 ? 'blockade-warning' : ''}`}
            data-testid="blockade-risk-value"
          >
            {Math.round(currentDetection)}%
          </span>
        </div>
        {/* Escape Route Display */}
        <EscapeRouteDisplay
          escapeRouteData={escapeRouteData}
          hasWaypoints={waypoints.length > 0}
          mapRadius={mapRadius}
        />
      </div>

      <div className="hex-info-content">
        {/* MIA Warning */}
        {(() => {
          const wouldCauseMIA = waypoints.some(wp => wp.cumulativeDetection >= 100);
          const firstMIAWaypoint = waypoints.findIndex(wp => wp.cumulativeDetection >= 100);
          if (wouldCauseMIA) {
            return (
              <div className="escape-route-mia-warning">
                <IconWarning size={20} className="icon-critical" />
                <div className="mia-warning-text">
                  <strong>FATAL PATH</strong>
                  <span>Waypoint {firstMIAWaypoint + 1} will cause MIA</span>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {waypoints.length === 0 ? (
          <div className="hex-info-empty">
            <span className="empty-icon"><IconRadar size={48} className="icon-radar" /></span>
            <p className="empty-text">No waypoints planned</p>
            <p className="empty-hint">Click hexes on the map to add waypoints</p>
          </div>
        ) : (
          <div className="waypoint-list">
            {/* Start position */}
            <div className="waypoint-start">
              <span className="waypoint-start-icon"><IconCrosshair size={16} className="icon-start" /></span>
              <span className="waypoint-start-text">Start</span>
              <span className="waypoint-start-detection">{currentDetection.toFixed(1)}%</span>
            </div>

            {/* Waypoints */}
            {waypoints.map((waypoint, index) => (
              <div
                key={`${waypoint.hex.q},${waypoint.hex.r}`}
                className="waypoint-item"
                onClick={() => onWaypointClick(index)}
              >
                <div className="waypoint-item-header">
                  <span className="waypoint-number">{index + 1}</span>
                  <span className="waypoint-icon">{getTargetIcon(waypoint.hex)}</span>
                  <span className="waypoint-name">
                    {getPoiDetail(waypoint.hex) || getTargetLabel(waypoint.hex)}
                  </span>
                </div>
                <div className="waypoint-item-stats">
                  <div className="waypoint-threat-line">
                    <span className="waypoint-stat-label">Threat Increase:</span>
                    <span className="waypoint-cost">+{waypoint.segmentCost.toFixed(1)}%</span>
                    <span className="waypoint-arrow">→</span>
                    <span className={`waypoint-cumulative ${getDetectionColorClass(waypoint.cumulativeDetection)}`}>
                      {waypoint.cumulativeDetection.toFixed(1)}%
                    </span>
                    {waypoint.cumulativeDetection >= 80 && (
                      <span className="waypoint-warning-icon"><IconWarning size={12} className="icon-critical" /></span>
                    )}
                  </div>
                  <div className="waypoint-encounter-line">
                    <span className="waypoint-stat-label">Journey Encounter Chance:</span>
                    <span className="waypoint-encounter">
                      ⚔ {(waypoint.cumulativeEncounterRisk || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pathfinding Mode Toggle */}
      {onPathModeChange && (
        <div className="pathfinding-mode-toggle">
          <span className="toggle-label">Path:</span>
          <button
            className={`toggle-btn ${pathMode === 'lowEncounter' ? 'active' : ''}`}
            onClick={() => onPathModeChange('lowEncounter')}
          >
            Low Encounter
          </button>
          <button
            className={`toggle-btn ${pathMode === 'lowThreat' ? 'active' : ''}`}
            onClick={() => onPathModeChange('lowThreat')}
          >
            Low Threat
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="hex-info-actions">
        {waypoints.length > 0 && (
          <>
            <button
              onClick={onCommence}
              className="dw-btn dw-btn-confirm w-full"
            >
              Commence
            </button>
            <button
              onClick={onClearAll}
              className="hex-action-link"
            >
              Clear All Waypoints
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default HexInfoPanel;
