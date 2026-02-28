# Trigger System Progress Tracker

> Live tracking document. Updated as each phase completes.

---

## Phase 0: Foundation ✅
- [x] Create `src/logic/triggers/triggerConstants.js` (TRIGGER_TYPES, TRIGGER_OWNERS, TRIGGER_SCOPES)
- [x] Create `src/logic/triggers/TriggerProcessor.js` scaffold (creates own `new EffectRouter()` internally)
- [x] Create `src/logic/triggers/__tests__/TriggerProcessor.test.js` scaffold
- [x] Add `TRIGGERS: false` category to `debugLogger.js`
- [x] Register `MODIFY_STAT` in EffectRouter → `ModifyStatEffectProcessor`
- [x] Tests: pair guard, findMatchingTriggers, MODIFY_STAT routes correctly
- [x] Checkpoint commit `9d4e63d9`

## Phase 1: Migrate ON_ROUND_START ✅
- [x] Replace `processRoundStartTriggers` body → `TriggerProcessor.fireTrigger('ON_ROUND_START', ...)`
- [x] Normalize Signal Beacon ability: `effect{}` → `effects[]`
- [x] Cleanup: remove unused `state` param shadowing in RoundManager
- [x] Cleanup: remove variable shadowing of `playerState`
- [x] Cleanup: remove redundant deep clone (lines 169-170)
- [x] Tests: `RoundManager.roundStart.test.js` passes, Signal Beacon +2 threat, War Machine +1 attack
- [x] Checkpoint commit `c3d6c196`

## Phase 2: Migrate ON_DEPLOY ✅
- [x] Replace inline ON_DEPLOY code in DeploymentProcessor → `TriggerProcessor.fireTrigger('ON_DEPLOY', ...)`
- [x] Normalize Scanner ability: `effect{}` → `effects[]`
- [x] Cleanup: remove inline MARK_RANDOM_ENEMY logic
- [x] Tests: deployment tests pass, Scanner marks random enemy
- [x] Checkpoint commit

## Phase 3: Migrate ON_MOVE + Consolidate MovementEffectProcessor ✅
- [x] Replace `applyOnMoveEffects()` calls in MovementEffectProcessor → `TriggerProcessor.fireTrigger('ON_MOVE', ...)`
- [x] Replace `gameEngine.applyOnMoveEffects()` in `CombatActionStrategy.js` (line 311) → TriggerProcessor
- [x] Extract `_resolvePostMoveTriggers()` helper (shared by executeSingleMove/executeMultiMove)
- [x] Remove ON_MOVE enemy drone guard (`isMovingEnemyDrone` check) per PRD Section 3.3
- [x] Delete `applyOnMoveEffects` from `abilityHelpers.js`
- [x] Remove dead `applyOnMoveEffectsCallback` from `CardActionStrategy.js` (line 61)
- [x] Remove `applyOnMoveEffects` import/export from `gameLogic.js` (lines 35, 79)
- [x] Update test mocks: `ActionProcessor.test.js:11`, `ActionProcessor.combat.test.js:7`
- [x] Tests: all 3828 tests pass
- [x] Checkpoint commit `f2b0d542`

## Phase 4: Migrate Mine Triggers ✅
- [x] Normalize all 3 mines: `effect{}` → `effects[]` in droneData.js (with `scope: 'TRIGGERING_DRONE'`)
- [x] Add `_applyDirectEffect` to TriggerProcessor (DAMAGE, EXHAUST_DRONE, MODIFY_STAT for mine effects)
- [x] Update `_destroyDrone` to call `onDroneDestroyed`, `updateAuras`, emit DRONE_DESTROYED animation
- [x] Replace `processMineTrigger()` calls in MovementEffectProcessor (via _resolvePostMoveTriggers)
- [x] Replace `processMineTrigger()` call in `CombatActionStrategy.js`
- [x] Replace `processMineTrigger()` call in DeploymentProcessor
- [x] Replace `processMineTrigger()` call in AttackProcessor
- [x] Delete `MineTriggeredEffectProcessor.js` (272 lines)
- [x] Update test mocks: AttackProcessor tests (4 files), ActionProcessor tests (3 files)
- [x] Tests: all 3828 tests pass
- [x] Checkpoint commit

