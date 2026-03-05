# Codebase Audit

## Meta
- Started: 2026-02-23
- Last Session: 2026-02-23
- Progress: ~500/~500 source files (100%)
- Current Phase: COMPLETE
- Next File: N/A — all phases reviewed
- Test Migration: Complete (151 files moved, 220 total tests in __tests__/, 3748 tests passing)

## Structure Review

> Reviewed: 2026-02-23

### Vital Statistics

| Metric | Count |
|-|-|
| Source files (non-test) | ~500 |
| Test files (all in `__tests__/`) | 220 |
| Tests passing | 3748 |
| Files 800+ lines | 26 |
| Files 400+ lines | 80 |
| Files with 3+ level deep imports | 57 |
| Total source lines (non-test) | ~123k |

### Q1: Are top-level `src/` directories correct?

**Current directories:** `components/`, `config/`, `contexts/`, `data/`, `hooks/`, `logic/`, `managers/`, `network/`, `services/`, `styles/`, `test/`, `theme/`, `utils/`

**Verdict: Mostly sound.** The taxonomy is reasonable for a game of this complexity. Notable observations:

- `network/` contains a single file (`P2PManager.js`). Could live in `services/` given it's an external interface.
- `contexts/` contains a single file (`EditorStatsContext.jsx`). Lightweight; fine for now but could merge into `hooks/` or co-locate with its consumer if it stays solo.
- [FIXED] `theme/` contains a single file (`theme.js`). Could merge into `config/` or `styles/`.
- `assets/` exists but wasn't listed in CODE_STANDARDS.md directory structure — contains static assets.

**Recommendation:** No renames needed. Single-file directories (`network/`, `contexts/`, `theme/`) are acceptable as organizational anchors unless they're known dead-ends.

### Q2: Is `src/test/` appropriate for test infrastructure?

**Contents:** `setup.js` (vitest setup), `helpers/` with `gameStateFactory.js` and `phaseTestHelpers.js`.

**Verdict: Acceptable.** This is test infrastructure (factories, setup), not tests themselves. `src/test/` is referenced by `vite.config.js` (`setupFiles: './src/test/setup.js'`). Moving to project root would require config changes for no real benefit.

**Recommendation:** Keep as-is.

### Q3: Are `managers/` vs `services/` properly differentiated?

**managers/ (24 files):** Stateful orchestration — GameFlowManager, PhaseManager, ActionProcessor, CombatStateManager, etc. These own state and coordinate complex multi-step flows.

**services/ (6 files):** External interfaces — SaveGameService, AssetPreloader, GameDataService, assetManifest, gameDataCache, testGameInitializer.

**Misplaced files:**
- `managers/GuestMessageQueueService.js` (1125 lines) — named "Service" but lives in managers. It's a stateful queue processor that manages message ordering and timing. **It behaves as a manager** (owns state, orchestrates flow). The "Service" suffix is misleading; it's architecturally a manager.
- `managers/OptimisticActionService.js` (284 lines) — same pattern. Manages optimistic state updates. Manager behavior, service name.
- `managers/SoundEventBridge.js` (126 lines) — bridge/adapter pattern. Could be in services/ but it's tightly coupled to SoundManager.

**Recommendation:** [PLACE] Rename `GuestMessageQueueService` → `GuestMessageQueueManager` and `OptimisticActionService` → `OptimisticActionManager` (name change only, keep in managers/). Or accept the naming inconsistency and document it. Moving files between directories would break many imports for minimal architectural gain.

### Q4: Should hooks be co-located with their consumer screens?

**Data:** 24 of 26 hooks have exactly 1 consumer. Only `useGameState` (24 consumers) and `useGameData` (4 consumers) are shared.

**Single-consumer hooks:**
- 7 `useTactical*` hooks → only consumed by `TacticalMapScreen.jsx`
- `useHangarData`, `useHangarMapState` → only consumed by `HangarScreen.jsx`
- `useDeckBuilderData` → only consumed by `DeckBuilder.jsx`
- `useActionRouting`, `useResolvers`, `useGameLifecycle`, etc. → only consumed by `App.jsx`

**Verdict: [STD-CHALLENGE] Strong case for co-location.** The current flat `hooks/` directory with 26 files requires navigating away from the screen you're working on. Co-located hooks (e.g., `components/screens/hooks/useTacticalMovement.js`) would keep related code together.

**Counter-argument:** Centralized `hooks/` makes it easy to see all custom hooks at a glance and prevents hooks from being accidentally coupled to component internals.

**Recommendation:** This is a significant structural question. See Standards Challenges section.

### Q5: Are `logic/` root-level files properly placed?

| File | Lines | Purpose |
|-|-|-|
| `aiLogic.js` | 1209 | AI decision-making orchestrator |
| `gameLogic.js` | 154 | Misc game utilities |
| `EffectRouter.js` | 151 | Routes effects to processors |
| `TargetingRouter.js` | 98 | Routes targeting to resolvers |
| `statsCalculator.js` | 306 | Stat calculations with buffs/mods |
| `droneUtils.js` | 12 | Single utility function |

**Issues:**
- [FIXED] `aiLogic.js` at 1209 lines — moved to `logic/ai/` and decomposed (1209→14 lines). [PLACE] [SIZE]
- `droneUtils.js` is 12 lines with a single function. Could be inlined or merged into an existing utils module. [SIZE]
- `gameLogic.js` at 154 lines is a grab-bag of misc functions. Review during Phase B for consolidation.
- `EffectRouter.js` and `TargetingRouter.js` are routers/dispatchers — fine at root since they span multiple subdirectories.
- `statsCalculator.js` is pure calculation logic — fine at root.

### Q6: Is `logic/effects/` over-organized?

**15 subdirectories** (excluding `__tests__/`):

| Size | Directories |
|-|-|
| 1 source file | `damage/`, `destroy/`, `detection/`, `marking/`, `mines/`, `movement/`, `stat_modification/`, `tokens/` (8 dirs) |
| 2 source files | `conditional/`, `energy/`, `meta/`, `upgrades/` (4 dirs) |
| 3 source files | `healing/`, `state/` (2 dirs) |
| 4 source files | `cards/` (1 dir) |

**Verdict: [STD-CHALLENGE] Over-organized.** 8 directories contain a single source file each. This creates navigation overhead — opening `effects/damage/DamageEffectProcessor.js` requires traversing two directory levels for one file.

**Counter-argument:** The 1:1 directory structure provides clear ownership and scales if processors grow (e.g., adding tests, helpers). The pattern is consistent.

**Recommendation:** Consider collapsing single-file directories. E.g., `effects/damage/DamageEffectProcessor.js` → `effects/DamageEffectProcessor.js`. Keep subdirectories only when they contain 2+ related source files. See Standards Challenges.

### Q7: CSS strategy — co-located vs centralized?

**Current state:**
- `src/styles/` — 12 files (global/shared styles: buttons, typography, animations, theme, modal-base, panels, etc.)
- `src/components/` — 28 co-located CSS files (component-specific styles)
- `src/index.css` — 1 entry point
- **Total: 41 CSS files**

**Mix of approaches:**
- Most modals/UI components co-locate their CSS (e.g., `LootRevealModal.css` next to `LootRevealModal.jsx`)
- 2 files use CSS Modules (`.module.css`): `FloatingCardControls.module.css`, `GameFooter.module.css`
- Global styles in `styles/` for shared concerns

**Verdict: Reasonable hybrid approach.** Co-located component CSS + centralized shared styles is a common React pattern. The 2 CSS Module files are inconsistent with the rest.

