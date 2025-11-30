// ========================================
// MAP PREVIEW RENDERER
// ========================================
// Simplified hex grid preview for MapOverviewModal
// Shows map layout, POIs (without type), and selectable gates

import React from 'react';
import { axialToPixel } from '../../utils/hexGrid.js';

/**
 * MapPreviewRenderer - Compact hex grid preview for sector selection
 *
 * Features:
 * - Fixed size SVG (~400px)
 * - Zone-based coloring
 * - POIs shown as generic amber markers (type hidden)
 * - Gates clickable to select entry point
 * - Selected gate highlighted in orange
 *
 * @param {Array} hexes - Array of hex objects from map data
 * @param {Array} gates - Array of gate objects
 * @param {Array} pois - Array of POI hex references
 * @param {number} radius - Map radius
 * @param {number} selectedGateId - Currently selected gate ID
 * @param {Function} onGateSelect - Callback when gate is clicked
 */
function MapPreviewRenderer({ hexes, gates, pois, radius, selectedGateId, onGateSelect }) {
  // Fixed hex size for preview - calculate based on radius to fit in ~400px
  const containerSize = 400;
  const hexSize = containerSize / (radius * 3.5);

  /**
   * Calculate hex polygon points for flat-top orientation
   */
  const calculateHexPoints = (x, y, size) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
    }
    return points.join(' ');
  };

  /**
   * Check if hex is a drone blueprint PoI
   */
  const isDroneBlueprintPoi = (hex) => {
    return hex.type === 'poi' && hex.poiData?.rewardType?.startsWith('DRONE_BLUEPRINT_');
  };

  /**
   * Get fill color based on hex type and zone
   */
  const getHexFill = (hex) => {
    // Gates - different fill based on selection
    if (hex.type === 'gate') {
      const isSelected = gates.find(g => g.q === hex.q && g.r === hex.r)?.gateId === selectedGateId;
      if (isSelected) {
        return 'rgba(16, 185, 129, 0.3)'; // Green for selected entry gate
      }
      return 'rgba(59, 130, 246, 0.25)'; // Blue for unselected gates
    }

    // POIs - red for drone blueprints, amber for others
    if (hex.type === 'poi') {
      if (isDroneBlueprintPoi(hex)) {
        return 'rgba(239, 68, 68, 0.35)'; // Red for drone blueprint PoIs
      }
      return 'rgba(245, 158, 11, 0.25)'; // Amber for regular PoIs
    }

    // Zone-based coloring for empty hexes
    switch (hex.zone) {
      case 'core': return 'rgba(31, 41, 55, 0.9)';
      case 'mid': return 'rgba(17, 24, 39, 0.85)';
      case 'perimeter': return 'rgba(10, 10, 10, 0.8)';
      default: return 'rgba(31, 41, 55, 0.9)';
    }
  };

  /**
   * Get stroke color based on hex type
   */
  const getStrokeColor = (hex) => {
    if (hex.type === 'gate') {
      const isSelected = gates.find(g => g.q === hex.q && g.r === hex.r)?.gateId === selectedGateId;
      if (isSelected) {
        return '#f59e0b'; // Orange for selected
      }
      return '#3b82f6'; // Blue for unselected
    }
    if (hex.type === 'poi') {
      if (isDroneBlueprintPoi(hex)) {
        return '#ef4444'; // Red for drone blueprint PoIs
      }
      return '#f59e0b'; // Amber for regular POIs
    }
    return 'rgba(6, 182, 212, 0.4)'; // Dim cyan for empty
  };

  /**
   * Handle hex click - only gates are clickable
   */
  const handleHexClick = (hex) => {
    if (hex.type === 'gate' && onGateSelect) {
      const gate = gates.find(g => g.q === hex.q && g.r === hex.r);
      if (gate) {
        onGateSelect(gate.gateId);
      }
    }
  };

  /**
   * Render single hex
   */
  const renderHex = (hex) => {
    const { x, y } = axialToPixel(hex.q, hex.r, hexSize);
    const points = calculateHexPoints(x, y, hexSize);
    const isGate = hex.type === 'gate';
    const isPOI = hex.type === 'poi';
    const isSelected = isGate && gates.find(g => g.q === hex.q && g.r === hex.r)?.gateId === selectedGateId;

    return (
      <g
        key={`${hex.q},${hex.r}`}
        onClick={() => handleHexClick(hex)}
        style={{ cursor: isGate ? 'pointer' : 'default' }}
      >
        {/* Hex background */}
        <polygon
          points={points}
          fill={getHexFill(hex)}
          stroke={getStrokeColor(hex)}
          strokeWidth={isGate || isPOI ? 2 : 1}
        />

        {/* Gate indicator - diamond shape */}
        {isGate && (
          <g>
            {/* White ping effect - expanding circle */}
            <circle
              cx={x}
              cy={y}
              r={hexSize * 0.35}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              className="gate-ping"
            />

            {/* Selected gate: glow layers + scaled up */}
            {isSelected && (
              <>
                {/* Outer glow */}
                <circle
                  cx={x}
                  cy={y}
                  r={hexSize * 0.6}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="6"
                  opacity="0.2"
                />
                {/* Middle glow */}
                <circle
                  cx={x}
                  cy={y}
                  r={hexSize * 0.5}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  opacity="0.4"
                />
              </>
            )}

            {/* Gate symbol - scaled up if selected */}
            {(() => {
              const scale = isSelected ? 1.4 : 1.0;
              const size = hexSize * 0.3 * scale;
              return (
                <polygon
                  points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`}
                  fill={isSelected ? '#10b981' : '#3b82f6'}
                  stroke="#fff"
                  strokeWidth={isSelected ? 2 : 1}
                />
              );
            })()}

            {/* Gate number */}
            <text
              x={x}
              y={y + 1}
              fontSize={hexSize * (isSelected ? 0.35 : 0.3)}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
            >
              {(gates.find(g => g.q === hex.q && g.r === hex.r)?.gateId ?? 0) + 1}
            </text>
          </g>
        )}

        {/* POI indicator - red for drone blueprints, amber for others */}
        {isPOI && (() => {
          const isDroneBlueprint = isDroneBlueprintPoi(hex);
          const poiColor = isDroneBlueprint ? '#ef4444' : '#f59e0b';
          const poiSymbol = isDroneBlueprint ? '!' : '?';  // Warning for drone blueprints

          return (
            <g>
              {/* Outer glow ring */}
              <circle
                cx={x}
                cy={y}
                r={hexSize * 0.35}
                fill="none"
                stroke={poiColor}
                strokeWidth="1.5"
                opacity="0.5"
              />
              {/* Inner marker */}
              <circle
                cx={x}
                cy={y}
                r={hexSize * 0.2}
                fill={poiColor}
                opacity="0.8"
              />
              {/* Symbol - ! for drone blueprints, ? for others */}
              <text
                x={x}
                y={y + 1}
                fontSize={hexSize * 0.25}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#1f2937"
              >
                {poiSymbol}
              </text>
            </g>
          );
        })()}
      </g>
    );
  };

  // Calculate viewBox to center the grid
  const viewBoxSize = radius * hexSize * 3.2;
  const viewBox = `${-viewBoxSize} ${-viewBoxSize} ${viewBoxSize * 2} ${viewBoxSize * 2}`;

  return (
    <div style={{
      width: `${containerSize}px`,
      height: `${containerSize}px`,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '8px',
      border: '1px solid rgba(6, 182, 212, 0.3)',
      overflow: 'hidden'
    }}>
      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background pattern */}
        <defs>
          <pattern
            id="preview-grid-pattern"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 20 M 0 0 L 20 20"
              stroke="rgba(6, 182, 212, 0.05)"
              strokeWidth="0.5"
              fill="none"
            />
          </pattern>

          {/* Ping animation for gates - white expanding circle */}
          <style>
            {`
              @keyframes gatePing {
                0% { r: ${hexSize * 0.25}; opacity: 0.8; stroke-width: 2; }
                100% { r: ${hexSize * 0.6}; opacity: 0; stroke-width: 1; }
              }
              .gate-ping {
                animation: gatePing 2s ease-out infinite;
              }
            `}
          </style>
        </defs>

        {/* Grid background */}
        <rect
          x={-viewBoxSize}
          y={-viewBoxSize}
          width={viewBoxSize * 2}
          height={viewBoxSize * 2}
          fill="url(#preview-grid-pattern)"
        />

        {/* Render all hexes */}
        {hexes && hexes.map(renderHex)}
      </svg>
    </div>
  );
}

export default MapPreviewRenderer;
