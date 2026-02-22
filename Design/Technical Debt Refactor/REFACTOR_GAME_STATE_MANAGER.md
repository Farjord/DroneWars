# Refactor: GameStateManager.js

## BEFORE

### Current State

- **Line count**: 3,156 lines (4x over the 800-line "strong smell" threshold)
- **Test coverage**: 12 co-located test files (NOT in `__tests__/` subfolder per CODE_STANDARDS)
- **Singleton**: Exported as default singleton with HMR preservation

#### Responsibility Map

| Lines | Concern |
|-|-|
| 1-142 | Constructor, state shape, initialization |
| 144-208 | Manager references, P2P integration setup |
| 210-329 | Guest validation & host state application |
| 331-356 | Event system (subscribe/emit) |
| 358-449 | State access & setState with logging |
| 451-1036 | Validation subsystem (7 methods, ~585 lines) |
| 1038-1107 | Pre-game/pre-run validation |
| 1109-1355 | Game lifecycle (reset, startGame, endGame, testMode) |
| 1357-1512 | Thin setters & player identity helpers |
| 1513-1587 | Placed sections helpers, optimistic animation delegation |
| 1589-1716 | Logging, AI decision history, action processing delegation |
| 1717-1878 | Single-player profile/save/inventory/component management |
| 1880-2013 | Tactical items (purchase, use, count) |
| 2015-2249 | Deck/ship slot management (save, delete, unlock, clear) |
| 2250-2574 | Drone/section repair, drone/component instance CRUD |
| 2576-2805 | startRun (~230 lines, builds run state, generates map sections) |
| 2807-2895 | resetGameState |
| 2897-3133 | endRun (~235 lines, summary, loot transfer, damage persistence, reputation) |
| 3136-3156 | Singleton export & HMR preservation |

#### Existing Test Files (co-located, need migration to `__tests__/`)

- `GameStateManager.cardPack.test.js`
- `GameStateManager.consecutiveCombat.test.js`
- `GameStateManager.credits.test.js`
- `GameStateManager.droneDamage.test.js`
- `GameStateManager.endRunBroadcast.test.js`
- `GameStateManager.initialization.test.js`
- `GameStateManager.poiOutcome.test.js`
- `GameStateManager.resetGameState.test.js`
- `GameStateManager.save.test.js`
- `GameStateManager.shipDamage.test.js`
- `GameStateManager.startRun.test.js`
- `GameStateManager.tacticalItems.test.js`

### Behavioral Baseline
<!-- IMMUTABLE — do not edit after initial writing -->

#### Exports / Public API

Single default export: `gameStateManager` (singleton instance of `GameStateManager`). HMR-preserved via `import.meta.hot`.

**Core State (lines 36-144)**

| Method | Contract |
|-|-|
| `constructor()` | Initializes 107-line state object, creates `ActionProcessor` singleton, sets up `OptimisticActionService`, initializes `MILESTONE_PHASES` and `validatingState`. No params. |
| `getState()` | Returns shallow copy `{ ...this.state }`. Read-only snapshot. |
| `get(key)` | Returns `this.state[key]` directly (NOT a copy — mutable reference for objects). |
| `setState(updates, eventType, context)` | Merges updates into state, runs validation pipeline (stack-trace parsing, ownership checks), emits event to all listeners. Creates `new Error().stack` on EVERY call for caller detection. |
| `subscribe(listener)` | Adds listener to `this.listeners` Set. Returns unsubscribe function. Listener receives `{ type, payload, state }`. |
| `emit(type, payload)` | Calls every listener with `{ type, payload, state: this.getState() }`. Catches and logs errors per listener. |

**Game Lifecycle (lines 1146-1357)**

| Method | Contract |
|-|-|
| `reset()` | Resets to preGame state, clears `GameDataService`, clears `ActionProcessor` queue, re-subscribes `GameFlowManager`. Does NOT clear SP state. |
| `startGame(gameMode, p1Config, p2Config)` | Clears SP context, validates pre-game state (calls `resetGameState()` on dirty state), generates `gameSeed` (null for guest), initializes players via `gameEngine.initialPlayerState()`, sets appState='inGame'. |
| `endGame()` | Calls `resetGameState()`, sets appState='menu', clears `GameDataService`/`ActionProcessor`/`AIPhaseProcessor`, resets `GameFlowManager`. |
| `initializeTestMode(testConfig)` | Dynamic import of `testGameInitializer.js`. Returns true immediately — async initialization. |
| `resetGameState()` | Sets `_updateContext='GameFlowManager'` to bypass ownership validation. Resets ALL combat state to defaults (gameActive=false, players=null, turnPhase=null). Resets `GameFlowManager`, clears `ActionProcessor` queue, cleans up `AIPhaseProcessor`. try/finally clears `_updateContext`. |
| `clearSinglePlayerContext()` | Ends run via `tacticalMapStateManager.endRun()` if active, clears `singlePlayerEncounter`. |
| `transitionToAppState(newState)` | Cleans up active game or active run if transitioning to 'menu'. Sets appState. |

**Thin Setters (lines 1359-1520)**

All are trivial `setState()` wrappers. No validation logic, no side effects beyond event emission.

