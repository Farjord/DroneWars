# Phase Manager Testing Checklist

**Status:** Phase 8 - Comprehensive Testing
**Last Updated:** 2025-11-13
**Purpose:** Verify PhaseManager implementation works correctly across all game modes

---

## Prerequisites

- ✅ Build completed successfully
- ✅ Browser DevTools console open (to monitor debug logs)
- ✅ Debug categories enabled in `src/utils/debugLogger.js`:
  - `PHASE_MANAGER: true`
  - `PHASE_FLOW: true`
  - `NETWORK: true` (for multiplayer tests)

---

## Test 1: Local Mode (vs AI)

**Objective:** Verify PhaseManager works correctly in single-player mode

### Setup
1. Start dev server: `npm run dev`
2. Open game in browser
3. Select "LOCAL" mode
4. Choose any deck + drones
5. Complete ship placement

### Test Cases

#### 1.1: Round Initialization (Flattened Automatic Phases)
- [ ] **After placement:** Game immediately shows "Round 1" announcement
- [ ] **Console logs:** Look for single `roundInitialization` phase transition
- [ ] **Energy/Shields:** Both players have correct starting values
- [ ] **Card Draw:** Both players have 5 cards (or hand limit)
- [ ] **First Player:** Announcement shows who goes first (deterministic from seed)
- [ ] **No multiple broadcasts:** Should see ONE broadcast for roundInitialization, not 4 separate phases

**Expected Console Logs:**
```
PHASE_MANAGER: ✅ PhaseManager initialized (mode: local)
PHASE_MANAGER: 📤 [LOCAL] Transitioning to roundInitialization
PHASE_FLOW: 🎬 Processing roundInitialization phase
PHASE_FLOW: ✅ Automatic draw phase completed
```

#### 1.2: Sequential Phase Completion (Both Players Pass)
- [ ] **Action phase:** Player 1 passes
- [ ] **Action phase:** Player 2 (AI) passes
- [ ] **Phase transition:** Game moves to mandatoryDroneRemoval
- [ ] **Console logs:** PhaseManager notified of both passes
- [ ] **Animation:** Phase complete animation plays

**Expected Console Logs:**
```
PHASE_MANAGER: 📥 Notified PhaseManager: player1 passed in action (local mode)
PHASE_MANAGER: 📥 Notified PhaseManager: player2 passed in action (local mode)
PHASE_MANAGER: ✅ [LOCAL] Both players passed in action, transitioning to next phase
```

#### 1.3: Simultaneous Phase Completion (Both Players Commit)
- [ ] **Discard phase:** Player 1 commits (keeps all cards)
- [ ] **Discard phase:** AI commits
- [ ] **Phase transition:** Game moves to allocateShields
- [ ] **Console logs:** PhaseManager tracks both commitments

**Expected Console Logs:**
```
PHASE_MANAGER: 📥 Notified PhaseManager: player1 committed in mandatoryDiscard (local mode)
PHASE_MANAGER: 📥 Notified PhaseManager: player2 committed in mandatoryDiscard (local mode)
PHASE_MANAGER: ✅ [LOCAL] Both players committed in mandatoryDiscard, transitioning to next phase
```

#### 1.4: Round 2 Initialization
- [ ] **After deployment complete:** Round 2 starts automatically
- [ ] **First player determination:** Correct first passer goes first
- [ ] **Energy reset:** Both players get fresh energy budgets
- [ ] **Card draw:** Both players draw to hand limit
- [ ] **Single broadcast:** Only ONE roundInitialization transition

**Pass Criteria:** ✅ All local mode transitions work correctly, PhaseManager logs show proper tracking

---

## Test 2: Host Mode (Multiplayer)

**Objective:** Verify PhaseManager broadcasts work correctly for Host player

### Setup
1. Start dev server: `npm run dev`
2. Open game in browser (this will be Host)
3. Select "HOST" mode
4. Copy the connection URL
5. Complete deck + drone selection
6. Complete ship placement
7. Wait for Guest to connect (see Test 3)

