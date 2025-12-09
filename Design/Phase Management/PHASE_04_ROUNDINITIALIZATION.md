# Phase 04: Round Initialization

**Phase Name:** `roundInitialization`
**Phase Type:** Automatic
**Classification:** Round Start
**Skip Condition:** Never
**Milestone (Guest Stops):** No

---

## Overview

Round Initialization is an **atomic automatic phase** that combines four previously separate automatic phases into a single operation. This consolidation was introduced as part of the **PhaseManager Integration (Phase 2)** to eliminate race conditions and synchronization issues between Host and Guest.

### What It Replaces

This single phase replaces the following 4 automatic phases:
1. ~~gameInitializing~~ - Game stage transition
2. ~~determineFirstPlayer~~ - First player determination
3. ~~energyReset~~ - Energy and resource reset
4. ~~draw~~ - Automatic card draw

### Why It Was Created

**Problem:** The 4 separate automatic phases created timing issues in multiplayer:
- Guest and Host processed them independently
- Different execution speeds caused desynchronization
- 4 separate broadcasts created network overhead
- Race conditions when phases completed at different times

**Solution:** Combine into single atomic operation:
- Single broadcast per round start (not 4)
- Guaranteed execution order
- Eliminates independent processing
- Reduces network calls by 75%

---

## Phase Trigger

Round Initialization triggers in two scenarios:

### 1. After Placement Phase (First Round)
- Previous Phase: `placement`
- Trigger: Both players complete ship placement
- Sets up the first round of the game

### 2. After Action Phase (Subsequent Rounds)
- Previous Phase: `action`
- Trigger: Both players pass in action phase
- Sets up the next round after combat resolution

---

## Processing Steps

The `processRoundInitialization()` method in GameFlowManager.js executes 4 atomic steps:

### Step 1: Game Stage Transition
```javascript
// STEP 1: Game Stage Transition (100ms delay for mounting)
await new Promise(resolve => setTimeout(resolve, 100));
if (this.gameStage !== 'roundLoop') {
  this.gameStage = 'roundLoop';
}
```

**Purpose:** Ensures game enters 'roundLoop' stage for first round

**Timing:** 100ms delay allows UI components to mount properly

**Applies to:** First round only (placement → roundInitialization)

### Step 2: Determine First Player
```javascript
// STEP 2: Determine First Player
const firstPlayerResult = await this.actionProcessor.processFirstPlayerDetermination();
```

**First Round:** Deterministic random based on game seed
- Uses `SeededRandom` class
- Same seed = same first player (for replays)
- 50/50 chance for each player

**Subsequent Rounds:** First passer from previous round goes second
- If Player 1 passed first last round → Player 2 goes first this round
- If Player 2 passed first last round → Player 1 goes first this round
- Stored in `firstPasserOfPreviousRound` state attribute

**Animation:** Queues "FIRST PLAYER" announcement showing who goes first

**State Updates:**
- `firstPlayerOfRound` - Set to determined player
- `currentPlayer` - Set to first player (for sequential phases)

### Step 3: Energy & Resource Reset
```javascript
// STEP 3: Energy & Resource Reset
// Calculate effective ship stats (including placed sections)
const effectiveStatsPlayer1 = this.getEffectiveShipStats(player1);
const effectiveStatsPlayer2 = this.getEffectiveShipStats(player2);

// Ready all drones (exhausted → ready)
const readiedPlayer1 = readyAllDrones(player1);
const readiedPlayer2 = readyAllDrones(player2);

// Set budgets based on effective stats
const updatedPlayer1 = {
  ...readiedPlayer1,
  energy: effectiveStatsPlayer1.totals.energy,
  initialDeploymentBudget: effectiveStatsPlayer1.totals.deploymentBudget,
  deploymentBudget: effectiveStatsPlayer1.totals.deploymentBudget
};
```

**Calculates Effective Ship Stats:**
- Base stats from ship sections
- Bonuses from placed sections
- Totals: energy, handLimit, deploymentBudget, shields

**Readies All Drones:**
- Changes all exhausted drones to ready state
- Preserves drone assignments (front/mid/rear)

**Sets Energy Budgets:**
- `energy` - Available energy for card play (starts at max)
- `initialDeploymentBudget` - Tracks starting budget for this round
- `deploymentBudget` - Available budget for drone deployment (starts at max)