**Recommendation:** [STD-CHALLENGE] Document the CSS strategy in CODE_STANDARDS.md (it's currently not mentioned). Decide whether CSS Modules should be the standard or if plain co-located CSS is preferred. See Standards Challenges.

### Q8: Files in obviously wrong directories?

**Confirmed misplacements:**
1. [FIXED] `utils/chartUtils.jsx` — Moved to `components/ui/ChartUtils.jsx`. [PLACE]
2. [FIXED] `services/testGameInitializer.js` — Moved to `test/helpers/`. [PLACE]

**Borderline cases:**
3. `managers/SoundEventBridge.js` — adapter/bridge, not a manager. Could be in `services/` but tightly coupled to `SoundManager` in `managers/`. Acceptable where it is.
4. `components/screens/modalShowcaseHelpers.js` (1113 lines) — helper file for a testing/showcase screen, not a component itself. Could be in `test/helpers/` if the showcase is dev-only. [SIZE] [PLACE]
5. `components/screens/TestingSetupScreen.jsx` (1111 lines) — dev/test screen. Fine in screens/ if it's a real screen, but the size is concerning. [SIZE]

## Standards Challenges

### [FIXED] STD-CHALLENGE-01: Hook co-location vs centralized `hooks/`

- **Current standard:** All hooks in `src/hooks/` (CODE_STANDARDS.md: "Hooks (`src/hooks/` or co-located)")
- **Observed reality:** 24/26 hooks have exactly 1 consumer. The flat directory is a navigational dead-zone — you never browse it, you always arrive from a consumer.
- **Challenge:** Single-consumer hooks should co-locate with their consumer screen (e.g., `screens/TacticalMapScreen/hooks/useTacticalMovement.js`). Shared hooks (`useGameState`, `useGameData`) remain in `src/hooks/`.
- **Decision:** Co-locate screen-specific hooks with their consumer screens; app-level and shared hooks stay in `src/hooks/`
- **Resolution:** Executed in Phase E — screen-specific hooks co-located with consumer screens

### [FIXED] STD-CHALLENGE-02: `logic/effects/` directory granularity

- **Current standard:** Each effect type gets its own subdirectory (implicit convention, not explicitly documented)
- **Observed reality:** 8 of 15 effect subdirectories contain a single source file
- **Challenge:** Single-file directories create unnecessary navigation depth. A file like `effects/damage/DamageEffectProcessor.js` could live directly in `effects/` without ambiguity. Subdirectories should only exist when they contain 2+ related source files.
- **Decision:** Flatten single-file subdirectories into parent `effects/`; keep multi-file subdirectories
- **Resolution:** Executed in Phase E — DestroyEffectProcessor, MovementEffectProcessor flattened to parent level; old subdirs retain only `__tests__/`

### STD-CHALLENGE-03: CSS strategy not documented

- **Current standard:** CODE_STANDARDS.md doesn't mention CSS at all
- **Observed reality:** Hybrid approach — 12 global files in `styles/`, 28 co-located component CSS files, 2 CSS Module files (`.module.css`)
- **Challenge:** The lack of a documented standard means inconsistency will grow. The 2 CSS Module files contradict the plain CSS majority. Should document: (a) co-located plain CSS for components, (b) `styles/` for shared/global, (c) decide on CSS Modules.
- **Decision:** Deferred — needs dedicated CSS strategy discussion

### [FIXED] STD-CHALLENGE-04: Utils purity standard is systematically violated

- **Current standard:** "Pure utility functions with no domain knowledge" (CODE_STANDARDS.md)
- **Observed reality:** 10+ of 26 utils files contain deep domain logic (game phases, targeting, damage rules, deck validation, map generation). These import from `data/`, `logic/`, and hard-code game-specific rules.
- **Challenge:** The standard is correct but unenforced. Two options: (a) bulk-migrate domain-aware utils to `src/logic/` subdirectories, or (b) create a `src/logic/helpers/` category for "domain utils" that are too small for their own module but too domain-specific for `utils/`.
- **Decision:** Migrate domain-aware utils to `src/logic/` subdirectories
- **Resolution:** 8 data files had logic functions extracted to `logic/` helpers in Phase D

(Additional challenges will be collected during file-by-file reviews in Phases B-F)

## Review Log

### Phase A — Foundation (57 files, reviewed 2026-02-23)

#### A1: src/data/ (26 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| aiCoresData.js | 76 | 1 | PURITY |
| aiData.js | 240 | 2 | NAME, EDGE |
| cardData.js | 1821 | 1 | SIZE |
| cardPackData.js | 256 | 2 | PURITY, DEAD |
| descriptions/aiStrategyDescriptions.js | 678 | 1 | SIZE |
| descriptions/codePatternDescriptions.js | 402 | 1 | SIZE |
| descriptions/glossaryDescriptions.js | 181 | 0 | -- |
| droneData.js | 993 | 2 | SIZE, TODO |
| droneHelpText.js | 43 | 0 | -- |
| economyData.js | 111 | 0 | -- |
| hexInfoHelpText.js | 69 | 0 | -- |
| mapData.js | 199 | 0 | -- |
| mapMetaData.js | 61 | 1 | TODO |
| missionData.js | 341 | 1 | PURITY |
| playerDeckData.js | 44 | 1 | COMMENT |
| pointsOfInterestData.js | 162 | 2 | COMMENT, DUP |
| rarityColors.js | 9 | 0 | -- |
| reputationData.js | 35 | 0 | -- |
| reputationRewardsData.js | 197 | 1 | PURITY |
| salvageItemData.js | 350 | 1 | PURITY |
| saveGameSchema.js | 140 | 1 | PURITY |
| shipData.js | 136 | 2 | PURITY, COMMENT |
| shipSectionData.js | 188 | 2 | COMMENT, DUP |
| tacticalItemData.js | 68 | 1 | PURITY |
| tutorialData.js | 262 | 2 | PURITY, COMMENT |
| vsModeDeckData.js | 113 | 3 | NAME, DUP, COMMENT |

**Priority defect:**
- **[FIXED] aiData.js:182,216** [NAME] `CARD053_Enhanced` uses wrong casing — canonical ID is `CARD053_ENHANCED`. **Runtime bug**: these AI decks (Capital-Class Blockade Fleet, Nemesis boss) will produce broken card lookups.

**[FIXED] Purity violations — logic extracted to `logic/` helpers in Phase D:**
- aiCoresData.js — `calculateAICoresDrop()`, `getAICoresCost()` → `logic/aiCoresHelpers.js`
- cardPackData.js — `createSeededRNG()`, `getPackCostForTier()`, `generateRandomShopPack()` → `logic/cardPackHelpers.js`
- missionData.js — `getMissionById()`, `getIntroMissions()`, `getMissionsByCategory()` → `logic/missionHelpers.js`
- reputationRewardsData.js — `getLevelData()`, `getNewlyUnlockedLevels()` → `logic/reputationRewardsHelpers.js`
- salvageItemData.js — `findEligibleItems()`, `selectSalvageItem()`, `generateSalvageItemFromValue()` → `logic/salvageItemHelpers.js`
- shipData.js — `getShipById()`, `getAllShips()`, `getDefaultShip()` → `logic/shipHelpers.js`
- tacticalItemData.js — `getTacticalItemById()`, `getTacticalItemsByType()`, `getAllTacticalItemIds()` → `logic/tacticalItemHelpers.js`
- tutorialData.js — `getTutorialByScreen()`, `getAllTutorialScreenIds()`, `createDefaultTutorialDismissals()` → `logic/tutorialHelpers.js`
- saveGameSchema.js — `defaultPlayerProfile` calls `Date.now()` and derives arrays via `.map`/`.filter` at import time; this is a factory function, not static data. Not in CODE_STANDARDS known violations list.

**Other findings:**
- [FIXED] [DEAD] cardPackData.js: `fullCardCollection` import on line 7 is unused. Remove.
- [FIXED] [DUP] cardPackData.js: `RARITY_COLORS` removed, 4 consumers redirected to `rarityColors.js`.
- [SIZE] cardData.js (1821), droneData.js (993) exceed 800 lines but are cohesive flat data arrays — low urgency.
- [SIZE] aiStrategyDescriptions.js (678), codePatternDescriptions.js (402) — pure text data, acceptable.
- [TODO] droneData.js:8 — "Recovery rate of 0. (Cannot recover - needs cards to do so)" — triage needed.
- [TODO] mapMetaData.js:41 — "Add more map types as game design develops" — triage needed.
- [FIXED] [COMMENT] shipSectionData.js — banned `// NEW: Modifier fields` pattern on 5 lines. Also `// DEPRECATED:` on 5 lines — verify if `key` properties are still consumed or remove.
- [DEAD] shipSectionData.js — `key` property on each component labeled "Legacy key for backward compatibility" — verify if still consumed.
- [FIXED] [COMMENT] tutorialData.js — multiple spelling errors in user-facing text ("dissarray", "protocals", "constatly", "sucessfully", "ultiamately", "escaltes", "hear"→"here", "previosuly", "avaialbel").
- [FIXED] [COMMENT] shipData.js:78 — typo "Leightweight reconnocence" → "Lightweight reconnaissance".
- [FIXED] [COMMENT] playerDeckData.js:4 — typo "leightweight" → "lightweight".
- [FIXED] [COMMENT] vsModeDeckData.js:5 — typo "subtefuge" → "subterfuge".
- [FIXED] [COMMENT] pointsOfInterestData.js — stale "TBD (placeholder)" comments in tierAIMapping.
- [FIXED] [DUP] vsModeDeckData.js — VS_DECK_002 and VS_DECK_003 have identical decklists/dronePools/shipComponents. Only names differ. Likely copy-paste placeholder bug.
- [DUP] pointsOfInterestData.js — three drone PoI entries repeat identical boolean config blocks.
- [DUP] shipSectionData.js — BRIDGE_001 and BRIDGE_HEAVY have identical ability objects.
- [FIXED] [NAME] vsModeDeckData.js — inconsistent indentation (1-space vs 4-space).
- [EDGE] aiData.js — no validation that card IDs in AI decklists exist in `fullCardCollection`.

#### A2: src/config/ (4 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| backgrounds.js | 61 | 3 | NAME, COMMENT, DEAD |
| devConfig.js | 53 | 1 | SMELL |
| gameConfig.js | 26 | 0 | -- |
| soundConfig.js | 210 | 2 | COMMENT, DEAD |

**Findings:**
- [FIXED] [NAME] backgrounds.js — inconsistent ID casing: `nebula_1` (snake_case) vs `Orbit_1`, `Deep_Space_1` (Pascal_Snake). Normalize to snake_case.
- [FIXED] [COMMENT] backgrounds.js — scaffolding "Add more backgrounds here" comment. Remove.
- [DEAD] backgrounds.js — `getBackgroundById` fallback chain could return undefined despite JSDoc contract.
- [FIXED] [SMELL] devConfig.js — `DEV_MODE = true` is hardcoded. Should derive from `import.meta.env.DEV` or warn about manual toggle.
- [FIXED] [DEAD] devConfig.js — redundant dual export (named + default). Pick one convention.
- [FIXED] [COMMENT] soundConfig.js — commented-out "Phase 2 (future)" railgun sounds. Track in FUTURE_IMPROVEMENTS.md or delete.
- [FIXED] [DEAD] soundConfig.js — `getSoundManifest()` is a trivial getter for `SOUND_MANIFEST`. Only one consumer; consider removing.

#### A3: src/theme/ (1 file)

| File | Lines | Issues | Tags |
|-|-|-|-|
| theme.js | 71 | 1 | [FIXED] DEAD |

**Findings:**
- [DEAD] **Entire file is dead code** — zero imports found across the codebase. `tailwindTheme`, `theme`, `getCSSCustomProperty`, `setCSSCustomProperty` are all unused. Delete or integrate.

#### A4: src/utils/ (26 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| blueprintDropCalculator.js | 131 | 1 | PURITY |
| cardAnimationUtils.js | 101 | 1 | COMMENT |
| cardBorderUtils.js | 122 | 1 | DUP |
| cardDrawUtils.js | 262 | 3 | DEAD, LOG, DUP |
| cardTypeStyles.js | 42 | 1 | DUP |
| chartUtils.jsx | 28 | 1 | SMELL |
| csvExport.js | 255 | 2 | DUP, DEAD |
| debugLogger.js | 326 | 5 | DEAD, COMMENT, PURITY, LOG |
| deckExportUtils.js | 495 | 2 | SIZE, [FIXED] PURITY |
| deckFilterUtils.js | 487 | 1 | SIZE |
| deckStateUtils.js | 49 | 0 | -- |
| droneSelectionUtils.js | 124 | 0 | -- |
| firstPlayerUtils.js | 142 | 0 | -- |
| gameUtils.js | 179 | 3 | [FIXED] PURITY, SMELL, DUP |
| glossaryAnalyzer.js | 834 | 3 | SIZE, PURITY, PLACE |
| hexGrid.js | 101 | 1 | TEST |
| hexHeadingUtils.js | 99 | 0 | -- |
| iconMap.js | 89 | 0 | -- |
| mapGenerator.js | 388 | 3 | LOG, PURITY, SMELL |
| phaseValidation.js | 271 | 3 | LOG, PURITY, PLACE |
| seededRandom.js | 162 | 1 | DEAD |
| shipPlacementUtils.js | 122 | 2 | PURITY, PLACE |
| shipSectionImageResolver.js | 230 | 1 | PURITY |
| singlePlayerDeckUtils.js | 352 | 3 | PURITY, SMELL, PLACE |
| slotDamageUtils.js | 264 | 2 | PURITY, PLACE |
| uiTargetingHelpers.js | 531 | 4 | SIZE, PURITY, PLACE, SMELL |

**Priority findings:**

**debugLogger.js** (5 issues):
- [FIXED] [DEAD] Line 7: `import { FastForward } from "lucide-react"` — unused React icon import in a logging utility. **Fixed:** Removed in Phase L3.
- [FIXED] [COMMENT] 35+ stale annotations in category config: `(DISABLED - not needed)`, `(ENABLED for Railgun investigation)`, `(NEW - for refactor)`. Duplicate category keys: `QUICK_DEPLOY`, `EXTRACTION`, `ENCOUNTER` (later keys shadow earlier).
- [PURITY] Timing utilities (`getTimestamp`, `timingLog`, `getBrowserState`) are separate concerns from logging.
- [LOG] `setDebugEnabled`/`setDebugCategory` use raw `console.log` for announcements.

**[STD-CHALLENGE-04]: Utils purity is systematically violated.** 10 of 13 utils files in batch 2 contain domain knowledge. Key misplacements:
- [FIXED] glossaryAnalyzer.js (834 lines) → moved to `logic/glossary/`
- phaseValidation.js → should be `logic/`
- shipPlacementUtils.js → should be `logic/placement/`
- singlePlayerDeckUtils.js → should be `logic/deckBuilding/`
- slotDamageUtils.js → should be `logic/damage/`
- uiTargetingHelpers.js → should be `logic/targeting/`
- mapGenerator.js → should be `logic/map/`
- [FIXED] gameUtils.js — phase display names moved to logic/phase/phaseDisplayUtils.js; lane calculations remain (DOM utility)
- [FIXED] cardDrawUtils.js → moved to logic/cards/cardDrawUtils.js (card-dealing game logic)
- [FIXED] cardBorderUtils.js → moved to logic/cards/cardBorderUtils.js (card type domain knowledge)
- [FIXED] deckExportUtils.js → moved to logic/cards/deckExportUtils.js (deck/card domain logic)

**Other findings:**
- [FIXED] [LOG] cardDrawUtils.js — 6x `console.warn` instead of debugLog.
- [FIXED] [LOG] mapGenerator.js:76,80 — raw `console.log` in production code.
- [FIXED] [LOG] phaseValidation.js — 6x `console.warn` instead of debugLog.
- [FIXED] [DEAD] cardDrawUtils.js — `calculateHandLimit` exported but never imported.
- [FIXED] [DEAD] csvExport.js — `navigator.msSaveBlob` IE10 compat code is dead in 2026.
- [DEAD] seededRandom.js — orphaned JSDoc block for deleted `forCardShuffle` factory.
- [FIXED] [DUP] cardDrawUtils.js — player 1/player 2 processing blocks are near-identical copy-paste (~30 lines each).
- [FIXED] [DUP] csvExport.js — Headers, context extraction, and row building extracted to shared `DECISION_CSV_HEADERS`, `extractContext`, and `buildDecisionRows`.
- [FIXED] [DUP] cardBorderUtils.js ↔ cardTypeStyles.js — duplicate type color mappings.
- [FIXED] [DUP] gameUtils.js — `shuffleArray` trivially wraps `SeededRandom.shuffle`.
- [SIZE] glossaryAnalyzer.js (834), uiTargetingHelpers.js (531), deckExportUtils.js (495), deckFilterUtils.js (487).
- [SMELL] chartUtils.jsx — magic numbers throughout.
- [SMELL] mapGenerator.js — magic numbers (`5`, `10`).
- [SMELL] uiTargetingHelpers.js — `calculateAllValidTargets` (9+ params), `calculateAffectedDroneIds` (7 params).
- [SMELL] singlePlayerDeckUtils.js — magic `99` used 4x for "unlimited", magic `5`, `40`.
- [TEST] No test files exist for hexGrid.js (non-trivial math). Multiple utils with complex logic lack tests.

### Phase B — Logic (181 files, reviewed 2026-02-23)

#### B1: src/logic/ai/ + aiLogic.js (39 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| aiLogic.js | 1209 | 8 | SIZE, LOG, SMELL, PURITY, DUP, EDGE, LOGIC, DEAD |
| ai/aiConstants.js | 520 | 1 | SIZE |
| ai/AIQuickDeployHandler.js | 114 | 1 | DUP |
| ai/AISequentialTurnStrategy.js | 347 | 0 | -- |
| ai/AISimultaneousPhaseStrategy.js | 151 | 0 | -- |
| ai/index.js | 42 | 1 | DEAD |
| ai/moveEvaluator.js | 115 | 0 | -- |
| ai/adjustmentPasses/antiShipAdjustment.js | 69 | 0 | -- |
| ai/adjustmentPasses/index.js | 24 | 2 | DEAD, IMPORT |
| ai/adjustmentPasses/interceptionAdjustment.js | 250 | 0 | -- |
| ai/adjustmentPasses/jammerAdjustment.js | 146 | 0 | -- |
| ai/adjustmentPasses/movementInhibitorAdjustment.js | 89 | 0 | -- |
| ai/attackEvaluators/droneAttack.js | 208 | 1 | LOGIC |
| ai/attackEvaluators/index.js | 7 | 0 | -- |
| ai/attackEvaluators/shipAttack.js | 120 | 0 | -- |
| ai/cardEvaluators/conditionalEvaluator.js | 301 | 1 | [FIXED] LOG |
| ai/cardEvaluators/damageCards.js | 476 | 1 | SMELL |
| ai/cardEvaluators/droneCards.js | 604 | 2 | DEAD, SIZE |
| ai/cardEvaluators/healCards.js | 98 | 0 | -- |
| ai/cardEvaluators/index.js | 115 | 1 | [FIXED] LOG |
| ai/cardEvaluators/movementCards.js | 213 | 1 | SMELL |
| ai/cardEvaluators/statCards.js | 210 | 0 | -- |
| ai/cardEvaluators/statusEffectCards.js | 433 | 1 | SMELL |
| ai/cardEvaluators/threatCards.js | 65 | 0 | -- |
| ai/cardEvaluators/upgradeCards.js | 186 | 0 | -- |
| ai/cardEvaluators/utilityCards.js | 208 | 0 | -- |
| ai/decisions/actionDecision.js | 39 | 1 | COMMENT |
| ai/decisions/deploymentDecision.js | 29 | 1 | COMMENT |
| ai/decisions/interceptionDecision.js | 32 | 1 | COMMENT |
| ai/decisions/index.js | 8 | 0 | -- |
| ai/helpers/droneHelpers.js | 67 | 1 | DEAD |
| ai/helpers/hullIntegrityHelpers.js | 183 | 0 | -- |
| ai/helpers/index.js | 10 | 0 | -- |
| ai/helpers/jammerHelpers.js | 37 | 0 | -- |
| ai/helpers/keywordHelpers.js | 182 | 1 | [FIXED] DEAD |
| ai/helpers/upgradeHelpers.js | 114 | 0 | -- |
| ai/scoring/droneImpact.js | 55 | 1 | DEAD |
| ai/scoring/index.js | 8 | 0 | -- |
| ai/scoring/interceptionAnalysis.js | 248 | 0 | -- |
| ai/scoring/laneScoring.js | 113 | 1 | DEAD |
| ai/scoring/targetScoring.js | 302 | 0 | -- |

**Critical findings:**

- **[FIXED] [EDGE] aiLogic.js:799** — `positiveActionPool` can be empty, causing crash. `positiveActionPool[Math.floor(Math.random() * 0)]` returns `undefined`, next line crashes.
- **[FIXED] [SMELL] aiLogic.js** — 4x `Math.random()` instead of `SeededRandom`. Non-deterministic AI decisions. Fixed in actionDecision.js + deploymentDecision.js (Phase G).
- **[FIXED] [SIZE] aiLogic.js (1209→14)** — Decomposed and moved to `logic/ai/` in Phase F. God functions split into handler modules.
- **[FIXED] [LOG] aiLogic.js:246** — raw `console.error`.
- **[FIXED] [DEAD] adjustmentPasses/index.js** — `applyAllAdjustments` exported but never imported. Uses `require()` in ES module.
- **[INCORRECT] [DEAD] ai/helpers/droneHelpers.js** — Finding was wrong: `countDroneTypeInLane` is imported by deploymentDecision.js and actionDecision.js via `helpers/index.js` barrel. File has active consumers.
- **[FIXED] [DEAD] ai/scoring/droneImpact.js, laneScoring.js** — exported functions with zero consumers.
- **[FIXED] [COMMENT] ai/decisions/*.js** — stale "Future integration" stubs. Track or remove.
- **[CLOSED: ACCEPTABLE] [SMELL] cardEvaluators/damageCards.js, movementCards.js, statusEffectCards.js** — magic numbers should be in `aiConstants.js`.
- **[FIXED] [LOGIC] droneAttack.js:138** — `Math.min` with `INTERCEPTION_COVERAGE_MIN` may have sign mismatch. Changed to `Math.max` to properly cap penalty.

#### B2: src/logic/actions/ + abilities/ (14 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| actions/CardActionStrategy.js | 685 | 3 | SIZE, DUP, PURITY |
| actions/CombatActionStrategy.js | 520 | 2 | SIZE, SMELL |
| actions/CommitmentStrategy.js | 442 | 3 | SIZE, LOGIC, ERROR |
| actions/DroneActionStrategy.js | 455 | 1 | SIZE |
| actions/MiscActionStrategy.js | 133 | 0 | -- |
| actions/PhaseTransitionStrategy.js | 316 | 1 | DUP |
| actions/ShieldActionStrategy.js | 202 | 0 | -- |
| actions/ShipAbilityStrategy.js | 275 | 0 | -- |
| actions/StateUpdateStrategy.js | 140 | 0 | -- |
| abilities/AbilityResolver.js | 466 | 3 | LOG, SIZE, DUP |
| abilities/ship/ReallocateShieldsAbilityProcessor.js | 220 | 1 | LOG |
| abilities/ship/RecalculateAbilityProcessor.js | 176 | 1 | LOG |
| abilities/ship/RecallAbilityProcessor.js | 124 | 1 | LOG |
| abilities/ship/TargetLockAbilityProcessor.js | 100 | 2 | LOG, EDGE |

**Critical findings:**

- **[CLOSED: TEST-OOS] [TEST] No tests exist for any of these 14 files.** Core game logic with zero test coverage.
- **[FIXED] [ERROR] CommitmentStrategy.js:330** — `handleAICommitment` silently swallows errors (catch block logs but doesn't rethrow). AI commitment failure appears to succeed.
- **[FIXED] [LOGIC] CommitmentStrategy.js:44** — `clearPhaseCommitments` directly mutates `currentState` before `setState`. Mixed mutation/immutability.
- **[FIXED] [EDGE] TargetLockAbilityProcessor.js** — spends energy and ends turn even when target drone not found.
- **[FIXED] [LOG] 11x raw `console.warn`** across 5 ability files.
- **[DEFERRED] [DUP] CardActionStrategy.js** — `CARD_REVEAL` animation block duplicated 3x, callbacks object duplicated 2x.
- **[FIXED] [DUP] AbilityResolver.js** — `resolveShipRecallEffect` duplicates `RecallAbilityProcessor.process`. Dead code path.

#### B3: src/logic/combat/ + animations (11 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| combat/AttackProcessor.js | 809 | 5 | SIZE, SMELL, DUP, PURITY, EDGE |
| combat/InterceptionProcessor.js | 104 | 2 | IMPORT, DUP |
| combat/LaneControlCalculator.js | 159 | 2 | DEAD, DUP |
| combat/animations/ (8 files, 27-47 lines) | -- | 0 | Clean |

**Findings:**

- **[CLOSED: SIZE-TRACKED] [SIZE] AttackProcessor.js (809)** — `resolveAttack` is ~524 lines. God function with 6x duplicate "find drone in lanes" pattern.
- **[FIXED] [DUP] AttackProcessor.js** — `getLaneOfDrone` called 4x for same target in same path. Cache result.
- **[FIXED] [DEAD] LaneControlCalculator.js** — `getLanesNotControlled` exported but never imported.
- **[FIXED] [DUP] LaneControlCalculator.js** — `countLanesControlled` could be `getLanesControlled().length`.
- **[FIXED] [IMPORT] InterceptionProcessor.js** — imports from legacy `gameLogic.js` barrel instead of canonical `gameEngineUtils.js`. **Fixed:** Now imports from `gameEngineUtils.js`.

#### B4: src/logic/effects/ (32 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| effects/BaseEffectProcessor.js | 125 | 1 | LOGIC |
| effects/ConditionalSectionDamageProcessor.js | 265 | 2 | DUP |
| effects/cards/DiscardEffectProcessor.js | 102 | 0 | -- |
| effects/cards/DrawEffectProcessor.js | 86 | 0 | -- |
| effects/cards/DrawThenDiscardProcessor.js | 176 | 0 | -- |
| effects/cards/SearchAndDrawProcessor.js | 233 | 1 | SMELL |
| effects/conditional/ConditionalEffectProcessor.js | 199 | 0 | -- |
| effects/conditional/ConditionEvaluator.js | 382 | 0 | -- |
| effects/damage/DamageEffectProcessor.js | 684 | 3 | LOG, SIZE, DUP |
| effects/damage/animations/ (5 files) | -- | 0 | Clean |
| effects/destroy/DestroyEffectProcessor.js | 390 | 1 | DUP |
| effects/destroy/animations/ (2 files) | -- | 0 | Clean |
| effects/detection/IncreaseThreatEffectProcessor.js | 106 | 1 | EDGE |
| effects/energy/ (2 files) | -- | 0 | Clean |
| effects/healing/animations/HealAnimation.js | 46 | 0 | -- |
| effects/healing/HullHealProcessor.js | 247 | 0 | -- |
| effects/healing/ShieldHealProcessor.js | 160 | 0 | -- |
| effects/healing/ShipShieldRestoreProcessor.js | 134 | 0 | -- |
| effects/marking/MarkingEffectProcessor.js | 151 | 0 | -- |
| effects/meta/CompositeEffectProcessor.js | 82 | 0 | -- |
| effects/meta/RepeatingEffectProcessor.js | 175 | 1 | DEAD |
| effects/mines/MineTriggeredEffectProcessor.js | 271 | 1 | DEAD |
| effects/movement/animations/DefaultMovementAnimation.js | 30 | 0 | -- |
| effects/movement/MovementEffectProcessor.js | 633 | 1 | SIZE |
| effects/stat_modification/ModifyStatEffectProcessor.js | 137 | 0 | -- |
| effects/state/ExhaustDroneEffectProcessor.js | 95 | 0 | -- |
| effects/state/ReadyDroneEffectProcessor.js | 72 | 0 | -- |
| effects/state/StatusEffectProcessor.js | 193 | 1 | LOG |
| effects/tokens/TokenCreationProcessor.js | 163 | 0 | -- |
| effects/upgrades/DestroyUpgradeEffectProcessor.js | 85 | 0 | -- |
| effects/upgrades/ModifyDroneBaseEffectProcessor.js | 116 | 0 | -- |

**Findings:**

- **[FIXED] BaseEffectProcessor.js:83** — `createResult` auto-detects animation vs additional effects by checking `[0]?.type`. Fragile: effects also have `.type`. Latent bug.
- **[FIXED] [DUP] ConditionalSectionDamageProcessor.js** — `calculateDamageByType` copy-pasted from DamageEffectProcessor. Comment admits it. Extracted to shared `utils/damageCalculation.js`.
- **[FIXED] [DUP] DamageEffectProcessor.js** — `processOverflowDamage` (158 lines) re-implements damage logic already in `calculateDamageByType`. Refactored to call shared `calculateDamageByType`.
- **[FIXED] [DUP] DestroyEffectProcessor.js** — `onDroneDestroyed` + cleanup pattern repeated 5x across methods. Extracted to `applyDestroyCleanup` helper method.
- **[FIXED] [LOG] DamageEffectProcessor.js** — 3x `console.warn`. [FIXED] StatusEffectProcessor.js:184 — template literal in single quotes (bug: logs literal `${target.id}`).
- **[CLOSED: SIZE-TRACKED] [SIZE] MovementEffectProcessor.js (633)** — `executeSingleMove` (186 lines) and `executeMultiMove` (166 lines) share significant structural duplication.

#### B5: src/logic/ remaining (85 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| availability/DroneAvailabilityManager.js | 232 | 2 | COMMENT |
| cards/CardPlayManager.js | 868 | 7 | SIZE, LOG, COMMENT, SMELL, DUP, PURITY |
| cards/HandLimitManager.js | 149 | 0 | -- |
| costs/AdditionalCostProcessor.js | 240 | 1 | DUP |
| deployment/DeploymentProcessor.js | 436 | 2 | SMELL, DUP |
| detection/DetectionManager.js | 188 | 3 | LOG, PURITY |
| droneUtils.js | 12 | 0 | -- |
| economy/CreditManager.js | 106 | 0 | -- |
| economy/RepairService.js | 254 | 0 | -- |
| economy/ReplicatorService.js | 154 | 0 | -- |
| EffectRouter.js | 151 | 1 | DUP |
| encounters/EncounterController.js | 693 | 5 | SIZE, [FIXED] LOG, COMMENT, TODO, DUP |
| extraction/ (4 files) | -- | 0 | Clean |
| game/ForceWin.js | 15 | 0 | -- |
| game/WinConditionChecker.js | 160 | 0 | -- |
| gameLogic.js | 154 | 0 | -- |
| loot/LootGenerator.js | 747 | 5 | LOG, SIZE, DUP, SMELL, LOGIC |
| map/EscapeRouteCalculator.js | 382 | 2 | DUP, LOGIC |
| map/MovementController.js | 262 | 3 | LOG, TODO, DEAD |
| map/PathValidator.js | 139 | 2 | LOG, DUP |
| migration/saveGameMigrations.js | 154 | 0 | -- |
| missions/MissionConditionEvaluator.js | 123 | 0 | -- |
| missions/MissionService.js | 370 | 1 | PURITY |
| phase/PhaseRequirementChecker.js | 178 | 0 | -- |
| quickDeploy/ (4 files) | -- | 1 | SMELL |
| reputation/ReputationCalculator.js | 284 | 0 | -- |
| reputation/ReputationService.js | 289 | 1 | DUP |
| round/RoundManager.js | 331 | 0 | -- |
| salvage/HighAlertManager.js | 97 | 1 | LOGIC |
| salvage/SalvageController.js | 302 | 2 | COMMENT, PURITY |
| save/saveGameFactory.js | 86 | 1 | DUP |
| save/saveGameValidator.js | 134 | 1 | EDGE |
| shields/ShieldManager.js | 330 | 2 | COMMENT, SIZE |
| shields/ShieldResetUtils.js | 75 | 1 | DEAD |
| singlePlayer/CombatOutcomeProcessor.js | 866 | 5 | SIZE, SMELL, PURITY, DUP, COMMENT |
| singlePlayer/deckSlotFactory.js | 98 | 1 | SMELL |
| singlePlayer/DroneDamageProcessor.js | 108 | 1 | NAME |
| singlePlayer/ExtractionController.js | 557 | 3 | SIZE, PURITY, DUP |
| singlePlayer/hexGrid.js | 187 | 1 | IMPORT |
| singlePlayer/MIARecoveryService.js | 263 | 1 | DUP |
| singlePlayer/shipSectionBuilder.js | 79 | 0 | -- |
| singlePlayer/SinglePlayerCombatInitializer.js | 810 | 5 | SIZE, SMELL, TODO, DUP, PURITY |
| state/StateInitializer.js | 165 | 0 | -- |
| state/StateValidationService.js | 474 | 2 | SIZE, SMELL |
| statsCalculator.js | 306 | 1 | SMELL |
| targeting/BaseTargetingProcessor.js | 478 | 1 | SIZE |
| targeting/CardConditionValidator.js | 33 | 0 | -- |
| targeting/cards/ (3 files) | -- | 0 | Clean |
| targeting/drone/AllMarkedProcessor.js | 68 | 0 | -- |
| targeting/drone/DroneTargetingProcessor.js | 339 | 2 | DUP, COMMENT |
| targeting/lane/LaneTargetingProcessor.js | 55 | 1 | LOGIC |
| targeting/LaneControlValidator.js | 97 | 0 | -- |
| targeting/ship/ShipSectionTargetingProcessor.js | 128 | 0 | -- |
| TargetingRouter.js | 98 | 0 | -- |
| ticker/ (10 files) | -- | 1 | DEAD |
| turn/TurnTransitionManager.js | 289 | 0 | -- |
| utils/abilityHelpers.js | 224 | 1 | DUP |
| utils/auraManager.js | 52 | 0 | -- |
| utils/droneStateUtils.js | 79 | 0 | -- |
| utils/gameEngineUtils.js | 75 | 0 | -- |
| utils/rallyBeaconHelper.js | 37 | 0 | -- |

**Critical findings:**

- **[FIXED] [LOGIC] LootGenerator.js:417** — `this.generateSalvageItemFromValue(100, rng)` calls `this.` but it's an imported function. Will throw at runtime on fallback path.
- **[FIXED] [LOGIC] HighAlertManager.js:21** — `Math.random()` instead of `SeededRandom`. Breaks determinism.
- **[CLOSED: SIZE-TRACKED] [SIZE] CardPlayManager.js (868)** — god class. `resolveCardPlay` is 275 lines. Banned `// NEW:` comments. 2x `console.warn`.
- **[CLOSED: SIZE-TRACKED] [SIZE] CombatOutcomeProcessor.js (866)** — `processVictory` ~230 lines. Mixed mutation patterns. Should split into Victory/Defeat/LootCollector.
- **[CLOSED: SIZE-TRACKED] [SIZE] SinglePlayerCombatInitializer.js (810)** — `initiateCombat` ~260 lines, `buildPlayerState` ~170 lines.
- **[FIXED] [ERROR] CommitmentStrategy.js:330** — silently swallows AI commitment errors. **Fixed:** Duplicate of line 424 (already marked [FIXED]).
- **[FIXED] [DEAD] ShieldResetUtils.js:65** — `calculateReallocationDisplayShields` documented as "CURRENT BUG: not called". Dead code with known bug.
- **[FIXED] [DEAD] MovementController.js** — `handleHexArrival` and `movePlayer` appear to be dead code.
- **[FIXED] [DEAD] tickerConfig.js** — `MESSAGE_TEMPLATES` (100 lines) never imported by any generator.
- **[FIXED] [LOG] DetectionManager.js** — 4x raw `console.log`/`console.warn` including on every hex move.
- **[FIXED] [LOG] MovementController.js** — 7x raw `console.log`/`console.error`.
- **[FIXED] [LOG] LootGenerator.js** — 4x `console.warn`.
- **[FIXED] [LOG] PathValidator.js** — 2x raw `console.log`.
- **[DEFERRED] [DUP] A* search** implemented 3x across PathValidator and EscapeRouteCalculator. Extract shared utility.
- **[FIXED] [DUP] ExtractionController.js:358** — own LCG RNG implementation duplicating `SeededRandom`.
- **[FIXED] [DUP] saveGameFactory.js** — 6x `JSON.parse(JSON.stringify(...))`. Migrated to `structuredClone`.
- **[CLOSED: TODO-FEATURE] [TODO] SinglePlayerCombatInitializer.js:672** — "Load from ship slot if upgrades supported" — unresolved.
- **[CLOSED: TODO-FEATURE] [TODO] EncounterController.js:405** — "Track looted POIs in currentRunState" — unresolved.
- **[FIXED] [TODO] MovementController.js:160,166** — stale TODOs for systems that exist elsewhere. Removed in Phase E3.
- **[CLOSED: ACCEPTABLE] [PURITY] MissionService.js** — tutorial management (lines 302-366) bundled into MissionService. Should be `TutorialService`.
- **[CLOSED: BY-DESIGN] [LOGIC] LaneTargetingProcessor.js:39** — `affinity === 'ANY'` pushes 2 entries per lane (6 targets for 3 lanes). Consumers must handle correctly.
- **[FIXED] BaseEffectProcessor.js:83** — fragile auto-detect of animation vs effect arrays.

### Phase C — Services + Managers + Network (31 files, reviewed 2026-02-23)

**Totals:** 31 files, 14,607 lines, 73 issues (1 critical bug, 22 [LOG], 8 [SIZE], 7 [DUP], 5 [TEST], 12 other)

#### C1: src/services/ (6 files, 14 issues)
| File | Lines | Issues | Status |
|-|-|-|-|
| assetManifest.js | 159 | 1 | Reviewed |
| AssetPreloader.js | 288 | 2 | Reviewed |
| gameDataCache.js | 174 | 1 | Reviewed |
| GameDataService.js | 338 | 3 | Reviewed |
| SaveGameService.js | 237 | 2 | Reviewed |
| testGameInitializer.js | 579 | 5 | Reviewed |

**Per-file issues:**

- **[FIXED] [NAME] assetManifest.js:76-77,152** — Property `hanger` but UI label says "Hangar Interface". Spelling inconsistency propagates to consumers.
- **[FIXED] [LOGIC] AssetPreloader.js:97-100** — `.catch()` swallows errors silently, returning `undefined`. This makes `Promise.allSettled` at line 115 report "fulfilled with undefined" instead of "rejected". Defeats the purpose of `allSettled`.
- **[FIXED] [LOG] AssetPreloader.js:233** — `console.warn('Failed to load assets:')` should use `debugLog`. File already imports `debugLog` elsewhere.
- **[FIXED] [SMELL] gameDataCache.js:74,76** — Magic numbers `1000` (max cache) and `200` (eviction batch). Extracted to `MAX_CACHE_SIZE` and `EVICTION_BATCH_SIZE`.
- **[FIXED] [LOG] GameDataService.js:51** — `console.warn` in constructor should use `debugLog`.
- **[DEFERRED] [SMELL] GameDataService.js:246** — `getPlayerIdFromState` fallback uses `JSON.stringify(...).length` as identifier. String length is not a meaningful ID — different states can produce same length.
- **[DEFERRED] [LOGIC] GameDataService.js:285-295** — `hasGuardianInLane` with no `drones` arg → `getLaneData` → `hasGuardianInLane`. Fragile indirect recursion that only works because `getLaneData` always passes `opponentDrones`.
- **[FIXED] [LOG] SaveGameService.js:61-220** — 12 raw `console.log/warn/error` calls. Worst offender in services. No `debugLog` import at all.
- **[CLOSED: TEST-OOS] [TEST] SaveGameService.js** — Test exists but only covers quickDeployments serialization; no coverage for MIA protocol or migration logic.
- **[CLOSED: SIZE-TRACKED] [SIZE] testGameInitializer.js** — 579 lines (400+ threshold). Three large functions; `createPlayerStateFromConfig` (127 lines) could extract.
- **[FIXED] [LOG] testGameInitializer.js:114,280,349** — 3 raw `console.error/warn` calls despite importing `debugLog`.
- **[CLOSED: DEV-ONLY] [LOGIC] testGameInitializer.js:318** — `sort(() => 0.5 - Math.random())` is a biased shuffle. Fine for test init but not uniform.
- **[FIXED] [DUP] testGameInitializer.js:150-163,296-300** — Ship section initialization (`JSON.parse(JSON.stringify(shipComponentCollection.find(...)))`) duplicated between two functions.
- **[CLOSED: DEV-ONLY] [EDGE] testGameInitializer.js:152-154,297-299** — `shipComponentCollection.find(c => c.key === 'bridge')` could return `undefined`. `JSON.stringify(undefined)` would throw.

#### C2: src/managers/ (24 files, 48 issues)
| File | Lines | Issues | Status |
|-|-|-|-|
| GameFlowManager.js | 1673 | 5 | Reviewed |
| GuestMessageQueueService.js | 1125 | 5 | Reviewed |
| GameStateManager.js | 1068 | 5 | Reviewed |
| RewardManager.js | 1028 | 5 | Reviewed |
| ActionProcessor.js | 1006 | 4 | Reviewed |
| TransitionManager.js | 642 | 1 | Reviewed |
| AnimationManager.js | 579 | 3 | Reviewed |
| ShipSlotManager.js | 577 | 3 | Reviewed |
| RunLifecycleManager.js | 494 | 3 | Reviewed |
| PhaseManager.js | 485 | 5 | Reviewed |
| AIPhaseProcessor.js | 406 | 2 | Reviewed |
| SoundManager.js | 378 | 2 | Reviewed |
| MetaGameStateManager.js | 373 | 1 | Reviewed |
| CombatStateManager.js | 320 | 1 | Reviewed |
| RoundInitializationProcessor.js | 319 | 0 | Reviewed |
| PhaseAnimationQueue.js | 301 | 1 | Reviewed |
| OptimisticActionService.js | 284 | 1 | Reviewed |
| TacticalMapStateManager.js | 209 | 1 | Reviewed |
| MusicManager.js | 204 | 0 | Reviewed |
| GuestSyncManager.js | 199 | 1 | Reviewed |
| WaypointManager.js | 173 | 1 | Reviewed |
| SinglePlayerInventoryManager.js | 140 | 0 | Reviewed |
| TacticalItemManager.js | 130 | 0 | Reviewed |
| SoundEventBridge.js | 126 | 0 | Reviewed |

**Per-file issues:**

**GameFlowManager.js (1673 lines, 5 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 1673 lines, largest file in codebase. `onSimultaneousPhaseComplete` (lines 505-661) is 156 lines with drone extraction + RNG init logic that belongs in a dedicated handler.
- **[DEFERRED] [DUP] :343** — `const sequentialPhases` still duplicated in GameFlowManager:344, ActionProcessor:434, PhaseManager:389, PhaseTransitionStrategy:128. `SEQUENTIAL_PHASES` exists in `gameUtils.js` but local copies remain.
- **[DEFERRED] [SMELL] :578,1360** — `this.gameStateManager._updateContext = 'GameFlowManager'` try/finally pattern appears 5 times. ActionProcessor already has `_withUpdateContext()`. Should share.
- **[CLOSED: BY-DESIGN] [LOGIC] :1083** — `getNextRequiredPhase` log references `ROUND_PHASES[i-1]` which on first iteration may reference the current phase, producing misleading log.
- **[CLOSED: TEST-OOS] [TEST]** — Has 6 test files (main, quickDeploy, subscription, resubscribe, asymmetric, integration). Coverage exists.

**GuestMessageQueueService.js (1125 lines, 5 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 1125 lines. `processStateUpdate` (lines 634-1022) is 388 lines — a god function handling state comparison, animation filtering, teleport logic, phase queueing, cascade triggers, and state application.
- **[FIXED] [LOG] :64,517,626,953,967** — 5 raw `console.error`/`console.warn` calls.
- **[FIXED] [DUP] :130-184** — `addTeleportingFlags` extracted to `utils/teleportUtils.js`.
- **[FIXED] [DUP] :193-287** — `arraysMatch` and `dronesMatch` extracted to `utils/stateComparisonUtils.js`.
- **[CLOSED: BY-DESIGN] [PURITY]** — Mixed concerns: message queuing + state comparison + animation orchestration + teleport management + phase inference.

**GameStateManager.js (1068 lines, 5 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 1068 lines. Still has ~30 facade one-liners (lines 911-956) despite extracting 5 sub-managers.
- **[DEFERRED] [SMELL] :217** — `new Error().stack` on **every** `setState()` for caller detection. Performance concern in hot paths. Should be debug-only.
- **[FIXED] [LOGIC] :576-588** — `initializeTestMode` calls async `import().then()` but returns `true` synchronously. Caller has no way to know when init completes or fails.
- **[CLOSED: TODO-FEATURE] [TODO] :136** — `// TODO: Remove facades when GFM/GMQS are updated` — stale TODO.
- **[CLOSED: BY-DESIGN] [IMPORT] :12** — Imports `tacticalMapStateManager` singleton directly, coupling two independent state domains.

**RewardManager.js (1028 lines, 5 issues):**
- **[FIXED] [SIZE]** — 1028→863 lines. Card selection pipeline extracted in Phase F.
- **[FIXED] [LOG] :336,497,609,833** — 4 `console.warn` calls.
- **[FIXED] [DEAD] :82-88** — `DEFAULT_STATE` constant defined but never referenced. Constructor creates same structure inline.
- **[CLOSED: TODO-FEATURE] [TODO] :468** — `reputation: 0, // TODO: Calculate reputation` not tracked in FUTURE_IMPROVEMENTS.md.
- **[FIXED] [COMMENT]** — Test file `__tests__/RewardManager.test.js` contains banned `// NEW` comments (5 occurrences).

**ActionProcessor.js (1006 lines, 4 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 1006 lines. Teleport state management (~80 lines) could extract to shared `TeleportStateHandler`.
- **[CLOSED: TODO-FEATURE] [TODO] :452,457** — Two TODOs for unimplemented shield allocation/reset in a live code path. If `allocateShields` phase is reachable, players get silent no-ops.
- **[FIXED] [DUP] :810-862** — `addTeleportingFlags` extracted to shared `utils/teleportUtils.js`.
- **[CLOSED: ACCEPTABLE] [SMELL] :333-335** — `setAnimationManager` has inconsistent indentation.

**TransitionManager.js (642 lines, 1 issue):**
- **[CLOSED: BY-DESIGN] [IMPORT] :31-32** — Direct singleton imports of both `tacticalMapStateManager` and `gameStateManager`. Makes unit testing difficult without module mocking.

**AnimationManager.js (579 lines, 3 issues):**
- **[FIXED] [LOG] :446,453,494,500,524,531** — 6 raw `console.warn` calls.
- **[CLOSED: ACCEPTABLE] [SMELL] :375-571** — `executeAnimations` is 196 lines with nested while/if/else branches. Sequence, damage-group, and sequential branches should be private methods.
- **[CLOSED: TEST-OOS] [TEST]** — No test file exists.

**ShipSlotManager.js (577 lines, 3 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 577 lines (400+ threshold). Repair operations and instance operations are two sub-concerns.
- **[FIXED] [LOGIC] :362** — **CRITICAL BUG:** Fallback `ECONOMY.SECTION_DAMAGE_REPAIR_COST || 10` uses `10`, but the constant is `200`. Line 425 correctly uses `|| 200`. Inconsistent fallback would silently use wrong repair cost if constant removed. **Fixed:** Both lines now use `|| 200`.
- **[FIXED] [DUP] :194-216** — Empty slot template in `deleteShipSlotDeck` is a structural constant that likely duplicates `saveGameSchema.js` shape.

**RunLifecycleManager.js (494 lines, 3 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 494 lines. `startRun` (lines 34-255, ~220 lines) and `endRun` (lines 261-491, ~230 lines) are both large.
- **[CLOSED: ACCEPTABLE] [SMELL] :34** — `startRun` accepts 5 parameters. Consider options object.
- **[CLOSED: TODO-FEATURE] [TODO] :67-68** — Two TODOs (`// TODO: Use profile-based seed`, `// TODO: Support map type selection in Phase 4+`) not tracked in FUTURE_IMPROVEMENTS.md.

**PhaseManager.js (485 lines, 5 issues):**
- **[FIXED] [LOG] :87,92** — 2 `console.warn` calls alongside `debugLog`.
- **[FIXED] [LOG] :233,240,286** — 3 `console.error` calls alongside `debugLog`.
- **[FIXED] [DUP] :392-410** — `SEQUENTIAL_PHASES` unified: PhaseManager + GameFlowManager now import from `gameUtils.js`.
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 485 lines (400+ threshold). Borderline; cohesive class.
- **[FIXED] [TODO] :336** — `broadcastPhaseUpdate` no-op stub removed (Phase 9).

**AIPhaseProcessor.js (406 lines, 2 issues):**
- **[FIXED] [DUP] :209,259** — `const sequentialPhases = ['deployment', 'action']` duplicated twice, plus 3 more times in other files.
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 406 lines (400+ threshold). Clean delegation-focused design.

**SoundManager.js (378 lines, 2 issues):**
- **[FIXED] [LOG] :69,178** — 2 `console.warn` calls for AudioContext creation/unlock failures.
- **[DEFERRED] [DUP] :186-230** — `preload()` duplicates the fetch-decode loop from `preloadOnly()` (lines 84-152). Extract shared `_loadBuffers`.

**MetaGameStateManager.js (373 lines, 1 issue):**
- **[FIXED] [LOG] :104** — `console.error` in `_emit` listener error handler.

**CombatStateManager.js (320 lines, 1 issue):**
- **[FIXED] [LOG] :67** — Raw `console.error` in `_emit`.

**PhaseAnimationQueue.js (301 lines, 1 issue):**
- **[FIXED] [SMELL] :180** — Magic number `1800` already extracted as `PHASE_DISPLAY_DURATION` constant (verified).

**OptimisticActionService.js (284 lines, 1 issue):**
- **[FIXED] [SMELL] :263** — `new Error().stack` in `clearTrackedAnimations()` for caller ID. Stack trace is expensive in hot animation path.

**TacticalMapStateManager.js (209 lines, 1 issue):**
- **[FIXED] [LOG] :68** — Raw `console.error` in `_emit()`.

**GuestSyncManager.js (199 lines, 1 issue):**
- **[FIXED] [DEAD] :62-63** — Empty `if` block with comment-only body. Remove dead branch.

**WaypointManager.js (173 lines, 1 issue):**
- **[FIXED] [LOG] :35** — Raw `console.log` for diagnostic logging.

**MusicManager.js (204 lines):** Clean. No issues.
**SinglePlayerInventoryManager.js (140 lines):** Clean. No issues.
**TacticalItemManager.js (130 lines):** Clean. No issues.
**SoundEventBridge.js (126 lines):** Clean. No issues.
**RoundInitializationProcessor.js (319 lines):** Clean. No issues.

**Test coverage gaps (no test file):** AnimationManager, OptimisticActionService, SoundManager, MusicManager, SinglePlayerInventoryManager, TacticalItemManager, SoundEventBridge (7 of 24 managers untested).

#### C3: src/network/ (1 file, 5 issues)
| File | Lines | Issues | Status |
|-|-|-|-|
| P2PManager.js | 593 | 5 | Reviewed |

**Per-file issues:**

- **[FIXED] [LOG] P2PManager.js** — 21 raw `console.error`/`console.warn` calls throughout (lines 65, 126, 240, 328, 339, 352, 355, 368, 373, 409, 421, 426, 439, 450, 455, 468, 480, 485, 507, 516). Worst logging violation in the codebase.
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 593 lines (400+ threshold). Three sub-concerns: connection lifecycle (~170 lines), message sending (~150 lines), action handler setup (~85 lines).
- **[FIXED] [DUP]** — Guard pattern `if (!this.isConnected || !this.currentPeerId) { console.warn(...); return; }` copy-pasted in 5 methods. Extract `_requireConnection(context)`.
- **[FIXED] [DEAD] :515-526** — `syncGameState()` is deprecated with `console.warn`. Remove or fix callers.
- **[CLOSED: TEST-OOS] [TEST]** — No test file. 593 lines of WebRTC lifecycle with no coverage is a significant gap.

#### Phase C — Critical Findings Summary

1. **[FIXED] [LOGIC] ShipSlotManager.js:362** — CRITICAL: Wrong fallback `|| 10` should be `|| 200` (silent pricing bug)
2. **[FIXED] PhaseManager.js:392-410** — LATENT BUG: `isSimultaneousPhase()` hardcoded list missing `determineFirstPlayer`, diverges from static `SIMULTANEOUS_PHASES`. Causes premature phase transition.
3. **[FIXED] [LOG]** — 22 files had raw console calls. Worst: P2PManager (21), SaveGameService (12), AnimationManager (6), GuestMessageQueueService (5), PhaseManager (5). All migrated to debugLog in Phase B2.
4. **[CLOSED: SUMMARY] [SIZE]** — 5 files exceed 800 lines: GameFlowManager (1673), GuestMessageQueueService (1125), GameStateManager (1068), RewardManager (1028), ActionProcessor (1006). GuestMessageQueueService's `processStateUpdate` at 388 lines is the worst single method.
5. **[FIXED] [DUP] `sequentialPhases`** — Unified to single `SEQUENTIAL_PHASES` in `gameUtils.js`, imported by PhaseManager + GameFlowManager.
6. **[FIXED] [DUP] `addTeleportingFlags`** — Extracted to `utils/teleportUtils.js`, both consumers updated.
7. **[FIXED] [SMELL] GameStateManager.js:217** — `new Error().stack` on every `setState()` is expensive. Should be debug-only.

### Phase D — Hooks (26 files, reviewed 2026-02-23)

**Totals:** 26 files, 10,413 lines, 98 issues (4 [SIZE] 800+, 12 [LOG], 14 [DUP], 12 [SMELL], 6 [PURITY], 26 [TEST] (zero hooks tested), 24 other)

#### D1: src/hooks/
| File | Lines | Issues | Status |
|-|-|-|-|
| useDragMechanics.js | 1653 | 12 | Reviewed |
| useClickHandlers.js | 956 | 9 | Reviewed |
| useTacticalEncounters.js | 931 | 10 | Reviewed |
| useAnimationSetup.js | 899 | 9 | Reviewed |
| useResolvers.js | 608 | 8 | Reviewed |
| useGameLifecycle.js | 606 | 7 | Reviewed |
| useDeckBuilderData.js | 454 | 3 | Reviewed |
| useShieldAllocation.js | 428 | 4 | Reviewed |
| useTacticalMovement.js | 390 | 3 | Reviewed |
| useTacticalEscape.js | 328 | 3 | Reviewed |
| useCardSelection.js | 326 | 3 | Reviewed |
| useTacticalSubscriptions.js | 310 | 2 | Reviewed |
| useTacticalLoot.js | 307 | 2 | Reviewed |
| useTacticalExtraction.js | 297 | 2 | Reviewed |
| useTacticalWaypoints.js | 287 | 3 | Reviewed |
| useMultiplayerSync.js | 261 | 3 | Reviewed |
| useInterception.js | 247 | 2 | Reviewed |
| useGameState.js | 241 | 3 | Reviewed |
| useTacticalPostCombat.js | 229 | 2 | Reviewed |
| useHangarData.js | 136 | 1 | Reviewed |
| useHangarMapState.js | 122 | 2 | Reviewed |
| useActionRouting.js | 106 | 1 | Reviewed |
| useGameData.js | 104 | 1 | Reviewed |
| useSoundSetup.js | 82 | 0 | Reviewed |
| useExplosions.js | 57 | 1 | Reviewed |
| useMusicSetup.js | 48 | 1 | Reviewed |

**Per-file issues:**

**useDragMechanics.js (1653 lines, 12 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 1653 lines, 2x the 800-line threshold. Contains deployment drag, action card drag, drone drag, interception drag, additional cost drag, arrow tracking, mouseup cleanup — at least 3 extractable concerns.
- **[CLOSED: ACCEPTABLE] [SMELL] :275-760** — `handleActionCardDragEnd` is 485 lines — a god function handling movement cards, no-target, upgrade, additional cost, and generic targeted cards.
- **[CLOSED: ACCEPTABLE] [SMELL] :908-1440** — `handleDroneDragEnd` is 532 lines — another god function.
- **[CLOSED: ACCEPTABLE] [SMELL] :174** — Inconsistent memoization: `handleActionCardDragStart` is a plain function while `handleCardDragStart` at line 102 uses `useCallback`.
- **[CLOSED: ACCEPTABLE] [PURITY] :174-266, :275-760** — `handleActionCardDragStart` and `handleActionCardDragEnd` not `useCallback`-wrapped despite accessing closure state.
- **[FIXED] [STD-CHALLENGE] :114** — Magic number `20` for `startY` offset extracted to `ARROW_START_Y_OFFSET`.
- **[FIXED] [DUP] :1061-1096** — Cost reminder arrow extracted to `calculateCostReminderArrow` in `gameUtils.js`.
- **[CLOSED: ACCEPTABLE] [DUP] :296-306, :219-229** — `calculateAllValidTargets` call pattern duplicated within the same function.
- **[FIXED] [EDGE] :330** — `Object.entries(...).find(...)` can return `undefined`, fragile destructuring.
- **[FIXED] [LOGIC] :1134-1136** — Hardcoded `lineNumber: 4106` and `lineNumber: 3641` are stale App.jsx references.
- **[CLOSED: TODO-FEATURE] [TODO] :34** — Architectural smell (hoisted to App.jsx for circular dependency) not tracked in FUTURE_IMPROVEMENTS.md.
- **[CLOSED: TEST-OOS] [TEST]** — Zero tests for the most complex hook in the codebase.

**useClickHandlers.js (956 lines, 9 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 956 lines, exceeds 800-line threshold. 7 distinct handler functions.
- **[CLOSED: ACCEPTABLE] [SMELL] :710-944** — `handleCardClick` is 234 lines routing across 8+ card interaction types.
- **[CLOSED: ACCEPTABLE] [SMELL] :452-706** — `handleLaneClick` is 254 lines covering 6 interaction modes.
- **[FIXED] [PURITY] :196-226** — `handleShipAbilityClick` ability routing extracted to `ABILITY_CONFIG` lookup table (inlined as module-level constant in useClickHandlers.js, Phase L1).
- **[CLOSED: TODO-FEATURE] [TODO] :146,898,915** — Three `// TODO: TECHNICAL DEBT` comments for `gameEngine` direct calls.
- **[FIXED] [DUP] :489-561** — Cost movement destination logic extracted to shared `calculateCostReminderArrow` in `gameUtils.js`.
- **[FIXED] [IMPORT] :3** — `extractDroneNameFromId` imported but only used once for a debug log. **Fixed:** Import removed in Phase G.
- **[FIXED] [EDGE] :99** — `handleToggleDroneSelection` compares by `drone.name` not `drone.id`. Could mismatch with duplicate-named drones.
- **[CLOSED: TEST-OOS] [TEST]** — Zero tests.

**useTacticalEncounters.js (931 lines, 10 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 931 lines, exceeds 800-line threshold. Manages POI encounters, blueprints, salvage, quick deploy, combat loading — 5 distinct concerns.
- **[CLOSED: ACCEPTABLE] [PURITY]** — Contains significant business logic (loot generation, AI selection, salvage collection, combat init) that belongs in logic/ or managers/.
- **[FIXED] [DUP] :432-531 vs :608-691** — Salvage logic extracted to `collectAndStoreSalvageLoot`/`initiateSalvageCombat` helpers.
- **[FIXED] [DUP] :229-267 vs :305-351** — `handleBlueprintEncounterAccept` and `handleBlueprintEncounterAcceptWithQuickDeploy` nearly identical except for `quickDeployId` field.
- **[CLOSED: ACCEPTABLE] [SMELL] :556-728** — `handleEncounterProceedWithQuickDeploy` is 172 lines handling 3 completely different pathways.
- **[CLOSED: DEV-ONLY] [DEAD] :590-591, :671-672, :716-717** — Consecutive blank lines, remnants of removed code.
- **[FIXED] [LOGIC] :152** — `Math.random()` used directly for credit generation; breaks seeded RNG reproducibility.
- **[FIXED] [LOGIC] :153** — `const rng = { random: () => Math.random() }` creates non-seeded RNG wrapper, defeating the `rng` parameter abstraction.
- **[CLOSED: BY-DESIGN] [EDGE] :330** — Destructures result without undefined check.
- **[CLOSED: TEST-OOS] [TEST]** — Zero tests.

**useAnimationSetup.js (899 lines, 9 issues):**
- **[FIXED] [SIZE]** — 899→90 lines. Decomposed into 4 handler modules in Phase F.
- **[FIXED] [LOG] :64,108,125,172,278,515,577,647,679** — 9 `console.warn` calls. Most numerous logging violation in the hooks layer.
- **[FIXED] [IMPORT] :3-4** — `FlashEffect` and `CardVisualEffect` dead imports removed in Phase F.
- **[FIXED] [SMELL] :7** — Function signature had 16 positional parameters (now 33 — tracked as tech debt in FUTURE_IMPROVEMENTS #39).
- **[FIXED] [SMELL] :8-899** — Single 890-line `useEffect` split into 4 handler modules in Phase F.
- **[CLOSED: ACCEPTABLE] [STD-CHALLENGE] :89,498,527,612,627,658,695,843,861,881** — Multiple magic numbers for animation durations, offsets, delays.
- **[FIXED] [DUP] :588-589** — `localPlayerId` shadow removed in `useProjectileAnimations.js` (post-decomposition location).
- **[DEFERRED] [LOGIC] :82,137,186...** — Animation IDs use `Date.now()` which can collide in same millisecond. Use counter or UUID.
- **[CLOSED: TEST-OOS] [TEST]** — Zero tests.

**useResolvers.js (608 lines, 8 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 608 lines, above 400-line threshold. Modal callbacks (lines 401-560) could extract to `useModalCallbacks`.
- **[FIXED] [EDGE] :489-526** — 4 modal confirm handlers lack null guards that peer handlers have. Race-condition crash risk.
- **[DEFERRED] [EDGE] :148** — `resolveShipAbility` lacks try/catch around `processActionWithGuestRouting`. If call fails, `result.mandatoryAction` throws.
- **[FIXED] [SMELL] :436** — Magic 400ms delay extracted to `MOVE_RESOLUTION_DELAY`.
- **[CLOSED: ACCEPTABLE] [SMELL] :522-560** — `handleConfirmShipAbility` routes by `abilityType` string with 4 if/else-if branches.
- **[CLOSED: ACCEPTABLE] [LOGIC] :79** — Defensive cleanup `useEffect` deps include `turnPhase`/`currentPlayer` but body only checks `winner`. Fires unnecessarily.
- **[FIXED] [DUP] :219-226** — Friendly-drones calculation extracted to `getFriendlyDroneTargets` in `droneUtils.js`.
- **[CLOSED: TEST-OOS] [TEST]** — Zero tests.

**useGameLifecycle.js (606 lines, 7 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 606 lines (400+ threshold). Bundles reset, exit, pass, mandatory discard/removal, debug tools, footer toggle, modals — a grab-bag of unrelated concerns.
- **[FIXED] [LOGIC] :461-473** — **BUG:** `downloadLogAsCSV` headers have 8 columns but row mapping writes 7 values (skips `TimestampUTC`). Produces misaligned CSV output. **Fixed:** Row mapping now includes `timestampUTC`.
- **[FIXED] [DEAD] :293,316,356** — `const result = await processActionWithGuestRouting(...)` assigned but never read in 3 functions.
- **[FIXED] [DUP] :313-349 vs :352-389** — `handleMandatoryDiscardContinue` and `handleMandatoryDroneRemovalContinue` nearly identical.
- **[FIXED] [DUP] :84-98 vs :102-127** — `handleReset` and `handleExitGame` share 10 identical setter-clearing lines.
- **[FIXED] [SMELL] :457** — Raw browser `alert()` call. Should use project's modal/toast system.
- **[DEFERRED] [STD-CHALLENGE] :168** — `Date.now()` + `Math.random()` for instance IDs. Non-deterministic, could desync multiplayer.

**useDeckBuilderData.js (454 lines, 3 issues):**
- **[FIXED] [SIZE]** — 95 lines of module-level helpers extracted to `src/logic/cards/deckBuilderHelpers.js`.
- **[FIXED] [PURITY] :12-118** — 5 standalone pure functions (`formatKeyword`, `extractCardKeywords`, `extractTargetingText`, `sortItems`, `buildDistribution`, `buildKeywordDistribution`) extracted to `src/logic/cards/deckBuilderHelpers.js`.
- **[DEFERRED] [EDGE] :292-298** — `typeLimits` computed outside `useMemo` but used in memoized `isDeckValid`. Could be stale relative to `activeShip` changes.

**useShieldAllocation.js (428 lines, 4 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 428 lines (400+ threshold).
- **[FIXED] [DUP] :246-255 vs :379-388** — `handleCancelReallocation` and `clearReallocationState` perform same 8 state resets.
- **[FIXED] [LOGIC] :53-71** — `useEffect` depends on entire `localPlayerState` object. Any unrelated change resets user's in-progress allocation.
- **[FIXED] [SMELL] :140** — `const { turnPhase } = gameState` shadows the `turnPhase` already destructured at line 33.

**useTacticalMovement.js (390 lines, 3 issues):**
- **[CLOSED: ACCEPTABLE] [PURITY] :138-365** — `handleCommenceJourney` is 227 lines. Business logic (waypoint iteration, encounter pauses, path trimming) should live in `src/logic/`.
- **[CLOSED: ACCEPTABLE] [SMELL] :138-365** — God function at 227 lines. Should decompose into `processWaypointPath`, `handlePOIArrival`, `handleSalvageEncounter`, `journeyCleanup`.
- **[CLOSED: ACCEPTABLE] [STD-CHALLENGE] :324** — Inline magic `500` for waypoint pause delay, despite named constants for other delays at lines 21-23.

**useTacticalEscape.js (328 lines, 3 issues):**
- **[FIXED] [STD-CHALLENGE] :115** — Magic number `8888` already extracted as `THREAT_REDUCE_SEED_OFFSET`; fallback `5`/`15` extracted to `DEFAULT_THREAT_REDUCE_MIN`/`DEFAULT_THREAT_REDUCE_MAX`.
- **[FIXED] [STD-CHALLENGE] :158** — Magic `400ms` delay already extracted as `CONFIRMATION_DELAY` (verified).
- **[FIXED] [LOGIC] :93** — Redundant `tacticalMapStateManager.getState()` call (already fetched at line 80).

**useCardSelection.js (326 lines, 3 issues):**
- **[FIXED] [SMELL] :43-55** — `new Error().stack` on every `setMultiSelectState` call. Expensive for debugging only.
- **[FIXED] [SMELL] :92** — Same stack trace capture in `cancelCardSelection`, slicing 10 frames.
- **[DEFERRED] [LOGIC] :267** — `useEffect` deps include `additionalCostState` but early-returns skip recalculation for certain phases. Fires unnecessarily.

**useTacticalSubscriptions.js (310 lines, 2 issues):**
- **[CLOSED: ACCEPTABLE] [SMELL] :204-268** — `validQuickDeployments` useMemo is 64 lines of business logic (mock player state, component conversion, section stats). Belongs in `src/logic/quickDeploy/`.
- **[FIXED] [LOGIC] :80,108** — Detection thresholds extracted to `DETECTION_THRESHOLD_MEDIUM` and `DETECTION_THRESHOLD_HIGH`.

**useTacticalLoot.js (307 lines, 2 issues):**
- **[FIXED] [DUP] :76-223 vs :229-299** — `handlePOILootCollected` and `handleBlueprintRewardAccepted` share duplicated "finalize loot and resume" sequence.
- **[CLOSED: ACCEPTABLE] [SMELL] :76** — `handlePOILootCollected` at 147 lines is a god function handling 8+ loot types + POI marking + detection + mission progress + encounter resolution + waypoint resumption.

**useTacticalExtraction.js (297 lines, 2 issues):**
- **[FIXED] [DUP] :62-77 vs :96-121 vs :127-163** — Extraction completion pattern repeated 3 times. Extract `showExtractionResult(runState)`.
- **[FIXED] [LOGIC] :187** — `tier || 1` should be `tier ?? 1` to handle falsy-but-valid `0`.

**useTacticalWaypoints.js (287 lines, 3 issues):**
- **[CLOSED: TODO-FEATURE] [TODO] :76** — Open TODO not tracked in FUTURE_IMPROVEMENTS.md.
- **[FIXED] [DUP] :117-127 vs :138-148** — Pathfinding mode branching duplicated between `getPreviewPath` and `addWaypoint`.
- **[DEFERRED] [DUP] :155-166 vs :198-207** — Detection cost + encounter risk calculation duplicated between `addWaypoint` and `recalculateWaypoints`.

**useMultiplayerSync.js (261 lines, 3 issues):**
- **[FIXED] [DUP] :142-243** — Simultaneous-phase commitment check collapsed from 4 copy-pasted blocks to a loop.
- **[FIXED] [EDGE] :249-253** — `render_complete` event removed entirely (Phase 9).
- **[FIXED] [SMELL] :29-53** — Destructured `data` and `playerId` from event but neither used.

**useInterception.js (247 lines, 2 issues):**
- **[FIXED] [SMELL] :187-189, :216-218** — `setTimeout(async () => { await resolveAttack(...); }, 400)` — fire-and-forget async. If `resolveAttack` throws, unhandled rejection.
- **[FIXED] [ERROR] :131-132** — `Object.entries(...).find(...)` can return `undefined`, fragile destructuring with `|| []` fallback.

**useGameState.js (241 lines, 3 issues):**
- **[FIXED] [LOG] :94** — `console.error('CRITICAL - getOpponentPlacedSections')` — raw console.error.
- **[FIXED] [LOG] :185** — `console.warn('Simultaneous phase action...')` — raw console.warn.
- **[CLOSED: ACCEPTABLE] [PURITY]** — Thin pass-through wrapper forwarding 25+ methods 1:1 to `gameStateManager`. Hook provides subscription value but forwarding adds pure indirection.

**useTacticalPostCombat.js (229 lines, 2 issues):**
- **[FIXED] [SMELL] :204** — Magic number `threatIncrease: 10` extracted to `DEFAULT_POI_THREAT_INCREASE`.
- **[CLOSED: ACCEPTABLE] [SIZE]** — Entire hook is a single `useEffect` with ~200-line function body. Business logic should extract to pure function in `src/logic/`.

**useHangarData.js (136 lines, 1 issue):**
- **[FIXED] [SMELL] :66** — Magic numbers extracted to `MAP_COUNT` (6) and `DEPLOYMENT_SEED_MULTIPLIER` (1000).

**useHangarMapState.js (122 lines, 2 issues):**
- **[FIXED] [SMELL] :34** — Magic numbers `3`, `1.2`, `0.1` for zoom extracted to `HANGAR_MAX_ZOOM`, `HANGAR_MIN_ZOOM`, `HANGAR_ZOOM_STEP`.
- **[FIXED] [EDGE] :84** — `handleMapMouseDown` reads `pan.x`/`pan.y` from stale closure. Should use `panRef.current`.

**useActionRouting.js (106 lines, 1 issue):**
- **[CLOSED: ACCEPTABLE] [SMELL] :71** — `executeDeployment` declared as plain async function, not `useCallback`-wrapped. Recreated every render.

**useGameData.js (104 lines, 1 issue):**
- **[FIXED] [SMELL] :44** — `setInterval(updateStats, 5000)` polls cache stats unconditionally in production. Should be debug-only.

**useSoundSetup.js (82 lines):** Clean. No issues.

**useExplosions.js (57 lines, 1 issue):**
- **[FIXED] [LOG] :50** — `console.warn('No position found...')` — raw console.warn.

**useMusicSetup.js (48 lines, 1 issue):**
- **[CLOSED: ACCEPTABLE] [SMELL] :31-38** — Polling with `setInterval(..., 500)` to detect audio unlock. Event-based approach would be cleaner.

#### Phase D — Critical Findings Summary

1. **[FIXED] useGameLifecycle.js:461-473** — BUG: CSV header/data column mismatch (8 headers, 7 data columns) produces corrupt output.
2. **[FIXED] useResolvers.js:148** — `resolveShipAbility` lacks try/catch. Will throw on failed action routing.
3. **[FIXED] useResolvers.js:489-526** — 4 modal confirm handlers lack null guards that peer handlers have. Race-condition crash risk.
4. **[FIXED] [LOG]** — 12 raw console calls across useAnimationSetup (9), useGameState (2), useExplosions (1). Migrated to debugLog in Phase B2.
5. **[CLOSED: SUMMARY] [SIZE]** — Originally 4 hooks exceeded 800 lines. [FIXED] useAnimationSetup (899→90) decomposed in Phase F. Remaining: useDragMechanics (1653), useClickHandlers (956), useTacticalEncounters (931). God functions: `handleDroneDragEnd` (532 lines), `handleActionCardDragEnd` (485 lines), `handleLaneClick` (254 lines), `handleCardClick` (234 lines).
6. **[CLOSED: SUMMARY] [DUP]** — 14 duplication issues. Worst: useMultiplayerSync commitment check block copy-pasted 4 times (~100 lines). Cost reminder arrow logic duplicated between useDragMechanics and useClickHandlers. Friendly-drones calculation duplicated across 3 hooks.
7. **[CLOSED: SUMMARY] [TEST]** — `src/hooks/__tests__/` directory does not exist. Zero of 26 hooks have any test coverage. This is 10,413 lines of untested UI interaction logic.
8. **[CLOSED: SUMMARY] [PURITY]** — Multiple hooks contain business logic (loot generation, AI selection, combat init, movement state machines) that belongs in logic/ or managers/.
9. **[FIXED] [LOGIC]** — `Math.random()` in useTacticalEncounters breaks seeded RNG. `Date.now()` for animation IDs risks collision. useShieldAllocation over-broad dependency resets user state.

### Phase E — Components (~183 files, reviewed 2026-02-23)

**Totals:** ~183 files, 44,079 lines, 91 issues (6 [SIZE] 800+, 15 [LOG], 10 [DUP], 10 [PURITY], 7 [DEAD], 5 [SMELL], 4 [LOGIC], 2 [COMMENT], 32 other)

#### E1: src/components/animations/ (20 files, 10 issues)

| File | Lines | Issues | Status |
|-|-|-|-|
| RailgunTurret.jsx | 341 | 0 | Reviewed |
| PhaseAnnouncementOverlay.jsx | 283 | 1 | Reviewed |
| OverflowProjectile.jsx | 179 | 2 | Reviewed |
| HealEffect.jsx | 168 | 1 | Reviewed |
| SplashEffect.jsx | 166 | 0 | Reviewed |
| CardVisualEffect.jsx | 159 | 2 | Reviewed |
| TeleportEffect.jsx | 149 | 0 | Reviewed |
| GoAgainOverlay.jsx | 130 | 0 | Reviewed |
| StatusConsumptionOverlay.jsx | 127 | 1 | Reviewed |
| RailgunBeam.jsx | 120 | 0 | Reviewed |
| PassNotificationOverlay.jsx | 112 | 0 | Reviewed |
| KPIChangePopup.jsx | 104 | 0 | Reviewed |
| CardRevealOverlay.jsx | 99 | 0 | Reviewed |
| ShipAbilityRevealOverlay.jsx | 99 | 0 | Reviewed |
| FlyingDrone.jsx | 94 | 1 | Reviewed |
| LaserEffect.jsx | 92 | 1 | Reviewed |
| ExplosionEffect.jsx | 91 | 0 | Reviewed |
| CardWarningOverlay.jsx | 81 | 0 | Reviewed |
| BarrageImpact.jsx | 72 | 0 | Reviewed |
| FlashEffect.jsx | 52 | 1 | Reviewed |

**Per-file issues:**
- **[FIXED] [LOGIC] FlashEffect.jsx:18-26** — Three `setTimeout` calls with no cleanup. If component unmounts mid-animation, setState fires on unmounted component.
- **[FIXED] [LOGIC] LaserEffect.jsx:23-27** — Same timer cleanup issue; only 1 of 3 timers is cleared on unmount.
- **[FIXED] [DEAD] OverflowProjectile.jsx:160-176** — `const styles` template literal assigned but never used.
- **[FIXED] [LOGIC] OverflowProjectile.jsx:87** — `progress` hardcoded to `0.5` in travel-to-ship phase; animation never actually interpolates.
- **[FIXED] [DEAD] CardVisualEffect.jsx:71** — `EnergyWaveEffect` accepts `startPos` but never uses it.
- **[FIXED] [SMELL] CardVisualEffect.jsx:132-158** — Commented-out CSS keyframes block.
- **[FIXED] [DUP] HealEffect.jsx:27-34, 64-69** — Size determination + config extracted to module-level `SIZE_CONFIG` and `getSizeTier`.
- **[FIXED] [DEAD] StatusConsumptionOverlay.jsx:17** — `droneName` prop destructured but never used.
- **[FIXED] [SMELL] PhaseAnnouncementOverlay.jsx:26-43** — ~50 lines of performance.mark/measure instrumentation. Debug scaffolding left in production.
- **[FIXED] [SMELL] FlyingDrone.jsx:51-52** — Magic numbers `35` and `60` extracted to `TRAIL_OFFSET_X` and `TRAIL_OFFSET_Y`.

#### E2: src/components/ships/ (2 files, 2 issues)

| File | Lines | Issues | Status |
|-|-|-|-|
| CorvetteIcon.jsx | 126 | 1 | [FIXED] Reviewed |
| ShipIconRenderer.jsx | 118 | 1 | Reviewed |

- **[FIXED] [DEAD] CorvetteIcon.jsx** — Orphaned component. Only imported by commented-out code in ShipIconRenderer (uses PNG instead).
- **[FIXED] [DEAD] ShipIconRenderer.jsx:22-26** — `FACTION_COLORS` constant only referenced in commented-out code.

#### E3: src/components/quickDeploy/ (4 files, 4 issues)

| File | Lines | Issues | Status |
|-|-|-|-|
| QuickDeployManager.jsx | 385 | 2 | Reviewed |
| DronePicker.jsx | 225 | 0 | Reviewed |
| DeploymentOrderQueue.jsx | 170 | 1 | Reviewed |
| index.js | 9 | 1 | Reviewed |

- **[FIXED] [IMPORT] index.js:7** — Broken barrel export for `QuickDeployEditor` — file does not exist at that path. **Fixed:** Export removed.
- **[FIXED] [LOG] QuickDeployManager.jsx:132** — Raw `console.error`.
- **[FIXED] [PURITY] QuickDeployManager.jsx:35-88** — Validation logic extracted to `src/logic/quickDeploy/quickDeployValidationHelpers.js` (`validateAllDeployments`).
- **[CLOSED: ACCEPTABLE] [PURITY] DeploymentOrderQueue.jsx:9** — Imports `fullDroneCollection` directly. Presentation component should receive image URLs via props.

#### E4: src/components/ui/ (75 files, 27 issues)

**Files over 800 lines (3 files, 9 issues):**

| File | Lines | Issues | Status |
|-|-|-|-|
| GameHeader.jsx | 983 | 3 | Reviewed |
| HexInfoPanel.jsx | 970 | 3 | Reviewed |
| HexGridRenderer.jsx | 958 | 3 | Reviewed |

- **[FIXED] [SIZE] GameHeader.jsx** — 983→628 lines. Decomposed in Phase F.
- **[CLOSED: ACCEPTABLE] [SMELL] GameHeader.jsx:74-145** — 70+ props. Largest prop list in the codebase.
- **[FIXED] [DUP] GameHeader.jsx:502-551** — Reallocation button groups consolidated during Phase F decomposition.
- **[CLOSED: SIZE-TRACKED] [SIZE] HexInfoPanel.jsx** — 970 lines. Three render branches (moving, hex-info, waypoint-list) could split.
- **[FIXED] [PURITY] HexInfoPanel.jsx:362-399** — `getHexPreview()` extracted to `src/logic/map/hexPreview.js`. Component delegates via `computeHexPreview()`.
- **[FIXED] [DUP] HexInfoPanel.jsx:420-446,540-562,825-853** — Detection meter block extracted to `DetectionSection`.
- **[CLOSED: SIZE-TRACKED] [SIZE] HexGridRenderer.jsx** — 958 lines. Decorative hex, pan/zoom, fill/stroke are extraction candidates.
- **[FIXED] [PURITY] HexGridRenderer.jsx:16-22** — `tacticalBackgrounds` inlined as module-level constant (sole consumer, Phase L1).
- **[FIXED] [SMELL] HexGridRenderer.jsx:257-263** — Zoom limits already extracted to named constants at file top (lines 16-23). Inconsistency is by design (button vs wheel ranges).

**Files 400-800 lines (7 files, 5 issues):**

| File | Lines | Issues | Status |
|-|-|-|-|
| DeckBuilderLeftPanel.jsx | 632 | 2 | Reviewed |
| DroneLanesDisplay.jsx | 510 | 2 | Reviewed |
| DroneToken.jsx | 468 | 1 | Reviewed |
| DeckBuilderRightPanel.jsx | 443 | 0 | Reviewed |
| ModalLayer.jsx | 430 | 1 | Reviewed |
| HangarHexMap.jsx | 391 | 0 | Reviewed |
| AvailabilityDots.jsx | 390 | 1 | Reviewed |

- **[FIXED] [DUP] DeckBuilderLeftPanel.jsx:500-622** — Three component-type sections collapsed to data-driven loop.
- **[CLOSED: SIZE-TRACKED] [SIZE] DeckBuilderLeftPanel.jsx** — 632 lines (400+ threshold).
- **[CLOSED: ACCEPTABLE] [SMELL] DroneLanesDisplay.jsx:39-76** — `renderDronesOnBoard` standalone function with 28 positional parameters.
- **[CLOSED: SIZE-TRACKED] [SIZE] DroneLanesDisplay.jsx** — 510 lines (400+ threshold).
- **[FIXED] [LOGIC] ModalLayer.jsx:206-218** — Debug IIFE calls `debugLog` during render (side effect).
- **[FIXED] [COMMENT] AvailabilityDots.jsx:92** — Banned `// NEW MODEL:` temporal comment.

**Files under 350 lines (~65 files, 13 issues):**

| File | Lines | Issues | Status |
|-|-|-|-|
| TacticalMapModals.jsx | 336 | 1 | Reviewed |
| ShipConfigurationTab.jsx | 300 | 1 | Reviewed |
| ShipSectionCompact.jsx | 267 | 1 | Reviewed |
| ShipSection.jsx | 260 | 1 | Reviewed |
| CardBackPlaceholder.jsx | 211 | 1 | Reviewed |
| ResourceCard.jsx | 192 | 1 | Reviewed |
| NewsTicker.jsx | 193 | 1 | Reviewed |
| TacticalItemsPanel.jsx | 174 | 1 | Reviewed |
| InterceptionTargetLine.jsx | 151 | 1 | Reviewed |
| ActionCard.jsx | 224 | 1 | Reviewed |
| AngularBandsBackground.jsx | 127 | 1 | Reviewed |
| TacticalTicker.jsx | 78 | 1 | Reviewed |
| WaitingOverlay.jsx | 36 | 1 | [FIXED] Reviewed |
| ~52 other files | varies | 0 | Reviewed |

- **[FIXED] [LOG] InterceptionTargetLine.jsx:32-57** — 5 raw `console.log` calls.
- **[FIXED] [LOGIC] TacticalTicker.jsx:49** — **BUG:** useEffect has `[]` deps but reads `isMoving` and `currentRunState` — stale closure bug.
- **[FIXED] [DEAD] WaitingOverlay.jsx** — 6 props destructured but never used.
- **[FIXED] [DUP] ShipSection.jsx + ShipSectionCompact.jsx** — `ShipAbilityIcon` extracted to shared component.
- **[CLOSED: ACCEPTABLE] [PURITY] ResourceCard.jsx:16-52** — Inline `RESOURCE_CONFIG` data object.
- **[CLOSED: ACCEPTABLE] [PURITY] CardBackPlaceholder.jsx:10-51** — Inline color config objects.
- **[CLOSED: ACCEPTABLE] [PURITY] ShipConfigurationTab.jsx** — Directly imports data collections.
- **[CLOSED: ACCEPTABLE] [PURITY] TacticalMapModals.jsx:283-303** — Imports and calls logic singletons inline (`DetectionManager`, `ExtractionController`, `aiPersonalities`).
- **[CLOSED: ACCEPTABLE] [PURITY] TacticalItemsPanel.jsx:12-14** — Module-level data fetches.
- **[FIXED] [SMELL] NewsTicker.jsx:83-131** — Diagnostic logging interval runs every 1s parsing CSS transforms. Dev code in production.
- **[FIXED] [NAME] AngularBandsBackground.jsx** — File exports `MorphingBackground` but filename says `AngularBandsBackground`.
- **[FIXED] [LOG] ActionCard.jsx:77-83** — `debugLog` runs on every render of every card. Performance concern.
- **[FIXED] [DUP] HiddenShipCard.jsx + HiddenShipSectionCard.jsx** — Merged into `HiddenCard.jsx` with `variant="ship"` / `variant="section"` props. Consumers updated.

#### E5: src/components/modals/ (65 files, 17 issues)

**Files over 320 lines (13 files, 10 issues):**

| File | Lines | Issues | Status |
|-|-|-|-|
| InventoryModal.jsx | 1270 | 4 | Reviewed |
| GlossaryModal.jsx | 851 | 1 | Reviewed |
| AIStrategyModal.jsx | 711 | 0 | Reviewed |
| MapOverviewModal.jsx | 618 | 2 | Reviewed |
| ViewDeckModal.jsx | 587 | 1 | Reviewed |
| BlueprintsModal.jsx | 538 | 0 | Reviewed |
| DeckBuildingModal.jsx | 498 | 1 | Reviewed |
| ReplicatorModal.jsx | 393 | 0 | Reviewed |
| ShopModal.jsx | 377 | 0 | Reviewed |
| SalvageModal.jsx | 377 | 1 | Reviewed |
| RunInventoryModal.jsx | 360 | 0 | Reviewed |
| ExtractionLootSelectionModal.jsx | 357 | 0 | Reviewed |
| POIEncounterModal.jsx | 252 | 1 | Reviewed |

- **[FIXED] [SIZE] InventoryModal.jsx** — 1270→211 lines. Decomposed in Phase F.
- **[FIXED] [DEAD] InventoryModal.jsx:33** — `selectedItem`/`setSelectedItem` removed during Phase F decomposition.
- **[FIXED] [DUP] InventoryModal.jsx:528-618** — Rarity-stats grid consolidated during Phase F decomposition.
- **[FIXED] [SMELL] InventoryModal.jsx:658-730** — Card-tile pattern consolidated during Phase F decomposition.
- **[CLOSED: SIZE-TRACKED] [SIZE] GlossaryModal.jsx** — 851 lines. Each `renderXxx` function is extraction candidate.
- **[FIXED] [LOG] MapOverviewModal.jsx:97,222** — 2 raw `console.error`/`console.warn`.
- **[FIXED] [DUP] ViewDeckModal.jsx:83-104,131-157** — `getColumnGroups`/`getGroups` unified into shared `buildGroups(mode, cssPrefix)` helper.
- **[FIXED] [LOG] DeckBuildingModal.jsx:165** — Raw `console.error`.
- **[FIXED] [DUP] SalvageModal.jsx:15-19 + POIEncounterModal.jsx:11-16** — `IconPOI` extracted to shared component.

**Files under 320 lines (51 files, 7 issues):**

| File | Lines | Issues | Status |
|-|-|-|-|
| ReputationProgressModal.jsx | 294 | 1 | Reviewed |
| GameDebugModal.jsx | 280 | 0 | Reviewed |
| WinnerModal.jsx | 272 | 1 | Reviewed |
| DroneFilterModal.jsx | 249 | 0 | Reviewed |
| ReputationRewardModal.jsx | 247 | 2 | Reviewed |
| EscapeConfirmModal.jsx | 240 | 0 | Reviewed |
| MIARecoveryModal.jsx | 233 | 1 | Reviewed |
| LootRevealModal.jsx | 297 | 1 | Reviewed |
| DroneSelectionModal.jsx | 201 | 1 | Reviewed |
| AIDecisionLogModal.jsx | 139 | 1 | Reviewed |
| ~41 other files | varies | 0 | Reviewed |

- **[FIXED] [LOGIC] AIDecisionLogModal.jsx:106** — **BUG:** `decisionLog.sort(...)` mutates prop array in-place during render. Should be `[...decisionLog].sort(...)`.
- **[CLOSED: ACCEPTABLE] [PURITY] WinnerModal.jsx:34-89** — Reads `gameStateManager`/`tacticalMapStateManager`, calls `CombatOutcomeProcessor`. Business logic in component.
- **[FIXED] [DEAD] ReputationRewardModal.jsx:13** — `getLevelData` imported but never used.
- **[CLOSED: ACCEPTABLE] [PURITY] ReputationRewardModal.jsx:48-65** — `handleCollectLoot` mutates gameStateManager state directly. Business logic in component.
- **[CLOSED: ACCEPTABLE] [PURITY] MIARecoveryModal.jsx** — Imports `miaRecoveryService` and calls it directly.
- **[CLOSED: ACCEPTABLE] [PURITY] LootRevealModal.jsx** — Imports `SoundManager` singleton directly.
- **[CLOSED: ACCEPTABLE] [PURITY] ReputationProgressModal.jsx** — Calls `ReputationService` methods directly.
- **[FIXED] [LOG] DroneSelectionModal.jsx:68** — Raw `console.log`.

#### E6: src/components/screens/ (17 files, 31 issues)

**Files over 500 lines (8 files, 20 issues):**

| File | Lines | Issues | Status |
|-|-|-|-|
| modalShowcaseHelpers.js | 1113 | 2 | Reviewed |
| TestingSetupScreen.jsx | 1111 | 4 | Reviewed |
| QuickDeployEditorScreen.jsx | 904 | 3 | Reviewed |
| RepairBayScreen.jsx | 729 | 3 | Reviewed |
| TacticalMapScreen.jsx | 673 | 2 | Reviewed |
| DeckSelectionScreen.jsx | 602 | 3 | Reviewed |
| HangarScreen.jsx | 568 | 0 | Reviewed |
| ShipPlacementScreen.jsx | 546 | 3 | Reviewed |

- **[CLOSED: SIZE-TRACKED] [SIZE] modalShowcaseHelpers.js** — 1113 lines. `getModalsByCategory` manually duplicates keys from `modalConfigs`; could derive.
- **[CLOSED: DEV-ONLY] [LOG] modalShowcaseHelpers.js** — ~60 raw `console.log` in mock callbacks (showcase-only, low priority).
- **[CLOSED: SIZE-TRACKED] [SIZE] TestingSetupScreen.jsx** — 1111 lines. Contains 3 extractable sub-components.
- **[FIXED] [LOG] TestingSetupScreen.jsx:46,243** — 2 raw `console.error`.
- **[DEFERRED] [DUP] TestingSetupScreen.jsx:862-1005** — Lane controls for lane1/lane2/lane3 copy-pasted 3 times.
- **[CLOSED: SIZE-TRACKED] [SIZE] QuickDeployEditorScreen.jsx** — 904 lines.
- **[FIXED] [LOG] QuickDeployEditorScreen.jsx:451** — Raw `console.error`.
- **[DEFERRED] [DUP] QuickDeployEditorScreen.jsx:346-374,392-417** — Deployment order index remapping duplicated.
- **[FIXED] [PURITY] RepairBayScreen.jsx:33-105** — 5 domain logic functions extracted to `src/logic/singlePlayer/repairHelpers.js`. `resolveComponentIdForLane` re-exported for backward compatibility.
- **[CLOSED: DUP-ACCEPTABLE] [DUP] RepairBayScreen.jsx:384-398** — Header stat bar duplicated from HangarHeader.
- **[CLOSED: ACCEPTABLE] [SMELL] RepairBayScreen.jsx:401-416** — IIFE inside JSX for ReputationTrack.
- **[CLOSED: ACCEPTABLE] [SMELL] TacticalMapScreen.jsx:47-161** — 40+ useState + 10+ useRef declarations.
- **[CLOSED: ACCEPTABLE] [SMELL] TacticalMapScreen.jsx:586-661** — TacticalMapModals receives ~75 props.
- **[FIXED] [LOG] DeckSelectionScreen.jsx:144,284** — 2 raw `console.error`.
- **[FIXED] [COMMENT] DeckSelectionScreen.jsx:341** — Stale `// DEBUG LOGGING - Remove after fixing multiplayer issue`.
- **[FIXED] [LOG] ShipPlacementScreen.jsx:185,255** — 2 raw console calls.
- **[FIXED] [COMMENT] ShipPlacementScreen.jsx:284** — Same stale debug comment as DeckSelectionScreen.

**Files under 500 lines (9 files, 11 issues):**

| File | Lines | Issues | Status |
|-|-|-|-|
| DroneSelectionScreen.jsx | 438 | 3 | Reviewed |
| ExtractionDeckBuilder.jsx | 425 | 2 | Reviewed |
| LobbyScreen.jsx | 397 | 4 | Reviewed |
| DeckBuilder.jsx | 385 | 0 | Reviewed |
| MenuScreen.jsx | 377 | 0 | Reviewed |
| MultiplayerLobby.jsx | 363 | 1 | Reviewed |
| ModalShowcaseScreen.jsx | 361 | 1 | Reviewed |

- **[FIXED] [LOG] DroneSelectionScreen.jsx:199,204** — 2 raw `console.error`.
- **[CLOSED: ACCEPTABLE] [PURITY] DroneSelectionScreen.jsx:194** — Calls `gameStateManager.actionProcessor.queueAction()` and `p2pManager.sendActionToHost()` directly.
- **[CLOSED: SIZE-TRACKED] [SIZE] DroneSelectionScreen.jsx** — 438 lines (400+ threshold).
- **[FIXED] [LOG] ExtractionDeckBuilder.jsx:338,348,357** — 3 raw console calls.
- **[CLOSED: SIZE-TRACKED] [SIZE] ExtractionDeckBuilder.jsx** — 425 lines (400+ threshold).
- **[FIXED] [LOG] LobbyScreen.jsx:59,66,73** — 3 raw `console.error`.
- **[FIXED] [COMMENT] LobbyScreen.jsx:379** — Banned comment: `{/* FIXED: Properly closed the wrapper div here */}`.
- **[FIXED] [SMELL] LobbyScreen.jsx:60,67,74** — `alert()` for error display.
- **[CLOSED: ACCEPTABLE] [PURITY] LobbyScreen.jsx:81-113** — Game initialization logic in component.
- **[FIXED] [LOG] MultiplayerLobby.jsx:78,98,111** — 3 raw `console.error`.
- **[CLOSED: DEV-ONLY] [LOG] ModalShowcaseScreen.jsx:126-142,208** — Raw `console.log`/`console.warn` in dev tool.

#### Phase E — Critical Findings Summary

1. **[FIXED] AIDecisionLogModal.jsx:106** — BUG: `decisionLog.sort(...)` mutates prop array in-place during render. Must use `[...decisionLog].sort(...)`.
2. **[FIXED] TacticalTicker.jsx:49** — BUG: stale closure — useEffect has `[]` deps but reads changing state.
3. **[FIXED] quickDeploy/index.js:7** — Broken barrel export for nonexistent `QuickDeployEditor`.
4. **[FIXED] FlashEffect.jsx + LaserEffect.jsx** — Timer cleanup missing on unmount.
5. **[CLOSED: SUMMARY] [SIZE]** — Originally 6 files exceeded 800 lines. [FIXED] InventoryModal (1270→211) and [FIXED] GameHeader (983→628) decomposed in Phase F. Remaining: modalShowcaseHelpers (1113), TestingSetupScreen (1111), HexInfoPanel (970), HexGridRenderer (958).
6. **[FIXED] [LOG]** — 15+ files had raw console calls. Worst: modalShowcaseHelpers (~60), InterceptionTargetLine (5). Migrated to debugLog in Phase B2.
7. **[CLOSED: SUMMARY] [PURITY]** — 10 components contain business logic: HexInfoPanel, TacticalMapModals, WinnerModal, ReputationRewardModal, DroneSelectionScreen, LobbyScreen, RepairBayScreen, QuickDeployManager, MIARecoveryModal, ReputationProgressModal.
8. **[CLOSED: SUMMARY] [DUP]** — 10 duplication issues. Worst: TestingSetupScreen lane controls 3x, HexInfoPanel detection meter 3x, DeckBuilderLeftPanel component sections 3x.

### Phase F — App Root (4 files, reviewed 2026-02-23)

**Totals:** 4 files, 1,764 lines, 13 issues

#### F1: Root files + contexts
| File | Lines | Issues | Status |
|-|-|-|-|
| App.jsx | 1333 | 9 | Reviewed |
| AppRouter.jsx | 406 | 4 | Reviewed |
| main.jsx | 13 | 0 | Reviewed |
| contexts/EditorStatsContext.jsx | 12 | 0 | Reviewed |

**Per-file issues:**

**App.jsx (1333 lines, 9 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 1333 lines. Despite heavy hook extraction, still owns ~50 useState, ~10 refs, ~10 hooks, and a 400-line render prop-pass. Animation state cluster (lines 127-146, ~20 setters) could extract to `useAnimationState`. ModalLayer prop-pass could collapse into a context.
- **[FIXED] [DEAD] :160,162,205,723,780,782,789,791** — Eight "moved to..." breadcrumb comments (e.g., `// Combat and attack state -- potentialGuardians moved to useInterception`). Banned per comment standards.
- **[FIXED] [DEAD] :443-452** — Commented-out debugLog block.
- **[FIXED] [DEAD] :1317-1326** — `WaitingOverlay` rendered with `isVisible={false}` and `lastAction={null}`. Inert dead code.
- **[FIXED] [DEAD] :374** — `// addLogEntry is now provided by useGameState hook` — stale breadcrumb.
- **[CLOSED: ACCEPTABLE] [SMELL] :215-242** — `useAnimationSetup` receives 18 individual setter functions as arguments. Brittle call signature.
- **[DEFERRED] [SMELL] :601-615** — `cancelAllActions` is a plain function (not `useCallback`) but passed as dependency to `useDragMechanics`. New reference every render defeats memoization.
- **[CLOSED: BY-DESIGN] [COMMENT] :785** — `// Note: Guest render notification removed` — describes a past change. Banned pattern.
- **[CLOSED: ACCEPTABLE] [PURITY] :806-833** — Early return renders inline JSX with hardcoded styles for loading placeholder.

