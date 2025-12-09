# PHASE 10: allocateShields

**Phase Type:** Simultaneous
**Classification:** Round Loop
**Can Be Skipped:** Yes (Round 1 only - no shields to allocate)
**Milestone Phase:** Yes (Guest stops here for validation)

---

## Phase Overview

The `allocateShields` phase allows players to distribute shields across their ship sections. This phase:
- **Only occurs in Round 2+** (Round 1 has no shields to allocate)
- Players distribute `shieldsToAllocate` shields across their 3 ship sections
- Uses commitment system
- Milestone phase - guest stops for validation

---

## User Interactions

### UI Components

**Primary Components:**
- App.jsx - `handleConfirmShields()` handler
- GameHeader.jsx - "Reset" and "Confirm" buttons
- ShipSectionCompact.jsx - Click to add shields to sections

**User Actions:**
- Click on ship sections to allocate shields
- Distribute all `shieldsToAllocate` shields across sections
- Click "Reset" to clear and restart allocation
- Click "Confirm" to commit allocation

### State Used for UI

- `gameState.shieldsToAllocate` - Total shields to distribute
- `gameState.opponentShieldsToAllocate` - Opponent's shield count
- `gameState.player1.shipSections[sectionName].allocatedShields` - Shields assigned to each section

**Interaction Flow:**

```
Player views ship sections and shieldsToAllocate count
    ↓
Player clicks sections to add shields (distributed UI interaction)
    ↓
All shields allocated
    ↓
Player clicks "Confirm"
    ↓
Handler calls ActionProcessor.processCommitment()
    ↓
Commitment stored in gameState.commitments.allocateShields
```

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'allocateShields'`

**Shield Allocation:**
- `gameState.shieldsToAllocate` - Number of shields to distribute
- `gameState.opponentShieldsToAllocate` - Opponent's shields
- `gameState.player1.shipSections[sectionName].allocatedShields` - Per-section allocation

**Commitment Structure:**
```javascript
gameState.commitments.allocateShields = {
  player1: {
    completed: boolean,
    shieldAllocations: {
      [sectionName]: number // Shields allocated to each section
    }
  },
  player2: {
    completed: boolean,
    shieldAllocations: {
      [sectionName]: number
    }
  }
}
```

### State Transitions

**Entry Condition:**
- Previous phase: `draw`
- **Skip Condition:** Only entered if `anyPlayerHasShieldsToAllocate()` returns true
- **Round 1 is always skipped** (no shields calculated in energyReset for Round 1)
- Method: `GameFlowManager.isPhaseRequired('allocateShields')`

**Exit Condition:**
- Both `player1.completed` and `player2.completed` are `true`
- Detected by `GameFlowManager.checkSimultaneousPhaseCompletion()`

**Next Phase:**
- `mandatoryDroneRemoval` (if players exceed drone limit)
- `deployment` (if no excess drones)

---

## State Listeners

### GameFlowManager.js

**Method: `checkSimultaneousPhaseCompletion()`**
- Monitors `commitments.allocateShields` for updates
- Checks if both players have `completed: true`
- Calls `onSimultaneousPhaseComplete()` when both ready

**Method: `anyPlayerHasShieldsToAllocate()`**
- Checks if this phase should run
- Returns true if any player has `shieldsToAllocate > 0`
- Always false in Round 1

### App.jsx

**Handler: `handleConfirmShields()`**
- Validates all shields distributed
- Commits shield allocations
- Shows waiting overlay if opponent hasn't committed
- Phase transition listener clears overlay when complete

---

## Flow Scenarios

### Round 1 - Phase Skipped

```
1. Check: anyPlayerHasShieldsToAllocate()
   → roundNumber === 1
   → shieldsToAllocate === 0 (not calculated in energyReset for Round 1)
   → Returns false

2. Phase skipped entirely
   → Transition directly to mandatoryDroneRemoval or deployment
```

### Round 2+ - Both Players Allocate

```
1. Phase begins: turnPhase = 'allocateShields'
   roundNumber >= 2
   shieldsToAllocate > 0 (from energyReset phase)

2. Player 1:
   → Clicks ship sections to distribute shields
   → Must allocate all shieldsToAllocate
   → Clicks "Confirm"
   → commitments.allocateShields.player1.completed = true

3. Player 2:
   → Allocates shields
   → Clicks "Confirm"
   → commitments.allocateShields.player2.completed = true

4. onSimultaneousPhaseComplete():
   → Apply shield allocations to ship sections
   → Add allocatedShields to existing section shields
   → Transition to next phase
```

### AI Behavior

**AIPhaseProcessor.executeShieldAllocationTurn():**
- Distributes `shieldsToAllocate` evenly across all sections
- Uses round-robin distribution
- Example: 5 shields, 3 sections → 2, 2, 1 distribution
- Auto-commits

---

## Network Synchronization

### Host Responsibilities

1. Receives both commitments
2. Applies shield allocations to ship sections
3. Broadcasts state after phase complete

### Guest Responsibilities

1. Commits shield allocations locally (optimistic)
2. Applies allocations locally
3. Sends commitment to host
4. **STOPS HERE** - Milestone phase
5. Waits for host broadcast
6. Validates allocations applied

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 ALLOCATE SHIELDS PHASE                       │
└─────────────────────────────────────────────────────────────┘

CHECK: Should phase run?
  │
  ├─> anyPlayerHasShieldsToAllocate()?
  │   ├─> Round 1: Always NO → Skip phase
  │   └─> Round 2+: Check shieldsToAllocate > 0
  │       ├─> NO: Skip phase
  │       └─> YES: Enter phase
  │
  ├─> Set turnPhase = 'allocateShields'
  │
  ├─> PLAYER 1                        PLAYER 2
  │   │                               │
  │   ├─> Click sections to add       ├─> Click sections to add
  │   │   shields                     │   shields
  │   │                               │
  │   ├─> Distribute all shields      ├─> Distribute all shields
  │   │                               │
  │   ├─> Click "Confirm"             ├─> Click "Confirm"
  │   │                               │
  │   └─> Commit allocations          └─> Commit allocations
  │
  ├─> Both commitments complete
  │
  ├─> Apply shield allocations
  │   └─> For each section: section.shields += allocatedShields
  │
  ├─> (Host) Broadcast
  │   (Guest) Validate - MILESTONE
  │
  └─> Transition to: mandatoryDroneRemoval or deployment

END: Phase Complete
```

---

## Code References

### GameFlowManager.js
- `checkSimultaneousPhaseCompletion()` - Monitors commitments
- `anyPlayerHasShieldsToAllocate()` - Skip condition check
- `isPhaseRequired('allocateShields')` - Phase requirement logic

### App.jsx
- `handleConfirmShields()` - Confirmation handler
- Shows waiting overlay if opponent not committed
- Phase transition listener

### GameHeader.jsx
- "Reset" button - Clears allocation and starts over
- "Confirm" button - Commits allocation

### ShipSectionCompact.jsx
- Click handler to add shields to section
- Displays current allocation

### AIPhaseProcessor.js
- `executeShieldAllocationTurn()` - AI allocation logic
- Even round-robin distribution across sections

---

## Notes

- **Always skipped in Round 1** (no shields calculated)
- Milestone phase - guest stops for validation
- Players must allocate ALL shields before confirming
- Cannot save shields for later
- AI uses simple even distribution strategy
- Shield allocations are additive (added to existing section shields)
- Strategic phase - players choose which sections to protect
- "Reset" button allows players to restart allocation if they change their mind
- Waiting overlay shows if opponent hasn't finished allocation
