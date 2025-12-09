# PHASE 13: action

**Phase Type:** Sequential
**Classification:** Round Loop
**Can Be Skipped:** No
**Milestone Phase:** No (but triggers new round/back to determineFirstPlayer)

---

## Phase Overview

The `action` phase is the main gameplay phase where players play cards, attack with drones, and activate ship abilities. This phase:
- Players take turns based on current turn order
- Players can perform actions (play cards, attack, activate abilities) or pass
- Uses pass system (not commitment system)
- Phase ends when both players pass
- **After both pass:** Round increments and returns to `determineFirstPlayer` (or game ends)
- **`firstPasser` is critical** - determines next round's first player

**Important Note on Phase Transitions:**
The action phase is entered directly from the `deployment` phase. When this transition occurs, a "DEPLOYMENT COMPLETE" announcement plays as a **pseudo-phase** (announcement-only). This announcement does not modify game state - it's purely for player notification. The host queues this announcement automatically when transitioning deployment→action, while guests infer it from the phase transition.

---

## User Interactions

### UI Components

**Primary Components:**
- App.jsx - `handlePlayerPass()` handler
- GameHeader.jsx - "Pass" button
- HandView.jsx - Card play interactions
- Battlefield - Drone attack clicks
- ShipSectionCompact.jsx - Ship ability activation

**User Actions:**
- Play a card from hand
- Attack with a drone
- Activate ship section ability
- Click "Pass" to end turn

### Actions Available

**Play Card:**
- Select card from hand
- Target selection (if required)
- Spend energy cost
- Card effect resolves

**Attack:**
- Click attacking drone
- Select target (enemy drone or ship section)
- Combat resolution

**Activate Ability:**
- Click ship section to activate ability
- Pay activation cost
- Ability resolves

**Pass:**
- End turn without taking action
- Cannot perform more actions this phase

**Go-Again Actions:**
- Some cards/actions have "goAgain" keyword
- Player gets another action immediately
- Turn doesn't switch to opponent

### State Used for UI

- `gameState.currentPlayer` - Whose turn it is
- `gameState.passInfo.player1Passed` - Whether player 1 has passed
- `gameState.passInfo.player2Passed` - Whether player 2 has passed
- `gameState.player1.energy` - Energy available for cards/abilities
- `gameState.turn` - Turn counter (increments when both pass)

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'action'`
- `gameState.currentPlayer` - `'player1'` or `'player2'`
- `gameState.turn` - Increments when both players pass

**Pass Tracking:**
```javascript
gameState.passInfo = {
  player1Passed: boolean,
  player2Passed: boolean,
  firstPasser: string // 'player1' or 'player2' - CRITICAL for next round
}
```

**Round Tracking:**
- `gameState.roundNumber` - Increments when action phase completes
- `gameState.firstPasserOfPreviousRound` - Set from `passInfo.firstPasser`

### State Transitions

**Entry Condition:**
- Previous phase: `deployment` (direct transition)
- "DEPLOYMENT COMPLETE" announcement plays as pseudo-phase (announcement-only)
- Triggered by `GameFlowManager.transitionToPhase('action')`
- `currentPlayer` continues from deployment phase turn order

**Exit Condition:**
- Both `passInfo.player1Passed` and `passInfo.player2Passed` are `true`
- Detected by `GameFlowManager.handleActionCompletion()`

**Next Phase:**
- **Round Loop:** `GameFlowManager.startNewRound()` → `determineFirstPlayer`
- **Game Over:** If win condition met, `gameStage = 'gameOver'`

---

## State Listeners

### GameFlowManager.js

**Method: `handleActionCompletion(playerId, actionType)`**
- Monitors pass and action completions
- Handles pass logic:
  - Sets `passInfo[player]Passed = true`
  - **Tracks `firstPasser`** - critical for next round
  - Switches turn if only one passed
  - Triggers phase transition if both passed
- Handles action completions:
  - Switches turn after action (unless "goAgain")
  - Increments turn counter if both passed

**Method: `startNewRound()`**
- Called when both players pass in action phase
- Stores `firstPasser` as `firstPasserOfPreviousRound`
- Increments `roundNumber`
- Transitions to `determineFirstPlayer` phase

---

## Flow Scenarios

### Host Passes First

```
1. Phase begins: turnPhase = 'action'
   currentPlayer = determined by deployment phase flow

2. Host's turn:
   → Host clicks "Pass"
   → ActionProcessor.processPlayerPass('player1')
   → passInfo.player1Passed = true
   → passInfo.firstPasser = 'player1'
   → **This is recorded for NEXT round's first player determination**
   → PhaseAnimationQueue: "YOU PASSED"
   → Turn switches to guest

3. Guest's turn:
   → Guest can still take actions or pass
   → If guest takes action: Turn switches back to host (but host will pass again)
   → If guest passes: passInfo.player2Passed = true

