# PRD: Targeting System Rework

## Context

The targeting system has grown organically across 7 different targeting types, 3 distinct UI interaction patterns (DnD, click+modal, multi-step state machine), and scattered visual feedback logic. This creates:

- **Inconsistent player UX**: Some cards drag, some click, some go through multi-step flows
- **Fragile UI code**: `useDragMechanics.js` (1653 lines), `useClickHandlers.js` (956 lines), and `DroneLanesDisplay.jsx` all contain targeting workarounds
- **Hard to extend**: Adding a new card with novel targeting requires touching UI hooks, not just card data
- **Visual feedback spaghetti**: 4+ separate boolean props (`isActionTarget`, `isInvalidTarget`, `isTargetable`, `isHoveredTarget`) computed independently

**Goal**: Streamline to 4 target types with a restriction system, unify all interactions to DnD, and create a single visual feedback model. Card designers should only need to edit `cardData.js` to create new targeting patterns.

---

## 1. The Four Target Types

Every card and ability has exactly ONE primary target type:

| Type | Player Action | When to Use |
|-|-|-|
| `DRONE` | Drag card/drone onto a specific drone token | Most offensive/support cards, drone attacks |
| `LANE` | Drag card onto a lane area | AoE damage, lane-scoped effects |
| `SHIP_SECTION` | Drag card onto a ship section | Doctrine cards, direct ship damage |
| `NONE` | Drop card anywhere on the board | Upgrades, global effects (Purge Protocol), self-buffs |

### Reclassification of Current Types

| Current Type | Card(s) | New Type | Rationale |
|-|-|-|-|
| `DRONE_CARD` | All 10 Upgrade cards | `NONE` | Drop to play, modal opens for pool drone selection |
| `ALL_MARKED` | Purge Protocol | `NONE` | No user selection; affected drones highlighted as preview during drag |
| `APPLIED_UPGRADE` | System Sabotage | `NONE` | Drop to play, modal opens for enemy drone + upgrade selection |
| `CARD_IN_HAND` | Sacrifice for Power (cost only) | Stays in `additionalCost` | This is a cost, not a targeting type |
| `MULTI_DRONE` | (router alias) | Remove | Was alias for DRONE processor |

---

## 2. Card Data Schema

### Primary Targeting Field

```js
targeting: {
  type: 'DRONE' | 'LANE' | 'SHIP_SECTION' | 'NONE',
  affinity: 'FRIENDLY' | 'ENEMY' | 'ANY',  // omit for NONE
  location: 'ANY_LANE',                      // DRONE only; omit for LANE/SHIP_SECTION/NONE
  restrictions: [],                           // optional, replaces `custom`
  affectedFilter: [],                         // optional, LANE only
  maxTargets: null                            // optional, LANE only
}
```

`restrictions` replaces the current `custom` field. Same semantics, clearer name.

`affectedFilter` is for LANE-targeting cards that only affect a subset of drones in the lane. If present, the targeting system uses it to determine which drones are affected (for both UI hover preview AND effect resolution). If absent, all drones matching affinity in the lane are affected. This replaces the current `effect.scope: 'FILTERED'` + `effect.filter` pattern.

### Secondary Targeting Field (new)

For cards requiring a second player DnD choice after the primary target.

```js
secondaryTargeting: {
  type: 'DRONE' | 'LANE' | 'SHIP_SECTION',
  affinity: 'FRIENDLY' | 'ENEMY' | 'ANY',
  location: 'ADJACENT_TO_PRIMARY' | 'PRIMARY_SOURCE_LANE',
  restrictions: []
}
```

Optional companion field:
```js
secondaryEffect: { ... }  // same schema as `effect`
```

New `location` values:
- `ADJACENT_TO_PRIMARY` — lanes adjacent to the primary target's lane (movement destination)
- `PRIMARY_SOURCE_LANE` — entities in the lane where the primary target was before the primary effect

### Effect Dispatch Rules for Secondary Targeting

