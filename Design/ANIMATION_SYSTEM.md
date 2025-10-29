# Animation System Implementation Plan

## Overview
Implement a centralized animation system that controls visual effects during game actions, ensuring proper timing, blocking user input during animations, and maintaining multiplayer compatibility.

---

## Requirements

### Core Requirements
1. **Timing Control**: Animations must complete BEFORE state updates are applied to the DOM
2. **User Blocking**: Players cannot interact with the board while animations are playing
3. **Multiplayer Compatible**: System works for both single-player and multiplayer modes
4. **Separation of Concerns**: Animation logic separated from ActionProcessor
5. **Extensibility**: Easy to add new animations for cards, drones, and abilities
6. **Data-Driven**: Animation references stored in card/drone data files

### Technical Requirements
1. ActionProcessor controls execution flow and timing gates
2. AnimationManager handles animation lifecycle and coordination
3. Animations signal completion before action proceeds
4. Transparent blocking overlay prevents all user interaction during animations
5. Standard actions (attack, move, intercept) have built-in animations
6. Card/drone-specific animations referenced by name in their data files

---

## Architecture Design

### Component Responsibilities

#### **AnimationManager.js** (NEW)
- Stores all animation definitions (standard + card-specific)
- Executes animations and manages timing
- Provides blocking state for UI
- Registers visual handlers from App.jsx
- Maps animation names to implementation details

#### **ActionProcessor.js**
- Controls action execution flow
- Calls AnimationManager at appropriate timing gates
- Waits for animation completion before state updates
- Minimal animation logic (just timing control)

#### **gameLogic.js**
- Returns animation names in effect results
- No animation implementation details
- Standard actions return standard animation names
- Card/ability effects return animation names from data

#### **cardData.js / droneData.js**
- Cards and drones have optional `animationName` attribute
- References animation definitions in AnimationManager
- No animation implementation details

#### **App.jsx**
- Registers visual implementation handlers with AnimationManager
- Renders blocking overlay when animations in progress
- Provides React-specific animation components

---

## Data Flow

```
1. User Action (e.g., plays Lightning Bolt card)
   ↓
2. ActionProcessor.processCardPlay(...)
   ↓
3. gameLogic.resolveCardPlay(card, ...)
   - Returns: { afterCardEffects: [{ animationName: "LIGHTNING_STRIKE", payload: {...} }] }
   ↓
4. ActionProcessor calls AnimationManager.executeAnimations(effects)
   - Sets blocking state (UI freezes)
   - Looks up "LIGHTNING_STRIKE" definition
   - Calls registered visual handler
   - Waits for animation duration
   - Clears blocking state
   ↓
5. ActionProcessor applies state updates (AFTER animation completes)
   ↓
6. UI updates with new game state
```

---

## Implementation Plan

### Phase 1: Create AnimationManager

**File**: `src/state/AnimationManager.js`

**Structure**:
```javascript
class AnimationManager {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.isBlocking = false;
    this.visualHandlers = new Map();

    // Define all animations
    this.animations = {
      // Standard action animations
      EXPLOSION: { duration: 1000, type: 'EXPLOSION' },
      MOVE_SLIDE: { duration: 300, type: 'MOVE_SLIDE' },
      INTERCEPT_FLASH: { duration: 500, type: 'INTERCEPT_FLASH' },

      // Card-specific animations
      LIGHTNING_STRIKE: { duration: 1200, type: 'LIGHTNING_EFFECT' },
      HEAL_PULSE: { duration: 800, type: 'HEAL_EFFECT' },
      SHIELD_BURST: { duration: 600, type: 'SHIELD_EFFECT' },
      FIRE_BLAST: { duration: 1000, type: 'FIRE_EFFECT' },
      // Add more as needed
    };
  }

  registerVisualHandler(type, handler) {
    this.visualHandlers.set(type, handler);
  }

  async executeAnimations(effects) {
    if (!effects || effects.length === 0) return;

    this.setBlocking(true);

    try {
      const promises = effects.map(effect => {
        const animDef = this.animations[effect.animationName];
        if (!animDef) {
          console.warn(`Unknown animation: ${effect.animationName}`);
          return Promise.resolve();
        }

        const handler = this.visualHandlers.get(animDef.type);
        if (!handler) {
          console.warn(`No visual handler for: ${animDef.type}`);
          return Promise.resolve();
        }

        return new Promise(resolve => {
          handler(effect.payload);
          setTimeout(resolve, animDef.duration);
        });
      });

      await Promise.all(promises);
    } finally {
      this.setBlocking(false);
    }
  }

  setBlocking(blocking) {
    this.isBlocking = blocking;
    this.gameStateManager.emit('animationStateChange', { blocking });
  }
}

export default AnimationManager;
```

### Phase 2: Update ActionProcessor

**Changes to `src/state/ActionProcessor.js`**:

1. **Add initialization method**:
```javascript
initialize(gameStateManager, animationManager) {
  this.gameStateManager = gameStateManager;
  this.animationManager = animationManager;
}
```

