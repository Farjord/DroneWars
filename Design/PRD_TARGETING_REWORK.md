# Targeting & Effect System

The card play system uses a **sequential effect chain** model. Every card declares an ordered `effects[]` array. Each effect is self-contained with its own targeting. Later effects can reference results from earlier ones via back-references. Card designers only need to edit `cardData.js` to create new targeting patterns — no engine or UI changes required.

---

## 1. The Four Target Types

Every effect has exactly one targeting type:

| Type | Player Action | When to Use |
|-|-|-|
| `DRONE` | Drag card/drone onto a specific drone token | Most offensive/support cards |
| `LANE` | Drag card onto a lane area | AoE damage, lane-scoped effects |
| `SHIP_SECTION` | Drag card onto a ship section | Doctrine cards, direct ship damage |
| `NONE` | Drop card anywhere on board | Upgrades, global effects, self-buffs, draw cards |

Additional non-board targeting (used in effect chains only):

| Type | Interaction | When to Use |
|-|-|-|
| `CARD_IN_HAND` | Click/prompt in hand | Cost effects (discard a card) |

---

## 2. Card Data Schema

Every card defines an `effects` array. One line per effect keeps cards scannable.

```js
{
  id: 'CARD_ID',
  name: 'Card Name',
  cost: 2,
  type: 'Tactic',
  // ... other metadata (image, description, rarity, etc.)
  effects: [
    { type: 'EFFECT_TYPE', targeting: { ... }, /* effect-specific fields */ },
    { type: 'ANOTHER_EFFECT', targeting: { ... } },
  ]
}
```

### Targeting Object

```js
targeting: {
  type: 'DRONE' | 'LANE' | 'SHIP_SECTION' | 'NONE' | 'CARD_IN_HAND',
  affinity: 'FRIENDLY' | 'ENEMY' | 'ANY',     // omit for NONE
  location: 'ANY_LANE' | 'SAME_LANE' | { ref, field },  // DRONE only
  restrictions: [],         // optional declarative filters
  affectedFilter: [],       // optional, LANE only — filters which drones are hit
  maxTargets: number,       // optional — enables multi-select (MULTI_MOVE)
}
```

### Effect-Specific Fields

| Field | Used By | Purpose |
|-|-|-|
| `value` | DAMAGE, DRAW, HEAL, etc. | Numeric magnitude |
| `damageType` | DAMAGE | 'ION', 'KINETIC', etc. |
| `mod` | MODIFY_STAT | `{ stat, value, type }` — stat modification |
| `destination` | SINGLE_MOVE, MULTI_MOVE | `{ type: 'LANE', location: 'ADJACENT_TO_PRIMARY' }` |
| `properties` | Any | Array of flags, e.g. `['DO_NOT_EXHAUST']` |
| `prompt` | Any (chain effects) | Header bar text during selection |
| `conditionals` | Any | Pre/post conditional effects (see Section 6) |

---

## 3. Card Examples

### Simple — single effect

```js
// Ion Pulse — damage one enemy drone
effects: [
  { type: 'DAMAGE', value: 3, damageType: 'ION',
    targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' } }
]

// System Reboot — draw cards, no targeting
effects: [
  { type: 'DRAW', value: 2, goAgain: true, targeting: { type: 'NONE' } }
]

// Sidewinder Missiles — lane AoE with filter
effects: [
  { type: 'DAMAGE', value: 2,
    targeting: { type: 'LANE', affinity: 'ENEMY',
      affectedFilter: [{ stat: 'speed', comparison: 'LTE', value: 3 }] } }
]
```

### Movement — compound single effect

```js
// Maneuver — move friendly drone to adjacent lane
effects: [
  { type: 'SINGLE_MOVE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
    properties: ['DO_NOT_EXHAUST'] }
]

// Reposition — multi-select up to 3 drones
effects: [
  { type: 'MULTI_MOVE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'SAME_LANE', maxTargets: 3 },
    destination: { type: 'LANE' },
    properties: ['DO_NOT_EXHAUST'] }
]
```

### Multi-effect chains with back-references

