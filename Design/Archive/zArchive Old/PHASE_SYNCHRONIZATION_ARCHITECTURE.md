# Phase Processing & Synchronization Architecture - Design Document

## Executive Summary

This document defines the authoritative architecture for multiplayer phase processing, distinguishing between optimistic processing, pause points, and validation checkpoints.

---

## Core Principles

1. **Host Authority**: Host is the source of truth. Guest validates against Host at checkpoints.
2. **Optimistic Processing**: Guest processes automatic phases optimistically for responsiveness
3. **Validation Checkpoints**: Guest validates state at milestone phases
4. **Visual Continuity**: Guest sees ALL phase announcements, even for optimistically processed phases
5. **Manual Progression**: Pause phases require explicit Continue button from both players

---

## Phase Categories

### Automatic Phases (No User Interaction)
- `determineFirstPlayer` - Seeded RNG determines turn order
- `energyReset` - Reset energy and deployment budget
- `draw` - Automatic card drawing to hand limits

**Behavior**: Both Host and Guest process these immediately without waiting.

### Conditional Validation Phases (Validate-Only if Not Needed)
- `mandatoryDiscard` - If player over hand limit
- `mandatoryDroneRemoval` - If player over drone limit

**Behavior**:
- If needed: Full pause phase with Continue button
- If NOT needed: Guest validates state with Host but doesn't pause for user interaction

### Pause Phases (Always Require User Interaction)
- `optionalDiscard` - Player may choose to discard cards
- `allocateShields` - Player allocates shield points

**Behavior**: Both players see phase announcement, take actions (or skip), then click Continue.

### Sequential Phases (Turn-Based)
- `deployment` - Already working
- `action` - Already working

**Behavior**: Current player acts, then turn transitions to other player.

---

## Round Start Flow

### Initial Game Start (After Ship Placement)

```
[Both Players Confirm Ship Layout]
       ↓
[Host & Guest Both Trigger]
       ↓
[Optimistic Processing Begins]
       ↓
HOST: determineFirstPlayer → energyReset → draw → PAUSE (validate)
GUEST: determineFirstPlayer → energyReset → draw → PAUSE (validate)
       ↓
[VALIDATION CHECKPOINT - Guest validates against Host]
       ↓
[Both players see "DEPLOYMENT PHASE" announcement]
       ↓
[Sequential phase begins]
```

### Subsequent Round Starts (After Both Players Pass in Action)

```
[Both Players Pass]
       ↓
[Optimistic Processing Begins]
       ↓
HOST: determineFirstPlayer → energyReset → check mandatoryDiscard → PAUSE (optionalDiscard)
GUEST: determineFirstPlayer → energyReset → check mandatoryDiscard → PAUSE (optionalDiscard)
       ↓
[VALIDATION CHECKPOINT - Guest validates against Host]
       ↓
If mandatoryDiscard needed: Show "MANDATORY DISCARD PHASE" + Continue button
If NOT needed: Silent validation, proceed
       ↓
[PAUSE - Optional Discard Phase]
Both players see "OPTIONAL DISCARD PHASE"
Both players click Continue (after discarding or skipping)
       ↓
[Optimistic Processing Resumes] -> Draw
       ↓
[VALIDATION CHECKPOINT]
[PAUSE - Allocate Shields Phase]
Both players see "ALLOCATE SHIELDS"
Both players allocate shields and click Continue
       ↓
[Optimistic Processing Resumes]
       ↓
HOST: check mandatoryDroneRemoval → deployment
GUEST: check mandatoryDroneRemoval → deployment
       ↓
[VALIDATION CHECKPOINT]
If mandatoryDroneRemoval needed: Show phase + Continue
If NOT needed: Silent validation, proceed
       ↓
[Sequential phase begins - Deployment]
```

---

## Phase Announcement System

### Requirements
Guest must see ALL phase announcements for visual continuity, including phases processed optimistically.

### Solution: Dual-Track Animation System

**Track 1: PhaseAnimationQueue (Non-Blocking)**
- Queues ALL phase announcements
- Plays sequentially with 1.8s display time each
- Does NOT block game logic
- Guest queues announcements as phases are processed locally

**Track 2: Game Logic Processing (Blocking at Pauses)**
- Host and Guest process phases optimistically
- PAUSE at milestones for validation + user interaction
- Wait for Continue button before advancing

### Example Timeline

```
Time  PhaseQueue Display    Game Logic State        User Sees
-------------------------------------------------------------------
0s    [Playing: OPPONENT     action (both passed)   "OPPONENT PASSED" modal
       PASSED]
1.8s  [Playing: DETERMINING  determineFirstPlayer    "DETERMINING FIRST
       FIRST PLAYER]         (processing)            PLAYER" modal
3.6s  [Playing: ENERGY       energyReset             "ENERGY RESET" modal
       RESET]                (processing)
5.4s  [Playing: OPTIONAL     optionalDiscard         "OPTIONAL DISCARD
       DISCARD PHASE]        (PAUSED - waiting       PHASE" modal
                             for Continue)

       [User clicks Continue when ready]

7.2s  [Playing: ALLOCATE     allocateShields         "ALLOCATE SHIELDS"
       SHIELDS]              (PAUSED - waiting        modal + UI
                             for Continue)
```

---

## Validation Checkpoint Protocol

### Smart Checkpoint-Based Validation

**Core Principle:** Guest automatically knows when to validate based on checkpoint phases. No cascade mode flags needed.

### Checkpoint Phases (Where Validation Occurs)
- `mandatoryDiscard` - Conditional pause phase
- `optionalDiscard` - Always pause phase
- `allocateShields` - Always pause phase
- `mandatoryDroneRemoval` - Conditional pause phase
- `deployment` - Sequential phase

### Guest Validation Behavior

**Pre-Game Phases (null → deckSelection → droneSelection → placement):**
- Guest accepts ALL broadcasts immediately
- No checkpoint validation needed
- Enables initial game start and pre-game phase transitions