**Calculates Shield Budget:**
```javascript
// Calculate shields to allocate (shields from sections - deployed drones with shields)
const shieldsFromSections = effectiveStatsPlayer1.totals.shields;
const deployedDronesWithShields = calculateDeployedShields(player1);
const shieldsToAllocate = Math.max(0, shieldsFromSections - deployedDronesWithShields);
```

**Animation:** Queues "ENERGY RESET" animation showing new budgets

**State Updates:**
- `player1.energy` - Set to max energy
- `player1.deploymentBudget` - Set to deployment budget
- `player1.shieldsToAllocate` - Calculated shield budget
- (Same for player2)

### Step 4: Card Draw
```javascript
// STEP 4: Card Draw
const drawResult = performAutomaticDraw(currentGameState, this.gameStateManager);

// Update both players with drawn cards
this.gameStateManager.updateState({
  player1: drawResult.player1,
  player2: drawResult.player2
});
```

**Draw Logic (from cardDrawUtils.js):**
1. Calculate hand limit from effective ship stats
2. Determine cards to draw: `Math.max(0, handLimit - currentHandSize)`
3. If deck empty, reshuffle discard pile into deck (deterministic)
4. Draw cards up to hand limit
5. If insufficient cards, draw as many as possible

**Reshuffling:**
- Uses `SeededRandom.forCardShuffle(gameState, playerKey)`
- Deterministic shuffle for replay consistency
- Discard pile becomes new deck

**Animation:** Queues "CARD DRAW" animation showing cards drawn

**State Updates:**
- `player1.hand` - Cards drawn from deck
- `player1.deck` - Remaining deck after draw
- `player2.hand` - Cards drawn from deck
- `player2.deck` - Remaining deck after draw

---

## State Changes

### Before Round Initialization
```javascript
{
  turnPhase: 'placement' | 'action',  // Previous phase
  gameStage: 'preGame' | 'roundLoop',
  roundNumber: N,
  player1: {
    energy: 0,                        // Depleted from previous round
    deploymentBudget: 0,
    hand: [],                         // Empty or under hand limit
    deck: [cards...],
    drones: [exhausted drones...]
  }
}
```

### After Round Initialization
```javascript
{
  turnPhase: 'roundInitialization',   // Atomic phase
  gameStage: 'roundLoop',
  roundNumber: N+1,                    // Incremented
  firstPlayerOfRound: 'player1' | 'player2',
  currentPlayer: 'player1' | 'player2',
  player1: {
    energy: 10,                        // Reset to max (from ship stats)
    initialDeploymentBudget: 5,        // From ship stats
    deploymentBudget: 5,               // Reset to max
    shieldsToAllocate: 3,              // Calculated
    hand: [5 cards],                   // Drawn to hand limit
    deck: [remaining cards...],
    drones: [ready drones...]          // All readied
  }
}
```

---

## Network Synchronization

### Host Processing
1. Both players complete previous phase (placement or action)
2. PhaseManager.transitionToPhase('roundInitialization') called
3. GameFlowManager.processRoundInitialization() executes all 4 steps
4. **Single broadcast** sent after all steps complete
5. Next phase determined by getNextPhase()

### Guest Processing
1. Guest waits at previous milestone phase (placement or deployment)
2. Receives **single broadcast** with roundInitialization complete
3. Guest accepts broadcast, updates state
4. Animation deduplication prevents duplicate animations
5. Guest moves to next phase (mandatoryDiscard or deployment)

### Broadcast Consolidation
**OLD (4 broadcasts):**
```
placement → gameInitializing (broadcast 1)
gameInitializing → determineFirstPlayer (broadcast 2)
determineFirstPlayer → energyReset (broadcast 3)
energyReset → draw (broadcast 4)
draw → mandatoryDiscard
```

**NEW (1 broadcast):**
```
placement → roundInitialization (single broadcast)
roundInitialization → mandatoryDiscard
```

**Result:** 75% reduction in network traffic for round starts

---

## UI Behavior

### Animations
Round Initialization queues 3 sequential animations via PhaseAnimationQueue:

1. **First Player Announcement:**
   - Text: "PLAYER 1 FIRST" or "PLAYER 2 FIRST"
   - Duration: 1500ms
   - Displayed first

2. **Energy Reset Animation:**
   - Text: "ENERGY RESET"
   - Subtitle: Shows new energy and deployment budgets
   - Duration: 1500ms
   - Displayed second

