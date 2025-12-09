# Refactoring Roadmap
## gameLogic.js Modular Extraction Progress and Remaining Work

**Purpose:** Tactical guide for completing the gameLogic.js refactoring
**Audience:** Claude during active refactoring sessions
**Last Updated:** 2025-11-11

> **📖 Related Documents:**
> - **[PROCESSOR_DESIGN_GUIDE.md](./PROCESSOR_DESIGN_GUIDE.md)** - Architectural patterns and best practices
---

## 📊 Progress Dashboard

### File Size Reduction
- **Starting Size:** 5,207 lines (gameLogic.js)
- **Before Phase 9.12:** 459 lines (comments removed, duplicates deleted)
- **After Phase 9.12:** 144 lines (clean facade only)
- **After Phase 9.13:** 110 lines (pure facade - all targeting extracted) ✅
- **Lines Extracted:** 5,097 lines (97.9%) ✅
- **Progress:** **97.9% complete** ✅ EXCEEDED TARGET

### Phase Completion Status

| Phase | Status | Processors | Lines | Date Completed |
|-------|--------|------------|-------|----------------|
| **Phase 1: Simple Effects** | ✅ COMPLETE | 3 | ~160 | 2025-11-03 |
| **Phase 2: Targeting System** | ✅ COMPLETE | 7 | ~400 | 2025-11-03 |
| **Phase 3: Healing Effects** | ✅ COMPLETE | 2 | ~350 | 2025-11-03 |
| **Phase 4: Damage Effects** | ✅ COMPLETE | 1 | ~700 | 2025-11-03 |
| **Phase 5: Combat System** | ✅ COMPLETE | 2 | ~650 | 2025-11-04 |
| **Phase 6: Stat Modifications** | ✅ COMPLETE | 4 | ~258 | 2025-11-03 |
| **Phase 7: Movement Effects** | ✅ COMPLETE | 1 | ~200 | 2025-11-05 |
| **Phase 8: Special Effects** | ✅ COMPLETE | 3 | ~350 | 2025-11-04 |
| **Phase 9.1: State Initialization** | ✅ COMPLETE | 1 | ~73 | 2025-11-11 |
| **Phase 9.2: Round Management** | ✅ COMPLETE | 1 | ~148 | 2025-11-10 |
| **Phase 9.3: Turn Transitions** | ✅ COMPLETE | 1 | ~220 | 2025-11-11 |
| **Phase 9.4: Deployment System** | ✅ COMPLETE | 2 | ~252 | 2025-11-10 |
| **Phase 9.5: Shield Allocation** | ✅ COMPLETE | 1 | ~247 | 2025-11-11 |
| **Phase 9.6+9.7: Hand Limits & Win Conditions** | ✅ COMPLETE | 2 | ~156 | 2025-11-11 |
| **Phase 9.8: AI Action Execution** | ✅ COMPLETE (DELETED) | 0 | ~186 | 2025-11-11 |
| **Phase 9.9: Multi-Select Targeting** | ✅ COMPLETE (DOCUMENTED) | 0 | ~124 | 2025-11-11 |
| **Phase 9.10: Ability Resolution** | ✅ COMPLETE | 1 | ~320 | 2025-11-11 |
| **Phase 9.11: Card Play Manager** | ✅ COMPLETE | 1 | ~257 | 2025-11-11 |
| **Phase 9.12: Facade Cleanup** | ✅ COMPLETE | 1 util file | ~315 cleaned | 2025-11-11 |
| **Phase 9.13: Extract getValidTargets** | ✅ COMPLETE | 0 | ~34 extracted | 2025-11-11 |
| **Phase 9: Core Utilities** | ✅ COMPLETE | 12/12 | 110 remaining | 2025-11-11 |

### Processors Created: 38 Total

**Effect Processors (16):**
- DrawEffectProcessor, EnergyEffectProcessor, ReadyDroneProcessor
- HullHealProcessor, ShieldHealProcessor
- DamageEffectProcessor (handles 4 effect types)
- DestroyEffectProcessor, ModifyStatEffectProcessor
- ModifyDroneBaseEffectProcessor, DestroyUpgradeEffectProcessor
- SearchAndDrawProcessor, TokenCreationProcessor
- RepeatingEffectProcessor, UpgradeDroneEffectProcessor
- MovementEffectProcessor (handles SINGLE_MOVE, MULTI_MOVE)
- MarkingEffectProcessor (handles MARK_DRONE, MARK_RANDOM_ENEMY)

**Game Action Processors (11):**
- AttackProcessor (~500 lines)
- InterceptionProcessor (~150 lines)
- DeploymentProcessor (~318 lines)
- RoundManager (~230 lines)
- ShieldManager (~330 lines)
- StateInitializer (~155 lines)
- TurnTransitionManager (~303 lines)
- HandLimitManager (~155 lines)
- WinConditionChecker (~100 lines)
- AbilityResolver (~420 lines)
- CardPlayManager (~366 lines)

**Targeting Processors (7):**
- EnemyDroneTargeting, FriendlyDroneTargeting, ShipSectionTargeting
- LaneTargeting, FilteredDroneTargeting, AutoTargeting, CardSelectionTargeting