**Between Checkpoints (During Active Gameplay):**
- Guest processes phases optimistically (determineFirstPlayer, energyReset, draw, etc.)
- Guest ignores ALL host broadcasts (does not apply any state changes)
- Guest queues phase announcements locally
- Guest continues until reaching a checkpoint phase

**At Checkpoint (During Active Gameplay):**
- Guest STOPS processing
- Guest WAITS for host broadcast matching current checkpoint phase
- Guest ignores broadcasts for non-matching phases
- When matching broadcast arrives, Guest validates and adopts host state

### Validation Process (Implemented in GuestMessageQueueService)

1. **Pre-Game Flow (Always Accept)**
   ```
   Guest: null
   Host: deckSelection [broadcast] → Guest accepts immediately ✅
   Guest: deckSelection
   Host: droneSelection [broadcast] → Guest accepts immediately ✅
   ```

2. **Active Game Flow (Checkpoint Validation)**
   ```
   Guest: action → determineFirstPlayer → energyReset → optionalDiscard [STOP]
   Host: action → determineFirstPlayer → energyReset [broadcast] → optionalDiscard [broadcast]
   ```

3. **Guest Filters Non-Checkpoint Broadcasts**
   - Guest at optionalDiscard (checkpoint)
   - Host broadcasts energyReset: Guest ignores (not at checkpoint)
   - Host broadcasts optionalDiscard: Guest validates (checkpoint match!)

4. **Validation Logic**
   ```javascript
   const guestPhase = this.gameStateManager.getState().turnPhase;
   const hostPhase = state.turnPhase;

   // Pre-game: Always accept
   const preGamePhases = [null, 'deckSelection', 'droneSelection'];
   if (preGamePhases.includes(guestPhase)) {
     applyHostState(state); // Accept immediately
     return;
   }

   // Sequential phases: Accept when both in SAME phase
   const sequentialPhases = ['deployment', 'action'];
   const bothInSameSequentialPhase =
     sequentialPhases.includes(guestPhase) &&
     guestPhase === hostPhase;
   if (bothInSameSequentialPhase) {
     applyHostState(state); // Host authoritative for actions
     return;
   }

   // Checkpoint validation: Only at matching checkpoints
   const isCheckpoint = this.gameStateManager.isMilestonePhase(guestPhase);
   if (isCheckpoint && guestPhase === hostPhase) {
     validateOptimisticState(state); // Validate at checkpoint
   }
   ```

4. **Conflict Resolution**
   - **Host Authority:** Host state always wins at checkpoints
   - **Guest Identity Preserved:** `gameMode: 'guest'` never overwritten
   - **Complete State Replacement:** Guest adopts all authoritative state from host
   - **Continue Processing:** After validation, both players at same checkpoint

### Why This Works

- **No Manual Cascade Mode:** Guest intelligence built into GuestMessageQueueService
- **No Early Broadcasts:** Guest ignores host broadcasts for earlier phases
- **No State Regression:** Guest never goes backwards in phase sequence
- **Sequential Phase Synchronization:** Guest accepts actions when both players in same sequential phase
- **Automatic Sync Points:** Validation happens naturally at user interaction phases
- **Clean Architecture:** One place (GuestMessageQueueService) handles all validation logic

---

## Sequential Phase Validation

### Behavior
During sequential phases (deployment, action), guest accepts ALL host broadcasts when both players are in the SAME phase. This enables real-time action synchronization during turn-based gameplay.

### Why Different from Checkpoint Validation
- **Checkpoint validation**: Used during automatic phase cascades (determineFirstPlayer, energyReset, draw)
  - Guest processes optimistically, ignores broadcasts, validates at checkpoints
- **Sequential validation**: Used during turn-based gameplay (deployment, action)
  - Guest accepts every host action in real-time when phases match

### Key Principle
Guest only accepts sequential phase broadcasts when `guestPhase === hostPhase`. This prevents state regression while allowing real-time action synchronization.

### Examples

**Correct: Both in same sequential phase**
```
Guest: action, Host: action (attack) → Guest accepts ✅
Guest sees host's attack immediately
```

**Correct: Host behind (prevented regression)**
```
Guest: deployment, Host: placement → Guest ignores ❌
Guest waits at deployment checkpoint for host to catch up
Host reaches deployment → Guest validates ✅
Both now in deployment, actions accepted
```

**Correct: Both in sequential gameplay**
```
Guest: deployment, Host: deployment (deploy drone) → Guest accepts ✅
Guest: deployment, Host: deployment (pass) → Guest accepts ✅
Guest sees all host's actions in real-time
```

### Implementation
This three-tier validation strategy in GuestMessageQueueService ensures:
1. Pre-game: Seamless initial setup
2. Sequential phases: Real-time action synchronization
3. Checkpoint validation: Optimistic processing with sync points

---

## Sequential Phase Both-Pass Transitions

### Architecture Pattern

When both players pass in a sequential phase (deployment or action), phase transition occurs through a validated broadcast mechanism that preserves host authority while maintaining guest responsiveness.

### Host Processing Flow

**When both players pass:**
1. Host detects both-pass condition (`passInfo.player1Passed && passInfo.player2Passed`)
2. Host calls `onSequentialPhaseComplete()`
3. Host transitions to next phase via `processPhaseTransition()`
4. **PassInfo reset occurs** during transition (ActionProcessor resets to `player1Passed: false, player2Passed: false`)
5. Host queues phase announcement for new phase
6. Host broadcasts updated state (with reset passInfo)

### Guest Validation Flow

**When guest passes and waits:**
1. Guest processes local pass action, sets `passInfo.player2Passed = true` locally
2. Guest sends pass action to host
3. Guest waits at current phase

**When host broadcast arrives (both-pass complete):**
1. Guest receives broadcast with `hostPhase: 'action'`, `passInfo.player1Passed: false, player2Passed: false` (reset)
2. Guest validates using **LOCAL passInfo** (not broadcast passInfo):
   - Check: `localPassInfo.player2Passed === true` (guest has passed)
   - Check: Valid phase progression (deployment → action)
