# Master Codebase Cleanup & Refactoring Plan

> Created: 2026-02-24. Living document — update status after each session.

## Context

Full codebase audit completed (Feb 23): ~500 files, ~433 issues catalogued in `Design/CODEBASE_AUDIT.md`. Major refactoring done (10 god objects, 72% line reduction, test migration). This plan addresses ALL remaining issues through batched, high-leverage work sessions.

## What's Already Done

- 10 god objects refactored (29,243 → 8,071 lines)
- Test migration complete (151 files → `__tests__/`, 220 test files, 3748 passing)
- 11 domain-aware utils migrated to `logic/` (STD-CHALLENGE-04)
- Magic number extraction + `crypto.randomUUID()` migration (STD-CHALLENGE-07)
- 8 bug fixes (5 high, 3 medium)
- CODE_STANDARDS.md updated

## Phase Overview

| Phase | Description | Status |
|-|-|-|
| 0 | Documentation Setup | Done |
| A | Critical Bugs | Done |
| B | Dead Code & Comment Cleanup | Done |
| B2 | Console.log Migration | Done |
| C | Deduplication | Done |
| D | Data File Purity | Done |
| E | Structural Moves | Done |
| F | Large File Decomposition | Done |
| G | Bugs + Quick Wins | Done |
| H | Deduplication (Round 2) | Done (partial) |
| J | Code Quality / SMELL Fixes | Done (partial) |
| K | Documentation + SIZE Tracking | Done |
| L | Standards Compliance + Remaining Fixes | Done |
| M | Audit Closure — Triage All Findings | Done |

---

## Phase 0: Documentation Setup

**Status: Done**

- [x] Create `MASTER_PLAN.md` (this file)
- [x] Update `CLAUDE.md` with master plan references
- [x] Commit documentation setup

---

## Phase A: Critical Bugs

**Status: Done**

**Goal:** Fix all runtime bugs that affect game behavior. No structural changes.

### Batch A1 — Crash/corruption bugs (4 items)
- [x] `aiData.js:182,216` — `CARD053_Enhanced` wrong casing → broken AI card lookups
- [x] `aiLogic.js:799` — empty `positiveActionPool` → crash on `undefined`
- [x] `ShipSlotManager.js:362` — fallback `|| 10` should be `|| 200` (pricing bug)
- [x] `LootGenerator.js:417` — `this.` on imported function → runtime throw

### Batch A2 — Determinism/silent-failure bugs (4 items)
- [x] `HighAlertManager.js:21` — `Math.random()` instead of `SeededRandom`
- [x] `useTacticalEncounters.js:152-153` — `Math.random()` for credits/RNG
- [x] `CommitmentStrategy.js:330` — silent error swallow in AI commitment
- [x] `TargetLockAbilityProcessor.js` — spends energy/ends turn on missing target

### Batch A3 — Medium-severity logic bugs (5 items)
- [x] `AssetPreloader.js:97-100` — `.catch()` defeats `Promise.allSettled`
- [x] `GameStateManager.js:576-588` — async `initializeTestMode` returns sync
- [x] `useShieldAllocation.js:53-71` — over-broad useEffect deps
- [x] `useHangarMapState.js:84` — stale closure on pan coordinates
- [x] `useTacticalExtraction.js:187` — `|| 1` should be `?? 1`

### Batch A4 — Data integrity (3 items)
- [x] `vsModeDeckData.js` — VS_DECK_002/003 identical decklists → created unique Fortress Command deck
- [x] `aiData.js` — card IDs validated, all present in fullCardCollection
- [x] `shipSectionData.js` — `key` properties actively consumed (3 locations), not dead

**Also:** Commit pending deletions (REFACTOR_*.md, PLAN_*.md) and CLAUDE.md updates — done in Phase 0.

**Verification:** `npx vitest run` → 3748 passing, 0 failures.

---

## Phase B: Dead Code & Comment Cleanup

**Status: Done**

**Goal:** Remove dead code and fix comments/naming across the codebase.

### Sweep B1 — Dead code removal
- [x] **Entire files:** `theme/theme.js`, `CorvetteIcon.jsx` deleted. `droneHelpers.js` kept (5 consumers).
- [x] **Dead exports:** `getLanesNotControlled`, `calculateHandLimit`, `DEFAULT_STATE`, `syncGameState` removed. `droneImpact.js`, `laneScoring.js` kept (active). `calculateReallocationDisplayShields` kept (test-validated).
- [x] **Dead imports:** `cardPackData.fullCardCollection` removed. Others kept (active consumers).
- [x] **Dead code blocks:** `WaitingOverlay` import+usage, `csvExport.js` IE10, `seededRandom.js` orphaned JSDoc, `tickerConfig.js MESSAGE_TEMPLATES` — all removed.