**AppRouter.jsx (406 lines, 4 issues):**
- **[CLOSED: SIZE-TRACKED] [SIZE]** — 406 lines (400+ threshold). Error boundary class (lines 365-404) should live in its own file.
- **[FIXED] [LOG] :128** — `console.error('Asset preload error:')` — should use `debugLog`.
- **[FIXED] [LOG] :345** — `console.warn('Unknown app state:')` — should use `debugLog`.
- **[CLOSED: DEV-ONLY] [STD-CHALLENGE] :376-377** — `console.error` in `componentDidCatch`. Defensible: error boundaries are last-resort crash handlers where `debugLog` may itself be broken. Recommend keeping with explicit comment.

**main.jsx (13 lines):** Clean.
**EditorStatsContext.jsx (12 lines):** Clean.

### Phase G — Cross-cutting Analysis (2026-02-23)

#### G1: Import Depth

- **114 files** use 3+ level deep relative imports (`../../..` or deeper)
- Concentrated in test files (which are 1 level deeper in `__tests__/`) and logic subdirectories
- Worst offenders: test files in deeply nested logic/ subdirectories (e.g., `src/logic/effects/detection/__tests__/`)
- **Recommendation:** Consider path aliases (e.g., `@/logic/`, `@/data/`) via vite config to eliminate relative import depth

