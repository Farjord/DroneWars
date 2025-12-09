# Action Processing System Analysis
## Comprehensive Research for Refactoring to Modular Architecture

**Date:** 2025-11-02
**Codebase:** Drone Wars Game
**Purpose:** Support refactoring gameLogic.js (5207 lines) into modular system

> **⚠️ IMPORTANT:** If you're confused about what `gameEngine` is or where methods like `resolveAttack()` live, **skip to Section 1.5: Understanding `gameEngine`** for critical context. This section explains that gameEngine is an exported object containing 60+ functions from the single 5,207-line gameLogic.js file.

---

## Section 1: Executive Summary

### Is ActionProcessor Already an Orchestrator?

**Answer: YES - Partial Orchestrator**

ActionProcessor.js (3518 lines) serves as a **partial orchestrator** with the following characteristics:

✅ **Current Orchestration Functions:**
- Central action queue with serial processing
- Action validation and security checks (turn validation, pass state validation)
- Action routing via switch statement (29 action types)
- State management coordination with GameStateManager
- Animation pipeline management
- Network action broadcasting (multiplayer)
- Lock management to prevent race conditions

❌ **Not Yet Fully Orchestrated:**
- Heavy delegation to monolithic gameLogic.js (exports 60+ functions as `gameEngine` object)
- No routing system for effect types or targeting types
- Effect resolution logic lives entirely in gameLogic.js (5,207 lines)
- Targeting logic lives entirely in gameLogic.js
- No modular processors for specific action categories

### Current Architecture Assessment

**Pattern: Thin Orchestrator → Monolithic Engine**

```
App.jsx (UI Layer)
    ↓
ActionProcessor.processAction()
    ↓ (switch on action type)
ActionProcessor.processCardPlay/processAttack/etc()
    ↓ (delegates to gameEngine)
gameEngine.resolveCardPlay/resolveAttack/etc()
    ↓ (monolithic 5207-line file)
Effect Resolution + Targeting + Validation + State Mutation
```

**Key Finding:** ActionProcessor is already structured as an orchestrator but delegates ALL game logic to a monolithic gameLogic.js file (which exports 60+ functions as the `gameEngine` object). The refactoring opportunity is to extract gameEngine's 60+ functions from gameLogic.js into modular processors that ActionProcessor can route to. **See Section 1.5 for critical explanation of what gameEngine is.**

### Feasibility of Proposed Refactoring

**HIGH FEASIBILITY** ✅

Reasons:
1. **Clean separation already exists** between orchestration (ActionProcessor) and logic (gameLogic)
2. **Clear routing pattern** - effect types and targeting types are well-defined in card data
3. **No circular dependencies** between ActionProcessor and gameLogic
4. **Consistent data structures** - all effects use same pattern (playerStates, placedSections, callbacks)
5. **Self-contained effect handlers** - each resolve* function is already isolated

**Recommended Approach:**
- **Keep ActionProcessor as orchestrator** - no major changes needed
- **Extract gameLogic.js processors** into modular files
- **Create routing layer** between ActionProcessor and effect processors
- **Maintain existing API contracts** to minimize changes to ActionProcessor

---

### 📊 Refactoring Progress (Updated 2025-11-04)

**File Size Reduction:**
- **Starting Size:** 5,207 lines (gameLogic.js)
- **Current Size:** 3,683 lines (gameLogic.js)
- **Lines Extracted:** 1,524 lines (29.3% reduction)
- **Target:** Continue extracting remaining ~3,683 lines

**Phases Completed:**
- ✅ **Phase 1:** Simple Effects (DRAW, GAIN_ENERGY, READY_DRONE) - 3 processors
- ✅ **Phase 2:** Targeting System (7 targeting processors + TargetingRouter)
- ✅ **Phase 3:** Healing Effects (HEAL_HULL, HEAL_SHIELDS) - 2 processors
- ✅ **Phase 4:** Damage Effects (DAMAGE, DAMAGE_SCALING, SPLASH_DAMAGE, OVERFLOW_DAMAGE) - 1 comprehensive processor
- ✅ **Phase 6:** Stat Modification Effects (DESTROY, MODIFY_STAT, MODIFY_DRONE_BASE, DESTROY_UPGRADE) - 4 processors

**Processors Created:**
- **Effect Processors:** 10 total
  - DrawEffectProcessor, EnergyEffectProcessor, ReadyDroneProcessor
  - HullHealProcessor, ShieldHealProcessor
  - DamageEffectProcessor (comprehensive - handles 4 effect types)
  - DestroyEffectProcessor (handles 4 scopes: SINGLE, FILTERED, LANE, ALL)
  - ModifyStatEffectProcessor (handles SINGLE and LANE targeting)
  - ModifyDroneBaseEffectProcessor (handles appliedUpgrades system)
  - DestroyUpgradeEffectProcessor (handles upgrade removal)
- **Targeting Processors:** 7 total
  - EnemyDroneTargeting, FriendlyDroneTargeting, ShipSectionTargeting
  - LaneTargeting, FilteredDroneTargeting, AutoTargeting, CardSelectionTargeting
- **Routers:** 2 total
  - EffectRouter (routes to effect processors)
  - TargetingRouter (routes to targeting processors)

**Animation Builders Created:**
- healing/animations/HealAnimation.js (shared)
- damage/animations/DefaultDamageAnimation.js
- damage/animations/RailgunAnimation.js (card-specific override)
- damage/animations/OverflowAnimation.js
- damage/animations/SplashAnimation.js
- damage/animations/FilteredDamageAnimation.js
- destroy/animations/DefaultDestroyAnimation.js
- destroy/animations/NukeAnimation.js (card-specific override for Nuke/Purge Protocol)

**Remaining Work (Phases 5, 7-8):**
- Phase 5: Combat System (resolveAttack, interception) - ~650 lines
- Phase 7: Movement (SINGLE_MOVE, MULTI_MOVE) - ~200 lines (already refactored, may need extraction)
- Phase 8: Special Effects (SEARCH_AND_DRAW, CREATE_TOKENS, repeating) - ~350 lines
- Remaining utility functions and state management - ~2,400 lines

**Architectural Patterns Established:**
- Animation builder pattern with override hierarchy
- Effect context object standardization
- Deep cloning pattern for immutable state management
- Pattern A animation integration (position calculation in hooks)
- Mandatory cleanup (delete old functions after extraction)

---

## Section 1.5: Understanding `gameEngine` (CRITICAL CONTEXT)

### What is `gameEngine`?

**`gameEngine` is an exported object literal** from `gameLogic.js` that contains 60+ pure game logic functions.

**File:** `src/logic/gameLogic.js` (5,207 lines)
**Export Location:** Lines 5119-5207

```javascript
// End of gameLogic.js
export const gameEngine = {
  // Core state management
  initialPlayerState,
  createCard,
  buildDeckFromList,
  getEffectiveSectionMaxShields,

  // Action resolution
  resolveAttack,          // 324 lines (lines 4423-4746)
  resolveCardPlay,        // 54 lines
  resolveAbility,         // 70 lines
  resolveSingleEffect,    // Giant switch statement

  // Effect handlers
  resolveUnifiedDamageEffect,    // 52 lines
  resolveSplashDamageEffect,     // 177 lines
  resolveOverflowDamageEffect,   // 446 lines (!)
  resolveDrawEffect,             // 40 lines
  resolveHealEffect,             // 100 lines
  resolveSearchAndDrawEffect,    // 115 lines
  resolveGainEnergyEffect,       // 24 lines
  resolveReadyDroneEffect,       // 30 lines
  resolveDestroyEffect,          // 45 lines
  // ... 40+ more effect handlers

  // Targeting
  getValidTargets,        // 204 lines
  // ... more targeting functions

  // Combat
  calculateAiInterception,  // AI combat logic
  applyOnMoveEffects,      // Movement abilities

  // Utilities
  updateAuras,            // Global stat recalculation
  getLaneOfDrone,         // Helper functions
  onDroneDestroyed,       // Callback system

  // Total: 60+ functions in this single 5,207-line file
}
```

### Why ActionProcessor Calls `gameEngine` Methods

ActionProcessor imports and delegates **ALL game logic** to gameEngine:

```javascript
// ActionProcessor.js (line 7)
import { gameEngine } from '../logic/gameLogic.js';

// Usage throughout ActionProcessor (30+ calls)
const result = gameEngine.resolveAttack(attackDetails, playerStates, ...);
const result = gameEngine.resolveCardPlay(card, target, playerId, ...);
const result = gameEngine.resolveAbility(ability, source, ...);
const result = gameEngine.resolveSplashDamageEffect(effect, context, ...);
// ... 26+ more gameEngine method calls
```

**Critical Understanding:** When this document says "ActionProcessor delegates to gameEngine", it means ActionProcessor calls functions that are **defined inside the monolithic 5,207-line gameLogic.js file**. All 60+ functions live in that one file.

### The Refactoring Target (IMPORTANT!)

**THIS refactoring is about breaking up `gameEngine` (the 5,207-line gameLogic.js), NOT ActionProcessor.**

- ❌ **NOT refactoring:** ActionProcessor (3,518 lines - stays as orchestrator with minimal changes)
- ✅ **YES refactoring:** gameEngine/gameLogic.js (5,207 lines → 50+ modular processor files)

**Current Problem (Monolithic):**
```
gameLogic.js (5,207 lines) ← THE PROBLEM
└── gameEngine object
    ├── resolveAttack() (324 lines of combat logic)
    ├── resolveSplashDamageEffect() (177 lines)
    ├── resolveOverflowDamageEffect() (446 lines!)
    ├── resolveSearchAndDrawEffect() (115 lines)
    ├── getValidTargets() (204 lines with switch statement)
    └── [55+ more functions all in this one file]
```

