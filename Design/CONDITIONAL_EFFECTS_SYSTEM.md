# Conditional Effects System

## Overview

The Conditional Effects System allows cards to have effects that only trigger when specific conditions are met. This enables card designs like:

- "Deal 2 damage. **If destroyed**, draw a card."
- "Deal 2 damage. **If target has 2 or less hull**, deal 4 instead."
- "Deal 2 damage. **If target is marked**, +2 damage. **If destroyed**, go again."

## How It Works

Cards can have a `conditionalEffects` array containing one or more conditional effect definitions. Each conditional has:

- **timing**: When to check the condition (`PRE` or `POST`)
- **condition**: What to check
- **grantedEffect**: What happens if the condition is met

### Timing: PRE vs POST

| Timing | When Checked | Use Cases |
|--------|--------------|-----------|
| `PRE` | Before primary effect executes | Bonus damage, conditional destroy, stat checks |
| `POST` | After primary effect resolves | On-destroy rewards, on-damage triggers |

**PRE timing** can modify the primary effect (e.g., add bonus damage) or queue additional effects before damage is dealt.

**POST timing** checks the outcome of the primary effect (was target destroyed? was damage dealt?) and grants rewards accordingly.

---

## Card Data Structure

```javascript
{
  id: 'CARD_EXAMPLE',
  name: 'Scavenger Shot',
  cost: 2,
  effect: { type: 'DAMAGE', value: 2 },

  conditionalEffects: [
    {
      id: 'draw-on-destroy',           // Unique ID for debugging
      timing: 'POST',                   // 'PRE' or 'POST'
      condition: { type: 'ON_DESTROY' }, // Condition definition
      grantedEffect: { type: 'DRAW', value: 1 }  // Effect if condition met
    }
  ]
}
```

### Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for debugging/logging. Use descriptive names like `'marked-bonus'`, `'draw-on-destroy'` |
| `timing` | Yes | `'PRE'` (before primary) or `'POST'` (after primary) |
| `condition` | Yes | Object defining what to check. See Conditions section below |
| `grantedEffect` | Yes | Object defining what happens if condition is met. See Granted Effects section below |

---

## Available Conditions

### State Conditions (PRE or POST)

These check the current state of the target.

| Condition Type | Description | Example |
|----------------|-------------|---------|
| `TARGET_IS_MARKED` | Target drone has the marked status | `{ type: 'TARGET_IS_MARKED' }` |
| `TARGET_IS_EXHAUSTED` | Target drone is exhausted (tapped) | `{ type: 'TARGET_IS_EXHAUSTED' }` |
| `TARGET_IS_READY` | Target drone is ready (not exhausted) | `{ type: 'TARGET_IS_READY' }` |

### Stat Comparison Conditions (PRE or POST)

These compare a target's stat against a threshold value. For `attack` and `speed`, the **effective stat** is used (including buffs/debuffs). For `hull`, the **current value** is used (reflecting damage taken).

| Condition Type | Description | Parameters |
|----------------|-------------|------------|
| `TARGET_STAT_GTE` | Stat >= value | `stat`, `value` |
| `TARGET_STAT_LTE` | Stat <= value | `stat`, `value` |
| `TARGET_STAT_GT` | Stat > value | `stat`, `value` |
| `TARGET_STAT_LT` | Stat < value | `stat`, `value` |

**Available stats**: `hull`, `attack`, `speed`, `currentShields`

**Examples:**
```javascript
// Target has 2 or less hull
{ type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 }

// Target has more than 3 attack (effective, with buffs)
{ type: 'TARGET_STAT_GT', stat: 'attack', value: 3 }

// Target is slow (speed < 3)
{ type: 'TARGET_STAT_LT', stat: 'speed', value: 3 }
```

### Outcome Conditions (POST only)

These check the result of the primary effect. Only valid with `timing: 'POST'`.

| Condition Type | Description | Example |
|----------------|-------------|---------|
| `ON_DESTROY` | Target was destroyed by the primary effect | `{ type: 'ON_DESTROY' }` |
| `ON_HULL_DAMAGE` | Hull damage was dealt (hull > 0, not shield damage) | `{ type: 'ON_HULL_DAMAGE' }` |
| `ON_MOVE` | Movement was successfully completed | `{ type: 'ON_MOVE' }` |

