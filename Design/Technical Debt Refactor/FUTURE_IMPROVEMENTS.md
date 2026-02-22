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

## Resolved Items

| # | File | Issue | Resolved | How |
|-|-|-|-|-|
