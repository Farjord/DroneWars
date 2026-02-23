# Codebase Audit

## Meta
- Started: 2026-02-23
- Last Session: 2026-02-23
- Progress: 0/~500 source files (0%)
- Current Phase: Phase A — Foundation
- Next File: src/data/ (first file)
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

(Additional challenges will be collected during file-by-file reviews in Phases A-F)

## Review Log

### Phase A — Foundation
#### A1: src/data/
| File | Lines | Issues | Status |
|-|-|-|-|

#### A2: src/config/
| File | Lines | Issues | Status |
|-|-|-|-|

#### A3: src/theme/
| File | Lines | Issues | Status |
|-|-|-|-|

#### A4: src/utils/
| File | Lines | Issues | Status |
|-|-|-|-|

### Phase B — Logic
#### B1: src/logic/ai/
| File | Lines | Issues | Status |
|-|-|-|-|

#### B2: src/logic/targeting/
| File | Lines | Issues | Status |
|-|-|-|-|

#### B3: src/logic/combat/
| File | Lines | Issues | Status |
|-|-|-|-|

#### B4: src/logic/effects/
| File | Lines | Issues | Status |
|-|-|-|-|

#### B5: src/logic/ (remaining)
| File | Lines | Issues | Status |
|-|-|-|-|

### Phase C — Services + Managers
#### C1: src/services/
| File | Lines | Issues | Status |
|-|-|-|-|

#### C2: src/managers/
| File | Lines | Issues | Status |
|-|-|-|-|

#### C3: src/network/
| File | Lines | Issues | Status |
|-|-|-|-|

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
