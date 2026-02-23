# Codebase Audit

## Meta
- Started: 2026-02-23
- Last Session: 2026-02-23
- Progress: 269/~500 source files (54%)
- Current Phase: Phase D — Hooks
- Next File: src/hooks/ (first file)
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
- `theme/` contains a single file (`theme.js`). Could merge into `config/` or `styles/`.
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
- `aiLogic.js` at 1209 lines is the **largest logic file**. Should live in `logic/ai/` where related AI files already exist. [PLACE] [SIZE]
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
1. `utils/chartUtils.jsx` — React component with JSX, importing React. Should be in `components/ui/` (consumed only by `DeckStatisticsCharts.jsx`). [PLACE]
2. `services/testGameInitializer.js` — test helper that initializes game state for development. Could belong in `test/helpers/` or `config/`. [PLACE]

**Borderline cases:**
3. `managers/SoundEventBridge.js` — adapter/bridge, not a manager. Could be in `services/` but tightly coupled to `SoundManager` in `managers/`. Acceptable where it is.
4. `components/screens/modalShowcaseHelpers.js` (1113 lines) — helper file for a testing/showcase screen, not a component itself. Could be in `test/helpers/` if the showcase is dev-only. [SIZE] [PLACE]
5. `components/screens/TestingSetupScreen.jsx` (1111 lines) — dev/test screen. Fine in screens/ if it's a real screen, but the size is concerning. [SIZE]

## Standards Challenges

### STD-CHALLENGE-01: Hook co-location vs centralized `hooks/`

- **Current standard:** All hooks in `src/hooks/` (CODE_STANDARDS.md: "Hooks (`src/hooks/` or co-located)")
- **Observed reality:** 24/26 hooks have exactly 1 consumer. The flat directory is a navigational dead-zone — you never browse it, you always arrive from a consumer.
- **Challenge:** Single-consumer hooks should co-locate with their consumer screen (e.g., `screens/TacticalMapScreen/hooks/useTacticalMovement.js`). Shared hooks (`useGameState`, `useGameData`) remain in `src/hooks/`.
- **Decision:** Pending user discussion

### STD-CHALLENGE-02: `logic/effects/` directory granularity

- **Current standard:** Each effect type gets its own subdirectory (implicit convention, not explicitly documented)
- **Observed reality:** 8 of 15 effect subdirectories contain a single source file
- **Challenge:** Single-file directories create unnecessary navigation depth. A file like `effects/damage/DamageEffectProcessor.js` could live directly in `effects/` without ambiguity. Subdirectories should only exist when they contain 2+ related source files.
- **Decision:** Pending user discussion

### STD-CHALLENGE-03: CSS strategy not documented

- **Current standard:** CODE_STANDARDS.md doesn't mention CSS at all
- **Observed reality:** Hybrid approach — 12 global files in `styles/`, 28 co-located component CSS files, 2 CSS Module files (`.module.css`)
- **Challenge:** The lack of a documented standard means inconsistency will grow. The 2 CSS Module files contradict the plain CSS majority. Should document: (a) co-located plain CSS for components, (b) `styles/` for shared/global, (c) decide on CSS Modules.
- **Decision:** Pending user discussion

### STD-CHALLENGE-04: Utils purity standard is systematically violated

- **Current standard:** "Pure utility functions with no domain knowledge" (CODE_STANDARDS.md)
- **Observed reality:** 10+ of 26 utils files contain deep domain logic (game phases, targeting, damage rules, deck validation, map generation). These import from `data/`, `logic/`, and hard-code game-specific rules.
- **Challenge:** The standard is correct but unenforced. Two options: (a) bulk-migrate domain-aware utils to `src/logic/` subdirectories, or (b) create a `src/logic/helpers/` category for "domain utils" that are too small for their own module but too domain-specific for `utils/`.
- **Decision:** Pending user discussion

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
- **aiData.js:182,216** [NAME] `CARD053_Enhanced` uses wrong casing — canonical ID is `CARD053_ENHANCED`. **Runtime bug**: these AI decks (Capital-Class Blockade Fleet, Nemesis boss) will produce broken card lookups.

