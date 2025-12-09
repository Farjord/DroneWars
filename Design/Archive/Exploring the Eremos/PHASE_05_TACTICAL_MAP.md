# Phase 5: Tactical Map Screen

## Overview

Implements the in-run hex map interface with movement, HUD, and multi-waypoint journey planning system.

**Duration:** 2 days | **Dependencies:** Phase 4 | **Status:** 🔄 In Progress

---

## Files Created

1. `src/components/screens/TacticalMapScreen.jsx` ✅
2. `src/components/screens/TacticalMapScreen.css` ✅
3. `src/components/ui/HexGridRenderer.jsx` ✅
4. `src/components/ui/HexGridRenderer.css` ✅ (NEW - not in original plan)
5. `src/components/ui/InstabilityMeter.jsx` ✅
6. `src/components/ui/InstabilityMeter.css` ✅ (NEW - not in original plan)
7. `src/components/ui/TacticalMapHUD.jsx` ✅
8. `src/components/ui/TacticalMapHUD.css` ✅ (NEW - not in original plan)
9. `src/components/ui/HexInfoPanel.jsx` ✅ (REPLACES WaypointConfirmationModal - redesigned)
10. `src/components/ui/HexInfoPanel.css` ✅ (NEW - not in original plan)
11. `src/logic/map/MovementController.js` ✅
12. `src/logic/map/PathValidator.js` ✅

### Design Change: WaypointConfirmationModal → HexInfoPanel

The original plan called for a simple `WaypointConfirmationModal` to confirm movement. This was redesigned as a **fixed right-side panel with two views**:

- **Waypoint List View** (default): Shows full journey plan with cumulative instability
- **Hex Info View**: Shows details for inspected hex with add/remove waypoint actions

This provides a better UX for multi-waypoint journey planning.

---

## Key Implementations

### HexGridRenderer.jsx - SVG Hex Rendering

```jsx
function HexGridRenderer({ map, playerPosition, onHexClick }) {
  const hexSize = 30;

  const renderHex = (hex) => {
    const { x, y } = axialToPixel(hex.q, hex.r, hexSize);
    const points = calculateHexPoints(x, y, hexSize);

    return (
      <g key={`${hex.q},${hex.r}`} onClick={() => onHexClick(hex)}>
        <polygon
          points={points}
          fill={getHexColor(hex)}
          stroke="#16213e"
          strokeWidth="2"
          className="hex-cell"
        />
        {hex.type === 'poi' && <PoIIcon x={x} y={y} poi={hex.poiData} />}
        {hex.type === 'gate' && <GateIcon x={x} y={y} />}
        {hex.q === playerPosition.q && hex.r === playerPosition.r && (
          <PlayerIcon x={x} y={y} />
        )}
      </g>
    );
  };

  return (
    <svg viewBox="-200 -200 400 400">
      {map.hexes.map(renderHex)}
    </svg>
  );
}
```

### MovementController.js

```javascript
class MovementController {
  calculatePath(current, target, hexes) {
    // Reuse A* from PathValidator
    return pathValidator.findPath(current, target, hexes);
  }

  calculateInstabilityCost(path, tierConfig) {
    return path.length * tierConfig.instabilityTriggers.movementPerHex;
  }

  async movePlayer(path, gameState, tierConfig) {
    // Animate movement (optional)
    for (const hex of path) {
      gameState.currentRunState.playerPosition = hex;
      gameStateManager.setState({ currentRunState: gameState.currentRunState });
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Add instability
    const cost = this.calculateInstabilityCost(path, tierConfig);
    instabilityManager.addInstability(cost, 'Movement');

    // Check hex type
    if (hex.type === 'poi') {
      // Trigger encounter (Phase 6)
    }
  }
}
```

### InstabilityMeter.jsx

```jsx
function InstabilityMeter({ instability }) {
  const getColor = () => {
    if (instability < 50) return 'bg-green-500';
    if (instability < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="instability-meter">
      <label>Instability</label>
      <div className="meter-bar">
        <div
          className={`meter-fill ${getColor()}`}
          style={{ width: `${instability}%` }}
        />
      </div>
      <span>{instability.toFixed(1)}%</span>
      {instability >= 80 && <span className="warning">⚠ Critical</span>}
    </div>
  );
}
```

---

## Multi-Waypoint Journey System (NEW)

### Overview
Players can plan multi-step journeys before commencing movement.

