# Drone Wars — Code Standards

## Single Responsibility Principle

Each file owns one concern. A cohesive 400-line file is preferable to four scattered 100-line files. Split when a file handles genuinely distinct responsibilities, not just because it's long.

## File Type Purity

| File type | Must contain | Must NOT contain |
|-|-|-|
| Data files (`src/data/`) | Static data definitions, constant arrays/objects, enums | Helper functions, query logic, factory functions, migration logic, RNG utilities |
| Components (`.jsx`) | One React component and its directly coupled sub-components | Business logic, data definitions, utility functions unrelated to rendering |
| Modals (`src/components/modals/`) | One modal component per file | Multiple unrelated modals, utility functions |
| Animations (`src/components/animations/`) | One animation component per file | Multiple unrelated animations |
| Hooks (`src/hooks/` or co-located) | One custom hook per file (with internal helpers) | Components, data definitions |
| Managers (`src/managers/`) | One manager/processor class per file | UI code, data definitions |
| Logic (`src/logic/`) | Pure game logic functions, no React dependencies | React components, hooks, UI concerns |
| Utils (`src/utils/`) | Pure utility functions with no domain knowledge | Business logic, game-specific rules |

### Where Extracted Helpers Go

- **Data query helpers** (e.g., `getMissionById`) — `src/logic/<domain>/` or a dedicated `<dataFile>Helpers.js` alongside the data file
- **Factory functions** (e.g., `createNewSave`) — `src/logic/<domain>/`
- **Migration logic** — `src/logic/state/` or `src/logic/migration/`
- **RNG/generation utilities** — `src/utils/` or `src/logic/<domain>/`

### Known Data File Violations

> Last audited: 2026-02-23

These `src/data/` files currently contain logic that should be extracted:

- `aiCoresData.js` — contains `calculateAICoresDrop()`, `getAICoresCost()`
- `cardPackData.js` — contains `createSeededRNG()`, `getPackCostForTier()`, `generateRandomShopPack()`
- `salvageItemData.js` — contains `findEligibleItems()`, `selectSalvageItem()`, `generateSalvageItemFromValue()`
- ~~`saveGameSchema.js`~~ — refactored to pure 140-line data file (2026-02-23)
- `missionData.js` — contains query helpers like `getMissionById()`
- `reputationRewardsData.js` — contains `getLevelData()`, `getNewlyUnlockedLevels()`
- `tutorialData.js` — contains query/factory helpers
- `shipData.js`, `tacticalItemData.js` — contain accessor functions

## Size Guidelines

These are guidelines, not hard limits. A cohesive file shouldn't be split just to hit a number.

- **Under 200 lines**: Healthy
- **200-400 lines**: Normal for complex components/processors — review for cohesion
- **400+ lines**: Review trigger — actively look for extraction opportunities
- **800+ lines**: Strong smell — almost certainly doing too much

## Directory Structure

```
src/
  components/
    screens/          # Full-page views
      __tests__/
    modals/           # Modal dialogs
      __tests__/
    ui/               # Reusable UI primitives
      __tests__/
    animations/       # Animation components
      __tests__/
    ships/            # Ship-related components
      __tests__/
  hooks/              # Custom React hooks (shared/app-level only)
    __tests__/
  logic/              # Pure game logic (no React)
    ai/               # AI decision-making
    targeting/        # Targeting resolution
    combat/           # Combat resolution
    effects/          # Card/ability effects
    ...etc
    __tests__/        # Per-subfolder
  managers/           # Stateful orchestration (processors, state managers)
    __tests__/
  contexts/           # React contexts
    __tests__/
  data/               # Static game data (cards, ships, config)
    __tests__/
  services/           # External service interfaces
    __tests__/
  utils/              # Pure utility functions
    __tests__/
  config/             # App configuration
  styles/             # Shared styles
  theme/              # Theme definitions
```

## Hook Co-location

Screen-specific hooks (single consumer) co-locate with their screen component:

```
components/screens/TacticalMapScreen/
  TacticalMapScreen.jsx
  TacticalMapScreen.css
  hooks/
    useTacticalMovement.js
    useTacticalEncounters.js
    ...
```

Hooks that stay in `src/hooks/`:
- **Shared hooks** consumed by 2+ components (e.g., `useGameState`, `useGameData`)
- **App-level hooks** consumed by `App.jsx` or `AppRouter.jsx` (root components, not screens)

## Effects Directory Rules

- Subdirectories under `src/logic/effects/` only when they contain **2+ related source files** (excluding `__tests__/`)
- Single-file processors live directly in `effects/`
- Multi-file subdirectories (e.g., `effects/damage/` with processor + animations) are fine

## Magic Numbers

Extract timing, sizing, and layout values as named constants at module level:

