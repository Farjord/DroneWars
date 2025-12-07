import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameState } from '../../hooks/useGameState';
import SaveLoadModal from '../modals/SaveLoadModal';
import RepairBayModal from '../modals/RepairBayModal';
import InventoryModal from '../modals/InventoryModal';
import MapOverviewModal from '../modals/MapOverviewModal';
import BlueprintsModal from '../modals/BlueprintsModal';
import ReplicatorModal from '../modals/ReplicatorModal';
import RunSummaryModal from '../modals/RunSummaryModal';
import MIARecoveryModal from '../modals/MIARecoveryModal';
import ConfirmationModal from '../modals/ConfirmationModal';
import QuickDeployManager from '../quickDeploy/QuickDeployManager';
import ReputationTrack from '../ui/ReputationTrack';
import ReputationProgressModal from '../modals/ReputationProgressModal';
import ReputationRewardModal from '../modals/ReputationRewardModal';
import ReputationService from '../../logic/reputation/ReputationService';
import NewsTicker from '../ui/NewsTicker';
import { generateMapData } from '../../utils/mapGenerator';
import { mapTiers } from '../../data/mapData';
import { RARITY_COLORS } from '../../data/cardData';
import { getMapType, getMapBackground } from '../../logic/extraction/mapExtraction';
import { debugLog } from '../../utils/debugLogger.js';
import { validateDeckForDeployment } from '../../utils/singlePlayerDeckUtils.js';
import { validateShipSlot } from '../../utils/slotDamageUtils.js';
import { SeededRandom } from '../../utils/seededRandom.js';
import { ECONOMY } from '../../data/economyData.js';
import { starterDeck } from '../../data/playerDeckData.js';
import { Plus, Minus, RotateCcw, ChevronRight, Star, Trash2, AlertTriangle, Cpu, Lock } from 'lucide-react';
import { getShipById } from '../../data/shipData.js';

// Background image for the map area
const eremosBackground = new URL('/Eremos/Eremos.jpg', import.meta.url).href;

// Hangar button images
const hangarImages = {
  inventory: new URL('/Hanger/Inventory.png', import.meta.url).href,
  replicator: new URL('/Hanger/Replicator.png', import.meta.url).href,
  blueprints: new URL('/Hanger/Blueprints.png', import.meta.url).href,
  repairBay: new URL('/Hanger/RepairBay.png', import.meta.url).href
};

/**
 * HangarScreen Component
 * Main single-player hub - Extraction Mode interface
 *
 * Layout: Top header + Central map area + Right sidebar
 */