### Features
- Add any number of waypoints to journey
- Show predicted instability at each waypoint (cumulative)
- Click waypoint in list to view/remove
- Click hex on map to inspect and add to journey
- Recalculate paths when waypoints removed
- "Commence Journey" starts hex-by-hex movement
- Pause/Resume controls during movement

### Path Visualization
- **Orange**: Preview path (potential route before adding waypoint)
- **Green**: Confirmed path (waypoints already in journey)
- **Cyan**: Waypoint hex markers with numbered badges
- **Yellow**: Current target waypoint (during movement)

### Waypoint Data Structure
```javascript
{
  hex: { q, r, type, poiData?, ... },  // Target hex
  pathFromPrev: [{q, r}, ...],          // Path from previous waypoint
  cumulativeInstability: number,        // Threat level at this point
  segmentCost: number,                  // Threat cost of this segment alone
  segmentEncounterRisk: number,         // Encounter % for this segment (NEW)
  cumulativeEncounterRisk: number       // P(at least one encounter) for full journey (NEW)
}
```

### Encounter Risk Calculation (NEW)
Uses probability formula: `P(at least one) = 1 - ∏(1-pᵢ)`
- Each hex has a fixed encounter chance (5% empty, 0% gate, 5-20% POI)
- Segment risk = cumulative probability across path hexes
- Journey risk = cumulative probability across all segments

### Panel Views

**VIEW 1: Waypoint List (default)**
```
┌─────────────────────────────────┐
│ Journey Plan                    │
├─────────────────────────────────┤
│ [Threat Level Meter]            │
├─────────────────────────────────┤
│ Start: 0.0%                     │
│ 1. PoI Name      +5.0%   ⚔ 8.2% │
│    → 5.0%                       │
│ 2. Empty Hex     +3.0%  ⚔ 12.5% │
│    → 8.0%                       │
├─────────────────────────────────┤
│ [Commence Journey]              │
│ [Clear All Waypoints]           │
└─────────────────────────────────┘
```
*⚔ shows cumulative encounter risk at each waypoint*

**VIEW 2: Hex Info (when hex clicked)**
```
┌─────────────────────────────────┐
│ ← Back to Journey               │
├─────────────────────────────────┤
│ [Threat Level Meter]            │
├─────────────────────────────────┤
│ [POI Image Thumbnail]           │
│ 📦 Point of Interest            │
│ Distance: 3 hexes               │
│ Threat Cost: +4.5%              │
│ Move Encounter Risk: 8.2%       │
│ Journey Encounter Risk: 15.3%   │
├─────────────────────────────────┤
│ [Add to Journey]                │
└─────────────────────────────────┘
```

**VIEW 3: Movement Panel (during movement)**
```
┌─────────────────────────────────┐
│ Moving...  [Pause]              │
├─────────────────────────────────┤
│ Progress: 3/7 hexes             │
├─────────────────────────────────┤
│ NEXT HEX INFO                   │
│ Encounter Risk: 5.0%            │
│ Threat Increase: +1.5%          │
├─────────────────────────────────┤
│ [Current Target: PoI Name]      │
└─────────────────────────────────┘
```

---

## Validation Checklist

### Core Map Features
- [x] Hex grid renders correctly
- [x] Click hex shows hex info panel
- [x] Path calculated with A*
- [x] Threat cost displayed (zone-based)
- [x] Preview path shown (orange) before adding waypoint
- [x] Confirmed path shown (green) for journey
- [x] Waypoint markers with numbered badges
- [x] Add/Remove waypoint functionality
- [x] Multi-waypoint journey planning
- [x] Player moves along path (hex-by-hex animation)
- [x] Threat increases after movement (zone-based)
- [x] Pause/Resume during movement
- [ ] HUD shows hull, energy, credits
- [ ] Extract button visible at gates

### POI Visual Features (NEW)
- [x] POI hex borders match tag colors (from `poiData.color`)
- [x] POI hex fills use background images (from `poiData.image`)
- [x] POI borders thicker (2.5px vs 1.5px for empty)
- [x] Hex Info Panel shows POI image thumbnail (25% width)

### Encounter Risk Display (NEW)
- [x] Segment encounter risk calculated per waypoint
- [x] Cumulative encounter risk shown in waypoint list (⚔ XX.X%)
- [x] Hex inspection shows Move Encounter Risk
- [x] Hex inspection shows Journey Encounter Risk
- [x] Movement panel shows next hex encounter risk
- [x] Movement panel shows next hex threat increase

---

**Phase Status:** 🔄 In Progress
**Last Updated:** 2025-11-26
