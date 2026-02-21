# Refactor: TacticalMapScreen.jsx

## Current State

- **Line count**: 3,548 lines (4.4x the 800-line smell threshold)
- **Existing test coverage**: None. No `__tests__/` folder exists under `src/components/screens/`.
- **Export**: Single default export `TacticalMapScreen` (function component, line 153-3546). One standalone helper `buildShipSections` (lines 74-134) defined outside component.

### Section Map

| Lines | Responsibility |
|-|-|
| 1-60 | Imports (60 imports) |
| 62-134 | `buildShipSections()` helper (outside component) |
| 153-281 | State declarations (~45 useState, ~12 useRef) |
| 283-328 | Music override effects (extraction, escape, threat-based) |
| 330-347 | Threat level change animation effect |
| 349-392 | State subscriptions + lifecycle logging + tutorial check |
| 394-604 | Post-combat mount effect (pending waypoints, POI loot, salvage restore) |
| 606-652 | Blockade extraction mount effects |
| 654-725 | `validQuickDeployments` useMemo |
| 727-764 | Safety redirect effect (no active run) |
| 775-796 | `waitWithPauseSupport` helper |
| 798-845 | `moveToSingleHex` handler |
| 851-1089 | `handleCommenceJourney` (240 lines - movement loop) |
| 1094-1111 | Pause/stop movement handlers |
| 1116-1248 | Encounter proceed/close handlers |
| 1257-1391 | Blueprint encounter handlers (accept, decline, quick deploy) |
| 1400-1589 | Salvage handlers (slot, leave, combat, quit) |
| 1594-1773 | Quick deploy routing handler |
| 1778-1956 | `handleLoadingEncounterComplete` (combat init) |
| 1961-2163 | Extraction handlers (extract, cancel, confirm, item, blockade, screen complete) |
| 2168-2198 | Abandon run handlers |
| 2207-2467 | Escape handlers (request, evade, threat reduce, confirm, loading complete) |
| 2472-2724 | Loot collection handlers (POI loot, blueprint reward) |
| 2738-2773 | Escape route useMemo + pathfinding mode handler |
| 2780-2800 | Early returns (no run state) |
| 2802-3111 | Render-time calculations (ship sections, preview path, waypoint management, stats) |
| 3113-3546 | JSX return (~430 lines, 15+ modal/screen conditionals) |

## Problems

### CODE_STANDARDS.md Violations

1. **Massive single component**: 3,548 lines with ~15 distinct responsibilities. CODE_STANDARDS requires one concern per file; 800+ is a "strong smell".
2. **Business logic in component**: Loot collection logic (lines 2498-2646), token handling, extraction limit calculation, salvage state management, detection cost calculations all live inside the component.
3. **`buildShipSections()` utility defined in component file** (lines 74-134): Should be in `src/logic/` per file type purity rules.
4. **Render-time functions not memoized**: `getPreviewPath`, `addWaypoint`, `removeWaypoint`, `recalculateWaypoints`, `clearAllWaypoints`, `handleHexClick`, `handleToggleWaypoint`, `handleInventory`, `handleCloseInventory` are plain functions recreated every render (lines 2813-3068).

### Dead Code

No legacy click-to-initiate-action dead code was found. The click handlers present (`handleHexClick`, `handleToggleWaypoint`, `handleWaypointClick`) are for hex inspection and waypoint management (sub-selections and UI buttons), which remain valid per the instructions.

### Missing/Inconsistent Logging

- **118 raw `console.log` / `console.warn` / `console.error` calls** throughout the file. CODE_STANDARDS require all logging to use `debugLog()` from `src/utils/debugLogger.js`.
- Some handlers use both `debugLog` AND `console.log` for the same event (e.g., lines 447-448, 467-468, 498-500, 556).
- Several `console.log` calls are development-time debugging that should be removed entirely (e.g., lines 2873-2875 logging every hex click parameter).

### Code Smell

1. **handleCommenceJourney** is 240 lines (851-1089) - a single callback doing movement, encounters, salvage, blueprints, waypoint trimming.
2. **handleEncounterProceedWithQuickDeploy** (1594-1773) duplicates large blocks of logic from `handleSalvageCombat` and `handleBlockadeCombat` for the quick deploy variant.
3. **Post-combat mount effect** (403-604) is 200 lines of complex branching logic in a single `useEffect`.
4. **handleLoadingEncounterComplete** (1778-1956) is 180 lines mixing validation, transition management, state storage, and combat initialization.
5. **handlePOILootCollected** (2498-2646) is 150 lines of loot processing business logic in a callback.
6. **Render section** (3070-3111) has inline stat calculations (extraction limit, hull totals, color helpers) that are pure business logic.
7. **Inline styles** throughout JSX header (lines 3125-3214) rather than CSS classes.

