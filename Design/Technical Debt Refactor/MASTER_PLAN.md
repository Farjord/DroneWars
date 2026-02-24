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
| A | Critical Bugs | In Progress |
| B | Dead Code & Comment Cleanup | Pending |
| B2 | Console.log Migration | Pending |
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

**Status: In Progress**

**Goal:** Fix all runtime bugs that affect game behavior. No structural changes.

### Batch A1 — Crash/corruption bugs (4 items)
- [ ] `aiData.js:182,216` — `CARD053_Enhanced` wrong casing → broken AI card lookups
- [ ] `aiLogic.js:799` — empty `positiveActionPool` → crash on `undefined`
- [ ] `ShipSlotManager.js:362` — fallback `|| 10` should be `|| 200` (pricing bug)
- [ ] `LootGenerator.js:417` — `this.` on imported function → runtime throw

### Batch A2 — Determinism/silent-failure bugs (4 items)
- [ ] `HighAlertManager.js:21` — `Math.random()` instead of `SeededRandom`
- [ ] `useTacticalEncounters.js:152-153` — `Math.random()` for credits/RNG
- [ ] `CommitmentStrategy.js:330` — silent error swallow in AI commitment
- [ ] `TargetLockAbilityProcessor.js` — spends energy/ends turn on missing target

### Batch A3 — Medium-severity logic bugs (5 items)
- [ ] `AssetPreloader.js:97-100` — `.catch()` defeats `Promise.allSettled`
- [ ] `GameStateManager.js:576-588` — async `initializeTestMode` returns sync
- [ ] `useShieldAllocation.js:53-71` — over-broad useEffect deps
- [ ] `useHangarMapState.js:84` — stale closure on pan coordinates
- [ ] `useTacticalExtraction.js:187` — `|| 1` should be `?? 1`

### Batch A4 — Data integrity (3 items)
- [ ] `vsModeDeckData.js` — VS_DECK_002/003 identical decklists (copy-paste bug?)
- [ ] `aiData.js` — card IDs not validated against fullCardCollection
- [ ] `shipSectionData.js` — verify if `key` properties are still consumed

**Also:** Commit pending deletions (REFACTOR_*.md, PLAN_*.md) and CLAUDE.md updates.

**Verification:** `npx vitest run` → 0 failures.

---

## Phase B: Dead Code & Comment Cleanup

**Status: Pending**

**Goal:** Remove dead code and fix comments/naming across the codebase.

### Sweep B1 — Dead code removal (~29 items)
- [ ] **Entire files:** `theme/theme.js`, `ai/helpers/droneHelpers.js`, `ships/CorvetteIcon.jsx`
- [ ] **Dead exports:** `droneImpact.js`, `laneScoring.js`, `LaneControlCalculator.getLanesNotControlled`, `cardDrawUtils.calculateHandLimit`, `ShieldResetUtils.calculateReallocationDisplayShields`, `RewardManager.DEFAULT_STATE`, `P2PManager.syncGameState`
- [ ] **Dead imports/props:** `cardPackData.fullCardCollection`, `useAnimationSetup FlashEffect/CardVisualEffect`, `ReputationRewardModal.getLevelData`, `useClickHandlers.extractDroneNameFromId`
- [ ] **Dead code blocks:** `App.jsx` breadcrumb comments + WaitingOverlay, `csvExport.js` IE10 compat, `seededRandom.js` orphaned JSDoc, `tickerConfig.js MESSAGE_TEMPLATES`

### Sweep B2 — Comment & naming cleanup (~18 items)
- [ ] Fix 9 spelling errors in `tutorialData.js` user-facing text
- [ ] Fix typos in `shipData.js`, `playerDeckData.js`, `vsModeDeckData.js`
- [ ] Remove banned `// NEW:`, `// FIXED:`, `// CHANGED` comments across 5 files
- [ ] Remove stale scaffolding/debug comments
- [ ] Fix `backgrounds.js` inconsistent ID casing
- [ ] Fix `vsModeDeckData.js` indentation

**Verification:** `npx vitest run` → 0 failures. `npx vite build` → clean.

---

## Phase B2: Console.log Migration

