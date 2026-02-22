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

## Resolved Items

| # | File | Issue | Resolved | How |
|-|-|-|-|-|