**Routers (2):**
- EffectRouter, TargetingRouter

**Animation Builders: 14 total** (across all phases)

---

## 🎯 Remaining Work

### Phase 9: Core Utilities (~1,534 lines remaining)

**Status:** 🔄 IN PROGRESS (6/10 sub-phases complete)
**Complexity:** VERY HIGH
**Dependencies:** All other phases must be complete first

**Functions to Extract (By Category):**

#### 9.1 State Initialization ✅ COMPLETE (2025-11-11)
- `initialPlayerState()` - Create initial player state object
- `buildDeckFromList()` - Convert deck list to card instances
- `createCard()` - Create card instance with unique ID
- Constants: `startingDecklist`, `startingDroneList`

**Extracted to:** `src/logic/state/StateInitializer.js` (155 lines)

**Key Achievement:** Clean foundational extraction
- Zero gameLogic.js imports (only data and utils)
- Proper layer separation (data → state → game logic)
- Backward compatible via gameEngine bound methods
- Constants re-exported for clean imports
- No changes needed to existing consumers (GameStateManager, AIPhaseProcessor, DeckSelectionScreen, testGameInitializer)

---

#### 9.2 Round Management ✅ COMPLETE (2025-11-10)
- `calculateNewRoundPlayerState()` - Round start state updates
- `drawToHandLimit()` - Draw cards at round start
- `readyDronesAndRestoreShields()` - Reset drone exhaust, shields
- `processRoundStart()` - Complete round transition orchestration

**Extracted to:** `src/logic/round/RoundManager.js` (230 lines)

**Key Achievement:** Clean extraction with no gameLogic.js imports
- Used only statsCalculator.js and debugLogger.js
- `determineFirstPlayer` passed as parameter instead of imported
- Integrated with ActionProcessor and GameFlowManager
- Pure state transformation functions

---

#### 9.3 Turn Transitions ✅ COMPLETE (2025-11-11)
- `calculateTurnTransition()` - Determine next player and transition type
- `calculatePassTransition()` - Handle pass sequence logic
- `processTurnTransition()` - Execute turn state changes
- `processPhaseChange()` - Handle deployment/action/roundEnd transitions
- `createTurnEndEffects()` - Generate UI effects for turn end

**Extracted to:** `src/logic/turn/TurnTransitionManager.js` (303 lines)

**Key Achievement:** Clean turn flow extraction
- Static utility class pattern (no instantiation needed)
- Pure functions for all turn/phase calculations
- Backward compatible via gameEngine bound methods
- `determineFirstPlayer` passed as parameter to avoid circular dependencies
- No changes needed to ActionProcessor or GameFlowManager

---

#### 9.4 Deployment System ✅ COMPLETE (2025-11-10)
- `executeDeployment()` - Deploy drone to lane
- `validateDeployment()` - Check deployment legality
- `countDroneTypeInLane()` - Count specific drone types in lane
- Marking effects (`resolveMarkDroneEffect()`, `resolveMarkRandomEnemyEffect()`)

**Extracted to:**
- `src/logic/deployment/DeploymentProcessor.js` (318 lines)
- `src/logic/effects/marking/MarkingEffectProcessor.js` (157 lines)

**Key Achievement:** Complete extraction with NO temporary imports from gameLogic.js
- Used EffectRouter for ON_DEPLOY triggers instead of direct gameLogic imports
- Extracted marking effects as prerequisite dependency
- Proper dependency layer ordering maintained

---

#### 9.5 Shield Allocation ✅ COMPLETE (2025-11-11)
- `getEffectiveSectionMaxShields()` - Calculate effective max shields
- `validateShieldRemoval()` - Check shield removal legality
- `validateShieldAddition()` - Check shield addition legality
- `executeShieldReallocation()` - Execute shield reallocation
- `getValidShieldReallocationTargets()` - Get valid reallocation targets
- `processShieldAllocation()` - Process single shield allocation
- `processResetShieldAllocation()` - Reset shields to 0
- `processEndShieldAllocation()` - End allocation phase with AI auto-allocation

**Extracted to:** `src/logic/shields/ShieldManager.js` (330 lines)

**Key Achievement:** Complete extraction with proper API matching
- All methods match existing ActionProcessor interface
- `determineFirstPlayer` passed as parameter to avoid gameLogic imports
- AI shield allocation (round-robin) stays in ShieldManager - not strategic AI logic

---

#### 9.6 Hand Limit Enforcement ✅ COMPLETE (2025-11-11)
- `enforceHandLimits()` - Force discard when over limit
- `checkHandLimitViolations()` - Detect violations
- `processDiscardPhase()` - Handle voluntary discard phase

**Extracted to:** `src/logic/cards/HandLimitManager.js` (155 lines)

**Key Achievement:** Clean stateless singleton extraction
- All three consolidated hand limit functions extracted
- Zero gameLogic.js imports (only statsCalculator and utils)
- Pure functions with no side effects
- Backward compatible via gameEngine bound methods
- Used by ActionProcessor and round management

---

#### 9.7 Win Condition Checking ✅ COMPLETE (2025-11-11)
- `checkGameStateForWinner()` - Detect win conditions with callbacks
- `checkWinCondition()` - Validate specific win condition (3+ damaged sections)