2. **Update processAttack**:
```javascript
async processAttack(payload) {
  const { attackDetails } = payload;

  // Execute game logic
  const result = gameEngine.resolveAttack(
    attackDetails,
    { player1: currentState.player1, player2: currentState.player2 },
    allPlacedSections,
    logCallback,
    () => {}, // Empty explosion callback
    () => {}  // Empty hit animation callback
  );

  // WAIT FOR ANIMATIONS (before state updates)
  if (this.animationManager && result.afterAttackEffects) {
    await this.animationManager.executeAnimations(result.afterAttackEffects);
  }

  // Update state AFTER animations complete
  this.gameStateManager.setPlayerStates(
    result.newPlayerStates.player1,
    result.newPlayerStates.player2
  );

  // Handle turn transition
  if (result.attackResult && result.attackResult.shouldEndTurn) {
    await this.processTurnTransition({
      newPlayer: attackDetails.attackingPlayer === 'player1' ? 'player2' : 'player1'
    });
  }

  return result;
}
```

3. **Update processCardPlay** (similar pattern):
```javascript
async processCardPlay(payload) {
  const result = gameEngine.resolveCardPlay(...);

  // Wait for animations
  if (this.animationManager && result.afterCardEffects) {
    await this.animationManager.executeAnimations(result.afterCardEffects);
  }

  // Update state
  this.gameStateManager.updatePlayerState(playerId, result.newPlayerState);

  return result;
}
```

4. **Update processAbility** (similar pattern):
```javascript
async processAbility(payload) {
  const result = gameEngine.resolveAbility(...);

  // Wait for animations
  if (this.animationManager && result.afterAbilityEffects) {
    await this.animationManager.executeAnimations(result.afterAbilityEffects);
  }

  // Update state
  this.gameStateManager.setPlayerStates(...);

  return result;
}
```

5. **Update processMove** (add animation support):
```javascript
async processMove(payload) {
  // Move logic...

  // Optional: Add move animation
  if (this.animationManager) {
    await this.animationManager.executeAnimations([
      { animationName: 'MOVE_SLIDE', payload: { droneId, fromLane, toLane } }
    ]);
  }

  // Update state
  this.gameStateManager.updatePlayerState(playerId, {
    dronesOnBoard: newDronesOnBoard
  });

  // Log and turn transition...
}
```

### Phase 3: Update gameLogic.js

**Modify return structures to include animation names**:

1. **resolveAttack** (already returns afterAttackEffects):
```javascript
// Ensure explosion effects include animationName
afterAttackEffects.push({
  animationName: 'EXPLOSION',
  payload: { targetId: finalTarget.id }
});
```

2. **resolveCardPlay**:
```javascript
resolveCardPlay(card, ...) {
  // Game logic...

  return {
    newPlayerState: updatedPlayerState,
    afterCardEffects: card.animationName ? [
      {
        animationName: card.animationName,
        payload: { targets: affectedTargets }
      }
    ] : []
  };
}
```

3. **resolveAbility**:
```javascript
resolveAbility(ability, ...) {
  // Game logic...

  return {
    newPlayerStates: { player1: newP1, player2: newP2 },
    afterAbilityEffects: ability.animationName ? [
      {
        animationName: ability.animationName,
        payload: { targetId: target.id }
      }
    ] : []
  };
}
```

### Phase 4: Update Data Files

**Add animationName to cards** (`src/data/cardData.js`):
```javascript
{
  name: "Lightning Bolt",
  cost: 3,
  effect: { type: "DAMAGE", properties: { damage: 5 } },
  animationName: "LIGHTNING_STRIKE" // NEW
}

{
  name: "Healing Wave",
  cost: 2,
  effect: { type: "HEAL", properties: { amount: 3 } },
  animationName: "HEAL_PULSE" // NEW
}
```

**Add animationName to drone abilities** (`src/data/droneData.js`):
```javascript
{
  name: "Explosive Drone",
  abilities: [{
    name: "Self Destruct",
    effect: { type: "DAMAGE_AOE", properties: { damage: 3 } },
    animationName: "EXPLOSION" // NEW
  }]
}
```

### Phase 5: Update App.jsx

**Changes to `src/App.jsx`**:

1. **Import AnimationManager**:
```javascript
import AnimationManager from './state/AnimationManager.js';
```

2. **Add blocking state**:
```javascript
const [animationBlocking, setAnimationBlocking] = useState(false);
```