```js
// Feint — exhaust friendly, then exhaust slower enemy in same lane
effects: [
  { type: 'EXHAUST_DRONE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' } },
  { type: 'EXHAUST_DRONE',
    targeting: { type: 'DRONE', affinity: 'ENEMY',
      location: { ref: 0, field: 'sourceLane' },
      restrictions: [{ type: 'STAT_COMPARISON', stat: 'speed', comparison: 'LT',
        reference: { ref: 0, field: 'target' }, referenceStat: 'speed' }] } }
]

// Forced Repositioning — move friendly drone, then move weaker enemy from same lane
effects: [
  { type: 'SINGLE_MOVE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
    properties: ['DO_NOT_EXHAUST'] },
  { type: 'SINGLE_MOVE',
    targeting: { type: 'DRONE', affinity: 'ENEMY',
      location: { ref: 0, field: 'sourceLane' },
      restrictions: [{ type: 'STAT_COMPARISON', stat: 'attack', comparison: 'GT',
        reference: { ref: 0, field: 'target' }, referenceStat: 'attack' }] },
    destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
    properties: ['DO_NOT_EXHAUST'] }
]

// Sacrifice for Power — discard a card, buff a drone by its cost
effects: [
  { type: 'DISCARD_CARD',
    targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' },
    prompt: 'Discard a card from your hand' },
  { type: 'MODIFY_STAT',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    mod: { stat: 'attack', value: { ref: 0, field: 'cardCost' }, type: 'temporary' },
    prompt: 'Select a drone to receive the power boost' }
]
```

---

## 4. Back-Reference System

Later effects reference earlier results using structured refs (backward only — `ref` must be less than current effect index):

```js
{ ref: 0, field: 'target' }           // The target entity of effects[0]
{ ref: 0, field: 'sourceLane' }       // Lane the effects[0] target was in before execution
{ ref: 0, field: 'destinationLane' }  // Where effects[0] moved the target (SINGLE_MOVE only)
{ ref: 0, field: 'cardCost' }         // Energy cost of card discarded in effects[0] (DISCARD_CARD only)
```

### Rules

- **Backward only**: `ref` must be less than the current effect index. Validated structurally.
- **Selection-time resolution**: Refs resolve from accumulated `selections[]` and the `PositionTracker`. No triggers have fired, so referenced targets are always alive during selection.
- **Commit-time invalidation**: If a trigger during commit destroys a referenced target (e.g., mine kills drone from effect 0), later effects referencing it are skipped gracefully.
- **Skipped effect propagation**: If an earlier effect was skipped (zero valid targets), any effect referencing it via back-ref is also skipped.

---

## 5. Restriction System

Restrictions are declarative filters attached to targeting objects.

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
// Static comparison
{ type: 'STAT_COMPARISON', stat: 'hull', comparison: 'LTE', value: 1 }

// Comparison against another target (back-reference)
{ type: 'STAT_COMPARISON', stat: 'speed', comparison: 'LT',
  reference: { ref: 0, field: 'target' }, referenceStat: 'speed' }

// Lane control
{ type: 'IN_LANE_CONTROLLED_BY', controller: 'ACTING_PLAYER' }
```

---

## 6. Conditional Effects

Conditionals attach to individual effects within the chain (not to the card):

```js
effects: [
  { type: 'SINGLE_MOVE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY' },
    destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
    conditionals: [{
      timing: 'POST',
      condition: { type: 'STAT_GTE', stat: 'speed', value: 5 },
      grantedEffect: { type: 'GO_AGAIN' }
    }]
  }
]
```

- **PRE** conditionals modify their parent effect before execution (e.g., BONUS_DAMAGE)
- **POST** conditionals evaluate after their parent effect resolves

---

## 7. Execution Model: Select All, Commit All

During selection, **no triggers fire and no game state changes**. The real engine only processes effects on commit.

### Selection Phase (no state changes)

1. **Position tracker** (`PositionTracker`): Records selections and positional changes (drone moves, card discards). Lightweight — not a deep clone, just enough to compute valid targets for later effects.
2. **Target resolution** (`computeChainTargets`): Later effects compute valid targets using the position tracker's view. Back-references resolve from `selections[]`.
3. **Cancel**: Discard the tracker. Nothing happened. Always safe.

### Commit Phase (full execution)

4. **Execute effects in order** through `EffectChainProcessor.processEffectChain`. Each effect processes with full trigger resolution — mine detonation, ON_MOVE abilities, conditional effects.
5. **Trigger invalidation**: If a trigger during commit invalidates a later effect's target, that effect is skipped.
6. **Animations** play in sequence — all accumulated during commit, none during selection.
7. **Sync** to opponent — multiplayer sees the final committed state only.

---

## 8. UI Interaction Model

### Drag vs Click

**Rule: Drag when there's a physical entity to drag AND a spatial destination. Click/prompt otherwise.**

| Scenario | Interaction | Why |
|-|-|-|
| Effect 0 targeting board entity (DRONE, LANE, SHIP_SECTION) | **Drag** card from hand to board target | Card is drag source, target is on board |
| Effect 0 targeting non-board entity (CARD_IN_HAND, NONE) | Card drag **initiates chain**, effect 0 uses **click/prompt** | No board target |
| Effect 1+ movement (SINGLE_MOVE) | **Drag** drone to destination lane | Drone is on board, lane is spatial |
| Effect 1+ non-movement (EXHAUST, DAMAGE, etc.) | **Click** highlighted target | No drag source |

### Header Bar Prompts

During effect 1+ selection, the header bar displays:
- **Prompt text** from the effect's `prompt` field
- **Cancel button** — safe because no state has changed
- **Effect progress** indicator for multi-step chains

### Valid Target Highlighting

During selection, the board highlights valid targets via `validCardTargets`. Invalid targets are dimmed.

---

## 9. UI State Model

A single `effectChainState` object replaces all legacy multi-step state:

```js
effectChainState = {
  card,                    // The card being played
  effects,                 // card.effects[] reference
  currentIndex,            // Which effect we're selecting for
  subPhase,                // 'target' | 'destination' | 'multi-target'
  selections: [],          // Accumulated: [{ target, lane, destination?, skipped? }, ...]
  positionTracker,         // Tracks drone positions, discarded cards
  validTargets: [],        // Computed for current effect
  prompt: '',              // Current header bar text
  complete: false,         // true when all effects have selections
}
```

**Flow:**
1. `startEffectChain(card, initialTarget?, initialLane?)` — initializes state
2. For each effect: user selects target via `selectChainTarget(target, lane)`
3. If compound (SINGLE_MOVE): `selectChainDestination(lane)` for destination
4. If multi-select: `selectChainMultiTarget` + `confirmChainMultiSelect`
5. After all effects: `complete = true` triggers auto-commit via `useEffect`
6. `cancelEffectChain()` — discard everything, return to hand

---

## 10. Engine Processing

### Selection-time helpers (no state changes)

```
computeChainTargets(effect, effectIndex, selections, positionTracker, context)
  → Resolves back-references, uses positionTracker, returns valid targets

