# Trigger System Progress Tracker

> Live tracking document. Updated as each phase completes.

---

## Phase 0: Foundation ✅
- [x] Create `src/logic/triggers/triggerConstants.js` (TRIGGER_TYPES, TRIGGER_OWNERS, TRIGGER_SCOPES)
- [x] Create `src/logic/triggers/TriggerProcessor.js` scaffold (creates own `new EffectRouter()` internally)
- [x] Create `src/logic/triggers/__tests__/TriggerProcessor.test.js` scaffold
- [x] Add `TRIGGERS: false` category to `debugLogger.js`
- [x] Register `PERMANENT_STAT_MOD` in EffectRouter → `ModifyStatEffectProcessor`
- [x] Tests: pair guard, findMatchingTriggers, PERMANENT_STAT_MOD routes correctly
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

## Phase 3: Migrate ON_MOVE + Consolidate MovementEffectProcessor
- [ ] Replace `applyOnMoveEffects()` calls in MovementEffectProcessor → `TriggerProcessor.fireTrigger('ON_MOVE', ...)`
- [ ] Replace `gameEngine.applyOnMoveEffects()` in `CombatActionStrategy.js` (line 311) → TriggerProcessor
- [ ] Extract `_resolvePostMoveTriggers()` helper (shared by executeSingleMove/executeMultiMove)
- [ ] Remove ON_MOVE enemy drone guard (`isMovingEnemyDrone` check) per PRD Section 3.3
- [ ] Delete `applyOnMoveEffects` from `abilityHelpers.js`
- [ ] Remove dead `applyOnMoveEffectsCallback` from `CardActionStrategy.js` (line 61)
- [ ] Remove `applyOnMoveEffects` import/export from `gameLogic.js` (lines 35, 79)
- [ ] Update test mocks: `ActionProcessor.test.js:11`, `ActionProcessor.combat.test.js:7`
- [ ] Tests: Specter +1 attack/+1 speed, Osiris heals 4 hull, multi-move triggers per drone, force-moved enemy fires ON_MOVE
- [ ] Checkpoint commit

## Phase 4: Migrate Mine Triggers
- [ ] Normalize all 3 mines: `effect{}` → `effects[]` in droneData.js
- [ ] Replace `processMineTrigger()` calls in MovementEffectProcessor (via _resolvePostMoveTriggers)
- [ ] Replace `processMineTrigger()` call in `CombatActionStrategy.js` (line 352)
- [ ] Replace `processMineTrigger()` call in DeploymentProcessor
- [ ] Replace `processMineTrigger()` call in AttackProcessor
- [ ] Delete `MineTriggeredEffectProcessor.js` (272 lines)
- [ ] Tests: mine detonation per type, self-destruct, stat mod, multi-move mine absorption
- [ ] Checkpoint commit

## Phase 5: Migrate ON_CARD_DRAWN and ON_ENERGY_GAINED
- [ ] Replace `applyOnCardDrawnEffects()` in DrawEffectProcessor → TriggerProcessor
- [ ] Replace `applyOnEnergyGainedEffects()` in GainEnergyEffectProcessor → TriggerProcessor
- [ ] Implement `scalingDivisor` (Thor: per N energy)
- [ ] Implement full depth-first cascade with per-(reactor, source) pair loop guard
- [ ] Delete `abilityHelpers.js` (225 lines — entire file)
- [ ] Tests: Odin +1 attack per card, Thor +1 attack per 2 energy
- [ ] Test: 4-drone chaos cascade (PRD Section 5.2)
- [ ] Test: cross-player cascade
- [ ] Test: loop guard exhaustion
- [ ] Checkpoint commit