## Extraction Plan

### 1. Extract `useTacticalMapState` hook

**What**: All state declarations (~45 useState + ~12 useRef), state subscriptions, lifecycle logging, safety redirect, music effects, threat animation.
**Where**: `src/hooks/useTacticalMapState.js`
**Why**: ~300 lines of state management unrelated to rendering. Single responsibility.
**Dependencies**: `gameStateManager`, `tacticalMapStateManager`, `MusicManager`, `debugLog`. Returns all state values and setters as an object.

### 2. Extract `useTacticalMovement` hook

**What**: `waitWithPauseSupport`, `moveToSingleHex`, `handleCommenceJourney`, `handleTogglePause`, `handleStopMovement`, movement refs (`isPausedRef`, `shouldStopMovement`, `pathProgressRef`, `totalWaypointsRef`, `encounterResolveRef`, `escapedWithWaypoints`, `pendingCombatLoadingRef`, `skipWaypointRemovalRef`), movement constants (`SCAN_DELAY`, `MOVE_DELAY`).
**Where**: `src/hooks/useTacticalMovement.js`
**Why**: 350+ lines of movement loop logic. Self-contained concern with clear inputs (waypoints, map data) and outputs (movement state, handlers).
**Dependencies**: `tacticalMapStateManager`, `DetectionManager`, `EncounterController`, `SalvageController`, `MovementController`, `SoundManager`, `waypointManager`, `transitionManager`. Needs waypoints state and setters passed in.

### 3. Extract `useTacticalEncounters` hook

**What**: `handleEncounterProceed`, `handleEncounterClose`, all blueprint encounter handlers (accept, decline, quick deploy, accept-with-quick-deploy), all salvage handlers (slot, leave, combat, quit), `handleEncounterProceedWithQuickDeploy`, `handleLoadingEncounterComplete`.
**Where**: `src/hooks/useTacticalEncounters.js`
**Why**: ~700 lines of encounter/combat initiation logic. Distinct concern from movement and extraction.
**Dependencies**: Encounter state from `useTacticalMapState`, movement refs from `useTacticalMovement`, `EncounterController`, `SalvageController`, `SinglePlayerCombatInitializer`, `transitionManager`, `DetectionManager`.

### 4. Extract `useTacticalExtraction` hook

**What**: `handleExtract`, `handleExtractionCancel`, `handleExtractionConfirmed`, `handleExtractionWithItem`, `handleBlockadeCombat`, `handleBlockadeQuickDeploy`, `handleExtractionScreenComplete`, `handleAbandon`, `handleConfirmAbandon`.
**Where**: `src/hooks/useTacticalExtraction.js`
**Why**: ~250 lines of extraction/abandon logic. Clear single concern.
**Dependencies**: `ExtractionController`, `DetectionManager`, `EncounterController`, extraction-related state.

### 5. Extract `useTacticalEscape` hook

**What**: `handleEscapeRequest`, `handleEvadeItem`, `handleUseThreatReduce`, `handleRequestThreatReduce`, `handleTacticalItemCancel`, `handleTacticalItemConfirm`, `handleEscapeCancel`, `handleEscapeConfirm`, `handleEscapeLoadingComplete`.
**Where**: `src/hooks/useTacticalEscape.js`
**Why**: ~260 lines of escape/evade/item logic. Self-contained concern.
**Dependencies**: `ExtractionController`, `DetectionManager`, escape state, waypoint refs.

### 6. Extract `useTacticalLoot` hook

**What**: `handlePOILootCollected`, `handleBlueprintRewardAccepted`, `handleLootSelectionConfirm`, post-combat mount effect (POI loot processing).
**Where**: `src/hooks/useTacticalLoot.js`
**Why**: ~350 lines of loot collection/processing logic. Business logic that should not live in a component.
**Dependencies**: `tacticalMapStateManager`, `gameStateManager`, `DetectionManager`, `MissionService`, `RewardManager`, loot-related state.

### 7. Extract `useTacticalWaypoints` hook

**What**: `addWaypoint`, `removeWaypoint`, `recalculateWaypoints`, `clearAllWaypoints`, `isWaypoint`, `getLastJourneyPosition`, `getJourneyEndDetection`, `getJourneyEndEncounterRisk`, `getPreviewPath`, `handleToggleWaypoint`, `handleHexClick`, `handleWaypointClick`, `handleBackToJourney`.
**Where**: `src/hooks/useTacticalWaypoints.js`
**Why**: ~200 lines of waypoint management. Pure journey-planning concern.
**Dependencies**: `MovementController`, `EscapeRouteCalculator`, waypoint state, map data.