3. Guest accepts broadcast
4. Guest queues phase announcement for new phase locally
5. Guest starts announcement playback
6. Guest applies host state

### Critical Implementation Requirements

**Local PassInfo Validation:**
Guest MUST check its own local passInfo to determine if it has passed. Host's broadcast passInfo is reset during transition and cannot be used for validation.

**Pattern (GuestMessageQueueService.js lines 526-540):**
```javascript
const localState = this.gameStateManager.getState();
const guestHasPassedLocally = localState.passInfo?.player2Passed || false;

// Recognize BOTH sequential phase transitions:
// - deployment → action (mid-round)
// - action → determineFirstPlayer/energyReset/etc. (round-end)
const roundStartPhases = ['determineFirstPlayer', 'energyReset', 'mandatoryDiscard', 'optionalDiscard', 'draw', 'allocateShields', 'mandatoryDroneRemoval'];
const isActionToRoundStart = guestPhase === 'action' && roundStartPhases.includes(hostPhase);

const isValidTransition =
  (guestPhase === 'deployment' && hostPhase === 'action') ||
  (guestPhase === 'action' && hostPhase === 'deployment') ||
  isActionToRoundStart;

const acceptBroadcast = guestHasPassedLocally && isValidTransition;
```

**Opponent Pass Notification Detection:**
Guest CANNOT detect opponent's pass from broadcast passInfo (reset during transition). Guest MUST deduce opponent passed from both-pass transition occurrence.

**Deduction Logic:**
- Both-pass transition occurred (phase mismatch detected)
- Guest has passed locally (`localPassInfo.player2Passed === true`)
- Therefore: Opponent must have also passed (triggering the transition)

**Pattern (GuestMessageQueueService.js lines 580-609):**
```javascript
if (isBothPassBroadcast) {
  const phaseAnimationQueue = this.gameStateManager.gameFlowManager?.phaseAnimationQueue;

  // Queue OPPONENT PASSED notification FIRST
  phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null);

  // Then queue phase announcement
  if (hostPhase !== guestPhase) {
    phaseAnimationQueue.queueAnimation(hostPhase, phaseTextMap[hostPhase], null);
  }

  phaseAnimationQueue.startPlayback();
}
```

**Queue Order:**
1. "OPPONENT PASSED" (deduced from transition)
2. "ACTION PHASE" or round start phase announcement
3. Playback triggered immediately

**Automatic Cascade Triggering:**
When both-pass transition lands on an AUTOMATIC phase (e.g., `determineFirstPlayer`), guest MUST trigger cascade processing to advance through automatic phases until reaching next checkpoint.

**Scenario Comparison:**

**Host passes FIRST → Guest passes SECOND:**
- Guest detects `bothPassed = true` locally when processing its own pass
- Guest calls `GameFlowManager.onSequentialPhaseComplete('action')` (line 250)
- This triggers `startNewRound()` → `transitionToPhase('determineFirstPlayer')`
- `transitionToPhase` auto-processes automatic phases ✅
- Guest reaches checkpoint (e.g., `optionalDiscard`)

**Guest passes FIRST → Host passes SECOND:**
- Guest processes own pass → `bothPassed = false` → waits
- Host broadcasts both-pass transition to `determineFirstPlayer`
- Guest accepts broadcast, applies state → now at `determineFirstPlayer`
- **Guest triggers cascade** → processes determineFirstPlayer → energyReset → optionalDiscard ✅
- Guest reaches checkpoint (e.g., `optionalDiscard`)

**Pattern (GuestMessageQueueService.js lines 611-618, 50-62):**
```javascript
// When accepting both-pass broadcast, check if landing on automatic phase
const automaticPhases = ['gameInitializing', 'energyReset', 'draw', 'determineFirstPlayer'];
if (automaticPhases.includes(hostPhase)) {
  this.triggerBothPassCascade = true;
  this.bothPassStartPhase = hostPhase;
}

// After applying host state, trigger cascade if flag set
if (this.triggerBothPassCascade) {
  this.triggerBothPassCascade = false;
  await gameFlowManager.processAutomaticPhasesUntilCheckpoint(this.bothPassStartPhase);
}
```

This ensures guest processes automatic phases locally (queuing announcements) and reaches checkpoint where it validates against host broadcasts.

### Architectural Principles

- **Host Authority**: Host determines phase transitions, guest validates and synchronizes
- **Local Validation**: Guest uses local state for validation (broadcast passInfo unreliable)
- **Visual Continuity**: Guest queues announcements locally to ensure all phases visible
- **Responsive UX**: Guest accepts valid transitions immediately without additional waiting

---

## Round Number Synchronization

### Architecture Principle

**Core Requirement:** Host and Guest must maintain synchronized `roundNumber` throughout the game to ensure conditional phase logic (e.g., shield allocation starting from round 2) works correctly on both clients.

### Round Number Management

**Initial Value:** `roundNumber = 0` (pre-game state)

**First Round:** When transitioning from pre-game to round loop, `roundNumber` is set to `1`

**Subsequent Rounds:** After both players pass in action phase, `roundNumber` increments by 1

### Host Round Increment Logic

**Location:** `GameFlowManager.onSequentialPhaseComplete()` (lines 728-743)

**Flow:**
```javascript
async onSequentialPhaseComplete(phase, data) {
  const nextPhase = this.getNextPhase(phase);

  if (nextPhase) {
    await this.transitionToPhase(nextPhase);
  } else {
    // End of action phase - start new round
    if (phase === 'action') {
      await this.startNewRound(); // Increments roundNumber
    }
  }
}
```

