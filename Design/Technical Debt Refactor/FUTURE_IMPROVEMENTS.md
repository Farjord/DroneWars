# Future Improvements

Items deferred during refactoring — not bugs, not blocking, but worth fixing when the relevant file is next touched.

## Active Items

| # | File | Issue | Source | Date | Priority |
|-|-|-|-|-|-|
| ~~1~~ | ~~CommitmentStrategy.js~~ | ~~Direct mutation of state from getState() before setState()~~ | ~~ActionProcessor code review~~ | ~~2026-02-22~~ | ~~Resolved~~ |
| 2 | CardActionStrategy.js | 685 lines — could split into core card play vs. completion flows | ActionProcessor code review | 2026-02-22 | Low |
| 3 | CombatActionStrategy.js | 520 lines — processMove alone is ~220 lines due to keyword/mine/beacon logic | ActionProcessor code review | 2026-02-22 | Low |
| 4 | ActionProcessor.js | `processFirstPlayerDetermination` registry key has inconsistent naming (includes `process` prefix) | ActionProcessor code review | 2026-02-22 | Low |
| 5 | ActionProcessor.js | `addTeleportingFlags` returns inconsistent shapes (full state vs player-only object) | ActionProcessor code review | 2026-02-22 | Low |
| 6 | GameStateManager.js | Post-extraction residual 1,068 lines (constructor+state shape 142, thin setters 155, game lifecycle 250, event system 30, action delegation 40, ~60 facade lines). Below 400 is unrealistic without splitting core concerns or removing facades. | GSM Session C complete | 2026-02-22 | Low |
| 7 | GameStateManager.js | `setState()` creates `new Error().stack` on every call for caller detection — expensive in production. Consider gating behind dev-only flag or removing after extractions reduce call sites. | GSM behavioral baseline | 2026-02-22 | Medium |
| ~~8~~ | ~~ShipSlotManager.js~~ | ~~`repairSectionSlotPartial()` default cost (200) differs from `repairSectionSlot()` default cost (10)~~ | ~~GSM behavioral baseline → GSM Session C code review~~ | ~~2026-02-22~~ | ~~Resolved~~ |
| 9 | GameStateManager.js | ~40 facade methods remain on GSM after all 6 extractions (Sessions B+C). External callers (HangarScreen, RepairBayScreen, ExtractionDeckBuilder, DroneDamageProcessor, CombatOutcomeProcessor, ExtractionController, DetectionManager, EremosEntryScreen, SaveLoadModal, BlueprintsModal, RepairService, ShopModal, TacticalMapScreen) should import new managers directly. GFM/GMQS need constructor signature changes to receive GuestSyncManager. | GSM Session C complete | 2026-02-22 | Medium |
| 10 | GameFlowManager.js | `extractDronesFromDeck()` is a pure lookup function (name → drone object) with no dependency on GFM state. Used only in deck selection commitment handler (lines 544, 558). Candidate for extraction to a deck/drone utility. | GFM code review | 2026-02-22 | Low |
| 11 | GameFlowManager.js | At 1,671 lines, still above the 800-line target. Remaining methods are cohesive phase flow orchestration. Further splitting would require decomposing the event/pub-sub system or the phase transition orchestration, which would fragment a single concern. | GFM refactoring complete | 2026-02-22 | Low |
| 12 | DeckBuilderLeftPanel.jsx | Ship components section (lines 486-627) has 3 nearly identical ~40-line blocks for Bridge/Power Cell/Drone Control Hub differing only in type string and color class. Extract a `ShipComponentSection` helper to eliminate ~80 lines. | DeckBuilder code review | 2026-02-22 | Medium |
| 13 | DeckBuilderLeftPanel.jsx | Sortable table headers repeated 15+ times across cards/drones tables with identical className logic. Extract a `SortableHeader` component. | DeckBuilder code review | 2026-02-22 | Medium |
| 14 | HangarScreen.jsx | At 568 lines, above 400-line guideline but below 800. Remaining code is handlers + state declarations — cohesive orchestration. Further splitting would fragment the handler logic. | HangarScreen refactoring | 2026-02-22 | Low |
| 15 | useTacticalEncounters.js | At 935 lines, far exceeds 400-line guideline. Splitting into POI/Salvage/Blueprint sub-hooks would create circular deps through quick deploy dispatch. Combat init dedup (5 similar patterns) deferred for behavior preservation. | TacticalMapScreen refactoring | 2026-02-22 | Medium |
| 16 | TacticalMapScreen.jsx | Orchestrator at 675 lines — above 400 target. Remaining code is ~45 useState + ~12 useRef declarations, 7 hook calls, sharedRefs bundle, and core JSX layout. Further splitting would fragment React state. | TacticalMapScreen refactoring | 2026-02-22 | Low |
| 17 | TacticalMapModals.jsx | Prop relay pattern (337 lines, 40+ props). Future refactor could use modal context or modal manager to reduce prop drilling. | TacticalMapScreen refactoring | 2026-02-22 | Low |
| 18 | useTacticalMovement.js | At 390 lines, near 400-line guideline. handleCommenceJourney alone is ~240 lines. Acceptable — splitting would break the async movement loop's closure. | TacticalMapScreen refactoring | 2026-02-22 | Low |
| 19 | useDragMechanics.js | At 1,633 lines (2x 800-line threshold). All drag handlers consolidated into one hook per architect correction #3. Potential split: useDeploymentDrag (~100 lines), useActionCardDrag (~600 lines), useDroneDrag (~900 lines). Deferred because handlers share 10 state vars + 5 refs. | App.jsx Session 4 | 2026-02-23 | Medium |
| 20 | ModalLayer.jsx | Prop relay pattern (430 lines, 60+ props). Similar to TacticalMapModals (#17). Future refactor could use modal context or modal manager. | App.jsx Session 4 | 2026-02-23 | Low |
| 21 | App.jsx | At 1,331 lines after Session 6 (11 hooks, 3 sub-components). Remaining: ~40 useState declarations, 4 useEffects, cancelAllActions, handleConfirmDeployment, JSX return (~385 lines). Pure orchestration/composition root — no further extraction warranted. | App.jsx Session 6 | 2026-02-23 | Resolved |
| 22 | useClickHandlers.js | At 956 lines (above 800-line threshold). Contains 7 click handlers + module-level TargetingRouter. Potential split: useCardInteractions (handleCardClick, handleTargetClick) vs useUnitInteractions (handleTokenClick, handleLaneClick, handleAbilityIconClick, handleShipAbilityClick). Deferred because handlers share many params. | App.jsx Session 5 | 2026-02-23 | Low |
| ~~32~~ | ~~CSS strategy~~ | ~~Hybrid approach documented in CODE_STANDARDS.md. STD-CHALLENGE-03 resolved.~~ | ~~Codebase audit~~ | ~~2026-02-24~~ | ~~Resolved~~ |
| 33 | EncounterController.js:405 | POI looting not persisted to `currentRunState.lootedPOIs` — encounter completes but save/resume may re-trigger POIs | TODO triage (Phase E3) | 2026-02-24 | Medium |
| 34 | ActionProcessor.js:453,458 | Shield allocation/reset return placeholder success messages — functional via useShieldAllocation hook but gameEngine-level integration pending | TODO triage (Phase E3) | 2026-02-24 | Low |
| 35 | RewardManager.js:460 | Reputation returns hardcoded 0 — full reputation system exists (ReputationService, MetaGameStateManager) but loot reward integration incomplete | TODO triage (Phase E3) | 2026-02-24 | Low |
| 36 | SinglePlayerCombatInitializer.js:672 | `appliedUpgrades = {}` hardcoded — ship slot upgrades feature not yet designed | TODO triage (Phase E3) | 2026-02-24 | Low |
| 37 | RunLifecycleManager.js:67-68 | Seed uses `Date.now()` (should use profile-based seed) and map type hardcoded to `'GENERIC'` (should support selection) | TODO triage (Phase E3) | 2026-02-24 | Low |
| 38 | useClickHandlers.js:146,864,881 | 3 `TECHNICAL DEBT` TODOs: `getLaneOfDrone` utility extraction, `getValidTargets` for special/upgrade cards | TODO triage (Phase E3) | 2026-02-24 | Low |
| 39 | useAnimationSetup.js | 33 positional parameters — refactor to a single deps/config object for readability and maintainability | Architect review (W1) | 2026-02-24 | Medium |
| 40 | ShipPlacementScreen.jsx:186,245,256 | 3 error paths log failures but show no user-facing UI feedback (empty sections, submission failure, exception) | TODO triage (Phase K) | 2026-02-24 | Low |
| 41 | PathValidator+EscapeRouteCalculator | A* search implemented 3x — extract shared pathfinding utility | Audit closure (Phase M) | 2026-02-24 | Low |
| 42 | GameFlowManager+3 files | `sequentialPhases` still duplicated in 4 files despite `SEQUENTIAL_PHASES` in gameUtils.js | Audit closure (Phase M) | 2026-02-24 | Low |
| 43 | GameFlowManager.js | `_updateContext` try/finally pattern repeated 5x — share ActionProcessor's `_withUpdateContext()` | Audit closure (Phase M) | 2026-02-24 | Low |
| 44 | SoundManager.js | `preload()` duplicates fetch-decode loop from `preloadOnly()` — extract shared `_loadBuffers` | Audit closure (Phase M) | 2026-02-24 | Low |
| 45 | useTacticalWaypoints.js | Detection cost + encounter risk calc duplicated between `addWaypoint` and `recalculateWaypoints` | Audit closure (Phase M) | 2026-02-24 | Low |
| 46 | GameDataService.js:246 | `getPlayerIdFromState` uses `JSON.stringify(...).length` as fallback ID — fragile, non-unique | Audit closure (Phase M) | 2026-02-24 | Low |
| 47 | GameDataService.js:285 | `hasGuardianInLane` fragile indirect recursion — works but risky when refactoring | Audit closure (Phase M) | 2026-02-24 | Low |
| 48 | Hook files (useResolvers, useGameLifecycle) | `Date.now()` / `Date.now()+Math.random()` for animation/instance IDs — collision risk, desync risk | Audit closure (Phase M) | 2026-02-24 | Low |
| 49 | useResolvers.js:148 | `resolveShipAbility` lacks try/catch around `processActionWithGuestRouting` | Audit closure (Phase M) | 2026-02-24 | Low |
| 50 | useMultiplayerSync.js:249 | `render_complete` event fires on every `gameState` change — excessive fire rate | Audit closure (Phase M) | 2026-02-24 | Low |
| 51 | useDeckBuilderData.js:292 | `typeLimits` computed outside `useMemo` but used in memoized `isDeckValid` — could be stale | Audit closure (Phase M) | 2026-02-24 | Low |
| 52 | CardActionStrategy.js | `CARD_REVEAL` animation block duplicated 3x, callbacks object duplicated 2x | Audit closure (Phase M) | 2026-02-24 | Low |
| 53 | App.jsx:601 | `cancelAllActions` is a plain function (not `useCallback`) — defeats memoization in useDragMechanics | Audit closure (Phase M) | 2026-02-24 | Low |
| 54 | useCardSelection.js:267 | useEffect deps include `additionalCostState` but early-returns skip recalculation — fires unnecessarily | Audit closure (Phase M) | 2026-02-24 | Low |
| 55 | TestingSetupScreen.jsx:862-1005 | Lane controls for lane1/lane2/lane3 copy-pasted 3x — dev-only, fix when UI revamped | Audit closure (Phase M) | 2026-02-24 | Low |
| 56 | QuickDeployEditorScreen.jsx:346-417 | Deployment order index remapping duplicated | Audit closure (Phase M) | 2026-02-24 | Low |
| 57 | Forced Repositioning card | Still uses `additionalCost` flow with `COST_SOURCE_LANE`/`COST_TARGET` location values. Migrating to `secondaryTargeting` requires a chained 4-step targeting engine (select drone → move → select enemy → move). Not feasible with current 2-step secondary targeting model. | Targeting system rework Phase 6 | 2026-02-25 | Low |
| 58 | CardPlayManager.js | `resolveCardPlay` is dead production code — only its own test calls it. `payCardCosts`/`finishCardPlay` are still used by CardActionStrategy. Extract those 2 methods and delete the rest. | Effect chain Phase 7 completion | 2026-02-25 | Medium |
| 59 | src/logic/ (5 files) | Remaining `Math.random()` in game logic: `cardBorderUtils.js` (UI delay), `tacticalGenerators.js` + `rumorGenerator.js` (ticker text), `cardPackUtils.js` + `ExtractionController.js` (single-player extraction). Safe for now (UI-only or single-player), but violates the new determinism standard. Categorize each and convert where needed. | Determinism fix review | 2026-02-28 | Low |

## Audit Findings (2026-02-23)

Items discovered during the full codebase audit (`Design/CODEBASE_AUDIT.md`). Structural issues are Medium/Low.

### Structural

| # | File/Area | Issue | Priority |
|-|-|-|-|
| 23 | ~200 raw `console.log` calls | Across ~64 non-test files. Top: P2PManager (20), SaveGameService (11), useAnimationSetup (9), cardDrawUtils (8). | Medium |
| 24 | 26 hooks — zero test coverage | 10,413 lines completely untested. Highest risk: useDragMechanics (1653), useClickHandlers (956), useTacticalEncounters (931). | Medium |
| ~~25~~ | ~~10+ utils files with domain logic~~ | ~~Resolved: 11 domain-aware utils migrated to `logic/` subdirectories (2026-02-24)~~ | ~~Resolved~~ |
| 26 | useAnimationSetup.js:8-899 | Entire hook body is a single 890-line useEffect. | Medium |
| 27 | useGameLifecycle.js:293,316,356 | 3 `const result = await processActionWithGuestRouting(...)` assigned but never read. Dead code. | Low |
| 28 | 23 actionable TODOs in production code | Spread across ActionProcessor, RunLifecycleManager, ShipPlacementScreen, useClickHandlers, MovementController, PhaseManager, RewardManager, GSM. | Low |

## SIZE Tracking (Phase K)

Files over 800 lines — decomposition candidates. Items already tracked above are listed with their existing `#` for cross-reference.

| File | Lines | Notes | Priority |
|-|-|-|-|
| GameFlowManager.js | 1673 | Cohesive orchestration — deferred #11 | Low |
| useDragMechanics.js | 1653 | Shared state prevents split — deferred #19 | Medium |
| App.jsx | 1333 | Orchestration root — resolved #21 | Resolved |
| TestingSetupScreen.jsx | 1111 | Dev/test screen, extract LaneControlSection | Low |
| modalShowcaseHelpers.js | 1113 | Dev-only helpers | Low |
| GameStateManager.js | 1068 | Post-extraction residual — deferred #6 | Low |
| GuestMessageQueueService.js | 981 | Stateful queue processor | Low |
| HexGridRenderer.jsx | 973 | Large renderer | Medium |
| ActionProcessor.js | 953 | Strategy pattern host | Low |
| HexInfoPanel.jsx | 933 | Extract getHexPreview | Medium |
| useClickHandlers.js | 922 | Shared params prevent split — deferred #22 | Low |
| QuickDeployEditorScreen.jsx | 904 | Extract remapping helper | Low |
| useTacticalEncounters.js | 871 | Circular deps prevent split — deferred #15 | Medium |
| CardPlayManager.js | 868 | Extract UI-coupled code | Medium |
| CombatOutcomeProcessor.js | 866 | Combat resolution | Low |
| GlossaryModal.jsx | 851 | Pure reference content | Low |
| SinglePlayerCombatInitializer.js | 810 | Initialization | Low |
| AttackProcessor.js | 809 | resolveAttack god function | Medium |

## Resolved Items

| # | File | Issue | Resolved | How |
|-|-|-|-|-|
| 21 | App.jsx | handleCardClick, handleLaneClick, handleTokenClick remain due to cancelAllActions circular dep | 2026-02-23 | Extracted to useClickHandlers hook; cancelAllActions passed as param |
| 21 | App.jsx | At 2,169 lines — resolve* functions, effects, modal callbacks remain | 2026-02-23 | Session 6: extracted useResolvers (608 lines) + useActionRouting (106 lines), moved 5 effects + 3 handlers. App.jsx now 1,331 lines — pure orchestration root |
| 23–27 | useGameLifecycle, AIDecisionLogModal, TacticalTicker, PhaseManager, quickDeploy/index | 5 high-priority bugs: CSV column mismatch, prop mutation, stale closure, phase list divergence, broken export | 2026-02-23 | Direct fix |
| 28–30 | useResolvers, FlashEffect, LaserEffect | 3 medium-priority bugs: null guards, try/catch, timer cleanup | 2026-02-23 | Direct fix |
| 31 | BaseEffectProcessor.js | Fragile type detection in createResult | 2026-02-23 | Direct fix |
| 25 | 10+ utils files with domain logic | Violate "pure utility" standard | 2026-02-24 | Migrated 11 files to `logic/` subdirectories |
| 1 | CommitmentStrategy.js | Direct mutation of state from getState() before setState() | 2026-02-24 | Built new commitments object in clearPhaseCommitments (Phase G) |
| 32 | CSS strategy | No documented CSS standard (STD-CHALLENGE-03) | 2026-02-24 | Documented in CODE_STANDARDS.md: co-located plain CSS, styles/ for shared, CSS Modules optional |
| 8 | ShipSlotManager.js | Inconsistent repair cost fallbacks (10 vs 200) | 2026-02-24 | Both methods now use `|| 200` |