**Extracted to:** `src/logic/game/WinConditionChecker.js` (100 lines)

**Key Achievement:** Proper separation of win detection logic
- Two core functions extracted with clean callback pattern
- Zero gameLogic.js imports (only statsCalculator and debugLogger)
- ActionProcessor updated to import directly instead of via gameEngine
- Pure win condition logic with side effects isolated to callbacks
- Handles game ending and winner notifications

---

#### 9.8 AI Action Execution (~400 lines)
- `executeAiDeployment()` - AI drone deployment
- `executeAiTurn()` - AI main turn execution
- `executeAiAction()` - AI card/ability play
- **Note:** Most AI logic in `aiLogic.js`, but execution glue in gameLogic.js

**Recommended Extraction:** Integrate with existing `AIPhaseProcessor.js`

---

#### 9.8 AI Action Execution ✅ COMPLETE (DELETED) (2025-11-11)
- `executeAiDeployment()` - AI deployment orchestration
- `executeAiTurn()` - AI turn execution
- `executeAiAction()` - AI action routing

**Status:** DELETED - Dead legacy code (186 lines)

**Key Achievement:** Identified and removed dead code path
- All three functions were never called by active codebase
- AIPhaseProcessor → ActionProcessor replaced this legacy flow
- Bug found: Line 286 called non-existent `executeDeployment()` (never triggered)
- Clean deletion with no integration needed
- **Total Reduction:** 186 lines from gameLogic.js (1,014 → 828 lines)

---

#### 9.9 Multi-Select Targeting ✅ COMPLETE (DOCUMENTED) (2025-11-11)
- `calculateMultiSelectTargets()` - UI multi-target selection for SINGLE_MOVE/MULTI_MOVE
- `calculateUpgradeTargets()` - Upgrade application targeting
- `calculateMultiMoveTargets()` - Multi-drone movement targets (deprecated)
- `calculateAllValidTargets()` - Central UI targeting coordinator

**Status:** DOCUMENTED IN PLACE - UI helper functions (~124 lines)

**Key Achievement:** Recognized UI utilities should stay in gameLogic.js
- Added comprehensive JSDoc documentation to all 4 functions
- Phase header explains these are UI calculation utilities
- Design rationale documented: Pure target list generation, no state changes
- Functions serve UI targeting needs, don't fit processor pattern
- No extraction needed - proper architectural boundary maintained

---

#### 9.10 Ability Resolution ✅ COMPLETE (2025-11-11)
- `resolveAbility()` - Execute drone abilities (cost payment, effect routing)
- `resolveShipAbility()` - Execute ship section abilities (special cases, effect routing)
- `resolveDroneAbilityEffect()` - Route drone ability effects through EffectRouter
- `resolveShipAbilityEffect()` - Route ship ability effects through EffectRouter
- `resolveShipRecallEffect()` - Handle RECALL_DRONE effect

**Extracted to:** `src/logic/abilities/AbilityResolver.js` (~420 lines)

**Key Achievement:** Complete ability system extraction with two-step process
- **Step 1: Utility Extraction** - Extracted 4 blocking utilities first:
  - `updateAuras()` → auraManager.js (17 lines)
  - `getLaneOfDrone()` → gameEngineUtils.js (already existed)
  - `onDroneDestroyed()`, `onDroneRecalled()` → droneStateUtils.js (22 lines)
  - Updated 6+ files (AttackProcessor, DeploymentProcessor, MovementEffectProcessor, DamageEffectProcessor, DestroyEffectProcessor, gameLogic.js)
- **Step 2: Ability Resolution** - Extracted 5 ability functions to AbilityResolver
  - Stateless singleton pattern with pure orchestration functions
  - Zero gameLogic.js imports (only EffectRouter and extracted utilities)
  - ActionProcessor updated to import directly instead of via gameEngine
  - All ability routing now centralized through EffectRouter
  - RECALL_DRONE effect handled with proper aura updates
- **Total Reduction:** 320 lines from gameLogic.js (1,324 → 1,014 lines)
- **Files Created:** 3 utility files + 1 processor file

---

#### 9.11 Card Play Manager ✅ COMPLETE (2025-11-11)
- `payCardCosts()` - Deduct energy cost for card play
- `resolveCardPlay()` - Main card play orchestration (logging, costs, effects, animations)
- `finishCardPlay()` - Final cleanup (discard, turn ending via goAgain)
- `resolveCardEffect()` - Router to resolveSingleEffect
- `resolveSingleEffect()` - Route effects through EffectRouter with fallback

**Extracted to:** `src/logic/cards/CardPlayManager.js` (~366 lines)

**Key Achievement:** Complete card play system extraction
- Stateless singleton pattern following AbilityResolver architecture
- EffectRouter instance for effect delegation
- Handles card selection flow (SEARCH_AND_DRAW, SINGLE_MOVE, MULTI_MOVE)
- Generates CARD_REVEAL and CARD_VISUAL animation events
- Zero gameLogic.js imports (only EffectRouter and debugLogger)
- ActionProcessor integration via gameEngine bound methods
- **Total Reduction:** 257 lines from gameLogic.js (828 → 571 lines)

---