**Round Increment Implementation:** `GameFlowManager.startNewRound()` (lines 1766-1799)
```javascript
async startNewRound() {
  // Capture first passer before incrementing
  const currentGameState = this.gameStateManager.getState();
  const firstPasserFromPreviousRound = currentGameState.passInfo?.firstPasser || null;

  this.roundNumber++; // INCREMENT

  // Update GameStateManager with new round number
  this.gameStateManager.setState({
    roundNumber: this.roundNumber,
    turn: this.roundNumber,
    firstPasserOfPreviousRound: firstPasserFromPreviousRound
  });

  // Transition to first phase of new round
  const firstRequiredPhase = this.ROUND_PHASES.find(phase => this.isPhaseRequired(phase));
  await this.transitionToPhase(firstRequiredPhase); // Usually 'determineFirstPlayer'
}
```

### Guest Round Increment Logic ✅ FIXED (2025-10-26)

**Problem:** Guest's `roundNumber` remained at 1 when entering round 2, causing `isPhaseRequired('allocateShields')` to incorrectly skip the shields phase (requires `roundNumber >= 2`).

**Root Cause:** Guest's `checkSimultaneousPhaseCompletion()` triggered cascade processing immediately when detecting local state changes (both players committed), BEFORE receiving Host's broadcast containing the updated `roundNumber`. This race condition meant Guest processed conditional phase logic with stale metadata.

**Symptom Flow:**
1. Guest commits to optionalDiscard → local state shows both complete
2. Guest's automatic subscription triggers `checkSimultaneousPhaseCompletion()`
3. Guest starts cascade with `roundNumber = 1` (stale)
4. Guest checks `isPhaseRequired('allocateShields')` → returns false (round 1 < 2)
5. Guest skips allocateShields → desync with Host

**Solution (Two-Part Fix):**

**Part 1: Prevent Automatic Cascade on Local State Changes**

Guest mode skips automatic checkpoint subscription to prevent triggering cascade before receiving Host's authoritative state.

**Location:** `GameFlowManager.setupEventListeners()` (lines 123-128)

**Implementation:**
```javascript
// Subscribe to GameStateManager for both sequential and simultaneous phase completion detection
if (this.gameStateManager) {
  this.gameStateManager.subscribe((event) => {
    const { state, type: eventType } = event;
    this.checkSequentialPhaseCompletion(state, eventType);

    // Guest mode: Only trigger checkpoint detection when receiving Host broadcast
    // Guest waits for Host's authoritative state (including roundNumber) before starting cascade
    // GuestMessageQueueService explicitly calls checkSimultaneousPhaseCompletion after applying Host state
    if (state.gameMode !== 'guest') {
      this.checkSimultaneousPhaseCompletion(state, eventType);
    }
```

**Part 2: Explicit Cascade Trigger After Applying Host State**

GuestMessageQueueService explicitly triggers cascade only AFTER applying Host's broadcast (which includes updated `roundNumber`).

**Location:** `GuestMessageQueueService.applyPendingStateUpdate()` (lines 52-67)

**Implementation:**
```javascript
// Apply host state first (includes roundNumber update)
this.gameStateManager.applyHostState(this.pendingHostState);

// SIMULTANEOUS CHECKPOINT CASCADE: Trigger cascade processing if both players complete
if (this.triggerSimultaneousCascade) {
  this.triggerSimultaneousCascade = false; // Reset flag
  const cascadePhase = this.simultaneousCascadePhase;

  // Get GameFlowManager and trigger cascade through onSimultaneousPhaseComplete
  const gameFlowManager = this.gameStateManager.gameFlowManager;
  if (gameFlowManager) {
    const currentState = this.gameStateManager.getState();
    const phaseCommitments = currentState.commitments?.[cascadePhase];
    // Cascade now uses Host's roundNumber (e.g., roundNumber = 2)
    await gameFlowManager.onSimultaneousPhaseComplete(cascadePhase, phaseCommitments);
  }
}
```

**Alternative Path (No Animations):** `GuestMessageQueueService.processStateUpdate()` (lines 826-842)
Same pattern applied when AnimationManager not available.

### Why This Works

**Synchronization Guarantee:**
1. Guest commits → local state change → automatic checkpoint detection **skipped** (guest mode)
2. Guest waits for Host broadcast
3. Host broadcasts with updated `roundNumber = 2` + both committed
4. Guest applies Host state via `applyHostState()` → `gameState.roundNumber = 2` ✅
5. Guest explicitly triggers cascade → cascade uses current `roundNumber = 2`
6. Guest checks `isPhaseRequired('allocateShields')` → returns true (round 2 >= 2)
7. Guest correctly includes allocateShields phase ✅

**Conditional Phase Logic:**
```javascript
// GameFlowManager.isPhaseRequired('allocateShields')
const gameState = this.gameStateManager.getState();
if (gameState.roundNumber < 2) {
  return false; // Skip shields in round 1
}
// Guest now reads roundNumber=2 from Host's broadcast, not stale local value!
```

### Architectural Principle Satisfied

**Host Authority with Explicit Synchronization:** Guest waits for Host's authoritative state (including game flow metadata like `roundNumber`) before processing automatic phases. This ensures all conditional phase logic operates on Host's validated state, eliminating race conditions and maintaining perfect synchronization.

---

## ALLOWED_HOST_PHASES Checkpoint Validation Matrix

### Problem: Strict Phase Matching Insufficient

**Initial Implementation:** Guest checkpoint validation required exact phase match between Guest and Host:
```javascript
// STRICT MATCHING - FAILS
if (guestPhase === hostPhase) {
  // Accept broadcast
}
```

**Issue:** Auto-skipped conditional phases cause legitimate phase mismatches:
- Guest at `allocateShields` checkpoint (waiting for validation)
- Host broadcasts from `deployment` (skipped `mandatoryDroneRemoval` because not needed)
- Guest rejects broadcast because phases don't match
- Guest stuck waiting indefinitely

### Architecture Solution: Phase Progression Matrix

**Core Principle:** Define valid Host phases for each Guest checkpoint, accounting for auto-skipped phases and phase progression after `bothComplete` detection.