### Test Cases

#### 2.1: Host Round Initialization
- [ ] **After both players place ships:** Round 1 starts
- [ ] **Console logs:** PhaseManager transitions and broadcasts to Guest
- [ ] **Network logs:** Single broadcast for roundInitialization (not 4 separate)
- [ ] **Host state:** Has correct energy, shields, cards

**Expected Console Logs:**
```
PHASE_MANAGER: ✅ PhaseManager initialized (mode: host)
PHASE_MANAGER: 📤 [HOST] Transitioning to roundInitialization
NETWORK: 📡 Broadcasting state to Guest (phase: roundInitialization)
```

#### 2.2: Host Passes First (Sequential Phase)
- [ ] **Action phase:** Host (player1) passes
- [ ] **Waiting overlay:** Shows "Waiting for opponent..."
- [ ] **Guest passes:** (see Test 3.2)
- [ ] **Phase transition:** Game moves to next phase
- [ ] **Console logs:** PhaseManager detected both passes, transitioned

**Expected Console Logs:**
```
PHASE_MANAGER: 📥 Notified PhaseManager: Host passed in action
PHASE_MANAGER: 📥 Notified PhaseManager: Guest passed in action (via network)
PHASE_MANAGER: ✅ [HOST] Both players passed, ready to transition
PHASE_MANAGER: 📤 [HOST] Transitioning to mandatoryDroneRemoval
NETWORK: 📡 Broadcasting state to Guest (phase: mandatoryDroneRemoval)
```

#### 2.3: Guest Passes First (Sequential Phase)
- [ ] **Deployment phase:** Guest passes first
- [ ] **Host receives pass:** PhaseManager tracks Guest pass
- [ ] **Host passes:** PhaseManager detects both passed, transitions
- [ ] **Broadcast sent:** Guest receives transition

**Expected Console Logs:**
```
PHASE_MANAGER: 📥 Notified PhaseManager: Guest passed in deployment (via network)
PHASE_MANAGER: 📥 Notified PhaseManager: Host passed in deployment
PHASE_MANAGER: ✅ [HOST] Both players passed, ready to transition
```

#### 2.4: Host Commits First (Simultaneous Phase)
- [ ] **Discard phase:** Host commits
- [ ] **Waiting overlay:** Shows "Waiting for opponent..."
- [ ] **Guest commits:** (see Test 3.4)
- [ ] **Phase transition:** Game moves to next phase
- [ ] **Console logs:** PhaseManager detected both commits

**Expected Console Logs:**
```
PHASE_MANAGER: 📥 Notified PhaseManager: Host committed in mandatoryDiscard
PHASE_MANAGER: 📥 Notified PhaseManager: Guest committed in mandatoryDiscard (via network)
PHASE_MANAGER: ✅ [HOST] Both players committed, ready to transition
```

#### 2.5: Guest Commits First (Simultaneous Phase)
- [ ] **Shield allocation:** Guest commits first
- [ ] **Host receives commit:** PhaseManager tracks Guest commit
- [ ] **Host commits:** PhaseManager detects both committed, transitions
- [ ] **Broadcast sent:** Guest receives transition

**Pass Criteria:** ✅ Host PhaseManager correctly tracks both players' actions, transitions only when both ready, broadcasts to Guest

---

## Test 3: Guest Mode (Multiplayer)

**Objective:** Verify Guest cannot self-transition, trusts PhaseManager broadcasts

### Setup
1. Open second browser window/tab (or different browser)
2. Paste Host connection URL from Test 2
3. Complete deck + drone selection
4. Complete ship placement

### Test Cases

#### 3.1: Guest Receives Round Initialization
- [ ] **After placement:** Guest receives roundInitialization broadcast from Host
- [ ] **Console logs:** Guest accepts broadcast, does NOT attempt self-transition
- [ ] **Guest state:** Has correct energy, shields, cards (matches Host)
- [ ] **No validation errors:** Guest trusts PhaseManager unconditionally

