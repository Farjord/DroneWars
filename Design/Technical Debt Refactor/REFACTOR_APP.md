# Refactor: App.jsx

## Current State

| Metric | Value |
|-|-|
| Line count | 7,007 |
| Imports | 60+ (lines 1-115) |
| useState declarations | 70+ |
| useEffect hooks | ~20 |
| useCallback functions | ~15 |
| Regular functions | ~30 |
| Refs | 14 |
| Existing tests | None (`src/__tests__/App*` does not exist) |
| Render JSX | ~930 lines (6087-7003) |

### Section Map

| Section | Lines | Description |
|-|-|-|
| 1: Imports | 1-115 | 60+ imports across 8 categories |
| 2: Component declaration | 132-136 | `const App = ({ phaseAnimationQueue })` |
| 3: Hooks & State | 138-415 | 70+ useState, 14 refs, custom hooks |
| 4: Manager subscriptions | 419-494 | PhaseManager events, beforeunload |
| 5: Computed values | 497-779 | useMemo, derived state, ref sync, lane control |
| 6: Event handlers | 781-1122 | UI handlers, interception, shield allocation |
| 7: Game logic functions | 1125-1793 | Combat, abilities, cards, movement, footer |
| 8: Effect hooks | 1795-2498 | Targeting, animations, phase sync, monitoring |
| 9a: Early return | 2501-2554 | Null player state guard |
| 9b: Game actions | 2556-6075 | Reset, deploy, pass, drag handlers, card/lane clicks |
| 9c: Render | 6077-7003 | JSX with 30+ modal/animation components |

### Key Observations
- App.jsx is 7,007 lines, 9x the 800-line threshold
- Acts as a god object: orchestrator, state container, event hub, and renderer all in one
- No inline sub-components, but massive prop-drilling to GameHeader (70+ props), GameBattlefield (50+ props), GameFooter (40+ props)
- Module-level side effects: `targetingRouter` instantiated at line 117, `extractDroneNameFromId` helper at line 124

## Problems

### CODE_STANDARDS.md Violations
1. **Single responsibility**: App.jsx owns 10+ concerns (animation state, targeting, interception, shields, drag-and-drop, modals, multiplayer sync, game lifecycle, card selection, combat)
2. **File size**: 7,007 lines (9x the 800-line threshold)
3. **Business logic in component**: Direct gameEngine calls (validateDeployment at 4292, getLaneOfDrone at 4740), lane index calculations, targeting validation
4. **Data mixed with UI**: Module-level `targetingRouter` and `extractDroneNameFromId` definitions
5. **Banned comments**: `// NEW` at lines 3580, 4840

### Dead Code / Legacy Click Handlers
1. **handleTokenClick click-to-attack path** (lines 4959-4982): `selectedDrone && !isPlayer` attack via click. Drag-and-drop is canonical for attacks; this is the legacy click-to-initiate-action path. Note: The click handler also contains valid sub-action selections (multi-move, ability targeting, mandatory destruction, drone details) that must be preserved.
2. **handleTargetClick ship section attack** (lines 5102-5151): `selectedDrone && targetType === 'section'` click-to-attack path. Attacks are drag-only now.
3. **handleLaneClick selected drone move** (lines 5425-5481): `turnPhase === 'action' && selectedDrone` click-to-move path. Movement is drag-only now.
4. **handleToggleDroneSelection** (lines 3230-3239): Sets `selectedDrone` for click-based attacks. With drag-only attacks, selecting a drone for attack purposes is dead code. Note: Must verify no other flow depends on this toggling selectedDrone.
5. **handleDeployDrone** (lines 3284-3306): Click-based deployment path. Deployment is drag-only via `handleCardDragStart/End`. Note: called from handleLaneClick deployment path (line 5424) which is also click-based.
6. **Duplicate multi-move selection** in handleTokenClick: Lines 4840-4858 and 4986-5002 contain identical multi-move selection code (same logic for `multiSelectState.phase === 'select_drones'`).
7. **HOST_ONLY_ACTIONS** (line 793): Empty array, dead branch in processActionWithGuestRouting.
8. **handleSimultaneousAction** (lines 3066-3107): Switch cases for drawCard/confirmInitialHand are no-ops (comments say "no longer handled here"). Default returns error. Effectively dead.
9. **waitForBothPlayersComplete** (lines 3121-3170): Uses polling pattern with setInterval. Unclear if still called anywhere.
10. **areBothPlayersReady** (referenced at line 3141, 3158): Not defined in App.jsx -- likely dead reference or defined elsewhere.
11. **queueAnimations** (referenced at line 1731): Not defined in App.jsx -- likely dead reference.
12. **RACE_CONDITION_DEBUG** (line 182): Always `true`, never used in any conditional.

