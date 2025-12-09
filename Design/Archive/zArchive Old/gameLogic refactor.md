ORCHESTRATOR AND ACTION PROCESSING SYSTEM - ANALYSIS BRIEF

VISION:
Build a modular action processing system where all required targeting logic is split into separate files organized by targeting type, and all effect logic is split into separate files organized by effect type. The system routes to the correct processors based on the card/action data structure.

PRIMARY GOALS:
The driving force behind this refactoring is CODE SIMPLICITY and REDUCING TECHNICAL DEBT.

1. SIMPLIFY gameLogic.js
   - Currently gameLogic.js is 5000+ lines with multiple effect resolvers and targeting logic all mixed together
   - Goal: Extract each targeting processor into its own file (targetingDrone.js, targetingLane.js, etc.)
   -- Note that these will be even more granular than in these examples, my aim is to have every unique targetting type as a separate file. Use what is suggested as a guide only. 
   - Goal: Extract each effect processor into its own file (effectDamage.js, effectSplashDamage.js, etc.)
   -- Note that these will be even more granular than in these examples, my aim is to have every unique targetting type as a separate file. Use what is suggested as a guide only. 
   - Result: gameLogic.js becomes a cleaner, and a separate orchestrator exists that routes to these modular processors, not a monolithic function container
   - Benefit: Much easier to read, understand, maintain, and debug

2. REDUCE TECHNICAL DEBT
   - Currently: Adding a new card type requires understanding the entire 5000-line gameLogic.js
   - Future: Adding a new card type means creating one targeting file + one effect file, both small and focused
   - Currently: Fixing a bug in targeting logic requires hunting through thousands of lines
   - Future: Fixing a bug in drone targeting means opening targetingDrone.js, which is only what you need
   - Currently: Different effects handle their flow differently (inconsistent patterns)
   - Future: All effects follow the same orchestrator-based pattern (consistency, predictability, easier for Claude to work with)

3. MAINTAINABILITY
   - Smaller files = easier for developers to understand what they're doing
   - Modular design = easier for Claude Code to work on isolated pieces without understanding the entire system
   - Clear patterns = easier to add new targeting types, effect types, or action types
   - Separated concerns = less risk of changes in one area breaking unrelated areas

4. SCALABILITY
   - As the game grows and more cards are added, the current monolithic approach won't scale
   - The modular approach scales linearly (add new card = add new files, no changes to existing files)

CURRENT STATE:
The game is in the action phase. An action enters the orchestrator when a player/AI initiates it.

SCOPE - What This 'Orchestrator' (possibly actionProcessor.js) Handles (Complete Lifecycle):
1. Determine what type of action is being initiated (card, drone attack, drone move, ship ability, etc.)
2. Route to the correct targeting processor to get valid targets (or skip if no targeting needed)
3. Wait for and receive the player's pre-confirmation selections (target, lane, etc.)
4. Handle confirmation UI and wait for final player confirmation
5. Process any post-confirmation selections (e.g., opponent interception, deck searching where player sees hidden info)
6. Route to the correct effect processor to apply the action's logic
7. Collect and sequence animation events
8. Update and return the game state

The orchestrator is the STATE MACHINE that moves an action through all these phases sequentially. Every action must go through every phase, albeit some times the phase will simply be passed straight through. This maintains consistency across all actions. 

PROPOSED FILE STRUCTURE (DISCUSSION STARTING POINT):
This is NOT a mandate—it's a proposed structure for discussion. Your assessment of whether this makes sense is a critical part of this analysis. I want every uniqute targetting type and every unique effect to have its own file.

```
game-logic/
├── orchestrator/
│   └── resolveCard.js (main orchestrator - routes everything - may be supurflouse if actionProcessor can do this)
├── targeting/
│   ├── targetingDrone.js
│   ├── targetingShipSection.js
│   ├── targetingLane.js
│   ├── targetingDroneCard.js
│   └── targetingAllMarked.js
├── effects/
│   ├── effectDamage.js
│   ├── effectSplashDamage.js
│   ├── effectOverflowDamage.js
│   ├── effectDraw.js
│   ├── effectGainEnergy.js
│   ├── effectReadyDrone.js
│   ├── effectHealHull.js
│   ├── effectHealShields.js
│   ├── effectDestroy.js
│   ├── effectModifyDroneBase.js
│   ├── effectSearchAndDraw.js
│   ├── effectCreateTokens.js
│   ├── effectDamageScaling.js
│   └── effectSingleMove.js
└── helpers/
    ├── findDroneInBoard.js
    ├── findShipSection.js
    ├── applyDamage.js
    └── (shared utilities)
```

CRITICAL ASSESSMENT NEEDED FROM CLAUDE CODE:
Please examine actionProcessor.js specifically and determine:
1. Is actionProcessor.js already serving as an orchestrator?
2. If yes, what is it already doing? Can it be evolved into the routing system described above?
3. If no, where should the orchestrator live? Should it replace actionProcessor.js? Work alongside it? Something else?
4. Is the proposed file structure appropriate given how actions currently flow through the codebase?
5. Are there different types of actions (card plays, drone attacks, etc.) that might need different orchestration approaches?
6. What would need to change in actionProcessor.js (or its replacement) to support this modular targeting/effect system?

The goal of this analysis is to determine: Does this proposed structure make sense for your codebase, or do you recommend a different approach based on what's currently there?

KEY GOAL FOR THIS ANALYSIS:
Understand how the game currently processes actions from initiation through completion, so we can build an orchestrator that routes all targeting and effect logic through modular processors WITHOUT breaking current functionality.