#### 9.12 gameLogic.js Facade Cleanup ✅ COMPLETE

**Status:** ✅ Complete (All 4 sub-phases finished)
**Goal:** Transform gameLogic.js from messy compatibility shim into clean, intentional public API facade

**Before State:**
- **Size:** 459 lines (91.2% extracted from original 5,207)
- **Role:** Temporary compatibility facade with mixed concerns
- **Issues:**
  - Contained dead/duplicate code (~100 lines)
  - Contained misplaced UI utilities (~150 lines)
  - Contained game logic that belonged in processors (~90 lines)
  - Inconsistent processor coverage
  - Documentation suggested "what remains" vs "intentional architecture"

**After State:**
- **Size:** 144 lines (97.2% extracted from original 5,207) ✅
- **Role:** Clean public API facade for game logic layer ✅
- **Contents:** Only `gameEngine` export object + imports + single wrapper function ✅
- **Coverage:** ALL active processors included and organized by category ✅
- **Documentation:** Clearly marked as intentional facade pattern ✅

---

##### 9.12.1: Delete Dead/Duplicate Code ✅ COMPLETE

**Functions Deleted (4):**

1. **`resolveDrawEffect`** ✅ DELETED
   - Exact duplicate of `DrawEffectProcessor.process()`
   - Removed 32 lines + gameEngine export reference

2. **`enforceHandLimit`** ✅ DELETED
   - Exact duplicate of `HandLimitManager.enforceHandLimits()`
   - Removed 22 lines + gameEngine export reference

3. **`checkHandLimitCompliance`** ✅ DELETED
   - Superseded by `HandLimitManager.checkHandLimitViolations()`
   - Removed 13 lines + gameEngine export reference

4. **`calculateMultiMoveTargets`** ✅ DELETED
   - Superseded by `calculateMultiSelectTargets`
   - Removed 32 lines + call site in `calculateAllValidTargets`

**Actual Reduction:** 459 → 359 lines (-100 lines) ✅
**Time Taken:** 45 minutes
**Risk:** None - all dead code verified with no callers

---

##### 9.12.2: Extract UI Utilities to Proper Location ✅ COMPLETE

**Problem Solved:** UI-only targeting helpers moved out of game logic file

**Files Created:**

1. **`src/utils/uiTargetingHelpers.js`** ✅ CREATED (175 lines)
   - Moved `calculateMultiSelectTargets` (multi-step card selection)
   - Moved `calculateUpgradeTargets` (upgrade targeting)
   - Moved `calculateAllValidTargets` (central coordinator)
   - Added clear JSDoc: "UI-only targeting calculations"

**Functions Inlined:**

2. **`createExplosionEffect`** ✅ INLINED into `src/hooks/useExplosions.js`
   - Trivial 8-line object creation
   - Now directly inlined where used
   - Removed gameEngine.createExplosionEffect import dependency

**Updates Completed:**
- `App.jsx`: Updated imports to use uiTargetingHelpers ✅
- `gameEngine` export: Removed UI targeting functions ✅
- `useExplosions.js`: Removed gameLogic.js dependency ✅

**Actual Reduction:** 359 → 82 lines (-277 lines) ✅
**Time Taken:** 1 hour
**Risk:** None - UI utilities cleanly separated

---

##### 9.12.3: Consolidate Game Logic into Processors ✅ COMPLETE

**Problem Solved:** Game logic functions moved to appropriate locations

**Functions Handled:**

1. **`drawPlayerCards`** ✅ DELETED (unused)
   - Was exported but never called
   - RoundManager already has `drawToHandLimit()` with same functionality
   - Removed 28 lines + gameEngine export

2. **`determineFirstPlayer`** ✅ UPDATED
   - Deleted simple version from gameLogic.js (10 lines)
   - Verified `src/utils/firstPlayerUtils.js` exists with comprehensive version
   - Updated ActionProcessor (line 1713) to use firstPlayerUtils version
   - New version supports seeded randomization for multiplayer consistency

3. **`getValidTargets`** ✅ KEPT
   - Decision: Keep as thin wrapper in gameLogic.js
   - Rationale: Provides useful abstraction layer with error handling
   - Part of intentional facade pattern (17 lines)

**Updates Completed:**
- ActionProcessor: Updated to use firstPlayerUtils.determineFirstPlayer() ✅
- gameEngine export: Removed unused functions ✅
- All callers verified working ✅

**Actual Reduction:** 82 → 65 lines (-17 lines core + docs)
**Time Taken:** 1 hour
**Risk:** None - build passed, multiplayer logic preserved

---

##### 9.12.4: Complete Processor Coverage & Document Facade ✅ COMPLETE

**Goal Achieved:** gameLogic.js is now clean, intentional public API facade

**Tasks Completed:**

1. **Processor Coverage** ✅
   - Verified all active processors included in gameEngine export
   - DeploymentProcessor, RoundManager, ShieldManager not exposed (used internally by ActionProcessor)
   - Result: Clean facade exposing only necessary public methods

2. **Reorganize gameEngine Export by Category** ✅
   - Grouped by domain: State Management, Ship & Drone State, Targeting, Abilities, Cards, Win Conditions, Turn Management, Hand Limits
   - Added clear section headers with comments
   - Each function documented with inline comment
   - Total of 7 organized sections