### Raw console.log / console.warn / console.error / console.trace
17 instances of raw console calls that should use `debugLog()`:
- `console.warn` at lines 1332, 2975, 2991, 3016, 3088, 3127, 6073
- `console.error` at lines 1370, 1399, 1664, 2666, 3003, 3020, 3101, 3218, 3273, 5972
- `console.trace` at lines 4379, 4665, 5479

### Code Smells
1. **Massive prop drilling**: GameHeader receives 70+ props, GameBattlefield 50+, GameFooter 40+
2. **Duplicated "waiting for opponent" pattern**: Lines 2392-2498 repeat the same phaseAnimationQueue/commitment check pattern 4 times (mandatoryDiscard, optionalDiscard, allocateShields, mandatoryDroneRemoval)
3. **Duplicated "cost reminder arrow" pattern**: Identical arrow calculation code at lines 4294-4329 and 5243-5278
4. **Duplicated handleReset / handleExitGame cleanup**: Lines 2561-2578 and 2586-2618 share identical UI state clearing code
5. **handleShipAbilityConfirmation onConfirm** (lines 6904-6977): 73-line inline callback with duplicated reallocation cleanup (done both inside switch case and after)
6. **Functions not using useCallback**: cancelCardSelection, cancelAllActions, handleFooterViewToggle, handleFooterButtonClick, handleToggleDroneSelection, handleDeployDrone, handleShipSectionClick, downloadLogAsCSV, and 10+ others

## Extraction Plan

### Hook 1: useAnimationEffects
**What to extract:**
- State: flyingDrones, flashEffects, healEffects, cardVisuals, cardReveals, shipAbilityReveals, phaseAnnouncements, currentPhaseAnimation, isPhaseAnimationPlaying, laserEffects, teleportEffects, overflowProjectiles, splashEffects, barrageImpacts, railgunTurrets, railgunBeams, passNotifications, goAgainNotifications, statusConsumptions, cardPlayWarning, animationBlocking (21 state vars)
- Effects: Phase animation queue subscription (lines 1874-1907)
- Callbacks: showCardPlayWarning, clearCardPlayWarning
- Render helpers: All animation `.map()` JSX blocks (lines 6119-6305)
- **Where**: `src/hooks/useAnimationEffects.js`
- **Why**: Animation state is self-contained. 21 state vars + their setters are only consumed by animation components in the render. Eliminates ~200 lines of state + ~200 lines of JSX.
- **Dependencies**: phaseAnimationQueue (prop), gameAreaRef

### Hook 2: useCardSelection
**What to extract:**
- State: selectedCard, validCardTargets, affectedDroneIds, cardConfirmation, multiSelectState (raw + wrapped), singleMoveMode, additionalCostState, additionalCostConfirmation, additionalCostSelectionContext, destroyUpgradeModal, upgradeSelectionModal, viewUpgradesModal
- Refs: multiSelectFlowInProgress, additionalCostFlowInProgress
- Functions: cancelCardSelection, cancelAllActions (card parts), handleCardClick, handleConfirmMultiMoveDrones, handleCancelMultiMove, confirmAdditionalCostCard, cancelAdditionalCostMode, cancelSingleMoveMode
- Effects: Targeting calculations (lines 1804-1869)
- **Where**: `src/hooks/useCardSelection.js`
- **Why**: Card selection is the most complex UI flow with 5+ phases. Isolating it makes the state machine testable. ~600 lines.
- **Dependencies**: gameState, processActionWithGuestRouting, getLocalPlayerId, localPlayerState, opponentPlayerState, gameDataService

