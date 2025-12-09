# PHASE 02: droneSelection

**Phase Type:** Simultaneous
**Classification:** Pre-Game
**Can Be Skipped:** No
**Milestone Phase:** Yes (Guest stops here for validation)

---

## Phase Overview

The `droneSelection` phase occurs after deck selection, where players narrow down their drone roster. This phase involves:
- Selecting 5 drones from the 10 previously chosen drones
- These 5 drones will be used throughout the game

This is a simultaneous phase where both players make their selections independently, and a milestone phase where the guest stops and waits for host validation.

---

## User Interactions

### UI Components

**Primary Component:**
- DroneSelectionScreen.jsx

**User Actions:**
- View the 10 drones selected in deckSelection phase
- Select 5 drones to keep for the game
- Click "Confirm" to commit selection

### State Used for UI

**Player's Selection:**
- `gameState.player1DroneSelectionTrio` - Temporary UI state for trio selection
- `gameState.player1DroneSelectionPool` - The pool of 10 drones to choose from

**Interaction Flow:**

```
Player views 10 available drones
    ↓
Player selects 5 drones
    ↓
UI updates selection state
    ↓
Player clicks "Confirm"
    ↓
Handler calls ActionProcessor.processCommitment()
    ↓
Commitment stored in gameState.commitments.droneSelection
```

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'droneSelection'`
- `gameState.gameStage = 'preGame'`

**Temporary UI State:**
- `gameState.player1DroneSelectionPool` - Array of 10 drones available to select from
- `gameState.player1DroneSelectionTrio` - Temporary selection state (UI only)

**Commitment Structure:**
```javascript
gameState.commitments.droneSelection = {
  player1: {
    completed: boolean,
    drones: string[] // Array of 5 selected drone names
  },
  player2: {
    completed: boolean,
    drones: string[] // Array of 5 selected drone names
  }
}
```

### State Transitions

**Entry Condition:**
- Previous phase: `deckSelection`
- Triggered by `GameFlowManager.transitionToPhase('droneSelection')`

**Exit Condition:**
- Both `player1.completed` and `player2.completed` are `true`
- Detected by `GameFlowManager.checkSimultaneousPhaseCompletion()`

**Next Phase:**
- `placement`

---

## State Listeners

### GameFlowManager.js

**Method: `checkSimultaneousPhaseCompletion()`**
- Monitors the `commitments.droneSelection` object for updates
- Triggered when commitments are updated via ActionProcessor
- Checks if both players have `completed: true`
- Calls `onSimultaneousPhaseComplete()` when both are ready

**Method: `onSimultaneousPhaseComplete()`**
- Applies committed drone selections to gameState
- Updates player drone rosters
- **For Guest:** Triggers optimistic cascade (but droneSelection is a milestone, so guest stops here)
- Transitions to next phase

### App.jsx

**Phase Transition Listener (useEffect):**
- Subscribes to GameFlowManager phase changes
- Updates UI to show DroneSelectionScreen
- Clears waiting overlays when phase transitions

---

## Flow Scenarios

### Both Players Simultaneous (Standard Flow)

```
1. Phase begins: turnPhase = 'droneSelection'

2. Player 1 views 10 drones from deckSelection
   Player 2 views 10 drones from deckSelection
   (Happening simultaneously, independently)

3. Player 1 selects 5 drones
   Player 2 selects 5 drones

4. Player 1 clicks "Confirm"
   → commitments.droneSelection.player1.completed = true
   → commitments.droneSelection.player1.drones = [5 drone names]
   → If Player 2 not done: Show "Waiting for opponent..." overlay

5. Player 2 clicks "Confirm"
   → commitments.droneSelection.player2.completed = true
   → commitments.droneSelection.player2.drones = [5 drone names]
   → checkSimultaneousPhaseCompletion() detects both complete

6. onSimultaneousPhaseComplete() triggered
   → Applies committed drone selections to player rosters
   → Transitions to 'placement' phase
```

### Local Mode (vs AI)

```
1. Phase begins: turnPhase = 'droneSelection'

2. Human player views 10 available drones

3. AI automatically processes drone selection via AIPhaseProcessor

4. AIPhaseProcessor.processDroneSelection() executes:
   → AI randomly selects 5 drones from its 10
   → AI commitment automatically set to completed

5. Human player selects 5 drones and clicks "Confirm"
   → Both commitments complete
   → Phase transitions to 'placement'
