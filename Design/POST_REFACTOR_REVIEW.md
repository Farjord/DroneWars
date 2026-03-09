# Post-Refactor Code Review — Client-Server Migration

## Summary

| Metric | Value |
|-|-|
| Files reviewed | 47 (source + tests) |
| Review agents | 12 (code-reviewer + code-simplifier x 6 batches) |
| Test baseline | 4185 passing, 258 test files |

| Severity | Count |
|-|-|
| Critical | 1 |
| High | 14 |
| Medium | 18 |
| Discarded | 18 |

---

## Critical — Fix Immediately

### C1. Input mutation in AttackProcessor.resolveAttack
**File:** `src/logic/combat/AttackProcessor.js:142-146`
**Found by:** Code-reviewer (Batch 3)
**Issue:** When mine triggers fire, `Object.assign(attackerPlayerState, ...)` mutates the caller's original `playerStates` parameter. Between lines 142 and 358, the caller's state is silently corrupted. Pure logic functions in `src/logic/` must not mutate inputs.
**Fix:** Deep-copy mine result states into local variables instead of `Object.assign` on input references.

---

## High — Fix in This Pass

### Dead Code Removal

#### H1. Diagnostic code in CardActionStrategy
**File:** `src/logic/actions/CardActionStrategy.js:9-23, 118-162`
**Found by:** Both agents (Batch 3)
**Issue:** `_snapshotDrones` helper and ~20 lines of `[DIAG]`-prefixed logging are temporary debugging scaffolding. Violates comment standards (temporal annotations).
**Fix:** Remove `_snapshotDrones` and all `[DIAG]` log calls.

#### H2. Dead methods in ActionProcessor
**File:** `src/managers/ActionProcessor.js:815-821`
**Found by:** Both agents (Batch 1)
**Issue:** `processSnaredConsumption` and `processSuppressedConsumption` are never called. Status consumption routes through `STATUS_CONSUMPTION_TYPES` → `_processStatusConsumption` directly.
**Fix:** Remove both methods.

#### H3. Dead no-op methods in GameStateManager
**File:** `src/managers/GameStateManager.js:193-196`
**Found by:** Both agents (Batch 2)
**Issue:** `trackOptimisticAnimations()` and `filterAnimations()` are no-ops with "removed (Phase 4)" comment. No callers exist.
**Fix:** Remove both methods and the comment.

#### H4. Dead `instanceCounter` in SinglePlayerCombatInitializer
**File:** `src/logic/singlePlayer/SinglePlayerCombatInitializer.js:580, 726`
**Found by:** Both agents (Batch 4)
**Issue:** `let instanceCounter = 0` declared in both `buildPlayerState` and `buildAIState`, never read or incremented. Leftover from pre-`crypto.randomUUID()` era.
**Fix:** Remove both declarations.

#### H5. Unused imports in CombatActionStrategy
**File:** `src/logic/actions/CombatActionStrategy.js:5, 7`
**Found by:** Code-simplifier (Batch 3)
**Issue:** `fullDroneCollection` and `LaneControlCalculator` imported but never referenced. Dead from extraction.
**Fix:** Remove both import lines.

#### H6. Unused import `CHAIN_ONLY_FIELDS` in EffectChainProcessor
**File:** `src/logic/cards/EffectChainProcessor.js:11`
**Found by:** Code-reviewer (Batch 4)
**Issue:** Imported from `chainConstants.js` but never used — only `stripChainFields` is called.
**Fix:** Remove from import. Also update re-export on line 692 to have test import directly from `chainConstants.js`.

#### H7. Dead parameters in managers
**Files:** `src/managers/GameFlowManager.js:82`, PhaseManager test call sites (25+)
**Found by:** Both agents (Batch 2)
**Issue:** (a) `_isMultiplayerFn` third parameter in `GameFlowManager.initialize()` is accepted but never used. (b) `isMultiplayer` passed to PhaseManager constructor by 25+ test sites but never consumed — PhaseManager only uses `isAuthority`.
**Fix:** (a) Remove `_isMultiplayerFn` from signature and update callers. (b) Remove `isMultiplayer` from all test call sites.