**Expected Console Logs:**
```
PHASE_MANAGER: ✅ PhaseManager initialized (mode: guest)
NETWORK: 📥 [GUEST] Received state broadcast (phase: roundInitialization)
PHASE_MANAGER: 📥 [GUEST] Accepting PhaseManager broadcast (guestPhase: placement, hostPhase: roundInitialization)
```

#### 3.2: Guest Passes First (Sequential Phase)
- [ ] **Action phase:** Guest passes
- [ ] **Immediate animation:** Guest sees own pass animation immediately
- [ ] **Waiting overlay:** Shows "Waiting for opponent..."
- [ ] **Console logs:** Guest DOES NOT call transitionToPhase()
- [ ] **Host passes:** (see Test 2.2)
- [ ] **Guest receives broadcast:** Phase advances to mandatoryDroneRemoval

**Expected Console Logs:**
```
PHASE_MANAGER: 🚫 Guest attempted to complete sequential phase action - BLOCKED
PHASE_MANAGER: ✅ [GUEST] Pass processed, waiting for Host's PhaseManager broadcast
NETWORK: 📥 [GUEST] Received state broadcast (phase: mandatoryDroneRemoval)
```

#### 3.3: Host Passes First (Sequential Phase)
- [ ] **Deployment phase:** Host passes first
- [ ] **Guest receives state:** passInfo shows Host passed
- [ ] **Guest passes:** Guest sees immediate feedback
- [ ] **NO self-transition:** Guest does NOT move to action phase
- [ ] **Guest waits:** Receives broadcast from Host with "DEPLOYMENT COMPLETE" announcement

**Expected Console Logs:**
```
NETWORK: 📥 [GUEST] Received state broadcast (phase: deployment, passInfo: {player1: true})
PHASE_MANAGER: 🚫 Guest attempted to complete sequential phase deployment - BLOCKED
PHASE_MANAGER: ✅ [GUEST] Pass processed, waiting for Host's PhaseManager broadcast
NETWORK: 📥 [GUEST] Received state broadcast (phase: action)
PHASE_ANIMATION: Queued DEPLOYMENT COMPLETE announcement (pseudo-phase)
```

#### 3.4: Guest Commits First (Simultaneous Phase)
- [ ] **Discard phase:** Guest commits
- [ ] **Immediate feedback:** Guest sees commit confirmation
- [ ] **Waiting overlay:** Shows "Waiting for opponent..."
- [ ] **NO self-transition:** Guest does NOT move to next phase
- [ ] **Host commits:** (see Test 2.4)
- [ ] **Guest receives broadcast:** Phase advances

**Expected Console Logs:**
```
PHASE_MANAGER: 🚫 Guest attempted to complete simultaneous phase mandatoryDiscard - BLOCKED
PHASE_MANAGER: ✅ [GUEST] Commitment processed, waiting for Host's PhaseManager broadcast
NETWORK: 📥 [GUEST] Received state broadcast (phase: allocateShields)
```

#### 3.5: Host Commits First (Simultaneous Phase)
- [ ] **Shield allocation:** Host commits first
- [ ] **Guest receives state:** commitments show Host committed
- [ ] **Guest commits:** Guest sees immediate feedback
- [ ] **NO self-transition:** Guest does NOT move to next phase
- [ ] **Guest waits:** Receives broadcast from Host

**Expected Console Logs:**
```
NETWORK: 📥 [GUEST] Received state broadcast (phase: allocateShields, commitments: {player1: true})
PHASE_MANAGER: 🚫 Guest attempted to complete simultaneous phase allocateShields - BLOCKED
NETWORK: 📥 [GUEST] Received state broadcast (phase: mandatoryDroneRemoval)
```

#### 3.6: Guest NEVER Sees Transition Errors
- [ ] **Throughout entire game:** Guest console shows NO errors
- [ ] **No "Guest cannot transition phases!" errors**
- [ ] **No "PhaseManager rejected transition" errors**
- [ ] **All transitions via PhaseManager broadcasts:** Clean logs

