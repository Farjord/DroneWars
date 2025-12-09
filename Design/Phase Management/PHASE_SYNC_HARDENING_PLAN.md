# Phase Manager Synchronization Hardening Plan

**Date:** 2025-11-27
**Status:** Ready for Implementation
**Estimated Effort:** 6-10 hours total

---

## Executive Summary

After thorough review of the Phase Management design documents and implementation code, I've identified **8 architectural weaknesses** that explain the state synchronization issues in multiplayer. While the design principles are sound, the implementation has critical gaps.

---

## CRITICAL ISSUES IDENTIFIED

### 🔴 Issue 1: Race Condition in First-Passer Synchronization (CRITICAL)

**Location:** `PhaseManager.js` lines 73-77, 106-109

**Problem:** Both `notifyHostAction()` and `notifyGuestAction()` check the SAME condition before setting `firstPasser`:
```javascript
if (!this.hostLocalState.passInfo.firstPasser && !this.guestLocalState.passInfo.firstPasser) {
  this.hostLocalState.passInfo.firstPasser = 'player1';  // Host sets player1
}
// vs
if (!this.hostLocalState.passInfo.firstPasser && !this.guestLocalState.passInfo.firstPasser) {
  this.guestLocalState.passInfo.firstPasser = 'player2';  // Guest sets player2
}
```

**Scenario:** When both players pass within 50ms (network latency window):
1. Host passes (T0) → sets `firstPasser = 'player1'`
2. Guest's pass message arrives at Host (T10) → checks condition, might OVERWRITE to `firstPasser = 'player2'`
3. **Result:** State diverges on who went first

**Impact:** Affects turn order determination, which cascades to ALL subsequent rounds.

---

### 🔴 Issue 2: Only 2 of 35+ Actions Notify PhaseManager (CRITICAL)

**Location:** `ActionProcessor.js`

**Problem:** PhaseManager is only notified for:
- `processPlayerPass()` ✅
- `processCommitment()` ✅

**Missing notifications for:**
- `processAttack()` - Combat actions invisible to PhaseManager
- `processMove()` - Movement actions untracked
- `processDeployment()` - Deployment untracked
- `processCardPlay()` - Card plays not synchronized
- `processPhaseTransition()` - Phase changes don't notify PhaseManager!
- `processTurnTransition()` - Turn switches untracked

**Impact:** PhaseManager has incomplete view of game state. Can't properly determine "ready to transition" because it doesn't know what actions have occurred.

---

### 🔴 Issue 3: State Mutated BEFORE PhaseManager Notification (CRITICAL)

**Location:** `ActionProcessor.js` lines 2697-2774

**Problem:**
```javascript
// LINE 2748: STATE MUTATED FIRST
this.gameStateManager.setState({ passInfo: newPassInfo }, 'PASS_INFO_SET');

// LINES 2758-2774: NOTIFICATION HAPPENS AFTER
if (this.phaseManager) {
  this.phaseManager.notifyHostAction('pass', { phase: turnPhase });
}
```

**Race Window:** Between mutation and notification:
1. State is mutated (passInfo updated)
2. Broadcast could happen here (before PhaseManager knows)
3. PhaseManager notification happens
4. Guest receives broadcast without PhaseManager being in sync

**Impact:** Guest's PhaseManager state doesn't match Host's game state.

---

### 🟠 Issue 4: No Broadcast Sequence Guarantee (HIGH)

**Location:** `GuestMessageQueueService.js` lines 360-381

**Problem:** Messages processed in ARRIVAL order, not SEND order. Network latency means:

**Host sends:**
1. T0: "Phase is now deployment"
2. T10: "Player passed, transitioning to action"

**Guest receives:**
1. T50: Message 2 arrives first (lower latency path)
2. T65: Message 1 arrives

**Result:** Guest applies "phase = action" before knowing about deployment phase.

**Impact:** Phase transitions appear out of order, causing UI confusion and potential state corruption.

---

### 🟠 Issue 5: Guest State Comparison Incomplete (HIGH)

**Location:** `GuestMessageQueueService.js` lines 734-758

**Problem:** When checking if optimistic state matches Host:
```javascript
const statesMatch = this.compareGameStates(currentState, state);
```

Only compares:
- `energy`, `shields`, `health`
- Hand card IDs
- Drone IDs/health
- `currentPlayer`, `turnPhase`, `roundNumber`

