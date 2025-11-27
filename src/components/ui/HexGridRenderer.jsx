// ========================================
// HEX GRID RENDERER
// ========================================
// SVG-based hex grid renderer for Exploring the Eremos tactical map
// Renders hexes, PoIs, gates, player position, and highlighted paths

import React, { useState, useEffect } from 'react';
import { axialToPixel } from '../../utils/hexGrid.js';
import './HexGridRenderer.css';

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
 */
function HexGridRenderer({ mapData, playerPosition, onHexClick, waypoints = [], currentWaypointIndex = null, previewPath = null, isScanning = false, insertionGate = null }) {
  // Track viewport dimensions for dynamic sizing
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

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

  // Calculate dynamic hex size based on viewport and map radius
  const hexSize = calculateHexSize(mapData.radius, viewportSize.width, viewportSize.height);

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
   * Get fill color/pattern based on hex type and zone
   * @param {Object} hex - Hex object
   * @returns {string} CSS color or pattern URL
   */
  const getHexFill = (hex) => {
    // POIs use image pattern if available
    if (hex.type === 'poi' && hex.poiData?.image) {
      // Create unique pattern ID from hex coordinates
      const patternId = `poi-img-${hex.q}-${hex.r}`;
      return `url(#${patternId})`;
    }

    // Gate types: Insertion (orange/yellow) vs Extraction (blue/cyan)
    if (hex.type === 'gate') {
      if (isInsertionGate(hex)) {
        return 'rgba(245, 158, 11, 0.25)'; // Orange/amber tint for insertion gate
      }
      return 'rgba(59, 130, 246, 0.25)'; // Blue tint for extraction gates
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
    // Waypoint hexes get bright cyan stroke
    if (isWaypointHex(hex)) {
      const waypointIdx = waypoints.findIndex(w => w.hex.q === hex.q && w.hex.r === hex.r);
      // Current target waypoint during movement gets yellow
      if (currentWaypointIndex !== null && waypointIdx === currentWaypointIndex) {
        return '#eab308'; // Yellow for current target
      }
      return '#06b6d4'; // Cyan for waypoints
    }
    // Preview path hexes get orange/amber
    if (isOnPreviewPath(hex)) return '#f59e0b'; // Orange for preview path
    // Confirmed path hexes get green
    if (isOnPath(hex)) return '#10b981'; // Green for confirmed path

    // All other hexes use unified cyan - more vibrant
    if (hex.type === 'gate') {
      if (isInsertionGate(hex)) {
        return 'rgba(245, 158, 11, 1.0)'; // Orange for insertion gate
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
    const isGate = hex.type === 'gate';
    const isInsertion = isInsertionGate(hex);
    const isExtraction = isExtractionGate(hex);

    // Build gate class name
    const gateClass = isInsertion ? 'hex-insertion-glow' : (isExtraction ? 'hex-extraction-glow' : '');

    return (
      <g
        key={`${hex.q},${hex.r}`}
        className={`hex-group ${isPOI ? 'hex-poi-glow' : ''} ${isGate ? `hex-gate-glow ${gateClass}` : ''}`}
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

        {/* Path highlight glow - orange for preview, green for confirmed, cyan for waypoints */}
        {highlighted && !isPlayer && (
          <polygon
            points={points}
            fill="none"
            stroke={isWaypointHex(hex) ? '#06b6d4' : (isOnPreviewPath(hex) ? '#f59e0b' : '#10b981')}
            strokeWidth={2}
            className={`hex-path-glow ${isWaypointHex(hex) ? 'hex-waypoint-glow' : ''} ${isOnPreviewPath(hex) ? 'hex-preview-glow' : ''}`}
            opacity={0.5}
          />
        )}

        {/* Waypoint number badge */}
        {isWaypointHex(hex) && !isPlayer && (
          <g className="waypoint-badge">
            <circle
              cx={x + hexSize * 0.5}
              cy={y - hexSize * 0.5}
              r={10}
              fill="#06b6d4"
              stroke="#fff"
              strokeWidth={1.5}
            />
            <text
              x={x + hexSize * 0.5}
              y={y - hexSize * 0.5}
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
            >
              {getWaypointNumber(hex)}
            </text>
          </g>
        )}

        {/* Player position - White concentric circles with ping effect */}
        {isPlayer && (
          <g className="player-radar-ping">
            {/* Scanning animation ring - cyan expanding circle */}
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
            {/* Outer ring */}
            <circle
              cx={x}
              cy={y}
              r={hexSize * 0.5}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1"
              opacity="0.4"
            />
            {/* Middle ring */}
            <circle
              cx={x}
              cy={y}
              r={hexSize * 0.35}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              opacity="0.7"
            />
            {/* Inner core */}
            <circle
              cx={x}
              cy={y}
              r={hexSize * 0.15}
              fill="#ffffff"
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

  // Calculate viewBox based on map radius
  // Tighter viewBox = larger hexes (1.0 instead of 1.2)
  const viewBoxPadding = 0.95;
  const viewBoxSize = mapData.radius * hexSize * 3 * viewBoxPadding;
  const viewBox = `${-viewBoxSize} ${-viewBoxSize} ${viewBoxSize * 2} ${viewBoxSize * 2}`;

  return (
    <div className="hex-grid-container">
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
        </defs>

        {/* Render all hexes */}
        {mapData.hexes.map(renderHex)}
      </svg>
    </div>
  );
}

export default HexGridRenderer;