**Status: Pending**

**Goal:** Replace ~200 raw `console.log/warn/error` calls with `debugLog()` across ~64 files.

Exclude: `debugLogger.js` (intentional), `modalShowcaseHelpers.js` (dev-only), `componentDidCatch` in error boundaries (STD-CHALLENGE-05).

**Top 8 files (~80 violations):**
- `P2PManager.js` (20), `SaveGameService.js` (11), `useAnimationSetup.js` (9), `cardDrawUtils.js` (8), `MovementController.js` (7), `AnimationManager.js` (6), `PhaseManager.js` (5), `DetectionManager.js` (5)

**Remaining ~54 files** with 1-3 violations each.

**Verification:** `npx vitest run` → 0 failures. `npx vite build` → clean.

---

## Phase C: Deduplication

**Status: Pending**

**Goal:** Extract shared code from copy-pasted blocks.

### Batch C1 — Shared constants & utilities (low risk)
- [ ] Extract `SEQUENTIAL_PHASES` constant (defined 5x across 4 files)
- [ ] Extract `addTeleportingFlags` to shared utility (ActionProcessor ↔ GuestMessageQueueService)
- [ ] Remove `RARITY_COLORS` duplicate from `cardPackData.js` → use `rarityColors.js`
- [ ] Extract `arraysMatch`/`dronesMatch` from GuestMessageQueueService to shared module
- [ ] Replace 6x `JSON.parse(JSON.stringify(...))` with `structuredClone` in `saveGameFactory.js`

### Batch C2 — Component-level deduplication (medium risk)
- [ ] Extract `ShipComponentSection` helper from `DeckBuilderLeftPanel.jsx` (3 identical blocks)
- [ ] Extract `DetectionMeter` component from `HexInfoPanel.jsx` (3 identical renders)
- [ ] Merge `ShipAbilityIcon` from `ShipSection.jsx` + `ShipSectionCompact.jsx`
- [ ] Extract `IconPOI` from `SalvageModal.jsx` + `POIEncounterModal.jsx`

### Batch C3 — Hook-level deduplication (higher risk)
- [ ] Extract cost-reminder arrow logic shared between `useDragMechanics` and `useClickHandlers`
- [ ] Extract friendly-drones calculation shared across `useResolvers`, `useClickHandlers`, `useDragMechanics`
- [ ] Collapse 4x commitment check block in `useMultiplayerSync` to loop
- [ ] Extract shared salvage/blueprint handler patterns in `useTacticalEncounters`

**Verification:** Full test suite + manual smoke test after each batch.

---

## Phase D: Data File Purity

**Status: Pending**

**Goal:** Extract logic from 8 data files to `src/logic/` per CODE_STANDARDS.md.

| Data file | Functions | Target | Done |
|-|-|-|-|
| cardPackData.js | `createSeededRNG`, `getPackCostForTier`, `generateRandomShopPack` | `logic/cards/cardPackHelpers.js` | [ ] |
| salvageItemData.js | `findEligibleItems`, `selectSalvageItem`, `generateSalvageItemFromValue` | `logic/salvage/salvageItemHelpers.js` | [ ] |
| missionData.js | `getMissionById`, `getIntroMissions`, `getMissionsByCategory` | `logic/missions/missionHelpers.js` | [ ] |
| tutorialData.js | `getTutorialByScreen`, `getAllTutorialScreenIds`, `createDefaultTutorialDismissals` | `logic/tutorial/tutorialHelpers.js` | [ ] |
| reputationRewardsData.js | `getLevelData`, `getNewlyUnlockedLevels` | `logic/reputation/reputationRewardsHelpers.js` | [ ] |
| shipData.js | `getShipById`, `getAllShips`, `getDefaultShip` | co-located `shipDataHelpers.js` | [ ] |
| tacticalItemData.js | `getTacticalItemById`, etc. | co-located `tacticalItemDataHelpers.js` | [ ] |
| aiCoresData.js | `calculateAICoresDrop`, `getAICoresCost` | `logic/economy/aiCoresHelpers.js` | [ ] |

**Verification:** Full test suite + build after each extraction.

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