**NOT compared:**
- `passInfo` (who passed first)
- Deck contents
- Commitments structure
- Game stage

**Impact:** Silent desync in non-compared fields. Guest thinks it matches Host but actually diverged.

---

### 🟠 Issue 6: Multiple Broadcasts During Complex Transitions (HIGH)

**Location:** `GameFlowManager.js` lines 543-612

**Problem:**
```javascript
// Broadcast 1: After applying commitments
this.actionProcessor.broadcastStateToGuest();

// Continue processing...
this.initiateSequentialPhase(nextPhase);

// Broadcast 2: After phase transition
this.actionProcessor.broadcastStateToGuest();
```

**Impact:** Guest receives:
1. Broadcast A: commitments applied, still in 'placement'
2. Broadcast B: now in 'deployment'

Guest might start processing Broadcast A while Host is already in Broadcast B logic.

---

### 🟡 Issue 7: No Idempotency Keys for Broadcasts (MEDIUM)

**Location:** All broadcast paths

**Problem:** If a broadcast is retried (network failure), Guest processes same state change twice. Especially problematic with animations:
- Guest receives: `DAMAGE_ANIMATION`
- Guest queues animation, plays it
- Network retry: Guest receives same broadcast again
- Animation plays twice (or filtered incorrectly)

---

### 🟡 Issue 8: No Error Recovery Mechanism (MEDIUM)

**Location:** Entire sync architecture

**Problem:** No mechanism for:
- Retry if broadcast was lost
- Request full state resync if divergence detected
- Recovery if message was corrupted

Once a broadcast fails or is processed incorrectly, there's no way to recover.

---

## ROOT CAUSE ANALYSIS

The fundamental problem is that the PhaseManager design (single authority) conflicts with the actual implementation:

1. **Design says:** PhaseManager is the ONLY authority for phase transitions
2. **Reality:** GameFlowManager, ActionProcessor, and GuestMessageQueueService all make state decisions

The "single source of truth" is actually distributed across:
- `PhaseManager.hostLocalState`
- `PhaseManager.guestLocalState`
- `PhaseManager.phaseState`
- `gameState` in `GameStateManager`

This creates the synchronization burden the design was supposed to eliminate.

---

## IMPLEMENTATION PLAN (All 6 Priorities)

**Scope:** Full hardening with player-visible resync notification

---

### Priority 1: Fix First-Passer Race Condition
**Complexity:** Low | **Impact:** Critical | **Est. Time:** 30 min

**File:** `src/managers/PhaseManager.js`

**Changes:**
1. Store `firstPasser` in a SINGLE location (`phaseState.passInfo.firstPasser`)
2. Remove duplicate tracking in `hostLocalState` and `guestLocalState`
3. Add synchronous guard to prevent overwrite

```javascript
// In PhaseManager constructor, simplify state:
this.phaseState = {
  turnPhase: 'deckSelection',
  passInfo: {
    hostPassed: false,
    guestPassed: false,
    firstPasser: null  // SINGLE source of truth
  },
  // ...
};

// In notifyHostAction:
notifyHostAction(actionType, data) {
  if (actionType === 'pass') {
    this.phaseState.passInfo.hostPassed = true;
    // Only set firstPasser if not already set
    if (!this.phaseState.passInfo.firstPasser) {
      this.phaseState.passInfo.firstPasser = 'player1';
    }
    this.checkReadyToTransition();
  }
}

// In notifyGuestAction:
notifyGuestAction(actionType, data) {
  if (actionType === 'pass') {
    this.phaseState.passInfo.guestPassed = true;
    // Only set firstPasser if not already set
    if (!this.phaseState.passInfo.firstPasser) {
      this.phaseState.passInfo.firstPasser = 'player2';
    }
    this.checkReadyToTransition();
  }
}
```

---

### Priority 2: Add Broadcast Sequence Numbers
**Complexity:** Medium | **Impact:** High | **Est. Time:** 1-2 hours

**Files:**
- `src/managers/ActionProcessor.js` (add sequence tracking)
- `src/managers/GuestMessageQueueService.js` (validate sequence)

