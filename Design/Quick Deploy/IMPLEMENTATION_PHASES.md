# Quick Deploy - Implementation Phases

## Overview

Implementation is divided into 5 phases, designed to be completed incrementally with testable milestones at each phase.

---

## Phase 1: Data Layer & Validation

### Goal
Establish the data model and validation logic without any UI changes.

### Files to Modify
- `src/data/saveGameSchema.js` - Add quickDeployments array to schema

### New Files
- `src/logic/quickDeploy/QuickDeployValidator.js` - Validation logic
- `src/logic/quickDeploy/QuickDeployService.js` - CRUD operations
- `src/logic/quickDeploy/index.js` - Module exports

### Tasks

1. **Update Save Schema**
   - Add `quickDeployments: []` to default save structure
   - Add validation for quick deployment objects
   - Ensure backward compatibility (empty array for existing saves)

2. **Create QuickDeployValidator**
   ```javascript
   // Methods to implement:
   validateAgainstDeck(quickDeploy, deck, shipSections) → { valid, reasons }
   getValidDeploymentsForDeck(allDeployments, deck, shipSections) → validList
   calculateTotalCost(placements) → number
   ```

3. **Create QuickDeployService**
   ```javascript
   // Methods to implement:
   getAll() → quickDeployments[]
   create(name, droneRoster, placements) → quickDeploy
   update(id, changes) → quickDeploy
   delete(id) → void
   ```

### Testing Milestone
- Unit tests for validation logic
- Can create/read/update/delete quick deployments via service
- Validation correctly identifies valid/invalid deployments

---

## Phase 2: Creation UI

### Goal
Build the Quick Deploy Manager interface accessible from the Hangar screen.

### Files to Modify
- `src/components/screens/ExtractionDeckBuilder.jsx` (or Hangar equivalent) - Add entry button

### New Files
- `src/components/screens/QuickDeployManager.jsx` - Main manager screen/modal
- `src/components/quickDeploy/QuickDeployEditor.jsx` - Lane editor component
- `src/components/quickDeploy/QuickDeployCard.jsx` - Saved deployment card
- `src/components/quickDeploy/DroneRosterSelector.jsx` - 5-slot drone selector
- `src/components/quickDeploy/DronePicker.jsx` - Modal for selecting drones

### Tasks

1. **Add Entry Point**
   - Add "Quick Deployments" button to Hangar screen
   - Position below ship slots
   - Match existing button styling

2. **Create QuickDeployManager**
   - List view of saved deployments (max 5)
   - "Create New" button
   - Edit/Delete options on each card
   - Navigation to editor view

3. **Create QuickDeployEditor**
   - Two-part layout: lanes (top) + roster (bottom)
   - Lane view using existing drone token components
   - Real-time stat calculation with positional bonuses
   - Budget display
   - Deck validity feedback

4. **Implement Interaction Model**
   - Click roster slot → open DronePicker
   - Click drone card → select for placement
   - Click lane → place selected drone
   - Click token → remove to roster
   - Removal cascade when roster changes

5. **Create DroneRosterSelector**
   - 5 slots for drone selection
   - Each slot shows drone or empty placeholder
   - Enforce unique drone types

6. **Create DronePicker**
   - Shows starter drones + blueprinted drones
   - Gray out drones already in roster
   - Match existing modal styling

### Testing Milestone
- Can navigate to Quick Deploy Manager from Hangar
- Can create new quick deployment with full flow
- Can edit existing quick deployments
- Can delete quick deployments
- Budget and validity feedback works correctly
- Lane view shows correct positional bonuses

---

## Phase 3: Game Initialization Integration

### Goal
Enable quick deploy selection at combat start and pass data to initialization.

### Files to Modify
- `src/components/screens/TacticalMapScreen.jsx` (or encounter screen) - Add selection UI
- `src/logic/singlePlayer/SinglePlayerCombatInitializer.js` - Accept quick deploy data
- `src/managers/GameStateManager.js` - Add quickDeployMode to state

### Tasks

1. **Modify Encounter Screen**
   - On encounter initiation, call `QuickDeployValidator.getValidDeploymentsForDeck()`
   - If valid deployments exist, show selection options:
     - "Standard Deployment" (always available)
     - List of valid quick deployments
   - Pass selection to combat initialization

2. **Modify SinglePlayerCombatInitializer**
   - Accept `quickDeployData` parameter in `initiateCombat()`
   - Set `quickDeployMode: true` in initial game state
   - Store `quickDeployData` in game state for execution

3. **Update GameStateManager**
   - Add `quickDeployMode` field to state
   - Add `quickDeployData` field to state