#### G2: CSS Strategy

| Type | Count |
|-|-|
| Global CSS (src/styles/) | 10 files |
| Co-located component CSS | 13 files |
| CSS Modules (.module.css) | 2 files |

- Hybrid approach: mostly global + co-located plain CSS
- 2 CSS Module files (FloatingCardControls, GameFooter) contradict the plain CSS majority
- **No documented CSS standard** in CODE_STANDARDS.md (see STD-CHALLENGE-03)

#### G3: Raw Console Usage

- [FIXED] **Phase B2 migrated 193 console calls across 61 production files to debugLog.** Remaining raw console usage is limited to:
  - `debugLogger.js` — 16 (intentional: the logger itself)
  - `modalShowcaseHelpers.js` — ~60 (dev-only showcase callbacks)
  - `AppRouter.jsx` componentDidCatch — kept intentionally (STD-CHALLENGE-05)
- **Pre-migration snapshot (297 instances across 66 files):**

| File | Count |
|-|-|
| modalShowcaseHelpers.js | 79 |
| P2PManager.js | 20 |
| debugLogger.js | 16 (intentional) |
| SaveGameService.js | 11 |
| useAnimationSetup.js | 9 |
| cardDrawUtils.js | 8 |
| MovementController.js | 7 |
| AnimationManager.js | 6 |
| PhaseManager.js | 5 |
| DetectionManager.js | 5 |