4. Both passed:
   → GameFlowManager.handleActionCompletion() detects both passed
   → firstPasserOfPreviousRound = 'player1' (host passed first)
   → **Next round, player2 (guest) will go first**
   → roundNumber increments
   → Transition to 'determineFirstPlayer' for next round
```

### Guest Passes First

```
1. Phase in progress with guest's turn

2. Guest's turn:
   → Guest clicks "Pass"
   → ActionProcessor.processPlayerPass('player2')
   → Guest processes optimistically
   → passInfo.player2Passed = true
   → passInfo.firstPasser = 'player2'
   → **This is recorded for NEXT round**
   → Guest sends pass action to host
   → PhaseAnimationQueue: "YOU PASSED"
   → Turn switches to host

3. Host receives guest pass:
   → Host processes pass
   → Host updates passInfo.player2Passed = true
   → Host's turn begins

4. Host takes actions or passes:
   → If host passes: Both passed

5. Both passed:
   → Host detects completion
   → firstPasserOfPreviousRound = 'player2' (guest passed first)
   → **Next round, player1 (host) will go first**
   → roundNumber increments
   → Host broadcasts new round start
```

### Multiple Actions with Go-Again

```
1. Player's turn

2. Player plays card with "goAgain" keyword:
   → Card effect resolves
   → Player gets another action immediately
   → currentPlayer does NOT switch
   → Turn counter does NOT increment

3. Player takes another action:
   → Could be another goAgain action (chains)
   → Or regular action (turn ends)
   → Or pass

