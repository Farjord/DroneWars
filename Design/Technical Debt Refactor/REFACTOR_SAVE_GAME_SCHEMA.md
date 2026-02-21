# Refactor: saveGameSchema.js

## Current State

- **Line count**: 503 lines
- **Existing test coverage**: 2 co-located test files (not in `__tests__/`):
  - `saveGameSchema.test.js` (148 lines) — tests tacticalItems, migrateTacticalItems, createNewSave, validateSaveFile
  - `saveGameSchema.boss.test.js` (93 lines) — tests bossProgress defaults and validation
  - Additional external test files import from this module: `DroneSlotStructure.test.js`, `SlotBasedDamage.test.js`, `singlePlayerDeckUtils.test.js`, `MIARecoveryService.test.js`, `ReplicatorService.test.js`, `ReputationCalculator.test.js`, `ReputationService.test.js`
- **Dead import**: `fullCardCollection` from `cardData.js` (line 8) — imported but never referenced

### Section Map

| Lines | Content |
|-|-|
| 1-11 | Imports, SAVE_VERSION constant |
| 12-23 | starterPoolCards (computed constant) |
| 25 | starterPoolDroneNames (computed constant) |
| 31 | starterPoolShipIds (computed constant) |
| 36-115 | defaultPlayerProfile (static data) |
| 122-134 | defaultInventory, defaultDroneInstances, defaultShipComponentInstances (static data) |
| 140-146 | `createEmptyDroneSlots()` — factory function (VIOLATION) |
| 155-164 | `migrateDroneSlotsToNewFormat()` — migration function (VIOLATION) |
| 173-186 | `convertDronesToSlots()` — migration function (VIOLATION) |
| 193-207 | `convertComponentsToSectionSlots()` — migration/factory function (VIOLATION) |
| 214-231 | `migrateShipSlotToNewFormat()` — migration function (VIOLATION) |
| 239-265 | `migrateTacticalItems()` — migration function (VIOLATION) |
| 275-285 | defaultDiscoveredCards, defaultQuickDeployments (static data) |
| 292-331 | `createDefaultShipSlot()` — factory function (VIOLATION) |
| 336-338 | defaultShipSlots (computed via factory — borderline) |
| 344-358 | `createNewSave()` — factory function (VIOLATION) |
| 365-486 | `validateSaveFile()` — validation function (VIOLATION) |
| 488-503 | Default export object |

### Consumers (imports from this file)

| Consumer | What it imports |
|-|-|
| `SaveGameService.js` | validateSaveFile, SAVE_VERSION |
| `GameStateManager.js` | createNewSave, starterPoolCards, starterPoolDroneNames, convertComponentsToSectionSlots |
| `ExtractionDeckBuilder.jsx` | starterPoolCards, starterPoolDroneNames, starterPoolShipIds (+ possibly more) |
| `BlueprintsModal.jsx` | starterPoolShipIds |
| `QuickDeployEditorScreen.jsx` | starterPoolDroneNames |
| `DronePicker.jsx` | starterPoolDroneNames |
| `RewardManager.js` | starterPoolDroneNames |
| `LootGenerator.js` | starterPoolDroneNames |
| `blueprintDropCalculator.js` | starterPoolDroneNames |
| `singlePlayerDeckUtils.js` | starterPoolCards, starterPoolDroneNames, starterPoolShipIds |
| `MIARecoveryService.js` | starterPoolShipIds, starterPoolCards, starterPoolDroneNames |
| `ReplicatorService.js` | starterPoolCards |
| `ReputationCalculator.js` | starterPoolCards, starterPoolDroneNames, starterPoolShipIds |

## Problems

### CODE_STANDARDS.md Violations

1. **Data file purity**: 9 functions violate the rule that `src/data/` files must contain only static data definitions. The file contains factory functions, migration logic, and validation logic.
2. **Test location**: Existing tests are co-located (`src/data/saveGameSchema.test.js`) instead of in `src/data/__tests__/`.

### Dead Code

1. **Unused import**: `fullCardCollection` from `cardData.js` (line 8) is imported but never used anywhere in the file.
2. **Deprecated exports**: `defaultDroneInstances` (line 128) and `defaultShipComponentInstances` (line 134) are marked DEPRECATED. Need to verify if any consumer still references them.

### Code Smell