### Hook 3: useTargeting
**What to extract:**
- Functions: handleTargetClick, handleTokenClick (non-attack parts), handleLaneClick (non-deployment parts)
- State: hoveredTarget, hoveredCardId, hoveredLane
- Callbacks: handleSetHoveredTarget, handleLaneHover
- **Where**: `src/hooks/useTargeting.js`
- **Why**: Targeting is a distinct concern with complex routing logic. ~400 lines.
- **Dependencies**: abilityMode, shipAbilityMode, selectedCard, validCardTargets, validAbilityTargets, multiSelectState, singleMoveMode, additionalCostState

### Hook 4: useInterception
**What to extract:**
- State: playerInterceptionChoice, potentialInterceptors, potentialGuardians, showOpponentDecidingModal, interceptionModeActive, selectedInterceptor, interceptedBadge
- Functions: handleViewBattlefield, handleShowInterceptionDialog, handleResetInterception, handleDeclineInterceptionFromHeader, handleConfirmInterception
- Effects: Interception monitoring (lines 1922-1955), guardian highlighting (lines 1960-1988), interceptionPending monitoring (lines 1991-2013), lastInterception badge (lines 2016-2026)
- **Where**: `src/hooks/useInterception.js`
- **Why**: Interception is a self-contained combat subsystem. ~200 lines.
- **Dependencies**: resolveAttack, gameState.interceptionPending, localPlayerState, opponentPlayerState, draggedDrone, selectedDrone, singleMoveMode, abilityMode

### Hook 5: useShieldAllocation
**What to extract:**
- State: reallocationPhase, shieldsToAdd, shieldsToRemove, originalShieldAllocation, postRemovalShieldAllocation, initialShieldAllocation, reallocationAbility, pendingShieldChanges, postRemovalPendingChanges, pendingShieldAllocations, pendingShieldsRemaining
- Functions: handleAllocateShield, handleRemoveShield, handleAddShield, handleContinueToAddPhase, handleResetReallocation, handleCancelReallocation, handleConfirmReallocation, handleShipSectionClick, handleResetShieldAllocation, handleEndAllocation, handleResetShields, handleConfirmShields, handleShieldAction, handleRoundStartShieldAction
- Effects: Initialize pending shield allocations (lines 597-616)
- **Where**: `src/hooks/useShieldAllocation.js`
- **Why**: Shield allocation is entirely self-contained with 11 state vars and 14 functions. ~500 lines.
- **Dependencies**: processActionWithGuestRouting, gameState, localPlayerState, gameDataService

### Hook 6: useDragMechanics
**What to extract:**
- State: draggedCard, draggedDrone, draggedActionCard, arrowState, cardDragArrowState, droneDragArrowState, actionCardDragArrowState, costReminderArrowState
- Refs: arrowLineRef, cardDragArrowRef, droneDragArrowRef, actionCardDragArrowRef, costReminderArrowRef
- Functions: handleCardDragStart, handleCardDragEnd, handleDroneDragStart, handleDroneDragEnd, handleActionCardDragStart, handleActionCardDragEnd
- Effects: All mouse tracking effects (lines 2050-2235), all mouseup cleanup effects (lines 2106-2235)
- **Where**: Split into 3 sub-hooks due to ~1200-line size:
  - `src/hooks/useCardDrag.js` — card drag start/end, card arrow state, card mouseup cleanup
  - `src/hooks/useDroneDrag.js` — drone drag start/end, drone arrow state, drone mouseup cleanup
  - `src/hooks/useActionCardDrag.js` — action card drag start/end, action card arrow state, action card mouseup cleanup
- **Why**: Drag-and-drop is a distinct interaction layer with 8 state vars, 5 refs, 6 handlers, 7 effects. At ~1200 lines, a single hook would itself be a god object. Each drag type has independent state and handlers.
- **Dependencies**: gameAreaRef, droneRefs, sectionRefs, resolveAttack, executeDeployment, multiSelectState, singleMoveMode, additionalCostState, validCardTargets

