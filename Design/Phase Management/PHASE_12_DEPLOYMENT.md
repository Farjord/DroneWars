# PHASE 12: deployment

**Phase Type:** Sequential
**Classification:** Round Loop
**Can Be Skipped:** No
**Milestone Phase:** Yes (Guest stops here for validation)

---

## Phase Overview

The `deployment` phase is a sequential turn-based phase where players deploy drones to the battlefield. This phase:
- Players take turns based on `firstPlayerOfRound`
- Players can deploy drones or pass
- Uses pass system (not commitment system)
- Phase ends when both players pass
- Milestone phase - guest stops for validation

**Important Note on Phase Transitions:**
When deployment phase completes (both players pass), the game transitions directly to `action` phase. However, there is an intermediate announcement called "DEPLOYMENT COMPLETE" that plays before the action phase begins. This is a **pseudo-phase** (announcement-only) and does not modify game state. The host queues this announcement automatically, while guests infer it from the deployment→action transition.

---

## User Interactions

### UI Components

**Primary Components:**
- App.jsx - `handlePlayerPass()` handler
- GameHeader.jsx - "Pass" button
- DronesView.jsx - Drone deployment clicks
- Deployment confirmation modal

**User Actions:**
- Click on a drone to deploy it (spends deployment budget)
- Click "Pass" to end turn without deploying
- Confirm deployment via modal

### State Used for UI

- `gameState.currentPlayer` - Whose turn it is
- `gameState.passInfo.player1Passed` - Whether player 1 has passed
- `gameState.passInfo.player2Passed` - Whether player 2 has passed
- `gameState.deploymentBudget` (or `initialDeploymentBudget` for Round 1)

**Interaction Flow:**

```
Player's turn begins
    ↓
Player chooses action:
    ├─> Deploy drone → Confirmation → ActionProcessor.queueAction()
    └─> Pass → ActionProcessor.processPlayerPass()
    ↓
If action taken: Turn switches to opponent
If passed: passInfo updated, turn switches if opponent hasn't passed
    ↓
Both players pass → Phase complete
```

---

## State Management

### GameState Attributes

**Phase Tracking:**
- `gameState.turnPhase = 'deployment'`
- `gameState.currentPlayer` - `'player1'` or `'player2'`

**Pass Tracking:**
```javascript
gameState.passInfo = {
  player1Passed: boolean,
  player2Passed: boolean,
  firstPasser: string // 'player1' or 'player2'
}
```

**Deployment Resources:**
- Round 1: `initialDeploymentBudget`
- Round 2+: `deploymentBudget`

### State Transitions

**Entry Condition:**
- Previous phase: `mandatoryDroneRemoval` (or `allocateShields`/`draw` if skipped)
- Triggered by `GameFlowManager.transitionToPhase('deployment')`
- `currentPlayer` set to `firstPlayerOfRound`

**Exit Condition:**
- Both `passInfo.player1Passed` and `passInfo.player2Passed` are `true`
- Detected by `GameFlowManager.handleActionCompletion()`

**Next Phase:**
- `action` (direct transition)
- "DEPLOYMENT COMPLETE" announcement plays as pseudo-phase (announcement-only)

---

## State Listeners

### GameFlowManager.js

**Method: `handleActionCompletion(playerId, actionType)`**
- Monitors pass and action completions
- Handles pass logic:
  - Sets `passInfo[player]Passed = true`
  - Tracks `firstPasser`
  - Switches turn if only one passed
  - Triggers phase transition if both passed
- Handles action completions:
  - Switches turn after deployment

**Method: `checkSequentialPhaseCompletion()` (local mode only)**
- Monitors `passInfo` for both players passing

---

## Flow Scenarios

### Host Passes First

```
1. Phase begins: turnPhase = 'deployment'
   currentPlayer = 'player1' (host is first player)

2. Host's turn:
   → Host clicks "Pass"
   → ActionProcessor.processPlayerPass('player1')
   → passInfo.player1Passed = true
   → passInfo.firstPasser = 'player1'
   → PhaseAnimationQueue: "YOU PASSED"
   → Turn switches to guest

3. Guest's turn:
   → Guest can still deploy or pass
   → If guest deploys: Turn switches back to host (but host will pass again)
   → If guest passes: passInfo.player2Passed = true

4. Both passed:
   → GameFlowManager.handleActionCompletion() detects both passed
   → Transition to 'action' phase
   → "DEPLOYMENT COMPLETE" announcement queued (pseudo-phase)
```

### Guest Passes First

```
1. Phase begins: turnPhase = 'deployment'
   currentPlayer = 'player2' (guest is first player)

2. Guest's turn:
   → Guest clicks "Pass"
   → ActionProcessor.processPlayerPass('player2')
   → Guest processes optimistically
   → passInfo.player2Passed = true
   → passInfo.firstPasser = 'player2'
   → Guest sends pass action to host
   → PhaseAnimationQueue: "YOU PASSED"
   → Turn switches to host

3. Host receives guest pass:
   → Host processes pass
   → Host updates passInfo.player2Passed = true
   → Host's turn begins

4. Host can still deploy or pass:
   → If host deploys: Turn switches back to guest (but guest will pass again)
   → If host passes: Both passed

5. Both passed:
   → Host detects completion
   → Host broadcasts state transition
   → Guest receives confirmation
```

### Both Players Deploy Multiple Times

```
1. Phase begins with player1 first

2. Player 1 deploys drone:
   → Spends deployment budget
   → Turn switches to player 2

3. Player 2 deploys drone:
   → Spends deployment budget
   → Turn switches to player 1

4. (Pattern repeats until deployments exhausted or players choose to pass)

5. Eventually both pass:
   → Phase completes
```

