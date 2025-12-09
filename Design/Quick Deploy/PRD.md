# Quick Deploy - Product Requirements Document

## Core Concept

Players create **deck-agnostic deployment templates** that specify:
1. A 5-drone roster (what drones the template is designed for)
2. Lane placements (which drones go where on turn 1)

When entering combat, the game validates these templates against the current deck and presents valid options. If the player selects a quick deployment, the game executes it automatically and skips to the action phase.

---

## User Flow

### 1. Creation Flow (Hangar Screen)

1. Player navigates to Hangar screen
2. Below ship slots, clicks "Quick Deployments" button
3. Quick Deploy Manager opens showing:
   - List of saved quick deployments (max 5)
   - "Create New" option
4. Player clicks "Create New" or selects existing to edit
5. Editor view shows:
   - **Top**: 3-lane game board representation
   - **Bottom**: 5 drone roster slots
6. Player populates drone roster:
   - Click empty slot → drone picker opens
   - Select from starter drones + blueprinted drones
   - Each drone type can only be selected once
7. Player assigns drones to lanes:
   - Click drone card in roster to select
   - Click lane to place drone token
   - Click drone token to remove back to roster
8. Player sees real-time feedback:
   - Total deployment cost
   - Which decks this configuration is valid for
9. Player names and saves the quick deployment

### 2. Game Start Flow (Entering Combat)

1. Player on TacticalMapScreen initiates combat encounter
2. System validates all saved quick deployments against current deck:
   - Roster match (exact 5-drone match)
   - Budget check (can afford all deployments)
   - CPU limit (not exceeding drone control value)
   - Per-drone limits (maxPerLane, deployment limits)
3. Encounter screen shows deployment options:
   - "Standard Deployment" (always available)
   - Valid quick deployments listed by name
4. Player selects option and confirms encounter
5. Loading screen appears
6. **If Quick Deploy selected** (during loading):
   - Player drones placed per template
   - Deployment costs deducted
   - AI calculates reactive deployment
   - AI drones placed
7. Game board loads:
   - All drones already on board
   - Skips deployment phase
   - Starts at Round 1 → Action Phase

---

## Validation Rules

For a quick deployment to be valid against a deck:

### 1. Roster Match
The quick deployment's 5-drone roster must exactly match the deck's 5 drones (same drone types, order doesn't matter).

**Example:**
- Quick Deploy roster: `[Scout, Standard Fighter, Heavy Fighter, Guardian, Repair]`
- Deck drones: `[Scout, Heavy Fighter, Repair, Guardian, Standard Fighter]`
- Result: **VALID** (same 5 types)

### 2. Budget Check
Total deployment cost must not exceed available resources on turn 1:
- `initialDeploymentBudget` + `starting energy` ≥ sum of drone costs

Drone cost = `drone.class` value (typically 0-3)

### 3. CPU Limit
Number of drones placed must not exceed `cpuControlValue` from ship stats.

### 4. Per-Drone Limits
Must respect:
- `maxPerLane` restrictions from drone data
- General deployment limits

---

## Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max saved deployments | 5 | Prevent clutter |
| Drones per roster | Exactly 5 | Matches deck drone count |
| Unique drone types | Yes | Decks cannot have duplicate drones |
| Placements per deployment | 0-5 | Allow partial deployment |
| Scope | Extraction mode only | Focused implementation |
| Deployment round | Turn 1 only | Primary use case |

---

## Edge Cases

### Drone Lost (MIA)
If a deck's drone is lost during an Extraction run, quick deployments referencing that drone become invalid for that deck until the drone is replaced.

### Deck Modified
If player modifies their deck's drone roster, quick deployments may become invalid. Validation happens at encounter time, not on deck save.

### Empty Quick Deployment
A quick deployment with 0 placements is valid - player may want to save all budget for cards. Game would skip deployment phase with no drones placed.

### All Quick Deployments Invalid
If no saved quick deployments are valid for the current deck, only "Standard Deployment" option is shown.