### 8. Move `buildShipSections` to logic layer

**What**: `buildShipSections()` function (lines 74-134)
**Where**: `src/logic/singlePlayer/ShipSectionBuilder.js`
**Why**: Pure utility with no React dependency. Data transformation belongs in logic layer.
**Dependencies**: `shipComponentCollection`, `getAllShips`, `getDefaultShip`, `calculateSectionBaseStats`.

### 9. Extract `TacticalMapHeader` sub-component

**What**: The inline `<header>` JSX (lines 3124-3214) plus stat calculations (extraction limit, hull totals, color helpers, lines 3070-3111).
**Where**: `src/components/ui/TacticalMapHeader.jsx`
**Why**: Visually distinct render section with its own styling and calculations. ~140 lines of JSX + ~40 lines of calculations.
**Dependencies**: Props for ship sections, credits, loot, detection, missions.

### 10. Extract `TacticalMapModals` sub-component

**What**: All modal rendering JSX (lines 3318-3536) — 15 conditionally rendered modals/screens.
**Where**: `src/components/ui/TacticalMapModals.jsx`
**Why**: Modal orchestration is a distinct rendering concern. ~220 lines of JSX.
**Dependencies**: All modal show/hide state and handler props. This is a "prop relay" component, but it reduces the main component's JSX from ~430 to ~210 lines.

## Dead Code Removal

### Specific items

1. **Excessive verbose debug logging in `addWaypoint`** (lines 2873-2875): Three consecutive `console.log` calls logging hex coordinates redundantly. Reduce to one `debugLog` call.
2. **`handleEncounterClose`** (lines 1244-1248): Delegates entirely to `handleEncounterProceed` with a comment "For now, closing is same as proceeding". Could be inlined or replaced with direct reference.
3. **`selectedQuickDeploy` state** (line 183): Set in multiple places but never read for rendering or logic. The deployment is always passed directly to handlers. Verify and remove if truly unused.
4. **Redundant `console.log` + `debugLog` pairs**: Lines 447-448, 467-468, 498-500, 556 — each event is logged twice, once with `console.log` and once with `debugLog`. Remove the `console.log` duplicate.

### No legacy click-to-initiate-action code found

All click handlers serve valid purposes: hex inspection, waypoint toggling, UI button actions, modal interactions. None initiate drag-and-drop actions via click.

## Logging Improvements

### Replace all 118 raw console calls with debugLog

Suggested category mapping:

| Current pattern | debugLog category |
|-|-|
| `[TacticalMap] Moved to hex...` | `MOVEMENT` |
| `[TacticalMap] Commencing journey...` | `MOVEMENT` |
| `[TacticalMap] Random encounter...` | `ENCOUNTER` |
| `[TacticalMap] Salvage...` | `SALVAGE` |
| `[TacticalMap] Blueprint...` | `ENCOUNTER` |
| `[TacticalMap] Extraction...` | `MODE_TRANSITION` |
| `[TacticalMap] Escape...` | `COMBAT_FLOW` |
| `[TacticalMap] POI loot...` | `LOOT` |
| `[TacticalMap] Quick deploy...` | `QUICK_DEPLOY` |
| `[TacticalMap] Abandon...` | `MODE_TRANSITION` |
| `[TacticalMap] No active run...` | `MODE_TRANSITION` |
| `console.error(...)` | `debugLog('ERROR', ...)` |
| `console.warn(...)` | `debugLog('WARN', ...)` |

### Noisy logs to reduce

- `addWaypoint` (lines 2873-2875, 2920-2921): 5 log lines per waypoint add. Reduce to 1.
- `moveToSingleHex` (line 834): Logs every hex movement. Keep but use `MOVEMENT` category for filtering.
- `handleSalvageSlot` (line 1414): Verbose object log on every slot click. Reduce.
- `validQuickDeployments` useMemo (lines 661-724): 12 `debugLog` calls in a single memo. Reduce to 2 (entry + result).

## Comment Cleanup

### Stale/noise comments to remove

- Line 155: `// State from TacticalMapStateManager (new architecture - will replace currentRunState)` — "new architecture" is current reality, not new.
- Line 199-202: `// NOTE: FailedRunLoadingScreen state has been consolidated...` — implementation note, not "why".
- Line 767-769: `// HOOKS MUST BE BEFORE EARLY RETURNS` — self-evident from React rules. The 3-line block comment is noise.
- Line 2726-2731: Same hooks comment repeated.
- Line 887: `// NOTE: Don't set currentHexIndex here...` — implementation detail, could be shortened.

### Useful comments to add