### ALLOWED_HOST_PHASES Matrix Definition

**Location:** `GuestMessageQueueService.js` constructor (lines 18-32)

```javascript
this.ALLOWED_HOST_PHASES = {
  // Pre-game checkpoints
  'placement': ['placement', 'gameInitializing', 'determineFirstPlayer', 'energyReset', 'draw', 'deployment'],

  // Round loop checkpoints
  'optionalDiscard': ['optionalDiscard', 'draw', 'allocateShields'],
  'allocateShields': ['allocateShields', 'mandatoryDroneRemoval', 'deployment'],
  'mandatoryDiscard': ['mandatoryDiscard', 'optionalDiscard', 'draw'],
  'mandatoryDroneRemoval': ['mandatoryDroneRemoval', 'deployment'],
  'deployment': ['deployment', 'action'],
  'action': ['action', 'determineFirstPlayer']
};
```

### Matrix Rationale

**Checkpoint: `placement`**
- Guest completes placement → triggers cascade from `gameInitializing`
- Host completes placement → processes `gameInitializing → determineFirstPlayer → energyReset → draw → deployment`
- Host could broadcast from ANY phase in this cascade
- Guest must accept broadcasts from any phase in progression

**Checkpoint: `optionalDiscard`**
- Always required pause phase
- Next automatic phase: `draw`
- Next checkpoint: `allocateShields`
- Host may broadcast from `optionalDiscard` (at checkpoint), `draw` (during processing), or `allocateShields` (already advanced)

**Checkpoint: `allocateShields`**
- Conditional pause phase (round 2+)
- Next conditional phase: `mandatoryDroneRemoval` (may be skipped)
- Next checkpoint: `deployment`
- Host may broadcast from `allocateShields` (at checkpoint), `mandatoryDroneRemoval` (if needed), or `deployment` (skipped mandatoryDroneRemoval)

**Checkpoint: `deployment`**
- Always required sequential phase
- Next phase: `action`
- Host may broadcast from `deployment` (at checkpoint) or `action` (already processing)

**Checkpoint: `action`**
- Always required sequential phase
- Next phase (round boundary): `determineFirstPlayer`
- Host may broadcast from `action` (at checkpoint) or `determineFirstPlayer` (new round started)

### Implementation: Checkpoint Validation

**Location:** `GuestMessageQueueService.processMessage()` (lines 676-693)

```javascript
// If Guest IS at checkpoint, check if host phase is in allowed list
const allowedPhases = this.ALLOWED_HOST_PHASES[guestPhase] || [guestPhase];
if (!allowedPhases.includes(hostPhase)) {
  debugLog('VALIDATION', `⏸️ [GUEST] Host phase not in allowed list for checkpoint`, {
    guestPhase,
    hostPhase,
    allowedPhases,
    waiting: `Guest at ${guestPhase}, host at ${hostPhase}`
  });
  return; // Reject broadcast - wait for valid phase
}

debugLog('VALIDATION', `✅ [GUEST] Host phase in allowed list for checkpoint`, {
  guestPhase,
  hostPhase,
  allowedPhases,
  checkpointPhase: guestPhase,
  hostPhase,
  allowedPhases
});
```

### Why Auto-Skipped Phases Create Mismatches

**Scenario: mandatoryDroneRemoval Phase**

**Guest Processing:**
1. Guest completes `allocateShields` → triggers cascade
2. Guest checks `isPhaseRequired('mandatoryDroneRemoval')` → returns `false` (no excess drones)
3. Guest skips `mandatoryDroneRemoval` → transitions directly to `deployment`
4. Guest arrives at `deployment` checkpoint (waiting for validation)

**Host Processing:**
1. Host completes `allocateShields`
2. Host checks `isPhaseRequired('mandatoryDroneRemoval')` → returns `false` (no excess drones)
3. Host skips `mandatoryDroneRemoval` → transitions directly to `deployment`
4. Host broadcasts from `deployment`

**With Strict Matching:** Guest accepts (both at `deployment`) ✅

**But if Host has excess drones:**
1. Host checks `isPhaseRequired('mandatoryDroneRemoval')` → returns `true`
2. Host processes `mandatoryDroneRemoval` phase
3. Host broadcasts from `mandatoryDroneRemoval`
4. Guest at `deployment`, Host at `mandatoryDroneRemoval` → **MISMATCH**

**With ALLOWED_HOST_PHASES Matrix:**
```javascript
// Guest at deployment checkpoint
allowedPhases = ['mandatoryDroneRemoval', 'deployment']
hostPhase = 'mandatoryDroneRemoval'
// mandatoryDroneRemoval in allowedPhases → ACCEPT ✅
```

### Architectural Benefits

**1. Handles Phase Progression:** Guest can be at checkpoint while Host is multiple phases ahead (e.g., Guest at `optionalDiscard`, Host already at `allocateShields`)

**2. Handles Auto-Skipped Phases:** Matrix includes phases that might be skipped for Guest but processed by Host

**3. Explicit and Maintainable:** Phase relationships documented in single matrix definition

**4. Prevents Invalid States:** Rejects broadcasts from phases that couldn't logically follow Guest's checkpoint

### Phase Preservation During Cascade

**Related Pattern:** When `bothComplete` is detected at checkpoint, Guest preserves its `turnPhase` before applying Host state.

**Location:** `GuestMessageQueueService.processMessage()` (lines 709-718)

```javascript
if (bothComplete) {
  // SIMULTANEOUS CASCADE: Also preserve turnPhase when cascade will be triggered
  // This prevents Guest from jumping to Host's advanced phase before processing cascade
  preservedFields.turnPhase = currentGuestState.turnPhase;
  debugLog('VALIDATION', '🔒 [CASCADE] Preserving guest phase for cascade processing', {
    guestPhase: currentGuestState.turnPhase,
    hostPhase: state.turnPhase,
    reason: 'Guest will process cascade and queue announcements before accepting host phase'
  });
}
```