**Note**: `ON_MOVE` is used for movement cards (`SINGLE_MOVE`, `MULTI_MOVE`) where the moved drone becomes the target for POST condition evaluation.

### Lane Comparison Conditions (POST only, Movement)

These conditions compare drone counts between players in a lane. Used with movement cards where `effectResult` provides lane information.

| Condition Type | Description | Parameters |
|----------------|-------------|------------|
| `OPPONENT_HAS_MORE_IN_LANE` | Opponent has more drones in specified lane | `lane`, `count` |

**Parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `lane` | `'DESTINATION'` | Check the lane the drone moved TO |
| | `'SOURCE'` | Check the lane the drone moved FROM |
| `count` | `'TOTAL'` | Count all drones |
| | `'READY'` | Count only ready (non-exhausted) drones |
| | `'EXHAUSTED'` | Count only exhausted drones |

**Examples:**
```javascript
// Opponent has more total drones in destination lane
{ type: 'OPPONENT_HAS_MORE_IN_LANE', lane: 'DESTINATION', count: 'TOTAL' }

// Opponent has more ready drones in the lane we moved from
{ type: 'OPPONENT_HAS_MORE_IN_LANE', lane: 'SOURCE', count: 'READY' }

// Opponent has more exhausted drones in destination
{ type: 'OPPONENT_HAS_MORE_IN_LANE', lane: 'DESTINATION', count: 'EXHAUSTED' }
```

**Note**: This condition requires `effectResult` with `fromLane` and `toLane`, which movement cards provide after execution.

---

## Available Granted Effects

### Damage Modifiers (PRE only)

| Effect Type | Description | Parameters |
|-------------|-------------|------------|
| `BONUS_DAMAGE` | Add damage to primary effect | `value`: Amount to add |

**Note**: `BONUS_DAMAGE` modifies the primary effect's damage value directly. It doesn't create a separate damage instance.

```javascript
// Add +2 damage to primary effect
{ type: 'BONUS_DAMAGE', value: 2 }
```

### State Effects

| Effect Type | Description | Parameters |
|-------------|-------------|------------|
| `DRAW` | Draw cards | `value`: Number of cards |
| `GAIN_ENERGY` | Gain energy | `value`: Amount of energy |
| `GO_AGAIN` | Don't end turn after this card | None |

```javascript
{ type: 'DRAW', value: 1 }
{ type: 'GAIN_ENERGY', value: 2 }
{ type: 'GO_AGAIN' }
```

### Destruction Effects (PRE only)

| Effect Type | Description | Parameters |
|-------------|-------------|------------|
| `DESTROY` | Destroy the target | `scope`: `'SINGLE'` |

```javascript
// Destroy the target (typically used with a condition)
{ type: 'DESTROY', scope: 'SINGLE' }
```

### Healing Effects

| Effect Type | Description | Parameters |
|-------------|-------------|------------|
| `HEAL_HULL` | Heal hull on a target | `value`: Amount to heal |

---

## Example Cards

### 1. Scavenger Shot (POST: Draw on Destroy)

"Deal 2 damage to target drone. If it is destroyed, draw a card."

```javascript
{
  id: 'CARD050',
  name: 'Scavenger Shot',
  cost: 2,
  effect: { type: 'DAMAGE', value: 2 },
  conditionalEffects: [{
    id: 'draw-on-destroy',
    timing: 'POST',
    condition: { type: 'ON_DESTROY' },
    grantedEffect: { type: 'DRAW', value: 1 }
  }]
}
```

### 2. Finishing Blow (PRE: Bonus Damage on Low Hull)

"Deal 2 damage to target drone. If its hull is 2 or less, deal 4 damage instead."

```javascript
{
  id: 'CARD051',
  name: 'Finishing Blow',
  cost: 3,
  effect: { type: 'DAMAGE', value: 2 },
  conditionalEffects: [{
    id: 'execute-bonus',
    timing: 'PRE',
    condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 },
    grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
  }]
}
```

### 3. Opportunist Strike (Multiple Conditionals)

"Deal 2 damage. +2 if target is marked. If destroyed, gain 2 energy and go again."