| Method | State key(s) set |
|-|-|
| `setMultiplayerMode(mode)` | `gameMode` |
| `updatePlayers(p1Updates, p2Updates)` | `player1`, `player2` (merged) |
| `updatePlayerState(playerId, updates)` | delegates to `updatePlayers` |
| `setPlayerStates(p1, p2)` | `player1`, `player2` (replaced) |
| `setCurrentPlayer(playerId)` | `currentPlayer` |
| `setTurnPhase(phase)` | `turnPhase` |
| `setFirstPlayerOfRound(playerId)` | `firstPlayerOfRound` |
| `setFirstPasserOfPreviousRound(playerId)` | `firstPasserOfPreviousRound` |
| `setFirstPlayerOverride(playerId)` | `firstPlayerOverride` |
| `updatePassInfo(passUpdates)` | `passInfo` (merged) — **DUPLICATE at line 1656** |
| `setPassInfo(passInfo)` | `passInfo` (replaced) |
| `isMyTurn()` | Returns boolean. Maps gameMode to which player is local. |
| `getLocalPlayerId()` | Returns 'player1' or 'player2' based on gameMode. |
| `getOpponentPlayerId()` | Inverse of `getLocalPlayerId()`. |
| `getLocalPlayerState()` | Returns `this.state[localId]`. |
| `getOpponentPlayerState()` | Returns `this.state[opponentId]`. |
| `isLocalPlayer(playerId)` | Returns `playerId === getLocalPlayerId()`. |
| `setWinner(winnerId)` | SP extraction: sets winner only (WinnerModal handles transition). PvP: sets winner. |

**Placed Sections & Optimistic Animations (lines 1522-1589)**

| Method | Contract |
|-|-|
| `getLocalPlacedSections()` | Returns `placedSections` or `opponentPlacedSections` based on gameMode perspective. |
| `getOpponentPlacedSections()` | Inverse perspective. Logs during placement phase. |
| `trackOptimisticAnimations(animations)` | Delegates to `OptimisticActionService.trackAction()`. |
| `filterAnimations(action, system)` | Delegates to `OptimisticActionService.filterAnimations()`. |
| `hasRecentOptimisticActions()` | Checks if tracked animations exist. |
| `clearOptimisticActions()` | Clears tracked animations. |

**Logging & AI History (lines 1591-1659)**

| Method | Contract |
|-|-|
| `addLogEntry(entry, debugSource, aiDecisionContext)` | Adds timestamped entry to `gameLog`. Merges optional debugSource and aiDecisionContext. |
| `addAIDecisionToHistory(phase, turn, possibleActions, gameState)` | Appends to `aiDecisionHistory` for CSV export. Structures decision data. |
| `updatePassInfo(passUpdates)` (duplicate at 1656) | Exact copy of line 1458. Dead code — JS uses last definition in class body. |

**Action Processing Delegation (lines 1681-1717)**

| Method | Contract |
|-|-|
| `processAction(actionType, payload)` | Async. Delegates to `actionProcessor.queueAction()`. |
| `isActionInProgress()` | Delegates to `actionProcessor.isActionInProgress()`. |
| `getActionQueueLength()` | Delegates to `actionProcessor.getQueueLength()`. |
| `clearActionQueue()` | Delegates to `actionProcessor.clearQueue()`, re-subscribes `GameFlowManager`. |

**Validation Subsystem (lines 460-1038)**

| Method | Contract |
|-|-|
| `validateStateUpdate(updates, prevState, context)` | Orchestrator. Checks: concurrent action processing (warns if non-AP external update during action), ActionProcessor bypass, player state consistency, phase transitions. Uses `_updateContext` flag + stack trace fallback. |
| `validatePlayerStates(p1, p2)` | Checks for negative energy/deploymentBudget (console.error), duplicate drone IDs across players (console.error). |
| `validateTurnPhaseTransition(from, to)` | Validates against 18-entry transition map. Skips in testMode. console.warn on invalid. |
| `validateActionProcessorUsage(updates, prevState, isFromAP, stack)` | Complex 130-line method. Skips during init/simultaneous/automatic phases. Checks if critical game state updates bypass ActionProcessor. Allows GameFlowManager and SequentialPhaseManager specific updates. |
| `validateFunctionAppropriateForStateUpdate(updates, prevState, isFromAP, stack)` | Checks call stack for inappropriate callers (UI handlers, render, modal). Allows GameStateManager, ActionProcessor, gameLogic, setup functions. |
| `extractCallerInfo(stackLines)` | Parses stack trace for function names and file names. Returns `{ functions, files, primaryCaller, primaryFile }`. |
| `validateOwnershipBoundaries(updates, stack)` | Enforces field ownership rules: turnPhase→GameFlowManager, passInfo→SequentialPhaseManager/GFM, currentPlayer→AP/GFM. Uses `_updateContext` first, stack trace fallback. |
| `logPlayerStateChanges(updates, prevState, caller, eventType)` | Detailed diffing of player state critical props (energy, activeDronePool, hand, deck, dronesOnBoard, deploymentBudget). Creates `new Error().stack` for activeDronePool changes. |
| `isInitializationPhase(turnPhase)` | Returns true for null/preGame/droneSelection/deckSelection/deckBuilding/placement/gameInitializing/initialDraw. |
| `validatePreGameState()` | Checks 9 conditions for clean state before new game. Returns `{ valid, issues }`. |
| `validatePreRunState()` | Checks for active run, encounter, or game in progress. Returns `{ valid, issues }`. |

