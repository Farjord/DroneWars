import React from 'react';
import { Plus, Minus, RotateCcw, ChevronRight } from 'lucide-react';
import { getOffScreenPOIs, getArrowEdgePosition } from '../../logic/singlePlayer/hexGrid.js';
import { FACTIONS, HANGAR_REGIONS } from '../../data/factionData.js';
import { getRegionFaction } from '../../logic/faction/factionHelpers.js';
import NewsTicker from './NewsTicker';

const HangarHexMap = ({
  mapContainerRef,
  transformRef,
  isDragging,
  zoom,
  setZoom,
  pan,
  handleMapMouseDown,
  handleMapMouseMove,
  handleMapMouseUp,
  handleResetView,
  hexGridData,
  generatedMaps,
  bossHexCell,
  mapsWithCoordinates,
  handleMapIconClick,
  handleBossHexClick,
  eremosBackground
}) => {
  return (
    <div
      ref={mapContainerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        border: '2px solid rgba(6, 182, 212, 0.6)',
        boxShadow: `
          inset 0 0 30px rgba(0, 0, 0, 0.8),
          0 0 20px rgba(6, 182, 212, 0.3),
          0 0 40px rgba(6, 182, 212, 0.1)
        `,
        borderRadius: '4px',
        margin: '16px'
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
        }}
      >
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
            zIndex: 0,
            filter: 'brightness(0.55) blur(0.8px)',
            opacity: 0.8
          }}
        />

        {/* SVG Hex Grid - integrated grid and map icons */}
        {hexGridData && (
          <svg
            width={hexGridData.width}
            height={hexGridData.height}
            style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}
          >
            <defs>
              <filter id="hexGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Layer 1: Inactive hex fills (bottom) */}
            {hexGridData.allCells.filter(c => !c.isActive).map((cell, i) => {
              const { hexWidth, hexHeight } = hexGridData;
              const hexPath = `M${hexWidth/2},0 L${hexWidth},${hexHeight*0.25} L${hexWidth},${hexHeight*0.75} L${hexWidth/2},${hexHeight} L0,${hexHeight*0.75} L0,${hexHeight*0.25} Z`;
              const factionDef = FACTIONS[cell.regionFaction];
              const factionColor = factionDef?.color || '#808080';
              const isFactionZone = factionDef?.type === 'faction';
              const strokeColor = isFactionZone
                ? `${factionColor}55`
                : 'rgba(6,182,212,0.3)';

              return (
                <path
                  key={`fill-${i}`}
                  transform={`translate(${cell.x}, ${cell.y})`}
                  d={hexPath}
                  fill={isFactionZone ? `${factionColor}18` : 'rgba(128, 128, 128, 0.08)'}
                  stroke={strokeColor}
                  strokeWidth="1"
                />
              );
            })}

            {/* Layer 2: Boundary edges (on top of all fills) — only faction cells draw borders to avoid double-rendering */}
            {hexGridData.allCells.filter(c => !c.isActive).map((cell, i) => {
              if (cell.regionFaction === 'NEUTRAL_1') return null;
              const { hexWidth, hexHeight } = hexGridData;
              const vertices = [
                [hexWidth / 2, 0],
                [hexWidth, hexHeight * 0.25],
                [hexWidth, hexHeight * 0.75],
                [hexWidth / 2, hexHeight],
                [0, hexHeight * 0.75],
                [0, hexHeight * 0.25],
              ];

              const isOddRow = cell.row % 2 === 1;
              const neighborOffsets = isOddRow
                ? [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 0], [0, -1]]
                : [[0, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

              const boundaryEdges = [];
              for (let e = 0; e < 6; e++) {
                const [dc, dr] = neighborOffsets[e];
                const nc = cell.col + dc;
                const nr = cell.row + dr;
                const neighborFaction = getRegionFaction(nc, nr);
                if (neighborFaction !== cell.regionFaction) {
                  const v1 = vertices[e];
                  const v2 = vertices[(e + 1) % 6];
                  // Use the faction color (not neutral grey) for border visibility
                  const factionSide = cell.regionFaction !== 'NEUTRAL_1' ? cell.regionFaction : neighborFaction;
                  const borderColor = FACTIONS[factionSide]?.color || '#808080';
                  boundaryEdges.push({ v1, v2, color: borderColor });
                }
              }

              if (boundaryEdges.length === 0) return null;

              return (
                <g key={`border-${i}`} transform={`translate(${cell.x}, ${cell.y})`}>
                  {boundaryEdges.map((edge, ei) => (
                    <line
                      key={ei}
                      x1={edge.v1[0]} y1={edge.v1[1]}
                      x2={edge.v2[0]} y2={edge.v2[1]}
                      stroke={`${edge.color}dd`}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  ))}
                </g>
              );
            })}

            {/* Layer 2.5: Faction territory labels — faint star-chart text */}
            {HANGAR_REGIONS.map((region) => {
              const cell = hexGridData.allCells.find(c => c.col === region.center[0] && c.row === region.center[1]);
              if (!cell) return null;
              const { hexWidth, hexHeight } = hexGridData;
              const cx = cell.x + hexWidth / 2;
              const cy = cell.y + hexHeight / 2;
              const factionName = FACTIONS[region.faction]?.name?.toUpperCase() || region.faction;
              const labelAngle = region.faction === 'MARK' ? -30 : 30;
              return (
                <text
                  key={`label-${region.faction}`}
                  x={cx}
                  y={cy}
                  fill="#ffffff"
                  opacity={0.18}
                  fontSize={hexWidth * 0.65}
                  fontWeight="bold"
                  letterSpacing="6"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelAngle}, ${cx}, ${cy})`}
                  pointerEvents="none"
                >
                  {factionName}
                </text>
              );
            })}

            {/* Layer 3: Active map hexes (top) */}
            {hexGridData.allCells.filter(c => c.isActive).map((cell, i) => {
              const { hexWidth, hexHeight } = hexGridData;
              const hexPath = `M${hexWidth/2},0 L${hexWidth},${hexHeight*0.25} L${hexWidth},${hexHeight*0.75} L${hexWidth/2},${hexHeight} L0,${hexHeight*0.75} L0,${hexHeight*0.25} Z`;
              const map = generatedMaps[cell.mapIndex];
              const isGenerated = !!map;
              const centerX = hexWidth / 2;
              const centerY = hexHeight / 2;

              const requiresToken = map?.requiresToken;
              const factionDef = FACTIONS[cell.regionFaction];
              const isFactionZone = factionDef?.type === 'faction';
              const sectorColor = isFactionZone ? factionDef.color : '#06b6d4';
              const sectorColorRgba = isFactionZone
                ? `${factionDef.color}26`
                : 'rgba(6,182,212,0.15)';
              const sectorColorFaint = isFactionZone
                ? `${factionDef.color}80`
                : 'rgba(6,182,212,0.5)';
              const pulseAnimation = requiresToken
                ? 'hexRestrictedPulse 1.5s ease-in-out infinite'
                : 'hexPulse 2s ease-in-out infinite';

              return (
                <g
                  key={`active-${i}`}
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

                  {/* Radar ping circle */}
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
                    y={requiresToken ? centerY - 6 : centerY}
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

                  {/* Lock indicator for token-restricted sectors */}
                  {requiresToken && (
                    <text
                      x={centerX}
                      y={centerY + 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize={Math.max(8, hexWidth * 0.1)}
                      fontWeight="bold"
                      letterSpacing="2"
                      style={{
                        pointerEvents: 'none',
                        textShadow: '0 0 4px rgba(0,0,0,0.8)'
                      }}
                    >
                      LOCKED
                    </text>
                  )}
                </g>
              );
            })}

            {/* Boss Hex - rendered separately for distinct styling */}
            {bossHexCell && (() => {
              const { hexWidth, hexHeight } = hexGridData;
              const hexPath = `M${hexWidth/2},0 L${hexWidth},${hexHeight*0.25} L${hexWidth},${hexHeight*0.75} L${hexWidth/2},${hexHeight} L0,${hexHeight*0.75} L0,${hexHeight*0.25} Z`;
              const centerX = hexWidth / 2;
              const centerY = hexHeight / 2;

              return (
                <g
                  transform={`translate(${bossHexCell.x}, ${bossHexCell.y})`}
                  onClick={() => handleBossHexClick(bossHexCell.bossId)}
                  style={{ cursor: 'pointer' }}
                  data-boss-hex="true"
                  data-coordinate={bossHexCell.coordinate}
                >
                  {/* Pulsing glow layer - red for boss */}
                  <path
                    d={hexPath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="12"
                    style={{
                      filter: 'blur(8px)',
                      animation: 'hexDangerPulse 1.5s ease-in-out infinite'
                    }}
                  />

                  <circle
                    cx={centerX}
                    cy={centerY}
                    r="25"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    style={{
                      animation: 'hexRadarPing 3s ease-out infinite'
                    }}
                  />

                  <path
                    d={hexPath}
                    fill="rgba(239,68,68,0.2)"
                    stroke="#ef4444"
                    strokeWidth="4"
                    filter="url(#hexGlow)"
                  />

                  <path
                    d={`M${hexWidth/2},4 L${hexWidth-4},${hexHeight*0.25+2} L${hexWidth-4},${hexHeight*0.75-2} L${hexWidth/2},${hexHeight-4} L4,${hexHeight*0.75-2} L4,${hexHeight*0.25+2} Z`}
                    fill="rgba(17,24,39,0.95)"
                    stroke="rgba(239,68,68,0.6)"
                    strokeWidth="1"
                  />

                  <text
                    x={centerX}
                    y={centerY - 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={Math.max(16, hexWidth * 0.25)}
                    style={{ pointerEvents: 'none' }}
                  >
                    ☠
                  </text>

                  <text
                    x={centerX}
                    y={centerY + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={Math.max(10, hexWidth * 0.14)}
                    fontWeight="bold"
                    style={{
                      pointerEvents: 'none',
                      textShadow: '0 0 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    BOSS
                  </text>
                </g>
              );
            })()}
          </svg>
        )}
      </div>

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

      {/* Zoom Controls */}
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
          className="dw-btn-hud dw-btn-hud-ghost"
          onClick={() => setZoom(z => Math.min(3, z + 0.2))}
          style={{ padding: '8px 12px' }}
        >
          <Plus size={18} />
        </button>
        <button
          className="dw-btn-hud dw-btn-hud-ghost"
          onClick={() => setZoom(z => Math.max(1, z - 0.2))}
          style={{ padding: '8px 12px' }}
        >
          <Minus size={18} />
        </button>
        <button
          className="dw-btn-hud dw-btn-hud-ghost"
          onClick={handleResetView}
          style={{ padding: '8px 12px' }}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* POI Direction Arrows */}
      {hexGridData && mapContainerRef.current && zoom > 1 && (() => {
        const container = mapContainerRef.current.getBoundingClientRect();
        const offScreenPOIs = getOffScreenPOIs(hexGridData, zoom, pan, container.width, container.height);
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
  );
};

export default HangarHexMap;
