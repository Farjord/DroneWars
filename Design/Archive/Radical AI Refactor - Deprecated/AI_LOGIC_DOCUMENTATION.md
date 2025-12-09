# AI Logic System Documentation

## Overview

The Drone Wars AI system consists of three main files:
- **`aiLogic.js`** (~1,895 lines) - Core decision-making algorithms
- **`AIPhaseProcessor.js`** (~1,117 lines) - Turn orchestration and phase management
- **`aiData.js`** (~283 lines) - AI personality definitions

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     AIPhaseProcessor                            │
│   (Turn orchestration, phase management, state subscription)    │
└────────────────────────────┬────────────────────────────────────┘
                             │ delegates to
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         aiBrain                                  │
│           (Core decision algorithms in aiLogic.js)              │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │handleOpponentTurn│  │handleOpponentAction│ │makeInterception│ │
│  │   (Deployment)   │  │     (Actions)      │ │   Decision     │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │ uses
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Helper Functions                              │
│  - Lane Scoring        - Drone Impact Calculation               │
│  - Jammer Detection    - Interception Analysis                  │
│  - Threat Assessment   - Card Effect Evaluation                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Core Concepts

### 1.1 Lane Scoring System
**Location:** `calculateLaneScore()` (lines 190-234)

The foundation of AI decision-making. Calculates who is "winning" each lane.

**Formula:**
```
LaneScore = (AI Power - Human Power) + Speed Score + Health Modifier
```

**Power Calculation (per drone):**
- Attack Value: `(attack + potentialShipDamage) × 4`
- Class Value: `class × 2`
- Durability Value: `(hull + shields) × 0.5`

**Speed Score:**
- `(AI Max Speed - Human Max Speed) × 8`

**Health Modifier (based on ship section status):**
- AI section damaged: `-20`
- AI section critical: `-40`
- Human section damaged: `+15`
- Human section critical: `+30`

**Interpretation:**
- Positive score = AI is winning the lane
- Negative score = Human is winning the lane
- Magnitude indicates strength of advantage

---

### 1.2 Drone Impact Calculation
**Location:** `calculateDroneImpact()` (lines 250-259)

Measures a drone's overall game value using the same weights as lane scoring for consistency.

**Formula:**
```
Impact = (attack + potentialShipDamage) × 4 + (class × 2) + (hull + shields) × 0.5
```

**Uses:**
- Interception trade decisions
- Defensive value assessment
- Sacrifice/opportunity cost calculations

---

### 1.3 Interception Analysis
**Location:** `analyzeInterceptionInLane()` (lines 65-123)

Categorizes drones by their speed-based combat roles:

| Category | Definition | Implication |
|----------|------------|-------------|
| `aiSlowAttackers` | AI drones slower than enemy max speed | Can be intercepted |
| `aiUncheckedThreats` | AI drones faster than all enemies | Free to attack ship |
| `aiDefensiveInterceptors` | AI drones that can intercept enemies | Keeping threats in check |
| `enemyInterceptors` | Enemy drones that can block AI attacks | Must be removed or bypassed |

---

## Part 2: Deployment Phase (`handleOpponentTurn`)
**Location:** Lines 261-445

### 2.1 Decision Flow

```
1. Calculate available resources (budget + energy)
2. Reserve energy for most expensive card in hand
3. For each affordable drone:
   └─ For each lane:
      ├─ Check deployment limits (maxPerLane, CPU limit)
      ├─ Calculate projected lane score if deployed
      ├─ Calculate impact score (projected - current)
      ├─ Apply strategic bonuses
      ├─ Apply stabilization/dominance bonuses
      └─ Apply overkill penalty
4. Choose highest scoring option (or pass if < 5)
```

### 2.2 Strategic Bonuses

**When lane score < -15 (losing badly):**
- Speed ≥ 4: `+15`
- ALWAYS_INTERCEPTS or GUARDIAN: `+20`

**When lane score > 15 (winning strongly):**
- Attack ≥ 4: `+15`
- BONUS_DAMAGE_VS_SHIP ability: `+20`

**When lane score is balanced (-15 to +15):**
- Class ≤ 1 (cheap drones): `+10`

### 2.3 Situational Bonuses

| Bonus Type | Condition | Value |
|------------|-----------|-------|
| Stabilization | Flipping negative lane to positive | `+10 to +30` (random) |
| Dominance | Pushing lane score above 20 | `+10 to +30` (random) |
| Overkill Penalty | Deploying to already-won lane | `-150` |

