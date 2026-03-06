# Trigger System Implementation Plan

## Code Review Findings

Identified during pre-implementation code review. Addressed in the phases listed.

| Finding | Severity | Phase |
|-|-|-|
| CombatActionStrategy.js: untracked call site for ON_MOVE, mines, Rally Beacon | Critical | 3, 4, 7 |
| abilityHelpers.js: 70% duplication across 3 functions, inconsistent returns, unused params | High | 3, 5 |
| MovementEffectProcessor: duplicated trigger chain between executeSingleMove/executeMultiMove | High | 3 |
| statusEffectCards.js: AFTER_ATTACK check will break after Phase 6 data migration | High | 6 |
| ActionProcessor test mocks for deleted functions will break | High | 3, 7 |
| MineTriggeredEffectProcessor: unused vars, unreachable LANE_ENEMY branch, state re-fetch smell | Medium | 4 (delete) |
| droneData.js: inconsistent ability format (`effect{}` vs `effects[]`) | Medium | 1-7 |
| EffectRouter: no PERMANENT_STAT_MOD registration | Medium | 0 |
| Magic strings for trigger types/owners (no constants) | Medium | 0 |
| CardActionStrategy.js: dead `applyOnMoveEffectsCallback` (never consumed) | Medium | 3 |
| gameLogic.js: barrel export of deleted `applyOnMoveEffects` | Medium | 3 |
| ON_MOVE guard blocks enemy drone triggers (contradicts PRD 3.3) | Medium | 3 |
| RoundManager: unused `state` param, variable shadowing, redundant cloning | Low | 1 |
| rallyBeaconHelper: hardcoded "Rally Beacon" by name | Low | 7 (delete) |
| droneAttack.js AI: AFTER_ATTACK string check | Low | 6 |

## Consistent Ability Format Rule

Every migrated drone MUST use `effects[]` (plural array), not `effect{}` (singular). Fix during their respective phase:
- Signal Beacon → Phase 1
- Scanner → Phase 2
- Proximity/Inhibitor/Jitter Mines → Phase 4
- Firefly, Gladiator → Phase 6
- Rally Beacon → Phase 7

## Multiplayer Safety (Applies to ALL Phases)

Architecture: **host-authoritative** with optimistic client prediction (Trystero/WebRTC P2P). Both host and guest execute the same game logic via `ActionProcessor.processAction()`.

**Rules for TriggerProcessor:**
1. Guest executes triggers optimistically — identical code path on both sides via ActionProcessor
2. Fully deterministic — same inputs produce identical outputs, no randomness or timing dependency
3. Deterministic ordering — Self > Actor > Reactor + left-to-right depends only on synchronized state
4. Loop guard determinism — pairSet evolves identically on both sides from identical starting state
5. Animation deduplication — TRIGGER_FIRED events include stable identifiers for OptimisticActionService matching
6. State reconciliation — trigger side effects (stat mods, destroyed drones, drawn cards) covered by existing compareGameStates() checks
7. TRIGGER_FIRED animation type registered in AnimationManager for both host and guest
8. Pure game logic — TriggerProcessor in src/logic/triggers/, no React/network dependencies

---

## 12. Architecture

### 12.1 TriggerProcessor — New File

**Location:** `src/logic/triggers/TriggerProcessor.js`

Single class that replaces all 6 fragmented trigger patterns. Call sites remain distributed (movement fires ON_MOVE, combat fires ON_ATTACK, etc.) but they all call `TriggerProcessor.fireTrigger()` instead of bespoke logic.

**Method signatures:**
```js
class TriggerProcessor {
  constructor() { this.effectRouter = new EffectRouter(); }  // Creates own instance (consistent with DeploymentProcessor, AbilityResolver, EffectChainProcessor)

  // Main entry point — called by MovementEffectProcessor, AttackProcessor, etc.
  fireTrigger(triggerType, triggerContext)

  // Scans board for drones with matching TRIGGERED abilities
  findMatchingTriggers(triggerType, context)

  // Routes effects through EffectRouter, handles destroyAfterTrigger, grantsGoAgain
  executeTriggerEffects(ability, drone, context)

  // Per-(reactor, source) pair loop prevention
  checkPairGuard(reactorId, sourceId, pairSet)
}
```