#### G4: Test Coverage

| Metric | Count |
|-|-|
| Source files (non-test) | ~500 |
| Test files | 220 |
| Files with tests | ~220 (~44%) |
| Files without tests | ~280 (~56%) |

- **High-risk untested areas:** all 26 hooks (10,413 lines), components/animations, most components/ui, P2PManager (593 lines), several managers
- **Well-tested areas:** logic/ subdirectories (especially effects, cards, combat), managers (core orchestration)

#### G5: TODO/FIXME Comments

- **137 occurrences** across 16 files
- 114 are placeholder tests in `singleMoveMode.test.jsx` (single file)
- **23 actionable TODOs** across production code:
  - ActionProcessor.js:452,457 — shield allocation stubs
  - RunLifecycleManager.js:67-68 — profile seed, map type selection
  - ShipPlacementScreen.jsx — error UI handling
  - useClickHandlers.js — targeting logic
  - MovementController.js — encounter/extraction triggers
  - PhaseManager.js:336 — broadcastPhaseUpdate no-op [FIXED Phase 9]
  - RewardManager.js:468 — reputation calculation
  - GameStateManager.js:136 — facade removal

#### G6: Standards Challenge Synthesis

All [STD-CHALLENGE] items collected from the audit:

**STD-CHALLENGE-01: Hook co-location vs centralized `hooks/`**
- 24/26 hooks have exactly 1 consumer
- Single-consumer hooks should co-locate with their screen
- Decision: Co-locate screen hooks; app-level/shared hooks stay in `src/hooks/`