**ActionProcessor Changes:**
```javascript
// Add to constructor
this.broadcastSequence = 0;

// Update broadcastStateToGuest()
broadcastStateToGuest(reason = 'unknown') {
  this.broadcastSequence++;

  const broadcast = {
    sequenceId: this.broadcastSequence,
    previousSequenceId: this.broadcastSequence - 1,
    state: stateToBroadcast,
    actionAnimations,
    systemAnimations,
    timestamp: Date.now(),
    reason
  };

  debugLog('NETWORK', `📡 Broadcasting seq=${this.broadcastSequence}`, { reason });
  this.p2pManager.broadcastState(broadcast);
}
```

**GuestMessageQueueService Changes:**
```javascript
// Add to constructor
this.lastProcessedSequence = 0;
this.pendingMessages = new Map(); // sequenceId -> message (for out-of-order handling)

// Update enqueueMessage()
enqueueMessage(message) {
  const { sequenceId, previousSequenceId } = message;

  // Reject duplicates
  if (sequenceId <= this.lastProcessedSequence) {
    debugLog('NETWORK', `🚫 Duplicate broadcast seq=${sequenceId}, ignoring`);
    return;
  }

  // Check if in order
  if (previousSequenceId !== this.lastProcessedSequence) {
    debugLog('NETWORK', `⚠️ Out-of-order broadcast seq=${sequenceId}, expected prev=${this.lastProcessedSequence}`);
    // Store for later processing
    this.pendingMessages.set(sequenceId, message);
    // Request resync if too many pending
    if (this.pendingMessages.size > 3) {
      this.requestFullSync('too_many_pending');
    }
    return;
  }

  // Process in order
  this.processMessage(message);
  this.lastProcessedSequence = sequenceId;

  // Check if any pending messages can now be processed
  this.processPendingMessages();
}
```

---

### Priority 3: Centralize State Mutations
**Complexity:** High | **Impact:** Critical | **Est. Time:** 2-3 hours

**Files:**
- `src/managers/PhaseManager.js` (add recordAction method)
- `src/managers/ActionProcessor.js` (use recordAction instead of direct setState)

**PhaseManager Changes:**
```javascript
/**
 * Record an action and apply state changes atomically
 * This is the ONLY path for state mutations during gameplay
 */
recordAction(action) {
  const { type, playerId, phase, stateChanges } = action;

  debugLog('PHASE_MANAGER', `📝 Recording action: ${type} by ${playerId}`, action);

  // Validate action is appropriate for current phase
  if (!this.validateAction(type, phase)) {
    debugLog('PHASE_MANAGER', `🚫 Invalid action ${type} for phase ${this.phaseState.turnPhase}`);
    return { success: false, reason: 'invalid_action_for_phase' };
  }

  // Apply state changes through GameStateManager
  if (stateChanges && Object.keys(stateChanges).length > 0) {
    this.gameStateManager.setState(stateChanges, `PHASE_MANAGER_${type.toUpperCase()}`);
  }

  // Track action in PhaseManager
  if (type === 'pass') {
    this.trackPass(playerId);
  } else if (type === 'commit') {
    this.trackCommitment(playerId, phase);
  }

  // Check if ready to transition
  this.checkReadyToTransition();

  return { success: true };
}
```

**ActionProcessor Migration:**
```javascript
// OLD (processPlayerPass):
this.gameStateManager.setState({ passInfo: newPassInfo }, 'PASS_INFO_SET');
if (this.phaseManager) {
  this.phaseManager.notifyHostAction('pass', { phase: turnPhase });
}

// NEW:
const result = this.phaseManager.recordAction({
  type: 'pass',
  playerId,
  phase: turnPhase,
  stateChanges: { passInfo: newPassInfo }
});
```

---

### Priority 4: Complete State Comparison
**Complexity:** Low | **Impact:** Medium | **Est. Time:** 30 min

**File:** `src/managers/GuestMessageQueueService.js`