**Trigger context shape (input):**
```js
{
  triggerType,            // 'ON_MOVE', 'ON_LANE_MOVEMENT_IN', etc.
  lane,                   // Lane where action occurred
  triggeringDrone,         // The drone that performed the action
  triggeringPlayerId,      // Player who owns the triggering drone
  actingPlayerId,          // Player who initiated the original action (maintains priority)
  playerStates,            // Current player states (will be mutated or cloned)
  placedSections,
  logCallback,
  card,                    // For ON_CARD_PLAY: the card that was played
  pairSet,                 // Set of "reactorId:sourceId" strings (cascade tracking)
  chainDepth               // Current nesting depth (for animation events)
}
```

**Result shape (output):**
```js
{
  triggered: boolean,
  newPlayerStates: Object,
  animationEvents: [],
  statModsApplied: boolean,
  goAgain: boolean
}
```

### 12.2 Integration with EffectRouter

All trigger effects create standard effect objects and route through `EffectRouter.routeEffect()`. This is exactly what `RoundManager.processRoundStartTriggers` already does successfully.

The `MineTriggeredEffectProcessor.applyMineEffect` switch statement (DAMAGE, EXHAUST_DRONE, MODIFY_STAT) becomes dead code — all three effect types already have EffectRouter processors.

### 12.3 PERMANENT_STAT_MOD Handling

Currently `PERMANENT_STAT_MOD` is processed directly in `abilityHelpers.js` (pushing to `drone.statMods`), not through EffectRouter. Register `PERMANENT_STAT_MOD` in EffectRouter → mapped to `ModifyStatEffectProcessor` (already handles `mod.type: 'permanent'`).

### 12.4 DESTROY with scope: 'SELF'

Firefly's self-destruct uses existing `DESTROY` effect type with `scope: 'SELF'`. No new EffectRouter registration needed — the existing `DestroyEffectProcessor` handles this. TriggerProcessor preprocesses `scope: 'SELF'` to target the triggering drone.

### 12.5 Debug Logging

Add `TRIGGERS: false` category to `src/utils/debugLogger.js` in `DEBUG_CONFIG.categories`.

---

## 13. Trigger Resolution Algorithm

### 13.1 Three-Tier Priority: Self > Actor > Reactor

```
fireTrigger(triggerType, context):
  1. Collect self-triggers on the acting drone
  2. Collect acting player's lane triggers (left-to-right in lane array)
  3. Collect opponent's lane triggers (left-to-right in lane array)
  4. For each trigger in order:
     a. Check pair guard: (reactor.id, source.id) — skip if already fired
     b. Record pair in pairSet
     c. Execute trigger effects via EffectRouter
     d. If effects produce cascading events (card drawn, energy gained, etc.),
        recursively call fireTrigger for those events (depth-first)
     e. Collect animation events with chainDepth
     f. Handle destroyAfterTrigger (self-destruct)
     g. Handle grantsGoAgain
```

### 13.2 Depth-First Cascade

When a trigger fires and its effect causes a new event, all cascading triggers from that event fully resolve before the next trigger at the same level fires. Standard stack-based resolution.

### 13.3 Loop Guard — Per (Reactor, Source) Pair

Each `(reacting drone ID, source drone ID)` pair fires at most once per trigger chain. The `pairSet` is a `Set<string>` using keys like `"reactorId:sourceId"`.

- A chain starts when the first trigger fires from a player action
- The pairSet is passed through recursive calls
- No arbitrary depth cap needed — chains terminate naturally as pairs are exhausted
- The pair rule applies identically across player boundaries

### 13.4 Acting Player Persistence