**Guest Sync / P2P (lines 156-331)**

| Method | Contract |
|-|-|
| `setupP2PIntegration(p2pManager)` | One-time setup (guarded by `p2pIntegrationSetup` flag). Wires ActionProcessor↔P2P, subscribes to P2P events. Creates `GuestMessageQueueService` for guest mode. Handles `multiplayer_mode_change`, `state_update_received`, `state_sync_requested` (deprecated). |
| `startValidation(targetPhase, guestState)` | Sets `validatingState` with deep copy of guest state. Used for guest checkpoint validation. |
| `shouldValidateBroadcast(incomingPhase)` | Returns true if validating and phase matches target. |
| `isMilestonePhase(phase)` | Checks against `MILESTONE_PHASES` array. |
| `applyHostState(hostState)` | Guest-only. Overwrites `this.state` with hostState (NOT via setState). Preserves local gameMode. Emits 'HOST_STATE_UPDATE'. Does NOT run validation pipeline. |

**SP Profile / Save / Inventory (lines 1719-1880)**

| Method | Contract |
|-|-|
| `createNewSinglePlayerProfile()` | Creates save via `createNewSave()`, loads via `loadSinglePlayerSave()`. |
| `loadSinglePlayerSave(saveData)` | Migrations: calculates `highestUnlockedSlot` if missing, generates `shopPack` if missing. Sets 7 state keys via `setState()`. Loads run state to `TacticalMapStateManager` if present. |
| `getSaveData()` | Returns object with all SP state keys + `tacticalMapStateManager.getState()` for run state. |
| `updateCardDiscoveryState(cardId, newState)` | Validates state is 'owned'/'discovered'/'undiscovered'. Updates or creates entry in `singlePlayerDiscoveredCards`. Via `setState()`. |
| `addDiscoveredCard(cardId)` | Delegates to `updateCardDiscoveryState(cardId, 'discovered')`. |
| `addToInventory(cardId, quantity)` | Adds quantity to inventory map. Also marks card as 'owned' via `updateCardDiscoveryState()`. Via `setState()`. |
| `addShipComponentInstance(instance)` | Pushes to `singlePlayerShipComponentInstances`. Via `setState()`. |
| `updateShipComponentHull(instanceId, newHull)` | Finds by instanceId, updates `currentHull`. Via `setState()`. |
| `getShipComponentInstance(instanceId)` | Find-or-null in `singlePlayerShipComponentInstances`. |

**Tactical Items (lines 1882-2015)**

| Method | Contract |
|-|-|
| `purchaseTacticalItem(itemId)` | Validates item exists, credits sufficient, below max capacity. Deducts credits, increments quantity. Returns `{ success, newQuantity }` or `{ success: false, error }`. Via `setState()`. |
| `purchaseCardPack()` | Uses `shopPack` from profile. Validates pack exists and credits sufficient. Generates cards via `rewardManager.generateShopPack()`. Adds cards to inventory. Clears shopPack (consumed). Returns `{ success, cards, cost }`. Via `setState()`. |
| `useTacticalItem(itemId)` | Decrements quantity. Returns `{ success, remaining }`. Via `setState()`. |
| `getTacticalItemCount(itemId)` | Returns quantity from profile, defaulting to 0. |

**Ship Slot / Deck Management (lines 2017-2576)**

| Method | Contract |
|-|-|
| `setDefaultShipSlot(slotId)` | Validates 0-5 range and active status. Updates `defaultShipSlotId` in profile. |
| `isSlotUnlocked(slotId)` | Returns `slotId <= highestUnlockedSlot`. |
| `getNextUnlockableSlot()` | Returns `{ slotId, cost }` for next sequential unlock, or null if all unlocked. |
| `unlockNextDeckSlot()` | Sequential unlock. Deducts credits. Updates `highestUnlockedSlot`. Returns `{ success, slotId }`. |
| `saveShipSlotDeck(slotId, deckData)` | Cannot modify slot 0. Clears old instances, preserves/converts sectionSlots, saves deck data. Via `setState()`. |
| `deleteShipSlotDeck(slotId)` | Cannot delete slot 0. Returns non-starter cards to inventory. Clears instances. Resets slot to empty. Resets default if this was default. Via `setState()`. |
| `clearSlotInstances(slotId)` | Filters out drone/component instances for slot. Via `setState()`. |
| `updateShipSlotDroneOrder(slotId, newDroneSlots)` | Updates drone slots array for a ship slot. Via `setState()`. |
| `repairDroneSlot(slotId, position)` | Cannot modify slot 0. Validates damaged state (supports both `slotDamaged` and legacy `isDamaged`). Deducts `DRONE_SLOT_REPAIR_COST`. Sets both field names for compat. Returns `{ success }`. |
| `repairSectionSlot(slotId, lane)` | Cannot modify slot 0. Full repair: `cost = damageDealt * SECTION_DAMAGE_REPAIR_COST`. Sets damageDealt=0. Returns `{ success }`. |
| `repairSectionSlotPartial(slotId, lane, hpToRepair)` | Partial repair. Caps to actual damage. Different default cost constant (200 vs 10). Returns `{ success, cost, repairedHP, remainingDamage }`. |
| `createDroneInstance(droneName, slotId)` | Skips starter pool drones. Generates unique ID with timestamp+random. Returns instanceId. |
| `updateDroneInstance(instanceId, isDamaged)` | Updates damage state by instanceId. |
| `findDroneInstance(slotId, droneName)` | Find by slotId AND droneName. Returns instance or null. |
| `getDroneDamageStateForSlot(slotId)` | Slot 0 always returns `{}`. Returns map of `droneName → isDamaged`. |
| `createComponentInstance(componentId, slotId)` | Skips starter pool. Looks up component in `shipComponentCollection` for hull values. Generates unique ID. Returns instanceId. |

