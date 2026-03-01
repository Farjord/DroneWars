# Component Mapping — EREMOS UI Redesign

**Spec**: `EREMOS_UI_Design_Specification_v4.md`
**Created**: 1 March 2026

Maps every section of the spec to existing source files. Required by Section 1 of the spec.

---

## Spec Section → Source File Mapping

| Spec Section | Existing File(s) | Change Type |
|-|-|-|
| §1 Objectives & Constraints | All files below | N/A — meta section |
| §2 16:9 Enforcement | `src/App.jsx` (~1270 lines) | Structural — new wrapper div |
| §3 Page Layout — Vertical Sections | `src/App.jsx`, `src/components/ui/GameBattlefield.jsx` (253 lines) | Structural — flex split to 15/60/25 |
| §4 Game Area — Grid Layout | `src/components/ui/GameBattlefield.jsx` | Structural — row layout → 3-column CSS Grid |
| §5 Ship Sections | `src/components/ui/ShipSectionsDisplay.jsx` (244 lines), `src/components/ui/ShipSectionCompact.jsx` (246 lines) | Visual — chevron clip-path, 11 decorative layers |
| §6 Drone Lanes | `src/components/ui/DroneLanesDisplay.jsx` (484 lines) | Visual — trapezoid clip-path, 9 lane layers |
| §7 Lane Effects (NEW) | None — new component | Additive — new `LaneEffects.jsx` |
| §8 Header Bar | `src/components/ui/GameHeader.jsx` (617 lines), `src/components/ui/gameheader/PhaseStatusText.jsx`, `src/components/ui/gameheader/ActionPhaseButtons.jsx`, `src/components/ui/gameheader/InitPhaseButtons.jsx`, `src/components/ui/gameheader/SettingsDropdown.jsx` | Visual — SVG polyline border, trapezoid phase banner, backdrop-filter |
| §9 Font & Typography | All UI components | Visual only — font/sizing rules |
| §10 Footer / Hand Area | `src/components/ui/GameFooter.jsx` (204 lines), `src/components/ui/GameFooter.module.css` (347 lines) | Structural — fixed 215px → 25% of container |
| §11 Reference Files | N/A — meta section | N/A |

---

## Per-Component Change Analysis

### `src/App.jsx` (~1270 lines)
- **§2**: Add 16:9 aspect-ratio wrapper div. Existing `gameAreaRef` must wrap this container.
- **§3**: Change flex layout from `h-screen` to percentage-based within 16:9 container.
- AnimationLayer and TargetingArrowLayer remain inside `gameAreaRef` — no functional changes.
- StaticBackground (`src/components/ui/StaticBackground.jsx`, 26 lines) unchanged.

### `src/components/ui/GameBattlefield.jsx` (253 lines)
- **§4**: Largest structural change. Currently stacks 4 horizontal row components. Must become a 3-column CSS Grid, each column being a new `BattleColumn` component.
- Current internal structure: `ShipSectionsDisplay(opp)` → `DroneLanesDisplay(opp)` → `DroneLanesDisplay(player)` → `ShipSectionsDisplay(player)`.
- New structure: 3 × `BattleColumn`, each containing one opponent ship + one opponent lane + lane effects + one player lane + one player ship.

### `src/components/ui/ShipSectionsDisplay.jsx` (244 lines)
- **§4/§5**: This component renders all 3 sections in a row via `.map()`. After restructuring, each `BattleColumn` will directly render a single `ShipSectionCompact`. This component may be eliminated or reduced to a pass-through.
- Props passed: `sections`, `isOpponent`, `sectionRefs`, shield allocation state, targeting state, drag handlers, click handlers.

### `src/components/ui/ShipSectionCompact.jsx` (246 lines)
- **§5**: Visual-only changes. Receives single-section data already.
- Add chevron `clip-path: polygon(...)` with column-specific wing cutout percentages.
- Add 11 decorative layers (glow bloom → edge tick marks).
- Content safe zone rules (top 10%, bottom 42%).
- Ship art retained as background image behind translucent panel.
- Interactive states (targeting pulse, hover, selection) preserved but re-styled.

### `src/components/ui/DroneLanesDisplay.jsx` (484 lines)
- **§4/§6**: Similar to ShipSectionsDisplay — renders all 3 lanes via `.map()`. After restructuring, per-lane rendering logic (`renderDronesOnBoard` function + lane wrapper) moves into `BattleColumn`.
- Contains: lane click handlers, targeting state rendering, drag-drop event handlers, lane control highlights.
- The `renderDronesOnBoard` helper function is the key extraction target.

### `src/components/ui/DroneToken.jsx` (464 lines)
- **Excluded from redesign.** Current visual styling is approved as-is.
- Only scaling-related changes permitted if the responsive unit conversion (Phase A) or column restructuring (Phase B) requires them.
- No structural changes — component already receives single-drone data.

### `src/components/ui/GameHeader.jsx` (617 lines) + subcomponents
- **§8**: Visual redesign of container. 60+ props, complex conditional rendering.
- Add: translucent dark background with `backdrop-filter: blur(12px)`, centre light pillar, faction colour accents, SVG polyline bottom border with blur glow, top border.
- Phase banner: three-tier trapezoid using clip-path. **Buttons are NOT replaced** — existing `ActionPhaseButtons`, `InitPhaseButtons`, `PhaseStatusText` remain functionally identical.
- KPIChangePopup positioning uses `getBoundingClientRect()` — needs validation after layout changes.
- `SettingsDropdown` unchanged.

### `src/components/ui/GameFooter.jsx` (204 lines) + CSS Module (347 lines)
- **§10**: Container height changes from fixed 215px to 25% of 16:9 container.
- Internal content NOT redesigned. Card sizing may need adjustment (currently uses some fixed heights like 205px for handCardsContainer).
- Container queries in CSS module should auto-adapt if base container changes.

---

## New Components to Create

| Component | Spec Section | Purpose |
|-|-|-|
| `BattleColumn.jsx` | §4 | Vertical stack: opponent ship → opponent lane → lane effects → player lane → player ship. One per battlefield column. |
| `LaneEffects.jsx` | §7 | 5 circular token slots per lane at centre-facing edge. Purely additive, no existing logic affected. |

---

## Prop Threading Notes

The column restructuring (§4) requires rethinking how props flow from `GameBattlefield` to individual components:

**Current flow**: `GameBattlefield` → `ShipSectionsDisplay` (all 3 sections) → `ShipSectionCompact` (per section)
**New flow**: `GameBattlefield` → `BattleColumn` (per column) → `ShipSectionCompact` (single section)

Key prop groups that must be threaded per-column:
- **Section data**: `sections[i]`, `sectionRefs`, section index
- **Lane data**: lane drones, lane index, lane control state
- **Targeting state**: `targetingState`, `validTargets`, `selectedTarget`
- **Drag-drop handlers**: `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop` (from `useDragMechanics.js`, 1653 lines)
- **Click handlers**: `onSectionClick`, `onDroneClick`, `onLaneClick`
- **Shield allocation**: `shieldAllocations`, `onShieldAllocate`
- **Animation refs**: `droneRefs`, `sectionRefs` (identity-based keys, position-independent)

The drag-and-drop system (`src/hooks/useDragMechanics.js`) uses global listeners on `gameAreaRef`/`document` and identity-based ref keys — it is resilient to DOM restructuring. No changes needed to DnD logic itself.