### Hook 7: useModals
**What to extract:**
- State: showAiHandModal, showDebugModal, showGlossaryModal, showAIStrategyModal, showAddCardModal, showAbandonRunModal, viewShipSectionModal, modalContent, deploymentConfirmation, moveConfirmation, attackConfirmation, detailedDroneInfo, cardToView, showWinnerModal, isViewDeckModalOpen, isViewDiscardModalOpen, showOpponentDronesModal, aiCardPlayReport, aiDecisionLogToShow, showMandatoryActionModal, confirmationModal, cardSelectionModal, abilityConfirmation, shipAbilityConfirmation, waitingForPlayerPhase
- Functions: handleCloseAiCardReport, handleViewShipSection, handleShowOpponentDrones, handleOpenAddCardModal, handleForceWin, handleAddCardsToHand, handleCardInfoClick
- **Where**: `src/hooks/useModals.js`
- **Why**: 25 modal state vars constitute purely UI state with no business logic. ~300 lines.
- **Dependencies**: processActionWithGuestRouting (for a few handlers)

### Hook 8: useActionRouting
**What to extract:**
- Functions: processActionWithGuestRouting, handleGameAction, handleSimultaneousAction
- Constant: HOST_ONLY_ACTIONS
- **Where**: `src/hooks/useActionRouting.js`
- **Why**: Action routing is cross-cutting infrastructure. Extracting it clarifies the multiplayer architecture. ~150 lines.
- **Dependencies**: gameState.gameMode, processAction, p2pManager, gameStateManager

### Hook 9: useMultiplayerSync
**What to extract:**
- Functions: sendPhaseCompletion, waitForBothPlayersComplete, checkBothPlayersHandLimitComplete
- Effects: Multiplayer phase sync handler (lines 573-594), guest phase transition detection (lines 2258-2310), guest render completion (lines 2316-2320), simultaneous phase waiting modal (lines 2384-2498)
- **Where**: `src/hooks/useMultiplayerSync.js`
- **Why**: Multiplayer sync is a distinct networking concern. ~300 lines.
- **Dependencies**: isMultiplayer, p2pManager, gameStateManager, gameState

### Hook 10: useGameLifecycle
**What to extract:**
- Functions: handleReset, handleExitGame, handleConfirmAbandonRun, handlePlayerPass, executeDeployment, handleDeployDrone
- State: deck, lastCurrentPlayer, lastTurnPhase, optionalDiscardCount, footerView, isFooterOpen, isLogModalOpen, selectedDrone, selectedBackground
- Effects: Page unload warning (lines 483-494), mandatory action initialization (lines 2325-2375), win condition monitoring (lines 1912-1916), defensive state cleanup (lines 2239-2247)
- Functions: handleConfirmMandatoryDiscard, handleRoundStartDiscard, handleRoundStartDraw, handleMandatoryDiscardContinue, handleMandatoryDroneRemovalContinue, handleConfirmMandatoryDestroy, handleImportDeck, downloadLogAsCSV
- **Where**: `src/hooks/useGameLifecycle.js`
- **Why**: Game lifecycle management (reset, exit, phase transitions, mandatory actions) is a cohesive concern. ~600 lines.
- **Dependencies**: gameStateManager, processActionWithGuestRouting, resetGame, endGame
- **Post-extraction review**: This hook is the "remainder" bucket and may need further splitting after extraction. Known sub-concerns: mandatory action handling, phase transition effects, game reset/exit, footer state, deck import. Review after extraction and split if >400 lines.

### Inter-Hook Communication Pattern

Hooks return values consumed by other hooks via local variables in App.jsx — no React Context needed since all hooks live in the same component. Example:

```javascript
// In App.jsx
const { draggedCard, handleCardDragStart } = useCardDrag(...);
const { validCardTargets } = useCardSelection(draggedCard, ...);
const { handleTargetClick } = useTargeting(validCardTargets, ...);
```

This keeps data flow explicit and avoids hidden dependencies between hooks.

### Sub-component Extractions (Render Section)

The render section (lines 6087-7003) should be split into sub-components:

| Sub-component | Lines | Description |
|-|-|-|
| `AnimationLayer` | 6119-6305 | All animation overlays (explosions, flying drones, lasers, etc.) |
| `TargetingArrowLayer` | 6100-6118 | All 5 targeting arrows + interception lines |
| `ModalLayer` | 6492-6989 | All 30+ modal components |

These are render-only extractions -- they receive props and render JSX with no state or logic.

**Where**: `src/components/ui/AnimationLayer.jsx`, `src/components/ui/TargetingArrowLayer.jsx`, `src/components/ui/ModalLayer.jsx`