**Run Lifecycle (lines 2578-3135)**

| Method | Contract |
|-|-|
| `startRun(shipSlotId, mapTier, entryGateId, preGeneratedMap, quickDeploy)` | 230 lines. Validates ship slot active. Gets ship card for hull calculation. Uses pre-generated or generates new map. Deducts security token if required. Builds `runShipSections` from sectionSlots (new format) or shipComponents (legacy) with `calculateSectionBaseStats()`. Fallback to default sections using ship card values. Creates `runState` object. Initializes `TacticalMapStateManager`. Sets appState='tacticalMap'. Resets `TransitionManager`. |
| `endRun(success)` | 235 lines. Reads run state from `TacticalMapStateManager`. Generates `lastRunSummary`. **On success**: transfers loot to inventory via DIRECT MUTATION (`this.state.singlePlayerInventory[cardId] = ...`), adds credits/AI cores, updates stats, refreshes shop pack, persists hull damage to sectionSlots — all via DIRECT MUTATION of `this.state`. Only `singlePlayerProfile` is spread into final `setState()`. **On failure**: marks slot as MIA (direct mutation: `shipSlot.status = 'mia'`), increments `runsLost`. Awards reputation via `ReputationService`. Ends run in `TacticalMapStateManager`. |

#### State Mutations and Their Triggers

**Via `setState()` (correct path)** — most methods above use this pattern: build new state immutably, call `this.setState()`, which triggers validation + event emission.

**Via direct mutation (bypassing events)** — `endRun()` only:
- `this.state.singlePlayerInventory[cardId] = ...` (line 2992-2993)
- `this.state.singlePlayerProfile.unlockedBlueprints.push(...)` (line 2998)
- `this.state.singlePlayerProfile.credits += ...` (line 3004)
- `this.state.singlePlayerProfile.aiCores = ...` (line 3007-3008)
- `this.state.singlePlayerProfile.stats.runsCompleted++` (line 3011)
- `this.state.singlePlayerProfile.stats.totalCreditsEarned += ...` (line 3012)
- `this.state.singlePlayerProfile.stats.totalCombatsWon = ...` (line 3013-3014)
- `this.state.singlePlayerProfile.stats.highestTierCompleted = ...` (line 3018-3019)
- `this.state.singlePlayerProfile.shopPack = ...` (line 3024)
- `this.state.singlePlayerShipSlots = slots` (line 3054) — after slot-based hull damage persistence
- `shipSlot.status = 'mia'` (line 3065) — MIA failure path

**Via `applyHostState()` (special path)** — direct overwrite: `this.state = { ...hostState }` (line 303). Bypasses all validation. Only restores `gameMode`.

#### Side Effects

- **Event emission**: Every `setState()` call emits to all subscribers via `emit(eventType, { updates, prevState })`.
- **Stack trace creation**: `setState()` creates `new Error().stack` on every call for caller detection. `logPlayerStateChanges()` creates another stack trace for activeDronePool changes.
- **Singleton resets**: `reset()`, `endGame()`, `resetGameState()` all clear/reset `GameDataService`, `ActionProcessor`, `GameFlowManager`, and `AIPhaseProcessor`.
- **TacticalMapStateManager delegation**: `startRun()` calls `tacticalMapStateManager.startRun()`, `endRun()` calls `tacticalMapStateManager.endRun()`, `clearSinglePlayerContext()` calls `tacticalMapStateManager.endRun()`.
- **TransitionManager reset**: `startRun()` calls `transitionManager.forceReset()`.
- **Save migration**: `loadSinglePlayerSave()` performs in-place migrations for `highestUnlockedSlot` and `shopPack`.

#### Known Edge Cases

- **`endRun()` direct mutations**: Inventory and ship slot changes bypass event system — subscribers are NOT notified of these changes. Only `singlePlayerProfile` is included in the final `setState()` call. The profile is spread (`{ ...this.state.singlePlayerProfile }`) to force React re-render.
- **Duplicate `updatePassInfo()`**: Method defined at line 1458 AND line 1656. JavaScript class semantics: last definition wins, so the first is effectively dead code (though they are identical).
- **`state_sync_requested` handler**: Marked as deprecated but still present (lines 197-205). Sends full state to requesting peer.
- **`applyHostState()` bypasses validation**: Directly overwrites `this.state` without going through `setState()` validation pipeline. This is intentional — guest trusts host state.
- **Stack trace parsing in production**: Minified code may break function name extraction in `extractCallerInfo()`. Mitigated by `_updateContext` flag as primary check.
- **`repairSectionSlotPartial()` vs `repairSectionSlot()`**: Different default costs — `SECTION_DAMAGE_REPAIR_COST` defaults to 10 in `repairSectionSlot` but 200 in `repairSectionSlotPartial`. Both read from the same `ECONOMY` constant, but the fallback defaults differ.
- **`initializeTestMode()` is fire-and-forget**: Returns `true` immediately; actual init is async via dynamic import. Caller cannot know if it succeeded.
- **Slot 0 immutability**: Starter deck (slot 0) cannot be modified, deleted, repaired, or go MIA. Multiple methods guard this independently.
- **HMR preservation**: Only `state` and `listeners` are preserved. Action processor, game flow manager references are NOT preserved — may cause stale references after HMR.