**Purity violations (already tracked in CODE_STANDARDS.md):**
- aiCoresData.js — `calculateAICoresDrop()`, `getAICoresCost()`
- cardPackData.js — `createSeededRNG()`, `getPackCostForTier()`, `generateRandomShopPack()`
- missionData.js — `getMissionById()`, `getIntroMissions()`, `getMissionsByCategory()`
- reputationRewardsData.js — `getLevelData()`, `getNewlyUnlockedLevels()`
- salvageItemData.js — `findEligibleItems()`, `selectSalvageItem()`, `generateSalvageItemFromValue()`
- shipData.js — `getShipById()`, `getAllShips()`, `getDefaultShip()`
- tacticalItemData.js — `getTacticalItemById()`, `getTacticalItemsByType()`, `getAllTacticalItemIds()`
- tutorialData.js — `getTutorialByScreen()`, `getAllTutorialScreenIds()`, `createDefaultTutorialDismissals()`
- saveGameSchema.js — `defaultPlayerProfile` calls `Date.now()` and derives arrays via `.map`/`.filter` at import time; this is a factory function, not static data. Not in CODE_STANDARDS known violations list.

**Other findings:**
- [DEAD] cardPackData.js: `fullCardCollection` import on line 7 is unused. Remove.
- [DUP] cardPackData.js: `RARITY_COLORS` (lines 12-17) is an exact duplicate of `src/data/rarityColors.js`. Remove and redirect consumers to canonical source.
- [SIZE] cardData.js (1821), droneData.js (993) exceed 800 lines but are cohesive flat data arrays — low urgency.
- [SIZE] aiStrategyDescriptions.js (678), codePatternDescriptions.js (402) — pure text data, acceptable.
- [TODO] droneData.js:8 — "Recovery rate of 0. (Cannot recover - needs cards to do so)" — triage needed.
- [TODO] mapMetaData.js:41 — "Add more map types as game design develops" — triage needed.
- [COMMENT] shipSectionData.js — banned `// NEW: Modifier fields` pattern on 5 lines. Also `// DEPRECATED:` on 5 lines — verify if `key` properties are still consumed or remove.
- [DEAD] shipSectionData.js — `key` property on each component labeled "Legacy key for backward compatibility" — verify if still consumed.
- [COMMENT] tutorialData.js — multiple spelling errors in user-facing text ("dissarray", "protocals", "constatly", "sucessfully", "ultiamately", "escaltes", "hear"→"here", "previosuly", "avaialbel").
- [COMMENT] shipData.js:78 — typo "Leightweight reconnocence" → "Lightweight reconnaissance".
- [COMMENT] playerDeckData.js:4 — typo "leightweight" → "lightweight".
- [COMMENT] vsModeDeckData.js:5 — typo "subtefuge" → "subterfuge".
- [COMMENT] pointsOfInterestData.js — stale "TBD (placeholder)" comments in tierAIMapping.
- [DUP] vsModeDeckData.js — VS_DECK_002 and VS_DECK_003 have identical decklists/dronePools/shipComponents. Only names differ. Likely copy-paste placeholder bug.
- [DUP] pointsOfInterestData.js — three drone PoI entries repeat identical boolean config blocks.
- [DUP] shipSectionData.js — BRIDGE_001 and BRIDGE_HEAVY have identical ability objects.
- [NAME] vsModeDeckData.js — inconsistent indentation (1-space vs 4-space).
- [EDGE] aiData.js — no validation that card IDs in AI decklists exist in `fullCardCollection`.

#### A2: src/config/ (4 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| backgrounds.js | 61 | 3 | NAME, COMMENT, DEAD |
| devConfig.js | 53 | 1 | SMELL |
| gameConfig.js | 26 | 0 | -- |
| soundConfig.js | 210 | 2 | COMMENT, DEAD |

