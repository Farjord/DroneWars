# Card Designer's Guide

A comprehensive reference for designing Action Cards, Drones, and Tech entities using the implemented effect, trigger, targeting, and ability systems.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Action Card Schema](#2-action-card-schema)
3. [Drone Schema](#3-drone-schema)
4. [Tech Schema](#4-tech-schema)
5. [Effect Types Reference](#5-effect-types-reference)
6. [Targeting System](#6-targeting-system)
7. [Damage Types](#7-damage-types)
8. [Conditional Effects System](#8-conditional-effects-system)
9. [Trigger System](#9-trigger-system)
10. [Drone Ability Types](#10-drone-ability-types)
11. [Cross-Reference System](#11-cross-reference-system)
12. [Movement Effect Details](#12-movement-effect-details)
13. [Repeating Effects](#13-repeating-effects)
14. [Play Conditions and Special Flags](#14-play-conditions-and-special-flags)
15. [Visual Effects](#15-visual-effects)
16. [UI Considerations](#16-ui-considerations)
17. [Keywords Reference](#17-keywords-reference)
18. [Design Constraints and Balance Notes](#18-design-constraints-and-balance-notes)

---

## 1. Overview

Drone Wars has three entity types that a designer can create:

| Entity | Definition File | Purpose |
|-|-|-|
| Action Cards | `src/data/cardData.js` | Played from hand during the action phase; one-shot effects |
| Drones | `src/data/droneData.js` | Persistent units deployed to lanes; attack, defend, trigger abilities |
| Tech | `src/data/techData.js` | Persistent lane structures; passive auras or triggered effects |

### How Effects Flow

```
Data definition (cardData / droneData / techData)
  → EffectRouter.js (maps effect type → processor)
    → Individual processors (DamageEffectProcessor, MovementEffectProcessor, etc.)
      → State mutation + animation triggers
```

**EffectRouter** is the single authority on which effect types are supported. Every `type` value in an effect object must map to a handler in EffectRouter. If it doesn't route, the effect silently fails.

For multi-effect cards, **EffectChainProcessor** orchestrates sequential execution, handling targeting selections, conditional evaluation, cross-references between effects, and position tracking.

For triggered abilities, **TriggerProcessor** listens for game events and fires matching trigger abilities, routing their effects through EffectRouter.

---

## 2. Action Card Schema

### Property Table

| Property | Type | Required | Description |
|-|-|-|-|
| id | string | Yes | Unique identifier, UPPER_SNAKE_CASE |
| baseCardId | string | Yes | Groups base + enhanced variants together (same value for both) |
| name | string | Yes | Display name. Enhanced variants use "Name+" convention |
| type | string | Yes | One of: `Ordnance`, `Support`, `Tactic`, `Upgrade` |
| cost | number | Yes | Energy cost to play |
| maxInDeck | number | Yes | Maximum copies allowed in a deck |
| rarity | string | Yes | `Common`, `Uncommon`, `Rare` |
| image | string | Yes | Path to card image |
| description | string | Yes | Player-facing description text |
| effects | array | Yes | Array of effect objects (see Section 5) |
| visualEffect | object | No | `{ type: string }` — animation on play (see Section 15) |
| momentumCost | number | No | Additional momentum required to play (see Section 14) |
| playCondition | object | No | Conditions that must be met to play (see Section 14) |
| aiOnly | boolean | No | If true, only available to AI opponents |
| subType | string | No | Currently only `Mine` for mine cards |

### Upgrade-Specific Properties

| Property | Type | Required | Description |
|-|-|-|-|
| slots | number | Yes | Number of upgrade slots consumed on the target drone |
| maxApplications | number | Yes | Maximum times this upgrade can be applied to one drone |

Upgrade cards target a friendly drone and apply persistent stat modifications.

### Enhanced Variant Pattern

Enhanced cards follow a strict convention:

- **ID**: Append `_ENHANCED` to the base card ID (e.g., `BARRAGE_ENHANCED`)
- **Name**: Append `+` to the base name (e.g., `Barrage+`)
- **baseCardId**: Must match the base card's `baseCardId` (shared between both)
- Enhanced variants typically have stronger values, reduced costs, or additional effects

### Annotated Example: Condemnation Ray

```javascript
{
  id: 'CONDEMNATION_RAY',
  baseCardId: 'CONDEMNATION_RAY',
  name: 'Condemnation Ray',
  maxInDeck: 1,
  rarity: 'Rare',
  type: 'Ordnance',
  cost: 4,
  image: '/DroneWars/cards/OpportunistStrike.png',
  description: 'Deal 2 damage. +2 if target is marked. If destroyed, gain 4 energy.',
  visualEffect: { type: 'LASER_BLAST' },
  effects: [{
    type: 'DAMAGE',
    value: 2,
    targeting: { type: 'DRONE', affinity: 'ENEMY', location: 'ANY_LANE' },
    conditionals: [
      {
        // PRE conditional: checked BEFORE damage resolves
        id: 'marked-bonus',
        timing: 'PRE',
        condition: { type: 'TARGET_IS_MARKED' },
        grantedEffect: { type: 'BONUS_DAMAGE', value: 2 },
      },
      {
        // POST conditional: checked AFTER damage resolves
        id: 'energy-on-destroy',
        timing: 'POST',
        condition: { type: 'ON_DESTROY' },
        grantedEffect: { type: 'GAIN_ENERGY', value: 4 },
      },
    ],
  }],
}
```

This card demonstrates both PRE and POST conditional timing on a single effect:
- The PRE conditional adds bonus damage if the target is marked (evaluated before damage)
- The POST conditional grants energy if the target was destroyed (evaluated after damage)

---

## 3. Drone Schema

### Property Table

| Property | Type | Required | Description |
|-|-|-|-|
| name | string | Yes | Display name |
| class | number | Yes | 0–4. Determines power tier and rebuild rate |
| limit | number | Yes | Maximum copies deployable at once |
| rebuildRate | number | Yes | How many copies rebuild per round |
| rarity | string | Yes | `Common`, `Uncommon`, `Rare` |
| attack | number | Yes | Base attack damage |
| hull | number | Yes | Base hull points |
| shields | number | Yes | Base shield points |
| speed | number | Yes | Base speed (determines attack/intercept order) |
| image | string | Yes | Path to drone image |
| abilities | array | Yes | Array of ability objects (see Section 10) |
| upgradeSlots | number | Yes | Number of upgrade slots available |
| damageType | string | No | Override damage type (default: NORMAL). See Section 7 |
| selectable | boolean | No | If false, cannot be added to decks (token drones) |
| cost | number | No | Used for token drones created by cards |

### Class / Rebuild Rate Guidelines

| Class | Typical Rebuild Rate | Role |
|-|-|-|
| 0 | 2.0 | Swarm fodder — cheap, expendable, high limit |
| 1 | 1.0–2.0 | Light skirmishers — fast, fragile |
| 2 | 0.5–1.0 | Versatile mid-range — balanced stats |
| 3 | 0.5–1.0 | Heavy hitters or tanks — specialized roles |
| 4 | 0–0.5 | Capital drones — powerful but slow to rebuild |

### Annotated Example: Bastion (PASSIVE)

```javascript
{
  name: 'Bastion',
  class: 3,
  limit: 2,
  rebuildRate: 0.5,
  rarity: 'Uncommon',
  attack: 1,
  hull: 4,
  shields: 0,
  speed: 1,
  image: '/DroneWars/img/Guardian.png',
  abilities: [{
    name: 'Guardian Protocol',
    description: 'The ship section in this lane cannot be targeted by attacks while this drone is active.',
    type: 'PASSIVE',
    effect: { type: 'GRANT_KEYWORD', keyword: 'GUARDIAN' }
  }],
  upgradeSlots: 1
}
```

Bastion's passive ability grants the GUARDIAN keyword, which protects the ship section behind it from direct attacks.

### Annotated Example: Specter (TRIGGERED)

```javascript
{
  name: 'Specter',
  class: 1,
  limit: 3,
  rebuildRate: 1.0,
  rarity: 'Common',
  attack: 1,
  hull: 1,
  shields: 1,
  speed: 1,
  image: '/DroneWars/img/PhaseJumper.png',
  abilities: [{
    name: 'Phase Shift',
    description: 'After this drone moves, permanently gain +1 Attack and +1 Speed.',
    type: 'TRIGGERED',
    trigger: 'ON_MOVE',
    triggerTiming: 'ANY_TURN',
    effects: [
      { type: 'MODIFY_STAT', mod: { stat: 'attack', value: 1, type: 'permanent' }, effectTarget: 'TRIGGER_OWNER' },
      { type: 'MODIFY_STAT', mod: { stat: 'speed', value: 1, type: 'permanent' }, effectTarget: 'TRIGGER_OWNER' }
    ]
  }],
  upgradeSlots: 2
}
```

Specter triggers ON_MOVE (a self-scope trigger), permanently buffing itself each time it moves.

---

## 4. Tech Schema

### Property Table

| Property | Type | Required | Description |
|-|-|-|-|
| name | string | Yes | Display name |
| hull | number | Yes | Hit points (typically 1) |
| image | string | Yes | Path to tech image |
| selectable | boolean | Yes | Always false — tech is created by cards, not deployed directly |
| maxPerLane | number | Yes | Maximum instances per lane (typically 1) |
| isToken | boolean | Yes | Always true |
| isTech | boolean | Yes | Always true |
| subType | string | No | `mine` for mine-type tech; omitted for non-mines |
| abilities | array | Yes | Array of ability objects |

### Mine vs Non-Mine

| Category | Tech Entities | Key Trait |
|-|-|-|
| Mines | Proximity Mine, Inhibitor Mine, Jitter Mine | `subType: 'mine'`, triggered by enemy lane events, typically `destroyAfterTrigger: true` |
| Structures | Rally Beacon, Jammer, Thruster Inhibitor, Repair Relay, Shield Array | No subType, provide persistent passive or triggered effects |

### Example: Proximity Mine (Triggered Mine)

```javascript
{
  name: 'Proximity Mine',
  hull: 1,
  selectable: false,
  maxPerLane: 1,
  isToken: true,
  isTech: true,
  subType: 'mine',
  abilities: [{
    name: 'Proximity Detonation',
    description: 'Explodes when an enemy drone moves into this lane, dealing 4 damage.',
    type: 'TRIGGERED',
    trigger: 'ON_LANE_MOVEMENT_IN',
    triggerOwner: 'LANE_ENEMY',
    triggerTiming: 'ANY_TURN',
    destroyAfterTrigger: true,
    effects: [{ type: 'DAMAGE', value: 4, effectTarget: 'TRIGGER_OWNER' }]
  }]
}
```

### Example: Shield Array (Passive Aura)

```javascript
{
  name: 'Shield Array',
  hull: 1,
  selectable: false,
  maxPerLane: 1,
  isToken: true,
  isTech: true,
  abilities: [{
    name: 'Shield Amplifier',
    description: 'All friendly drones in this lane gain +1 max shields.',
    type: 'PASSIVE',
    effect: {
      type: 'MODIFY_STAT',
      mod: { stat: 'shields', value: 1, type: 'permanent' },
      scope: 'FRIENDLY_IN_LANE'
    }
  }]
}
```

---

## 5. Effect Types Reference

All effect types routed by `EffectRouter.js`, grouped by category.

### Card / State Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| DRAW | `value: number` | NONE | Draw cards from deck |
| GAIN_ENERGY | `value: number` | NONE | Add energy to player's pool |
| READY_DRONE | — | DRONE | Remove exhaustion from target drone |

### Healing Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| HEAL_HULL | `value: number` | DRONE | Restore hull points |
| HEAL_SHIELDS | `value: number` | DRONE | Restore shield points |
| RESTORE_SECTION_SHIELDS | `value: number` | SHIP_SECTION | Restore shields to a ship section |

### Damage Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| DAMAGE | `value`, optional `damageType`, `markedBonus`, `exposedBonus` | DRONE or SHIP_SECTION | Deal damage to target. `markedBonus` adds extra damage if target is marked; `exposedBonus` adds extra if ship section hull is exposed |
| DAMAGE_SCALING | `source: string` | DRONE | Damage scales with a game-state value. `source: 'READY_DRONES_IN_LANE'` deals damage equal to ready friendly drones in the target's lane |
| SPLASH_DAMAGE | `primaryDamage`, `splashDamage`, optional `conditional` | DRONE | Deal `primaryDamage` to target and `splashDamage` to adjacent drones in lane. Optional `conditional: { type: 'FRIENDLY_COUNT_IN_LANE', threshold, bonusDamage }` increases damage when enough friendlies present |
| OVERFLOW_DAMAGE | `baseDamage`, `isPiercing`, optional `markedBonus` | DRONE | Deal damage to target; excess damage overflows to the ship section behind it. `isPiercing: true` bypasses shields |
| CONDITIONAL_SECTION_DAMAGE | `condition`, `damage`, `targets`, `damageType` | NONE or SHIP_SECTION | Deal damage to ship section(s) if condition is met. See details below |

#### CONDITIONAL_SECTION_DAMAGE Details

This effect checks a condition before dealing damage to one or more ship sections.

**Condition types:**

| Condition Type | Parameters | Description |
|-|-|-|
| CONTROL_LANES | `lanes: string[]`, `operator: 'ALL'` | Player must control all specified lanes (e.g., `['lane1', 'lane3']`) |
| CONTROL_LANE_EMPTY | `lane: 'TARGET'` | The targeted lane must have no enemy drones |

**Target values:**

| Value | Description |
|-|-|
| `FLANK_SECTIONS` | Both flank ship sections |
| `MIDDLE_SECTION` | The middle ship section |
| `CORRESPONDING_SECTION` | The section corresponding to the targeted lane |
| `ALL_SECTIONS` | All enemy ship sections |

**Targeting**: Uses `{ type: 'NONE' }` for auto-targeted effects or `{ type: 'SHIP_SECTION', affinity: 'ENEMY', restrictions: ['REQUIRES_LANE_CONTROL'], validSections: [...] }` for player-targeted effects.

### Destruction Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| DESTROY | `scope: 'SELF'` (optional) | DRONE or SELF | Destroy target drone outright |
| DESTROY_TECH | — | TECH | Destroy a tech entity |
| DESTROY_UPGRADE | — | DRONE | Remove an upgrade from target drone |

### Modification Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| MODIFY_STAT | `mod: { stat, value, type }` | DRONE | Modify a drone stat. `type`: `permanent` or `temporary` (end of turn) |
| MODIFY_DRONE_BASE | `mod: { stat, value }` | DRONE | Permanently modify a drone's base stat (for upgrades) |

### Movement Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| SINGLE_MOVE | `destination`, `properties[]`, `optional` | DRONE | Move a drone to another lane (see Section 12) |

### Meta Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| REPEATING_EFFECT | `effects[]`, `repeatCondition` | NONE | Execute sub-effects multiple times (see Section 13) |
| COMPOSITE_EFFECT | `effects[]` | varies | Bundle multiple effects as one logical unit |
| CREATE_TOKENS | `tokenName: string` | LANE | Create a token drone in target lane |
| CREATE_TECH | `techName: string` | LANE | Deploy a tech entity to target lane |
| SEARCH_AND_DRAW | `searchCount`, `drawCount`, `filter`, `shuffleAfter` | NONE | Search deck for matching cards and draw |
| DRAW_THEN_DISCARD | `drawCount`, `discardCount` | NONE | Draw cards then discard a specified number |

### Marking Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| MARK_DRONE | — | DRONE | Apply the MARKED status to a drone |

### Detection Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| INCREASE_THREAT | `value: number` | NONE (via effectTarget) | Increase threat level on the target's ship |

### Tactic Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| DISCARD | `count: number`, `targetPlayer` | NONE | Force discard from hand. `targetPlayer`: `opponent` or `self` |
| DISCARD_CARD | — | CARD_IN_HAND | Player selects a specific card to discard |
| DRAIN_ENERGY | `value: number` | NONE | Remove energy from opponent |
| STEAL_ENERGY | `value: number` | NONE | Remove energy from opponent and add to self |
| EXHAUST_DRONE | — | DRONE | Exhaust target drone |

### Status Effects

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| APPLY_CANNOT_MOVE | — | DRONE | Prevent target from moving |
| APPLY_CANNOT_ATTACK | — | DRONE | Prevent target from attacking |
| APPLY_CANNOT_INTERCEPT | — | DRONE | Prevent target from intercepting |
| APPLY_DOES_NOT_READY | — | DRONE | Prevent target from readying next round |
| APPLY_SNARED | — | DRONE | Apply Snared (cannot be used as move cost source) |
| APPLY_SUPPRESSED | — | DRONE | Apply Suppressed (combined attack + move restriction) |
| CLEAR_ALL_STATUS | — | DRONE | Remove all status effects from target |

### Control Flow Effects (Triggers Only)

These effect types are used exclusively within trigger ability effects, not in action cards:

| Type | Parameters | Targeting | Description |
|-|-|-|-|
| GO_AGAIN | — | — | Grant an additional action this turn |
| DOES_NOT_EXHAUST | — | TRIGGER_OWNER | Prevent the triggering drone from becoming exhausted |
| COUNTER_DAMAGE | `value: number` | — | Deal damage back to the attacker |

---

## 6. Targeting System

Every effect that requires target selection includes a `targeting` object.

### Targeting Type

| type | Description |
|-|-|
| DRONE | Target a specific drone |
| LANE | Target a lane (affects all drones matching filters) |
| SHIP_SECTION | Target a ship section |
| CARD_IN_HAND | Target a card in the player's hand |
| TECH | Target a tech entity |
| NONE | No target required (self-targeting or global effects) |

### Affinity

| affinity | Description |
|-|-|
| FRIENDLY | Only targets belonging to the card's controller |
| ENEMY | Only targets belonging to the opponent |
| ANY | Either player's targets |

### Location

| location | Description |
|-|-|
| ANY_LANE | Target can be in any lane |
| SAME_LANE | Target must be in the same lane as a prior selection |
| OTHER_LANES | Target must be in a different lane from prior selection |
| ADJACENT_TO_PRIMARY | Target lane must be adjacent to the primary target's lane |
| COST_SOURCE_LANE | The lane of the cost source drone |
| `{ ref: N, field: 'sourceLane' }` | Dynamic: the lane resolved from effect N's result (see Section 11) |
| `{ ref: N, field: 'destinationLane' }` | Dynamic: the destination lane from effect N's result (see Section 11) |

### Restrictions

Restrictions filter which targets are valid. They can be **string-based** or **object-based**.

#### String Restrictions

| Restriction | Description |
|-|-|
| `EXHAUSTED` | Target must be exhausted |
| `NOT_EXHAUSTED` | Target must not be exhausted |
| `MARKED` | Target must be marked |
| `NOT_MARKED` | Target must not be marked |
| `DAMAGED_HULL` | Target must have hull damage |
| `REQUIRES_LANE_CONTROL` | Player must control the lane (SHIP_SECTION targeting) |

#### Object Restrictions

| Type | Shape | Description |
|-|-|-|
| Stat comparison | `{ stat, comparison, value }` | e.g., `{ stat: 'class', comparison: 'LTE', value: 1 }` |
| Lane control | `{ type: 'IN_LANE_CONTROLLED_BY', controller }` | Target must be in a lane controlled by specified player |
| Lane not controlled | `{ type: 'IN_LANE_NOT_CONTROLLED_BY', controller }` | Target must be in a lane NOT controlled by specified player |
| Cross-ref stat | `{ type: 'STAT_COMPARISON', stat, comparison, reference: { ref, field }, referenceStat }` | Compare target's stat against a previously-selected target's stat |

**Comparison operators**: `LT`, `LTE`, `GT`, `GTE`

### Affected Filter

Used with LANE targeting to filter which drones in the lane are affected:

```javascript
affectedFilter: [{ stat: 'class', comparison: 'LTE', value: 1 }]
// or
affectedFilter: ['MARKED']
```

### Max Targets

```javascript
maxTargets: 2  // Allow selecting up to N targets
```

### Target Selection (Auto-Selection)

For effects that auto-select targets rather than prompting the player:

```javascript
targetSelection: {
  method: 'RANDOM',   // or 'HIGHEST' or 'LOWEST'
  stat: 'attack',     // stat to compare (for HIGHEST/LOWEST)
  count: 2            // number of targets to select
}
```

| Method | Description |
|-|-|
| RANDOM | Select N random valid targets |
| HIGHEST | Select N targets with the highest value of `stat` |
| LOWEST | Select N targets with the lowest value of `stat` |

### Ship Section Targeting: validSections

For `SHIP_SECTION` targeting, the optional `validSections` array restricts which sections can be selected:

```javascript
targeting: {
  type: 'SHIP_SECTION',
  affinity: 'ENEMY',
  restrictions: ['REQUIRES_LANE_CONTROL'],
  validSections: ['middle']  // Only the middle section is a valid target
}
```

### Jammer Protection

Drones with the JAMMER keyword have special targeting protection: opponent card effects can only target a Jammer while it is in the READY (non-exhausted) state. This is enforced during targeting validation.

---

## 7. Damage Types

### Card-Level Damage Types

Set via `damageType` on an effect or `damageType` on a drone definition:

| Type | Shield Interaction | Hull Interaction | Notes |
|-|-|-|-|
| NORMAL | Absorbed by shields first | Full damage to hull | Default if unspecified |
| KINETIC | Absorbed by shields first | Full damage to hull | Flavour variant of NORMAL |
| ION | Double damage to shields | No hull damage if shields remain | Anti-shield specialization |
| SHIELD_BREAKER | Bypasses shields entirely, damages hull | Full damage to hull | Ignores shield layer |
| PIERCING | Bypasses shields entirely, damages hull | Full damage to hull | Granted by PIERCING keyword |

### Drone-Level Damage Types

Drones can have an innate `damageType` property on their definition (e.g., `damageType: 'ION'`). This applies to all attacks made by that drone.

Additionally, the passive ability `GRANT_DAMAGE_TYPE` can override a drone's damage type:

```javascript
{
  type: 'PASSIVE',
  effect: { type: 'GRANT_DAMAGE_TYPE', damageType: 'SHIELD_BREAKER' }
}
```

### Special: DOGFIGHT and RETALIATE

These are internal damage types used by the counter-damage system (not assignable to cards or drones):

| Type | Description |
|-|-|
| DOGFIGHT | Counter-damage dealt by an interceptor drone during interception. Uses the interceptor's attack stat. Follows NORMAL shield/hull rules. |
| RETALIATE | Counter-damage dealt by a drone with a COUNTER_DAMAGE trigger ability when attacked. Follows NORMAL shield/hull rules. |

These types are used for animation labelling and logging — they do not alter shield/hull interaction rules. Designers do not need to set these directly; they are applied automatically by the combat system.

---

## 8. Conditional Effects System

Conditionals allow effects to have bonus or follow-up behavior based on game state.

### Shape

```javascript
conditionals: [{
  id: 'unique-id',           // Identifier for tracking
  timing: 'PRE' | 'POST' | 'PRE_TARGETING',
  condition: { type: '...', /* condition-specific params */ },
  grantedEffect: { type: '...', /* effect params */ },
  // OR for PRE_TARGETING:
  targetingOverride: { restrictions: [...] }
}]
```

### Timing

| Timing | When Evaluated | Purpose |
|-|-|-|
| PRE | Before the effect resolves | Modify effect values (bonus damage, override counts) |
| POST | After the effect resolves | Trigger follow-up effects based on outcome |
| PRE_TARGETING | Before target selection | Modify which targets are valid |

### PRE Conditions

| Condition Type | Parameters | Description |
|-|-|-|
| TARGET_IS_MARKED | — | Target has the MARKED status |
| TARGET_IS_EXHAUSTED | — | Target is exhausted |
| TARGET_IS_READY | — | Target is not exhausted |
| TARGET_STAT_GTE | `stat`, `value` | Target's stat >= value |
| TARGET_STAT_LTE | `stat`, `value` | Target's stat <= value |
| TARGET_STAT_GT | `stat`, `value` | Target's stat > value |
| TARGET_STAT_LT | `stat`, `value` | Target's stat < value |
| NOT_FIRST_ACTION | — | This is not the first action played this turn |
| SECTION_EXPOSED | `section` | Named ship section's hull is exposed (shields at 0) |

### POST Conditions

| Condition Type | Parameters | Description |
|-|-|-|
| ON_DESTROY | — | The target was destroyed by this effect |
| ON_HULL_DAMAGE | — | The target took hull damage (shields didn't absorb all) |
| ON_SHIP_SECTION_HULL_DAMAGE | — | A ship section took hull damage |
| ON_MOVE | — | The target successfully moved |
| OPPONENT_HAS_MORE_IN_LANE | — | Opponent has more drones in the target's lane |

### Granted Effect Types

| Type | Parameters | Description |
|-|-|-|
| BONUS_DAMAGE | `value: number` | Add extra damage to the parent effect |
| DESTROY | — | Destroy the target |
| DRAW | `value: number` | Draw cards |
| GAIN_ENERGY | `value: number` | Gain energy |
| MODIFY_STAT | `mod: { stat, value, type }` | Modify a stat on the target |
| GO_AGAIN | — | Grant an additional action |
| OVERRIDE_VALUE | `property`, `value` | Override a property of the parent effect (e.g., change `count`) |
| INCREASE_THREAT | `value: number` | Increase threat (used in trigger conditionalEffects) |

### PRE_TARGETING Example

```javascript
conditionals: [{
  id: 'expanded-targeting',
  timing: 'PRE_TARGETING',
  condition: { type: 'NOT_FIRST_ACTION' },
  targetingOverride: {
    restrictions: []  // Removes default restrictions when condition is met
  }
}]
```

### Real Card Examples

**POST timing — Swift Maneuver** (stat check → go again):
```javascript
conditionals: [{
  id: 'fast-goagain',
  timing: 'POST',
  condition: { type: 'TARGET_STAT_GTE', stat: 'speed', value: 5 },
  grantedEffect: { type: 'GO_AGAIN' }
}]
```

**PRE timing — Command Override** (section exposed → override count):
```javascript
conditionals: [{
  id: 'bridge-exposed-bonus',
  timing: 'PRE',
  condition: { type: 'SECTION_EXPOSED', section: 'bridge' },
  grantedEffect: { type: 'OVERRIDE_VALUE', property: 'count', value: 3 }
}]
```

**POST timing — Opportunist Strike** (on destroy → draw):
```javascript
conditionals: [{
  id: 'draw-on-destroy',
  timing: 'POST',
  condition: { type: 'ON_DESTROY' },
  grantedEffect: { type: 'DRAW', value: 1 }
}]
```

---

## 9. Trigger System

Triggers fire automatically when specific game events occur. They are used in drone and tech ability definitions.

### Trigger Types

Grouped by scope category:

#### Self Triggers (scope: SELF — fires when THIS entity does something)

| Trigger | Event |
|-|-|
| ON_MOVE | This drone moves to another lane |
| ON_DEPLOY | This drone is deployed |
| ON_ROUND_END | The round ends |
| ON_ATTACK | This drone attacks |
| ON_INTERCEPT | This drone intercepts |
| ON_ATTACKED | This drone is attacked |

#### Controller Triggers (scope: implied by triggerOwner)

| Trigger | Event |
|-|-|
| ON_CARD_DRAWN | Controller draws a card |
| ON_ENERGY_GAINED | Controller gains energy |
| ON_CARD_PLAY | A card is played (filtered by triggerOwner) |

#### Lane Triggers (scope: SAME_LANE — fires on lane-wide events)

| Trigger | Event |
|-|-|
| ON_LANE_MOVEMENT_IN | A drone moves into this lane |
| ON_LANE_MOVEMENT_OUT | A drone moves out of this lane |
| ON_LANE_DEPLOYMENT | A drone is deployed to this lane |
| ON_LANE_ATTACK | An attack occurs in this lane |

### Trigger Properties

| Property | Type | Values | Description |
|-|-|-|-|
| triggerOwner | string | `CONTROLLER`, `OPPONENT`, `ANY`, `LANE_OWNER`, `LANE_ENEMY` | Whose action triggers this |
| triggerScope | string | `SELF`, `SAME_LANE`, `ANY_LANE` | Spatial scope of trigger detection |
| triggerTiming | string | `OWN_TURN_ONLY`, `ANY_TURN` | When the trigger can fire |
| triggerFilter | object | See below | Additional conditions to match |
| effectTarget | string | `TRIGGER_OWNER`, `TRIGGER_OPPONENT` | Who receives the triggered effect |
| scalingDivisor | number | — | Divides the triggering value (e.g., energy gained / 2) |
| usesPerRound | number | — | Maximum trigger activations per round |
| destroyAfterTrigger | boolean | — | Destroy this entity after triggering |
| keywordIcon | string | — | Display keyword icon on the drone (e.g., `ASSAULT`, `RAPID`, `INFILTRATE`) |

### Trigger Filter

```javascript
triggerFilter: {
  laneControl: 'CONTROLLED_BY_ACTOR' | 'NOT_CONTROLLED_BY_ACTOR',
  cardSubType: 'Mine'  // Filter by card subType
}
```

- `laneControl: 'CONTROLLED_BY_ACTOR'` — only fires if the drone is in a lane controlled by its owner
- `laneControl: 'NOT_CONTROLLED_BY_ACTOR'` — only fires if the drone is in an uncontrolled/enemy lane
- `cardSubType` — only fires for cards with matching subType (used with ON_CARD_PLAY)

### Conditional Effects on Triggers

Triggers can have their own conditionalEffects array:

```javascript
{
  type: 'TRIGGERED',
  trigger: 'ON_ATTACK',
  effects: [{ type: 'DAMAGE', value: 2, effectTarget: 'TRIGGER_OWNER' }],
  conditionalEffects: [{
    timing: 'POST',
    condition: { type: 'ON_SHIP_SECTION_HULL_DAMAGE' },
    grantedEffect: { type: 'INCREASE_THREAT', value: 4, effectTarget: 'TRIGGER_OWNER' }
  }]
}
```

### Trigger Examples

#### Firefly — Self-Destruct (ON_ATTACK)

```javascript
{
  name: 'Self-Destruct',
  type: 'TRIGGERED',
  trigger: 'ON_ATTACK',
  triggerTiming: 'ANY_TURN',
  effects: [{ type: 'DESTROY', scope: 'SELF', effectTarget: 'TRIGGER_OWNER' }]
}
```

Destroys itself after every attack. No triggerOwner needed — self-triggers default to SELF scope.

#### Infiltrator — Infiltration Protocol (ON_MOVE + lane filter)

```javascript
{
  name: 'Infiltration Protocol',
  type: 'TRIGGERED',
  trigger: 'ON_MOVE',
  triggerTiming: 'ANY_TURN',
  keywordIcon: 'INFILTRATE',
  triggerFilter: { laneControl: 'NOT_CONTROLLED_BY_ACTOR' },
  effects: [{ type: 'DOES_NOT_EXHAUST', effectTarget: 'TRIGGER_OWNER' }]
}
```

Only fires when moving into an uncontrolled lane. The `keywordIcon` displays INFILTRATE on the drone token.

#### Shrike — Web Sensor (ON_CARD_PLAY + cardSubType filter)

```javascript
{
  name: 'Web Sensor',
  type: 'TRIGGERED',
  trigger: 'ON_CARD_PLAY',
  triggerOwner: 'CONTROLLER',
  triggerScope: 'SAME_LANE',
  triggerTiming: 'ANY_TURN',
  triggerFilter: { cardSubType: 'Mine' },
  effects: [{ type: 'DRAW', value: 1, effectTarget: 'TRIGGER_OWNER' }]
}
```

Fires when the controller plays a Mine card in Shrike's lane. Uses CONTROLLER owner and SAME_LANE scope.

#### Proximity Mine — Detonation (ON_LANE_MOVEMENT_IN)

```javascript
{
  name: 'Proximity Detonation',
  type: 'TRIGGERED',
  trigger: 'ON_LANE_MOVEMENT_IN',
  triggerOwner: 'LANE_ENEMY',
  triggerTiming: 'ANY_TURN',
  destroyAfterTrigger: true,
  effects: [{ type: 'DAMAGE', value: 4, effectTarget: 'TRIGGER_OWNER' }]
}
```

Fires when an enemy drone enters the lane. `LANE_ENEMY` means the entity moving in must be an enemy. Self-destroys after detonation.

#### Thor — Storm Surge (ON_ENERGY_GAINED + scaling)

```javascript
{
  name: 'Storm Surge',
  type: 'TRIGGERED',
  trigger: 'ON_ENERGY_GAINED',
  triggerTiming: 'ANY_TURN',
  scalingDivisor: 2,
  effects: [{
    type: 'MODIFY_STAT',
    mod: { stat: 'attack', value: 1, type: 'permanent' },
    effectTarget: 'TRIGGER_OWNER'
  }]
}
```

The `scalingDivisor: 2` means: for every 2 energy gained, apply the effect once (rounded down).

---

## 10. Drone Ability Types

### PASSIVE Abilities

Passive abilities are always active while the drone is alive. They use `effect` (singular) rather than `effects[]`.

#### Passive Subtypes

| Subtype | Parameters | Description |
|-|-|-|
| GRANT_KEYWORD | `keyword: string` | Grant a keyword to this drone (e.g., GUARDIAN, PIERCING) |
| GRANT_DAMAGE_TYPE | `damageType: string` | Override this drone's damage type |
| MODIFY_STAT | `mod: { stat, value, type }`, `scope` | Modify stats of drones in scope |
| CONDITIONAL_MODIFY_STAT | `condition`, `mod` | Modify stats when condition is met |
| CONDITIONAL_MODIFY_STAT_SCALING | `condition`, `mod`, scaling params | Scaling stat mod based on condition count |
| FLANKING_BONUS | `mod` | Bonus when in a lane with no other friendly drones |
| CONDITIONAL_KEYWORD | `condition`, `keyword` | Grant keyword when condition is met |
| CONDITIONAL_ATTACK_BONUS | `condition`, `value` | Attack bonus when condition is met |
| BONUS_DAMAGE_VS_SHIP | `value: number` | Extra damage when attacking ship sections |

#### Passive Condition Types

| Condition | Description |
|-|-|
| SHIP_SECTION_HULL_DAMAGED | A specific ship section has hull damage |
| OWN_DAMAGED_SECTIONS | Player has damaged ship sections (count used for scaling) |
| IN_CONTROLLED_LANE | Drone is in a lane its controller controls |
| NOT_FIRST_ACTION | Not the first action of the turn |
| ADJACENT_FRIENDLY_COUNT | Number of friendly drones in adjacent lanes |
| TARGET_IS_MARKED | Target drone is marked |

#### Passive Scopes

| Scope | Description |
|-|-|
| SELF | Affects only this drone (default) |
| FRIENDLY_ADJACENT | Affects friendly drones in adjacent lanes |
| FRIENDLY_IN_LANE | Affects all friendly drones in the same lane |
| SAME_LANE | Affects all drones in the same lane |
| LANE | Affects the lane itself |
| ATTACKER | Affects the attacking drone (for counter abilities) |

#### Passive Examples

**Aura buff (Shield Array tech):**
```javascript
{
  type: 'PASSIVE',
  effect: {
    type: 'MODIFY_STAT',
    mod: { stat: 'shields', value: 1, type: 'permanent' },
    scope: 'FRIENDLY_IN_LANE'
  }
}
```

**Conditional keyword:**
```javascript
{
  type: 'PASSIVE',
  effect: {
    type: 'CONDITIONAL_KEYWORD',
    condition: { type: 'IN_CONTROLLED_LANE' },
    keyword: 'PIERCING'
  }
}
```

### TRIGGERED Abilities

See Section 9 for the complete trigger system. Triggered abilities use `effects[]` (plural) and all trigger-related properties.

### ACTIVE Abilities

Active abilities are manually activated by the player during their turn. They have an activation cost and optional limits.

| Property | Type | Description |
|-|-|-|
| cost | object | `{ energy: number, exhausts: boolean }` |
| targeting | object | Standard targeting object (see Section 6) |
| effect | object | The effect to apply |
| activationLimit | number | Max activations per round |

#### Active Example: Seraph — Hull Repair

```javascript
{
  name: 'Hull Repair',
  type: 'ACTIVE',
  cost: { energy: 2, exhausts: true },
  targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'SAME_LANE' },
  effect: { type: 'HEAL_HULL', value: 2 }
}
```

---

## 11. Cross-Reference System

The `ref` pattern allows later effects in a chain to reference results from earlier effects. This is essential for multi-effect cards where the second effect depends on the first.

### Ref Shape

```javascript
{ ref: effectIndex, field: 'target' | 'sourceLane' | 'destinationLane' | 'cardCost' }
```

| Field | Resolves To |
|-|-|
| `target` | The drone/entity selected in the referenced effect |
| `sourceLane` | The lane the target was in before the referenced effect |
| `destinationLane` | The lane the target moved to (for movement effects) |
| `cardCost` | The energy cost of the card selected (for DISCARD_CARD effects) |

### How It Works

**EffectChainProcessor** maintains a `PositionTracker` that records virtual positions during chain execution:
- `recordMove(droneId, toLane)` — updates tracked position after a move
- `recordDiscard(cardId)` — tracks discarded cards
- `getDronePosition(droneId)` — returns current virtual position
- `getDronesInLane(lane, playerId)` — returns drones in a lane per virtual state

Refs are resolved in two phases:
1. **Selection-time**: `resolveRefFromSelections()` uses prior selections to constrain targeting
2. **Commit-time**: `resolveRef()` uses actual effect results for execution

### Annotated Examples

#### Feint — Exhaust matching speed comparison

```javascript
effects: [
  // Effect 0: Exhaust a friendly drone
  {
    type: 'EXHAUST_DRONE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' }
  },
  // Effect 1: Exhaust enemy with lower speed in same lane
  {
    type: 'EXHAUST_DRONE',
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: { ref: 0, field: 'sourceLane' },          // Same lane as effect 0's target
      restrictions: [{
        type: 'STAT_COMPARISON',
        stat: 'speed',
        comparison: 'LT',
        reference: { ref: 0, field: 'target' },            // Compare against effect 0's target
        referenceStat: 'speed'
      }]
    }
  }
]
```

#### Forced Repositioning — Chain movement with lane refs

```javascript
effects: [
  // Effect 0: Move friendly drone to adjacent lane
  {
    type: 'SINGLE_MOVE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] },
    destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
    properties: ['DO_NOT_EXHAUST']
  },
  // Effect 1: Move enemy from original lane to destination lane
  {
    type: 'SINGLE_MOVE',
    targeting: {
      type: 'DRONE',
      affinity: 'ENEMY',
      location: { ref: 0, field: 'sourceLane' },           // From the lane the friendly LEFT
      restrictions: [{
        type: 'STAT_COMPARISON',
        stat: 'attack',
        comparison: 'GT',
        reference: { ref: 0, field: 'target' },
        referenceStat: 'attack'
      }, 'NOT_EXHAUSTED']
    },
    destination: { type: 'LANE', location: { ref: 0, field: 'destinationLane' } },  // To where friendly WENT
    properties: ['DO_NOT_EXHAUST']
  }
]
```

#### Sacrifice for Power — Card cost as stat value

```javascript
effects: [
  // Effect 0: Discard a card from hand
  { type: 'DISCARD_CARD', targeting: { type: 'CARD_IN_HAND', affinity: 'FRIENDLY' } },
  // Effect 1: Buff a drone by the discarded card's cost
  {
    type: 'MODIFY_STAT',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE' },
    mod: {
      stat: 'attack',
      value: { ref: 0, field: 'cardCost' },                // Dynamic value from discarded card
      type: 'temporary'
    }
  }
]
```

#### Reposition — Chained destination reference

```javascript
effects: [
  // Effect 0: Move first drone
  {
    type: 'SINGLE_MOVE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] },
    destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
    properties: ['DO_NOT_EXHAUST']
  },
  // Effect 1: Move second drone to SAME destination (optional)
  {
    type: 'SINGLE_MOVE',
    targeting: { type: 'DRONE', affinity: 'FRIENDLY', location: 'ANY_LANE', restrictions: ['NOT_EXHAUSTED'] },
    destination: { type: 'LANE', location: { ref: 0, field: 'destinationLane' } },  // Same lane as first move
    properties: ['DO_NOT_EXHAUST'],
    optional: true    // Player can skip this effect
  }
]
```

---

## 12. Movement Effect Details

### SINGLE_MOVE Properties

| Property | Type | Description |
|-|-|-|
| targeting | object | Standard targeting for the drone to move |
| destination | object | `{ type: 'LANE', location: ... }` — where the drone moves to |
| properties | string[] | Array of movement modifiers |
| optional | boolean | If true, player can skip this movement |
| mandatory | boolean | If true, movement cannot be declined |
| prompt | string | Custom prompt text shown during selection |
| goAgain | boolean | Grant extra action after this move |
| conditionals | array | Conditional effects (see Section 8) |

### Destination Location Values

| Value | Description |
|-|-|
| `ADJACENT_TO_PRIMARY` | Must be adjacent to the selected drone's current lane |
| `{ ref: N, field: 'destinationLane' }` | The destination lane from a prior movement effect |
| `{ ref: N, field: 'sourceLane' }` | The source lane from a prior effect |

### Movement Properties

| Property | Description |
|-|-|
| `DO_NOT_EXHAUST` | The drone is not exhausted after moving |

### Movement Restrictions

Movement is blocked by:
- **INHIBIT_MOVEMENT keyword**: If an enemy in the lane has this keyword, drones cannot move out
- **INERT keyword**: The drone itself cannot move
- **SNARED status**: The drone cannot be used as a movement cost source
- **Lane capacity**: `MAX_DRONES_PER_LANE` limit per lane
- **Adjacency**: Moves must be to an adjacent lane (index difference of 1)
- **Thruster Inhibitor tech**: Blocks movement of own drones (prevents moving your drones out of the lane)

### Post-Move Triggers

After a move resolves, these triggers fire in order:
1. `ON_MOVE` (on the moving drone)
2. `ON_LANE_MOVEMENT_OUT` (on entities in the source lane)
3. `ON_LANE_MOVEMENT_IN` (on entities in the destination lane — e.g., mines)

The `deferTriggers` option defers trigger resolution until after POST conditionals are evaluated.

---

## 13. Repeating Effects

Repeating effects execute a set of sub-effects multiple times based on a game-state condition.

### Shape

```javascript
{
  type: 'REPEATING_EFFECT',
  effects: [
    { type: 'DRAW', value: 1 },
    { type: 'GAIN_ENERGY', value: 1 }
  ],
  repeatCondition: 'OWN_DAMAGED_SECTIONS',
  goAgain: true  // optional
}
```

### Repeat Conditions

| Condition | Repeat Count |
|-|-|
| `OWN_DAMAGED_SECTIONS` | Base 1 + 1 per damaged or critical ship section |
| `LANES_CONTROLLED` | Number of lanes controlled by the player (0 if none) |

Safety limit: `MAX_REPEATS = 10`

### Examples

**Desperate Measures** — Draw and gain energy per damaged section, go again:
```javascript
{
  type: 'REPEATING_EFFECT',
  effects: [
    { type: 'DRAW', value: 1 },
    { type: 'GAIN_ENERGY', value: 1 }
  ],
  repeatCondition: 'OWN_DAMAGED_SECTIONS',
  goAgain: true
}
```

**Tactical Advantage** — Draw per controlled lane:
```javascript
{
  type: 'REPEATING_EFFECT',
  effects: [{ type: 'DRAW', value: 1 }],
  repeatCondition: 'LANES_CONTROLLED'
}
```

**Strategic Dominance** — Gain energy per controlled lane:
```javascript
{
  type: 'REPEATING_EFFECT',
  effects: [{ type: 'GAIN_ENERGY', value: 1 }],
  repeatCondition: 'LANES_CONTROLLED'
}
```

---

## 14. Play Conditions and Special Flags

### Play Condition

Restricts when a card can be played:

```javascript
playCondition: {
  type: 'LANE_CONTROL_COMPARISON',
  comparison: 'FEWER_THAN_OPPONENT'  // Can only play when controlling fewer lanes
}
```

Currently the only implemented play condition type.

### Momentum Cost

```javascript
momentumCost: 1  // Requires 1 momentum in addition to energy cost
```

Momentum is gained by playing action cards. Cards with momentumCost require prior actions to have been played this turn. 12 cards use momentumCost (values 1 or 2).

### AI Only

```javascript
aiOnly: true  // Card is only available to AI opponents
```

Used for cards that would be unfun for players but provide interesting AI behavior (e.g., Raise the Alarm, Transmit Threat).

### Go Again (on effects)

```javascript
{
  type: 'DAMAGE',
  value: 3,
  goAgain: true,  // Grant extra action after this effect resolves
  targeting: { ... }
}
```

Can be set directly on an effect or granted via a POST conditional.

---

## 15. Visual Effects

The `visualEffect` property on a card triggers an animation when the card is played.

### Visual Effect Types

| Type | Suggested Usage |
|-|-|
| LASER_BLAST | Standard energy weapon damage |
| EMP_BLAST | Electromagnetic/status effects, area denial |
| NUKE_BLAST | Heavy/devastating single-target damage |
| ION_BURST | Ion/shield-focused damage |
| KINETIC_IMPACT | Physical/kinetic damage |
| ENERGY_WAVE | Energy-based support or healing effects |
| SPLASH_EFFECT | Area-of-effect damage across multiple targets |
| RAILGUN_ANIMATION | High-velocity single-target precision damage |
| DISRUPTION | Control/debuff effects |
| MOVEMENT | Movement-related card effects |
| BUFF | Positive stat modifications and enhancements |

### Usage

```javascript
visualEffect: { type: 'LASER_BLAST' }
```

Visual effects are cosmetic only — they do not affect gameplay mechanics.

---

## 16. UI Considerations

### Header Prompt Text

The game header displays context-sensitive prompts based on the current game state, using a priority system (1 = highest):

| Priority | Condition | Display Text |
|-|-|-|
| 1 | Effect chain with custom prompt | `effectChainState.prompt` value |
| 2 | Multi-target selection | "Select Targets (X selected)" |
| 3 | Destination lane selection | "Select Destination Lane" |
| 4 | Effect chain active | "Select a Target" |
| 5 | Interception mode | "Select an Interceptor" |
| 6 | Shield allocation | "Assign Shields (X Remaining)" |
| 7 | Shield reallocation (remove) | "Remove Shields" |
| 8 | Shield reallocation (add) | "Add Shields" |
| 9 | Mandatory discard | "Discard Cards (X Remaining)" |
| 10 | Mandatory drone removal | "Remove Drones (X Remaining)" |
| 11 | Optional discard | "Discard Cards (X Remaining)" |
| 12 | Deployment phase (my turn) | "Deploy Drones" |
| 13 | Action phase (my turn) | "Play an Action" |
| 14 | Not my turn | "Opponent's Turn" / "AI Thinking" |
| 15 | Fallback | "Initialising" |

### Mine Warning System

When a player attempts deployment, movement, or attack near enemy mines, the mine warning system activates:
- Highlights lanes containing enemy mines
- Warns players before committing to actions that would trigger mine detonation
- Triggered by proximity to mines during targeting/selection

### Jammer Lane Protection

Lanes containing a ready (non-exhausted) Jammer drone restrict opponent card targeting:
- Opponent effects cannot target other drones in the Jammer's lane
- Forces opponents to deal with the Jammer first
- Protection is removed when the Jammer becomes exhausted

### Custom Effect Prompts

Card effects can specify custom prompt text via the `prompt` property on effects. This overrides the default header text during that effect's resolution.

---

## 17. Keywords Reference

Keywords are special attributes that modify drone behavior. They are either innate (via GRANT_KEYWORD passive) or displayed via `keywordIcon` on triggered abilities.

| Keyword | Mechanic | How Granted |
|-|-|-|
| GUARDIAN | Ship section in this drone's lane cannot be directly attacked. Enemies must destroy the Guardian first. | PASSIVE: `GRANT_KEYWORD` |
| PIERCING | Attacks bypass shields entirely, dealing damage directly to hull. | PASSIVE: `GRANT_KEYWORD` or `CONDITIONAL_KEYWORD` |
| JAMMER | Opponent card effects can only target this drone while it's ready (non-exhausted). Protects other drones in lane. | Tech entity (Jammer) |
| INHIBIT_MOVEMENT | Prevents enemy drones from moving out of this lane. | Tech entity (Thruster Inhibitor) |
| INERT | Drone cannot move at all. Movement effects and drag-to-move are blocked. | Applied via status or ability |
| RAPID | Drone does not exhaust after moving. Displayed as keyword icon. Implemented as ON_MOVE trigger → DOES_NOT_EXHAUST. | TRIGGERED with `keywordIcon: 'RAPID'` |
| ASSAULT | Drone does not exhaust after attacking. Displayed as keyword icon. Implemented as ON_ATTACK trigger → DOES_NOT_EXHAUST. | TRIGGERED with `keywordIcon: 'ASSAULT'` |
| INFILTRATE | Drone does not exhaust when moving into an uncontrolled lane. Implemented as ON_MOVE trigger with `laneControl: 'NOT_CONTROLLED_BY_ACTOR'` filter → DOES_NOT_EXHAUST. | TRIGGERED with `keywordIcon: 'INFILTRATE'` |

### Keyword Implementation Note

RAPID, ASSAULT, and INFILTRATE are not traditional keywords — they are trigger abilities with `keywordIcon` set for UI display. The actual mechanic is a TRIGGERED ability that fires DOES_NOT_EXHAUST. This means they can be combined with other trigger conditions (e.g., INFILTRATE's lane control filter).

---

## 18. Design Constraints and Balance Notes

### Class Hierarchy and Typical Stat Ranges

| Class | Attack | Hull | Shields | Speed | Limit | Role |
|-|-|-|-|-|-|-|
| 0 | 1 | 1 | 0 | 1–2 | 4–6 | Swarm, expendable |
| 1 | 1–3 | 1–2 | 0–1 | 1–4 | 3–4 | Fast, fragile, specialized |
| 2 | 1–3 | 2–3 | 1–2 | 1–3 | 2–3 | Balanced, versatile |
| 3 | 1–3 | 2–4 | 0–3 | 1–4 | 1–2 | Tanky or heavy hitter |
| 4 | 2–5 | 3–5 | 2–4 | 1–3 | 1–2 | Capital, powerful, slow rebuild |

### Rarity / maxInDeck Guidelines

| Rarity | Typical maxInDeck | Notes |
|-|-|-|
| Common | 2–3 | Bread-and-butter cards, reliable deck padding |
| Uncommon | 2 | Situational but impactful |
| Rare | 1 | Powerful effects, deck-defining |

### Upgrade Slots and maxApplications

- Upgrade slots range from 0–4 across drones
- Each upgrade card specifies `slots` (how many slots it consumes) and `maxApplications` (max stacks)
- A drone cannot receive an upgrade if it doesn't have enough free slots
- Common pattern: `slots: 1, maxApplications: 1` (one-time upgrade) or `slots: 1, maxApplications: 2` (stackable)

### Token Entities

Drones created by CREATE_TOKENS effects:
- Have `isToken: true` on their definition
- Have `selectable: false` — cannot be added to decks
- **Do not count for lane control** — important for balance
- Have a `cost` property used for reference

### Rebuild Rate Tiers

| Class | Rebuild Rate | Meaning |
|-|-|-|
| 0 | 2.0 | 2 copies rebuild per round |
| 1 | 1.0–2.0 | 1–2 copies rebuild per round |
| 2 | 0.5–1.0 | 1 copy every 1–2 rounds |
| 3 | 0.5–1.0 | 1 copy every 1–2 rounds |
| 4 | 0–0.5 | 1 copy every 2–3 rounds, or never (0) |

A `rebuildRate` of 0 means the drone never rebuilds once destroyed (e.g., unique capital drones).

### General Design Tips

- **Effect types must exist in EffectRouter** — you cannot invent new effect types without code changes
- **Trigger types must exist in triggerConstants** — same rule for triggers
- **Condition types must exist in ConditionEvaluator** — same rule for conditions
- **Test interactions**: Cards with cross-references (ref patterns) need careful testing of edge cases (target destroyed between effects, lane full, etc.)
- **Balance movement**: DO_NOT_EXHAUST on movement is powerful — gate it behind costs or conditions
- **Mine placement**: Mines with `destroyAfterTrigger: true` are one-shot; omitting this creates persistent triggered tech
- **Scaling effects**: `scalingDivisor` on triggers and `REPEATING_EFFECT` with conditions can create snowball effects — use conservative values
