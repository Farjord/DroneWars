# Lane Capacity Limit — Design Document

## Rule Definition

**Each player may have at most 5 drones per lane.** This includes all drones — combat drones and tokens (mines, beacons, jammers, inhibitors). The limit is per-player, per-lane: one player having 5 drones in lane1 does not restrict the opponent's lane1.

### Constants

| Name | Value | Scope |
|-|-|
| `MAX_DRONES_PER_LANE` | 5 | Per player, per lane |

### What Counts

All entries in `playerState.dronesOnBoard[laneId]` count toward the limit — there is no distinction between "real" drones and tokens (`isToken: true`). The `maxPerLane` restriction on individual drone types (e.g., Jammer max 1 per lane) remains as an additional, stricter check layered on top.

---

## Guiding Principle: "Resolve Up To What You Can"

When an action would place multiple drones and some (but not all) would exceed the limit:

- **Resolve as many as possible** in the order they are specified.
- **Skip** any that would exceed the limit — do not error the entire action.
- **Log** each skipped placement so the player understands what happened.

This means no action completely fizzles unless *every* placement it attempts is blocked. Partial success is always preferred over total failure.

---

## Affected Interactions

### 1. Drag-Drop Deploy (Hand → Lane)

**Current flow:** Player drags a drone card from hand onto a lane. `useDragMechanics.handleCardDragEnd()` calls `gameEngine.validateDeployment()` which checks CPU limit, deployment limit, maxPerLane, and cost.

**Change:** Add a lane capacity check in `DeploymentProcessor.validateDeployment()`. If `dronesOnBoard[targetLane].length >= MAX_DRONES_PER_LANE`, return `{ valid: false, message: 'This lane is full (5/5 drones).' }`.

**UX:** The lane shows a "full" visual indicator. Dropping onto a full lane shows the validation error in the existing modal. The drone card returns to hand.

**Files:**
- `src/logic/deployment/DeploymentProcessor.js` — add capacity check in `validateDeployment()`

### 2. Drag-Drop Move (Lane → Lane)

**Current flow:** Player drags a drone token from one lane to an adjacent lane. `useDragMechanics.handleDroneDragEnd()` validates adjacency and opens a confirmation modal.

**Change:** Before showing the confirmation modal, check destination lane capacity. If full, show a brief error message and cancel the drag. Since the drone was already on the board, the total drone count doesn't change — only the lane distribution matters.

**UX:** Attempting to drag into a full lane shows feedback like "Lane is full — cannot move here." The drone snaps back.

**Files:**
- `src/hooks/useDragMechanics.js` — add capacity check in `handleDroneDragEnd()` before `setMoveConfirmation()`

### 3. SINGLE_MOVE Cards (Maneuver, Tactical Repositioning, Swift Maneuver, Assault Reposition, Forced Repositioning effect 0)

**Current flow:** `MovementEffectProcessor` returns `needsCardSelection` for human players. The UI flow (via `useEffectChain`) lets the player pick a drone, then pick an adjacent destination lane. For AI, `executeAIMovement()` evaluates all from-lane/to-lane combinations.

**Change — Human:** When building the list of valid destination lanes, filter out lanes at capacity. If no valid destination remains for the selected drone, show "No valid destinations — all adjacent lanes are full" and fizzle the effect.

**Change — AI:** In `executeAIMovement()`, skip `toLane` options where the acting player already has `>= MAX_DRONES_PER_LANE` drones.

**Files:**
- `src/hooks/useEffectChain.js` — filter destination lane options
- `src/logic/effects/MovementEffectProcessor.js` — add capacity check in `executeAIMovement()` loop and in `executeSingleMove()` validation

### 4. MULTI_MOVE Cards (Reposition)

**Current flow:** Player selects a source lane, picks up to 3 drones, then picks a destination lane. All selected drones move together. `executeMultiMove()` in `MovementEffectProcessor` processes them.

**Change — Human:** When selecting a destination lane, filter out lanes where `currentCount + selectedDroneCount > MAX_DRONES_PER_LANE`. This is stricter than single-move: the entire batch must fit.

**Change — AI:** The AI evaluates multi-move in `executeAIMovement()`. Apply the same batch-fit check: skip destinations that can't absorb all selected drones.

**Partial resolution alternative:** If desired, the "resolve up to what you can" principle could apply here — move drones one-by-one in selection order until the lane is full, then stop. However, this adds complexity to the UI (showing partial results mid-selection). **Recommended approach:** require the full batch to fit at selection time; the player can select fewer drones to make it work.

**Files:**
- `src/hooks/useEffectChain.js` — filter destination lane options based on batch size
- `src/logic/effects/MovementEffectProcessor.js` — capacity check in `executeMultiMove()` and AI multi-move logic

### 5. Forced Repositioning (Effect 1 — Enemy Drone Move)

**Current flow:** After the player moves a friendly drone (effect 0), effect 1 auto-targets an enemy drone in the vacated lane and moves it to the lane the friendly drone moved to. The destination is fixed by `{ ref: 0, field: 'destinationLane' }`.