### Sweep B2 — Comment & naming cleanup
- [x] Fixed 10 spelling errors in `tutorialData.js`
- [x] Fixed typos in `shipData.js`, `playerDeckData.js`, `vsModeDeckData.js`
- [x] Removed 16 banned `// NEW:` comments across 8 production files
- [x] Fixed `backgrounds.js` indentation + display name
- [x] Fixed `vsModeDeckData.js` indentation

**Verification:** `npx vitest run` → 3748 passing. `npx vite build` → clean.

---

## Phase B2: Console.log Migration

**Status: Done**

**Goal:** Replace ~200 raw `console.log/warn/error` calls with `debugLog()` across ~64 files.

Excluded: `debugLogger.js` (6, intentional), `modalShowcaseHelpers.js` (79, dev-only).

**Result:** 193 console calls replaced across 61 files. 17 new `debugLog` imports added. Zero remaining console calls in production code.

**Verification:** `npx vitest run` → 3748 passing. `npx vite build` → clean.

---

## Phase C: Deduplication

**Status: Done**

**Goal:** Extract shared code from copy-pasted blocks.

### Batch C1 — Shared constants & utilities (low risk)
- [x] Extract `SEQUENTIAL_PHASES` constant (defined 5x across 4 files) → canonical in `gameUtils.js`, PhaseManager + GameFlowManager import it
- [x] Extract `addTeleportingFlags` to `utils/teleportUtils.js` (ActionProcessor ↔ GuestMessageQueueService)
- [x] Remove `RARITY_COLORS` duplicate from `cardPackData.js` → 4 consumers redirected to `rarityColors.js`
- [x] Extract `arraysMatch`/`dronesMatch` to `utils/stateComparisonUtils.js`
- [x] Replace 7x `JSON.parse(JSON.stringify(...))` with `structuredClone` in `saveGameFactory.js`

### Batch C2 — Component-level deduplication (medium risk)
- [x] Extract `ShipComponentSection` → data-driven map in `DeckBuilderLeftPanel.jsx` (3 blocks → 1 loop)
- [x] Extract `DetectionSection` local component in `HexInfoPanel.jsx` (3 identical renders → 1 component)
- [x] Extract `ShipAbilityIcon` to shared `components/ui/ShipAbilityIcon.jsx`
- [x] Extract `IconPOI` to shared `components/icons/IconPOI.jsx`

### Batch C3 — Hook-level deduplication (higher risk)
- [x] Extract `calculateCostReminderArrow` to `gameUtils.js` (useDragMechanics ↔ useClickHandlers)
- [x] Extract `getFriendlyDroneTargets` to `logic/droneUtils.js` (useResolvers, useClickHandlers, useDragMechanics)
- [x] Collapse 4x commitment check block in `useMultiplayerSync` to loop (~100 lines → ~20 lines)
- [x] Extract `collectAndStoreSalvageLoot`/`initiateSalvageCombat` helpers in `useTacticalEncounters`

**Verification:** `npx vitest run` → 3748 passing. `npx vite build` → clean.

---

## Phase D: Data File Purity

**Status: Done**

**Goal:** Extract logic from 8 data files to `src/logic/` per CODE_STANDARDS.md.

| Data file | Functions | Target | Done |
|-|-|-|-|
| cardPackData.js | `createSeededRNG`, `getPackCostForTier`, `generateRandomShopPack` | `logic/cards/cardPackHelpers.js` | [x] |
| salvageItemData.js | `findEligibleItems`, `selectSalvageItem`, `generateSalvageItemFromValue` | `logic/salvage/salvageItemHelpers.js` | [x] |
| missionData.js | `getMissionById`, `getIntroMissions`, `getMissionsByCategory` | `logic/missions/missionHelpers.js` | [x] |
| tutorialData.js | `getTutorialByScreen`, `getAllTutorialScreenIds`, `createDefaultTutorialDismissals` | `logic/tutorial/tutorialHelpers.js` | [x] |
| reputationRewardsData.js | `getLevelData`, `getNewlyUnlockedLevels` | `logic/reputation/reputationRewardsHelpers.js` | [x] |
| shipData.js | `getShipById`, `getAllShips`, `getDefaultShip` | co-located `data/shipDataHelpers.js` | [x] |
| tacticalItemData.js | `getTacticalItemById`, etc. | co-located `data/tacticalItemDataHelpers.js` | [x] |
| aiCoresData.js | `calculateAICoresDrop`, `getAICoresCost` | `logic/economy/aiCoresHelpers.js` | [x] |

