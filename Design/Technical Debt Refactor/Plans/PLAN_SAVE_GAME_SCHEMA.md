# Implementation Plan: saveGameSchema.js Refactor

## BEFORE

**Date**: 2026-02-21
**Goal**: Strip saveGameSchema.js to a pure data file (~130 lines) by extracting 9 functions into `src/logic/`.

### Pre-flight Metrics

| Metric | Value |
|-|-|
| saveGameSchema.js lines | 503 |
| Functions in data file | 9 |
| Co-located test files | 2 |
| Consumer files | 18 |

## TO DO

### Extraction Targets

| Source functions | Destination | Reason |
|-|-|-|
| `createEmptyDroneSlots`, `migrateDroneSlotsToNewFormat`, `convertDronesToSlots`, `convertComponentsToSectionSlots`, `migrateShipSlotToNewFormat`, `migrateTacticalItems` | `src/logic/migration/saveGameMigrations.js` | Migration logic |
| `createDefaultShipSlot`, `defaultShipSlots`, `createNewSave` | `src/logic/save/saveGameFactory.js` | Factory functions |
| `validateSaveFile` | `src/logic/save/saveGameValidator.js` | Validation logic |

### Dependency Graph (Post-Extraction)
```
saveGameSchema.js (pure data) <- no imports from factory/migrations/validator
  ^                    ^
  factory.js           validator.js
  v
  migrations.js
```

### Execution Steps

1. Phase 0: Pre-flight (tech-debt-review, archive plan, CLAUDE.md update)
2. Phase 1: Behavioral baseline documentation
3. Phase 2: Write tests for all 9 functions before extraction
4. Phase 3a: Dead code cleanup (fullCardCollection import, deprecated exports)
5. Phase 3b: Extract 6 migration functions to saveGameMigrations.js
6. Phase 3c: Extract 3 factory functions to saveGameFactory.js
7. Phase 3d: Extract validateSaveFile to saveGameValidator.js
8. Phase 3e: Relocate co-located tests, add migration logging, clean default export
9. Phase 4: Code review
10. Phase 5: Tech-debt comparison, docs update, final commit

### Consumer Import Updates

| Consumer | Current | New |
|-|-|-|
| GameStateManager.js | createNewSave, convertComponentsToSectionSlots from schema | createNewSave from factory; convertComponentsToSectionSlots from migrations |
| SaveGameService.js | validateSaveFile, SAVE_VERSION from schema | validateSaveFile from validator; SAVE_VERSION unchanged |
| DroneSlotStructure.test.js | migration functions from schema | from migrations |
| SlotBasedDamage.test.js | migration functions from schema | from migrations |

## NOW

### Actual Outcomes

#### Metrics

| Metric | Before | After |
|-|-|-|
| saveGameSchema.js lines | 503 | 140 |
| Functions in data file | 9 | 0 |
| Co-located test files | 2 | 0 |
| Tests in __tests__/ dirs | 0 | 4 files (106 tests) |
| New extraction files | 0 | 3 (saveGameMigrations.js, saveGameFactory.js, saveGameValidator.js) |
| Consumer files updated | — | 7 (GameStateManager, SaveGameService, ExtractionDeckBuilder, DroneSlotStructure.test, SlotBasedDamage.test, saveGameSchema.test, saveGameMigrations.test) |

#### Deviations from Plan

1. **ExtractionDeckBuilder.jsx** was discovered as an additional consumer of migration functions (`createEmptyDroneSlots`, `migrateDroneSlotsToNewFormat`) — not listed in original plan. Import updated successfully.
2. **Test consolidation**: Rather than migrating all old test content verbatim, the relocated `src/data/__tests__/saveGameSchema.test.js` tests data-only concerns (19 tests). Function tests are comprehensively covered in the new extraction test files (87 tests).
3. **Default export removed entirely** rather than cleaned up — it had zero consumers.

#### Code Review
Reviewed by strict principal technical architect agent. **APPROVED** with zero critical or important issues. One minor note: pre-existing misplaced test files in `src/managers/` (out of scope).

#### Commits (7 total)
1. `f886b6d` — Add tests for saveGameSchema functions before extraction
2. `03b89c6` — Remove dead code (fullCardCollection, deprecated exports)
3. `17ade56` — Extract migration functions to saveGameMigrations.js
4. `b1fc58b` — Extract factory functions to saveGameFactory.js
5. `7a026bb` — Extract validateSaveFile to saveGameValidator.js
6. `faa4068` — Relocate tests to __tests__/ directory
7. `bfcc390` — Add migration logging, finalize pure data file
