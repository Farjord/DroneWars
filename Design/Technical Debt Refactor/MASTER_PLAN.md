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
| C | Deduplication | Pending |
| D | Data File Purity | Pending |
| E | Structural Moves | Pending |
| F | Large File Decomposition | Pending |

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

**Status: Pending**

**Goal:** Implement decided standards challenges and fix misplaced files.

### Batch E1 — Misplaced files (4 items, low risk)
- [ ] `utils/chartUtils.jsx` → `components/ui/ChartUtils.jsx`
- [ ] `services/testGameInitializer.js` → `test/helpers/testGameInitializer.js`
- [ ] `logic/aiLogic.js` → `logic/ai/aiLogic.js`
- [ ] `utils/glossaryAnalyzer.js` → `logic/glossary/glossaryAnalyzer.js`

### Batch E2 — Flatten `logic/effects/` (STD-CHALLENGE-02)
- [ ] `destroy/DestroyEffectProcessor.js` → `effects/DestroyEffectProcessor.js`
- [ ] `detection/IncreaseThreatEffectProcessor.js` → `effects/IncreaseThreatEffectProcessor.js`
- [ ] `marking/MarkingEffectProcessor.js` → `effects/MarkingEffectProcessor.js`
- [ ] `mines/MineTriggeredEffectProcessor.js` → `effects/MineTriggeredEffectProcessor.js`
- [ ] `movement/MovementEffectProcessor.js` → `effects/MovementEffectProcessor.js`
- [ ] `stat_modification/ModifyStatEffectProcessor.js` → `effects/ModifyStatEffectProcessor.js`
- [ ] `tokens/TokenCreationProcessor.js` → `effects/TokenCreationProcessor.js`

Keep as subdirectories (multi-file): `cards/`, `conditional/`, `damage/`, `energy/`, `healing/`, `meta/`, `state/`, `upgrades/`

### Batch E3 — TODO triage
- [ ] Review 23 actionable TODOs: add to FUTURE_IMPROVEMENTS.md or delete if stale

### Batch E4 — Hook co-location (STD-CHALLENGE-01, HIGH RISK)

*E4a — TacticalMapScreen hooks:*
- [ ] Remaining `useTactical*` hooks → `screens/TacticalMapScreen/hooks/`

*E4b — Screen-specific hooks:*
- [ ] `useHangarData`, `useHangarMapState` → `screens/HangarScreen/hooks/`
- [ ] `useDeckBuilderData` → `screens/DeckBuilder/hooks/`

*E4c — App-level hooks triage:*
- [ ] Decide: keep in `src/hooks/` or create `src/App/hooks/`

**Verification:** Full test suite + build after each sub-batch.

---

## Phase F: Large File Decomposition

**Status: Pending**

**Goal:** Address remaining 800+ line files when complexity impedes development.

**Priority targets:**
- [ ] `InventoryModal.jsx` (1270) — extract tab-specific sub-components
- [ ] `aiLogic.js` (1209) — decompose god functions after move to `logic/ai/`
- [ ] `RewardManager.js` (1028) — extract card selection pipeline
- [ ] `GameHeader.jsx` (983) — extract phase-specific button groups
- [ ] `useAnimationSetup.js` (899) — split 890-line useEffect into handler registrations

**Deferred (rationale in FUTURE_IMPROVEMENTS.md):**
- `useDragMechanics.js` (1653) — #19, shared state prevents split
- `App.jsx` (1332) — #21, resolved, orchestration root
- `GameFlowManager.js` (1673) — #11, cohesive orchestration
- `useClickHandlers.js` (956) — #22, shared params
- `useTacticalEncounters.js` (931) — #15, circular deps
- `GameStateManager.js` (1068) — #6, post-extraction residual

---

## Verification Protocol (Every Session)

1. `npx vitest run` → 0 failures (mandatory per CLAUDE.md)
2. `npx vite build` → clean
3. Manual: app loads, deploy drone, play card, complete combat round, save/load

## Tracking Updates Per Commit

- `Design/CODEBASE_AUDIT.md` — prefix fixed findings with `[FIXED]`
- `Design/Technical Debt Refactor/FUTURE_IMPROVEMENTS.md` — resolve items when fixed, add when deferred
- `Design/Technical Debt Refactor/CURRENT_STATE_AUDIT.md` — update metrics after each phase