**Update compareGameStates():**
```javascript
compareGameStates(localState, hostState) {
  // Existing comparisons...

  // ADD: passInfo comparison
  if (localState.passInfo?.firstPasser !== hostState.passInfo?.firstPasser) {
    debugLog('STATE_SYNC', '⚠️ passInfo.firstPasser mismatch');
    return false;
  }
  if (localState.passInfo?.player1Passed !== hostState.passInfo?.player1Passed) {
    debugLog('STATE_SYNC', '⚠️ passInfo.player1Passed mismatch');
    return false;
  }
  if (localState.passInfo?.player2Passed !== hostState.passInfo?.player2Passed) {
    debugLog('STATE_SYNC', '⚠️ passInfo.player2Passed mismatch');
    return false;
  }

  // ADD: gameStage comparison
  if (localState.gameStage !== hostState.gameStage) {
    debugLog('STATE_SYNC', '⚠️ gameStage mismatch');
    return false;
  }

  // ADD: commitments structure comparison
  if (!this.compareCommitments(localState.commitments, hostState.commitments)) {
    debugLog('STATE_SYNC', '⚠️ commitments mismatch');
    return false;
  }

  return true;
}

compareCommitments(local, host) {
  const localPhases = Object.keys(local || {});
  const hostPhases = Object.keys(host || {});

  if (localPhases.length !== hostPhases.length) return false;

  for (const phase of hostPhases) {
    if (!local[phase]) return false;
    if (local[phase].player1?.completed !== host[phase].player1?.completed) return false;
    if (local[phase].player2?.completed !== host[phase].player2?.completed) return false;
  }

  return true;
}
```

---

### Priority 5: Single Broadcast per Transition
**Complexity:** Medium | **Impact:** High | **Est. Time:** 1-2 hours

**Files:**
- `src/managers/GameStateManager.js` (add transaction batching)
- `src/managers/GameFlowManager.js` (use transactions)
- `src/managers/ActionProcessor.js` (check batch mode before broadcast)

**GameStateManager Transaction Support:**
```javascript
// Add to constructor
this.transactionActive = false;
this.transactionQueue = [];

beginTransaction() {
  this.transactionActive = true;
  this.transactionQueue = [];
  debugLog('STATE', '🔒 Transaction started');
}

commitTransaction() {
  if (!this.transactionActive) return;

  // Merge all queued state changes
  const mergedChanges = this.transactionQueue.reduce((acc, change) => {
    return { ...acc, ...change };
  }, {});

  // Apply merged state
  this.setState(mergedChanges, 'TRANSACTION_COMMIT');

  this.transactionActive = false;
  this.transactionQueue = [];
  debugLog('STATE', '🔓 Transaction committed');

  return mergedChanges;
}

// Modify setState to queue during transactions
setState(updates, source = 'unknown') {
  if (this.transactionActive) {
    this.transactionQueue.push(updates);
    debugLog('STATE', `📥 Queued state update (transaction active)`, { source });
    return;
  }
  // Normal setState logic...
}
```

**GameFlowManager Usage:**
```javascript
async onSimultaneousPhaseComplete(phase) {
  // Start transaction - defer all state changes
  this.gameStateManager.beginTransaction();

  try {
    await this.applyPhaseCommitments(phase);
    const nextPhase = this.getNextPhase(phase);
    this.initiateSequentialPhase(nextPhase);

    // Commit transaction - single merged state update
    this.gameStateManager.commitTransaction();

    // Single broadcast with final state
    if (this.gameStateManager.getState().gameMode === 'host') {
      this.actionProcessor.broadcastStateToGuest('transaction_complete');
    }
  } catch (error) {
    this.gameStateManager.rollbackTransaction();
    throw error;
  }
}
```

---

### Priority 6: Add Resync Mechanism (With Player Notification)
**Complexity:** Medium | **Impact:** Medium | **Est. Time:** 1-2 hours

**Files:**
- `src/managers/GuestMessageQueueService.js` (detect divergence, request sync)
- `src/managers/ActionProcessor.js` (handle sync request, send full state)
- `src/App.jsx` (show syncing UI)

**GuestMessageQueueService:**
```javascript
// Add syncing state
this.isSyncing = false;
this.syncCallback = null; // Callback to show UI

setSyncCallback(callback) {
  this.syncCallback = callback;
}

requestFullSync(reason = 'unknown') {
  if (this.isSyncing) return; // Already syncing

  this.isSyncing = true;
  debugLog('NETWORK', `🔄 Requesting full sync: ${reason}`);

  // Notify UI
  if (this.syncCallback) {
    this.syncCallback({ syncing: true, reason });
  }

  // Send sync request to Host
  this.p2pManager.sendMessage({
    type: 'SYNC_REQUEST',
    reason,
    lastSequence: this.lastProcessedSequence,
    timestamp: Date.now()
  });
}

handleFullSyncResponse(syncData) {
  debugLog('NETWORK', `✅ Received full sync response`);

  // Apply complete state
  this.gameStateManager.applyHostState(syncData.gameState);
  this.lastProcessedSequence = syncData.sequenceId;

  // Clear pending messages
  this.pendingMessages.clear();

  // End syncing
  this.isSyncing = false;
  if (this.syncCallback) {
    this.syncCallback({ syncing: false });
  }
}
```

