// ========================================
// HEX INFO PANEL
// ========================================
// Fixed right-side panel with two views:
// 1. Waypoint List view (default) - Shows journey plan
// 2. Hex Info view - Shows details for inspected hex

import React from 'react';
import MovementController from '../../logic/map/MovementController.js';
import DetectionManager from '../../logic/detection/DetectionManager.js';
import { mapTiers } from '../../data/mapData.js';
import { packTypes } from '../../data/cardPackData.js';
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
  lootedPOIs = []
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

    if (packTypes[rewardType]) {
      const pack = packTypes[rewardType];
      const cardType = pack.guaranteedTypes[0].toLowerCase();
      return {
        type: pack.name,
        description: `${pack.cardCount.min}-${pack.cardCount.max} ${cardType} cards + credits`,
        color: pack.color
      };
    }

    const specialRewards = {
      BLUEPRINT_GUARANTEED: { type: 'Blueprint Cache', description: 'Guaranteed rare upgrade', color: '#ff44aa' },
      CREDITS: { type: 'Credit Terminal', description: 'Currency reward', color: '#44ff88' },
      TOKEN_CHANCE: { type: 'Token Cache', description: 'Chance at special tokens', color: '#ffff44' }
    };

    return specialRewards[rewardType] || null;
  };

  const getDetectionColorClass = (value) => {
    if (value < 50) return 'value-safe';
    if (value < 80) return 'value-warning';
    return 'value-critical';
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
                          <span className="upcoming-hex-risk">{item.encounterChance}%</span>
                          <span className="upcoming-hex-threat">+{item.threatIncrease.toFixed(1)}%</span>
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
            className={isPaused ? 'btn-confirm w-full' : 'btn-reset w-full'}
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
        {/* Back button header */}
        <div className="hex-info-header hex-info-header-back">
          <button onClick={onBackToJourney} className="back-button">
            ← Back
          </button>
        </div>

        <div className="hex-info-detection">
          <DetectionMeter detection={currentDetection} />
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
                  getLootSummary(inspectedHex) && (
                    <div className="hex-loot-info" style={{ borderLeftColor: getLootSummary(inspectedHex).color }}>
                      <div className="loot-type">{getLootSummary(inspectedHex).type}</div>
                      <div className="loot-desc">{getLootSummary(inspectedHex).description}</div>
                    </div>
                  )
                )
              )}

              {/* Movement stats (if not already a waypoint) */}
              {preview && !isAlreadyWaypoint && (() => {
                // Single-hex stats (raw values for this hex only)
                const hexEncounterChance = MovementController.getHexEncounterChance(inspectedHex, tierConfig, mapData);
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
                          <span className="stat-label">Distance</span>
                          <span className="stat-value">{preview.distance} hexes</span>
                        </div>
                        <div className="hex-stat">
                          <span className="stat-label">Encounter Chance</span>
                          <span className="stat-value">{hexEncounterChance}%</span>
                        </div>
                        <div className="hex-stat">
                          <span className="stat-label">Threat Increase</span>
                          <span className="stat-value stat-value-cost">+{hexThreatIncrease.toFixed(1)}%</span>
                        </div>
                        {inspectedHex.type === 'poi' && (
                          <div className="hex-stat">
                            <span className="stat-label">Looting Threat</span>
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
                          <span className="stat-label">Journey Encounter Risk</span>
                          <span className="stat-value stat-value-encounter">⚔ {cumulativeEncounterRisk.toFixed(1)}%</span>
                        </div>
                        <div className="hex-stat hex-stat-total">
                          <span className="stat-label">After Move</span>
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

        {/* Actions */}
        <div className="hex-info-actions">
          {!isCurrentPosition && (
            <button
              onClick={() => onToggleWaypoint(inspectedHex)}
              className={isAlreadyWaypoint ? 'btn-cancel w-full' : 'btn-info w-full'}
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
      </div>

      <div className="hex-info-content">
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
                  <span className="waypoint-cost">+{waypoint.segmentCost.toFixed(1)}%</span>
                </div>
                <div className="waypoint-item-footer">
                  <span className={`waypoint-cumulative ${getDetectionColorClass(waypoint.cumulativeDetection)}`}>
                    → {waypoint.cumulativeDetection.toFixed(1)}%
                  </span>
                  <span className="waypoint-encounter">
                    ⚔ {(waypoint.cumulativeEncounterRisk || 0).toFixed(1)}%
                  </span>
                  {waypoint.cumulativeDetection >= 80 && (
                    <span className="waypoint-warning-icon"><IconWarning size={12} className="icon-critical" /></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="hex-info-actions">
        {waypoints.length > 0 && (
          <>
            <button
              onClick={onCommence}
              className="btn-confirm w-full"
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
