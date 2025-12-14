// ========================================
// HEX GRID RENDERER
// ========================================
// SVG-based hex grid renderer for Exploring the Eremos tactical map
// Renders hexes, PoIs, gates, player position, and highlighted paths

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { axialToPixel } from '../../utils/hexGrid.js';
import { getShipHeadingForWaypoints } from '../../utils/hexHeadingUtils.js';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import ShipIconRenderer from '../ships/ShipIconRenderer.jsx';
import './HexGridRenderer.css';

// Available tactical background images
const tacticalBackgrounds = [
  new URL('/Tactical/Tactical1.jpg', import.meta.url).href,
  new URL('/Tactical/Tactical2.jpg', import.meta.url).href,
  new URL('/Tactical/Tactical3.jpg', import.meta.url).href,
  new URL('/Tactical/Tactical4.jpg', import.meta.url).href,
  new URL('/Tactical/Tactical15.jpg', import.meta.url).href,
];

/**
 * Calculate dynamic hex size based on viewport and map radius
 * Scales hexes to fill available space with sensible padding
 */
const calculateHexSize = (mapRadius, viewportWidth, viewportHeight) => {
  const padding = 60; // Reduced padding for larger hexes
  const sidebarWidth = 320; // Width of HexInfoPanel
  const availableWidth = viewportWidth - sidebarWidth - (padding * 2);
  const availableHeight = viewportHeight - (padding * 2);

  // More aggressive sizing - use smaller divisors to get larger hexes
  // Flat-top hex grid: width ≈ 2.5R * hexSize, height ≈ 1.8R * sqrt(3) * hexSize
  const maxHexSizeByWidth = availableWidth / (mapRadius * 2.5);
  const maxHexSizeByHeight = availableHeight / (mapRadius * Math.sqrt(3) * 1.8);

  // Minimum 30px for readability, no maximum - fill the space
  return Math.max(30, Math.min(maxHexSizeByWidth, maxHexSizeByHeight));
};

/**
 * Generate decorative hex coordinates for rings beyond the playable map
 * These extend the hex pattern visually without being interactive
 * @param {number} mapRadius - The playable map radius
 * @param {Array} hexes - The playable hexes (to exclude from decorative)
 * @param {number} extraRings - Number of extra rings to generate (default: 8)
 * @returns {Array} Array of {q, r} coordinates for decorative hexes
 */
const generateDecorativeHexes = (mapRadius, hexes, extraRings = 8) => {
  const decorativeHexes = [];
  const playableSet = new Set(hexes.map(h => `${h.q},${h.r}`));

  // Generate hexes in rings beyond the playable area
  for (let ring = mapRadius + 1; ring <= mapRadius + extraRings; ring++) {
    // Use cube coordinate ring algorithm - start at "east" position
    let q = ring;
    let r = 0;

    // Walk around the ring in 6 directions
    const directions = [
      { dq: -1, dr: 1 },  // SW
      { dq: -1, dr: 0 },  // W
      { dq: 0, dr: -1 },  // NW
      { dq: 1, dr: -1 },  // NE
      { dq: 1, dr: 0 },   // E
      { dq: 0, dr: 1 }    // SE
    ];

    for (const dir of directions) {
      for (let step = 0; step < ring; step++) {
        const key = `${q},${r}`;
        if (!playableSet.has(key)) {
          decorativeHexes.push({ q, r });
        }
        q += dir.dq;
        r += dir.dr;
      }
    }
  }
  return decorativeHexes;
};

/**
 * HexGridRenderer - Renders hex grid using SVG
 *
 * Features:
 * - Flat-top hex orientation
 * - Zone-based coloring (core, mid, perimeter)
 * - Dynamic hex sizing based on viewport
 * - Player position as concentric circles (radar ping style)
 * - Waypoint path highlighting with numbered waypoint markers
 * - Click handlers for navigation
 * - Visual differentiation between insertion and extraction gates
 *
 * @param {Object} mapData - Map data from map generation
 * @param {Object} playerPosition - Current player hex {q, r}
 * @param {Function} onHexClick - Callback for hex clicks
 * @param {Array<Object>} waypoints - Array of waypoint objects with hex and pathFromPrev
 * @param {number|null} currentWaypointIndex - Index of waypoint being traveled to (during movement)
 * @param {Object} insertionGate - Coordinates of insertion gate {q, r} (cannot extract from here)
 * @param {string} shipId - Ship ID for icon selection (default: 'SHIP_001')
 * @param {number} currentHexIndex - Current hex index within waypoint path (for heading calculation)
 */
