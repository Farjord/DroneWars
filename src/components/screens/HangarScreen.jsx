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
import { generateMapData } from '../../utils/mapGenerator';
import { RARITY_COLORS } from '../../data/cardData';
import { getMapType, getMapBackground } from '../../logic/extraction/mapExtraction';
import { debugLog } from '../../utils/debugLogger.js';
import { SeededRandom } from '../../utils/seededRandom.js';

// Background image for the map area
const eremosBackground = new URL('/Eremos/Eremos.jpg', import.meta.url).href;

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

  // Ref for map container to get dimensions
  const mapContainerRef = useRef(null);

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
  const GRID_COLS = 16;  // A-P
  const GRID_ROWS = 8;   // 1-8

  /**
   * Convert col/row to coordinate string (e.g., "A-1", "H-4", "P-8")
   */
  const getHexCoordinate = (col, row) => {
    const colLetter = String.fromCharCode(65 + col); // A=0, B=1, etc.
    return `${colLetter}-${row + 1}`;
  };

  /**
   * Generate hex grid with fixed dimensions and integrated map icons
   * Grid is always 16x8, hex size scales to fit container
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

    const allCells = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      const isOddRow = row % 2 === 1;
      const xOffset = isOddRow ? hexWidth / 2 : 0;

      for (let col = 0; col < GRID_COLS; col++) {
        allCells.push({
          col,
          row,
          coordinate: getHexCoordinate(col, row),
          x: offsetX + col * hexWidth + xOffset,
          y: offsetY + row * verticalSpacing,
          isActive: false,
          mapIndex: null
        });
      }
    }

    // Select cells for active maps using seeded random (deterministic)
    // Avoid edge cells for active maps
    const validCells = allCells.filter(cell =>
      cell.col >= 2 && cell.col < GRID_COLS - 2 &&
      cell.row >= 1 && cell.row < GRID_ROWS - 1
    );

    // Use seeded random for deterministic placement
    const rng = new SeededRandom(gameSeed || 12345);
    const shuffled = rng.shuffle(validCells);
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
   * Event Handlers
   */

  // Sidebar mode toggle
  const handleModeToggle = (mode) => {
    setSidebarMode(mode);
  };

  // Ship slot click
  const handleSlotClick = (slot) => {
    if (slot.status === 'mia') {
      // Open MIA recovery modal
      setSelectedMiaSlot(slot);
      setActiveModal('miaRecovery');
      return;
    }

    if (slot.status === 'empty') {
      setSelectedSlotId(slot.id);
      setActiveModal('deckEditor');
    } else if (slot.status === 'active') {
      // TODO: Future - Set as default ship
      // For now, just show ship details or do nothing
      console.log('Clicked active ship slot:', slot.id);
    }
  };

  // Close MIA recovery modal
  const handleCloseMiaModal = () => {
    setSelectedMiaSlot(null);
    setActiveModal(null);
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

    // For MVP: Auto-select first active ship slot
    const activeSlot = singlePlayerShipSlots.find(slot => slot.status === 'active');
    if (!activeSlot) {
      debugLog('EXTRACTION', '❌ No active ship available', {
        totalSlots: singlePlayerShipSlots.length,
        activeCount: singlePlayerShipSlots.filter(s => s.status === 'active').length
      });
      console.error('[HangarScreen] No active ship available for deployment');
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
  const handleDeploy = (slotId, map, entryGateId = 0) => {
    debugLog('EXTRACTION', '🚀 handleDeploy called', {
      slotId,
      mapName: map?.name,
      entryGateId,
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

    debugLog('EXTRACTION', '✅ Deploying to map', {
      slotId,
      mapName: map.name,
      tier: map.tier,
      entryGateId
    });

    gameStateManager.startRun(slotId, map.tier, entryGateId, map);
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
        background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.9) 0%, rgba(6, 182, 212, 0.7) 100%)',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        boxShadow: 'var(--shadow-panel)',
        borderBottom: '2px solid var(--color-accent-dim)',
        zIndex: 10
      }}>
        {/* Left: Back Button */}
        <button
          onClick={() => gameStateManager.setState({ appState: 'menu' })}
          className="btn-utility"
          style={{ padding: '10px 20px', fontSize: '0.9rem' }}
        >
          ← BACK
        </button>

        {/* Center: Title */}
        <h1 className="text-panel-title" style={{
          fontSize: '2rem',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
          letterSpacing: '0.1em'
        }}>HANGAR</h1>

        {/* Right: Credits & Tokens */}
        <div className="flex gap-8 text-value">
          <div>
            <span className="text-label">CREDITS: </span>
            <span style={{ color: 'var(--color-resource-energy)' }}>{singlePlayerProfile?.credits || 0}</span>
          </div>
          <div>
            <span className="text-label">TOKENS: </span>
            <span style={{ color: 'var(--color-accent-bright)' }}>{singlePlayerProfile?.securityTokens || 0}</span>
          </div>
          <div>
            <span className="text-label">MAP KEYS: </span>
            <span style={{ color: 'var(--color-player-bright)' }}>0</span>
          </div>
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
          className="panel"
          style={{
            position: 'relative',
            padding: '2rem',
            overflow: 'hidden',
            borderRadius: 0,
            backgroundImage: `url('${eremosBackground}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
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
                        stroke="#06b6d4"
                        strokeWidth="10"
                        style={{
                          filter: 'blur(6px)',
                          animation: 'hexPulse 2s ease-in-out infinite',
                          animationDelay: `${cell.mapIndex * 0.3}s`
                        }}
                      />

                      {/* Radar ping circle - expands outward */}
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r="20"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        style={{
                          animation: 'hexRadarPing 4s ease-out infinite',
                          animationDelay: `${cell.mapIndex * 0.7}s`
                        }}
                      />

                      {/* Outer hex - vibrant cyan border */}
                      <path
                        d={hexPath}
                        fill="rgba(6,182,212,0.15)"
                        stroke="#06b6d4"
                        strokeWidth="3"
                        filter="url(#hexGlow)"
                      />

                      {/* Inner hex - darker content area */}
                      <path
                        d={`M${hexWidth/2},4 L${hexWidth-4},${hexHeight*0.25+2} L${hexWidth-4},${hexHeight*0.75-2} L${hexWidth/2},${hexHeight-4} L4,${hexHeight*0.75-2} L4,${hexHeight*0.25+2} Z`}
                        fill="rgba(17,24,39,0.9)"
                        stroke="rgba(6,182,212,0.5)"
                        strokeWidth="1"
                      />

                      {/* Sector coordinate as main label */}
                      <text
                        x={centerX}
                        y={centerY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#06b6d4"
                        fontSize={Math.max(10, hexWidth * 0.16)}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        Sector {cell.coordinate}
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

          {/* Vignette Effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
            pointerEvents: 'none',
            zIndex: 3
          }} />
        </div>

        {/* Right Sidebar */}
        <div className="panel flex flex-col p-6" style={{
          borderRadius: 0,
          borderLeft: '2px solid var(--color-accent-dim)',
          boxShadow: '-4px 0 6px rgba(0, 0, 0, 0.3)',
          gap: '1rem'
        }}>
          {/* Toggle Buttons */}
          <div className="flex gap-2" style={{ marginBottom: '0.5rem' }}>
            <button
              onClick={() => handleModeToggle('options')}
              className={sidebarMode === 'options' ? 'btn-confirm' : 'btn-utility'}
              style={{ flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              OPTIONS
            </button>
            <button
              onClick={() => handleModeToggle('ships')}
              className={sidebarMode === 'ships' ? 'btn-confirm' : 'btn-utility'}
              style={{ flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              SHIPS
            </button>
          </div>

          {/* Dynamic Panel */}
          <div className="flex flex-col panel-scrollable" style={{ flex: 1, gap: '0.75rem' }}>
            {sidebarMode === 'options' ? (
              // Options Mode: Action Buttons
              <>
                <button
                  onClick={() => handleActionClick('inventory')}
                  className="btn-info w-full"
                  style={{ padding: '14px', fontSize: '0.95rem' }}
                >
                  INVENTORY
                </button>
                <button
                  onClick={() => handleActionClick('replicator')}
                  className="btn-info w-full"
                  style={{ padding: '14px', fontSize: '0.95rem' }}
                >
                  REPLICATOR
                </button>
                <button
                  onClick={() => handleActionClick('blueprints')}
                  className="btn-info w-full"
                  style={{ padding: '14px', fontSize: '0.95rem' }}
                >
                  BLUEPRINTS
                </button>
                <button
                  onClick={() => handleActionClick('repairBay')}
                  className="btn-info w-full"
                  style={{ padding: '14px', fontSize: '0.95rem' }}
                >
                  REPAIR BAY
                </button>
                <button
                  onClick={() => handleActionClick('saveLoad')}
                  className="btn-info w-full"
                  style={{ padding: '14px', fontSize: '0.95rem' }}
                >
                  SAVE / LOAD
                </button>
                <button
                  onClick={() => handleActionClick('exit')}
                  className="btn-reset w-full"
                  style={{ padding: '14px', fontSize: '0.95rem', marginTop: 'auto' }}
                >
                  EXIT
                </button>
              </>
            ) : (
              // Ships Mode: Ship Slot Buttons
              <>
                {singlePlayerShipSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    className={`w-full ${slot.status === 'mia' ? 'btn-cancel' : 'btn-info'}`}
                    style={{
                      padding: '14px',
                      fontSize: '0.95rem',
                      opacity: slot.status === 'mia' ? 0.8 : 1
                    }}
                  >
                    SLOT {slot.id}
                    <div className="body-font" style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>
                      {slot.status === 'active' ? slot.name : slot.status.toUpperCase()}
                    </div>
                  </button>
                ))}
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
    </div>
  );
};

export default HangarScreen;
