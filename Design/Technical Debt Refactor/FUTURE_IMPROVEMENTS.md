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
| ~~10~~ | ~~GameFlowManager.js~~ | ~~`extractDronesFromDeck()` extracted to `droneSelectionUtils.js`~~ | ~~GFM refactor~~ | ~~2026-02-22~~ | ~~Resolved~~ |
| 11 | GameFlowManager.js | At 1,600 lines after GuestCascadeRunner extraction + utility consolidation. Still above 800-line target. Remaining methods are cohesive phase flow orchestration — further splitting would fragment the phase state machine. | GFM refactor | 2026-03-07 | Low |
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
| ~~43~~ | ~~GameFlowManager.js~~ | ~~`_updateContext` try/finally pattern consolidated into `_setStateAsGFM()` helper~~ | ~~GFM refactor~~ | ~~2026-02-24~~ | ~~Resolved~~ |
| 44 | SoundManager.js | `preload()` duplicates fetch-decode loop from `preloadOnly()` — extract shared `_loadBuffers` | Audit closure (Phase M) | 2026-02-24 | Low |
| 45 | useTacticalWaypoints.js | Detection cost + encounter risk calc duplicated between `addWaypoint` and `recalculateWaypoints` | Audit closure (Phase M) | 2026-02-24 | Low |
| 46 | GameDataService.js:246 | `getPlayerIdFromState` uses `JSON.stringify(...).length` as fallback ID — fragile, non-unique | Audit closure (Phase M) | 2026-02-24 | Low |
| 47 | GameDataService.js:285 | `hasGuardianInLane` fragile indirect recursion — works but risky when refactoring | Audit closure (Phase M) | 2026-02-24 | Low |
| 48 | Hook files (useResolvers, useGameLifecycle) | `Date.now()` / `Date.now()+Math.random()` for animation/instance IDs — collision risk, desync risk | Audit closure (Phase M) | 2026-02-24 | Low |
| 49 | useResolvers.js:148 | `resolveShipAbility` lacks try/catch around `processActionWithGuestRouting` | Audit closure (Phase M) | 2026-02-24 | Low |
| ~~50~~ | ~~useMultiplayerSync.js:249~~ | ~~`render_complete` event fires on every `gameState` change~~ — moved to Resolved | | |
| 51 | useDeckBuilderData.js:292 | `typeLimits` computed outside `useMemo` but used in memoized `isDeckValid` — could be stale | Audit closure (Phase M) | 2026-02-24 | Low |
| 52 | CardActionStrategy.js | `CARD_REVEAL` animation block duplicated 3x, callbacks object duplicated 2x | Audit closure (Phase M) | 2026-02-24 | Low |
| 53 | App.jsx:601 | `cancelAllActions` is a plain function (not `useCallback`) — defeats memoization in useDragMechanics | Audit closure (Phase M) | 2026-02-24 | Low |
| 54 | useCardSelection.js:267 | useEffect deps include `additionalCostState` but early-returns skip recalculation — fires unnecessarily | Audit closure (Phase M) | 2026-02-24 | Low |
| 55 | TestingSetupScreen.jsx:862-1005 | Lane controls for lane1/lane2/lane3 copy-pasted 3x — dev-only, fix when UI revamped | Audit closure (Phase M) | 2026-02-24 | Low |
| 56 | QuickDeployEditorScreen.jsx:346-417 | Deployment order index remapping duplicated | Audit closure (Phase M) | 2026-02-24 | Low |
| 57 | Forced Repositioning card | Still uses `additionalCost` flow with `COST_SOURCE_LANE`/`COST_TARGET` location values. Migrating to `secondaryTargeting` requires a chained 4-step targeting engine (select drone → move → select enemy → move). Not feasible with current 2-step secondary targeting model. | Targeting system rework Phase 6 | 2026-02-25 | Low |
| 58 | CardPlayManager.js | `resolveCardPlay` is dead production code — only its own test calls it. `payCardCosts`/`finishCardPlay` are still used by CardActionStrategy. Extract those 2 methods and delete the rest. | Effect chain Phase 7 completion | 2026-02-25 | Medium |
| 59 | src/logic/ (5 files) | Remaining `Math.random()` in game logic: `cardBorderUtils.js` (UI delay), `tacticalGenerators.js` + `rumorGenerator.js` (ticker text), `cardPackUtils.js` + `ExtractionController.js` (single-player extraction). Safe for now (UI-only or single-player), but violates the new determinism standard. Categorize each and convert where needed. | Determinism fix review | 2026-02-28 | Low |
| 60 | App.jsx + HandLimitManager.js | Hand limit logic boundary violation: `App.jsx:427-428` computes `excessCards = hand.length - handLimit` inline instead of calling `HandLimitManager.checkHandLimitViolations()`. This duplicates logic already in `PhaseRequirementChecker.playerExceedsHandLimit()`. `HandLimitManager` has 3 methods with zero callers — the UI bypassed it. Fix: wire `App.jsx` to consume `HandLimitManager` results via a hook or manager, and use `HandLimitManager.enforceHandLimits()` for AI auto-discard. | Determinism fix review | 2026-02-28 | Medium |
| 61 | EffectChainProcessor.js | Deep-clone cost in trigger deferral: each trigger batch produces 2+ `JSON.parse(JSON.stringify(...))` snapshots of the full player state (preTriggerState at processor level + preCardPlayTriggerState in chain + fireTrigger's own STATE_SNAPSHOTs). A card with movement + ON_CARD_PLAY triggers generates 3+ deep clones per play. Consider a structural-sharing snapshot (immutable state) or lazy snapshot that only clones on first mutation. | Trigger animation deferral code review | 2026-02-28 | Low |
| 62 | GameHeader.jsx | At 636 lines — KPI popup logic (~90 lines, 8 near-identical useEffect hooks) is a strong extraction candidate into `useKPIPopups` custom hook | Phase E code review | 2026-03-02 | Medium |
| 63 | GameHeader.jsx | Opponent faction colors hardcoded as `rgba(239,68,68,...)` inline — should use `FACTION_COLORS.opponent.primary` consistently | Phase E code review | 2026-03-02 | Low |
| 64 | SingleLaneView.jsx | Lane capacity badge: show `3/5` counter per lane, warning color at 5/5, full-lane styling (dimmed overlay or border) | Lane capacity limit | 2026-03-02 | Medium |
| 65 | useDragMechanics.js | Suppress drop-zone highlighting for full lanes during card drags and drone drags | Lane capacity limit | 2026-03-02 | Low |
| 66 | Card targeting UI | Full lanes should not highlight as valid targets for token deployment cards; show disabled/greyed state | Lane capacity limit | 2026-03-02 | Low |
| 67 | App.jsx + ModalLayer.jsx | Move ModalLayer outside `gameAreaRef` div (from inside the gameArea to after its closing `</div>`). Modals use `position: fixed` and don't need to be DOM children of gameArea. Eliminates entire class of click-suppression bugs where drag-end handlers interfere with modal button clicks. | Modal double-click fix | 2026-03-02 | Medium |
| 68 | Design/ | Create `UNIFIED_MULTIPLAYER_ARCHITECTURE.md` documenting the final multiplayer architecture (Phases 0–10c). Covers GameServer abstraction, BroadcastService, StateRedactor, P2PManager, and host/guest flow. | Multiplayer Phase 10c audit | 2026-03-05 | Low |
| 69 | HostGameServer.js, GameServerFactory.js | Most fragile wiring in multiplayer (factory mode switching, p2pManager monkey-patching) has minimal test coverage. Add unit tests for factory mode selection edge cases and HostGameServer guest action flow (error paths, broadcast ordering). | Multiplayer code review | 2026-03-06 | Medium |
| 70 | HostGameServer.js | Host broadcasts twice per guest commitment — triggers `commitment` and `HostGameServer:guest_commitment` each cause a full guest processing cycle. Functional duplication doubles broadcast volume for commitment actions. | Multiplayer log cleanup | 2026-03-06 | Low |
| 71 | droneSelectionUtils.js | `extractDronesFromDeck()` imports `fullDroneCollection` — domain-aware, violates pure-utility principle. Also name-collides with `AISimultaneousPhaseStrategy.extractDronesFromDeck(droneNames, dronePool)` which takes a pool parameter. Consider making both take a collection parameter or moving the utils version to `src/logic/`. | GFM refactor code review | 2026-03-07 | Low |
| 72 | GameFlowManager.js:166-212 | Duplicate opponent pass detection — `setupEventListeners` subscribes to `gameStateManager` to detect `passInfo` changes, but `GameClient._queuePassAnnouncements` now does the same thing earlier in the pipeline (before `_applyState`). PhaseAnimationQueue dedup prevents double announcements, but maintaining two systems is a maintenance risk. Remove GFM detection in favor of GameClient approach. | Guest pass announcement fix | 2026-03-07 | Medium |
| 73 | conditionalEvaluator.js | AI `evaluateCondition` duplicates condition checking from `ConditionEvaluator.js` — should delegate to shared evaluator | Exposed system code review | 2026-03-07 | Low |
| 74 | ConditionalEffectProcessor.js | `allAnimationEvents` dead scaffolding — collected but never returned or used | Exposed system code review | 2026-03-07 | Low |
| 75 | conditionalEvaluator.js vs ConditionEvaluator.js | `TARGET_IS_READY` uses `=== false` in AI evaluator vs `!== true` in ConditionEvaluator — semantic mismatch for undefined/null | Exposed system code review | 2026-03-07 | Low |
| 76 | Codebase-wide (~66 occurrences) | Opponent ID resolution (`=== 'player1' ? 'player2' : 'player1'`) duplicated across codebase — extract shared utility | Exposed system code review | 2026-03-07 | Low |
| 77 | TriggerProcessor.js | Duplicated cascade propagation block in `executeTriggerEffects` (lines ~397-411 and ~460-474) — identical preCascadePlayerStates/stateAfterDirectEffects/TRIGGER_CHAIN_PAUSE/triggerSteps logic. Extract shared `_propagateCascade` helper. | Target selection review | 2026-03-07 | Low |
| 78 | DamageEffectProcessor.js | Does not update `droneAvailability` on drone destruction (inconsistent with `DestroyEffectProcessor.applyDestroyCleanup` which does). Both paths call `gameEngine.onDroneDestroyed` but only DestroyEffectProcessor applies `droneAvailability` from the result. | Target selection review | 2026-03-07 | Medium |
| 79 | TargetSelector.js, DamageEffectProcessor.js, DestroyEffectProcessor.js | `gameSeed ?? 12345` fallback silently masks missing seed propagation — if `context.gameSeed` is undefined in production, both players could diverge. Add a debug warning when fallback fires. | targetSelection code review | 2026-03-08 | Low |
| 80 | counterDamage.js | Counter-damage uses manual shield/hull calculation instead of shared `calculateDamageByType`. Safe now (Viper/Thornback/Scorpion have no special damageType) but would miss ION/KINETIC/SHIELD_BREAKER if a future drone combined counter-damage with a special damage type. Migrate to use shared helper. | Trigger migration review | 2026-03-08 | Low |
| 81 | RoundManager.js, TechSlots.jsx | Residual `triggerUsesThisRound` flat counter still set/read for backward compat with tech entities. Now that `triggerUsesMap` is the canonical source, remove the old flat counter and its fallback chain. | Trigger migration review | 2026-03-08 | Low |
| ~~82~~ | ~~GameEngine.js, ClientStateStore.js~~ | ~~`_engineProcessing` / `_preProcessingState` set as ad-hoc properties on GSM by GameEngine~~ | ~~Multiplayer unified client review~~ | ~~2026-03-08~~ | ~~Resolved~~ |
| 83 | useAnimationSetup.js, GameClient.js | AnimationManager wired in useEffect after GameClient creation — actions firing before useEffect skip animations silently. Structural fix: queue responses in GameClient until AnimationManager is wired, then replay. Warning log added in this commit. | Client/server architecture review | 2026-03-08 | Medium |
| 84 | useGameLifecycle.js, useMultiplayerSync.js | Hooks accessing GameStateManager internals directly (e.g., `gameStateManager._updateContext`, direct property reads) — consider adding accessor methods to GSM to reduce coupling and protect internal state shape. | Post-refactor review (D18) | 2026-03-09 | Low |
| 85 | SinglePlayerCombatInitializer.js | SPCI manually queues Round/Upkeep/Deployment announcements because `processRoundInitialization()` runs before GameServer exists. Full fix requires either: (a) making GameServer creation synchronous before startGame(), or (b) deferring processRoundInitialization() until after server wiring via a callback/event. Workaround is isolated and functional. | SPCI unification | 2026-03-09 | Low |

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
| 62 | DrawEffectProcessor, GainEnergyEffectProcessor, MovementEffectProcessor | `pairSet` not propagated across cascade boundaries | 2026-03-01 | Pass pairSet/chainDepth through TriggerProcessor → EffectRouter → effect processors → nested fireTrigger |
| 63 | TriggerProcessor.js | `chainDepth` tracked but never enforced | 2026-03-01 | Added MAX_CHAIN_DEPTH=20 constant and depth guard in fireTrigger() |
| 50 | useMultiplayerSync.js:249 | `render_complete` event fires on every `gameState` change — excessive fire rate | 2026-03-05 | Event deleted entirely in Multiplayer Refactor Phase 9 |
| 64 | DrawEffectProcessor, GainEnergyEffectProcessor, MovementEffectProcessor | `sourceId` always 'system' — no triggeringDrone in cascades | 2026-03-01 | Pass triggeringDrone=reactorDrone through EffectRouter context into nested fireTrigger calls |
| 65 | Trigger system (7 files) | 7 timing workarounds for compute-all-then-animate architecture | 2026-03-01 | Added structured triggerSteps alongside animationEvents; new executeActionSteps path in CardActionStrategy. Old workarounds kept for non-card-play consumers |
| 82 | GameEngine.js, GameStateManager.js | Ad-hoc `_engineProcessing`/`_preProcessingState` on GSM | 2026-03-08 | Added `beginProcessing()`/`endProcessing()` methods to GSM; GameEngine calls them instead of setting properties directly |
