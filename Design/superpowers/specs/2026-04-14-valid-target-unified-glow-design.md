# Design Spec: Unified Valid-Target Glow Effect

**Date:** 2026-04-14  
**Status:** Implemented  
**Commits:** `aad8fef7` → `d412c4ab`

---

## Problem

Every targetable element type had its own ad-hoc visual feedback for "this is a valid target":

| Element | Pre-unification approach |
|-|-|
| Tech slots | Runtime `<style>` injection (`useEffect`), custom keyframe `techSlotHighlight` |
| Ship sections | Tailwind `ring-4 ring-purple-400 shadow-lg animate-pulse` |
| Ship sections (compact) | Tailwind `animate-pulse` on inner layer |
| Drone tokens | Tailwind `animate-pulse` |
| Lanes | CSS class `.lane-target-pulse` on inner overlay element |
| Cards in hand | Not implemented (no valid-target visual for effect-chain targets) |

This was visually inconsistent, used purple across the board regardless of faction, and scattered animation logic across six components.

---

## Solution

### Single CSS class: `.valid-target`

Added to `src/styles/animations.css`:

```css
@keyframes valid-target-pulse {
  0%, 100% { box-shadow: 0 0 0.6vw var(--valid-target-color), 0 0 1.2vw var(--valid-target-color-dim); }
  50%       { box-shadow: 0 0 1.0vw var(--valid-target-color), 0 0 2.0vw var(--valid-target-color-dim); }
}

.valid-target {
  border: 0.15vw solid var(--valid-target-color) !important;
  animation: valid-target-pulse 0.8s ease-in-out infinite;
}
```

Components set two CSS custom properties to control faction colour:

```js
style={{
  '--valid-target-color': fc.glow,           // e.g. '#00B8FF' (player) or '#FF4444' (opponent)
  '--valid-target-color-dim': `${fc.glow}60`, // same at ~38% opacity
}}
```

`!important` on the border is required because several elements set their border inline (TechSlots, ShipSection). The `!important` is scoped to `.valid-target` and does not affect any other rule.

### Colour convention

Colour is always the **element owner's faction colour**:
- Player elements → cyan (`FACTION_COLORS.player.glow`)
- Opponent elements → red (`FACTION_COLORS.opponent.glow`)

This is consistent with the rest of the UI's faction theming.

---

## Files Changed

| File | Change |
|-|-|
| `src/styles/animations.css` | Added `@keyframes valid-target-pulse` + `.valid-target`; removed `lane-target-pulse` / `lane-target-fade` |
| `src/components/ui/TechSlots.jsx` | Removed runtime keyframe injection; apply `.valid-target` + CSS vars via `highlighted` prop |
| `src/components/ui/ShipSection.jsx` | Replace purple Tailwind ring classes with `.valid-target` + CSS vars |
| `src/components/ui/ShipSectionCompact.jsx` | Add `.valid-target` + CSS vars on outer container when `isCardTarget` |
| `src/components/ui/DroneToken.jsx` | Add `.valid-target` + CSS vars when `isActionTarget=true` |
| `src/components/ui/SingleLaneView.jsx` | Replace `.lane-target-pulse` overlay with `.valid-target` on outer lane element |
| `src/components/ui/footer/HandView.jsx` | Add `.valid-target` + CSS vars when `isEffectChainTarget=true` |
| Tests (5 files) | Update assertions from old class names to `.valid-target` |

---

## Deliberate Exclusions

### Drag-to-play on ActionCard

The visual feedback when an action card is being dragged to play (drop zone highlighting) is a different interaction model — spatial affordance during drag, not a targeting selection indicator. Left untouched.

### `isAffectedSection` in ShipSectionCompact

The `isAffectedSection` `animate-pulse` overlay (collateral damage for NONE-targeting cards: Crossfire, Encirclement) is a passive indicator — it says "this will be affected" not "click this". Semantically distinct from "valid target". Tracked for future consideration in `FUTURE_IMPROVEMENTS.md` item 102.

---

## Deferred Items

See `FUTURE_IMPROVEMENTS.md` items 102 and 103:

- **102** — `isAffectedSection` animate-pulse: consider a dedicated `.affected-section` class if visual language evolves
- **103** — `FACTION_COLORS` dual import path (`ShipSectionLayers.jsx` re-export vs direct `utils/factionColors.js`): standardise to the utility file
