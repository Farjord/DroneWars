# Multi-Step Action UI Pattern

## Overview

This document defines the **standardized UI pattern** for all multi-step actions in Drone Wars. Multi-step actions are game interactions that require multiple player inputs or stages to complete, such as:

- Shield allocation and reallocation
- Card discarding (mandatory and optional)
- Drone removal
- Movement cards (SINGLE_MOVE, MULTI_MOVE)
- Any future multi-selection or staged actions

**Purpose:** Ensure consistency across all multi-step actions so players have a predictable, intuitive experience and developers have clear implementation guidelines.

---

## Core Principles

### 1. Consistent Location
All multi-step action controls appear in the **GameHeader center section** after the turn indicator ("Your Turn" / "AI Thinking" / "Initialising").

### 2. Visual Hierarchy
- **Status text** shows requirements/progress in the phase display area (e.g., "(3 shields to assign)")
- **Action buttons** provide Cancel/Reset/Confirm controls
- **Pass button** is hidden during multi-step actions to prevent accidental phase advancement

### 3. Semantic Color Coding
- **Red**: Cancel/Abort actions
- **Yellow**: Reset/Undo actions
- **Green**: Confirm/Continue actions

### 4. State Management
Multi-step actions use dedicated state objects:
- `mandatoryAction` - For required actions (discard, drone removal)
- `multiSelectState` - For multi-selection actions (movement, targeting)
- `reallocationPhase` - For shield reallocation stages

---

## Button Placement Standard

### Location: GameHeader Center Section

**HTML Structure:**
```jsx
<div className="text-center flex flex-col items-center gap-2">
  {/* Phase Display with Status Text */}
  <h2>Phase Name <span>(X / Y items)</span></h2>

  {/* Turn Indicator + Action Buttons */}
  <div className="flex items-center gap-3">
    {/* Turn Indicator */}
    <span>Your Turn / AI Thinking / Initialising</span>

    {/* Action Buttons */}
    {multiStepActionActive && (
      <>
        <button>Cancel</button>
        <button>Reset</button> {/* Optional */}
        <button>Confirm / Continue</button>
      </>
    )}

    {/* Pass Button - Hidden when multi-step active */}
    {!mandatoryAction && !multiSelectState && !reallocationPhase && (
      <button>Pass</button>
    )}
  </div>
</div>
```

**Positioning Rules:**
- Buttons appear **immediately after** the turn indicator text
- Buttons are arranged **horizontally** in a row with `gap-3` spacing
- Button order: **Cancel → Reset (if applicable) → Confirm/Continue**

---

## Status Text Pattern

### Location: Phase Display Area

**Format:**
```jsx
{getPhaseDisplayName(turnPhase)}
<span className="text-base font-semibold text-[COLOR] ml-2">
  ({count} {itemName} to {action})
</span>
```

### Color Convention

| Action Type | Color | Tailwind Class | Use Case |
|------------|-------|----------------|----------|
| **Mandatory** | Orange | `text-orange-300` | Required actions (must discard, must remove) |
| **Optional** | Yellow | `text-yellow-300` | Optional actions (optional discard) |
| **Allocation** | Cyan | `text-cyan-300` | Resource assignment (shield allocation) |
| **Removal** | Orange | `text-orange-300` | Resource removal (shield reallocation - removing) |
| **Addition** | Green | `text-green-300` | Resource addition (shield reallocation - adding) |
| **Selection** | Cyan | `text-cyan-300` | Item selection (drone movement) |

### Examples

```jsx
{/* Shield Allocation */}
({shieldsToAllocate} shields to assign)

{/* Mandatory Discard */}
({mandatoryAction.count} {mandatoryAction.count === 1 ? 'card' : 'cards'} to discard)

{/* Shield Reallocation - Removing */}
({shieldsToRemove} shields to remove)

{/* Shield Reallocation - Adding */}
({shieldsToAdd} shields to add)

{/* MULTI_MOVE Selection */}
({selectedDrones.length} / {maxDrones} drones selected)

{/* Optional Discard */}
({discardLimit - optionalDiscardCount} {pluralCheck} to discard)
```

---

## Button Styling Template

### Standard Button Structure

All buttons use this **angular clip-path styling** with gradient borders:

```jsx
<button
  onClick={handleAction}
  className="relative p-[1px] transition-all hover:scale-105"
  style={{
    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
    backgroundImage: 'linear-gradient(45deg, rgba(R, G, B, 0.8), rgba(R2, G2, B2, 0.8))'
  }}
>
  <div
    className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
    style={{
      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
      color: '#COLOR'
    }}
  >
    Button Text
  </div>
</button>
```

### Button Variants

#### Cancel Button (Red)
```jsx
style={{
  clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
  backgroundImage: 'linear-gradient(45deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))'
}}
// Inner div color: '#fca5a5'
```

#### Reset Button (Yellow)
```jsx
style={{
  clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
  backgroundImage: 'linear-gradient(45deg, rgba(234, 179, 8, 0.8), rgba(202, 138, 4, 0.8))'
}}
// Inner div color: '#fde047'
```

#### Confirm/Continue Button (Green)
```jsx
style={{
  clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
  backgroundImage: 'linear-gradient(45deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.8))'
}}
// Inner div color: '#86efac'
```

#### Pass Button (Red/Gray - Disabled State)
```jsx
disabled={passInfo[`${getLocalPlayerId()}Passed`]}
className="... disabled:opacity-50 disabled:cursor-not-allowed"
style={{
  backgroundImage: passInfo[`${getLocalPlayerId()}Passed`]
    ? 'linear-gradient(45deg, rgba(75, 85, 99, 0.6), rgba(107, 114, 128, 0.6))'
    : 'linear-gradient(45deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))'
}}
// Inner div color: passInfo ? '#9ca3af' : '#fca5a5'
```

---

## Button Color Convention

### Semantic Meanings

| Color | Purpose | When to Use | Button Text Examples |
|-------|---------|-------------|---------------------|
| **Red** | Cancel/Abort | Undo entire action, return to previous state | Cancel, Abort |
| **Yellow** | Reset/Undo | Clear current selections but stay in action | Reset |
| **Green** | Confirm/Continue | Complete current stage or entire action | Confirm, Continue |

### Button Order Rules

**Standard 3-Button Pattern:**
```
[Cancel (Red)] → [Reset (Yellow)] → [Confirm/Continue (Green)]
```

**Standard 2-Button Pattern:**
```
[Cancel (Red)] → [Confirm (Green)]
```

**Logic:**
- **Left to Right** = **Less to More Committed**
- Cancel (least commitment) always on left
- Confirm/Continue (most commitment) always on right
- Reset (partial commitment) in middle

---

## State Management Pattern

### State Objects

#### 1. mandatoryAction
Used for required single-step selections (discard, drone removal)

```javascript
mandatoryAction = {
  type: 'discard' | 'destroy',
  count: number,
  // ... other properties
}
```

**Visibility Rule:** Status text only, no buttons (selection happens on click)

#### 2. multiSelectState
Used for multi-step selections (movement cards, multi-target actions)

```javascript
multiSelectState = {
  card: Object,              // The card being played
  phase: string,             // 'select_source_lane' | 'select_drones' | 'select_destination_lane'
  selectedDrones: Array,     // Currently selected drones
  sourceLane: string | null, // Source lane ID
  maxDrones: number          // Maximum drones to select
}
```

**Visibility Rule:** Cancel button always visible, Confirm button when selections made

#### 3. reallocationPhase
Used for multi-stage resource reallocation (shields)

```javascript
reallocationPhase = 'removing' | 'adding' | null
```

**Visibility Rule:** Cancel + Reset + Continue/Confirm buttons visible

---

## Visibility Rules

### Pass Button Hiding

The Pass button is **hidden** during multi-step actions:

```jsx
{isMyTurn() && !mandatoryAction && !multiSelectState && !reallocationPhase && (
  <button onClick={handlePlayerPass}>Pass</button>
)}
```

**Logic:** If ANY multi-step action is active, hide Pass button to prevent accidental phase advancement.

### Action Button Showing

Action buttons appear when:

```jsx
{/* Sequential Phases (deployment/action) */}
{(turnPhase === 'deployment' || turnPhase === 'action') && isMyTurn() && (
  {/* Show buttons if reallocationPhase active */}
)}

{/* Simultaneous Phases (allocateShields) */}
{turnPhase === 'allocateShields' && (
  {/* Show buttons for all players */}
)}
```

**Rules:**
- **Sequential phases** (deployment, action): Only show for active player
- **Simultaneous phases** (allocateShields): Show for all players
- **Initialising phases**: Show for all players (no turn order)

---

## Implementation Checklist

### Adding a New Multi-Step Action