4. Eventually turn ends or player passes
```

### Actions During Turn

**Play Card:**
```
1. Player clicks card in hand
2. Target selection (if required)
3. ActionProcessor.queueAction({type: 'playCard', ...})
4. Energy spent
5. Card moves to discard/battlefield
6. Effect resolves
7. If goAgain: Player gets another action
8. Else: Turn switches to opponent
```

**Attack:**
```
1. Player clicks attacking drone
2. Player selects target
3. ActionProcessor.queueAction({type: 'attack', ...})
4. Combat resolution
5. Damage applied
6. Turn switches to opponent (attacks don't have goAgain typically)
```

**Activate Ability:**
```
1. Player clicks ship section
2. Pay activation cost (energy, etc.)
3. ActionProcessor.queueAction({type: 'ability', ...})
4. Ability effect resolves
5. Turn switches (unless ability has goAgain)
```

### AI Behavior

**AIPhaseProcessor.executeActionTurn():**
- Uses `aiBrain.handleOpponentAction()` for sophisticated decision-making
- Can choose to:
  - Play a card (with targeting)
  - Attack with a drone
  - Activate a ship ability
  - Pass
- AI considers:
  - Energy efficiency
  - Board state
  - Threat assessment
  - Win conditions
- AI can chain goAgain actions
- Eventually AI passes when no good actions remain

---

## Network Synchronization

### Host Responsibilities

**Pass Handling:**
1. Host receives own pass or guest pass
2. Host updates `passInfo`
3. **Host tracks `firstPasser`** - critical for next round
4. Host broadcasts pass state
5. If both passed:
   - Host stores `firstPasserOfPreviousRound`
   - Host increments `roundNumber`
   - Host calls `startNewRound()`
   - Host broadcasts new round state

**Action Handling:**
1. Host receives actions (cards, attacks, abilities)
2. Host processes and validates
3. Host broadcasts after action
4. Host switches turn (unless goAgain)

### Guest Responsibilities

**Pass Handling:**
1. Guest clicks pass
2. Guest processes optimistically (updates local `passInfo`)
3. Guest sends pass action to host
4. Guest shows "YOU PASSED" animation
5. Guest waits for host broadcast

**Action Handling:**
1. Guest performs action
2. Guest processes optimistically
3. Guest sends action to host
4. Guest waits for host confirmation

**Round Transition:**
1. When both pass, guest waits for host to broadcast new round
2. Guest receives broadcast with new `roundNumber`
3. Guest transitions to `determineFirstPlayer` phase
4. Guest continues optimistic cascade through automatic phases

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      ACTION PHASE                            │
└─────────────────────────────────────────────────────────────┘

START: Transition from deployment (direct)
  │
  ├─> "DEPLOYMENT COMPLETE" announcement queued (pseudo-phase)
  ├─> Set turnPhase = 'action'
  ├─> currentPlayer continues from deployment
  ├─> Reset passInfo: {player1Passed: false, player2Passed: false}
  │
  ├─> TURN LOOP:
  │   │
  │   ├─> Current Player's Turn
  │   │   │
  │   │   ├─> Option 1: Play Card
  │   │   │   └─> Select card, targets
  │   │   │   └─> Spend energy
  │   │   │   └─> Effect resolves
  │   │   │   └─> If goAgain: Stay on current player
  │   │   │   └─> Else: Switch turn
  │   │   │
  │   │   ├─> Option 2: Attack
  │   │   │   └─> Select attacker, target
  │   │   │   └─> Combat resolves
  │   │   │   └─> Switch turn
  │   │   │
  │   │   ├─> Option 3: Activate Ability
  │   │   │   └─> Pay cost
  │   │   │   └─> Effect resolves
  │   │   │   └─> If goAgain: Stay on current player
  │   │   │   └─> Else: Switch turn
  │   │   │
  │   │   └─> Option 4: Pass
  │   │       └─> ActionProcessor.processPlayerPass()
  │   │       └─> passInfo[player]Passed = true
  │   │       └─> If first to pass:
  │   │       │   └─> Set firstPasser = playerId
  │   │       │   └─> **CRITICAL: Determines next round's first player**
  │   │       └─> PhaseAnimationQueue: "YOU PASSED"
  │   │       └─> If opponent also passed: Exit loop
  │   │       └─> Else: Switch turn to opponent
  │   │
  │   └─> Check: Both players passed?
  │       ├─> NO: Continue turn loop
  │       └─> YES: Exit loop
  │
  ├─> GameFlowManager.handleActionCompletion() detects both passed
  │
  ├─> Store firstPasserOfPreviousRound = passInfo.firstPasser
  │   **This determines next round's first player**
  │   **Second passer goes first next round**
  │
  ├─> Increment turn counter
  │
  ├─> GameFlowManager.startNewRound()
  │   └─> Increment roundNumber
  │   └─> Transition to 'determineFirstPlayer'
  │
  ├─> (Host) Broadcast new round
  │
  └─> Transition to: determineFirstPlayer (Round 2+)
      OR gameOver (if win condition met)

END: Round Complete, New Round Begins

MULTIPLAYER NOTES:
- Guest processes actions optimistically
- Host validates and broadcasts
- firstPasser tracking is CRITICAL for next round
- Pass animations deduplicated on guest
- Round transition broadcast includes new roundNumber
```

---

## Code References

### GameFlowManager.js
- `handleActionCompletion(playerId, actionType)` - Pass and action handling
- `checkSequentialPhaseCompletion()` - Local mode completion check
- `switchTurn()` - Turn transitions
- `startNewRound()` - Round transition logic
- Stores `firstPasserOfPreviousRound` from `passInfo.firstPasser`

### ActionProcessor.js
- `processPlayerPass(playerId)` - Pass processing
- `queueAction()` - Queues all action types (cards, attacks, abilities)
- `processActionQueue()` - Executes queued actions

### AIPhaseProcessor.js
- `executeActionTurn()` - AI action decisions
- Uses `aiBrain.handleOpponentAction()` for sophisticated decision-making

### App.jsx
- `handlePlayerPass()` - Pass button handler

### GameHeader.jsx
- "Pass" button - Renders during sequential phases

### HandView.jsx
- Card click handlers for playing cards

### Battlefield Components
- Drone attack interactions
- Ship section ability clicks

---

## Network Synchronization

### Guest Opponent Pass Detection

When both players pass during action phase, guest uses phase transition inference to detect opponent pass and round completion:

**Detection Logic:**
1. Guest passes locally → sees "YOU PASSED" animation
2. Guest's `passInfo[localPlayerId]Passed` becomes `true`
3. Host also passes → action phase ends, round transitions
4. Host broadcasts state update with `turnPhase: 'roundInitialization'` (or other round phase)
5. Guest receives broadcast, detects `guestPhase='action'` → `hostPhase='roundInitialization'`
6. **Inference:** For action to end and round to transition, both players must have passed
7. Guest checks local `passInfo[localPlayerId]Passed === true`
8. If true, guest knows opponent also passed
9. Guest queues complete round transition sequence:
   - "OPPONENT PASSED"
   - "ACTION PHASE COMPLETE"
   - "ROUND X" (next round number)
   - [Next phase announcement, e.g., "UPKEEP"]

**Why This Works:**
- Action is a sequential phase requiring both players to pass before round can end
- If guest passed AND phase transitioned to new round, opponent must have also passed
- This eliminates need for explicit opponent pass notifications
- Guest sees complete announcement flow matching host's experience

**Implementation:** `GuestMessageQueueService.processStateUpdate()` lines 586-624

**Related:** See PHASE_FLOW_INDEX.md section "Guest Announcement Architecture" for complete explanation of pseudo-phase inference patterns.

---

## Notes

- **Most complex phase** - multiple action types, strategic decisions
- Uses pass system, not commitment system
- Both players must pass to end phase
- After passing, players can no longer take actions (even if opponent continues)
- **`firstPasser` is CRITICAL** - determines next round's first player
  - Player who passed SECOND goes first next round
  - Rewards aggressive play
- Turn counter increments when both pass (measures action cycles per round)
- **GoAgain Keyword** - Allows action chains without switching turns
- After phase completes, round increments and loops to `determineFirstPlayer`
- AI uses sophisticated brain for decision-making
- Guest processes actions optimistically but host is authoritative
- Pass order tracked and used for next round determination
- PhaseAnimationQueue shows pass animations
- Energy management is critical - players must balance resources
- Strategic depth: When to pass vs continue taking actions