3. **Update File Header Documentation** ✅
   - Replaced "what remains" with "GAME LOGIC PUBLIC API FACADE"
   - Documented facade pattern benefits (4 key points)
   - Listed what's in file (minimal) and what's not (extracted to 38 processors)
   - Added refactoring history showing 96% reduction

4. **Code Quality** ✅
   - Removed unused imports (fullDroneCollection, calculateEffectiveShipStats)
   - Removed duplicate UI targeting functions (now in uiTargetingHelpers.js)
   - Clean separation: 1 wrapper function + 1 facade export + imports

**Example Header:**
```javascript
// ========================================
// GAME LOGIC PUBLIC API FACADE
// ========================================
// Single import point for all game logic operations.
//
// USAGE:
//   import { gameEngine } from './logic/gameLogic.js';
//   gameEngine.resolveCardPlay(...);
//
// ARCHITECTURE:
//   This file uses the Facade pattern to provide a stable public API.
//   All methods are re-exported from specialized processors.
//   Consumers don't need to know internal processor structure.
//
// PROCESSORS INCLUDED:
//   - StateInitializer (3 methods)
//   - CardPlayManager (3 methods)
//   - AbilityResolver (5 methods)
//   - ... [complete list]
//
// WHY FACADE:
//   - Simplifies consumer imports (1 import vs 10+)
//   - Provides stable API (refactoring doesn't break consumers)
//   - Encapsulates internal structure
//   - Standard pattern used by React, lodash, etc.
```

**Expected Final State:**
- **Size:** ~80-100 lines
- **Contents:**
  - File header (~20 lines)
  - Imports (~15 lines)
  - gameEngine export (~50-60 lines)
  - Named re-exports (~5 lines)
- **No active code:** Pure re-exports only

**Time Estimate:** 1-2 hours
**Risk:** Low (documentation and organization only)
**Dependencies:** Phase 9.12.3 complete

---

**Phase 9.12 Total:**
- **Time:** 7-10 hours
- **Reduction:** 459 → 144 lines (69% reduction)
- **Result:** Clean, intentional facade pattern
- **Benefits:**
  - Zero duplicate/dead code
  - Clear separation of concerns
  - Proper location for all utilities
  - Well-documented public API
  - Stable interface for consumers

---

#### 9.13 Extract `getValidTargets` for Architectural Consistency ✅ COMPLETE

**Status:** ✅ Complete
**Goal:** Remove last wrapper function from gameLogic.js to align targeting system with processor architecture

**Problem Identified:**
- `getValidTargets()` was an architectural inconsistency
- Only targeting system had wrapper in gameLogic.js
- EffectRouter, AttackProcessor, etc. all called directly (no wrappers)
- Violated PROCESSOR_DESIGN_GUIDE.md extraction pattern

**Changes Made:**

1. **TargetingRouter.js** - Added error handling ✅
   - Changed `routeTargeting()` from returning `null` to throwing descriptive error
   - Added detailed error context (targeting type, player, source, definition)
   - Aligned with processor pattern (processors handle their own errors)

2. **Updated 5 Call Sites** to use TargetingRouter directly: ✅
   - `uiTargetingHelpers.js` (3 calls) - Updated to import TargetingRouter
   - `HandView.jsx` (1 call) - Updated to import TargetingRouter
   - `AIPhaseProcessor.js` (1 call) - Created wrapper function to maintain API

3. **gameLogic.js** - Removed wrapper ✅
   - Deleted `getValidTargets` function (17 lines)
   - Removed `targetingRouter` initialization
   - Removed `TargetingRouter` import
   - Removed from `gameEngine` export
   - **Result:** 144 → 110 lines (pure facade)

**Actual Reduction:** 144 → 110 lines (-34 lines) ✅
**Time Taken:** 1.5 hours
**Risk:** None - build passed, all call sites updated

**Architectural Benefit:**
- **Consistency:** Now matches EffectRouter pattern (no wrapper layer)
- **Clarity:** TargetingRouter is the clear public API for targeting
- **PROCESSOR_DESIGN_GUIDE.md Compliance:** Follows documented extraction pattern

---

## 🚀 Remaining Work

### Phase 9.12: gameLogic.js Facade Cleanup 🔜 READY TO START

**Current Status:** Post-cleanup, pre-facade finalization
- **Current Size:** 459 lines (91.2% extracted)
- **Target Size:** ~80-100 lines (98.1-98.5% extracted)
- **Remaining Work:** Delete duplicates, extract UI utils, move game logic to processors

**What Currently Remains in gameLogic.js (459 lines):**
- **Dead/Duplicate Code (~100 lines):** 4 functions to DELETE
  - `resolveDrawEffect()` - Duplicate of DrawEffectProcessor
  - `enforceHandLimit()` - Duplicate of HandLimitManager.enforceHandLimits
  - `checkHandLimitCompliance()` - Superseded by HandLimitManager version
  - `calculateMultiMoveTargets()` - Deprecated