---

## Part 3: Action Phase (`handleOpponentAction`)
**Location:** Lines 447-1533

### 3.1 Action Types Generated

1. **Card Plays** - Playing cards from hand
2. **Attacks** - Drone attacks on drones or ship sections
3. **Moves** - Moving drones between adjacent lanes

### 3.2 Card Scoring System

#### Damage Cards
| Effect Type | Base Score | Bonuses |
|-------------|------------|---------|
| DESTROY (Single) | `resourceValue × 8 - cost × 4` | - |
| DESTROY (Filtered) | `filteredValue × 8 - cost × 4` | - |
| DESTROY (Lane) | `(enemyValue - friendlyValue) × 4 - cost × 4` | Ready drones weighted 1.5× |
| DAMAGE (Single) | `damage × 8 - cost × 4` | Lethal: `+class × 15 + 50` |
| DAMAGE (Filtered) | `damage × 10 - cost × 4` | Multi-hit: `+targets × 15` |

#### Utility Cards
| Effect Type | Scoring Logic |
|-------------|---------------|
| READY_DRONE | Offensive potential + defensive potential + lane impact |
| GAIN_ENERGY | `+60 + enables × 5` if enables expensive cards, else `+1` |
| DRAW | `+10 + energyRemaining × 2` |
| SEARCH_AND_DRAW | `+drawCount × 12 + searchCount × 2 + energyRemaining × 2` |
| HEAL_SHIELDS | `shieldsHealed × 5` |
| HEAL_HULL | `+80` (fixed) |
| REPEATING_EFFECT | `repeatCount × 25 - cost × 4` |
| CREATE_TOKENS (Jammers) | CPU protection value scaled by available lanes |
| MODIFY_STAT | Lane impact + stat-specific bonuses |
| SINGLE_MOVE | Lane impact + ON_MOVE ability bonuses |

### 3.3 Attack Scoring

#### Drone Attacks
```
Base Score = target.class × 10
+ Favorable Trade (attacker class < target class): +20
+ Ready Target: +10
- Anti-Ship drone penalty: -40
+ Piercing bonus: shields × 8
- Guardian protection risk: -200 (if guardian attacking with enemies present)
+ Lane impact bonus: (projected - current) × 0.5
+ Lane flip bonus: magnitude × 0.5
```

#### Ship Section Attacks
```
Base Score = effectiveAttack × 8
+ Damaged section: +15
+ Critical section: +30
+ No shields: +40
+ Shield break: +35
+ High attack (≥3): +10
+ Piercing bonus: shields × 10
```

### 3.4 Move Scoring

```
Score = (toLaneImpact + fromLaneImpact) - 10 (move cost)
+ Defensive move (protecting damaged section): +25
+ ON_MOVE ability bonus
+ Offensive move (damaged enemy section): +20
- Overkill (critical enemy section): -150
```

---

## Part 4: Post-Scoring Adjustment Passes

### 4.1 Jammer Adjustment Pass
**Location:** Lines 1255-1386

**Purpose:** Handle Jammer drone mechanics that block card targeting.

**Process:**
1. Identify blocked card plays (cards targeting non-Jammer drones in Jammer lanes)
2. Mark blocked plays with score `-999`
3. Calculate total blocked value per lane
4. Boost Jammer removal attacks by blocked value
5. Add efficiency bonus for low-attack drones removing Jammers

### 4.2 Interception Adjustment Pass
**Location:** Lines 1388-1480

**Purpose:** Adjust attack scores based on interception dynamics.

**Adjustments:**

| Condition | Adjustment |
|-----------|------------|
| Defensive interceptor attacking | `-impact × 12` (penalty for abandoning defense) |
| Slow attacker → ship | `-80` (interception risk) |
| Unchecked threat → ship | `+100` (free damage) |
| Attacking enemy interceptor | `+unblockedValue` (enables future attacks) |

---

## Part 5: Interception Decision System (`makeInterceptionDecision`)
**Location:** Lines 1642-1888

### 5.1 Decision Factors

1. **Survivability Analysis**
   - Does interceptor survive the attack?
   - Damage ratio (damage taken / durability)

2. **Opportunity Cost**
   - Are there bigger threats to save interceptor for?
   - Only applies to non-DEFENDER drones