### AI Behavior

**AIPhaseProcessor.executeDeploymentTurn():**
- Uses `aiBrain.handleOpponentTurn()` for decision making
- Can choose to:
  - Deploy a drone (spends budget, ends turn)
  - Pass (ends turn, sets passed flag)
- Deployment automatically ends AI's turn
- AI strategy considers:
  - Available deployment budget
  - Optimal drone choices
  - Lane positioning

---

## Network Synchronization

### Host Responsibilities

**Pass Handling:**
1. Host receives own pass or guest pass
2. Host updates `passInfo`
3. Host broadcasts pass state
4. If both passed: Host transitions phase and broadcasts

**Action Handling:**
1. Host receives deployment actions
2. Host processes and validates
3. Host broadcasts after action
4. Host switches turn

### Guest Responsibilities

**Pass Handling:**
1. Guest clicks pass
2. Guest processes optimistically (updates local `passInfo`)
3. Guest sends pass action to host
4. Guest shows "YOU PASSED" animation
5. Guest waits for host broadcast to confirm

**Action Handling:**
1. Guest performs deployment
2. Guest processes optimistically
3. Guest sends action to host
4. Guest waits for host confirmation

**Milestone Behavior:**
- **deployment is a milestone phase**
- Guest stops here at phase start and waits for host broadcast
- Guest does not continue to action phase until validated

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PHASE                          │
└─────────────────────────────────────────────────────────────┘

START: Transition from mandatoryDroneRemoval (or earlier)
  │
  ├─> Set turnPhase = 'deployment'
  ├─> Set currentPlayer = firstPlayerOfRound
  ├─> Reset passInfo: {player1Passed: false, player2Passed: false}
  │
  ├─> TURN LOOP:
  │   │
  │   ├─> Current Player's Turn
  │   │   │
  │   │   ├─> Option 1: Deploy Drone
  │   │   │   └─> Select drone
  │   │   │   └─> Confirm deployment
  │   │   │   └─> Spend deployment budget
  │   │   │   └─> Drone added to battlefield
  │   │   │   └─> Switch turn to opponent
  │   │   │   └─> Loop continues
  │   │   │
  │   │   └─> Option 2: Pass
  │   │       └─> ActionProcessor.processPlayerPass()
  │   │       └─> passInfo[player]Passed = true
  │   │       └─> If first to pass: Set firstPasser
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
  ├─> (Host) Broadcast phase transition to 'action'
  │   (Host) Queue "DEPLOYMENT COMPLETE" announcement (pseudo-phase)
  │   (Guest) Validate - MILESTONE
  │   (Guest) Infer "DEPLOYMENT COMPLETE" from deployment→action transition
  │
  └─> Transition to: action

END: Phase Complete

MULTIPLAYER NOTES:
- Guest processes pass/actions optimistically
- Host validates and broadcasts
- Milestone: Guest stops at phase start for validation
- Pass animations deduplicated on guest
```

---

## Code References

### GameFlowManager.js
- `handleActionCompletion(playerId, actionType)` - Pass and action handling
- `checkSequentialPhaseCompletion()` - Local mode completion check
- `switchTurn()` - Turn transitions

### ActionProcessor.js
- `processPlayerPass(playerId)` - Pass processing
- `queueAction()` - Queues deployment actions

### AIPhaseProcessor.js
- `executeDeploymentTurn()` - AI deployment decisions
- Uses `aiBrain.handleOpponentTurn()`

### App.jsx
- `handlePlayerPass()` - Pass button handler

### GameHeader.jsx
- "Pass" button - Renders during sequential phases

### DronesView.jsx
- Drone click handlers for deployment

---

## Network Synchronization

### Guest Opponent Pass Detection

When both players pass during deployment, guest uses phase transition inference to detect opponent pass:

**Detection Logic:**
1. Guest passes locally → sees "YOU PASSED" animation
2. Guest's `passInfo[localPlayerId]Passed` becomes `true`
3. Host also passes → deployment phase ends
4. Host broadcasts state update with `turnPhase: 'action'`
5. Guest receives broadcast, detects `guestPhase='deployment'` → `hostPhase='action'`
6. **Inference:** For deployment to end, both players must have passed
7. Guest checks local `passInfo[localPlayerId]Passed === true`
8. If true, guest knows opponent also passed
9. Guest queues "OPPONENT PASSED" announcement before "ACTION PHASE"

**Why This Works:**
- Deployment is a sequential phase requiring both players to pass before transitioning
- If guest passed AND phase transitioned away from deployment, opponent must have also passed
- This eliminates need for explicit opponent pass notifications
- Guest sees complete announcement flow: OPPONENT PASSED → ACTION PHASE

**Implementation:** `GuestMessageQueueService.processStateUpdate()` lines 641-665

**Related:** See PHASE_FLOW_INDEX.md section "Guest Announcement Architecture" for complete explanation of pseudo-phase inference patterns.

---

## Notes

- First sequential phase of the round
- Uses pass system, not commitment system
- Both players must pass to end phase
- After passing, players can no longer deploy (even if opponent continues)
- Deployment budget differs between Round 1 (initial) and Round 2+ (standard)
- Strategic phase - deployment positioning matters
- AI uses brain for sophisticated decision-making
- Milestone phase - critical synchronization point
- Guest processes actions optimistically but validates at phase boundaries
- Pass order tracked via `firstPasser` (not used until action phase ends for round determination)
- Turn switches after each deployment or pass
- PhaseAnimationQueue shows pass animations to both players