**Step 1: Define State**
```javascript
// In App.jsx or component
const [yourActionState, setYourActionState] = useState(null);
```

**Step 2: Add Status Text** (GameHeader.jsx)
```jsx
{yourCondition && (
  <span className="text-base font-semibold text-cyan-300 ml-2">
    ({count} {itemName} to {action})
  </span>
)}
```

**Step 3: Add Action Buttons** (GameHeader.jsx)
```jsx
{yourCondition && (
  <>
    <button onClick={handleCancel} /* Red Cancel Button */>Cancel</button>
    <button onClick={handleReset} /* Yellow Reset Button */>Reset</button>
    <button onClick={handleConfirm} /* Green Confirm Button */>Confirm</button>
  </>
)}
```

**Step 4: Update Pass Button Visibility** (GameHeader.jsx)
```jsx
{isMyTurn() && !mandatoryAction && !multiSelectState && !reallocationPhase && !yourActionState && (
  <button>Pass</button>
)}
```

**Step 5: Implement Handlers**
```javascript
const handleCancel = () => {
  setYourActionState(null);
  // Clean up any selections
};

const handleReset = () => {
  setYourActionState(prev => ({ ...prev, selections: [] }));
};

const handleConfirm = async () => {
  // Process action through ActionProcessor
  await processAction('yourAction', { ...yourActionState });
  setYourActionState(null);
};
```

---

## Complete Code Examples

### Example 1: Shield Allocation

**Status Text** (GameHeader.jsx lines 205-209):
```jsx
{turnPhase === 'allocateShields' && (
  <span className="text-base font-semibold text-cyan-300 ml-2">
    ({shieldsToAllocate} shields to assign)
  </span>
)}
```

**Action Buttons** (GameHeader.jsx lines 248-289):
```jsx
{turnPhase === 'allocateShields' && (
  <>
    <button
      onClick={handleResetShields}
      className="relative p-[1px] transition-all hover:scale-105"
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
        backgroundImage: 'linear-gradient(45deg, rgba(234, 179, 8, 0.8), rgba(202, 138, 4, 0.8))'
      }}
    >
      <div
        className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
          color: '#fde047'
        }}
      >
        Reset
      </div>
    </button>

    <button
      onClick={handleConfirmShields}
      className="relative p-[1px] transition-all hover:scale-105"
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
        backgroundImage: 'linear-gradient(45deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.8))'
      }}
    >
      <div
        className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
          color: '#86efac'
        }}
      >
        Confirm
      </div>
    </button>
  </>
)}
```

**Pass Button Hiding** (GameHeader.jsx line 279):
```jsx
{isMyTurn() && !mandatoryAction && !multiSelectState && !reallocationPhase && (
  <button>Pass</button>
)}
```

---

### Example 2: Shield Reallocation (Two-Stage)

**Status Text** (GameHeader.jsx lines 210-219):
```jsx
{reallocationPhase === 'removing' && (
  <span className="text-base font-semibold text-orange-300 ml-2">
    ({shieldsToRemove} shields to remove)
  </span>
)}
{reallocationPhase === 'adding' && (
  <span className="text-base font-semibold text-green-300 ml-2">
    ({shieldsToAdd} shields to add)
  </span>
)}
```

**Removing Stage Buttons** (GameHeader.jsx lines 303-363):
```jsx
{reallocationPhase === 'removing' && (
  <>
    <button onClick={handleCancelReallocation}>Cancel</button>
    <button onClick={handleResetReallocation}>Reset</button>
    <button onClick={handleContinueToAddPhase}>Continue</button>
  </>
)}
```

**Adding Stage Buttons** (GameHeader.jsx lines 365-425):
```jsx
{reallocationPhase === 'adding' && (
  <>
    <button onClick={handleCancelReallocation}>Cancel</button>
    <button onClick={handleResetReallocation}>Reset</button>
    <button onClick={handleConfirmReallocation}>Confirm</button>
  </>
)}
```

---

### Example 3: MULTI_MOVE Card

**Status Text** (GameHeader.jsx - TO BE ADDED):
```jsx
{multiSelectState?.phase === 'select_drones' && (
  <span className="text-base font-semibold text-cyan-300 ml-2">
    ({multiSelectState.selectedDrones.length} / {multiSelectState.maxDrones} drones selected)
  </span>
)}
```