All 8 data files now have backward-compatible re-exports. 20 functions extracted total.

**Verification:** `npx vitest run` → 3748 passing. `npx vite build` → clean.

---

## Phase E: Structural Moves

**Status: Done**

**Goal:** Implement decided standards challenges and fix misplaced files.

### Batch E1 — Misplaced files (4 items, low risk)
- [x] `utils/chartUtils.jsx` → `components/ui/ChartUtils.jsx`
- [x] `services/testGameInitializer.js` → `test/helpers/testGameInitializer.js`
- [x] `logic/aiLogic.js` → `logic/ai/aiLogic.js`
- [x] `logic/cards/glossaryAnalyzer.js` → `logic/glossary/glossaryAnalyzer.js`

### Batch E2 — Flatten `logic/effects/` (STD-CHALLENGE-02)
- [x] `destroy/DestroyEffectProcessor.js` → `effects/DestroyEffectProcessor.js`
- [x] `detection/IncreaseThreatEffectProcessor.js` — already at `effects/` (no subdir)
- [x] `marking/MarkingEffectProcessor.js` — already at `effects/` (no subdir)
- [x] `mines/MineTriggeredEffectProcessor.js` — already at `effects/` (no subdir)
- [x] `movement/MovementEffectProcessor.js` → `effects/MovementEffectProcessor.js`
- [x] `stat_modification/ModifyStatEffectProcessor.js` — already at `effects/` (no subdir)
- [x] `tokens/TokenCreationProcessor.js` — already at `effects/` (no subdir)

Keep as subdirectories (multi-file): `cards/`, `conditional/`, `damage/`, `energy/`, `healing/`, `meta/`, `state/`, `upgrades/`

