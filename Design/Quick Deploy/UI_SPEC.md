# Quick Deploy - UI Specification

## Design Principles

1. **Visual Consistency** - Follow existing Extraction mode UI styling
2. **Component Reuse** - Use existing buttons, modals, cards, drone tokens
3. **Visual Fidelity** - Lane view should look like the actual game board
4. **Snappy Interaction** - No animations during editing, instant feedback

---

## Entry Point: Hangar Screen

### Location
Below the ship slots (0-5), add a "Quick Deployments" button.

### Button Appearance
- Match existing Hangar button styling
- Label: "Quick Deployments"
- Optional: Badge showing count of saved deployments (e.g., "3/5")

---

## Quick Deploy Manager

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  QUICK DEPLOY MANAGER                                    [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Saved Deployments (3/5)                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐  │
│  │ Aggressive   │ │ Defensive    │ │ Balanced     │ │ + New  │  │
│  │ Rush         │ │ Setup        │ │ Start        │ │        │  │
│  │              │ │              │ │              │ │        │  │
│  │ [Edit] [Del] │ │ [Edit] [Del] │ │ [Edit] [Del] │ │        │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Saved Deployment Cards
- Show deployment name
- Mini preview of drone positions (optional)
- Edit and Delete buttons
- Click card to edit

---

## Quick Deploy Editor

### Two-Part Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Back]              EDIT: Aggressive Rush              [Save]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    LANE ASSIGNMENT                      │    │
│  │  ┌─────────────┬─────────────┬─────────────┐           │    │
│  │  │   LANE 0    │   LANE 1    │   LANE 2    │           │    │
│  │  │   (Left)    │   (Middle)  │   (Right)   │           │    │
│  │  │             │             │             │           │    │
│  │  │  [Scout]    │  [Heavy]    │             │           │    │
│  │  │  ATK:2 HP:1 │  ATK:4 HP:3 │             │           │    │
│  │  │             │  [StdFtr]   │             │           │    │
│  │  │             │  ATK:3 HP:2 │             │           │    │
│  │  │             │             │             │           │    │
│  │  └─────────────┴─────────────┴─────────────┘           │    │
│  │                                                         │    │
│  │  Budget: 6/8 points                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    DRONE ROSTER                         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │  │ Scout   │ │ StdFtr  │ │ Heavy   │ │Guardian │ │ Repair  ││
│  │  │ [PLACED]│ │ [PLACED]│ │ [PLACED]│ │         │ │         ││
│  │  │ Cost: 1 │ │ Cost: 2 │ │ Cost: 3 │ │ Cost: 3 │ │ Cost: 1 ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
│  │  Click slot to change drone                                 │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  VALIDITY                                               │    │
│  │  Valid for: Starter Deck, Custom Deck 2                 │    │
│  │  Invalid for: Support Build (missing Heavy Fighter)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Name: Aggressive Rush________________]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Lane Assignment (Top Section)

### Visual Requirements
- **Must look like the actual game board**
- Reuse existing drone token components
- Drones displayed as tokens floating in lanes (not cards or text)
- Show calculated stats including positional bonuses:
  - Flanking bonuses (left/right lane modifiers)
  - Aegis Drone shield aura effects
  - Any other contextual stat modifications

### Interaction Model

| Action | Result |
|--------|--------|
| Click drone card in roster | Selects that drone (highlight) |
| Click lane (with drone selected) | Places drone token in lane |
| Click drone token | Removes token, returns to roster |
| Click drone token (no selection) | Still removes token |

### Key Behaviors
- **No animations** - Instant placement for snappy feel
- **No attack/move** - Purely add/remove functionality
- Only unplaced drones from roster are selectable
- Visual indicator for selected drone card

---

## Drone Roster (Bottom Section)

### Layout
5 slots in a row, each showing:
- Drone name
- Deployment cost (class value)
- Status: Available / Placed / Empty slot

### Drone Selection Modal
Triggered when clicking an empty slot or changing a drone.

```
┌─────────────────────────────────────────┐
│  SELECT DRONE                    [X]    │
├─────────────────────────────────────────┤
│                                         │
│  STARTER DRONES                         │
│  ┌────────┐ ┌────────┐ ┌────────┐       │
│  │ Scout  │ │ StdFtr │ │ Heavy  │ ...   │
│  │ Cost:1 │ │ Cost:2 │ │ Cost:3 │       │
│  └────────┘ └────────┘ └────────┘       │
│                                         │
│  BLUEPRINTED DRONES                     │
│  ┌────────┐ ┌────────┐                  │
│  │ Bomber │ │ Interc │ ...              │
│  │ Cost:3 │ │ Cost:3 │                  │
│  └────────┘ └────────┘                  │
│                                         │
│  (Grayed out: already in roster)        │
│                                         │
└─────────────────────────────────────────┘
```

### Removal Cascade
When changing/removing a drone from roster:
- Automatically remove any lane placements of that drone
- Update budget calculation immediately

---

## Feedback Display

### Budget Display
`Budget: X/Y points`
- X = Total cost of placed drones
- Y = Typical deployment budget (or show range)
- Color coding: Green (affordable), Yellow (tight), Red (exceeds typical)

### Deck Validity
- **Valid for:** List of deck names where this deployment works
- **Invalid for:** List of deck names + reason
  - "Missing Heavy Fighter"
  - "Exceeds budget"
  - "Exceeds CPU limit"

---

## Encounter Screen Integration

### Deployment Selection
When initiating combat with valid quick deployments:

```
┌─────────────────────────────────────────┐
│  SELECT DEPLOYMENT                      │
├─────────────────────────────────────────┤
│                                         │
│  ○ Standard Deployment                  │
│    (Manual deployment phase)            │
│                                         │
│  ● Aggressive Rush                      │
│    Scout → Left, StdFtr + Heavy → Mid   │
│    Cost: 6 points                       │
│                                         │
│  ○ Defensive Setup                      │
│    Guardian → Mid, Repair → Right       │
│    Cost: 4 points                       │
│                                         │
│           [Confirm Encounter]           │
│                                         │
└─────────────────────────────────────────┘
```

### Selection Behavior
- Radio button selection (single choice)
- "Standard Deployment" always available
- Only valid quick deployments shown
- Brief summary of placements for each option

---

## Styling Guidelines

### Colors
Use existing Extraction mode color palette:
- Primary actions: Match existing button colors
- Valid indicators: Green tones
- Invalid/warning: Red/orange tones
- Selected state: Highlight color from existing UI

### Typography
- Headers: Match existing modal headers
- Body text: Match existing UI text styles
- Labels: Consistent with DeckBuilder labels

### Components to Reuse
- Modal container and close button
- Button components (primary, secondary, danger)
- Card components for deployment cards
- Drone token components from game board
- Input fields for naming
