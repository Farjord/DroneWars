# Animation Implementation Guide - Lessons Learned

**Created:** 2025-01-18
**Purpose:** Document bugs and solutions encountered during animation implementation to prevent recurring issues

---

## Table of Contents
1. [Bug 1: Animation Registry - Two-Step Registration Required](#bug-1-animation-registry---two-step-registration-required)
2. [Bug 2: React Render Race Condition](#bug-2-react-render-race-condition-guest-only)
3. [Bug 3: Data Structure Mismatch - placedSections Array](#bug-3-data-structure-mismatch---placedsections-array)
4. [Bug 4: DOM Ref Key Case Mismatch](#bug-4-dom-ref-key-case-mismatch)
5. [Bug 5: Perspective Bug - Absolute vs Relative Player IDs](#bug-5-perspective-bug---absolute-vs-relative-player-ids)
6. [Bug 6: Source Position Perspective Bug](#bug-6-source-position-perspective-bug)
7. [Architecture Patterns](#key-architecture-patterns)

---

## Bug 1: Animation Registry - Two-Step Registration Required

### Error
```
❌ [ANIMATION DEBUG] Unknown animation: OVERFLOW_PROJECTILE
```

### Root Cause
- Only registered visual handler in `useAnimationSetup.js`
- Forgot to add animation definition to `AnimationManager.js`

### Solution
All animations require **TWO** registrations:

**1. Animation Definition** in `AnimationManager.js`:
```javascript
OVERFLOW_PROJECTILE: {
  duration: 1200,
  type: 'OVERFLOW_PROJECTILE',
  config: {}
}
```

**2. Visual Handler** in `useAnimationSetup.js`:
```javascript
animationManager.registerVisualHandler('OVERFLOW_PROJECTILE', (payload) => {
  // Rendering logic
});
```

### Prevention
- Always check both files when adding new animation types
- Use checklist in [Pattern 1](#pattern-1-animation-registry-checklist)

---

## Bug 2: React Render Race Condition (Guest-Only)

### Error
```
⚠️ [TELEPORT DEBUG] Drone element not found
```

### Root Cause
- Animation triggered immediately after state update
- Guest-side refs not yet populated by React render cycle
- Host worked because it processed first

### Solution
Wrap DOM queries in `requestAnimationFrame()`:
```javascript
requestAnimationFrame(() => {
  const droneEl = droneRefs.current[targetId];
  // Now React has painted, refs are populated
});
```

### Prevention
- Always use `requestAnimationFrame()` when accessing refs immediately after state changes in animations
- See [Pattern 2](#pattern-2-dom-ref-access-after-state-changes)

---

## Bug 3: Data Structure Mismatch - placedSections Array

### Error
```
Uncaught TypeError: Cannot read properties of null (reading 'x')
```
at OverflowProjectile.jsx:88

### Root Cause
Incorrect assumption about `placedSections` data structure:

**❌ Wrong assumption:**
```javascript
placedSections = [
  {type: 'bridge', lane: 'lane1'},
  {type: 'powerCell', lane: 'lane2'}
]
```

**✅ Actual structure:**
```javascript
placedSections = ["bridge", "powerCell", "droneControlHub"]  // Indexed array of keys

shipSections = {
  bridge: {type: 'Bridge', hull: 10, shields: 5, ...},
  powerCell: {type: 'Power Cell', hull: 8, shields: 3, ...}
}
```

**❌ Broken code:**
```javascript
const section = placedSections.find(s => s.lane === targetLane);  // Tries .lane on string!
```

**✅ Correct code:**
```javascript
// Step 1: Convert lane name to array index
const laneIndex = parseInt(targetLane.replace('lane', '')) - 1;  // "lane1" → 0

// Step 2: Get section key from array
const sectionKey = placedSections[laneIndex];  // "bridge"

// Step 3: Look up full section object
const sectionData = shipSections[sectionKey];  // {type: 'Bridge', hull: 10, ...}
```

### Prevention
- Always verify data structure with console logs before implementing logic
- Don't assume nested objects without checking
- See [Pattern 3](#pattern-3-ship-section-lookup)

---

## Bug 4: DOM Ref Key Case Mismatch

### Error
```
⚠️ [OVERFLOW DEBUG] Ship section DOM element not found:
{sectionType: 'Bridge', targetPlayer: 'player1', targetLane: 'lane1'}
```

### Root Cause
- Refs stored with **lowercase** keys: `"local-bridge"`
- Lookup used **capitalized** type: `"local-Bridge"`
- Case mismatch prevented DOM element from being found

**How refs are stored** (ShipSectionsDisplay.jsx):
```javascript
const sectionName = placedSections[laneIndex];  // "bridge" (lowercase)
const refKey = `${isPlayer ? 'local' : 'opponent'}-${sectionName}`;
sectionRefs.current[refKey] = el;  // Stores as "local-bridge"
```

**❌ Broken lookup:**
```javascript
getElementFromLogicalPosition(targetPlayer, targetLane, sectionData.type, 'section');
// sectionData.type = "Bridge" (capitalized)
// Looks for "local-Bridge" → NOT FOUND
```

**✅ Correct lookup:**
```javascript
getElementFromLogicalPosition(targetPlayer, targetLane, sectionKey, 'section');
// sectionKey = "bridge" (lowercase)
// Looks for "local-bridge" → FOUND
```

### Prevention
- Always use the same key format for storing and retrieving refs
- Use lowercase section keys consistently
- When debugging, log both the key being used and available ref keys

---

## Bug 5: Perspective Bug - Absolute vs Relative Player IDs

### Error
Animation played from wrong ship section:
- Guest saw correct animation (projectile from guest drone to guest ship)
- Host saw wrong animation (projectile from host ship to host drone to host ship)

### Root Cause
Using **absolute player IDs** (`'player1'`, `'player2'`) with **perspective-relative data structures**:

**❌ Wrong code:**
```javascript
const placedSections = targetPlayer === 'player1'
  ? gameState.placedSections
  : gameState.opponentPlacedSections;
```

**The problem:**
- `gameState.placedSections` = **LOCAL player's** sections (perspective-relative)
- `gameState.opponentPlacedSections` = **OPPONENT player's** sections (perspective-relative)

**Example scenario:**

On **Guest screen** (`localPlayerId = 'player2'`):
- Guest attacks host drone (`targetPlayer = 'player1'`)
- Old code: `targetPlayer === 'player1'` → uses `placedSections` → **GUEST's sections (wrong!)**
- Should use: `opponentPlacedSections` → **HOST's sections (correct!)**

**✅ Correct code:**
```javascript
const localPlayerId = gameStateManager.getLocalPlayerId();
const placedSections = targetPlayer === localPlayerId
  ? gameState.placedSections          // Target is local player
  : gameState.opponentPlacedSections; // Target is opponent player
```

### Prevention
- **Never** use absolute player IDs (`'player1'`, `'player2'`) with perspective-relative data
- **Always** convert to perspective (local vs opponent) using `getLocalPlayerId()`
- Remember: Game state data structures are stored by **perspective**, not by absolute player ID
- See [Pattern 4](#pattern-4-perspective-relative-data-access)

---

## Bug 6: Source Position Perspective Bug

### Error
Animation direction backwards on opponent's screen:
- Guest (attacker): Saw projectile go from bottom → opponent drone → opponent ship ✅
- Host (defender): Saw projectile go from bottom → own drone → own ship ❌

### Root Cause
`sourcePos` always calculated as bottom center (local player's hand), regardless of who attacked:

**❌ Wrong code:**
```javascript
const sourcePos = {
  x: gameAreaRect.left + gameAreaRect.width / 2,
  y: gameAreaRect.bottom - 50  // Always local player area
};
```

**The problem:**

When **Guest attacks Host**:
- **Guest screen**: sourcePos = bottom ✅ (correct - attacker is local)
- **Host screen**: sourcePos = bottom ❌ (wrong - attacker is opponent, should be top)

### Solution

**Step 1:** Add `sourcePlayer` to animation payload (gameLogic.js):
```javascript
animationEvents.push({
  type: 'OVERFLOW_PROJECTILE',
  sourcePlayer: actingPlayerId,  // Who's attacking
  targetPlayer: opponentId,      // Who's being attacked
  // ... rest of payload
});
```

**Step 2:** Calculate perspective-aware position (useAnimationSetup.js):
```javascript
const { sourcePlayer, targetPlayer, ... } = payload;

const localPlayerId = gameStateManager.getLocalPlayerId();
const isAttackerLocal = sourcePlayer === localPlayerId;

const sourcePos = {
  x: gameAreaRect.left + gameAreaRect.width / 2,
  y: isAttackerLocal
    ? gameAreaRect.bottom - 50  // Attacker is local: bottom (hand area)
    : gameAreaRect.top + 50      // Attacker is opponent: top (opponent area)
};
```

### Prevention
- Always include both `sourcePlayer` and `targetPlayer` in animation events
- Calculate positions based on perspective (who's local, who's opponent)
- **Test animations on both host AND guest screens**
- See [Pattern 5](#pattern-5-animation-event-payload-requirements)

---

## Key Architecture Patterns

### Pattern 1: Animation Registry Checklist

When adding a new animation type:

- [ ] Add animation definition to `AnimationManager.js`:
  ```javascript
  ANIMATION_NAME: {
    duration: 1000,
    type: 'ANIMATION_TYPE',
    config: { /* optional config */ }
  }
  ```

- [ ] Register visual handler in `useAnimationSetup.js`:
  ```javascript
  animationManager.registerVisualHandler('ANIMATION_TYPE', (payload) => {
    // Rendering logic
  });
  ```

---

### Pattern 2: DOM Ref Access After State Changes

Always wrap ref access in `requestAnimationFrame()` when triggered immediately after state updates:

```javascript
animationManager.registerVisualHandler('SOME_EFFECT', (payload) => {
  // Wait for React to render and populate refs
  requestAnimationFrame(() => {
    const element = refs.current[id];
    if (!element) {
      console.warn('Element not found:', id);
      return;
    }
    // Safe to use element now
  });
});
```

---

### Pattern 3: Ship Section Lookup

**Data Structures:**
```javascript
placedSections = ["bridge", "powerCell", "droneControlHub"]  // Array indexed by lane (0,1,2)
shipSections = {
  bridge: {type: 'Bridge', hull: 10, ...},
  powerCell: {type: 'Power Cell', hull: 8, ...}
}
```

**Lookup Pattern:**
```javascript
// Step 1: Convert lane name to array index
const laneIndex = parseInt(targetLane.replace('lane', '')) - 1;  // "lane1" → 0

// Step 2: Get section key (lowercase) from placedSections array
const sectionKey = placedSections[laneIndex];  // "bridge"

// Step 3: Get full section object from shipSections
const sectionData = shipSections[sectionKey];  // {type: 'Bridge', hull: 10, ...}

// Step 4: Use lowercase key for DOM lookups
const sectionEl = getElementFromLogicalPosition(player, lane, sectionKey, 'section');
```

**Key Points:**
- `placedSections[laneIndex]` gives you the **lowercase key**
- `shipSections[key]` gives you the **full section object**
- DOM refs use the **lowercase key**, not the capitalized type

---

### Pattern 4: Perspective-Relative Data Access

**Rule:** Always convert absolute player IDs to perspective-relative when accessing game state data.

```javascript
const localPlayerId = gameStateManager.getLocalPlayerId();

// Data lookup: Use perspective to determine which property to access
const placedSections = targetPlayer === localPlayerId
  ? gameState.placedSections          // Target is local player
  : gameState.opponentPlacedSections; // Target is opponent player

const playerState = targetPlayer === localPlayerId
  ? gameState[localPlayerId]
  : gameState[localPlayerId === 'player1' ? 'player2' : 'player1'];

// Position calculation: Use perspective for coordinates
const isAttackerLocal = sourcePlayer === localPlayerId;
const yPosition = isAttackerLocal
  ? gameAreaRect.bottom - 50  // Local player: bottom
  : gameAreaRect.top + 50;    // Opponent: top
```

**Why this matters:**
- `gameState.placedSections` always refers to the **local player**, regardless of whether that's player1 or player2
- `gameState.opponentPlacedSections` always refers to the **opponent**, regardless of whether that's player1 or player2
- Using absolute IDs (`'player1'`, `'player2'`) directly will cause bugs on one of the screens

---

### Pattern 5: Animation Event Payload Requirements

All animation events that involve positions or interactions between players must include:

```javascript
animationEvents.push({
  type: 'ANIMATION_TYPE',
  sourcePlayer: actingPlayerId,   // ✅ REQUIRED: Who initiated the action
  targetPlayer: opponentId,       // ✅ REQUIRED: Who is receiving the action
  targetId: target.id,
  targetLane: lane,
  // ... other event-specific data
  timestamp: Date.now()
});
```

**Why both are needed:**
- `sourcePlayer`: Determines where animation originates (attacker's position)
- `targetPlayer`: Determines where animation ends (defender's position)
- Without both, animations will be incorrect on at least one player's screen

---

## Testing Checklist for New Animations

When implementing a new animation, test:

- [ ] **Local mode**: Animation plays correctly
- [ ] **Host screen**: Animation plays correctly when host performs action
- [ ] **Guest screen**: Animation plays correctly when guest performs action
- [ ] **Host screen**: Animation plays correctly when **guest** performs action (perspective test)
- [ ] **Guest screen**: Animation plays correctly when **host** performs action (perspective test)
- [ ] **Both screens simultaneously**: Verify both players see same logical event from their perspective
- [ ] **Console logs**: No errors about missing elements, unknown animations, or null references

---

## Debugging Tips

### 1. Enable Animation Logging
Set `ANIMATIONS: true` in `debugLogger.js` to see all animation events.

### 2. Check Animation Registry
If you see "Unknown animation" errors:
```javascript
// Verify both locations:
// 1. AnimationManager.js - animations object
// 2. useAnimationSetup.js - registerVisualHandler call
```

### 3. Inspect Data Structures
When debugging position/lookup issues:
```javascript
debugLog('ANIMATIONS', 'Data structure inspection:', {
  placedSections,
  isArray: Array.isArray(placedSections),
  shipSections: Object.keys(shipSections),
  targetPlayer,
  localPlayerId: gameStateManager.getLocalPlayerId()
});
```

### 4. Test Perspective Logic
Add logging to verify perspective calculations:
```javascript
const localPlayerId = gameStateManager.getLocalPlayerId();
const isLocal = targetPlayer === localPlayerId;

debugLog('ANIMATIONS', 'Perspective check:', {
  localPlayerId,
  targetPlayer,
  isLocal,
  usingData: isLocal ? 'placedSections' : 'opponentPlacedSections'
});
```

### 5. Verify Ref Keys
When elements aren't found:
```javascript
console.log('Looking for:', refKey);
console.log('Available refs:', Object.keys(refs.current));
```

---

## Summary

The OVERFLOW animation implementation taught us six critical lessons about multiplayer animation systems:

1. **Two-step registration** - Both AnimationManager and useAnimationSetup required
2. **React timing** - Use requestAnimationFrame() for ref access after state changes
3. **Data structure verification** - Don't assume, always check with console logs
4. **Case sensitivity** - Ref keys must match exactly (lowercase vs capitalized)
5. **Perspective conversion** - Always convert absolute IDs to local/opponent perspective
6. **Dual player IDs** - Include both sourcePlayer and targetPlayer in events

By following the patterns documented here, future animation implementations should avoid these common pitfalls.

---

**Document Status:** Living document - update as new animation bugs are discovered and solved.