## Dead Code Removal

### Legacy Click-to-Initiate-Action Code
These handlers contain click-to-attack/move paths that are dead code now that drag-and-drop is canonical:

| Handler | Lines | Dead Code Description |
|-|-|-|
| handleTokenClick | 4959-4982 | `selectedDrone && !isPlayer` click-to-attack-drone |
| handleTargetClick | 5102-5151 | `selectedDrone && targetType === 'section'` click-to-attack-section |
| handleLaneClick | 5425-5481 | `turnPhase === 'action' && selectedDrone` click-to-move |
| handleToggleDroneSelection | 3230-3239 | Sets selectedDrone for click-based attacks |
| handleDeployDrone | 3284-3306 | Click-based deployment (lane click path) |

### Other Dead Code
| Item | Lines | Reason |
|-|-|-|
| HOST_ONLY_ACTIONS | 793 | Empty array, dead branch |
| RACE_CONDITION_DEBUG | 182 | Always true, never checked |
| handleSimultaneousAction switch cases | 3079-3085 | drawCard/confirmInitialHand are no-ops |
| waitForBothPlayersComplete | 3121-3170 | Uses polling; likely superseded by commitment system |
| areBothPlayersReady | 3141, 3158 | Referenced but not defined in App.jsx |
| queueAnimations | 1731 | Referenced but not defined in App.jsx |
| Duplicate multi-move block | 4986-5002 | Identical to lines 4840-4858 (both handle `select_drones`) |

## Logging Improvements

### Replace raw console calls with debugLog
| Line | Current | Category |
|-|-|-|
| 1332 | `console.warn("Attack already in progress...")` | `'COMBAT'` |
| 1370 | `console.error('Error in resolveAttack:')` | `'COMBAT'` |
| 1399 | `console.error('Error in resolveAbility:')` | `'COMBAT'` |
| 1664 | `console.error('resolveSingleMove: Could not find drone')` | `'SINGLE_MOVE_FLOW'` |
| 2666 | `console.error('Card template not found')` | `'DEBUG_TOOLS'` |
| 2975 | `console.warn('Shield action not valid')` | `'ENERGY'` |
| 2991 | `console.warn('Round start shield action called during wrong phase')` | `'ENERGY'` |
| 3003 | `console.error('allocateShield missing sectionName')` | `'ENERGY'` |
| 3016 | `console.warn('Unknown round start shield action')` | `'ENERGY'` |
| 3020 | `console.error('Error processing round start shield action')` | `'ENERGY'` |
| 3088 | `console.warn('Unhandled simultaneous action')` | `'PHASE_TRANSITIONS'` |
| 3101 | `console.error('Error in handleSimultaneousAction')` | `'PHASE_TRANSITIONS'` |
| 3127 | `console.warn('Timeout waiting for phase completion')` | `'PHASE_TRANSITIONS'` |
| 3218 | `console.error("Deck import failed:")` | `'DEBUG_TOOLS'` |
| 3273 | `console.error('Error executing deployment:')` | `'DEPLOYMENT'` |
| 5972 | `console.error('Failed to destroy drone:')` | `'COMBAT'` |
| 6073 | `console.warn('Card not found in collection:')` | `'DEBUG_TOOLS'` |

### Remove console.trace calls
Lines 4379, 4665, 5479: `console.trace('Invalid Move modal call stack')` -- these are debug artifacts, replace with debugLog or remove.

### Noisy logs to review
- `CHECKPOINT_FLOW` category has extensive logging throughout handleDroneDragEnd (lines 4142-4670) -- review for reduction after drag mechanics stabilize
- `BUTTON_CLICKS` category in setMultiSelectState wrapper (lines 310-323) logs call stack on every invocation
- `ADDITIONAL_COST_EFFECT_FLOW` has 20+ log points through the additional cost flow -- consolidate after extraction

## Comment Cleanup

### Banned Comments to Remove
| Line | Comment |
|-|-|
| 3580 | `// NEW FLOW: For SINGLE_MOVE cards...` |
| 4840 | `// NEW: Prioritize multi-move selection` |