- **`effect` only** (no `secondaryEffect`): Secondary target is a PARAMETER to the primary effect (e.g., movement destination).
- **`effect` + `secondaryEffect`**: Two distinct operations. `effect` runs on primary target, `secondaryEffect` on secondary target.

### Examples

**Simple DRONE target**:
```js
// Ion Pulse
targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' }
```

**DRONE with restrictions**:
```js
// Target Lock - must be marked
targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE', restrictions: ['MARKED'] }
```

**LANE target with affectedFilter**:
```js
// Sidewinder Missiles — only drones with speed <= 4
targeting: {
  type: 'LANE', affinity: 'ENEMY',
  affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 4 }]
},
effect: { type: 'DAMAGE', value: 2 }
```

**NONE — Upgrade card** (was DRONE_CARD):
```js
targeting: { type: 'NONE' }
// After drop: upgrade modal opens with pool-based slot validation
```

**NONE — Purge Protocol** (was ALL_MARKED):
```js
targeting: {
  type: 'NONE',
  affinity: 'ENEMY',
  affectedFilter: ['MARKED']
},
effect: { type: 'DESTROY' }
```

**DRONE + secondaryTargeting — Movement card**:
```js
targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
secondaryTargeting: {
  type: 'LANE',
  location: 'ADJACENT_TO_PRIMARY'
},
effect: { type: 'SINGLE_MOVE', properties: ['DO_NOT_EXHAUST'] }
```

**DRONE + secondaryTargeting + secondaryEffect — Feint**:
```js
targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
secondaryTargeting: {
  type: 'DRONE', affinity: 'ENEMY', location: 'PRIMARY_SOURCE_LANE',
  restrictions: [{ type: 'STAT_COMPARISON', stat: 'speed', comparison: 'LT',
                   reference: 'PRIMARY_TARGET', referenceStat: 'speed' }]
},
effect: { type: 'EXHAUST_DRONE' },
secondaryEffect: { type: 'EXHAUST_DRONE' }
```

---

## 3. Restriction System

Restrictions are declarative filters on the base target type.

### String Restrictions

| Restriction | Applies To | Meaning |
|-|-|-|
| `MARKED` | DRONE | `drone.isMarked === true` |
| `NOT_MARKED` | DRONE | `!drone.isMarked` |
| `EXHAUSTED` | DRONE | `drone.isExhausted === true` |
| `DAMAGED_HULL` | DRONE | `drone.hull < baseDrone.hull` |
| `HAS_UPGRADES` | DRONE | drone has applied upgrades |
| `HAS_DRONES` | LANE | lane contains at least one drone |
| `REQUIRES_LANE_CONTROL` | SHIP_SECTION | player controls required lanes |

### Object Restrictions

```js
{ type: 'STAT_COMPARISON', stat: 'hull', comparison: 'LTE', value: 1 }
{ type: 'STAT_COMPARISON', stat: 'attack', comparison: 'GT', reference: 'PRIMARY_TARGET' }
{ type: 'IN_LANE_CONTROLLED_BY', controller: 'ACTING_PLAYER' }
```

---

## 4. Multi-Step Targeting Model

### Pattern A: Primary + Secondary (NEW)

For cards with exactly 2 sequential DnD choices.

1. Player drags card -> valid PRIMARY targets highlight
2. Player drops on primary target -> primary effect resolves
3. Valid SECONDARY targets highlight
4. Player drags to secondary target
5. Secondary effect resolves

### Pattern B: Multi-Select State Machine (EXISTING)

For Reposition (MULTI_MOVE) only. 3+ steps. Existing `multiSelectState` stays.

### Pattern C: Additional Cost (EXISTING)

For Sacrifice for Power. The `additionalCost` field stays as-is.

---

## 5. Unified DnD Interaction Model

ALL card plays and drone actions are initiated via Drag-and-Drop.

| Target Type | Drag From | Drop On | Then |
|-|-|-|-|
| DRONE | Hand card | Valid drone token | Resolve (or enter secondary step) |
| LANE | Hand card | Valid lane area | Resolve |
| SHIP_SECTION | Hand card | Valid ship section | Resolve |
| NONE | Hand card | Anywhere on board | Resolve, or open modal |

