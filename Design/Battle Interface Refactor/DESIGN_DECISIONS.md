# Design Decisions — EREMOS UI Redesign

**Spec**: `EREMOS_UI_Design_Specification_v4.md`
**Created**: 1 March 2026

Captures all design decisions made during the feasibility review so they don't need to be re-discovered during implementation.

---

## Confirmed Decisions

### 1. Ship Section Artwork — Retain as Background Image
Ship art stays as `backgroundImage: url(stats.image)` behind the translucent faction panel body. The art provides visual identity per section and is part of the game's asset system. The new chevron clip-path will clip the art to match the new shape.

### 2. Lane Effects — Empty Slots Only
The `LaneEffects` component renders empty circular slots only. Active effect styling (hostile, friendly, icons) will be implemented when the game logic for lane effects ships. The component accepts an `effects` prop array for future use.

### 3. Footer Sizing — 25% with Iterative Fixes
Start with 25% of the 16:9 container as specified. Fix any overflow or sizing issues as they surface during implementation rather than pre-engineering solutions. Container queries in the existing CSS module should handle most adaptation automatically.

### 4. Polish Level — All Decorative Layers Required
ALL decorative layers specified in the design are essential — the visual polish is the point of this redesign. Ship sections get all 11 layers (glow bloom through edge tick marks). Drone lanes get all 9 layers. No layers should be cut for convenience.

### 5. Wing Cutouts — Match Spec Exactly
Use the precise polygon percentages per column position as specified. Inner edges use 0%/1.5% cutout values. Each of the 3 column positions has its own clip-path polygon to create the correct wing point geometry.

### 6. Phase Banner Buttons — Retain All Existing Functionality
The trapezoid phase banner in the spec/mockup is a visual container placeholder ONLY. All existing buttons and interactive elements are retained exactly as-is:
- `ActionPhaseButtons.jsx` — all action phase controls
- `InitPhaseButtons.jsx` — all init phase controls
- `PhaseStatusText.jsx` — phase status display
- `SettingsDropdown.jsx` — settings menu

The redesign changes the header structure and container styling around these buttons, not the buttons themselves.

### 7. backdrop-filter Scope — Header Only
`backdrop-filter: blur(12px)` applies to the **header only**. Ship sections, drone lanes, and drone tokens use `background: rgba(...)` without blur — still translucent, but no frosted glass effect.

**Rationale**: Eliminates the performance concern of 42+ blurred elements (6 ship sections + 6 lanes + 30 drone tokens). The header is a single element; the existing footer already uses `backdrop-blur-sm`. No performance profiling needed with this constraint.

### 8. DroneToken — No Visual Changes
`DroneToken.jsx` is excluded from the redesign. The current visual styling (stat hexagons, ability buttons, special ability icons, shields, hull pips, faction colouring) is approved as-is.

Only responsive scaling fixes are permitted if the layout restructuring (Phase A unit conversion or Phase B column layout) requires them. No decorative layers, no gradient changes, no clip-path additions.

---

## Technical Constraints Discovered

### clip-path Layer Separation
`clip-path` clips ALL children regardless of `overflow: visible`. Any content that must extend beyond the clipped shape (drone stat hexagons, ability buttons overlapping edges) must be in a separate unclipped layer.

**Required pattern**:
```
<div style="position: relative">              <!-- unclipped container -->
  <div style="clip-path: polygon(...)          <!-- visual background only -->
              pointer-events: none">
    <!-- decorative layers 1-N -->
  </div>
  <div style="position: absolute; inset: 0     <!-- content, unclipped -->
              pointer-events: auto">
    <!-- interactive content (drone tokens, stats, buttons) -->
  </div>
</div>
```

This applies to: ship sections (§5), drone lanes (§6).

### clip-path and Pointer Events
`clip-path` affects pointer hit testing — only the visible (clipped) area receives mouse events. For drag-and-drop interactions, the unclipped content layer must have `pointer-events: auto` while the clipped visual layer has `pointer-events: none`. This gives rectangular hit zones for interaction while maintaining visual clip-path shapes.

### DnD System Resilience to Restructuring
The drag-and-drop system (`useDragMechanics.js`) is more resilient to the row→column restructuring than initially estimated:
- **Global listeners** on `gameAreaRef`/`document` work regardless of internal DOM hierarchy
- **Arrow positions** use `getBoundingClientRect()` relative to `gameAreaRef` — absolute coordinates, immune to restructuring
- **Ref assignments** use identity-based keys (e.g., `local-Bridge`, `opponent-PowerCell`), not DOM-position-dependent
- **Event bubbling** from Token→Lane is preserved since tokens remain descendants of lane divs
- **`event.currentTarget`** stays correct since handlers remain on the same logical elements

**Conclusion**: No changes needed to DnD logic. Main work is mechanical prop threading.

### Animation Layer Compatibility
`AnimationLayer` and `TargetingArrowLayer` use absolute positioning within `gameAreaRef`. The 16:9 container must be inside (or be) the `gameAreaRef` element so coordinates remain consistent. No changes needed to animation logic itself.

### KPIChangePopup Positioning
`KPIChangePopup` in the header uses `getBoundingClientRect()` to position popups above resource badges. If badge positions change significantly during the header redesign (Phase F), popup positioning needs validation and possible adjustment.

### No Automated DnD Tests
The codebase has zero tests for `useDragMechanics` or `useClickHandlers`. The column restructuring (Phase B) is unguarded by automated tests. Manual testing of all interactive paths is critical after Phase B, covering:
- Drone deployment (hand → lane)
- Drone movement (lane → lane)
- Shield allocation (hand → ship section)
- Targeting (click sequences)
- Card preview (click to view)

---

## Spec Deviations

### backdrop-filter Scope Reduction (Decision §7)
**Spec implies**: Translucent frosted glass on multiple elements (ship sections, lanes, tokens).
**Implementation**: backdrop-filter on header only. All other elements use plain `rgba()` backgrounds. Still translucent but without the blur effect.
**Reason**: Performance. 42+ simultaneously blurred elements would require GPU profiling and likely cause frame drops.

### Phase Button Retention (Decision §6)
**Spec shows**: A trapezoid button as the phase control in the header mockup.
**Implementation**: All existing phase buttons retained exactly. The trapezoid is treated as a visual container/banner only.
**Reason**: Existing button functionality is complex (multi-step init phase, action phase with multiple button states, confirmations). Replacing this with a single trapezoid button would be a functional change, violating the spec's "no functional changes" constraint.

### Lane Effects — UI Only (Decision §2)
**Spec describes**: Lane effect slots with active/hostile states, icons, and gameplay implications.
**Implementation**: Empty slot UI only. No game logic, no active states.
**Reason**: Spec §7 explicitly states game logic is out of scope. The component structure supports future activation.

### Drone Token Visual Treatment Excluded (Decision §8)
**Spec §6 describes**: Translucent faction gradients, top edge highlight, corner accent dots, hexagon shield pips, exhausted state changes for drone tokens.
**Implementation**: No visual changes to `DroneToken.jsx`. Current styling retained exactly.
**Reason**: User reviewed the existing DroneToken styling and confirmed it is exactly as desired. Only scaling fixes permitted if layout restructuring requires them.