- Top of each extracted hook: Brief doc comment explaining the hook's role in the tactical map flow.
- `handleCommenceJourney`: Document the async movement loop flow (scan -> move -> encounter check -> trim path).

## Testing Requirements

### Intent-based tests BEFORE extraction

Create `src/components/screens/__tests__/TacticalMapScreen.test.jsx`:

1. **Waypoint management**: Add waypoint calculates correct cumulative detection. Remove waypoint recalculates subsequent paths. Clear all resets to empty.
2. **Movement flow**: Commence journey iterates waypoints. Pause/resume controls movement. Stop cancels movement.
3. **Encounter flow**: Combat encounter shows loading screen. Loot encounter shows loot modal. Escape applies damage and restores waypoints.
4. **Extraction flow**: Extract at gate shows confirmation. Blockade triggers combat. Loot selection enforces limit.

After extraction, move relevant tests to hook-specific test files:
- `src/hooks/__tests__/useTacticalWaypoints.test.js`
- `src/hooks/__tests__/useTacticalMovement.test.js`
- `src/hooks/__tests__/useTacticalEncounters.test.js`
- `src/hooks/__tests__/useTacticalExtraction.test.js`
- `src/hooks/__tests__/useTacticalEscape.test.js`
- `src/hooks/__tests__/useTacticalLoot.test.js`

### Tests for extracted utility

- `src/logic/singlePlayer/__tests__/ShipSectionBuilder.test.js`: Test `buildShipSections` with run-state sections, component instances, and base stats fallback.

## Execution Order

Each step is independently committable with tests green.

1. **Add baseline tests** for TacticalMapScreen (integration-level, verifying current behavior).
2. **Replace all 118 console.log/warn/error calls** with `debugLog()`. Pure logging change, no behavior change. Reduce noisy log sites.
3. **Remove stale comments** identified above.
4. **Extract `buildShipSections`** to `src/logic/singlePlayer/ShipSectionBuilder.js` + test. Update import in TacticalMapScreen.
5. **Extract `useTacticalMapState`** hook. Update TacticalMapScreen to use it.
6. **Extract `useTacticalWaypoints`** hook. Update TacticalMapScreen.
7. **Extract `useTacticalMovement`** hook. Update TacticalMapScreen.
8. **Extract `useTacticalEncounters`** hook. Update TacticalMapScreen.
9. **Extract `useTacticalExtraction`** hook. Update TacticalMapScreen.
10. **Extract `useTacticalEscape`** hook. Update TacticalMapScreen.
11. **Extract `useTacticalLoot`** hook. Update TacticalMapScreen.
12. **Extract `TacticalMapHeader`** sub-component. Move inline styles to CSS.
13. **Extract `TacticalMapModals`** sub-component.
14. **Verify `selectedQuickDeploy`** usage and remove if dead state.
15. **Final review**: Verify TacticalMapScreen is under 400 lines, all hooks tested, all imports updated.

## Risk Assessment

### What could break

- **Movement loop async flow**: The `handleCommenceJourney` function uses `await`, refs, and promise-based encounter resolution. Extracting it into a hook changes closure scope. Refs must be shared correctly between movement and encounter hooks.
- **State interdependencies**: Many handlers read and write to multiple state slices. When split across hooks, stale closures could cause bugs. Use refs for synchronous values needed across hooks.
- **Post-combat mount effect** (lines 403-604): This single effect does waypoint restoration, salvage restoration, and loot generation. Splitting it must preserve the execution order and conditional logic.
- **Modal show/hide orchestration**: Some modals close one and open another (e.g., quick deploy back button logic, lines 3365-3381). The relay logic must remain coordinated.

### Drag-and-drop flows to verify

- No drag-and-drop exists on the tactical map. All interactions are click-based (hex click to inspect, button click to add waypoint, button click to commence journey). Verify these click flows work after extraction.

### How to validate

1. **Manual smoke test**: Start a run, navigate the tactical map, visit POIs, trigger encounters, escape, extract. Verify all modal flows.
2. **Automated tests**: Run the baseline test suite after each extraction step.
3. **Console audit**: After logging migration, verify no raw `console.log` remains. Run `grep -r "console\." src/components/screens/TacticalMapScreen.jsx` to confirm.
4. **Import audit**: After each extraction, verify no circular dependencies. Run the app and check for import errors.
5. **State persistence**: Verify combat -> tactical map -> combat round-trip preserves waypoints, detection, and salvage state. This is the highest-risk flow.

---

## Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

*To be completed before refactoring begins. This section documents the current behavior, intent, contracts, dependencies, edge cases, and non-obvious design decisions of the code being refactored. Once written, this section is never modified — it serves as the permanent "before" record.*

## Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