**STD-CHALLENGE-02: `logic/effects/` directory granularity**
- 8 of 15 subdirectories contain a single source file
- Single-file directories create unnecessary navigation depth
- Decision: Flatten single-file subdirectories into parent `effects/`

**STD-CHALLENGE-03: CSS strategy not documented**
- Hybrid: 10 global, 13 co-located, 2 CSS Modules
- No standard in CODE_STANDARDS.md
- Decision: Deferred — needs dedicated CSS strategy discussion

**STD-CHALLENGE-04: Utils purity standard systematically violated**
- 10+ of 26 utils files contain deep domain logic
- Standard correct but unenforced
- Decision: Migrate domain-aware utils to `src/logic/` subdirectories

**STD-CHALLENGE-05: Error boundary console.error**
- `componentDidCatch` using raw `console.error` is defensible
- Recommend explicit exemption comment
- Decision: Keep with annotation

**STD-CHALLENGE-06: Magic numbers pervasive**
- Animation durations, delays, offsets, zoom levels, thresholds appear as raw numbers throughout hooks and components
- Especially bad in: useAnimationSetup, HexGridRenderer, useTacticalEscape, PhaseAnimationQueue
- Recommend: named constants at module level for all timing/layout values
- Decision: Extract named constants at module level in worst-offender files

