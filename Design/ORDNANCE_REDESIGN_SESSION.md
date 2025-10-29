# Ordnance Card Redesign - Design Session Documentation
**Date:** 2025-10-17
**Focus:** Establishing baselines, marking mechanic, action economy balancing

---

## Table of Contents
1. [Design Philosophy Established](#design-philosophy-established)
2. [Core Balancing Principles](#core-balancing-principles)
3. [Marking Mechanic Design](#marking-mechanic-design)
4. [Complete Ordnance Card Suite](#complete-ordnance-card-suite)
5. [Visual Effects Specification](#visual-effects-specification)
6. [Implementation Checklist](#implementation-checklist)

---

## Design Philosophy Established

### Baseline Definition
**What is a "baseline" card?**
- A card that's **fair and balanced** for its cost - the equilibrium point
- Other cards can deviate (stronger/weaker) but should have corresponding trade-offs
- Used as reference point when designing new cards

### Card Design Framework Integration
All cards follow **"base effect + conditional bonus"** pattern:
- **Base effect:** Always playable, intentionally below optimal value
- **Conditional bonus:** When triggered, brings card to fair/strong value
- **Purpose:** Prevents dead draws while rewarding skilled timing and setup

### Critical Insight: Action Economy
**Key balancing factor previously missed:**
- Cards aren't just energy cost vs damage dealt
- **Action advantage matters:** Playing 1 card that denies 2+ enemy actions is huge value
- Destroying ready drones = denying future actions (action-positive)
- Destroying exhausted drones = tempo gain but action-neutral (already acted)

**Example:**
- Strafe Run (4 cost): Kills 3 small drones = +2 action advantage (you play 1, deny 3)
- This justifies higher cost despite only 3 total damage

---

## Core Balancing Principles

### Energy Cost vs Effect Value

**Damage baselines:**
- **1 cost:** 1 damage
- **2 cost:** 2 damage (baseline single-target)
- **3 cost:** 2-3 damage OR conditional destroy
- **4 cost:** 2 piercing damage OR multi-target effects
- **5 cost:** Destroy effects OR 4+ damage with conditions
- **6+ cost:** Mass destruction OR scaling effects

**Piercing damage premium:**
- Ignoring shields is worth **+1 to +2 cost**
- Shields regenerate each round, making piercing very strong

**"Go Again" premium:**
- Worth approximately **+1 cost** OR reduced base effect
- Keeps initiative = significant tactical advantage

### Drone Durability Reference
*(For calculating removal efficiency)*

**Total Durability (Hull + Shields):**
- Class 0 (free): 1 total (Swarm, Jammer - no shields)
- Class 1 (1 cost): 2 total (1 hull + 1 shield) - **shields regenerate!**
- Class 2 (2 cost): 3-4 total (Standard Fighter 3, Gladiator 4)
- Class 3 (3 cost): 3-6 total (varies widely - Heavy Fighter 5, Guardian 6)
- Class 4 (4 cost): 1 total (Sniper - fragile specialists)

**Key insight:** Shield regeneration means 2 damage often doesn't achieve removal unless followed up same turn.

---

## Marking Mechanic Design

### What is Marking?
**Game mechanic:** Apply "marked" status to enemy drones
- Visual indicator: **Target lock icon permanently on marked drones**
- Multiple cards have bonuses against marked targets
- Creates setup → payoff gameplay loop

### Mark Sources

**1. Ship Section Ability - Bridge (Primary source)**
- **Cost:** 1-2 energy (TBD via playtesting)
- **Effect:** "Mark target enemy drone"
- **Type:** Active ability, proactive play
- **Decision:** Single target OR lane-wide marking? (Suggest single for initial implementation)

**2. Drone Abilities (Secondary sources - 2-3 drones)**
- **Option A:** "When this drone attacks, mark the attacked target"
- **Option B:** "When deployed, mark all enemy drones in this lane"
- **Option C:** "Active ability: Pay 1 energy, mark target enemy drone"
- **Purpose:** Enables marking archetype without requiring specific ship section

**3. Card Effects (Tertiary - optional)**
- Some Tactic cards could apply marks as secondary effect
- Example: "Deal 1 damage and mark target drone"

### Mark Payoff Cards (Ordnance)

**Cards with marking conditionals:**
1. **Laser Blast** (2 cost): +1 damage to marked (2 → 3)
2. **Target Lock** (3 cost): Can only target marked drones (destroy)
3. **Railgun Strike** (5 cost): +2 piercing damage to marked (2 → 4)
4. **Purge Protocol** (7 cost): Destroys ALL marked drones

**Design principle:** Varying power levels require different setup investment
- Cheap cards (Laser Blast): Small bonus
- Mid-cost (Target Lock): Moderate bonus, gated by condition
- Expensive (Purge): Massive payoff, requires multi-mark setup

---

## Complete Ordnance Card Suite

### Card List by Cost (12 Total)

#### **2 Cost - Early Interaction**

**1. Laser Blast** (UPDATED: 3 → 2 cost)
- **Type:** Ordnance
- **Cost:** 2 energy
- **Max in Deck:** 4
- **Effect:** Deal 2 damage to target drone. If target is marked, deal 3 damage instead.
- **Targeting:** Single drone, any lane, any affinity
- **Visual:** Red laser beam (LASER_BLAST existing effect)
- **Marked visual:** Thicker/brighter beam when hitting marked target
- **Design notes:** Baseline single-target damage. Always playable (no dead draws), mark synergy adds 50% damage.

**2. Finishing Volley** (NEW CARD - renamed from "Cleanup Crew")
- **Type:** Ordnance
- **Cost:** 2 energy
- **Max in Deck:** 4
- **Effect:** Destroy target exhausted enemy drone.
- **Targeting:** Single exhausted enemy drone
- **Visual:** Rapid-fire bullet tracers converging on target → explosion
- **Color:** Orange/yellow bursts
- **Design notes:** Reactive removal. Tempo-positive (2 cost removes 2-4 cost drone). Action-neutral (they already acted). Rewards patient play.

---

#### **3 Cost**

**3. Sidewinder Missiles** (KEPT AS-IS)
- **Type:** Ordnance
- **Cost:** 3 energy
- **Max in Deck:** 4
- **Effect:** Deal 2 damage to all enemy drones with speed 3 or less in target lane.
- **Targeting:** Enemy lane
- **Visual:** Multiple blue/white missiles weave toward slow drones → small explosions on each
- **Current visual:** ENERGY_WAVE (should be updated to missile-specific)
- **Design notes:** Tech card against slow drones. High ceiling (hits multiple targets = action-positive) but meta-dependent. Can whiff completely.

---

#### **4 Cost - Mid-Game Options**

**4. Piercing Shot** (KEPT AS-IS)
- **Type:** Ordnance
- **Cost:** 4 energy
- **Max in Deck:** 4
- **Effect:** Deal 2 piercing damage to target drone. (Piercing damage ignores shields)
- **Targeting:** Single drone, any lane
- **Visual:** Bright purple/magenta piercing lance → shield shatters visually → hull damage
- **Current visual:** LASER_BLAST (should be distinct purple color)
- **Design notes:** Premium cost for shield bypass. Piercing worth +1-2 cost. Reliable removal tool.

**5. Target Lock** (UPDATED: 6 → 3 cost, conditional changed)
- **Type:** Ordnance
- **Cost:** 3 energy (MAJOR REDUCTION from 6!)
- **Max in Deck:** 2
- **Effect:** Destroy target marked enemy drone.
- **Targeting:** Single marked enemy drone ONLY (unplayable without marks)
- **Visual:** Targeting reticle appears → guided missile locks on → large explosion
- **Color:** Red targeting UI + white missile trail
- **Design notes:** Core marking archetype payoff. Cheap unconditional destroy gated by marking requirement. Can brick in hand (risk vs reward). At 3 cost, makes marking archetype viable.

**6. Strafe Run** (NEW CARD)
- **Type:** Ordnance
- **Cost:** 4 energy
- **Max in Deck:** 4
- **Effect:** Deal 1 damage to up to 3 different enemy drones in different lanes.
- **Targeting:** Choose up to 3 enemy drones, MUST be in different lanes (1 per lane max)
- **Visual:** Fighter craft silhouette flies across screen, strafing each lane with bullet tracers
- **Animation:** Lane 1 → Lane 2 → Lane 3 (visual flow)
- **Design notes:** Multi-lane pressure tool. Best case = kills 3 damaged drones (+2 action advantage!). Forces opponent to defend all fronts. Different-lanes restriction prevents stacking on one lane.

**7. Barrage** (NEW CARD - introduces SPLASH keyword)
- **Type:** Ordnance
- **Cost:** 4 energy
- **Max in Deck:** 4
- **Effect:** Deal 1 damage to target drone and all drones adjacent to it in the same lane (splash). If you control 3 or more drones in target lane, deal 2 damage instead.
- **Targeting:** Primary target drone in lane
- **Splash:** Damages adjacent drones in same lane (implementation detail TBD: all in lane? positional?)
- **Visual:** Artillery shell arcs → impact creates shockwave → expanding ring damages adjacent drones
- **Color:** Orange explosion with shockwave ripple
- **Design notes:** Rewards lane commitment (aggro strategy). Punishes enemy clustering. Introduces SPLASH mechanic as keyword. Conditional tied to your board state.

---

#### **5 Cost - Premium Removal**

**8. Shrieker Missiles** (KEPT AS-IS)
- **Type:** Ordnance
- **Cost:** 5 energy
- **Max in Deck:** 2
- **Effect:** Destroy all enemy drones with speed 5 or higher in target lane.
- **Targeting:** Enemy lane
- **Filter:** Speed ≥ 5
- **Visual:** Swarm of fast missiles screaming into lane → simultaneous impacts on fast drones
- **Audio concept:** High-pitched shriek
- **Color:** Bright white/silver streaks
- **Design notes:** Tech card vs speed decks. Massive action advantage when it hits 2+ targets. Built-in filter is sufficient conditionality.

**9. Railgun Strike** (NEW CARD - introduces OVERFLOW keyword)
- **Type:** Ordnance
- **Cost:** 5 energy
- **Max in Deck:** 2
- **Effect:** Deal 2 piercing damage to target drone. Excess damage overflows to the ship section in that lane. If target is marked, deal 4 piercing damage instead.
- **Targeting:** Single drone
- **Overflow:** Excess damage after destroying drone carries to ship section in same lane
- **Visual:** Massive electric blue/cyan beam charges → fires through drone → continues to ship section
- **Animation:** Dual impacts if overflow occurs (drone explosion + ship section hit)
- **Design notes:** Introduces OVERFLOW as keyword. Dual-purpose removal + ship damage. Mark conditional makes it dangerous threat. Example: 4 piercing vs 2-hull drone = 2 overflow damage to ship.

**10. Overwhelming Force** (NEW CARD - updated from 6 cost)
- **Type:** Ordnance
- **Cost:** 5 energy (reduced from 6)
- **Max in Deck:** 2
- **Effect:** Deal damage to target drone equal to the number of ready friendly drones in that lane.
- **Targeting:** Single drone in lane where you have drones
- **Damage:** 2-4 damage typically (normal lane commitment)
- **Visual:** All your drones in that lane fire simultaneously → beams converge on target
- **Animation:** Number of beams = number of your ready drones
- **Color:** Green/allied color
- **Design notes:** Scaling damage, rewards lane commitment. Answer to Heavy Fighter (4 drones = 4 damage kills through shields). Lane-based (NOT all your drones!). Swarm deck's premium removal.

---

#### **7-8 Cost - Finishers**

**11. Purge Protocol** (NEW CARD)
- **Type:** Ordnance
- **Cost:** 7 energy
- **Max in Deck:** 1
- **Effect:** Destroy all marked enemy drones.
- **Targeting:** All marked drones across all lanes
- **Visual:** Orbital strike - red targeting markers appear above each marked drone → beams/missiles from above → simultaneous bombardment
- **Animation:** Brief lock-on delay → all hit at once (satisfying impact!)
- **Design notes:** Marking archetype finisher. Requires multi-mark setup. Best case = destroys 3+ drones (massive action advantage). Dead card without marks. Build-around combo payoff.

**12. Nuke** (KEPT AS-IS)
- **Type:** Ordnance
- **Cost:** 8 energy
- **Max in Deck:** 2
- **Effect:** Destroy ALL drones in target lane (both friendly and enemy).
- **Targeting:** Any lane
- **Symmetric:** Destroys YOUR drones too!
- **Visual:** Nuclear missile flies into lane → white flash → mushroom cloud → everything destroyed
- **Existing effect:** NUKE_BLAST (keep this)
- **Design notes:** Board reset button. Desperation play when losing a lane. Symmetric downside IS the conditionality. Situational by design.

---

## New Keywords & Mechanics

### OVERFLOW
**Definition:** Excess damage dealt to a destroyed drone continues to the ship section in that lane.

**Implementation details:**
1. Calculate damage to drone
2. If damage ≥ drone's remaining HP, drone is destroyed
3. Calculate excess: `overflow = damage - drone_remaining_hp`
4. Apply overflow damage to ship section in same lane

**Visual indicator:** Damage effect continues past destroyed drone to ship section

**Cards using Overflow:**
- Railgun Strike (currently only one)
- Future design space: Other piercing/penetrating effects

---

### SPLASH
**Definition:** Damage applied to adjacent drones in the same lane (in addition to primary target).

**Implementation details (TBD):**
- **Option A:** All drones in same lane take damage
- **Option B:** Drones in specific positions relative to target (positional system needed)
- **Recommendation:** Start with "all in lane" for simplicity

**Visual indicator:** Shockwave/ripple effect expanding from primary target

**Cards using Splash:**
- Barrage (currently only one)
- Future design space: AOE explosions, energy waves

---

### MARKED (Status Effect)
**Definition:** Drone has been marked for targeting by marking payoff cards.

**Visual indicator:** **Target lock icon permanently displayed on marked drone**
- Always visible (both players can see marked drones)
- Persists until removed or drone destroyed
- Clear UI affordance (red reticle overlay?)

**Mark duration:**
- **Persists until end of round** (default)
- OR **removed by card effect** (future anti-mark cards?)
- OR **drone is destroyed**

**Mark limit:**
- No limit on number of marked drones (can mark entire enemy board)
- Ship ability determines marking rate

---

## Visual Effects Specification

### Visual Effect Categories

**Category 1: Single-Target Beams**
- Laser Blast: Red laser beam (existing LASER_BLAST)
- Piercing Shot: Purple/magenta piercing lance (NEW - needs distinct color)
- Railgun Strike: Electric blue/cyan massive beam with overflow continuation (NEW)

**Category 2: Projectile/Missiles**
- Target Lock: Guided missile with lock-on reticle (NEW)
- Sidewinder: Multiple blue/white missiles weaving to slow targets (UPDATE from ENERGY_WAVE)
- Shrieker: Fast missile swarm, bright white/silver (NEW)

**Category 3: Multi-Target/Area**
- Strafe Run: Fighter craft flyby with bullet tracers to 3 lanes (NEW)
- Barrage: Artillery shell with shockwave splash (NEW)
- Nuke: Mushroom cloud (existing NUKE_BLAST - keep)
- Purge Protocol: Orbital bombardment on all marked (NEW)

**Category 4: Convergent Effects**
- Overwhelming Force: Multiple beams from friendly drones converge (NEW)
- Finishing Volley: Rapid-fire burst converging on exhausted target (NEW)

### Visual Priority/Timing
1. Targeting indicators appear (show affected drones)
2. Projectile/effect animation plays
3. Impact effects (explosions, damage numbers)
4. Status changes (drone destroyed, marked applied, etc.)
5. Overflow/splash secondary effects if applicable

---

## Action Economy Analysis Framework

### How to Evaluate Card Value

**Formula:** `Action Value = (Enemy Actions Denied) - (Your Actions Spent)`

**Examples:**

**Strafe Run:**
- You spend: 1 action
- Kills 3 small drones: Denies 3 future actions
- **Action advantage: +2** (amazing!)

**Finishing Volley:**
- You spend: 1 action
- Destroys exhausted drone: Denies 0 current actions (already acted) but prevents next-turn action
- **Action advantage: Neutral** (but tempo-positive on energy)

**Laser Blast:**
- You spend: 1 action
- Chips drone: Denies 0 actions (doesn't kill)
- **Action advantage: Negative** (you acted, they keep acting)
- Only action-neutral if it kills

### Action Economy Tiers

**S-Tier (Action Positive):**
- Cards that can deny 2+ actions for 1 card played
- Examples: Strafe Run, Shrieker Missiles, Purge Protocol

**A-Tier (Action Neutral):**
- 1-for-1 trades (destroy 1 ready drone)
- Examples: Target Lock, Overwhelming Force

**B-Tier (Action Negative, Tempo Positive):**
- Don't deny actions immediately but gain energy efficiency
- Examples: Finishing Volley (destroys exhausted), Laser Blast (chip damage)

---

## Design Decisions Log

### Key Decisions Made

**1. Laser Blast: 3 → 2 cost**
- **Rationale:** At 3 cost, always tempo-negative. At 2 cost, becomes cheap reliable interaction. Mark bonus keeps it relevant.
- **Impact:** Fills out 2-cost slot, makes early interaction possible.

**2. Target Lock: 6 → 3 cost**
- **Rationale:** At 6 cost, too expensive even in marking deck. At 3 cost, becomes core archetype payoff. Marking requirement gates power.
- **Impact:** Makes marking archetype viable. Risk (can brick) vs reward (cheap destroy).

**3. Cleanup Crew renamed to Finishing Volley, 2 cost**
- **Rationale:** Reactive removal should be cheap. Action-neutral but tempo-positive.
- **Impact:** Rewards reactive play, punishes aggressive attackers.

**4. Overwhelming Force: Lane-based, not all drones**
- **Rationale:** Original version (all drones) would be 8-15 damage. Lane-based = 2-4 damage (balanced).
- **Impact:** Rewards lane commitment (aggro theme), not just "have drones anywhere."

**5. Overwhelming Force: 6 → 5 cost**
- **Rationale:** 3-5 damage for 6 cost is overpriced. 5 cost is fair for situational scaling effect.
- **Impact:** Makes card playable in swarm decks as Heavy Fighter answer.

**6. "Go Again" economy**
- **Decision:** Worth approximately +1 cost OR -1 effect value
- **Rationale:** Keeping initiative is powerful in I-go-you-go system
- **Not applied yet:** No ordnance cards currently have "go again" (intentional - ordnance is powerful enough)

**7. Marking as core aggro theme**
- **Decision:** Marking is THE aggro conditional, not one of many
- **Rationale:** Gives archetype identity, creates deckbuilding decisions
- **Implementation:** 4 cards have mark synergy (Laser Blast, Target Lock, Railgun, Purge)

### Open Questions for Playtesting

**1. Mark source balance:**
- How expensive should ship marking ability be? (1 or 2 energy?)
- Should marking be single-target or lane-wide?
- How many marking drones are needed to support archetype?

**2. Splash implementation:**
- Positional (specific adjacent positions) or all-in-lane?
- Does splash damage count for action economy?

**3. Overflow balance:**
- Is 2 piercing + overflow for 5 cost fair?
- Should overflow have cap/limit?

**4. High-cost card viability:**
- Are 7-8 cost cards playable in "3-4 cards per turn" economy?
- Do they need "go again" or cost reduction conditionals?

**5. Speed-filtered cards:**
- With Shrieker (kills fast) and Sidewinder (damages slow), is speed meta balanced?
- Do we need more speed-agnostic options?

---

## Implementation Checklist

### Phase 1: Game Engine - Marking System
- [ ] Add `marked` boolean to drone game state
- [ ] This means that drones can only be marked once. 
- [ ] Implement mark application function
- [ ] Implement mark removal (the mark is removed from the drone when it is destroyed - cards in the future may also be able to remove marks from targets)
- [ ] Add UI visual indicator (target lock icon on marked drones)
- [ ] Update targeting validation (cards that require marked targets)
- [ ] Add a new Ship Cards that allows for the makring of drones. Base this off the existing Bridge card, but it has a different Ship abiility that costs 2 energy and marks any valid target enemy drone (i.e., it is not already marked). The ability can be called Target Lock. 

### Phase 2: Game Engine - New Keywords
- [ ] **OVERFLOW:** Implement damage overflow calculation
- [ ] **OVERFLOW:** Route excess damage to ship section in lane
- [ ] **OVERFLOW:** Visual effect continuation to ship
- [ ] **SPLASH:** Define adjacency rules (all-in-lane vs positional)
- [ ] **SPLASH:** Implement splash damage to adjacent drones
- [ ] **SPLASH:** Visual shockwave effect

### Phase 3: Card Data Updates
- [ ] Update Laser Blast: Cost 3→2, add marked conditional
- [ ] Update Target Lock: Cost 6→3, change to marked-only targeting
- [ ] Keep Piercing Shot as-is (verify maxInDeck, cost)
- [ ] Keep Shrieker Missiles as-is
- [ ] Keep Sidewinder Missiles as-is
- [ ] Keep Nuke as-is
- [ ] Move System Sabotage from Ordnance to Tactics category

### Phase 4: New Card Implementation
- [ ] Create Finishing Volley (2 cost, destroy exhausted)
- [ ] Create Strafe Run (4 cost, 3 targets different lanes)
- [ ] Create Barrage (4 cost, splash, conditional)
- [ ] Create Railgun Strike (5 cost, overflow, marked bonus)
- [ ] Create Overwhelming Force (5 cost, lane-based scaling)
- [ ] Create Purge Protocol (7 cost, mass marked destroy)

### Phase 5: Visual Effects
- [ ] **Finishing Volley:** Rapid-fire burst converging on target
- [ ] **Piercing Shot:** Change LASER_BLAST to purple/magenta piercing beam
- [ ] **Target Lock:** Guided missile with lock-on reticle
- [ ] **Sidewinder:** Change ENERGY_WAVE to missile swarm animation
- [ ] **Strafe Run:** Fighter craft flyby with tracers
- [ ] **Barrage:** Artillery shell + shockwave splash
- [ ] **Shrieker:** Fast missile swarm (white/silver)
- [ ] **Railgun Strike:** Massive beam with overflow continuation
- [ ] **Overwhelming Force:** Convergent beams from friendly drones
- [ ] **Purge Protocol:** Orbital bombardment on all marked
- [ ] **Marked status:** Target lock icon overlay on marked drones

### Phase 6: Ship Section Update
- [ ] Update Bridge card to have marking ability
- [ ] Define marking cost (1-2 energy, TBD)
- [ ] Define marking scope (single target vs lane-wide)
- [ ] Implement marking action in game engine
- [ ] UI for marking action selection

### Phase 7: Marking Drone Cards (Optional - Phase 1.5)
- [ ] Design 2-3 drones with marking abilities
- [ ] Decide on marking trigger (on attack, on deploy, active ability)
- [ ] Implement drone marking logic
- [ ] Balance marking frequency vs payoff strength

### Phase 8: Testing & Balance
- [ ] Test marking archetype viability (ship ability + 4 payoff cards)
- [ ] Validate action economy assumptions (Strafe Run worth 4 cost?)
- [ ] Test high-cost cards (Purge at 7, Nuke at 8 - are they playable?)
- [ ] Balance mark sources (too easy to mark? too hard?)
- [ ] Iterate on costs/effects based on play data

---

## Next Steps

**Immediate priorities:**
1. Implement marking system (game engine + UI)
2. Update existing 6 ordnance cards in cardData.js
3. Create 6 new ordnance cards with full specifications
4. Design visual effects for new mechanics (overflow, splash, marked status)

**Secondary priorities:**
5. Design marking drones (2-3 cards)
6. Update Bridge ship section with marking ability
7. Implement overflow and splash keywords
8. Create visual effects for all new cards

**Playtesting goals:**
- Validate "intentionally weak base + strong conditional" philosophy
- Test marking archetype competitiveness
- Balance mark sources vs payoffs
- Confirm action economy assumptions

---

## File Structure for Implementation

**Card data:**
- `src/data/cardData.js` - Update all 12 ordnance cards here

**Game logic:**
- `src/engine/gameLogic.js` - Add marking, overflow, splash logic
- `src/engine/ActionProcessor.js` - Handle new card effects

**Visual effects:**
- `src/hooks/useAnimationSetup.js` - Register new visual effects
- `src/components/effects/` - Create new effect components

**Ship sections:**
- `src/data/shipData.js` - Update Bridge card

**Drone cards (future):**
- `src/data/droneData.js` - Add marking drones

---

## Appendix: Complete Card Specifications (JSON Format)

### Example card specification ready for cardData.js:

```javascript
{
  id: 'CARD_NEW_001',
  baseCardId: 'CARD_NEW_001',
  name: 'Finishing Volley',
  maxInDeck: 4,
  type: 'Ordnance',
  cost: 2,
  image: '/DroneWars/cards/FinishingVolley.png',
  description: 'Destroy target exhausted enemy drone.',
  visualEffect: {
    type: 'FINISHING_VOLLEY',
    duration: 600
  },
  targeting: {
    type: 'DRONE',
    affinity: 'ENEMY',
    location: 'ANY_LANE',
    custom: ['EXHAUSTED']
  },
  effect: {
    type: 'DESTROY',
    scope: 'SINGLE'
  }
}
```

*(Full JSON for all 12 cards to be added during implementation phase)*

---

**End of Design Session Documentation**