**Change:** Before executing effect 1, check whether the destination lane has capacity *for the enemy player*. If `enemyState.dronesOnBoard[destinationLane].length >= MAX_DRONES_PER_LANE`, the enemy move **fizzles** — the friendly move still succeeds. Log: "Forced Repositioning: enemy lane is full, enemy drone stays in place."

This follows the "resolve up to what you can" principle: the compound card partially succeeds.

**Files:**
- `src/logic/effects/MovementEffectProcessor.js` — add capacity check before enemy drone move in `executeSingleMove()`
- `src/hooks/useResolvers.js` — handle fizzle result from effect 1 gracefully

### 6. Token Creation (Deploy Mine / Jammer / Beacon / Inhibitor)

**Current flow:** `TokenCreationProcessor.process()` iterates over `effect.locations`, creates a drone token in each lane. Already checks `maxPerLane` per drone type and skips blocked lanes.

**Change:** Add a lane capacity check *before* the existing `maxPerLane` check. If `targetPlayerState.dronesOnBoard[laneId].length >= MAX_DRONES_PER_LANE`, skip this lane and log a TOKEN_BLOCKED message.

**Cards affected:**
| Card | Token | Lanes |
|-|-|-|
| Deploy Inhibitor Mine | Inhibitor Mine | 1 enemy lane (targeted) |
| Deploy Jitter Mine | Jitter Mine | 1 enemy lane (targeted) |
| Deploy Proximity Mine | Proximity Mine | 1 enemy lane (targeted) |
| Deploy Rally Beacon | Rally Beacon | 1 friendly lane (targeted) |
| Deploy Jammers | Jammer | All 3 enemy lanes |
| Deploy Thruster Inhibitor | Thruster Inhibitor | 1 enemy lane (targeted) |

For single-lane token cards (mines, beacon, inhibitor), the capacity check should happen **at targeting time** — full lanes should be filtered from valid targets so the player can't select them.

For Deploy Jammers (all 3 lanes), apply "resolve up to what you can" — create jammers in lanes that have room, skip full lanes.

**Files:**
- `src/logic/effects/TokenCreationProcessor.js` — add capacity check in the `locations.forEach` loop
- Effect chain / targeting UI — filter full lanes from valid lane targets for single-lane token cards

### 7. AI Decisions

**7a. AI Deployment**

**Current flow:** `deploymentDecision.js` iterates all drones × all lanes, scoring each option. Checks resource cost, availability, CPU limit, and `maxPerLane`.

**Change:** Add lane capacity check alongside the existing `maxPerLane` check. If `player2.dronesOnBoard[laneId].length >= MAX_DRONES_PER_LANE`, skip this lane for this drone.

**File:** `src/logic/ai/decisions/deploymentDecision.js`

**7b. AI Movement (drag-move equivalent)**

**Current flow:** `actionDecision.js` evaluates all drone × lane move options. Already checks `maxPerLane` for the moved drone type.

**Change:** Add general lane capacity check. Skip moves to lanes at capacity.

**File:** `src/logic/ai/decisions/actionDecision.js`

**7c. AI Card-Based Movement**

**Current flow:** `movementCards.js` evaluators score SINGLE_MOVE and MULTI_MOVE card plays. `MovementEffectProcessor.executeAIMovement()` handles actual AI execution.

**Change:** Filter out full-lane destinations in both the evaluators and the executor.

**Files:**
- `src/logic/ai/cardEvaluators/movementCards.js`
- `src/logic/effects/MovementEffectProcessor.js` (AI path)

**7d. AI Token Card Evaluation**

**Current flow:** `droneCards.js` evaluates token deployment cards, already checks `maxPerLane` for specific token types.

**Change:** Add general lane capacity check. Full lanes should score as invalid targets.

**File:** `src/logic/ai/cardEvaluators/droneCards.js`

### 8. Quick Deploy

**Current flow:** `QuickDeployValidator.js` validates auto-deployment assignments, already checks `maxPerLane`.

**Change:** Add lane capacity check. If any lane in the quick-deploy plan would exceed 5 drones, flag it as invalid.

**File:** `src/logic/quickDeploy/QuickDeployValidator.js`

---

## UI Feedback

### Lane Capacity Indicator

Show a small counter on each lane: e.g., `3/5` in the lane header area. When the lane reaches 5/5, the indicator turns a warning color (red/orange).

**Location:** `SingleLaneView.jsx` — add a capacity badge to each lane's rendered output.

### Full-Lane Visual State

When a lane is at capacity:
- The lane border or background gets a subtle "full" treatment (e.g., a dimmed overlay or colored border).
- During drag operations, full lanes do not show the drop-highlight glow — they appear visually inert.
- Tooltip on hover: "Lane full — 5/5 drones."

**Files:**
- `src/components/ui/SingleLaneView.jsx` — conditional styling per lane
- `src/hooks/useDragMechanics.js` — suppress drop-zone highlighting for full lanes during card drags and drone drags
- CSS adjustments in the relevant stylesheet

