import { useState, useEffect, useMemo } from 'react';
import { generateHexGrid, GRID_COLS, GRID_ROWS } from '../logic/singlePlayer/hexGrid.js';
import { generateMapData } from '../utils/mapGenerator';
import aiPersonalities from '../data/aiData.js';
import { SeededRandom } from '../utils/seededRandom.js';
import MusicManager from '../managers/MusicManager.js';
import MissionService from '../logic/missions/MissionService';
import { debugLog } from '../utils/debugLogger.js';

/**
 * Hook managing derived data for the Hangar screen:
 * hex grid generation, procedural maps, boss placement, tutorial checks, music override.
 */
const useHangarData = (singlePlayerProfile, mapContainerRef, showDeployingScreen) => {
  const [hexGridData, setHexGridData] = useState(null);
  const [generatedMaps, setGeneratedMaps] = useState([]);
  const [bossHexCell, setBossHexCell] = useState(null);
  const [showTutorial, setShowTutorial] = useState(null);

  const stats = singlePlayerProfile?.stats || {};

  // Music override for deploying transition screen
  useEffect(() => {
    if (showDeployingScreen) {
      MusicManager.getInstance().setOverride('deploying');
    }
    return () => {
      if (showDeployingScreen) MusicManager.getInstance().clearOverride();
    };
  }, [showDeployingScreen]);

  // Generate hex grid on mount (uses game seed + total deployments for varied placement)
  useEffect(() => {
    const generateGrid = () => {
      if (mapContainerRef.current && singlePlayerProfile?.gameSeed) {
        const { width, height } = mapContainerRef.current.getBoundingClientRect();
        const totalDeployments = (stats.runsCompleted || 0) + (stats.runsLost || 0);
        const gridData = generateHexGrid(width, height, singlePlayerProfile.gameSeed, 6, totalDeployments);
        setHexGridData({ ...gridData, width, height });
      }
    };

    const timer = setTimeout(generateGrid, 100);
    return () => clearTimeout(timer);
  }, [singlePlayerProfile?.gameSeed, stats.runsCompleted, stats.runsLost]);

  // Check for intro tutorial on mount
  useEffect(() => {
    if (singlePlayerProfile && !MissionService.isTutorialDismissed('intro')) {
      const timer = setTimeout(() => {
        setShowTutorial('intro');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [singlePlayerProfile]);

  // Generate 6 procedural maps (one per hex icon)
  useEffect(() => {
    if (!singlePlayerProfile?.gameSeed) return;

    const { gameSeed } = singlePlayerProfile;
    const totalDeployments = (stats.runsCompleted || 0) + (stats.runsLost || 0);
    const maps = [];

    for (let i = 0; i < 6; i++) {
      const mapSeed = gameSeed + i + (totalDeployments * 1000);
      const mapData = generateMapData(mapSeed, 1, 'GENERIC');
      maps.push({ id: i + 1, ...mapData });
    }

    setGeneratedMaps(maps);
  }, [singlePlayerProfile?.gameSeed, stats.runsCompleted, stats.runsLost]);

  // Generate boss hex cell after grid is ready
  useEffect(() => {
    if (!hexGridData || !singlePlayerProfile?.gameSeed) return;

    const bossAI = aiPersonalities.find(ai => ai.modes?.includes('boss'));
    if (!bossAI) {
      debugLog('HANGAR', 'No boss AI found');
      return;
    }

    const activeCells = hexGridData.allCells.filter(c => c.isActive);
    const activeCoords = new Set(activeCells.map(c => c.coordinate));

    const validBossCells = hexGridData.allCells.filter(cell =>
      cell.col >= 2 && cell.col < GRID_COLS - 2 &&
      cell.row >= 1 && cell.row < GRID_ROWS - 1 &&
      !activeCoords.has(cell.coordinate) &&
      !activeCells.some(active =>
        Math.abs(active.col - cell.col) < 3 && Math.abs(active.row - cell.row) < 2
      )
    );

    const rng = new SeededRandom(singlePlayerProfile.gameSeed + 999);
    const shuffled = rng.shuffle(validBossCells);

    if (shuffled.length > 0) {
      const bossCell = { ...shuffled[0], isBoss: true, bossId: bossAI.bossId };
      setBossHexCell(bossCell);
      debugLog('HANGAR', 'Boss hex placed at:', bossCell.coordinate);
    }
  }, [hexGridData, singlePlayerProfile?.gameSeed]);

  // Inject grid coordinates into map names
  const mapsWithCoordinates = useMemo(() => {
    if (!hexGridData || generatedMaps.length === 0) return generatedMaps;

    return generatedMaps.map((map, index) => {
      const cell = hexGridData.allCells.find(c => c.mapIndex === index);
      if (cell) return { ...map, name: `Sector ${cell.coordinate}` };
      return map;
    });
  }, [hexGridData, generatedMaps]);

  // Build sorted list of active sectors for navigation
  const activeSectors = useMemo(() => {
    if (!hexGridData) return [];
    return hexGridData.allCells
      .filter(cell => cell.isActive)
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      })
      .map(cell => ({ coordinate: cell.coordinate, mapIndex: cell.mapIndex }));
  }, [hexGridData]);

  return {
    hexGridData, generatedMaps, bossHexCell,
    mapsWithCoordinates, activeSectors,
    showTutorial, setShowTutorial
  };
};

export default useHangarData;