- **Misplaced UI Utilities (~150 lines):** 4 functions to EXTRACT
  - `calculateMultiSelectTargets()` → Move to src/utils/uiTargetingHelpers.js
  - `calculateUpgradeTargets()` → Move to src/utils/uiTargetingHelpers.js
  - `calculateAllValidTargets()` → Move to src/utils/uiTargetingHelpers.js
  - `createExplosionEffect()` → Inline into useExplosions hook

- **Misplaced Game Logic (~90 lines):** 3 functions to MOVE
  - `drawPlayerCards()` → Consolidate into RoundManager
  - `determineFirstPlayer()` → Move to RoundManager or firstPlayerUtils.js
  - `getValidTargets()` → Keep as facade abstraction (useful wrapper)

- **gameEngine Export (~60 lines):** Clean facade to REORGANIZE
  - Add missing processors
  - Group by category
  - Update documentation

**Target State (80-100 lines):**
- Clean file header documenting facade pattern (~20 lines)
- Processor imports (~15 lines)
- `gameEngine` export object with complete coverage (~50-60 lines)
- Named re-exports for direct access (~5 lines)
- **Zero active code** - pure re-exports only

**Architectural Decision:** gameLogic.js will serve as intentional **Public API Facade**
- Provides stable public API for consumers
- Simplifies imports (1 import vs 10+ processors)
- Encapsulates internal processor structure
- Standard facade pattern (React, lodash, Next.js use this)

---

## 🎉 Phase 9.1-9.11 Refactoring Complete!

**Core extraction phases complete - Now cleaning up the facade!**

The gameLogic.js refactoring journey:
- **Started:** 5,207 lines of monolithic code
- **After Phase 9.11:** 459 lines (cleanup done: duplicates removed, comments cleaned)
- **Extracted so far:** 4,748 lines into 38 specialized processors (91.2%)
- **Phase 9.12 target:** ~80-100 lines (clean facade only)
- **Final extraction:** 5,107-5,127 lines (98.1-98.5% complete)

**Current State:** gameLogic.js is a working but messy compatibility facade

**Next Step:** Phase 9.12 will transform it into a clean, intentional Public API Facade

---

## 📚 Architectural Patterns

### The Facade Pattern (gameLogic.js)

**What It Is:**
gameLogic.js serves as a Facade - a single entry point that re-exports functionality from multiple specialized processors. This is a well-established design pattern used by major libraries (React, lodash, Next.js).

**Why We Use It:**

1. **Simplified Imports** - Consumers import `gameEngine` instead of 10+ individual processors
   ```javascript
   // With Facade (Clean)
   import { gameEngine } from './logic/gameLogic.js';
   gameEngine.resolveCardPlay(...)
   gameEngine.resolveAbility(...)
   gameEngine.checkWinCondition(...)

   // Without Facade (Verbose)
   import CardPlayManager from './logic/cards/CardPlayManager.js';
   import AbilityResolver from './logic/abilities/AbilityResolver.js';
   import WinConditionChecker from './logic/game/WinConditionChecker.js';
   CardPlayManager.resolveCardPlay(...)
   AbilityResolver.resolveAbility(...)
   WinConditionChecker.checkWinCondition(...)
   ```

2. **Stable Public API** - Internal refactoring doesn't break consumer code
   - If we move `resolveCardPlay` to a different file, consumers don't need updates
   - Facade absorbs breaking changes to internal structure
   - Consumers depend on stable interface, not implementation details

3. **Encapsulation** - Consumers don't need to know internal processor structure
   - Clear boundary between "public API" and "internal implementation"
   - Freedom to refactor processors without cascading changes
   - Easier onboarding (one import point to learn)

4. **Backward Compatibility** - Gradual migration path during refactoring
   - 16 files currently rely on gameEngine facade
   - Can migrate consumers gradually over time
   - No "big bang" breaking change required

**When to Use Facade:**
- ✅ Consumers use multiple operations from different domains
- ✅ You want to provide a stable public API
- ✅ Internal refactoring should not break external code
- ✅ Simplifying complex subsystem for consumers

**When to Avoid Facade:**
- ❌ Consumers only use 1-2 operations (direct import clearer)
- ❌ Performance is absolutely critical (extra indirection)
- ❌ You want complete transparency about code location
- ❌ Tree-shaking is critical (facade prevents unused code elimination)

**Our Decision:**
Keep gameLogic.js as intentional facade because:
- ActionProcessor uses 11 different operations (perfect use case)
- 16 files already rely on it (migration cost high)
- Provides valuable stability during continued refactoring
- Standard pattern familiar to developers

---

## ⚠️ Critical Notes

### Before Starting Any Phase

1. **Read PROCESSOR_DESIGN_GUIDE.md completely**
2. **Check for dependencies** - extract utilities first
3. **Create animation builders** (mandatory for effects)
4. **Plan file structure** before coding
5. **Write tests** alongside extraction

### During Extraction

1. **Clone playerStates immediately** in process()
2. **Use EffectRouter** for meta-effects
3. **Add source context** to projectile animations
4. **Avoid ActionProcessor imports** (use siblings)
5. **Delete old code** immediately after extraction

### After Extraction

1. **Visual test** - play cards in game
2. **Check console** for errors
3. **Verify animations** play correctly
4. **Update EffectRouter** registration
5. **Update this roadmap** with completion status

