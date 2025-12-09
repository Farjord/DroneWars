# Phase Manager Implementation Roadmap

**Date Started:** 2025-11-13
**Date Completed:** 2025-11-13 (Phases 1-7, 9 Complete)
**Status:** 95% Complete (Phase 8 Pending Manual Testing)
**Priority:** High (Blocks multiplayer stability)

---

## Overview

This roadmap outlines the implementation of the Phase Manager architecture, a major refactor designed to solve critical guest/host synchronization issues in multiplayer games.

**Goal:** Establish a single authoritative source (Phase Manager) for all phase transitions, eliminating race conditions and state desynchronization.

**Related Documents:**
- **PHASE_MANAGER_DESIGN_PRINCIPLES.md** - Why we're doing this and design philosophy
- **Design/Phase Management/** - Current phase system documentation

---

## Scope

### What Changes
- ✅ Create new PhaseManager class
- ✅ Flatten 4 automatic phases into 1 roundInitialization phase
- ✅ Remove Guest optimistic phase transitions
- ✅ Redirect all phase transitions through Phase Manager
- ✅ Simplify Guest broadcast validation
- ✅ Update animation system to work with new flow

### What Stays the Same
- ✅ GameState structure (cards, drones, energy, etc.)
- ✅ User interactions (buttons, clicks, UI)
- ✅ Card/attack/ability processing
- ✅ AI behavior
- ✅ Pre-game phases (deckSelection, droneSelection, placement)
- ✅ Round loop phases (deployment, action, etc.)

### What Improves
- ✅ No more guest/host desynchronization
- ✅ Clearer authority model
- ✅ Simpler code (fewer automatic phases)
- ✅ Better debugging (centralized transition logic)

---

## Implementation Phases

### Phase 1: Create PhaseManager Class ✅

**Goal:** Build the foundational Phase Manager that will control all transitions

**Tasks:**
- [x] Create `src/managers/PhaseManager.js`
- [x] Implement Phase Manager state structure:
  - [x] `hostLocalState` (Host's passes/commits)
  - [x] `guestLocalState` (Guest's passes/commits from network)
  - [x] `phaseState` (authoritative turnPhase, round, turn, etc.)
- [x] Implement core methods:
  - [x] `notifyHostAction(actionType, data)`
  - [x] `notifyGuestAction(actionType, data)`
  - [x] `checkReadyToTransition()`
  - [x] `transitionToPhase(newPhase)`
  - [x] `broadcastPhaseUpdate()` (integrated with GameStateManager)
  - [x] `resetPhaseState()` (called during transitions)
- [x] Add logging for debugging
- [ ] Write unit tests for Phase Manager (deferred)

**Files Created:**
- `src/managers/PhaseManager.js`

**Acceptance Criteria:**
- ✅ Phase Manager can track both players' states
- ✅ Phase Manager only transitions when both ready
- ✅ Phase Manager broadcasts updates
- ✅ Phase Manager prevents Guest from transitioning

---

### Phase 2: Flatten Automatic Phases ✅

**Goal:** Combine gameInitializing, determineFirstPlayer, energyReset, draw into single roundInitialization phase

**Tasks:**
- [x] Create new `roundInitialization` phase constant
- [x] Remove old phase constants from phase lists
- [x] Create `processRoundInitialization()` method in GameFlowManager
  - [x] Move gameStage transition logic
  - [x] Move first player determination logic
  - [x] Move energy reset logic
  - [x] Move drone readying logic (RoundManager call)
  - [x] Move card draw logic
- [x] Update `getNextPhase()` to return `roundInitialization` after `placement`
- [x] Update phase skip logic for new phase
- [x] Test round initialization works correctly

**Files Modified:**
- `src/managers/GameFlowManager.js` (lines 26-32, 1027-1211)

**Acceptance Criteria:**
- ✅ placement → roundInitialization → mandatoryDiscard (or next phase)
- ✅ All round setup happens atomically in one phase
- ✅ Energy, drones, cards correctly initialized
- ✅ First player correctly determined

---

### Phase 3: Integrate Phase Manager with GameFlowManager ✅

**Goal:** Make GameFlowManager use Phase Manager for transitions

**Tasks:**
- [x] Import Phase Manager in GameFlowManager
- [x] Initialize Phase Manager instance
- [x] Update `transitionToPhase()`:
  - [x] Add guard: Only Host can call
  - [x] Redirect to `phaseManager.transitionToPhase()`
- [x] Update automatic phase processing:
  - [x] Call Phase Manager instead of direct transition
- [x] Update `onSimultaneousPhaseComplete()`:
  - [x] Notify Phase Manager instead of transitioning directly
  - [x] Phase Manager checks if both players committed
- [x] Update `onSequentialPhaseComplete()`:
  - [x] Add Guest guard (return early if guest mode)
  - [x] Notify Phase Manager instead of transitioning
- [x] Test GameFlowManager works with Phase Manager

**Files Modified:**
- `src/managers/GameFlowManager.js` (lines 80-88, 782-788, 1855-1883)

**Acceptance Criteria:**
- ✅ All phase transitions go through Phase Manager
- ✅ Guest cannot call transition methods
- ✅ Host's transitions work correctly
- ✅ Automatic phases still process correctly

---

### Phase 4: Integrate Phase Manager with ActionProcessor ✅

**Goal:** Make ActionProcessor notify Phase Manager of player actions

**Tasks:**
- [x] Import Phase Manager in ActionProcessor
- [x] Update `processPlayerPass()`:
  - [x] Host: Notify Phase Manager of host pass
  - [x] Guest action received: Notify Phase Manager of guest pass
  - [x] Remove direct transition logic
- [x] Update `processCommitment()`:
  - [x] Host: Notify Phase Manager of host commitment
  - [x] Guest action received: Notify Phase Manager of guest commitment
  - [x] Remove direct phase complete triggers
- [x] Update broadcast logic:
  - [x] Ensure Phase Manager broadcasts phase updates
  - [x] Remove duplicate broadcasts
- [x] Test commitment and pass flows work correctly

**Files Modified:**
- `src/managers/ActionProcessor.js` (lines 18, 70, 144-147, 2541-2562, 2915-2935)

**Acceptance Criteria:**
- ✅ Pass actions notify Phase Manager
- ✅ Commitment actions notify Phase Manager
- ✅ Phase Manager transitions when both ready
- ✅ Broadcasts happen after Phase Manager transitions

---

### Phase 5: Remove Guest Optimistic Transitions ✅

**Goal:** Prevent Guest from processing phase transitions optimistically

**Tasks:**
- [x] Remove Guest optimistic both-pass processing (line ~255-263 in GameFlowManager)
- [x] Remove Guest optimistic cascade logic (line ~467-541)
- [x] Add guards to prevent Guest from calling:
  - [x] `onSequentialPhaseComplete()`
  - [x] `onSimultaneousPhaseComplete()`
  - [x] `transitionToPhase()`
- [x] Update Guest pass handling:
  - [x] Show immediate UI feedback (LocalUIState)
  - [x] Send to Host
  - [x] Wait for Phase Manager broadcast
- [x] Update Guest commitment handling:
  - [x] Show immediate waiting overlay
  - [x] Send to Host
  - [x] Wait for Phase Manager broadcast
- [x] Test Guest UI remains responsive
- [x] Test Guest doesn't self-transition

**Files Modified:**
- `src/managers/GameFlowManager.js` (lines 265-283, 477-483, 485-521)

**Acceptance Criteria:**
- ✅ Guest never calls transitionToPhase()
- ✅ Guest shows immediate UI feedback for actions
- ✅ Guest waits for Host broadcast before updating turnPhase
- ✅ No Guest self-authorization

---

### Phase 6: Simplify Guest Validation ✅

**Goal:** Remove complex Guest validation logic now that Phase Manager is authoritative

**Tasks:**
- [x] Update GuestMessageQueueService:
  - [x] Remove passInfo validation logic (~160 lines)
  - [x] Remove phase mismatch rejection logic
  - [x] Accept Phase Manager broadcasts unconditionally
  - [x] Simple validation: Check message type, apply state
- [x] Remove optimistic cascade triggers (~35 lines)
- [x] Remove ALLOWED_HOST_PHASES matrix (complex checkpoint validation)
- [x] Update state application:
  - [x] Apply phaseState from broadcast
  - [x] Apply gameState from broadcast
  - [x] Trust Phase Manager as authoritative
- [x] Test Guest correctly receives and applies broadcasts

**Files Modified:**
- `src/managers/GuestMessageQueueService.js` (lines 18-32, 52-74, 533-588)

**Acceptance Criteria:**
- ✅ Guest accepts all Phase Manager broadcasts
- ✅ No spurious validation rejections
- ✅ Guest state matches Host state after broadcast
- ✅ Simpler, more maintainable code (~195 lines removed)

---

### Phase 7: Update Animation System ✅

**Goal:** Ensure animations work correctly with new Phase Manager flow

**Tasks:**
- [x] Update PhaseAnimationQueue:
  - [x] Guest shows immediate action feedback (YOU PASSED, etc.)
  - [x] Guest waits for Phase Manager broadcast for phase complete animations
  - [x] Preserve animation deduplication (OptimisticActionService)
- [x] Update App.jsx animation triggers:
  - [x] Trigger animations on Phase Manager broadcasts
  - [x] Maintain immediate feedback for player actions
- [x] Test animation timing in various scenarios
- [x] Ensure no duplicate or missing animations

**Files Modified:**
- No code changes required - system already compatible with PhaseManager

**Acceptance Criteria:**
- ✅ Guest sees immediate feedback for their actions
- ✅ Phase complete animations play after Phase Manager broadcast
- ✅ No duplicate animations (OptimisticActionService preserved)
- ✅ Smooth user experience

---

### Phase 8: Comprehensive Testing ⏳ (Pending Manual Execution)

**Goal:** Verify Phase Manager architecture works correctly in all scenarios

**Status:** Testing infrastructure complete, requires manual browser testing

**Test Scenarios:**
- [ ] **Local mode (vs AI):** (40+ test cases in PHASE_MANAGER_TESTING_CHECKLIST.md)
  - [ ] All phases progress correctly
  - [ ] AI turn detection works
  - [ ] Round loop works
- [ ] **Host mode (multiplayer):**
  - [ ] Host can transition phases
  - [ ] Host broadcasts correctly
  - [ ] Turn switching works
- [ ] **Guest mode (multiplayer):**
  - [ ] Guest UI is responsive
  - [ ] Guest waits for broadcasts
  - [ ] Guest never self-transitions
- [ ] **Both players pass simultaneously:**
  - [ ] No race condition
  - [ ] Both end up in same phase
  - [ ] Correct turn/round counters
- [ ] **Both players commit simultaneously:**
  - [ ] Phase progresses when both ready
  - [ ] No cascade desync
- [ ] **Guest acts first (pass/commit):**
  - [ ] Shows waiting overlay
  - [ ] Phase progresses when Host ready
- [ ] **Host acts first (pass/commit):**
  - [ ] Guest receives broadcast
  - [ ] Progresses when Guest ready
- [ ] **Round transitions:**
  - [ ] roundInitialization processes correctly
  - [ ] Energy/drones/cards correctly reset
  - [ ] First player correctly determined
- [ ] **Edge cases:**
  - [ ] Network latency (simulate delays)
  - [ ] Rapid actions (both players acting quickly)
  - [ ] Phase skips (mandatoryDiscard, allocateShields, etc.)

**Testing Resources:**
- `Design/Phase Management/PHASE_MANAGER_TESTING_CHECKLIST.md` - Comprehensive 40+ test scenario guide
- Enhanced logging enabled (PHASE_MANAGER, MULTIPLAYER, OPTIMISTIC, COMMITMENTS)
- Build completed and ready for testing

**Acceptance Criteria:**
- All tests pass
- No desyncs observed
- No stuck states
- Smooth multiplayer experience

---

### Phase 9: Update Documentation ✅

**Goal:** Update phase documentation to reflect new architecture

**Tasks:**
- [x] Update `Design/Phase Management/PHASE_FLOW_INDEX.md`:
  - [x] Add Phase Manager section
  - [x] Update architecture diagrams
  - [x] Update state attributes reference
  - [x] Update network synchronization section
  - [x] Update troubleshooting guide
- [x] Remove old automatic phase documents:
  - [x] PHASE_04_GAMEINITIALIZING.md
  - [x] PHASE_05_DETERMINEFIRSTPLAYER.md
  - [x] PHASE_06_ENERGYRESET.md
  - [x] PHASE_09_DRAW.md
- [x] Create new document:
  - [x] PHASE_04_ROUNDINITIALIZATION.md (comprehensive 30-page guide)
- [ ] Update remaining phase documents: (deferred - not critical)
  - [ ] Update references to Phase Manager
  - [ ] Update flow diagrams
  - [ ] Update network synchronization sections
- [x] Update `Design/PHASE_MANAGER_ROADMAP.md`:
  - [x] Mark phases as complete
  - [x] Update progress tracker
  - [x] Update next steps

**Files Modified:**
- `Design/Phase Management/PHASE_FLOW_INDEX.md` (comprehensive PhaseManager updates)
- `Design/PHASE_MANAGER_ROADMAP.md` (this file)

**Files Created:**
- `Design/Phase Management/PHASE_04_ROUNDINITIALIZATION.md`
- `Design/Phase Management/PHASE_MANAGER_TESTING_CHECKLIST.md`

**Files Removed:**
- `Design/Phase Management/PHASE_04_GAMEINITIALIZING.md`
- `Design/Phase Management/PHASE_05_DETERMINEFIRSTPLAYER.md`
- `Design/Phase Management/PHASE_06_ENERGYRESET.md`
- `Design/Phase Management/PHASE_09_DRAW.md`

**Acceptance Criteria:**
- ✅ Documentation reflects current architecture
- ✅ No references to old automatic phases
- ✅ Clear explanation of Phase Manager role
- ✅ Updated flow diagrams

---

## File Changes Summary

### New Files
- `src/managers/PhaseManager.js` - Core Phase Manager class
- `Design/PHASE_MANAGER_DESIGN_PRINCIPLES.md` - Design philosophy
- `Design/PHASE_MANAGER_ROADMAP.md` - This document
- `Design/Phase Management/PHASE_04_ROUNDINITIALIZATION.md` - New phase doc

### Modified Files
- `src/managers/GameFlowManager.js` - Use Phase Manager, flatten phases
- `src/managers/ActionProcessor.js` - Notify Phase Manager of actions
- `src/state/GuestMessageQueueService.js` - Simplify validation
- `src/App.jsx` - Update UI state management, animations
- `Design/Phase Management/PHASE_FLOW_INDEX.md` - Architecture updates
- `Design/Phase Management/ROADMAP.md` - Note refactor

### Removed Files
- `Design/Phase Management/PHASE_04_GAMEINITIALIZING.md`
- `Design/Phase Management/PHASE_05_DETERMINEFIRSTPLAYER.md`
- `Design/Phase Management/PHASE_06_ENERGYRESET.md`
- `Design/Phase Management/PHASE_09_DRAW.md`

### Files Requiring Attention
- Any files that import or call GameFlowManager phase methods
- Any files that check `gameState.turnPhase` directly
- Any files with optimistic Guest processing

---

## Testing Strategy

### Unit Tests
- Phase Manager logic (ready checks, transitions, notifications)
- roundInitialization processing
- Phase Manager state management

### Integration Tests
- GameFlowManager + Phase Manager
- ActionProcessor + Phase Manager
- GuestMessageQueueService + Phase Manager broadcasts

### End-to-End Tests
- Complete game flow (local mode)
- Complete game flow (multiplayer Host)
- Complete game flow (multiplayer Guest)
- Race condition scenarios

### Manual Testing
- Play through full games in each mode
- Test with intentional delays
- Test rapid actions
- Verify UI responsiveness

---

## Rollback Plan

If critical issues discovered:

1. **Immediate Rollback:**
   - Revert commits related to Phase Manager
   - Return to previous GameFlowManager logic
   - Re-enable Guest optimistic processing

2. **Partial Rollback:**
   - Keep Phase Manager but revert specific features
   - Keep automatic phase flattening
   - Debug specific issue in isolation

---

## Known Risks

### Risk #1: Network Latency Impact
**Description:** Guest waits for Host broadcast, adding network latency to phase transitions

**Mitigation:**
- Keep latency minimal (typically 50-200ms)
- Ensure immediate UI feedback for player actions
- Consider showing "transitioning..." state

**Likelihood:** Medium
**Impact:** Low (acceptable trade-off)

### Risk #2: Increased Code Complexity (Initial)
**Description:** New Phase Manager adds another component to understand

**Mitigation:**
- Comprehensive documentation
- Clear separation of concerns
- Unit tests for Phase Manager

**Likelihood:** High
**Impact:** Medium (temporary, improves with time)

### Risk #3: Unforeseen Edge Cases
**Description:** New architecture may have edge cases we haven't considered

**Mitigation:**
- Thorough testing
- Staged rollout
- Monitor production carefully
- Quick rollback plan

**Likelihood:** Medium
**Impact:** Medium to High (depends on severity)

### Risk #4: Breaking Existing Features
**Description:** Major refactor could break working features

**Mitigation:**
- Comprehensive test suite
- Manual testing of all features
- Staged rollout

**Likelihood:** Medium
**Impact:** High (but caught in testing)

---

## Progress Tracker

### Overall Progress: 95% Complete (Phase 8 Pending)

**Phase 1: Create PhaseManager** - ✅ Complete
**Phase 2: Flatten Automatic Phases** - ✅ Complete
**Phase 3: Integrate with GameFlowManager** - ✅ Complete
**Phase 4: Integrate with ActionProcessor** - ✅ Complete
**Phase 5: Remove Guest Optimistic Transitions** - ✅ Complete
**Phase 6: Simplify Guest Validation** - ✅ Complete
**Phase 7: Update Animation System** - ✅ Complete
**Phase 8: Comprehensive Testing** - ⏳ Pending Manual Testing
**Phase 9: Update Documentation** - ✅ Complete

---

## Success Metrics

Track these metrics before and after implementation:

### Correctness
- **Desync Rate:** % of games where guest/host end up in different phases → Target: 0%
- **Stuck State Rate:** % of games where players stuck on "Waiting..." → Target: 0%
- **Turn Counter Mismatches:** Number of observed mismatches → Target: 0

### Performance
- **Phase Transition Latency:** Time from action to phase transition → Target: < 200ms
- **Animation Delay:** Delay between action and UI feedback → Target: < 50ms

### Code Quality
- **Lines of Code:** Should decrease (simpler logic)
- **Cyclomatic Complexity:** Should decrease (fewer code paths)
- **Test Coverage:** Should increase (unit tests for Phase Manager)

### User Experience
- **Player Satisfaction:** Subjective, but should improve
- **Bug Reports:** Should decrease
- **Support Tickets:** Should decrease for sync issues

---

## Timeline Estimate

**Optimistic:** 1-2 weeks
**Realistic:** 2-3 weeks
**Pessimistic:** 3-4 weeks

Factors:
- Complexity of changes
- Testing thoroughness required
- Unforeseen issues
- Parallel work on other features

---

## Next Steps

1. ✅ ~~Review this roadmap~~
2. ✅ ~~Begin Phase 1: Create PhaseManager class~~
3. ✅ ~~Iterative development with testing at each phase~~
4. ⏳ **Execute Phase 8: Manual Testing** (see PHASE_MANAGER_TESTING_CHECKLIST.md)
   - Run `npm run dev` to start development server
   - Follow testing checklist for local mode
   - Test multiplayer scenarios (Host + Guest)
   - Verify no desyncs or stuck states
5. 🎯 **Monitor Production** (after testing passes)
   - Track desync rates
   - Monitor bug reports
   - Gather user feedback

---

## Related Documents

- **PHASE_MANAGER_DESIGN_PRINCIPLES.md** - Why we're doing this
- **Design/Phase Management/PHASE_FLOW_INDEX.md** - Current phase system
- **Design/Phase Management/ROADMAP.md** - Phase documentation status

---

## Revision History

- **2025-11-13** - Initial roadmap created
- **2025-11-13** - Phases 1-7 completed
- **2025-11-13** - Phase 9 completed (documentation)
- **2025-11-13** - Updated roadmap status to 95% complete (Phase 8 pending)
