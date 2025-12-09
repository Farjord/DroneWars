# PHASE 01: deckSelection

**Phase Type:** Simultaneous
**Classification:** Pre-Game
**Can Be Skipped:** No
**Milestone Phase:** No

---

## Phase Overview

The `deckSelection` phase is the first phase of the game where players select their deck composition. This includes:
- Choosing 40 cards for their main deck
- Choosing 10 drones from available drone pool

This is a simultaneous phase, meaning both players make their selections independently and the game proceeds once both players have committed their choices.

---

## User Interactions

### UI Components

**Primary Component:**
- DeckSelectionScreen.jsx (referenced but not fully analyzed)

**User Actions:**
- Select 40 cards from available card pool
- Select 10 drones from available drone types
- Click "Confirm" or similar button to commit selection

### Interaction Flow

```
Player views available cards and drones
    ↓
Player selects 40 cards
    ↓
Player selects 10 drones
    ↓
Player clicks "Confirm" button
    ↓
Handler calls ActionProcessor.processCommitment()
    ↓
Commitment stored in gameState.commitments.deckSelection
```

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'deckSelection'`
- `gameState.gameStage = 'preGame'`

**Commitment Structure:**
```javascript
gameState.commitments.deckSelection = {
  player1: {
    completed: boolean,
    drones: string[] // Array of drone names (length: 10)
  },
  player2: {
    completed: boolean,
    drones: string[] // Array of drone names (length: 10)
  }
}
```

### State Transitions

**Entry Condition:**
- First phase of the game
- Triggered by `GameFlowManager.startGameFlow()`

**Exit Condition:**
- Both `player1.completed` and `player2.completed` are `true`
- Detected by `GameFlowManager.checkSimultaneousPhaseCompletion()`

**Next Phase:**
- `droneSelection`

---

## State Listeners

### GameFlowManager.js

**Method: `checkSimultaneousPhaseCompletion()`**
- Monitors the `commitments` object for updates
- Triggered when commitments are updated via ActionProcessor
- Checks if both players have `completed: true`
- Calls `onSimultaneousPhaseComplete()` when both are ready

**Method: `onSimultaneousPhaseComplete()`**
- Applies committed data to gameState
- Transitions to next phase

### App.jsx

**Phase Transition Listener (useEffect):**
- Subscribes to GameFlowManager phase changes
- Updates UI state when phase transitions occur
- Clears any waiting overlays

---

## Flow Scenarios

### Both Players Simultaneous (Standard Flow)

Since this is a simultaneous phase, there is no "Host First" or "Guest First" distinction during selection. Both players select independently.

```
1. Phase begins: turnPhase = 'deckSelection'

2. Player 1 selects cards and drones
   Player 2 selects cards and drones
   (Happening simultaneously, independently)

3. Player 1 clicks "Confirm"
   → commitments.deckSelection.player1.completed = true
   → If Player 2 not done: Show "Waiting for opponent..." overlay

4. Player 2 clicks "Confirm"
   → commitments.deckSelection.player2.completed = true
   → checkSimultaneousPhaseCompletion() detects both complete

5. onSimultaneousPhaseComplete() triggered
   → Applies committed drone selections to player decks
   → Transitions to 'droneSelection' phase
```

### Local Mode (vs AI)

```
1. Phase begins: turnPhase = 'deckSelection'

2. Human player selects cards and drones

3. AI automatically processes deck selection via AIPhaseProcessor

4. AIPhaseProcessor.processDeckSelection() executes:
   → AI uses personality-based deck building
   → AI selects from personality.decklist
   → AI selects from personality.dronePool
   → AI commitment automatically set to completed

5. Human player clicks "Confirm"
   → Both commitments complete
   → Phase transitions to 'droneSelection'
