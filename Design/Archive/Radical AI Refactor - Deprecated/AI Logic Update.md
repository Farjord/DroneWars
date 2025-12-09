# AI Strategic Framework - Complete Implementation Guide
**For Claude Code Implementation - Stateless Decision Making**

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Game Mechanics Reference](#game-mechanics-reference)
3. [Current AI System Overview](#current-ai-system-overview)
4. [New Strategic Framework Architecture](#new-strategic-framework-architecture)
5. [Layer 1: Strategic State Assessment](#layer-1-strategic-state-assessment)
6. [Layer 2: Goal Definition](#layer-2-goal-definition)
7. [Layer 3: Path Planning](#layer-3-path-planning)
8. [Layer 4: Path Evaluation](#layer-4-path-evaluation)
9. [Layer 5: Execution](#layer-5-execution)
10. [Mechanic Handlers](#mechanic-handlers)
11. [Integration Guide](#integration-guide)
12. [Testing & Validation](#testing--validation)

---

## Executive Summary

### Problem Statement
The current AI (in `aiLogic.js`) makes **tactically sound but strategically blind decisions**. It evaluates individual actions in isolation without understanding:
- Am I winning or losing?
- Can I win this turn?
- Should I be attacking or defending?
- What sequences of actions lead to victory?

### Solution Overview
**Two-pronged approach:**

**Phase 1: Tactical AI Improvements** ✅ COMPLETED (2025-10-12)
Enhanced the existing `aiLogic.js` with:
- ✅ Speed-based interception awareness (analyzes slow attackers, unchecked threats, interceptors)
- ✅ Strategic Jammer handling (comprehensive blocked value calculation, removal bonuses)
- ✅ ON_MOVE ability detection (Phase Jumper stat gains from movement)
- ✅ Reweighted lane scoring: Speed (8x) > Attack (4x) > Cost (2x) > Durability (0.5x)
- ✅ Lane impact analysis for attacks (lane flip bonuses, strategic positioning)

**Phase 2: Strategic AI** (Not Yet Implemented)
**Create a NEW strategic AI alongside the improved tactical AI**, allowing players to choose between:
- **Tactical AI** (improved aiLogic.js with interception/Jammer awareness)
- **Strategic AI** (new 5-layer hierarchical planning system):
  1. **Assessment** - Analyze game state (pristine sections, threats, shield allocation)
  2. **Goal Definition** - Define what we're trying to achieve (damage pristine section, survive turn)
  3. **Path Planning** - Generate multi-step action sequences to understand strategic value
  4. **Evaluation** - Score paths based on efficiency and success probability
  5. **Execution** - Execute the FIRST step only, re-evaluate next turn

### Critical Architectural Principle: STATELESS DECISION MAKING

**The AI does NOT store plans between turns. Every `handleOpponentAction()` call is a fresh evaluation.**

#### Why Stateless?
- **Simpler**: No state management, no stale plan bugs
- **More Adaptive**: Automatically reacts to any game state changes
- **Self-Correcting**: If a plan was sound, follow-up actions naturally score highest when re-evaluated
- **More Robust**: Player actions between AI turns are automatically handled

#### How It Works
```javascript
// Each turn is completely independent:

Turn 1: 
  → Assess game state
  → Generate paths (including "Kill Guardian → Attack Section")
  → Evaluate: "Kill Guardian" = 1200 points (enables win next turn)
  → Execute: Attack Guardian
  → Done. Forget everything.

Turn 2 (after Go Again or next turn):
  → Assess game state (Guardian is dead now)
  → Generate paths (now "Attack Section" is directly executable)
  → Evaluate: "Attack Section" = 1500 points (immediate win)
  → Execute: Attack Section
  → Done.
```

**Key Insight**: Multi-step paths are generated to understand strategic context and score first steps correctly, but only the first step executes. Game state naturally carries forward what happened.

### Key Improvements
- ✅ Recognizes winning opportunities (enemy has 1 pristine section)
- ✅ Detects defensive crises (you have 1 pristine section under threat)
- ✅ Plans combo sequences (Go Again chains, Ready → Attack)
- ✅ Handles blockers intelligently (Guardian, Jammer)
- ✅ Accounts for shield regeneration and allocation
- ✅ Calculates tempo and "turns to win"
- ✅ Remains reactive to game state changes
- ✅ No complex state management

---

## Game Mechanics Reference

### Win Condition
```javascript
// Game ends when ANY player has all 3 sections damaged
// "Damaged" = hull <= 5 (or status === 'damaged' || 'critical')
// "Pristine" = hull === 10 (maxHull)
```

### Critical Mechanics

#### Shield System
- **Shield Pool**: Dynamic per turn based on Power Cell status
  - Healthy: 3 shields/turn
  - Damaged: 2 shields/turn
  - Critical: 1 shield/turn
  - Middle lane bonus: +1 shield/turn
- **Shield Allocation**: Player distributes pool across 3 sections at round start
- **Breakthrough Threshold**: Need 4+ damage to touch hull on 3-shield section (3 shields + 1 hull)
- **No Carry-Over**: Shields reset each round (not damage to shields - they're reallocated)

#### Combat Keywords
- **GUARDIAN**: Blocks ship attacks in lane (Guardian must be killed first)
- **JAMMER**: Forces enemy cards to target only Jammer drones (maxPerLane: 1)
- **PIERCING**: Ignores shields entirely
- **DEFENDER**: Doesn't exhaust when intercepting
- **ALWAYS_INTERCEPTS**: Must intercept if speed allows

#### Special Mechanics
- **Go Again**: Card/ability doesn't end turn (enables combos, triggers immediate re-evaluation)
- **AFTER_ATTACK**: Triggers after drone attacks (Kamikaze self-destruct, Gladiator +attack)
- **ON_MOVE**: Triggers when drone moves (Phase Jumper gains permanent stats)
- **maxPerLane**: Some drones limited per lane (Jammer: 1 per lane)

#### Turn Structure
```
1. Energy Reset
2. Mandatory Discards (over hand limit)
3. Optional Discards
4. Mandatory Drone Removals (over CPU limit)
5. Shield Allocation Phase
6. Deployment Phase (players alternate deploying drones)
7. Action Phase (move/attack/play cards, back-and-forth until both pass)
8. Round End
```

### Important Card Types

#### Go Again Cards (Enable Combos)
- System Reboot (Draw 2, go again) - 1 energy
- Energy Surge (Gain 2 energy, go again) - 0 energy
- Adrenaline Rush+ (Ready drone, go again) - 3 energy
- Streamline (Lane-wide +1 speed, go again) - 2 energy
- Static Field (-2 attack, go again) - 1 energy
- Nanobot Repair (Heal 3 hull, go again) - 1 energy

#### Removal Cards
- Target Lock (Destroy single drone) - 5 energy
- Laser Blast (3 damage to drone) - 3 energy
- Nuke (Destroy ALL drones in lane, both sides) - 7 energy
- Shrieker Missiles (Destroy speed>=5 drones in lane) - 4 energy

#### Movement Cards
- Maneuver (Move adjacent, don't exhaust, go again) - 1 energy
- Reposition (Move up to 3 drones, don't exhaust) - 1 energy

---

## Current AI System Overview

### File Structure
- **Location**: `aiLogic.js`
- **Main Functions**:
  - `handleOpponentTurn()` - Deployment phase decisions
  - `handleOpponentAction()` - Action phase decisions
  - `makeInterceptionDecision()` - Intercept decisions

### Current Deployment Logic
```javascript
// For each possible deployment:
1. Calculate lane score using reweighted formula:
   - Power = (attack + potentialShipDamage) × 4  // Attack highly prioritized
            + (drone.class) × 2                   // Cost factored in
            + (hull + shields) × 0.5              // Durability de-emphasized
   - Speed = (aiMaxSpeed - humanMaxSpeed) × 8    // Speed dominance
   - Base score = (AI power - Human power) + speed differential
2. Add ship health modifiers (damaged/critical sections)
3. Add strategic bonuses (losing→defenders, winning→attackers)
4. Add stabilization/dominance bonuses (lane flips, dominance thresholds)
5. Subtract overkill penalty (avoid over-committing to already-won lanes)
6. Choose highest scoring deployment
```

### Current Action Logic
```javascript
// For each possible action (attack, card, move):
1. Score action individually (attack class value, card efficiency, move lane impact)
2. Multi-pass Jammer adjustment:
   - Pass 1: Identify blocked card plays, accumulate blocked value per lane
   - Pass 1.5: Calculate comprehensive affordable blocked value (all cards AI could play)
   - Pass 2: Apply Jammer removal bonuses (+blockedValue to Jammer attacks)
   - Efficiency bonus: +30 for using low-attack drones to remove Jammers
3. Multi-pass Interception adjustment:
   - Analyze interception dynamics (slow attackers, unchecked threats, interceptors)
   - Ship attacks from interceptable drones: -80 penalty
   - Unchecked threats (too fast to intercept): +100 bonus
   - Defensive interceptor usage penalty: scaled by threat (-10 to -120)
   - Enemy interceptor removal: bonus based on attacks it unblocks
4. Choose highest scoring action (with +/-20 randomization pool)
```

### Recent Improvements (Tactical AI)
- ✅ Speed-based interception awareness with comprehensive analysis
- ✅ Strategic Jammer blocking and removal with value calculation
- ✅ ON_MOVE ability detection for movement cards (Phase Jumper, etc.)
- ✅ Reweighted lane scoring: Speed (8x) > Attack (4x) > Cost (2x) > Durability (0.5x)
- ✅ Lane impact scoring for attacks (lane flip bonuses, strategic positioning)

### Limitations (Areas for Strategic AI)
- ❌ No multi-step planning (single-action evaluation only)
- ❌ No combo detection (Go Again chains not recognized)
- ❌ No "can I win this turn?" analysis (no win condition checking)
- ❌ No blocker removal planning (Guardian/Jammer kills not coordinated with follow-ups)
- ❌ No shield pool pressure calculation (doesn't model shield regeneration)
- ❌ No tempo calculation ("turns to win" not calculated)

---

## New Strategic Framework Architecture

### Design Principles

#### 1. Stateless Decision Making (CRITICAL)
```javascript
// EVERY handleOpponentAction() call:
function handleOpponentAction(gameState, getValidTargets, getLaneOfDrone, gameStateManager) {
  // Extract game state data
  const player2State = gameState.player2;
  const player1State = gameState.player1;
  const placedSections = {
    player1: gameState.placedSections,
    player2: gameState.opponentPlacedSections
  };

  // Create GameDataService instance for stat calculations
  const gameDataService = GameDataService.getInstance(gameStateManager);

  // 1. Fresh assessment
  const assessment = assessStrategicState(player2State, player1State, placedSections, gameDataService);

  // 2. Determine strategic mode
  const strategicMode = determineStrategicMode(assessment);

  // 3. Define goal
  const goal = defineGoals(strategicMode, assessment, player2State, player1State, gameDataService);

  // 4. Generate paths (multi-step for context)
  const paths = generatePaths(goal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone);

  // 5. Evaluate paths
  const scored = evaluatePaths(paths, strategicMode, goal);

  // 6. Select best executable path
  const bestPath = selectBestPath(scored, player2State);

  // 7. Execute FIRST STEP of best path
  const result = executeFirstStep(bestPath);

  // 8. FORGET EVERYTHING
  return result;
}
```

**No state persists between calls.** Game state is the only source of truth.

#### 2. Multi-Step Paths for Context, Not Execution
Paths like `[Kill Guardian, Attack Section]` are generated to:
- **Score first steps accurately**: "Killing Guardian is worth 1200 points because it enables a win"
- **Provide lookahead**: "I can't win this turn, but this sets up a win"
- **Show strategic value**: "This action is part of a winning sequence"

But only the first step executes. The rest is context for scoring.

#### 3. Single-Step Execution with Natural Continuation
```javascript
Turn 1: AI kills Guardian (first step of multi-step path)
        → Guardian dies, game state updated
        
Turn 2: AI re-evaluates fresh
        → "Attack Section" now scores highest (no Guardian blocking)
        → Naturally continues the strategy

// No need to remember "attack section next" - 
// if it was the right plan, it'll score highest when re-evaluated
```

#### 4. Go Again Means Immediate Re-Evaluation
```javascript
// Game automatically calls handleOpponentAction() again after Go Again
if (result.payload.card?.effect.goAgain) {
  // AI gets fresh evaluation with updated game state
  // Naturally completes combos without explicit planning
}
```

#### 5. Dual-AI Architecture
- Strategic AI in completely separate files - zero risk to existing AI
- Players choose which AI to use (tactical vs strategic)
- Existing tactical AI remains unchanged and always available
- Safe testing and comparison between both approaches

### File Structure
```
src/logic/
├── aiLogic.js (UNCHANGED - existing tactical AI)
├── aiLogicStrategic.js (NEW - strategic AI orchestrator)
├── aiStrategic.js (NEW - layers 1-2: assessment, goals)
├── aiPathPlanner.js (NEW - layer 3: path generation)
├── aiPathEvaluator.js (NEW - layer 4: scoring)
├── aiExecution.js (NEW - layer 5: execution)
└── aiMechanics.js (NEW - mechanic handlers)
```

**ARCHITECTURE:**
- **aiLogic.js** exports `aiBrain` with `handleOpponentAction` (tactical)
- **aiLogicStrategic.js** exports `aiStrategicBrain` with `handleOpponentActionStrategic` (strategic)
- Both have identical function signatures - completely swappable
- AI personality data (aiData.js) specifies which brain to use

### Data Flow
```
Game State → Strategic Assessment → Goal → Paths → Evaluation → Best Path
     ↓              ↓                  ↓       ↓         ↓           ↓
  pristine      AGGRESSIVE         damage   score    Execute    FIRST STEP
  sections      DEFENSIVE         section  paths    first       ONLY
  threats       BALANCED          remove            step
              RACE MODE           blocker                       
                                                    Next call:
                                                    START OVER
```

---

## Layer 1: Strategic State Assessment

### Purpose
Analyze game state to determine strategic mode and identify key targets/threats.

### Implementation
**File**: `src/logic/aiStrategic.js`

```javascript
import fullDroneCollection from '../data/droneData.js';

/**
 * Assess the current strategic state
 * Called fresh every turn - no state persistence
 * @param {Object} player2State - AI player state
 * @param {Object} player1State - Human player state
 * @param {Object} placedSections - Section placement data
 * @param {Object} gameDataService - GameDataService instance for stat calculations
 * @returns {Object} Strategic assessment
 */
export function assessStrategicState(player2State, player1State, placedSections, gameDataService) {
  // Count pristine sections (hull === maxHull which is 10)
  const yourPristineSections = countPristineSections(player2State);
  const enemyPristineSections = countPristineSections(player1State);

  // Get pristine section details with shield status
  const enemyPristineTargets = getEnemyPristineTargets(
    player1State,
    placedSections.player1
  );

  const yourPristineVulnerabilities = getYourPristineVulnerabilities(
    player2State,
    player1State,
    placedSections.player2,
    gameDataService
  );

  // Get shield pool information from GameDataService (includes middle lane bonuses)
  const enemyShieldPool = gameDataService.getEffectiveShipStats(player1State, placedSections.player1).totals.shieldsPerTurn;
  const yourShieldPool = gameDataService.getEffectiveShipStats(player2State, placedSections.player2).totals.shieldsPerTurn;
  
  const assessment = {
    yourPristine: yourPristineSections.count,
    yourPristineSections: yourPristineSections.sections,
    enemyPristine: enemyPristineSections.count,
    enemyPristineSections: enemyPristineSections.sections,
    enemyPristineTargets,
    yourPristineVulnerabilities,
    enemyShieldPool,
    yourShieldPool
  };
  
  // LOG for testing (visible in browser console with F12)
  console.log('🤖 [AI ASSESSMENT]', {
    yourPristine: assessment.yourPristine,
    enemyPristine: assessment.enemyPristine,
    enemyShieldPool: assessment.enemyShieldPool
  });
  
  return assessment;
}

/**
 * Count pristine sections for a player
 */
function countPristineSections(playerState) {
  const sections = [];
  let count = 0;
  
  for (const [name, section] of Object.entries(playerState.shipSections)) {
    if (section.hull === section.maxHull) {
      count++;
      sections.push({ name, section });
    }
  }
  
  return { count, sections };
}

/**
 * Get detailed info about enemy pristine sections
 */
function getEnemyPristineTargets(player1State, placedSections) {
  const targets = [];
  
  for (let i = 0; i < placedSections.length; i++) {
    const sectionName = placedSections[i];
    const section = player1State.shipSections[sectionName];
    const laneId = `lane${i + 1}`;
    
    if (section.hull === section.maxHull) {
      targets.push({
        sectionName,
        laneId,
        shields: section.allocatedShields,
        hull: section.hull,
        maxHull: section.maxHull,
        // Calculate threats in this lane
        threatsInLane: player2State.dronesOnBoard[laneId] || []
      });
    }
  }
  
  return targets;
}

/**
 * Get info about your vulnerable pristine sections
 */
function getYourPristineVulnerabilities(player2State, player1State, placedSections, gameDataService) {
  const vulnerabilities = [];

  for (let i = 0; i < placedSections.length; i++) {
    const sectionName = placedSections[i];
    const section = player2State.shipSections[sectionName];
    const laneId = `lane${i + 1}`;

    if (section.hull === section.maxHull) {
      // Calculate enemy threats in this lane using GameDataService
      const enemyDrones = player1State.dronesOnBoard[laneId] || [];
      const totalEnemyAttack = enemyDrones
        .filter(d => !d.isExhausted)
        .reduce((sum, d) => sum + (gameDataService.getEffectiveStats(d, laneId).attack || 0), 0);
      
      vulnerabilities.push({
        sectionName,
        laneId,
        shields: section.allocatedShields,
        hull: section.hull,
        maxHull: section.maxHull,
        enemyThreatsInLane: enemyDrones,
        totalEnemyAttack,
        canBeDamagedThisTurn: totalEnemyAttack > section.allocatedShields
      });
    }
  }
  
  return vulnerabilities;
}

/**
 * Determine strategic mode based on assessment
 */
export function determineStrategicMode(assessment) {
  const { yourPristine, enemyPristine, enemyPristineTargets, yourPristineVulnerabilities } = assessment;

  let mode;

  // CRITICAL STATES (highest priority)
  // Check RACE condition FIRST (both === 1) before individual checks
  if (yourPristine === 1 && enemyPristine === 1) {
    mode = {
      mode: 'RACE',
      priority: 'WIN_FASTER',
      description: 'Both players at 1 pristine - race to damage theirs first!',
      focusTargets: enemyPristineTargets,
      protectTargets: yourPristineVulnerabilities
    };
  } else if (enemyPristine === 1) {
    mode = {
      mode: 'AGGRESSIVE',
      priority: 'WIN_NOW',
      description: 'Enemy has 1 pristine section remaining - push for victory!',
      focusTargets: enemyPristineTargets
    };
  } else if (yourPristine === 1) {
    // Check if pristine section is under immediate threat
    const vulnerability = yourPristineVulnerabilities[0];
    const isUnderThreat = vulnerability && vulnerability.canBeDamagedThisTurn;

    mode = {
      mode: 'DEFENSIVE',
      priority: isUnderThreat ? 'SURVIVE_NOW' : 'PROTECT',
      description: 'You have 1 pristine section remaining - defend at all costs!',
      protectTargets: yourPristineVulnerabilities,
      emergencyLevel: isUnderThreat ? 'CRITICAL' : 'HIGH'
    };
  } else if (enemyPristine === 2) {
    mode = {
      mode: 'AGGRESSIVE',
      priority: 'APPLY_PRESSURE',
      description: 'Enemy has 2 pristine sections - maintain offensive pressure',
      focusTargets: enemyPristineTargets
    };
  } else if (yourPristine === 2) {
    mode = {
      mode: 'DEFENSIVE',
      priority: 'STABILIZE',
      description: 'You have 2 pristine sections - stabilize defenses',
      protectTargets: yourPristineVulnerabilities
    };
  } else {
    // BALANCED
    mode = {
      mode: 'BALANCED',
      priority: 'BUILD_ADVANTAGE',
      description: 'Game is balanced - focus on efficient trades and positioning',
      focusTargets: enemyPristineTargets
    };
  }
  
  // LOG for testing
  console.log('🎯 [AI MODE]', mode.mode, '-', mode.priority);
  
  return mode;
}
```

---

## Layer 2: Goal Definition

### Purpose
Translate strategic mode into concrete, measurable goals.

### Implementation

```javascript
/**
 * Define goals based on strategic mode
 * Called fresh every turn
 */
export function defineGoals(strategicMode, assessment, player2State, player1State, gameDataService) {
  switch (strategicMode.mode) {
    case 'AGGRESSIVE':
      return defineAggressiveGoals(strategicMode, assessment, player2State, player1State, gameDataService);
    
    case 'DEFENSIVE':
      return defineDefensiveGoals(strategicMode, assessment, player2State, player1State, gameDataService);
    
    case 'RACE':
      return defineRaceGoals(strategicMode, assessment, player2State, player1State, gameDataService);
    
    case 'BALANCED':
    default:
      return defineBalancedGoals(strategicMode, assessment, player2State, player1State, gameDataService);
  }
}

/**
 * Define aggressive goals (damage pristine section)
 */
function defineAggressiveGoals(strategicMode, assessment, player2State, player1State, gameDataService) {
  const target = assessment.enemyPristineTargets[0]; // Focus on first pristine
  if (!target) return null;
  
  const { laneId, sectionName, shields, hull } = target;
  
  // Calculate available damage in lane
  const dronesInLane = player2State.dronesOnBoard[laneId] || [];
  const readyDrones = dronesInLane.filter(d => !d.isExhausted);
  
  let totalAttack = 0;
  let antiShipDamage = 0;
  
  for (const drone of readyDrones) {
    const effectiveStats = gameDataService.getEffectiveStats(drone, laneId);
    totalAttack += effectiveStats.attack || 0;
    
    // Check for anti-ship bonuses
    const baseDrone = fullDroneCollection.find(d => d.name === drone.name);
    const antiShipAbility = baseDrone?.abilities?.find(a => 
      a.type === 'PASSIVE' && a.effect.type === 'BONUS_DAMAGE_VS_SHIP'
    );
    if (antiShipAbility) {
      antiShipDamage += antiShipAbility.effect.value;
    }
  }
  
  const totalDamageAvailable = totalAttack + antiShipDamage;
  const damageNeeded = shields + 1; // Break shields + 1 hull
  
  // Identify blockers
  const enemyDronesInLane = player1State.dronesOnBoard[laneId] || [];
  const guardians = enemyDronesInLane.filter(d => {
    const stats = gameDataService.getEffectiveStats(d, laneId);
    return stats.keywords.has('GUARDIAN');
  });
  
  const jammers = enemyDronesInLane.filter(d => {
    const stats = gameDataService.getEffectiveStats(d, laneId);
    return stats.keywords.has('JAMMER');
  });
  
  return {
    type: 'DAMAGE_SECTION',
    target: { sectionName, laneId, shields, hull },
    damageNeeded,
    damageAvailable: totalDamageAvailable,
    canWinThisTurn: totalDamageAvailable >= damageNeeded && guardians.length === 0,
    blockers: {
      guardians,
      jammers
    },
    readyAttackers: readyDrones,
    outcome: 'WIN_CONDITION'
  };
}

/**
 * Define defensive goals (protect pristine section)
 */
function defineDefensiveGoals(strategicMode, assessment, player2State, player1State, gameDataService) {
  const vulnerability = assessment.yourPristineVulnerabilities[0];
  if (!vulnerability) return null;
  
  const { laneId, sectionName, shields, totalEnemyAttack, enemyThreatsInLane } = vulnerability;
  
  // Identify high-priority threats
  const threats = enemyThreatsInLane
    .filter(d => !d.isExhausted)
    .map(d => {
      const effectiveStats = gameDataService.getEffectiveStats(d, laneId);
      return {
        drone: d,
        attack: effectiveStats.attack,
        priority: effectiveStats.attack >= 3 ? 'HIGH' : 'MEDIUM'
      };
    })
    .sort((a, b) => b.attack - a.attack);
  
  const potentialDamage = Math.max(0, totalEnemyAttack - shields);
  
  return {
    type: 'PREVENT_DAMAGE',
    target: { sectionName, laneId, shields },
    threatsToRemove: threats,
    potentialHullDamage: potentialDamage,
    emergencyLevel: strategicMode.emergencyLevel || 'HIGH',
    outcome: 'SURVIVE_TURN'
  };
}

/**
 * Define race mode goals (fastest path to victory)
 */
function defineRaceGoals(strategicMode, assessment, player2State, player1State, gameDataService) {
  const offensiveGoal = defineAggressiveGoals(strategicMode, assessment, player2State, player1State, gameDataService);
  const defensiveGoal = defineDefensiveGoals(strategicMode, assessment, player2State, player1State, gameDataService);
  
  // Calculate confidence for each approach
  const canWin = offensiveGoal?.canWinThisTurn || false;
  const canLose = defensiveGoal?.potentialHullDamage > 0 || false;
  
  if (canWin && !canLose) {
    return {
      type: 'RACE',
      primaryGoal: offensiveGoal,
      secondaryGoal: null,
      strategy: 'ALL_IN_OFFENSE',
      confidence: 'HIGH'
    };
  }

  if (canLose && !canWin) {
    return {
      type: 'RACE',
      primaryGoal: defensiveGoal,
      secondaryGoal: offensiveGoal,
      strategy: 'SURVIVE_THEN_COUNTER',
      confidence: 'MEDIUM'
    };
  }

  if (canWin && canLose) {
    // Speed race - prioritize offense but don't ignore defense
    return {
      type: 'RACE',
      primaryGoal: offensiveGoal,
      secondaryGoal: defensiveGoal,
      strategy: 'RACE_OFFENSE_BIAS',
      confidence: 'MEDIUM'
    };
  }

  // Neither can close - build toward win
  return {
    type: 'RACE',
    primaryGoal: offensiveGoal,
    secondaryGoal: defensiveGoal,
    strategy: 'BUILD_OFFENSE',
    confidence: 'LOW'
  };
}

/**
 * Define balanced goals (efficient trades)
 */
function defineBalancedGoals(strategicMode, assessment, player2State, player1State, gameDataService) {
  return {
    type: 'BUILD_ADVANTAGE',
    targets: assessment.enemyPristineTargets,
    approach: 'SPREAD_PRESSURE',
    outcome: 'POSITION_FOR_WIN'
  };
}
```

---

## Layer 3: Path Planning

### Purpose
Generate multi-step action sequences to understand strategic value. **Only the first step will be executed.**

### Why Generate Multi-Step Paths?

Multi-step paths serve as **strategic context for scoring first steps**, not as queued execution plans.

```javascript
// Example: Enemy has 1 pristine section (win condition)

// Without multi-step paths (old AI):
// "Attack Guardian" = 50 points (just kills a drone)
// → Might ignore it for other actions

// With multi-step paths (new AI):
// Generates: [Attack Guardian, Attack Section]
// Recognizes: Killing Guardian enables 6 damage next turn (need 4 to win)
// Scores: "Attack Guardian" = 1200 points (ENABLES_WIN_NEXT_TURN)
// → Prioritizes Guardian kill

// Execution:
// Turn 1: Executes "Attack Guardian" only
// Turn 2: Fresh evaluation, "Attack Section" naturally scores highest
```

### Path Types

1. **DIRECT_ATTACK** - Can execute winning attack now
2. **REMOVE_GUARDIAN_THEN_ATTACK** - Kill blocker, then attack section
3. **CARD_REMOVAL_THEN_ATTACK** - Use removal card, then attack section
4. **BUFF_THEN_ATTACK** - Buff attacker, then attack section
5. **READY_THEN_ATTACK** - Ready exhausted drone, then attack (Go Again combo)
6. **MOVE_THEN_ATTACK** - Reposition drone, then attack
7. **DRAW_FOR_ANSWERS** - Draw cards hoping for solutions
8. **ELIMINATE_THREATS** - Kill enemy attackers to defend
9. **DEPLOY_GUARDIAN** - Deploy blocker to protect section

### Implementation

**File**: `src/logic/aiPathPlanner.js`

```javascript
import fullDroneCollection from '../data/droneData.js';

/**
 * Generate all possible paths to achieve the goal
 * Multi-step paths are for CONTEXT/SCORING only
 * Only first step of chosen path will execute
 * @param {Function} getValidTargets - Injected function from caller
 * @param {Function} getLaneOfDrone - Injected function from caller
 */
export function generatePaths(goal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone) {
  const paths = [];
  
  if (!goal) {
    console.warn('⚠️ [PATH PLANNER] No goal provided');
    return paths;
  }
  
  switch (goal.type) {
    case 'RACE':
      // Race mode generates paths for BOTH offensive and defensive goals
      if (goal.primaryGoal) {
        if (goal.primaryGoal.type === 'DAMAGE_SECTION') {
          paths.push(...generateOffensivePaths(goal.primaryGoal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone));
        } else if (goal.primaryGoal.type === 'PREVENT_DAMAGE') {
          paths.push(...generateDefensivePaths(goal.primaryGoal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone));
        }
      }
      if (goal.secondaryGoal) {
        if (goal.secondaryGoal.type === 'DAMAGE_SECTION') {
          paths.push(...generateOffensivePaths(goal.secondaryGoal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone));
        } else if (goal.secondaryGoal.type === 'PREVENT_DAMAGE') {
          paths.push(...generateDefensivePaths(goal.secondaryGoal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone));
        }
      }
      break;

    case 'DAMAGE_SECTION':
      paths.push(...generateOffensivePaths(goal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone));
      break;

    case 'PREVENT_DAMAGE':
      paths.push(...generateDefensivePaths(goal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone));
      break;

    case 'BUILD_ADVANTAGE':
      paths.push(...generateBalancedPaths(goal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone));
      break;
  }
  
  // LOG for testing
  console.log('🛤️ [PATHS GENERATED]', paths.length, 'paths for evaluation');
  
  return paths;
}

/**
 * Generate offensive paths (damage pristine section)
 */
function generateOffensivePaths(goal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone) {
  const paths = [];
  const { target, damageNeeded, damageAvailable, blockers, readyAttackers } = goal;
  const { laneId, sectionName, shields } = target;
  
  // PATH 1: Direct attack (always attack if ready drones available and no blockers)
  if (blockers.guardians.length === 0 && readyAttackers.length > 0) {
    const bestAttacker = findBestShipAttacker(readyAttackers, gameDataService, laneId);
    if (bestAttacker) {
      const willWin = damageAvailable >= damageNeeded;
      const willBreakthrough = damageAvailable >= shields + 1;

      // Determine strategic value based on impact
      let strategicValue;
      let outcome;
      let confidence;
      let description;

      if (willWin) {
        strategicValue = 'IMMEDIATE_WIN';
        outcome = 'WIN';
        confidence = 1.0;
        description = `Attack for ${damageAvailable} damage to WIN!`;
      } else if (willBreakthrough) {
        strategicValue = 'BREAKTHROUGH_PROGRESS';
        outcome = 'PROGRESS';
        confidence = 0.7;
        description = `Attack for ${damageAvailable} damage (breakthrough shields, ${damageNeeded - damageAvailable} more needed for win)`;
      } else {
        strategicValue = 'CHIP_DAMAGE';
        outcome = 'PROGRESS';
        confidence = 0.6;
        description = `Attack for ${damageAvailable} damage (chip shields, ${damageNeeded - damageAvailable} more needed for breakthrough)`;
      }

      paths.push({
        type: willWin ? 'DIRECT_ATTACK' : 'CHIP_ATTACK',
        steps: [{
          action: 'attack',
          attacker: bestAttacker,
          target: { name: sectionName, owner: 'player1' },
          targetType: 'section',
          note: 'EXECUTE THIS STEP'
        }],
        firstStepExecutable: true,
        strategicValue: strategicValue,
        damageDealt: damageAvailable,
        outcome: outcome,
        confidence: confidence,
        description: description
      });
    }
  }
  
  // PATH 2: Remove Guardian → Attack Section
  if (blockers.guardians.length > 0) {
    for (const guardian of blockers.guardians) {
      // Sub-path A: Attack guardian with drones
      const droneKiller = findDroneKillerFor(guardian, readyAttackers, gameDataService, laneId);
      if (droneKiller) {
        const killerAttack = gameDataService.getEffectiveStats(droneKiller, laneId).attack || 0;
        const remainingDamage = damageAvailable - killerAttack;
        
        paths.push({
          type: 'REMOVE_GUARDIAN_THEN_ATTACK',
          steps: [
            {
              action: 'attack',
              attacker: droneKiller,
              target: guardian,
              targetType: 'drone',
              note: 'EXECUTE THIS STEP ONLY'
            },
            {
              action: 'attack',
              attacker: findBestShipAttacker(readyAttackers.filter(d => d.id !== droneKiller.id), gameDataService, laneId),
              target: { name: sectionName, owner: 'player1' },
              targetType: 'section',
              note: 'CONTEXT ONLY - Will score highly next turn after Guardian dies'
            }
          ],
          firstStepExecutable: true,
          strategicValue: remainingDamage >= damageNeeded ? 'ENABLES_WIN_NEXT_TURN' : 'SETUP',
          outcome: remainingDamage >= damageNeeded ? 'WIN_SETUP' : 'PROGRESS',
          confidence: 0.9,
          description: `Kill Guardian this turn, ${remainingDamage} damage available next turn (need ${damageNeeded})`
        });
      }
      
      // Sub-path B: Use removal card on guardian
      const removalCards = findRemovalCardsFor(guardian, player2State.hand, player2State.energy, getValidTargets, player1State, player2State);
      for (const card of removalCards) {
        paths.push({
          type: 'CARD_REMOVAL_THEN_ATTACK',
          steps: [
            {
              action: 'play_card',
              card: card,
              target: guardian,
              note: 'EXECUTE THIS STEP ONLY'
            },
            {
              action: 'attack',
              attacker: findBestShipAttacker(readyAttackers, gameDataService, laneId),
              target: { name: sectionName, owner: 'player1' },
              targetType: 'section',
              note: 'CONTEXT ONLY - Will score highly next evaluation'
            }
          ],
          firstStepExecutable: true,
          strategicValue: 'ENABLES_WIN_NEXT_TURN',
          damageDealt: damageAvailable,
          energyCost: card.cost,
          outcome: 'WIN_SETUP',
          confidence: 1.0,
          description: `${card.name} removes Guardian, ${damageAvailable} damage ready next turn`
        });
      }

      // Sub-path C: Buff drone to one-shot Guardian
      const buffCards = findAttackBuffCards(player2State.hand, player2State.energy);
      for (const card of buffCards) {
        const buffValue = card.effect.mod.value;

        // Find drones that WOULD one-shot Guardian with buff
        for (const attacker of readyAttackers) {
          const attackerStats = gameDataService.getEffectiveStats(attacker, laneId);
          const currentAttack = attackerStats.attack || 0;
          const buffedAttack = currentAttack + buffValue;
          const guardianHP = guardian.hull + (guardian.currentShields || 0);

          // Check if buff enables one-shot kill (but current attack doesn't)
          if (currentAttack < guardianHP && buffedAttack >= guardianHP) {
            const remainingDamage = damageAvailable - currentAttack + buffedAttack;
            const hasGoAgain = card.effect.goAgain;

            paths.push({
              type: 'BUFF_KILL_GUARDIAN_THEN_ATTACK',
              steps: [
                {
                  action: 'play_card',
                  card: card,
                  target: attacker,
                  note: hasGoAgain ? 'EXECUTE (Go Again enables kill same turn)' : 'EXECUTE THIS STEP ONLY'
                },
                {
                  action: 'attack',
                  attacker: attacker,
                  target: guardian,
                  targetType: 'drone',
                  note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
                },
                {
                  action: 'attack',
                  attacker: findBestShipAttacker(readyAttackers.filter(d => d.id !== attacker.id), gameDataService, laneId),
                  target: { name: sectionName, owner: 'player1' },
                  targetType: 'section',
                  note: 'CONTEXT ONLY - Future turn after Guardian dies'
                }
              ],
              firstStepExecutable: true,
              strategicValue: remainingDamage >= damageNeeded ? 'ENABLES_WIN_NEXT_TURN' : 'EFFICIENT_SETUP',
              outcome: remainingDamage >= damageNeeded ? 'WIN_SETUP' : 'PROGRESS',
              energyCost: card.cost,
              confidence: hasGoAgain ? 0.95 : 0.8,
              special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
              description: `${card.name} enables ${attacker.name} one-shot Guardian, ${remainingDamage} damage ready for ship`
            });
          }
        }
      }
    }
  }

  // PATH 2D: Ready exhausted drone → Kill Guardian → Attack Ship
  const readyCards = findReadyCards(player2State.hand, player2State.energy);
  for (const card of readyCards) {
    for (const guardian of blockers.guardians) {
      const exhaustedDrones = (player2State.dronesOnBoard[laneId] || []).filter(d => d.isExhausted);

      for (const drone of exhaustedDrones) {
        const droneStats = gameDataService.getEffectiveStats(drone, laneId);
        const droneAttack = droneStats.attack || 0;
        const guardianHP = guardian.hull + (guardian.currentShields || 0);

        // Check if readied drone can one-shot Guardian
        if (droneAttack >= guardianHP) {
          const remainingDamage = damageAvailable + droneAttack;
          const hasGoAgain = card.effect.goAgain;

          paths.push({
            type: 'READY_KILL_GUARDIAN_THEN_ATTACK',
            steps: [
              {
                action: 'play_card',
                card: card,
                target: drone,
                note: hasGoAgain ? 'EXECUTE (Go Again enables kill same turn)' : 'EXECUTE THIS STEP ONLY'
              },
              {
                action: 'attack',
                attacker: drone,
                target: guardian,
                targetType: 'drone',
                note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
              },
              {
                action: 'attack',
                attacker: findBestShipAttacker(readyAttackers.filter(d => d.id !== drone.id), gameDataService, laneId),
                target: { name: sectionName, owner: 'player1' },
                targetType: 'section',
                note: 'CONTEXT ONLY - Future turn after Guardian dies'
              }
            ],
            firstStepExecutable: true,
            strategicValue: remainingDamage >= damageNeeded ? 'ENABLES_WIN_NEXT_TURN' : 'EFFICIENT_SETUP',
            outcome: remainingDamage >= damageNeeded ? 'WIN_SETUP' : 'PROGRESS',
            energyCost: card.cost,
            confidence: hasGoAgain ? 1.0 : 0.85,
            special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
            description: `${card.name} readies ${drone.name} to one-shot Guardian, ${remainingDamage} damage ready for ship`
          });
        }
      }
    }
  }

  // PATH 3: Buff → Attack (always consider, score based on breakthrough)
  const breakthroughThreshold = shields + 1;
  const buffCards = findAttackBuffCards(player2State.hand, player2State.energy);

  for (const card of buffCards) {
    const buffValue = card.effect.mod.value;
    const buffedDamage = damageAvailable + buffValue;
    const targetDrone = findBestBuffTarget(readyAttackers, laneId, gameDataService);
    const hasGoAgain = card.effect.goAgain;

    // Determine strategic value based on breakthrough
    let strategicValue;
    let outcome;
    let confidence;

    if (buffedDamage >= breakthroughThreshold && blockers.guardians.length === 0) {
      // Buff enables breakthrough!
      strategicValue = hasGoAgain ? 'IMMEDIATE_WIN' : 'ENABLES_WIN_NEXT_TURN';
      outcome = 'WIN';
      confidence = hasGoAgain ? 1.0 : 0.85;
    } else if (buffedDamage >= damageAvailable + shields && hasGoAgain) {
      // Go Again buff that significantly increases damage (even if not breakthrough)
      strategicValue = 'SIGNIFICANT_DAMAGE_BOOST';
      outcome = 'PROGRESS';
      confidence = 0.7;
    } else {
      // Minor buff, low priority
      strategicValue = 'MINOR_BUFF';
      outcome = 'PROGRESS';
      confidence = 0.5;
    }

    paths.push({
      type: 'BUFF_THEN_ATTACK',
      steps: [
        {
          action: 'play_card',
          card: card,
          target: targetDrone,
          note: hasGoAgain ? 'EXECUTE (Go Again triggers immediate re-evaluation)' : 'EXECUTE THIS STEP ONLY'
        },
        {
          action: 'attack',
          attacker: findBestShipAttacker(readyAttackers, gameDataService, laneId),
          target: { name: sectionName, owner: 'player1' },
          targetType: 'section',
          note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn if buff survives'
        }
      ],
      firstStepExecutable: true,
      strategicValue: strategicValue,
      damageDealt: buffedDamage,
      energyCost: card.cost,
      outcome: outcome,
      confidence: confidence,
      special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
      description: `${card.name} buffs for ${buffedDamage} damage ${
        buffedDamage >= breakthroughThreshold ? '(BREAKTHROUGH!)' : ''
      }`
    });
  }
  
  // PATH 4: Ready → Attack Ship (always consider, score based on breakthrough)
  const exhaustedAttackers = (player2State.dronesOnBoard[laneId] || []).filter(d => d.isExhausted);
  const readyCardsForShip = findReadyCards(player2State.hand, player2State.energy);
  const breakthroughThreshold = shields + 1;

  for (const card of readyCardsForShip) {
    for (const exhaustedDrone of exhaustedAttackers) {
      const droneAttack = gameDataService.getEffectiveStats(exhaustedDrone, laneId).attack || 0;
      const newTotalDamage = damageAvailable + droneAttack;
      const hasGoAgain = card.effect.goAgain;

      // Determine strategic value based on breakthrough (no gating)
      let strategicValue;
      let outcome;
      let confidence;

      if (newTotalDamage >= breakthroughThreshold && blockers.guardians.length === 0) {
        // Ready enables breakthrough!
        strategicValue = hasGoAgain ? 'IMMEDIATE_WIN' : 'ENABLES_WIN_NEXT_TURN';
        outcome = 'WIN';
        confidence = hasGoAgain ? 1.0 : 0.85;
      } else if (newTotalDamage >= shields && hasGoAgain) {
        // Go Again Ready with significant damage
        strategicValue = 'SIGNIFICANT_DAMAGE_BOOST';
        outcome = 'PROGRESS';
        confidence = 0.7;
      } else {
        // Minor Ready, low priority
        strategicValue = 'MINOR_READY';
        outcome = 'PROGRESS';
        confidence = 0.5;
      }

      paths.push({
        type: 'READY_THEN_ATTACK',
        steps: [
          {
            action: 'play_card',
            card: card,
            target: exhaustedDrone,
            note: hasGoAgain ? 'EXECUTE (Go Again triggers immediate re-evaluation)' : 'EXECUTE THIS STEP ONLY'
          },
          {
            action: 'attack',
            attacker: exhaustedDrone,
            target: { name: sectionName, owner: 'player1' },
            targetType: 'section',
            note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
          }
        ],
        firstStepExecutable: true,
        strategicValue: strategicValue,
        damageDealt: newTotalDamage,
        energyCost: card.cost,
        outcome: outcome,
        confidence: confidence,
        special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
        description: `${card.name} readies ${exhaustedDrone.name} for ${newTotalDamage} damage ${
          newTotalDamage >= breakthroughThreshold ? '(BREAKTHROUGH!)' : ''
        }`
      });
    }
  }
  
  // PATH 5: Move drone to lane → Attack (ONLY if movement doesn't exhaust)
  const movementCards = findMovementCards(player2State.hand, player2State.energy);
  for (const card of movementCards) {
    // Check if card has DO_NOT_EXHAUST property
    const doesNotExhaust = card.properties && card.properties.includes('DO_NOT_EXHAUST');

    if (doesNotExhaust) {
      const adjacentLanes = getAdjacentLanes(laneId);
      for (const adjacentLane of adjacentLanes) {
        const potentialMovers = (player2State.dronesOnBoard[adjacentLane] || []).filter(d => !d.isExhausted);

        for (const mover of potentialMovers) {
          const moverStats = gameDataService.getEffectiveStats(mover, adjacentLane);
          const moverAttack = moverStats.attack || 0;
          const hasGoAgain = card.effect.goAgain;

          // PATH 5A: Move → Kill Guardian → Attack Ship
          if (blockers.guardians.length > 0) {
            for (const guardian of blockers.guardians) {
              const guardianHP = guardian.hull + (guardian.currentShields || 0);

              if (moverAttack >= guardianHP) {
                const remainingDamage = damageAvailable + moverAttack;

                paths.push({
                  type: 'MOVE_KILL_GUARDIAN_THEN_ATTACK',
                  steps: [
                    {
                      action: 'play_card',
                      card: card,
                      droneToMove: mover,
                      fromLane: adjacentLane,
                      toLane: laneId,
                      note: hasGoAgain ? 'EXECUTE (Go Again enables attack)' : 'EXECUTE THIS STEP ONLY'
                    },
                    {
                      action: 'attack',
                      attacker: mover,
                      target: guardian,
                      targetType: 'drone',
                      note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
                    },
                    {
                      action: 'attack',
                      attacker: findBestShipAttacker(readyAttackers, gameDataService, laneId),
                      target: { name: sectionName, owner: 'player1' },
                      targetType: 'section',
                      note: 'CONTEXT ONLY - Future turn after Guardian dies'
                    }
                  ],
                  firstStepExecutable: true,
                  strategicValue: remainingDamage >= damageNeeded ? 'ENABLES_WIN_NEXT_TURN' : 'EFFICIENT_SETUP',
                  outcome: remainingDamage >= damageNeeded ? 'WIN_SETUP' : 'PROGRESS',
                  energyCost: card.cost,
                  confidence: hasGoAgain ? 0.95 : 0.8,
                  special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
                  description: `Move ${mover.name} to ${laneId} to one-shot Guardian, ${remainingDamage} damage ready for ship`
                });
              }
            }
          }

          // PATH 5B: Move → Attack Ship (if no Guardian blocking)
          if (blockers.guardians.length === 0) {
            const newTotalDamage = damageAvailable + moverAttack;
            const breakthroughThreshold = shields + 1;

            // Determine strategic value
            let strategicValue;
            let outcome;
            let confidence;

            if (newTotalDamage >= breakthroughThreshold) {
              strategicValue = hasGoAgain ? 'IMMEDIATE_WIN' : 'ENABLES_WIN_NEXT_TURN';
              outcome = 'WIN';
              confidence = hasGoAgain ? 0.95 : 0.85;
            } else if (hasGoAgain && moverAttack >= shields) {
              strategicValue = 'SIGNIFICANT_DAMAGE_BOOST';
              outcome = 'PROGRESS';
              confidence = 0.7;
            } else {
              strategicValue = 'MINOR_POSITIONING';
              outcome = 'PROGRESS';
              confidence = 0.5;
            }

            paths.push({
              type: 'MOVE_THEN_ATTACK',
              steps: [
                {
                  action: 'play_card',
                  card: card,
                  droneToMove: mover,
                  fromLane: adjacentLane,
                  toLane: laneId,
                  note: hasGoAgain ? 'EXECUTE (Go Again enables attack)' : 'EXECUTE THIS STEP ONLY'
                },
                {
                  action: 'attack',
                  attacker: mover,
                  target: { name: sectionName, owner: 'player1' },
                  targetType: 'section',
                  note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
                }
              ],
              firstStepExecutable: true,
              strategicValue: strategicValue,
              damageDealt: newTotalDamage,
              energyCost: card.cost,
              outcome: outcome,
              confidence: confidence,
              special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
              description: `Move ${mover.name} to ${laneId} for ${newTotalDamage} damage ${
                newTotalDamage >= breakthroughThreshold ? '(BREAKTHROUGH!)' : ''
              }`
            });
          }
        }
      }
    }
    // If card exhausts drone (no DO_NOT_EXHAUST), don't generate attack paths
  }
  
  // PATH 6: Draw cards (probabilistic - might draw solutions)
  const drawCards = player2State.hand.filter(c => 
    c.effect.type === 'DRAW' && 
    c.effect.goAgain &&
    player2State.energy >= c.cost
  );
  
  if ((blockers.guardians.length > 0 || damageAvailable < damageNeeded) && drawCards.length > 0) {
    for (const drawCard of drawCards) {
      const deckSize = player2State.deck.length;
      const usefulCards = countUsefulCardsInDeck(player2State.deck, blockers, damageNeeded - damageAvailable);
      const drawCount = drawCard.effect.value;
      
      const probability = calculateDrawProbability(usefulCards, deckSize, drawCount);
      
      if (probability > 0.15) { // >15% chance
        paths.push({
          type: 'DRAW_FOR_ANSWERS',
          steps: [
            {
              action: 'play_card',
              card: drawCard,
              target: null,
              note: 'EXECUTE (Go Again triggers immediate re-evaluation with new cards)'
            }
          ],
          firstStepExecutable: true,
          strategicValue: 'FIND_SOLUTION',
          probability: probability,
          outcome: 'PROBABILISTIC_PROGRESS',
          confidence: probability,
          special: 'GO_AGAIN_DRAW',
          energyCost: drawCard.cost,
          description: `${(probability * 100).toFixed(0)}% chance to draw removal/buff (${usefulCards}/${deckSize} cards)`
        });
      }
    }
  }
  
  // PATH 7: Fallback setup path
  if (paths.length === 0) {
    paths.push({
      type: 'NO_WIN_PATH',
      steps: [],
      firstStepExecutable: false,
      strategicValue: 'NONE',
      outcome: 'FALLBACK',
      confidence: 0,
      description: 'No clear path to win - fall back to tactical AI'
    });
  }
  
  return paths;
}

/**
 * Generate defensive paths
 */
function generateDefensivePaths(goal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone) {
  const paths = [];
  const { target, threatsToRemove } = goal;
  const { laneId } = target;
  
  if (!threatsToRemove || threatsToRemove.length === 0) {
    return paths;
  }
  
  // PATH 1: Kill threats with drones
  const highPriorityThreats = threatsToRemove.filter(t => t.priority === 'HIGH');
  const allThreats = threatsToRemove;
  
  // Try to kill all high-priority threats
  const killSequence = [];
  const usedKillers = new Set();
  
  for (const threat of highPriorityThreats) {
    const availableKillers = (player2State.dronesOnBoard[laneId] || [])
      .filter(d => !d.isExhausted && !usedKillers.has(d.id));
    
    const killer = findDroneKillerFor(threat.drone, availableKillers, gameDataService, laneId);
    if (killer) {
      killSequence.push({
        action: 'attack',
        attacker: killer,
        target: threat.drone,
        targetType: 'drone',
        note: killSequence.length === 0 ? 'EXECUTE FIRST' : 'CONTEXT - Future turns if first kills succeed'
      });
      usedKillers.add(killer.id);
    }
  }
  
  if (killSequence.length > 0) {
    const threatsNeutralized = killSequence.length;
    const totalThreats = highPriorityThreats.length;

    paths.push({
      type: 'ELIMINATE_THREATS',
      steps: killSequence,
      firstStepExecutable: true,
      strategicValue: threatsNeutralized === totalThreats ? 'FULL_DEFENSE' : 'PARTIAL_DEFENSE',
      outcome: 'SURVIVE',
      confidence: 0.85,
      description: `Kill ${threatsNeutralized}/${totalThreats} high-priority threats (first executes, rest are context)`
    });
  }

  // PATH 1B: Buff drone to one-shot threat
  const buffCards = findAttackBuffCards(player2State.hand, player2State.energy);
  for (const card of buffCards) {
    const buffValue = card.effect.mod.value;

    for (const threat of highPriorityThreats) {
      const threatHP = threat.drone.hull + (threat.drone.currentShields || 0);
      const availableKillers = (player2State.dronesOnBoard[laneId] || [])
        .filter(d => !d.isExhausted);

      for (const killer of availableKillers) {
        const killerStats = gameDataService.getEffectiveStats(killer, laneId);
        const currentAttack = killerStats.attack || 0;
        const buffedAttack = currentAttack + buffValue;

        // Check if buff enables one-shot kill
        if (currentAttack < threatHP && buffedAttack >= threatHP) {
          const hasGoAgain = card.effect.goAgain;

          paths.push({
            type: 'BUFF_ELIMINATE_THREAT',
            steps: [
              {
                action: 'play_card',
                card: card,
                target: killer,
                note: hasGoAgain ? 'EXECUTE (Go Again enables kill same turn)' : 'EXECUTE THIS STEP ONLY'
              },
              {
                action: 'attack',
                attacker: killer,
                target: threat.drone,
                targetType: 'drone',
                note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
              }
            ],
            firstStepExecutable: true,
            strategicValue: 'EFFICIENT_DEFENSE',
            outcome: 'SURVIVE',
            energyCost: card.cost,
            confidence: hasGoAgain ? 1.0 : 0.85,
            special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
            description: `${card.name} enables ${killer.name} one-shot ${threat.drone.name} (${threat.attack} attack threat)`
          });
        }
      }
    }
  }

  // PATH 1C: Ready exhausted drone → Kill threat
  const readyCards = findReadyCards(player2State.hand, player2State.energy);
  for (const card of readyCards) {
    for (const threat of highPriorityThreats) {
      const threatHP = threat.drone.hull + (threat.drone.currentShields || 0);
      const exhaustedDrones = (player2State.dronesOnBoard[laneId] || []).filter(d => d.isExhausted);

      for (const drone of exhaustedDrones) {
        const droneStats = gameDataService.getEffectiveStats(drone, laneId);
        const droneAttack = droneStats.attack || 0;

        // Check if readied drone can one-shot threat
        if (droneAttack >= threatHP) {
          const hasGoAgain = card.effect.goAgain;

          paths.push({
            type: 'READY_ELIMINATE_THREAT',
            steps: [
              {
                action: 'play_card',
                card: card,
                target: drone,
                note: hasGoAgain ? 'EXECUTE (Go Again enables kill same turn)' : 'EXECUTE THIS STEP ONLY'
              },
              {
                action: 'attack',
                attacker: drone,
                target: threat.drone,
                targetType: 'drone',
                note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
              }
            ],
            firstStepExecutable: true,
            strategicValue: 'EFFICIENT_DEFENSE',
            outcome: 'SURVIVE',
            energyCost: card.cost,
            confidence: hasGoAgain ? 1.0 : 0.85,
            special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
            description: `${card.name} readies ${drone.name} to one-shot ${threat.drone.name} (${threat.attack} attack threat)`
          });
        }
      }
    }
  }

  // PATH 2: Use removal card on biggest threat
  const biggestThreat = threatsToRemove.sort((a, b) => b.attack - a.attack)[0];
  if (biggestThreat) {
    const removalCards = findRemovalCardsFor(biggestThreat.drone, player2State.hand, player2State.energy, getValidTargets, player1State, player2State);
    for (const card of removalCards) {
      paths.push({
        type: 'CARD_REMOVAL_THREAT',
        steps: [{
          action: 'play_card',
          card: card,
          target: biggestThreat.drone,
          note: 'EXECUTE THIS STEP'
        }],
        firstStepExecutable: true,
        strategicValue: 'EFFICIENT_DEFENSE',
        energyCost: card.cost,
        outcome: 'SURVIVE',
        confidence: 1.0,
        description: `${card.name} removes ${biggestThreat.attack}-attack threat efficiently`
      });
    }
  }

  // PATH 3: Draw cards hoping for defensive solutions
  const drawCards = player2State.hand.filter(c =>
    c.effect.type === 'DRAW' &&
    c.effect.goAgain &&
    player2State.energy >= c.cost
  );

  if (threatsToRemove.length > 0 && drawCards.length > 0) {
    // Check if we have paths to eliminate all threats
    const hasDirectSolutions = paths.some(p =>
      p.strategicValue === 'FULL_DEFENSE' ||
      p.strategicValue === 'EFFICIENT_DEFENSE'
    );

    if (!hasDirectSolutions) {
      for (const drawCard of drawCards) {
        const deckSize = player2State.deck.length;
        const usefulCards = countDefensiveCardsInDeck(player2State.deck, threatsToRemove);
        const drawCount = drawCard.effect.value;

        const probability = calculateDrawProbability(usefulCards, deckSize, drawCount);

        if (probability > 0.15) { // >15% chance
          paths.push({
            type: 'DRAW_FOR_DEFENSIVE_ANSWERS',
            steps: [
              {
                action: 'play_card',
                card: drawCard,
                target: null,
                note: 'EXECUTE (Go Again triggers immediate re-evaluation with new cards)'
              }
            ],
            firstStepExecutable: true,
            strategicValue: 'FIND_DEFENSIVE_SOLUTION',
            probability: probability,
            outcome: 'PROBABILISTIC_DEFENSE',
            confidence: probability,
            special: 'GO_AGAIN_DRAW',
            energyCost: drawCard.cost,
            description: `${(probability * 100).toFixed(0)}% chance to draw defensive solution (${usefulCards}/${deckSize} cards)`
          });
        }
      }
    }
  }

  return paths;
}

/**
 * Generate balanced paths (efficient trades - offense AND defense)
 */
function generateBalancedPaths(goal, player2State, player1State, gameDataService, placedSections, getValidTargets, getLaneOfDrone) {
  const paths = [];

  if (!goal.targets || goal.targets.length === 0) {
    return paths;
  }

  // For each pristine target, generate efficient attack paths
  for (const target of goal.targets) {
    const { laneId, sectionName, shields } = target;
    const breakthroughThreshold = shields + 1;
    const readyDrones = (player2State.dronesOnBoard[laneId] || []).filter(d => !d.isExhausted);
    const damageAvailable = readyDrones.reduce((sum, d) =>
      sum + (gameDataService.getEffectiveStats(d, laneId).attack || 0), 0
    );

    // PATH 1: Direct attacks (basic pressure)
    for (const drone of readyDrones) {
      paths.push({
        type: 'ATTACK_PRISTINE',
        steps: [{
          action: 'attack',
          attacker: drone,
          target: { name: sectionName, owner: 'player1' },
          targetType: 'section',
          note: 'EXECUTE THIS STEP'
        }],
        firstStepExecutable: true,
        strategicValue: 'APPLY_PRESSURE',
        outcome: 'PROGRESS',
        confidence: 0.8,
        description: `Attack pristine ${sectionName} for pressure`
      });
    }

    // PATH 2: Buff for breakthrough (resource efficiency)
    if (damageAvailable > 0 && damageAvailable < breakthroughThreshold) {
      const buffCards = findAttackBuffCards(player2State.hand, player2State.energy);
      for (const card of buffCards) {
        const buffValue = card.effect.mod.value;
        const buffedDamage = damageAvailable + buffValue;

        if (buffedDamage >= breakthroughThreshold) {
          const targetDrone = findBestBuffTarget(readyDrones, laneId, gameDataService);
          const hasGoAgain = card.effect.goAgain;

          paths.push({
            type: 'BUFF_FOR_EFFICIENCY',
            steps: [
              {
                action: 'play_card',
                card: card,
                target: targetDrone,
                note: hasGoAgain ? 'EXECUTE (Go Again enables attack same turn)' : 'EXECUTE THIS STEP ONLY'
              },
              {
                action: 'attack',
                attacker: findBestShipAttacker(readyDrones, gameDataService, laneId),
                target: { name: sectionName, owner: 'player1' },
                targetType: 'section',
                note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
              }
            ],
            firstStepExecutable: true,
            strategicValue: 'EFFICIENT_TRADE',
            damageDealt: buffedDamage,
            energyCost: card.cost,
            outcome: 'PROGRESS',
            confidence: hasGoAgain ? 0.9 : 0.75,
            special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
            description: `${card.name} enables breakthrough for ${buffedDamage} damage (efficient energy use)`
          });
        }
      }
    }

    // PATH 3: Defensive efficiency (eliminate high-priority threats)
    const enemyDrones = player1State.dronesOnBoard[laneId] || [];
    const highPriorityThreats = enemyDrones
      .map(drone => {
        const stats = gameDataService.getEffectiveStats(drone, laneId);
        return { drone, attack: stats.attack || 0 };
      })
      .filter(t => t.attack >= 4)  // High attack drones are threats
      .sort((a, b) => b.attack - a.attack);

    if (highPriorityThreats.length > 0) {
      const biggestThreat = highPriorityThreats[0];
      const removalCards = findRemovalCardsFor(biggestThreat.drone, player2State.hand, player2State.energy, getValidTargets, player1State, player2State);

      for (const card of removalCards) {
        paths.push({
          type: 'BALANCED_THREAT_REMOVAL',
          steps: [{
            action: 'play_card',
            card: card,
            target: biggestThreat.drone,
            note: 'EXECUTE THIS STEP'
          }],
          firstStepExecutable: true,
          strategicValue: 'EFFICIENT_TRADE',
          energyCost: card.cost,
          outcome: 'PROGRESS',
          confidence: 1.0,
          description: `${card.name} removes ${biggestThreat.attack}-attack threat (efficient defense)`
        });
      }
    }

    // PATH 4: Ready for additional attacks (action efficiency)
    const exhaustedAttackers = (player2State.dronesOnBoard[laneId] || []).filter(d => d.isExhausted);
    const readyCards = findReadyCards(player2State.hand, player2State.energy);

    for (const card of readyCards) {
      for (const exhaustedDrone of exhaustedAttackers) {
        const droneAttack = gameDataService.getEffectiveStats(exhaustedDrone, laneId).attack || 0;
        const newTotalDamage = damageAvailable + droneAttack;
        const hasGoAgain = card.effect.goAgain;

        if (newTotalDamage >= breakthroughThreshold || droneAttack >= 3) {
          paths.push({
            type: 'READY_FOR_EFFICIENCY',
            steps: [
              {
                action: 'play_card',
                card: card,
                target: exhaustedDrone,
                note: hasGoAgain ? 'EXECUTE (Go Again enables attack same turn)' : 'EXECUTE THIS STEP ONLY'
              },
              {
                action: 'attack',
                attacker: exhaustedDrone,
                target: { name: sectionName, owner: 'player1' },
                targetType: 'section',
                note: hasGoAgain ? 'Executes same turn via Go Again' : 'CONTEXT - Next turn'
              }
            ],
            firstStepExecutable: true,
            strategicValue: 'EFFICIENT_TRADE',
            damageDealt: newTotalDamage,
            energyCost: card.cost,
            outcome: 'PROGRESS',
            confidence: hasGoAgain ? 0.85 : 0.7,
            special: hasGoAgain ? 'GO_AGAIN_COMBO' : null,
            description: `${card.name} readies ${exhaustedDrone.name} for ${newTotalDamage} total damage (action efficiency)`
          });
        }
      }
    }

    // PATH 5: Draw for efficient answers
    const drawCards = player2State.hand.filter(c =>
      c.effect.type === 'DRAW' &&
      c.effect.goAgain &&
      player2State.energy >= c.cost
    );

    if (drawCards.length > 0 && damageAvailable < breakthroughThreshold) {
      for (const drawCard of drawCards) {
        const deckSize = player2State.deck.length;
        const usefulCards = countUsefulCardsInDeck(
          player2State.deck,
          null,  // No Guardian blockers in balanced
          breakthroughThreshold - damageAvailable  // Damage gap
        );
        const drawCount = drawCard.effect.value;
        const probability = calculateDrawProbability(usefulCards, deckSize, drawCount);

        if (probability > 0.15) {
          paths.push({
            type: 'DRAW_FOR_EFFICIENCY',
            steps: [{
              action: 'play_card',
              card: drawCard,
              target: null,
              note: 'EXECUTE (Go Again triggers immediate re-evaluation)'
            }],
            firstStepExecutable: true,
            strategicValue: 'FIND_EFFICIENT_ANSWER',
            probability: probability,
            outcome: 'SETUP',
            confidence: probability,
            special: 'GO_AGAIN_DRAW',
            energyCost: drawCard.cost,
            description: `${(probability * 100).toFixed(0)}% chance to draw efficient solution (${usefulCards}/${deckSize} cards)`
          });
        }
      }
    }
  }

  return paths;
}

/**
 * Generate deployment defensive paths (FOR DEPLOYMENT PHASE - not action phase)
 * This logic will be used when strategic AI is extended to deployment phase
 * NOTE: Do NOT call this from action phase strategic AI - deployment only happens in deployment phase
 */
function generateDefensiveDeploymentPaths(goal, player2State, player1State, gameDataService, placedSections) {
  const paths = [];
  const { target, threatsToRemove } = goal;
  const { laneId } = target;

  // PATH: Deploy Guardian to block
  const guardianDrones = player2State.activeDronePool.filter(d => {
    const baseDrone = fullDroneCollection.find(bd => bd.name === d.name);
    return baseDrone?.abilities?.some(a =>
      a.effect?.type === 'GRANT_KEYWORD' &&
      a.effect?.keyword === 'GUARDIAN'
    );
  });

  for (const guardian of guardianDrones) {
    if (canAffordDeploy(player2State, guardian)) {
      paths.push({
        type: 'DEPLOY_GUARDIAN',
        steps: [{
          action: 'deploy',
          drone: guardian,
          lane: laneId,
          note: 'EXECUTE THIS STEP'
        }],
        firstStepExecutable: true,
        strategicValue: 'DEPLOY_BLOCKER',
        outcome: 'SURVIVE',
        confidence: 0.9,
        description: `Deploy ${guardian.name} Guardian to block attacks`
      });
    }
  }

  return paths;
}

// NOTE: generateDefensiveDeploymentPaths is NOT called in current action phase strategic AI
// It will be integrated when strategic AI is extended to deployment phase

// === HELPER FUNCTIONS ===

function findBestShipAttacker(drones, gameDataService, laneId) {
  if (!drones || drones.length === 0) return null;
  
  return drones
    .map(d => ({
      drone: d,
      attack: gameDataService.getEffectiveStats(d, laneId).attack || 0
    }))
    .sort((a, b) => b.attack - a.attack)[0]?.drone || null;
}

function findDroneKillerFor(target, availableDrones, gameDataService, laneId) {
  const targetHull = target.hull + (target.currentShields || 0);
  
  for (const drone of availableDrones) {
    const stats = gameDataService.getEffectiveStats(drone, laneId);
    if (stats.attack >= targetHull) {
      return drone;
    }
  }
  return null;
}

function findRemovalCardsFor(target, hand, energy, getValidTargets, player1State, player2State) {
  return hand.filter(card => {
    if (energy < card.cost) return false;

    // Use getValidTargets to validate card can target this specific drone
    const validTargets = getValidTargets('player2', null, card, player1State, player2State);
    if (!validTargets.some(t => t.id === target.id)) return false;

    // Check if card can remove the target
    if (card.effect.type === 'DESTROY' && card.effect.scope === 'SINGLE') {
      return true;
    }

    // Sufficient damage
    if (card.effect.type === 'DAMAGE') {
      const targetHP = target.hull + (target.currentShields || 0);
      return card.effect.value >= targetHP;
    }

    return false;
  });
}

function findAttackBuffCards(hand, energy) {
  return hand.filter(card => 
    card.effect.type === 'MODIFY_STAT' &&
    card.effect.mod?.stat === 'attack' &&
    card.effect.mod?.value > 0 &&
    energy >= card.cost
  );
}

function findReadyCards(hand, energy) {
  return hand.filter(card =>
    card.effect.type === 'READY_DRONE' &&
    energy >= card.cost
  );
  // Note: Finds ALL Ready cards. Go Again ones are prioritized higher in scoring.
}

function findMovementCards(hand, energy) {
  return hand.filter(card =>
    (card.effect.type === 'SINGLE_MOVE' || card.effect.type === 'MULTI_MOVE') &&
    energy >= card.cost
  );
}

function findBestBuffTarget(drones, laneId, gameDataService) {
  if (!drones || drones.length === 0) return null;
  return drones
    .map(d => ({
      drone: d,
      attack: gameDataService.getEffectiveStats(d, laneId).attack || 0
    }))
    .sort((a, b) => b.attack - a.attack)[0]?.drone || null;
}

function getAdjacentLanes(laneId) {
  const laneNum = parseInt(laneId.replace('lane', ''));
  const adjacent = [];
  
  if (laneNum > 1) adjacent.push(`lane${laneNum - 1}`);
  if (laneNum < 3) adjacent.push(`lane${laneNum + 1}`);
  
  return adjacent;
}

function canAffordDeploy(playerState, drone) {
  const cost = drone.class || 0;
  const availableResources = (playerState.deploymentBudget || 0) + (playerState.energy || 0);
  return availableResources >= cost;
}

function calculateDrawProbability(successCards, deckSize, drawCount) {
  if (deckSize === 0 || successCards === 0) return 0;
  
  // Probability of NOT drawing any success cards
  let pFailure = 1;
  for (let i = 0; i < drawCount && i < deckSize; i++) {
    const remainingCards = deckSize - i;
    const remainingFailures = Math.max(0, deckSize - successCards - i);
    pFailure *= remainingFailures / remainingCards;
  }
  
  return 1 - pFailure;
}

function countUsefulCardsInDeck(deck, blockers, damageGap) {
  let count = 0;

  for (const card of deck) {
    // Removal cards (for Guardians)
    if (blockers?.guardians?.length > 0) {
      if (card.effect.type === 'DESTROY' ||
          (card.effect.type === 'DAMAGE' && card.effect.value >= 3)) {
        count++;
        continue;
      }
    }

    // Buff cards (to close damage gap)
    if (damageGap > 0 && damageGap <= 3) {
      if (card.effect.type === 'MODIFY_STAT' &&
          card.effect.mod?.stat === 'attack' &&
          card.effect.mod?.value >= damageGap) {
        count++;
      }
    }
  }

  return count;
}

function countDefensiveCardsInDeck(deck, threats) {
  let count = 0;

  for (const card of deck) {
    // Removal cards (destroy or high damage)
    if (card.effect.type === 'DESTROY' && card.effect.scope === 'SINGLE') {
      count++;
      continue;
    }

    // Damage cards that can kill threats
    if (card.effect.type === 'DAMAGE') {
      // Count if card can kill any threat
      const canKillAnyThreat = threats.some(threat => {
        const threatHP = threat.drone.hull + (threat.drone.currentShields || 0);
        return card.effect.value >= threatHP;
      });
      if (canKillAnyThreat) {
        count++;
        continue;
      }
    }

    // Buff cards that enable one-shot kills
    if (card.effect.type === 'MODIFY_STAT' && card.effect.mod?.stat === 'attack') {
      count++;
      continue;
    }

    // Ready cards (enable exhausted drones to defend)
    if (card.effect.type === 'READY_DRONE') {
      count++;
      continue;
    }
  }

  return count;
}
```

---

## Layer 4: Path Evaluation

### Purpose
Score paths based on strategic value of their FIRST step (which is all that executes).

**File**: `src/logic/aiPathEvaluator.js`

```javascript
import fullDroneCollection from '../data/droneData.js';

/**
 * Evaluate and score all paths
 * Focus on strategic value of FIRST step since that's all that executes
 * @param {Array} paths - Generated paths to evaluate
 * @param {string} strategicMode - Current strategic mode (AGGRESSIVE, DEFENSIVE, etc.)
 * @param {Object} goal - The goal object (may contain Race mode strategy)
 */
export function evaluatePaths(paths, strategicMode, goal) {
  if (!paths || paths.length === 0) {
    return [];
  }

  return paths.map(path => {
    let score = 0;
    
    // Strategic value of first step (what it enables/accomplishes)
    switch (path.strategicValue) {
      case 'IMMEDIATE_WIN':
        score += 1500; // Completes win this turn
        break;
      case 'ENABLES_WIN_NEXT_TURN':
        score += 1200; // Sets up guaranteed win
        break;
      case 'FULL_DEFENSE':
        score += 1000; // Completely neutralizes threats
        break;
      case 'EFFICIENT_DEFENSE':
        score += 900; // Removes key threat efficiently
        break;
      case 'DEPLOY_BLOCKER':
        score += 850; // Deploys Guardian/blocker
        break;
      case 'EFFICIENT_SETUP':
        score += 700; // Buff-enabled Guardian removal that sets up win
        break;
      case 'PARTIAL_DEFENSE':
        score += 600; // Removes some threats
        break;
      case 'SIGNIFICANT_DAMAGE_BOOST':
        score += 500; // Go Again buff with major damage increase
        break;
      case 'FIND_SOLUTION':
        score += 400; // Probabilistic (draw cards for offense)
        break;
      case 'FIND_DEFENSIVE_SOLUTION':
        score += 400; // Probabilistic (draw cards for defense)
        break;
      case 'EFFICIENT_TRADE':
        score += 350; // Balanced mode efficient resource use
        break;
      case 'APPLY_PRESSURE':
        score += 300; // Balanced mode pressure
        break;
      case 'FIND_EFFICIENT_ANSWER':
        score += 300; // Balanced mode draw for efficiency
        break;
      case 'MINOR_BUFF':
        score += 250; // Low-priority buff
        break;
      case 'BREAKTHROUGH_PROGRESS':
        score += 250; // Broke through shields, good progress
        break;
      case 'MINOR_READY':
        score += 240; // Ready card that doesn't enable breakthrough
        break;
      case 'CHIP_DAMAGE':
        score += 150; // Small progress, better than passing
        break;
      case 'MINOR_POSITIONING':
        score += 200; // Movement that doesn't enable breakthrough
        break;
      case 'SETUP':
        score += 200; // Generic setup
        break;
      case 'PROGRESS':
        score += 100; // Generic progress
        break;
      default:
        score += 50; // Unknown/fallback
    }
    
    // Efficiency: prefer simpler first steps
    if (path.steps.length > 0) {
      const firstStepComplexity = getActionComplexity(path.steps[0]);
      score -= firstStepComplexity * 10;
    }
    
    // Energy efficiency (small penalty for expensive cards)
    if (path.energyCost) {
      score -= path.energyCost * 5;
    }
    
    // Success probability/confidence
    const confidence = path.confidence || 1.0;
    score *= confidence;
    
    // Special bonuses
    if (path.special === 'GO_AGAIN_COMBO') {
      score += 200; // Go Again completes action this turn
    }
    if (path.special === 'EFFICIENT') {
      score += 75;
    }
    
    // Mode-specific adjustments (ONLY if not using Race goal-based strategies)
    if (!goal || goal.type !== 'RACE') {
      if (strategicMode.mode === 'AGGRESSIVE') {
        if (path.strategicValue === 'IMMEDIATE_WIN') score += 500;
        if (path.strategicValue === 'ENABLES_WIN_NEXT_TURN') score += 300;
      }

      if (strategicMode.mode === 'DEFENSIVE') {
        if (path.strategicValue === 'FULL_DEFENSE') score += 400;
        if (path.strategicValue === 'EFFICIENT_DEFENSE') score += 300;
        if (path.strategicValue === 'DEPLOY_BLOCKER') score += 350;
      }

      if (strategicMode.mode === 'RACE') {
        if (path.strategicValue === 'IMMEDIATE_WIN') score += 600;
        if (path.strategicValue === 'FULL_DEFENSE') score += 300;
        if (path.strategicValue === 'ENABLES_WIN_NEXT_TURN') score += 400;
      }
    }

    // Apply Race mode strategy adjustments (goal-based bonuses replace mode bonuses)
    if (goal?.type === 'RACE' && goal.strategy) {
      switch (goal.strategy) {
        case 'RACE_OFFENSE_BIAS':
          // Boost offensive paths (prioritize winning over defending)
          if (path.outcome === 'WIN' || path.outcome === 'WIN_SETUP' || path.strategicValue === 'IMMEDIATE_WIN') {
            score += 300;  // Offensive bonus
          }
          break;

        case 'SURVIVE_THEN_COUNTER':
          // Boost defensive paths (survive first, then attack)
          if (path.outcome === 'SURVIVE' || path.strategicValue === 'EFFICIENT_DEFENSE' || path.strategicValue === 'FULL_DEFENSE') {
            score += 300;  // Defensive bonus
          }
          break;

        case 'ALL_IN_OFFENSE':
          // Massively boost offensive, penalize defensive
          if (path.outcome === 'WIN' || path.outcome === 'WIN_SETUP' || path.strategicValue === 'IMMEDIATE_WIN') {
            score += 500;  // Strong offensive bonus
          } else if (path.outcome === 'SURVIVE' || path.strategicValue === 'EFFICIENT_DEFENSE') {
            score -= 200;  // Penalize defensive plays (don't waste time)
          }
          break;

        case 'BUILD_OFFENSE':
          // Slight offensive preference (building toward win)
          if (path.outcome === 'WIN' || path.outcome === 'WIN_SETUP' || path.outcome === 'PROGRESS') {
            score += 100;  // Small offensive bonus
          }
          break;
      }
    }

    // Damage value bonus (for offensive paths)
    if (path.damageDealt) {
      score += path.damageDealt * 25;
    }
    
    // Small bonus for good planning (multi-step paths show strategic thinking)
    // Even though only first step executes
    if (path.steps.length > 1) {
      score += Math.min(path.steps.length - 1, 3) * 25;
    }
    
    return {
      ...path,
      score,
      finalDescription: `[Score: ${score.toFixed(0)}] ${path.description || 'No description'}`
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Select best executable path
 */
export function selectBestPath(evaluatedPaths, player2State) {
  if (!evaluatedPaths || evaluatedPaths.length === 0) {
    return { type: 'PASS', steps: [] };
  }
  
  // Find first executable path
  for (const path of evaluatedPaths) {
    if (path.firstStepExecutable && canExecuteFirstStep(path, player2State)) {
      return path;
    }
  }
  
  // No executable paths
  return { type: 'PASS', steps: [] };
}

/**
 * Validate first step is executable
 */
function canExecuteFirstStep(path, playerState) {
  if (!path.steps || path.steps.length === 0) return false;
  
  const step = path.steps[0];
  
  switch (step.action) {
    case 'play_card':
      // Check energy
      if (playerState.energy < step.card.cost) return false;
      
      // Check card is in hand
      if (!playerState.hand.some(c => c.id === step.card.id)) return false;
      
      // Check maxPerLane for token-creating cards
      if (step.card.effect.type === 'CREATE_TOKENS') {
        const tokenName = step.card.effect.tokenName;
        const baseDrone = fullDroneCollection.find(d => d.name === tokenName);
        
        if (baseDrone && baseDrone.maxPerLane) {
          for (const laneId of step.card.effect.locations || []) {
            const currentCount = countDroneTypeInLane(playerState, tokenName, laneId);
            if (currentCount >= baseDrone.maxPerLane) return false;
          }
        }
      }
      
      return true;
      
    case 'attack':
      // Check attacker exists and is not exhausted
      if (step.attacker.isExhausted) return false;

      return true;
      
    case 'deploy':
      // Check drone is in active pool
      if (!playerState.activeDronePool.some(d => d.id === step.drone.id)) return false;
      
      // Check resources
      if (!canAffordDeploy(playerState, step.drone)) return false;
      
      // Check maxPerLane
      const baseDrone = fullDroneCollection.find(d => d.name === step.drone.name);
      if (baseDrone && baseDrone.maxPerLane && step.lane) {
        const currentCount = countDroneTypeInLane(playerState, step.drone.name, step.lane);
        if (currentCount >= baseDrone.maxPerLane) return false;
      }
      
      return true;
      
    default:
      return false;
  }
}

function getActionComplexity(step) {
  if (!step) return 5;
  
  switch (step.action) {
    case 'attack':
      return 1; // Simple
    case 'play_card':
      return step.card?.effect?.goAgain ? 2 : 3; // Go Again is efficient
    case 'deploy':
      return 2;
    default:
      return 4;
  }
}

function countDroneTypeInLane(playerState, droneName, laneId) {
  if (!playerState.dronesOnBoard[laneId]) return 0;
  return playerState.dronesOnBoard[laneId].filter(d => d.name === droneName).length;
}

function canAffordDeploy(playerState, drone) {
  const cost = drone.class || 0;
  const available = (playerState.deploymentBudget || 0) + (playerState.energy || 0);
  return available >= cost;
}
```

---

## Layer 5: Execution

### Purpose
Execute ONLY the first step of the best path. Next turn will re-evaluate from scratch.

**File**: `src/logic/aiExecution.js`

```javascript
/**
 * Execute first step of best path
 * No state persistence - next turn starts fresh
 */
export function executeFirstStep(path) {
  if (!path || !path.steps || path.steps.length === 0) {
    console.log('🤖 [EXECUTION] No valid path - passing');
    return { type: 'pass' };
  }
  
  const firstStep = path.steps[0];
  
  console.log('🎯 [EXECUTING]', {
    pathType: path.type,
    action: firstStep.action,
    note: firstStep.note
  });
  
  // Log strategic context (for debugging)
  if (path.steps.length > 1) {
    console.log('📋 [STRATEGIC CONTEXT]', 
      `This enables ${path.steps.length - 1} future actions:`);
    path.steps.slice(1).forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.action} - ${s.note || 'No note'}`);
    });
    console.log('💡 [NOTE] Future steps not queued - will be re-evaluated next turn');
  }
  
  switch (firstStep.action) {
    case 'play_card':
      return {
        type: 'action',
        payload: {
          type: 'play_card',
          card: firstStep.card,
          target: firstStep.target || null,
          // Include other card-specific data
          droneToMove: firstStep.droneToMove,
          fromLane: firstStep.fromLane,
          toLane: firstStep.toLane
        }
      };
      
    case 'attack':
      return {
        type: 'action',
        payload: {
          type: 'attack',
          attacker: firstStep.attacker,
          target: firstStep.target,
          targetType: firstStep.targetType
        }
      };
      
    case 'deploy':
      return {
        type: 'deploy',
        payload: {
          droneToDeploy: firstStep.drone,
          targetLane: firstStep.lane
        }
      };
      
    default:
      console.warn('⚠️ [EXECUTION] Unknown action type:', firstStep.action);
      return { type: 'pass' };
  }
}
```

---

## Mechanic Handlers

### Purpose
Modular handlers for specific game mechanics (Guardian, Jammer, etc.) that can modify or block paths.

**File**: `src/logic/aiMechanics.js`

```javascript
import fullDroneCollection from '../data/droneData.js';

/**
 * Base mechanic handler class
 */
class MechanicHandler {
  constructor(name) {
    this.name = name;
  }
  
  applies(path, gameState) {
    return false;
  }
  
  modifyPath(path, gameState) {
    return path;
  }
  
  generateCounterPaths(path, gameState) {
    return [];
  }
}

/**
 * Guardian Handler - blocks ship attacks
 */
export class GuardianHandler extends MechanicHandler {
  constructor(getLaneOfDrone) {
    super('GUARDIAN');
    this.getLaneOfDrone = getLaneOfDrone; // Store injected function
  }

  applies(path, gameState) {
    // Check if any step includes ship attack
    return path.steps.some(step =>
      step.action === 'attack' &&
      step.targetType === 'section'
    );
  }

  modifyPath(path, gameState) {
    // Check each attack step for Guardian blockers
    for (let i = 0; i < path.steps.length; i++) {
      const step = path.steps[i];

      if (step.action === 'attack' && step.targetType === 'section') {
        // Use injected getLaneOfDrone function
        const attackerLane = this.getLaneOfDrone(step.attacker.id, gameState.player2);
        if (!attackerLane) continue;

        const guardian = this.findGuardianInLane(attackerLane, gameState.player1);

        if (guardian) {
          path.blocked = true;
          path.blockReason = `Guardian ${guardian.name} blocks ship attack`;
          path.blockingEntity = guardian;
          return path;
        }
      }
    }

    return path;
  }
  
  generateCounterPaths(path, gameState) {
    // This is handled in path generation, not here
    // Mechanic handlers mainly identify blockers
    return [];
  }
  
  findGuardianInLane(laneId, playerState) {
    const drones = playerState.dronesOnBoard[laneId] || [];
    return drones.find(d => {
      const baseDrone = fullDroneCollection.find(bd => bd.name === d.name);
      return baseDrone?.abilities?.some(a =>
        a.effect?.type === 'GRANT_KEYWORD' &&
        a.effect?.keyword === 'GUARDIAN'
      );
    });
  }
}

/**
 * Jammer Handler - forces card targeting
 */
export class JammerHandler extends MechanicHandler {
  constructor(getLaneOfDrone) {
    super('JAMMER');
    this.getLaneOfDrone = getLaneOfDrone; // Store injected function
  }

  applies(path, gameState) {
    return path.steps.some(step =>
      step.action === 'play_card' &&
      step.card?.targeting
    );
  }

  modifyPath(path, gameState) {
    for (const step of path.steps) {
      if (step.action === 'play_card' && step.target && step.card?.targeting) {
        // Use injected getLaneOfDrone function
        const targetLane = this.getLaneOfDrone(step.target.id, gameState.player1)
                        || this.getLaneOfDrone(step.target.id, gameState.player2);
        if (!targetLane) continue;

        const jammer = this.findJammerInLane(targetLane, gameState.player1);

        if (jammer && step.target.id !== jammer.id) {
          path.blocked = true;
          path.blockReason = `Jammer prevents card targeting (must target Jammer)`;
          path.blockingEntity = jammer;
          return path;
        }
      }
    }

    return path;
  }
  
  findJammerInLane(laneId, playerState) {
    const drones = playerState.dronesOnBoard[laneId] || [];
    return drones.find(d => d.name === 'Jammer');
  }
}

/**
 * Apply all mechanic handlers to paths
 * Filters out blocked paths
 * @param {Array} paths - Generated paths to check
 * @param {Object} gameState - Object containing player1, player2, gameDataService
 * @param {Function} getLaneOfDrone - Injected function to find drone's lane
 */
export function applyMechanicHandlers(paths, gameState, getLaneOfDrone) {
  const handlers = [
    new GuardianHandler(getLaneOfDrone),
    new JammerHandler(getLaneOfDrone)
  ];

  const validPaths = [];

  for (const path of paths) {
    let currentPath = { ...path };
    let blocked = false;

    for (const handler of handlers) {
      if (handler.applies(currentPath, gameState)) {
        currentPath = handler.modifyPath(currentPath, gameState);

        if (currentPath.blocked) {
          blocked = true;
          console.log(`🚫 [MECHANIC BLOCK] ${handler.name} blocked path:`,
            currentPath.blockReason);
          break;
        }
      }
    }

    if (!blocked) {
      validPaths.push(currentPath);
    }
  }

  return validPaths;
}
```

---

## Integration Guide

### Architecture: Dual-AI System (Player Choice)

The strategic AI is implemented as a **completely separate system** alongside the existing tactical AI. Players choose which AI to use.

### Step 1: Create 6 New Files (Zero Changes to Existing Code)

**File 1: `src/logic/aiStrategic.js`** (~500 lines)
- Layer 1 & 2: Assessment and Goal Definition
- Functions receive parameters (getShipStatus injected)
- Export: `assessStrategicState`, `determineStrategicMode`, `defineGoals`

**File 2: `src/logic/aiPathPlanner.js`** (~1300 lines)
- Layer 3: Path Generation
- Functions receive parameters (getValidTargets, getLaneOfDrone injected)
- Export: `generatePaths` and helper functions

**File 3: `src/logic/aiPathEvaluator.js`** (~200 lines)
- Layer 4: Path Evaluation and Scoring
- Export: `evaluatePaths`, `selectBestPath`

**File 4: `src/logic/aiExecution.js`** (~100 lines)
- Layer 5: First Step Execution
- Export: `executeFirstStep`

**File 5: `src/logic/aiMechanics.js`** (~200 lines)
- Mechanic Handlers (Guardian, Jammer)
- Export: `GuardianHandler`, `JammerHandler`, `applyMechanicHandlers`

**File 6: `src/logic/aiLogicStrategic.js`** (~150 lines) - **Orchestrator**

```javascript
// NEW FILE: aiLogicStrategic.js
import GameDataService from '../services/GameDataService.js';
import { assessStrategicState, determineStrategicMode, defineGoals } from './aiStrategic.js';
import { generatePaths } from './aiPathPlanner.js';
import { evaluatePaths, selectBestPath } from './aiPathEvaluator.js';
import { executeFirstStep } from './aiExecution.js';
import { applyMechanicHandlers } from './aiMechanics.js';

/**
 * Strategic AI - Orchestrates all 5 layers
 * Same signature as tactical AI for drop-in replacement
 */
const handleOpponentActionStrategic = ({
  player1,
  player2,
  placedSections,
  opponentPlacedSections,
  getShipStatus,
  getLaneOfDrone,
  gameStateManager,
  getValidTargets,
  addLogEntry
}) => {
  const gameDataService = GameDataService.getInstance(gameStateManager);

  console.log('🤖 [STRATEGIC AI] === STARTING FRESH EVALUATION ===');

  // Layer 1: Assess game state
  const assessment = assessStrategicState(
    player2,
    player1,
    { player1: placedSections, player2: opponentPlacedSections },
    gameDataService // GameDataService instance for stat calculations
  );

  // Layer 2: Determine strategic mode and goals
  const strategicMode = determineStrategicMode(assessment);
  const goal = defineGoals(strategicMode, assessment, player2, player1, gameDataService);

  if (!goal) {
    console.warn('⚠️ [STRATEGIC AI] No goal defined - passing');
    return { type: 'pass' };
  }

  // Layer 3: Generate paths
  let paths = generatePaths(
    goal,
    player2,
    player1,
    gameDataService,
    { player1: placedSections, player2: opponentPlacedSections },
    getValidTargets, // INJECTED PARAMETER
    getLaneOfDrone  // INJECTED PARAMETER
  );

  if (paths.length === 0) {
    console.warn('⚠️ [STRATEGIC AI] No paths generated - passing');
    return { type: 'pass' };
  }

  // Apply mechanic handlers (remove blocked paths)
  paths = applyMechanicHandlers(
    paths,
    { player1, player2, gameDataService },
    getLaneOfDrone // INJECTED PARAMETER
  );

  // Layer 4: Evaluate paths (pass goal for Race mode strategy adjustments)
  const evaluatedPaths = evaluatePaths(paths, strategicMode, goal);

  // Layer 5: Select and execute best path (first step only)
  const bestPath = selectBestPath(evaluatedPaths, player2);

  if (bestPath && bestPath.type !== 'PASS' && bestPath.firstStepExecutable) {
    const result = executeFirstStep(bestPath);

    // Log decision for debugging
    console.log('🤖 [STRATEGIC AI DECISION]', {
      mode: strategicMode.mode,
      priority: strategicMode.priority,
      pathType: bestPath.type,
      score: bestPath.score,
      strategicValue: bestPath.strategicValue
    });

    console.log('📊 [TOP 3 PATHS]', evaluatedPaths.slice(0, 3).map(p => ({
      type: p.type,
      score: p.score.toFixed(0),
      value: p.strategicValue
    })));

    return result;
  }

  // No executable strategic paths
  console.log('⚠️ [STRATEGIC AI] No executable paths - passing');
  return { type: 'pass' };
};

export const aiStrategicBrain = {
  handleOpponentActionStrategic
};
```

### Step 2: Add AI Mode Selection to AI Personalities

**Modify `src/data/aiData.js`:**

```javascript
const aiPersonalities = [
  {
    name: 'TEST AI',
    aiMode: 'tactical', // Use existing tactical AI
    // ... rest of personality
  },
  {
    name: 'Manticore - Class II Gunship',
    aiMode: 'tactical', // Use existing tactical AI
    // ... rest of personality
  },
  {
    name: 'Manticore - Strategic (EXPERIMENTAL)',
    description: 'Advanced strategic AI with multi-step planning',
    difficulty: 'Hard',
    aiMode: 'strategic', // Use new strategic AI
    imagePath: '/DroneWars/AI/Manticore.png',
    dronePool: [ /* same as regular Manticore */ ],
    shipDeployment: { /* same as regular Manticore */ },
    decklist: [ /* same as regular Manticore */ ]
  }
];
```

### Step 3: Update AI Caller to Choose Brain

**Modify wherever AI is called (AIPhaseProcessor or similar):**

```javascript
import { aiBrain } from '../logic/aiLogic.js';
import { aiStrategicBrain } from '../logic/aiLogicStrategic.js';

// In the AI execution function:
const selectedPersonality = aiPersonalities[selectedIndex];

// Choose which brain to use
const actionDecision = selectedPersonality.aiMode === 'strategic'
  ? aiStrategicBrain.handleOpponentActionStrategic({
      player1, player2, placedSections, opponentPlacedSections,
      getShipStatus, getLaneOfDrone, gameStateManager,
      getValidTargets, addLogEntry
    })
  : aiBrain.handleOpponentAction({
      player1, player2, placedSections, opponentPlacedSections,
      getShipStatus, getLaneOfDrone, gameStateManager,
      getValidTargets, addLogEntry
    });
```

### Benefits of This Approach

✅ **Zero Risk** - Existing tactical AI completely untouched
✅ **Easy Testing** - Compare both AIs side-by-side
✅ **Player Choice** - Let players choose experimental mode
✅ **Clean Rollback** - Just remove strategic option if needed
✅ **Identical Signatures** - Both AIs are drop-in replacements
✅ **Parameter Injection** - Follows existing architecture pattern

### Future: Deployment Phase Strategic AI

The current implementation focuses on **ACTION PHASE decisions only**. When extending to deployment phase:

**Create `handleOpponentDeploymentStrategic` function:**
- Use same 5-layer architecture (Assessment → Goals → Paths → Evaluation → Execution)
- **Assessment**: Identify vulnerable pristine sections needing protection
- **Goals**: Define defensive deployment priorities (Guardian placement, lane reinforcement)
- **Paths**: Use `generateDefensiveDeploymentPaths` for Guardian deployment logic
- **Evaluation**: Score defensive vs offensive deployments based on strategic mode
- **Execution**: Execute deployment decision

**The Guardian deployment logic has been preserved in `generateDefensiveDeploymentPaths`** (lines 1186-1228) for this future enhancement.

**Why separate deployment from action phase strategic AI:**
- Different available actions (deploy vs attack/cards)
- Different strategic considerations (setup vs execution)
- Different timing (beginning of round vs turn-based)
- Keeps action phase AI focused and efficient

### Phase 2: Testing & Validation

Once implemented:
1. Test strategic AI in critical scenarios (1 pristine section on either side)
2. Compare strategic vs tactical AI behavior side-by-side
3. Check console logs to understand strategic AI decisions
4. Tune scoring values in evaluatePaths if needed

### Phase 3: Expand Coverage

After Phase 2 is stable:
1. Add more path types to strategic AI
2. Add more mechanic handlers if needed
3. Fine-tune scoring for different strategic modes
4. Optimize performance if necessary

---

## Testing & Validation

### Test Scenarios

#### Test 1: Win Detection (Direct Attack)
```
Setup:
- Enemy: 1 pristine section (0 shields, 10 hull) in Lane 1
- You: 5-attack drone (ready) in Lane 1
- No Guardian blocking

Expected AI Behavior:
Turn 1:
  → Assessment: enemyPristine=1, yourPristine=3
  → Mode: AGGRESSIVE - WIN_NOW
  → Goal: DAMAGE_SECTION (need 1 damage, have 5 available)
  → Paths: DIRECT_ATTACK (1500 points)
  → Executes: Attack section with 5-attack drone
  → WINS GAME

Log Output:
🤖 [AI ASSESSMENT] {yourPristine: 3, enemyPristine: 1}
🎯 [AI MODE] AGGRESSIVE - WIN_NOW
🛤️ [PATHS GENERATED] 1 paths for evaluation
🎯 [EXECUTING] {pathType: 'DIRECT_ATTACK', action: 'attack'}
```

#### Test 2: Guardian Removal → Win Setup
```
Setup:
- Enemy: 1 pristine section (0 shields, 10 hull) in Lane 2
- Enemy: Guardian (3 hull, 0 shields) in Lane 2
- You: 3-attack drone (ready), 4-attack drone (ready) in Lane 2

Expected AI Behavior:
Turn 1:
  → Assessment: enemyPristine=1
  → Mode: AGGRESSIVE - WIN_NOW
  → Goal: DAMAGE_SECTION (blocked by Guardian)
  → Paths: REMOVE_GUARDIAN_THEN_ATTACK (1200 points)
  → Evaluates: "Killing Guardian enables 4 damage next turn"
  → Executes: 3-attack drone kills Guardian
  → Guardian dies

Turn 2 (next AI turn):
  → Fresh assessment: enemyPristine=1
  → Mode: AGGRESSIVE - WIN_NOW
  → Goal: DAMAGE_SECTION (no Guardian now)
  → Paths: DIRECT_ATTACK (1500 points)
  → Executes: 4-attack drone attacks section
  → WINS GAME

Key: AI didn't remember "attack section next" - 
     it naturally scored highest when re-evaluated
```

#### Test 3: Go Again Combo Win
```
Setup:
- Enemy: 1 pristine (2 shields, 10 hull) in Lane 1
- You: 3-attack drone (exhausted) in Lane 1
- Hand: Adrenaline Rush (Ready, Go Again, 3 energy)
- Energy: 5

Expected AI Behavior:
Turn 1:
  → Assessment: enemyPristine=1
  → Mode: AGGRESSIVE - WIN_NOW
  → Goal: DAMAGE_SECTION (need 3 damage, have 0 ready)
  → Paths: READY_THEN_ATTACK (1700 points, GO_AGAIN_COMBO)
  → Executes: Play Adrenaline Rush on exhausted drone
  → Go Again triggers

Turn 1 (continued, immediate re-evaluation):
  → Fresh assessment: enemyPristine=1
  → Drone is now ready (game state updated)
  → Mode: AGGRESSIVE - WIN_NOW
  → Goal: DAMAGE_SECTION (need 3 damage, have 3 ready)
  → Paths: DIRECT_ATTACK (1500 points)
  → Executes: 3-attack drone attacks section
  → WINS GAME

Key: Go Again = immediate re-evaluation = natural combo completion
```

#### Test 4: Defensive Crisis
```
Setup:
- You: 1 pristine section (0 shields, 10 hull) in Lane 3
- Enemy: 5-attack drone (ready) in Lane 3
- You: 3-attack drone (ready) in Lane 3
- You: Guardian drone deployable (3 class cost)
- Deployment budget: 5

Expected AI Behavior:
Turn 1:
  → Assessment: yourPristine=1, under threat (5 damage incoming)
  → Mode: DEFENSIVE - SURVIVE_NOW
  → Goal: PREVENT_DAMAGE (need to stop 5 damage)
  → Paths: 
      - ELIMINATE_THREATS (kill enemy drone) = 1000 points
      - DEPLOY_GUARDIAN (block) = 1250 points
  → Executes: Deploy Guardian to Lane 3

Enemy Turn:
  → Enemy attacks Guardian instead of section
  → Section survives

Key: AI chose most efficient defense in critical situation
```

#### Test 5: Adaptation to Unexpected Changes
```
Setup (same as Test 2):
- Enemy: 1 pristine, Guardian in Lane 2
- You: Two attack drones in Lane 2

Turn 1 (AI):
  → Executes: Kill Guardian

PLAYER INTERRUPTS (between turns):
  → Player somehow deploys ANOTHER Guardian in Lane 2

Turn 2 (AI):
  → Fresh evaluation sees NEW Guardian
  → Generates paths: "Kill New Guardian → Attack" scores high
  → Adapts immediately without breaking
  → Executes: Kill new Guardian

Key: Stateless approach = natural adaptation
```

### Debug Logging Template

Add to each layer for testing:

```javascript
// In aiStrategic.js
console.log('🤖 [ASSESSMENT]', {
  yourPristine: assessment.yourPristine,
  enemyPristine: assessment.enemyPristine,
  enemyShieldPool: assessment.enemyShieldPool
});

console.log('🎯 [MODE]', {
  mode: strategicMode.mode,
  priority: strategicMode.priority
});

console.log('🎯 [GOAL]', {
  type: goal.type,
  canWinThisTurn: goal.canWinThisTurn,
  damageNeeded: goal.damageNeeded,
  damageAvailable: goal.damageAvailable
});

// In aiPathPlanner.js
console.log('🛤️ [PATHS]', {
  generated: paths.length,
  types: paths.map(p => p.type)
});

// In aiPathEvaluator.js
console.log('📊 [TOP 3 PATHS]', evaluatedPaths.slice(0, 3).map(p => ({
  type: p.type,
  score: p.score.toFixed(0),
  value: p.strategicValue,
  description: p.description
})));

// In aiExecution.js
console.log('🎯 [EXECUTING]', {
  pathType: path.type,
  action: firstStep.action,
  strategicValue: path.strategicValue
});

if (path.steps.length > 1) {
  console.log('💡 [FUTURE CONTEXT]', 
    path.steps.slice(1).map(s => s.action).join(' → '));
}
```

### Performance Targets

- Strategic assessment: <5ms
- Path generation: <20ms (limit to 20-30 paths max)
- Path evaluation: <5ms
- Total AI decision time: <50ms per call

---

## Implementation Priority

### PHASE 1 (Critical - Week 1)
**Goal: Working strategic AI for critical scenarios**

1. ✅ Create file structure (5 new files)
2. ✅ Layer 1: Strategic assessment (pristine counting, threats)
3. ✅ Layer 2: Mode determination + goal definition
4. ✅ Layer 3: Basic path generation (direct attack, remove Guardian)
5. ✅ Layer 4: Path evaluation and scoring
6. ✅ Layer 5: Execute first step only
7. ✅ Integration: Add to aiLogic.js with fallback
8. ✅ Guardian mechanic handler
9. ✅ Test: Win detection, Guardian removal

### PHASE 2 (High Priority - Week 2)
**Goal: Expand path types and defensive AI**

1. ✅ Jammer mechanic handler
2. ✅ Buff → Attack paths
3. ✅ Ready → Attack paths (Go Again combos)
4. ✅ Defensive path generation
5. ✅ Deploy Guardian paths
6. ✅ Test: Go Again combos, defensive crisis

### PHASE 3 (Medium Priority - Week 3)
**Goal: Advanced features and refinement**

1. ✅ Move → Attack paths
2. ✅ Probabilistic draw paths
3. ✅ Expand to Balanced mode
4. ✅ Shield pool awareness
5. ✅ Performance optimization
6. ✅ Test: Adaptation scenarios

### PHASE 4 (Enhancement - Ongoing)
**Goal: Polish and optimization**

1. ✅ Fine-tune scoring values
2. ✅ Add more mechanic handlers (if needed)
3. ✅ Improve probability calculations
4. ✅ Add tempo/pace calculations
5. ✅ Additional testing and refinement

---

## Benefits of Stateless Approach

### 1. Simplicity
- No state management code
- No plan serialization/deserialization
- No "stale plan" bugs
- Easier to understand and debug

### 2. Adaptability
- Reacts immediately to ANY game state changes
- Player actions between turns automatically handled
- No need to detect/invalidate plans
- Naturally handles unexpected situations

### 3. Correctness
- If Guardian removal was correct, section attack WILL score highest next turn
- Game state is single source of truth
- No synchronization issues
- Self-correcting by design

### 4. Performance
- No plan storage overhead
- Simpler code paths
- Each evaluation is independent
- Easier to optimize

### 5. Maintainability
- Each evaluation is independent and testable
- Easy to add new path types
- Clear cause-and-effect
- Natural debugging workflow

### 6. Strategic Emergence
- Multi-turn strategies emerge naturally from good scoring
- No need to explicitly code "do X then Y"
- AI continues sound plans automatically
- More human-like decision-making

---

## Summary

This strategic framework transforms the AI from a **tactical scorer** to a **strategic planner** while remaining **completely stateless**:

### Before (Tactical AI):
```
→ "This attack is worth 150 points"
→ "This card is worth 120 points"
→ Attacks Guardian
→ Next turn: Doesn't remember why it killed Guardian
→ Might not follow up with section attack
```

### After (Strategic AI):
```
Turn 1:
→ "Enemy has 1 pristine section - WIN CONDITION"
→ "I have 6 damage available"
→ "Guardian blocks ship attacks"
→ Generates: [Kill Guardian, Attack Section]
→ Evaluates: "Killing Guardian = 1200 points (enables win)"
→ Executes: Kill Guardian
→ Forgets everything

Turn 2:
→ Fresh evaluation
→ "Enemy has 1 pristine section - WIN CONDITION"
→ "I have 4 damage available"
→ "No Guardian blocking"
→ Generates: [Attack Section]
→ Evaluates: "Attack Section = 1500 points (immediate win)"
→ Executes: Attack Section
→ WINS

Natural continuation without remembering!
```

### Key Principles

1. **Stateless**: Every turn is a fresh evaluation
2. **Multi-Step Paths**: Generated for context, scored for strategy
3. **Single-Step Execution**: Only first step executes
4. **Natural Continuation**: Sound strategies score high when re-evaluated
5. **Graceful Degradation**: Always falls back to tactical AI if needed

This design makes the AI both **smarter** (understands strategy) and **simpler** (no state management) at the same time!

---

## TODO: Future Enhancements

### Session Notes (2025-10-11)

**Critical Review Completed** ✅
- Fixed 20 critical issues in specification
- All GameDataService integration verified
- Parameter injection patterns corrected
- Race mode conditional logic fixed
- Specification ready for implementation

**Two Major Features Identified for Future Addition:**

### 1. Speed-Based Interception Awareness ✅ IMPLEMENTED (Tactical AI)

**Implementation Status:**
- ✅ AI detects Guardian blockers (keyword-based)
- ✅ AI detects Jammer blockers (keyword-based)
- ✅ **AI analyzes speed-based interception dynamics** (IMPLEMENTED 2025-10-12)

**Implemented in Tactical AI (`aiLogic.js` lines 65-123, 1032-1125):**

1. **`analyzeInterceptionInLane()` Function**
   - Categorizes all drones by interception role:
     - `aiSlowAttackers` - AI drones that can be intercepted by enemy (speed <= enemy max speed)
     - `aiUncheckedThreats` - AI drones too fast to be intercepted (speed > enemy max speed)
     - `aiDefensiveInterceptors` - AI drones that can intercept enemy attacks
     - `enemyInterceptors` - Enemy drones that can intercept AI attacks (speed > AI max speed)

2. **Scoring Adjustments Applied**
   - **Ship attacks from interceptable drones**: -80 penalty (high interception risk)
   - **Unchecked threats**: +100 bonus (too fast to intercept, guaranteed hits)
   - **Defensive interceptor usage**: Scaled penalty based on threat level
     - vs 1 ATK threat: 0 penalty (safe to use offensively)
     - vs 2 ATK threat: -10 penalty
     - vs 3 ATK threat: -40 penalty
     - vs 4+ ATK threat: -120 penalty (keep for defense!)
   - **Enemy interceptor removal**: Bonus = sum of ship attacks it unblocks

3. **Multi-Pass Architecture**
   - Phase 1: Analyze interception dynamics for all lanes
   - Phase 2: Apply scoring adjustments to all attack actions
   - Prioritizes removing enemy interceptors when it enables ship attacks

**Note for Strategic AI:**
The Tactical AI now has comprehensive interception awareness. The Strategic AI (when implemented) should build on this foundation for multi-step "kill interceptor then attack" paths, but the core analysis is already functional.

**Example Interception Scenario:**
```
Enemy: 1 pristine section (5 shields)
Enemy Drones in Lane: Interceptor (speed 4), no other drones
Your Drones in Lane:
  - Bomber (attack 5, speed 2, class 3) - Can win if hits, but likely intercepted
  - Scout (attack 1, speed 5, class 1) - Can kill Interceptor without being intercepted

Tactical AI Behavior (CURRENT):
  → Evaluates Bomber ship attack: Base score (5 * 8 = 40) - Interception Risk (-80) = -40
  → Evaluates Scout interceptor kill: Base score (1 * 10 = 10) + Interceptor Removal (+40) = 50
  → Chooses: Attack Interceptor with Scout (avoids interceptable ship attack)
  → Next turn: Bomber can attack ship freely (but AI doesn't "plan" this, just re-evaluates)
  → IMPROVED: Avoids interceptable attacks

Strategic AI Behavior (FUTURE):
  → Generates multi-step path: [Kill Interceptor with Scout, Attack ship with Bomber]
  → Scores as 'ENABLES_WIN_NEXT_TURN' (1200 points)
  → Executes: Attack Interceptor with Scout
  → Next turn: Recognizes win opportunity, attacks ship with Bomber
  → OPTIMAL: Plans sequences toward win condition
```

**Tactical AI Note:**
The existing tactical AI (aiLogic.js lines 294-306) DOES understand speed matters for buff cards:
```javascript
// It recognizes when speed buffs overcome interceptors
if (effectiveTarget.speed <= opponentMaxSpeed &&
    (effectiveTarget.speed + mod.value) > opponentMaxSpeed) {
    score = 60;
    action.logic.push(`Interceptor Overcome Bonus: 60`);
}
```
But it doesn't apply this logic when choosing attackers. Strategic AI should extend this reasoning.

---

### 2. Strategic Passing (Tempo Control) ⚠️ MEDIUM PRIORITY

**Concept:**
In I-go-you-go games, sometimes the best move is a low-impact action (or pass) to force your opponent to commit first. This is "tempo control" - making your opponent act when they don't want to.

**When Deferring is Valuable:**

1. **Opponent Has Urgency** - They have damaged sections under threat, must defend
2. **You Have Stability** - Your sections healthy, no immediate threats
3. **Reactive Advantage** - You have interception capability, counter cards, or Go Again cards
4. **Information Advantage** - Seeing their play first reveals their strategy
5. **Resource Preservation** - Keep energy for better opportunities next phase

**Example Scenario:**
```
Your State:
  - 3 pristine sections (healthy)
  - 2 ready Interceptors (speed 4)
  - 8 energy, hand with counter cards

Their State:
  - 1 pristine section (5 shields) - WIN CONDITION
  - 1 damaged section (critical)
  - Ready Heavy Bomber (4 attack, speed 2) in pristine lane

Current AI Behavior:
  → Looks for highest-value action
  → Attacks something for 80 points
  → Uses energy/exhausts drones
  → Opponent attacks with Bomber afterward

Strategic Pass Behavior:
  → Assesses urgency: They MUST use Bomber or risk losing it
  → Recognizes advantage: Can intercept with cheap drone
  → Generates STRATEGIC_PASS path
  → Scores: "Force opponent into bad choice" = 150 points
  → Executes: Pass
  → Opponent attacks with Bomber → Intercepted by Scout (class 1 trade for class 3)
  → Next turn: Attack pristine section with full resources
```

**What Needs to Be Added:**

1. **Urgency Assessment System**
   - Calculate relative urgency: who "needs" to act more?
   - Factors: damaged sections, ready threats, resource advantages
   - Output: urgency differential (-100 to +100)

2. **STRATEGIC_PASS Path Type**
   - Explicitly model passing as strategic option
   - Generate when urgency differential favors deferring
   - Score based on: opponent pressure, your reactive options, resource state

3. **Opponent Threat Modeling**
   - Predict likely opponent plays (ready drones, probable card plays)
   - Evaluate your responses to each predicted play
   - Score deferring based on average response value

4. **Defer Scoring Formula**
   ```
   STRATEGIC_PASS_VALUE =
     (opponent_urgency - your_urgency) * 50 +
     (your_reactive_options * 20) +
     (resource_preservation_value) -
     (opportunity_cost)
   ```

5. **Integration Points**
   - Add to `generateBalancedPaths` (primary use case)
   - Add to `generateDefensivePaths` (when ahead and stable)
   - Consider in `generateOffensivePaths` (when opponent must defend)

**Strategic Modes and Passing:**
- **AGGRESSIVE**: Rarely pass (only if forcing critical error)
- **DEFENSIVE**: May pass to preserve resources for emergency defense
- **RACE**: Pass if opponent must act first (tempo advantage)
- **BALANCED**: Primary use case - maximize value through timing

**Implementation Complexity:**
- Medium complexity (requires opponent modeling)
- Lower priority than interception (less impactful on average)
- Good "Phase 3" feature after core mechanics proven

---

### Implementation Priority

**Phase 1** (Current - Ready for Implementation):
- ✅ Core strategic framework (Assessment → Goals → Paths → Evaluation → Execution)
- ✅ Guardian removal paths
- ✅ Jammer detection
- ✅ Race mode strategies
- ✅ Buff/Ready card one-shot enablement
- ✅ Defensive paths

**Phase 2** (Tactical AI Improvements - COMPLETED 2025-10-12):
- ✅ Speed-based interception awareness (implemented in `aiLogic.js`)
- ✅ Optimal attacker selection (speed vs attack tradeoff via scoring penalties)
- ✅ Interceptor removal paths (via removal bonus scoring)
- ✅ Lane score reweighting (Speed > Attack > Cost > Durability)
- ✅ ON_MOVE ability detection for movement cards

**Phase 2.5** (Strategic AI - Not Yet Implemented):
- ⚠️ Multi-step "kill interceptor then attack" paths
- ⚠️ Win condition checking ("can I win this turn?")
- ⚠️ Blocker removal coordination (Guardian/Jammer kills → ship attacks)

**Phase 3** (MEDIUM PRIORITY - Add After Testing):
- 📋 Strategic passing / tempo control
- 📋 Opponent threat modeling
- 📋 Resource preservation strategies

**Phase 4** (Future Enhancements):
- 📋 Deployment phase strategic AI
- 📋 Multi-turn planning (beyond context scoring)
- 📋 Card synergy detection

---

**Note:** Specification is complete and ready for implementation for Phase 1. Phase 2 interception features should be added before creating the actual implementation files to avoid having to refactor immediately after launch.