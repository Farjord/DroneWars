# Ship Card System - Product Requirements Document

## Overview

The Ship Card system introduces a new layer of strategic customization to Drone Wars. A **Ship Card** represents the player's vessel and defines fundamental properties that affect all aspects of gameplay: hull durability, shield capacity, damage thresholds, and deck composition limits.

This system separates ship-level configuration from section-level configuration, enabling players to choose from distinct ships with unique strengths and playstyles.

---

## Goals

1. **Strategic Diversity**: Enable meaningfully different playstyles through ship selection
2. **Deck Building Integration**: Ship choice directly impacts what cards can be included in a deck
3. **Clear Hierarchy**: Ship Card provides baselines; Ship Sections provide modifications
4. **Future-Proofing**: Support faction mechanics and special ship abilities in future updates
5. **Backward Compatibility**: Existing game flows continue to work with a default ship

---

## Core Concepts

### Ship Card

A Ship Card represents the player's vessel and provides **baseline values** for:

| Property | Description |
|----------|-------------|
| **Base Hull** | Default hull points for each ship section |
| **Base Shields** | Default maximum shield capacity per section |
| **Base Thresholds** | Default damaged/critical thresholds |
| **Deck Limits** | Maximum cards per type (Ordnance, Support, Tactics, Upgrade) |

### Ship Sections

Ship Sections (Bridge, Power Cell, Drone Control Hub) remain as they are today, but instead of defining absolute hull/shield values, they provide **modifiers** to the Ship Card's baselines:

| Property | Description |
|----------|-------------|
| **Hull Modifier** | Adds/subtracts from Ship's base hull (e.g., +2, -1) |
| **Shield Modifier** | Adds/subtracts from Ship's base shields |
| **Threshold Modifiers** | Adjusts damaged/critical thresholds |

### Final Values

The actual hull, shields, and thresholds for each section are calculated as:

```
Final Hull = Ship.baseHull + Section.hullModifier
Final Shields = Ship.baseShields + Section.shieldsModifier
Final Damaged Threshold = Ship.baseThresholds.damaged + Section.thresholdModifiers.damaged
Final Critical Threshold = Ship.baseThresholds.critical + Section.thresholdModifiers.critical
```

---

## Ship Card Properties

### Combat Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string | Unique identifier | `"SHIP_001"` |
| `name` | string | Display name | `"Reconnaissance Corvette"` |
| `rarity` | string | Common/Uncommon/Rare/Mythic | `"Common"` |
| `description` | string | Flavor text | `"A balanced ship..."` |
| `image` | string | Path to ship artwork | `"/img/ships/corvette.png"` |
| `baseHull` | number | Default hull for all sections | `10` |
| `baseShields` | number | Default max shields per section | `3` |
| `baseThresholds` | object | Default damage state thresholds | `{ damaged: 5, critical: 0 }` |

### Deck Composition Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `deckLimits.totalCards` | number | Required deck size | `40` |
| `deckLimits.ordnanceLimit` | number | Max Ordnance cards | `15` |
| `deckLimits.tacticLimit` | number | Max Tactic cards | `15` |
| `deckLimits.supportLimit` | number | Max Support cards | `15` |
| `deckLimits.upgradeLimit` | number | Max Upgrade cards | `10` |

### Future Properties

| Property | Type | Description | Status |
|----------|------|-------------|--------|
| `faction` | string | Ship faction alignment | Future |
| `factionCardAllowances` | object | Faction-specific card limits | Future |
| `shipBonus` | object | Passive ship-wide bonus | Future |
| `shipAbility` | object | Active ship ability | Future |

---

## Example Ships

### Reconnaissance Corvette (Balanced)

```
Base Hull: 10
Base Shields: 3
Thresholds: damaged @ 5, critical @ 0

Deck Limits:
- Ordnance: 15
- Tactics: 15
- Support: 15
- Upgrade: 10
```

A well-rounded vessel suitable for any strategy.

### Heavy Assault Carrier (Tank + Ordnance Focus)