function HexGridRenderer({ mapData, playerPosition, onHexClick, waypoints = [], currentWaypointIndex = null, previewPath = null, isScanning = false, insertionGate = null, lootedPOIs = [], shipId = 'SHIP_001', currentHexIndex = 0 }) {
  // Track viewport dimensions for dynamic sizing
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Pan/Zoom state
  // Default zoom higher to compensate for expanded viewBox with decorative hexes
  const [zoom, setZoom] = useState(2.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const transformRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 }); // Track pan during drag without re-renders
  const lastHeadingRef = useRef(0); // Track last heading for persistence when stationary

  // Random background selected on mount
  const [backgroundImage] = useState(() =>
    tacticalBackgrounds[Math.floor(Math.random() * tacticalBackgrounds.length)]
  );

  // Calculate ship heading based on waypoints and movement state
  const shipHeading = useMemo(() => {
    const heading = getShipHeadingForWaypoints(
      playerPosition,
      waypoints,
      currentWaypointIndex,
      currentHexIndex,
      lastHeadingRef.current  // Pass last heading for persistence when stationary
    );

    // Update ref when actively moving (to remember heading for when we stop)
    if (currentWaypointIndex !== null) {
      lastHeadingRef.current = heading;
    }

    return heading;
  }, [playerPosition, waypoints, currentWaypointIndex, currentHexIndex]);

  // Update viewport size on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pan/Zoom handlers - limit panning to hex grid bounds
  const clampPan = (panX, panY, zoomLevel) => {
    if (!containerRef.current || zoomLevel <= 1) return { x: 0, y: 0 };
    const { width, height } = containerRef.current.getBoundingClientRect();

    // Calculate the actual hex grid size in pixels
    const extraRings = 8;
    const totalRadius = mapData.radius + extraRings;
    const gridSize = totalRadius * hexSize * 3; // Same formula as viewBoxSize (without padding)

    // How much of the grid is visible at current zoom
    const visibleWidth = width / zoomLevel;
    const visibleHeight = height / zoomLevel;

    // Pan limit = half of (grid size - visible area) * zoom, with multiplier to keep edge hexes visible
    const panLimitMultiplier = 0.8; // Tweak: 1.0 = exact edge, lower = more restricted
    const maxPanX = Math.max(0, (gridSize - visibleWidth) / 2 * zoomLevel * panLimitMultiplier);
    const maxPanY = Math.max(0, (gridSize - visibleHeight) / 2 * zoomLevel * panLimitMultiplier);

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, panX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, panY))
    };
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
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

  const handleMouseUp = () => {
    if (isDragging) {
      setPan(panRef.current); // Sync final position to state
    }
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(2.8); // Reset to default zoom
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
  };

  // Keep panRef in sync when pan state changes from non-drag sources
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Calculate dynamic hex size based on viewport and map radius
  const hexSize = calculateHexSize(mapData.radius, viewportSize.width, viewportSize.height);

  // Attach wheel listener with { passive: false } to allow preventDefault
  // Must be after hexSize calculation since it depends on hexSize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prevZoom => {
        // Min zoom 2.8 to stay close to the map, max 4 for close inspection
        const newZoom = Math.min(4, Math.max(2.8, prevZoom + delta));
        setPan(p => {
          if (!containerRef.current || newZoom <= 1) return { x: 0, y: 0 };
          const { width, height } = containerRef.current.getBoundingClientRect();

          // Grid-based pan limits (same as clampPan)
          const extraRings = 8;
          const totalRadius = mapData.radius + extraRings;
          const gridSize = totalRadius * hexSize * 3;
          const visibleWidth = width / newZoom;
          const visibleHeight = height / newZoom;
          const panLimitMultiplier = 0.8;
          const maxPanX = Math.max(0, (gridSize - visibleWidth) / 2 * newZoom * panLimitMultiplier);
          const maxPanY = Math.max(0, (gridSize - visibleHeight) / 2 * newZoom * panLimitMultiplier);

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
  }, [mapData.radius, hexSize]);

  /**
   * Calculate hex polygon points for flat-top orientation
   * @param {number} x - Center x coordinate
   * @param {number} y - Center y coordinate
   * @param {number} size - Hex radius
   * @returns {string} SVG points string
   */
  const calculateHexPoints = (x, y, size) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      // Flat-top orientation: start at 0 degrees
      const angle = (Math.PI / 3) * i;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
    }
    return points.join(' ');
  };

  // Generate decorative hexes that extend beyond the playable map
  const decorativeHexes = useMemo(() => {
    return generateDecorativeHexes(mapData.radius, mapData.hexes, 8);
  }, [mapData.radius, mapData.hexes]);

  /**
   * Render a decorative (non-interactive) hex for the background
   * Same fill as playable hexes but with gradient fade based on distance
   */
  const renderDecorativeHex = (hex) => {
    const { x, y } = axialToPixel(hex.q, hex.r, hexSize);
    const points = calculateHexPoints(x, y, hexSize);

    // Calculate distance from center (axial coordinate distance formula)
    const distanceFromCenter = (Math.abs(hex.q) + Math.abs(hex.r) + Math.abs(hex.q + hex.r)) / 2;

    // Calculate how many rings beyond the playable area this hex is
    const ringsBeyondMap = distanceFromCenter - mapData.radius;

    // Gradient opacity: closer to map = same as playable (0.9), fading to ~0.1 at edge
    const maxRings = 8;
    const opacityMultiplier = Math.max(0.1, 1 - (ringsBeyondMap / maxRings) * 0.9);

    // Same fill color as playable hexes (rgba(31, 41, 55, 0.9)) but with fade
    const fillOpacity = 0.9 * opacityMultiplier;
    const strokeOpacity = 0.6 * opacityMultiplier;

    return (
      <g key={`dec-${hex.q}-${hex.r}`} style={{ pointerEvents: 'none' }}>
        <polygon
          points={points}
          fill={`rgba(31, 41, 55, ${fillOpacity.toFixed(2)})`}
          stroke={`rgba(6, 182, 212, ${strokeOpacity.toFixed(2)})`}
          strokeWidth={1.2}
        />
        <polygon
          points={points}
          fill="url(#hex-grid-pattern)"
          stroke="none"
          opacity={opacityMultiplier}
        />
      </g>
    );
  };

  /**
   * Check if a hex is the insertion gate (entry point, cannot extract)
   * @param {Object} hex - Hex to check
   * @returns {boolean} Is insertion gate
   */
  const isInsertionGate = (hex) => {
    if (!insertionGate || hex.type !== 'gate') return false;
    return hex.q === insertionGate.q && hex.r === insertionGate.r;
  };

  /**
   * Check if a hex is an extraction gate (exit point)
   * @param {Object} hex - Hex to check
   * @returns {boolean} Is extraction gate
   */
  const isExtractionGate = (hex) => {
    return hex.type === 'gate' && !isInsertionGate(hex);
  };

  /**
   * Check if a POI hex has been looted (rewards claimed)
   * @param {Object} hex - Hex to check
   * @returns {boolean} Is looted POI
   */
  const isLootedPOI = (hex) => {
    if (hex.type !== 'poi') return false;
    return lootedPOIs.some(p => p.q === hex.q && p.r === hex.r);
  };

  /**
   * Get fill color/pattern based on hex type and zone
   * @param {Object} hex - Hex object
   * @returns {string} CSS color or pattern URL
   */
  const getHexFill = (hex) => {
    // Player's hex - darker background for ship contrast
    if (playerPosition && hex.q === playerPosition.q && hex.r === playerPosition.r) {
      return 'rgba(8, 12, 24, 0.95)';  // Deep dark blue-black
    }

    // POIs use image pattern if available (greyscale applied via CSS for looted POIs)
    if (hex.type === 'poi' && hex.poiData?.image) {
      // Create unique pattern ID from hex coordinates
      const patternId = `poi-img-${hex.q}-${hex.r}`;
      return `url(#${patternId})`;
    }

    // Looted POIs without image get grey fill
    if (hex.type === 'poi' && isLootedPOI(hex)) {
      return 'rgba(75, 85, 99, 0.6)';  // Grey for looted POIs without image
    }

    // Gate types: Insertion (black) vs Extraction (blue) - solid colors
    if (hex.type === 'gate') {
      if (isInsertionGate(hex)) {
        return 'rgba(8, 12, 24, 0.95)'; // Dark black for insertion gate (matches player hex)
      }
      return 'rgb(40, 80, 160)'; // Solid dark blue for extraction gates
    }

    if (hex.type === 'poi') return 'rgba(245, 158, 11, 0.2)'; // Amber tint for PoIs (fallback)

    // Zone-based coloring for empty hexes
    switch (hex.zone) {
      case 'core': return 'rgba(31, 41, 55, 0.9)'; // Dark gray
      case 'mid': return 'rgba(17, 24, 39, 0.85)';  // Darker
      case 'perimeter': return 'rgba(10, 10, 10, 0.8)'; // Darkest
      default: return 'rgba(31, 41, 55, 0.9)';
    }
  };

  // Collect POI images for pattern definitions (use hex coords for unique IDs)
  const poiPatterns = mapData.hexes
    .filter(hex => hex.type === 'poi' && hex.poiData?.image)
    .map(hex => ({
      id: `poi-img-${hex.q}-${hex.r}`,
      image: hex.poiData.image,
      color: hex.poiData.color || '#f59e0b'
    }));

  /**
   * Check if hex is a waypoint destination
   * @param {Object} hex - Hex to check
   * @returns {boolean} Is a waypoint
   */
  const isWaypointHex = (hex) => {
    return waypoints.some(w => w.hex.q === hex.q && w.hex.r === hex.r);
  };

  /**
   * Get waypoint number (1-indexed) for a hex, or null if not a waypoint
   * @param {Object} hex - Hex to check
   * @returns {number|null} Waypoint number or null
   */
  const getWaypointNumber = (hex) => {
    const idx = waypoints.findIndex(w => w.hex.q === hex.q && w.hex.r === hex.r);
    return idx >= 0 ? idx + 1 : null;
  };

  /**
   * Check if hex is on any waypoint path (transit hex, not waypoint itself)
   * @param {Object} hex - Hex to check
   * @returns {boolean} Is on path
   */
  const isOnPath = (hex) => {
    // Check all waypoint paths
    for (const waypoint of waypoints) {
      if (!waypoint.pathFromPrev) continue;
      // Path includes start and end, so check intermediate hexes
      const pathHex = waypoint.pathFromPrev.find(p => p.q === hex.q && p.r === hex.r);
      if (pathHex) return true;
    }
    return false;
  };

  /**
   * Check if hex is on the preview path (potential path before adding waypoint)
   * @param {Object} hex - Hex to check
   * @returns {boolean} Is on preview path
   */
  const isOnPreviewPath = (hex) => {
    if (!previewPath) return false;
    return previewPath.some(p => p.q === hex.q && p.r === hex.r);
  };

  /**
   * Check if hex is highlighted (waypoint, confirmed path, or preview path)
   * @param {Object} hex - Hex to check
   * @returns {boolean} Is highlighted
   */
  const isHighlighted = (hex) => {
    return isWaypointHex(hex) || isOnPath(hex) || isOnPreviewPath(hex);
  };

  /**
   * Get stroke color for hex - unified cyan theme
   * @param {Object} hex - Hex object
   * @param {boolean} highlighted - Is hex in highlighted path
   * @returns {string} CSS color
   */
  const getStrokeColor = (hex, highlighted) => {
    // Player's hex - white border for visibility
    if (playerPosition && hex.q === playerPosition.q && hex.r === playerPosition.r) {
      return '#ffffff';  // White
    }

    // Waypoint hexes get bright cyan stroke
    if (isWaypointHex(hex)) {
      const waypointIdx = waypoints.findIndex(w => w.hex.q === hex.q && w.hex.r === hex.r);
      // Current target waypoint during movement gets yellow
      if (currentWaypointIndex !== null && waypointIdx === currentWaypointIndex) {
        return '#eab308'; // Yellow for current target
      }
      return '#06b6d4'; // Cyan for waypoints
    }
    // Preview path hexes get white
    if (isOnPreviewPath(hex)) return '#ffffff'; // White for preview path
    // Confirmed path hexes get green
    if (isOnPath(hex)) return '#10b981'; // Green for confirmed path

    // Looted POIs get grey stroke
    if (hex.type === 'poi' && isLootedPOI(hex)) {
      return 'rgba(107, 114, 128, 0.6)';  // Grey stroke for looted POIs
    }

    // All other hexes use unified cyan - more vibrant
    if (hex.type === 'gate') {
      if (isInsertionGate(hex)) {
        return '#ffffff'; // White for insertion gate
      }
      return 'rgba(59, 130, 246, 1.0)'; // Blue for extraction gates
    }
    if (hex.type === 'poi') return hex.poiData?.color || '#f59e0b'; // POI's color tag
    return 'rgba(6, 182, 212, 0.6)'; // Cyan for empty hexes
  };

  /**
   * Check if hex is player position
   * @param {Object} hex - Hex to check
   * @returns {boolean} Is player hex
   */
  const isPlayerHex = (hex) => {
    if (!playerPosition) return false;
    return hex.q === playerPosition.q && hex.r === playerPosition.r;
  };

  /**
   * Render single hex
   * @param {Object} hex - Hex object
   * @returns {JSX.Element} SVG group element
   */
  const renderHex = (hex) => {
    const { x, y } = axialToPixel(hex.q, hex.r, hexSize);
    const points = calculateHexPoints(x, y, hexSize);
    const highlighted = isHighlighted(hex);
    const isPlayer = isPlayerHex(hex);
    const isPOI = hex.type === 'poi';
    const isLooted = isPOI && isLootedPOI(hex);
    const isGate = hex.type === 'gate';
    const isInsertion = isInsertionGate(hex);
    const isExtraction = isExtractionGate(hex);

    // Build gate class name
    const gateClass = isInsertion ? 'hex-insertion-glow' : (isExtraction ? 'hex-extraction-glow' : '');
    // POI class: looted POIs get dimmed styling, active POIs get glow
    const poiClass = isPOI ? (isLooted ? 'hex-poi-looted' : 'hex-poi-glow') : '';
    // Player hex gets white glow
    const playerClass = isPlayer ? 'hex-player-glow' : '';
    // Important hexes get elevation shadow
    const isImportantHex = isPlayer || isGate || isPOI;

    return (
      <g
        key={`${hex.q},${hex.r}`}
        className={`hex-group ${poiClass} ${playerClass} ${isGate ? `hex-gate-glow ${gateClass}` : ''}`}
        filter={isImportantHex ? 'url(#hex-elevation-shadow)' : undefined}
        onClick={() => onHexClick && onHexClick(hex)}
      >
        {/* Hex background */}
        <polygon
          points={points}
          fill={getHexFill(hex)}
          stroke={getStrokeColor(hex, highlighted)}
          strokeWidth={highlighted ? 3 : (isPOI ? 2.5 : 1.5)}
          className="hex-cell"
        />

        {/* Grid pattern overlay */}
        <polygon
          points={points}
          fill="url(#hex-grid-pattern)"
          stroke="none"
          className="hex-grid-overlay"
        />

        {/* Path highlight glow - white for preview, green for confirmed, cyan for waypoints */}
        {highlighted && !isPlayer && (
          <polygon
            points={points}
            fill="none"
            stroke={isWaypointHex(hex) ? '#06b6d4' : (isOnPreviewPath(hex) ? '#ffffff' : '#10b981')}
            strokeWidth={2}
            className={`hex-path-glow ${isWaypointHex(hex) ? 'hex-waypoint-glow' : ''} ${isOnPreviewPath(hex) ? 'hex-preview-glow' : ''}`}
            opacity={0.5}
          />
        )}

        {/* Waypoint number badge - centered, squared, matching project aesthetic */}
        {isWaypointHex(hex) && !isPlayer && (
          <g className="waypoint-badge">
            <rect
              x={x - 14}
              y={y - 14}
              width={28}
              height={28}
              rx={3}
              ry={3}
              fill="rgba(17, 24, 39, 0.9)"
              stroke="#06b6d4"
              strokeWidth={2}
              filter="url(#waypoint-glow)"
            />
            <text
              x={x}
              y={y}
              fontSize="16"
              fontWeight="bold"
              fontFamily="'Exo', monospace"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#06b6d4"
            >
              {getWaypointNumber(hex)}
            </text>
          </g>
        )}

        {/* Gate symbols - simple white arrows with labels */}
        {isGate && !isPlayer && (
          <g style={{ pointerEvents: 'none' }}>
            {isInsertion ? (
              // Insertion gate: Arrow pointing DOWN (entering the map)
              <>
                <path
                  d={`M ${x} ${y - hexSize * 0.1} L ${x - hexSize * 0.2} ${y + hexSize * 0.2} L ${x - hexSize * 0.08} ${y + hexSize * 0.2} L ${x - hexSize * 0.08} ${y + hexSize * 0.45} L ${x + hexSize * 0.08} ${y + hexSize * 0.45} L ${x + hexSize * 0.08} ${y + hexSize * 0.2} L ${x + hexSize * 0.2} ${y + hexSize * 0.2} Z`}
                  fill="#ffffff"
                  opacity="0.9"
                />
                <text
                  x={x}
                  y={y - hexSize * 0.35}
                  fontSize={hexSize * 0.22}
                  fontWeight="bold"
                  textAnchor="middle"
                  fill="#ffffff"
                  opacity="0.9"
                >
                  ENTRY
                </text>
              </>
            ) : (
              // Extraction gate: Arrow pointing UP (exiting the map)
              <>
                <path
                  d={`M ${x} ${y + hexSize * 0.1} L ${x - hexSize * 0.2} ${y - hexSize * 0.2} L ${x - hexSize * 0.08} ${y - hexSize * 0.2} L ${x - hexSize * 0.08} ${y - hexSize * 0.45} L ${x + hexSize * 0.08} ${y - hexSize * 0.45} L ${x + hexSize * 0.08} ${y - hexSize * 0.2} L ${x + hexSize * 0.2} ${y - hexSize * 0.2} Z`}
                  fill="#ffffff"
                  opacity="0.9"
                />
                <text
                  x={x}
                  y={y + hexSize * 0.5}
                  fontSize={hexSize * 0.22}
                  fontWeight="bold"
                  textAnchor="middle"
                  fill="#ffffff"
                  opacity="0.9"
                >
                  EXIT
                </text>
              </>
            )}
          </g>
        )}

        {/* Player position - Sonar ping effect (rings that expand and fade) */}
        {isPlayer && (
          <g className="player-sonar-container">
            {/* Scanning animation ring - cyan expanding circle (when scanning POI) */}
            {isScanning && (
              <circle
                cx={x}
                cy={y}
                r={hexSize * 0.8}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                className="scan-ring-animation"
              />
            )}
            {/* Sonar ping rings - staggered animations for continuous effect */}
            <circle
              cx={x}
              cy={y}
              r={hexSize * 0.4}
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2"
              className="sonar-ping sonar-ping-1"
            />
            <circle
              cx={x}
              cy={y}
              r={hexSize * 0.4}
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2"
              className="sonar-ping sonar-ping-2"
            />
            <circle
              cx={x}
              cy={y}
              r={hexSize * 0.4}
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2"
              className="sonar-ping sonar-ping-3"
            />
          </g>
        )}

        {/* Debug coordinates (optional - comment out for production) */}
        {/* <text
          x={x}
          y={y + 15}
          fontSize="8"
          textAnchor="middle"
          fill="#666"
        >
          {hex.q},{hex.r}
        </text> */}
      </g>
    );
  };

  // Calculate viewBox based on map radius + decorative rings
  // Include extra rings so decorative hexes are visible when zoomed out
  const extraRings = 8;
  const totalRadius = mapData.radius + extraRings;
  const viewBoxPadding = 0.95;
  const viewBoxSize = totalRadius * hexSize * 3 * viewBoxPadding;
  const viewBox = `${-viewBoxSize} ${-viewBoxSize} ${viewBoxSize * 2} ${viewBoxSize * 2}`;

  return (
    <div
      ref={containerRef}
      className="hex-grid-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Transformable container for pan/zoom */}
      <div
        ref={transformRef}
        style={{
        width: '100%',
        height: '100%',
        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
        transformOrigin: 'center center',
        backgroundImage: `url('${backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
      }}>
        <svg
          viewBox={viewBox}
          className="hex-grid-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* SVG Definitions - patterns, gradients, etc. */}
          <defs>
            {/* Grid cross-hatching pattern for tactical data-screen aesthetic */}
            <pattern
              id="hex-grid-pattern"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 10 M 0 0 L 10 10"
                stroke="rgba(6, 182, 212, 0.08)"
                strokeWidth="0.5"
                fill="none"
              />
            </pattern>

            {/* POI image patterns */}
            {poiPatterns.map(poi => (
              <pattern
                key={poi.id}
                id={poi.id}
                patternUnits="objectBoundingBox"
                patternContentUnits="objectBoundingBox"
                width="1"
                height="1"
              >
                <image
                  href={poi.image}
                  x="0"
                  y="0"
                  width="1"
                  height="1"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            ))}

            {/* Waypoint badge glow effect */}
            <filter id="waypoint-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.5"/>
            </filter>

            {/* Elevation shadow for important hexes (POIs, gates, player) */}
            <filter id="hex-elevation-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.6"/>
            </filter>
          </defs>

          {/* Decorative background hexes - extend beyond visible area, non-clickable */}
          {decorativeHexes.map(renderDecorativeHex)}

          {/* Render all playable hexes - sorted so important hexes (POIs, gates, player) render on top */}
          {[...mapData.hexes]
            .sort((a, b) => {
              // Helper to get priority (higher = render later = on top)
              const getPriority = (hex) => {
                if (playerPosition && hex.q === playerPosition.q && hex.r === playerPosition.r) return 3;
                if (hex.type === 'gate') return 2;
                if (hex.type === 'poi') return 1;
                return 0; // Empty hexes render first (at bottom)
              };
              return getPriority(a) - getPriority(b);
            })
            .map(renderHex)}

          {/* Ship Icon Layer - renders player's ship at current position */}
          {playerPosition && (
            (() => {
              const { x, y } = axialToPixel(playerPosition.q, playerPosition.r, hexSize);
              return (
                <ShipIconRenderer
                  shipId={shipId}
                  x={x}
                  y={y}
                  heading={shipHeading}
                  faction="neutral"
                  size={hexSize * 2.5}
                />
              );
            })()
          )}
        </svg>
      </div>

      {/* Zoom Controls */}
      <div
        className="tactical-zoom-controls"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="dw-btn dw-btn-secondary"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setZoom(z => Math.min(4, z + 0.2));
          }}
        >
          <Plus size={18} />
        </button>
        <button
          className="dw-btn dw-btn-secondary"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setZoom(z => Math.max(2.8, z - 0.2));
          }}
        >
          <Minus size={18} />
        </button>
        <button
          className="dw-btn dw-btn-secondary"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleResetView();
          }}
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}

export default HexGridRenderer;