#### H8. Dead state and unused destructured values
**Files:** Multiple hooks and screens
**Found by:** Both agents (Batches 5, 6)
**Issue:** Several unused variables across the codebase:
- `postRemovalShieldAllocation` state in `useShieldAllocation.js:40` — set to null, cleared to null, never read
- `setCostReminderArrowState` in `useResolvers.js:49` — destructured, never used
- `getOpponentPlayerId` in `useResolvers.js:123` — stale dependency array entry
- `section` variable in `useShieldAllocation.js:156` — assigned, never referenced
- `updateGameState` in `ShipPlacementScreen.jsx:32` — destructured, never called
- `opponentPlayerState` / `getOpponentPlayerState` in `DeckSelectionScreen.jsx:37-43`
- `shipComponentCollection` import in `LobbyScreen.jsx:12`
**Fix:** Remove all unused variables, imports, and destructured values.

### Architectural

#### H9. Hardcoded `'player2'` as remote client identity
**Files:** `DeckSelectionScreen.jsx:125,263`, `DroneSelectionScreen.jsx:178`, `ShipPlacementScreen.jsx:212`
**Found by:** Both agents (Batch 6)
**Issue:** All three screens use `getLocalPlayerId() === 'player2'` to decide remote vs local action routing. Couples screens to the assumption that remote client is always player2.
**Fix:** Extract a semantic helper (e.g., `isRemoteClient()` from game state or hook) and replace all 4 occurrences.

#### H10. Direct state mutation in CommitmentStrategy
**File:** `src/logic/actions/CommitmentStrategy.js:90-98, 108-123`
**Found by:** Code-reviewer (Batch 3)
**Issue:** `processCommitment` mutates `currentState.commitments` and `currentState[playerId].shipSections` directly before calling `ctx.setState`. If `setState` throws, state is already corrupted. Other strategies properly build new objects first.
**Fix:** Build new commitments/playerState objects, then pass to `ctx.setState` in a single call.

### Logging

#### H11. Duplicate debug log pairs in PhaseManager
**File:** `src/managers/PhaseManager.js:87-88, 92-93, 200-201, 206-207, 247-248`
**Found by:** Both agents (Batch 2)
**Issue:** Six pairs of consecutive `debugLog` calls for the same error condition. Violates "logs must fire once per event."
**Fix:** Remove the second log in each pair, keeping the more descriptive one.

#### H12. Always-on drone count logging in GameEngine
**File:** `src/server/GameEngine.js:84-88`
**Found by:** Both agents (Batch 1)
**Issue:** Drone count computation runs on every `_emitToClients` call even when DEPLOY_TRACE is disabled. Unnecessary per-action overhead.
**Fix:** Gate behind DEPLOY_TRACE enabled check, or remove if no longer needed post-refactor.

### Test Quality

#### H13. Change-description test for removed pattern
**File:** `src/managers/__tests__/ActionProcessor.test.js:513-518`
**Found by:** Code-reviewer (Batch 1)
**Issue:** Test "executeAndCaptureAnimations does NOT set _apDirectQueued" verifies a removed pattern stays removed. Will pass forever, catches no regressions.
**Fix:** Remove this test.

#### H14. Duplicated mock setup in ActionProcessor test files
**Files:** `ActionProcessor.test.js:1-48`, `ActionProcessor.combat.test.js:1-67`
**Found by:** Code-simplifier (Batch 1)
**Issue:** ~30 identical `vi.mock()` declarations and nearly identical GSM factory duplicated across both files.
**Fix:** Extract shared mocks into `src/managers/__tests__/actionProcessorTestHelpers.js`.

---

## Medium — Fix in This Pass

### Simplification

#### M1. `effectiveStatsWrapper` unnecessary wrapper
**File:** `src/managers/ActionProcessor.js:151-153`
**Issue:** Arrow function that just calls `this.gameDataService.getEffectiveStats(drone, lane)`. Adds indirection for no reason.
**Fix:** Remove wrapper. Pass `gameDataService` through action context (which already exposes `getGameDataService()`).

#### M2. Duplicate `placedSections` assembly across 4 strategies
**Files:** `CardActionStrategy.js:194`, `CombatActionStrategy.js:27`, `DroneActionStrategy.js:31`, `PhaseTransitionStrategy.js:197`
**Issue:** `{ player1: currentState.placedSections, player2: currentState.opponentPlacedSections }` assembled identically 4 times.
**Fix:** Add `ctx.getPlacedSections()` to ActionContext interface.

