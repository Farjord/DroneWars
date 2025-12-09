# PHASE 03: placement

**Phase Type:** Simultaneous
**Classification:** Pre-Game
**Can Be Skipped:** No
**Milestone Phase:** Yes (Guest stops here for validation)

---

## Phase Overview

The `placement` phase is the final pre-game setup phase where players arrange their ship sections. This phase involves:
- Placing 3 ship sections in specific lane positions
- Each section has unique abilities and stats
- Placement order matters for strategic positioning

This is a simultaneous phase where both players arrange their ships independently, and a **critical milestone phase** because after this phase completes, the host broadcasts and the guest begins **optimistic cascade** into automatic phases.

---

## User Interactions

### UI Components

**Primary Component:**
- ShipPlacementScreen.jsx

**User Actions:**
- View available ship sections (Bridge, Power Cell, Drone Control Hub, etc.)
- Drag or click to place sections in 3 lane positions
- Rearrange sections until satisfied
- Click "Confirm" to commit placement

### State Used for UI

**Player's Placement:**
- `gameState.placedSections` - Array of 3 section names in lane order (e.g., `['bridge', 'powerCell', 'droneControlHub']`)
- `gameState.opponentPlacedSections` - Opponent's placement (after phase completes)

**Interaction Flow:**

```
Player views available ship sections
    ↓
Player places sections in 3 lane positions
    ↓
UI updates placedSections array
    ↓
Player clicks "Confirm"
    ↓
Handler calls ActionProcessor.processCommitment()
    ↓
Commitment stored in gameState.commitments.placement
```

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'placement'`
- `gameState.gameStage = 'preGame'`

**Placement State:**
- `gameState.placedSections` - Array of 3 section names (player's placement)
- `gameState.opponentPlacedSections` - Opponent's placement

**Commitment Structure:**
```javascript
gameState.commitments.placement = {
  player1: {
    completed: boolean,
    sections: string[] // Array of 3 section names in lane order
                      // Example: ['bridge', 'powerCell', 'droneControlHub']
  },
  player2: {
    completed: boolean,
    sections: string[] // Array of 3 section names in lane order
  }
}
```

### State Transitions

**Entry Condition:**
- Previous phase: `droneSelection`
- Triggered by `GameFlowManager.transitionToPhase('placement')`

**Exit Condition:**
- Both `player1.completed` and `player2.completed` are `true`
- Detected by `GameFlowManager.checkSimultaneousPhaseCompletion()`

**Next Phase:**
- `gameInitializing` (transition to roundLoop game stage)

---

## State Listeners

### GameFlowManager.js

**Method: `checkSimultaneousPhaseCompletion()`**
- Monitors the `commitments.placement` object for updates
- Triggered when commitments are updated via ActionProcessor
- Checks if both players have `completed: true`
- Calls `onSimultaneousPhaseComplete()` when both are ready

**Method: `onSimultaneousPhaseComplete()`**
- Applies committed ship placements to gameState
- Updates player ship configurations
- **CRITICAL:** Broadcasts state to guest BEFORE starting automatic cascade
- Transitions to next phase (`gameInitializing`)

### App.jsx

**Phase Transition Listener (useEffect):**
- Subscribes to GameFlowManager phase changes
- Updates UI to show ShipPlacementScreen
- Clears waiting overlays when phase transitions

---

## Flow Scenarios

### Both Players Simultaneous (Standard Flow)

```
1. Phase begins: turnPhase = 'placement'

2. Player 1 places 3 ship sections
   Player 2 places 3 ship sections
   (Happening simultaneously, independently)

3. Player 1 confirms placement
   → commitments.placement.player1.completed = true
   → commitments.placement.player1.sections = [3 section names]
   → If Player 2 not done: Show "Waiting for opponent..." overlay

4. Player 2 confirms placement
   → commitments.placement.player2.completed = true
   → commitments.placement.player2.sections = [3 section names]
   → checkSimultaneousPhaseCompletion() detects both complete

5. onSimultaneousPhaseComplete() triggered
   → Applies committed placements to player ships
   → Updates placedSections and opponentPlacedSections
   → Transitions to 'gameInitializing' phase
```

### Local Mode (vs AI)

```
1. Phase begins: turnPhase = 'placement'

2. Human player places 3 ship sections

3. AI automatically processes placement via AIPhaseProcessor

