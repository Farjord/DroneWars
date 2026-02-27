# Trigger System Implementation Plan

## 12. Architecture

### 12.1 TriggerProcessor — New File

**Location:** `src/logic/triggers/TriggerProcessor.js`

Single class that replaces all 6 fragmented trigger patterns. Call sites remain distributed (movement fires ON_MOVE, combat fires ON_ATTACK, etc.) but they all call `TriggerProcessor.fireTrigger()` instead of bespoke logic.

**Method signatures:**
```js
class TriggerProcessor {
  constructor(effectRouter) { ... }

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

Currently `PERMANENT_STAT_MOD` is processed directly in `abilityHelpers.js` (pushing to `drone.statMods`), not through EffectRouter. Two options:
1. Add a `PERMANENT_STAT_MOD` processor to EffectRouter
2. Map `PERMANENT_STAT_MOD` to existing `MODIFY_STAT` processor with `type: 'permanent'`

The existing `ModifyStatEffectProcessor` handles stat mods. Check if it can handle permanent mods or needs a minor extension.

### 12.4 Debug Logging

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
- Create `src/logic/triggers/TriggerProcessor.js` scaffold with method stubs
- Create `src/logic/triggers/__tests__/TriggerProcessor.test.js`
- Add `TRIGGERS` debug category to `debugLogger.js`
- **Checkpoint commit**

### Phase 1: Migrate ON_ROUND_START
- Signal Beacon, War Machine
- Replace `RoundManager.processRoundStartTriggers` body to delegate to `TriggerProcessor.fireTrigger('ON_ROUND_START', ...)`
- This is the easiest migration since it already routes through EffectRouter
- Test: existing `RoundManager.roundStart.test.js` must still pass

### Phase 2: Migrate ON_DEPLOY
- Scanner (Target Scanner → MARK_RANDOM_ENEMY)
- Replace inline ON_DEPLOY code in `DeploymentProcessor.js` (lines 331-382) with `TriggerProcessor.fireTrigger('ON_DEPLOY', ...)`
- Test: existing deployment tests must pass

### Phase 3: Migrate ON_MOVE
- Specter (Phase Shift → PERMANENT_STAT_MOD), Osiris (Regeneration Protocol → HEAL_HULL)
- Replace `applyOnMoveEffects()` calls in `MovementEffectProcessor.executeSingleMove` (line 382) and `executeMultiMove` (line 568)
- Ensure PERMANENT_STAT_MOD routes correctly through EffectRouter (may need mapping)
- Test: move Specter → gains stats, move Osiris → heals

### Phase 4: Migrate Mine Triggers (ON_LANE_MOVEMENT_IN, ON_LANE_DEPLOYMENT, ON_LANE_ATTACK)
- Proximity Mine, Inhibitor Mine, Jitter Mine
- Replace `processMineTrigger()` calls at 5 call sites:
  1. `MovementEffectProcessor.executeSingleMove` (line 416)
  2. `MovementEffectProcessor.executeMultiMove` (line 595)
  3. `DeploymentProcessor` (line 390)
  4. `AttackProcessor.resolveAttack` (line 327)
- TriggerProcessor handles `destroyAfterTrigger` (self-destruct) and `triggerOwner: 'LANE_OWNER'` validation
- Delete `MineTriggeredEffectProcessor.js` after all call sites migrated
- Test: mine detonation, self-destruct, stat mod application

### Phase 5: Migrate ON_CARD_DRAWN and ON_ENERGY_GAINED
- Odin (All-Seeing Eye), Thor (Storm Surge)
- Replace `applyOnCardDrawnEffects()` call in `DrawEffectProcessor` (line 74)
- Replace `applyOnEnergyGainedEffects()` call in `GainEnergyEffectProcessor` (line 60)
- Handle `scalingDivisor` (Thor) in TriggerProcessor
- **This is where cascading becomes real** — drawing cards triggers Odin, which could cascade
- Test: Odin gains attack on draw, Thor gains attack on energy, scaling works

### Phase 6: Deprecate AFTER_ATTACK → ON_ATTACK
- Firefly, Gladiator, Threat Transmitter
- Update drone data: change from `PASSIVE` with `AFTER_ATTACK` effect to `TRIGGERED` with `trigger: 'ON_ATTACK'`
- Add `TriggerProcessor.fireTrigger('ON_ATTACK', ...)` call in `AttackProcessor.resolveAttack` (after damage, before counter-attacks, ~line 625)
- Remove `calculateAfterAttackStateAndEffects` function
- Handle `conditionalEffects` for Threat Transmitter
- Update AI references: `droneAttack.js:100` checks `AFTER_ATTACK`
- Test: Firefly self-destructs, Gladiator gains attack, Threat Transmitter increases threat

### Phase 7: Deprecate RALLY_BEACON → ON_LANE_MOVEMENT_IN
- Update Rally Beacon data: change from `PASSIVE/GRANT_KEYWORD` to `TRIGGERED` ability
- Remove `checkRallyBeaconGoAgain()` calls in `MovementEffectProcessor` (lines 406-407, 584-585)
- TriggerProcessor returns `goAgain: true` when trigger has `grantsGoAgain`
- Delete `rallyBeaconHelper.js`
- Test: drone moves into Rally Beacon lane → go-again granted

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

### Phase 11: Cleanup
- Delete `src/logic/effects/MineTriggeredEffectProcessor.js`
- Delete `src/logic/utils/rallyBeaconHelper.js`
- Clean up `src/logic/utils/abilityHelpers.js` (delete if empty, or remove migrated functions)
- Remove `calculateAfterAttackStateAndEffects` from `AttackProcessor.js`
- Update AI references that checked old patterns
- Update `src/data/descriptions/glossaryDescriptions.js` and `codePatternDescriptions.js`

### Phase 12: Comprehensive Tests
- Unit tests for TriggerProcessor core (find, execute, pair guard)
- Integration tests for each trigger type
- Cascade test: multi-drone interaction (the 4-drone chaos walkthrough from Section 5.2)
- Cross-player cascade test
- Loop guard test: verify infinite loops terminate
- Multi-move resolution test: selection order, mine absorption

---

## 15. Critical Files

| File | Action | Phase |
|-|-|-|
| `src/logic/triggers/TriggerProcessor.js` | CREATE | 0 |
| `src/logic/triggers/__tests__/TriggerProcessor.test.js` | CREATE | 0 |
| `src/utils/debugLogger.js` | ADD category | 0 |
| `src/logic/round/RoundManager.js` | MODIFY processRoundStartTriggers | 1 |
| `src/logic/deployment/DeploymentProcessor.js` | MODIFY ON_DEPLOY + mine calls | 2, 4 |
| `src/logic/effects/MovementEffectProcessor.js` | MODIFY ON_MOVE + Rally Beacon + mine calls | 3, 4, 7 |
| `src/logic/effects/cards/DrawEffectProcessor.js` | MODIFY ON_CARD_DRAWN call | 5 |
| `src/logic/effects/energy/GainEnergyEffectProcessor.js` | MODIFY ON_ENERGY_GAINED call | 5 |
| `src/logic/combat/AttackProcessor.js` | MODIFY AFTER_ATTACK + mine call → ON_ATTACK | 4, 6 |
| `src/data/droneData.js` | MODIFY Firefly, Gladiator, Rally Beacon abilities | 6, 7 |
| `src/data/cardData.js` | ADD subType: 'Mine' to 3 cards | 8 |
| `src/data/droneData.js` | ADD Anansi drone | 9 |
| `src/logic/cards/EffectChainProcessor.js` | ADD ON_CARD_PLAY trigger call | 8 |
| `src/logic/EffectRouter.js` | POSSIBLY add PERMANENT_STAT_MOD | 3 |
| `src/logic/effects/MineTriggeredEffectProcessor.js` | DELETE | 11 |
| `src/logic/utils/rallyBeaconHelper.js` | DELETE | 11 |
| `src/logic/utils/abilityHelpers.js` | DELETE or gut | 11 |
| `src/logic/ai/attackEvaluators/droneAttack.js` | UPDATE AFTER_ATTACK check | 6 |
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