**Why Preservation Needed:**

Without preservation:
1. Guest at `optionalDiscard`, Host at `draw` (Host processed automatic phase faster)
2. Guest applies Host state → Guest jumps to `draw`
3. Guest triggers cascade from `draw`
4. Guest never queues `OPTIONAL DISCARD PHASE` announcement ❌

With preservation:
1. Guest at `optionalDiscard`, Host at `draw`
2. Guest preserves `turnPhase: 'optionalDiscard'` → applies Host state with preserved phase
3. Guest triggers cascade from `draw` (next automatic phase)
4. Guest queues all phase announcements starting from current phase ✅

**Critical Distinction:**
- `roundNumber`: NOT preserved (Guest uses Host's value for conditional phase logic)
- `turnPhase`: Preserved (Guest maintains checkpoint position for cascade processing)

---

## Technical Implementation: Guest Optimistic Processing

### Simultaneous Phase Completion Processing

**Specification:** When guest completes ANY simultaneous checkpoint phase, the guest triggers optimistic processing to advance through automatic phases until the next checkpoint.

**Simultaneous Checkpoint Phases:**
- `placement` - Ship section placement
- `mandatoryDiscard` - Discard excess cards (conditional)
- `optionalDiscard` - Optional card discarding
- `allocateShields` - Shield point allocation
- `mandatoryDroneRemoval` - Remove excess drones (conditional)

**Implementation Pattern:**

```javascript
// GameFlowManager.onSimultaneousPhaseComplete()
if (gameMode === 'guest') {
  // Determine start phase for cascade
  let startPhase;
  if (phase === 'placement') {
    // Special case: placement triggers initial game setup
    startPhase = 'gameInitializing';
  } else {
    // Standard case: get next automatic phase after checkpoint
    startPhase = this.getNextPhase(phase);
  }

  await this.processAutomaticPhasesUntilCheckpoint(startPhase);
}
```

**Phase Flow Examples:**

| Completed Phase | Start Cascade From | Automatic Phases Processed | Stop At |
|-----------------|-------------------|---------------------------|---------|
| placement | gameInitializing | gameInitializing → determineFirstPlayer → energyReset → draw | deployment |
| optionalDiscard | draw | draw | allocateShields |
| allocateShields | mandatoryDroneRemoval | mandatoryDroneRemoval (if needed) | deployment |

**Completion Detection Requirements:**

Both host and guest MUST run `checkSimultaneousPhaseCompletion()`:
- **Host**: Detects completion → applies commitments → transitions phases → broadcasts
- **Guest**: Detects completion → triggers optimistic cascade → validates at next checkpoint

```javascript
// GameFlowManager.checkSimultaneousPhaseCompletion()
// NO mode-based guards - both host and guest detect completion
if (eventType !== 'COMMITMENT_UPDATE' || !state.commitments) {
  return; // Only guard on event type
}

// Check if both players committed...
if (bothComplete) {
  this.onSimultaneousPhaseComplete(currentPhase, commitments);
}
```

**Critical Rules:**
1. **No Guest Guards**: Guest must detect completion to trigger cascade
2. **Next Phase Start**: Cascade starts from NEXT automatic phase, not completed simultaneous phase
3. **Placement Exception**: Only placement starts from gameInitializing (initial setup)
4. **Automatic Only**: processAutomaticPhasesUntilCheckpoint expects automatic or checkpoint phases

### processAutomaticPhasesUntilCheckpoint Method

**Purpose:** Process automatic phases sequentially until reaching a checkpoint for validation.

**Method Signature:**
```javascript
async processAutomaticPhasesUntilCheckpoint(startPhase)
```

**Algorithm:**
1. Set `isInCheckpointCascade = true` (prevents recursive auto-processing in transitionToPhase)
2. Loop through phases starting from startPhase:
   - Process phase logic via `processPhaseLogicOnly()`
   - Get next phase
   - If next phase is checkpoint: transition to it and STOP
   - If next phase is automatic: transition to it and CONTINUE
3. Clear `isInCheckpointCascade = false` (in finally block)
4. Start animation playback if queue has announcements

**Recursive Processing Prevention:**

```javascript
// GameFlowManager.processAutomaticPhasesUntilCheckpoint()
this.isInCheckpointCascade = true; // Local cascade flag
try {
  // Process phases in loop...
} finally {
  this.isInCheckpointCascade = false; // Always clear

  // Start animation playback for queued announcements
  if (this.phaseAnimationQueue.getQueueLength() > 0) {
    this.phaseAnimationQueue.startPlayback();
  }
}

// GameFlowManager.transitionToPhase()
if (this.isAutomaticPhase(newPhase) && !this.isInCheckpointCascade) {
  await this.processAutomaticPhase(newPhase); // Only auto-process when NOT in cascade
}
```

**Why Cascade Flag Needed:**
- `transitionToPhase()` normally auto-processes automatic phases
- During cascade, we manually control processing in the loop
- Flag prevents double-processing and infinite recursion

**Example Flow:**
```
processAutomaticPhasesUntilCheckpoint('gameInitializing')
  → [CASCADE FLAG ON]
  → processes gameInitializing logic
  → transitions to determineFirstPlayer (flag prevents auto-process)
  → processes determineFirstPlayer logic
  → transitions to energyReset (flag prevents auto-process)
  → processes energyReset logic
  → transitions to draw (flag prevents auto-process)
  → processes draw logic
  → next is deployment (checkpoint) - transitions and STOPS
  → [CASCADE FLAG OFF]
  → starts animation playback (announcements play while waiting)
```

### Pre-Game Phase Classification

**Critical:** Not all pre-game phases should accept broadcasts immediately.

**True Pre-Game Phases** (Accept all broadcasts):
- `null` - No game started
- `deckSelection` - Deck selection screen
- `droneSelection` - Drone selection screen

**Simultaneous Phases** (Trigger optimistic processing):
- `placement` - Ship placement (triggers cascade when both complete)

**Implementation in GuestMessageQueueService:**
```javascript
// INCORRECT - placement is NOT a pre-game phase
const preGamePhases = [null, 'deckSelection', 'droneSelection', 'placement'];

// CORRECT - placement triggers optimistic processing instead
const preGamePhases = [null, 'deckSelection', 'droneSelection'];
```

**Why This Matters:**
- If `placement` is in pre-game list: Guest accepts host's `determineFirstPlayer` broadcast → Guest stuck at that phase
- If `placement` triggers processing: Guest processes all phases optimistically → Guest reaches deployment checkpoint → Success

---

## Broadcasting Strategy

### Host Broadcasts
Host broadcasts at these points:
1. **After each automatic phase completes** (for Guest to cache during optimistic processing)
2. **When reaching validation checkpoint** (for Guest to validate against)
3. **After user commits action** (shields allocated, cards discarded, etc.)

**What Host Broadcasts Contain:**
- ✅ Game state changes (turnPhase, currentPlayer, energy, hand, etc.)
- ✅ Action animations (combat, card effects, movement, etc.)
- ✅ System events (energy reset, card draws, etc.)
- ❌ **PHASE_ANNOUNCEMENT animations are NOT broadcast**

**Phase Announcement Policy:**
Each client (Host and Guest) queues phase announcements locally based on its own phase processing. This ensures:
- No duplicate announcements
- Clean separation of concerns: Host = authoritative state, Guest = own presentation
- Guest sees announcements immediately during optimistic processing without waiting for broadcasts

### Guest Caching
During optimistic processing:
- Guest caches all Host broadcasts
- Does NOT apply them immediately (continues optimistic processing)
- Uses cache for validation when reaching checkpoint
- Guest queues PHASE_ANNOUNCEMENT locally as it processes phases, NOT from cached broadcasts

---

## Implementation Requirements

### GameFlowManager
- `processAutomaticCascade()` - Process automatic phases until hitting pause
- `reachValidationCheckpoint()` - Validate Guest state against cached Host broadcast
- `waitForBothPlayers()` - Block at pause phase until both Continue

### ActionProcessor
- Continues broadcasting all phase transitions
- **Does NOT include PHASE_ANNOUNCEMENT animations in broadcasts** (each client queues locally)
- Broadcasts contain only state changes and action/system animations

### GuestMessageQueueService
- Cache broadcasts during optimistic processing
- Apply cached broadcast when validation checkpoint reached
- **Does NOT process PHASE_ANNOUNCEMENT animations** (guest queues locally during optimistic processing)

### PhaseAnimationQueue
- Non-blocking sequential playback
- Both Host and Guest queue announcements locally as they process phases
- Guest queues announcements during optimistic cascade without waiting for host broadcasts

---

## Success Criteria

✅ Guest sees all phase announcements in sequence (no skipped announcements)
✅ Guest validates state at every checkpoint
✅ Pause phases block until both players click Continue
✅ Conditional phases validate silently if not needed
✅ Host broadcasts are cached during optimistic processing
✅ If Guest/Host mismatch, Guest adopts Host state without error

---

## Implementation Checklist

### Core Files

**GameFlowManager.js**
- `checkSimultaneousPhaseCompletion()`: No mode-based guards (lines 622-626)
- `onSimultaneousPhaseComplete()`: Handles ALL simultaneous phases for guest (lines 460-490), calls `startPlayback()` after simultaneous→sequential transition for host (lines 586-599)
- `processAutomaticPhasesUntilCheckpoint()`: Cascade processing with recursion prevention (lines 884-943), calls `startPlayback()` in finally block (lines 933-941)
- `transitionToPhase()`: Checks `isInCheckpointCascade` flag before auto-processing (lines 1533-1540)

**GuestMessageQueueService.js**
- Pre-game phase list: `[null, 'deckSelection', 'droneSelection']` (NOT placement)
- Three-tier validation: pre-game, both-pass transitions, sequential phases, checkpoint validation
- Sequential phase check requires phase match: `guestPhase === hostPhase`
- **Both-pass transition validation** (lines 525-540): Uses local passInfo for guest pass detection, handles deployment→action AND action→round transitions
- **Opponent pass notification** (lines 580-583): Deduces opponent passed from both-pass transition, queues "OPPONENT PASSED" before phase announcement
- **Phase announcement queueing** (lines 585-609): Queues announcements for both sequential phases and round start phases
- **Automatic cascade triggering** (lines 611-618, 50-62, 797-809): Detects both-pass to automatic phase, triggers `processAutomaticPhasesUntilCheckpoint` after state application

**GameStateManager.js**
- `MILESTONE_PHASES`: Includes all simultaneous checkpoints (line 88)

### Critical Implementation Patterns

**Pattern 1: Completion Detection**
```javascript
// Both host and guest detect completion - NO mode guards
checkSimultaneousPhaseCompletion(state, eventType) {
  if (eventType !== 'COMMITMENT_UPDATE') return;
  // Check both complete → trigger onSimultaneousPhaseComplete
}
```

**Pattern 2: Guest Cascade Trigger**
```javascript
// Trigger for ALL simultaneous phases
if (gameMode === 'guest') {
  const startPhase = (phase === 'placement')
    ? 'gameInitializing'
    : this.getNextPhase(phase);
  await processAutomaticPhasesUntilCheckpoint(startPhase);
}
```

**Pattern 3: Recursion Prevention**
```javascript
// Use local flag to prevent double-processing
this.isInCheckpointCascade = true;
try {
  // Process phases...
} finally {
  this.isInCheckpointCascade = false;
  this.phaseAnimationQueue.startPlayback(); // Start announcements
}
```

### Common Mistakes to Avoid

**Mistake 1: Mode-Based Guard in Completion Detection**
```javascript
// WRONG - Prevents guest from detecting completion
if (state.gameMode === 'guest') return;
```
Both host and guest must detect completion. Guest needs to trigger cascade processing.

**Mistake 2: Only Handling Placement Phase**
```javascript
// WRONG - Guest stuck after other simultaneous phases
if (gameMode === 'guest' && phase === 'placement') {
  // Only placement handled
}
```
ALL simultaneous checkpoint phases must trigger guest cascade.

**Mistake 3: Wrong Start Phase**
```javascript
// WRONG - optionalDiscard is simultaneous, not automatic
await processAutomaticPhasesUntilCheckpoint('optionalDiscard');
```
Use `getNextPhase(completedPhase)` to get the automatic phase that follows.

**Mistake 4: Forgetting Recursion Prevention**
Without `isInCheckpointCascade` flag, `transitionToPhase()` will auto-process automatic phases, creating double-processing and infinite loops.

**Mistake 5: Not Starting Animation Playback**
Guest queues announcements during cascade but never sees them without calling `startPlayback()` in finally block.

**Mistake 6: Missing Playback on Simultaneous→Sequential Transition**
```javascript
// WRONG - Host doesn't see deployment announcement
this.initiateSequentialPhase(nextPhase);
// Missing startPlayback() call!
```

When host transitions from simultaneous (allocateShields) to sequential (deployment), announcement gets queued but playback never starts. Solution: Call `startPlayback()` after `initiateSequentialPhase()` completes.

**Correct Implementation (GameFlowManager.js lines 586-599):**
```javascript
this.initiateSequentialPhase(nextPhase);

// Start animation playback for host after transitioning to sequential phase
if (this.phaseAnimationQueue) {
  const queueLength = this.phaseAnimationQueue.getQueueLength();
  if (queueLength > 0 && !this.phaseAnimationQueue.isPlaying()) {
    this.phaseAnimationQueue.startPlayback();
  }
}
```

**Why Guest Doesn't Have This Issue:**
Guest's path through `onSimultaneousPhaseComplete` detects next phase is already a checkpoint (deployment) and transitions directly (lines 479-484), then returns from cascade and hits the `finally` block which calls `startPlayback()` (lines 933-941).

**Mistake 7: Using Broadcast PassInfo for Both-Pass Validation**
```javascript
// WRONG - Broadcast passInfo is reset during phase transition
const isBothPass = state.passInfo?.player1Passed && state.passInfo?.player2Passed;
```

Host resets passInfo during `processPhaseTransition()` (ActionProcessor line 1620). Broadcast always shows `player1Passed: false, player2Passed: false`. Guest must check LOCAL passInfo instead.

**Correct Implementation (GuestMessageQueueService.js lines 526-527):**
```javascript
const localState = this.gameStateManager.getState();
const guestHasPassedLocally = localState.passInfo?.player2Passed || false;
const acceptTransition = guestHasPassedLocally && validPhaseProgression;
```

**Mistake 8: Not Queueing Phase Announcements on Guest Both-Pass Accept**
```javascript
// WRONG - Guest accepts broadcast but doesn't queue announcement
if (isBothPassBroadcast) {
  // Accept broadcast
  // Missing: Queue phase announcement!
}
```

Host queues announcements during `processPhaseTransition()`. Guest receives state passively and must queue explicitly when accepting both-pass transitions.

**Correct Implementation (GuestMessageQueueService.js lines 585-609):**
```javascript
if (isBothPassBroadcast && hostPhase !== guestPhase) {
  const phaseAnimationQueue = this.gameStateManager.gameFlowManager?.phaseAnimationQueue;
  phaseAnimationQueue.queueAnimation(hostPhase, phaseTextMap[hostPhase], null);
  phaseAnimationQueue.startPlayback();
}
```

**Mistake 9: Not Queueing Opponent Pass Notification for Guest**
```javascript
// WRONG - Guest queues phase announcement but not opponent pass notification
if (isBothPassBroadcast) {
  phaseAnimationQueue.queueAnimation(hostPhase, phaseTextMap[hostPhase], null);
  // Missing: Queue "OPPONENT PASSED" notification!
}
```

When guest passes first and host passes second, host's both-pass transition resets passInfo before broadcasting. Guest receives broadcast with `player1Passed: false` (reset), so GameFlowManager's opponent pass detection (line 136) never triggers. Guest must deduce opponent passed from the both-pass transition itself.

**Deduction Logic:**
- Both-pass transition detected (phase mismatch + local pass state)
- Guest has passed locally → opponent must have also passed (triggering transition)
- Queue "OPPONENT PASSED" before phase announcement

**Correct Implementation (GuestMessageQueueService.js lines 580-609):**
```javascript
if (isBothPassBroadcast) {
  const phaseAnimationQueue = this.gameStateManager.gameFlowManager?.phaseAnimationQueue;

  // Queue opponent pass notification FIRST (deduced from transition)
  phaseAnimationQueue.queueAnimation('playerPass', 'OPPONENT PASSED', null);

  // Then queue phase announcement
  if (hostPhase !== guestPhase) {
    const phaseTextMap = {
      'action': 'ACTION PHASE',
      'deployment': 'DEPLOYMENT PHASE',
      'determineFirstPlayer': 'DETERMINING FIRST PLAYER',
      'energyReset': 'ENERGY RESET',
      'draw': 'DRAW PHASE'
    };
    phaseAnimationQueue.queueAnimation(hostPhase, phaseTextMap[hostPhase], null);
  }

  phaseAnimationQueue.startPlayback();
}
```

**Why GameFlowManager Detection Doesn't Work:**
GameFlowManager monitors passInfo changes (lines 124-159) to queue "OPPONENT PASSED" when `opponentPassKey` changes from false → true. This works when HOST passes first (guest receives broadcast with `player1Passed: true`). But when GUEST passes first, host immediately transitions on second pass, resetting passInfo before broadcast. Guest receives `player1Passed: false`, detection never triggers.

---

This architecture provides responsive multiplayer gameplay through optimistic processing while maintaining correctness via checkpoint validation and excellent UX with visual continuity.