---

## 6. Visual Feedback Model

### Proposed: Single `targetState` Enum

```js
targetState: 'VALID' | 'INVALID' | 'AFFECTED' | 'HOVERED' | 'NONE'
laneTargetState: 'VALID' | 'HOVERED' | 'NONE'
sectionTargetState: 'VALID' | 'HOVERED' | 'NONE'
```

Helper functions:
```js
export function computeDroneTargetState(drone, droneOwner, lane, targetingContext) { ... }
export function computeLaneTargetState(lane, owner, targetingContext) { ... }
export function computeSectionTargetState(section, owner, targetingContext) { ... }
```

---

## 7. Drone Abilities

Same targeting model as cards. Rename `custom` -> `restrictions` in all drone ability definitions.

---

## 8. NONE Drop Zone

`GameBattlefield` registers as a drop zone for NONE-type cards. More specific drop zones have higher priority. DRONE/LANE/SHIP_SECTION cards only accepted by their specific drop zones.

---

## 9. Migration Strategy

### Phase 1: Card Data Schema (safe, backward-compatible)

1. Rename `custom` to `restrictions` in cardData.js and droneData.js
2. Reclassify: DRONE_CARD -> NONE, ALL_MARKED -> NONE, APPLIED_UPGRADE -> NONE
3. Move `effect.filter` -> `targeting.affectedFilter` for LANE cards
4. Add `secondaryTargeting` to movement cards and Feint/Forced Repositioning
5. Add NONE handler to TargetingRouter
6. Keep ALL old processors and code paths alive

### Phase 2: Secondary Targeting Engine + useDragMechanics Decomposition

1. Extract `useSecondaryTargeting` hook
2. Build `resolveSecondaryTargets()` in logic/targeting/
3. Add `secondaryTargetingState` to useCardSelection.js
4. Add `processSecondaryTargetingCardPlay()` to CardActionStrategy.js
5. Wire secondary DnD step in useDragMechanics.js
6. Migrate all SINGLE_MOVE cards, Feint, Forced Repositioning

### Phase 3: NONE Type Implementation

1. Implement NONE drop handling
2. Wire upgrade modal, System Sabotage modal
3. Add drag-preview highlighting for Purge Protocol
4. Remove click-based paths

### Phase 4: Visual Feedback Unification

1. Build computeTargetState helpers
2. Replace boolean props with targetState enum
3. Update CSS classes

### Phase 5: AI Updates

1. Rename custom -> restrictions in actionDecision.js
2. Update SINGLE_MOVE AI path for secondaryTargeting
3. Add NONE type filter for AI

### Phase 6: Cleanup

1. Remove old processors
2. Remove old targeting types from router
3. Remove singleMoveMode, old scope/filter support
4. Update all tests

---

## 10. Key Files

| File | Role |
|-|-|
| `src/data/cardData.js` | Card definitions |
| `src/logic/TargetingRouter.js` | Router |
| `src/logic/targeting/BaseTargetingProcessor.js` | Base class |
| `src/logic/targeting/uiTargetingHelpers.js` | UI bridge |
| `src/data/droneData.js` | Drone definitions |
| `src/hooks/useDragMechanics.js` | DnD logic |
| `src/hooks/useClickHandlers.js` | Click logic |
| `src/hooks/useCardSelection.js` | Card state |
| `src/App.jsx` | State orchestration |
| `src/components/ui/DroneLanesDisplay.jsx` | Lane/drone rendering |
| `src/components/ui/DroneToken.jsx` | Drone rendering |
| `src/components/ui/ShipSectionCompact.jsx` | Ship section rendering |
| `src/components/ui/GameBattlefield.jsx` | Board rendering |

---

## 11. Verification

### Automated (every phase)
1. `npx vitest run` — 0 failures
2. `npx vite build` — clean

### Orthogonal Systems (unchanged)
- `playCondition`, `aiOnly`, `momentumCost` — all orthogonal to targeting