### Card Targeting Feedback

When playing a card that targets a lane (token deployment cards), full lanes should:
- Not highlight as valid targets
- Show a disabled/greyed state
- If *all* lanes are full, show "No valid targets" and allow the player to cancel the card

---

## Utility Function

Create a shared helper to avoid duplicating the capacity check:

```javascript
// src/logic/utils/gameEngineUtils.js
export function isLaneFull(playerState, laneId, maxDronesPerLane = 5) {
  return (playerState.dronesOnBoard[laneId]?.length || 0) >= maxDronesPerLane;
}
```

This keeps the magic number in one place and makes tests straightforward.

---

## Implementation Touchpoints Summary

| Area | File | Change Type |
|-|-|-|
| Constant | `src/logic/utils/gameEngineUtils.js` | Add `MAX_DRONES_PER_LANE`, `isLaneFull()` |
| Deploy validation | `src/logic/deployment/DeploymentProcessor.js` | Add capacity check in `validateDeployment()` |
| Drag-move | `src/hooks/useDragMechanics.js` | Block drag to full lane |
| Card movement (human) | `src/hooks/useEffectChain.js` | Filter destinations |
| Card movement (processor) | `src/logic/effects/MovementEffectProcessor.js` | Capacity checks in single/multi/AI paths |
| Card movement (resolver) | `src/hooks/useResolvers.js` | Handle fizzle for Forced Reposition |
| Token creation | `src/logic/effects/TokenCreationProcessor.js` | Capacity check before token spawn |
| AI deploy | `src/logic/ai/decisions/deploymentDecision.js` | Skip full lanes |
| AI move | `src/logic/ai/decisions/actionDecision.js` | Skip full lanes |
| AI card eval | `src/logic/ai/cardEvaluators/movementCards.js` | Skip full destinations |
| AI token eval | `src/logic/ai/cardEvaluators/droneCards.js` | Skip full lanes |
| Quick deploy | `src/logic/quickDeploy/QuickDeployValidator.js` | Capacity validation |
| UI indicator | `src/components/ui/SingleLaneView.jsx` | Capacity badge, full-lane styling |
| UI drag feedback | `src/hooks/useDragMechanics.js` | Suppress drop highlights on full lanes |

---

## Verification Scenarios

### Manual Test Checklist

- [ ] **Deploy to full lane:** Fill a lane to 5 drones, attempt to deploy a 6th → blocked with error message
- [ ] **Deploy to non-full lane:** With 4 drones in a lane, deploy a 5th → succeeds
- [ ] **Drag-move to full lane:** Fill lane2 to 5, drag a drone from lane1 to lane2 → blocked, drone snaps back
- [ ] **Drag-move from full lane:** Full lane can still have drones moved *out* of it
- [ ] **Maneuver to full adjacent lane:** Play Maneuver, select a drone, only non-full adjacent lanes appear as destinations
- [ ] **Maneuver with all adjacent lanes full:** All destinations filtered → card fizzles with message
- [ ] **Reposition (MULTI_MOVE) batch fit:** 3 drones selected, destination has 3/5 → allowed (3+2 open slots... blocked since 3+3>5). Destination has 2/5 → allowed (2+3=5)
- [ ] **Forced Repositioning — enemy lane full:** Play Forced Reposition, move friendly drone. Enemy destination lane already has 5 enemy drones → enemy move fizzles, friendly move still succeeds
- [ ] **Forced Repositioning — enemy lane has room:** Normal behavior, both moves succeed
- [ ] **Deploy Mine to full enemy lane:** Target selection filters out full lanes. If only 1 lane is full, the other 2 are selectable
- [ ] **Deploy Jammers with mixed capacity:** 1 lane full, 2 lanes open → jammers created in 2 lanes, skipped in full lane with log message
- [ ] **Deploy Jammers all lanes full:** All 3 enemy lanes at 5 → no jammers created, log messages for each
- [ ] **AI deployment skips full lanes:** Set up AI with a full lane, verify it deploys to other lanes
- [ ] **AI movement skips full lanes:** Verify AI does not attempt moves into full lanes
- [ ] **AI card-based movement:** AI plays Maneuver/Reposition, does not target full lanes
- [ ] **Lane capacity indicator:** Visual counter shows correct count (e.g., 3/5)
- [ ] **Full lane visual state:** At 5/5, lane shows visual "full" indicator, no drop highlight during drags
- [ ] **Quick Deploy respects limit:** Auto-deploy does not assign more than 5 drones to any lane
- [ ] **Tokens count toward limit:** Deploy 4 drones + 1 mine in a lane (5 total) → lane is full, cannot add more
- [ ] **Mixed tokens and drones:** 3 drones + 2 tokens = 5 → lane full
- [ ] **Capacity frees up on destruction:** Destroy a drone in a full lane → capacity drops to 4/5, lane becomes available again
