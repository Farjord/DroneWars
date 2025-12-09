# PHASE 07: mandatoryDiscard

**Phase Type:** Simultaneous
**Classification:** Round Loop
**Can Be Skipped:** Yes (if no player exceeds hand limit)
**Milestone Phase:** Yes (Guest stops here for validation)

---

## Phase Overview

The `mandatoryDiscard` phase forces players to discard cards if their hand exceeds their hand limit. This phase:
- Only occurs if at least one player has more cards than their hand limit
- Both players must discard down to their hand limit simultaneously
- Uses the commitment system
- Milestone phase - guest stops for validation

---

## User Interactions

### UI Components

**Primary Components:**
- App.jsx - Calculates `shouldShowDiscardUI`
- GameHeader.jsx - "Continue" button
- HandView.jsx - Card selection for discard

**User Actions:**
- Select cards from hand to discard
- Must select exactly `excessCards` number of cards
- Click "Continue" to commit discards

### State Used for UI

- `gameState.excessCards` - Calculated: `hand.length - handLimit`
- Discard UI only shows if `excessCards > 0`

**Interaction Flow:**

```
Player views hand with excess cards indicator
    ↓
Player selects cards to discard (must equal excessCards)
    ↓
Player clicks "Continue"
    ↓
Handler calls ActionProcessor.processCommitment()
    ↓
Commitment stored in gameState.commitments.mandatoryDiscard
```

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'mandatoryDiscard'`

**Hand & Limit:**
- `gameState.player1.hand` - Array of cards
- `gameState.player1.handLimit` - From effective ship stats
- `gameState.excessCards` - `hand.length - handLimit`

**Commitment Structure:**
```javascript
gameState.commitments.mandatoryDiscard = {
  player1: {
    completed: boolean,
    cardsDiscarded: string[] // Array of card IDs discarded
  },
  player2: {
    completed: boolean,
    cardsDiscarded: string[]
  }
}
```

### State Transitions

**Entry Condition:**
- Previous phase: `energyReset`
- **Skip Condition:** Only entered if `anyPlayerExceedsHandLimit()` returns true
- Method: `GameFlowManager.isPhaseRequired('mandatoryDiscard')`

**Exit Condition:**
- Both `player1.completed` and `player2.completed` are `true`
- Detected by `GameFlowManager.checkSimultaneousPhaseCompletion()`

**Next Phase:**
- `optionalDiscard` (if players have cards)
- `draw` (if no players have cards)

---

## State Listeners

### GameFlowManager.js

**Method: `checkSimultaneousPhaseCompletion()`**
- Monitors `commitments.mandatoryDiscard` for updates
- Checks if both players have `completed: true`
- Calls `onSimultaneousPhaseComplete()` when both ready

**Method: `anyPlayerExceedsHandLimit()`**
- Checks if this phase should run
- Returns true if any player's `hand.length > handLimit`

### App.jsx

**UI Calculation:**
- `shouldShowDiscardUI` calculation - Shows discard interface if `excessCards > 0`
- Phase transition listener clears waiting overlays

---

## Flow Scenarios

### Both Players Exceed Hand Limit

```
1. Phase begins: turnPhase = 'mandatoryDiscard'
   player1.hand.length > player1.handLimit
   player2.hand.length > player2.handLimit

2. Both players:
   → Calculate excessCards
   → Select that many cards to discard
   → Click "Continue"

3. Player 1 confirms:
   → commitments.mandatoryDiscard.player1.completed = true
   → commitments.mandatoryDiscard.player1.cardsDiscarded = [card IDs]
   → Show "Waiting for opponent..." if player 2 not done

4. Player 2 confirms:
   → commitments.mandatoryDiscard.player2.completed = true
   → Both complete

5. onSimultaneousPhaseComplete():
   → Apply discards to both players' hands
   → Move discarded cards to discard pile
   → Transition to next phase
```

### Only One Player Exceeds Limit

```
1. Phase begins: turnPhase = 'mandatoryDiscard'
   player1.hand.length > player1.handLimit
   player2.hand.length <= player2.handLimit

2. Player 1:
   → Must discard excess cards
   → Selects cards and clicks "Continue"

3. Player 2:
   → No excess cards
   → Automatically commits (no action required)
   → Or clicks "Continue" immediately

4. Both commitments complete
   → Transition to next phase
```

### AI Behavior

**AIPhaseProcessor.executeMandatoryDiscardTurn():**
- Calculates `excessCards`
- Selection strategy: Discard lowest cost cards first
- Randomizes selection within same cost
- Auto-commits

---

## Network Synchronization

### Host Responsibilities

1. Receives both commitments
2. Applies discards to hands
3. Moves cards to discard piles
4. Broadcasts state after phase complete

### Guest Responsibilities

1. Commits discards locally (optimistic)
2. Sends commitment to host
3. **STOPS HERE** - Milestone phase
4. Waits for host broadcast
5. Validates discards applied

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  MANDATORY DISCARD PHASE                     │
└─────────────────────────────────────────────────────────────┘

CHECK: Should phase run?
  │
  ├─> anyPlayerExceedsHandLimit()?
  │   ├─> NO: Skip phase → Transition to optionalDiscard/draw
  │   └─> YES: Enter phase
  │
  ├─> Set turnPhase = 'mandatoryDiscard'
  │
  ├─> Calculate excessCards for each player
  │
  ├─> PLAYER 1                        PLAYER 2
  │   │                               │
  │   ├─> If excessCards > 0:         ├─> If excessCards > 0:
  │   │   └─> Select cards to discard │   └─> Select cards to discard
  │   │   └─> Click "Continue"        │   └─> Click "Continue"
  │   │                               │
  │   └─> Commit discards             └─> Commit discards
  │
  ├─> Both commitments complete
  │
  ├─> Apply discards to hands
  │   └─> Move cards to discard piles
  │
  ├─> (Host) Broadcast
  │   (Guest) Validate - MILESTONE
  │
  └─> Transition to: optionalDiscard or draw

END: Phase Complete
```

---

## Code References

### GameFlowManager.js
- `checkSimultaneousPhaseCompletion()` - Monitors commitments
- `anyPlayerExceedsHandLimit()` - Skip condition check
- `isPhaseRequired('mandatoryDiscard')` - Phase requirement logic

### App.jsx
- `shouldShowDiscardUI` calculation
- Phase transition listener

### GameHeader.jsx
- "Continue" button (renders when in mandatoryDiscard phase)

### HandView.jsx
- Card selection UI for discards

### AIPhaseProcessor.js
- `executeMandatoryDiscardTurn()` - AI discard logic
- Discards lowest cost cards first

---

## Notes

- **Can be skipped** if no player exceeds hand limit
- Milestone phase - guest stops for validation
- Players can only discard exactly the excess amount
- AI discards lowest cost cards (preserves high-value cards)
- Uses commitment system like other simultaneous phases
- If one player has no excess, they auto-commit
- Critical for maintaining hand limit rules