---

## 🎓 Lessons Learned (Reference PROCESSOR_DESIGN_GUIDE.md)

### Critical Architectural Patterns

1. **Animation Builder Pattern** - Separate visuals from logic
2. **Deep Cloning Pattern** - Always clone playerStates first
3. **Effect Context Structure** - Standardized context object
4. **Pattern A Integration** - Position calculation in hooks
5. **Mandatory Cleanup** - Delete old code immediately

### Common Pitfalls to Avoid

1. **Parameter Naming Mismatches** (8.1)
2. **Missing Source Context** (8.2)
3. **Layering Violations** (8.3)
4. **Calling Deleted Functions** (8.4)
5. **Const Reassignment** (8.5)

---

## ✅ Verification Checklist

### After Each Phase Completion

- [ ] Processor created in correct directory
- [ ] Animation builder(s) created
- [ ] Registered in EffectRouter/TargetingRouter
- [ ] Old functions deleted from gameLogic.js
- [ ] Old functions removed from gameEngine export
- [ ] No imports of old functions remain
- [ ] Build succeeds (`npm run build`)
- [ ] Visual test passed (play cards in game)
- [ ] Console clean (no errors/warnings)
- [ ] Animations play correctly
- [ ] AI can execute effect
- [ ] Multiplayer tested (if applicable)
- [ ] This roadmap updated with completion status
- [ ] Commit changes with clear message

---

## 📈 Progress Tracking

### Completed Phases

#### ✅ Phase 9.3: Turn Transitions - COMPLETED (2025-11-11)

**Processors Created:**
- TurnTransitionManager.js (303 lines)

**Old Functions Deleted:**
- `calculateTurnTransition()` from gameLogic.js
- `calculatePassTransition()` from gameLogic.js
- `processTurnTransition()` from gameLogic.js
- `processPhaseChange()` from gameLogic.js
- `createTurnEndEffects()` from gameLogic.js

**Integration Points:**
- All functions bound to gameEngine export for backward compatibility
- ActionProcessor continues using gameEngine.calculateTurnTransition()
- GameFlowManager continues using gameEngine.processPhaseChange()
- No direct integration changes needed

**Notes:**
- Complete extraction with NO gameLogic.js imports
- Static utility class pattern (no instantiation)
- Pure functions for all turn/phase calculations
- `determineFirstPlayer` passed as parameter to processPhaseChange() to avoid circular dependencies
- Handles pass sequences, player switching, and phase transitions
- Clean separation of turn flow logic from game state

**Lines Extracted:** 220 lines from gameLogic.js
**New gameLogic.js Size:** 1,480 lines (down from 1,700)
**Progress:** 67.3% → 71.6% complete

---

#### ✅ Phase 9.1: State Initialization - COMPLETED (2025-11-11)

**Processors Created:**
- StateInitializer.js (155 lines)

**Old Functions Deleted:**
- `createCard()` from gameLogic.js
- `buildDeckFromList()` from gameLogic.js
- `initialPlayerState()` from gameLogic.js
- Constants: `startingDecklist`, `startingDroneList`

**Integration Points:**
- All functions bound to gameEngine export for backward compatibility
- GameStateManager.js continues using gameEngine.initialPlayerState()
- AIPhaseProcessor.js continues using gameEngine.buildDeckFromList()
- DeckSelectionScreen.jsx continues using gameEngine methods
- testGameInitializer.js continues using gameEngine.createCard()
- Constants re-exported from gameLogic.js

**Notes:**
- Complete extraction with NO gameLogic.js imports
- Clean dependency layering: data → state → game logic
- Stateless singleton pattern (like RoundManager, ShieldManager)
- Backward compatible: no changes needed to any consumers
- Uses seeded random for deterministic multiplayer deck shuffling
- Constants properly re-exported for clean imports

**Lines Extracted:** 73 lines net from gameLogic.js (92 function lines, with some added back for bindings)
**New gameLogic.js Size:** 1,700 lines (down from 1,773)
**Progress:** 65.9% → 67.3% complete

---

#### ✅ Phase 7: Movement Effects - COMPLETED (2025-11-05)

**Processors Created:**
- MovementEffectProcessor.js (403 lines)
- DefaultMovementAnimation.js (31 lines)

**Old Functions Deleted:**
- `resolveSingleMove()` from gameLogic.js
- `resolveMultiMove()` from gameLogic.js
- `applyOnMoveEffects()` from gameLogic.js (moved to abilityHelpers.js)

**Integration Points:**
- Registered SINGLE_MOVE and MULTI_MOVE in EffectRouter
- ActionProcessor.processMovementCompletion() uses MovementEffectProcessor
- Handles needsCardSelection pattern for human players
- AI auto-execution with optimal lane scoring

**Notes:**
- Implemented proper multiplayer targeting fix (actingPlayerId tracking)
- Validates maxPerLane restrictions for limited drones (Jammer)
- Respects DO_NOT_EXHAUST property
- Triggers ON_MOVE abilities after movement

---

#### ✅ Phase 9.4: Deployment System - COMPLETED (2025-11-10)

**Processors Created:**
- DeploymentProcessor.js (318 lines)
- MarkingEffectProcessor.js (157 lines)