## TO DO

### Problems

#### CODE_STANDARDS.md Violations

1. **God object**: One file handles 10+ distinct concerns (state validation, guest sync, single-player profile, inventory, deck management, run lifecycle, repair operations, tactical items, AI logging, event system).
2. **Size**: 3,156 lines, nearly 4x the 800-line threshold.
3. **File type impurity**: Contains business logic (run state building, loot transfer, reputation calculation delegation, damage persistence) that belongs in `src/logic/`.
4. **Test location**: All 12 test files are co-located in `src/managers/` instead of `src/managers/__tests__/`.
5. **Managers standard**: "One manager/processor class per file" -- the file also embeds validation, inventory management, repair operations, and run lifecycle logic that are separate concerns.

#### Dead Code

1. **Duplicate `updatePassInfo` method** (lines 1456 and 1654) -- identical implementation defined twice. The second shadows the first in practice but both are reachable depending on call site expectations.

#### Missing/Inconsistent Logging

1. **56 raw `console.log/warn/error/debug` calls** throughout the file. All should use `debugLog()` with appropriate categories.
2. Logging is inconsistent: core state methods use `debugLog()`, but single-player methods use raw `console.log`.

#### Banned Comments

1. Lines 3090, 3096, 3097: `// NEW:` comments violate the "no `// NEW`, `// CHANGED`" rule.

#### Code Smells

1. **Direct state mutation in `endRun`**: Lines 2990-3018, 3052, 3063, 3067 directly mutate `this.state.singlePlayerProfile` and `this.state.singlePlayerInventory` instead of using `setState()`. This bypasses the event system and validation.
2. **startRun is 230 lines**: Builds run state, calculates hull from components, generates map -- multiple concerns in one method.
3. **endRun is 235 lines**: Generates summary, transfers loot, persists damage, awards reputation, refreshes shop -- multiple concerns.
4. **Stack trace parsing in production**: `setState()` creates `new Error().stack` on every single state update for validation. This is expensive and fragile.
5. **Validation subsystem is 585 lines**: The 7 validation methods (lines 451-1036) are a self-contained concern that could be a separate validator.

### Extraction Plan

#### Singleton Wiring Pattern

All extracted managers receive the `GameStateManager` singleton instance in their constructor (constructor injection). Extracted managers access state via `this.gsm.state` and `this.gsm.setState()`. No back-imports of the singleton — extracted managers never `import gameStateManager from './GameStateManager'`. This eliminates circular dependency risk.

#### Extraction 1: SinglePlayerInventoryManager

**What**: All single-player inventory, card discovery, and save/load methods.

**Methods to extract**:
- `createNewSinglePlayerProfile()` (line 1725)
- `loadSinglePlayerSave()` (line 1735)
- `getSaveData()` (line 1777)
- `updateCardDiscoveryState()` (line 1795)
- `addDiscoveredCard()` (line 1819)
- `addToInventory()` (line 1828)
- `addShipComponentInstance()` (line 1846)
- `updateShipComponentHull()` (line 1858)
- `getShipComponentInstance()` (line 1876)

**Where**: `src/managers/SinglePlayerInventoryManager.js`

**Why**: These are a cohesive group managing single-player persistent data, distinct from combat state management. Violates single responsibility and file type purity (business logic in a state manager).

**Dependencies affected**: Components calling `gameStateManager.addToInventory()` etc. would import `singlePlayerInventoryManager` instead. ~10 files affected.

#### Extraction 2: ShipSlotManager

**What**: All deck/ship slot CRUD, repair operations, drone instance management.

**Methods to extract**:
- `setDefaultShipSlot()` (line 2023)
- `isSlotUnlocked()` (line 2047)
- `getNextUnlockableSlot()` (line 2056)
- `unlockNextDeckSlot()` (line 2071)
- `saveShipSlotDeck()` (line 2109)
- `deleteShipSlotDeck()` (line 2165)
- `clearSlotInstances()` (line 2237)
- `updateShipSlotDroneOrder()` (line 2257)
- `repairDroneSlot()` (line 2282)
- `repairSectionSlot()` (line 2340)
- `repairSectionSlotPartial()` (line 2398)
- `createDroneInstance()` (line 2468)
- `updateDroneInstance()` (line 2494)
- `findDroneInstance()` (line 2513)
- `getDroneDamageStateForSlot()` (line 2526)
- `createComponentInstance()` (line 2549)

**Where**: `src/managers/ShipSlotManager.js`