**Findings:**
- [NAME] backgrounds.js — inconsistent ID casing: `nebula_1` (snake_case) vs `Orbit_1`, `Deep_Space_1` (Pascal_Snake). Normalize to snake_case.
- [COMMENT] backgrounds.js — scaffolding "Add more backgrounds here" comment. Remove.
- [DEAD] backgrounds.js — `getBackgroundById` fallback chain could return undefined despite JSDoc contract.
- [SMELL] devConfig.js — `DEV_MODE = true` is hardcoded. Should derive from `import.meta.env.DEV` or warn about manual toggle.
- [DEAD] devConfig.js — redundant dual export (named + default). Pick one convention.
- [COMMENT] soundConfig.js — commented-out "Phase 2 (future)" railgun sounds. Track in FUTURE_IMPROVEMENTS.md or delete.
- [DEAD] soundConfig.js — `getSoundManifest()` is a trivial getter for `SOUND_MANIFEST`. Only one consumer; consider removing.

#### A3: src/theme/ (1 file)

| File | Lines | Issues | Tags |
|-|-|-|-|
| theme.js | 71 | 1 | DEAD |

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
| deckExportUtils.js | 495 | 2 | SIZE, PURITY |
| deckFilterUtils.js | 487 | 1 | SIZE |
| deckStateUtils.js | 49 | 0 | -- |
| droneSelectionUtils.js | 124 | 0 | -- |
| firstPlayerUtils.js | 142 | 0 | -- |
| gameUtils.js | 179 | 3 | PURITY, SMELL, DUP |
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
- [DEAD] Line 7: `import { FastForward } from "lucide-react"` — unused React icon import in a logging utility.
- [COMMENT] 35+ stale annotations in category config: `(DISABLED - not needed)`, `(ENABLED for Railgun investigation)`, `(NEW - for refactor)`. Duplicate category keys: `QUICK_DEPLOY`, `EXTRACTION`, `ENCOUNTER` (later keys shadow earlier).
- [PURITY] Timing utilities (`getTimestamp`, `timingLog`, `getBrowserState`) are separate concerns from logging.
- [LOG] `setDebugEnabled`/`setDebugCategory` use raw `console.log` for announcements.

**[STD-CHALLENGE-04]: Utils purity is systematically violated.** 10 of 13 utils files in batch 2 contain domain knowledge. Key misplacements:
- glossaryAnalyzer.js (834 lines) → should be `logic/glossary/` or `data/descriptions/`
- phaseValidation.js → should be `logic/`
- shipPlacementUtils.js → should be `logic/placement/`
- singlePlayerDeckUtils.js → should be `logic/deckBuilding/`
- slotDamageUtils.js → should be `logic/damage/`
- uiTargetingHelpers.js → should be `logic/targeting/`
- mapGenerator.js → should be `logic/map/`
- gameUtils.js — phase display names, lane calculations = domain knowledge

**Other findings:**
- [LOG] cardDrawUtils.js — 6x `console.warn` instead of debugLog.
- [LOG] mapGenerator.js:76,80 — raw `console.log` in production code.
- [LOG] phaseValidation.js — 6x `console.warn` instead of debugLog.
- [DEAD] cardDrawUtils.js — `calculateHandLimit` exported but never imported.
- [DEAD] csvExport.js — `navigator.msSaveBlob` IE10 compat code is dead in 2026.
- [DEAD] seededRandom.js — orphaned JSDoc block for deleted `forCardShuffle` factory.
- [DUP] cardDrawUtils.js — player 1/player 2 processing blocks are near-identical copy-paste (~30 lines each).
- [DUP] csvExport.js — `convertDecisionsToCsv` and `convertFullHistoryToCsv` share identical header/row logic.
- [DUP] cardBorderUtils.js ↔ cardTypeStyles.js — duplicate type color mappings.
- [DUP] gameUtils.js — `shuffleArray` trivially wraps `SeededRandom.shuffle`.
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
| ai/cardEvaluators/conditionalEvaluator.js | 301 | 1 | LOG |
| ai/cardEvaluators/damageCards.js | 476 | 1 | SMELL |
| ai/cardEvaluators/droneCards.js | 604 | 2 | DEAD, SIZE |
| ai/cardEvaluators/healCards.js | 98 | 0 | -- |
| ai/cardEvaluators/index.js | 115 | 1 | LOG |
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
| ai/helpers/keywordHelpers.js | 182 | 1 | DEAD |
| ai/helpers/upgradeHelpers.js | 114 | 0 | -- |
| ai/scoring/droneImpact.js | 55 | 1 | DEAD |
| ai/scoring/index.js | 8 | 0 | -- |
| ai/scoring/interceptionAnalysis.js | 248 | 0 | -- |
| ai/scoring/laneScoring.js | 113 | 1 | DEAD |
| ai/scoring/targetScoring.js | 302 | 0 | -- |