4. AIPhaseProcessor.processPlacement() executes:
   → AI uses personality-based placement strategy
   → Aggressive: Offense-heavy sections forward
   → Economic: Resource sections protected
   → Balanced: Mixed strategy
   → AI commitment automatically set to completed

5. Human player confirms placement
   → Both commitments complete
   → Phase transitions to 'gameInitializing'
```

### Multiplayer - Host/Guest

**Phase Execution:**
1. Both Host and Guest place independently
2. Each commits locally
3. Commitments synced via network
4. When both complete, host processes phase transition
5. **CRITICAL BROADCAST:** Host broadcasts state IMMEDIATELY after placement commitments applied
6. **Guest Optimistic Cascade Begins:**
   - Guest receives broadcast
   - Guest validates placement data
   - Guest begins `processAutomaticPhasesUntilCheckpoint()`
   - Guest cascades through: gameInitializing → determineFirstPlayer → energyReset → draw
   - Guest stops at next milestone phase (`deployment`)

**Why This Broadcast is Critical:**
- Allows guest to start optimistic cascade while host is processing
- Reduces perceived latency for guest
- Guest can show animations and UI updates immediately
- When host finishes automatic phases and broadcasts again, guest deduplicates animations

---

## AI Behavior

### AIPhaseProcessor Method

**Method: `processPlacement()`**

**AI Logic:**
1. Retrieves AI personality configuration
2. Selects placement strategy based on personality
3. Places 3 ship sections according to strategy
4. Commits placement automatically

**Personality-Based Strategies:**

**Aggressive Personality:**
- Places offensive sections forward
- Prioritizes sections with attack bonuses
- Example: Weapon systems in front lanes

**Economic Personality:**
- Places resource-generating sections in protected positions
- Prioritizes energy and card draw
- Example: Power Cell in back, shielded position

**Balanced Personality:**
- Mixed placement strategy
- Balances offense and defense
- Example: Versatile sections distributed evenly

**Automatic Commitment:**
- AI doesn't require user interaction
- Commitment happens immediately when AI processes this phase
- No delay for AI placement

---

## Network Synchronization

### Host Responsibilities

**Commitment Processing:**
1. Host receives own commitment
2. Host receives guest commitment via network
3. Host stores both commitments in authoritative gameState
4. Host detects both commitments complete via `checkSimultaneousPhaseCompletion()`

**CRITICAL BROADCAST (Immediate):**
1. Host applies commitments via `onSimultaneousPhaseComplete()`
2. **Host broadcasts state IMMEDIATELY after placement commitments applied**
3. **This happens BEFORE host starts automatic phases**
4. Broadcast includes complete ship placements for both players
5. This allows guest to start optimistic cascade

**Subsequent Broadcasts:**
1. Host continues processing automatic phases (gameInitializing, determineFirstPlayer, energyReset, draw)
2. Host broadcasts again after reaching `deployment` phase
3. Guest deduplicates animations from optimistic processing

### Guest Responsibilities

**Commitment Processing:**
1. Guest places 3 ship sections
2. Guest commits locally (optimistic)
3. Guest sends commitment to host
4. Guest shows "Waiting for opponent..." if host not committed
5. **STOPS HERE** - This is a milestone phase
6. Waits for host broadcast

**Receiving Critical Broadcast:**
1. Guest receives host broadcast with both placements
2. Guest validates received data matches local commitment
3. Guest updates opponent's placement data
4. **Guest begins optimistic cascade:**
   - Calls `processAutomaticPhasesUntilCheckpoint()`
   - Processes: gameInitializing → determineFirstPlayer → energyReset → draw
   - Shows animations and UI updates
   - Stops at next milestone (`deployment`)
5. Guest waits for host confirmation broadcast
6. When host broadcast arrives, guest deduplicates animations

### Why Immediate Broadcast Matters

**Reduces Latency:**
- Guest doesn't wait for host to finish all automatic phases
- Guest can show phase animations immediately
- Improves perceived responsiveness

**Optimistic Execution Benefits:**
- Guest processes deterministic automatic phases locally
- No network round-trip needed for automatic phases
- Guest UI stays responsive

**Broadcast Method:**

**GameFlowManager.js:**
- Method: `onSimultaneousPhaseComplete()` for placement phase
- **Broadcasts IMMEDIATELY after applying placement commitments**
- **Before host starts automatic cascade**
- Critical for guest optimistic execution to begin

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     PLACEMENT PHASE                          │
└─────────────────────────────────────────────────────────────┘

START: Transition from 'droneSelection'
  │
  ├─> Set turnPhase = 'placement'
  │
  ├─> PLAYER 1 (Human/Host)           PLAYER 2 (AI/Guest)
  │   │                               │
  │   ├─> UI: ShipPlacementScreen    ├─> AIPhaseProcessor.processPlacement()
  │   │   └─> Place 3 sections        │   └─> Personality-based placement
  │   │                               │
  │   ├─> Click "Confirm"             ├─> Auto-commit
  │   │                               │
  │   └─> commitments.placement       └─> commitments.placement
  │       .player1.completed = true       .player2.completed = true
  │       .player1.sections = [3 names]   .player2.sections = [3 names]
  │
  ├─> GameFlowManager.checkSimultaneousPhaseCompletion()
  │   │
  │   └─> Are both completed = true?
  │       │
  │       ├─> NO: Continue waiting
  │       │   └─> Show "Waiting for opponent..."
  │       │
  │       └─> YES: Proceed
  │
  ├─> GameFlowManager.onSimultaneousPhaseComplete()
  │   │
  │   ├─> Apply ship placements to player configurations
  │   │   └─> Update placedSections
  │   │   └─> Update opponentPlacedSections
  │   │
  │   ├─> **CRITICAL BROADCAST** (Host)
  │   │   └─> Broadcast state to Guest IMMEDIATELY
  │   │   └─> BEFORE starting automatic phases
  │   │
  │   └─> (Guest) Receive broadcast:
  │       ├─> Validate placement data
  │       ├─> Begin optimistic cascade:
  │       │   └─> processAutomaticPhasesUntilCheckpoint()
  │       │   └─> gameInitializing → determineFirstPlayer →
  │       │       energyReset → draw
  │       └─> STOP at next milestone (deployment)
  │
  └─> Transition to next phase: 'gameInitializing'

END: Phase Complete
     Guest begins optimistic cascade
     Host continues with automatic phases
```