computeDestinationTargets(destination, selection, actingPlayerId)
  → Returns valid destination lanes for compound effects

resolveTargetingRefs(targeting, selections)
  → Resolves { ref, field } objects in targeting to concrete values
```

### Commit-time processing (full engine)

```
processEffectChain(card, selections, playerId, ctx)
  1. Pay card costs (energy, momentum)
  2. For each (effect, selection):
     a. Resolve PRE conditionals
     b. Route through EffectRouter
     c. Process triggers (mines, ON_MOVE, etc.)
     d. Collect animation events
     e. Resolve POST conditionals
     f. If trigger invalidated a later target, mark for skip
  3. Finalize: discard card, check go-again, commit state
  → Returns { newPlayerStates, shouldEndTurn, animationEvents }
```

---

## 11. Backward Compatibility

`effectsAdapter.js` derives legacy fields from `effects[0]` for consumers that still read `card.effect`, `card.targeting`, and `card.conditionalEffects`. This is a read-only derivation — the source of truth is always `effects[]`.

The backward-compat layer exists for ~200 AI evaluator references that read `card.effect.type` directly. These should be migrated to read from `card.effects[0]` directly, at which point the compat layer can be removed.

---

## 12. Key Files

| File | Role |
|-|-|
| `src/data/cardData.js` | Card definitions with `effects[]` |
| `src/hooks/useEffectChain.js` | Chain UI state machine (`effectChainState`) |
| `src/hooks/useCardSelection.js` | Owns effect chain hook + card selection state |
| `src/hooks/useDragMechanics.js` | DnD logic — routes to `startEffectChain` |
| `src/hooks/useClickHandlers.js` | Click logic — routes chain target/destination selection |
| `src/logic/cards/EffectChainProcessor.js` | Commit-time chain execution |
| `src/logic/cards/chainTargetResolver.js` | Selection-time target computation |
| `src/logic/cards/effectsAdapter.js` | Card enrichment pass-through (compat layer removed) |
| `src/logic/actions/CardActionStrategy.js` | Action dispatch (routes to chain processor) |
| `src/logic/TargetingRouter.js` | Targeting type → processor router |
| `src/logic/targeting/uiTargetingHelpers.js` | UI target calculation bridge |

---

## 13. Adding a New Card

To add a card with novel targeting:

1. **Define `effects[]` in `cardData.js`** — choose targeting types, add restrictions, use back-references for multi-step
2. **That's it.** The chain engine handles selection, validation, and execution automatically.

If the card introduces a new **effect type** (not just new targeting), add a handler in `EffectRouter.js`.

---

## 14. Orthogonal Systems

These systems are independent of the targeting/effect chain:

- `playCondition` — evaluated before card play is allowed
- `aiOnly` — card restricted to AI players
- `momentumCost` — additional momentum cost
- Drone abilities — same 4 targeting types, evaluated through `TargetingRouter`
- Ship abilities — section-based, separate activation flow
