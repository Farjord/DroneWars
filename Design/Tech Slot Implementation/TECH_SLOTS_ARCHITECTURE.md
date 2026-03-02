# Tech Slots — Architecture

## Data Model

### State Structure
```js
playerState.techSlots = {
  lane1: [],  // Array of Tech drone instances
  lane2: [],
  lane3: []
}
```

### Tech Drone Instance Shape
```js
{
  id: 'player1_Proximity Mine_0001',  // Deterministic ID
  name: 'Proximity Mine',
  attack: 0,
  hull: 1,
  shields: 0,
  speed: 0,
  currentShields: 0,
  currentMaxShields: 0,
  isExhausted: false,
  isToken: true,
  isTech: true,
  deployedBy: 'player1',  // Visual ownership
  abilities: [...]
}
```

## Trigger Priority (updated)
| Tier | Scope | Description |
|-|-|-|
| 0 | Self | Self-triggers on the acting drone |
| 0.5 | Tech | Tech triggers in `techSlots[eventLane]` |
| 1 | Actor's drones | Actor's non-Tech drones in lane |
| 2 | Opponent's drones | Opponent's non-Tech drones in lane |

## Effect Immunity Rules
Tech drones are **immune to ALL indirect effects**:
- `statsCalculator.js` — never recalculated
- `auraManager.js` — never receives auras
- `RoundManager.js` — does not exhaust/ready
- `LaneControlCalculator.js` — does not count toward lane control
- All healing/buff/debuff card effect processors
- AoE damage processors

**Must include Tech:**
- `getLaneOfDrone` — find Tech for destruction/targeting
- `_isDroneAlive` / `_destroyDrone` — liveness checks
- Jammer helpers — card targeting blocks
- Attack target resolution
- State serialization (GameStateManager, csvExport)

## System Boundaries
- `CREATE_TECH` effect type → `TechCreationProcessor`
- Tech lives in `techSlots`, never in `dronesOnBoard`
- `MAX_TECH_PER_LANE = 5` (separate from `MAX_DRONES_PER_LANE`)
- Tech drones should NOT participate in availability/rebuild tracking