**Refactoring Goal (Modular):**
```
src/logic/
├── EffectRouter.js                 ← Routes to effect processors
├── CombatRouter.js                 ← Routes to combat processors
├── TargetingRouter.js              ← Routes to targeting processors
├── effects/
│   ├── damage/
│   │   ├── DamageEffectProcessor.js        (resolveUnifiedDamageEffect → here)
│   │   ├── SplashDamageProcessor.js        (resolveSplashDamageEffect → here)
│   │   └── OverflowDamageProcessor.js      (resolveOverflowDamageEffect → here)
│   ├── healing/
│   │   ├── HullHealProcessor.js
│   │   └── ShieldHealProcessor.js
│   ├── cards/
│   │   ├── DrawEffectProcessor.js          (resolveDrawEffect → here)
│   │   └── SearchAndDrawProcessor.js       (resolveSearchAndDrawEffect → here)
│   └── [10+ more effect categories]
├── combat/
│   ├── AttackProcessor.js                  (resolveAttack → here - 324 lines)
│   └── InterceptionProcessor.js
├── targeting/
│   ├── drone/DroneTargetingProcessor.js
│   ├── ship/ShipSectionTargetingProcessor.js
│   └── [9+ more targeting processors]
└── utils/
    └── gameEngineUtils.js                  (shared helpers like updateAuras, getLaneOfDrone)
```

### Terminology Clarification

**Throughout this document:**
- **"gameEngine"** = The exported object from gameLogic.js containing 60+ functions
- **"gameLogic.js"** = The 5,207-line file where all these functions are defined
- **"ActionProcessor"** = The 3,518-line orchestrator that calls gameEngine methods
- **"Refactoring target"** = gameLogic.js (extracting functions into separate files)
- **"Routers"** = New coordination layer (EffectRouter, CombatRouter, TargetingRouter)
- **"Processors"** = New modular files containing extracted effect/targeting/combat logic

### Why This Matters