```

### Multiplayer - Host/Guest

**Phase Execution:**
1. Both Host and Guest select independently
2. Each commits locally
3. Commitments synced via network
4. When both complete, host processes phase transition
5. Host broadcasts state to guest

**Guest Behavior:**
- Commits selection optimistically
- Sends commitment data to host
- Waits for both commitments to complete
- Host validates and broadcasts phase transition

---

## AI Behavior

### AIPhaseProcessor Method

**Method: `processDeckSelection()`**

**AI Logic:**
1. Retrieves AI personality configuration
2. Selects 40 cards from `personality.decklist`
3. Selects 5-10 drones from `personality.dronePool`
4. Commits selection automatically

**Personality-Based Selection:**
- Different AI personalities have different decklists
- Aggressive personalities favor attack cards
- Economic personalities favor resource generation
- Balanced personalities have mixed strategies

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
3. Host broadcasts state after drone selection data applied
4. Broadcast includes drone selections for both players
5. Guest receives broadcast and validates

### Guest Responsibilities

**Commitment Processing:**
1. Guest selects cards and drones
2. Guest commits locally (optimistic)
3. Guest sends commitment to host
4. Guest shows "Waiting for opponent..." if host not committed

**Receiving Broadcast:**
1. Guest receives host broadcast with both selections
2. Guest validates received data matches local commitment
3. Guest updates opponent's selection data
4. Guest proceeds to next phase

### Broadcast Method

**GameFlowManager.js:**
- Method: `broadcastStateAfterPhaseTransition()` (called from within phase completion handling)
- Sends updated gameState to guest
- Includes drone selection data for synchronization

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DECK SELECTION PHASE                      │
└─────────────────────────────────────────────────────────────┘

START: GameFlowManager.startGameFlow()
  │
  ├─> Set turnPhase = 'deckSelection'
  │
  ├─> PLAYER 1 (Human/Host)           PLAYER 2 (AI/Guest)
  │   │                               │
  │   ├─> UI: DeckSelectionScreen    ├─> AIPhaseProcessor.processDeckSelection()
  │   │   └─> Select 40 cards         │   └─> Auto-select from personality.decklist
  │   │   └─> Select 10 drones        │   └─> Auto-select from personality.dronePool
  │   │                               │
  │   ├─> Click "Confirm"             ├─> Auto-commit
  │   │                               │
  │   └─> commitments.deckSelection   └─> commitments.deckSelection
  │       .player1.completed = true       .player2.completed = true
  │       .player1.drones = [...]         .player2.drones = [...]
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
  │   ├─> Apply drone selections to player decks
  │   │
  │   └─> (Host) Broadcast state to Guest
  │
  └─> Transition to next phase: 'droneSelection'

END: Phase Complete
```

---

## Code References

### GameFlowManager.js

**Phase Management:**
- `startGameFlow()` - Initiates the game, sets phase to 'deckSelection'
- `checkSimultaneousPhaseCompletion()` - Monitors commitment updates
- `onSimultaneousPhaseComplete()` - Handles phase completion
- `transitionToPhase(newPhase)` - Transitions to next phase

**Networking:**
- `broadcastStateAfterPhaseTransition()` - Sends state to guest after commitments applied

### ActionProcessor.js

**Commitment Handling:**
- `processCommitment(playerId, phase, data)` - Processes player commitments
- Stores commitment data in `gameState.commitments[phase][playerId]`

### AIPhaseProcessor.js

**AI Processing:**
- `processDeckSelection()` - AI deck building logic
- Uses personality configuration for deck composition
- Auto-commits when complete

### App.jsx

**Phase Listening:**
- Phase Manager subscription useEffect
- Monitors `turnPhase` changes
- Updates UI state accordingly

---

## Notes

- This phase is never skipped - it's required for game initialization
- Deck selection includes both cards and drones
- The 10 drones selected here will be reduced to 5 in the next phase (droneSelection)
- AI personalities determine deck composition strategies
- This is the first phase where the commitment system is used
- Not a milestone phase - guest doesn't stop here for validation