3. **Impact-Based Trade Analysis**
   - Compare attacker impact vs interceptor impact
   - Consider protection value (ship hull vs shields vs drone)

### 5.2 Decision Matrix

**If Interceptor Survives:**
| Impact Ratio | Decision | Score |
|--------------|----------|-------|
| < 0.3 | Excellent trade | 90-110 |
| < 0.7 | Good trade | 70-90 |
| Protection > Impact × 1.5 | Protective | 50-70 |
| Otherwise | Poor value | -999 (decline) |

**If Interceptor Dies:**
| Sacrifice Ratio | Decision | Score |
|-----------------|----------|-------|
| > 2.0 | Excellent sacrifice | 60-80 |
| > 1.3 | Good sacrifice | 45-70 |
| Otherwise | Poor sacrifice | -999 (decline) |

### 5.3 Special Handling

**DEFENDER Keyword:**
- No exhaustion penalty
- No opportunity cost consideration
- Prioritized first in interceptor list
- `+20` score bonus

---

## Part 6: AI Phase Processor

### 6.1 Responsibilities

- Initialize AI with personality data
- Subscribe to game state changes
- Trigger AI turns at appropriate times
- Delegate decisions to `aiBrain`
- Execute decisions through `ActionProcessor`

### 6.2 Phase Handlers

| Phase | Method | Behavior |
|-------|--------|----------|
| Deck Selection | `processDeckSelection()` | Returns personality's deck + drones + ship layout |
| Drone Selection | `processDroneSelection()` | Randomly selects 5 from deck's drone pool |
| Placement | `processPlacement()` | Returns personality's ship placement |
| Deployment | `executeDeploymentTurn()` | Calls `handleOpponentTurn()` |
| Action | `executeActionTurn()` | Calls `handleOpponentAction()` |
| Shield Allocation | `executeShieldAllocationTurn()` | Even distribution across sections |
| Interception | `makeInterceptionDecision()` | Calls `aiBrain.makeInterceptionDecision()` |

---

## Part 7: AI Personalities (`aiData.js`)

### 7.1 Personality Structure

```javascript
{
  name: string,
  description: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  modes: ['vs'] | ['extraction'] | ['vs', 'extraction'],
  imagePath: string,
  dronePool: string[],  // 5-10 drone names
  shipDeployment: {
    strategy: 'aggressive' | 'balanced' | 'defensive',
    placement: [lane0, lane1, lane2],  // Section keys
    reasoning: string
  },
  decklist: [{ id: string, quantity: number }]
}
```

### 7.2 Current Personalities

| Name | Mode | Difficulty | Strategy |
|------|------|------------|----------|
| TEST AI | VS | Easy | Aggressive |
| Manticore - Class II Gunship | VS | Normal | Balanced |
| Rogue Scout Pattern | Extraction | Easy | Defensive |
| Automated Patrol Unit | Extraction | Easy | Balanced |
| Heavy Cruiser Defense Pattern | Extraction | Medium | Aggressive |
| Specialized Hunter Group | Extraction | Medium | Aggressive |
| Capital-Class Blockade Fleet | Extraction | Hard | Defensive |

---

## Part 8: Key Constants and Thresholds

### Scoring Multipliers
| Stat | Multiplier | Context |
|------|------------|---------|
| Attack | ×4 | Lane scoring, impact |
| Class | ×2 | Lane scoring, impact |
| Durability | ×0.5 | Lane scoring, impact |
| Speed Advantage | ×8 | Lane scoring |
| Card Cost | ×4 | Cost penalty |
| Damage Value | ×8 | Damage cards |

### Decision Thresholds
| Threshold | Value | Purpose |
|-----------|-------|---------|
| Minimum deploy score | 5 | Pass if no good deploys |
| Minimum action score | 0 | Pass if all actions negative |
| Action pool range | 20 | Consider actions within 20 of top |
| Overkill penalty | -150 | Discourage over-committing |
| Guardian attack penalty | -200 | Protect guardian role |
| Unchecked threat bonus | +100 | Reward fast attackers |
| Interception risk penalty | -80 | Discourage risky attacks |

---

## Part 9: Debug Logging

The AI uses `debugLog('AI_DECISIONS', ...)` throughout for debugging.

Key log categories:
- Deployment decisions with all considered options
- Action scoring breakdowns
- Jammer blocking detection
- Interception analysis
- Opportunity cost calculations

Enable via debug logger configuration.