**Pass Criteria:** ✅ Guest never self-transitions, trusts all PhaseManager broadcasts, no errors

---

## Test 4: Edge Cases

**Objective:** Verify PhaseManager handles edge cases correctly

### Test Cases

#### 4.1: Rapid Pass Actions
- [ ] **Setup:** Host mode, action phase
- [ ] **Action:** Both players pass within 100ms of each other
- [ ] **Result:** Only ONE phase transition occurs
- [ ] **Console logs:** PhaseManager correctly tracks both, transitions once

#### 4.2: Network Latency Simulation
- [ ] **Setup:** Host + Guest mode
- [ ] **Action:** Guest passes, wait 2-3 seconds, Host passes
- [ ] **Result:** Guest remains in same phase until Host broadcast arrives
- [ ] **Console logs:** Guest shows "waiting" logs

#### 4.3: Round Transitions
- [ ] **Setup:** Complete a full round (action → roundInitialization with ACTION COMPLETE announcement)
- [ ] **Result:** Next round starts with single roundInitialization broadcast
- [ ] **Energy reset:** Both players have fresh budgets
- [ ] **First player:** Correct first passer goes first

#### 4.4: Multiple Rounds
- [ ] **Setup:** Play 3+ full rounds
- [ ] **Result:** Each round starts with roundInitialization
- [ ] **First player alternates:** Based on who passed first previous round
- [ ] **No desync:** Host and Guest remain synchronized

#### 4.5: Guest Reconnection (if supported)
- [ ] **Setup:** Host + Guest mid-game
- [ ] **Action:** Guest refreshes browser
- [ ] **Result:** Guest receives current state, syncs with Host
- [ ] **PhaseManager:** Guest accepts broadcast, no validation errors

**Pass Criteria:** ✅ All edge cases handled gracefully, no race conditions

---

## Test 5: Animation System

**Objective:** Verify animations work correctly with PhaseManager

### Test Cases

#### 5.1: Guest Immediate Action Feedback
- [ ] **Guest passes:** Instant pass animation appears
- [ ] **Guest commits:** Instant commit confirmation
- [ ] **No delay:** Animations appear within 50ms

#### 5.2: Phase Complete Animations
- [ ] **Both players pass:** "Phase Complete" animation plays
- [ ] **Sequential playback:** Animations queue and play in order
- [ ] **Duration:** Each animation displays for ~1.5 seconds

#### 5.3: No Duplicate Animations
- [ ] **Guest action echoed back:** Only ONE animation plays (not two)
- [ ] **OptimisticActionService filtering:** Works correctly
- [ ] **Console logs:** No "duplicate animation filtered" warnings

#### 5.4: Round Initialization Animations
- [ ] **First player announcement:** Shows correct player
- [ ] **Energy reset animation:** Plays after first player
- [ ] **Card draw animation:** Plays after energy reset
- [ ] **Sequential playback:** All 3 animations play in order

**Pass Criteria:** ✅ All animations play correctly, no duplicates, sequential ordering preserved

#### 5.5: Guest Announcement Timing Coordination
- [ ] **Guest receives broadcast:** Phase announcements queue correctly
- [ ] **50ms delay:** Console shows "Scheduling animation playback after React render (50ms delay)"
- [ ] **All announcements play:** No missing phase announcements
- [ ] **No subscription errors:** App.jsx subscribed before first animation event fires
- [ ] **Visual check:** ROUND 1 announcement appears on guest at game start

**Pass Criteria:** ✅ All guest announcements play successfully without race condition errors

#### 5.6: Guest Pseudo-Phase Inference
- [ ] **Round transition (action → round):** Guest shows ACTION COMPLETE → ROUND X → UPKEEP
- [ ] **Round 1 start (placement → roundInit):** Guest shows ROUND 1 → UPKEEP
- [ ] **Deployment complete (deployment → action):** Guest shows ACTION PHASE announcement
- [ ] **Console logs:** Pattern detection logs show correct inference
- [ ] **Animation sequence:** Pseudo-phases appear in correct order before actual phase