3. **Initialize AnimationManager and register handlers**:
```javascript
useEffect(() => {
  // Create AnimationManager
  const animationManager = new AnimationManager(gameStateManager);

  // Register visual handlers
  animationManager.registerVisualHandler('EXPLOSION', (payload) => {
    triggerExplosion(payload.targetId);
  });

  animationManager.registerVisualHandler('MOVE_SLIDE', (payload) => {
    // Implement move animation (optional)
    console.log('Move animation:', payload);
  });

  animationManager.registerVisualHandler('INTERCEPT_FLASH', (payload) => {
    // Implement intercept animation (optional)
    console.log('Intercept animation:', payload);
  });

  animationManager.registerVisualHandler('LIGHTNING_EFFECT', (payload) => {
    // Implement lightning animation
    playLightningEffect(payload.targets);
  });

  animationManager.registerVisualHandler('HEAL_EFFECT', (payload) => {
    // Implement heal animation
    showHealAnimation(payload.targetId, payload.amount);
  });

  // Add more handlers as needed...

  // Pass to ActionProcessor
  actionProcessor.initialize(gameStateManager, animationManager);

  // Subscribe to blocking state changes
  const unsubscribe = gameStateManager.subscribe((event) => {
    if (event.type === 'animationStateChange') {
      setAnimationBlocking(event.data.blocking);
    }
  });

  return unsubscribe;
}, []);
```

4. **Remove old explosion handling code**:
   - Remove position capture logic in resolveAttack (lines 579-585)
   - Remove afterAttackEffects handling after processAction (lines 605-618)
   - Keep triggerExplosion function but it will be called by AnimationManager

5. **Add blocking overlay to render**:
```jsx
{/* Animation blocking overlay */}
{animationBlocking && (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      cursor: 'not-allowed',
      pointerEvents: 'all',
      backgroundColor: 'transparent'
    }}
  />
)}
```

### Phase 6: Testing Checklist

- [ ] Attack actions trigger explosion animation before drone removal
- [ ] Explosions visible on screen (not cut off)
- [ ] UI blocks during animations (cannot click anything)
- [ ] State updates happen after animations complete
- [ ] Turn transitions wait for animations
- [ ] Single-player mode works correctly
- [ ] Multiplayer mode works correctly (both clients)
- [ ] AI actions trigger animations
- [ ] Card-specific animations work
- [ ] Ability-specific animations work
- [ ] Move animations work (if implemented)
- [ ] Multiple simultaneous animations work (Promise.all)

---

## Future Extensions

### Additional Animation Types
- Damage numbers floating above targets
- Buff/debuff visual indicators
- Shield activation effects
- Energy transfer effects
- Card draw animations
- Deployment animations

### Animation Customization
- Animation speed settings
- Toggle animations on/off
- Reduced animation mode for faster gameplay

### Advanced Features
- Animation queuing for complex card effects
- Chained animations (one after another)
- Conditional animations based on game state
- Camera shake/zoom effects for dramatic moments

---

## Implementation Notes

### Multiplayer Considerations
- Each client runs its own AnimationManager
- Blocking happens independently on each client
- State synchronization occurs after both clients complete animations
- Network latency handled by action queuing system

### Performance Considerations
- Promise.all for parallel animations (better performance)
- setTimeout used for timing (simple, reliable)
- Blocking overlay prevents rapid action spam
- Animation durations should match visual component durations

### Debugging
- Console warnings for missing animation definitions
- Console warnings for unregistered visual handlers
- Log animation start/stop for troubleshooting
- Animation blocking state visible in GameStateManager events

---

## Migration Path

1. ✅ Create AnimationManager.js
2. ✅ Update ActionProcessor with minimal changes
3. ✅ Update gameLogic to return animation names
4. ✅ Update App.jsx to use AnimationManager
5. ✅ Test with existing explosion animations
6. ⏳ Add animation names to card/drone data incrementally
7. ⏳ Implement additional visual handlers as needed
8. ⏳ Remove old animation code once migration complete

---

## Files to Create/Modify

### New Files
- `src/state/AnimationManager.js` (NEW)

### Modified Files
- `src/state/ActionProcessor.js` (minimal changes)
- `src/logic/gameLogic.js` (return animation names)
- `src/App.jsx` (register handlers, blocking overlay)
- `src/data/cardData.js` (add animationName attribute)
- `src/data/droneData.js` (add animationName to abilities)

### Files to Review
- `src/hooks/useExplosions.js` (may need updates)
- `src/components/ui/ExplosionEffect.jsx` (verify compatible)

---

## Decision Log

### Decision 1: Separate AnimationManager from ActionProcessor
**Reason**: Keep ActionProcessor focused on action flow, prevent bloat with animation logic

### Decision 2: Data-driven animation references
**Reason**: Animation names in card/drone data make it clear what animates, centralized definitions in AnimationManager

### Decision 3: Animations before state updates
**Reason**: Ensures DOM elements exist during animation, no position capture needed

### Decision 4: Blocking overlay during animations
**Reason**: Prevents user interaction that could cause race conditions or state inconsistencies

### Decision 5: Promise-based async/await pattern
**Reason**: Standard JavaScript async pattern, easy to understand and maintain

---

**Document Status**: Implementation plan ready
**Last Updated**: 2025-09-30
**Priority**: Medium (quality of life improvement)
**Blocked By**: None
**Blocking**: None