### Batch E3 — TODO triage
- [x] Review 23 actionable TODOs: 3 stale deleted, 6 new items added to FUTURE_IMPROVEMENTS.md (#33-38), rest kept (valid notes/scaffolding)

### Batch E4 — Hook co-location (STD-CHALLENGE-01, HIGH RISK)

*E4a — TacticalMapScreen hooks:*
- [x] All `useTactical*` hooks already co-located in `screens/TacticalMapScreen/hooks/`

*E4b — Screen-specific hooks:*
- [x] `useHangarData`, `useHangarMapState` already in `screens/HangarScreen/hooks/`
- [x] `useDeckBuilderData` already in `screens/DeckBuilder/hooks/`

*E4c — App-level hooks triage:*
- [x] Decision: keep in `src/hooks/`. 8 App-only + 7 shared hooks stay together — App.jsx isn't in a directory, so `src/App/hooks/` would fragment without benefit

**Verification:** Full test suite + build after each sub-batch.

---

## Phase F: Large File Decomposition

**Status: Done**

**Goal:** Address remaining 800+ line files when complexity impedes development.

**Priority targets:**
- [x] `InventoryModal.jsx` (1270→211) — extracted 9 files to `inventory/` subdirectory
- [x] `aiLogic.js` (1209→14) — moved function bodies into existing decision stubs
- [x] `RewardManager.js` (1028→863) — extracted CardSelectionPipeline + SeededRNG to `logic/loot/`
- [x] `GameHeader.jsx` (983→628) — extracted 4 sub-components to `gameheader/` subdirectory
- [x] `useAnimationSetup.js` (924→90) — split into 4 handler registration modules

**Deferred (rationale in FUTURE_IMPROVEMENTS.md):**
- `useDragMechanics.js` (1653) — #19, shared state prevents split
- `App.jsx` (1332) — #21, resolved, orchestration root
- `GameFlowManager.js` (1673) — #11, cohesive orchestration
- `useClickHandlers.js` (956) — #22, shared params
- `useTacticalEncounters.js` (931) — #15, circular deps
- `GameStateManager.js` (1068) — #6, post-extraction residual

---

## Phase G: Bugs + Quick Wins

**Status: Done**

**Goal:** Fix remaining bugs, dead code, comments, naming, edge cases, and import issues.

### G1 — Critical & High-Severity Bugs (7 items)
- [x] AI determinism: 4x Math.random() → SeededRandom in actionDecision.js + deploymentDecision.js
- [x] State mutation: CommitmentStrategy.clearPhaseCommitments builds new object
- [x] Animation: OverflowProjectile hardcoded progress=0.5 → CSS transition
- [x] Error handling: useInterception fire-and-forget async + fragile destructuring
- [x] Logic: droneAttack.js Math.min→Math.max for penalty cap

### G2 — Dead Code + Comments + Names (~35 items)
- [x] AI dead code: adjustmentPasses/index.js, keywordHelpers 7 exports, droneImpact 2 exports, laneScoring 1 export
- [x] Logic dead code: ShieldResetUtils function, MovementController 2 methods
- [x] Component dead code: 5 files (unused styles, params, props, imports, constants)
- [x] App/hooks/config: App.jsx breadcrumbs, useGameLifecycle 3x unused results, devConfig dual export, soundConfig wrapper
- [x] Comments: debugLogger 35+ stale annotations, pointsOfInterestData TBD, AI decision stubs, banned comments
- [x] Names: hanger→hangar, AngularBandsBackground→MorphingBackground

### G3 — Edge Cases + Import Fixes (9 items)
- [x] 6 edge case guards: useDragMechanics, useClickHandlers name→id, useTacticalEncounters, useDeckBuilderData useMemo, testGameInitializer, useMultiplayerSync throttle
- [x] 3 import fixes: InterceptionProcessor gameLogic→gameEngineUtils, useClickHandlers dead import, quickDeploy barrel (already clean)

**Verification:** `npx vitest run` → 3745 passing (3 tests removed with dead function), 0 failures.

---

## Phase H: Deduplication

**Status: Done**

**Goal:** Extract shared code from copy-pasted blocks.

### H1 — Logic-layer dedup
- [x] ExtractionController custom LCG → SeededRandom
- [x] AbilityResolver dead resolveShipRecallEffect removed
- [x] AIPhaseProcessor SEQUENTIAL_PHASES → import from gameUtils
- [x] Extract shared calculateDamageByType to logic/utils/damageCalculation.js (3 consumers)
- [x] Consolidate processOverflowDamage with shared damage calc in DamageEffectProcessor
- [x] Extract applyDestroyCleanup helper in DestroyEffectProcessor (5 sites)

### H2 — Manager/Service dedup
- [x] LaneControlCalculator: countLanesControlled → getLanesControlled().length
- [x] P2PManager: extract _requireConnection() guard
- [x] ShipSlotManager: extract EMPTY_SLOT_TEMPLATE constant
- [x] testGameInitializer: extract createShipSectionState() helper

### H3a — Hook dedup
- [x] useShieldAllocation: handleCancelReallocation delegates to clearReallocationState
- [x] useTacticalLoot: extract resolveAndResumeJourney helper
- [x] useTacticalExtraction: extract showExtractionResult helper (3 sites)
- [x] useTacticalWaypoints: extract findWeightedPath helper
- [x] useTacticalEncounters: extract initiateBlueprintCombat helper
- [x] useGameLifecycle: extract clearUIState + commitMandatoryPhase helpers

### H3b — Component dedup
- [x] Merge HiddenShipCard + HiddenShipSectionCard → HiddenCard with variant prop
- [x] HealEffect: extract SIZE_CONFIG + getSizeTier helpers
- [x] ViewDeckModal: unify buildGroups helper (~50 lines eliminated)
- [x] csvExport: extract shared DECISION_CSV_HEADERS + builders

### H3c — Misc dedup
- [x] gameUtils: remove shuffleArray wrapper
- [x] cardBorderUtils: import from cardTypeStyles (eliminate duplicate mapping)
- [x] cardDrawUtils: consolidate player 1/2 blocks
- [x] AttackProcessor: cache getLaneOfDrone result

**Verification:** `npx vitest run` → 3745 passing, 0 failures.

---

## Phase I: PURITY Migration

**Status: Done**

**Goal:** Move domain logic out of utils/ and components into logic/.

### I1 — Utils → logic/ migration
- [x] gameUtils phase functions → logic/phase/phaseDisplayUtils.js (7 consumers)
- [x] cardDrawUtils → logic/cards/cardDrawUtils.js (1 consumer)
- [x] cardBorderUtils → logic/cards/cardBorderUtils.js (4 consumers)
- [x] deckExportUtils → logic/cards/deckExportUtils.js (8 consumers)
- All backward-compat re-exports in place

### I3 — Component PURITY extraction
- [x] HexInfoPanel getHexPreview → logic/map/hexPreview.js
- [x] HexGridRenderer tacticalBackgrounds → data/tacticalBackgrounds.js
- [x] useDeckBuilderData 6 pure helpers → logic/cards/deckBuilderHelpers.js
- [x] useClickHandlers ability routing → logic/combat/abilityConfig.js
- [x] RepairBayScreen 5 domain functions → logic/singlePlayer/repairHelpers.js
- [x] QuickDeployManager validation → logic/quickDeploy/quickDeployValidationHelpers.js

**Verification:** `npx vitest run` → 3745 passing, 0 failures.

---

## Phase J: Code Quality — SMELL Fixes

**Status: Done**

**Goal:** Gate expensive debug code behind DEV mode, replace alerts, extract magic numbers, fix smells.

### J1a — Magic number extraction
- [x] Extract magic numbers to named constants across 12 files (FlyingDrone, useDragMechanics, useResolvers, useTacticalEscape, useTacticalPostCombat, useTacticalSubscriptions, useHangarData, useHangarMapState, gameDataCache)

### J1b — Performance
- [x] Gate new Error().stack behind DEV: GameStateManager, useCardSelection (2x), OptimisticActionService
- [x] Gate debug intervals behind DEV: useGameData, NewsTicker, PhaseAnnouncementOverlay

### J2 — Quality fixes
- [x] Replace alert(): LobbyScreen (3x), useGameLifecycle (1x)
- [x] devConfig: derive DEV_MODE from import.meta.env.DEV
- [x] Misc: useDragMechanics stale line number, useMultiplayerSync unused vars, useTacticalEscape shadowing, useShieldAllocation shadowed var, ModalLayer debugLog in render, CardVisualEffect dead keyframes

### J3 — Remaining SMELL
- [x] RunLifecycleManager.startRun: convert 5 positional params to options object + update all callers

**Verification:** `npx vitest run` → 3745 passing, 0 failures.

---

## Phase K: Documentation + Tracking

**Status: Done**

**Goal:** Track SIZE items, triage TODOs, update standards.

- [x] K1: All 800+ line files added to FUTURE_IMPROVEMENTS.md SIZE tracking section (18 files)
- [x] K3: CSS strategy added to CODE_STANDARDS.md (STD-CHALLENGE-03)
- [x] 240 total [FIXED] markers in CODEBASE_AUDIT.md (up from 139 at session start)

---

## Phase L: Standards Compliance + Remaining Fixes

**Status: Done**

**Goal:** Fix standards violations from Phases G-K, mark already-resolved audit items, handle remaining actionable fixes.

- [x] L1: Delete 3 zero-consumer re-export stubs, remove dead gameUtils re-exports, inline abilityConfig.js + tacticalBackgrounds.js into sole consumers
- [x] L2: Mark 5 already-resolved audit items [FIXED], resolve FI #8 (ShipSlotManager repair cost)
- [x] L3: Remove unused FastForward import from debugLogger, normalize background ID casing, mark 4 more audit items [FIXED]
- Net file reduction: -5 files (3 re-export stubs + 2 inlined sole-consumer modules)

---

## Phase M: Audit Closure — Triage All Findings

**Status: Done**

**Goal:** Give every remaining untagged finding in CODEBASE_AUDIT.md a final disposition. No code changes — documentation only.

- [x] Verify 2 uncertain items (LaneTargetingProcessor BY-DESIGN, useResolvers deps ACCEPTABLE)
- [x] Mark 12 items `[FIXED]` (confirmed fixed in earlier phases but unmarked)
- [x] Mark 18 items `[DEFERRED]` (valid concerns tracked in FUTURE_IMPROVEMENTS #41-56)
- [x] Mark 124 items `[CLOSED]` with reason codes:
  - `SIZE-TRACKED` (33) — already tracked in FUTURE_IMPROVEMENTS SIZE table
  - `ACCEPTABLE` (46) — acceptable pattern, no runtime impact
  - `TEST-OOS` (10) — test coverage out of scope for refactoring effort
  - `TODO-FEATURE` (10) — feature stubs, not debt
  - `SUMMARY` (11) — section summaries duplicating individual findings
  - `BY-DESIGN` (7) — intentional architecture decisions
  - `DEV-ONLY` (6) — dev/test tooling, low priority
  - `DUP-ACCEPTABLE` (1) — cross-file similarity, not copy-paste

**Final audit counts:** 208 [FIXED], 1 [INCORRECT], 18 [DEFERRED], 124 [CLOSED] = 351 total tagged findings. Zero untagged. Audit complete.

---

## Verification Protocol (Every Session)

1. `npx vitest run` → 0 failures (mandatory per CLAUDE.md)
2. `npx vite build` → clean
3. Manual: app loads, deploy drone, play card, complete combat round, save/load

## Tracking Updates Per Commit

- `Design/CODEBASE_AUDIT.md` — prefix fixed findings with `[FIXED]`
- `Design/Technical Debt Refactor/FUTURE_IMPROVEMENTS.md` — resolve items when fixed, add when deferred
- `Design/Technical Debt Refactor/CURRENT_STATE_AUDIT.md` — update metrics after each phase