The `actingPlayerId` (whoever initiated the original action) maintains priority throughout the **entire** cascade chain. It does NOT shift based on whose drone caused a cascading event.

---

## 14. Implementation Phases

### Phase 0: Foundation (no behavior change)
- Create `src/logic/triggers/triggerConstants.js` — enums for TRIGGER_TYPES, TRIGGER_OWNERS, TRIGGER_SCOPES
- Create `src/logic/triggers/TriggerProcessor.js` scaffold with method stubs (creates its own `new EffectRouter()` internally)
- Create `src/logic/triggers/__tests__/TriggerProcessor.test.js`
- Add `TRIGGERS` debug category to `debugLogger.js`
- Register `PERMANENT_STAT_MOD` in EffectRouter → mapped to `ModifyStatEffectProcessor` (already handles `mod.type: 'permanent'`)
- ~~Register `DESTROY_SELF` in EffectRouter~~ — Not needed. Use existing `DESTROY` effect type with `scope: 'SELF'` (Firefly's new format: `effects: [{ type: 'DESTROY', scope: 'SELF' }]`)
- **Checkpoint commit**

### Phase 1: Migrate ON_ROUND_START
- Signal Beacon, War Machine
- Replace `RoundManager.processRoundStartTriggers` body to delegate to `TriggerProcessor.fireTrigger('ON_ROUND_START', ...)`
- Normalize Signal Beacon ability: `effect{}` → `effects[]` in droneData.js
- This is the easiest migration since it already routes through EffectRouter
- **Cleanup:** Remove unused `state` param shadowing, variable shadowing, redundant deep clone in RoundManager
- Test: existing `RoundManager.roundStart.test.js` must still pass

### Phase 2: Migrate ON_DEPLOY
- Scanner (Target Scanner → MARK_RANDOM_ENEMY)
- Replace inline ON_DEPLOY code in `DeploymentProcessor.js` (lines 331-382) with `TriggerProcessor.fireTrigger('ON_DEPLOY', ...)`
- Normalize Scanner ability: `effect{}` → `effects[]` in droneData.js
- **Cleanup:** Remove inline MARK_RANDOM_ENEMY logic from DeploymentProcessor
- Test: existing deployment tests must pass

### Phase 3: Migrate ON_MOVE + Consolidate MovementEffectProcessor
- Specter (Phase Shift → PERMANENT_STAT_MOD), Osiris (Regeneration Protocol → HEAL_HULL)
- Replace both `applyOnMoveEffects()` calls in `MovementEffectProcessor.executeSingleMove` (line 382) and `executeMultiMove` (line 568) with `TriggerProcessor.fireTrigger('ON_MOVE', ...)`
- Replace `gameEngine.applyOnMoveEffects()` call in `CombatActionStrategy.js` (line 311) with `TriggerProcessor.fireTrigger('ON_MOVE', ...)`
- Extract shared post-move trigger chain from executeSingleMove/executeMultiMove into `_resolvePostMoveTriggers()` helper
- **Behavior decision — ON_MOVE for enemy drones:**
  - Current guard: `if (!isMovingEnemyDrone)` at MovementEffectProcessor line 381 means opponent drones moved by cards do NOT fire ON_MOVE
  - PRD Section 3.3 says ON_MOVE fires even for forced movement — this is a gameplay change (e.g., force-moving Osiris heals it)
  - **Implement per PRD** — remove the guard. If playtesting reveals issues, revisit.
- **Cleanup:** Delete `applyOnMoveEffects` from `src/logic/utils/abilityHelpers.js` (removes one of three duplicated functions)
- **Cleanup:** Remove dead `applyOnMoveEffectsCallback` from `CardActionStrategy.js` (line 61) — never consumed by EffectChainProcessor
- **Cleanup:** Remove `applyOnMoveEffects` import/export from `gameLogic.js` (lines 35, 79)
- **Test mock updates:** `ActionProcessor.test.js:11` and `ActionProcessor.combat.test.js:7` mock `applyOnMoveEffects` — update
- Test: move Specter → gains stats, move Osiris → heals, multi-move triggers per drone, force-moved enemy drone fires ON_MOVE

### Phase 4: Migrate Mine Triggers (ON_LANE_MOVEMENT_IN, ON_LANE_DEPLOYMENT, ON_LANE_ATTACK)
- Proximity Mine, Inhibitor Mine, Jitter Mine
- Normalize all 3 mines: `effect{}` → `effects[]` in droneData.js
- Replace `processMineTrigger()` calls (now inside `_resolvePostMoveTriggers` for movement):
  1. `MovementEffectProcessor` (via _resolvePostMoveTriggers)
  2. `CombatActionStrategy.js` (line 352) — `processMineTrigger('ON_LANE_MOVEMENT_IN', ...)`
  3. `DeploymentProcessor` (line 390)
  4. `AttackProcessor.resolveAttack` (line 327)
- TriggerProcessor handles `destroyAfterTrigger` (self-destruct) and `triggerOwner: 'LANE_OWNER'` validation
- **Delete:** `src/logic/effects/MineTriggeredEffectProcessor.js` (272 lines — entire file)
- Test: mine detonation per type, self-destruct, stat mod, multi-move first drone absorbs mine

### Phase 5: Migrate ON_CARD_DRAWN and ON_ENERGY_GAINED
- Odin (All-Seeing Eye), Thor (Storm Surge)
- Replace `applyOnCardDrawnEffects()` call in `DrawEffectProcessor` (line 74)
- Replace `applyOnEnergyGainedEffects()` call in `GainEnergyEffectProcessor` (line 60)
- Handle `scalingDivisor` (Thor) in TriggerProcessor
- **Implement full depth-first cascade with per-(reactor, source) pair loop guard**
- **This is where cascading becomes real** — drawing cards triggers Odin, which could cascade
- **Delete:** `src/logic/utils/abilityHelpers.js` (225 lines — entire file, all 3 functions now migrated)
- Test: Odin gains attack on draw, Thor gains attack on energy, scaling works
- Test: 4-drone chaos cascade (PRD Section 5.2), pair guard termination, cross-player cascade

### Phase 6: Deprecate AFTER_ATTACK → ON_ATTACK
- Firefly, Gladiator, Threat Transmitter
- Update drone data: Firefly/Gladiator from `PASSIVE/AFTER_ATTACK` to `TRIGGERED/ON_ATTACK` with `effects[]` format
- Add `TriggerProcessor.fireTrigger('ON_ATTACK', ...)` call in `AttackProcessor.resolveAttack` (after damage, ~line 625)
- **Delete:** `calculateAfterAttackStateAndEffects` from AttackProcessor (~75 lines)
- Implement `conditionalEffects` evaluation in TriggerProcessor (for Threat Transmitter)
- Update AI: `droneAttack.js:100` AFTER_ATTACK string check → TRIGGERED/ON_ATTACK
- Update AI: `statusEffectCards.js:154-156` AFTER_ATTACK ability bonus scoring → TRIGGERED/ON_ATTACK
- Update test: `droneAttack.test.js:131` Gladiator AFTER_ATTACK test data → TRIGGERED/ON_ATTACK
- Test: Firefly self-destructs, Gladiator gains attack, Threat Transmitter increases threat
- **Verify:** Zero references to `AFTER_ATTACK` in codebase

### Phase 7: Deprecate RALLY_BEACON → ON_LANE_MOVEMENT_IN
- Update Rally Beacon data: change from `PASSIVE/GRANT_KEYWORD` to `TRIGGERED` ability with `effects[]` format
- Remove `checkRallyBeaconGoAgain()` calls in `MovementEffectProcessor` (lines 406-407, 584-585)
- Remove `checkRallyBeaconGoAgain()` call in `CombatActionStrategy.js` (line 410) — replace with TriggerProcessor goAgain result
- TriggerProcessor returns `goAgain: true` when trigger has `grantsGoAgain`
- **Delete:** `src/logic/utils/rallyBeaconHelper.js` (37 lines — entire file)
- **Test mock updates:** `ActionProcessor.test.js:50`, `ActionProcessor.commitments.test.js:47`, `ActionProcessor.combat.test.js:69` mock `checkRallyBeaconGoAgain` — update
- Test: drone moves into Rally Beacon lane → go-again granted
- **Verify:** Zero references to `checkRallyBeaconGoAgain` or `RALLY_BEACON` keyword

### Phase 8: Add New Trigger Types
- `ON_LANE_MOVEMENT_OUT` — purely additive, no current users
- `ON_CARD_PLAY` — fires in `EffectChainProcessor.processEffectChain` after effects complete
- Add `subType: 'Mine'` to mine cards in `cardData.js`
- Implement trigger sub-filters (`triggerFilter.cardType`, `triggerFilter.cardSubType`, `triggerFilter.droneStatFilter`)
- Test: ON_CARD_PLAY fires with correct filtering

### Phase 9: Add Anansi Drone
- Add to `droneData.js` with Web Sensor ability (ON_CARD_PLAY, CONTROLLER, SAME_LANE, cardSubType: 'Mine')
- Stats: CPU 2, Attack 1, Hull 2, Shields 2, Speed 2, Rare, Limit 1, Rebuild 0.5, Upgrade Slots 2
- Test: mine in Anansi's lane → draw, mine in other lane → no draw, non-mine → no draw, opponent plays mine → no draw

### Phase 10: Trigger Chain Animations
- TriggerProcessor emits `TRIGGER_FIRED` animation events with `chainDepth`
- Each trigger firing → animation event with sourceId, sourceName, abilityName, effectDescription
- UI component for text overlay on triggering drone (minimum viable)
- Action log records each trigger firing
- Can run alongside other phases — just ensure animation events are emitted

### Phase 11: Final Cleanup & Descriptions
- Update `src/data/descriptions/glossaryDescriptions.js` — update trigger-related entries
- Update `src/data/descriptions/codePatternDescriptions.js` — remove AFTER_ATTACK, add ON_ATTACK/ON_CARD_PLAY patterns
- **Verify deleted files** (should already be gone from earlier phases):
  - `src/logic/effects/MineTriggeredEffectProcessor.js` (Phase 4)
  - `src/logic/utils/rallyBeaconHelper.js` (Phase 7)
  - `src/logic/utils/abilityHelpers.js` (Phase 5)
- **Final sweep:** Grep for orphaned imports, unused constants, stale comments referencing deleted patterns

### ~~Phase 12: Comprehensive Tests~~ — Merged into per-phase test sections above
_Tests are written per-phase. Phase 0 covers core TriggerProcessor tests (pair guard, findMatchingTriggers). Phase 5 covers cascades (4-drone chaos, cross-player, loop guard). Each other phase covers its trigger type._

---

## 15. Critical Files

| File | Action | Phase |
|-|-|-|
| `src/logic/triggers/triggerConstants.js` | CREATE | 0 |
| `src/logic/triggers/TriggerProcessor.js` | CREATE | 0 |
| `src/logic/triggers/__tests__/TriggerProcessor.test.js` | CREATE | 0 |
| `src/utils/debugLogger.js` | ADD category | 0 |
| `src/logic/EffectRouter.js` | ADD PERMANENT_STAT_MOD | 0 |
| `src/logic/round/RoundManager.js` | MODIFY processRoundStartTriggers | 1 |
| `src/logic/deployment/DeploymentProcessor.js` | MODIFY ON_DEPLOY + mine calls | 2, 4 |
| `src/logic/effects/MovementEffectProcessor.js` | MODIFY ON_MOVE + Rally Beacon + mine calls | 3, 4, 7 |
| `src/logic/actions/CombatActionStrategy.js` | MODIFY ON_MOVE + mine + Rally Beacon calls | 3, 4, 7 |
| `src/logic/actions/CardActionStrategy.js` | CLEANUP dead applyOnMoveEffectsCallback | 3 |
| `src/logic/gameLogic.js` | CLEANUP barrel export of applyOnMoveEffects | 3 |
| `src/logic/effects/cards/DrawEffectProcessor.js` | MODIFY ON_CARD_DRAWN call | 5 |
| `src/logic/effects/energy/GainEnergyEffectProcessor.js` | MODIFY ON_ENERGY_GAINED call | 5 |
| `src/logic/combat/AttackProcessor.js` | MODIFY AFTER_ATTACK + mine call → ON_ATTACK | 4, 6 |
| `src/data/droneData.js` | MODIFY Firefly, Gladiator, Rally Beacon abilities | 6, 7 |
| `src/data/cardData.js` | ADD subType: 'Mine' to 3 cards | 8 |
| `src/data/droneData.js` | ADD Anansi drone | 9 |
| `src/logic/cards/EffectChainProcessor.js` | ADD ON_CARD_PLAY trigger call | 8 |
| `src/logic/effects/MineTriggeredEffectProcessor.js` | DELETE | 4 |
| `src/logic/utils/abilityHelpers.js` | DELETE | 5 |
| `src/logic/utils/rallyBeaconHelper.js` | DELETE | 7 |
| `src/logic/ai/attackEvaluators/droneAttack.js` | UPDATE AFTER_ATTACK check | 6 |
| `src/logic/ai/cardEvaluators/statusEffectCards.js` | UPDATE AFTER_ATTACK check | 6 |
| `src/logic/ai/attackEvaluators/__tests__/droneAttack.test.js` | UPDATE AFTER_ATTACK test data | 6 |
| `src/managers/__tests__/ActionProcessor.test.js` | UPDATE mocks | 3, 7 |
| `src/managers/__tests__/ActionProcessor.combat.test.js` | UPDATE mocks | 3, 7 |
| `src/managers/__tests__/ActionProcessor.commitments.test.js` | UPDATE mocks | 7 |
| `src/data/descriptions/glossaryDescriptions.js` | UPDATE descriptions | 11 |
| `src/data/descriptions/codePatternDescriptions.js` | UPDATE descriptions | 11 |

---

## 16. Key Decisions from Design Discussion

1. **Loop guard is per (reactor, source) pair** — NOT per-instance-once or depth cap. Allows rich multi-source combos while preventing infinite loops.

2. **Acting player priority persists through cascades** — does NOT shift mid-chain.

3. **Multi-move = sequential independent moves** — each fully resolves before next begins. Selection order = processing order = arrival order.

4. **Animations are a hard requirement** — not optional polish. A cascade the player can't follow is broken.

5. **PERMANENT_STAT_MOD must route through EffectRouter** — no manual stat pushing.

6. **ON_CARD_PLAY fires after card effects complete** — in EffectChainProcessor after step 2 but before finishCardPlay.

7. **ON_CARD_PLAY lane matching uses card's target lane** — not token placement board.

8. **Lane position matters strategically** — depth-first + left-to-right means deployment order affects cascade outcomes. Intentional.

9. **Threat Transmitter `conditionalEffects` must be supported** — TriggerProcessor evaluates conditions after attack result.

10. **Mine ownership model preserved** — LANE_OWNER on mines means "board-owner's drones trigger it" which is correct behavior.

---

## 17. Verification Plan

### Per-Phase Verification
- After each phase: run full test suite (`npm test`), verify 0 failures
- Manual smoke test: play a game, trigger the migrated ability, confirm behavior unchanged

### Cascade Verification (Phase 5+)
- Write the 4-drone chaos test from Section 5.2 as an automated test
- Verify pair tracking terminates correctly
- Verify animation events are emitted in correct depth-first order

### End-to-End Verification
- Play a full game with all trigger-using drones deployed
- Verify each trigger type fires correctly
- Verify cascade chains are visible in the animation system
- Verify action log records trigger firings
- Verify AI still makes reasonable decisions with migrated patterns
