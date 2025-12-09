# PHASE 11: mandatoryDroneRemoval

**Phase Type:** Simultaneous
**Classification:** Round Loop
**Can Be Skipped:** Yes (if no player exceeds drone limit)
**Milestone Phase:** Yes (Guest stops here for validation)

---

## Phase Overview

The `mandatoryDroneRemoval` phase forces players to remove deployed drones if they exceed their CPU limit. This phase:
- Only occurs if at least one player has more drones than their CPU limit
- Both players must remove drones down to their CPU limit simultaneously
- Uses commitment system
- Milestone phase - guest stops for validation

---

## User Interactions

### UI Components

**Primary Components:**
- GameHeader.jsx - "Continue" button
- DronesView.jsx - Drone selection for removal

**User Actions:**
- Select drones to remove (must equal `excessDrones`)
- Click "Continue" to commit removal

### State Used for UI

- `gameState.excessDrones` - Calculated: `totalDrones - cpuLimit`
- Removal UI only shows if `excessDrones > 0`

**Interaction Flow:**

```
Player views deployed drones with excess indicator
    ↓
Player selects drones to remove (must equal excessDrones)
    ↓
Player clicks "Continue"
    ↓
Handler calls ActionProcessor.processCommitment()
    ↓
Commitment stored in gameState.commitments.mandatoryDroneRemoval
```

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'mandatoryDroneRemoval'`

**Drone Tracking:**
- `gameState.player1.deployedDrones` - All deployed drones
- `gameState.player1.cpuLimit` - From effective ship stats
- `gameState.excessDrones` - `totalDrones - cpuLimit`

**Commitment Structure:**
```javascript
gameState.commitments.mandatoryDroneRemoval = {
  player1: {
    completed: boolean,
    dronesRemoved: string[] // Array of drone IDs to remove
  },
  player2: {
    completed: boolean,
    dronesRemoved: string[]
  }
}
```

### State Transitions

**Entry Condition:**
- Previous phase: `allocateShields` (or `draw` if shields skipped)
- **Skip Condition:** Only entered if `anyPlayerExceedsDroneLimit()` returns true
- Method: `GameFlowManager.isPhaseRequired('mandatoryDroneRemoval')`

**Exit Condition:**
- Both `player1.completed` and `player2.completed` are `true`
- Detected by `GameFlowManager.checkSimultaneousPhaseCompletion()`

**Next Phase:**
- `deployment`

---

## State Listeners

### GameFlowManager.js

**Method: `checkSimultaneousPhaseCompletion()`**
- Monitors `commitments.mandatoryDroneRemoval` for updates
- Checks if both players have `completed: true`
- Calls `onSimultaneousPhaseComplete()` when both ready

**Method: `anyPlayerExceedsDroneLimit()`**
- Checks if this phase should run
- Returns true if any player's `totalDrones > cpuLimit`

---

## Flow Scenarios

### Player Exceeds Drone Limit

```
1. Phase begins: turnPhase = 'mandatoryDroneRemoval'
   player1.deployedDrones.length > player1.cpuLimit

2. Player 1:
   → Calculate excessDrones
   → Select that many drones to remove
   → Click "Continue"
   → commitments.mandatoryDroneRemoval.player1.completed = true

3. onSimultaneousPhaseComplete():
   → Remove selected drones from battlefield
   → Update deployedDrones arrays
   → Transition to deployment phase
```

### AI Behavior

**AIPhaseProcessor.executeMandatoryDroneRemovalTurn():**
- Calculates `excessDrones`
- Removal strategy:
  - Remove lowest class drones first (preserve expensive drones)
  - From strongest lanes (protects losing lanes)
  - Randomizes within same class
- Auto-commits

---

## Network Synchronization

### Host Responsibilities

1. Receives both commitments
2. Removes drones from battlefield
3. Broadcasts state after phase complete

### Guest Responsibilities

1. Commits drone removals locally (optimistic)
2. Sends commitment to host
3. **STOPS HERE** - Milestone phase
4. Waits for host broadcast
5. Validates removals applied

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              MANDATORY DRONE REMOVAL PHASE                   │
└─────────────────────────────────────────────────────────────┘

CHECK: Should phase run?
  │
  ├─> anyPlayerExceedsDroneLimit()?
  │   ├─> NO: Skip phase → Transition to deployment
  │   └─> YES: Enter phase
  │
  ├─> Set turnPhase = 'mandatoryDroneRemoval'
  │
  ├─> Calculate excessDrones for each player
  │
  ├─> PLAYER 1                        PLAYER 2
  │   │                               │
  │   ├─> If excessDrones > 0:        ├─> If excessDrones > 0:
  │   │   └─> Select drones to remove │   └─> Select drones to remove
  │   │   └─> Click "Continue"        │   └─> Click "Continue"
  │   │                               │
  │   └─> Commit removals             └─> Commit removals
  │
  ├─> Both commitments complete
  │
  ├─> Remove drones from battlefield
  │   └─> Update deployedDrones arrays
  │
  ├─> (Host) Broadcast
  │   (Guest) Validate - MILESTONE
  │
  └─> Transition to: deployment

END: Phase Complete
```

---

## Code References

### GameFlowManager.js
- `checkSimultaneousPhaseCompletion()` - Monitors commitments
- `anyPlayerExceedsDroneLimit()` - Skip condition check
- `isPhaseRequired('mandatoryDroneRemoval')` - Phase requirement logic

### GameHeader.jsx
- "Continue" button (renders when in mandatoryDroneRemoval phase)

### DronesView.jsx
- Drone selection UI for removal

### AIPhaseProcessor.js
- `executeMandatoryDroneRemovalTurn()` - AI removal logic
- Removes lowest class from strongest lanes

---

## Notes

- **Can be skipped** if no player exceeds CPU limit
- Milestone phase - guest stops for validation
- Players must remove exactly the excess amount
- AI preserves expensive drones and protects losing lanes
- CPU limit comes from effective ship stats
- Can trigger mid-game if CPU limit is reduced by effects
- Critical for maintaining game balance