This means understanding:
- How targeting is currently requested and validated
- How player selections are currently collected
- How confirmations currently work
- How effects are currently applied
- How animations are currently sequenced
- Where all of this logic currently lives so we can extract and modularize it

Then, we can identify where the orchestrator should coordinate all these pieces.

ANALYSIS TASKS - Please examine and report on:

1. ACTION LIFECYCLE FLOW - With specific focus on actionProcessor.js
   a. What is the entry point for an action? (How does it get initiated?)
   b. Examine actionProcessor.js specifically:
      - What does it currently do?
      - Is it already orchestrating actions through multiple phases?
      - What files does it call/import?
      - What data does it receive and return?
      - Is it the right place for the modular routing system, or would something new be needed?
   c. What is the current data structure for representing an action at each phase?
   d. Walk through a complete action from start to finish:
      - Example 1: Playing an action card that targets a drone (e.g., Laser Blast)
      - Example 2: Playing an action card with no targeting (e.g., Energy Surge)
      - Example 3: A drone attacking another drone
      - Example 4: A ship section ability (e.g., reallocate shields)
   e. For each example, identify:
      - Where does targeting happen? (if at all)
      - Where does the player confirm the selection?
      - Where does the effect get applied?
      - Where are animations generated?
      - Where does the state get updated?
   f. Who currently orchestrates this flow? Is it actionProcessor.js? App.jsx? A separate orchestrator? Scattered across multiple files?
   g. What happens between each step? Is there state being held? Where?

2. TARGETING LOGIC LOCATIONS
   a. Where is targeting logic currently implemented?
   b. Is it in gameLogic.js? Separate files? Spread across multiple places?
   c. How does the system currently determine which targets are valid?
   d. For each targeting type in cardData (DRONE, LANE, SHIP_SECTION, DRONE_CARD, ALL_MARKED):
      - Where is the logic to find valid targets?
      - What does it return?
   e. Are there any targeting types that work differently than others?

3. EFFECT LOGIC LOCATIONS
   a. Where is effect logic currently implemented?
   b. How many different effect types exist? (Look for effect.type in cardData)
   c. For each effect type (DAMAGE, SPLASH_DAMAGE, OVERFLOW_DAMAGE, DRAW, etc.):
      - Where is the resolver function?
      - What does it do?
      - What does it return?
   d. Are there any patterns in how effects are structured?
   e. Do some effects handle their own animations? Do others return animation data?

4. ANIMATION GENERATION
   a. Where are animation events currently created?
   b. Are they generated during effect processing or afterward?
   c. What data structure do animation events have?
   d. For complex cards like Railgun (with different animation paths), how is that currently handled?

5. GAME STATE UPDATES
   a. How is playerStates currently passed through the action processing?
   b. Are updates made directly or are copies used?
   c. Where does the final updated state get returned/stored?

6. EXISTING ORCHESTRATION
   a. Is there already an orchestrator or main router for actions?
   b. If yes, what does it do?
   c. If no, where would be the best place to introduce one?

7. POTENTIAL INTEGRATION POINTS
   a. Where could we inject a "targeting router" that dispatches to individual targeting processors?
   b. Where could we inject an "effect router" that dispatches to individual effect processors?
   c. Are there any files that would need restructuring to make this modular approach work?
   d. What would break if we started extracting functions into separate files?

EXPECTED OUTPUT FROM THIS ANALYSIS:
After you examine the code, please provide:

1. A complete flow diagram or written walkthrough of how a single action moves through the system from initiation to completion (use a concrete example like "Laser Blast targeting a drone")
2. Identification of where each phase of the action lifecycle currently happens:
   - Phase 1: Action initiation
   - Phase 2: Valid targets determination (and how they're returned)
   - Phase 3: Player makes pre-confirmation selections
   - Phase 4: Confirmation UI and waiting for confirmation
   - Phase 5: Post-confirmation processing
   - Phase 6: Effect application
   - Phase 7: Animation sequencing
   - Phase 8: State update and return
3. A mapping of where each targeting type's logic currently lives
4. A mapping of where each effect type's logic currently lives
5. How the current system handles asynchronous waiting (for player input, for opponent responses, etc.)
6. The optimal place for the orchestrator to live
7. What data structure(s) the orchestrator would need to manage to coordinate all 8 phases
8. Any concerns or dependencies that would break if we started extracting and modularizing
9. Recommended extraction order (what should be refactored first vs. last, and why)
10. Identification of any quick wins or low-hanging fruit to demonstrate the approach working

FILES TO EXAMINE:
- gameLogic.js (the main logic file, even though it's large)
- Any action processing files (actionProcessor.js, effectResolver.js, etc.)
- Any targeting-related files
- The main game loop/state management files that call action processing
- cardData.js (to understand the data structures being routed on)

FILES TO CREATE:
 - gameLogic Refactor Analysis Output.md in the \design\ folder. 

STARTING QUESTIONS:
1. When a player initiates an action, what is the current flow from that moment until the action completes?
2. Where should the orchestrator live? (In App.jsx? A separate ActionOrchestrator.js? Elsewhere?)
3. What data structures need to exist for the orchestrator to manage action state through all 8 phases?
4. How does the current system handle waiting for player input? (Is it callback-based? Promise-based? Something else?)
5. How are targeting processors currently called? Can we extract this into a modular system?
6. How are effect processors currently called? Can we extract this into a modular system?
7. What's the minimum viable refactor to demonstrate the modular approach working for one complete action?
8. What file dependencies would break if we started extracting functions? What needs to be handled carefully?