**ActionProcessor (Host-side):**
```javascript
handleSyncRequest(request, peerId) {
  debugLog('NETWORK', `📥 Sync request from guest: ${request.reason}`);

  const syncData = {
    type: 'SYNC_RESPONSE',
    gameState: this.gameStateManager.getState(),
    phaseState: this.phaseManager?.getPhaseState(),
    sequenceId: this.broadcastSequence,
    timestamp: Date.now()
  };

  this.p2pManager.sendToPeer(peerId, syncData);
}
```

**App.jsx UI:**
```javascript
// Add syncing state
const [isSyncing, setIsSyncing] = useState(false);

// Connect to GuestMessageQueueService
useEffect(() => {
  if (gameMode === 'guest' && guestMessageQueueService) {
    guestMessageQueueService.setSyncCallback(({ syncing, reason }) => {
      setIsSyncing(syncing);
      if (syncing) {
        console.log(`Syncing: ${reason}`);
      }
    });
  }
}, [gameMode, guestMessageQueueService]);

// Render syncing overlay
{isSyncing && (
  <div className="syncing-overlay">
    <div className="syncing-message">
      <span className="syncing-spinner"></span>
      Syncing with host...
    </div>
  </div>
)}
```

**App.css Styles:**
```css
.syncing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.syncing-message {
  background: #1a1a2e;
  border: 2px solid #4a9eff;
  border-radius: 8px;
  padding: 20px 40px;
  color: #fff;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.syncing-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #4a9eff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## FILES TO MODIFY (Summary)

| File | Priority | Changes |
|------|----------|---------|
| `src/managers/PhaseManager.js` | 1, 3 | Fix race condition, add recordAction(), simplify state |
| `src/managers/ActionProcessor.js` | 2, 3, 6 | Add sequence tracking, use recordAction(), handle sync requests |
| `src/managers/GuestMessageQueueService.js` | 2, 4, 6 | Validate sequence, complete state comparison, resync mechanism |
| `src/managers/GameStateManager.js` | 5 | Add transaction batching |
| `src/managers/GameFlowManager.js` | 5 | Use transactions for atomic transitions |
| `src/App.jsx` | 6 | Add syncing UI overlay |
| `src/App.css` | 6 | Style syncing overlay |

---

## IMPLEMENTATION ORDER

1. **Priority 1** (Low complexity) - Start here, immediate win
2. **Priority 4** (Low complexity) - Quick win, improves detection
3. **Priority 2** (Medium) - Critical for ordering
4. **Priority 6** (Medium) - Build resync alongside sequence validation
5. **Priority 5** (Medium) - Transaction batching
6. **Priority 3** (High) - Largest refactor, do last

---

## TESTING RECOMMENDATIONS

### Automated Test Scenarios
After each priority, test:

**Priority 1 Tests:**
- Both players pass within 50ms - verify firstPasser consistent
- Rapid alternating passes - verify no race
- Local mode first-passer determination

**Priority 2 Tests:**
- Simulate packet reordering - verify messages processed correctly
- Duplicate broadcast - verify ignored
- Missing sequence number - verify pending queue

**Priority 4 Tests:**
- Deliberately desync passInfo - verify detection
- Deliberately desync commitments - verify detection

**Priority 5 Tests:**
- Complex phase transition - verify single broadcast
- Transaction rollback on error

**Priority 6 Tests:**
- Force resync - verify "Syncing..." appears
- Verify state matches after resync
- Test resync during animation

### Manual Multiplayer Testing
1. Open two browser tabs (Host + Guest)
2. Play through complete game with DevTools open
3. Watch for:
   - `🚫` errors (blocked actions)
   - `⚠️` warnings (state mismatches)
   - `🔄` syncing events
4. Verify no phase desyncs at:
   - Deployment → Action transition
   - Action → Round end transition
   - Simultaneous commitments

---

## ESTIMATED EFFORT

| Priority | Complexity | Est. Time |
|----------|------------|-----------|
| 1 | Low | 30 min |
| 2 | Medium | 1-2 hours |
| 3 | High | 2-3 hours |
| 4 | Low | 30 min |
| 5 | Medium | 1-2 hours |
| 6 | Medium | 1-2 hours |
| **Total** | | **6-10 hours** |