**Pass Criteria:** ✅ Guest shows all phase announcements without host broadcasting pseudo-phases

#### 5.7: Guest Opponent Pass Detection
- [ ] **Guest passes first in action:** Guest sees "YOU PASSED"
- [ ] **Host passes second:** Phase transitions to next round
- [ ] **Guest infers opponent pass:** Console shows "Queued OPPONENT PASSED (inferred from round transition)"
- [ ] **Animation shows:** "OPPONENT PASSED" appears before "ACTION PHASE COMPLETE"
- [ ] **Same for deployment:** deployment → action transition also shows "OPPONENT PASSED"
- [ ] **Visual confirmation:** Guest sees OPPONENT PASSED → ACTION COMPLETE → ROUND X sequence

**Pass Criteria:** ✅ Guest correctly infers opponent pass from phase transitions in sequential phases

#### 5.8: Waiting Modal Animation Coordination
- [ ] **Guest commits in mandatoryDiscard:** Has no excess cards, auto-commits
- [ ] **Phase announcements playing:** ROUND X, UPKEEP, MANDATORY DISCARD queued
- [ ] **Waiting modal delayed:** Modal does NOT appear immediately
- [ ] **Console logs:** "Waiting for announcement queue to complete before showing waiting modal"
- [ ] **Visual check:** Announcements finish, THEN modal appears
- [ ] **No modal overlap:** Waiting modal never overlays phase announcements
- [ ] **Test all phases:** optionalDiscard, allocateShields, mandatoryDroneRemoval

**Pass Criteria:** ✅ Waiting modal appears only after phase announcements complete, no UI conflicts

---

## Critical Bugs to Watch For

### 🐛 Desynchronization
- **Symptom:** Host and Guest in different phases
- **Check:** Compare `turnPhase` in both browser consoles
- **Should NOT happen** with PhaseManager

### 🐛 Double Transitions
- **Symptom:** Phase skips unexpectedly (e.g., deployment → roundInitialization, skipping action phase)
- **Check:** Console logs show multiple transitions in < 100ms
- **Should NOT happen** with PhaseManager

### 🐛 Guest Self-Transition
- **Symptom:** Guest console shows "Transitioning to..." without receiving broadcast
- **Check:** Look for `🚫 Guest attempted to transition` errors
- **Should be BLOCKED** by PhaseManager

### 🐛 Stuck Waiting Overlay
- **Symptom:** "Waiting for opponent..." never clears
- **Check:** Both players' passInfo/commitments state
- **Likely cause:** Race condition in PhaseManager.checkReadyToTransition()

### 🐛 Phase Mismatch Errors
- **Symptom:** Guest rejects valid broadcast
- **Check:** Console logs show "Phase mismatch" warnings
- **Should NOT happen** - Guest trusts PhaseManager unconditionally

---

## Success Criteria

**Phase 8 is complete when:**

- ✅ All Test 1 (Local Mode) scenarios pass
- ✅ All Test 2 (Host Mode) scenarios pass
- ✅ All Test 3 (Guest Mode) scenarios pass
- ✅ All Test 4 (Edge Cases) scenarios pass
- ✅ All Test 5 (Animation System) scenarios pass
- ✅ Zero critical bugs observed
- ✅ PhaseManager logs show correct behavior throughout

---

## Next Steps

After completing Phase 8 testing:

1. **If all tests pass:** Proceed to Phase 9 (Update Documentation)
2. **If bugs found:** Fix bugs, re-test, then proceed to Phase 9
3. **If critical issues:** Rollback PhaseManager, investigate root cause

---

## Testing Notes

**Date:** __________
**Tester:** __________
**Build Version:** __________

**Issues Found:**
-
-
-

**Additional Observations:**
-
-
-
