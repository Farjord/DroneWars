# Plan: App.jsx Refactoring

## Context

App.jsx is 7,007 lines — 9x the 800-line threshold. It's the last file in the mandatory refactoring order (item #10). All 9 dependencies have been refactored. The file acts as a god object: state container (61 useState), event hub (30+ handlers), animation controller (21 animation states), and renderer (28+ modals, 12+ animation types, 5 targeting arrows).

A detailed extraction plan exists at `Design/Technical Debt Refactor/REFACTOR_APP.md` with 18 steps across 5 phases. The architect review identified 7 corrections (all applied in Session 1).

## Multi-Session Strategy

| Session | Phase | Deliverables | Expected Lines |
|-|-|-|-|
| 1 | A: Cleanup | Dead code, logging, comments, test migration, behavioral baseline | 7,007 → ~6,600 |
| 2 | B: Self-Contained Hooks | useShieldAllocation, useInterception, useAnimationEffects+AnimationLayer+TargetingArrowLayer, useModals | ~5,200 |
| 3 | C Part 1: Complex Hooks | useMultiplayerSync, useCardSelection, useDragMechanics | ~3,400 |
| 4 | C Part 2 + D: Remaining | useTargeting, useGameLifecycle, modal callbacks, ModalLayer, useActionRouting | ~1,400 |
| 5 | E: Consolidation | Dedup, useCallback wrap, final review | ~700 |

## Session 1 Outcomes

### Actual Outcomes

**Completed:**
- Behavioral baseline written (IMMUTABLE section in REFACTOR_APP.md): exports, 70+ state vars mapped, 28 useEffect hooks documented, all edge cases/race conditions cataloged
- All 7 architect corrections applied to extraction plan
- 3 misplaced test files migrated to `src/__tests__/`
- Dead code removed: HOST_ONLY_ACTIONS + dead branch, RACE_CONDITION_DEBUG, handleGameAction, handleSimultaneousAction, waitForBothPlayersComplete, handleDeployDrone, duplicate multi-move block, click-to-attack-drone, click-to-attack-section, click-to-move, dead queueAnimations reference
- 17 raw console calls → debugLog (COMBAT×4, ENERGY×5, DEBUG_TOOLS×3, SINGLE_MOVE_FLOW×1, DEPLOYMENT×1, MODAL_TRIGGER×2)
- 2 banned comments fixed (// NEW → descriptive)
- 3 stale comments removed (handleSetHoveredTarget note, enteredMandatory refs REMOVED note, auto-trigger removal explanation)
- `extractDroneNameFromId` moved to `src/logic/droneUtils.js`

**Line count:** 7,007 → 6,622 (385 lines removed, within expected 300-400 target)

**Deferred from original plan:**
- handleToggleDroneSelection: NOT dead code — used by DronesView.jsx for footer drone selection (sub-action click, not action initiation)
- targetingRouter: Kept module-level — it's stateless, moving inside component would recreate every render. No benefit.

**Test results:** 219 files, 3744 passed, 0 failures. Build clean.

## Session 2 Outcomes

### Actual Outcomes

**Completed:**
- Step 4: Extracted useShieldAllocation hook (428 lines) — 11 state vars, 14 handler functions, 1 useEffect, 1 useMemo. Added clearReallocationState() for modal onConfirm cleanup.
- Step 5: Extracted useInterception hook (213 lines) — 6 state vars, 5 handler functions, 3 useEffects. Removed calculatePotentialInterceptors import from App.jsx.
- Step 6: Extracted AnimationLayer.jsx (239 lines) + TargetingArrowLayer.jsx (51 lines) — 18 animation component imports removed from App.jsx. Pure JSX extraction.

**Line count:** 6,622 → 5,855 (767 lines removed)

**Deferred:**
- Step 7 (useModals): Extracting 25+ modal states without ModalLayer gives poor ROI (~40 lines of declarations vs re-exporting 25 setters). Will extract alongside Step 13.5 (modal onConfirm callbacks) + ModalLayer in Session 4.
- useAnimationEffects hook: Animation state is deeply threaded through useAnimationSetup and useExplosions hooks. Moving state to a new hook requires significant rethreading. Deferred.

**Test results:** 220 files, 3748 passed, 0 failures. Build clean.

## Session 3 Outcomes

### Actual Outcomes

**Completed:**
- Step 8: Extracted useMultiplayerSync hook (252 lines) — 1 state var (waitingForPlayerPhase), 1 ref (previousPhaseRef), 4 useEffects (GameFlowManager subscription, P2P data subscription, guest phase transition detection, simultaneous phase waiting modal monitoring). Discovered and removed `sendPhaseCompletion` dead code. Updated stale footerPreviousPhaseRef comment.
- Step 9: Extracted useCardSelection hook (326 lines) — 14 state vars (selectedCard, validCardTargets, validAbilityTargets, affectedDroneIds, hoveredLane, cardConfirmation, multiSelectState with debug wrapper, singleMoveMode, additionalCostState/Confirmation/SelectionContext, destroyUpgradeModal, upgradeSelectionModal, viewUpgradesModal), 7 functions (cancelCardSelection, cancelSingleMoveMode, cancelAdditionalCostMode, confirmAdditionalCostCard, handleCancelMultiMove, handleConfirmMultiMoveDrones, cancelCardState), 2 useEffects (targeting calculations, additional cost highlighting).
- Step 10: Extracted useDragMechanics hook (265 lines) — 10 state vars (hoveredTarget, arrowState, cardDragArrowState, draggedCard, draggedDrone, droneDragArrowState, draggedActionCard, actionCardDragArrowState, costReminderArrowState, deploymentConfirmation), 5 refs, 3 handlers (handleSetHoveredTarget, handleCardDragStart, handleCardDragEnd), 4 arrow tracking effects. Moved executeDeployment + handleLaneHover to resolve TDZ issues. Removed calculatePolygonPoints import.

**Line count:** 5,855 → 5,086 (769 lines removed)

**Deferred:**
- handleDroneDragEnd (695 lines) and handleActionCardDragEnd (494 lines): Too large and deeply cross-cutting for this session. Stale closure issues (architect correction #4) need surrounding extractions first. Will extract in Session 4 alongside useTargeting.
- handleCardClick (235 lines): Stays in App.jsx due to circular dependency with cancelAllActions.

**Test results:** 220 files, 3748 passed, 0 failures. Build clean.