**Old Functions Deleted:**
- `validateDeployment()` from gameLogic.js
- `executeDeployment()` from gameLogic.js
- `countDroneTypeInLane()` from gameLogic.js
- `resolveMarkDroneEffect()` from gameLogic.js
- `resolveMarkRandomEnemyEffect()` from gameLogic.js

**Integration Points:**
- Registered MARK_DRONE and MARK_RANDOM_ENEMY in EffectRouter
- ActionProcessor uses DeploymentProcessor for all deployments
- AIPhaseProcessor automatically uses new processor via ActionProcessor

**Notes:**
- **CRITICAL:** Complete extraction with NO temporary imports from gameLogic.js
- Used EffectRouter.routeEffect() for ON_DEPLOY triggers instead of direct gameLogic imports
- Extracted marking effects as prerequisite dependency (proper layer ordering)
- Validates CPU limit, deployment limit, maxPerLane, and resource costs
- Generates deterministic drone IDs
- Handles Scanner drone ON_DEPLOY marking effect

**Architectural Achievement:**
This phase demonstrated proper dependency extraction - marking effects were extracted FIRST as a prerequisite, then DeploymentProcessor imported via EffectRouter rather than using temporary imports from gameLogic.js. This follows the principle from PROCESSOR_DESIGN_GUIDE.md Section 7: "Extract utilities BEFORE extracting processors that need them."

---

#### ✅ Phase 9.2: Round Management - COMPLETED (2025-11-10)

**Processors Created:**
- RoundManager.js (230 lines)

**Old Functions Deleted:**
- `readyDronesAndRestoreShields()` from gameLogic.js
- `calculateNewRoundPlayerState()` from gameLogic.js
- `drawToHandLimit()` from gameLogic.js
- `processRoundStart()` from gameLogic.js

**Integration Points:**
- ActionProcessor.processRoundStart() uses RoundManager.calculateNewRoundPlayerState()
- GameFlowManager.processAutomaticEnergyResetPhase() uses RoundManager.readyDronesAndRestoreShields()
- Singleton pattern for stateless manager

**Notes:**
- Clean extraction with NO gameLogic.js imports
- Used only statsCalculator.js and debugLogger.js
- `determineFirstPlayer` passed as parameter instead of imported (stays in gameLogic - used elsewhere)
- Pure state transformation functions
- Handles drone readying, resource reset, card drawing, and first player determination

**Lines Extracted:** 148 lines from gameLogic.js
**New gameLogic.js Size:** 2,020 lines (down from 2,168)
**Progress:** 58.4% → 61.2% complete

---

#### ✅ Phase 9.5: Shield Allocation - COMPLETED (2025-11-11)

**Processors Created:**
- ShieldManager.js (330 lines)

**Old Functions Deleted:**
- `getEffectiveSectionMaxShields()` from gameLogic.js
- `validateShieldRemoval()` from gameLogic.js
- `validateShieldAddition()` from gameLogic.js
- `executeShieldReallocation()` from gameLogic.js
- `getValidShieldReallocationTargets()` from gameLogic.js
- `processShieldAllocation()` from gameLogic.js
- `processResetShieldAllocation()` from gameLogic.js
- `processEndShieldAllocation()` from gameLogic.js

**Integration Points:**
- ActionProcessor.processShieldAddition() uses ShieldManager.processShieldAllocation()
- ActionProcessor.processResetShields() uses ShieldManager.processResetShieldAllocation()
- ShieldManager methods match existing ActionProcessor API interface

**Notes:**
- Complete extraction with NO gameLogic.js imports
- All methods match existing ActionProcessor interface for seamless integration
- `determineFirstPlayer` passed as parameter to processEndShieldAllocation()
- AI shield allocation logic (round-robin) stays in ShieldManager - not strategic AI logic
- Handles validation, reallocation, and allocation phase transitions

**Lines Extracted:** 247 lines from gameLogic.js
**New gameLogic.js Size:** 1,773 lines (down from 2,020)
**Progress:** 61.2% → 65.9% complete

---

## 🎯 Success Criteria

**Refactoring is complete when:**

1. ✅ gameLogic.js < 500 lines (pure utility functions only)
2. ✅ All effect types routed through EffectRouter
3. ✅ All targeting types routed through TargetingRouter
4. ✅ No monolithic switch statements remain
5. ✅ All processors follow established patterns
6. ✅ All animations use builder pattern
7. ✅ All tests passing
8. ✅ Game fully functional (all cards work)
9. ✅ AI fully functional (all strategies work)
10. ✅ Multiplayer fully functional (sync works)

**Estimated Completion:** ~8-10 hours of active work remaining

---

## 📚 Related Documentation

- **[PROCESSOR_DESIGN_GUIDE.md](./PROCESSOR_DESIGN_GUIDE.md)** - Read this first before creating processors
---

**Last Updated:** 2025-11-11
**Next Phase:** Phase 9.6 + 9.7 - Hand Limits & Win Conditions
**Progress:** 71.6% complete (3,727 / 5,207 lines extracted)
**Recent Achievements:** Phase 9.3 (Turn Transitions), Phase 9.1 (State Initialization), Phase 9.5 (Shield Allocation) completed today