### Stale Comments to Remove
- Line 232: `// Note: handleSetHoveredTarget is defined later after draggedDrone state` -- no longer needed after extraction
- Lines 2542-2554: Long removed-section comment block explaining auto-trigger removal -- replace with one-line TODO reference to GameFlowManager
- Line 381-382: `// NOTE: enteredMandatoryDiscardWithExcess...refs REMOVED` -- stale removal note

### Useful Comments to Add
- Each extracted hook file should get a JSDoc header explaining its role and what state it owns
- Module-level `extractDroneNameFromId` should have a `@module` comment explaining it's a pure utility (then move to utils)

## Testing Requirements

### Intent-Based Tests BEFORE Extraction

Write tests that verify behavior through the public interface before moving code. These establish a safety net.

| Test File | Tests |
|-|-|
| `src/hooks/__tests__/useShieldAllocation.test.js` | Shield allocation init, add/remove, reset, confirm, reallocation flow |
| `src/hooks/__tests__/useInterception.test.js` | Interception modal show/hide, interceptor selection, decline, confirm |
| `src/hooks/__tests__/useCardSelection.test.js` | Card select/deselect, multi-move flow, single-move flow, additional cost 3-step flow, cancel |
| `src/hooks/__tests__/useDragMechanics.test.js` | Drag start/end for cards, drones, action cards; arrow state management; cancel on mouseup |
| `src/hooks/__tests__/useMultiplayerSync.test.js` | Phase completion sending, waiting overlay show/clear, guest phase detection |

### Tests AFTER Extraction
- Each extracted hook gets unit tests in `src/hooks/__tests__/<HookName>.test.js`
- Integration test verifying App.jsx still composes all hooks correctly
- Drag-and-drop E2E tests (manual checklist -- see Risk Assessment)

## Execution Order

Each step is independently committable: extract/clean -> test -> review -> fix -> update plan -> commit -> push.

### Phase A: Dead Code & Cleanup (Low Risk)

**Step 1: Remove dead code and fix logging**
- Remove HOST_ONLY_ACTIONS empty array and dead branch
- Remove RACE_CONDITION_DEBUG constant
- Remove duplicate multi-move block (lines 4986-5002)
- Replace all 17 raw console calls with debugLog
- Remove 3 console.trace calls
- Remove banned comments (`// NEW`, `// CHANGED`)
- Remove stale comments
- Move `extractDroneNameFromId` to `src/logic/droneUtils.js` (domain logic, not generic utils)
- Move `targetingRouter` instantiation inside component or to a separate module

**Step 2: Remove legacy click-to-initiate-action code**
- Remove click-to-attack from handleTokenClick (lines 4959-4982)
- Remove click-to-attack-section from handleTargetClick (lines 5102-5151)
- Remove click-to-move from handleLaneClick (lines 5425-5481)
- Remove handleToggleDroneSelection (verify no other deps first)
- Remove handleDeployDrone click path (verify drag path covers all cases)
- Test: Verify all drag-and-drop flows still work (deploy, attack, move, card play)

**Step 3: Remove dead simultaneous action code**
- Remove handleSimultaneousAction dead switch cases
- Evaluate and remove waitForBothPlayersComplete if unused
- Remove or fix areBothPlayersReady / queueAnimations dead references

### Phase B: Extract Self-Contained Hooks (Medium Risk)

**Step 4: Extract useShieldAllocation**
- 11 state vars, 14 functions, 1 effect
- Self-contained with clear boundaries
- Write tests first, then extract

**Step 5: Extract useInterception**
- 7 state vars, 5 functions, 4 effects
- Well-isolated combat subsystem
- Write tests first, then extract

**Step 6: Extract useAnimationEffects**
- 21 state vars, 2 callbacks
- Purely presentational state
- Extract alongside AnimationLayer sub-component

**Step 7: Extract useModals**
- 25 state vars, 7 functions
- Pure UI state management
- Extract alongside ModalLayer sub-component

### Phase C: Extract Complex Hooks (Higher Risk)

**Step 8: Extract useActionRouting**
- 3 functions, 1 constant
- Cross-cutting but small
- Write tests verifying guest routing behavior

**Step 9: Extract useMultiplayerSync**
- 3 functions, 4 effects
- Network-dependent logic
- Write tests with P2P mocking