**Why**: Ship slot/deck management is a self-contained domain (~530 lines). Includes repair operations, instance tracking, and slot CRUD. Cohesive group with no dependency on PvP game state.

**Dependencies affected**: `HangarScreen.jsx`, `ExtractionDeckBuilder.jsx`, `RepairBayScreen.jsx`, `CombatOutcomeProcessor.js`, `DroneDamageProcessor.js`, and their tests.

#### Extraction 3: TacticalItemManager

**What**: Tactical item purchase/use/count and card pack purchase.

**Methods to extract**:
- `purchaseTacticalItem()` (line 1889)
- `useTacticalItem()` (line 1981)
- `getTacticalItemCount()` (line 2011)
- `purchaseCardPack()` (line 1930)

**Where**: `src/managers/TacticalItemManager.js`

**Why**: Self-contained shop/item concern (~130 lines). Independent of game state management.

**Dependencies affected**: `TacticalMapScreen.jsx`, `ShopModal.jsx`, and their tests.

#### Extraction 4: StateValidationService

**What**: All validation methods that guard state updates.

**Methods to extract**:
- `validateStateUpdate()` (line 458)
- `validatePlayerStates()` (line 511)
- `validateTurnPhaseTransition()` (line 547)
- `validateActionProcessorUsage()` (line 585)
- `validateFunctionAppropriateForStateUpdate()` (line 832)
- `extractCallerInfo()` (line 942)
- `validateOwnershipBoundaries()` (line 975)
- `logPlayerStateChanges()` (line 727)
- `isInitializationPhase()` (line 815)

**Where**: `src/logic/state/StateValidationService.js`

**Why**: 585 lines of validation/debugging infrastructure that is orthogonal to state management. Pure analysis with no state mutation. Can be injected or called from `setState()`.

**Dependencies affected**: Only `GameStateManager.setState()` calls these -- minimal external impact.

#### Extraction 5: RunLifecycleManager

**What**: `startRun()` and `endRun()` with their helper logic.

**Methods to extract**:
- `startRun()` (line 2584) -- 230 lines
- `endRun()` (line 2901) -- 235 lines

**Where**: `src/managers/RunLifecycleManager.js`

**Why**: Run lifecycle is the largest single concern (~465 lines). Contains significant business logic (hull calculation, loot transfer, damage persistence, reputation). These are orchestration methods that should coordinate the extracted managers.

**Dependencies affected**: `HangarScreen.jsx`, `ExtractionController.js`, `CombatOutcomeProcessor.js`, and multiple test files.

#### Extraction 6: GuestSyncManager

**What**: Guest/P2P state synchronization methods.

**Methods to extract**:
- `setupP2PIntegration()` (line 160)
- `startValidation()` (line 216)
- `shouldValidateBroadcast()` (line 235)
- `isMilestonePhase()` (line 245)
- `applyHostState()` (line 255)
- `trackOptimisticAnimations()` (line 1558)
- `filterAnimations()` (line 1569)
- `hasRecentOptimisticActions()` (line 1577)
- `clearOptimisticActions()` (line 1585)
- `MILESTONE_PHASES` constant (line 126)
- `validatingState` (line 130)

**Where**: `src/managers/GuestSyncManager.js`

**Why**: Guest synchronization is completely independent of local game state management. Includes its own state (`validatingState`), constants, and service delegation.

**Dependencies affected**: `GuestMessageQueueService.js`, `AppRouter.jsx` (P2P setup).

### Import Direction Diagram

After all extractions, the import graph looks like this (`A → B` means A imports from B):

```
SinglePlayerInventoryManager → GameStateManager (constructor injection)
ShipSlotManager              → GameStateManager (constructor injection)
TacticalItemManager          → GameStateManager (constructor injection)
RunLifecycleManager          → GameStateManager (constructor injection)
RunLifecycleManager          → SinglePlayerInventoryManager
RunLifecycleManager          → ShipSlotManager
RunLifecycleManager          → TacticalItemManager
GuestSyncManager             → GameStateManager (constructor injection)
StateValidationService       → (no imports from this group — receives state as args)

GameStateManager             → StateValidationService (calls validate in setState)
GameStateManager             → (does NOT import extracted managers — they register themselves)
```

**No circular dependencies**: Extracted managers import GameStateManager (singleton passed via constructor). GameStateManager does not import them back. `RunLifecycleManager` imports peer managers but none import it.

### Dead Code Removal

| Item | Location | Reason |
|-|-|-|
| Duplicate `updatePassInfo()` | Lines 1654-1657 | Exact duplicate of lines 1456-1458. Second definition is dead because JS classes use last definition. |
| `state_sync_requested` handler | Lines 195-203 | Comment says "deprecated, kept for compatibility" |

### Logging Improvements

#### Raw console calls to convert to debugLog

All 56 `console.log/warn/error/debug` calls should be converted to `debugLog()`. Suggested categories:

| Category | Methods |
|-|-|
| `SP_SAVE` | `loadSinglePlayerSave`, `createNewSinglePlayerProfile`, `getSaveData` |
| `SP_INVENTORY` | `addToInventory`, `updateCardDiscoveryState`, `addDiscoveredCard` |
| `SP_SHIP` | `saveShipSlotDeck`, `deleteShipSlotDeck`, `setDefaultShipSlot`, `unlockNextDeckSlot`, ship component methods |
| `SP_REPAIR` | `repairDroneSlot`, `repairSectionSlot`, `repairSectionSlotPartial` |
| `SP_SHOP` | `purchaseTacticalItem`, `useTacticalItem`, `purchaseCardPack` |
| `SP_DRONE` | `createDroneInstance`, `updateDroneInstance`, `findDroneInstance` |
| `EXTRACTION` | `startRun`, `endRun` (partially already uses this) |
| `VALIDATION` | All validation methods (some already use `console.warn` for violations -- these should remain as warnings but use `debugLog('VALIDATION', ...)`) |

#### Noisy logs to reduce

- `logPlayerStateChanges()` (lines 727-810): Creates `new Error().stack` for every drone pool change. Consider gating behind a verbose flag.
- `setState()` stack trace parsing (lines 394-410): Creates `new Error()` on every state update. Should be dev-only or behind a flag.

### Comment Cleanup

#### Banned comments to remove

- Line 3090: `// NEW: Pass combat reputation`
- Line 3096: `// NEW: Breakdown`
- Line 3097: `// NEW: Breakdown`

#### Stale comments to remove

- Line 31: `// PhaseManager dependency removed - using direct phase checks` -- historical note, no longer informative
- Line 94: `// NOTE: currentRunState has been moved to TacticalMapStateManager` -- migration note
- Line 2852: `// NOTE: currentRunState now managed by TacticalMapStateManager` -- duplicate migration note

#### Useful comments to keep

- Section separators (`// ========================================`) -- aid navigation in large file
- JSDoc blocks on public methods -- useful API documentation
- Architecture comments in `setState` validation (explain WHY validation exists)

### Testing Requirements

#### Before Extraction

1. **Characterization tests for `startRun`**: Test hull calculation from sectionSlots, legacy fallback, default sections, security token deduction, map generation. File: `src/managers/__tests__/GameStateManager.startRun.test.js` (migrate existing).
2. **Characterization tests for `endRun`**: Test loot transfer, damage persistence, MIA protocol, reputation award, shop pack refresh, run summary shape. File: `src/managers/__tests__/GameStateManager.endRun.test.js` (adapt existing `endRunBroadcast` and `credits` tests).
3. **Characterization tests for `endRun` events**: Before converting direct mutations to `setState()`, test which events currently fire during `endRun`. Record the exact event sequence. After conversion, verify the same events fire in the same order. File: `src/managers/__tests__/GameStateManager.endRunEvents.test.js`.
4. **Inventory method tests**: Test `addToInventory`, `updateCardDiscoveryState` state changes. File: `src/managers/__tests__/SinglePlayerInventoryManager.test.js`.
5. **Ship slot CRUD tests**: Test save/delete/unlock/repair flows. File: `src/managers/__tests__/ShipSlotManager.test.js`.

#### After Extraction

1. Move all 12 existing co-located test files into `src/managers/__tests__/`.
2. Update imports in each test file to reference new managers.
3. Verify `GameStateManager` tests still pass (methods now delegate to extracted managers).
4. Add integration tests verifying delegation wiring (GameStateManager calls through to extracted manager).

#### Test file locations

| Test file | Location |
|-|-|
| GameStateManager.test.js | `src/managers/__tests__/GameStateManager.test.js` |
| SinglePlayerInventoryManager.test.js | `src/managers/__tests__/SinglePlayerInventoryManager.test.js` |
| ShipSlotManager.test.js | `src/managers/__tests__/ShipSlotManager.test.js` |
| TacticalItemManager.test.js | `src/managers/__tests__/TacticalItemManager.test.js` |
| StateValidationService.test.js | `src/logic/state/__tests__/StateValidationService.test.js` |
| RunLifecycleManager.test.js | `src/managers/__tests__/RunLifecycleManager.test.js` |
| GuestSyncManager.test.js | `src/managers/__tests__/GuestSyncManager.test.js` |

### Execution Order

Each step is independently committable with tests green.

1. **Remove duplicate `updatePassInfo`** (line 1654-1657). Remove banned `// NEW` comments (lines 3090, 3096, 3097). Remove stale migration comments.
2. **Convert all 56 raw console calls to `debugLog()`** with appropriate categories. Fix direct state mutations in `endRun` to use `setState()`.
3. **Move existing 12 test files** from `src/managers/` to `src/managers/__tests__/`. Update any relative imports.
4. **Extract `StateValidationService`** (585 lines). GameStateManager.setState calls `stateValidationService.validate()`. Write tests.
5. **Extract `GuestSyncManager`** (~170 lines). GameStateManager delegates P2P/guest methods. Write tests.
6. **Extract `SinglePlayerInventoryManager`** (~160 lines). Owns profile, inventory, discovery, save/load. Write tests.
7. **Extract `TacticalItemManager`** (~130 lines). Owns tactical item and card pack purchase. Write tests.
8. **Extract `ShipSlotManager`** (~530 lines). Owns slot CRUD, repair, drone/component instances. Write tests.
9. **Extract `RunLifecycleManager`** (~465 lines). Orchestrates startRun/endRun using other managers. Write tests.
10. **Final cleanup**: Verify GameStateManager is under 400 lines (core state, event system, game lifecycle, thin delegation). Update all import sites across 73 dependent files.