```

### Multiplayer - Host/Guest

**Phase Execution:**
1. Both Host and Guest select independently
2. Each commits locally
3. Commitments synced via network
4. When both complete, host processes phase transition
5. **Guest stops at this milestone phase** - waits for host broadcast
6. Host broadcasts state to guest

**Guest Milestone Behavior:**
- This is a **Milestone Phase**
- Guest commits selection
- Guest does NOT automatically cascade to next phase
- Guest waits for host broadcast confirming both selections
- After receiving broadcast, guest validates and proceeds to placement

---

## AI Behavior

### AIPhaseProcessor Method

**Method: `processDroneSelection()`**

**AI Logic:**
1. Retrieves the 10 drones from AI's deck
2. Randomly selects 5 drones from the 10
3. Commits selection automatically

**Selection Strategy:**
- Random selection (no advanced strategy)
- Ensures exactly 5 drones selected
- No duplicate drones in selection

**Automatic Commitment:**
- AI doesn't require user interaction
- Commitment happens immediately when AI processes this phase
- No delay or animation for AI selection

---

## Network Synchronization

### Host Responsibilities

**Commitment Processing:**
1. Host receives own commitment
2. Host receives guest commitment via network
3. Host stores both commitments in authoritative gameState
4. Host detects both commitments complete via `checkSimultaneousPhaseCompletion()`

**Broadcasting:**
1. After both commitments received
2. Host applies commitments via `onSimultaneousPhaseComplete()`
3. Host broadcasts state with both drone selections
4. Broadcast includes complete drone rosters for both players
5. Guest receives broadcast and validates

### Guest Responsibilities

**Commitment Processing:**
1. Guest selects 5 drones
2. Guest commits locally (optimistic)
3. Guest sends commitment to host
4. Guest shows "Waiting for opponent..." if host not committed
5. **STOPS HERE** - This is a milestone phase
6. Waits for host broadcast

**Receiving Broadcast:**
1. Guest receives host broadcast with both selections
2. Guest validates received data matches local commitment
3. Guest updates opponent's selection data
4. Guest proceeds to next phase ('placement')

### Why This is a Milestone

- Drone selection is critical game-defining data
- Must ensure synchronization before proceeding
- Prevents guest from cascading into automatic phases without validation
- Ensures both players have the same drone rosters before game start

### Broadcast Method

**GameFlowManager.js:**
- Method: Commitment system broadcast within `onSimultaneousPhaseComplete()`
- Sends updated gameState to guest
- Includes drone selections for both players

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   DRONE SELECTION PHASE                      │
└─────────────────────────────────────────────────────────────┘

START: Transition from 'deckSelection'
  │
  ├─> Set turnPhase = 'droneSelection'
  │
  ├─> PLAYER 1 (Human/Host)           PLAYER 2 (AI/Guest)
  │   │                               │
  │   ├─> UI: DroneSelectionScreen   ├─> AIPhaseProcessor.processDroneSelection()
  │   │   └─> Display 10 drones       │   └─> Random select 5 from 10
  │   │   └─> Select 5 drones         │
  │   │                               │
  │   ├─> Click "Confirm"             ├─> Auto-commit
  │   │                               │
  │   └─> commitments.droneSelection  └─> commitments.droneSelection
  │       .player1.completed = true       .player2.completed = true
  │       .player1.drones = [5 drones]    .player2.drones = [5 drones]
  │
  ├─> GameFlowManager.checkSimultaneousPhaseCompletion()
  │   │
  │   └─> Are both completed = true?
  │       │
  │       ├─> NO: Continue waiting
  │       │   └─> Show "Waiting for opponent..." (if multiplayer)
  │       │
  │       └─> YES: Proceed
  │
  ├─> GameFlowManager.onSimultaneousPhaseComplete()
  │   │
  │   ├─> Apply drone selections to player rosters
  │   │
  │   ├─> (Host) Broadcast state to Guest
  │   │
  │   └─> (Guest) STOP - Milestone Phase
  │       └─> Wait for Host broadcast
  │       └─> Validate selections
  │       └─> Proceed after confirmation
  │
  └─> Transition to next phase: 'placement'

END: Phase Complete
```

---

## Code References

### GameFlowManager.js

**Phase Management:**
- `checkSimultaneousPhaseCompletion()` - Monitors commitment updates
- `onSimultaneousPhaseComplete()` - Handles phase completion
- `transitionToPhase(newPhase)` - Transitions to next phase
- **Milestone Phase List** - `droneSelection` listed as a milestone phase where guest stops

**Networking:**
- Commitment system broadcast within phase completion
- Sends state to guest after commitments applied

### ActionProcessor.js

**Commitment Handling:**
- `processCommitment(playerId, phase, data)` - Processes player commitments
- Stores commitment data in `gameState.commitments[phase][playerId]`

### AIPhaseProcessor.js

**AI Processing:**
- `processDroneSelection()` - AI drone selection logic
- Random selection of 5 from 10 drones
- Auto-commits when complete

### App.jsx

**Phase Listening:**
- Phase Manager subscription useEffect
- Monitors `turnPhase` changes
- Displays DroneSelectionScreen when phase is active

### DroneSelectionScreen.jsx

**UI Component:**
- Displays 10 available drones
- Handles 5-drone selection interaction
- Calls commitment handler on confirm

---

## Notes

- This phase is never skipped - it's required for game initialization
- Players must select exactly 5 drones from their 10
- These 5 drones are the only drones available for deployment during the game
- **Milestone Phase:** Guest stops here and waits for host validation before proceeding
- This prevents desynchronization issues with drone rosters
- AI uses random selection (could be enhanced with personality-based strategies)
- The temporary selection state (`DroneSelectionTrio`, `DroneSelectionPool`) is UI-only and not persisted