## Phase 5: Migrate ON_CARD_DRAWN and ON_ENERGY_GAINED ✅
- [x] Replace `applyOnCardDrawnEffects()` in DrawEffectProcessor → TriggerProcessor
- [x] Replace `applyOnEnergyGainedEffects()` in GainEnergyEffectProcessor → TriggerProcessor
- [x] Implement `scalingAmount` and `scalingDivisor` in executeTriggerEffects (repeatCount loop)
- [x] Delete `abilityHelpers.js` (entire file — all functions now migrated)
- [x] Tests: all 3828 tests pass
- [x] Checkpoint commit
- [x] Tests: scaling (repeatCount, scalingDivisor), TRIGGERING_DRONE routing, destroyAfterTrigger, edge cases (+17 tests)
- [ ] Test: 4-drone chaos cascade (PRD Section 5.2) — deferred to Phase 6+ (needs cascade infrastructure)
- [ ] Test: cross-player cascade — deferred to Phase 6+
- [ ] Test: loop guard exhaustion — deferred to Phase 6+
- [x] Code review fixes: route EXHAUST_DRONE/MODIFY_STAT through EffectRouter, remove redundant clones, add lane: null
- [x] Checkpoint commit

## Phase 6: Deprecate AFTER_ATTACK → ON_ATTACK ✅
- [x] Update Firefly: `PASSIVE/AFTER_ATTACK` → `TRIGGERED/ON_ATTACK, effects: [{ type: 'DESTROY', scope: 'SELF' }]`
- [x] Update Gladiator: `PASSIVE/AFTER_ATTACK` → `TRIGGERED/ON_ATTACK, effects: [{ type: 'PERMANENT_STAT_MOD' }]`
- [x] Add `TriggerProcessor.fireTrigger('ON_ATTACK', ...)` in AttackProcessor
- [ ] Implement `conditionalEffects` evaluation (Threat Transmitter) — deferred to Phase 8+
- [x] Delete `calculateAfterAttackStateAndEffects` (~87 lines)
- [x] Add `scope: 'SELF'` branch to DestroyEffectProcessor
- [x] Update AI: `droneAttack.js` AFTER_ATTACK check → TRIGGERED/ON_ATTACK
- [x] Update AI: `statusEffectCards.js` AFTER_ATTACK check → TRIGGERED/ON_ATTACK
- [x] Update test: `droneAttack.test.js:131` Gladiator AFTER_ATTACK → ON_ATTACK
- [x] Update description files: glossaryDescriptions + codePatternDescriptions
- [x] Tests: Firefly self-destructs via ON_ATTACK, Gladiator +1 attack via ON_ATTACK, SELF scope in DestroyEffectProcessor
- [x] Verify: zero references to `AFTER_ATTACK` in codebase
- [ ] Checkpoint commit

## Phase 7: Deprecate RALLY_BEACON → ON_LANE_MOVEMENT_IN ✅
- [x] Update Rally Beacon: `PASSIVE/GRANT_KEYWORD` → `TRIGGERED/ON_LANE_MOVEMENT_IN` with `effects: [{ type: 'GO_AGAIN' }]`
- [x] Handle GO_AGAIN in TriggerProcessor effect loop (control flow signal, not state mutation)
- [x] Remove `grantsGoAgain` check from TriggerProcessor
- [x] Remove `checkRallyBeaconGoAgain()` calls in MovementEffectProcessor, merge into trigger loop
- [x] Remove `checkRallyBeaconGoAgain()` call in `CombatActionStrategy.js`, use `mineResult.goAgain`
- [x] Remove RALLY_BEACON keyword from TraitIndicators
- [x] Delete `rallyBeaconHelper.js` (37 lines)
- [x] Update test mocks: 3 ActionProcessor test files, TriggerProcessor TestGoAgainDrone
- [x] Tests: friendly drone → go-again, enemy drone → no go-again, no beacon → no go-again, beacon + mine coexistence
- [x] Verify: zero references to `checkRallyBeaconGoAgain`, `rallyBeaconHelper`, `grantsGoAgain` in trigger path
- [x] Checkpoint commit

