# Refactor: cardData.js

## Current State
- **File**: `src/data/cardData.js`
- **Line count**: 2325 lines
- **Responsibilities**: Defines `RARITY_COLORS` constant and `fullCardCollection` array (100+ card definitions)
- **Exports**: `RARITY_COLORS` (named), `fullCardCollection` (default)
- **Existing test coverage**: None. No `src/data/__tests__/cardData.test.js` exists.
- **Importers**: ~35 files across components, logic, managers, services, and utils

### Section Map
| Lines | Content |
|-|-|
| 1-9 | `RARITY_COLORS` constant |
| 11-2322 | `fullCardCollection` array (all card definitions) |
| 2325 | Default export |

## Problems

### CODE_STANDARDS.md Violations
- **None for file type purity.** This file contains only static data definitions and constant objects. No helper functions, query logic, factory functions, or RNG utilities are present. This is a clean data file.

### Inconsistent Formatting
- Wildly inconsistent indentation throughout the file. Some cards use 4-space indent, some use 2-space, some have leading whitespace on the opening brace, some don't.
- Inconsistent trailing commas (some entries have them, some don't).
- Inconsistent blank lines between card entries.
- Some card objects have inconsistent property alignment (e.g., lines 258-262 vs lines 123-127).

### Potential Data Bugs
- **CARD037_ENHANCED** (lines 1304-1322): Description says "Restore up to 3 shields" but effect value is `2` (same as base card). Likely a copy-paste bug.
- **CARD032_Enhanced** (line 1129): Uses mixed case `_Enhanced` instead of `_ENHANCED` like all other enhanced cards. Inconsistent ID naming convention.
- **Raise_the_Alarm** (line 2218): Type is `'Tactics'` (plural) instead of `'Tactic'` (singular) used by all other tactic cards.
- **Card ID numbering gap**: Cards jump from CARD054 to CARD060, then to CARD063. Not a bug, but worth noting.

### Size Concern
- At 2325 lines, this file is well above the 800-line "strong smell" threshold. However, it is pure data with a single responsibility (card definitions). Splitting purely for size would scatter related data across files without adding clarity.

## Extraction Plan

### Extraction 1: RARITY_COLORS to dedicated constants file
- **What**: `RARITY_COLORS` constant (lines 1-9)
- **Where**: `src/data/rarityColors.js`
- **Why**: `RARITY_COLORS` is a UI display constant imported by 8+ UI components. It is conceptually separate from card gameplay data. Extracting it reduces the import surface for components that only need colors.
- **Dependencies affected**: `HiddenShipSectionCard.jsx`, `HiddenShipCard.jsx`, `HiddenCard.jsx`, `DronePicker.jsx`, `RaritySymbol.jsx`, `DeckBuilder.jsx`, `HangarScreen.jsx`, `BlueprintsModal.jsx`, `InventoryModal.jsx` — all update import path. Re-export from `cardData.js` for backward compatibility during migration.

### Extraction 2 (Optional): Split by card category
- **What**: Group cards into logical subcollections (ordnance, support, tactic, upgrade, token-deployers, doctrine, AI-only)
- **Where**: Keep in `cardData.js` but reorganize with clear section comment separators
- **Why**: Improves navigability without breaking imports. The file is pure data so splitting into multiple files adds import complexity with minimal benefit.
- **Alternative**: If the team prefers splitting, use `src/data/cards/ordnanceCards.js`, `src/data/cards/supportCards.js`, etc., with a barrel `src/data/cards/index.js` that re-exports the merged collection.

## Dead Code Removal
- **No dead code found.** The file contains only data definitions with no functions, no commented-out code blocks, and no legacy click handlers.

## Logging Improvements
- **No logging needed.** This is a pure data file. Data files should not contain logging. Any validation or lookup logging belongs in the consuming code.

## Comment Cleanup

### Current State
- Only one comment exists (lines 1-3): Section header for `RARITY_COLORS` with inline color name comments. These are useful and should be kept.
- No banned comment patterns (`// NEW`, `// CHANGED`, etc.) found.

### Recommended Additions
- Add section separator comments to group cards by type for navigability:
  ```js
  // --- Ordnance Cards ---
  // --- Support Cards ---
  // --- Tactic Cards ---
  // --- Upgrade Cards ---
  // --- Token Deployer Cards ---
  // --- Doctrine Cards ---
  // --- Additional Cost Cards ---
  // --- Lane Control Cards ---
  // --- AI-Only Cards ---
  ```

## Testing Requirements

### Tests to Write BEFORE Any Extraction
- `src/data/__tests__/cardData.test.js`:
  - Every card has required fields: `id`, `baseCardId`, `name`, `maxInDeck`, `rarity`, `type`, `cost`, `image`, `description`, `effect`
  - All `id` values are unique
  - All `baseCardId` values reference a valid base card (base card with matching `baseCardId === id` exists)
  - All `rarity` values are valid enum members (`Common`, `Uncommon`, `Rare`, `Mythic`)
  - All `type` values are valid enum members (`Ordnance`, `Support`, `Tactic`, `Upgrade`)
  - All enhanced cards (`_ENHANCED` suffix) share `baseCardId` with their base version
  - `RARITY_COLORS` keys match the rarity enum
  - Card count snapshot test (guards against accidental deletion)
  - All `image` paths follow the `/DroneWars/cards/` pattern

### Tests to Write AFTER Extraction 1
- `src/data/__tests__/rarityColors.test.js`:
  - Contains all four rarity keys
  - Values are valid hex color strings

## Execution Order

1. **Add data integrity tests**: Create `src/data/__tests__/cardData.test.js` with schema validation and snapshot tests. Commit.

2. **Fix data bugs**: Fix `CARD037_ENHANCED` effect value (2 -> 3), `CARD032_Enhanced` ID casing, `Raise_the_Alarm` type (`Tactics` -> `Tactic`). Run tests. Commit.

3. **Normalize formatting**: Apply consistent 2-space indentation, trailing commas, and blank-line spacing across all card entries. Run tests. Commit.

4. **Add section separator comments**: Group cards by type with `// ---` section headers. Reorder cards so each type is grouped together. Run tests. Commit.

5. **Extract RARITY_COLORS**: Move to `src/data/rarityColors.js`. Add re-export from `cardData.js`. Update direct importers. Run tests. Commit.

6. **Remove re-export**: Once all importers are updated, remove the backward-compat re-export from `cardData.js`. Run tests. Commit.

## Risk Assessment

### What Could Break
- **Step 2 (data bugs)**: Fixing `CARD037_ENHANCED` value changes gameplay balance. Fixing `Raise_the_Alarm` type could break any code filtering by `type === 'Tactics'`. Fixing `CARD032_Enhanced` ID could break saved games referencing the old ID.
- **Step 4 (reorder)**: Array order change could affect anything that indexes by position (unlikely but worth checking).
- **Step 5-6 (extract RARITY_COLORS)**: Import path changes could cause build failures if any importer is missed.

### How to Validate
- Run full test suite after each step
- For step 2: Search codebase for `'Tactics'` (plural) usage, `CARD032_Enhanced` references, and any `CARD037_ENHANCED` value-dependent logic before changing
- For step 4: Search for any code indexing `fullCardCollection` by numeric index rather than by `id`
- For step 5-6: `grep -r "RARITY_COLORS" src/` and `grep -r "cardData" src/` to verify all imports updated
- Manual smoke test: load game, open deck builder, verify card display and rarity colors render correctly

---

## Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

*To be completed before refactoring begins. This section documents the current behavior, intent, contracts, dependencies, edge cases, and non-obvious design decisions of the code being refactored. Once written, this section is never modified — it serves as the permanent "before" record.*

## Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