## Phase 6: Deprecate AFTER_ATTACK → ON_ATTACK
- [ ] Update Firefly: `PASSIVE/AFTER_ATTACK` → `TRIGGERED/ON_ATTACK, effects: [{ type: 'DESTROY', scope: 'SELF' }]`
- [ ] Update Gladiator: `PASSIVE/AFTER_ATTACK` → `TRIGGERED/ON_ATTACK, effects: [{ type: 'PERMANENT_STAT_MOD' }]`
- [ ] Add `TriggerProcessor.fireTrigger('ON_ATTACK', ...)` in AttackProcessor
- [ ] Implement `conditionalEffects` evaluation (Threat Transmitter)
- [ ] Delete `calculateAfterAttackStateAndEffects` (~75 lines)
- [ ] Update AI: `droneAttack.js` AFTER_ATTACK check → TRIGGERED/ON_ATTACK
- [ ] Update AI: `statusEffectCards.js:154-156` AFTER_ATTACK check → TRIGGERED/ON_ATTACK
- [ ] Update test: `droneAttack.test.js:131` Gladiator AFTER_ATTACK test data → TRIGGERED/ON_ATTACK
- [ ] Tests: Firefly self-destructs, Gladiator +1 attack, Threat Transmitter +4 threat
- [ ] Verify: zero references to `AFTER_ATTACK` in codebase
- [ ] Checkpoint commit

## Phase 7: Deprecate RALLY_BEACON → ON_LANE_MOVEMENT_IN
- [ ] Update Rally Beacon: `PASSIVE/GRANT_KEYWORD` → `TRIGGERED/ON_LANE_MOVEMENT_IN` with `effects[]`
- [ ] Remove `checkRallyBeaconGoAgain()` calls in MovementEffectProcessor
- [ ] Remove `checkRallyBeaconGoAgain()` call in `CombatActionStrategy.js` (line 410)
- [ ] Delete `rallyBeaconHelper.js` (37 lines)
- [ ] Update test mocks: `ActionProcessor.test.js:50`, `ActionProcessor.commitments.test.js:47`, `ActionProcessor.combat.test.js:69`
- [ ] Tests: friendly drone → go-again, enemy drone → no go-again, no beacon → no go-again
- [ ] Verify: zero references to `checkRallyBeaconGoAgain` or `RALLY_BEACON`
- [ ] Checkpoint commit

## Phase 8: Add New Trigger Types + ON_CARD_PLAY
- [ ] Add `TriggerProcessor.fireTrigger('ON_CARD_PLAY', ...)` in EffectChainProcessor
- [ ] Add `subType: 'Mine'` to 3 mine cards in cardData.js
- [ ] Implement `triggerFilter` evaluation (cardType, cardSubType, droneStatFilter)
- [ ] Add `ON_LANE_MOVEMENT_OUT` support (additive, no current users)
- [ ] Tests: ON_CARD_PLAY fires with correct filtering, ON_LANE_MOVEMENT_OUT fires on lane exit
- [ ] Checkpoint commit

## Phase 9: Add Anansi Drone
- [ ] Add Anansi to droneData.js (CPU 2, Atk 1, Hull 2, Shields 2, Speed 2, Rare, Limit 1)
- [ ] Ability: Web Sensor (ON_CARD_PLAY, CONTROLLER, SAME_LANE, triggerFilter: { cardSubType: 'Mine' })
- [ ] Tests: mine in Anansi's lane → draw, other lane → no draw, non-mine → no draw, opponent mine → no draw
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
| `src/logic/effects/MineTriggeredEffectProcessor.js` | 272 | 4 | Pending |
| `src/logic/utils/abilityHelpers.js` | 225 | 5 | Pending |
| `src/logic/utils/rallyBeaconHelper.js` | 37 | 7 | Pending |
| `AttackProcessor.calculateAfterAttackStateAndEffects` | ~75 | 6 | Pending |
| RoundManager smell (unused params, shadowing, clones) | ~10 | 1 | Pending |
| `CardActionStrategy.js` dead `applyOnMoveEffectsCallback` | ~1 | 3 | Pending |
| `gameLogic.js` barrel export of `applyOnMoveEffects` | ~2 | 3 | Pending |
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