const HangarScreen = () => {
  const { gameState, gameStateManager } = useGameState();

  // State management
  const [sidebarMode, setSidebarMode] = useState('options'); // 'options' or 'ships'
  const [hexGridData, setHexGridData] = useState(null); // Hex grid cells and dimensions
  const [generatedMaps, setGeneratedMaps] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedMap, setSelectedMap] = useState(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [selectedMiaSlot, setSelectedMiaSlot] = useState(null);
  const [newDeckOption, setNewDeckOption] = useState(null); // 'empty', 'copyFromSlot0', or null
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { slotId, slotName }
  const [copyStarterConfirmation, setCopyStarterConfirmation] = useState(false); // Show copy starter deck confirmation
  const [emptyDeckConfirmation, setEmptyDeckConfirmation] = useState(false); // Show empty deck creation confirmation
  const [hoveredButton, setHoveredButton] = useState(null); // Track hovered image button
  const [showReputationProgress, setShowReputationProgress] = useState(false); // Show reputation progress modal
  const [showReputationRewards, setShowReputationRewards] = useState(false); // Show reputation reward modal

  // Compute maps with correct grid coordinates for the news ticker
  const mapsWithCoordinates = useMemo(() => {
    if (!hexGridData || generatedMaps.length === 0) return generatedMaps;

    return generatedMaps.map((map, index) => {
      const cell = hexGridData.allCells.find(c => c.mapIndex === index);
      if (cell) {
        return { ...map, name: `Sector ${cell.coordinate}` };
      }
      return map;
    });
  }, [hexGridData, generatedMaps]);

  // Pan/Zoom state for map area
  const [zoom, setZoom] = useState(1.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Ref for map container to get dimensions
  const mapContainerRef = useRef(null);
  const transformRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 }); // Track pan during drag without re-renders

  // Extract single-player state
  const {
    singlePlayerProfile,
    singlePlayerInventory,
    singlePlayerShipSlots,
    singlePlayerDroneInstances,
    singlePlayerShipComponentInstances,
    singlePlayerDiscoveredCards,
    lastRunSummary,
  } = gameState;

  // Fixed grid dimensions - always the same regardless of screen size
  const GRID_COLS = 26;  // A-Z
  const GRID_ROWS = 18;  // 1-18

  /**
   * Convert col/row to coordinate string (e.g., "A-1", "H-4", "P-8")
   */
  const getHexCoordinate = (col, row) => {
    const colLetter = String.fromCharCode(65 + col); // A=0, B=1, etc.
    return `${colLetter}-${row + 1}`;
  };

  /**
   * Generate hex grid with fixed dimensions and integrated map icons
   * Grid is always 26x18, hex size scales to fit container
   */
  const generateHexGrid = (containerWidth, containerHeight, gameSeed, activeCount = 6) => {
    // Calculate hex size to fit width (primary constraint)
    const hexWidth = containerWidth / (GRID_COLS + 0.5); // +0.5 for stagger offset

    // Pointy-top hex: height = width * (2 / sqrt(3)) ≈ width * 1.1547
    const hexHeight = hexWidth * 1.1547;
    const verticalSpacing = hexHeight * 0.75; // Rows overlap by 25%

    // Calculate total grid dimensions
    const gridWidth = GRID_COLS * hexWidth + hexWidth / 2;
    const gridHeight = (GRID_ROWS - 1) * verticalSpacing + hexHeight;

    // Center the grid (may overflow top/bottom - that's OK, we clip)
    const offsetX = (containerWidth - gridWidth) / 2;
    const offsetY = (containerHeight - gridHeight) / 2;

    // Calculate grid center for distance calculations
    const centerCol = GRID_COLS / 2;
    const centerRow = GRID_ROWS / 2;

    const allCells = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? hexWidth / 2 : 0;

      for (let col = 0; col < GRID_COLS; col++) {
        // Calculate normalized distance from center (0 = center, 1 = edge)
        const distanceFromCenter = Math.sqrt(
          Math.pow((col - centerCol) / (GRID_COLS / 2), 2) +
          Math.pow((row - centerRow) / (GRID_ROWS / 2), 2)
        );

        allCells.push({
          col,
          row,
          coordinate: getHexCoordinate(col, row),
          x: offsetX + col * hexWidth + xOffset,
          y: offsetY + row * verticalSpacing,
          isActive: false,
          mapIndex: null,
          distanceFromCenter
        });
      }
    }

    // Select cells for active maps using seeded random (deterministic)
    // Avoid edge cells for active maps
    const validCells = allCells.filter(cell =>
      cell.col >= 2 && cell.col < GRID_COLS - 2 &&
      cell.row >= 1 && cell.row < GRID_ROWS - 1
    );

    // Get tier zone config (currently tier 1)
    const tier = 1;
    const tierConfig = mapTiers.find(t => t.tier === tier);
    const gridZone = tierConfig?.gridZone || { minDistance: 0, maxDistance: 1 };

    // Filter to cells within the tier's grid zone
    const zoneCells = validCells.filter(cell =>
      cell.distanceFromCenter >= gridZone.minDistance &&
      cell.distanceFromCenter <= gridZone.maxDistance
    );

    // Use seeded random for deterministic placement
    const rng = new SeededRandom(gameSeed || 12345);
    const shuffled = rng.shuffle(zoneCells.length > 0 ? zoneCells : validCells);
    const selected = [];

    for (const cell of shuffled) {
      if (selected.length >= activeCount) break;

      // Ensure minimum 3 cells apart from other active cells
      const tooClose = selected.some(sel =>
        Math.abs(sel.col - cell.col) < 3 && Math.abs(sel.row - cell.row) < 2
      );

      if (!tooClose) {
        cell.isActive = true;
        cell.mapIndex = selected.length;
        selected.push(cell);
      }
    }

    return { allCells, hexWidth, hexHeight, offsetX, offsetY };
  };

  // Get tier-based border color (moved outside render for reuse)
  const getTierColor = (tier) => {
    const tierToRarity = {
      1: 'Common',    // Grey
      2: 'Uncommon',  // Green
      3: 'Rare',      // Blue
      4: 'Mythic'     // Purple
    };
    return RARITY_COLORS[tierToRarity[tier]] || '#808080';
  };

  /**
   * Generate hex grid on mount (uses game seed for deterministic placement)
   */
  useEffect(() => {
    const generateGrid = () => {
      if (mapContainerRef.current && singlePlayerProfile?.gameSeed) {
        const { width, height } = mapContainerRef.current.getBoundingClientRect();
        const gridData = generateHexGrid(width, height, singlePlayerProfile.gameSeed, 6);
        setHexGridData({ ...gridData, width, height });
      }
    };

    // Generate after a brief delay to ensure container is rendered
    const timer = setTimeout(generateGrid, 100);

    return () => clearTimeout(timer);
  }, [singlePlayerProfile?.gameSeed]);

  /**
   * Generate 6 procedural maps on mount (one per icon)
   * Uses game seed for deterministic generation
   */
  useEffect(() => {
    if (!singlePlayerProfile?.gameSeed) return;

    const generateMapsForSession = () => {
      const maps = [];
      const { gameSeed } = singlePlayerProfile;

      // Generate 6 maps using mapGenerator utility
      // For now, all Tier 1 and GENERIC type (can mix later)
      for (let i = 0; i < 6; i++) {
        const mapSeed = gameSeed + i; // Unique seed per map
        const mapType = 'GENERIC';  // For MVP: all generic, later add type selection
        const mapData = generateMapData(mapSeed, 1, mapType); // Tier 1, GENERIC type
        maps.push({
          id: i + 1,
          ...mapData
        });
      }

      setGeneratedMaps(maps);
    };

    generateMapsForSession();
  }, [singlePlayerProfile]);

  /**
   * Build sorted list of active sectors for navigation
   * Order: left-to-right within each row, top-to-bottom across rows
   */
  const activeSectors = useMemo(() => {
    if (!hexGridData) return [];
    return hexGridData.allCells
      .filter(cell => cell.isActive)
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      })
      .map(cell => ({
        coordinate: cell.coordinate,
        mapIndex: cell.mapIndex
      }));
  }, [hexGridData]);

  /**
   * Attach wheel listener with { passive: false } to allow preventDefault
   * This fixes the "Unable to preventDefault inside passive event listener" error
   */
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prevZoom => {
        const newZoom = Math.min(3, Math.max(1.2, prevZoom + delta));
        // Also update pan using functional update
        setPan(p => {
          if (!mapContainerRef.current || newZoom <= 1) return { x: 0, y: 0 };
          const { width, height } = mapContainerRef.current.getBoundingClientRect();
          const maxPanX = (width * (newZoom - 1)) / 2;
          const maxPanY = (height * (newZoom - 1)) / 2;
          return {
            x: Math.max(-maxPanX, Math.min(maxPanX, p.x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, p.y))
          };
        });
        return newZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Keep panRef in sync when pan state changes from non-drag sources
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  /**
   * Pan/Zoom helper functions
   */
  const clampPan = (panX, panY, zoomLevel) => {
    if (!mapContainerRef.current || zoomLevel <= 1) return { x: 0, y: 0 };
    const { width, height } = mapContainerRef.current.getBoundingClientRect();
    const maxPanX = (width * (zoomLevel - 1)) / 2;
    const maxPanY = (height * (zoomLevel - 1)) / 2;
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, panX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, panY))
    };
  };

  /**
   * Zoom and pan to center on a specific sector
   */
  const zoomToSector = (coordinate) => {
    const cell = hexGridData?.allCells.find(c => c.coordinate === coordinate);
    if (!cell || !mapContainerRef.current) return;

    const container = mapContainerRef.current.getBoundingClientRect();
    const targetZoom = 2; // Zoom level when focusing on a sector

    // Calculate center of the cell
    const cellCenterX = cell.x + hexGridData.hexWidth / 2;
    const cellCenterY = cell.y + hexGridData.hexHeight / 2;

    // Calculate pan needed to center this cell
    // The transform origin is center, so we need to offset from container center
    const containerCenterX = container.width / 2;
    const containerCenterY = container.height / 2;

    // Pan = (containerCenter - cellCenter) at the target zoom level
    const panX = (containerCenterX - cellCenterX) * targetZoom;
    const panY = (containerCenterY - cellCenterY) * targetZoom;

    // Clamp pan values
    const clamped = clampPan(panX, panY, targetZoom);

    setZoom(targetZoom);
    setPan(clamped);
    panRef.current = clamped;
  };

  const handleMapMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMapMouseMove = (e) => {
    if (isDragging && transformRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const clamped = clampPan(newX, newY, zoom);
      // Direct DOM update - bypasses React re-render for smooth panning
      transformRef.current.style.transform =
        `scale(${zoom}) translate(${clamped.x / zoom}px, ${clamped.y / zoom}px)`;
      panRef.current = clamped; // Store for sync on mouse up
    }
  };

  const handleMapMouseUp = () => {
    if (isDragging) {
      setPan(panRef.current); // Sync final position to state
    }
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
  };

  /**
   * Off-screen POI detection for direction arrows
   */
  const getOffScreenPOIs = () => {
    if (!hexGridData || !mapContainerRef.current || zoom <= 1) return [];

    const container = mapContainerRef.current.getBoundingClientRect();
    const { width, height } = container;
    const centerX = width / 2;
    const centerY = height / 2;

    const offScreen = [];
    const padding = 50; // POI must be this far off-screen to show arrow

    hexGridData.allCells.filter(cell => cell.isActive).forEach(cell => {
      const cellCenterX = cell.x + hexGridData.hexWidth / 2;
      const cellCenterY = cell.y + hexGridData.hexHeight / 2;

      // Calculate screen position of this POI
      // Transform: scale(zoom) translate(pan.x/zoom, pan.y/zoom) with origin at center
      const screenX = (cellCenterX - centerX) * zoom + centerX + pan.x;
      const screenY = (cellCenterY - centerY) * zoom + centerY + pan.y;

      // Check if POI is off-screen (with padding)
      const isOffScreen =
        screenX < -padding ||
        screenX > width + padding ||
        screenY < -padding ||
        screenY > height + padding;

      if (isOffScreen) {
        // Calculate angle from screen center to POI's screen position
        const dx = screenX - centerX;
        const dy = screenY - centerY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        offScreen.push({
          cell,
          angle,
          screenX,
          screenY
        });
      }
    });

    return offScreen;
  };

  /**
   * Calculate arrow position at screen edge pointing toward off-screen POI
   */
  const getArrowEdgePosition = (angle, containerWidth, containerHeight) => {
    const radians = angle * (Math.PI / 180);
    const padding = 40;
    const halfW = containerWidth / 2 - padding;
    const halfH = containerHeight / 2 - padding;

    // Calculate intersection point with screen edge
    const tanAngle = Math.tan(radians);
    let x, y;

    // Check if intersection is with left/right edge or top/bottom edge
    if (Math.abs(Math.cos(radians)) * halfH > Math.abs(Math.sin(radians)) * halfW) {
      // Intersects left or right edge
      x = Math.cos(radians) > 0 ? halfW : -halfW;
      y = x * tanAngle;
    } else {
      // Intersects top or bottom edge
      y = Math.sin(radians) > 0 ? halfH : -halfH;
      x = y / tanAngle;
    }

    return {
      left: containerWidth / 2 + x - 12,
      top: containerHeight / 2 + y - 12
    };
  };

  /**
   * Event Handlers
   */

  // Sidebar mode toggle
  const handleModeToggle = (mode) => {
    setSidebarMode(mode);
  };

  // Ship slot click - opens deck editor
  const handleSlotClick = (slot) => {
    if (slot.status === 'mia') {
      // Open MIA recovery modal
      setSelectedMiaSlot(slot);
      setActiveModal('miaRecovery');
      return;
    }

    if (slot.status === 'empty') {
      // Show new deck prompt modal
      setSelectedSlotId(slot.id);
      setActiveModal('newDeckPrompt');
    } else if (slot.status === 'active') {
      // Navigate to deck editor screen (read-only for slot 0)
      gameStateManager.setState({
        appState: 'extractionDeckBuilder',
        extractionDeckSlotId: slot.id,
        extractionNewDeckOption: null
      });
    }
  };

  // Close MIA recovery modal
  const handleCloseMiaModal = () => {
    setSelectedMiaSlot(null);
    setActiveModal(null);
  };

  // Handle star toggle (set as default ship)
  const handleStarToggle = (e, slotId) => {
    e.stopPropagation(); // Prevent slot click
    const currentDefault = singlePlayerProfile?.defaultShipSlotId ?? 0;
    // Toggle: if already default, set to slot 0; otherwise set this slot as default
    const newDefault = currentDefault === slotId ? 0 : slotId;
    gameStateManager.setDefaultShipSlot(newDefault);
  };

  // Handle delete click
  const handleDeleteClick = (e, slot) => {
    e.stopPropagation(); // Prevent slot click
    setDeleteConfirmation({
      slotId: slot.id,
      slotName: slot.name || `Ship Slot ${slot.id}`
    });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (deleteConfirmation) {
      gameStateManager.deleteShipSlotDeck(deleteConfirmation.slotId);
      setDeleteConfirmation(null);
    }
  };

  // Cancel delete
  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
  };

  // Handle slot unlock - unlocks the next deck slot (sequential)
  const handleUnlockSlot = (e) => {
    e.stopPropagation(); // Prevent slot click
    const result = gameStateManager.unlockNextDeckSlot();
    if (!result.success) {
      console.warn('Failed to unlock slot:', result.error);
    }
  };

  // Handle new deck option selection - show confirmation modal for both options
  const handleNewDeckOption = (option) => {
    setActiveModal(null);
    if (option === 'copyFromSlot0') {
      // Show confirmation modal for copy from starter deck
      setCopyStarterConfirmation(true);
    } else if (option === 'empty') {
      // Show confirmation modal for empty deck (costs 500 credits)
      setEmptyDeckConfirmation(true);
    }
  };

  // Handle confirm copy from starter deck - pay cost and create inventory copies
  const handleConfirmCopyStarter = () => {
    const cost = ECONOMY.STARTER_DECK_COPY_COST || 500;
    const credits = singlePlayerProfile?.credits || 0;

    if (credits < cost) {
      setCopyStarterConfirmation(false);
      return;
    }

    // Deduct credits
    const newProfile = {
      ...singlePlayerProfile,
      credits: singlePlayerProfile.credits - cost
    };

    // Add starter deck cards to inventory
    const newInventory = { ...singlePlayerInventory };
    (starterDeck.decklist || []).forEach(card => {
      newInventory[card.id] = (newInventory[card.id] || 0) + card.quantity;
    });

    // Add starter ship to inventory
    if (starterDeck.shipId) {
      newInventory[starterDeck.shipId] = (newInventory[starterDeck.shipId] || 0) + 1;
    }

    // Add starter drones as instances
    const newDroneInstances = [...(singlePlayerDroneInstances || [])];
    (starterDeck.droneSlots || []).forEach(slot => {
      if (slot.assignedDrone) {
        newDroneInstances.push({
          id: `DRONE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          droneName: slot.assignedDrone,
          shipSlotId: selectedSlotId,
          isDamaged: false,
          isMIA: false
        });
      }
    });

    // Add starter components as instances
    const newComponentInstances = [...(singlePlayerShipComponentInstances || [])];
    Object.keys(starterDeck.shipComponents || {}).forEach(compId => {
      // Get max hull from component data (simplified - just use 10 as default)
      newComponentInstances.push({
        id: `COMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        componentId: compId,
        shipSlotId: selectedSlotId,
        currentHull: 10,
        maxHull: 10
      });
    });

    // Update state
    gameStateManager.setState({
      singlePlayerProfile: newProfile,
      singlePlayerInventory: newInventory,
      singlePlayerDroneInstances: newDroneInstances,
      singlePlayerShipComponentInstances: newComponentInstances
    });

    // IMMEDIATELY create the deck - deck exists as soon as credits are paid
    // This ensures deck persists even if user exits deck builder without saving
    const deckData = {
      name: `Ship ${selectedSlotId}`,
      decklist: starterDeck.decklist.map(card => ({ id: card.id, quantity: card.quantity })),
      droneSlots: JSON.parse(JSON.stringify(starterDeck.droneSlots)),
      shipComponents: { ...starterDeck.shipComponents },
      shipId: starterDeck.shipId
    };
    gameStateManager.saveShipSlotDeck(selectedSlotId, deckData);

    debugLog('HANGAR', `Created deck in slot ${selectedSlotId} immediately`);

    // Close confirmation and navigate to deck builder for optional editing
    setCopyStarterConfirmation(false);
    gameStateManager.setState({
      appState: 'extractionDeckBuilder',
      extractionDeckSlotId: selectedSlotId,
      extractionNewDeckOption: null  // Deck already exists - editing mode
    });

    debugLog('HANGAR', `Copied starter deck for ${cost} credits`);
  };

  // Handle cancel copy starter
  const handleCancelCopyStarter = () => {
    setCopyStarterConfirmation(false);
  };

  // Handle confirm empty deck creation - pay cost and create empty deck
  const handleConfirmEmptyDeck = () => {
    const cost = ECONOMY.STARTER_DECK_COPY_COST || 500;
    const credits = singlePlayerProfile?.credits || 0;

    if (credits < cost) {
      setEmptyDeckConfirmation(false);
      return;
    }

    // Deduct credits
    const newProfile = {
      ...singlePlayerProfile,
      credits: singlePlayerProfile.credits - cost
    };

    // Update state with credit deduction
    gameStateManager.setState({
      singlePlayerProfile: newProfile
    });

    // IMMEDIATELY create the empty deck - deck exists as soon as credits are paid
    const deckData = {
      name: `Ship ${selectedSlotId}`,
      decklist: [],
      drones: [],
      shipComponents: {},
      shipId: null
    };
    gameStateManager.saveShipSlotDeck(selectedSlotId, deckData);

    debugLog('HANGAR', `Created empty deck in slot ${selectedSlotId} for ${cost} credits`);

    // Close confirmation and navigate to deck builder
    setEmptyDeckConfirmation(false);
    gameStateManager.setState({
      appState: 'extractionDeckBuilder',
      extractionDeckSlotId: selectedSlotId,
      extractionNewDeckOption: null  // Deck already exists - editing mode
    });
  };

  // Handle cancel empty deck creation
  const handleCancelEmptyDeck = () => {
    setEmptyDeckConfirmation(false);
  };

  // Action button clicks
  const handleActionClick = (action) => {
    switch(action) {
      case 'inventory':
        setActiveModal('inventory');
        break;
      case 'replicator':
        setActiveModal('replicator');
        break;
      case 'blueprints':
        setActiveModal('blueprints');
        break;
      case 'repairBay':
        setActiveModal('repairBay');
        break;
      case 'saveLoad':
        setActiveModal('saveLoad');
        break;
      case 'exit':
        gameStateManager.setState({ appState: 'menu' });
        break;
      default:
        break;
    }
  };

  // Map selection handler
  const handleMapSelected = (mapData) => {
    setSelectedMap(mapData);
    setActiveModal('mapOverview');
  };

  // Map icon click handler
  const handleMapIconClick = (mapIndex, coordinate) => {
    debugLog('EXTRACTION', '🗺️ Map icon clicked', { mapIndex, coordinate });

    const map = generatedMaps[mapIndex];
    if (!map) {
      debugLog('EXTRACTION', '❌ Map data not generated yet', {
        mapIndex,
        generatedMapsLength: generatedMaps.length
      });
      console.error('[HangarScreen] Map data not generated yet');
      return;
    }

    debugLog('EXTRACTION', '✅ Map found', { mapName: map.name, tier: map.tier });

    // Zoom to the clicked sector
    zoomToSector(coordinate);

    // Use default ship slot if set, otherwise first active slot
    const defaultSlotId = singlePlayerProfile?.defaultShipSlotId;
    let activeSlot = defaultSlotId
      ? singlePlayerShipSlots.find(slot => slot.id === defaultSlotId && slot.status === 'active')
      : null;

    // Fallback to first active slot if default not set or not active
    if (!activeSlot) {
      activeSlot = singlePlayerShipSlots.find(slot => slot.status === 'active');
    }

    if (!activeSlot) {
      debugLog('EXTRACTION', '❌ No active ship available', {
        totalSlots: singlePlayerShipSlots.length,
        activeCount: singlePlayerShipSlots.filter(s => s.status === 'active').length
      });
      console.error('[HangarScreen] No active ship available for deployment');
      return;
    }

    // Check if the ship is undeployable (all sections destroyed)
    const slotValidation = validateShipSlot(activeSlot);
    if (slotValidation.isUndeployable) {
      debugLog('EXTRACTION', '❌ Ship is undeployable - all sections destroyed', {
        slotId: activeSlot.id,
        slotName: activeSlot.name
      });
      console.error('[HangarScreen] Ship is undeployable - repair sections in deck builder');
      return;
    }

    debugLog('EXTRACTION', '✅ Active slot found', { slotId: activeSlot.id });
    debugLog('EXTRACTION', '📝 Setting state for deployment', {
      slotId: activeSlot.id,
      mapName: map.name,
      coordinate
    });

    setSelectedSlotId(activeSlot.id);
    setSelectedMap(map);
    setSelectedCoordinate(coordinate);
    setActiveModal('mapOverview');

    debugLog('EXTRACTION', '⏱️ State set calls queued (async batch)');
  };

  // Deploy handler
  const handleDeploy = (slotId, map, entryGateId = 0, quickDeploy = null) => {
    debugLog('EXTRACTION', '🚀 handleDeploy called', {
      slotId,
      mapName: map?.name,
      entryGateId,
      quickDeploy: quickDeploy?.name || 'standard',
      hasSlotId: slotId != null,
      hasMap: map != null
    });

    // Validate parameters
    if (slotId == null || map == null) {
      debugLog('EXTRACTION', '❌ Cannot deploy: missing parameters', {
        slotId,
        map,
        selectedSlotIdState: selectedSlotId,
        selectedMapState: selectedMap?.name
      });
      console.error('[HangarScreen] Cannot deploy: missing parameters');
      return;
    }

    // Check if ship is undeployable (all sections destroyed)
    const shipSlot = singlePlayerShipSlots.find(s => s.id === slotId);
    if (shipSlot) {
      const slotValidation = validateShipSlot(shipSlot);
      if (slotValidation.isUndeployable) {
        debugLog('EXTRACTION', '❌ Cannot deploy: ship undeployable', {
          slotId,
          slotName: shipSlot.name
        });
        console.error('[HangarScreen] Cannot deploy: ship is undeployable - all sections destroyed');
        return;
      }
    }

    debugLog('EXTRACTION', '✅ Deploying to map', {
      slotId,
      mapName: map.name,
      tier: map.tier,
      entryGateId,
      quickDeploy: quickDeploy?.name || 'standard'
    });

    gameStateManager.startRun(slotId, map.tier, entryGateId, map, quickDeploy);
    closeAllModals();
  };

  // Close all modals
  const closeAllModals = () => {
    setActiveModal(null);
    setSelectedSlotId(null);
    setSelectedMap(null);
    setSelectedCoordinate(null);
  };

  // Navigate to a different sector in the modal
  const handleNavigateSector = (coordinate) => {
    const sector = activeSectors.find(s => s.coordinate === coordinate);
    if (sector) {
      setSelectedCoordinate(coordinate);
      setSelectedMap(generatedMaps[sector.mapIndex]);
      zoomToSector(coordinate); // Also zoom/pan the hangar map
    }
  };

  // Dismiss run summary modal
  const handleDismissRunSummary = () => {
    gameStateManager.setState({ lastRunSummary: null });
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
      {/* Header Section */}
      <header style={{
        background: 'rgba(17, 24, 39, 0.95)',
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
        }}>HANGAR</h1>

        {/* Right: Stats */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[
            { label: 'CREDITS', value: singlePlayerProfile?.credits || 0, color: '#fbbf24' },
            { label: 'AI CORES', value: singlePlayerProfile?.aiCores || 0, color: '#f97316', icon: Cpu },
            { label: 'TOKENS', value: singlePlayerProfile?.securityTokens || 0, color: '#06b6d4' },
            { label: 'MAP KEYS', value: 0, color: '#60a5fa' },
            { label: 'RUNS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#e5e7eb' },
            { label: 'EXTRACTIONS', value: singlePlayerProfile?.stats?.runsCompleted || 0, color: '#22c55e' },
            { label: 'COMBATS WON', value: singlePlayerProfile?.stats?.totalCombatsWon || 0, color: '#10b981' },
            { label: 'MAX TIER', value: singlePlayerProfile?.stats?.highestTierCompleted || 1, color: '#a855f7' }
          ].map(({ label, value, color, icon: Icon }) => (
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

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '3fr 1fr',
        overflow: 'hidden'
      }}>
        {/* Central Map Area */}
        <div
          ref={mapContainerRef}
          style={{
            position: 'relative',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            // Enhanced monitor-style border
            border: '2px solid rgba(6, 182, 212, 0.6)',
            boxShadow: `
              inset 0 0 30px rgba(0, 0, 0, 0.8),
              0 0 20px rgba(6, 182, 212, 0.3),
              0 0 40px rgba(6, 182, 212, 0.1)
            `,
            borderRadius: '4px'
          }}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onMouseLeave={handleMapMouseUp}
        >
          {/* News Ticker - sector intel feed (only render when hexGridData is ready for stable data) */}
          {hexGridData && <NewsTicker maps={mapsWithCoordinates} />}

          {/* Transformable container for pan/zoom */}
          <div
            ref={transformRef}
            style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}>
          {/* Background image element - uses img for better quality scaling */}
           <img
            src={eremosBackground}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
          {/* SVG Hex Grid - integrated grid and map icons */}
          {hexGridData && (
            <svg
              width={hexGridData.width}
              height={hexGridData.height}
              style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}
            >
              {/* SVG Filters for glow effects */}
              <defs>
                <filter id="hexGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {hexGridData.allCells.map((cell, i) => {
                const { hexWidth, hexHeight } = hexGridData;

                // SVG path for pointy-top hexagon
                const hexPath = `M${hexWidth/2},0 L${hexWidth},${hexHeight*0.25} L${hexWidth},${hexHeight*0.75} L${hexWidth/2},${hexHeight} L0,${hexHeight*0.75} L0,${hexHeight*0.25} Z`;

                if (cell.isActive) {
                  // Active cell - vibrant cyan with glow and ping effects
                  const map = generatedMaps[cell.mapIndex];
                  const isGenerated = !!map;
                  const centerX = hexWidth / 2;
                  const centerY = hexHeight / 2;

                  // Determine sector color: red for token-required maps, cyan for normal
                  const requiresToken = map?.requiresToken;
                  const sectorColor = requiresToken ? '#ef4444' : '#06b6d4';
                  const sectorColorRgba = requiresToken ? 'rgba(239,68,68,0.15)' : 'rgba(6,182,212,0.15)';
                  const sectorColorFaint = requiresToken ? 'rgba(239,68,68,0.5)' : 'rgba(6,182,212,0.5)';
                  const pulseAnimation = requiresToken
                    ? 'hexDangerPulse 1.5s ease-in-out infinite'
                    : 'hexPulse 2s ease-in-out infinite';

                  return (
                    <g
                      key={i}
                      transform={`translate(${cell.x}, ${cell.y})`}
                      onClick={() => isGenerated && handleMapIconClick(cell.mapIndex, cell.coordinate)}
                      style={{ cursor: isGenerated ? 'pointer' : 'default' }}
                    >
                      {/* Pulsing glow layer behind hex */}
                      <path
                        d={hexPath}
                        fill="none"
                        stroke={sectorColor}
                        strokeWidth="10"
                        style={{
                          filter: 'blur(6px)',
                          animation: pulseAnimation,
                          animationDelay: `${cell.mapIndex * 0.3}s`
                        }}
                      />

                      {/* Radar ping circle - expands outward */}
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r="20"
                        fill="none"
                        stroke={sectorColor}
                        strokeWidth="2"
                        style={{
                          animation: 'hexRadarPing 4s ease-out infinite',
                          animationDelay: `${cell.mapIndex * 0.7}s`
                        }}
                      />

                      {/* Outer hex - vibrant border */}
                      <path
                        d={hexPath}
                        fill={sectorColorRgba}
                        stroke={sectorColor}
                        strokeWidth="3"
                        filter="url(#hexGlow)"
                      />

                      {/* Inner hex - darker content area */}
                      <path
                        d={`M${hexWidth/2},4 L${hexWidth-4},${hexHeight*0.25+2} L${hexWidth-4},${hexHeight*0.75-2} L${hexWidth/2},${hexHeight-4} L4,${hexHeight*0.75-2} L4,${hexHeight*0.25+2} Z`}
                        fill="rgba(17,24,39,0.9)"
                        stroke={sectorColorFaint}
                        strokeWidth="1"
                      />

                      {/* Sector coordinate as main label */}
                      <text
                        x={centerX}
                        y={centerY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize={Math.max(10, hexWidth * 0.16)}
                        fontWeight="bold"
                        style={{
                          pointerEvents: 'none',
                          textShadow: '0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)'
                        }}
                      >
                        SECTOR {cell.coordinate}
                      </text>
                    </g>
                  );
                } else {
                  // Inactive cell - just grid outline
                  return (
                    <path
                      key={i}
                      d={hexPath}
                      transform={`translate(${cell.x}, ${cell.y})`}
                      fill="none"
                      stroke="rgba(6,182,212,0.3)"
                      strokeWidth="1"
                    />
                  );
                }
              })}
            </svg>
          )}
          </div>
          {/* End transformable container */}

          {/* Vignette Layer 1: Deep corner shadows */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.95) 100%)',
            pointerEvents: 'none',
            zIndex: 3
          }} />

          {/* Vignette Layer 2: Top/bottom edge tints */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to bottom,
              rgba(6, 182, 212, 0.03) 0%,
              transparent 3%,
              transparent 97%,
              rgba(6, 182, 212, 0.03) 100%
            )`,
            pointerEvents: 'none',
            zIndex: 4
          }} />

          {/* Vignette Layer 3: Inner frame shadow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
            zIndex: 5
          }} />

          {/* CRT Scanline Effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1.5px,
              rgba(0, 0, 0, 0.06) 1.5px,
              rgba(0, 0, 0, 0.06) 3px
            )`,
            pointerEvents: 'none',
            zIndex: 6
          }} />

          {/* Zoom Controls - small buttons at bottom-left corner */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10
          }}>
            <button
              className="dw-btn dw-btn-secondary"
              onClick={() => setZoom(z => Math.min(3, z + 0.2))}
              style={{ padding: '8px 12px' }}
            >
              <Plus size={18} />
            </button>
            <button
              className="dw-btn dw-btn-secondary"
              onClick={() => setZoom(z => Math.max(1, z - 0.2))}
              style={{ padding: '8px 12px' }}
            >
              <Minus size={18} />
            </button>
            <button
              className="dw-btn dw-btn-secondary"
              onClick={handleResetView}
              style={{ padding: '8px 12px' }}
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* POI Direction Arrows */}
          {hexGridData && mapContainerRef.current && zoom > 1 && (() => {
            const container = mapContainerRef.current.getBoundingClientRect();
            const offScreenPOIs = getOffScreenPOIs();
            return offScreenPOIs.map((poi, i) => {
              const pos = getArrowEdgePosition(poi.angle, container.width, container.height);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: pos.left,
                    top: pos.top,
                    transform: `rotate(${poi.angle}deg)`,
                    zIndex: 8,
                    pointerEvents: 'none',
                    animation: 'poiArrowPulse 1.5s ease-in-out infinite'
                  }}
                >
                  <ChevronRight size={36} color="#06b6d4" strokeWidth={3} />
                </div>
              );
            });
          })()}
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col p-6" style={{
          borderRadius: 0,
          borderLeft: '2px solid rgba(6, 182, 212, 0.3)',
          background: 'rgba(0, 0, 0, 0.4)',
          gap: '1rem'
        }}>
          {/* Toggle Buttons */}
          <div className="flex gap-2" style={{ marginBottom: '0.5rem' }}>
            <button
              onClick={() => handleModeToggle('options')}
              className={`dw-btn ${sidebarMode === 'options' ? 'dw-btn-confirm' : 'dw-btn-secondary'}`}
              style={{ flex: 1 }}
            >
              OPTIONS
            </button>
            <button
              onClick={() => handleModeToggle('ships')}
              className={`dw-btn ${sidebarMode === 'ships' ? 'dw-btn-confirm' : 'dw-btn-secondary'}`}
              style={{ flex: 1 }}
            >
              SHIPS
            </button>
          </div>

          {/* Dynamic Panel */}
          <div className="flex flex-col panel-scrollable" style={{ flex: 1, gap: '0.75rem' }}>
            {sidebarMode === 'options' ? (
              // Options Mode: Image Buttons (stacked vertically, filling space)
              <>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                  {[
                    { key: 'inventory', label: 'INVENTORY', image: hangarImages.inventory },
                    { key: 'replicator', label: 'REPLICATOR', image: hangarImages.replicator },
                    { key: 'blueprints', label: 'BLUEPRINTS', image: hangarImages.blueprints },
                    { key: 'repairBay', label: 'REPAIR BAY', image: hangarImages.repairBay }
                  ].map(({ key, label, image }) => {
                    const isHovered = hoveredButton === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleActionClick(key)}
                        onMouseEnter={() => setHoveredButton(key)}
                        onMouseLeave={() => setHoveredButton(null)}
                        style={{
                          backgroundImage: `url('${image}')`,
                          backgroundPosition: 'center',
                          backgroundSize: isHovered ? '115%' : '100%',
                          flex: 1,
                          minHeight: '100px',
                          border: '1px solid rgba(6, 182, 212, 0.4)',
                          borderRadius: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: 0,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'background-size 0.3s ease'
                        }}
                      >
                        {/* Full-width dark strip at bottom */}
                        <div style={{
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '8px 12px',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            color: '#fff'
                          }}>{label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleActionClick('saveLoad')}
                  className="dw-btn dw-btn-secondary dw-btn--full"
                >
                  SAVE / LOAD
                </button>
                <button
                  onClick={() => handleActionClick('exit')}
                  className="dw-btn dw-btn-danger dw-btn--full"
                  style={{ marginTop: 'auto' }}
                >
                  EXIT
                </button>
              </>
            ) : (
              // Ships Mode: Ship Cards with star toggle and delete
              <>
                {singlePlayerShipSlots.map((slot) => {
                  const isDefault = singlePlayerProfile?.defaultShipSlotId === slot.id;
                  const isSlot0 = slot.id === 0;
                  const isActive = slot.status === 'active';
                  const isEmpty = slot.status === 'empty';
                  const isMia = slot.status === 'mia';

                  // Deck slot unlock state
                  const isUnlocked = gameStateManager.isSlotUnlocked(slot.id);
                  const highestUnlocked = singlePlayerProfile?.highestUnlockedSlot ?? 0;
                  const isNextToUnlock = !isUnlocked && slot.id === highestUnlocked + 1;
                  const unlockCost = isNextToUnlock ? ECONOMY.DECK_SLOT_UNLOCK_COSTS[slot.id] : null;
                  const credits = singlePlayerProfile?.credits ?? 0;
                  const canAfford = unlockCost !== null && credits >= unlockCost;

                  // Get card/drone counts for active slots
                  const cardCount = isActive ? (slot.decklist || []).reduce((sum, c) => sum + c.quantity, 0) : 0;
                  const droneCount = isActive ? (slot.droneSlots || []).filter(s => s.assignedDrone).length : 0;

                  // Get loadout value for reputation display
                  const loadoutValueData = isActive ? ReputationService.getLoadoutValue(slot) : null;

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

                  // Determine slot state class
                  const getSlotClass = () => {
                    if (!isUnlocked) return 'dw-deck-slot--locked';
                    if (isMia) return 'dw-deck-slot--mia';
                    if (isEmpty) return 'dw-deck-slot--empty';
                    if (isUndeployable) return 'dw-deck-slot--undeployable';
                    if (isDefault) return 'dw-deck-slot--default';
                    return 'dw-deck-slot--active';
                  };

                  // Get ship image for active slots background
                  const ship = isActive && slot.shipId ? getShipById(slot.shipId) : null;
                  const shipImage = ship?.image || null;

                  return (
                    <div
                      key={slot.id}
                      className={`dw-deck-slot ${getSlotClass()}`}
                      onClick={() => isUnlocked && handleSlotClick(slot)}
                      style={shipImage ? {
                        backgroundImage: `url(${shipImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      } : undefined}
                    >
                      {!isUnlocked ? (
                        // LOCKED SLOT CONTENT
                        <div className="dw-deck-slot-locked-content">
                          <Lock size={18} className="dw-deck-slot-lock-icon" />
                          <span className="dw-deck-slot-locked-label">SLOT {slot.id}</span>

                          {isNextToUnlock ? (
                            <button
                              className={`dw-btn dw-btn-confirm dw-btn--sm dw-btn--full ${!canAfford ? 'dw-btn--disabled' : ''}`}
                              onClick={handleUnlockSlot}
                              disabled={!canAfford}
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
                          {/* Header Row: Slot name/id + Star + Delete */}
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
                              {/* Delete button (not for slot 0 or empty slots) */}
                              {isActive && !isSlot0 && (
                                <button
                                  onClick={(e) => handleDeleteClick(e, slot)}
                                  className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                                  title="Delete deck"
                                >
                                  <Trash2 size={16} />
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

                          {/* Loadout value for reputation */}
                          {isActive && (
                            <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '4px' }}>
                              {loadoutValueData?.isStarterDeck
                                ? 'Loadout Value: None (Starter)'
                                : `Loadout Value: ${loadoutValueData?.totalValue?.toLocaleString() || 0}`}
                            </div>
                          )}

                          {/* MIA indicator */}
                          {isMia && (
                            <div className="text-xs text-red-400 mt-1">
                              Click to recover
                            </div>
                          )}

                          {/* Empty slot indicator */}
                          {isEmpty && (
                            <div className="text-xs text-gray-500 mt-1">
                              Click to create
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Quick Deployments Button */}
                <button
                  onClick={() => setActiveModal('quickDeploy')}
                  className="dw-btn dw-btn-secondary dw-btn--full"
                  style={{ marginTop: '0.5rem' }}
                >
                  QUICK DEPLOYMENTS
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals (conditionally rendered) */}
      {activeModal === 'saveLoad' && <SaveLoadModal onClose={closeAllModals} />}
      {activeModal === 'repairBay' && <RepairBayModal onClose={closeAllModals} />}
      {activeModal === 'inventory' && <InventoryModal onClose={closeAllModals} />}
      {activeModal === 'blueprints' && <BlueprintsModal onClose={closeAllModals} />}
      {activeModal === 'replicator' && <ReplicatorModal onClose={closeAllModals} />}
      {activeModal === 'quickDeploy' && <QuickDeployManager onClose={closeAllModals} />}

      {activeModal === 'mapOverview' && (() => {
        debugLog('EXTRACTION', '🖼️ Rendering MapOverviewModal', {
          selectedSlotId,
          selectedMapName: selectedMap?.name,
          selectedCoordinate,
          hasSlotId: selectedSlotId != null,
          hasMap: selectedMap != null
        });

        return (
          <MapOverviewModal
            selectedSlotId={selectedSlotId}
            selectedMap={selectedMap}
            selectedCoordinate={selectedCoordinate}
            activeSectors={activeSectors}
            onNavigate={handleNavigateSector}
            onDeploy={handleDeploy}
            onClose={closeAllModals}
          />
        );
      })()}

      {/* Deck Editor Modal (placeholder) */}
      {activeModal === 'deckEditor' && (
        <div className="modal-overlay">
          <div className="modal-container modal-container-md">
            <h2 className="modal-title">Deck Editor</h2>
            <p className="modal-text">Coming in Phase 3.5</p>
            <button onClick={closeAllModals} className="btn-confirm" style={{ width: '100%', marginTop: '1rem' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Run Summary Modal - shown after returning from a run */}
      {lastRunSummary && (
        <RunSummaryModal
          summary={lastRunSummary}
          onClose={handleDismissRunSummary}
        />
      )}

      {/* MIA Recovery Modal - shown when clicking on MIA ship slot */}
      {activeModal === 'miaRecovery' && selectedMiaSlot && (
        <MIARecoveryModal
          shipSlot={selectedMiaSlot}
          onClose={handleCloseMiaModal}
        />
      )}

      {/* New Deck Prompt Modal */}
      {activeModal === 'newDeckPrompt' && (
        <div className="dw-modal-overlay" onClick={closeAllModals}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Create New Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text">How would you like to start your new deck?</p>
            </div>
            <div className="dw-modal-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              {(() => {
                const deckCost = ECONOMY.STARTER_DECK_COPY_COST || 500;
                const canAffordEmpty = (singlePlayerProfile?.credits || 0) >= deckCost;
                return (
                  <button
                    onClick={() => handleNewDeckOption('empty')}
                    className={`dw-btn dw-btn-confirm dw-btn--full ${!canAffordEmpty ? 'opacity-50' : ''}`}
                    disabled={!canAffordEmpty}
                    title={!canAffordEmpty ? `Not enough credits (need ${deckCost})` : undefined}
                  >
                    Start Empty ({deckCost} credits)
                  </button>
                );
              })()}
              {singlePlayerShipSlots[0]?.status === 'active' && (() => {
                const copyCost = ECONOMY.STARTER_DECK_COPY_COST || 500;
                const canAffordCopy = (singlePlayerProfile?.credits || 0) >= copyCost;
                return (
                  <button
                    onClick={() => handleNewDeckOption('copyFromSlot0')}
                    className={`dw-btn dw-btn-secondary dw-btn--full ${!canAffordCopy ? 'opacity-50' : ''}`}
                    disabled={!canAffordCopy}
                    title={!canAffordCopy ? `Not enough credits (need ${copyCost})` : undefined}
                  >
                    Copy from {singlePlayerShipSlots[0]?.name || 'Starter Deck'} ({copyCost} credits)
                  </button>
                );
              })()}
              <button
                onClick={closeAllModals}
                className="dw-btn dw-btn-cancel dw-btn--full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Deck Confirmation Modal */}
      {deleteConfirmation && (
        <ConfirmationModal
          confirmationModal={{
            type: 'delete',
            text: `Delete "${deleteConfirmation.slotName}"? All non-starter cards will be returned to your inventory.`,
            onConfirm: handleDeleteConfirm,
            onCancel: handleDeleteCancel
          }}
          show={true}
        />
      )}

      {/* Copy Starter Deck Confirmation Modal */}
      {copyStarterConfirmation && (
        <div className="dw-modal-overlay" onClick={handleCancelCopyStarter}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Copy Starter Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text" style={{ marginBottom: '12px' }}>
                This will create owned copies of all starter deck items in your inventory:
              </p>
              <ul style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '12px', paddingLeft: '20px' }}>
                <li>{starterDeck.decklist?.reduce((sum, c) => sum + c.quantity, 0) || 40} cards</li>
                <li>{starterDeck.droneSlots?.filter(s => s.assignedDrone).length || 5} drones</li>
                <li>{Object.keys(starterDeck.shipComponents || {}).length || 3} ship components</li>
                <li>1 ship</li>
              </ul>
              <div className="dw-modal-credits" style={{ marginBottom: 0 }}>
                <span className="dw-modal-credits-label">Cost</span>
                <span className="dw-modal-credits-value" style={{ color: '#fbbf24' }}>
                  {ECONOMY.STARTER_DECK_COPY_COST || 500} credits
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', marginTop: '8px' }}>
                Your balance: {singlePlayerProfile?.credits || 0} credits
              </div>
            </div>
            <div className="dw-modal-actions">
              <button
                onClick={handleCancelCopyStarter}
                className="dw-btn dw-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCopyStarter}
                className="dw-btn dw-btn-confirm"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Deck Creation Confirmation Modal */}
      {emptyDeckConfirmation && (
        <div className="dw-modal-overlay" onClick={handleCancelEmptyDeck}>
          <div className="dw-modal-content dw-modal--sm dw-modal--action" onClick={e => e.stopPropagation()}>
            <div className="dw-modal-header">
              <div className="dw-modal-header-info">
                <h2 className="dw-modal-header-title">Create Empty Deck</h2>
              </div>
            </div>
            <div className="dw-modal-body">
              <p className="dw-modal-text" style={{ marginBottom: '12px' }}>
                This will create a new empty deck slot that you can customize with any cards.
              </p>
              <p className="dw-modal-text" style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', marginBottom: '12px' }}>
                Starter cards are always available in unlimited quantities for deck building.
              </p>
              <div className="dw-modal-credits" style={{ marginBottom: 0 }}>
                <span className="dw-modal-credits-label">Cost</span>
                <span className="dw-modal-credits-value" style={{ color: '#fbbf24' }}>
                  {ECONOMY.STARTER_DECK_COPY_COST || 500} credits
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--modal-text-secondary)', marginTop: '8px' }}>
                Your balance: {singlePlayerProfile?.credits || 0} credits
              </div>
            </div>
            <div className="dw-modal-actions">
              <button
                onClick={handleCancelEmptyDeck}
                className="dw-btn dw-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmptyDeck}
                className="dw-btn dw-btn-confirm"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reputation Progress Modal */}
      {showReputationProgress && (
        <ReputationProgressModal
          onClose={() => setShowReputationProgress(false)}
          onClaimRewards={() => {
            setShowReputationProgress(false);
            setShowReputationRewards(true);
          }}
        />
      )}

      {/* Reputation Reward Modal */}
      {showReputationRewards && (
        <ReputationRewardModal
          onClose={() => setShowReputationRewards(false)}
        />
      )}
    </div>
  );
};

export default HangarScreen;
