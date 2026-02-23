# Future Improvements

Items deferred during refactoring — not bugs, not blocking, but worth fixing when the relevant file is next touched.

## Active Items

| # | File | Issue | Source | Date | Priority |
|-|-|-|-|-|-|
| 1 | CommitmentStrategy.js | Direct mutation of state from getState() before setState() — should build new commitments object fresh | ActionProcessor code review | 2026-02-22 | Medium |
| 2 | CardActionStrategy.js | 685 lines — could split into core card play vs. completion flows | ActionProcessor code review | 2026-02-22 | Low |
| 3 | CombatActionStrategy.js | 520 lines — processMove alone is ~220 lines due to keyword/mine/beacon logic | ActionProcessor code review | 2026-02-22 | Low |
| 4 | ActionProcessor.js | `processFirstPlayerDetermination` registry key has inconsistent naming (includes `process` prefix) | ActionProcessor code review | 2026-02-22 | Low |
| 5 | ActionProcessor.js | `addTeleportingFlags` returns inconsistent shapes (full state vs player-only object) | ActionProcessor code review | 2026-02-22 | Low |
| 6 | GameStateManager.js | Post-extraction residual 1,068 lines (constructor+state shape 142, thin setters 155, game lifecycle 250, event system 30, action delegation 40, ~60 facade lines). Below 400 is unrealistic without splitting core concerns or removing facades. | GSM Session C complete | 2026-02-22 | Low |
| 7 | GameStateManager.js | `setState()` creates `new Error().stack` on every call for caller detection — expensive in production. Consider gating behind dev-only flag or removing after extractions reduce call sites. | GSM behavioral baseline | 2026-02-22 | Medium |
| 8 | ShipSlotManager.js | `repairSectionSlotPartial()` default cost (200) differs from `repairSectionSlot()` default cost (10) — both read `ECONOMY.SECTION_DAMAGE_REPAIR_COST` but have different fallbacks. Now in ShipSlotManager lines 362 and 425. | GSM behavioral baseline → GSM Session C code review | 2026-02-22 | Low |
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
| 21 | App.jsx | handleCardClick (236 lines), handleLaneClick (255 lines), handleTokenClick (139 lines) remain due to cancelAllActions circular dep. Could extract to a useClickHandlers hook if cancelAllActions is also extracted. | App.jsx Session 4 | 2026-02-23 | Medium |

## Resolved Items

| # | File | Issue | Resolved | How |
|-|-|-|-|-|