3. **Card Draw Animation:**
   - Text: "CARD DRAW"
   - Subtitle: Shows number of cards drawn
   - Duration: 1500ms
   - Displayed third

**Total Duration:** ~4.5 seconds for all animations

### No User Interaction
This is an automatic phase - no user input required. Players cannot:
- Pass during this phase
- Play cards during this phase
- Interact with UI during this phase

### Loading/Transition UI
- Game may show "Processing..." overlay briefly
- Animations play sequentially after processing complete
- Next phase UI appears after animations finish

---

## Edge Cases

### Empty Deck & Empty Discard
**Scenario:** Player has no cards left to draw

**Handling:**
- `performAutomaticDraw()` detects empty deck + discard
- Logs warning: `⚠️ ${playerName} has no cards left to draw`
- Player hand remains at current size (under hand limit)
- Game continues normally

**Result:** Player plays with fewer cards (disadvantage)

### First Round vs Subsequent Rounds
**First Round:**
- `gameStage` transitions from 'preGame' to 'roundLoop'
- 100ms delay for UI mounting
- First player determined randomly (seeded)

**Subsequent Rounds:**
- `gameStage` already 'roundLoop'
- No delay
- First player determined by previous round's first passer

### Shield Allocation Skip
**Scenario:** Round 1, no drones deployed yet

**Handling:**
- `shieldsToAllocate` calculated as `shields - deployedShields`
- Round 1: deployedShields = 0, so shieldsToAllocate = total shields
- If total shields = 0, allocateShields phase skipped (Round 1 only)

**Result:** allocateShields phase appears starting Round 2+

---

## Code Location

### GameFlowManager.js

**processRoundInitialization() method:**
- Location: GameFlowManager.js:1027-1211
- Called by: transitionToPhase() when entering 'roundInitialization'
- Returns: Next phase name (from getNextPhase())

**AUTOMATIC_PHASES constant:**
```javascript
this.AUTOMATIC_PHASES = ['roundInitialization'];
```

**PRE_GAME_PHASES constant:**
```javascript
this.PRE_GAME_PHASES = ['deckSelection', 'droneSelection', 'placement', 'roundInitialization'];
```

### cardDrawUtils.js

**performAutomaticDraw() function:**
- Handles card drawing for both players
- Reshuffles discard pile if needed
- Returns updated player states

### firstPlayerUtils.js

**determineFirstPlayer() function:**
- Determines first player based on round number
- Uses seeded random for Round 1
- Uses firstPasserOfPreviousRound for Round 2+

---

## Testing Checklist

### Local Mode (vs AI)
- [ ] First round: Random first player (deterministic from seed)
- [ ] Energy and deployment budgets set correctly
- [ ] All drones readied (exhausted → ready)
- [ ] Cards drawn to hand limit
- [ ] 3 sequential animations play
- [ ] Second round: Correct first passer goes second
- [ ] Empty deck reshuffles discard pile

### Host Mode
- [ ] Single broadcast sent after roundInitialization complete
- [ ] Guest receives broadcast and updates
- [ ] No duplicate animations
- [ ] Both players have identical state after broadcast

### Guest Mode
- [ ] Guest waits at placement/deployment phase
- [ ] Guest accepts roundInitialization broadcast
- [ ] Guest state matches Host state
- [ ] Animation deduplication prevents duplicates
- [ ] No "phase mismatch" errors

---

## PhaseManager Integration

Round Initialization is fully integrated with PhaseManager:

### Transition Authority
- **Only PhaseManager.transitionToPhase()** can transition to roundInitialization
- Guest blocked from triggering this phase
- Host processes all 4 steps atomically

### Broadcast Pattern
```javascript
// In PhaseManager.transitionToPhase()
if (this.gameMode === 'host') {
  this.gameStateManager.broadcastStateToGuest();
  debugLog('PHASE_MANAGER', `📡 [HOST] Broadcast sent (phase: ${newPhase})`);
}
```

### Guest Trust Model
- Guest receives roundInitialization broadcast
- Guest applies state without validation
- Guest trusts PhaseManager unconditionally
- No complex validation or rejection logic

---

## Version History

- **2025-11-13:** Created as part of PhaseManager Integration (Phase 2)
- Replaces PHASE_04_GAMEINITIALIZING.md, PHASE_05_DETERMINEFIRSTPLAYER.md, PHASE_06_ENERGYRESET.md, PHASE_09_DRAW.md
