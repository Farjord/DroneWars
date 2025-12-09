# PHASE 08: optionalDiscard

**Phase Type:** Simultaneous
**Classification:** Round Loop
**Can Be Skipped:** Yes (if no players have cards)
**Milestone Phase:** Yes (Guest stops here for validation)

---

## Phase Overview

The `optionalDiscard` phase allows players to voluntarily discard cards and draw back to their hand limit. This phase:
- Only occurs if at least one player has cards in hand
- Players can discard up to their `discardLimit` (from ship stats)
- After discarding, players draw back to their hand limit
- Uses the commitment system
- Milestone phase - guest stops for validation

---

## User Interactions

### UI Components

**Primary Components:**
- App.jsx - Manages `optionalDiscardCount` state
- GameHeader.jsx - "Confirm" button
- HandView.jsx - Card selection for optional discard

**User Actions:**
- Optionally select cards from hand to discard (0 to `discardLimit`)
- Click "Confirm" to commit (even if discarding 0 cards)
- After committing, draws occur to reach hand limit

### State Used for UI

- `gameState.localPlayerEffectiveStats.totals.discardLimit` - Max optional discards allowed
- `gameState.optionalDiscardCount` - Tracks how many cards player wants to discard
- UI allows selecting 0 to `discardLimit` cards

**Interaction Flow:**

```
Player views hand and discardLimit
    ↓
Player optionally selects 0-discardLimit cards
    ↓
Player clicks "Confirm"
    ↓
Handler calls ActionProcessor.processCommitment()
    ↓
Commitment includes discarded cards + draws back to hand limit
```

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'optionalDiscard'`

**Discard Tracking:**
- `gameState.optionalDiscardCount` - Number of cards player chose to discard
- `gameState.localPlayerEffectiveStats.totals.discardLimit` - Max allowed

**Commitment Structure:**
```javascript
gameState.commitments.optionalDiscard = {
  player1: {
    completed: boolean,
    cardsDiscarded: string[], // Optional discards (0 to discardLimit)
    cardsDrawn: number // How many drawn after discard
  },
  player2: {
    completed: boolean,
    cardsDiscarded: string[],
    cardsDrawn: number
  }
}
```

### State Transitions

**Entry Condition:**
- Previous phase: `mandatoryDiscard` (or `energyReset` if mandatory skipped)
- **Skip Condition:** Only entered if `anyPlayerHasCards()` returns true
- Method: `GameFlowManager.isPhaseRequired('optionalDiscard')`

**Exit Condition:**
- Both `player1.completed` and `player2.completed` are `true`
- Detected by `GameFlowManager.checkSimultaneousPhaseCompletion()`

**Next Phase:**
- `draw` (automatic card draw phase)

---

## State Listeners

### GameFlowManager.js

**Method: `checkSimultaneousPhaseCompletion()`**
- Monitors `commitments.optionalDiscard` for updates
- Checks if both players have `completed: true`
- Calls `onSimultaneousPhaseComplete()` when both ready

**Method: `anyPlayerHasCards()`**
- Checks if this phase should run
- Returns true if any player has cards in hand

### App.jsx

**UI State:**
- `optionalDiscardCount` state tracks player's discard selection
- Phase transition listener clears waiting overlays

---

## Flow Scenarios

### Both Players Discard

```
1. Phase begins: turnPhase = 'optionalDiscard'
   Both players have cards in hand

2. Player 1:
   → Select 0-discardLimit cards
   → Click "Confirm"
   → commitments.optionalDiscard.player1.completed = true
   → commitments.optionalDiscard.player1.cardsDiscarded = [selected cards]

3. Player 2:
   → Select 0-discardLimit cards
   → Click "Confirm"
   → commitments.optionalDiscard.player2.completed = true

4. onSimultaneousPhaseComplete():
   → Apply discards to hands
   → Calculate draws needed to reach hand limit
   → Draw cards for both players
   → Transition to 'draw' phase
```

### Player Chooses Not to Discard

```
1. Player sees optionalDiscard phase
2. Player selects 0 cards (or doesn't select any)
3. Player clicks "Confirm"
   → commitments.optionalDiscard.player.completed = true
   → commitments.optionalDiscard.player.cardsDiscarded = []
   → No cards discarded, but player still draws to hand limit
```

### AI Behavior

**AIPhaseProcessor.executeOptionalDiscardTurn():**
- Can discard 0 to `discardLimit` cards
- Strategy: May discard low-value cards to refresh hand
- Draws back to hand limit after discarding
- Auto-commits

---

## Network Synchronization

### Host Responsibilities

1. Receives both commitments
2. Applies optional discards
3. Processes draws to hand limit
4. Broadcasts state after phase complete

### Guest Responsibilities

1. Commits optional discards locally (optimistic)
2. Processes draws locally
3. Sends commitment to host
4. **STOPS HERE** - Milestone phase
5. Waits for host broadcast
6. Validates discards and draws applied

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 OPTIONAL DISCARD PHASE                       │
└─────────────────────────────────────────────────────────────┘

CHECK: Should phase run?
  │
  ├─> anyPlayerHasCards()?
  │   ├─> NO: Skip phase → Transition to draw
  │   └─> YES: Enter phase
  │
  ├─> Set turnPhase = 'optionalDiscard'
  │
  ├─> PLAYER 1                        PLAYER 2
  │   │                               │
  │   ├─> Select 0-discardLimit cards ├─> Select 0-discardLimit cards
  │   │                               │
  │   ├─> Click "Confirm"             ├─> Click "Confirm"
  │   │                               │
  │   └─> Commit selection            └─> Commit selection
  │
  ├─> Both commitments complete
  │
  ├─> Apply optional discards
  │   └─> Move selected cards to discard piles
  │
  ├─> Draw cards to hand limit
  │   └─> For each player: draw until hand.length === handLimit
  │
  ├─> (Host) Broadcast
  │   (Guest) Validate - MILESTONE
  │
  └─> Transition to: draw

END: Phase Complete
```

---

## Code References

### GameFlowManager.js
- `checkSimultaneousPhaseCompletion()` - Monitors commitments
- `anyPlayerHasCards()` - Skip condition check
- `isPhaseRequired('optionalDiscard')` - Phase requirement logic

### App.jsx
- `optionalDiscardCount` state management
- Phase transition listener

### GameHeader.jsx
- "Confirm" button (renders when in optionalDiscard phase)
- "Reset" button to clear selection

### HandView.jsx
- Card selection UI for optional discards

### AIPhaseProcessor.js
- `executeOptionalDiscardTurn()` - AI optional discard logic

---

## Notes

- **Can be skipped** if no players have cards
- Milestone phase - guest stops for validation
- Players can choose to discard 0 cards (but must still confirm)
- `discardLimit` comes from effective ship stats
- After discarding, players immediately draw to hand limit
- This provides hand cycling/refresh opportunity
- AI may use this strategically to improve hand quality
- Drawing happens within this phase, before the 'draw' phase
- The subsequent 'draw' phase is the main round draw