**Critical findings:**

- **[EDGE] aiLogic.js:799** — `positiveActionPool` can be empty, causing crash. `positiveActionPool[Math.floor(Math.random() * 0)]` returns `undefined`, next line crashes.
- **[SMELL] aiLogic.js** — 4x `Math.random()` instead of `SeededRandom`. Non-deterministic AI decisions.
- **[SIZE] aiLogic.js (1209)** — `handleOpponentAction` is ~385 lines, `makeInterceptionDecision` ~260 lines. God functions. Should be in `logic/ai/` not root.
- **[LOG] aiLogic.js:246** — raw `console.error`.
- **[DEAD] adjustmentPasses/index.js** — `applyAllAdjustments` exported but never imported. Uses `require()` in ES module.
- **[DEAD] ai/helpers/droneHelpers.js** — entire file unused (zero external consumers).
- **[DEAD] ai/scoring/droneImpact.js, laneScoring.js** — exported functions with zero consumers.
- **[COMMENT] ai/decisions/*.js** — stale "Future integration" stubs. Track or remove.
- **[SMELL] cardEvaluators/damageCards.js, movementCards.js, statusEffectCards.js** — magic numbers should be in `aiConstants.js`.
- **[LOGIC] droneAttack.js:138** — `Math.min` with `INTERCEPTION_COVERAGE_MIN` may have sign mismatch.

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

- **[TEST] No tests exist for any of these 14 files.** Core game logic with zero test coverage.
- **[ERROR] CommitmentStrategy.js:330** — `handleAICommitment` silently swallows errors (catch block logs but doesn't rethrow). AI commitment failure appears to succeed.
- **[LOGIC] CommitmentStrategy.js:44** — `clearPhaseCommitments` directly mutates `currentState` before `setState`. Mixed mutation/immutability.
- **[EDGE] TargetLockAbilityProcessor.js** — spends energy and ends turn even when target drone not found.
- **[LOG] 11x raw `console.warn`** across 5 ability files.
- **[DUP] CardActionStrategy.js** — `CARD_REVEAL` animation block duplicated 3x, callbacks object duplicated 2x.
- **[DUP] AbilityResolver.js** — `resolveShipRecallEffect` duplicates `RecallAbilityProcessor.process`. Dead code path.

#### B3: src/logic/combat/ + animations (11 files)

| File | Lines | Issues | Tags |
|-|-|-|-|
| combat/AttackProcessor.js | 809 | 5 | SIZE, SMELL, DUP, PURITY, EDGE |
| combat/InterceptionProcessor.js | 104 | 2 | IMPORT, DUP |
| combat/LaneControlCalculator.js | 159 | 2 | DEAD, DUP |
| combat/animations/ (8 files, 27-47 lines) | -- | 0 | Clean |

**Findings:**

- **[SIZE] AttackProcessor.js (809)** — `resolveAttack` is ~524 lines. God function with 6x duplicate "find drone in lanes" pattern.
- **[DUP] AttackProcessor.js** — `getLaneOfDrone` called 4x for same target in same path. Cache result.
- **[DEAD] LaneControlCalculator.js** — `getLanesNotControlled` exported but never imported.
- **[DUP] LaneControlCalculator.js** — `countLanesControlled` could be `getLanesControlled().length`.
- **[IMPORT] InterceptionProcessor.js** — imports from legacy `gameLogic.js` barrel instead of canonical `gameEngineUtils.js`.

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

- **[LOGIC] BaseEffectProcessor.js:83** — `createResult` auto-detects animation vs additional effects by checking `[0]?.type`. Fragile: effects also have `.type`. Latent bug.
- **[DUP] ConditionalSectionDamageProcessor.js** — `calculateDamageByType` copy-pasted from DamageEffectProcessor. Comment admits it.
- **[DUP] DamageEffectProcessor.js** — `processOverflowDamage` (158 lines) re-implements damage logic already in `calculateDamageByType`.
- **[DUP] DestroyEffectProcessor.js** — `onDroneDestroyed` + cleanup pattern repeated 5x across methods.
- **[LOG] DamageEffectProcessor.js** — 3x `console.warn`. StatusEffectProcessor.js:184 — template literal in single quotes (bug: logs literal `${target.id}`).
- **[SIZE] MovementEffectProcessor.js (633)** — `executeSingleMove` (186 lines) and `executeMultiMove` (166 lines) share significant structural duplication.

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
| encounters/EncounterController.js | 693 | 5 | SIZE, LOG, COMMENT, TODO, DUP |
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

- **[LOGIC] LootGenerator.js:417** — `this.generateSalvageItemFromValue(100, rng)` calls `this.` but it's an imported function. Will throw at runtime on fallback path.
- **[LOGIC] HighAlertManager.js:21** — `Math.random()` instead of `SeededRandom`. Breaks determinism.
- **[SIZE] CardPlayManager.js (868)** — god class. `resolveCardPlay` is 275 lines. Banned `// NEW:` comments. 2x `console.warn`.
- **[SIZE] CombatOutcomeProcessor.js (866)** — `processVictory` ~230 lines. Mixed mutation patterns. Should split into Victory/Defeat/LootCollector.
- **[SIZE] SinglePlayerCombatInitializer.js (810)** — `initiateCombat` ~260 lines, `buildPlayerState` ~170 lines.
- **[ERROR] CommitmentStrategy.js:330** — silently swallows AI commitment errors.
- **[DEAD] ShieldResetUtils.js:65** — `calculateReallocationDisplayShields` documented as "CURRENT BUG: not called". Dead code with known bug.
- **[DEAD] MovementController.js** — `handleHexArrival` and `movePlayer` appear to be dead code.
- **[DEAD] tickerConfig.js** — `MESSAGE_TEMPLATES` (100 lines) never imported by any generator.
- **[LOG] DetectionManager.js** — 4x raw `console.log`/`console.warn` including on every hex move.
- **[LOG] MovementController.js** — 7x raw `console.log`/`console.error`.
- **[LOG] LootGenerator.js** — 4x `console.warn`.
- **[LOG] PathValidator.js** — 2x raw `console.log`.
- **[DUP] A* search** implemented 3x across PathValidator and EscapeRouteCalculator. Extract shared utility.
- **[DUP] ExtractionController.js:358** — own LCG RNG implementation duplicating `SeededRandom`.
- **[DUP] saveGameFactory.js** — 6x `JSON.parse(JSON.stringify(...))`. Use `structuredClone`.
- **[TODO] SinglePlayerCombatInitializer.js:672** — "Load from ship slot if upgrades supported" — unresolved.
- **[TODO] EncounterController.js:405** — "Track looted POIs in currentRunState" — unresolved.
- **[TODO] MovementController.js:160,166** — stale TODOs for systems that exist elsewhere.
- **[PURITY] MissionService.js** — tutorial management (lines 302-366) bundled into MissionService. Should be `TutorialService`.
- **[LOGIC] LaneTargetingProcessor.js:39** — `affinity === 'ANY'` pushes 2 entries per lane (6 targets for 3 lanes). Consumers must handle correctly.
- **[LOGIC] BaseEffectProcessor.js:83** — fragile auto-detect of animation vs effect arrays.

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

- **[NAME] assetManifest.js:76-77,152** — Property `hanger` but UI label says "Hangar Interface". Spelling inconsistency propagates to consumers.
- **[LOGIC] AssetPreloader.js:97-100** — `.catch()` swallows errors silently, returning `undefined`. This makes `Promise.allSettled` at line 115 report "fulfilled with undefined" instead of "rejected". Defeats the purpose of `allSettled`.
- **[LOG] AssetPreloader.js:233** — `console.warn('Failed to load assets:')` should use `debugLog`. File already imports `debugLog` elsewhere.
- **[SMELL] gameDataCache.js:74,76** — Magic numbers `1000` (max cache) and `200` (eviction batch). Should be named constants.
- **[LOG] GameDataService.js:51** — `console.warn` in constructor should use `debugLog`.
- **[SMELL] GameDataService.js:246** — `getPlayerIdFromState` fallback uses `JSON.stringify(...).length` as identifier. String length is not a meaningful ID — different states can produce same length.
- **[LOGIC] GameDataService.js:285-295** — `hasGuardianInLane` with no `drones` arg → `getLaneData` → `hasGuardianInLane`. Fragile indirect recursion that only works because `getLaneData` always passes `opponentDrones`.
- **[LOG] SaveGameService.js:61-220** — 12 raw `console.log/warn/error` calls. Worst offender in services. No `debugLog` import at all.
- **[TEST] SaveGameService.js** — Test exists but only covers quickDeployments serialization; no coverage for MIA protocol or migration logic.
- **[SIZE] testGameInitializer.js** — 579 lines (400+ threshold). Three large functions; `createPlayerStateFromConfig` (127 lines) could extract.
- **[LOG] testGameInitializer.js:114,280,349** — 3 raw `console.error/warn` calls despite importing `debugLog`.
- **[LOGIC] testGameInitializer.js:318** — `sort(() => 0.5 - Math.random())` is a biased shuffle. Fine for test init but not uniform.
- **[DUP] testGameInitializer.js:150-163,296-300** — Ship section initialization (`JSON.parse(JSON.stringify(shipComponentCollection.find(...)))`) duplicated between two functions.
- **[EDGE] testGameInitializer.js:152-154,297-299** — `shipComponentCollection.find(c => c.key === 'bridge')` could return `undefined`. `JSON.stringify(undefined)` would throw.

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
- **[SIZE]** — 1673 lines, largest file in codebase. `onSimultaneousPhaseComplete` (lines 505-661) is 156 lines with drone extraction + RNG init logic that belongs in a dedicated handler.
- **[DUP] :343** — `const sequentialPhases = ['deployment', 'action']` repeated in GameFlowManager, ActionProcessor:433, AIPhaseProcessor:209, AIPhaseProcessor:259, and PhaseManager. Should be a shared constant.
- **[SMELL] :578,1360** — `this.gameStateManager._updateContext = 'GameFlowManager'` try/finally pattern appears 5 times. ActionProcessor already has `_withUpdateContext()`. Should share.
- **[LOGIC] :1083** — `getNextRequiredPhase` log references `ROUND_PHASES[i-1]` which on first iteration may reference the current phase, producing misleading log.
- **[TEST]** — Has 6 test files (main, quickDeploy, subscription, resubscribe, asymmetric, integration). Coverage exists.

**GuestMessageQueueService.js (1125 lines, 5 issues):**
- **[SIZE]** — 1125 lines. `processStateUpdate` (lines 634-1022) is 388 lines — a god function handling state comparison, animation filtering, teleport logic, phase queueing, cascade triggers, and state application.
- **[LOG] :64,517,626,953,967** — 5 raw `console.error`/`console.warn` calls.
- **[DUP] :130-184** — `addTeleportingFlags` nearly identical to `ActionProcessor.js:810-862`. Extract to shared utility.
- **[DUP] :193-287** — `arraysMatch` and `dronesMatch` comparison utilities belong in a shared module.
- **[PURITY]** — Mixed concerns: message queuing + state comparison + animation orchestration + teleport management + phase inference.

**GameStateManager.js (1068 lines, 5 issues):**
- **[SIZE]** — 1068 lines. Still has ~30 facade one-liners (lines 911-956) despite extracting 5 sub-managers.
- **[SMELL] :217** — `new Error().stack` on **every** `setState()` for caller detection. Performance concern in hot paths. Should be debug-only.
- **[LOGIC] :576-588** — `initializeTestMode` calls async `import().then()` but returns `true` synchronously. Caller has no way to know when init completes or fails.
- **[TODO] :136** — `// TODO: Remove facades when GFM/GMQS are updated` — stale TODO.
- **[IMPORT] :12** — Imports `tacticalMapStateManager` singleton directly, coupling two independent state domains.

**RewardManager.js (1028 lines, 5 issues):**
- **[SIZE]** — 1028 lines. Card selection pipeline (`selectCard`, `rollRarity`, `rollCardType`, `weightedRoll`, `shuffleArray`, `createRNG`) is a natural extraction seam.
- **[LOG] :336,497,609,833** — 4 `console.warn` calls.
- **[DEAD] :82-88** — `DEFAULT_STATE` constant defined but never referenced. Constructor creates same structure inline.
- **[TODO] :468** — `reputation: 0, // TODO: Calculate reputation` not tracked in FUTURE_IMPROVEMENTS.md.
- **[COMMENT]** — Test file `__tests__/RewardManager.test.js` contains banned `// NEW` comments (5 occurrences).

**ActionProcessor.js (1006 lines, 4 issues):**
- **[SIZE]** — 1006 lines. Teleport state management (~80 lines) could extract to shared `TeleportStateHandler`.
- **[TODO] :452,457** — Two TODOs for unimplemented shield allocation/reset in a live code path. If `allocateShields` phase is reachable, players get silent no-ops.
- **[DUP] :810-862** — `addTeleportingFlags` duplicated with GuestMessageQueueService.
- **[SMELL] :333-335** — `setAnimationManager` has inconsistent indentation.

**TransitionManager.js (642 lines, 1 issue):**
- **[IMPORT] :31-32** — Direct singleton imports of both `tacticalMapStateManager` and `gameStateManager`. Makes unit testing difficult without module mocking.

**AnimationManager.js (579 lines, 3 issues):**
- **[LOG] :446,453,494,500,524,531** — 6 raw `console.warn` calls.
- **[SMELL] :375-571** — `executeAnimations` is 196 lines with nested while/if/else branches. Sequence, damage-group, and sequential branches should be private methods.
- **[TEST]** — No test file exists.

**ShipSlotManager.js (577 lines, 3 issues):**
- **[SIZE]** — 577 lines (400+ threshold). Repair operations and instance operations are two sub-concerns.
- **[LOGIC] :362** — **CRITICAL BUG:** Fallback `ECONOMY.SECTION_DAMAGE_REPAIR_COST || 10` uses `10`, but the constant is `200`. Line 425 correctly uses `|| 200`. Inconsistent fallback would silently use wrong repair cost if constant removed.
- **[DUP] :194-216** — Empty slot template in `deleteShipSlotDeck` is a structural constant that likely duplicates `saveGameSchema.js` shape.

**RunLifecycleManager.js (494 lines, 3 issues):**
- **[SIZE]** — 494 lines. `startRun` (lines 34-255, ~220 lines) and `endRun` (lines 261-491, ~230 lines) are both large.
- **[SMELL] :34** — `startRun` accepts 5 parameters. Consider options object.
- **[TODO] :67-68** — Two TODOs (`// TODO: Use profile-based seed`, `// TODO: Support map type selection in Phase 4+`) not tracked in FUTURE_IMPROVEMENTS.md.

**PhaseManager.js (485 lines, 5 issues):**
- **[LOG] :87,92** — 2 `console.warn` calls alongside `debugLog`.
- **[LOG] :233,240,286** — 3 `console.error` calls alongside `debugLog`.
- **[DUP] :392-410** — **LATENT BUG:** `isSequentialPhase()` and `isSimultaneousPhase()` duplicate the static class arrays `SEQUENTIAL_PHASES`/`SIMULTANEOUS_PHASES` with local arrays. `determineFirstPlayer` is in static `SIMULTANEOUS_PHASES` but MISSING from instance `isSimultaneousPhase()`. This means `checkReadyToTransition` at line 184 treats `determineFirstPlayer` as "automatic" and transitions immediately instead of waiting for both players.
- **[SIZE]** — 485 lines (400+ threshold). Borderline; cohesive class.
- **[TODO] :336** — `broadcastPhaseUpdate` is a no-op stub. Not tracked in FUTURE_IMPROVEMENTS.md.

**AIPhaseProcessor.js (406 lines, 2 issues):**
- **[DUP] :209,259** — `const sequentialPhases = ['deployment', 'action']` duplicated twice, plus 3 more times in other files.
- **[SIZE]** — 406 lines (400+ threshold). Clean delegation-focused design.

**SoundManager.js (378 lines, 2 issues):**
- **[LOG] :69,178** — 2 `console.warn` calls for AudioContext creation/unlock failures.
- **[DUP] :186-230** — `preload()` duplicates the fetch-decode loop from `preloadOnly()` (lines 84-152). Extract shared `_loadBuffers`.

**MetaGameStateManager.js (373 lines, 1 issue):**
- **[LOG] :104** — `console.error` in `_emit` listener error handler.

**CombatStateManager.js (320 lines, 1 issue):**
- **[LOG] :67** — Raw `console.error` in `_emit`.

**PhaseAnimationQueue.js (301 lines, 1 issue):**
- **[SMELL] :180** — Magic number `1800` (1500ms display + 300ms fade). Should be named constants.

**OptimisticActionService.js (284 lines, 1 issue):**
- **[SMELL] :263** — `new Error().stack` in `clearTrackedAnimations()` for caller ID. Stack trace is expensive in hot animation path.

**TacticalMapStateManager.js (209 lines, 1 issue):**
- **[LOG] :68** — Raw `console.error` in `_emit()`.

**GuestSyncManager.js (199 lines, 1 issue):**
- **[DEAD] :62-63** — Empty `if` block with comment-only body. Remove dead branch.

**WaypointManager.js (173 lines, 1 issue):**
- **[LOG] :35** — Raw `console.log` for diagnostic logging.

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

- **[LOG] P2PManager.js** — 21 raw `console.error`/`console.warn` calls throughout (lines 65, 126, 240, 328, 339, 352, 355, 368, 373, 409, 421, 426, 439, 450, 455, 468, 480, 485, 507, 516). Worst logging violation in the codebase.
- **[SIZE]** — 593 lines (400+ threshold). Three sub-concerns: connection lifecycle (~170 lines), message sending (~150 lines), action handler setup (~85 lines).
- **[DUP]** — Guard pattern `if (!this.isConnected || !this.currentPeerId) { console.warn(...); return; }` copy-pasted in 5 methods. Extract `_requireConnection(context)`.
- **[DEAD] :515-526** — `syncGameState()` is deprecated with `console.warn`. Remove or fix callers.
- **[TEST]** — No test file. 593 lines of WebRTC lifecycle with no coverage is a significant gap.

#### Phase C — Critical Findings Summary

1. **[LOGIC] ShipSlotManager.js:362** — CRITICAL: Wrong fallback `|| 10` should be `|| 200` (silent pricing bug)
2. **[DUP] PhaseManager.js:392-410** — LATENT BUG: `isSimultaneousPhase()` hardcoded list missing `determineFirstPlayer`, diverges from static `SIMULTANEOUS_PHASES`. Causes premature phase transition.
3. **[LOG]** — 22 files have raw console calls. Worst: P2PManager (21), SaveGameService (12), AnimationManager (6), GuestMessageQueueService (5), PhaseManager (5).
4. **[SIZE]** — 5 files exceed 800 lines: GameFlowManager (1673), GuestMessageQueueService (1125), GameStateManager (1068), RewardManager (1028), ActionProcessor (1006). GuestMessageQueueService's `processStateUpdate` at 388 lines is the worst single method.
5. **[DUP] `sequentialPhases`** — Same array defined 5 times across 4 files. Single shared constant needed.
6. **[DUP] `addTeleportingFlags`** — Nearly identical in ActionProcessor and GuestMessageQueueService. Extract shared utility.
7. **[SMELL] GameStateManager.js:217** — `new Error().stack` on every `setState()` is expensive. Should be debug-only.

### Phase D — Hooks
#### D1: src/hooks/
| File | Lines | Issues | Status |
|-|-|-|-|

### Phase E — Components
#### E1: src/components/animations/
| File | Lines | Issues | Status |
|-|-|-|-|

#### E2: src/components/ships/
| File | Lines | Issues | Status |
|-|-|-|-|

#### E3: src/components/quickDeploy/
| File | Lines | Issues | Status |
|-|-|-|-|

#### E4: src/components/ui/
| File | Lines | Issues | Status |
|-|-|-|-|

#### E5: src/components/modals/
| File | Lines | Issues | Status |
|-|-|-|-|

#### E6: src/components/screens/
| File | Lines | Issues | Status |
|-|-|-|-|

### Phase F — App Root
#### F1: Root files
| File | Lines | Issues | Status |
|-|-|-|-|

### Phase G — Cross-cutting
(Import analysis, CSS strategy, standards synthesis)