```javascript
{
  id: 'CARD052',
  name: 'Opportunist Strike',
  cost: 4,
  effect: { type: 'DAMAGE', value: 2 },
  conditionalEffects: [
    {
      id: 'marked-bonus',
      timing: 'PRE',
      condition: { type: 'TARGET_IS_MARKED' },
      grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
    },
    {
      id: 'energy-on-destroy',
      timing: 'POST',
      condition: { type: 'ON_DESTROY' },
      grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
    },
    {
      id: 'goagain-on-destroy',
      timing: 'POST',
      condition: { type: 'ON_DESTROY' },
      grantedEffect: { type: 'GO_AGAIN' }
    }
  ]
}
```

### 4. Executioner (Conditional Destroy)

"Destroy target enemy drone if its hull is less than 2."

```javascript
{
  id: 'CARD053',
  name: 'Executioner',
  cost: 2,
  effect: { type: 'DAMAGE', value: 0 },  // Placeholder primary effect
  conditionalEffects: [{
    id: 'execute-weak',
    timing: 'PRE',
    condition: { type: 'TARGET_STAT_LT', stat: 'hull', value: 2 },
    grantedEffect: { type: 'DESTROY', scope: 'SINGLE' }
  }]
}
```

### 5. Energy Leech (POST: Energy on Hull Damage)

"Deal 1 damage to target drone. If hull damage is dealt, gain 3 energy."

```javascript
{
  id: 'CARD054',
  name: 'Energy Leech',
  cost: 2,
  effect: { type: 'DAMAGE', value: 1 },
  conditionalEffects: [{
    id: 'energy-on-hull-damage',
    timing: 'POST',
    condition: { type: 'ON_HULL_DAMAGE' },
    grantedEffect: { type: 'GAIN_ENERGY', value: 3 }
  }]
}
```

**Note**: `ON_HULL_DAMAGE` only triggers when hull damage is dealt. If shields absorb all the damage, the condition is NOT met.

---

## Combining Conditions

### Multiple Conditionals on One Card

Cards can have multiple conditional effects. They are processed independently:

- All `PRE` conditionals are evaluated before the primary effect
- All `POST` conditionals are evaluated after the primary effect
- Each conditional is checked separately (not AND/OR logic between them)

### Stacking BONUS_DAMAGE

Multiple `BONUS_DAMAGE` effects stack additively:

```javascript
// If both conditions are met, primary damage becomes 2 + 1 + 2 = 5
conditionalEffects: [
  {
    id: 'marked-bonus',
    timing: 'PRE',
    condition: { type: 'TARGET_IS_MARKED' },
    grantedEffect: { type: 'BONUS_DAMAGE', value: 1 }
  },
  {
    id: 'low-hull-bonus',
    timing: 'PRE',
    condition: { type: 'TARGET_STAT_LTE', stat: 'hull', value: 2 },
    grantedEffect: { type: 'BONUS_DAMAGE', value: 2 }
  }
]
```

### Same Condition, Multiple Effects

Use separate conditional entries for the same condition with different effects:

```javascript
// Both trigger on destroy
conditionalEffects: [
  {
    id: 'draw-on-destroy',
    timing: 'POST',
    condition: { type: 'ON_DESTROY' },
    grantedEffect: { type: 'DRAW', value: 1 }
  },
  {
    id: 'energy-on-destroy',
    timing: 'POST',
    condition: { type: 'ON_DESTROY' },
    grantedEffect: { type: 'GAIN_ENERGY', value: 2 }
  }
]
```

---

## Processing Order

1. Card is played with a target
2. **PRE conditionals** are evaluated in array order
   - `BONUS_DAMAGE` modifies the primary effect
   - Other effects (like `DESTROY`) are queued
3. **Primary effect** executes (with any modifications)
4. **POST conditionals** are evaluated in array order
   - Outcome conditions (`ON_DESTROY`, `ON_HULL_DAMAGE`) check primary result
   - Granted effects are queued
5. All queued additional effects are processed
6. Turn ends (unless `GO_AGAIN` was granted)

---

## Notes

