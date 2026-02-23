// ========================================
// TACTICAL WAYPOINTS HOOK
// ========================================
// Manages waypoint CRUD, hex interaction handlers, path preview,
// and escape route computation for TacticalMapScreen

import { useCallback, useMemo } from 'react';
import MovementController from '../../../../logic/map/MovementController.js';
import EscapeRouteCalculator from '../../../../logic/map/EscapeRouteCalculator.js';
import DetectionManager from '../../../../logic/detection/DetectionManager.js';
import EncounterController from '../../../../logic/encounters/EncounterController.js';
import SoundManager from '../../../../managers/SoundManager.js';
import { mapTiers } from '../../../../data/mapData.js';
import { debugLog } from '../../../../utils/debugLogger.js';

/**
 * Hook encapsulating all waypoint management, hex interaction handlers,
 * path preview logic, and escape route calculation.
 *
 * Must be called unconditionally (before any early returns) because it
 * contains useMemo/useCallback hooks.
 */
export function useTacticalWaypoints({
  waypoints,
  setWaypoints,
  inspectedHex,
  setInspectedHex,
  pathfindingMode,
  setPathfindingMode,
  isMoving,
  playerPosition,
  mapData,
  tierConfig,
  detection,
  currentRunState,
}) {
  // --- Escape Route Calculation ---

  /**
   * Calculate escape route data for display in HexInfoPanel.
   * Shows minimum threat cost to reach nearest extraction gate.
   * Derives mapData/tierConfig from currentRunState to work before early returns.
   */
  const escapeRouteData = useMemo(() => {
    const rsMapData = currentRunState?.mapData;
    const rsPlayerPosition = currentRunState?.playerPosition;
    const rsDetection = currentRunState?.detection;
    const rsTierConfig = rsMapData ? mapTiers[rsMapData.tier - 1] : null;

    if (!rsMapData || !rsTierConfig || !rsPlayerPosition) return null;

    const lastWaypointPosition = waypoints.length > 0
      ? waypoints[waypoints.length - 1].hex
      : rsPlayerPosition;

    const journeyEndDetection = waypoints.length > 0
      ? waypoints[waypoints.length - 1].cumulativeDetection
      : rsDetection;

    return EscapeRouteCalculator.calculateEscapeRoutes(
      rsPlayerPosition,
      lastWaypointPosition,
      rsDetection,
      journeyEndDetection,
      rsMapData,
      rsTierConfig,
      currentRunState
    );
  }, [currentRunState, waypoints]);

  // --- Path Mode ---

  const handlePathModeChange = useCallback((newMode) => {
    setPathfindingMode(newMode);
    // TODO: If we want to recalculate existing waypoints with new mode,
    // that would be done here. For now, mode only affects new waypoints.
  }, [setPathfindingMode]);

  // --- Utility helpers (use post-early-return values when available) ---

  const isWaypoint = useCallback(
    (hex) => waypoints.some(w => w.hex.q === hex.q && w.hex.r === hex.r),
    [waypoints]
  );

  const getLastJourneyPosition = useCallback(
    () => waypoints.length > 0 ? waypoints[waypoints.length - 1].hex : playerPosition,
    [waypoints, playerPosition]
  );

  const getJourneyEndDetection = useCallback(
    () => waypoints.length > 0 ? waypoints[waypoints.length - 1].cumulativeDetection : detection,
    [waypoints, detection]
  );

  const getJourneyEndEncounterRisk = useCallback(
    () => waypoints.length > 0 ? waypoints[waypoints.length - 1].cumulativeEncounterRisk : 0,
    [waypoints]
  );

  // --- Path Preview ---

  /**
   * Compute preview path for inspected hex (shown before adding as waypoint).
   * Uses same weighted pathfinding as addWaypoint to ensure preview matches actual path.
   */
  const getPreviewPath = useCallback(() => {
    if (!inspectedHex || isMoving) return null;
    if (!playerPosition || !mapData || !tierConfig) return null;
    if (inspectedHex.q === playerPosition.q && inspectedHex.r === playerPosition.r) return null;
    if (waypoints.some(w => w.hex.q === inspectedHex.q && w.hex.r === inspectedHex.r)) return null;

    const lastPosition = waypoints.length > 0
      ? waypoints[waypoints.length - 1].hex
      : playerPosition;

    if (pathfindingMode === 'lowThreat') {
      const result = EscapeRouteCalculator.findLowestThreatPath(
        lastPosition, inspectedHex, mapData.hexes, tierConfig, mapData.radius
      );
      return result?.path || null;
    } else {
      const result = EscapeRouteCalculator.findLowestEncounterPath(
        lastPosition, inspectedHex, mapData.hexes, tierConfig, mapData
      );
      return result?.path || null;
    }
  }, [inspectedHex, isMoving, playerPosition, mapData, tierConfig, waypoints, pathfindingMode]);

  // --- Waypoint CRUD ---

  const addWaypoint = useCallback((hex) => {
    debugLog('WAYPOINT_MANAGER', 'addWaypoint called', { hex: { q: hex?.q, r: hex?.r }, lastPosition: getLastJourneyPosition() });

    const lastPosition = getLastJourneyPosition();

    let path;
    if (pathfindingMode === 'lowThreat') {
      const result = EscapeRouteCalculator.findLowestThreatPath(
        lastPosition, hex, mapData.hexes, tierConfig, mapData.radius
      );
      path = result?.path || null;
    } else {
      const result = EscapeRouteCalculator.findLowestEncounterPath(
        lastPosition, hex, mapData.hexes, tierConfig, mapData
      );
      path = result?.path || null;
    }

    if (!path) {
      debugLog('WAYPOINT_MANAGER', '[WARN] No path available to waypoint');
      return false;
    }

    let segmentCost = MovementController.calculateDetectionCost(path, tierConfig, mapData.radius);
    if (hex.type === 'poi') {
      segmentCost += hex.poiData?.threatIncrease || tierConfig.detectionTriggers.looting;
    }
    const prevDetection = getJourneyEndDetection();
    const cumulativeDetection = prevDetection + segmentCost;

    const segmentEncounterRisk = MovementController.calculateEncounterRisk(path, tierConfig, mapData);

    const prevPNoEncounter = (100 - getJourneyEndEncounterRisk()) / 100;
    const segmentPNoEncounter = (100 - segmentEncounterRisk) / 100;
    const cumulativeEncounterRisk = (1 - (prevPNoEncounter * segmentPNoEncounter)) * 100;

    debugLog('WAYPOINT_MANAGER', `Adding waypoint: +${segmentCost.toFixed(1)}% detection -> ${cumulativeDetection.toFixed(1)}%, encounter risk: ${segmentEncounterRisk.toFixed(1)}% segment -> ${cumulativeEncounterRisk.toFixed(1)}% cumulative`);

    setWaypoints([...waypoints, {
      hex,
      pathFromPrev: path,
      segmentCost,
      cumulativeDetection,
      segmentEncounterRisk,
      cumulativeEncounterRisk
    }]);

    return true;
  }, [waypoints, setWaypoints, pathfindingMode, mapData, tierConfig, getLastJourneyPosition, getJourneyEndDetection, getJourneyEndEncounterRisk]);

  const recalculateWaypoints = useCallback((waypointList, fromIndex) => {
    if (waypointList.length === 0) {
      setWaypoints([]);
      return;
    }

    const recalculated = [...waypointList];

    for (let i = fromIndex; i < recalculated.length; i++) {
      const prevPosition = i === 0 ? playerPosition : recalculated[i - 1].hex;
      const prevDetection = i === 0 ? detection : recalculated[i - 1].cumulativeDetection;
      const prevEncounterRisk = i === 0 ? 0 : recalculated[i - 1].cumulativeEncounterRisk;

      const path = MovementController.calculatePath(prevPosition, recalculated[i].hex, mapData.hexes);

      if (path) {
        let segmentCost = MovementController.calculateDetectionCost(path, tierConfig, mapData.radius);
        if (recalculated[i].hex.type === 'poi') {
          segmentCost += recalculated[i].hex.poiData?.threatIncrease || tierConfig.detectionTriggers.looting;
        }

        const segmentEncounterRisk = MovementController.calculateEncounterRisk(path, tierConfig, mapData);

        const prevPNoEncounter = (100 - prevEncounterRisk) / 100;
        const segmentPNoEncounter = (100 - segmentEncounterRisk) / 100;
        const cumulativeEncounterRisk = (1 - (prevPNoEncounter * segmentPNoEncounter)) * 100;

        recalculated[i] = {
          ...recalculated[i],
          pathFromPrev: path,
          segmentCost,
          cumulativeDetection: prevDetection + segmentCost,
          segmentEncounterRisk,
          cumulativeEncounterRisk
        };
      } else {
        debugLog('WAYPOINT_MANAGER', `[WARN] Path broken at waypoint ${i + 1}, removing subsequent`);
        setWaypoints(recalculated.slice(0, i));
        return;
      }
    }

    setWaypoints(recalculated);
  }, [setWaypoints, playerPosition, detection, mapData, tierConfig]);

  const removeWaypoint = useCallback((index) => {
    debugLog('WAYPOINT_MANAGER', `Removing waypoint ${index + 1}`);

    const newWaypoints = [...waypoints];
    newWaypoints.splice(index, 1);

    recalculateWaypoints(newWaypoints, index);
  }, [waypoints, recalculateWaypoints]);

  const clearAllWaypoints = useCallback(() => {
    debugLog('WAYPOINT_MANAGER', 'Clearing all waypoints');
    setWaypoints([]);
  }, [setWaypoints]);

  // --- Hex Interaction Handlers ---

  const handleHexClick = useCallback((hex) => {
    if (isMoving) return;
    SoundManager.getInstance().play('hex_click');
    setInspectedHex(hex);
  }, [isMoving, setInspectedHex]);

  const handleWaypointClick = useCallback((waypointIndex) => {
    setInspectedHex(waypoints[waypointIndex].hex);
  }, [waypoints, setInspectedHex]);

  const handleBackToJourney = useCallback(() => {
    setInspectedHex(null);
  }, [setInspectedHex]);

  const handleToggleWaypoint = useCallback((hex) => {
    debugLog('WAYPOINT_MANAGER', 'handleToggleWaypoint called', { q: hex?.q, r: hex?.r });

    if (isWaypoint(hex)) {
      const index = waypoints.findIndex(w => w.hex.q === hex.q && w.hex.r === hex.r);
      debugLog('WAYPOINT_MANAGER', 'Removing waypoint at index:', index);
      removeWaypoint(index);
    } else {
      const success = addWaypoint(hex);
      debugLog('WAYPOINT_MANAGER', 'addWaypoint result:', success);
    }
    setInspectedHex(null);
  }, [isWaypoint, waypoints, removeWaypoint, addWaypoint, setInspectedHex]);

  return {
    addWaypoint,
    removeWaypoint,
    clearAllWaypoints,
    isWaypoint,
    handleHexClick,
    handleToggleWaypoint,
    handleWaypointClick,
    handleBackToJourney,
    handlePathModeChange,
    getPreviewPath,
    escapeRouteData,
    getLastJourneyPosition,
    getJourneyEndDetection,
    getJourneyEndEncounterRisk,
  };
}