**Step 10: Extract useCardSelection**
- 12 state vars, 2 refs, 8 functions, 1 effect
- Most complex flow -- additional cost cards have 5-step state machine
- Write comprehensive tests covering all card selection paths first

**Step 11: Extract useDragMechanics**
- 8 state vars, 5 refs, 6 functions, 7 effects
- Heavy DOM interaction (mouseup/mousemove listeners)
- Write tests, then extract carefully

**Step 12: Extract useTargeting**
- 3 state vars, 2 callbacks, routing functions
- Depends on cardSelection and interception hooks
- Extract after those hooks are stable

**Step 13: Extract useGameLifecycle**
- Mixed state, effects, and lifecycle functions
- Extract last as it contains the "remainder" logic
- Includes mandatory action handling and phase transition effects

### Phase D: Sub-component Extraction (Low Risk)

**Step 14: Extract AnimationLayer sub-component**
- All animation `.map()` JSX (lines 6119-6305)
- Pure render component, no state

**Step 15: Extract TargetingArrowLayer sub-component**
- 5 TargetingArrow + 2 interception line components (lines 6100-6118)
- Pure render component

**Step 16: Extract ModalLayer sub-component**
- All 30+ modal components (lines 6492-6989)
- Many have inline onConfirm/onCancel callbacks that need extraction
- Largest render sub-component extraction

### Phase E: Consolidation

**Step 17: Deduplicate and consolidate**
- Extract shared "waiting for opponent" pattern into helper (used 4 times)
- Extract shared "cost reminder arrow" calculation
- Consolidate handleReset/handleExitGame cleanup code
- Extract ShipAbilityConfirmation onConfirm logic out of inline JSX callback
- Wrap remaining non-useCallback functions

**Step 18: Final review**
- Verify App.jsx is under 800 lines
- Verify all hooks have tests in `__tests__/` subdirectory
- Verify no business logic remains in App.jsx
- Update this plan document with final state

## Risk Assessment

### What Could Break

| Risk | Severity | Mitigation |
|-|-|-|
| Drag-and-drop flows break after handler extraction | High | Manual testing checklist below. Hook dependencies must preserve closure references. |
| State update batching changes | Medium | React batches setState in event handlers but not in async callbacks. Verify handleLaneHover sync pattern survives extraction. |
| useEffect dependency arrays become stale | Medium | Each extracted hook must explicitly list dependencies. Cross-hook state must use refs or context. |
| Multiplayer guest optimistic actions desync | High | Test guest routing thoroughly. processActionWithGuestRouting closure must stay current. |
| Animation timing breaks | Medium | useAnimationSetup passes 18 setters -- after extraction, these must come from the animation hook. |
| Interception modal / drag interaction race | Medium | Test interception mode drag-to-intercept and modal toggle carefully. |

### Drag-and-Drop Flows to Verify After Each Step
1. **Deploy drone**: Drag card from footer to lane -> confirmation if needed -> drone appears
2. **Attack drone**: Drag friendly drone to enemy drone in same lane -> attack resolves
3. **Attack ship section**: Drag friendly drone to enemy ship section -> guardian check -> attack resolves
4. **Move drone**: Drag friendly drone to adjacent lane -> move confirmation -> move resolves
5. **Play action card (targeted)**: Drag card to target drone/lane -> confirmation -> card resolves
6. **Play action card (no target)**: Drag card to battlefield -> confirmation -> card resolves
7. **Play movement card (drag to drone)**: Drag card to friendly drone -> lane selection -> move resolves
8. **Play movement card (drag to empty)**: Drag card to battlefield -> enter multi-select UI
9. **Additional cost card**: Drag card to cost target -> destination selection -> effect target -> confirmation
10. **Interception drag**: During interception mode, drag interceptor to attacker -> confirm

### How to Validate
- Run existing test suite after each step
- Manual smoke test of all 10 drag-and-drop flows above
- Verify multiplayer by testing local + guest mode
- Check browser console for any new errors/warnings after each extraction
- Verify animation playback for attacks, deployments, card plays, and phase transitions

---

## Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

*To be completed before refactoring begins. This section documents the current behavior, intent, contracts, dependencies, edge cases, and non-obvious design decisions of the code being refactored. Once written, this section is never modified — it serves as the permanent "before" record.*

## Change Log

*Append entries here as refactoring steps are completed.*

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