**Action Buttons** (GameHeader.jsx - TO BE ADDED):
```jsx
{multiSelectState && multiSelectState.phase === 'select_drones' && (
  <>
    <button onClick={handleCancelMultiMove}>Cancel</button>
    <button
      onClick={handleConfirmMultiMoveDrones}
      disabled={multiSelectState.selectedDrones.length === 0}
      className="... disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Confirm Drones
    </button>
  </>
)}
```

**State Initialization** (App.jsx lines 916-921 - TO BE UPDATED):
```javascript
setMultiSelectState({
    card: result.needsCardSelection.card,
    phase: result.needsCardSelection.phase,
    selectedDrones: [],
    sourceLane: null,
    maxDrones: result.needsCardSelection.maxDrones  // ADD THIS
});
```

---

### Example 4: Mandatory Discard

**Status Text Only** (GameHeader.jsx lines 220-224):
```jsx
{turnPhase === 'mandatoryDiscard' && mandatoryAction?.type === 'discard' && (
  <span className="text-base font-semibold text-orange-300 ml-2">
    ({mandatoryAction.count} {mandatoryAction.count === 1 ? 'card' : 'cards'} to discard)
  </span>
)}
```

**No Action Buttons** - Selection happens on card click in GameFooter HandView

---

### Example 5: Optional Discard

**Status Text** (GameHeader.jsx lines 230-234):
```jsx
{turnPhase === 'optionalDiscard' && (
  <span className="text-base font-semibold text-yellow-300 ml-2">
    ({localPlayerEffectiveStats.totals.discardLimit - optionalDiscardCount} {pluralCheck} to discard)
  </span>
)}
```

**Single Confirm Button** (GameHeader.jsx lines 291-296):
```jsx
{turnPhase === 'optionalDiscard' && (
  <button onClick={handleRoundStartDraw} className="btn-confirm">
    Confirm
  </button>
)}
```

---

## Architecture Notes

### Why GameHeader?

**Rationale:** All multi-step action controls belong in GameHeader center section because:

1. **Visibility**: Header is always visible regardless of which footer tab is active
2. **Consistency**: Players always know where to look for action controls
3. **Hierarchy**: Header represents game-level actions, footer represents contextual views
4. **Accessibility**: Controls remain in reach even when interacting with different UI areas

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **GameHeader** | Display status text, action buttons, and turn indicator |
| **App.jsx** | Manage state, coordinate actions, handle button events |
| **GameFooter** | Display context-specific views (hand, drones, log) |
| **ActionProcessor** | Process game logic when actions are confirmed |

### Event Flow

```
User clicks in GameFooter (selects items)
    ↓
App.jsx updates local state (selectedDrones, shieldsToAllocate, etc.)
    ↓
GameHeader displays updated status text
    ↓
User clicks Confirm button in GameHeader
    ↓
App.jsx calls ActionProcessor
    ↓
ActionProcessor updates GameStateManager
    ↓
GameStateManager emits state change
    ↓
All components re-render with new state
```

---

## Quick Reference

### Color Meanings
- 🔴 **Red**: Cancel/Abort
- 🟡 **Yellow**: Reset/Undo
- 🟢 **Green**: Confirm/Continue

### Status Text Colors
- **Orange** (`text-orange-300`): Mandatory actions
- **Yellow** (`text-yellow-300`): Optional actions
- **Cyan** (`text-cyan-300`): Allocation/Selection
- **Green** (`text-green-300`): Addition/Positive
- **Orange** (`text-orange-300`): Removal/Negative

### Button Order
```
[Cancel] → [Reset (optional)] → [Confirm/Continue]
```

### Pass Button Condition
```jsx
!mandatoryAction && !multiSelectState && !reallocationPhase && !yourCustomState
```

---

## Validation Checklist

Before implementing a new multi-step action, verify:

- [ ] Status text shows in phase display area with appropriate color
- [ ] Action buttons appear in GameHeader center section
- [ ] Button order follows Cancel → Reset → Confirm pattern
- [ ] Button styling uses standard angular clip-path template
- [ ] Pass button is hidden during action
- [ ] State management follows mandatoryAction/multiSelectState/custom pattern
- [ ] Handlers properly clean up state on Cancel
- [ ] Handlers properly process through ActionProcessor on Confirm
- [ ] UI updates reflect state changes immediately
- [ ] Multiplayer/AI compatibility tested

---

*This pattern ensures consistent, predictable UI behavior across all multi-step actions in Drone Wars. When in doubt, reference the shield allocation/reallocation examples as the canonical implementations.*