1. **God file**: A 503-line data file that mixes static schema definitions with factory logic, migration logic, and validation logic — four distinct responsibilities.
2. **Deep cloning via JSON.parse(JSON.stringify(...))**: Used in `createDefaultShipSlot()` and `createNewSave()` (lines 303-308, 349-354). Works but fragile — fails silently on undefined values, functions, symbols, and Date objects.
3. **defaultPlayerProfile contains runtime values**: `createdAt: Date.now()` and `gameSeed: Date.now()` (lines 39, 50) are evaluated at module load time, meaning all saves that don't override these get the same timestamp. This is likely intentional (overridden in `createNewSave()`) but the naming "default" is misleading since it captures a single point-in-time value.

## Extraction Plan

### Extraction 1: Migration Functions

**What to extract**: `migrateDroneSlotsToNewFormat`, `convertDronesToSlots`, `convertComponentsToSectionSlots`, `migrateShipSlotToNewFormat`, `migrateTacticalItems`

**Where**: `src/logic/migration/saveGameMigrations.js`

**Why**: CODE_STANDARDS.md says migration logic belongs in `src/logic/state/` or `src/logic/migration/`. These are pure transformation functions with no React dependency.

**Dependencies affected**:
- `GameStateManager.js` imports `convertComponentsToSectionSlots` — update import path
- `SlotBasedDamage.test.js` imports `migrateShipSlotToNewFormat` — update import path
- `DroneSlotStructure.test.js` imports migration functions — update import path
- `saveGameSchema.js` itself uses `convertComponentsToSectionSlots` and `createEmptyDroneSlots` in `createDefaultShipSlot()` — will need to import from new location

**Internal dependency**: `createEmptyDroneSlots` is used by `convertDronesToSlots` and `createDefaultShipSlot`. Extract it alongside the migrations since it's a factory helper, not static data.

### Extraction 2: Factory Functions

**What to extract**: `createEmptyDroneSlots`, `createDefaultShipSlot`, `createNewSave`

**Where**: `src/logic/save/saveGameFactory.js`

**Why**: CODE_STANDARDS.md says factory functions belong in `src/logic/<domain>/`. These construct new save game objects.

**Dependencies affected**:
- `GameStateManager.js` imports `createNewSave` — update import path
- `saveGameSchema.js` uses `createDefaultShipSlot` to compute `defaultShipSlots` — the computed constant stays in the data file but imports from the factory
- Migration functions (Extraction 1) use `createEmptyDroneSlots` — cross-dependency between extractions

**Note**: `defaultShipSlots` (line 336-338) is a computed constant using `createDefaultShipSlot`. After extraction, the data file imports the factory and calls it at module load. This is acceptable — the data file still exports a constant.

### Extraction 3: Validation Function

**What to extract**: `validateSaveFile`

**Where**: `src/logic/save/saveGameValidator.js`

**Why**: CODE_STANDARDS.md says no validation logic in data files. This is a 120-line validation function — a clear separate responsibility.

**Dependencies affected**:
- `SaveGameService.js` imports `validateSaveFile` — update import path
- Test files import `validateSaveFile` — update import paths

## Dead Code Removal

| Item | Location | Action |
|-|-|-|
| `import fullCardCollection from './cardData.js'` | Line 8 | Remove — unused import |
| `defaultDroneInstances` | Lines 127-128 | Verify no consumers, then remove. Marked DEPRECATED. |
| `defaultShipComponentInstances` | Lines 133-134 | Verify no consumers, then remove. Marked DEPRECATED. |

**No legacy click-to-act code** found in this file (not applicable — this is a data/schema file, not a UI file).

## Logging Improvements

No logging exists in this file currently, and none is needed. These are pure data definitions and pure functions. The consumers (SaveGameService, GameStateManager) handle logging at the call site.

If migration functions detect unexpected data during migration, they should log warnings. Add `debugLog` calls to the extracted migration file:
- `migrateDroneSlotsToNewFormat`: log when old-format slots are detected (category: `save`)
- `migrateShipSlotToNewFormat`: log when legacy format is migrated (category: `save`)
- `migrateTacticalItems`: log when missing items are backfilled (category: `save`)

## Comment Cleanup

| Line(s) | Current Comment | Action |
|-|-|-|
| 1-5 | Block comment header with "Version 1.0" | Keep but simplify — version is already in SAVE_VERSION constant |
| 19 | `// All action cards from starter deck` | Keep — explains intent |
| 21 | `// All ship components from starter deck` | Keep — explains intent |
| 45 | `// Currency from defeating AI enemies...` | Keep — explains domain context |
| 160 | `// Support both old field names and new field names (idempotent)` | Keep — explains WHY |

No banned comment patterns (`// NEW`, `// CHANGED`, etc.) found.

## Testing Requirements

### Before Extraction (Intent-Based Tests)

Write comprehensive tests for behavior that will be moved, ensuring no regression:

1. **`src/logic/migration/__tests__/saveGameMigrations.test.js`**:
   - `createEmptyDroneSlots` returns 5 slots with correct shape
   - `migrateDroneSlotsToNewFormat` handles null, old format, new format (idempotent)
   - `convertDronesToSlots` handles empty array, partial arrays, full arrays
   - `convertComponentsToSectionSlots` handles empty object, partial, full
   - `migrateShipSlotToNewFormat` handles already-migrated and legacy formats
   - `migrateTacticalItems` handles missing, partial, and complete tacticalItems

2. **`src/logic/save/__tests__/saveGameFactory.test.js`**:
   - `createDefaultShipSlot(0)` returns immutable starter slot with correct data
   - `createDefaultShipSlot(1-5)` returns empty mutable slots
   - `createNewSave` returns complete save structure with all required fields
   - Deep clone independence (mutating returned object doesn't affect future calls)

3. **`src/logic/save/__tests__/saveGameValidator.test.js`**:
   - Migrate existing test coverage from `saveGameSchema.test.js` and `saveGameSchema.boss.test.js`
   - Add edge cases: completely empty object, null fields, wrong types

### After Extraction

- Move existing co-located tests to `src/data/__tests__/saveGameSchema.test.js` (for data-only tests)
- Delete `src/data/saveGameSchema.test.js` and `src/data/saveGameSchema.boss.test.js` after migrating their tests
- Update all import paths in test files listed in Consumers section

## Execution Order

1. **Remove dead import**: Delete unused `fullCardCollection` import (line 8). Run tests. Commit.

2. **Verify deprecated exports**: Grep for `defaultDroneInstances` and `defaultShipComponentInstances` usage across the codebase. If unused, remove them. Run tests. Commit.

3. **Extract migration functions**: Create `src/logic/migration/saveGameMigrations.js` with `createEmptyDroneSlots`, `migrateDroneSlotsToNewFormat`, `convertDronesToSlots`, `convertComponentsToSectionSlots`, `migrateShipSlotToNewFormat`, `migrateTacticalItems`. Write tests in `src/logic/migration/__tests__/saveGameMigrations.test.js`. Update imports in `saveGameSchema.js`, `GameStateManager.js`, `DroneSlotStructure.test.js`, `SlotBasedDamage.test.js`. Run all tests. Commit.

4. **Extract factory functions**: Create `src/logic/save/saveGameFactory.js` with `createDefaultShipSlot`, `createNewSave`. Write tests in `src/logic/save/__tests__/saveGameFactory.test.js`. Update `defaultShipSlots` in `saveGameSchema.js` to import from factory. Update `GameStateManager.js` import. Run all tests. Commit.

5. **Extract validation function**: Create `src/logic/save/saveGameValidator.js` with `validateSaveFile`. Write tests in `src/logic/save/__tests__/saveGameValidator.test.js`. Update `SaveGameService.js` import. Run all tests. Commit.

6. **Relocate existing tests**: Move remaining data-focused tests to `src/data/__tests__/saveGameSchema.test.js`. Delete old co-located test files. Run tests. Commit.

7. **Add migration logging**: Add `debugLog` calls to migration functions in `saveGameMigrations.js` for format conversions. Run tests. Commit.

8. **Clean up default export**: After extractions, the default export object at line 488 will have fewer entries. Remove extracted function references from it. Run tests. Commit.

## Risk Assessment

### What Could Break

| Risk | Likelihood | Impact | Mitigation |
|-|-|-|-|
| Circular imports between factory and data file | Medium | Build fails | Factory imports data constants; data file imports factory for `defaultShipSlots`. Design imports to be one-directional where possible. |
| Missed import update in a consumer | Low | Runtime crash | Grep for all imports before each extraction step. CI will catch missing imports. |
| `defaultShipSlots` computed at module load changes behavior | Low | Subtle bugs | `defaultShipSlots` is already computed at load time; moving the factory doesn't change when it runs. |
| Deep clone behavior difference | Very Low | Data corruption | Keep `JSON.parse(JSON.stringify(...))` pattern as-is during extraction. Optimize separately if desired. |
| Test files reference old paths after relocation | Medium | Test failures | Update all test imports in the same commit as the extraction. |

### How to Validate

- Run full test suite (`npm test`) after every extraction step
- Run the game and verify: new game creation, save/load cycle, slot migration on old save files
- Grep for old import paths to ensure none remain after each step

---

## Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

*To be completed before refactoring begins. This section documents the current behavior, intent, contracts, dependencies, edge cases, and non-obvious design decisions of the code being refactored. Once written, this section is never modified — it serves as the permanent "before" record.*

## Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