## Phase 8: Add New Trigger Types + ON_CARD_PLAY ✅
- [x] Add `TriggerProcessor.fireTrigger('ON_CARD_PLAY', ...)` in EffectChainProcessor
- [x] Add `subType: 'Mine'` to 3 mine cards in cardData.js
- [x] Implement SAME_LANE filtering in `_collectControllerTriggers` (pass eventLane)
- [x] `triggerFilter` evaluation already implemented (Phase 0) — cardType, cardSubType, droneStatFilter
- [x] Add `ON_LANE_MOVEMENT_OUT` support in MovementEffectProcessor._resolvePostMoveTriggers
- [x] Tests: ON_CARD_PLAY (5 tests), ON_LANE_MOVEMENT_OUT (3 tests)
- [ ] Checkpoint commit

## Phase 9: Add Anansi Drone ✅
- [x] Add Anansi to droneData.js (CPU 2, Atk 1, Hull 2, Shields 2, Speed 2, Rare, Limit 1)
- [x] Ability: Web Sensor (ON_CARD_PLAY, CONTROLLER, SAME_LANE, triggerFilter: { cardSubType: 'Mine' })
- [x] Tests: mine in Anansi's lane → draw, other lane → no draw, non-mine → no draw, opponent mine → no draw
- [ ] Checkpoint commit

## Phase 10: Trigger Chain Animations
- [ ] TriggerProcessor emits `TRIGGER_FIRED` animation events
- [ ] Register `TRIGGER_FIRED` in AnimationManager
- [ ] Action log records each trigger firing
- [ ] Multiplayer: stable identifiers for deduplication
- [ ] Tests: animation events in correct depth-first order, chainDepth values correct
- [ ] Checkpoint commit

## Phase 11: Final Cleanup & Descriptions
- [ ] Update `glossaryDescriptions.js` — trigger-related entries
- [ ] Update `codePatternDescriptions.js` — remove AFTER_ATTACK, add ON_ATTACK/ON_CARD_PLAY
- [ ] Verify: MineTriggeredEffectProcessor.js deleted (Phase 4)
- [ ] Verify: rallyBeaconHelper.js deleted (Phase 7)
- [ ] Verify: abilityHelpers.js deleted (Phase 5)
- [ ] Final sweep: grep for orphaned imports, unused constants, stale comments
- [ ] Checkpoint commit

---

## Dead Code Deletion Tracker

| File | Lines | Phase | Status |
|-|-|-|-|
| `src/logic/effects/MineTriggeredEffectProcessor.js` | 272 | 4 | ✅ Deleted |
| `src/logic/utils/abilityHelpers.js` | 225 | 5 | ✅ Deleted |
| `src/logic/utils/rallyBeaconHelper.js` | 37 | 7 | ✅ Deleted |
| `AttackProcessor.calculateAfterAttackStateAndEffects` | ~75 | 6 | ✅ Deleted |
| RoundManager smell (unused params, shadowing, clones) | ~10 | 1 | ✅ Fixed |
| `CardActionStrategy.js` dead `applyOnMoveEffectsCallback` | ~1 | 3 | ✅ Deleted |
| `gameLogic.js` barrel export of `applyOnMoveEffects` | ~2 | 3 | ✅ Deleted |
| **Total** | **~622** | | |

---

## Key Decisions Log

| Decision | Rationale | Phase |
|-|-|-|
| Per (reactor, source) pair loop guard | Allows rich combos while preventing infinite loops | 0 |
| Acting player priority persists through cascades | Consistent ordering regardless of cascade depth | 0 |
| Delete files in their migration phase, not Phase 11 | Cleaner commits, dead code removed immediately | All |
| `effects[]` array format everywhere | Consistent data structure, no effect/effects ambiguity | 1-7 |
| Use `DESTROY` with `scope: 'SELF'` not `DESTROY_SELF` | Reuses existing DestroyEffectProcessor, no new EffectRouter type | 0 |
| TriggerProcessor creates own EffectRouter | Consistent with DeploymentProcessor, AbilityResolver patterns | 0 |
| ON_MOVE fires for force-moved enemy drones | Matches PRD Section 3.3; gameplay change — revisit if issues | 3 |
| Tests per-phase, no separate Phase 12 | Each phase owns its test coverage; reduces integration risk | All |

---

## Notes

_Updated as implementation progresses._
