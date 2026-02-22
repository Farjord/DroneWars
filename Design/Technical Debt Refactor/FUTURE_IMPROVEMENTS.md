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
| 6 | GameStateManager.js | Post-extraction residual ~900-1000 lines (constructor+state shape 142, thin setters 155, game lifecycle 250, event system 30, action delegation 40). Below 400 is unrealistic without splitting core concerns. | GSM Session A planning | 2026-02-22 | Low |
| 7 | GameStateManager.js | `setState()` creates `new Error().stack` on every call for caller detection — expensive in production. Consider gating behind dev-only flag or removing after extractions reduce call sites. | GSM behavioral baseline | 2026-02-22 | Medium |
| 8 | GameStateManager.js | `repairSectionSlotPartial()` default cost (200) differs from `repairSectionSlot()` default cost (10) — both read `ECONOMY.SECTION_DAMAGE_REPAIR_COST` but have different fallbacks | GSM behavioral baseline | 2026-02-22 | Low |
| 9 | GameStateManager.js | 22 facade methods remain on GSM after Session B extractions. External callers (EremosEntryScreen, SaveLoadModal, BlueprintsModal, RepairService, ShopModal, TacticalMapScreen, ExtractionController) should import new managers directly. GFM/GMQS need constructor signature changes to receive GuestSyncManager. | GSM Session B extraction | 2026-02-22 | Medium |
| 10 | GameFlowManager.js | `extractDronesFromDeck()` is a pure lookup function (name → drone object) with no dependency on GFM state. Used only in deck selection commitment handler (lines 544, 558). Candidate for extraction to a deck/drone utility. | GFM code review | 2026-02-22 | Low |
| 11 | GameFlowManager.js | At 1,671 lines, still above the 800-line target. Remaining methods are cohesive phase flow orchestration. Further splitting would require decomposing the event/pub-sub system or the phase transition orchestration, which would fragment a single concern. | GFM refactoring complete | 2026-02-22 | Low |
| 12 | DeckBuilderLeftPanel.jsx | Ship components section (lines 486-627) has 3 nearly identical ~40-line blocks for Bridge/Power Cell/Drone Control Hub differing only in type string and color class. Extract a `ShipComponentSection` helper to eliminate ~80 lines. | DeckBuilder code review | 2026-02-22 | Medium |
| 13 | DeckBuilderLeftPanel.jsx | Sortable table headers repeated 15+ times across cards/drones tables with identical className logic. Extract a `SortableHeader` component. | DeckBuilder code review | 2026-02-22 | Medium |
| 14 | HangarScreen.jsx | At 568 lines, above 400-line guideline but below 800. Remaining code is handlers + state declarations — cohesive orchestration. Further splitting would fragment the handler logic. | HangarScreen refactoring | 2026-02-22 | Low |

## Resolved Items

| # | File | Issue | Resolved | How |
|-|-|-|-|-|