**[FIXED] STD-CHALLENGE-07: `Date.now()` / `Math.random()` for IDs**
- Used throughout hooks for animation IDs, instance IDs
- Collision risk in same-millisecond scenarios; breaks seeded RNG
- Recommend: counter-based or `crypto.randomUUID()` for non-seeded contexts
- Decision: Replace `Date.now()`/`Math.random()` IDs with `crypto.randomUUID()`
- **Resolution:** `crypto.randomUUID()` adopted in 14 files during Phase B2. Some `Date.now()` usage remains in hooks (lower priority — animation contexts).

#### Phase F+G — Critical Findings Summary

1. **[CLOSED: SUMMARY] [SIZE] App.jsx** — 1333 lines. Largest React component. ~50 useState, ~10 refs. Animation state cluster and ModalLayer prop-pass are extraction candidates.
2. **[FIXED] [DEAD] App.jsx** — 8 banned "moved to" breadcrumb comments + 2 dead code blocks.
3. **[CLOSED: SUMMARY] [SMELL] App.jsx:601** — `cancelAllActions` not wrapped in `useCallback`. Defeats memoization in consuming hooks.
4. **[FIXED] [LOG]** — 297 raw console calls across 66 files. ~200 actionable violations migrated to debugLog in Phase B2 (193 calls across 61 files).
5. **[CLOSED: SUMMARY] [TEST]** — ~280 of ~500 source files (56%) have no test coverage. All 26 hooks untested.
6. **[FIXED] [TODO]** — 23 actionable TODOs triaged: 3 stale removed, 6 tracked in FUTURE_IMPROVEMENTS.md (#33-38), rest valid notes/scaffolding.