---

## Code References

### GameFlowManager.js

**Phase Management:**
- `checkSimultaneousPhaseCompletion()` - Monitors commitment updates
- `onSimultaneousPhaseComplete()` - Handles phase completion
- `transitionToPhase(newPhase)` - Transitions to next phase
- **Milestone Phase List** - `placement` listed as a milestone phase where guest stops

**Critical Broadcast:**
- `onSimultaneousPhaseComplete()` for placement specifically
- **Broadcasts IMMEDIATELY after applying placement commitments**
- Happens BEFORE host starts automatic phases
- Allows guest to begin optimistic cascade

**Guest Optimistic Processing:**
- `processAutomaticPhasesUntilCheckpoint()` - Guest cascade method
- Processes automatic phases until next milestone
- Tracks animations for deduplication

### ActionProcessor.js

**Commitment Handling:**
- `processCommitment(playerId, phase, data)` - Processes player commitments
- Stores commitment data in `gameState.commitments[phase][playerId]`

### AIPhaseProcessor.js

**AI Processing:**
- `processPlacement()` - AI ship placement logic
- Uses personality-based strategies: aggressive, economic, balanced
- Auto-commits when complete

### App.jsx

**Phase Listening:**
- Phase Manager subscription useEffect
- Monitors `turnPhase` changes
- Displays ShipPlacementScreen when phase is active

**Animation Tracking:**
- Tracks animations shown during optimistic processing
- Deduplicates when host broadcast arrives

### ShipPlacementScreen.jsx

**UI Component:**
- Displays available ship sections
- Handles placement interaction (drag/click)
- Calls commitment handler on confirm

---

## Notes

- This phase is never skipped - it's required for game initialization
- Players must place exactly 3 ship sections
- Placement order determines lane positions and strategic advantages
- **Milestone Phase:** Guest stops here and waits for host validation
- **Critical Broadcast Point:** This is where guest begins optimistic cascade
- Host broadcasts BEFORE starting automatic phases to enable guest cascade
- Guest processes automatic phases locally, then waits at next milestone (deployment)
- AI uses personality-based strategies for placement
- Ship sections have unique stats and abilities that affect gameplay
- Placement affects energy generation, shields per turn, hand limits, and more
