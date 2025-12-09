# Processor Design Guide
## Architectural Patterns and Best Practices for Effect Processors

**Purpose:** Timeless architectural principles for creating modular effect processors
**Audience:** Any developer working on processor extraction or creating new processors
**Last Updated:** 2025-11-05

> **⚠️ CRITICAL:** Read this guide completely before creating any new processor. The patterns and pitfalls documented here will save hours of debugging.

---

## Table of Contents

1. [Understanding gameEngine](#understanding-gameengine)
2. [Architectural Patterns](#architectural-patterns)
3. [Common Pitfalls and Fixes](#common-pitfalls-and-fixes)
4. [Testing Checklists](#testing-checklists)
5. [Integration Patterns](#integration-patterns)

---

## Understanding gameEngine

### What is `gameEngine`?

**CRITICAL CONCEPT:** `gameEngine` is NOT a separate class or service. It's an exported object from `gameLogic.js` containing 60+ functions.

```javascript
// gameLogic.js (currently 2,674 lines, originally 5,207 lines)
export const gameEngine = {
  resolveCardPlay,      // Card effect resolution
  resolveAttack,        // EXTRACTED to AttackProcessor
  resolveDamageEffect,  // EXTRACTED to DamageEffectProcessor
  calculateTargets,     // EXTRACTED to TargetingRouter
  // ... 50+ more functions
};
```

**Why This Matters:**
- `gameEngine` is the monolithic code we're extracting FROM
- Effect processors replace gameEngine functions
- ActionProcessor currently delegates to gameEngine
- After refactoring: ActionProcessor → EffectRouter → Processors

**Refactoring Target:**
```
BEFORE (Current):
ActionProcessor → gameEngine.resolveCardPlay() → [5207 lines of monolithic code]

AFTER (Goal):
ActionProcessor → EffectRouter → DamageEffectProcessor (200 lines)
                              → HealEffectProcessor (100 lines)
                              → etc.
```

---

## Architectural Patterns

### 1. Animation Builder Pattern

**Principle:** Separate animation event generation from effect processing logic.

**File Structure:**
```
src/logic/effects/
├── <effect-category>/
│   ├── <EffectType>Processor.js        (Effect logic + state mutation)
│   └── animations/
│       ├── Default<Effect>Animation.js  (MANDATORY - fallback for all cards)
│       ├── <CardName>Animation.js       (OPTIONAL - card-specific overrides)
│       └── <EffectVariant>Animation.js  (OPTIONAL - effect-type variants)
```

**Example Structure:**
```
src/logic/effects/damage/
├── DamageEffectProcessor.js
└── animations/
    ├── DefaultDamageAnimation.js    ✅ MANDATORY
    ├── RailgunAnimation.js          ✅ Card-specific (Railgun Strike)
    ├── SplashAnimation.js           ✅ Effect-variant (SPLASH_DAMAGE)
    ├── OverflowAnimation.js         ✅ Effect-variant (OVERFLOW_DAMAGE)
    └── FilteredDamageAnimation.js   ✅ Scope-variant (FILTERED scope)
```

**Pattern Implementation:**

```javascript
// DamageEffectProcessor.js
import { buildDefaultDamageAnimation } from './animations/DefaultDamageAnimation.js';
import { buildRailgunAnimation } from './animations/RailgunAnimation.js';

class DamageEffectProcessor extends BaseEffectProcessor {
  process(effect, context) {
    // ... damage logic ...

    const visualType = context.card?.visualEffect?.type;

    // Route to card-specific animation if available
    if (visualType === 'RAILGUN_ANIMATION') {
      animationEvents.push(...buildRailgunAnimation({
        target, card, damage, targetPlayer, targetLane
      }));
    } else {
      // Fallback to default animation
      animationEvents.push(...buildDefaultDamageAnimation({
        target, damage, targetPlayer, targetLane
      }));
    }

    return this.createResult(newPlayerStates, animationEvents);
  }
}
```

**Builder Function Signature:**
```javascript
/**
 * Animation builder - returns array of animation events
 * @param {Object} context - Animation context
 * @returns {Array<Object>} Array of animation event objects
 */
export function buildDamageAnimation(context) {
  const { target, card, damage, targetPlayer, targetLane } = context;

  return [
    {
      type: 'DAMAGE',
      targetId: target.id,
      targetPlayer,
      targetLane,
      amount: damage,
      timestamp: Date.now()
    }
  ];
}
```

**Why This Pattern:**
- ✅ Clean separation: Effect logic in processor, visuals in builders
- ✅ Extensibility: Easy to add card-specific animations without modifying processor
- ✅ Consistency: Default animation ensures all effects have visuals
- ✅ Testability: Animation generation can be tested independently

---

### 2. Deep Cloning Pattern

**Principle:** ALWAYS clone playerStates immediately in process() method to ensure immutability.

**Implementation:**

```javascript
class MyEffectProcessor extends BaseEffectProcessor {
  process(effect, context) {
    // ✅ CORRECT: Clone immediately, first thing in method
    const newPlayerStates = this.clonePlayerStates(context.playerStates);

    // Now mutate the clone safely
    newPlayerStates.player1.energy += 5;

    return this.createResult(newPlayerStates);
  }
}
```

**DON'T DO THIS:**
```javascript
class MyEffectProcessor extends BaseEffectProcessor {
  process(effect, context) {
    // ❌ WRONG: Mutating original state
    context.playerStates.player1.energy += 5;

    return this.createResult(context.playerStates);  // BAD!
  }
}
```

**Why This Matters:**
- Immutability ensures rollback safety
- Prevents accidental state corruption
- Required for optimistic updates in multiplayer
- Makes debugging easier (can compare before/after)

**BaseEffectProcessor Helper:**
```javascript
// Available in all processors
this.clonePlayerStates(playerStates) // Returns deep clone
```

---

### 3. Effect Context Structure

**Principle:** Standardized context object for all effect processors.

**Standard Context Object:**
```javascript
const context = {
  // Required Properties:
  actingPlayerId: 'player1',           // Player performing action
  playerStates: { player1: {...}, player2: {...} },
  target: { id: 'drone-123', owner: 'player2' },

  // Optional Properties:
  card: { name: 'Laser Blast', instanceId: 'card-456' },
  placedSections: { player1: [...], player2: [...] },
  callbacks: { /* legacy */ },
  localPlayerId: 'player1',
  gameMode: 'local'
};
```

**Accessing Context:**
```javascript
class MyEffectProcessor extends BaseEffectProcessor {
  process(effect, context) {
    const { actingPlayerId, playerStates, target, card } = context;
    const newPlayerStates = this.clonePlayerStates(playerStates);

    const actingPlayer = newPlayerStates[actingPlayerId];
    const opponentId = actingPlayerId === 'player1' ? 'player2' : 'player1';

    // ... effect logic ...
  }
}
```

---

### 4. Pattern A Animation Integration

**Principle:** Position calculation happens in useAnimationSetup hook, components receive pre-calculated data.

**Architecture:**
```
Effect Processor → Animation Builder → Animation Event → useAnimationSetup → Component
(creates event)    (with IDs only)     (stored in state)   (calculates pos)  (renders)
```

**Animation Event Structure:**
```javascript
// Processor creates events with IDs and context
{
  type: 'RAILGUN_BEAM',
  sourcePlayer: 'player1',    // ✅ Source context for origin calculation
  sourceLane: 'lane2',
  targetId: 'drone-123',      // ✅ Target context for destination
  targetPlayer: 'player2',
  targetLane: 'lane3',
  onComplete: null
}
```

**useAnimationSetup Calculates Positions:**
```javascript
// useAnimationSetup.js
const handleRailgunBeam = (payload) => {
  // Query DOM for actual positions
  const sourceEl = document.querySelector(`[data-section="${payload.sourceLane}"]`);
  const targetEl = document.querySelector(`[data-drone="${payload.targetId}"]`);

  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  // Pass calculated positions to component
  setBeamEffects(prev => [...prev, {
    id: generateId(),
    startPos: { x: sourceRect.left, y: sourceRect.top },
    endPos: { x: targetRect.left, y: targetRect.top },
    onComplete
  }]);
};
```

**Component Renders:**
```javascript
const BeamEffect = ({ startPos, endPos, onComplete }) => {
  // Pure rendering with pre-calculated positions
  return <div style={{
    left: startPos.x,
    top: startPos.y,
    transform: `rotate(${angle}deg)`
  }} />;
};
```

**Why Pattern A:**
- ✅ Clean separation: Processors create events, hooks calculate positions
- ✅ No refs in components: Components are pure, testable
- ✅ Consistent API: All animations follow same pattern
- ✅ React best practices: Refs stay in hooks, not props

---

### 5. Mandatory Cleanup Pattern

**Principle:** DELETE old functions from gameLogic.js immediately after extraction.

**Why This Is MANDATORY:**
- ❌ Code duplication leads to confusion about which code is "real"
- ❌ Tests may hit old code instead of new processors
- ❌ Bug fixes applied to wrong version
- ❌ Architectural violations (direct calls bypassing routers)

**Extraction Workflow:**
```
1. Create new processor (e.g., DamageEffectProcessor.js)
2. Register in EffectRouter
3. Test processor works correctly
4. ✅ DELETE resolveDamageEffect() from gameLogic.js
5. ✅ DELETE from gameEngine export object
6. Verify no imports reference old function
7. Commit changes
```

**Verification Checklist:**
- [ ] Old function deleted from gameLogic.js file
- [ ] Old function removed from gameEngine export
- [ ] No imports of old function remain (grep codebase)
- [ ] Build succeeds with no errors
- [ ] Tests pass with new processor

---

### 6. Effect Result Structure

**Principle:** All processors return standardized result object.

**Standard Result:**
```javascript
return {
  newPlayerStates: { player1: {...}, player2: {...} },  // Required
  animationEvents: [...],                                // Optional
  additionalEffects: [...]                               // Optional
};
```

**Helper Method:**
```javascript
// BaseEffectProcessor provides createResult() helper
return this.createResult(newPlayerStates, animationEvents);

// Auto-detects whether you're passing animations or additional effects
// Properly populates both properties
```

**Why Standardized:**
- ✅ EffectRouter expects consistent interface
- ✅ Easy to chain effects
- ✅ Animation system knows where to find events
- ✅ Type safety (when we add TypeScript)

---

### 7. Dependency Management Pattern

**Principle:** Extract utilities BEFORE extracting processors that need them.

**Dependency Layers:**
```
Layer 4 (Top): Effect Processors
                ↓ (imports from)
Layer 3:       Combat Systems (AttackProcessor, InterceptionProcessor)
                ↓ (imports from)
Layer 2:       Utilities (gameEngineUtils.js, statsCalculator.js)
                ↓ (imports from)
Layer 1:       Pure Functions (no imports, only logic)
```

**Example: DamageEffectProcessor Dependencies:**
```javascript
// Layer 4: Effect Processor
import BaseEffectProcessor from '../BaseEffectProcessor.js';  // Same layer

// Layer 3: Combat System (sibling)
import { resolveAttack } from '../../combat/AttackProcessor.js';

// Layer 2: Utilities
import { getLaneOfDrone } from '../../utils/gameEngineUtils.js';
import { calculateEffectiveStats } from '../../utils/statsCalculator.js';

// Layer 1: Data
import { LANE_IDS } from '../../../constants/gameConstants.js';
```

**Extraction Order Matters:**
```
✅ CORRECT:
1. Extract gameEngineUtils (Layer 2)
2. Extract AttackProcessor (Layer 3)
3. Extract DamageEffectProcessor (Layer 4) - can import from 2 and 3

❌ WRONG:
1. Extract DamageEffectProcessor first
2. DamageEffectProcessor needs AttackProcessor (doesn't exist yet!)
3. Error: Cannot find module 'AttackProcessor'
```

---

## Common Pitfalls and Fixes

### Pitfall 8.1: Parameter Naming Mismatches in createResult()

**Problem:** BaseEffectProcessor.createResult() parameter mismatch
- **File:** `src/logic/effects/BaseEffectProcessor.js`
- **Issue:** Method expected parameter named `additionalEffects` but processors passed `animationEvents`
- **Impact:** Animation events stored in wrong property, causing visual effects to fail silently

**Symptom:**
- Animation events appear in processor debug logs
- Events fail to trigger in useAnimationSetup
- `result.animationEvents` is undefined in resolveCardPlay
- No error messages - silent failure

**Broken Code:**
```javascript
// BaseEffectProcessor.js - WRONG
createResult(newPlayerStates, additionalEffects = []) {
    return {
        newPlayerStates,
        additionalEffects  // ❌ animations stored here!
    };
}

// DamageEffectProcessor.js
return this.createResult(newPlayerStates, animationEvents);  // Goes to wrong property
```

**Fixed Code:**
```javascript
// BaseEffectProcessor.js - CORRECT (auto-detecting)
createResult(newPlayerStates, animationEventsOrAdditionalEffects = [], additionalEffects = []) {
    // Auto-detect: animation events have 'type' property
    const isAnimations = animationEventsOrAdditionalEffects.length > 0 &&
                         animationEventsOrAdditionalEffects[0]?.type;

    return {
        newPlayerStates,
        animationEvents: isAnimations ? animationEventsOrAdditionalEffects : [],
        additionalEffects: isAnimations ? additionalEffects : animationEventsOrAdditionalEffects
    };
}
```

**Prevention:**
- ✅ Test animations visually after creating processor
- ✅ Add debug logging to verify events reach AnimationManager
- ✅ Check resolveCardPlay to see what properties it expects

---

### Pitfall 8.2: Missing Source Context in Animation Builders

**Problem:** Animation events missing required positional data
- **Issue:** RAILGUN_TURRET and RAILGUN_BEAM lacked `sourcePlayer`/`sourceLane`
- **Impact:** useAnimationSetup couldn't calculate positions, causing "Cannot read properties of undefined (reading 'replace')" errors

**Symptom:**
- Runtime error when animation handler tries to parse `sourceLane.replace('lane', '')`
- Handler receives `sourcePlayer: undefined, sourceLane: undefined`
- Beams and projectiles don't know where to start from

**Broken Code:**
```javascript
// RailgunAnimation.js - WRONG
export function buildRailgunAnimation(context) {
    return [{
        type: 'RAILGUN_TURRET',
        targetId: target.id,
        targetPlayer,
        targetLane,
        // ❌ Missing sourcePlayer and sourceLane
    }];
}
```

**Fixed Code:**
```javascript
// RailgunAnimation.js - CORRECT
export function buildRailgunAnimation(context) {
    const {
        target, card,
        sourcePlayer,    // ✅ Required for turret placement
        sourceLane,      // ✅ Required for beam origin
        targetPlayer,
        targetLane
    } = context;

    return [{
        type: 'RAILGUN_TURRET',
        targetId: target.id,
        sourcePlayer,      // ✅ For turret position
        sourceLane,
        targetPlayer,
        targetLane
    }];
}

// DamageEffectProcessor.js - Pass source context
animationEvents.push(...buildRailgunAnimation({
    target,
    card,
    sourcePlayer: actingPlayerId,     // ✅ Who played the card
    sourceLane: targetLane,           // ✅ Turret fires from defended lane
    targetPlayer: opponentId,
    targetLane
}));
```

**Prevention:**
- ✅ ALL animations with visual travel need BOTH source AND target context
- ✅ Check useAnimationSetup handler before creating builder
- ✅ Source context: `sourcePlayer`, `sourceLane` (+ `sourceId` for entities)
- ✅ Target context: `targetPlayer`, `targetLane`, `targetId`
- ✅ For card attacks, source is the player, not a specific entity

---

### Pitfall 8.3: Layering Violations - Calling Wrong Abstraction Level

**Problem:** Effect processors calling ActionProcessor (orchestrator) instead of sibling systems
- **File:** `src/logic/effects/damage/DamageEffectProcessor.js`
- **Issue:** Processor called `ActionProcessor.processAttack()` via callback
- **Impact:** Circular dependency risk, architectural boundaries violated

**Architecture Violation:**
```
❌ WRONG FLOW (Circular):
ActionProcessor → EffectRouter → DamageEffectProcessor → ActionProcessor
(Processor calls back to orchestrator)

✅ CORRECT FLOW (Layered):
ActionProcessor → EffectRouter → DamageEffectProcessor → AttackProcessor
(Processor calls sibling at same layer)
```

**Broken Code:**
```javascript
// DamageEffectProcessor.js - WRONG
class DamageEffectProcessor extends BaseEffectProcessor {
    async process(effect, context) {  // ❌ Made async
        // ❌ Calling orchestrator through callback
        const result = await context.callbacks.resolveAttack({
            attackDetails: attackDetails
        });
    }
}
```

**Fixed Code:**
```javascript
// DamageEffectProcessor.js - CORRECT
import { resolveAttack } from '../../combat/AttackProcessor.js';

class DamageEffectProcessor extends BaseEffectProcessor {
    process(effect, context) {  // ✅ Synchronous
        // ✅ Direct call to sibling system
        const attackResult = resolveAttack(
            attackDetails,
            context.playerStates,
            context.placedSections
        );
    }
}
```

**Layer Architecture:**
```
ORCHESTRATION LAYER (Top):
├── ActionProcessor         (Routes player actions)
├── GameFlowManager
└── SequentialPhaseManager

ROUTING LAYER (Middle):
├── EffectRouter           (Routes to processors)
└── TargetingRouter

PROCESSOR LAYER (Bottom - Siblings):
├── Effect Processors      ← YOU ARE HERE
├── AttackProcessor        ← CALL THIS
└── InterceptionProcessor  ← NOT ActionProcessor

UTILITY LAYER:
├── gameEngineUtils.js
├── statsCalculator.js
└── animationBuilders
```

**Prevention:**
- ✅ Effect processors NEVER call ActionProcessor
- ✅ Use sibling systems (AttackProcessor, InterceptionProcessor)
- ✅ Ask: "Can this processor call that system without creating a cycle?"
- ✅ Avoid callbacks through context - use direct imports

---

### Pitfall 8.4: Calling Non-Existent Router Methods

**Problem:** Processor calling gameEngine methods that were deleted during refactoring
- **File:** `src/logic/effects/meta/RepeatingEffectProcessor.js`
- **Issue:** Called `gameEngine.resolveSingleEffect()` which was removed
- **Impact:** Runtime error when repeating effects executed

**Symptom:**
- TypeError: "gameEngine.resolveSingleEffect is not a function"
- Occurs AFTER effect extraction completed
- Meta-effects (processors that process other effects) break

**Broken Code:**
```javascript
// RepeatingEffectProcessor.js - WRONG
import { gameEngine } from '../../gameLogic.js';

class RepeatingEffectProcessor extends BaseEffectProcessor {
    process(effect, context) {
        for (const subEffect of effects) {
            // ❌ Calling deleted OLD function
            const result = gameEngine.resolveSingleEffect(
                subEffect, context.target, context.actingPlayerId, ...
            );
        }
    }
}
```

**Fixed Code:**
```javascript
// RepeatingEffectProcessor.js - CORRECT
import EffectRouter from '../../EffectRouter.js';

class RepeatingEffectProcessor extends BaseEffectProcessor {
    process(effect, context) {
        let currentStates = this.clonePlayerStates(context.playerStates);
        const allAnimations = [];

        for (const subEffect of effects) {
            const subContext = { ...context, playerStates: currentStates };

            // ✅ Use EffectRouter (new architecture)
            const effectRouter = new EffectRouter();
            const result = effectRouter.routeEffect(subEffect, subContext);

            // Handle effects not yet extracted
            if (result === null) {
                console.warn(`Sub-effect ${subEffect.type} not yet extracted`);
                continue;
            }

            currentStates = result.newPlayerStates;
            allAnimations.push(...(result.animationEvents || []));
        }

        return {
            newPlayerStates: currentStates,
            animationEvents: allAnimations
        };
    }
}
```

**Prevention:**
- ✅ Meta-effects MUST use EffectRouter, not gameEngine
- ✅ NEVER call `gameEngine.resolve*()` - those are being deleted
- ✅ Use `EffectRouter.routeEffect()` for sub-effects
- ✅ Handle `null` return (indicates effect not yet extracted)

---

### Pitfall 8.5: Const Reassignment in Animation Arrays

**Problem:** Using `=` assignment instead of `.push()` mutation
- **Issue:** Code does `animationEvents = builder()` but `animationEvents` is const
- **Impact:** "Assignment to constant variable" error

**Broken Code:**
```javascript
const animationEvents = [];

// ❌ WRONG: Reassignment
animationEvents = buildRailgunAnimation({...});  // Error!
```

**Fixed Code:**
```javascript
const animationEvents = [];

// ✅ CORRECT: Mutation with spread
animationEvents.push(...buildRailgunAnimation({...}));
```

**Prevention:**
- ✅ Use `.push(...array)` not `array = newValue`
- ✅ JavaScript `const` allows mutation, not reassignment
- ✅ Spread operator `...` unpacks array elements

---

## Testing Checklists

### After Creating New Processor

**1. Architecture Check:**
- [ ] Processor doesn't import ActionProcessor
- [ ] Uses sibling systems (AttackProcessor, etc.) directly
- [ ] No callbacks through context object
- [ ] No async/await unless truly necessary

**2. Routing Check (if meta-processor):**
- [ ] Uses EffectRouter for sub-effects
- [ ] Handles null returns gracefully
- [ ] Accumulates state across iterations
- [ ] Properly clones playerStates

**3. Source Context Check (if projectile/beam):**
- [ ] Animation events have sourcePlayer
- [ ] Animation events have sourceLane
- [ ] Source context passed from processor
- [ ] useAnimationSetup handler can parse source

**4. Build Check:**
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors (if applicable)
- [ ] No ESLint warnings
- [ ] File sizes reasonable

**5. Cleanup Check:**
- [ ] Old function deleted from gameLogic.js
- [ ] Old function removed from gameEngine export
- [ ] No imports of old function remain
- [ ] Tests updated to use new processor

---

## Integration Patterns

### Registering a New Processor

**EffectRouter.js:**
```javascript
import DamageEffectProcessor from './effects/damage/DamageEffectProcessor.js';

class EffectRouter {
  constructor() {
    this.processors = new Map();

    // Register processor for effect type(s)
    this.registerProcessor('DAMAGE', new DamageEffectProcessor());
    this.registerProcessor('DAMAGE_SCALING', new DamageEffectProcessor());
    this.registerProcessor('SPLASH_DAMAGE', new DamageEffectProcessor());
    this.registerProcessor('OVERFLOW_DAMAGE', new DamageEffectProcessor());
  }
}
```

### Effect Router Fallback Pattern

**gameLogic.js Integration:**
```javascript
// Try modular processor first
const effectRouter = new EffectRouter();
const result = effectRouter.routeEffect(effect, context);

// Fallback to monolithic if not yet extracted
if (result === null) {
  debugLog('EFFECT_FALLBACK', `Effect ${effect.type} not yet extracted, using monolith`);
  return oldMonolithicFunction(effect, context);
}

return result;
```

---

## Quick Reference

### Common Error Messages

| Error Message | Pitfall | Quick Fix |
|--------------|---------|-----------|
| "Cannot read properties of undefined (reading 'replace')" | 8.2 | Add sourcePlayer/sourceLane to animation event |
| "gameEngine.resolveSingleEffect is not a function" | 8.4 | Replace with EffectRouter.routeEffect() |
| "Assignment to constant variable" | 8.5 | Use .push(...array) instead of array = |
| Animations don't play (no error) | 8.1 | Check createResult() parameter names |
| Circular dependency warning | 8.3 | Remove ActionProcessor import |

### Essential Patterns Checklist

- [ ] Animation builder in `/animations/` subdirectory
- [ ] Clone playerStates immediately in process()
- [ ] Standardized effect context object
- [ ] createResult() for consistent return value
- [ ] Delete old functions after extraction
- [ ] Source + target context for projectile animations
- [ ] Direct imports of sibling systems (not ActionProcessor)
- [ ] Use EffectRouter for meta-effects

---

## Summary

**Remember:**
1. **Always clone** playerStates first thing
2. **Animation builders** must return events, not positions
3. **Source context** required for projectile/beam animations
4. **Never call** ActionProcessor from processors (use siblings)
5. **Use EffectRouter** for meta-effects (not gameEngine)
6. **Delete old code** immediately after extraction
7. **Test visually** after creating processor

Follow these patterns and you'll create clean, maintainable processors that integrate seamlessly with the existing architecture!