```js
// --- Animation Timing ---
const LASER_DURATION = 600;
const FLASH_DURATION = 200;
```

Exceptions: `0`, `1`, `-1`, array indices, and values whose meaning is clear from context.

## ID Generation

Use `crypto.randomUUID()` for generating unique IDs in non-seeded contexts. Keep semantic prefixes for readability:

```js
const id = `laser-${droneId}-${crypto.randomUUID()}`;
```

Do not use `Date.now()` or `Math.random()` for IDs — collision risk in same-millisecond scenarios.

## CSS Strategy

> Pending — requires dedicated discussion. See FUTURE_IMPROVEMENTS.md.

## Test Convention

- All tests in `__tests__/` subfolders within the directory containing the source file
- Test file naming: `<SourceFileName>.test.js(x)` or `<SourceFileName>.<aspect>.test.js(x)` for focused test suites
- Existing co-located tests migrated incrementally (not all at once)

## Naming Conventions

- **Components**: PascalCase (`TacticalMapScreen.jsx`)
- **Logic/utils**: camelCase (`aiLogic.js`)
- **Hooks**: `use` prefix (`useTargeting.js`)
- **Constants/config**: UPPER_SNAKE_CASE for exports, camelCase for files
- **Index files**: barrel exports for module folders

## Decomposition Patterns

- **Extract custom hooks** when a component has complex state/effect logic
- **Split sub-components** when a render method has visually distinct sections
- **Extract utility functions** when logic is reusable and has no component dependencies
- **Use strategy pattern** for processors with many conditional branches (like ActionProcessor)
- **Group related tests** by aspect into separate test files

## Investigation Process for Large Files

1. Map the file's responsibilities (list what it does)
2. Trace dependency graph (imports in, exports out)
3. Identify natural seams — groups of functions/state that work together
4. Propose extraction plan with rationale
5. Execute incrementally — tests green at every step
6. Update imports across the codebase

## Logging Standards

- **All logging MUST use `debugLog()` from `src/utils/debugLogger.js`** — no raw `console.log` in source files.
- **Use existing categories** where applicable. Add new categories to `DEBUG_CONFIG.categories` only when genuinely new concerns arise.
- **Logs must fire once per event**, not on every render cycle or useEffect update. If a `debugLog` is inside a useEffect, ensure it only triggers on the specific dependency change it's tracking. Guard with condition checks where necessary.
- When touching a file, ensure its logging is consistent, categorized, and useful for debugging.

## Comment Standards

Only three types of comments are permitted:

1. **Code explanation** — explains WHY something works the way it does, the pattern being used, or non-obvious implementation details. Not what the code does (that should be self-evident).
2. **Section separators** — brief labels to delineate logical sections in longer files (e.g., `// --- Targeting Logic ---`). Keep minimal.
3. **TODO comments** — `// TODO: <actionable description>` for work that still needs to be done.

**Banned patterns**: `// NEW`, `// CHANGED`, `// ADDED`, `// MODIFIED`, `// Updated for X`, `// Refactored`, or any comment that describes *what changed* rather than *what the code does*. Remove stale comments when touching a file.

## Interaction Paradigm

- **Drag-and-drop is the canonical model for ACTION INITIATION only**: playing cards from hand, moving drones, attacking with drones. These are drag-initiated, not click-initiated.
- **Click-based interactions remain valid** for: sub-action selections (choosing targets after a card is played), drone token abilities, ship card abilities, UI buttons, modal interactions, and any secondary selection steps within a multi-step action flow.
- **Legacy click-to-initiate-action code** (clicking a card in hand to play it, clicking to initiate a drone move/attack) is dead code and should be removed when encountered.
- When in doubt: if it initiates an action → legacy (remove). If it responds to a sub-selection within an already-initiated action → active (keep).

## Testing Philosophy

- **Test intent, not implementation**: Tests verify *what* code does (behavior, outcomes, contracts), not *how*. Test public interfaces. Assert on observable results.
- **Refactoring safety net**: Before extracting code, ensure tests exist for the behaviors being moved. Write them first if missing. Tests must pass before and after.
- **Mock at boundaries only**: Mock network, storage, and timers — not between internal modules.
- **Targeted, not exhaustive**: Write the fewest tests that catch real bugs. Collapse near-identical assertions into parameterized or loop-based tests. If a test wouldn't catch a plausible bug, don't write it.
- **Data files get structural tests only**: Test invariants (unique IDs, required fields, valid enums) as aggregate checks over the full collection — never per-entry.
- **Collapse, don't multiply**: When testing N similar inputs, use one parameterized test that loops — not N individual tests.
- **Zero failures required**: The test suite must be completely clean (0 failures) before any work is committed. Never accept or ignore test failures.