### Testing Milestone
- Encounter screen shows quick deploy options when valid
- Selection is correctly passed to combat initializer
- Game state includes quickDeployMode flag
- Standard deployment still works normally

---

## Phase 4: Quick Deploy Execution

### Goal
Execute quick deploy during loading screen, with AI reactive deployment.

### Files to Modify
- `src/logic/singlePlayer/SinglePlayerCombatInitializer.js` - Add execution method
- `src/logic/deployment/DeploymentProcessor.js` - Add silent execution mode
- `src/managers/AIPhaseProcessor.js` - Add silent AI deployment
- `src/managers/GameFlowManager.js` - Skip deployment phase

### Tasks

1. **Create executeQuickDeploy() Method**
   - Location: `SinglePlayerCombatInitializer.js`
   - Loop through placements
   - Call `DeploymentProcessor.executeDeployment()` for each
   - Pass `silent: true` to skip animations
   - Costs deducted normally

2. **Add Silent Mode to DeploymentProcessor**
   - Add `silent` option to `executeDeployment()`
   - When `silent: true`, skip animation queuing
   - All other logic (cost deduction, board placement) unchanged

3. **Create executeQuickDeployAI() Method**
   - Location: `AIPhaseProcessor.js`
   - Loop calling `handleOpponentTurn()` until AI passes
   - Execute each deployment silently
   - AI sees player's placed drones for lane scoring

4. **Modify Phase Transition**
   - In `GameFlowManager.isPhaseRequired()`:
     - If `quickDeployMode && phase === 'deployment'`, return `false`
   - This causes game to skip directly to action phase

5. **Integration Flow**
   - After `processRoundInitialization()`:
     - If `quickDeployMode`:
       - Call `executeQuickDeploy()`
       - Call `executeQuickDeployAI()`
   - Phase transition skips deployment, goes to action

### Testing Milestone
- Quick deploy executes player drones correctly
- Costs are deducted properly
- AI deploys reactively based on player positions
- Game starts at action phase with all drones on board
- All initialization (energy, cards) happens correctly

---

## Phase 5: Polish & Edge Cases

### Goal
Handle edge cases, add polish, ensure robustness.

### Tasks

1. **Edge Case Handling**
   - Quick deployment references drone that was lost (MIA)
   - Deck changes making deployment invalid mid-session
   - Empty quick deployment (0 drones placed)
   - All quick deployments invalid for current deck

2. **UI Polish**
   - Clear feedback when no valid quick deployments available
   - Helpful error messages explaining why deployment is invalid
   - Confirmation dialog for deleting quick deployments

3. **Board Reveal**
   - When game loads after quick deploy, all drones appear simultaneously
   - Consider brief animation or announcement for quick deploy mode
   - Ensure visual state is correct (no stale UI)

4. **Testing**
   - Full integration tests
   - Edge case coverage
   - Performance testing (AI deployment should be fast)
   - Save/load testing with quick deployments

5. **Documentation**
   - Update any in-game help/tutorials if applicable
   - Code comments for new modules

### Testing Milestone
- All edge cases handled gracefully
- UI provides clear feedback in all scenarios
- No visual glitches on game load
- Performance is acceptable

---

## File Summary

### New Files (7)
```
src/logic/quickDeploy/
├── index.js
├── QuickDeployValidator.js
└── QuickDeployService.js

src/components/quickDeploy/
├── QuickDeployEditor.jsx
├── QuickDeployCard.jsx
├── DroneRosterSelector.jsx
└── DronePicker.jsx

src/components/screens/
└── QuickDeployManager.jsx
```

### Modified Files (7)
```
src/data/saveGameSchema.js
src/components/screens/ExtractionDeckBuilder.jsx (or Hangar)
src/components/screens/TacticalMapScreen.jsx (encounter screen)
src/logic/singlePlayer/SinglePlayerCombatInitializer.js
src/logic/deployment/DeploymentProcessor.js
src/managers/AIPhaseProcessor.js
src/managers/GameFlowManager.js
src/managers/GameStateManager.js
```

---

## Dependencies Between Phases

```
Phase 1 (Data Layer)
    │
    ▼
Phase 2 (Creation UI) ─────────┐
    │                          │
    ▼                          │
Phase 3 (Game Init Integration)│
    │                          │
    ▼                          │
Phase 4 (Execution) ◄──────────┘
    │
    ▼
Phase 5 (Polish)
```

- Phase 2 depends on Phase 1 (uses validator and service)
- Phase 3 depends on Phase 1 (uses validator)
- Phase 4 depends on Phase 3 (receives quick deploy data)
- Phase 5 can run in parallel with later phases as issues are found