#### M3. Duplicated inline `<style>` across 3 screens
**Files:** `DroneSelectionScreen.jsx:277`, `DeckSelectionScreen.jsx:390`, `ShipPlacementScreen.jsx:369`
**Issue:** Identical CSS for `.hexagon`, `.font-orbitron`, `.font-exo` copy-pasted. Per CODE_STANDARDS: shared styles used by 3+ components go in `src/styles/`.
**Fix:** Move to `src/styles/phase-screens.css`.

#### M4. PhaseManager constructor duplicates reset() body
**File:** `src/managers/PhaseManager.js:41-73 vs 351-388`
**Issue:** Constructor initializes all state with same literals as `reset()`. Maintenance hazard.
**Fix:** Have constructor call `this.reset()` after setting `gameStateManager` and `isAuthority`.

#### M5. `_localGameMode` fragile caching in GameClient
**File:** `src/client/GameClient.js:89-92`
**Issue:** Cached on first response, never updated. `getState()` is synchronous in-memory — caching saves negligible cost with staleness risk.
**Fix:** Remove cache, read `this.getState().gameMode` each time.

#### M6. `hadAnnouncements` return value never used
**File:** `src/client/GameClient.js:76, 239`
**Issue:** Returned from `_extractAndQueueAnnouncements` but never referenced after destructuring.
**Fix:** Remove from return value and destructuring.

#### M7. Duplicated "remove played card from snapshot" (3 occurrences)
**File:** `src/logic/cards/EffectChainProcessor.js:525-535, 539-549, 571-578`
**Issue:** Same filter-from-hand + push-to-discard pattern appears three times.
**Fix:** Extract `_removeCardFromSnapshot(playerStates, playerId, card)` helper.

#### M8. Duplicated return shape in executeChainMovement
**File:** `src/logic/cards/EffectChainProcessor.js:620-658`
**Issue:** SINGLE_MOVE and MULTI_MOVE branches produce identical return object shape (~30 lines duplicated).
**Fix:** Extract shared return-shape mapping; branch only selects which execute method to call.

#### M9. `showWinnerModalCallback` empty function
**File:** `src/managers/ActionProcessor.js:647-649`
**Issue:** Creates a no-op callback passed to `WinConditionChecker`. Dead code.
**Fix:** Pass `null` or remove from `WinConditionChecker` interface if never needed.

#### M10. Module-level singleton for EffectChainProcessor
**File:** `src/logic/actions/CardActionStrategy.js:28-32`
**Issue:** Lazy singleton with `getChainProcessor()` — unnecessary complexity since `EffectChainProcessor` has no shared mutable state.
**Fix:** Replace with `const chainProcessor = new EffectChainProcessor()` at module scope.

#### M11. Re-export of `stripChainFields` from EffectChainProcessor
**File:** `src/logic/cards/EffectChainProcessor.js:692`
**Issue:** Imported from `chainConstants.js` and re-exported. Only consumer is the test file.
**Fix:** Have test import directly from `chainConstants.js`.

### Logging Cleanup

#### M12. Verbose CommitmentStrategy logging
**File:** `src/logic/actions/CommitmentStrategy.js:70-86, 136-153, 157-168`
**Issue:** 6 `debugLog` calls in first 25 lines, overlapping content across COMMIT_TRACE/COMMITMENTS/SHIELD_CLICKS.
**Fix:** Consolidate to 1 entry log, 1 stored log, 1 completion log.

#### M13. Verbose GameClient._onResponse logging
**File:** `src/client/GameClient.js:79-114`
**Issue:** Three separate `debugLog` blocks with overlapping content. Violates spirit of "once per event."
**Fix:** Consolidate to single ANIM_TRACE log with conditional trigger fields.

#### M14. Verbose SinglePlayerCombatInitializer diagnostic logging
**File:** `src/logic/singlePlayer/SinglePlayerCombatInitializer.js` (throughout)
**Issue:** ~30 `debugLog` calls across 370 lines. Several near-duplicates and DIAGNOSTIC-labeled artifacts.
**Fix:** Consolidate redundant calls. Remove DIAGNOSTIC-labeled logs.