Without understanding that gameEngine is an object exporting 60+ functions from one giant file, readers might think:
- ❌ ActionProcessor needs major refactoring (it doesn't - only ~20 lines change)
- ❌ gameEngine is a separate file from gameLogic.js (it's not - it's exported FROM gameLogic.js)
- ❌ The methods are scattered across files (they're not - all 5,207 lines in one file)

**The entire refactoring plan is about taking that single 5,207-line file and splitting it into 50+ focused, modular processor files.**

---

## Section 2: ActionProcessor.js Analysis

### File Statistics
- **Location:** `C:\Drone-Wars-Game\drone-wars-game\src\managers\ActionProcessor.js`
- **Size:** 3518 lines
- **Pattern:** Singleton class with dependency injection
- **Dependencies:** gameEngine (gameLogic.js), GameStateManager, GameDataService, AIPhaseProcessor

### Complete Method Inventory

#### Core Queue Management (Lines 152-438)
| Method | Purpose | Orchestrates vs Executes |
|--------|---------|-------------------------|
| `queueAction(action)` | Queue actions for serial processing | Orchestrates |
| `processQueue()` | Process action queue serially | Orchestrates |
| `processAction(action)` | Main action router (switch statement) | **Orchestrates** |

#### Action Processors (Lines 443-3518)
| Method | Action Type | Delegates To | Returns |
|--------|-------------|--------------|---------|
| `processAttack()` | attack | gameEngine.resolveAttack() | Attack result + animations |
| `processMove()` | move | gameEngine.applyOnMoveEffects() | Move result |
| `processAbility()` | ability | gameEngine.resolveAbility() | Ability result + animations |
| `processDeployment()` | deployment | gameEngine.executeDeployment() | Deployment result |
| `processCardPlay()` | cardPlay | gameEngine.resolveCardPlay() | Card result + needsSelection |
| `processMovementCompletion()` | movementCompletion | gameEngine.resolveSingleMove/MultiMove() | Movement result |
| `processSearchAndDrawCompletion()` | searchAndDrawCompletion | gameEngine.finishCardPlay() | Completion result |
| `processShipAbility()` | shipAbility | gameEngine.resolveShipAbility() | Ship ability result |
| `processShipAbilityCompletion()` | shipAbilityCompletion | gameEngine.checkGameStateForWinner() | Win check result |
| `processTurnTransition()` | turnTransition | gameEngine.calculateTurnTransition() | Turn transition data |
| `processPhaseTransition()` | phaseTransition | Updates state directly | Success |
| `processRoundStart()` | roundStart | gameEngine.calculateNewRoundPlayerState() | Round start data |
| `processReallocateShields()` | reallocateShields | gameEngine.getEffectiveSectionMaxShields() | Shield data |
| `processAiAction()` | aiAction | Delegates to processAiDecision() | AI action result |
| `processPlayerPass()` | playerPass | Direct state update | Pass result |
| `processCommitment()` | commitment | Direct state update | Commitment result |
| `processDraw()` | draw | gameEngine.drawPlayerCards() | Draw result |
| `processEnergyReset()` | energyReset | gameEngine.calculateNewRoundPlayerState() | Energy reset result |
| `processDestroyDrone()` | destroyDrone | gameEngine.onDroneDestroyed() | Destruction result |
| `processAddShield()` | addShield | gameEngine.processShieldAllocation() | Shield allocation result |
| `processResetShields()` | resetShields | gameEngine.processResetShieldAllocation() | Shield reset result |

**Total Action Types Handled:** 29

### What ActionProcessor Orchestrates vs Delegates

#### Orchestrates Directly:
1. **Action Queuing** - Serial execution with locks
2. **Validation** - Turn validation, pass state checks, phase checks
3. **Security** - Prevents out-of-turn actions
4. **State Updates** - Writes to GameStateManager
5. **Event Emission** - Broadcasts to subscribers
6. **Animation Management** - Coordinates with AnimationManager
7. **Network Broadcasting** - Multiplayer state sync
8. **Win Condition Checks** - After actions complete

#### Delegates to gameEngine:
1. **All effect resolution** - Damage, heal, draw, etc.
2. **All targeting logic** - What can be targeted
3. **All validation logic** - Can drone deploy, can card play
4. **All calculation logic** - Damage calculation, stat bonuses
5. **All game rules** - Combat resolution, keyword mechanics

### Data Flow Through ActionProcessor

**Action Payload Structure:**
```javascript
{
  type: 'cardPlay' | 'attack' | 'ability' | 'deployment' | ...,
  payload: {
    // Action-specific data
    playerId: 'player1' | 'player2',
    card: {...},        // for cardPlay
    attackDetails: {...}, // for attack
    etc.
  },
  isNetworkAction: boolean  // for multiplayer
}
```

**Return Structure:**
```javascript
{
  success: boolean,
  newPlayerStates: { player1: {...}, player2: {...} },
  shouldEndTurn: boolean,
  goAgain: boolean,
  animationEvents: [...],
  needsCardSelection: {...} | null,
  needsInterceptionDecision: boolean,
  // ... action-specific fields
}
```

### Action Locks (Race Condition Prevention)

ActionProcessor maintains 18 action-specific locks:
```javascript
actionLocks: {
  attack, ability, deployment, cardPlay, shipAbility,
  shipAbilityCompletion, turnTransition, phaseTransition,
  roundStart, reallocateShields, aiAction, aiTurn,
  playerPass, aiShipPlacement, commitment,
  processFirstPlayerDetermination
}
```

**Lock Pattern:**
```javascript
// Set lock before processing
this.actionLocks[type] = true;

try {
  // Process action
} finally {
  // Always release lock
  this.actionLocks[type] = false;
}
```

---

# Section 4: Current Logic Location Mapping

### Targeting Logic Map

| Targeting Type | Current Location | Function Name | Line Range | What It Does |
|----------------|------------------|---------------|------------|--------------|
| DRONE | gameLogic.js | getValidTargets() | 206-410 | Returns all valid drone targets based on affinity (FRIENDLY/ENEMY/ANY), location (ANY_LANE/SAME_LANE), and custom criteria (EXHAUSTED/MARKED/DAMAGED_HULL) |
| SHIP_SECTION | gameLogic.js | getValidTargets() | 206-410 | Returns all valid ship section targets based on affinity |
| LANE | gameLogic.js | getValidTargets() | 206-410 | Returns all valid lane targets (lane1/lane2/lane3) based on affinity |
| DRONE_CARD | gameLogic.js | getValidTargets() | 206-410 | Returns drone cards from activeDronePool that can accept upgrades |
| APPLIED_UPGRADE | gameLogic.js | getValidTargets() | 206-410 | Returns drones that have applied upgrades (for System Sabotage card) |
| ALL_MARKED | gameLogic.js | getValidTargets() | 206-410 | Returns all marked drones respecting affinity |
| MULTI_DRONE | gameLogic.js | getValidTargets() | 206-410 | Returns multiple drones matching criteria (UI enforces count) |
| Attack Targets | gameLogic.js | calculatePotentialInterceptors() | 1189-1226 | Calculates potential interceptor drones for attacks |
| Interception | gameLogic.js | calculateAiInterception() | 1286-1317 | Determines if AI should intercept an attack |
| Jammer Protection | gameLogic.js | getValidTargets() | 229-249 | Checks for Jammer drones that force card targeting |
| Guardian Check | App.jsx | handleTargetClick() | 2679-2711 | Checks if Guardian blocks ship section attacks |

**Shared Targeting Utilities:**
- `getLaneOfDrone(droneId, playerState)` - Line 186
- `hasJammerKeyword(drone)` - Line 230-235
- `hasJammerInLane(playerState, lane)` - Line 238-242

---

### Effect Logic Map

| Effect Type | Current Location | Function Name | Line Range | What It Does |
|-------------|------------------|---------------|------------|--------------|
| DAMAGE | gameLogic.js | resolveUnifiedDamageEffect() | 2996-3048 | Routes damage to resolveAttack() with markedBonus calculation |
| DAMAGE_SCALING | gameLogic.js | resolveDamageScalingEffect() | 3050-3089 | Calculates damage based on scaling source (e.g., READY_DRONES_IN_LANE) |
| SPLASH_DAMAGE | gameLogic.js | resolveSplashDamageEffect() | 4091-4268 | Deals damage to all drones in target lane with adjacent lane splash |
| OVERFLOW_DAMAGE | gameLogic.js | resolveOverflowDamageEffect() | 3643-4089 | Damage that spreads to other targets if primary target destroyed |
| DRAW | gameLogic.js | resolveUnifiedDrawEffect() | 3193-3235 | Draws cards from deck (with deck shuffle if needed) |
| SEARCH_AND_DRAW | gameLogic.js | resolveSearchAndDrawEffect() | 3265-3412 | Shows card selection UI, returns needsCardSelection |
| GAIN_ENERGY | gameLogic.js | resolveEnergyEffect() | 2316-2333 | Adds energy up to maxEnergy cap |
| HEAL_HULL | gameLogic.js | resolveUnifiedHealEffect() | 3091-3191 | Heals drone hull up to max hull |
| HEAL_SHIELDS | gameLogic.js | resolveHealShieldsEffect() | 2385-2481 | Heals ship section shields up to max |
| READY_DRONE | gameLogic.js | resolveReadyDroneEffect() | 2335-2357 | Unexhausts target drone |
| DESTROY | gameLogic.js | resolveDestroyEffect() | 2731-2885 | Instantly destroys target drone |
| MODIFY_STAT | gameLogic.js | resolveModifyStatEffect() | 2887-2934 | Adds temporary or permanent stat bonus |
| MODIFY_DRONE_BASE | gameLogic.js | resolveUpgradeEffect() | 2936-2965 | Applies upgrade card to drone base stats |
| DESTROY_UPGRADE | gameLogic.js | resolveDestroyUpgradeEffect() | 2967-2994 | Removes upgrade from drone |
| SINGLE_MOVE | gameLogic.js | resolveSingleMove() | 1886-1942 | Moves one drone between lanes with onMove effects |
| MULTI_MOVE | gameLogic.js | resolveMultiMove() | 1814-1884 | Moves multiple drones between lanes |
| CREATE_TOKENS | gameLogic.js | resolveCreateTokensEffect() | 3541-3641 | Creates drone tokens on board |
| REPEATING_EFFECT | gameLogic.js | resolveMultiEffect() | 2213-2237 | Repeats sub-effects based on condition count |
| GRANT_KEYWORD | gameLogic.js | calculateEffectiveStats() | statsCalculator.js | Applied via passive abilities during stat calculation |
| Attack Resolution | gameLogic.js | resolveAttack() | 4423-4747 | Main combat resolution (damage, shields, destruction) |
| Ability Resolution | gameLogic.js | resolveAbility() | 868-938 | Drone ability effects (pays costs, applies effects) |
| Ship Ability | gameLogic.js | resolveShipAbility() | 940-1025 | Ship section ability effects |

**Shared Effect Utilities:**
- `calculateRepeatCount(condition, playerState)` - Line 1963
- `onDroneDestroyed(playerState, drone)` - Line 135
- `onDroneRecalled(playerState, drone)` - Line 147
- `updateAuras(playerState, opponentState, sections)` - Line 168
- `applyOnMoveEffects(playerState, drone, fromLane, toLane, callback)` - Line 410
- `calculateAfterAttackStateAndEffects(playerState, attacker, attackingPlayerId)` - Line 463

---

## Section 6: Extraction Strategy

### 🎉 IMPLEMENTATION PROGRESS

#### ✅ Phase 1: COMPLETED (2025-11-03)
**Status:** All Phase 1 processors extracted and tested successfully

**Files Created:**
- ✅ `src/logic/effects/BaseEffectProcessor.js` - Abstract base class with common utilities
- ✅ `src/logic/EffectRouter.js` - Routes effect types to processors
- ✅ `src/logic/effects/cards/DrawEffectProcessor.js` - DRAW effect (handles deck reshuffling)
- ✅ `src/logic/effects/energy/GainEnergyEffectProcessor.js` - GAIN_ENERGY effect (caps at maxEnergy)
- ✅ `src/logic/effects/state/ReadyDroneEffectProcessor.js` - READY_DRONE effect (unexhausts drones)

**Integration:**
- ✅ Modified `gameLogic.js` to use EffectRouter with fallback pattern
- ✅ Added logging categories: EFFECT_ROUTING, EFFECT_PROCESSING, EFFECT_FALLBACK
- ✅ Build successful, all tests passing
- ✅ Verified with card plays (logging shows correct routing)

**Key Implementation Notes:**
- Used fallback pattern: try modular processor first, fall back to monolithic if not found
- BaseEffectProcessor provides: `clonePlayerStates()`, `getActingPlayerState()`, `createResult()`
- All processors follow consistent pattern: `process(effect, context)` returns `{ newPlayerStates, additionalEffects }`
- Logging helpers: `logProcessStart()` and `logProcessComplete()` in base class

---

#### ✅ Phase 2: COMPLETED (2025-11-03)
**Status:** All targeting logic extracted and tested successfully

**⚠️ CRITICAL CLEANUP REQUIREMENT:**
When extracting functions to processors, the **old monolithic functions MUST be deleted from gameLogic.js immediately** after creating the new processor. This is NOT optional - it's a required step to prevent:
- Code duplication and confusion about which code is "real"
- Invalid testing (tests may hit old code instead of new processors)
- Maintenance burden (bug fixes applied to wrong version)
- Architectural violations (direct calls to old functions bypassing routers)

**Files Created:**
- ✅ `src/logic/utils/gameEngineUtils.js` - Shared utilities (getLaneOfDrone, hasJammerKeyword, etc.)
- ✅ `src/logic/targeting/BaseTargetingProcessor.js` - Abstract base class for targeting
- ✅ `src/logic/TargetingRouter.js` - Routes targeting types to processors
- ✅ `src/logic/targeting/lane/LaneTargetingProcessor.js` - LANE targeting
- ✅ `src/logic/targeting/ship/ShipSectionTargetingProcessor.js` - SHIP_SECTION targeting
- ✅ `src/logic/targeting/drone/DroneTargetingProcessor.js` - DRONE + MULTI_DRONE targeting
- ✅ `src/logic/targeting/cards/DroneCardTargetingProcessor.js` - DRONE_CARD targeting (upgrades)
- ✅ `src/logic/targeting/cards/AppliedUpgradeTargetingProcessor.js` - APPLIED_UPGRADE targeting
- ✅ `src/logic/targeting/drone/AllMarkedProcessor.js` - ALL_MARKED targeting

**Integration:**
- ✅ Modified `gameLogic.js` to use TargetingRouter with fallback pattern
- ✅ Added logging categories: TARGETING_ROUTING, TARGETING_PROCESSING, TARGETING_FALLBACK
- ✅ Build successful, all targeting types functional
- ✅ **CRITICAL:** Jammer keyword protection logic preserved in DroneTargetingProcessor

**Key Implementation Notes:**
- **Jammer Mechanic Preserved:** Opponent card effects targeting lanes with ready Jammers can ONLY target those Jammers (lines 169-176 in DroneTargetingProcessor.js)
- **Custom Criteria Working:** EXHAUSTED, MARKED, NOT_MARKED, DAMAGED_HULL all filter correctly
- **SAME_LANE Logic:** Abilities correctly identify source drone's lane for targeting
- BaseTargetingProcessor provides: `matchesAffinity()`, `applyCustomCriteria()`, `getActingPlayerState()`
- All processors follow pattern: `process(context)` returns `Array<targets>`
- Context object includes: `{ actingPlayerId, player1, player2, source, definition }`

**Folder Structure Created:**
```
src/logic/
├── EffectRouter.js              [Phase 1]
├── TargetingRouter.js           [Phase 2]
├── effects/
│   ├── BaseEffectProcessor.js   [Phase 1]
│   ├── cards/
│   │   └── DrawEffectProcessor.js [Phase 1]
│   ├── energy/
│   │   └── GainEnergyEffectProcessor.js [Phase 1]
│   └── state/
│       └── ReadyDroneEffectProcessor.js [Phase 1]
├── targeting/                   [Phase 2]
│   ├── BaseTargetingProcessor.js
│   ├── drone/
│   │   ├── DroneTargetingProcessor.js
│   │   └── AllMarkedProcessor.js
│   ├── ship/
│   │   └── ShipSectionTargetingProcessor.js
│   ├── lane/
│   │   └── LaneTargetingProcessor.js
│   └── cards/
│       ├── DroneCardTargetingProcessor.js
│       └── AppliedUpgradeTargetingProcessor.js
└── utils/                       [Phase 2]
    └── gameEngineUtils.js
```

**Testing Results:**
- ✅ Effect routing verified with GAIN_ENERGY card (console logs show correct processor execution)
- ✅ All 7 targeting types route to modular processors
- ✅ No fallback logs appear (all targeting types successfully extracted)
- ✅ Build time: ~4.5 seconds, bundle size: 1.51 MB (minimal increase)

**Critical Lessons Learned:**

1. **Fallback Pattern is Essential**
   - Always implement modular processors alongside fallback to monolithic
   - This allows gradual extraction without breaking existing functionality
   - Pattern: `const result = router.route(context); if (result !== null) return result; // fallback`

2. **Import Statements Matter**
   - `fullDroneCollection` is a default export from droneData.js, not named export
   - Always verify export style before creating processors
   - Use `import fullDroneCollection from '...'` NOT `import { fullDroneCollection } from '...'`

3. **Logging is Critical for Verification**
   - Add distinct categories for each phase (EFFECT_*, TARGETING_*)
   - Enable logging during development, disable in production
   - Base classes should provide logging helpers (`logProcessStart()`, `logProcessComplete()`)

4. **Context Objects Prevent Signature Bloat**
   - Effect processors use: `{ actingPlayerId, playerStates, placedSections, target, callbacks }`
   - Targeting processors use: `{ actingPlayerId, player1, player2, source, definition }`
   - Makes adding new parameters easier without breaking all processors

5. **Base Classes Reduce Duplication**
   - Common utilities in base class (cloning, affinity checks, custom criteria)
   - All processors inherit consistent behavior
   - Easier to add new features (just update base class)

6. **Jammer Mechanic is the Most Complex Targeting Logic**
   - Opponent card effects targeting lanes with ready Jammers can ONLY target Jammers
   - This is NOT a suggestion - it's forced targeting
   - Must be preserved exactly when extracting drone targeting

7. **Router Pattern Scales Well**
   - EffectRouter handles 3 types (Phase 1), can easily expand
   - TargetingRouter handles 7 types (Phase 2), no performance issues
   - `routeEffect()` and `routeTargeting()` methods follow identical patterns

---

### 📋 NEXT STEPS (Phase 3)

**Recommended:** Extract Healing Effects next

**Why Healing Effects?**
1. **Medium Complexity:** Good progression from simple effects (Phase 1) to moderate complexity
2. **Self-Contained:** Healing effects don't depend on attack resolution (unlike damage effects)
3. **Common Usage:** Hull and shield healing are frequently used mechanics
4. **Prepares for Damage:** Understanding heal patterns helps with damage extraction later

**Phase 3 Target Files:**
- `src/logic/effects/healing/HullHealProcessor.js` - Extract `resolveUnifiedHealEffect()` hull portion
- `src/logic/effects/healing/ShieldHealProcessor.js` - Extract `resolveHealShieldsEffect()`

**Estimated Effort:** ~2-3 hours
- Hull healing: ~100 lines with scope handling (LANE vs single target)
- Shield healing: ~100 lines with section targeting
- Both have MODERATE risk due to scope logic

**Alternative: Skip to Phase 4 Damage Effects**
- More complex but unlocks more card types
- Requires careful handling of `resolveAttack()` dependency
- Recommend completing Phase 3 first for learning curve

---

### Recommended Extraction Order

#### Phase 1: Quick Wins (Proof of Concept) ✅ COMPLETED
**Goal:** Demonstrate modular approach with minimal risk

1. **Extract Draw Effect** ✅ EASIEST
   - **File:** Create `src/logic/effects/draw/DrawEffectProcessor.js`
   - **Extracts:** `resolveDrawEffect()`, `resolveUnifiedDrawEffect()`
   - **Lines:** ~100 lines
   - **Dependencies:** None (self-contained)
   - **Risk:** VERY LOW
   - **Value:** Immediate proof that modular approach works

2. **Extract Energy Effect** ✅ EASY
   - **File:** Create `src/logic/effects/energy/EnergyEffectProcessor.js`
   - **Extracts:** `resolveEnergyEffect()`
   - **Lines:** ~30 lines
   - **Dependencies:** `statsCalculator.calculateEffectiveShipStats()`
   - **Risk:** LOW
   - **Value:** Shows dependency management pattern

3. **Extract Ready Drone Effect** ✅ EASY
   - **File:** Create `src/logic/effects/state/ReadyDroneEffectProcessor.js`
   - **Extracts:** `resolveReadyDroneEffect()`
   - **Lines:** ~30 lines
   - **Dependencies:** None
   - **Risk:** LOW
   - **Value:** Simple state mutation pattern

**Phase 1 Deliverable:** 3 effect processors extracted, EffectRouter functional ✅ COMPLETE

---

#### Phase 2: Targeting System ✅ COMPLETED
**Goal:** Extract all targeting logic (enables UI refactoring)

4. **Extract Drone Targeting** ✅ COMPLETED
   - **File:** Create `src/logic/targeting/drone/DroneTargetingProcessor.js`
   - **Extracts:** Drone targeting logic from `getValidTargets()`
   - **Lines:** ~150 lines
   - **Dependencies:** `getLaneOfDrone()`, Jammer checks, custom criteria
   - **Risk:** MODERATE (complex affinity/location logic)
   - **Value:** Largest targeting type, enables others

5. **Extract Ship Section Targeting** ✅ COMPLETED
   - **File:** Create `src/logic/targeting/ship/ShipSectionTargetingProcessor.js`
   - **Extracts:** Ship section targeting from `getValidTargets()`
   - **Lines:** ~30 lines
   - **Dependencies:** None
   - **Risk:** LOW
   - **Value:** Completes major targeting types

6. **Extract Lane Targeting** ✅ COMPLETED
   - **File:** Create `src/logic/targeting/lane/LaneTargetingProcessor.js`
   - **Extracts:** Lane targeting from `getValidTargets()`
   - **Lines:** ~20 lines
   - **Dependencies:** None
   - **Risk:** LOW

7. **Extract Specialized Targeting** ✅ COMPLETED
   - **Files:**
     - `DroneCardTargetingProcessor.js` (upgrade targeting)
     - `AppliedUpgradeTargetingProcessor.js` (System Sabotage)
     - `AllMarkedProcessor.js` (mark-dependent cards)
   - **Lines:** ~100 lines total
   - **Dependencies:** `activeDronePool`, `appliedUpgrades`
   - **Risk:** MODERATE

**Phase 2 Deliverable:** TargetingRouter functional, all targeting extracted ✅ COMPLETE

---

#### ✅ Phase 3: Healing Effects - COMPLETED (2025-11-03)
**Goal:** Extract heal effects (moderate complexity)

8. **✅ Extract Hull Healing** - COMPLETED
   - **File:** `src/logic/effects/healing/HullHealProcessor.js`
   - **Extracted:** `resolveUnifiedHealEffect()` (hull portion, renamed to `HEAL_HULL`)
   - **Lines:** ~250 lines
   - **Dependencies:** `fullDroneCollection`, `getLaneOfDrone()`, `buildHealAnimation()`
   - **Effect Type:** `HEAL_HULL`
   - **Features:**
     - Single drone targeting
     - Single ship section targeting
     - LANE scope (heals all drones in lane)
     - Animation builder integration

9. **✅ Extract Shield Healing** - COMPLETED
   - **File:** `src/logic/effects/healing/ShieldHealProcessor.js`
   - **Extracted:** `resolveHealShieldsEffect()` (renamed to `HEAL_SHIELDS`)
   - **Lines:** ~250 lines
   - **Dependencies:** `placedSections`, ship sections, `buildHealAnimation()`
   - **Effect Type:** `HEAL_SHIELDS`
   - **Features:**
     - Single drone targeting
     - Single ship section targeting
     - LANE scope (heals all drones in lane)
     - Shared `HealAnimation.js` builder with hull healing

**Phase 3 Deliverable:** ✅ All healing effects extracted
- Old functions deleted from gameLogic.js: `resolveUnifiedHealEffect()`, `resolveHealShieldsEffect()`
- Shared animation builder: `src/logic/effects/healing/animations/HealAnimation.js`

---

#### ✅ Phase 4: Damage Effects - COMPLETED (2025-11-03)
**Goal:** Extract damage effects (HIGH complexity)

10. **✅ Extract All Damage Types** - COMPLETED (Single Comprehensive Processor)
    - **File:** `src/logic/effects/damage/DamageEffectProcessor.js`
    - **Extracted:** All damage effect types in one comprehensive processor:
      - `resolveUnifiedDamageEffect()` → `DAMAGE` effect type
      - `resolveDamageScalingEffect()` → `DAMAGE_SCALING` effect type
      - `resolveSplashDamageEffect()` → `SPLASH_DAMAGE` effect type
      - `resolveOverflowDamageEffect()` → `OVERFLOW_DAMAGE` effect type
    - **Lines:** ~700 lines (comprehensive damage processor)
    - **Dependencies:** `resolveAttack()` callback, target priority logic, lane adjacency
    - **Effect Types Handled:** `DAMAGE`, `DAMAGE_SCALING`, `SPLASH_DAMAGE`, `OVERFLOW_DAMAGE`
    - **Architecture Decision:** Single processor with method routing instead of multiple processors
    - **Features:**
      - Single target damage with attack resolution integration
      - Scaling damage based on drone stats
      - Splash damage to adjacent lanes
      - Overflow damage with target priority and recursive damage
      - FILTERED scope support (damage multiple matching drones)
      - Shield and hull damage tracking
      - Destruction detection and animation generation

**Animation Builders Created:**
- `src/logic/effects/damage/animations/DefaultDamageAnimation.js` - Fallback for all DAMAGE effects
- `src/logic/effects/damage/animations/RailgunAnimation.js` - Card-specific override (Railgun Strike)
- `src/logic/effects/damage/animations/OverflowAnimation.js` - Effect-specific (OVERFLOW_DAMAGE)
- `src/logic/effects/damage/animations/SplashAnimation.js` - Effect-specific (SPLASH_DAMAGE)
- `src/logic/effects/damage/animations/FilteredDamageAnimation.js` - Scope-specific (FILTERED targeting)

**Phase 4 Deliverable:** ✅ All damage effects extracted
- Old functions deleted from gameLogic.js: `resolveUnifiedDamageEffect()`, `resolveDamageScalingEffect()`, `resolveSplashDamageEffect()`, `resolveOverflowDamageEffect()`, `resolveDamageEffect()`
- Card-specific animation override system established (Railgun Strike example)

---

### 🎨 Architectural Patterns Established (Phases 3-4)

During the extraction of healing and damage effects, we established critical architectural patterns that **MUST be followed** in all future phases:

#### 1. Animation Builder Pattern

**Principle:** Separate animation event generation from effect processing logic.

**File Structure:**
```
src/logic/effects/
├── <effect-category>/
│   ├── <EffectType>Processor.js        (Effect logic + state mutation)
│   └── animations/
│       ├── <Default>Animation.js       (Required fallback)
│       ├── <CardSpecific>Animation.js  (Optional overrides)
│       └── <EffectSpecific>Animation.js (Optional variants)
```

**Builder Function Pattern:**
```javascript
/**
 * Animation builder: Pure function transforming effect context to animation events
 *
 * @param {Object} context - Animation context from processor
 * @param {Object} context.target - Target entity (drone/ship/lane)
 * @param {Object} context.card - Source card (for instanceId tracking)
 * @param {number} context.shieldDamage - Shield damage dealt
 * @param {number} context.hullDamage - Hull damage dealt
 * @param {boolean} context.destroyed - Destruction status
 * @param {string} context.targetPlayer - Target player ID
 * @param {string} context.targetLane - Target lane
 * @returns {Array<Object>} Array of animation event objects
 */
export function buildDefaultDamageAnimation(context) {
  const animations = [];

  // Generate animation events based on context
  animations.push({
    type: 'LASER_BEAM',
    targetId: context.target.id,
    targetPlayer: context.targetPlayer,
    targetLane: context.targetLane,
    sourceCardInstanceId: context.card?.instanceId
  });

  if (context.destroyed) {
    animations.push({
      type: 'EXPLOSION',
      targetId: context.target.id,
      delay: 800
    });
  }

  return animations;
}
```

**Requirements:**
- ✅ Every effect type MUST have a default animation builder
- ✅ Builders MUST be pure functions (no side effects, no state mutations)
- ✅ Builders MUST return arrays of animation event objects
- ✅ Builders MUST live in `/animations/` subdirectory within effect type folder

#### 2. Animation Override Hierarchy

**Principle:** Support progressive enhancement from default to card-specific animations.

**Override Chain (Highest to Lowest Priority):**

1. **Card-Level Override** - Specific cards with custom animations
   ```javascript
   // In cardData.js
   {
     id: 'CARD025',
     name: 'Railgun Strike',
     visualEffect: {
       type: 'RAILGUN_ANIMATION'  // Triggers buildRailgunAnimation()
     }
   }

   // In DamageEffectProcessor.js
   const visualType = card?.visualEffect?.type;
   if (visualType === 'RAILGUN_ANIMATION') {
     animationEvents = buildRailgunAnimation(context);
   }
   ```

2. **Effect-Type Specific** - Different animations per effect variant
   ```javascript
   // OVERFLOW_DAMAGE uses specialized animation
   if (effect.type === 'OVERFLOW_DAMAGE') {
     animationEvents = buildOverflowAnimation(context);
   }
   ```

3. **Default Fallback** - Generic animation for effect type
   ```javascript
   // All other DAMAGE effects
   else {
     animationEvents = buildDefaultDamageAnimation(context);
   }
   ```

**Implementation Pattern in Processor:**
```javascript
// Inside DamageEffectProcessor.processDamage()
let animationEvents = [];

// Step 1: Check for card-specific override
const visualType = card?.visualEffect?.type;
if (visualType === 'RAILGUN_ANIMATION') {
  animationEvents = buildRailgunAnimation({ target, card, shieldDamage, hullDamage, destroyed, targetPlayer, targetLane });
}
// Step 2: Check for effect-specific animation
else if (effect.type === 'OVERFLOW_DAMAGE') {
  animationEvents = buildOverflowAnimation({ target, overflowDamage, primaryDamage, targetPlayer, targetLane });
}
// Step 3: Use default animation
else {
  animationEvents = buildDefaultDamageAnimation({ target, card, shieldDamage, hullDamage, destroyed, targetPlayer, targetLane });
}

return this.createResult(newPlayerStates, animationEvents);
```

**Future Support for Drone-Specific Animations:**
```javascript
// Pattern reserved for drone ability animations
if (source?.animationOverride) {
  animationEvents = buildDroneAbilityAnimation(context);
}
```

#### 3. Effect Context Object Structure

**Principle:** Standardized context parameter structure for all processors.

**Complete Context Definition:**
```javascript
const context = {
  // ========================================
  // REQUIRED: Player and State
  // ========================================
  actingPlayerId: 'player1',           // Player executing the effect
  playerStates: {                      // Current game state (will be cloned)
    player1: {
      hand: [],
      dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
      shipSections: {},
      // ... full player state
    },
    player2: { /* same structure */ }
  },

  // ========================================
  // OPTIONAL: Targeting and Execution Context
  // ========================================
  target: {                            // Target entity (from targeting system)
    id: 'drone_123',
    name: 'Assault Drone',
    owner: 'player2',
    type: 'drone' | 'ship_section' | 'lane'
  },

  placedSections: {                    // Ship section placement data
    player1: [                         // Array of placed sections
      { name: 'Bridge', position: 'A1', maxHull: 5, /* ... */ },
      // ...
    ],
    player2: [ /* same structure */ ]
  },

  // ========================================
  // OPTIONAL: Source Context
  // ========================================
  card: {                              // Source card (if effect from card play)
    instanceId: 'card_instance_456',   // For animation tracking
    name: 'Railgun Strike',
    visualEffect: { type: 'RAILGUN_ANIMATION' }
  },

  source: {                            // Source entity (if effect from ability)
    id: 'drone_789',
    name: 'Artillery Drone',
    owner: 'player1'
  },

  // ========================================
  // OPTIONAL: Complex Operation Callbacks
  // ========================================
  callbacks: {
    resolveAttackCallback: (attacker, defender, playerStates) => {
      // Attack resolution logic (for damage effects)
    },
    logCallback: (message, data) => {
      // Game log entry creation
    }
  }
};
```

**Usage in Processors:**
```javascript
process(effect, context) {
  // Destructure required and optional properties
  const { actingPlayerId, playerStates, target, placedSections, card, callbacks } = context;

  // Use context throughout processing
  const newPlayerStates = this.clonePlayerStates(playerStates);
  const targetPlayerState = this.getTargetPlayerState(newPlayerStates, target, actingPlayerId);

  // Access callbacks if provided
  if (callbacks?.resolveAttackCallback) {
    const damageResult = callbacks.resolveAttackCallback(attacker, target, newPlayerStates);
  }

  return this.createResult(newPlayerStates, animationEvents);
}
```

#### 4. Deep Cloning Pattern

**Principle:** Prevent mutations to original game state through immediate deep cloning.

**Implementation (BaseEffectProcessor.js):**
```javascript
/**
 * Deep clone player states to prevent mutations
 * Uses JSON.parse(JSON.stringify()) for full object graph cloning
 *
 * @param {Object} playerStates - Original player states
 * @returns {Object} Deep cloned player states
 */
clonePlayerStates(playerStates) {
  return {
    player1: JSON.parse(JSON.stringify(playerStates.player1)),
    player2: JSON.parse(JSON.stringify(playerStates.player2))
  };
}
```

**Required Usage Pattern in ALL Processors:**
```javascript
process(effect, context) {
  // ⚠️ CRITICAL: Clone IMMEDIATELY as first operation
  const newPlayerStates = this.clonePlayerStates(context.playerStates);

  // Now safe to mutate newPlayerStates
  const actingPlayerState = this.getActingPlayerState(newPlayerStates, context.actingPlayerId);
  const targetPlayerState = this.getTargetPlayerState(newPlayerStates, context.target, context.actingPlayerId);

  // All mutations happen on cloned states
  targetPlayerState.dronesOnBoard[lane][droneIndex].hull -= damage;
  actingPlayerState.energy -= energyCost;

  // Return modified clone, original context.playerStates unchanged
  return this.createResult(newPlayerStates, animationEvents);
}
```

**Why Deep Cloning is Critical:**
- ✅ Prevents side effects on React state
- ✅ Enables transaction-like rollback if validation fails
- ✅ Maintains immutability principle for predictable state management
- ✅ Allows processors to be pure functions (same input → same output)
- ✅ Simplifies debugging (original state preserved for comparison)

#### 5. Pattern A Animation Integration

**Principle:** Position calculation happens in `useAnimationSetup` hook, not in animation components.

**Architecture Layers:**

**Layer 1: Animation Builder (gameLogic layer)**
```javascript
// Builder generates descriptive event (NO position calculation)
export function buildRailgunAnimation(context) {
  return [{
    type: 'RAILGUN_BEAM',
    targetId: 'drone_123',              // ID reference only
    targetPlayer: 'player2',
    targetLane: 'lane1',
    delay: 1600
  }];
}
```

**Layer 2: useAnimationSetup Hook (UI integration layer)**
```javascript
// Hook calculates positions from DOM refs
animationManager.registerVisualHandler('RAILGUN_BEAM', (payload) => {
  const { targetId, targetPlayer, targetLane, delay } = payload;

  // Query DOM for target position
  const targetEl = droneRefs.current[targetId];
  const targetRect = targetEl.getBoundingClientRect();

  // Create state update with pre-calculated position
  setRailgunBeams(prev => [...prev, {
    id: generateId(),
    position: {                         // Pre-calculated in hook
      left: targetRect.left,
      top: targetRect.top,
      width: targetRect.width,
      height: targetRect.height
    },
    delay,
    onComplete: () => { /* cleanup */ }
  }]);
});
```

**Layer 3: Animation Component (pure rendering layer)**
```javascript
// Component receives pre-calculated data, NO ref access
const RailgunBeam = ({ position, delay, onComplete }) => {
  return (
    <div style={{
      position: 'fixed',
      left: position.left,              // Uses pre-calculated position
      top: position.top,
      width: position.width,
      height: position.height,
      transition: `all ${delay}ms ease-out`
    }}>
      {/* Render beam visual */}
    </div>
  );
};
```

**Pattern A Benefits:**
- ✅ **Separation of Concerns:** gameLogic generates events, UI calculates positions, components render
- ✅ **Testability:** Animation components testable without DOM dependencies
- ✅ **Consistency:** All animation components follow identical prop pattern
- ✅ **React Best Practice:** Refs stay in hook layer, don't leak to component props

#### 6. Animation Timing Coordination

**Principle:** Builders coordinate complex multi-stage animations with precise timing.

**Simple Timing (Single Stage):**
```javascript
// HealAnimation.js - Immediate effect
export function buildHealAnimation(context) {
  return [{
    type: 'HEAL_PULSE',
    targetId: context.target.id,
    healAmount: context.healAmount
    // No delay - plays immediately
  }];
}
```

**Complex Timing (Multi-Stage):**
```javascript
// RailgunAnimation.js - 3-stage coordinated sequence
export function buildRailgunAnimation(context) {
  const TURRET_SHOOT_TIME = 1600; // Timing constant
  const animations = [];

  // Stage 1: Turret deploys, charges, shoots (plays immediately)
  animations.push({
    type: 'RAILGUN_TURRET',
    delay: 0  // Explicit zero for clarity
  });

  // Stage 2: Beam fires (synchronized with turret shoot)
  animations.push({
    type: 'RAILGUN_BEAM',
    targetId: context.target.id,
    delay: TURRET_SHOOT_TIME  // Fires when turret shoots
  });

  // Stage 3: Damage feedback (synchronized with beam impact)
  animations.push({
    type: 'SHIELD_DAMAGE',
    amount: context.shieldDamage,
    delay: TURRET_SHOOT_TIME  // Same timing as beam
  });

  return animations;
}
```

**Adaptive Timing (Conditional):**
```javascript
// OverflowAnimation.js - Timing adapts to game state
export function buildOverflowAnimation(context) {
  const PROJECTILE_DURATION = 1200;
  const hasOverflowDamage = context.overflowDamage > 0;

  // Speed varies based on whether overflow occurs
  const IMPACT_TIME = hasOverflowDamage
    ? PROJECTILE_DURATION / 3  // 400ms - faster with overflow
    : PROJECTILE_DURATION / 2; // 600ms - slower without

  return [{
    type: 'OVERFLOW_PROJECTILE',
    targetId: context.target.id,
    delay: IMPACT_TIME
  }];
}
```

**Timing Best Practices:**
- ✅ Use named constants for timing values (e.g., `TURRET_SHOOT_TIME`)
- ✅ Coordinate related animations with same delay value
- ✅ Explicit `delay: 0` for immediate animations (clarity)
- ✅ Document timing relationships in comments
- ✅ Test timing coordination with multiple animation stages

#### 7. Dependency Management During Refactoring

**Principle:** Shared utility functions haven't all been extracted yet - some remain in monolithic gameLogic.js

**The High-Level Problem:**
During the refactoring process, we're creating new modular processors that depend on utility functions which are still trapped in the monolithic `gameLogic.js` file. This creates temporary coupling back to the file we're trying to refactor away from.

**Current Reality:**
- **Some utilities extracted:** `gameEngineUtils.js` contains `getLaneOfDrone`, `hasJammerKeyword`, etc.
- **Many utilities NOT extracted:** Functions like `onDroneDestroyed`, `updateAuras`, etc. remain in `gameLogic.js`
- **Split locations:** Utilities scattered across multiple files during refactoring

**Temporary Import Pattern (Current Necessity):**
```javascript
// When a utility is still in gameLogic.js
import { gameEngine } from '../../gameLogic.js';

// Usage
gameEngine.onDroneDestroyed(playerState, drone);
gameEngine.updateAuras(playerState);
```

**Example Issue Encountered:**
During Phase 6, both `DamageEffectProcessor` and `DestroyEffectProcessor` initially tried to import `onDroneDestroyed` from `gameEngineUtils.js`, causing module errors. The function was actually in `gameLogic.js` as part of the `gameEngine` export.

**Import Verification Checklist:**
1. ✅ Check if function exists in `gameEngineUtils.js` first
2. ✅ If not found, check `gameLogic.js` and import via `gameEngine` object
3. ✅ Never assume location - verify before importing
4. ✅ Document any `gameEngine` imports as technical debt

**Future Goal (Phase 9+):**
- Extract ALL utility functions from `gameLogic.js` to dedicated modules
- No processor should ever import from `gameLogic.js` directly
- Clean separation: processors → utilities → data

**Benefits After Utility Extraction:**
- ✅ Clear dependency graph
- ✅ No circular dependency risks
- ✅ Easier testing and mocking
- ✅ True modular architecture

---

### Key Takeaways for Future Phases

**When Extracting Effects (Phases 5-8):**

1. **✅ MANDATORY:** Create default animation builder in `/animations/` subdirectory
2. **✅ MANDATORY:** Clone playerStates immediately in `process()` method
3. **✅ MANDATORY:** Use standardized effect context object structure
4. **✅ MANDATORY:** Delete old functions from gameLogic.js after extraction
5. **⚠️ MANDATORY:** Verify utility function locations before importing (check both `gameEngineUtils.js` and `gameLogic.js`)
6. **✅ OPTIONAL:** Create card-specific animation overrides as needed
7. **✅ OPTIONAL:** Create effect-variant animations for visual variety

**Code Deletion Enforcement:**
After creating a new processor and registering it in EffectRouter, you **MUST immediately**:
1. Remove the fallback case from `resolveSingleEffect` switch statement
2. Delete the old monolithic function from gameLogic.js
3. Remove the function from gameEngine exports

This prevents code duplication, ensures valid testing, and maintains architectural integrity.

---

#### Phase 5: Combat System
**Goal:** Extract attack resolution (HIGHEST complexity)

13. **Extract Attack Resolution** 🔥🔥🔥 CRITICAL
    - **File:** Create `src/logic/combat/AttackProcessor.js`
    - **Extracts:** `resolveAttack()`, `calculateAfterAttackStateAndEffects()`
    - **Lines:** ~500 lines
    - **Dependencies:**
      - `calculateEffectiveStats()` (statsCalculator)
      - `onDroneDestroyed()`
      - `updateAuras()`
      - `fullDroneCollection`
    - **Risk:** VERY HIGH (core combat system)
    - **Value:** Central to all damage effects
    - **Critical:** Breaks circular dependency with damage effects

14. **Extract Interception System** 🔥 COMPLEX
    - **File:** Create `src/logic/combat/InterceptionProcessor.js`
    - **Extracts:** `calculatePotentialInterceptors()`, `calculateAiInterception()`
    - **Lines:** ~150 lines
    - **Dependencies:** `calculateEffectiveStats()`, keyword checks
    - **Risk:** HIGH (affects combat flow)

**Phase 5 Deliverable:** CombatRouter functional, attack system extracted

---

#### ✅ Phase 6 (Partial): Stat Modification Effects - IN PROGRESS (2025-11-04)
**Goal:** Extract drone modification effects

**Folder Structure Decision:** Separate folders for distinct effect categories:
```
src/logic/effects/
├── destroy/              (instant drone destruction)
├── stat_modification/    (temporary/permanent stat buffs)
└── upgrades/             (drone type upgrades and upgrade removal)
```

15. **✅ Extract Destroy Effect** - COMPLETED
    - **File:** `src/logic/effects/destroy/DestroyEffectProcessor.js`
    - **Extracted:** `resolveDestroyEffect()` (155 lines)
    - **Lines:** ~320 lines (processor)
    - **Effect Type:** `DESTROY`
    - **Scopes Supported:**
      - SINGLE - Destroy one specific drone
      - FILTERED - Destroy drones matching stat criteria (e.g., speed >= 5)
      - LANE - Destroy all drones in lane (BOTH players - area effect)
      - ALL - Not yet implemented
    - **Animation Builders:**
      - `animations/DefaultDestroyAnimation.js` - Standard DRONE_DESTROYED explosions
      - `animations/NukeAnimation.js` - Card-specific override (Nuke, Purge Protocol)
    - **Card-Specific Override:** Nuke and Purge Protocol use NUKE_BLAST animation (large expanding blast + individual explosions)
    - **Dependencies:** `onDroneDestroyed()`, `getLaneOfDrone()`, deployment count tracking
    - **Old Code Deleted:** `resolveDestroyEffect()` function removed from gameLogic.js

16. **Extract Stat Modifier Effect** ⚠️ MODERATE - PENDING
    - **File:** Create `src/logic/effects/stat_modification/ModifyStatEffectProcessor.js`
    - **Extract:** `resolveModifyStatEffect()` (~48 lines)
    - **Effect Type:** `MODIFY_STAT`
    - **Dependencies:** `statMods` array, round cleanup logic
    - **No animations needed**

17. **Extract Upgrade Effects** ⚠️ MODERATE - PENDING
    - **Files:**
      - `src/logic/effects/upgrades/ModifyDroneBaseEffectProcessor.js` (~30 lines)
      - `src/logic/effects/upgrades/DestroyUpgradeEffectProcessor.js` (~25 lines)
    - **Effect Types:** `MODIFY_DRONE_BASE`, `DESTROY_UPGRADE`
    - **Dependencies:** `appliedUpgrades` system
    - **No animations needed**

**Phase 6 Deliverable:** ✅ COMPLETE - All 4 processors implemented
- DestroyEffectProcessor (SINGLE, FILTERED, LANE scopes)
- ModifyStatEffectProcessor (SINGLE, LANE targeting)
- ModifyDroneBaseEffectProcessor (appliedUpgrades system, ability granting)
- DestroyUpgradeEffectProcessor (upgrade removal by instance ID)

**Lines Extracted:**
- `resolveDestroyEffect()` - 155 lines (deleted from gameLogic.js line 2333-2487)
- `resolveModifyStatEffect()` - 48 lines (deleted from gameLogic.js line 2330-2377)
- `resolveUpgradeEffect()` - 30 lines (deleted from gameLogic.js line 2328-2357)
- `resolveDestroyUpgradeEffect()` - 25 lines (deleted from gameLogic.js line 2359-2383)
- **Total:** 258 lines extracted

**Files Created:**
- `src/logic/effects/destroy/DestroyEffectProcessor.js` (~295 lines)
- `src/logic/effects/destroy/animations/DefaultDestroyAnimation.js` (~37 lines)
- `src/logic/effects/destroy/animations/NukeAnimation.js` (~60 lines)
- `src/logic/effects/stat_modification/ModifyStatEffectProcessor.js` (~148 lines)
- `src/logic/effects/upgrades/ModifyDroneBaseEffectProcessor.js` (~98 lines)
- `src/logic/effects/upgrades/DestroyUpgradeEffectProcessor.js` (~85 lines)

**Switch Cases Removed:**
- Line 2277-2278: MODIFY_STAT case removed
- Line 2279-2280: MODIFY_DRONE_BASE case removed
- Line 2281-2282: DESTROY_UPGRADE case removed
- DESTROY case removed in previous session

---

#### Phase 7: Movement Effects
**Goal:** Extract movement system

17. **Extract Movement System** 🔥 COMPLEX
    - **Files:**
      - `SingleMoveProcessor.js`
      - `MultiMoveProcessor.js`
    - **Extracts:** `resolveSingleMove()`, `resolveMultiMove()`
    - **Lines:** ~200 lines
    - **Dependencies:**
      - `applyOnMoveEffects()`
      - `updateAuras()`
      - needsCardSelection pattern
    - **Risk:** HIGH (UI interaction)

**Phase 7 Deliverable:** Movement system extracted

---

#### Phase 8: Special Effects
**Goal:** Extract remaining specialized effects

18. **Extract Token Creation** ⚠️ MODERATE
    - **File:** Create `src/logic/effects/tokens/TokenCreationProcessor.js`
    - **Extracts:** `resolveCreateTokensEffect()`
    - **Lines:** ~100 lines
    - **Dependencies:** `fullDroneCollection`, deployment validation
    - **Risk:** MODERATE

19. **Extract Search and Draw** 🔥 COMPLEX
    - **File:** Create `src/logic/effects/cards/SearchAndDrawProcessor.js`
    - **Extracts:** `resolveSearchAndDrawEffect()`, `selectBestCardsForAI()`
    - **Lines:** ~200 lines
    - **Dependencies:** needsCardSelection, card filtering, AI logic
    - **Risk:** HIGH (UI interaction + AI)

20. **Extract Repeating Effects** ✅ EASY
    - **File:** Create `src/logic/effects/meta/RepeatingEffectProcessor.js`
    - **Extracts:** `resolveMultiEffect()`, `calculateRepeatCount()`
    - **Lines:** ~50 lines
    - **Dependencies:** EffectRouter (recursive)
    - **Risk:** LOW (meta-processor)

**Phase 8 Deliverable:** All effects extracted from gameLogic.js

---

### Dependencies to Handle Carefully

#### 1. Circular Dependency Risk: Damage ↔ Attack
**Problem:**
- `resolveUnifiedDamageEffect()` calls `resolveAttack()`
- `resolveAttack()` calls damage calculation logic

**Solution:**
```javascript
// DamageEffectProcessor.js
class DamageEffectProcessor {
  constructor(combatRouter) {
    this.combatRouter = combatRouter; // Inject combat system
  }

  process(effect, context) {
    // Build attack details
    const attackDetails = {...};
    // Delegate to combat system
    return this.combatRouter.resolveAttack(attackDetails, context);
  }
}

// CombatRouter.js
class CombatRouter {
  constructor() {
    this.attackProcessor = new AttackProcessor();
  }

  resolveAttack(attackDetails, context) {
    // Attack logic here (doesn't call back to damage effects)
    return this.attackProcessor.resolve(attackDetails, context);
  }
}
```

**Strategy:** Damage effects call combat system, not vice versa. One-way dependency.

---

#### 2. Shared Utilities
**Problem:** Many effects use same helper functions:
- `getLaneOfDrone(droneId, playerState)`
- `updateAuras(playerState, opponentState, sections)`
- `onDroneDestroyed(playerState, drone)`
- `applyOnMoveEffects(...)`

**Solution:**
```javascript
// src/logic/utils/gameEngineUtils.js
export const getLaneOfDrone = (droneId, playerState) => { ... };
export const updateAuras = (playerState, opponentState, sections) => { ... };
export const onDroneDestroyed = (playerState, drone) => { ... };
export const applyOnMoveEffects = (...) => { ... };
```

**Strategy:** Extract to shared utilities file, import in each processor.

---

#### 3. Full Data Collection Dependency
**Problem:** Many effects reference `fullDroneCollection` from droneData.js:
- Hull healing (needs max hull)
- Token creation (needs base drone data)
- Upgrade validation (needs upgrade slots)

**Solution:**
```javascript
// Pass as context
const context = {
  effect, target, playerStates, placedSections,
  dataCollections: {
    drones: fullDroneCollection,
    cards: fullCardCollection
  }
};
```

**Strategy:** Include data collections in effect context.

---

#### 4. needsCardSelection Pattern
**Problem:** Some effects pause for user input:
- SEARCH_AND_DRAW - show card selection modal
- SINGLE_MOVE / MULTI_MOVE - wait for lane/drone selection

**Solution:**
```javascript
// SearchAndDrawProcessor.js
process(effect, context) {
  if (context.actingPlayerId === context.localPlayerId) {
    // Human player - return needsCardSelection flag
    return {
      needsCardSelection: {
        type: 'search_and_draw',
        availableCards: [...],
        drawCount: effect.value
      }
    };
  } else {
    // AI player - auto-select best cards
    const selectedCards = this.selectBestCardsForAI(...);
    return this.complete(selectedCards, context);
  }
}
```

**Strategy:** Effect processors return needsCardSelection flag, ActionProcessor handles UI coordination.

---

### What Might Break During Extraction

#### HIGH RISK:
1. **Attack resolution changes** - Core combat system
   - **Symptom:** Damage calculation wrong, drones not destroyed, shields not consumed
   - **Test:** Run existing combat tests after extraction
   - **Mitigation:** Extract in isolated branch, comprehensive testing

2. **Interception mechanics** - Complex conditional logic
   - **Symptom:** Interceptors not triggering, AI not intercepting
   - **Test:** Specific interception test cases
   - **Mitigation:** Extract InterceptionProcessor separately from AttackProcessor

3. **Aura updates** - Global state changes after many actions
   - **Symptom:** Aura bonuses not applied, outdated stats
   - **Test:** Deploy drones with auras, check stats
   - **Mitigation:** Ensure updateAuras() called consistently in all processors

4. **Animation events** - Each effect must return proper animationEvents array
   - **Symptom:** Missing visual feedback, animations not playing
   - **Test:** Visual inspection of all card/ability plays
   - **Mitigation:** Standardize animationEvent structure in all processors

#### MODERATE RISK:
5. **Move effects** - onMove abilities trigger during movement
   - **Symptom:** Scout draw not triggering, movement abilities broken
   - **Test:** Move Scout drone, check card draw
   - **Mitigation:** Preserve applyOnMoveEffects() callback in movement processors

6. **State deep copies** - Each effect creates deep copy of playerStates
   - **Symptom:** State mutations leak between effects
   - **Test:** Play multiple cards in sequence, check state consistency
   - **Mitigation:** Standardize state copying pattern in base processor class

7. **Callback chains** - resolveAttackCallback used in nested effects
   - **Symptom:** Nested damage effects (overflow, splash) fail
   - **Test:** Play overflow damage card
   - **Mitigation:** Pass callbacks consistently through context

#### LOW RISK:
8. **Log entries** - Each effect calls logCallback
   - **Symptom:** Missing game log entries
   - **Test:** Check game log after actions
   - **Mitigation:** Standardize logging in base processor class

9. **needsCardSelection UI** - SEARCH_AND_DRAW, movement cards
   - **Symptom:** Card selection modal doesn't appear
   - **Test:** Play "Data Mine" (SEARCH_AND_DRAW card)
   - **Mitigation:** Test UI integration after extraction

---

## Section 7: Proposed Refined Structure

### Recommended File Structure

Based on actual effect types and targeting types found in codebase:

```
src/logic/
├── EffectRouter.js                    # Main effect orchestrator
├── TargetingRouter.js                 # Main targeting orchestrator
├── CombatRouter.js                    # Combat system orchestrator
│
├── effects/
│   ├── BaseEffectProcessor.js         # Abstract base class for all effects
│   │
│   ├── damage/                        # All damage-dealing effects
│   │   ├── DamageEffectProcessor.js   # DAMAGE, DAMAGE_SCALING
│   │   ├── SplashDamageProcessor.js   # SPLASH_DAMAGE
│   │   └── OverflowDamageProcessor.js # OVERFLOW_DAMAGE
│   │
│   ├── healing/                       # All healing effects
│   │   ├── HullHealProcessor.js       # HEAL_HULL
│   │   └── ShieldHealProcessor.js     # HEAL_SHIELDS
│   │
│   ├── cards/                         # Card-specific effects
│   │   ├── DrawEffectProcessor.js     # DRAW
│   │   └── SearchAndDrawProcessor.js  # SEARCH_AND_DRAW
│   │
│   ├── energy/                        # Resource effects
│   │   └── EnergyEffectProcessor.js   # GAIN_ENERGY
│   │
│   ├── state/                         # State change effects
│   │   ├── ReadyDroneProcessor.js     # READY_DRONE
│   │   └── DestroyProcessor.js        # DESTROY
│   │
│   ├── modification/                  # Stat/drone modification
│   │   ├── StatModifierProcessor.js   # MODIFY_STAT
│   │   ├── UpgradeProcessor.js        # MODIFY_DRONE_BASE
│   │   └── DestroyUpgradeProcessor.js # DESTROY_UPGRADE
│   │
│   ├── movement/                      # Movement effects
│   │   ├── SingleMoveProcessor.js     # SINGLE_MOVE
│   │   └── MultiMoveProcessor.js      # MULTI_MOVE
│   │
│   ├── tokens/                        # Token creation
│   │   └── TokenCreationProcessor.js  # CREATE_TOKENS
│   │
│   └── meta/                          # Meta-effects
│       └── RepeatingEffectProcessor.js # REPEATING_EFFECT
│
├── targeting/
│   ├── BaseTargetingProcessor.js      # Abstract base class
│   │
│   ├── drone/                         # Drone targeting
│   │   ├── DroneTargetingProcessor.js # DRONE, MULTI_DRONE
│   │   └── AllMarkedProcessor.js      # ALL_MARKED
│   │
│   ├── ship/                          # Ship targeting
│   │   └── ShipSectionTargetingProcessor.js # SHIP_SECTION
│   │
│   ├── lane/                          # Lane targeting
│   │   └── LaneTargetingProcessor.js  # LANE
│   │
│   └── cards/                         # Card/upgrade targeting
│       ├── DroneCardTargetingProcessor.js       # DRONE_CARD
│       └── AppliedUpgradeTargetingProcessor.js  # APPLIED_UPGRADE
│
├── combat/
│   ├── AttackProcessor.js             # Main attack resolution
│   ├── InterceptionProcessor.js       # Interception mechanics
│   └── AfterAttackProcessor.js        # After-attack effects (Lifelink, etc.)
│
└── utils/                             # Shared utilities
    ├── gameEngineUtils.js             # getLaneOfDrone, updateAuras, etc.
    ├── stateUtils.js                  # Deep copy, state merging
    ├── animationUtils.js              # Animation event builders
    └── validationUtils.js             # Common validation logic
```

### Effect Processor Classes

**Base Class Pattern:**
```javascript
// effects/BaseEffectProcessor.js
export class BaseEffectProcessor {
  constructor() {
    // Common initialization
  }

  process(effect, context) {
    throw new Error('Must implement process() in subclass');
  }

  // Helper: Deep copy player states
  copyStates(playerStates) {
    return {
      player1: JSON.parse(JSON.stringify(playerStates.player1)),
      player2: JSON.parse(JSON.stringify(playerStates.player2))
    };
  }

  // Helper: Standard result structure
  createResult(newStates, animations = [], additionalEffects = []) {
    return {
      newPlayerStates: newStates,
      animationEvents: animations,
      additionalEffects: additionalEffects
    };
  }

  // Helper: Log action
  log(context, message) {
    if (context.callbacks?.logCallback) {
      context.callbacks.logCallback(message);
    }
  }
}
```

**Example Processor:**
```javascript
// effects/cards/DrawEffectProcessor.js
import { BaseEffectProcessor } from '../BaseEffectProcessor.js';

export class DrawEffectProcessor extends BaseEffectProcessor {
  process(effect, context) {
    const { actingPlayerId, playerStates } = context;
    const newStates = this.copyStates(playerStates);
    const actingPlayerState = newStates[actingPlayerId];

    let { deck, hand, discardPile } = actingPlayerState;

    for (let i = 0; i < effect.value; i++) {
      // If deck empty, shuffle discard
      if (deck.length === 0 && discardPile.length > 0) {
        deck = [...discardPile].sort(() => 0.5 - Math.random());
        discardPile = [];
      }

      // Draw card
      if (deck.length > 0) {
        const drawnCard = deck.pop();
        hand.push(drawnCard);
      }
    }

    actingPlayerState.deck = deck;
    actingPlayerState.hand = hand;
    actingPlayerState.discardPile = discardPile;

    this.log(context, {
      player: actingPlayerState.name,
      actionType: 'EFFECT',
      source: context.card?.name || 'Effect',
      outcome: `Drew ${effect.value} card(s)`
    });

    return this.createResult(newStates);
  }
}
```

### Targeting Processor Classes

**Base Class Pattern:**
```javascript
// targeting/BaseTargetingProcessor.js
export class BaseTargetingProcessor {
  getValidTargets(targeting, context) {
    throw new Error('Must implement getValidTargets() in subclass');
  }

  // Helper: Check affinity match
  matchesAffinity(affinity, targetPlayerId, actingPlayerId) {
    if (affinity === 'ANY') return true;
    if (affinity === 'FRIENDLY') return targetPlayerId === actingPlayerId;
    if (affinity === 'ENEMY') return targetPlayerId !== actingPlayerId;
    return false;
  }

  // Helper: Apply custom criteria
  applyCustomCriteria(drone, custom = []) {
    if (custom.includes('EXHAUSTED') && !drone.isExhausted) return false;
    if (custom.includes('MARKED') && !drone.isMarked) return false;
    if (custom.includes('NOT_MARKED') && drone.isMarked) return false;
    if (custom.includes('DAMAGED_HULL')) {
      const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
      if (!baseDrone || drone.hull >= baseDrone.hull) return false;
    }
    return true;
  }
}
```

**Example Processor:**
```javascript
// targeting/drone/DroneTargetingProcessor.js
import { BaseTargetingProcessor } from '../BaseTargetingProcessor.js';
import { getLaneOfDrone } from '../../utils/gameEngineUtils.js';

export class DroneTargetingProcessor extends BaseTargetingProcessor {
  getValidTargets(targeting, context) {
    const { actingPlayerId, player1, player2, source } = context;
    const { affinity, location, custom } = targeting;

    const targets = [];
    const actingPlayerState = actingPlayerId === 'player1' ? player1 : player2;
    const opponentPlayerState = actingPlayerId === 'player1' ? player2 : player1;

    // Determine user lane (for SAME_LANE abilities)
    let userLane = null;
    if (source) {
      userLane = getLaneOfDrone(source.id, actingPlayerState);
    }

    // Process friendly drones
    if (affinity === 'FRIENDLY' || affinity === 'ANY') {
      this.processDrones(actingPlayerState, actingPlayerId, location, userLane, custom, targets);
    }

    // Process enemy drones
    if (affinity === 'ENEMY' || affinity === 'ANY') {
      const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';
      this.processDrones(opponentPlayerState, opponentId, location, userLane, custom, targets);
    }

    return targets;
  }

  processDrones(playerState, playerId, location, userLane, custom, targets) {
    for (const [lane, drones] of Object.entries(playerState.dronesOnBoard)) {
      // Check location criteria
      if (location === 'SAME_LANE' && lane !== userLane) continue;

      for (const drone of drones) {
        if (this.applyCustomCriteria(drone, custom)) {
          targets.push({ ...drone, lane, owner: playerId });
        }
      }
    }
  }
}
```

### Integration with ActionProcessor

**Modified ActionProcessor.js:**
```javascript
import { EffectRouter } from '../logic/EffectRouter.js';
import { TargetingRouter } from '../logic/TargetingRouter.js';
import { CombatRouter } from '../logic/CombatRouter.js';

class ActionProcessor {
  constructor(gameStateManager, phaseAnimationQueue = null) {
    // ... existing code ...

    // NEW: Initialize routers
    this.effectRouter = new EffectRouter();
    this.targetingRouter = new TargetingRouter();
    this.combatRouter = new CombatRouter();
  }

  async processCardPlay(payload) {
    // ... existing target resolution code ...

    // REPLACE gameEngine.resolveCardPlay() with:
    const effectContext = {
      effect: card.effect,
      card: card,
      target: target,
      actingPlayerId: playerId,
      playerStates: playerStates,
      placedSections: placedSections,
      callbacks: callbacks,
      localPlayerId: this.gameStateManager.getLocalPlayerId(),
      gameMode: currentState.gameMode
    };

    const result = this.effectRouter.resolveCardEffect(
      card.effect,
      effectContext
    );

    // ... existing animation and state update code ...
  }

  async processAttack(payload) {
    // ... existing interception code ...

    // REPLACE gameEngine.resolveAttack() with:
    const result = this.combatRouter.resolveCombat(
      finalAttackDetails,
      {
        playerStates: playerStates,
        placedSections: allPlacedSections,
        logCallback: (entry) => this.gameStateManager.addLogEntry(entry)
      }
    );

    // ... existing animation and state update code ...
  }

  // NEW: Expose targeting for UI
  getValidTargets(card, actingPlayerId, player1, player2) {
    return this.targetingRouter.getValidTargets(
      card.targeting,
      { actingPlayerId, player1, player2 }
    );
  }
}
```

---

## Section 8: Summary and Next Steps

### Key Findings

1. **ActionProcessor is already an orchestrator** - just needs routing layer added
2. **gameLogic.js is well-structured** - effect handlers already isolated
3. **Refactoring is HIGHLY FEASIBLE** - clear extraction path exists
4. **Risk is manageable** - incremental extraction with testing at each phase

### Recommended Next Steps

#### Immediate (Week 1):
1. **Create base classes** - BaseEffectProcessor, BaseTargetingProcessor
2. **Extract Phase 1 effects** - Draw, Energy, Ready Drone (proof of concept)
3. **Create EffectRouter** - Wire up 3 extracted processors
4. **Test integration** - Verify cards still work

#### Short-term (Weeks 2-4):
5. **Extract targeting system** - All targeting processors (Phase 2)
6. **Extract healing effects** - Hull and shield healing (Phase 3)
7. **Extract basic damage** - Damage and damage scaling (Phase 4 partial)

#### Medium-term (Weeks 5-8):
8. **Extract combat system** - Attack resolution, interception (Phase 5)
9. **Extract remaining effects** - Movement, tokens, etc. (Phases 6-8)
10. **Remove gameLogic.js** - Delete original monolithic file

#### Long-term (Post-refactoring):
11. **Performance optimization** - Profile effect processors
12. **Add effect tests** - Unit tests for each processor
13. **Documentation** - Document each effect type's behavior

### Success Criteria

✅ **Functional Parity** - All existing game mechanics work identically
✅ **No Performance Regression** - Game speed maintained or improved
✅ **Improved Maintainability** - Each effect type in dedicated 50-200 line file
✅ **Clear Architecture** - Routing system makes effect flow obvious
✅ **Testability** - Individual effects can be unit tested

### Final Recommendation

**PROCEED WITH REFACTORING** ✅

The architecture supports this refactoring excellently. ActionProcessor is already structured as an orchestrator - it just needs a routing layer to connect it to modular effect processors. The extraction can be done incrementally with minimal risk.

**Start with Phase 1 (Draw, Energy, Ready Drone) as a proof of concept.** This will validate the approach with low-risk effects before tackling the complex combat system.

---

**End of Analysis Document**