- **Animations**: Granted effects that have animations (like `DESTROY`, `HEAL_HULL`) will trigger their animations when processed. State-only effects (`DRAW`, `GAIN_ENERGY`, `GO_AGAIN`) have no animation.

- **Effective Stats**: When checking `attack` or `speed` with stat conditions, the effective stat (with buffs/debuffs) is used. When checking `hull`, the current value (after damage) is used.

- **No Primary Effect**: Cards can have `effect: { type: 'DAMAGE', value: 0 }` as a placeholder if the card's purpose is purely conditional (like Executioner).

---

## Movement Cards with Conditionals

Movement cards (`SINGLE_MOVE`, `MULTI_MOVE`) support conditionals with special handling:

### How Movement Conditionals Work

1. Player plays a movement card
2. **PRE conditionals** are evaluated (no target yet, limited usefulness)
3. Player selects which drone to move and destination lane
4. Movement executes
5. **POST conditionals** are evaluated with the **moved drone as the target**
6. Granted effects are processed

This allows conditions to check the moved drone's stats after the player has selected it.

### Example Movement Cards

#### 1. Swift Maneuver (Go Again for Fast Drones)

"Move a drone to an adjacent lane. If its speed is 5 or higher, go again."

```javascript
{
  id: 'CARD060',
  name: 'Swift Maneuver',
  cost: 1,
  effect: { type: 'SINGLE_MOVE' },
  conditionalEffects: [{
    id: 'fast-goagain',
    timing: 'POST',
    condition: { type: 'TARGET_STAT_GTE', stat: 'speed', value: 5 },
    grantedEffect: { type: 'GO_AGAIN' }
  }]
}
```

#### 2. Tactical Shift (Draw on Contested Lane)

"Move a drone to an adjacent lane without exhausting it. If the opponent has more drones in that lane, draw a card."

```javascript
{
  id: 'CARD061',
  name: 'Tactical Shift',
  cost: 2,
  effect: { type: 'SINGLE_MOVE', properties: ['DO_NOT_EXHAUST'] },
  conditionalEffects: [{
    id: 'contested-draw',
    timing: 'POST',
    condition: { type: 'OPPONENT_HAS_MORE_IN_LANE', lane: 'DESTINATION', count: 'TOTAL' },
    grantedEffect: { type: 'DRAW', value: 1 }
  }]
}
```

#### 3. Assault Reposition (Attack Buff on Move)

"Move a drone to an adjacent lane. If its attack is 3 or higher, give it +1 attack."

```javascript
{
  id: 'CARD062',
  name: 'Assault Reposition',
  cost: 2,
  effect: { type: 'SINGLE_MOVE' },
  conditionalEffects: [{
    id: 'attack-buff',
    timing: 'POST',
    condition: { type: 'TARGET_STAT_GTE', stat: 'attack', value: 3 },
    grantedEffect: { type: 'MODIFY_STAT', stat: 'attack', value: 1 }
  }]
}
```

#### 4. Scout Advance (Multiple Conditionals)

"Move a drone. If it's marked, remove the mark. If its speed >= 4, go again."

```javascript
{
  id: 'CARD063',
  name: 'Scout Advance',
  cost: 1,
  effect: { type: 'SINGLE_MOVE' },
  conditionalEffects: [
    {
      id: 'clear-mark',
      timing: 'POST',
      condition: { type: 'TARGET_IS_MARKED' },
      grantedEffect: { type: 'REMOVE_MARK' }  // If implemented
    },
    {
      id: 'fast-goagain',
      timing: 'POST',
      condition: { type: 'TARGET_STAT_GTE', stat: 'speed', value: 4 },
      grantedEffect: { type: 'GO_AGAIN' }
    }
  ]
}
```

### Multi-Move with Conditionals

For `MULTI_MOVE` cards, POST conditionals are evaluated against the **first moved drone** only.

```javascript
{
  id: 'CARD064',
  name: 'Fleet Advance',
  cost: 3,
  effect: { type: 'MULTI_MOVE', count: 3 },
  conditionalEffects: [{
    id: 'energy-on-move',
    timing: 'POST',
    condition: { type: 'ON_MOVE' },
    grantedEffect: { type: 'GAIN_ENERGY', value: 1 }
  }]
}
```