#### M15. Debug logging in render path (3 screens)
**Files:** `DeckSelectionScreen.jsx:336`, `DroneSelectionScreen.jsx:232`, `ShipPlacementScreen.jsx:290`
**Issue:** `debugLog` calls in render body fire on every React re-render. Also contain duplicated `localPlayerId` keys.
**Fix:** Guard with useRef-based dedup or move to useEffect.

#### M16. Deprecated debug categories still present
**File:** `src/utils/debugLogger.js:29-37`
**Issue:** `MULTIPLAYER`, `P2P_CONNECTION`, `BROADCAST_TIMING` marked deprecated with replacements active.
**Fix:** Remove the three deprecated categories.

#### M17. Many trace categories left enabled
**File:** `src/utils/debugLogger.js:51,82-101,139`
**Issue:** 12+ trace categories set to `true`. Per CLAUDE.md, only categories relevant to current debugging should be enabled.
**Fix:** Disable all trace categories by default.

### Screens

#### M18. `WaitingForOpponentScreen` missing placement phase text
**File:** `src/components/screens/DroneSelectionScreen.jsx:55-56`
**Issue:** Only handles `droneSelection` and `deckSelection` in phase text. `ShipPlacementScreen` passes `phase="placement"` → renders empty paragraph.
**Fix:** Add placement phase text or accept a `waitingMessage` prop.

---

## Discarded — Reviewed, Not Actioned

| # | Finding | Rationale |
|-|-|-|
| D1 | Arrow function vs `function` keyword for exports | CODE_STANDARDS does not mandate this. No rule exists. |
| D2 | `handleFooterViewToggle` and similar hook wrappers | Standard React pattern for stable callback references via useCallback. Not unnecessary indirection. |
| D3 | Strategy interface inconsistency (different arg signatures) | Low impact, would require touching many files for marginal benefit. |
| D4 | `placedSections.player1 \|\| placedSections` fallback in DeploymentProcessor | Defensive code that needs investigation before removal — may have valid callers passing different shapes. |
| D5 | `Math.random()` for room codes in P2PManager | Network code with no determinism requirement. Acceptable for ephemeral 6-digit codes. |
| D6 | `Math.random()` for game seed in GameStateManager/SPCI | Intentional — initial seed requires non-deterministic source. Add comment only. |
| D7 | `Date.now()` for triggerSyncId in ActionProcessor | Used for correlation within a single action batch, not uniqueness. Same-ID-per-batch is correct behavior. |
| D8 | `Date.now()` timestamps in animation payloads | Informational timestamps, not used for deduplication or keying. |
| D9 | `resolveAttack` 250ms delay in useResolvers | UI timing delay — needs investigation before removing. Not clearly dead. |
| D10 | `HostGameServer.processAction` pass-through | Intentional abstraction layer for future host-specific pre/post processing. |
| D11 | `getPlayerView` in HostGameServer | May have callers outside reviewed files. Verify before removing. |
| D12 | `_actionContext` caching in ActionProcessor | Functionally correct, closures resolve at call time. Low risk. |
| D13 | GameStateManager at 1100 lines | Already well-decomposed via extracted managers. Remaining core is cohesive. |
| D14 | Asymmetric test verbosity (could use `it.each`) | Would improve conciseness but existing tests are clear. Low ROI. |
| D15 | `resolveRef` vs `resolveRefFromSelections` similarity | Both ~15 lines, clear and readable. Unification costs more readability than it saves. |
| D16 | GameFlowManager singleton fragility | Known pattern, tests handle correctly with `beforeEach` cleanup. |
| D17 | `async` in Promise executor (CommitmentStrategy) | setTimeout is the async boundary. Pattern is correct in this case. |
| D18 | GSM internal access from hooks (useGameLifecycle, useMultiplayerSync) | Valid concern but requires broader refactor of the query/subscription API. Track in FUTURE_IMPROVEMENTS rather than this pass. |

---

## Implementation Order

1. **Critical (C1)** — AttackProcessor input mutation
2. **High dead code (H1–H8)** — Bulk removal pass, low risk
3. **High architectural (H9–H10)** — Hardcoded player2, CommitmentStrategy mutation
4. **High logging (H11–H12)** — Quick cleanup
5. **High tests (H13–H14)** — Test quality improvements
6. **Medium** — Work through M1–M18 in file order

All changes verified with `npx vitest run` after each logical group.