### Risk Assessment

#### What Could Break

| Risk | Severity | Mitigation |
|-|-|-|
| Singleton wiring: extracted managers need access to `gameStateManager.state` and `setState` | High | Pass `gameStateManager` as constructor arg or use shared state reference |
| Direct state mutation in `endRun` (lines 2990-3018) currently works but bypasses events | Medium | Fix mutations to use `setState()` before extraction; verify no UI depends on missing events |
| 73 files import `gameStateManager` -- mass import changes | Medium | Keep facade methods during transition. Remove facade methods in the commit immediately after all import sites are updated — not "over time". |
| Test files reference `gameStateManager` methods directly | Medium | Update all test imports in the same commit as facade removal. |
| HMR singleton preservation | Low | Extracted managers also need HMR preservation if they hold state |
| Stack-trace-based validation breaks after extraction (different file names) | Low | Already handled by `_updateContext` flag; stack-based fallback is secondary |

#### How to Validate

1. Run full test suite after each extraction step
2. Manual smoke test: start PvP game, start extraction run, complete combat, extract, verify save/load
3. Verify `console.log` count is 0 in GameStateManager after step 2
4. Verify GameStateManager line count is under 400 after step 10
5. Run existing 12 test files from new `__tests__/` location after step 3

## NOW

### Final State (Session A — Cleanup + Test Migration)

- **Line count**: 3,142 (down from 3,157 — minor reduction from dead code removal)
- **Console calls**: 0 raw console.log/warn/error/debug remaining
- **Banned comments**: 0 remaining
- **Test files**: 12 migrated to `src/managers/__tests__/`
- **New debug categories**: SP_SAVE, SP_INVENTORY, SP_SHIP, SP_REPAIR, SP_SHOP, SP_DRONE (added to debugLogger.js)

### Final State (Session B — Extract 4 Managers)

- **GSM line count**: 2,074 (down from 3,142 — 1,068 lines removed, 34% reduction)
- **New files created**:
  - `src/logic/state/StateValidationService.js` (474 lines) — 9 validation methods
  - `src/managers/GuestSyncManager.js` (199 lines) — P2P guest sync, optimistic actions
  - `src/managers/SinglePlayerInventoryManager.js` (140 lines) — save/load, inventory, components
  - `src/managers/TacticalItemManager.js` (130 lines) — tactical items, card pack shop
- **New test files**:
  - `src/logic/state/__tests__/StateValidationService.test.js` (13 tests)
  - `src/managers/__tests__/GuestSyncManager.test.js` (10 tests)
- **Full suite**: 3,622 tests passing, 212 test files
- **Facades**: All extracted methods have thin one-liner facades on GSM for backward compatibility. GFM/GMQS facades documented in FUTURE_IMPROVEMENTS.md.

### Change Log

| Step | Date | Change | Behavior Preserved | Behavior Altered | Deviations |
|-|-|-|-|-|-|
| 0 | 2026-02-22 | Pre-flight audit: 3,157 lines, 56 console calls, 3 banned comments, 12 misplaced tests | N/A | N/A | None |
| 1 | 2026-02-22 | Behavioral baseline populated in BEFORE section | N/A | N/A | None |
| 2 | 2026-02-22 | Removed duplicate updatePassInfo (line 1656), 3 banned `// NEW:` comments, 3 stale migration comments | Yes — identical duplicate removed | None | state_sync_requested handler left for GuestSyncManager extraction |
| 3 | 2026-02-22 | Converted 56 console calls to debugLog with 6 new categories | Logging destinations changed from console to debugLog | Logs now filtered by category toggle; test assertions updated to verify behavior instead of console spies | None |
| 4 | 2026-02-22 | Fixed endRun direct state mutations — all changes now via immutable build + setState | Yes — same data transformations | Subscribers now notified of singlePlayerInventory and singlePlayerShipSlots changes (previously silent mutations) | None |
| 5 | 2026-02-22 | Migrated 12 GSM test files to `src/managers/__tests__/`, fixed all imports | Yes — all 871 tests pass | None | None |
| 6 | 2026-02-22 | Extracted StateValidationService (474 lines, 9 methods) to src/logic/state/ | Yes — all delegations verified via facades | None | Updated consecutiveCombat test to spy on stateValidationService instead of GSM |
| 7 | 2026-02-22 | Extracted GuestSyncManager (199 lines, 9 methods + constructor state) to src/managers/ | Yes — facades on GSM for GFM/GMQS consumers | None | Facades kept for GFM/GMQS (constructor injection change deferred) |
| 8 | 2026-02-22 | Extracted SinglePlayerInventoryManager (140 lines, 9 methods) to src/managers/ | Yes — all save/load tests pass via facades | None | External callers keep using GSM facades |
| 9 | 2026-02-22 | Extracted TacticalItemManager (130 lines, 4 methods) to src/managers/ | Yes — all tactical item and card pack tests pass via facades | None | External callers keep using GSM facades |
| 10 | 2026-02-22 | Code review fixes: added getter proxies for optimisticActionService/validatingState on GSM, removed dead singleton code from GuestSyncManager | Yes — property access paths preserved | None | None |
