# Master Plan — EREMOS UI Redesign

**Spec**: `EREMOS_UI_Design_Specification_v4.md`
**Component Mapping**: `COMPONENT_MAPPING.md`
**Design Decisions**: `DESIGN_DECISIONS.md`
**Created**: 1 March 2026

---

## Overview

Visual reskin of the battle interface with one structural change (row→column layout) and one additive feature (Lane Effects). No functional changes to game logic, state management, or event handlers.

Seven phases, ordered by dependency. Each phase should have its own implementation document when ready.

---

## Phase A — Foundation

**Scope**: 16:9 container, vertical 15/60/25 split, responsive unit conversion.

**What changes**:
- Add 16:9 aspect-ratio wrapper in `App.jsx` (spec §2)
- Convert `h-screen` flex column to percentage-based layout within container (spec §3)
- Audit and convert all fixed `px` values to responsive units across all UI components (spec §9)
- Ensure `gameAreaRef` wraps the 16:9 container (animation/arrow layer compatibility)

**Dependencies**: None — this is the foundation.

**Scope boundary**: No visual changes. Existing appearance should be pixel-identical at 16:9 viewports. Letterboxing appears at non-16:9 viewports.

**Risk**: LOW. Footer fixed-height conversion (215px → 25%) may cause card sizing issues. Container queries in `GameFooter.module.css` should auto-adapt but need verification.

---

## Phase B — Column Restructuring

**Scope**: Decompose row components into column components. Create `BattleColumn`.

**What changes**:
- Create `BattleColumn.jsx` combining one ship + one lane per side (spec §4)
- `GameBattlefield.jsx` becomes a 3-column CSS Grid
- Extract per-lane rendering from `DroneLanesDisplay.jsx` (`renderDronesOnBoard` + lane wrapper)
- Thread props from GameBattlefield → BattleColumn → individual components
- `ShipSectionsDisplay.jsx` may be eliminated or reduced

**Dependencies**: Phase A (container must be in place for grid to size correctly).

**Scope boundary**: Existing visuals preserved exactly — just rearranged into columns. No decorative layers added yet.

**Risk**: MEDIUM. Largest surface area of change. 50+ props per display component need correct threading. However, DnD system uses global listeners and identity-based refs — resilient to restructuring. Manual testing of all drag-drop and click interactions critical (no automated DnD tests exist).

---

## Phase C — Ship Section Reskin

**Scope**: Chevron clip-path, 11 decorative layers, content safe zones.

**What changes**:
- Add chevron `clip-path: polygon(...)` to `ShipSectionCompact.jsx` (spec §5)
- Column-specific wing cutout percentages (inner edge: 0%/1.5%)
- Implement 11 visual layers: glow bloom, border, panel body, inner border, glassy sheen, edge highlights, inner glow, diagonal hatch, scan lines, corner brackets, edge tick marks
- Content safe zone constraints (top 10%, bottom 42%)
- Ship art retained as background image behind translucent faction panel
- Layer separation: clipped visual layer (pointer-events: none) + unclipped content layer

**Dependencies**: Phase B (column layout determines which column position each section occupies, affecting wing cutout geometry).

**Scope boundary**: Ship sections only. One section type at a time for incremental validation.

**Risk**: LOW technical risk, HIGH effort. 11 layers × 6 sections = 66 decorative elements. Each needs correct z-index within clip-path. Targeting pulse overlay must be inside clipped layer to match chevron shape.

---

## Phase D — Drone Lane Reskin

**Scope**: Trapezoid clip-path, 9 decorative layers, clip-path/overflow separation.

**What changes**:
- Add trapezoid `clip-path: polygon(...)` to lane containers (spec §6)
- Implement 9 visual layers for lanes
- Separate visual (clipped) and content (unclipped) layers — drone tokens must overflow clip-path
- Convert drone positioning from `flex gap-8` to `space-evenly`
- UI accommodates up to 5 tokens per lane

**Dependencies**: Phase B (lanes must be in column layout). Can parallel with Phase C.

**Scope boundary**: Lane containers and drone positioning only. DroneToken is not modified — current styling is approved as-is (see DESIGN_DECISIONS.md §8).

**Risk**: MEDIUM. clip-path clips all children regardless of overflow — requires the container/visual/content layer separation pattern. DnD drop zones must use the unclipped content layer (`pointer-events: auto` on content, `pointer-events: none` on clipped visual). Lane hover scale applies to outer container.

---

## Phase E — Header Redesign

**Scope**: SVG polyline border, trapezoid phase banner, resource area styling.

**What changes**:
- `GameHeader.jsx` container: translucent dark background with `backdrop-filter: blur(12px)` (spec §8)
- Centre light pillar gradient
- Faction colour accent strips (left/right edges)
- SVG `<polyline>` bottom border with blur glow duplicate (the "star feature")
- SVG polyline top border
- Three-tier trapezoid phase banner using clip-path
- Resource badge area re-styling

**Dependencies**: Phase A (header must be in 15% container). Independent of Phases B–D.

**Scope boundary**: Visual container changes only. ALL existing buttons (`ActionPhaseButtons`, `InitPhaseButtons`), `PhaseStatusText`, `SettingsDropdown`, and `KPIChangePopup` remain functionally identical. The trapezoid phase banner in the spec is a placeholder — existing button functionality is retained exactly.

**Risk**: MEDIUM. Header has 60+ props and complex conditional rendering. KPIChangePopup uses `getBoundingClientRect()` for positioning — needs validation after layout changes. backdrop-filter limited to header only (design decision §7).

---

## Phase F — Lane Effects

**Scope**: New `LaneEffects` component with placeholder data.

**What changes**:
- Create `LaneEffects.jsx` (spec §7)
- 5 circular token slots per lane at centre-facing edge
- Positioned between opponent and player lanes in each `BattleColumn`
- `translateY(50%)` / `translateY(-50%)` to straddle lane border
- Empty slot styling only (active effect styling deferred to game logic implementation)

**Dependencies**: Phase B (requires column layout), Phase D (lane visual separation must be in place for correct positioning).

**Scope boundary**: UI component only. Game logic for lane effects is explicitly out of scope per spec. Component accepts an `effects` prop array but renders empty slots initially.

**Risk**: LOW. Purely additive. No existing functionality modified.

---

## Phase G — Footer Scaling


**Scope**: Container percentage sizing, content overflow fixes.

**What changes**:
- `GameFooter.jsx` / `GameFooter.module.css`: container height from fixed 215px to 25% of 16:9 container (spec §10)
- Convert any remaining fixed heights in footer content (e.g., 205px `handCardsContainer`)
- Validate container query sizing for cards at new container height
- Fix overflow issues as they arise

**Dependencies**: Phase A (25% sizing defined there, but fine-tuning happens here).

**Scope boundary**: Footer container only. Footer content (HandView, DronesView, LogView) not redesigned.

**Risk**: MEDIUM. Card hand layout uses some fixed heights. At 25% of a 16:9 container on a 1920×1080 screen = 270px (slightly larger than current 215px). Smaller screens may be tighter. Container queries should auto-adapt but need verification.

---

## Phase Dependencies

```
A ──→ B ──→ C (ship reskin)
       │  ↗ (can parallel C & D)
       └──→ D (drone lane reskin)
       │    ↘
       │     F (lane effects, after D)
       │
A ──→ E (header, independent of B-D)
A ──→ G (footer, independent of B-F)
```

**Critical path**: A → B → D (structural foundation → column layout → lane separation).

**Parallelizable**: E and G are independent of the battlefield phases (B–F) after Phase A.