```
Base Hull: 12
Base Shields: 2
Thresholds: damaged @ 6, critical @ 2

Deck Limits:
- Ordnance: 20
- Tactics: 10
- Support: 15
- Upgrade: 5
```

High durability with focus on damage-dealing cards. Fewer tactical options.

### Stealth Interceptor (Glass Cannon)

```
Base Hull: 8
Base Shields: 4
Thresholds: damaged @ 4, critical @ 0

Deck Limits:
- Ordnance: 18
- Tactics: 18
- Support: 8
- Upgrade: 6
```

Fragile but powerful. Relies on shields and aggression.

### Support Frigate (Defensive/Utility)

```
Base Hull: 10
Base Shields: 4
Thresholds: damaged @ 5, critical @ 1

Deck Limits:
- Ordnance: 10
- Tactics: 12
- Support: 20
- Upgrade: 8
```

Focuses on sustain and support cards. Limited offensive options.

### Drone Mothership (Deployment Focus)

```
Base Hull: 11
Base Shields: 2
Thresholds: damaged @ 5, critical @ 0

Deck Limits:
- Ordnance: 12
- Tactics: 15
- Support: 12
- Upgrade: 11
```

Optimized for drone deployment and upgrades.

### Tactical Command Vessel (Control Focus)

```
Base Hull: 9
Base Shields: 3
Thresholds: damaged @ 4, critical @ 0

Deck Limits:
- Ordnance: 12
- Tactics: 20
- Support: 12
- Upgrade: 6
```

Maximum tactical flexibility at the cost of raw power.

---

## Ship Section Modifications

Ship Sections will be updated to use modifiers instead of absolute values:

### Standard Sections (No Modification)

Most standard sections will have `hullModifier: 0`, `shieldsModifier: 0`, and zero threshold modifiers, meaning they use the Ship Card's values directly.

### Specialized Sections (With Modifiers)

Some sections may provide bonuses or penalties:

| Section | Hull Mod | Shield Mod | Effect |
|---------|----------|------------|--------|
| Reinforced Bridge | +2 | -1 | Tankier but fewer shields |
| Overcharged Power Cell | -1 | +2 | More shields, less hull |
| Compact Drone Hub | -2 | 0 | Trade hull for efficiency |

---

## Deck Building Impact

### Current System

Deck limits are hardcoded:
- Ordnance: 15
- Tactics: 15
- Support: 15
- Upgrade: 10
- Total: 40 cards

### New System

Deck limits come from the selected Ship Card:
- Player selects a Ship Card before/during deck building
- DeckBuilder UI displays the ship's specific limits
- Validation enforces the ship's limits
- Different ships enable different deck archetypes

### Validation Rules

1. Total card count must equal ship's `totalCards` (typically 40)
2. Each card type count must not exceed ship's limit for that type
3. Individual card limits (maxInDeck) remain unchanged
4. Deck is only valid when all constraints are satisfied

---

## User Experience Flow

### Deck Building

1. Player opens Deck Builder
2. Player selects a Ship Card (or uses default)
3. UI displays deck limits based on selected ship
4. Player builds deck within those constraints
5. Validation prevents exceeding limits
6. Player confirms deck

### Game Initialization

1. Player's ship selection is stored with their loadout
2. Game initialization reads ship card properties
3. Ship sections are created with computed hull/shields/thresholds
4. Gameplay proceeds with those values

### In-Game Display

1. Ship sections show their computed hull/shields
2. Damage applies to computed values
3. Threshold states (healthy/damaged/critical) use computed thresholds

---

## Success Criteria

1. **Ship Selection Works**: Players can select from 6+ ships
2. **Deck Limits Enforced**: DeckBuilder respects ship-specific limits
3. **Combat Values Computed**: Hull/shields/thresholds correctly calculated from Ship + Section
4. **Backward Compatible**: Games work with default ship when none selected
5. **UI Clear**: Ship stats and deck limits clearly displayed

---

## Out of Scope (Future Phases)

- Faction system and faction-locked cards
- Ship-level passive bonuses
- Ship-level active abilities
- Unlocking ships through progression
- Ship Card collection/crafting
