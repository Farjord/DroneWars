# Drone Wars - Card Design Framework

## Table of Contents
1. [Core Design Pillars](#core-design-pillars)
2. [Card Philosophy](#card-philosophy)
3. [Deck Construction System](#deck-construction-system)
4. [Archetype Development Strategy](#archetype-development-strategy)
5. [Conditional Design Patterns](#conditional-design-patterns)
6. [Design Constraints](#design-constraints)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Core Design Pillars

### Strategic Experience Goals
**What "outsmarting" means in Drone Wars:**
- React and adapt to opponent's plays each round
- Each round presents a fresh tactical puzzle (not slow resource grind)
- Lure opponents into mistakes through hidden card information
- Force difficult decisions through card timing and sequencing

**Action Phase Structure:**
- I-go-you-go turn order (chess-like, not "all my actions then yours")
- Player acts → Opponent acts → Repeat until both pass
- "Go Again" mechanics allow action chains
- Visible board state + Hidden hand = Calculable threats vs Unknown answers

**Critical UX Constraint:**
- ❌ **NO interrupt mechanics** - Clean online experience
- All cards are proactive (play on your turn) or reactive (respond on your turn to what already happened)
- No "do you want to respond?" prompts that reveal information

### Why This Matters
The game skips the "slow build-up" phase common in other card games. Players immediately have a developed board state (drones deployed, ship sections placed) and must solve the tactical puzzle of breaking through opponent defenses while protecting their own ship.

---

## Card Philosophy

### Base Effect + Conditional Bonus Design
**Core Pattern:** Every card has two parts
- **Base effect:** Always works, decent efficiency
- **Conditional bonus:** Triggers under specific circumstances, high impact

**Why this pattern:**
- ✅ Prevents dead draws (always playable)
- ✅ Creates skill testing (optimal timing decisions)
- ✅ Enables strategic depth (set up conditions or play for value now?)
- ✅ Supports both proactive and reactive play patterns

**Example Structure:**
```
Card Name (Cost: X energy)
Base: [Reliable effect that's always useful]
Conditional: [If condition met, additional powerful effect]
```

### Cards Per Turn Economy
**Target: 3-4 cards played per turn**

**Reasoning:**
- Energy economy: Players need energy for drone deployments each round
- 3-4 cards represents spare energy after deployment commitments
- Playing all 5 cards requires either:
  - Sacrificing deployments (tactical choice)
  - Being ahead on board (reward for success)

**Impact on Design:**
- Cards must have meaningful impact (high action density)
- Energy costs must create real trade-offs
- Conditional bonuses should be worth building around

### Direct Ship Damage Restriction
**Rule:** Direct ship damage must be heavily restricted

**Why:**
- Bypassing drone combat makes the 3-lane system irrelevant
- Creates uninteractive gameplay (can't respond to face damage)
- Reduces strategic depth to "burn opponent faster"

**Allowed exceptions (1-2 cards max):**
- Extremely hard conditions ("If opponent's ship is below 10 hull...")
- Requires significant setup/sacrifice
- Acts as finisher, not primary strategy

**Preferred alternatives:**
- "Make drones unblockable/evasive" (damage through drones)
- "Sacrifice drones for burst damage" (requires board investment)
- "Bypass one interceptor" (tactical advantage, not full bypass)

---

## Deck Construction System

### Deck Composition Rules
**Total deck size:** 30 cards

**Category Limits:**
| Category | Max Cards | Purpose |
|----------|-----------|---------|
| **Ordnance** | 10 | Direct damage, destroy effects, ship damage |
| **Tactics** | 10 | Buffs, movement, tempo, positioning |
| **Support** | 10 | Draw, energy, healing, shields |
| **Upgrades** | 6 | Permanent drone modifications |
| **Total** | 36 max | Forces 6-card prioritization |

**Flex Space:** 6 cards (36 max - 30 deck = cannot max all categories)

### Category Definitions

**ORDNANCE (Weapons/Destruction)**
- Direct damage spells (to drones)
- Destroy effects (conditional removal)
- Limited ship section damage (heavily restricted)
- Examples: Laser Blast, Nuke, Piercing Shot, Target Lock

**TACTICS (Positioning/Tempo)**
- Stat buffs/debuffs (temporary and permanent)
- Movement cards (reposition, maneuver)
- Ready/Exhaust effects (action economy)
- Speed manipulation
- Examples: Overcharge, Reposition, Adrenaline Rush, Boosters, Streamline

**SUPPORT (Resources/Defense)**
- Card draw
- Energy generation
- Healing (drones and ship sections)
- Shield allocation/restoration
- Examples: System Reboot, Energy Surge, Emergency Patch, Shield Recharge

**UPGRADES (Permanent Modifications)**
- Drone stat increases (attack, speed, shields, hull)
- Drone ability additions (piercing, keywords)
- Deployment modifications (cost reduction, limit increases)
- Examples: Combat Enhancement, Overclocked Thrusters, Efficiency Module

### Card Quantity Limits

**Variable max counts per unique card:**
- **4x copies allowed:** Staples (simple, reliable, everyone wants)
- **2x copies allowed:** Strategic choices (strong in right deck)
- **1x copies allowed:** Silver bullets (niche answers, build-arounds)

**Why variable limits:**
- Creates consistency vs power trade-off
- Prevents "30 best cards" mentality
- Forces meaningful deckbuilding decisions
- Enables niche answers without warping metagame

### Design Reasoning

**Q: Why 10/10/10/6 limits?**
- **Upgrades limited to 6:** More powerful (permanent effects), need restriction for diversity
- **Others at 10:** Forces archetype identity through category prioritization
- **6-card flex:** Creates deckbuilding tension (can't be good at everything)

**Archetype Identity Through Limits:**
- **Aggro:** Max Ordnance (10), light Support (6) = offensive focus
- **Control:** Max Support (10), light Ordnance (6) = defensive focus
- **Midrange:** Balanced (8/8/8/6) = adaptable
- **Combo:** Max Tactics (10) = setup-focused

---

## Archetype Development Strategy

### Phased Implementation Approach

**Phase 1: Single Archetype Proof of Concept** *(Current Goal)*
- Create one complete, refined archetype deck (30 cards)
- Goal: Playable in multiplayer and vs AI
- Test all systems: categories, conditionals, limits
- Validate fun factor and strategic depth

**Phase 2: Archetype Expansion**
- Add 10-15 more cards within same archetype
- Create deckbuilding choices (not auto-includes)
- Test diversity within single strategy

**Phase 3: New Archetypes**
- Repeat Phase 1-2 for next archetype
- Ensure counter-play exists between archetypes
- Build toward multi-archetype metagame

**Phase 4: Long-term (No specific target)**
- Expand card pool as needed
- Add niche answers and tech cards
- Support emergent strategies

### Archetype Categories

**Must Eventually Support:**

**1. Aggro Variants**
- **Suicide Aggro:** Ship hull as resource (deal damage to own ship for advantage)
- **Sacrifice Aggro:** Kamikaze-style (drones that die for value)
- **Discard Aggro:** Hand size as resource (discard for power)
- **All-In Aggro:** Tempo costs (sacrifice future turns for burst)

**2. Control**
- Survives early pressure via defense/healing
- Builds toward upgrade-powered late game
- Catch-up mechanics when behind (Desperate Measures style)

**3. Midrange**
- Toolbox approach (answers to various threats)
- Balanced resource allocation
- Adapts to opponent's strategy

**4. Combo**
- Synergistic explosions (cards that combo together)
- Collection payoffs (accumulate cards/board for big turn)
- Drone synergy engines (specific drone interactions)

### Why This Approach
- **Focused development:** Perfect one deck before expanding
- **Validate systems:** Test framework with real play
- **Avoid scope creep:** Don't design 60 cards that need rebalancing
- **Iterative refinement:** Learn from each archetype before next

---

## Conditional Design Patterns

### Types of Conditions

**Board State Conditions:**
- Drone count (in lane, total, enemy vs friendly)
- Drone states (exhausted, damaged, speed thresholds)
- Lane commitment (3+ drones in one lane)
- Positional advantage (middle lane, outer lanes)

**Game State Conditions:**
- Ship damage (damaged sections, critical sections)
- Resource states (low energy, empty hand)
- Turn timing (first action, after opponent's turn)
- Round number (early game, late game)

**Action-Based Conditions:**
- "If a drone attacked this turn"
- "If opponent played a card"
- "If you dealt damage to your ship this turn"
- "If a drone moved this round"

**Reactive Punishers (Opponent's Past Actions):**
- Target exhausted drones (punish attacking)
- "If opponent has 2 or less energy" (punish over-spending)
- "If opponent has 3+ drones in a lane" (punish clustering)
- "If opponent has 5+ cards" (punish hoarding)

**Proactive Threats (Set Up Pressure):**
- Ongoing effects that opponent must respect
- "Place a mine token - triggers when attacked"
- "Drones gain [bonus] until end of round"
- Create board states opponent must navigate

### Power Level Scaling

**Conditional Bonus Size: Variable by difficulty**

**Easy to trigger conditions:**
- Modest bonus (~50% better)
- Example: "Deal 2 damage. If target is damaged, deal 3 instead."

**Moderate conditions:**
- Double value (~100% better)
- Example: "Draw 1 card. If you have 3 or fewer cards in hand, draw 2 instead."

**Hard conditions:**
- Game-changing (~200-300% better)
- Example: "Deal 2 damage to target drone. If it attacked this turn, destroy it instead."

**Framework: Balance base cost first, then scale bonuses**
- Establish baseline efficiency for each card type
- Tune conditional bonuses through playtesting
- Harder conditions justify bigger swings

---

## Design Constraints

### The Speed Problem

**Issue Identified:**
- Speed determines turn order (fast drones act first, always)
- First strike advantage (kill threats before they act)
- Creates deckbuilding tax (must bring fast drones to compete)
- Reduces strategic diversity

**How Card Framework Addresses This:**

**1. Conditional Cards Create Speed Counters:**
- "Destroy target exhausted drone" (punishes fast attackers after they act)
- "If target drone has speed 5+, destroy it" (Shrieker Missiles pattern)
- "Slow drones gain +3 attack" (reward for playing slow)

**2. Category Limits Force Trade-offs:**
- Can't run all anti-speed cards AND all speed cards
- Must choose: speed-based aggro OR anti-speed control

**3. Deckbuilding Answers:**
- Players facing speed-heavy opponents can tech in answers
- Ordnance category includes anti-speed removal
- Tactics category includes speed buffs for reactive plays

**Philosophy:** Speed advantage should be counterable through skilled deckbuilding and card play, not insurmountable structural advantage.

### Other Critical Constraints

**No Interrupt Mechanics**
- Reason: Clean online UX (no "opponent might have answer" waiting)
- Impact: Cards must be proactive or reactive, never instant-speed
- Design around: Set up threats on your turn, punish past actions on your turn

**High Action Density Required**
- Reason: 3-4 cards played per turn = high decision frequency
- Impact: Cards must feel impactful individually
- Design around: Strong base effects + meaningful conditional bonuses

**Limited Direct Damage**
- Reason: Preserve drone combat interaction
- Impact: Win conditions must involve board
- Design around: Evasion, sacrifice, unblockable effects instead of direct burn

---

## Implementation Roadmap

### Immediate Next Steps (Phase 1)

**1. Audit Existing 30 Cards**
- Categorize into Ordnance/Tactics/Support/Upgrades
- Identify which need conditional redesigns
- Mark card quantity limits (1x/2x/4x)
- Find gaps in functionality

**2. Choose Target Archetype**
- Select first archetype to fully develop (Aggro? Control?)
- Define that archetype's strategy clearly
- List required card types (removal, reach, resources, etc.)

**3. Design Missing Cards**
- Fill gaps for chosen archetype
- Use base + conditional pattern
- Respect category limits and quantities
- Aim for 30-card complete deck

**4. Playtest & Iterate**
- Test deck vs itself in multiplayer
- Test deck vs AI
- Validate fun factor and strategic depth
- Tune power levels and conditional triggers

### Success Criteria (Phase 1 Complete)

✅ One archetype fully supported (30 viable cards)
✅ Games feel strategic (luring opponents into mistakes works)
✅ Category limits create meaningful deckbuilding choices
✅ Conditional cards prevent dead draws while rewarding setup
✅ Speed is counterable (not dominant strategy)
✅ Fun to play repeatedly (doesn't feel solved)

### Future Considerations (Post-Phase 1)

**Card Pool Expansion:**
- Eventually need 50-60 unique cards for multi-archetype diversity
- Each category should have 10-12+ unique options
- Enable counter-strategies and tech choices

**Ship Section Design Space:**
- Future: Ship sections that modify category limits
  - "Your deck can contain up to 12 Ordnance cards"
  - "Support cards cost 1 less energy"
- Enables build-around strategies

**Upgrade Design Space:**
- More drone-specific upgrades
- Conditional upgrades ("If this drone is in middle lane...")
- Build-around payoff upgrades

---

## Open Questions & Future Design

### To Be Determined Through Playtesting

**Conditional Power Levels:**
- How strong should conditional bonuses be?
- Does this vary by card type/cost?
- Need empirical data from games

**Energy Economy:**
- Is 3-4 cards/turn the right target?
- Do energy costs create enough tension?
- Should conditional bonuses cost extra energy?

**Category Balance:**
- Are 10/10/10/6 limits correct?
- Do archetypes emerge naturally?
- Does flex space create meaningful choices?

**Speed Counter-play:**
- Are conditional cards enough to balance speed?
- Need specific anti-speed staples?
- Should drones have more speed variance?

### Design Space to Explore Later

**Alternative Costs:**
- Cards that cost ship hull instead of energy
- Cards that require drone sacrifices
- Cards that exile themselves (one-time use)

**Triggered Abilities:**
- "When you draw this card, [effect]"
- "When this enters hand, you may reveal it for [effect]"
- "At start of round, if in hand, [effect]"

**Multi-Stage Cards:**
- Cards that set up payoffs for later turns
- Token creation (mines, buffs, markers)
- Delayed triggers

---

## Document History

**Version 1.0** - Initial framework established
- Core design pillars defined
- Deck construction system created
- Phased implementation strategy set
- Focus: Single archetype proof of concept

---

*This document is a living reference and will be updated as the card system evolves through playtesting and iteration.*
